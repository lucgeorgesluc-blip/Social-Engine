// Facebook metrics sync service — fetches post insights from Graph API, stores in post_metrics
const { query } = require('./db');
const { getPageToken } = require('./fb-token');

/**
 * Syncs Facebook post insights into post_metrics table.
 * Syncs posts published in the last 7 days.
 * @returns {{ synced: number, posts_checked: number } | { synced: 0, error: string }}
 */
async function syncMetrics() {
    try {
        const token = await getPageToken();
        if (!token) {
            return { synced: 0, error: 'no_token' };
        }

        // Fetch published posts from last 7 days
        const postsResult = await query(
            "SELECT id FROM posts WHERE platform = 'facebook' AND status = 'published' AND published_date >= NOW() - INTERVAL '7 days'"
        );
        const posts = postsResult.rows;

        let metricsCount = 0;

        for (const post of posts) {
            try {
                const url = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_reach,post_engaged_users,post_clicks&access_token=${token.access_token}`;
                const res = await fetch(url);
                const json = await res.json();

                if (json.error) {
                    console.error(`[fb-metrics] API error for post ${post.id}:`, json.error.message);
                    continue;
                }

                const data = json.data || [];
                // Extract metric values from the insights response
                const metrics = {};
                for (const item of data) {
                    const value = item.values && item.values[0] ? item.values[0].value : 0;
                    metrics[item.name] = typeof value === 'number' ? value : 0;
                }

                await query(
                    `INSERT INTO post_metrics (post_id, fb_post_id, reach, impressions, engagement, clicks, metric_date)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
                     ON CONFLICT (post_id, metric_date) DO UPDATE SET
                       reach = $3, impressions = $4, engagement = $5, clicks = $6, synced_at = NOW()`,
                    [
                        post.id,
                        post.id, // fb_post_id = same as post.id for FB-native posts
                        metrics['post_reach'] || 0,
                        metrics['post_impressions'] || 0,
                        metrics['post_engaged_users'] || 0,
                        metrics['post_clicks'] || 0
                    ]
                );
                metricsCount++;
            } catch (postErr) {
                console.error(`[fb-metrics] Error processing post ${post.id}:`, postErr.message);
            }
        }

        // Update sync state
        await query(
            `INSERT INTO fb_sync_state (key, value, updated_at) VALUES ('metrics_last_sync', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [new Date().toISOString()]
        );

        return { synced: metricsCount, posts_checked: posts.length };
    } catch (err) {
        console.error('[fb-metrics] syncMetrics failed:', err.message);
        return { synced: 0, error: err.message };
    }
}

module.exports = { syncMetrics };
