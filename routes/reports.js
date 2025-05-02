const express = require('express');

const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const Package = require('../models/Packages');
const verifyToken = require('../middleware/auth');
const router = express.Router();

// Route to render the reports page
router.get('/', verifyToken, (req, res) => {
    res.render('pages/reports/reports', { title: 'Reports' });
});

// Route to generate client reports
router.get('/clients', verifyToken, async (req, res) => {
    try {
        const clients = await Client.find();
        res.render('pages/reports/clients', { title: 'Client Reports', clients });
    } catch (error) {
        console.error('Error generating client report:', error);
        res.status(500).send('Error generating client report');
    }
});

router.get('/subscriptions', verifyToken, async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate);
        if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const subscriptions = await Subscription.find(query)
        .populate('packageId clientId');

    const revenueAndPendingPerPackage = {};

    for (const sub of subscriptions) {
        const pkg = sub.packageId;
        const pkgName = pkg.name;

        if (!revenueAndPendingPerPackage[pkgName]) {
            revenueAndPendingPerPackage[pkgName] = {
                totalRevenue: 0,
                pendingPayments: 0,
                packageId: pkg._id,
                clients: []
            };
        }

        revenueAndPendingPerPackage[pkgName].totalRevenue += sub.amountPaid || 0;
        const pending = (sub.packageId.amount || 0) - (sub.amountPaid || 0);
        revenueAndPendingPerPackage[pkgName].pendingPayments += pending;

        revenueAndPendingPerPackage[pkgName].clients.push({
            id: sub.clientId.memberID, // Include client ID
            name: sub.clientId.name,
            startDate: sub.startDate,
            endDate: sub.endDate
        });
    }

    res.render('pages/reports/subscriptions', {
        revenueAndPendingPerPackage,
        startDate,
        endDate,
        title: 'Subscription Reports'
    });
});


// ✅ Helper function
async function getClientsForPackage(packageId, startDate, endDate) {
    const filter = { packageId };
    if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const subs = await Subscription.find(filter).populate('clientId');
    return subs.map(sub => ({
        name: sub.clientId?.name || 'Unknown',
        startDate: sub.startDate,
        endDate: sub.endDate
    }));
}

// Route to generate financial reports
router.get('/financial', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Build query filters
        const filters = {};
        if (startDate || endDate) {
            filters.startDate = {};
            if (startDate) filters.startDate.$gte = new Date(startDate);
            if (endDate) filters.startDate.$lte = new Date(endDate);
        }

        const subscriptions = await Subscription.find(filters).populate('packageId');

        // Calculate total revenue and pending payments per package
        const revenueAndPendingPerPackage = subscriptions.reduce((acc, sub) => {
            if (sub.packageId) {
                const packageName = sub.packageId.name;
                const expected = sub.packageId.amount - sub.offerAmount;
                acc[packageName] = acc[packageName] || { totalRevenue: 0, pendingPayments: 0 };
                acc[packageName].totalRevenue += sub.amountPaid || 0;
                acc[packageName].pendingPayments += Math.max(0, expected - sub.amountPaid);
            }
            return acc;
        }, {});

        res.render('pages/reports/financial', {
            title: 'Financial Reports',
            revenueAndPendingPerPackage
        });
    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).send('Error generating financial report');
    }
});

// Helper functions
async function getRevenueAndPendingData(startDate, endDate) {
    // ...fetch and return revenue and pending payments data...
}

async function getClientsForPackage(packageId, startDate, endDate) {
    // ...fetch and return clients for the given package...
}

// Add more routes for specific report generation if needed

module.exports = router;