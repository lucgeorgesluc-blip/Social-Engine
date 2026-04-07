// Dashboard routes — health endpoint + protected dashboard homepage
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');
const { getDmSequenceRules } = require('../lib/dm-config');

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

// GET / — auth-protected priority inbox homepage
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        // INBOX-01: Today's posts (cap 5)
        const { rows: todayPosts } = await query(`
            SELECT id, hook, status, platform, type, published_date
            FROM posts
            WHERE published_date = CURRENT_DATE
            ORDER BY created_at ASC
            LIMIT 5
        `);
        const { rows: [{ count: todayPostsTotal }] } = await query(
            'SELECT COUNT(*)::int AS count FROM posts WHERE published_date = CURRENT_DATE'
        );

        // INBOX-02: Pending comments (cap 5)
        const { rows: pendingComments } = await query(`
            SELECT c.id, c.author_name, c.comment_text, c.classification,
                   c.created_at, c.date, p.hook AS post_hook, p.id AS post_id
            FROM comments c
            LEFT JOIN posts p ON c.post_id = p.id
            WHERE c.response_status = 'pending'
            ORDER BY c.date ASC
            LIMIT 5
        `);
        const { rows: [{ count: pendingCommentsTotal }] } = await query(
            "SELECT COUNT(*)::int AS count FROM comments WHERE response_status = 'pending'"
        );

        // INBOX-04: Flag comments older than 2h as overdue
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const now = Date.now();
        const commentsWithFlags = pendingComments.map(c => ({
            ...c,
            isOverdue: (now - new Date(c.created_at || c.date).getTime()) > TWO_HOURS_MS
        }));

        // INBOX-03: DM follow-ups (cap 5)
        const { rows: activeProspects } = await query(`
            SELECT id, prospect_name, full_name, stage, date_first_contact, notes
            FROM prospects
            WHERE stage NOT IN ('booked', 'converted', 'lost')
            ORDER BY date_first_contact ASC
            LIMIT 5
        `);
        const { rows: [{ count: activeProspectsTotal }] } = await query(
            "SELECT COUNT(*)::int AS count FROM prospects WHERE stage NOT IN ('booked','converted','lost')"
        );

        const rules = getDmSequenceRules();
        const prospectsWithFlags = activeProspects.map(p => {
            const hoursSince = (now - new Date(p.date_first_contact).getTime()) / 3600000;
            const rule = rules[p.stage];
            const dueAfterHours = rule ? rule.follow_up_after_hours : null;
            return {
                ...p,
                isOverdue: dueAfterHours !== null && hoursSince > dueAfterHours,
                hoursSince: Math.floor(hoursSince)
            };
        });

        const { rows: [counts] } = await query(`
            SELECT
                (SELECT COUNT(*) FROM posts)     AS posts,
                (SELECT COUNT(*) FROM comments)  AS comments,
                (SELECT COUNT(*) FROM prospects) AS prospects
        `);

        res.render('dashboard', {
            currentPath: '/',
            dbConnected: true,
            dbError: false,
            counts,
            todayPosts,
            todayPostsTotal,
            pendingComments: commentsWithFlags,
            pendingCommentsTotal,
            overdueCommentCount: commentsWithFlags.filter(c => c.isOverdue).length,
            activeProspects: prospectsWithFlags,
            activeProspectsTotal,
            overdueProspectCount: prospectsWithFlags.filter(p => p.isOverdue).length
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
