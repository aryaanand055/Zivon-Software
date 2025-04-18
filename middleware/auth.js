const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.flash('message', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        req.flash('message', 'Session expired. Please log in again.');
        return res.redirect('/login');
    }
}

module.exports = verifyToken;
