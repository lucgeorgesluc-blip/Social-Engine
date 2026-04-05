---
phase: 12-dashboard-audit-tab
plan: 01
subsystem: ui, api
tags: [alpine.js, sse, audit, dashboard, express]

# Dependency graph
requires:
  - phase: 09-audit-foundation
    provides: "page-audit.json structure, runAudit(), scorePageHealth()"
  - phase: 10-cannibalization-ranking-trigger
    provides: "audit-status.json with ranking-drop trigger data"
  - phase: 11-patch-generator-validator-apply
    provides: "POST /api/audit/:slug/patch, POST /api/audit/:slug/apply routes"
provides:
  - "Audit SEO sidebar tab with health grid, score badges, issue counts"
  - "Chutes ranking-drop alert banner"
  - "POST /api/audit/run route to spawn audit runner from dashboard"
  - "GET /api/audit-status route for ranking-drop data"
  - "DELETE /api/audit/:slug/patch route for patch rejection"
  - "avgSeoScore in GET /api/stats response"
  - "SSE audit-complete event for real-time grid refresh"
  - "auditPanel Alpine component with full CRUD operations"
affects: [12-dashboard-audit-tab plan 02 (drill-down detail panel)]

# Tech tracking
tech-stack:
  added: [highlight.js CDN (github-dark theme + xml language)]
  patterns: [auditPanel Alpine component with Set-based reactivity for generating/applying state]

key-files:
  created:
    - autopilot/tests/audit-routes.test.js
  modified:
    - autopilot/routes/api.js
    - autopilot/dashboard/index.html

key-decisions:
  - "DELETE /api/audit/:slug/patch added as deviation Rule 2 -- frontend rejectPatch() requires it"
  - "GET /api/audit-status route returns raw audit-status.json for Chutes section"
  - "auditPanel uses Set replacement pattern (not mutation) for Alpine reactivity on generating/applying"
  - "SSE audit-complete dispatches window CustomEvent to decouple SSE handler from Alpine component"
  - "highlight.js CDN loaded in head for future Plan 02 patch preview syntax highlighting"

patterns-established:
  - "auditPanel component: loadAudit() converts slug-keyed object to array, handles both raw and {pages:{}} wrapper shapes"
  - "Set reactivity: new Set([...old, item]) for add, new Set(old); next.delete(item) for remove"

requirements-completed: [F4.9]

# Metrics
duration: 14min
completed: 2026-04-01
---

# Phase 12 Plan 01: Dashboard Audit Tab — Grid + Backend Routes Summary

**Audit SEO tab with color-coded health grid, ranking-drop alerts, Run Audit button, and 4 new API routes powering real-time audit monitoring from the dashboard.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-01T15:36:15Z
- **Completed:** 2026-04-01T15:50:44Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments

### Task 1: Backend Routes + Tests
- Added `POST /api/audit/run` route that spawns `audit/runner.js` as a detached background process (same pattern as pipeline/run)
- Added `avgSeoScore` computation to `GET /api/stats` -- reads page-audit.json, averages all numeric scores, rounds to integer
- Added `safeWatch` for `page-audit.json` emitting `audit-complete` SSE events on file change
- Added `GET /api/audit-status` route returning audit-status.json data for the Chutes section
- Added `DELETE /api/audit/:slug/patch` route to remove pending patches (deviation Rule 2)
- Created `audit-routes.test.js` with 7 integration tests (all passing)

### Task 2: Frontend Audit Tab
- Added "Audit SEO" sidebar button between Classements GSC and Maillage interne with shield-check SVG icon
- Red dot badge on sidebar button when `auditCriticalCount > 0`
- Chutes ranking-drop alert banner with trend-down icon, keyword, position change, and timestamp
- Health grid table with sortable columns: Slug, Score (color-coded badge), Critiques, Avertissements, Last scanned, Action
- Score badges: green (>= 80), amber (60-79), red (< 60)
- Run Audit button with spinner loading state
- Loading skeleton (5 pulse rows) and empty state
- Drill-down row placeholder for Plan 02
- Generate Patch button per page row (with loading state via Set reactivity)
- SSE `audit-complete` handler dispatches CustomEvent to refresh grid
- `auditPanel` Alpine component registered with full methods: init, loadAudit, selectPage, generatePatch, applyPatch, rejectPatch, runAudit
- highlight.js CDN (github-dark theme + XML language) loaded in head

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added DELETE /api/audit/:slug/patch route**
- **Found during:** Task 1
- **Issue:** Frontend `rejectPatch()` method calls `DELETE /api/audit/:slug/patch` but no backend route existed
- **Fix:** Added DELETE route that removes `pendingPatch` from page-audit.json for the given slug
- **Files modified:** autopilot/routes/api.js
- **Commit:** 304030b

**2. [Rule 2 - Missing functionality] Added GET /api/audit-status route**
- **Found during:** Task 1
- **Issue:** Frontend Chutes section needs audit-status.json data but no route existed to serve it
- **Fix:** Added GET route that reads and returns audit-status.json (or {} if absent)
- **Files modified:** autopilot/routes/api.js
- **Commit:** 304030b

## Known Stubs

- **Drill-down detail panel** (index.html, audit tab): Shows placeholder text "panneau complet dans Plan 02" -- intentional, will be fully implemented in Plan 02
- **applyPatch method**: Calls the existing POST /api/audit/:slug/apply route but Plan 02 will add the confirmation modal UI

## Verification

- `node --test tests/audit-routes.test.js`: 7/7 pass
- `node --test tests/api-audit.test.js`: 5/5 pass (no regression)
- Sidebar button present with shield-check icon
- Health grid renders with score badges and issue counts
- SSE handler registered for audit-complete events
- avgSeoScore returned in stats response

## Self-Check: PASSED
