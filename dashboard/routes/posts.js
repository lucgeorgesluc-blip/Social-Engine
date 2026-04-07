// Posts routes — list as TABLE with comment counts + monthly calendar (CONTEXT D-02, D-03)
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

// POST-01: GET /posts — list as TABLE with comment counts (CONTEXT D-02)
router.get('/posts', isAuthenticated, async (req, res, next) => {
    try {
        const { status } = req.query;
        const validStatuses = ['draft', 'scheduled', 'published'];
        const filterStatus = validStatuses.includes(status) ? status : null;

        // LEFT JOIN to count comments per post
        const baseSql = `
            SELECT p.id, p.status, p.platform, p.type, p.hook, p.published_date, p.created_date, p.created_at,
                   COALESCE(cc.cnt, 0)::int AS comment_count
            FROM posts p
            LEFT JOIN (
                SELECT post_id, COUNT(*)::int AS cnt FROM comments GROUP BY post_id
            ) cc ON cc.post_id = p.id
        `;
        const { rows: posts } = await query(
            filterStatus
                ? baseSql + ' WHERE p.status = $1 ORDER BY COALESCE(p.published_date, p.created_date, p.created_at) DESC'
                : baseSql + ' ORDER BY COALESCE(p.published_date, p.created_date, p.created_at) DESC',
            filterStatus ? [filterStatus] : []
        );

        const { rows: statusCounts } = await query(
            'SELECT status, COUNT(*)::int AS count FROM posts GROUP BY status'
        );
        const countMap = Object.fromEntries(statusCounts.map(r => [r.status, r.count]));

        res.render('posts', {
            currentPath: '/posts',
            posts,
            filterStatus,
            statusCounts: {
                draft: countMap.draft || 0,
                scheduled: countMap.scheduled || 0,
                published: countMap.published || 0
            },
            totalCount: (countMap.draft || 0) + (countMap.scheduled || 0) + (countMap.published || 0)
        });
    } catch (err) { next(err); }
});

// POST-04: GET /posts/calendar — MONTHLY ONLY (CONTEXT D-03)
router.get('/posts/calendar', isAuthenticated, async (req, res, next) => {
    try {
        const { date } = req.query;
        const anchor = date ? new Date(date + 'T00:00:00') : new Date();

        // Always monthly. Compute month range.
        const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

        // Pad to start of week (Monday) for grid alignment
        const startDow = monthStart.getDay(); // 0=Sun
        const padBefore = startDow === 0 ? 6 : startDow - 1;
        const gridStart = new Date(monthStart);
        gridStart.setDate(monthStart.getDate() - padBefore);

        // Pad to end of week
        const endDow = monthEnd.getDay();
        const padAfter = endDow === 0 ? 0 : 7 - endDow;
        const gridEnd = new Date(monthEnd);
        gridEnd.setDate(monthEnd.getDate() + padAfter);

        const startStr = gridStart.toISOString().split('T')[0];
        const endStr = gridEnd.toISOString().split('T')[0];

        const { rows: posts } = await query(
            'SELECT id, hook, status, platform, type, published_date FROM posts WHERE published_date BETWEEN $1 AND $2 ORDER BY published_date ASC',
            [startStr, endStr]
        );

        const postsByDate = {};
        posts.forEach(p => {
            const key = p.published_date instanceof Date
                ? p.published_date.toISOString().split('T')[0]
                : String(p.published_date);
            (postsByDate[key] = postsByDate[key] || []).push(p);
        });

        const days = [];
        const cursor = new Date(gridStart);
        while (cursor <= gridEnd) {
            days.push({
                key: cursor.toISOString().split('T')[0],
                dayNum: cursor.getDate(),
                inMonth: cursor.getMonth() === anchor.getMonth()
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        const prevMonth = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
        const nextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

        res.render('calendar', {
            currentPath: '/posts/calendar',
            days,
            postsByDate,
            monthLabel: anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
            prevDateStr: prevMonth.toISOString().split('T')[0],
            nextDateStr: nextMonth.toISOString().split('T')[0]
        });
    } catch (err) { next(err); }
});

module.exports = router;
