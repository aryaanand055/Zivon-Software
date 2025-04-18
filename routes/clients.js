const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const verifyToken = require('../middleware/auth');


async function getNextMemberID() {
    const lastClient = await Client.findOne().sort({ memberID: -1 }); // Find the last client, sorted by memberID
    let nextID = 1;
    console.log(lastClient)
    if (lastClient) {
        const lastIDNumber = parseInt(lastClient.memberID.replace('MBR', ''), 10);
        nextID = lastIDNumber + 1;
    }

    return `MBR${String(nextID).padStart(5, '0')}`;
}
router.get('/search', async (req, res) => {
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
        redirect('/clients');
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
    return res.redirect('/clients');
})


router.get("/view/:id", async (req, res) => {
    const client = await Client.findOne({
        memberID: req.params.id
    })
    if (!client) {
        req.flash("message", "Client ID not found")
        redirect("/clients")
        return;
    }
    res.render('../views/pages/clients/viewclient', { title: req.params.id, client: client });

})
module.exports = router;