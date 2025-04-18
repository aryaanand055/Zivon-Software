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
            return res.redirect('/members');
        } catch (err) {
            flash('message', 'Session expired. Please log in again.');
            res.render('pages/login', { title: 'Login' });
        }
    } else {
        res.render('pages/login', { title: 'Login' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/members');
});


router.get("/logout", (req, res) => {
    res.clearCookie("token");
    req.flash("message", "Logged out successfully.");
    res.redirect("/login");
}
);

module.exports = router;
