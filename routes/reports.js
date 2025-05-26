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
        const subscriptions = await Subscription.find().populate('packageId clientId');

        // Calculate data for "Number of Clients vs Age" graph
        const ageGroups = {};
        const revenueByAgeGroups = {};

        clients.forEach(client => {
            const today = new Date();
            const birthDate = new Date(client.dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            const ageGroup = `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
            ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;

            if (!revenueByAgeGroups[ageGroup]) {
                revenueByAgeGroups[ageGroup] = 0;
            }
        });

        subscriptions.forEach(sub => {
            const client = clients.find(c => c._id.toString() === sub.clientId._id.toString());
            if (client) {
                const today = new Date();
                const birthDate = new Date(client.dob);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                const ageGroup = `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
                revenueByAgeGroups[ageGroup] += sub.amountPaid || 0;
            }
        });

        const clientsByAgeData = {
            labels: Object.keys(ageGroups).sort(),
            values: Object.keys(ageGroups).sort().map(group => ageGroups[group])
        };

        const revenueByAgeData = {
            labels: Object.keys(revenueByAgeGroups).sort(),
            values: Object.keys(revenueByAgeGroups).sort().map(group => revenueByAgeGroups[group])
        };

        res.render('pages/reports/clients', {
            title: 'Client Reports',
            clientsByAge: clientsByAgeData,
            revenueByAge: revenueByAgeData
        });
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



// Route to generate financial reports
router.get('/financial', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filters = {};

        if (startDate || endDate) {
            filters.startDate = {};
            if (startDate) filters.startDate.$gte = new Date(startDate);
            if (endDate) filters.startDate.$lte = new Date(endDate);
        }

        const subscriptions = await Subscription.find(filters);

        // Calculate revenue by month
        const revenueByMonth = {};
        const revenueByDay = Array(7).fill(0); // Sunday to Saturday

        subscriptions.forEach(sub => {
            const date = new Date(sub.startDate);
            const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const dayOfWeek = date.getDay();

            revenueByMonth[month] = (revenueByMonth[month] || 0) + (sub.amountPaid || 0);
            revenueByDay[dayOfWeek] += sub.amountPaid || 0;
        });

        const revenueByMonthData = {
            labels: Object.keys(revenueByMonth).sort(),
            values: Object.keys(revenueByMonth).sort().map(month => revenueByMonth[month])
        };

        const revenueByDayData = {
            labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            values: revenueByDay
        };

        res.render('pages/reports/financial', {
            title: 'Financial Reports',
            revenueByMonth: revenueByMonthData,
            revenueByDay: revenueByDayData
        });
    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).send('Error generating financial report');
    }
});


// Add more routes for specific report generation if needed

module.exports = router;