---
phase: 06-dashboard-backend
plan: 02
subsystem: api
tags: [express, sse, gsc, googleapis, js-yaml, node-test, tdd, rankings-cache, d3-hierarchy]

# Dependency graph
requires:
  - phase: 06-01
    provides: activity-logger.js (readRecentActivity, formatActivity, writePipelineStatus), routes/auth.js (isAuthenticated), server.js session middleware
  - phase: 05
    provides: deploy-orchestrator.js (triggerDeploy, readPendingArray), state/pending.json
  - phase: 04
    provides: gsc-ping.js (GSC auth pattern to replicate)
provides:
  - autopilot/pipeline/gsc-rankings.js (getRankings with 1h TTL cache + graceful fallback)
  - autopilot/routes/api.js (apiRouter with 7 routes + buildLinkTree pure function)
  - autopilot/server.js updated (apiRouter + /dashboard auth gate mounted)
affects:
  - Phase 7 (dashboard frontend — all 7 API endpoints ready to consume)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GSC Search Analytics with 1h TTL cache in state/rankings-cache.json
    - SSE handler with 100ms debounce (Windows double-fire) and req.on('close') cleanup
    - D3-hierarchy consumable JSON tree built from content-map.yaml (buildLinkTree)
    - DI pattern on getRankings (_searchConsole injectable) for test isolation
    - Pure exported function pattern (buildLinkTree) for unit-testability without HTTP server

key-files:
  created:
    - autopilot/pipeline/gsc-rankings.js
    - autopilot/routes/api.js
  modified:
    - autopilot/server.js
    - autopilot/tests/api-rankings.test.js
    - autopilot/tests/api-articles.test.js
    - autopilot/tests/api-links.test.js
    - autopilot/tests/api-sse.test.js

key-decisions:
  - "buildLinkTree exported as pure function (not private) so unit tests can call it directly without HTTP server setup"
  - "SSE test triggers req.on('close') listener manually to clear keepalive interval — prevents test process hang"
  - "keywordsTop10 in /api/stats reads from rankings-cache.json directly (no getRankings call) to avoid latency on stats endpoint"
  - ".env.example already had all 3 Dashboard keys from Plan 01 — no update needed"

patterns-established:
  - "SSE cleanup: always capture req.on('close', fn) listener in tests to prevent process hang from setInterval"
  - "Graceful GSC fallback: return { error, rows: [] } — never throw from getRankings()"
  - "Route handler pure logic extraction: export helpers (buildLinkTree) for testability"

requirements-completed:
  - F2.1
  - F2.2
  - F2.3
  - F2.4
  - F2.5
  - F2.6
  - F2.8
  - F3.1
  - F3.2

# Metrics
duration: 25min
completed: 2026-03-31
---

# Phase 6 Plan 2: Dashboard API Routes Summary

**7 Express API routes (articles/rankings/links/pipeline-status/SSE/activity/stats + approve) with GSC 1h-TTL rankings cache, D3-hierarchy link tree, SSE with Windows debounce, all gated behind isAuthenticated**

## Performance

- **Duration:** ~25 minutes
- **Started:** 2026-03-31T12:30:00Z
- **Completed:** 2026-03-31T12:55:00Z
- **Tasks:** 3/3
- **Files created:** 2 | **Files modified:** 5

## Accomplishments

- GSC rankings module with 1h TTL cache — never throws, graceful { error, rows: [] } fallback on 403 or missing credentials
- All 7 dashboard API routes implemented and exported via apiRouter, with SSE endpoint featuring 100ms Windows debounce and req.on('close') cleanup
- buildLinkTree() pure exported function that converts content-map.yaml into D3-hierarchy consumable tree (pillar/cluster grouping + Pages Services node for external refs)

## Task Commits

1. **Task 1: gsc-rankings.js + api-rankings tests** - `73f7af3` (feat)
2. **Task 2: routes/api.js + fill 3 test stub files** - `75302f3` (feat)
3. **Task 3: Mount apiRouter on server.js** - `64d137b` (feat)

## Files Created/Modified

