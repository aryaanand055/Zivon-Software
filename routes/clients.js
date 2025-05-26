const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const Package = require('../models/Packages');
const verifyToken = require('../middleware/auth');
const { generateReceiptPDF, sendReceiptEmail, sendNewClientEmail } = require("../utils/reciept");
const fs = require("fs");
const { getClientActivityMap } = require('../utils/clientStatus');

router.use(express.json());

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
                                    fuzzy: { maxEdits: 1 }
                                }
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "email",
                                    fuzzy: { maxEdits: 1 }
                                }
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "mobile",
                                    fuzzy: { maxEdits: 1 }
                                }
                            },
                            {
                                text: {
                                    query: q,
                                    path: "memberID"
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
        const { status = 'all', limit = 20, page = 1, pending = 0 } = req.query;
        const limitNum = parseInt(limit);
        const skip = (parseInt(page) - 1) * limitNum;

        const activeMap = await getClientActivityMap();

        const allClients = await Client.find().sort({ memberID: 1 });

        let pendingClientIds = new Set();

        if (pending === '1') {
            const pendingSubs = await Subscription.find({ paymentStatus: 'pending' }, 'clientId');
            pendingClientIds = new Set(pendingSubs.map(sub => sub.clientId.toString()));
        }


        let filteredClients = allClients.filter(client => {
            if (pending == 1 && !pendingClientIds.has(client._id.toString())) {
                return false;
            }
            const isActive = activeMap.get(client._id.toString()) || false;
            if (status === 'active') return isActive;
            if (status === 'inactive') return !isActive;
            return true;
        });

        const totalClients = filteredClients.length;
        const totalPages = Math.ceil(totalClients / limitNum);
        const paginatedClients = filteredClients.slice(skip, skip + limitNum);

        res.render('../views/pages/clients/allclients', {
            clients: paginatedClients,
            status,
            pending,
            limit: limitNum,
            currentPage: parseInt(page),
            totalPages,
            title: "All Clients",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch client data' });
    }
});


router.get("/add", verifyToken, async (req, res) => {
    const nextMemberID = await getNextMemberID();
    res.render("../views/pages/clients/addclient", {
        title: "Add Client", memberID: nextMemberID
    });
});

router.post("/add", verifyToken, async (req, res) => {

    const newClient = new Client(req.body);
    await newClient.save();
    req.flash("message", "Client added successfully");
    if (newClient.email) {
        setImmediate(async () => {
            try {
                await sendNewClientEmail(newClient);
            } catch (err) {
                console.error("Failed to send welcome email:", err);
            }
        });
    }
    return res.json({
        success: true,
        message: "Client added successfully",
        client: newClient
    });
})

router.delete("/delete/:id", verifyToken, async (req, res) => {
    const client = req.params.id;

    try {
        // Find the client to be deleted
        const clientData = await Client.findOne({ memberID: client });

        if (!clientData) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        // Delete all subscriptions linked to this client
        await Subscription.deleteMany({ clientId: clientData._id });

        // Delete the client document itself
        await Client.deleteOne({ memberID: client });

        return res.status(200).json({
            success: true,
            message: "Client and all associated subscriptions deleted successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete client"
        });
    }
});


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

    const clientPackages = await Subscription.find({ clientId: client._id }).populate('packageId').sort({ startDate: -1 });;
    let totalPackageAmount = 0;
    let discountAmount = 0;
    let amountPaid = 0;
    let pendingAmount = 0;
    let expiryDate = new Date();
    clientPackages.forEach(subscription => {
        if (subscription.endDate > expiryDate) {
            expiryDate = subscription.endDate;
        }
    })
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
    res.render('../views/pages/clients/viewclient', { title: req.params.id, client: client, subscriptions: clientPackages, amountDetails: amountDetails, expiryDate: expiryDate });

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

router.get("/subscription/edit/:id", verifyToken, async (req, res) => {
    const subscription = await Subscription.findById(req.params.id).populate('packageId');
    if (!subscription) {
        req.flash("message", "Subscription not found");
        res.redirect('/clients');
        return;
    }
    const client = await Client.findById(subscription.clientId);
    const packages = await Package.find();
    console.log(client);
    res.render('../views/pages/subscriptions/editsubscription', { title: "Edit Subscription", subscription, client, packages });
})

router.post("/subscription/edit/:id", verifyToken, async (req, res) => {
    try {
        const { packageId, paymentMethod, expectedPaymentDate, startDate } = req.body;
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const countToday = await Subscription.countDocuments({ updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) } });
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const receiptID = subscription.receiptID || `ZF-${today}-${String(countToday + 1).padStart(3, '0')}`;

        const discountAmount = Number(req.body.discountAmount);
        const packageAmount = Number(req.body.packageAmount);
        const amountPaid = Number(req.body.amountPaid);

        const client = await Client.findById(subscription.clientId);
        const selectedPackage = await Package.findById(subscription.packageId);
        if (!client || !selectedPackage) {
            return res.status(404).json({ error: 'Client or package not found' });
        }
        let paymentStatus = "paid";
        if (amountPaid < packageAmount - discountAmount) {
            paymentStatus = "pending";
        }
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + selectedPackage.duration);

        subscription.packageId = selectedPackage._id;
        subscription.receiptID = receiptID;
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.paymentStatus = paymentStatus;
        subscription.paymentDueDate = expectedPaymentDate;
        subscription.amountPaid = amountPaid;
        subscription.offerAmount = discountAmount || 0;
        subscription.paymentMethod = paymentMethod;
        subscription.updatedAt = new Date();

        await subscription.save();

        setImmediate(async () => {
            try {
                const subscriptionData = {
                    ...subscription.toObject(),
                    packageId: selectedPackage.toObject()
                };
                const filePath = await generateReceiptPDF(client, subscriptionData);
                setTimeout(async () => {
                    await sendReceiptEmail(client, filePath, subscriptionData);

                }, 1000);
            } catch (err) {
                req.flash("message", "Failed to send receipt email");
                console.error("Failed to send receipt email:", err);
            }
        }
        );
        req.flash("message", "Subscription updated successfully");
        res.redirect("/clients/view/" + client.memberID);
    } catch (err) {
        console.error(err);
        req.flash("message", "Failed to update subscription");
        res.redirect("/clients/view/" + client.memberID);
    }
})


