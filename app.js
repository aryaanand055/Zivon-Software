const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Client = require("./models/Client");
const Subscription = require("./models/Subscription");
const Package = require("./models/Packages");


require('dotenv').config()

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const verifyToken = require('./middleware/auth');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const expressLayouts = require('express-ejs-layouts');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(expressLayouts);
app.set('layout', 'layout');

const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14
    }
}));

const flash = require('connect-flash');

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

const compression = require('compression');
app.use(compression());

const helmet = require('helmet');
app.use(helmet());


app.use(flash());

app.use((req, res, next) => {
    res.locals.message = req.flash('message');
    next();
});


// Handle different routes
const authRoutes = require('./routes/auth');
const clientsRouter = require('./routes/clients');
// const subscriptionsRouter = require('./routes/subscriptions');
const packagesRouter = require("./routes/packages"); // Corrected the require path
const recieptRoutes = require("./routes/reciept");
const reportsRouter = require('./routes/reports');

app.use("/reciept", recieptRoutes);
app.use('/', authRoutes);
app.use('/clients', clientsRouter);
app.use('/packages', packagesRouter);
app.use('/reports', reportsRouter);
// app.use('/subscriptions', subscriptionsRouter);

app.get("/", verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const in30Days = new Date(now);
        in30Days.setDate(in30Days.getDate() + 30);

        const past60Days = new Date(now);
        past60Days.setDate(past60Days.getDate() - 60);

        // Total clients
        const totalClients = await Client.countDocuments();

        // All subscriptions with client & package data
        const allSubscriptions = await Subscription.find()
            .populate("clientId")
            .populate("packageId");

        // Active subscriptions: end date is in future
        const activeSubscriptions = allSubscriptions.filter(
            (sub) => sub.endDate >= now
        );

        // Revenue and pending calculations
        const totalRevenue = allSubscriptions.reduce(
            (sum, sub) => sum + (sub.amountPaid || 0),
            0
        );

        const pendingAmount = allSubscriptions.reduce((sum, sub) => {
            const expected = sub.packageId.amount - sub.offerAmount;
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
            .limit(5)
            .populate("clientId")
            .populate("packageId");

        // Subscriptions expiring in next 30 days
        const expiringSoon = await Subscription.find({
            endDate: { $gte: now, $lte: in30Days },
        })
            .populate("clientId")
            .populate("packageId");

        // Subscriptions expired in the last 60 days
        const recentlyExpired = await Subscription.find({
            endDate: { $lt: now, $gte: past60Days },
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
            pendingPayments, // Pass pending payments data
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Server error");
    }
});

// Connect to mongodb and localhost
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
