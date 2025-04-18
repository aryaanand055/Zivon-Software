const express = require("express");
const mongoose = require("mongoose");
const app = express();

require('dotenv').config()

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const verifyToken = require('./middleware/auth');
const Client = require("./models/Client.js");

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const expressLayouts = require('express-ejs-layouts');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(expressLayouts);
app.set('layout', 'layout');

const session = require('express-session');
const flash = require('connect-flash');

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



const authRoutes = require('./routes/auth');
app.use('/', authRoutes);


app.get("/", (req, res) => {
    res.send("Success")
})

app.get("/members", verifyToken, async (req, res) => {
    try {
        const allClients = await Client.find();
        res.json(allClients);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client data' });
    }
})











mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Connection error:', err));


app.listen(3000, () => console.log("Server running on http://localhost:3000"));
