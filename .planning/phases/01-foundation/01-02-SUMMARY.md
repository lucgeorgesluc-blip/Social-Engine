---
phase: 01-foundation
plan: 02
subsystem: dashboard
tags: [auth, views, ejs, tailwind, express, session, bcrypt]
dependency_graph:
  requires: ["01-01"]
  provides: ["login-flow", "sidebar-layout", "dashboard-homepage"]
  affects: ["dashboard/server.js", "dashboard/routes/", "dashboard/views/", "dashboard/public/"]
tech_stack:
  added: ["express-ejs-layouts", "bcryptjs (runtime usage)"]
  patterns: ["password-only auth with bcrypt", "EJS layout inheritance", "isAuthenticated middleware", "mobile hamburger overlay"]
key_files:
  created:
    - dashboard/routes/auth.js
    - dashboard/views/login.ejs
    - dashboard/views/error.ejs
    - dashboard/views/dashboard.ejs
    - dashboard/public/js/app.js
    - dashboard/tests/auth.test.js
  modified:
    - dashboard/server.js
    - dashboard/views/layout.ejs
    - dashboard/routes/dashboard.js
    - dashboard/public/css/tailwind.css
decisions:
  - "login.ejs renders with layout: false (standalone page, no sidebar)"
  - "isAuthenticated exported from auth.js, imported by dashboard.js (avoids circular deps via server.js)"
  - "Auth tests use in-memory session store (no DB needed for auth flow tests)"
  - "error.ejs is a layout partial (not standalone) — works with express-ejs-layouts"
metrics:
  duration_minutes: 35
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_created: 6
  files_modified: 4
requirements_satisfied: [INFRA-04, INFRA-05]
---

# Phase 01 Plan 02: Auth + Views + Sidebar Layout Summary

Password-only auth via bcrypt + express-session, full EJS view layer (login, layout with sidebar, dashboard health card), mobile hamburger toggle, and Tailwind rebuild.

## What Was Built

### Task 1: Auth routes + login/error views + auth tests (commit: af60fb1)

- `dashboard/routes/auth.js` — `isAuthenticated` middleware + GET/POST `/login` + POST `/logout`. Password verified with `bcrypt.compareSync` against `DASHBOARD_PASSWORD_HASH` env var. Session stores `user: 'benjamin'`.
- `dashboard/views/login.ejs` — Standalone full-page login (no layout). Branded card: "Social Dashboard" / "Corinne Lacoste", single password field, French error message below input on failure.
- `dashboard/views/error.ejs` — Layout partial for 404/500, shows status code + message + back link.
- `dashboard/server.js` — Added `express-ejs-layouts`, mounted authRouter before dashRouter, added 404/500 error handlers.
- `dashboard/tests/auth.test.js` — 4 passing tests using in-memory session store (no DB dependency): GET /login → 200, POST wrong password → error, POST correct password → 302 to /, GET / without session → 302 to /login.

### Task 2: Layout + dashboard homepage + hamburger + Tailwind rebuild (commit: 1c69ede)

- `dashboard/views/layout.ejs` — Full sidebar layout: fixed 240px sidebar (bg-secondary), hamburger button (44×44px touch target), overlay for mobile, 5 nav items (Accueil active with primary left border, Posts/Commentaires/Pipeline/Statistiques disabled with "Bientôt" badge), logout POST form at bottom, `<%- body %>` slot.
- `dashboard/views/dashboard.ejs` — Health card: "Bienvenue, Benjamin" greeting, green/red DB status dot, 3 stat chips (Posts/Commentaires/Prospects counts), red error notice on DB failure.
- `dashboard/routes/dashboard.js` — GET / now protected with `isAuthenticated`, runs COUNT(*) query on 3 tables, renders `dashboard` view with counts or error state.
- `dashboard/public/js/app.js` — Hamburger toggle: sidebar `-translate-x-full` toggled on click, overlay dismissed on click.
- `dashboard/public/css/tailwind.css` — Rebuilt with `npm run build:css` to include all new utility classes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] express-ejs-layouts not initialized in server.js**
- **Found during:** Task 1 — login.ejs uses `layout: false` which requires express-ejs-layouts to be mounted
- **Issue:** server.js had only a comment about express-ejs-layouts but no `app.use(expressLayouts)` or `app.set('layout', 'layout')` call
- **Fix:** Added `require('express-ejs-layouts')` and the two `app.use`/`app.set` calls in server.js
- **Files modified:** dashboard/server.js
- **Commit:** af60fb1

## Known Stubs

None — all data flows are wired: DB counts come from real COUNT(*) queries, error state handled, counts render to view.

## Self-Check: PASSED

Files verified present:
- dashboard/routes/auth.js — FOUND
- dashboard/views/login.ejs — FOUND
- dashboard/views/error.ejs — FOUND
- dashboard/views/dashboard.ejs — FOUND
- dashboard/views/layout.ejs — FOUND
- dashboard/public/js/app.js — FOUND
- dashboard/tests/auth.test.js — FOUND

Commits verified:
- af60fb1 — FOUND
- 1c69ede — FOUND

Tests: 4/4 passing (auth.test.js)
