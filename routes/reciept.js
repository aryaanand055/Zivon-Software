const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Subscription = require("../models/Subscription");
const { generateReceiptPDF, sendReceiptEmail } = require("../utils/reciept");

router.get("/send/:subscriptionId", async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const subscription = await Subscription.findById(subscriptionId).populate("packageId");
        if (!subscription) return res.status(404).send("Subscription not found");

        const client = await Client.findById(subscription.clientId);
        if (!client || !client.email) return res.status(404).send("Client not found or email missing");

        const filePath = await generateReceiptPDF(client, subscription);
        await sendReceiptEmail(client, filePath, subscription);

        req.flash("message", "Receipt sent successfully!");
        const referer = req.get('Referer') || '/subscriptions';
        res.redirect(referer);
    } catch (err) {
        console.error("Error in receipt send:", err);
        console.error("Error messgage", err.message)
        res.status(500).send("Failed to send receipt.");
    }
});

router.get("/download/:pkgId", async (req, res) => {
    const { pkgId } = req.params;

    try {
        const subscription = await Subscription.findById(pkgId).populate("packageId");
        if (!subscription) return res.status(404).send("Subscription not found");

        const client = await Client.findById(subscription.clientId);
        if (!client) return res.status(404).send("Client not found");

        const filePath = await generateReceiptPDF(client, subscription);

        // Set headers for download
        res.download(filePath, `Receipt-${client.memberID}.pdf`, (err) => {
            if (err) {
                console.error("Download error:", err);
                res.status(500).send("Failed to download receipt.");
            }
        });
    } catch (err) {
        console.error("Download route error:", err);
        res.status(500).send("Server error.");
    }
});

module.exports = router;
