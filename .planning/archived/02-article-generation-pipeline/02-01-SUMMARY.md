---
phase: 02-article-generation-pipeline
plan: "01"
subsystem: autopilot/pipeline
tags: [pipeline, tdd, topic-selection, validation, cost-logging, loader]
dependency_graph:
  requires:
    - 01-01-SUMMARY.md (loader.js, constants.js base)
  provides:
    - autopilot/pipeline/topic-selector.js (selectTopic)
    - autopilot/pipeline/validator.js (validateArticle)
    - autopilot/pipeline/cost-logger.js (logCost, createRunGuard)
    - autopilot/config/loader.js (loadPipelineContext — extended)
  affects:
    - Plan 02-02 (generator, file-updater, orchestrator will import these)
tech_stack:
  added: []
  patterns:
    - TDD with Node.js built-in test runner (node:test)
    - Pure functions with inline mock data in tests (no file I/O in unit tests)
    - JSONL append for cost audit trail
    - Closure-based run guard for state isolation
key_files:
  created:
    - autopilot/pipeline/topic-selector.js
    - autopilot/pipeline/validator.js
    - autopilot/pipeline/cost-logger.js
    - autopilot/tests/topic-selector.test.js
    - autopilot/tests/validator.test.js
    - autopilot/tests/cost-logger.test.js
  modified:
    - autopilot/config/loader.js (added loadPipelineContext)
    - autopilot/tests/loader.test.js (added loadPipelineContext tests)
decisions:
  - "Slug derivation: use slug field from queue entry if present, else derive from title with NFD normalize + slug-char filter (matches D-09/D-10 exact-match requirement)"
  - "validator.js uses relaxed canonical regex (link[space][^>]*rel=canonical) to handle attribute order variations — matches real HTML patterns"
  - "cost-logger uses mkdirSync recursive to auto-create log parent dirs (avoids ENOENT on first run)"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 2
  tests_added: 37
  test_suites_passing: 4
  total_suite_tests: 58
---

# Phase 02 Plan 01: Pipeline Foundation Modules Summary

**One-liner:** Four pure-function pipeline modules (topic-selector, validator, cost-logger, extended loader) with 37 new tests — all 58 suite tests green.

## What Was Built

### Task 1: Extend loader.js + topic-selector.js + validator.js

**`autopilot/config/loader.js` — extended with `loadPipelineContext()`**
Adds 5 additional file reads on top of the existing 3 from `loadSiteConfig()`:
- `content-queue.yaml` — parsed YAML object (js-yaml)
- `seo-keywords.csv` — raw string
- `tone-guide.md` — raw string
- `blog-structures.yaml` — raw string
- `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — raw string

Returns all 8 keys needed for prompt assembly: `seoConfig, pricingSection, contentMapTrimmed, contentQueue, seoKeywordsCsv, toneGuide, blogStructures, articleInstructions`.

**`autopilot/pipeline/topic-selector.js` — `selectTopic(contentQueue, contentMapTrimmed)`**
- Filters queue for `status: "planned"` entries
- Sorts by `PRIORITY_MAP = { high: 3, medium: 2, low: 1 }` descending (D-09)
- Preserves file order for ties via stable Array.sort
- Uses `slug` field from queue entry if present; otherwise slugifies `title` with NFD normalization (handles French accented chars)
- Skips any candidate whose slug matches an existing entry in `contentMapTrimmed` (D-10 exact-match cannibalization check)
- Returns `{ selected: null, reason: "..." }` for no-planned and all-cannibalized cases

**`autopilot/pipeline/validator.js` — `validateArticle(html)`**
Runs 7 regex checks, returns `{ valid, checks, failures }`:
1. `DOCTYPE` — `html.trimStart().startsWith('<!DOCTYPE html>')`
2. `no-hard-prices` — `/\d+\s*€|€\s*\d+/` (both directions)
3. `no-rTMS` — case-insensitive `/rTMS|stimulation magnétique transcrânienne/i`
4. `has-data-price` — `/data-price=/`
5. `has-FAQPage-schema` — `/"@type":\s*"FAQPage"/`
6. `has-related-articles` — `/data-blog-list="related"/`
7. `has-canonical` — `/<link\s[^>]*rel="canonical"/`

### Task 2: cost-logger.js with run guard

**`autopilot/pipeline/cost-logger.js`**

`logCost(usage, slug, logPath)`:
- Calculates `estimated_usd` from token counts using Sonnet 4.5 pricing constants ($3/$15/$3.75/$0.30 per million)
- Formula: `(10000/1M)*3 + (5000/1M)*15 = 0.03 + 0.075 = 0.105` (verified by test)
- Appends JSONL entry: `{ timestamp, slug, model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, estimated_usd }`
- Creates parent directories with `mkdirSync({ recursive: true })` before first write

`createRunGuard()`:
- Returns `{ canGenerate(), recordGeneration() }` closure
- `canGenerate()` returns `count < MAX_ARTICLES_PER_RUN` (imports constant from `constants.js`)
- `recordGeneration()` increments internal counter
- After one `recordGeneration()` call, `canGenerate()` returns `false` (MAX=1 per D-13)

## Tests

| File | Tests | Coverage |
|------|-------|----------|
| `tests/loader.test.js` | 11 | `loadSiteConfig` (4) + `loadPipelineContext` (7) |
| `tests/topic-selector.test.js` | 7 | All edge cases: priority order, tie-break, cannibalization, empty queue, all-cannibalized, non-planned statuses, title-derived slug |
| `tests/validator.test.js` | 10 | Valid HTML pass + each of 7 failures individually + multi-failure case |
| `tests/cost-logger.test.js` | 9 | JSONL append, field presence, USD math, dir creation, multi-append, run guard (4 cases) |
| **Full suite** | **58** | All passing |

## Commits

| Hash | Description |
|------|-------------|
| `802071d` | feat(02-01): extend loader + add topic-selector, validator with tests |
| `dcca939` | feat(02-01): add cost-logger with JSONL output and run guard |

Both commits are in the `autopilot/` sub-repo (SEO-Autopilot). The site repo's `.gitignore` excludes `autopilot/`.

## Deviations from Plan

None — plan executed exactly as written. The only implementation detail worth noting:

The plan showed `selectTopic` in RESEARCH.md deriving slug always from title. The PLAN.md task description showed `candidate.slug || derive-from-title`. I used the PLAN.md version (slug field first) because queue entries like `q_003` reference explicit slugs in their notes — using the explicit slug when present is more accurate than re-deriving from title.

## Known Stubs

None. All 4 modules are fully implemented with working logic (not placeholder returns).

## Self-Check: PASSED
