---
phase: 11-patch-generator-validator-apply
plan: 02
subsystem: audit
tags: [cheerio, sftp, backup, rollback, sse, patch-apply]

requires:
  - phase: 11-patch-generator-validator-apply plan 01
    provides: "patch-generator.js, patch-validator.js, audit-config.js"
  - phase: 09-audit-foundation
    provides: "runner.js runAudit, page-inventory.js buildPageInventory, signal-extractor.js"
  - phase: 04-sftp-deploy-gsc-ping
    provides: "SFTP deploy pattern via ssh2-sftp-client"
provides:
  - "patch-applier.js: applyPatch, rollbackPatch, applySnippet, writeBackup, pruneBackups"
  - "API routes: POST /api/audit/:slug/apply, /rollback, /patch"
  - "SSE watcher for audit-events.json"
affects: [12-dashboard-audit-tab]

tech-stack:
  added: []
  patterns: ["atomic local write (tmp+rename)", "SFTP single-file deploy with backup rollback", "audit event emission for SSE"]

key-files:
  created:
    - autopilot/audit/patch-applier.js
    - autopilot/tests/patch-apply.test.js
  modified:
    - autopilot/routes/api.js

key-decisions:
  - "Replace action is idempotent by nature; append action triggers NOT_IDEMPOTENT guard on double-apply"
  - "SFTP failure restores from backup immediately -- local file never left in corrupted state"
  - "Audit events written to state/audit-events.json as array, SSE watcher picks up changes"

patterns-established:
  - "Atomic local write: write to .tmp then rename -- prevents partial-write corruption"
  - "Backup management: state/backups/[slug]-[ISO-timestamp].html with auto-prune to 3"
  - "SFTP single-file deploy: buffer put to .tmp then rename on remote"

requirements-completed: [F4.8]

duration: 5min
completed: 2026-04-01
---

# Phase 11 Plan 02: Patch Apply Flow Summary

**Patch apply/rollback with backup management, SFTP single-file deploy, re-scan, and API routes with SSE audit events**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T14:58:58Z
- **Completed:** 2026-04-01T15:04:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Full apply flow: validate pending patch, backup original, cheerio inject, atomic write, SFTP deploy, re-scan, emit SSE event
- Rollback flow: find most recent backup, restore locally, SFTP re-deploy, clear pendingPatch
- Backup management with auto-prune to keep last 3 per slug, Windows-safe timestamps
- 3 API routes (apply, rollback, patch-generate) with SSE watcher for audit events
- 7 integration tests with DI mocks covering all flows including SFTP failure recovery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create patch-applier.js** - `9fb362f` (feat)
2. **Task 2: API routes + SSE watcher + integration tests** - `9749b45` (feat)

## Files Created/Modified
- `autopilot/audit/patch-applier.js` - applyPatch, rollbackPatch, applySnippet, writeBackup, pruneBackups with full DI
- `autopilot/routes/api.js` - Added 3 POST routes (apply, rollback, patch) + SSE watcher for audit-events.json + writeFileSync import
- `autopilot/tests/patch-apply.test.js` - 7 integration tests with temp dirs and mock SFTP/runAudit

## Decisions Made
- Replace action is naturally idempotent; append action correctly triggers NOT_IDEMPOTENT guard on double-apply
- SFTP failure immediately restores from backup -- local file never left in patched state after deploy failure
- Audit events stored as JSON array in state/audit-events.json; SSE watcher re-reads on change

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed idempotency check interaction with append action in tests**
- **Found during:** Task 2 (integration tests)
- **Issue:** Test used append action which is inherently non-idempotent (adds snippet twice). The idempotency guard correctly blocked it.
- **Fix:** Changed test patches to use replace action (which is naturally idempotent) to test the happy path
- **Files modified:** autopilot/tests/patch-apply.test.js
- **Verification:** All 7 tests pass
- **Committed in:** 9749b45 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-only adjustment; no production code change needed.

## Known Stubs

None - all modules are fully implemented.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 complete: generator, validator, and applier all wired end-to-end
- Phase 12 (dashboard audit tab) can consume POST /api/audit/:slug/apply, /rollback, /patch routes
- SSE audit events ready for real-time dashboard updates

---
*Phase: 11-patch-generator-validator-apply*
*Completed: 2026-04-01*
