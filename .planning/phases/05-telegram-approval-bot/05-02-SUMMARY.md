---
phase: 05-telegram-approval-bot
plan: 02
subsystem: telegram
tags: [telegraf, anthropic, claude-sonnet, edit-in-place, approval-bot, validation]

# Dependency graph
requires:
  - phase: 05-telegram-approval-bot/plan-01
    provides: "Bot skeleton with preview/approve/edit handlers, pending array management"
  - phase: 04-sftp-deploy-gsc
    provides: "deploy-orchestrator with readPendingArray, writePendingItem, removePendingBySlug"
provides:
  - "edit-handler.js: Claude edit-in-place with rule guardrails"
  - "Full bot text handler: edit -> validate -> preview cycle"
  - "Abandon flow: 3-edit limit marks article abandoned"
  - "server.js starts bot on launch"
  - "run.js stack limit check blocks at 3 pending articles"
  - "run.js sends Telegram preview after article generation"
affects: [06-dashboard-ui, 07-cron-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns: [edit-in-place-via-claude, abandon-flow-yaml-mutation, stack-limit-guard]

key-files:
  created:
    - autopilot/telegram/edit-handler.js
    - autopilot/tests/edit-handler.test.js
  modified:
    - autopilot/telegram/bot.js
    - autopilot/server.js
    - autopilot/pipeline/run.js
    - autopilot/.env.example
    - autopilot/tests/telegram-bot.test.js

key-decisions:
  - "Edit-handler uses same streaming pattern as generator.js for consistency"
  - "abandonArticle uses string replacement (not YAML parser) to preserve comments -- same pattern as deploy-orchestrator"

patterns-established:
  - "DI for fs operations: readFileSync/writeFileSync injected via deps for testable file I/O in bot handlers"
  - "Stack limit check before pipeline Step 0: readPendingArray + MAX_PENDING_ARTICLES guard"

requirements-completed: [F1.7a]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 05 Plan 02: Edit-in-Place + Bot Wiring + Stack Limit Summary

**Claude edit-in-place with guardrails (no rTMS, data-price), 3-edit abandon flow, server.js bot startup, and run.js stack limit blocking at 3 pending articles**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T15:44:03Z
- **Completed:** 2026-03-30T15:49:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Edit-in-place handler calls Claude with rule guardrails and re-validates edited HTML
- Bot text handler wired to full edit cycle: editArticle -> validateArticle -> preview/abandon
- 3-edit limit enforced: sends alert, marks abandoned in content-queue.yaml, removes from pending
- Pipeline blocks generation when 3 articles pending and sends Telegram reminder
- server.js auto-starts bot on launch
- run.js sends Telegram preview after article generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Edit-in-place handler + bot text handler wiring + abandon flow** - `e30c3a1` (feat)
2. **Task 2: Wire bot into server.js + stack limit in run.js + RENDER_URL** - `626baa8` (feat)

## Files Created/Modified
- `autopilot/telegram/edit-handler.js` - Claude edit-in-place with EDIT_SYSTEM_PROMPT guardrails
- `autopilot/telegram/bot.js` - Full text handler with edit/validate/preview cycle + abandonArticle helper
- `autopilot/server.js` - Imports and calls startBot(app) after Express listen
- `autopilot/pipeline/run.js` - Stack limit check + writePendingItem + Telegram preview send
- `autopilot/.env.example` - Added RENDER_URL for production webhook
- `autopilot/tests/edit-handler.test.js` - 5 tests for edit-handler
- `autopilot/tests/telegram-bot.test.js` - Updated with 5 new tests (15 total)

## Decisions Made
- Edit-handler uses same streaming pattern as generator.js for consistency
- abandonArticle uses string replacement (not YAML parser) to preserve comments in content-queue.yaml
- DI for fs operations (readFileSync/writeFileSync) injected via deps for testable file I/O

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing readFileSync import in test file**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** telegram-bot.test.js imported writeFileSync but not readFileSync from node:fs, causing test deps to fail
- **Fix:** Added readFileSync to the import statement
- **Files modified:** autopilot/tests/telegram-bot.test.js
- **Verification:** All 15 tests pass
- **Committed in:** e30c3a1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor import fix, no scope creep.

## Issues Encountered
None beyond the import fix above.

## Known Stubs
None - all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Telegram approval cycle is complete: preview -> approve/edit -> validate -> deploy
- Ready for Phase 06 (Dashboard UI) which mirrors Telegram approval in web interface
- run.js stack limit ensures pipeline respects pending article cap

---
*Phase: 05-telegram-approval-bot*
*Completed: 2026-03-30*
