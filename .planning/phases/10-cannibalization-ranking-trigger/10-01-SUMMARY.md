---
phase: 10-cannibalization-ranking-trigger
plan: 01
subsystem: audit
tags: [nlp, jaccard, french-stopwords, cannibalization, tokenization]

requires:
  - phase: 09-page-audit-auto-patch
    provides: audit runner, signal extractor, page inventory
provides:
  - FR_STOPWORDS French stopword Set with site-specific brand/geo tokens
  - normalizeTokens function for accent-normalized French text tokenization
  - jaccard function for set-based similarity computation
  - detectCannibalization function with cluster-first grouping and severity levels
affects: [10-02-ranking-watcher, audit-runner-integration]

tech-stack:
  added: []
  patterns: [NFD accent normalization, Jaccard similarity, cluster-first two-pass detection]

key-files:
  created:
    - autopilot/config/fr-stopwords.js
    - autopilot/audit/cannibalization.js
    - autopilot/tests/cannibalization.test.js
  modified: []

key-decisions:
  - "Pure function design with DI — no I/O in cannibalization module, data passed via parameters"
  - "Two-pass algorithm: same-cluster pairs first (always compute Jaccard), cross-cluster second (require >= 2 shared tokens pre-filter)"
  - "Site-specific stopwords (troyes, magnetiseuse, corinne, lacoste, aube, etc.) prevent false positives from brand/geo terms"

patterns-established:
  - "French NLP tokenization: NFD normalize -> strip combining marks -> lowercase -> apostrophe split -> punctuation split -> length filter -> stopword filter"
  - "Severity classification: >0.85 critical, 0.60-0.85 medium, 0.15-0.60 low"

requirements-completed: [F4.4]

duration: 4min
completed: 2026-04-01
---

# Phase 10 Plan 01: Cannibalization Detection Summary

**Jaccard similarity on NFD-normalized French tokens with cluster-first grouping and site-specific stopword filtering for SEO cannibalization detection**

## What Was Built

Three files implementing the cannibalization detection pipeline:

1. **`config/fr-stopwords.js`** -- Curated French stopword Set (70+ entries) including standard articles/prepositions, apostrophe-prefixed forms (l, d, n, s, j, qu), and site-specific brand/geo tokens (troyes, magnetiseuse, corinne, lacoste, aube, saint, germain) that would inflate similarity scores between unrelated pages.

2. **`audit/cannibalization.js`** -- Three pure function exports:
   - `normalizeTokens(text)`: Strips accents via NFD decomposition, splits on apostrophes and punctuation, filters stopwords
   - `jaccard(tokensA, tokensB)`: Set-based Jaccard coefficient (intersection/union)
   - `detectCannibalization(pages, contentMapEntries)`: Two-pass detection with cluster_id grouping, Jaccard >= 0.15 threshold, severity classification

3. **`tests/cannibalization.test.js`** -- 20 unit tests covering normalizeTokens (6 tests), jaccard (5 tests), detectCannibalization (9 tests) including severity levels, cluster ordering, cross-cluster filtering, and edge cases.

## Algorithm

1. Combine title + h1Text per page, normalize tokens
2. Group pages by cluster_id from content-map.yaml
3. **Same-cluster pass**: All pairs within each cluster, compute Jaccard, include if >= 0.15
4. **Cross-cluster pass**: Only pairs sharing >= 2 raw tokens (pre-filter), compute Jaccard, include if >= 0.15
5. Return same-cluster pairs first, then cross-cluster, each group sorted by similarity descending

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functions fully implemented with no placeholder data.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED) | c671cc4 | Failing tests for cannibalization detection |
| 1 (GREEN) | bdf4e21 | Implementation passing all 20 tests |
