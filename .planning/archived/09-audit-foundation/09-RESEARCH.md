# Phase 9: Audit Foundation - Research

**Researched:** 2026-04-01
**Domain:** HTML parsing, SEO signal extraction, page scoring
**Confidence:** HIGH

## Summary

Phase 9 builds three pure modules (`buildPageInventory`, `extractPageSignals`, `scorePageHealth`) plus an orchestrating runner that writes `state/page-audit.json`. The site has 13 root HTML pages and 56 blog articles (69 total). All HTML parsing uses cheerio v1.2.0 (current, ESM-compatible). JSON-LD blocks appear in both `<head>` and `<body>` on production pages (confirmed on `magnetiseur-troyes.html` -- head has HealthAndBeautyBusiness at line 90, body has FAQPage at line 741), so the extractor must scan the full document.

The codebase already establishes strong patterns: ESM named exports, pino logging, DI via underscore-prefixed parameters (`_stateDir`, `_appendFn`), temp directory testing, and `node --test tests/*.test.js` as the test runner. All new modules follow these patterns exactly.

**Primary recommendation:** Build four files in `autopilot/audit/` following existing pipeline DI conventions. cheerio `load()` on the full HTML string handles both head and body JSON-LD. Scoring model is a deterministic point-addition system with no randomness or external calls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New directory: `autopilot/audit/` (not inside pipeline/ -- audit is a separate concern)
- `audit/page-inventory.js` -- buildPageInventory(), pageExists(slug)
- `audit/signal-extractor.js` -- extractPageSignals(slug, inventoryEntry)
- `audit/page-scorer.js` -- scorePageHealth(signals) -> {score, issues[]}
- `audit/runner.js` -- runAudit(slugs?) orchestrator, writes state/page-audit.json
- Use cheerio for all HTML parsing (npm install cheerio in autopilot/)
- JSON-LD: scan FULL file (not head-only) -- site has schemas in both head and body
- Word count: body text after removing nav/header/footer/script/style
- Internal links: classify via Node.js URL API against SITE_BASE_PATH domain
- Scoring model: Schema 25pts, WordCount 25pts, FAQ 15pts, EEAT 15pts, InternalLinks 10pts, MetaDesc 10pts
- State path: autopilot/state/page-audit.json
- State shape: slug-keyed {score, issues[], signals, previousSignals, diff, lastScanned}
- Deterministic: two scans of unchanged page -> identical scores
- Slug normalization: strip .html, strip blog/ prefix
- Issues array uses French language strings
- Signal extractor handles multiple JSON-LD blocks gracefully

