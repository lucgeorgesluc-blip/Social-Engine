---
phase: 03-image-generation
plan: 02
subsystem: pipeline
tags: [regex, html-processing, graceful-fallback, image-generation]

# Dependency graph
requires:
  - phase: 03-image-generation
    plan: 01
    provides: "generateImage() with { success: boolean } return, run.js Step 4.5 integration"
provides:
  - "stripHeroImage() exported function for removing hero img tags from article HTML"
  - "Pipeline auto-strips broken img references when image generation fails"
affects: [04-sftp-deploy, 05-telegram-approval]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Regex-based HTML tag stripping with class-targeted selector pattern"]

key-files:
  created: []
  modified:
    - autopilot/pipeline/run.js
    - autopilot/tests/image-generator.test.js

key-decisions:
  - "Regex targets class='w-full h-auto object-cover' as unique hero image identifier rather than src path matching"
  - "stripHeroImage is an exported pure function for independent testability"

patterns-established:
  - "Class-based HTML tag targeting: use unique class combination to identify specific elements in generated HTML"

requirements-completed: [F1.6]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 3 Plan 2: Strip img Tag from HTML When Image Generation Fails Summary

**stripHeroImage() regex function removes hero img tag from article HTML on image generation failure, preventing broken image icons**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T13:19:55Z
- **Completed:** 2026-03-30T13:23:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Exported `stripHeroImage()` function using regex to target hero img by class="w-full h-auto object-cover"
- Wired into pipeline: called in `imageResult.success` else branch before `writeFileSync`
- 4 new unit tests covering hero removal, non-hero preservation, no-op, and multiline handling
- Full test suite (78 tests) passes with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stripHeroImage function + wire into pipeline (TDD)** - `e4b347e` (feat)

_Note: TDD flow followed — RED confirmed (import error), GREEN confirmed (11/11 pass), full suite verified (78/78 pass)_

## Files Created/Modified
- `autopilot/pipeline/run.js` - Added `stripHeroImage()` export, wired into Step 4.5 else branch, changed `html` from const to let
- `autopilot/tests/image-generator.test.js` - Added 4 tests (Tests 8-11) for stripHeroImage behavior

## Decisions Made
- Regex uses `class="w-full h-auto object-cover"` as the unique hero image identifier (all generated articles use this class combination; avatars and other images do not)
- Function exported as a named export for direct import in tests (pure function, no side effects)
- Used `s` and `g` flags on regex for multiline support and defensive duplicate handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- autopilot/ directory is gitignored in the main repo; committed to the autopilot sub-repo instead (consistent with 03-01 approach)

## Known Stubs
None - all functionality is wired end-to-end.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ROADMAP success criterion 3 now satisfied: article HTML does not reference missing image path when generation fails
- Phase 4 (SFTP deploy) can proceed; image-less articles will render correctly without broken img tags
- Phase 5 (Telegram approval) can include image status in notification

---
*Phase: 03-image-generation*
*Completed: 2026-03-30*

## Self-Check: PASSED
