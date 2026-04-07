// Facebook sync cron jobs — comment polling (15 min) + metrics sync (daily 6AM Paris) + auto-publish (5 min if enabled)
const cron = require('node-cron');
const { syncComments } = require('./fb-comments');
const { syncMetrics } = require('./fb-metrics');

/**
 * Starts all Facebook sync cron jobs.
 * Should be called once during server boot after DB is confirmed ready.
 */
function startCronJobs() {
    // Comment polling — every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            const result = await syncComments();
            console.log('[cron] Comment sync:', result);
        } catch (err) {
            console.error('[cron] Comment sync failed:', err.message);
        }
    });

    // Metrics sync — daily at 6:00 AM Paris time (UTC+2 → 4:00 AM UTC)
    cron.schedule('0 4 * * *', async () => {
        try {
            const result = await syncMetrics();
            console.log('[cron] Metrics sync:', result);
        } catch (err) {
            console.error('[cron] Metrics sync failed:', err.message);
        }
    });

    // Auto-publish check — every 5 minutes (only runs if feature flag enabled)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const { publishScheduledPosts, isAutoPublishEnabled } = require('./fb-publish');
            const enabled = await isAutoPublishEnabled();
            if (!enabled) return;
            const result = await publishScheduledPosts();
            if (result.published > 0) {
                console.log('[cron] Auto-publish:', result);
            }
        } catch (err) {
            console.error('[cron] Auto-publish failed:', err.message);
        }
    });

    console.log('[cron] Facebook sync jobs started: comments (*/15 min), metrics (daily 6AM Paris), auto-publish (*/5 min if enabled)');
}

module.exports = { startCronJobs };
