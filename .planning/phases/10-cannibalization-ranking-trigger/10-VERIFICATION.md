---
phase: 10-cannibalization-ranking-trigger
verified: 2026-04-01T14:30:00Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
gaps:
  - truth: "GET /api/audit returns full state/audit-results.json payload"
    status: partial
    reason: "Route reads page-audit.json, not audit-results.json. ROADMAP SC3 specifies audit-results.json. The file state/audit-results.json does not exist. The existing file is state/page-audit.json (written by Phase 9). This is a naming inconsistency between ROADMAP and implementation — both name the same audit data differently. The route works against existing Phase 9 output, but state/audit-results.json is never created, which breaks the ROADMAP contract."
    artifacts:
      - path: "autopilot/routes/api.js"
        issue: "Reads state/page-audit.json at line 484/500; ROADMAP SC3 specifies state/audit-results.json"
    missing:
      - "Either rename state/page-audit.json -> state/audit-results.json (and update all references in Phase 9 and Phase 10 code) OR update ROADMAP SC3 to say page-audit.json — one of these must be resolved so Phase 11 and 12 have a consistent contract"

  - truth: "After a ranking-drop trigger, state/audit-status.json records the shape specified in ROADMAP SC5"
    status: partial
    reason: "audit-status.json is written with correct data, but field names differ from ROADMAP SC5. ROADMAP expects top-level { triggeredAt, triggerKeyword, positionBefore, positionAfter, slugsScanned, completedAt }. Implementation writes { running, lastTrigger: { type, keyword, drop, previousPosition, currentPosition, affectedSlugs, triggeredAt }, lastCompleted }. The data exists but under different keys and nested structure. Phase 12 Dashboard will break if it reads the ROADMAP-specified field names."
    artifacts:
      - path: "autopilot/audit/ranking-watcher.js"
        issue: "Lines 135-146: writes lastTrigger.keyword instead of triggerKeyword, lastTrigger.previousPosition instead of positionBefore, lastTrigger.currentPosition instead of positionAfter, lastTrigger.affectedSlugs instead of slugsScanned, lastCompleted instead of completedAt"
    missing:
      - "Either update audit-status.json write in ranking-watcher.js to match ROADMAP SC5 field names, OR update ROADMAP SC5 to document the actual schema — must align before Phase 12 consumes this file"
human_verification:
  - test: "Confirm whether state/audit-results.json and state/page-audit.json are intended to be the same file"
    expected: "Either (a) audit-results.json is an alias for page-audit.json and the naming should be unified, or (b) they are distinct files with different schemas and Phase 10 should create audit-results.json separately"
    why_human: "ROADMAP uses audit-results.json in Phase 10 but page-audit.json everywhere else. Only the project owner can confirm whether this was an oversight or intentional divergence"
---

# Phase 10: Cannibalization + Ranking Trigger Verification Report

**Phase Goal:** The system automatically detects keyword-cannibalizing page pairs and triggers a fresh audit when any tracked keyword drops 5 or more positions — connecting the existing ranking history to the audit engine
**Verified:** 2026-04-01T14:30:00Z
**Status:** gaps_found (2 partial — data present, field names/file name mismatch vs ROADMAP contract)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `detectCannibalization()` returns page pairs with Jaccard >= 0.15, accent-stripped French tokens, cluster_id grouping (same-cluster first) | VERIFIED | cannibalization.js lines 79-188; 20 unit tests pass including severity levels, cluster ordering, cross-cluster filter |
| 2 | When live-rankings-history.json updates with a keyword drop >= 5, watcher triggers `runAudit(affectedSlugs)` via fs.watch + 150ms debounce | VERIFIED | ranking-watcher.js lines 28-166; 14 unit tests pass including DI spy confirming runAudit called with correct slugs |
| 3 | `GET /api/audit` returns full audit state payload behind session auth | PARTIAL | Route exists at api.js line 483, reads page-audit.json. ROADMAP SC3 specifies state/audit-results.json. File name mismatch — audit-results.json never created |
| 4 | `GET /api/audit/:slug` returns single page record or 404 | VERIFIED | Route exists at api.js line 499; 5 integration tests pass including 404 cases |
| 5 | `state/audit-status.json` records trigger metadata after ranking-drop | PARTIAL | Written at ranking-watcher.js lines 134-156. Data is correct but field names differ from ROADMAP SC5 spec (keyword vs triggerKeyword, previousPosition vs positionBefore, etc.) |

