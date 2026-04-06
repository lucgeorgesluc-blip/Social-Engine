// Auth routes — password-only login/logout + isAuthenticated middleware
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Middleware: require active session or redirect to /login
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// GET /login — show login form (redirect to / if already logged in)
router.get('/login', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/');
    res.render('login', { layout: false, error: null });
});

// POST /login — verify password against bcrypt hash in env
router.post('/login', (req, res) => {
    const { password } = req.body || {};
    const hash = process.env.DASHBOARD_PASSWORD_HASH;
    if (password && hash && bcrypt.compareSync(password, hash)) {
        req.session.user = 'benjamin';
        return res.redirect('/');
    }
    res.render('login', { layout: false, error: 'Mot de passe incorrect. Réessayez.' });
});

// POST /logout — destroy session and redirect (POST prevents CSRF via link)
router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

module.exports = { router, isAuthenticated };
