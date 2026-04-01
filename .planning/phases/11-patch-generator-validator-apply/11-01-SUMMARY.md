---
phase: 11-patch-generator-validator-apply
plan: 01
subsystem: audit
tags: [claude-api, cheerio, html-validation, patch-generation, streaming]

requires:
  - phase: 01-foundation-scaffolding
    provides: "Anthropic SDK setup, cost-logger.js, constants.js, ESM + pino patterns"
  - phase: 09-audit-foundation
    provides: "signal-extractor.js cheerio pattern, audit runner, page-audit.json structure"
provides:
  - "patch-generator.js: Claude streaming snippet generation with never-auto-apply guard"
  - "patch-validator.js: 8-check HTML safety validation (pure function)"
  - "audit-config.js: NEVER_AUTO_APPLY list + PATCH_MODEL + PATCH_MAX_TOKENS constants"
affects: [11-patch-generator-validator-apply plan 02, 12-dashboard-audit-tab]

tech-stack:
  added: []
  patterns: ["never-auto-apply guard pattern", "snippet injection (not full-page rewrite)", "8-check validator pure function"]

key-files:
  created:
    - autopilot/config/audit-config.js
    - autopilot/audit/patch-generator.js
    - autopilot/audit/patch-validator.js
    - autopilot/tests/patch-generator.test.js
    - autopilot/tests/patch-validator.test.js
    - autopilot/tests/fixtures/patches/valid-page.html
    - autopilot/tests/fixtures/patches/missing-canonical.html
    - autopilot/tests/fixtures/patches/invalid-jsonld.html
    - autopilot/tests/fixtures/patches/duplicate-schema-type.html
    - autopilot/tests/fixtures/patches/alpine-xdata.html
  modified: []

key-decisions:
  - "Validator uses decodeEntities: false on all cheerio load() calls to preserve French accents"
  - "NOT_IDEMPOTENT check delegated to caller (apply flow) since validator lacks patch application logic"
  - "isNeverAutoApply checks issue.code against list, returns early before any Claude API call"

patterns-established:
  - "Never-auto-apply guard: check before API call, return { blocked: true } immediately"
  - "Patch validator pure function: no I/O, no DI needed, takes original+patched HTML strings"

requirements-completed: [F4.6, F4.7]

duration: 7min
completed: 2026-04-01
---

# Phase 11 Plan 01: Patch Generator + Validator Summary

**Claude streaming patch generator with never-auto-apply guard and 8-check HTML safety validator using cheerio**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-01T14:46:21Z
- **Completed:** 2026-04-01T14:53:53Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Patch generator with Claude API streaming, DI for testing, and cost logging to cost.jsonl
- Never-auto-apply guard blocking AGGREGATE_RATING, CANONICAL_CHANGE, TITLE_CHANGE, ROBOTS_CHANGE, MULTI_FILE_PATCH
- 8-check patch validator: HTML parse, JSON-LD validity, canonical count, Alpine x-data, duplicate schema types, word count, data-price preservation
- 17 unit tests all passing (8 generator + 9 validator) with mocked Claude client

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audit-config.js, patch-generator.js, and patch-validator.js** - `e95aa5b` (feat)
2. **Task 2: Create HTML fixtures and unit tests** - `706bed9` (test)

## Files Created/Modified
- `autopilot/config/audit-config.js` - NEVER_AUTO_APPLY list + PATCH_MODEL + PATCH_MAX_TOKENS
- `autopilot/audit/patch-generator.js` - Claude streaming patch generation with DI and cost logging
- `autopilot/audit/patch-validator.js` - 8-check pure validation function using cheerio
- `autopilot/tests/patch-generator.test.js` - 8 tests for generator + never-auto-apply guard
- `autopilot/tests/patch-validator.test.js` - 9 tests covering all check scenarios
- `autopilot/tests/fixtures/patches/valid-page.html` - Baseline valid HTML page
- `autopilot/tests/fixtures/patches/missing-canonical.html` - No canonical tag
- `autopilot/tests/fixtures/patches/invalid-jsonld.html` - Broken JSON-LD
- `autopilot/tests/fixtures/patches/duplicate-schema-type.html` - Two HealthAndBeautyBusiness blocks
- `autopilot/tests/fixtures/patches/alpine-xdata.html` - Two x-data elements

## Decisions Made
- Validator uses `decodeEntities: false` on all cheerio `load()` calls to preserve French accents (Research Pitfall 1)
- NOT_IDEMPOTENT check is caller responsibility -- validator cannot re-apply the patch since it lacks the application logic
- `isNeverAutoApply` checks `issue.code` against the NEVER_AUTO_APPLY list and returns early before any Claude API call

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree lacked autopilot/node_modules and autopilot/pipeline -- resolved by running npm install and copying cost-logger.js. Autopilot has its own git repo (gitignored in site repo).

## Known Stubs

None - all modules are fully implemented.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- patch-generator.js and patch-validator.js ready for Plan 02 to wire into API routes
- Plan 02 will add apply flow (backup + cheerio mutation + SFTP deploy + rollback)

## Self-Check: PASSED

- All 10 files verified present on disk
- Both commits (e95aa5b, 706bed9) verified in git log
- 17/17 tests passing

---
*Phase: 11-patch-generator-validator-apply*
*Completed: 2026-04-01*
