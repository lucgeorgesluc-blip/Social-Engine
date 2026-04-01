---
phase: 09-audit-foundation
plan: 02
subsystem: audit
tags: [node, esm, pino, cheerio, tdd, seo-audit]

requires:
  - phase: 09-audit-foundation/01
    provides: "page-inventory.js, signal-extractor.js, page-scorer.js pure modules"
provides:
  - "runAudit() orchestrator entry point for full-site or subset SEO audit"
  - "state/page-audit.json slug-keyed audit results with scores, issues, signals, diff tracking"
affects: [10-ranking-trigger, 11-patch-generator, dashboard-backend]

tech-stack:
  added: []
  patterns: ["cross-page link analysis via href regex + normalizeSlug resolution", "previousSignals/diff tracking for change detection on re-scan", "subset mode: scan specific slugs while preserving full inventory for link analysis"]

key-files:
  created:
    - autopilot/audit/runner.js
    - autopilot/tests/audit-runner.test.js
  modified: []

key-decisions:
  - "Cross-page internalLinkInCount computed in runner (not extractor) since it requires all-page context"
  - "Subset mode always builds full inventory for accurate link counts but only scores target slugs"
  - "Diff computed via JSON.stringify comparison per field -- simple and deterministic"

patterns-established:
  - "Orchestrator pattern: runner imports 3 pure modules, adds cross-page enrichment, persists state"
  - "State evolution: previousSignals + diff enable change tracking across audit runs"

requirements-completed: [F4.1, F4.2, F4.3]

duration: 7min
completed: 2026-04-01
---

# Phase 09 Plan 02: Audit Runner Orchestrator Summary

**runAudit() wires page-inventory, signal-extractor, and page-scorer into a full-site audit flow with cross-page internalLinkInCount and state persistence to page-audit.json**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-01T08:14:55Z
- **Completed:** 2026-04-01T08:21:36Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files created:** 2

## Accomplishments

### Task 1: Audit runner orchestrator (TDD)

Created `autopilot/audit/runner.js` exporting `runAudit({ slugs, _basePath, _readFile, _stateDir })`:

1. **Inventory** -- calls `buildPageInventory()` to discover all HTML pages
2. **Signal extraction** -- calls `extractPageSignals()` for every page (full set needed for link analysis)
3. **Cross-page internalLinkInCount** -- parses each page's href attributes, resolves targets to slugs via `normalizeSlug()`, builds incoming-link counter map
4. **Scoring** -- calls `scorePageHealth()` with enriched signals (including internalLinkInCount)
5. **State persistence** -- writes `state/page-audit.json` with slug-keyed entries: score, issues, signals, previousSignals, diff, lastScanned
6. **Change tracking** -- on re-scan, computes diff between current and previous signals per field
7. **Subset mode** -- `slugs` param scans only specified pages but preserves full inventory for accurate link counts

Integration test suite: 7 test cases covering full audit, required fields, determinism, cross-page link counts, subset mode, previousSignals/diff, and return-value/file parity.

**Verification:** 68 pages scanned successfully on the real site.

## Commits

| Hash | Type | Message |
|------|------|---------|
| c104271 | test | add failing integration tests for audit runner (TDD RED) |
| d0c67b7 | feat | implement audit runner orchestrator with cross-page link analysis (TDD GREEN) |

## Test Results

- **Phase 9 tests:** 41/41 pass (page-inventory + signal-extractor + page-scorer + audit-runner)
- **Full suite:** 90/90 pass (no regressions)

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functionality is fully wired and operational.
