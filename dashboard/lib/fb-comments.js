// Facebook comment polling service — fetches new comments from Graph API, upserts to DB
const { query } = require('./db');
const { getPageToken } = require('./fb-token');

/**
 * Syncs new Facebook comments into the comments table.
 * Polls all published Facebook posts since last poll timestamp.
 * @returns {{ synced: number, posts_checked: number } | { synced: 0, error: string }}
 */
async function syncComments() {
    try {
        const token = await getPageToken();
        if (!token) {
            return { synced: 0, error: 'no_token' };
        }

        // Get last poll timestamp (default: 24 hours ago)
        const stateResult = await query(
            "SELECT value FROM fb_sync_state WHERE key = 'comments_last_poll'"
        );
        const lastPoll = stateResult.rows[0]
            ? stateResult.rows[0].value
            : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const sinceTimestamp = Math.floor(new Date(lastPoll).getTime() / 1000);

        // Fetch all published Facebook posts
        const postsResult = await query(
            "SELECT id FROM posts WHERE platform = 'facebook' AND status = 'published'"
        );
        const posts = postsResult.rows;

        let totalInserted = 0;

        for (const post of posts) {
            try {
                const url = `https://graph.facebook.com/v21.0/${post.id}/comments?fields=id,message,from,created_time&since=${sinceTimestamp}&access_token=${token.access_token}`;
                const res = await fetch(url);
                const json = await res.json();

                if (json.error) {
                    console.error(`[fb-comments] API error for post ${post.id}:`, json.error.message);
                    continue;
                }

                const comments = json.data || [];
                for (const comment of comments) {
                    const result = await query(
                        `INSERT INTO comments (id, post_id, date, platform, author_name, comment_text, response_status)
                         VALUES ($1, $2, $3, 'facebook', $4, $5, 'pending')
                         ON CONFLICT (id) DO NOTHING`,
                        [
                            comment.id,
                            post.id,
                            comment.created_time ? new Date(comment.created_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            comment.from ? comment.from.name : null,
                            comment.message || ''
                        ]
                    );
                    if (result.rowCount > 0) totalInserted++;
                }
            } catch (postErr) {
                console.error(`[fb-comments] Error processing post ${post.id}:`, postErr.message);
            }
        }

        // Update last poll timestamp
        await query(
            `INSERT INTO fb_sync_state (key, value, updated_at) VALUES ('comments_last_poll', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [new Date().toISOString()]
        );

        return { synced: totalInserted, posts_checked: posts.length };
    } catch (err) {
        console.error('[fb-comments] syncComments failed:', err.message);
        return { synced: 0, error: err.message };
    }
}

module.exports = { syncComments };
