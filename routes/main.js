const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const Package = require('../models/Packages');

router.get("/", verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const in30Days = new Date(now);
        in30Days.setDate(in30Days.getDate() + 30);

        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const past60Days = new Date(now);
        past60Days.setDate(past60Days.getDate() - 60);
        past60Days.setHours(0, 0, 0, 0);
        // Total clients
        const totalClients = await Client.countDocuments();

        const allSubscriptions = await Subscription.find()
            .populate("clientId")
            .populate("packageId");

        // Active subscriptions: end date is in future
        const activeSubscriptions = allSubscriptions.filter(
            (sub) => sub.endDate >= now
        );

        // Revenue and pending calculations
        const totalRevenue = allSubscriptions.reduce((sum, sub) => {
            sum + (sub.amountPaid || 0),
                0
        });

        const pendingAmount = allSubscriptions.reduce((sum, sub) => {
            const expected = (sub.packageId.amount || 0) - (sub.offerAmount || 0);
            return sum + Math.max(0, expected - sub.amountPaid);
        }, 0);

        // Unique members with active subscriptions
        const activeMemberSet = new Set(
            activeSubscriptions.map((sub) => sub.clientId?._id?.toString())
        );

        // Members with any pending payment
        const pendingMemberSet = new Set(
            allSubscriptions
                .filter((sub) => {
                    const expected = sub.packageId.amount - sub.offerAmount;
                    return expected - sub.amountPaid > 0;
                })
                .map((sub) => sub.clientId?._id?.toString())
        );

        // Recent subscriptions (latest 5)
        const recentSubscriptions = await Subscription.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("clientId")
            .populate("packageId");

        // Subscriptions expiring in next 30 days
        const expiringSoon = await Subscription.find({
            endDate: { $gte: endOfToday, $lte: in30Days },
        })
            .populate("clientId")
            .populate("packageId");

        // Subscriptions expired in the last 60 days
        const recentlyExpired = await Subscription.find({
            endDate: { $gte: past60Days, $lte: endOfToday }
        })
            .populate("clientId")
            .populate("packageId");

        // Members with pending payments
        const pendingPayments = allSubscriptions
            .filter((sub) => {
                const expected = sub.packageId.amount - sub.offerAmount;
                return expected - sub.amountPaid > 0;
            })
            .map((sub) => ({
                clientId: sub.clientId,
                packageId: sub.packageId,
                pendingAmount: sub.packageId.amount - sub.offerAmount - sub.amountPaid,
            }));

        res.render("pages/dashboard", {
            title: "Dashboard",
            stats: {
                totalClients,
                activeSubscriptions: activeSubscriptions.length,
                totalRevenue,
                pendingAmount,
                totalMembers: totalClients,
                activeMembers: activeMemberSet.size,
                pendingPaymentMembers: pendingMemberSet.size,
            },
            recentSubscriptions,
            expiringSoon,
            recentlyExpired,
            pendingPayments,
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Server error");
    }
});


module.exports = router;   