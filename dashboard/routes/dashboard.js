// Dashboard routes — health endpoint + root redirect
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');

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

// GET / — placeholder (Plan 02 will add auth-protected dashboard view)
router.get('/', (req, res) => {
    res.redirect('/health');
});

module.exports = router;
