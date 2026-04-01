# Research: SEO Page Audit & Auto-Patch — Stack Decisions

**Milestone:** SEO Page Audit + Auto-Patch feature for autopilot app
**Researched:** 2026-04-01
**Overall confidence:** HIGH (core decisions) / MEDIUM (word-count packages)

---

## Existing Stack Context

The autopilot app (`E:/Site CL/autopilot/`) is already:
- `"type": "module"` — full ESM (Node.js native)
- Node.js 18+ (implied by dependencies: `@anthropic-ai/sdk ^0.80`, `express ^5`)
- No HTML parser currently installed

This means **any new dependency must support ESM natively** (dual CJS/ESM is fine; CJS-only is a blocker).

---

## Question 1: HTML Parsing Library

### Recommendation: Cheerio 1.x

**Why:** Cheerio 1.0.0 stable was released August 2024. It is now dual CJS+ESM, requires Node >= 18.17, and ships with the familiar jQuery-like CSS selector API. Weekly downloads: ~12M. It wraps parse5 (HTML5-spec-compliant) by default and can optionally use htmlparser2 for faster-but-looser parsing via the `xmlMode` option.

**Confidence:** HIGH — verified via official Cheerio release blog and npm trends data.

### Comparison Matrix

| Library | ESM | CSS Selectors | Spec-compliant | Speed | Weekly Downloads | Verdict |
|---|---|---|---|---|---|---|
| **cheerio 1.x** | Yes (dual) | Yes (jQuery API) | Yes (parse5 core) | Fast | ~12M | **CHOSEN** |
| htmlparser2 | Yes | Partial (needs domhandler) | No (shortcuts) | Fastest (5ms/file vs 13ms) | High | Skip — no selector API |
| parse5 | Yes | No | Yes (W3C) | Medium (13ms/file) | Very high | Skip — no selector API |
| linkedom | Yes | Partial | No | Very fast | ~276K | Skip — niche, low ecosystem |
| jsdom | Yes | Yes (full DOM) | Yes | Slow (full browser env) | High | Overkill — heavy bundle |
| node-html-parser | Yes | Partial | No | Fast | Medium | Skip — gaps in selector support |

### Why not htmlparser2 directly?
It is fastest but requires assembling domhandler + css-select separately to get CSS selectors. Cheerio already wraps this stack with a stable API. For 10–50 static HTML files (not millions), the speed difference is irrelevant.

### Why not parse5 directly?
No CSS selector API. You get a raw AST that requires manual traversal. Cheerio uses parse5 internally — use Cheerio instead.

### Why not linkedom?
276K weekly downloads vs 12M for Cheerio. Designed for DOM-less rendering (e.g., SSR), not for structured data extraction. Selector support gaps documented. Low community adoption means fewer answers to edge cases.

**Installation:**
```bash
npm install cheerio
```

**ESM import:**
```js
import { load } from 'cheerio';
const $ = load(htmlString);
```

---

## Question 2: JSON-LD Schema Extraction

### Recommendation: Cheerio selector + JSON.parse (no extra dependency)

**Why:** JSON-LD is always in `<script type="application/ld+json">` tags. This is a first-class CSS selector query — no regex, no dedicated library needed. Pages can have multiple JSON-LD blocks (LocalBusiness + FAQPage + BreadcrumbList).

**Confidence:** HIGH — this is the canonical approach used by Google's own documentation and all major SEO crawlers.

**Pattern:**
```js
import { load } from 'cheerio';

function extractJsonLd(html) {
  const $ = load(html);
  const schemas = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      schemas.push(JSON.parse(raw));
    } catch {
      // malformed JSON-LD — flag as pitfall, log and skip
    }
  });
  return schemas; // array of schema objects
}
```

**Why not regex?**
Regex on `<script>` tags breaks on: (a) inline comments, (b) multi-line JSON with newlines, (c) escaped characters, (d) adjacent non-JSON-LD scripts. DOM parsing via Cheerio is the correct tool.

