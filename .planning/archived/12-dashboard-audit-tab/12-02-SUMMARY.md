---
phase: 12-dashboard-audit-tab
plan: 02
subsystem: ui, api, testing
tags: [alpine.js, express, signal-extractor, cannibalization, test-isolation]

requires:
  - phase: 12-dashboard-audit-tab/01
    provides: "Audit SEO tab with health grid, drill-down panel, patch preview/apply/reject flow"
  - phase: 10-cannibalization
    provides: "detectCannibalization() pure function for title similarity detection"
provides:
  - "Correct signal field mapping (hasAggregateRating/hasReviewContainer, canonical) in drill-down"
  - "Cannibalization enrichment in GET /api/audit/:slug response"
  - "Reliable concurrent test execution for audit test files"
affects: []

tech-stack:
  added: []
  patterns: ["AUTOPILOT_STATE_DIR env var override for test isolation", "temp directory per test file for concurrent safety"]

key-files:
  created: []
  modified:
    - autopilot/dashboard/index.html
    - autopilot/routes/api.js
    - autopilot/tests/api-audit.test.js
    - autopilot/tests/audit-routes.test.js

key-decisions:
  - "AUTOPILOT_STATE_DIR env var added to api.js for test isolation — allows concurrent test files to use separate state directories"

patterns-established:
  - "Temp state dir pattern: test files set process.env.AUTOPILOT_STATE_DIR before importing api.js to avoid shared-file race conditions"

requirements-completed: [F4.9]

duration: 9min
completed: 2026-04-01
---

# Phase 12 Plan 02: Dashboard Audit Tab Bug Fixes Summary

**Fixed signal field mismatches in drill-down (E-E-A-T/canonical), wired cannibalization to slug API, and isolated concurrent test execution**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-01T18:44:15Z
- **Completed:** 2026-04-01T18:53:21Z
- **Tasks:** 2/2 complete (1 code + 1 human verification)
- **Files modified:** 4

## Accomplishments

- signalList getter now reads `hasAggregateRating`/`hasReviewContainer` (not `hasReviewSignal`) and `s.canonical` (not `hasCanonical`) from actual signal extractor output
- GET /api/audit/:slug enriches response with `cannibalization` field via `detectCannibalization()` — returns matching pair slug, similarity score, severity, and shared tokens
- Test isolation fixed: api-audit.test.js uses temp directory via `AUTOPILOT_STATE_DIR` env var, eliminating race conditions when both test files run concurrently
- All 16 tests pass together (`node --test tests/api-audit.test.js tests/audit-routes.test.js`) and individually

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix signal field mismatches + wire cannibalization + fix test isolation** - `53a0cac` (fix)
2. **Task 2: Visual verification of complete Audit SEO tab** - checkpoint:human-verify APPROVED

Human confirmed:
- Signaux SEO section shows correct values (Canonical: Present via s.canonical, E-E-A-T: Absent via hasAggregateRating/hasReviewContainer)
- Cannibalization warning appears: "Cannibalisation detectee avec guide-complet-arret-tabac-troyes (similarite : 0.4)"
- Issues list shows critical first, then avertissements
- "Generer un patch" button visible in drill-down
- Score SEO moyen: 51/100 in stats header
- Red dot badge on sidebar tab

## Files Created/Modified

- `autopilot/dashboard/index.html` - Fixed signalList getter field names, removed stale Plan 02 comment
- `autopilot/routes/api.js` - Added detectCannibalization import, enriched GET /audit/:slug with cannibalization data, added AUTOPILOT_STATE_DIR env var support
- `autopilot/tests/api-audit.test.js` - Rewrote to use temp directory for STATE_DIR isolation
- `autopilot/tests/audit-routes.test.js` - Added cannibalization enrichment test

## Decisions Made

- Added `AUTOPILOT_STATE_DIR` env var override to api.js STATE_DIR — minimal non-breaking change that enables concurrent test file execution without shared filesystem race conditions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added AUTOPILOT_STATE_DIR env var to api.js for test isolation**
- **Found during:** Task 1 (test isolation fix)
- **Issue:** Plan's before/after backup/restore approach insufficient — both test files run as concurrent processes sharing the same filesystem path, causing race conditions regardless of hook correctness
- **Fix:** Added `process.env.AUTOPILOT_STATE_DIR || join(...)` to api.js and rewrote api-audit.test.js to use a unique temp directory
- **Files modified:** autopilot/routes/api.js, autopilot/tests/api-audit.test.js
- **Verification:** `node --test tests/api-audit.test.js tests/audit-routes.test.js` passes (16/16)
- **Committed in:** 53a0cac

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for test isolation correctness. Plan's approach was insufficient for concurrent process execution.

## Issues Encountered

None beyond the deviation above.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `node --test tests/api-audit.test.js tests/audit-routes.test.js` — 16/16 pass, 0 fail
- Pre-existing failures in gsc-ping.test.js (siteUrl format) and health.test.js (server startup) are out of scope

## Next Phase Readiness

- Dashboard audit tab is feature-complete with correct signal display and cannibalization warnings
- Human verification confirmed drill-down visual correctness, cannibalization warnings, and approve/reject flow
- Phase 12 complete — all plans executed

## Self-Check: PASSED

- autopilot/dashboard/index.html: FOUND
- autopilot/routes/api.js: FOUND
- .planning/phases/12-dashboard-audit-tab/12-02-SUMMARY.md: FOUND
- Commit 53a0cac: FOUND (autopilot sub-repo)

---
*Phase: 12-dashboard-audit-tab*
*Completed: 2026-04-01*
