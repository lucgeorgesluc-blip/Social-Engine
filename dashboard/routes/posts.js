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

// POST-02: GET /posts/new — new post form
router.get('/posts/new', isAuthenticated, (req, res) => {
    res.render('post-edit', {
        currentPath: '/posts',
        post: null,
        isNew: true
    });
});

// POST-02: POST /posts — create post (also used by AI generation save)
router.post('/posts', isAuthenticated, async (req, res, next) => {
    try {
        const { hook, content, type, status, published_date, platform } = req.body;
        const id = 'post-' + Date.now();
        const safeStatus = ['draft', 'scheduled', 'published'].includes(status) ? status : 'draft';
        await query(
            `INSERT INTO posts (id, hook, content, type, status, platform, published_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [id, hook || null, content || null, type || null, safeStatus,
             platform || 'facebook', published_date || null]
        );
        res.redirect('/posts/' + id + '/edit');
    } catch (err) { next(err); }
});

// POST-02: GET /posts/:id/edit — view/edit a post
router.get('/posts/:id/edit', isAuthenticated, async (req, res, next) => {
    try {
        const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).render('error', { status: 404, message: 'Post introuvable' });
        res.render('post-edit', {
            currentPath: '/posts',
            post: rows[0],
            isNew: false,
            saved: req.query.saved === '1'
        });
    } catch (err) { next(err); }
});

// POST-02: POST /posts/:id — update a post
router.post('/posts/:id', isAuthenticated, async (req, res, next) => {
    try {
        const { hook, content, type, status, published_date } = req.body;
        const safeStatus = ['draft', 'scheduled', 'published'].includes(status) ? status : 'draft';
        // Preserve existing hook when not sent (e.g. save from AI generation page)
        const { rowCount } = await query(
            `UPDATE posts
             SET content=$1, type=$2, status=$3, published_date=$4,
                 hook = CASE WHEN $5::text IS NOT NULL AND $5 != '' THEN $5 ELSE hook END
             WHERE id=$6`,
            [content || null, type || null, safeStatus,
             published_date || null, hook || null, req.params.id]
        );
        if (rowCount === 0) return res.status(404).render('error', { status: 404, message: 'Post introuvable' });
        res.redirect('/posts/' + req.params.id + '/edit?saved=1');
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