**Why not the `jsonld` npm package?**
The `jsonld` package (digitalbazaar) is a full JSON-LD processor for expansion, compaction, and RDF operations. It is overkill for reading and inspecting schema values. `JSON.parse()` is sufficient and zero-dependency.

---

## Question 3: Word Count in HTML Content

### Recommendation: Cheerio `$.text()` + inline split (no extra dependency)

**Why:** Cheerio's `.text()` method already strips all HTML tags and returns plain text from any selector. Running `.split(/\s+/).filter(Boolean).length` on the `<body>` text gives a reliable word count. No additional package needed.

**Confidence:** HIGH — standard pattern, no edge cases for typical blog HTML.

**Pattern:**
```js
function countWords(html) {
  const $ = load(html);
  // Exclude nav, header, footer, script, style — count only article body
  $('nav, header, footer, script, style, noscript').remove();
  const text = $('body').text().trim();
  return text.split(/\s+/).filter(Boolean).length;
}
```

**Why not npm packages?**

| Package | Last Published | Issue |
|---|---|---|
| `html-word-count` | 8 years ago | Abandoned |
| `word-counting` | 4 years ago | Stale |
| `word-count` | ~1 year ago | Adds a dependency for 3 lines of logic |
| `striptags` + manual split | Maintained | Adds a dependency but no selector control |

The Cheerio-based approach gives selector-level control (exclude nav/footer from word counts) which is important for accurate SEO content depth measurement. No extra dependency needed.

---

## Question 4: Internal vs External Link Detection

### Recommendation: Node.js built-in `URL` + Cheerio `$('a[href]')` (no extra dependency)

**Why:** The WHATWG `URL` API (built into Node.js 18+, no import needed for `new URL()`) handles relative URL resolution correctly. Combining it with Cheerio's selector API covers all cases: absolute `http://`, protocol-relative `//`, root-relative `/`, and relative `../`.

**Confidence:** HIGH — Node.js built-in API, no version risk.

**Pattern:**
```js
function classifyLinks(html, pageUrl) {
  const $ = load(html);
  const siteHost = new URL(pageUrl).hostname; // 'www.magnetiseuse-lacoste-corinne.fr'
  const internal = [];
  const external = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.hostname === siteHost) {
        internal.push(resolved.pathname);
      } else {
        external.push(resolved.href);
      }
    } catch {
      // malformed href — skip
    }
  });

  return { internal, external };
}
```

**For static file scanning (no live URL):** Pass a synthetic base URL like `https://www.magnetiseuse-lacoste-corinne.fr/blog/article.html` built from the file path. This resolves `../index.html` correctly.

**Why not `detect-external-link` npm package?**
It has low adoption and adds a dependency for logic that is 5 lines with built-in APIs. The Node.js `URL` API is the authoritative solution.

---

## Question 5: Existing SEO Signal Extraction Packages

### Verdict: None recommended. Build it with Cheerio.

**Confidence:** MEDIUM (packages exist but are either abandoned or over-engineered for this use case).

**Packages evaluated:**

| Package | Last Published | Weekly DL | Issue for This Use Case |
|---|---|---|---|
| `seo-analyzer` (maddevsio) | 2 years ago | Low | Stale. No JSON-LD extraction. Opinionated rule system hard to customize. |
| `html-metadata` (Wikimedia) | Stale | Low | Focused on Open Graph/Twitter Card metadata, not schema richness scoring. |
| `html-metadata-parser` | Recent | Very low | Thin wrapper, not maintained for schema JSON-LD depth. |
| `seo-scraper` | Unknown | Low | Uses jsdom (heavy). Not ESM-native. |
| `yoastseo` | Active | High | Designed for WordPress/React. Assumes browser DOM. Complex dependency tree. Not suitable for Node.js ESM file scanning. |
| `site-audit-seo` | Active | Low | CLI crawler tool — not a library. Crawls live URLs, not local files. |

