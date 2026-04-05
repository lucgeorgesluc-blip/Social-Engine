---
phase: 02-article-generation-pipeline
plan: "02"
subsystem: autopilot/pipeline
tags: [pipeline, tdd, file-updater, prompt-builder, generator, orchestrator]
dependency_graph:
  requires:
    - 02-01-SUMMARY.md (topic-selector, validator, cost-logger, loader)
  provides:
    - autopilot/pipeline/file-updater.js (updateConfigJs, updateSitemap, updateSeoEngineData, rebuildConfigMin)
    - autopilot/pipeline/prompt-builder.js (buildPrompt)
    - autopilot/pipeline/generator.js (generateArticle)
    - autopilot/pipeline/run.js (pipeline entry point)
    - autopilot/tests/file-updater.test.js (9 tests)
  affects:
    - Phase 03+ (run.js is the execution entry point for all future pipeline runs)
    - assets/js/config.js (blog entry prepend on each run)
    - sitemap.xml (URL insertion on each run)
    - .seo-engine/data/content-queue.yaml (status: planned -> drafted)
    - .seo-engine/data/content-map.yaml (new entry appended)
    - .seo-engine/logs/changelog.md (timestamped log line)
tech_stack:
  added: []
  patterns:
    - TDD with Node.js built-in test runner (node:test)
    - Temp file copy + cleanup pattern for file I/O tests (os.tmpdir + copyFileSync)
    - Streaming API with text accumulation (client.messages.stream + on('text'))
    - String-based YAML mutation (no yaml.dump — preserves comments, per Pitfall 6)
    - Regex-based config.js prepend (JS object, not JSON)
    - Single mega-prompt with all 8 context sources injected (D-01)
key_files:
  created:
    - autopilot/pipeline/file-updater.js
    - autopilot/pipeline/prompt-builder.js
    - autopilot/pipeline/generator.js
    - autopilot/pipeline/run.js
    - autopilot/tests/file-updater.test.js
  modified:
    - autopilot/package.json (pipeline script -> pipeline/run.js, add pipeline:dry-run)
decisions:
  - "YAML mutation uses string replacement not yaml.dump() to preserve comments in content-queue.yaml (Pitfall 6 from RESEARCH.md)"
  - "updateSeoEngineData looks up article by id marker then replaces the first status: planned after it — avoids false matches in other queue entries"
  - "prompt-builder injects all 8 context sources into system prompt (D-01), user prompt is concise topic spec only"
  - "generator uses claude-sonnet-4-5-20250514 full dated model ID (Pitfall 1 avoidance)"
  - "run.js logs cost even on validation failure so spend is always tracked"
  - "--dry-run skips only terser rebuild (step 6b), all other file updates still execute"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
  tests_added: 9
  test_suites_passing: 9
  total_suite_tests: 67
---

# Phase 02 Plan 02: Article Generation Pipeline — Orchestrator Summary

**One-liner:** Full article generation pipeline wired end-to-end: run.js orchestrates 7 steps (context load -> topic select -> Claude API generate -> validate -> write HTML -> update 5 site files -> log cost) with 9 new file-updater tests — 67 total tests green.

## What Was Built

### Task 1: file-updater.js (TDD), prompt-builder.js, generator.js

**`autopilot/pipeline/file-updater.js`**

Four exported functions for site file mutations after article generation:

- `updateConfigJs(configPath, article)` — Prepends a new `{ slug, title, description, date }` entry to `SITE_CONFIG.blog` array using regex replace on `blog: [\n`. Uses 8-space indent for object, 12-space for properties (exact whitespace match to existing config.js format).
- `rebuildConfigMin(basePath)` — Runs `npx terser assets/js/config.js -o assets/js/config.min.js -c -m` via `execSync` with `cwd: basePath` (Pitfall 5: terser needs site root, not autopilot/).
- `updateSitemap(sitemapPath, slug, date)` — Inserts a `<url>` block immediately after the `<!-- Articles blog` comment marker. Throws if comment not found.
- `updateSeoEngineData(queuePath, mapPath, changelogPath, article)` — Three file mutations:
  1. `content-queue.yaml`: string replacement within the article's `- id: "..."` block to change `status: "planned"` → `status: "drafted"` (Pitfall 6: no yaml.dump — preserves all comments)
  2. `content-map.yaml`: appends new entry as YAML string at end of file (no yaml.dump)
  3. `changelog.md`: appends timestamped log line

