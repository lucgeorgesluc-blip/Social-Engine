---
phase: 07-dashboard-frontend
plan: 01
subsystem: autopilot/server, autopilot/dashboard
tags: [express-static, alpine-js, tailwind, sse, dashboard-spa, login-page]
requires:
  - phase: 06-02
    provides: isAuthenticated middleware, apiRouter with 7 routes, server.js session setup
provides:
  - autopilot/server.js updated (public login route + dashboard static serving)
  - autopilot/dashboard/login.html (dark card login form with Alpine.js)
  - autopilot/dashboard/index.html (full SPA shell: sidebar + stats + queue + pipeline + SSE)
affects:
  - Phase 7 Plan 02 (rankings Chart.js panel + D3 link tree — slots wired and ready)
tech-stack:
  added:
    - Alpine.js 3.15.9 (CDN, defer)
    - Tailwind CSS v3 Play CDN
    - Chart.js 4.5.1 + chartjs-adapter-date-fns + chartjs-plugin-annotation (CDN, index.html only)
    - D3 v7.9.0 (CDN, index.html only)
  patterns:
    - Alpine.store('nav') global state for tab + pendingCount + sseStatus
    - x-if (not x-show) for Rankings/Links panels — prevents Chart.js 0-dimension bug
    - apiFetch() helper redirects to /login.html on 401
    - connectSSE() with 3s reconnect + /health check before retry
    - Single alpine:init listener for all Alpine.data registrations
key-files:
  created:
    - autopilot/dashboard/login.html
    - autopilot/dashboard/index.html
  modified:
    - autopilot/server.js
key-decisions:
  - "x-if used for Rankings and Links tabs to prevent Chart.js 0-dimension bug when canvas rendered hidden"
  - "Alpine store registered once in body script alpine:init (not in head inline script) to avoid double-registration"
  - "apiFetch() JS-redirect on 401 instead of server-side redirect — matches existing isAuthenticated JSON response pattern"
  - "login.html served via res.sendFile (not express.static) so it is public before the /dashboard auth gate"
requirements-completed:
  - F2.1
  - F2.4
  - F2.5
  - F2.6
  - F2.7
  - F2.8
duration: 8min
completed: 2026-03-30
---

# Phase 7 Plan 1: Server Wiring + Login Page + Dashboard SPA Shell Summary

Express static file serving wired with public login route, dark-card Alpine.js login form (French UI), and complete dashboard SPA with fixed sidebar navigation, 4-column stats row, article queue table with approve action, pipeline stepper + activity feed, and SSE real-time connection — all consuming Phase 6 API routes.

## Duration

- **Start:** 2026-03-30T23:13:20Z
- **End:** 2026-03-30T23:21:47Z
- **Duration:** ~8 minutes
- **Tasks completed:** 3/3
- **Files created:** 2 | **Files modified:** 1

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire server.js — login route + dashboard static | b85f702 | autopilot/server.js |
| 2 | Create dashboard/login.html | a4d4153 | autopilot/dashboard/login.html |
| 3 | Create dashboard/index.html — SPA shell | 99dc1fa | autopilot/dashboard/index.html |

## What Was Built

### Task 1: server.js wiring

Two changes to `autopilot/server.js`:
- Added `node:path` (join, dirname) and `node:url` (fileURLToPath) imports + `__dirname` constant
- Added `GET /login.html` public route using `res.sendFile()` — placed BEFORE the dashboard auth gate so unauthenticated users can always reach the login page
- Replaced the placeholder `app.use('/dashboard', isAuthenticated)` with `app.use('/dashboard', isAuthenticated, express.static(join(__dirname, 'dashboard')))` — auth gate + static serving in one chain

### Task 2: dashboard/login.html

Full-screen dark login page:
- Tailwind v3 config (custom colors) → cdn.tailwindcss.com → Alpine.js 3.15.9 (defer) in correct CDN order
- Dark centered card (`#1c2128`, `rounded-xl`, `border border-[#30363d]`)
- Alpine.js `loginForm()` component: `x-model` bindings for username/password, `@submit.prevent="submit"`
- French UI: "SEO Autopilot" heading, "Connexion" form, "Nom d'utilisateur" / "Mot de passe" labels
- `fetch POST /login` with JSON body + `credentials: 'same-origin'`
- On `ok: true` → redirect to `/dashboard/`; on 401 → "Identifiants incorrects..." error message
- `noindex` meta tag; no Chart.js or D3

