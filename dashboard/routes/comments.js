// Comments route — group by post with 3-state dot (grey/green/orange) per CONTEXT D-05
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

// CMT-01: GET /comments — accordion-grouped by post, 3-state dot
router.get('/comments', isAuthenticated, async (req, res, next) => {
    try {
        const { rows: comments } = await query(`
            SELECT c.*, p.hook AS post_hook, p.status AS post_status
            FROM comments c
            LEFT JOIN posts p ON c.post_id = p.id
            ORDER BY c.post_id ASC, c.date ASC
        `);

        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const now = Date.now();

        // CONTEXT D-05: 3-state dot
        //   grey   = pending, age <= 2h (unresponded but not overdue)
        //   orange = pending and age > 2h (overdue)
        //   green  = responded
        const withDotState = comments.map(c => {
            let dotState = 'grey';
            if (c.response_status && c.response_status !== 'pending') {
                dotState = 'green';
            } else {
                const ageMs = now - new Date(c.created_at || c.date).getTime();
                dotState = ageMs > TWO_HOURS_MS ? 'orange' : 'grey';
            }
            return Object.assign({}, c, { dotState });
        });

        // Group by post_id
        const byPost = {};
        withDotState.forEach(c => {
            const pid = c.post_id || '_orphan';
            if (!byPost[pid]) {
                byPost[pid] = {
                    post_id: c.post_id,
                    post_hook: c.post_hook || 'Post inconnu',
                    post_status: c.post_status,
                    comments: [],
                    pendingCount: 0,
                    overdueCount: 0
                };
            }
            byPost[pid].comments.push(c);
            if (c.dotState !== 'green') byPost[pid].pendingCount++;
            if (c.dotState === 'orange') byPost[pid].overdueCount++;
        });

        res.render('comments', {
            currentPath: '/comments',
            byPost,
            totalCount: comments.length,
            pendingCount: withDotState.filter(c => c.dotState !== 'green').length,
            overdueCount: withDotState.filter(c => c.dotState === 'orange').length
        });
    } catch (err) { next(err); }
});

module.exports = router;
