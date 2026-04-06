// Dashboard routes — health endpoint + protected dashboard homepage
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

// GET /health — public, no auth required
// Returns DB connection status and row counts per table
router.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');
        const counts = await query(`
            SELECT
                (SELECT COUNT(*) FROM posts)          AS posts,
                (SELECT COUNT(*) FROM comments)       AS comments,
                (SELECT COUNT(*) FROM prospects)      AS prospects,
                (SELECT COUNT(*) FROM metrics_weekly) AS metrics
        `);
        res.json({
            status: 'ok',
            db: 'connected',
            counts: counts.rows[0]
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            db: 'disconnected',
            error: err.message
        });
    }
});

// GET / — auth-protected dashboard homepage with DB health and seed counts
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const result = await query(`
            SELECT
                (SELECT COUNT(*) FROM posts)    AS posts,
                (SELECT COUNT(*) FROM comments) AS comments,
                (SELECT COUNT(*) FROM prospects) AS prospects
        `);
        res.render('dashboard', {
            dbConnected: true,
            dbError: false,
            counts: result.rows[0]
        });
    } catch (err) {
        res.render('dashboard', {
            dbConnected: false,
            dbError: true,
            counts: { posts: '—', comments: '—', prospects: '—' }
        });
    }
});

module.exports = router;
