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
const flash = require('connect-flash');

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.message = req.flash('message');
    next();
});


// Handle different routes
const authRoutes = require('./routes/auth');
const clientsRouter = require('./routes/clients');
// const subscriptionsRouter = require('./routes/subscriptions');
const packagesRouter = require("./routes/package")
const recieptRoutes = require("./routes/reciept");

app.use("/reciept", recieptRoutes);
app.use('/', authRoutes);
app.use('/clients', clientsRouter);
app.use('/packages', packagesRouter);
// app.use('/subscriptions', subscriptionsRouter);

app.get("/", async (req, res) => {
    try {
        const totalClients = await Client.countDocuments();

        const activeSubscriptions = await Subscription.countDocuments({
            endDate: { $gte: new Date() }
        });

        const allSubscriptions = await Subscription.find().populate("packageId");

        const totalRevenue = allSubscriptions.reduce((sum, sub) => sum + (sub.amountPaid || 0), 0);
        const pendingAmount = allSubscriptions.reduce((sum, sub) => {
            const expected = sub.packageId.amount - sub.offerAmount;
            return sum + Math.max(0, expected - sub.amountPaid);
        }, 0);

        const recentSubscriptions = await Subscription.find()
            .sort({ startDate: -1 })
            .limit(5)
            .populate("clientId packageId");

        res.render("pages/dashboard", {
            title: "Dashboard",
            stats: {
                totalClients,
                activeSubscriptions,
                totalRevenue,
                pendingAmount
            },
            recentSubscriptions
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


app.listen(3000, () => console.log("Server running on http://localhost:3000"));
