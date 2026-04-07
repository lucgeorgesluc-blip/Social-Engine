---
phase: 05-facebook-integration
plan: 01
status: complete
completed_at: "2026-04-07"
---

# Summary: Plan 01 — Token Management, OAuth, Health Banner

## What Was Built

- **dashboard/lib/schema-fb.sql** — Three new tables: `fb_tokens`, `fb_sync_state`, `post_metrics`
- **dashboard/lib/fb-token.js** — Token service: `getPageToken`, `storePageToken`, `checkTokenHealth` (pure), `debugToken`, `exchangeCodeForToken`
- **dashboard/routes/fb.js** — OAuth routes (`/dashboard/fb/auth`, `/dashboard/fb/callback`, `/dashboard/fb/status`), manual sync routes (Plan 02 stubs), settings routes (Plan 03 stubs) — all using lazy `require()` to avoid circular deps
- **dashboard/views/partials/fb-banner.ejs** — Token health banner with client-side fetch of `/dashboard/fb/status`; colors driven by data.color (green/amber/red)
- **dashboard/views/layout.ejs** — Banner injected inside `<main>` before `<%- body %>`
- **dashboard/server.js** — `schema-fb.sql` applied at boot after AI schema; `fbRouter` mounted
- **dashboard/tailwind.config.js** — Safelist added for banner colors (green/amber/red/gray variants)
- **dashboard/package.json** — `node-cron ^3.0.3` added
- **dashboard/tests/phase5/fb-token.test.js** — 5 pure-function tests for all 4 health states (missing/expired/expiring/valid)

## Test Results

```
# tests 5 / pass 5 / fail 0
```

## Key Decisions

- `exchangeCodeForToken` uses Node 20 built-in `fetch()` — no `node-fetch` needed
- Routes for Plan 02/03 (sync, settings) included with lazy `require()` so they don't fail when those modules don't exist yet — they're activated as Plan 02/03 create the files
- CSRF protection via session-stored random hex state in OAuth flow
- `checkTokenHealth` is a pure function — easy to test without DB or network

## Interfaces Provided to Plan 02

```javascript
// fb-token.js exports
async getPageToken()       // → {id, access_token, page_id, expires_at, scopes} | null
async storePageToken({})   // → inserted row
function checkTokenHealth(debug) // → {status, color, message, daysLeft?}
async debugToken(token)    // → debug data | null
async exchangeCodeForToken(code, redirectUri) // → {access_token, page_id, expires_at}
```