- `autopilot/pipeline/gsc-rankings.js` — GSC Search Analytics with 1h TTL cache, loadHighPriorityKeywords() from seo-keywords.csv, _searchConsole DI
- `autopilot/routes/api.js` — Express Router: 7 routes + buildLinkTree pure function + mapStatus helper
- `autopilot/server.js` — Added apiRouter import + `app.use('/api', isAuthenticated, apiRouter)` + `/dashboard` auth gate
- `autopilot/tests/api-rankings.test.js` — 3 real tests: cache hit, cache miss (GSC called), graceful error fallback
- `autopilot/tests/api-articles.test.js` — 3 real tests: article field shape, mapStatus pending/published/queued
- `autopilot/tests/api-links.test.js` — 3 real tests: root node shape, cluster grouping, Pages Services node
- `autopilot/tests/api-sse.test.js` — 3 real tests: pipeline-status shape, idle state, SSE Content-Type header

## Decisions Made

- `buildLinkTree` exported as named function rather than kept private — enables direct unit testing without spinning up HTTP server
- SSE test captures the `req.on('close')` listener and calls it at test end — prevents process hang from lingering `setInterval(keepalive, 30000)`
- `/api/stats` reads rankings-cache.json directly rather than calling `getRankings()` — avoids 1h wait or GSC call overhead on a lightweight stats endpoint
- `.env.example` already contained all 3 Dashboard auth keys from Plan 01 — skipped update, no duplicates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `require` accidentally left in api-sse.test.js (ESM context)**
- **Found during:** Task 2 (running test suite after GREEN implementation)
- **Issue:** Test file had `JSON.parse(require ? '' : '{}')` — leftover from draft. `require` is not defined in ESM modules, causing `ReferenceError`.
- **Fix:** Removed the dead `require` reference; replaced with a direct assertion on the idleResult shape.
- **Files modified:** `autopilot/tests/api-sse.test.js`
- **Verification:** `node --test tests/api-sse.test.js` exits 0, 3/3 pass
- **Committed in:** `75302f3` (Task 2 commit)

**2. [Rule 1 - Bug] SSE test kept process alive — exit code 124 (timeout)**
- **Found during:** Task 2 (running full test suite after implementing api-sse.test.js)
- **Issue:** SSE handler registers `setInterval(keepalive, 30000)` but the test's `req.on()` was a no-op — the close listener was never captured, so clearInterval was never called, and the process hung until timeout.
- **Fix:** Changed mock `req.on()` in SSE test to capture `'close'` listener, then called it at end of test to trigger cleanup.
- **Files modified:** `autopilot/tests/api-sse.test.js`
- **Verification:** `node --test tests/api-sse.test.js` exits 0 (not 124), 3/3 pass
- **Committed in:** `75302f3` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug in test code)
**Impact on plan:** Both fixes corrected test infrastructure issues. No changes to production route logic.

## Issues Encountered

- The autopilot directory is a separate git sub-repo (not the parent `E:/Site CL` repo) — git add from parent fails with "ignored by .gitignore". All commits were made from `E:/Site CL/autopilot/`.

## Known Stubs

None — all Wave 0 stubs from Plan 01 have been replaced with real assertions. Route implementations are complete with no placeholder data.

## Next Phase Readiness

- All 7 API endpoints are live, auth-gated, and tested: ready for Phase 7 frontend consumption
- SSE stream watches pipeline-status.json + pending.json — Phase 7 can connect immediately
- `/dashboard` route is auth-gated (placeholder) — Phase 7 adds `express.static('dashboard')` after the auth middleware
- Rankings cache will auto-populate on first `/api/rankings` call with real GSC credentials

## Self-Check: PASSED

- `autopilot/pipeline/gsc-rankings.js` exists: YES
- `autopilot/routes/api.js` exists: YES
- `grep -q "export async function getRankings" autopilot/pipeline/gsc-rankings.js`: YES
- `grep -q "export const apiRouter" autopilot/routes/api.js`: YES
- `grep -q "export function buildLinkTree" autopilot/routes/api.js`: YES
- `grep -q "isAuthenticated, apiRouter" autopilot/server.js`: YES
- `grep -q "'/dashboard', isAuthenticated" autopilot/server.js`: YES
- Commit 73f7af3 exists: YES
- Commit 75302f3 exists: YES
- Commit 64d137b exists: YES
- Tests 40/40 pass (activity-logger + auth + api-articles + api-links + api-sse + api-rankings): YES

---

*Phase: 06-dashboard-backend*
*Completed: 2026-03-31*