**Score:** 3/5 truths fully verified, 2/5 partial (data present, schema mismatch vs ROADMAP contract)

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `autopilot/config/fr-stopwords.js` | French stopword Set export | VERIFIED | 29 lines, exports FR_STOPWORDS Set with 70+ entries including brand/geo tokens (troyes, magnetiseuse, corinne, lacoste) |
| `autopilot/audit/cannibalization.js` | Cannibalization detection module | VERIFIED | 189 lines, exports normalizeTokens, jaccard, detectCannibalization; full two-pass algorithm with severity classification |
| `autopilot/tests/cannibalization.test.js` | Unit tests (min 80 lines) | VERIFIED | 189 lines, 20 tests across 3 describe blocks, all pass |
| `autopilot/audit/ranking-watcher.js` | Ranking drop watcher | VERIFIED | 178 lines, exports detectDrops, extractSlugFromUrl, startRankingWatcher, stopRankingWatcher; 150ms debounce |
| `autopilot/routes/api.js` | Two new audit routes | VERIFIED (partial concern) | Lines 483 and 499 contain GET /api/audit and GET /api/audit/:slug; reads page-audit.json (not audit-results.json per ROADMAP) |
| `autopilot/tests/ranking-watcher.test.js` | Unit tests (min 60 lines) | VERIFIED | 228 lines, 14 tests across 4 describe blocks, all pass |
| `autopilot/tests/api-audit.test.js` | Integration tests (min 40 lines) | VERIFIED | 154 lines, 5 tests across 2 describe blocks, all pass |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `autopilot/audit/cannibalization.js` | `autopilot/config/fr-stopwords.js` | `import { FR_STOPWORDS }` | VERIFIED | Line 12: `import { FR_STOPWORDS } from '../config/fr-stopwords.js'` |
| `autopilot/audit/ranking-watcher.js` | `autopilot/audit/runner.js` | `import { runAudit }` | VERIFIED | Line 17: `import { runAudit } from './runner.js'` |
| `autopilot/audit/ranking-watcher.js` | `autopilot/state/audit-status.json` | `writeFileSync` | VERIFIED | Lines 134-146, 151-157: writes audit-status.json with trigger metadata |
| `autopilot/routes/api.js` | `autopilot/state/page-audit.json` | `readFileSync` | VERIFIED (name gap) | Lines 484, 500: reads page-audit.json — ROADMAP specifies audit-results.json |
| `autopilot/server.js` | `autopilot/audit/ranking-watcher.js` | `import { startRankingWatcher }` | VERIFIED | Line 12: import; line 91: `startRankingWatcher()` called in app.listen callback |

## Data-Flow Trace (Level 4)

Not applicable — these artifacts are utility/service modules (pure functions, file watchers, API routes). No dynamic data rendered in a UI component. The data flows are verified through integration tests and key link checks above.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| cannibalization.test.js 20 tests | `node --test tests/cannibalization.test.js` | 20 pass, 0 fail | PASS |
| ranking-watcher.test.js 14 tests | `node --test tests/ranking-watcher.test.js` | 14 pass, 0 fail | PASS |
| api-audit.test.js 5 tests | `node --test tests/api-audit.test.js` | 5 pass, 0 fail | PASS |
| Module import check (cannibalization) | `node -e "import('./audit/cannibalization.js').then(m => console.log(Object.keys(m)))"` | normalizeTokens, jaccard, detectCannibalization | PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| F4.4 | 10-01-PLAN.md | Cannibalization Detector: Jaccard similarity, French stopwords, cluster-first grouping, severity levels | SATISFIED | cannibalization.js fully implemented; all 20 unit tests pass; severity thresholds >0.85/0.60/0.15 match spec |
| F4.5 | 10-02-PLAN.md | Ranking Trigger: fs.watch + 150ms debounce, drop >= 5, audit-status.json, GET /api/audit routes | PARTIAL | fs.watch watcher verified; GET routes working; audit-status.json schema differs from ROADMAP SC5; `POST /api/audit/run` (manual trigger per F4.5 spec) not implemented in this phase |

