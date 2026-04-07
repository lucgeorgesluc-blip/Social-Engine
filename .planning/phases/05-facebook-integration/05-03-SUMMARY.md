---
phase: 05-facebook-integration
plan: 03
status: complete
completed_at: "2026-04-07"
---

# Summary: Plan 03 — Auto-publish, Settings Page, Human Checkpoint

## What Was Built

- **dashboard/lib/fb-publish.js** — Three exports: `isAutoPublishEnabled()` (reads fb_sync_state flag), `publishSinglePost(postId)` (Graph API POST to page/feed, updates status + stores fb_post_id in metrics JSONB), `publishScheduledPosts()` (finds scheduled posts, calls publishSinglePost for each, returns counts)
- **dashboard/views/settings.ejs** — Settings page: auto-publish toggle (disabled+explained when no `pages_manage_posts` scope, hidden when no token), manual sync buttons for comments and metrics, error messages for no_token/no_scope states
- **dashboard/views/layout.ejs** — "Paramètres" nav item added inside `<nav>` before logout section, with active-state class logic matching other nav items
- **dashboard/lib/fb-cron.js** — Already included `*/5 * * * *` auto-publish cron in Plan 02; uses lazy `require('./fb-publish')` to avoid circular dep
- **dashboard/routes/fb.js** — Settings routes already included in Plan 01 (`GET /dashboard/settings`, `POST /dashboard/settings/auto-publish`); scope validation gates enabling the flag
- **dashboard/tests/phase5/fb-publish.test.js** — Module structure test (no DB); DB tests (flag state, disabled/no-token guards, mocked publish + JSONB update) skip gracefully without DATABASE_URL

## Test Results

```
All Phase 5 tests: 8 pass / 0 fail (15 suites total across 4 test files)
```

## Key Decisions

- Auto-publish is triple-gated: (1) feature flag must be `'true'`, (2) token must exist, (3) token must have `pages_manage_posts` scope — enforced in both the toggle POST route and in `publishScheduledPosts()`
- `publishSinglePost` uses `jsonb_set(COALESCE(metrics, '{}'), '{fb_post_id}', to_jsonb($1::text))` to store the Facebook post ID without clobbering other metrics fields
- Settings page uses `errorParam` (from `?error=no_scope`) to show contextual error messages after redirect

## Human Verification Required

Plan 03 has a blocking human checkpoint. To verify:

1. `cd dashboard && node server.js`
2. Log in — token health banner should appear red "Aucun token Facebook — Connecter"
3. Navigate to `/dashboard/settings` — should show "Aucun token Facebook connecté" with connect link
4. `cd dashboard && node --test tests/phase5/*.test.js` — all 8 should pass
5. Sidebar should show "Paramètres" link
6. `node -e "require('./lib/fb-cron')"` — should load without error
