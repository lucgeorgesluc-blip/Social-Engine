---
phase: 03-image-generation
plan: 01
subsystem: pipeline
tags: [gemini, google-genai, sharp, webp, image-generation, pino]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "@google/genai SDK, sharp, pino, gemini-model.txt, test infrastructure"
  - phase: 02-article-generation-pipeline
    provides: "run.js orchestrator, cost-logger.js, topic-selector with slug/title/target_keywords"
provides:
  - "generateImage() async function with graceful fallback"
  - "buildImagePrompt() helper for topic-derived prompts"
  - "run.js Step 4.5 image generation between validate and write"
  - "Gemini cost logging to cost.jsonl ($0.039/image)"
affects: [04-sftp-deploy, 05-telegram-approval]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Dependency injection via _aiClient for testable API calls", "Graceful fallback pattern: try/catch returning { success: false } instead of throwing", "sharp buffer-to-WebP pipeline with size enforcement"]

key-files:
  created:
    - autopilot/pipeline/image-generator.js
    - autopilot/tests/image-generator.test.js
  modified:
    - autopilot/pipeline/run.js

key-decisions:
  - "DI via _aiClient parameter (not node:test mock.method) for clean testability"
  - "Single try with catch (not p-retry) since graceful fallback makes retry unnecessary"
  - "Re-encode at quality 70 if WebP exceeds 300KB threshold"

patterns-established:
  - "Dependency injection via _aiClient: mock AI clients in tests without module-level patching"
  - "Graceful pipeline step: return { success, reason } never throw; caller logs warning and continues"

requirements-completed: [F1.6]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 3 Plan 1: Image Generator Module + run.js Integration Summary

**Gemini image generation via @google/genai with sharp 800x450 WebP processing and graceful pipeline fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T12:48:45Z
- **Completed:** 2026-03-30T12:52:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- image-generator.js module: calls Gemini API, processes response with sharp to exact 800x450 WebP @q85, enforces 300KB size limit
- 7 unit tests covering all F1.6 requirements (dry-run, missing API key, API errors, no-image response, success path with dimensions check, prompt content, file size)
- run.js pipeline wired with Step 4.5 image generation between validate and write, with Gemini cost tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create image-generator.js module with TDD tests** - `14a8cd8` (feat)
2. **Task 2: Wire image generation into run.js pipeline + Gemini cost logging** - `ae9e15e` (feat)

_Note: Task 1 followed TDD: tests written first (RED confirmed via missing module), then implementation (GREEN with all 7 passing)_

## Files Created/Modified
- `autopilot/pipeline/image-generator.js` - generateImage() + buildImagePrompt() with @google/genai SDK, sharp processing, graceful fallback
- `autopilot/tests/image-generator.test.js` - 7 unit tests using mocked AI client + real sharp buffer processing
- `autopilot/pipeline/run.js` - Added Step 4.5 image generation, Gemini cost logging, hasImage status in final log

## Decisions Made
- Dependency injection via `_aiClient` parameter chosen over `node:test mock.method` for cleaner, more explicit testing
- Single try/catch without p-retry since the graceful fallback pattern makes retries unnecessary (image is optional)
- Re-encode at quality 70 when file exceeds 300KB (programmatic size enforcement)
- Windows temp dir cleanup uses try/catch with maxRetries to handle EBUSY lock gracefully

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Windows EBUSY on temp dir cleanup in tests**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `rmSync` in test `after()` hook fails with EBUSY on Windows when sharp still holds file handles
- **Fix:** Wrapped cleanup in try/catch with `maxRetries: 3, retryDelay: 100`; falls back to OS cleanup
- **Files modified:** autopilot/tests/image-generator.test.js
- **Verification:** Tests pass without cleanup failure (7/7 green)
- **Committed in:** 14a8cd8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor Windows compatibility fix. No scope creep.

## Issues Encountered
None beyond the Windows EBUSY fix documented above.

## Known Stubs
None - all functionality is wired end-to-end. The generateImage function calls real @google/genai SDK in production (mocked only in tests).

## User Setup Required
None - GOOGLE_AI_API_KEY was already configured in Phase 1. The module gracefully handles missing key.

## Next Phase Readiness
- Image generation module ready for production use in the pipeline
- Phase 4 (SFTP deploy) should skip uploading non-existent image files when generation fails
- Phase 5 (Telegram approval) can include image status in notification message

---
*Phase: 03-image-generation*
*Completed: 2026-03-30*