**Orphaned requirements check:** No requirement IDs mapped to Phase 10 in REQUIREMENTS.md other than F4.4 and F4.5.

**Note on `POST /api/audit/run`:** The F4.5 requirement description in REQUIREMENTS.md includes "Manual trigger: POST /api/audit/run (dashboard button + on-demand)". This route does not exist. However, the 10-02-PLAN.md did not include it in its must_haves or acceptance criteria — the plan scoped F4.5 to the automatic watcher only. This is a gap between the requirement spec and the plan scope.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None detected | — | — | — | — |

Checked: TODO, FIXME, placeholder patterns, empty implementations, return null/[]/{}. All early-return `null` and `[]` patterns are guarded input-validation guards (empty text, missing file, short history), not stub implementations.

## Human Verification Required

### 1. State File Name Contract

**Test:** Confirm whether `state/audit-results.json` and `state/page-audit.json` are the same file or different files with different schemas.
**Expected:** Either (a) `page-audit.json` IS the audit-results file and the ROADMAP Phase 10 SC3/State Files section has a naming error — in which case the ROADMAP should be updated, or (b) they are intentionally different and `audit-results.json` should include cannibalization pairs while `page-audit.json` is per-page health only — in which case ranking-watcher.js needs to write audit-results.json after merging cannibalization output.
**Why human:** Only the project owner can decide the intended schema split. The choice affects Phase 11 (which references `page-audit.json`) and Phase 12 (which references `audit-results.json`).

### 2. audit-status.json Schema Alignment

**Test:** Review whether Phase 12 dashboard code (when written) should read `lastTrigger.keyword` or `triggerKeyword` from audit-status.json.
**Expected:** Schema aligned before Phase 12 starts — either ranking-watcher.js is updated to write the ROADMAP SC5 field names, or ROADMAP SC5 is updated to document the actual schema.
**Why human:** Field name decision requires intent — the current schema is richer (includes `running`, `drop` delta, `type`) than the ROADMAP SC5 spec. The project owner should decide whether to expand the ROADMAP spec or simplify the implementation.

## Gaps Summary

Two gaps found, both structural (field/file name contracts) rather than missing functionality:

**Gap 1 — File name mismatch:** `GET /api/audit` reads `state/page-audit.json`. The ROADMAP Phase 10 SC3 says it should return `state/audit-results.json`. The file `state/audit-results.json` does not exist. All other Phase 9 and Phase 11 references use `page-audit.json`. This is most likely a naming inconsistency in the ROADMAP itself, but must be explicitly confirmed and resolved before Phase 11 begins, as Phase 11 references both names.

**Gap 2 — audit-status.json schema mismatch:** The written schema uses `lastTrigger.keyword`, `lastTrigger.previousPosition`, `lastTrigger.currentPosition`, `lastTrigger.affectedSlugs`, `lastCompleted`. The ROADMAP SC5 specifies `triggerKeyword`, `positionBefore`, `positionAfter`, `slugsScanned`, `completedAt` at the top level. The data is all present; the field names and nesting differ. Phase 12 Dashboard will read this file — the schema must be settled before that phase.

**Not a gap (clarification):** `POST /api/audit/run` appears in the F4.5 requirement spec but was not scoped into 10-02-PLAN.md. The plan explicitly scoped F4.5 to the automatic watcher only. This missing route should be tracked as a planned item for Phase 12 (dashboard button integration).

---

_Verified: 2026-04-01T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
