---
phase: 04-sftp-deploy-gsc-ping
plan: "01"
subsystem: deploy
tags: [sftp, ssh2-sftp-client, p-retry, googleapis, gsc, atomic-deploy]

# Dependency graph
requires:
  - phase: 03-image-generation
    provides: "generateImage() module with imagePath output for deploy"
  - phase: 01-foundation
    provides: "DI pattern, pino logger, p-retry, env loading"
provides:
  - "deployFiles() — atomic SFTP upload with temp+rename pattern and p-retry"
  - "pingGsc() — GSC URL Inspection API ping with graceful error handling"
affects: [04-02-deploy-orchestrator, 05-telegram-approval, 08-cron-production]

# Tech tracking
tech-stack:
  added: [ssh2-sftp-client, p-retry, googleapis]
  patterns: [atomic-temp-rename-deploy, graceful-never-throw, dependency-injection]

key-files:
  created:
    - autopilot/pipeline/sftp-deployer.js
    - autopilot/pipeline/gsc-ping.js
    - autopilot/tests/sftp-deployer.test.js
    - autopilot/tests/gsc-ping.test.js
  modified:
    - autopilot/.env.example
    - autopilot/tests/env-example.test.js

key-decisions:
  - "coverageState 'not indexed' exclusion: lowercase match for 'indexed' excludes strings containing 'not indexed' to avoid false positive already_indexed status"
  - "SFTP_REMOTE_PATH env var with '/' default: configurable remote web root for IONOS flexibility"

patterns-established:
  - "Atomic deploy: upload as .tmp then rename in separate phase — prevents half-written files"
  - "Graceful never-throw: gsc-ping returns status object on any failure, never throws"

requirements-completed: [F1.8, F1.9]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 4 Plan 01: SFTP Deployer + GSC Ping Summary

**Atomic SFTP deployer with temp+rename pattern and GSC URL Inspection ping with graceful error handling — both DI-testable, 11 new tests, 90 total passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T13:44:23Z
- **Completed:** 2026-03-30T13:49:16Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- deployFiles() uploads 4-5 files atomically via SFTP using temp+rename pattern with p-retry (1 retry)
- pingGsc() submits URLs to GSC URL Inspection API, returns status without ever throwing
- Both modules follow the established DI pattern from image-generator.js for full testability
- 90 total tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: sftp-deployer.js module with TDD tests** - `2aec5e9` (feat)
2. **Task 2: gsc-ping.js module with TDD tests** - `5c7a294` (feat)

## Files Created/Modified
- `autopilot/pipeline/sftp-deployer.js` - Atomic SFTP deploy with temp+rename, p-retry, DI
- `autopilot/pipeline/gsc-ping.js` - GSC URL Inspection API ping, graceful error handling
- `autopilot/tests/sftp-deployer.test.js` - 6 tests covering uploads, atomic pattern, retry, credentials
- `autopilot/tests/gsc-ping.test.js` - 5 tests covering submit, error, skip, args, already-indexed
- `autopilot/.env.example` - Added SFTP_REMOTE_PATH with default /
- `autopilot/tests/env-example.test.js` - Added SFTP_REMOTE_PATH to required keys and non-secret allowlist

## Decisions Made
- coverageState matching uses negative exclusion (`not indexed`) to prevent false positives on strings like "Crawled - currently not indexed"
- SFTP_REMOTE_PATH defaults to `/` but is configurable for different IONOS setups (could be `/html/` or `/htdocs/`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GSC coverageState "not indexed" false positive**
- **Found during:** Task 2 (gsc-ping GREEN phase)
- **Issue:** Case-insensitive `.includes('indexed')` matched "Crawled - currently not indexed" as already_indexed
- **Fix:** Added `!lower.includes('not indexed')` exclusion to the indexed check
- **Files modified:** autopilot/pipeline/gsc-ping.js
- **Verification:** Test 1 now correctly returns "submitted" for "not indexed" states
- **Committed in:** 5c7a294

**2. [Rule 3 - Blocking] Updated env-example.test.js for SFTP_REMOTE_PATH**
- **Found during:** Task 2 (full suite regression check)
- **Issue:** env-example test failed because SFTP_REMOTE_PATH=/ has a non-empty default value not in the allowlist
- **Fix:** Added SFTP_REMOTE_PATH to requiredKeys array and non-secret allowlist
- **Files modified:** autopilot/tests/env-example.test.js
- **Verification:** All 90 tests pass
- **Committed in:** 5c7a294

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None - both modules are fully functional with real implementations.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- sftp-deployer.js and gsc-ping.js ready for import by deploy-orchestrator.js (Plan 04-02)
- SFTP_REMOTE_PATH must be verified with WinSCP before production use (existing blocker in STATE.md)
- GSC service account must be configured before production GSC pings work (existing blocker in STATE.md)

## Self-Check: PASSED

- FOUND: autopilot/pipeline/sftp-deployer.js
- FOUND: autopilot/pipeline/gsc-ping.js
- FOUND: autopilot/tests/sftp-deployer.test.js
- FOUND: autopilot/tests/gsc-ping.test.js
- FOUND: commit 2aec5e9
- FOUND: commit 5c7a294

---
*Phase: 04-sftp-deploy-gsc-ping*
*Completed: 2026-03-30*
