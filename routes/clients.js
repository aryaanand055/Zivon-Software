const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const Package = require('../models/Packages');
const verifyToken = require('../middleware/auth');

async function getNextMemberID() {
    const lastClient = await Client.findOne().sort({ memberID: -1 }); // Find the last client, sorted by memberID
    let nextID = 1;
    if (lastClient) {
        const lastIDNumber = parseInt(lastClient.memberID.replace('MBR', ''), 10);
        nextID = lastIDNumber + 1;
    }

    return `MBR${String(nextID).padStart(5, '0')}`;
}
router.get('/search', verifyToken, async (req, res) => {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    try {
        const results = await Client.aggregate([
            {
                $search: {
                    index: "default",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: q,
                                    path: "name",
                                    fuzzy: { maxEdits: 2 }
                                }
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "email",
                                    fuzzy: { maxEdits: 2 }
                                }
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "mobile",
                                    fuzzy: { maxEdits: 2 }
                                }
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "memberID",
                                    fuzzy: { maxEdits: 1 }
                                }
                            }
                        ]
                    }
                }
            },
            { $limit: 5 },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    mobile: 1,
                    memberID: 1
                }
            }
        ]);

        res.json(results);
    } catch (err) {
        console.error("Fuzzy search error:", err);
        res.status(500).json({ error: "Search failed" });
    }
});

router.get("/", verifyToken, async (req, res) => {
    try {
        const allClients = await Client.find();
        res.render("../views/pages/clients/allclients", { clients: allClients, title: "All Clients" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client data' });
    }
})

router.get("/add", verifyToken, async (req, res) => {
    const nextMemberID = await getNextMemberID();
    res.render("../views/pages/clients/addclient", { title: "Add Client", memberID: nextMemberID });
})

router.post("/add", verifyToken, async (req, res) => {
    const newClient = new Client(req.body);
    await newClient.save();
    res.redirect('/clients');
})

router.get('/edit/:id', verifyToken, async (req, res) => {
    const client = await Client.findOne({ memberID: req.params.id });
    if (!client) {
        req.flash("message", "Client not found");
        res.redirect('/clients');
        return;
    }
    res.render('../views/pages/clients/editclient', { title: "Edit client", client: client });
});

router.post('/edit/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const updatedClient = await Client.findOneAndUpdate({ memberID: id }, req.body, { new: true });
    if (!updatedClient) {
        req.flash("message", "Client not found");
        return res.redirect('/clients');
    }
    req.flash("message", "Client updated successfully");
    return res.redirect('/clients/view/' + id);
})

router.get("/view/:id", verifyToken, async (req, res) => {
    const client = await Client.findOne({
        memberID: req.params.id
    })
    if (!client) {
        req.flash("message", "Client ID not found")
        res.redirect("/clients")
        return;
    }

    const clientPackages = await Subscription.find({ clientId: client._id }).populate('packageId');
    let totalPackageAmount = 0;
    let discountAmount = 0;
    let amountPaid = 0;
    let pendingAmount = 0;
    clientPackages.forEach(subscription => {
        totalPackageAmount += subscription.packageId.amount;
        discountAmount += subscription.offerAmount;
        amountPaid += subscription.amountPaid;
    })
    pendingAmount = totalPackageAmount - discountAmount - amountPaid;
    const amountDetails = {
        totalPackageAmount: totalPackageAmount,
        discountAmount: discountAmount,
        amountPaid: amountPaid,
        pendingAmount: pendingAmount
    }
    res.render('../views/pages/clients/viewclient', { title: req.params.id, client: client, subscriptions: clientPackages, amountDetails: amountDetails });

})

router.get('/subscribe/:clientId', verifyToken, async (req, res) => {
    try {
        const client = await Client.findOne({ memberID: req.params.clientId });
        const packages = await Package.find();

        if (!client) {
            return res.status(404).send("Client not found");
        }

        res.render('../views/pages/subscriptions/subscribe', { client, packages, title: "Subscribe" });
    } catch (err) {
        res.status(500).send("Error loading subscription page");
    }
});

router.post('/subscribe/:clientId', verifyToken, async (req, res) => {
    const { packageId, paymentMethod, expectedPaymentDate } = req.body;
    const discountAmount = Number(req.body.discountAmount);
    const packageAmount = Number(req.body.packageAmount);
    const amountPaid = Number(req.body.amountPaid);

    try {
        const client = await Client.findOne({ memberID: req.params.clientId });
        const selectedPackage = await Package.findById(packageId);

        if (!client || !selectedPackage) {
            return res.status(404).json({ error: 'Client or package not found' });
        }
        let paymentStatus = "paid";
        if (amountPaid < packageAmount - discountAmount) {
            paymentStatus = "pending";
        }
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + selectedPackage.duration);
        const newSubscription = new Subscription({
            clientId: client._id,
            packageId: selectedPackage._id,
            startDate,
            endDate,
            paymentStatus: paymentStatus,
            paymentDueDate: expectedPaymentDate,
            amountPaid: amountPaid,
            offerAmount: discountAmount || 0,
            paymentMethod: paymentMethod,

        });

        await newSubscription.save();

        client.subscriptions.push(newSubscription._id);
        await client.save();

        req.flash("message", "Subscription added successfully")
        res.redirect("/clients/view/" + req.params.clientId)
    } catch (err) {
        console.error(err);
        req.flash("message", "Failed to subscribe client to package")
        res.redirect("/clients/view/" + req.params.clientId)
        // res.status(500).json({ error: 'Failed to subscribe client to package' });
    }
});

module.exports = router;