**Conclusion:** The signals needed (schema type, word count, H1 count, meta description, canonical, FAQ items, review text, internal links) are all extractable in 50–100 lines of Cheerio code. A bespoke extractor is more reliable, has zero version-drift risk, and can be tuned exactly to the project's scoring rubric.

---

## Recommended Final Stack for Audit Feature

| Concern | Solution | Dependency |
|---|---|---|
| HTML parsing | `cheerio` 1.x | `npm install cheerio` |
| JSON-LD extraction | Cheerio selector + `JSON.parse` | none |
| Word count | Cheerio `.text()` + `String.split` | none |
| Link classification | `new URL()` (Node built-in) | none |
| SEO signal extraction | Bespoke extractor module | none |
| Audit state persistence | `JSON.stringify` to `.json` file | none (already using `js-yaml`, can use either) |
| Schema patch generation | Existing `@anthropic-ai/sdk` | already installed |

**Net new dependency: 1 package (`cheerio`).**

---

## Installation

```bash
cd autopilot
npm install cheerio
```

No other packages needed. All other logic is built on Node.js built-ins and the existing `@anthropic-ai/sdk`.

---

## Architecture Notes

The audit module should be structured as:

```
autopilot/
  audit/
    extractor.js      — Cheerio-based signal extraction (pure function, html string → signals object)
    scorer.js         — Scoring logic (signals → score + issues array)
    cannibalization.js — Compare all pages, flag keyword overlaps
    patcher.js        — Call Claude API to generate schema/FAQ patches
    runner.js         — Orchestrate: read HTML files → extract → score → patch → write state
    state.json        — Persisted audit results (gitignored if contains sensitive data)
```

The `extractor.js` function signature should be:
```js
// Returns a structured signals object
export function extractSignals(html, filePath, siteBaseUrl) {
  // filePath used to build synthetic base URL for link resolution
  return {
    filePath,
    title: '',           // <title> text
    metaDescription: '', // content of meta[name=description]
    canonical: '',       // href of link[rel=canonical]
    h1: [],              // all H1 texts
    h2: [],              // all H2 texts
    wordCount: 0,        // content words, nav/footer excluded
    schemas: [],         // parsed JSON-LD objects []
    schemaTypes: [],     // extracted @type values
    hasFaq: false,       // FAQPage schema or <details>/<dl> present
    faqCount: 0,         // number of FAQ items
    hasReviewText: false,// testimonial/avis keywords in body text
    internalLinks: [],   // resolved internal pathnames
    externalLinks: [],   // resolved external hrefs
    images: [],          // {src, alt} for all images
  };
}
```

---

## Sources

- [Cheerio 1.0 Release Blog](https://cheerio.js.org/blog/cheerio-1.0) — confirmed ESM support, Node >= 18.17, August 2024
- [npm trends: cheerio vs htmlparser2 vs jsdom vs linkedom](https://npmtrends.com/cheerio-vs-htmlparser2-vs-jsdom-vs-linkedom) — download comparisons
- [cheerio/releases on GitHub](https://github.com/cheeriojs/cheerio/releases) — version history
- [Node.js URL API docs](https://nodejs.org/api/url.html) — WHATWG URL for link resolution
- [seo-analyzer on npm](https://www.npmjs.com/package/seo-analyzer) — last published 2 years ago, stale
- [html-metadata on GitHub (Wikimedia)](https://github.com/wikimedia/html-metadata) — scope mismatch
- [Google: Generate Structured Data with JavaScript](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript) — JSON-LD extraction pattern
- [ZenRows: Cheerio Alternatives](https://www.zenrows.com/alternative/cheerio) — linkedom and htmlparser2 analysis
- [ScrapeOps: Best NodeJS HTML Parsing Libraries](https://scrapeops.io/nodejs-web-scraping-playbook/best-nodejs-html-parsing-libraries/) — performance benchmarks
