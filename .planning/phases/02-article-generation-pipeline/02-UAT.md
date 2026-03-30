---
status: partial
phase: 02-article-generation-pipeline
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Test

number: done
name: All tests complete (tests 3-6 blocked by API credits)
expected: |
  Tests 3-6 require a successful Claude API call.
  Blocked by: insufficient API credits.
  Test 7 (run guard) verified via unit tests — 9/9 pass.
awaiting: n/a

## Tests

### 1. Test Suite — All 67 Tests Pass
expected: Run `cd "E:/Site CL/autopilot" && node --test tests/*.test.js` — output shows 67 tests passing across 9 suites (loader, topic-selector, validator, cost-logger, file-updater). No failures, no errors.
result: pass

### 2. Pipeline Dry-Run — Topic Selected and Logged
expected: Run `cd "E:/Site CL" && ANTHROPIC_API_KEY=<your-key> SITE_BASE_PATH="E:/Site CL" node autopilot/pipeline/run.js --dry-run` — pipeline logs the selected article topic (slug + title) from content-queue.yaml. No crash on startup. If no `planned` articles remain, logs "No planned articles available" and exits cleanly.
result: pass
note: "Confirmed: dotenv loaded 17 vars (from autopilot/.env), Step 1 context loaded, Step 2 selected q_005 'Burn-out : Magnétisme + Hypnose à Troyes [2026]'. Step 3 blocked by insufficient API credits — code is correct, billing issue only."

### 3. Generated HTML Passes Validation
expected: After a successful dry-run, the pipeline logs "Validation passed" (or equivalent). The created file at `blog/[slug].html` starts with `<!DOCTYPE html>`, contains `data-price=`, `data-blog-list="related"`, a `<link rel="canonical"` tag, and a FAQPage schema block (`"@type": "FAQPage"`). No `€` amounts or `rTMS` mentions.
result: blocked
blocked_by: third-party
reason: "Requires successful Claude API call. Account has insufficient credits."

### 4. config.js and sitemap.xml Updated
expected: After the dry-run, `assets/js/config.js` has the new article's slug/title/description/date prepended at the top of the `SITE_CONFIG.blog` array. `sitemap.xml` contains the new article's URL (`/blog/[slug].html`) immediately after the `<!-- Articles blog -->` comment.
result: blocked
blocked_by: third-party
reason: "Requires successful Claude API call. Account has insufficient credits."

### 5. SEO Engine Data Files Updated
expected: After the dry-run, `.seo-engine/data/content-queue.yaml` shows the generated article's entry with `status: "drafted"` (was `"planned"`). `.seo-engine/data/content-map.yaml` has a new entry appended for the article. `.seo-engine/logs/changelog.md` has a new timestamped line mentioning the generated slug.
result: blocked
blocked_by: third-party
reason: "Requires successful Claude API call. Account has insufficient credits."

### 6. Cost Logged to JSONL
expected: After the dry-run, `autopilot/logs/cost.jsonl` contains a new line with fields: `timestamp`, `slug`, `model` (claude-sonnet-4-5-20250514), `input_tokens`, `output_tokens`, `estimated_usd`. The `estimated_usd` value is a positive number (not zero).
result: blocked
blocked_by: third-party
reason: "Requires successful Claude API call. Account has insufficient credits."

### 7. Run Guard Blocks Second Article
expected: Run `cd "E:/Site CL/autopilot" && node --test tests/cost-logger.test.js` — the run guard tests pass: after one `recordGeneration()` call, `canGenerate()` returns `false`. Confirms MAX_ARTICLES_PER_RUN=1 is enforced without needing a second live API call.
result: pass
note: "9/9 tests pass. canGenerate() correctly returns false after recordGeneration() — MAX_ARTICLES_PER_RUN=1 enforced."

## Summary

total: 7
passed: 3
issues: 0
pending: 0
blocked: 4
skipped: 0

## Gaps

[none yet]
