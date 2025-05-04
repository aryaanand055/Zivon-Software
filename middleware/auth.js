const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    if (req.path === '/login' || req.path === '/signup' || req.path.startsWith('/public')) {
        req.session.returnTo = "/";
        return next();
    }
    const token = req.cookies.token;
    req.session.returnTo = req.originalUrl;
    if (!token) {
        req.flash('message', 'You must be logged in to proceed.');
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


function checkAuth(req, res, next) {
    if (req.path === '/login' || req.path === '/signup' || req.path.startsWith('/public')) {
        return next();
    }
    const token = req.cookies.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            res.locals.user = decoded;
        } catch (err) {
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }

    next();
}



module.exports = verifyToken, checkAuth;