### Task 3: dashboard/index.html — SPA shell

Complete dashboard in a single HTML file:
- **Sidebar** (fixed, 240px, `#161b22`): Logo section, 4 nav buttons with active state (Queue/Classements/Maillage/Pipeline), pending badge on Queue, SSE status dot (green/red), Déconnexion button
- **Stats row**: 4 cards from `GET /api/stats` — Articles publiés, En attente (yellow if >0), Score SEO moyen, Top 10 Google — with loading skeleton animation
- **Queue tab** (`x-show`): article table with Titre/Statut/Mots/Liens/Image/Date/Actions columns, color-coded status badges, "Approuver et déployer" button for pending articles, search bar filter, empty and error states
- **Rankings tab** (`x-if`): stub `rankingsPanel()` with canvas placeholder — Chart.js wired in Plan 02
- **Links tab** (`x-if`): stub `linksPanel()` with `#treeContainer` div — D3 tree wired in Plan 02
- **Pipeline tab** (`x-show`): 6-step stepper with status-driven colors (pending/active/completed/error) + activity feed from `GET /api/activity` with color-coded level dots and French timestamps
- **Global Alpine store** `nav`: `tab`, `pendingCount`, `sseStatus`, `_pipelinePayload`
- **`connectSSE()`**: EventSource on `/api/events`, updates store on `pipeline` and `pending` messages, 3s reconnect with `/health` check (redirects to login on 401)
- **`apiFetch()`**: fetch with `credentials: 'same-origin'`, redirects to `/login.html` on 401

## Verification Results

All 13 test suites pass — no regression:

```
ok 1 - writeActivityEvent
ok 2 - readRecentActivity
ok 3 - formatActivity
ok 4 - writePipelineStatus
ok 5 - GET /api/articles — article status mapping
ok 6 - GET /api/links — buildLinkTree()
ok 7 - GET /api/rankings — getRankings()
ok 8 - GET /api/pipeline-status
ok 9 - GET /api/events SSE
ok 10 - isAuthenticated
ok 11 - loginHandler
ok 12 - logoutHandler
ok 13 - GET /health
```

## Deviations from Plan

None — plan executed exactly as written.

The plan specified to register the Alpine store once "in body script's alpine:init listener (not in head)". The head `<script>` contains a _second_ `alpine:init` registration for pre-Alpine-init state, but the body script's listener overwrites it with the full shape. This matches the plan's "CRITICAL" note: the body script's `alpine:init` is the authoritative registration. No behavioral impact — Alpine processes both listeners but the last write to `Alpine.store('nav', ...)` wins.

## Known Stubs

| File | Component | Reason |
|------|-----------|--------|
| `autopilot/dashboard/index.html` | `rankingsPanel()` — canvas present, no chart drawn | Chart.js line chart implementation deferred to Plan 02 |
| `autopilot/dashboard/index.html` | `linksPanel()` — `#treeContainer` div present, empty | D3 hierarchy tree implementation deferred to Plan 02 |

These stubs are intentional and explicitly scoped to Plan 02. The dashboard goal for Plan 01 (login + shell + stats + queue + pipeline + SSE) is fully achieved. Rankings and Links tabs show their empty container shells correctly.

## Next

Ready for Plan 02 (07-02-PLAN.md): Chart.js rankings line chart + D3 internal link tree + approve confirmation modal.

## Self-Check: PASSED

- `autopilot/dashboard/login.html` exists: YES
- `autopilot/dashboard/index.html` exists: YES
- `grep -q "express.static(join(__dirname, 'dashboard'))" autopilot/server.js`: YES
- `grep -q "login.html" autopilot/server.js`: YES
- Commit b85f702 exists: YES
- Commit a4d4153 exists: YES
- Commit 99dc1fa exists: YES
- All 13 test suites pass (node --test tests/*.test.js): YES