### Claude's Discretion
All other implementation details (error handling, logging patterns, test structure) follow existing codebase conventions in autopilot/pipeline/*.js

### Deferred Ideas (OUT OF SCOPE)
- Cannibalization detection -> Phase 10
- Patch generation -> Phase 11
- Dashboard UI -> Phase 12
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F4.1 | Page Inventory -- buildPageInventory() scans all .html, normalizes slugs, exposes pageExists() | cheerio not needed here; use fs.readdirSync + statSync. SITE_BASE_PATH pattern already in api.js line 25. Exclude node_modules/backup/logs per requirement. |
| F4.2 | Signal Extractor -- extracts schema types, JSON-LD validity, word count, H1, meta desc, canonical, FAQ count, review signals, internal links | cheerio.load(html) parses full document. $('script[type="application/ld+json"]') finds all JSON-LD blocks. Word count via $('body').clone().find('nav,header,footer,script,style').remove().end().text(). |
| F4.3 | Page Scorer -- 100-point weighted health score with severity tiers and French issues[] | Pure function, no I/O. Deterministic point-addition from signals object. Issues use codes like MISSING_SCHEMA, LOW_WORD_COUNT with French messages. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | 1.2.0 | HTML/DOM parsing for signal extraction | Industry standard for server-side HTML parsing in Node.js; jQuery-like API; ESM-compatible |
| pino | 10.3.1 | Structured logging | Already in project, established pattern |
| node:test | built-in | Test runner | Already in project (node --test tests/*.test.js) |
| node:fs | built-in | File I/O for inventory and state | Already used throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:url | built-in | URL classification for internal links | In signal-extractor to parse href against site domain |
| node:path | built-in | Path manipulation | Slug normalization, file path construction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cheerio | htmlparser2 directly | cheerio wraps htmlparser2, provides jQuery API -- much more ergonomic for extracting specific elements |
| cheerio | jsdom | jsdom is heavier (full DOM), slower; cheerio is 8x faster for read-only parsing |
| regex for JSON-LD | cheerio selectors | Regex breaks on nested script tags; cheerio handles it correctly |

**Installation:**
```bash
cd autopilot && npm install cheerio
```

**Version verification:** cheerio 1.2.0 confirmed via `npm view cheerio version` on 2026-04-01.

## Architecture Patterns

### Recommended Project Structure
```
autopilot/
  audit/
    page-inventory.js    # buildPageInventory(), pageExists()
    signal-extractor.js  # extractPageSignals(slug, entry)
    page-scorer.js       # scorePageHealth(signals) -> {score, issues[]}
    runner.js            # runAudit(slugs?) orchestrator
  state/
    page-audit.json      # output (slug-keyed audit results)
  tests/
    page-inventory.test.js
    signal-extractor.test.js
    page-scorer.test.js
    audit-runner.test.js
```

### Pattern 1: DI for Testability (existing codebase convention)
**What:** All I/O-dependent functions accept underscore-prefixed DI parameters
**When to use:** Any function that reads files, writes state, or accesses env vars
**Example:**
```javascript
// Follows deploy-orchestrator.js pattern (line 39)
export function buildPageInventory({ _basePath, _readDir, _stat } = {}) {
  const basePath = _basePath || process.env.SITE_BASE_PATH || defaultBasePath();
  const readDir = _readDir || readdirSync;
  const stat = _stat || statSync;
  // ...
}
```

### Pattern 2: State File Write (existing codebase convention)
**What:** JSON state written atomically with mkdirSync + writeFileSync
**When to use:** Writing page-audit.json
**Example:**
```javascript
// Follows activity-logger.js pattern (line 12-22)
import { writeFileSync, mkdirSync } from 'node:fs';
const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'state');

export function writeAuditState(data, { _stateDir } = {}) {
  const dir = _stateDir || STATE_DIR;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'page-audit.json'), JSON.stringify(data, null, 2));
}
```

### Pattern 3: Pure Scoring Function
**What:** scorePageHealth takes a signals object and returns {score, issues[]} with zero I/O
**When to use:** Scoring -- enables trivial unit testing
**Example:**
```javascript
export function scorePageHealth(signals) {
  let score = 0;
  const issues = [];

  // Schema: 25pts
  const hasSchema = signals.schemaTypes.some(t =>
    ['LocalBusiness', 'HealthAndBeautyBusiness'].includes(t)
  );
  if (hasSchema) score += 25;
  else issues.push({ code: 'MISSING_SCHEMA', severity: 'critical', message: 'Schema LocalBusiness ou HealthAndBeautyBusiness absent' });

  // ... remaining scoring rules
  return { score, issues };
}
```

### Pattern 4: cheerio Full-Document JSON-LD Extraction
**What:** Load full HTML with cheerio, select all `script[type="application/ld+json"]` elements
**When to use:** Signal extraction -- critical to scan both head and body
**Example:**
```javascript
import { load } from 'cheerio';

export function extractJsonLd(html) {
  const $ = load(html);
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      blocks.push(JSON.parse($(el).text()));
    } catch {
      // invalid JSON-LD -- logged as issue
    }
  });
  return blocks;
}
```

### Anti-Patterns to Avoid
- **Regex for HTML parsing:** Never use regex to extract HTML structure (tags, attributes). cheerio handles edge cases (whitespace, attribute order, encoding).
- **Head-only JSON-LD scan:** The production site has FAQPage schemas in `<body>`. A head-only scan will miss them and produce incorrect scores. Always use cheerio on the full document.
- **Non-deterministic scoring:** No Date.now(), Math.random(), or external API calls inside scoring. Only the signals object determines the score.
- **Hardcoded site URL in link classification:** Use SITE_BASE_PATH env var or config, not a hardcoded domain string.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Custom regex parser | cheerio `load()` | Edge cases with nested tags, encoding, whitespace |
| JSON-LD extraction | Regex for script tags | cheerio `$('script[type="application/ld+json"]')` | Handles multiple blocks, body placement, malformed HTML |
| Word count (visible text) | Manual tag stripping | cheerio `$('body').clone().find('nav,header,footer,script,style').remove().end().text()` | Correctly handles nested elements, whitespace normalization |
| URL classification | String startsWith | `new URL(href, baseUrl)` from node:url | Handles relative URLs, protocol-relative, edge cases |

**Key insight:** cheerio does the heavy lifting. Every signal extraction operation maps to 1-3 cheerio calls. No custom parsing logic needed.

## Common Pitfalls

### Pitfall 1: JSON-LD Only in Head
**What goes wrong:** Scanner only looks in `<head>` and misses FAQPage schemas placed in `<body>` (confirmed on magnetiseur-troyes.html line 741)
**Why it happens:** Common assumption that structured data lives in head only
**How to avoid:** `cheerio.load(fullHtml)` + `$('script[type="application/ld+json"]')` searches entire document
**Warning signs:** FAQPage score is 0 on pages that visually have FAQ sections

### Pitfall 2: Invalid JSON-LD Crashing the Scanner
**What goes wrong:** One malformed JSON-LD block causes `JSON.parse()` to throw, crashing the entire audit
**Why it happens:** No try/catch around JSON.parse in the loop
**How to avoid:** Wrap each `JSON.parse()` in try/catch, log the error, add an issue `INVALID_JSONLD` to the page's issues array, continue scanning
**Warning signs:** Audit crashes on a specific page

### Pitfall 3: Slug Normalization Inconsistency
**What goes wrong:** `blog/arret-tabac-troyes.html` normalized differently in inventory vs. signal extractor, causing lookup misses
**Why it happens:** Normalization logic duplicated instead of shared
**How to avoid:** Single `normalizeSlug(filePath)` function exported from page-inventory.js, used everywhere
**Warning signs:** "Page not found" errors when signals exist in state file

### Pitfall 4: Word Count Including Navigation Text
**What goes wrong:** Word count inflated by nav/header/footer text, giving false "healthy" scores
**Why it happens:** Counting all body text without stripping layout elements
**How to avoid:** `$('body').clone().find('nav,header,footer,script,style,.site-nav,.site-footer').remove().end().text().split(/\s+/).filter(Boolean).length`
**Warning signs:** Pages with thin content scoring 25/25 on word count

### Pitfall 5: Internal Link Detection Missing Relative URLs
**What goes wrong:** Links like `href="magnetiseur-troyes.html"` or `href="/blog/stress.html"` not counted as internal
**Why it happens:** Only matching absolute URLs with the site domain
**How to avoid:** Use `new URL(href, siteBaseUrl)` to resolve relative URLs first, then check hostname
**Warning signs:** Internal link count is 0 on pages that obviously link to other site pages

### Pitfall 6: Non-Deterministic Timestamps in State
**What goes wrong:** Two consecutive scans produce different output because `lastScanned` changes
**Why it happens:** Including `new Date().toISOString()` inside the comparison
**How to avoid:** `lastScanned` is metadata, not part of the score comparison. Determinism requirement applies to `score` and `issues[]` only. Document this clearly.
**Warning signs:** Tests fail intermittently on timestamp comparison

## Code Examples

### cheerio Full HTML Load + JSON-LD Extraction
```javascript
// Source: cheerio.js.org/docs/basics/loading/ + project requirement
import { load } from 'cheerio';
import { readFileSync } from 'node:fs';

export function extractPageSignals(slug, entry, { _readFile } = {}) {
  const readFile = _readFile || readFileSync;
  const html = readFile(entry.filePath, 'utf-8');
  const $ = load(html);

  // Title tag
  const title = $('title').first().text().trim();

  // Meta description
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // H1 count
  const h1Count = $('h1').length;
  const h1Text = $('h1').first().text().trim();

  // JSON-LD (full document scan)
  const jsonLdBlocks = [];
  const schemaTypes = [];
  let faqCount = 0;
  let hasAggregateRating = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      jsonLdBlocks.push(data);
      if (data['@type']) schemaTypes.push(data['@type']);
      if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
        faqCount = data.mainEntity.length;
      }
      if (data.aggregateRating) hasAggregateRating = true;
    } catch { /* logged as issue */ }
  });

  // Word count (visible body text, excluding layout)
  const bodyClone = $('body').clone();
  bodyClone.find('nav, header, footer, script, style, noscript').remove();
  const wordCount = bodyClone.text().split(/\s+/).filter(Boolean).length;

  // data-price usage
  const dataPriceCount = $('[data-price]').length;

  // Internal links
  const internalLinks = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    // classify with URL API in the actual implementation
    if (href && !href.startsWith('http') || href?.includes('magnetiseuse-lacoste-corinne.fr')) {
      internalLinks.push(href);
    }
  });

  // Image alt coverage
  const totalImages = $('img').length;
  const imagesWithAlt = $('img[alt]').filter((_, el) => $(el).attr('alt').trim() !== '').length;

  return {
    slug,
    title,
    metaDescription: metaDesc,
    metaDescriptionLength: metaDesc.length,
    canonical,
    h1Count,
    h1Text,
    schemaTypes,
    jsonLdBlocks: jsonLdBlocks.length,
    faqCount,
    hasAggregateRating,
    hasReviewContainer: false, // check for review-text class
    wordCount,
    dataPriceCount,
    internalLinkCount: internalLinks.length,
    totalImages,
    imagesWithAlt,
    imageAltCoverage: totalImages > 0 ? imagesWithAlt / totalImages : 1,
  };
}
```

### Slug Normalization
```javascript
// Shared utility -- single source of truth
export function normalizeSlug(relativePath) {
  return relativePath
    .replace(/\\/g, '/')           // Windows backslashes
    .replace(/^blog\//, '')        // strip blog/ prefix
    .replace(/\.html$/, '');       // strip .html extension
}
```

### Scoring with French Issues
```javascript
export function scorePageHealth(signals) {
  let score = 0;
  const issues = [];

  // Schema (25pts)
  const hasBusinessSchema = signals.schemaTypes.some(t =>
    ['LocalBusiness', 'HealthAndBeautyBusiness'].includes(t)
  );
  if (hasBusinessSchema) {
    score += 25;
  } else {
    issues.push({
      code: 'MISSING_SCHEMA',
      severity: 'critical',
      message: 'Schema LocalBusiness ou HealthAndBeautyBusiness absent',
    });
  }

  // Word count (25pts)
  if (signals.wordCount >= 400) {
    score += 25;
  } else {
    issues.push({
      code: 'LOW_WORD_COUNT',
      severity: 'critical',
      message: `Contenu trop court : ${signals.wordCount} mots (minimum 400)`,
    });
  }

  // FAQPage (15pts)
  if (signals.schemaTypes.includes('FAQPage')) {
    score += 15;
  } else {
    issues.push({
      code: 'MISSING_FAQ',
      severity: 'warning',
      message: 'Schema FAQPage absent',
    });
  }

  // E-E-A-T (15pts)
  if (signals.hasAggregateRating || signals.hasReviewContainer) {
    score += 15;
  } else {
    issues.push({
      code: 'MISSING_EEAT',
      severity: 'warning',
      message: 'Aucun signal E-E-A-T (AggregateRating ou avis clients)',
    });
  }

  // Internal links (10pts)
  if (signals.internalLinkCount >= 1) {
    score += 10;
  } else {
    issues.push({
      code: 'NO_INTERNAL_LINKS',
      severity: 'warning',
      message: 'Aucun lien interne vers d\'autres pages du site',
    });
  }

  // Meta description (10pts)
  if (signals.metaDescriptionLength >= 120 && signals.metaDescriptionLength <= 160) {
    score += 10;
  } else if (signals.metaDescriptionLength === 0) {
    issues.push({
      code: 'MISSING_META_DESC',
      severity: 'critical',
      message: 'Meta description absente',
    });
  } else {
    issues.push({
      code: 'META_DESC_LENGTH',
      severity: 'info',
      message: `Meta description : ${signals.metaDescriptionLength} caractères (idéal : 120-160)`,
    });
  }

  return { score, issues };
}
```

### Test Pattern (following existing conventions)
```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

// Temp dir pattern from deploy-orchestrator.test.js
let tmpDir;
beforeEach(() => {
  tmpDir = join(os.tmpdir(), `audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cheerio.load(html)` as default import | `import { load } from 'cheerio'` named export | cheerio 1.0 (2024) | Must use named import, not default |
| `$.html()` returns full doc | `$.html()` returns inner content of selection | cheerio 1.0 | Use `$.root().html()` for full document |
| cheerio CJS only | cheerio dual CJS+ESM | cheerio 1.0 | Works with project's `"type": "module"` |

**Deprecated/outdated:**
- `require('cheerio')` -- project uses ESM, use `import { load } from 'cheerio'`
- `cheerio.load()` as static method on default import -- use named `load` export

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) v22.17.1 |
| Config file | package.json `scripts.test` |
| Quick run command | `node --test autopilot/tests/page-scorer.test.js` |
| Full suite command | `cd autopilot && node --test tests/*.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F4.1-a | buildPageInventory returns slug-keyed list with filePath + lastModified | unit | `node --test autopilot/tests/page-inventory.test.js -x` | Wave 0 |
| F4.1-b | pageExists returns boolean for known/unknown slugs | unit | `node --test autopilot/tests/page-inventory.test.js -x` | Wave 0 |
| F4.1-c | Excludes node_modules, backup, logs directories | unit | `node --test autopilot/tests/page-inventory.test.js -x` | Wave 0 |
| F4.1-d | Slug normalization: strips .html and blog/ prefix | unit | `node --test autopilot/tests/page-inventory.test.js -x` | Wave 0 |
| F4.2-a | extractPageSignals returns all required signal fields | unit | `node --test autopilot/tests/signal-extractor.test.js -x` | Wave 0 |
| F4.2-b | JSON-LD extracted from both head and body | unit | `node --test autopilot/tests/signal-extractor.test.js -x` | Wave 0 |
| F4.2-c | Multiple JSON-LD blocks handled gracefully | unit | `node --test autopilot/tests/signal-extractor.test.js -x` | Wave 0 |
| F4.2-d | Invalid JSON-LD does not crash, produces issue | unit | `node --test autopilot/tests/signal-extractor.test.js -x` | Wave 0 |
| F4.3-a | scorePageHealth produces 0-100 score from signals | unit | `node --test autopilot/tests/page-scorer.test.js -x` | Wave 0 |
| F4.3-b | Perfect signals produce score 100, empty issues | unit | `node --test autopilot/tests/page-scorer.test.js -x` | Wave 0 |
| F4.3-c | Missing all signals produces score 0, 6 issues | unit | `node --test autopilot/tests/page-scorer.test.js -x` | Wave 0 |
| F4.3-d | Issues have code, severity, French message | unit | `node --test autopilot/tests/page-scorer.test.js -x` | Wave 0 |
| F4.3-e | Deterministic: same input -> identical output | unit | `node --test autopilot/tests/page-scorer.test.js -x` | Wave 0 |
| F4-int | Full audit writes valid page-audit.json | integration | `node --test autopilot/tests/audit-runner.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test autopilot/tests/<changed-module>.test.js`
- **Per wave merge:** `cd autopilot && node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `autopilot/tests/page-inventory.test.js` -- covers F4.1
- [ ] `autopilot/tests/signal-extractor.test.js` -- covers F4.2
- [ ] `autopilot/tests/page-scorer.test.js` -- covers F4.3
- [ ] `autopilot/tests/audit-runner.test.js` -- covers integration (state file write, determinism)
- [ ] cheerio install: `cd autopilot && npm install cheerio`

## Site Inventory (for test fixtures)

**Root pages (13):** index, a-propos, arret-tabac-troyes, cgv, faq, hypnose-troyes, landing-tabac, magnetiseur-aube, magnetiseur-troyes, mentions-legales, politique-confidentialite, soins, test-config

**Blog articles:** 56 files in `blog/` directory

**Exclude from inventory:** test-config.html (per robots.txt Disallow), backup/, logs/, node_modules/

**JSON-LD placement patterns found:**
- `magnetiseur-troyes.html`: HealthAndBeautyBusiness in `<head>` (line 90), FAQPage in `<body>` (line 741)
- Blog articles: typically FAQPage in head
- Service pages: typically LocalBusiness/HealthAndBeautyBusiness in head + FAQPage in body

## Open Questions

1. **Should test-config.html be excluded from inventory?**
   - What we know: robots.txt disallows it, it is a test page
   - What's unclear: CONTEXT.md excludes backup/logs/node_modules but does not mention test-config
   - Recommendation: Include in inventory but flag as "noindex" page if it has a robots noindex meta. Let the scorer handle it normally -- the planner can decide.

2. **Review container detection selector**
   - What we know: Requirement says "review-text containers or AggregateRating in schema"
   - What's unclear: Exact CSS class/selector for review containers on the production site
   - Recommendation: Use `$('.review-text, .avis-client, [data-reviews]')` as initial selectors, plus `aggregateRating` in JSON-LD. Verify against actual HTML during implementation.

## Sources

### Primary (HIGH confidence)
- cheerio official docs (cheerio.js.org) -- ESM import, load() API, selector syntax
- `npm view cheerio version` -- confirmed v1.2.0 current
- Project codebase analysis -- 21 existing test files, DI patterns, state file conventions

### Secondary (MEDIUM confidence)
- [cheerio 1.0 release blog](https://cheerio.js.org/blog/cheerio-1.0) -- breaking changes documentation
- [cheerio loading docs](https://cheerio.js.org/docs/basics/loading/) -- load() API reference

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- cheerio is the only new dependency, well-documented, version verified
- Architecture: HIGH -- follows exact patterns from existing codebase (DI, state files, test structure)
- Pitfalls: HIGH -- confirmed JSON-LD body placement on production HTML files

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no fast-moving dependencies)