router.post('/subscribe/:clientId', verifyToken, async (req, res) => {
    const { packageId, paymentMethod, expectedPaymentDate, startDate } = req.body;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await Subscription.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } });

    const receiptID = `ZF-${today}-${String(countToday + 1).padStart(3, '0')}`;

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
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + selectedPackage.duration);
        const newSubscription = new Subscription({
            clientId: client._id,
            packageId: selectedPackage._id,
            receiptID: receiptID,
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

        setImmediate(async () => {
            try {
                const subscriptionData = {
                    ...newSubscription.toObject(),
                    packageId: selectedPackage.toObject()
                };
                const filePath = await generateReceiptPDF(client, subscriptionData);
                setTimeout(async () => {
                    await sendReceiptEmail(client, filePath, subscriptionData);
                    // fs.unlink(filePath, err => {
                    //     if (err) console.error("Failed to delete temp receipt:", err);
                    // });
                }, 1000);
            } catch (err) {
                req.flash("message", "Failed to send receipt email");
                console.error("Failed to send receipt email:", err);
            }
        });

        req.flash("message", "Subscription added successfully");
        res.redirect("/clients/view/" + req.params.clientId);

    } catch (err) {
        console.error(err);
        req.flash("message", "Failed to subscribe client to package");
        res.redirect("/clients/view/" + req.params.clientId);
    }
});

router.delete("/subscription/delete/:id", verifyToken, async (req, res) => {
    const subscriptionId = req.params.id;
    try {
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        await Subscription.deleteOne({ _id: subscriptionId });
        await Client.updateOne({ _id: subscription.clientId }, { $pull: { subscriptions: subscriptionId } });

        return res.status(200).json({ success: true, message: "Subscription deleted successfully" });
    } catch (err) {
        console.error("Error deleting subscription:", err);
        return res.status(500).json({ error: 'Failed to delete subscription' });
    }
}
);

// POST /clients/check-duplicate
router.post("/check-duplicate", verifyToken, async (req, res) => {
    const { email, mobile } = req.body;
    let result = {};

    if (email) {
        const existingEmail = await Client.findOne({ email: email.trim().toLowerCase() });
        result.emailExists = !!existingEmail;
    }

    if (mobile) {
        const existingMobile = await Client.findOne({ mobile: mobile.trim() });
        result.mobileExists = !!existingMobile;
    }

    res.json(result);
});



module.exports = router;