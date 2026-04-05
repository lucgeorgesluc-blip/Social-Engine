---
phase: 10-cannibalization-ranking-trigger
plan: 02
subsystem: audit
tags: [fs-watch, debounce, ranking-watcher, api-routes, audit-trigger]

requires:
  - phase: 09-audit-foundation
    provides: runAudit with slug filtering, page-audit.json state file
  - phase: 10-01
    provides: cannibalization detection module, page-inventory normalizeSlug
provides:
  - startRankingWatcher with fs.watch + 150ms debounce on live-rankings-history.json
  - detectDrops function comparing last two ranking snapshots
  - extractSlugFromUrl for URL-to-slug conversion
  - GET /api/audit returning full page-audit.json behind auth
  - GET /api/audit/:slug returning single page record or 404
  - audit-status.json trigger metadata tracking
affects: [dashboard-audit-panel, pipeline-monitoring]

tech-stack:
  added: []
  patterns: [DI-based fs.watch watcher, ranking drop detection with null safety]

key-files:
  created:
    - autopilot/audit/ranking-watcher.js
    - autopilot/tests/ranking-watcher.test.js
    - autopilot/tests/api-audit.test.js
  modified:
    - autopilot/routes/api.js
    - autopilot/server.js

key-decisions:
  - "150ms debounce (not 100ms) to differentiate from SSE watcher and handle Windows NTFS double-fire"
  - "Watcher returns null gracefully when history file missing — no server crash on fresh deploy"
  - "audit-status.json tracks running/completed state with full trigger metadata for dashboard consumption"

patterns-established:
  - "Ranking drop detection: compare last two snapshots, skip null positions, threshold >= 5"
  - "URL-to-slug extraction: parse pathname, strip blog/ prefix and .html suffix"

requirements-completed: [F4.5]

duration: 3min
completed: 2026-04-01
---

# Phase 10 Plan 02: Ranking Watcher + Audit API Summary

**fs.watch-based ranking drop watcher triggers runAudit on >= 5 position drops, with two authenticated API routes for audit data access**

## What Was Built

Three new files and two modified files connecting the Phase 9 audit engine to live ranking data:

1. **`audit/ranking-watcher.js`** -- Four exports:
   - `detectDrops(history)`: Compares last two ranking snapshots, returns drops >= 5 positions with null position safety
   - `extractSlugFromUrl(url)`: Parses URL pathname to extract page slug (handles both root and blog/ paths)
   - `startRankingWatcher(opts)`: Creates fs.watch on live-rankings-history.json with 150ms debounce, writes audit-status.json with trigger metadata, calls runAudit with affected slugs
   - `stopRankingWatcher(watcher)`: Safe cleanup with try/catch

2. **`routes/api.js`** -- Two new authenticated routes:
   - `GET /api/audit`: Returns full page-audit.json contents or `{ pages: {} }` default
   - `GET /api/audit/:slug`: Returns single slug record or 404

3. **`server.js`** -- Watcher wired into server boot after `app.listen()` callback

## Tests

- **14 unit tests** in `tests/ranking-watcher.test.js`: detectDrops (6 cases), extractSlugFromUrl (3 cases), startRankingWatcher (3 cases with DI spies), stopRankingWatcher (2 cases)
- **5 integration tests** in `tests/api-audit.test.js`: both routes tested with fixture data, missing files, and missing slugs

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| e236186 | test(10-02): add failing tests for ranking watcher |
| dc83e19 | feat(10-02): implement ranking watcher with fs.watch + 150ms debounce |
| e0aa778 | feat(10-02): add audit API routes + wire ranking watcher into server.js |

## Known Stubs

None -- all functionality is fully wired with no placeholder data.

## Self-Check: PASSED

- All 5 created/modified files exist
- All 3 commits verified (e236186, dc83e19, e0aa778)
- All 9 acceptance criteria grep checks pass
- 14/14 unit tests + 5/5 integration tests green
