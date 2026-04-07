// Facebook auto-publish service — posts scheduled content to Facebook Graph API
// Only activates when feature flag 'auto_publish_enabled' = 'true' AND token has pages_manage_posts scope
const { query } = require('./db');
const { getPageToken } = require('./fb-token');

/**
 * Returns true if the auto_publish_enabled feature flag is set to 'true'.
 * @returns {Promise<boolean>}
 */
async function isAutoPublishEnabled() {
    try {
        const result = await query(
            "SELECT value FROM fb_sync_state WHERE key = 'auto_publish_enabled'"
        );
        return result.rows[0] ? result.rows[0].value === 'true' : false;
    } catch (err) {
        console.error('[fb-publish] isAutoPublishEnabled failed:', err.message);
        return false;
    }
}

/**
 * Publishes a single scheduled post to Facebook.
 * @param {string} postId — dashboard post ID
 * @returns {{ postId: string, fbPostId: string }}
 * @throws if token missing, post not found, or API error
 */
async function publishSinglePost(postId) {
    const token = await getPageToken();
    if (!token) throw new Error('no_token');

    const postResult = await query(
        "SELECT id, content FROM posts WHERE id = $1 AND status = 'scheduled'",
        [postId]
    );
    if (!postResult.rows[0]) throw new Error('post_not_found');
    const post = postResult.rows[0];

    const url = `https://graph.facebook.com/v21.0/${token.page_id}/feed`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: post.content, access_token: token.access_token })
    });
    const json = await res.json();
    if (json.error) throw new Error(`Facebook API error: ${json.error.message}`);

    const fbPostId = json.id;

    // Update post: mark published, store fb_post_id in metrics JSONB
    await query(
        `UPDATE posts
         SET status = 'published',
             published_date = NOW(),
             metrics = jsonb_set(COALESCE(metrics, '{}'), '{fb_post_id}', to_jsonb($1::text))
         WHERE id = $2`,
        [fbPostId, postId]
    );

    return { postId, fbPostId };
}

/**
 * Publishes all scheduled Facebook posts whose scheduled time has passed.
 * Skips silently if auto-publish is disabled or no token exists.
 * @returns {{ published: number, failed: number, reason?: string, error?: string, errors?: string[] }}
 */
async function publishScheduledPosts() {
    try {
        const enabled = await isAutoPublishEnabled();
        if (!enabled) return { published: 0, reason: 'disabled' };

        const token = await getPageToken();
        if (!token) return { published: 0, error: 'no_token' };

        // Find scheduled posts whose created_date has passed
        const postsResult = await query(
            "SELECT id FROM posts WHERE status = 'scheduled' AND platform = 'facebook' AND created_date <= NOW()"
        );
        const posts = postsResult.rows;

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const post of posts) {
            try {
                await publishSinglePost(post.id);
                successCount++;
            } catch (err) {
                failCount++;
                errors.push(`${post.id}: ${err.message}`);
                console.error(`[fb-publish] Failed to publish ${post.id}:`, err.message);
            }
        }

        return { published: successCount, failed: failCount, errors };
    } catch (err) {
        console.error('[fb-publish] publishScheduledPosts failed:', err.message);
        return { published: 0, error: err.message };
    }
}

module.exports = { isAutoPublishEnabled, publishSinglePost, publishScheduledPosts };
