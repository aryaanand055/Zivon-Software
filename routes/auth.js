const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');



// Login page
router.get('/login', (req, res) => {
    const token = req.cookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            req.flash('message', 'You are already logged in.');
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(returnTo);
        } catch (err) {
            req.flash('message', 'Session expired. Please log in again.');
            res.render('pages/auth/login', { title: 'Login' });
        }
    } else {
        res.render('pages/auth/login', { title: 'Login' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        req.flash('message', 'User not found');
        return res.status(401).json({ message: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        req.flash('message', 'Invalid credentials');
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo; // Clear the stored URL
    res.redirect(returnTo);
});


router.get("/logout", (req, res) => {
    res.clearCookie("token");
    req.flash("message", "Logged out successfully.");
    res.redirect("/auth/login");
}
);

module.exports = router;
