---
phase: 02-read-layer
plan: 02
subsystem: dashboard-views
tags: [posts, calendar, comments, ejs, vanilla-js, tailwind]
dependency_graph:
  requires: [01-03, 02-01]
  provides: [GET /posts, GET /posts/calendar, GET /comments]
  affects: [dashboard/server.js, dashboard/views/layout.ejs]
tech_stack:
  added: []
  patterns: [LEFT JOIN comment count, 3-state dot state machine, accordion vanilla JS, monthly calendar grid]
key_files:
  created:
    - dashboard/routes/posts.js
    - dashboard/routes/comments.js
    - dashboard/views/posts.ejs
    - dashboard/views/calendar.ejs
    - dashboard/views/comments.ejs
    - dashboard/public/js/dashboard.js
    - dashboard/tests/phase2/posts.test.js
    - dashboard/tests/phase2/calendar.test.js
    - dashboard/tests/phase2/comments.test.js
  modified:
    - dashboard/server.js
    - dashboard/public/css/tailwind.css
decisions:
  - LEFT JOIN subquery for comment count (not correlated subquery) for performance
  - Module._load mock pattern for DB in tests — avoids real DB dependency
  - dotState computed server-side, passed to EJS — no client-side age logic
metrics:
  duration_minutes: 25
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 11
requirements_addressed: [POST-01, POST-04, CMT-01]
---

# Phase 02 Plan 02: Posts Table + Calendar + Comments Summary

**One-liner:** Post list as 4-column TABLE with LEFT JOIN comment count, monthly-only calendar with vanilla JS click-expand, and comments accordion with 3-state dot (grey/green/orange) per CONTEXT D-02/D-03/D-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Posts route + TABLE view + monthly calendar + dashboard.js | 081caf9 | routes/posts.js, views/posts.ejs, views/calendar.ejs, public/js/dashboard.js |
| 2 | Comments route + accordion view + server.js mounts + tests | 22b32f9 | routes/comments.js, views/comments.ejs, server.js, tests/phase2/*.test.js, tailwind.css |

## What Was Built

### GET /posts — Post Table (CONTEXT D-02)
- Returns TABLE with 4 columns: Date / Titre / Statut / Nb commentaires
- Comment count via LEFT JOIN subquery (not N+1 queries)
- Status filter tabs: Tous / Brouillons / Programmes / Publies
- Filter preserves selection via `?status=` query param
- Auth-protected via `isAuthenticated` middleware

### GET /posts/calendar — Monthly Grid (CONTEXT D-03)
- Monthly-only grid — no week toggle at all
- Monday-aligned week rows, padded with adjacent-month days (opacity-40)
- Click any day cell → expands panel below grid showing that day's posts
- Posts embedded as inline `<script type="application/json">` for JS consumption
- Close button collapses the expand panel

### GET /comments — Accordion + 3-State Dot (CONTEXT D-05)
- Groups comments by post with collapsible accordion per group
- 3-state dot computed server-side:
  - **grey** — `response_status = 'pending'`, age ≤ 2h
  - **orange** — `response_status = 'pending'`, age > 2h (overdue)
  - **green** — `response_status` not 'pending' (responded)
- Summary line shows total / pending / overdue counts
- Per-group subtotals in accordion header

### dashboard.js — Vanilla JS
- Calendar day-click expand/collapse with XSS-safe HTML escaping
- Comments accordion toggle (▸/▾ icon state)
- Single IIFE, no framework dependencies

## Decisions Made

1. **LEFT JOIN subquery pattern** — `LEFT JOIN (SELECT post_id, COUNT(*) FROM comments GROUP BY post_id) cc` avoids correlated subquery, single DB round-trip.
2. **dotState computed server-side** — Age calculation done in Node.js, not client-side JS, so EJS receives `grey`/`orange`/`green` directly.
3. **Module._load mock for tests** — Intercepts `require('../lib/db')` to return mock data without real DB connection. Pattern matches existing `auth.test.js` approach of isolated app builds.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- 9/9 phase2 tests pass
- `posts.test.js`: 3 tests (auth redirect, table render, status filter)
- `calendar.test.js`: 3 tests (auth redirect, monthly grid, no week toggle)
- `comments.test.js`: 3 tests (auth redirect, accordion markup, 3-state dots)

## Known Stubs

None — all data comes from real DB queries via `query()`. Views render live data.

## Self-Check: PASSED
