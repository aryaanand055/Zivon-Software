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

app.use(express.json());


const flash = require('connect-flash');
app.use(flash());

const checkAuth = require('./middleware/auth');
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    checkAuth(req, res, next);
});

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));



app.use(flash());

app.use((req, res, next) => {
    res.locals.message = req.flash('message');
    res.locals.user = req.user || null;
    next();
});


// Handle different routes
const authRoutes = require('./routes/auth');
const clientsRouter = require('./routes/clients');
const esslapiRouter = require('./routes/esslapiRouter');
const packagesRouter = require("./routes/packages");
const recieptRoutes = require("./routes/reciept");
const reportsRouter = require('./routes/reports');
const mainRouter = require("./routes/main")

app.use("/", mainRouter)
app.use("/reciept", recieptRoutes);
app.use('/auth', authRoutes);
app.use('/clients', clientsRouter);
app.use('/packages', packagesRouter);
app.use('/api', esslapiRouter);
app.use('/reports', reportsRouter);


// Connect to mongodb and localhost
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
