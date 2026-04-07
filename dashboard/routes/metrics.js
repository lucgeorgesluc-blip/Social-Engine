// Metrics routes — STAT-01 (weekly input) + STAT-04 (post performance compare)
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// STAT-01: GET /metrics/input — show weekly metrics form
router.get('/metrics/input', isAuthenticated, async (req, res, next) => {
    try {
        const now = new Date();
        const week = req.query.week || (now.getFullYear() + '-W' + String(getISOWeek(now)).padStart(2, '0'));
        const { rows } = await query('SELECT * FROM metrics_weekly WHERE week=$1', [week]);
        res.render('metrics/input', { currentPath: '/stats', week, existing: rows[0] || null });
    } catch (err) { next(err); }
});

// STAT-01: POST /metrics/:week — upsert weekly metrics
router.post('/metrics/:week', isAuthenticated, async (req, res, next) => {
    try {
        const week = req.params.week;
        const fields = ['posts_published', 'total_reach', 'total_impressions', 'total_likes',
                        'total_comments', 'total_shares', 'info_comments', 'dm_opened', 'calendly_booked'];
        const values = fields.map(f => parseInt(req.body[f] || 0, 10));

        await query(
            'INSERT INTO metrics_weekly (week, ' + fields.join(', ') + ', created_at) ' +
            'VALUES ($1, ' + fields.map((_, i) => '$' + (i + 2)).join(', ') + ', NOW()) ' +
            'ON CONFLICT (week) DO UPDATE SET ' +
            fields.map(f => f + '=EXCLUDED.' + f).join(', '),
            [week, ...values]
        );
        req.session.flash = { type: 'success', message: 'Métriques enregistrées pour ' + week };
        res.redirect('/metrics/input?week=' + encodeURIComponent(week));
    } catch (err) { next(err); }
});

// STAT-04: GET /metrics/compare — post performance comparison table
router.get('/metrics/compare', isAuthenticated, async (req, res, next) => {
    try {
        const { rows } = await query(
            "SELECT id, hook, type, platform, published_date, " +
            "COALESCE((metrics->>'reach')::int, 0) AS reach, " +
            "COALESCE((metrics->>'likes')::int, 0) AS likes, " +
            "COALESCE((metrics->>'comments')::int, 0) AS comments_count, " +
            "COALESCE((metrics->>'shares')::int, 0) AS shares, " +
            "CASE WHEN COALESCE((metrics->>'reach')::int, 0) > 0 " +
            "  THEN ROUND(((COALESCE((metrics->>'likes')::numeric, 0) + COALESCE((metrics->>'comments')::numeric, 0)) " +
            "       / COALESCE((metrics->>'reach')::numeric, 1)) * 100, 2) " +
            "  ELSE 0 END AS engagement_rate " +
            "FROM posts WHERE status='published' ORDER BY published_date DESC NULLS LAST"
        );
        res.render('metrics/compare', { currentPath: '/stats', posts: rows });
    } catch (err) { next(err); }
});

module.exports = router;