**`autopilot/pipeline/prompt-builder.js`**

`buildPrompt(context, selectedTopic)` returns `{ system, user }`:

- System prompt contains `<rules>` block with 7 mandatory rules: output format, no hard prices, no rTMS, no Euro amounts, FAQPage "name" requirement, data-blog-list="related", canonical tag, data-price= attribute.
- One-shot `data-price=` example showing correct usage pattern.
- Injects all 8 context sources: tone-guide, blog-structures, article-instructions, pricing-section, seo-config (JSON), filtered seoKeywordsCsv (header + rows matching target keywords, max 10), contentMapTrimmed (for internal linking).
- CSV filtering: case-insensitive substring match on first column against any target keyword, max 10 rows returned.
- User prompt is concise: title, slug, type, keywords, unique angle, E-E-A-T plan, internal link targets, word count.

**`autopilot/pipeline/generator.js`**

`generateArticle(systemPrompt, userPrompt)`:
- Uses `client.messages.stream()` with `on('text')` accumulation (D-02: streaming for timeout avoidance)
- Model: `claude-sonnet-4-5-20250514` (D-03)
- `max_tokens: 10000`
- Returns `{ html, usage }` where `usage = { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`

**`autopilot/tests/file-updater.test.js`** — 9 tests using temp copies of real files:
- updateConfigJs (3): prepend presence, position before existing first entry, existing entries preserved
- updateSitemap (3): URL loc correct, lastmod date correct, appears after comment
- updateSeoEngineData (3): status change to drafted, map entry appended, changelog timestamped

### Task 2: run.js orchestrator + package.json

**`autopilot/pipeline/run.js`**

Pipeline entry point, invoked by `node autopilot/pipeline/run.js [--dry-run]`.

7-step D-07 order:
1. **Load context** — `loadPipelineContext()` (F1.1, D-14: fresh reads every run)
2. **Select topic** — `selectTopic(ctx.contentQueue, ctx.contentMapTrimmed)` (F1.2, D-09/D-10)
3. **Generate** — `buildPrompt(ctx, selected)` then `generateArticle(system, user)` (F1.3, D-01/D-02/D-03)
4. **Validate** — `validateArticle(html)` — abort with `process.exit(1)` on failure, log cost anyway (F1.4, D-04)
5. **Write** — `blog/[slug].html` created/overwritten
6. **Update files** — config.js → (conditional terser) → sitemap.xml → seo-engine data (D-07 order)
7. **Log cost** — `logCost(usage, slug, costPath)` (F1.10)

Run guard (`createRunGuard()`) checked at start — blocks second generation in same process (D-13).

`--dry-run` flag: skips terser rebuild (step 6b) only. All other file mutations still execute.

**`autopilot/package.json`** — Updated scripts:
```json
"pipeline": "node pipeline/run.js",
"pipeline:dry-run": "node pipeline/run.js --dry-run"
```

## Tests

| File | Tests | Coverage |
|------|-------|----------|
| `tests/file-updater.test.js` | 9 | updateConfigJs (3), updateSitemap (3), updateSeoEngineData (3) |
| All suites (Wave 1 + Wave 2) | 67 | Full pipeline modules |

## Commits

| Hash | Description |
|------|-------------|
| `781fe9b` | feat(02-02): add file-updater, prompt-builder, generator with TDD tests |
| `45681dc` | feat(02-02): add run.js orchestrator and update package.json scripts |

Both commits in the `autopilot/` sub-repo (SEO-Autopilot).

## Deviations from Plan

None — plan executed exactly as written. Implementation details worth noting:

1. The `updateSeoEngineData` id lookup uses `indexOf(idMarker)` then string slicing to scope the replacement — safer than a cross-block regex that could match other queue entries with the same status.
2. `generator.js` uses the full dated model ID `claude-sonnet-4-5-20250514` rather than the alias `claude-sonnet-4-5` per RESEARCH.md Pitfall 1 guidance.

## Known Stubs

None. All 4 modules are fully implemented with real logic. Pipeline is ready for end-to-end execution with a real `ANTHROPIC_API_KEY`.

## Self-Check: PASSED
