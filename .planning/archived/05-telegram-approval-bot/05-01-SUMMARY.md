---
phase: 05-telegram-approval-bot
plan: 01
subsystem: telegram
tags: [telegraf, telegram-bot, inline-keyboard, approval-flow, pending-array]

# Dependency graph
requires:
  - phase: 04-deploy-pipeline
    provides: deploy-orchestrator with writePending, readPending, triggerDeploy
provides:
  - "telegram/preview.js: extractPreview, formatPreviewMessage for article HTML"
  - "telegram/bot.js: Telegraf bot with approve/edit/text handlers and inline keyboard"
  - "deploy-orchestrator.js: array-based pending management (readPendingArray, writePendingArray, writePendingItem, findPendingBySlug, removePendingBySlug)"
  - "constants.js: MAX_PENDING_ARTICLES=3, MAX_EDIT_CYCLES=3"
affects: [05-02-edit-in-place, 06-dashboard]

# Tech tracking
tech-stack:
  added: [telegraf]
  patterns: [DI _deps for handler testing, _handlers Map for direct handler invocation in tests, array-based pending.json with legacy migration guard]

key-files:
  created:
    - autopilot/telegram/preview.js
    - autopilot/telegram/bot.js
    - autopilot/tests/preview.test.js
    - autopilot/tests/telegram-bot.test.js
  modified:
    - autopilot/pipeline/deploy-orchestrator.js
    - autopilot/config/constants.js
    - autopilot/tests/deploy-orchestrator.test.js

key-decisions:
  - "Handler testing via _handlers Map + DI _deps — avoids Telegraf middleware complexity in tests"
  - "Array-based pending.json with migration guard wraps legacy single-object in [obj] automatically"
  - "triggerDeploy uses removePendingBySlug instead of unlinkSync — preserves other pending items"

patterns-established:
  - "Bot handler testing: createBot with _deps injection, _handlers.get('name') for direct invocation"
  - "Pending array CRUD: readPendingArray/writePendingArray/writePendingItem with _stateDir DI"

requirements-completed: [F1.7]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 05 Plan 01: Telegram Approval Bot Summary

**Telegraf bot with inline approve/edit keyboard, preview extraction from HTML, and array-based pending.json with legacy migration guard**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T15:35:07Z
- **Completed:** 2026-03-30T15:41:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Preview extraction module strips HTML, computes word count, link count, and image status for Telegram messages
- Pending.json migrated from single-object to array format with backward-compatible migration guard
- Telegram bot registers approve/edit/text handlers with chat ID security guard on all handlers
- Approve callback triggers triggerDeploy and sends confirmation with article URL
- Edit callback manages awaiting_edit state for future edit-in-place (Plan 02)
- 128/128 tests passing across full suite (38 in scope for this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Preview extraction + pending array migration** - `1db0cab` (test RED) + `cc0ee31` (feat GREEN)
2. **Task 2: Telegram bot core with approve flow** - `3cc3d27` (test RED) + `8d0bf0a` (feat GREEN)

_TDD tasks have two commits each (test then feat)_

## Files Created/Modified
- `autopilot/telegram/preview.js` - extractPreview and formatPreviewMessage for D-17 format
- `autopilot/telegram/bot.js` - Telegraf bot with approve/edit/text handlers, webhook/polling modes
- `autopilot/pipeline/deploy-orchestrator.js` - Added 5 array-based functions, updated triggerDeploy for slug parameter
- `autopilot/config/constants.js` - Added MAX_PENDING_ARTICLES=3, MAX_EDIT_CYCLES=3
- `autopilot/tests/preview.test.js` - 8 tests for preview extraction
- `autopilot/tests/telegram-bot.test.js` - 8 tests for bot handlers
- `autopilot/tests/deploy-orchestrator.test.js` - Updated existing tests + 8 new array tests

## Decisions Made
- Handler testing via `_handlers` Map and `_deps` DI pattern -- avoids needing to simulate full Telegraf middleware chain
- Array-based pending.json with `Array.isArray(data) ? data : [data]` migration guard preserves backward compat with Phase 04
- `triggerDeploy` now uses `removePendingBySlug` instead of `unlinkSync` to support multiple pending articles
- Updated existing Tests 5 and 7 assertions: pending.json now contains empty array `[]` instead of being deleted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing triggerDeploy test assertions for array format**
- **Found during:** Task 1
- **Issue:** Tests 5 and 7 checked `!existsSync(pendingPath)` but array-based removal writes `[]` instead of deleting the file
- **Fix:** Changed assertions to verify pending.json contains empty array
- **Files modified:** autopilot/tests/deploy-orchestrator.test.js
- **Verification:** All 30 deploy-orchestrator tests pass
- **Committed in:** cc0ee31

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for backward compatibility with array format. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars are already documented in Phase 01 research.

## Known Stubs
None - all functionality specified in this plan is fully wired. Edit-in-place Claude call is explicitly deferred to Plan 02 per plan spec.

## Next Phase Readiness
- Bot module ready for Plan 02 to wire edit-in-place Claude call on text handler
- `sendPreview` exported and ready for pipeline integration (run.js calls it after article generation)
- All array CRUD functions available for dashboard integration (Phase 06)

---
*Phase: 05-telegram-approval-bot*
*Completed: 2026-03-30*
