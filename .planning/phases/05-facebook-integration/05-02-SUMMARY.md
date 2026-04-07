---
phase: 05-facebook-integration
plan: 02
status: complete
completed_at: "2026-04-07"
---

# Summary: Plan 02 — Comment Sync, Metrics Sync, Cron Jobs

## What Was Built

- **dashboard/lib/fb-comments.js** — `syncComments()`: polls all published Facebook posts since last poll, upserts new comments with `ON CONFLICT (id) DO NOTHING`, updates `comments_last_poll` in fb_sync_state
- **dashboard/lib/fb-metrics.js** — `syncMetrics()`: fetches post insights for posts published in last 7 days, upserts into post_metrics, updates `metrics_last_sync` state
- **dashboard/lib/fb-cron.js** — `startCronJobs()`: schedules all 3 cron jobs (comments every 15 min, metrics daily 4AM UTC, auto-publish every 5 min via lazy require to fb-publish)
- **dashboard/routes/fb.js** — Manual sync routes: `POST /dashboard/fb/sync-comments` and `POST /dashboard/fb/sync-metrics` (already included in Plan 01 routes file)
- **dashboard/server.js** — `startCronJobs()` called inside boot try block after seed
- **dashboard/tests/phase5/fb-comments.test.js** — Module structure test (no DB required); DB tests skip gracefully when DATABASE_URL unavailable
- **dashboard/tests/phase5/fb-metrics.test.js** — Module structure test (no DB required); DB tests skip gracefully when DATABASE_URL unavailable

## Test Results

```
# tests 2 / pass 2 / fail 0 / skipped 0 (DB suites skip when no DATABASE_URL)
```

## Key Decisions

- All Graph API calls use Node 20 built-in `fetch()` — no extra packages
- Both services handle missing tokens gracefully: return `{synced: 0, error: 'no_token'}` without throwing
- `fb-cron.js` uses lazy `require('./fb-publish')` inside the 5-min cron callback to avoid circular dependency — fb-publish.js is created in Plan 03
- DB-dependent tests use skip guard `{ skip: !dbAvailable }` — compatible with CI environments that have DATABASE_URL set

## Interfaces Provided to Plan 03

```javascript
// fb-cron.js exports
function startCronJobs()  // Starts all 3 cron jobs (comments, metrics, auto-publish)

// fb-comments.js exports
async syncComments()  // → { synced: N, posts_checked: N } | { synced: 0, error: string }

// fb-metrics.js exports
async syncMetrics()   // → { synced: N, posts_checked: N } | { synced: 0, error: string }
```
