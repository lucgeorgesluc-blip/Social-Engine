# Phase 2: Article Generation Pipeline - Research

**Researched:** 2026-03-30
**Domain:** Node.js pipeline — Claude API streaming, HTML generation, file updates, YAML manipulation
**Confidence:** HIGH

## Summary

Phase 2 builds an end-to-end pipeline (`autopilot/pipeline/run.js --dry-run`) that selects a topic from content-queue.yaml, calls the Claude API to generate a complete blog article as HTML, validates the output against 7 checks, updates config.js + sitemap.xml + SEO engine data files, and logs token costs. The pipeline directory does not exist yet — all code is new. Phase 1 already provides `config/loader.js` (loads 3 of the 8 context sources) and `config/constants.js` (MAX_ARTICLES_PER_RUN).

The Anthropic SDK v0.80.0 is installed and provides `client.messages.stream()` — a high-level streaming helper that emits `text` events for incremental writes and exposes `finalMessage()` for usage data (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens). The existing blog articles follow a consistent HTML template (TEMPLATE_article-blog.md) with specific patterns: consent scripts, GTM, Ahrefs, nav, breadcrumb, Article schema, FAQPage schema, data-price attributes, and data-blog-list="related". The loader.js must be extended to also read content-queue.yaml, seo-keywords.csv, tone-guide.md, blog-structures.yaml, and INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md.

**Primary recommendation:** Build the pipeline as 5 sequential modules: topic-selector, prompt-builder, generator (streaming), validator, and file-updater. Extend loader.js to return all 8 context sources. Use `client.messages.stream()` with `.on('text')` for incremental output and `.finalMessage()` for usage extraction.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single mega-prompt — one large system prompt with all context injected
- **D-02:** Streaming via `@anthropic-ai/sdk` streaming to avoid timeout on long articles
- **D-03:** Model: `claude-sonnet-4-5` (best cost/quality for HTML generation)
- **D-04:** Abort + log on failure, no retry
- **D-05/D-06:** 7 validation checks (DOCTYPE, no hard prices, no rTMS, has data-price=, has FAQPage, has data-blog-list="related", has canonical tag). data-price= is presence-only check
- **D-07:** File update order: blog/[slug].html -> config.js + config.min.js -> sitemap.xml -> .seo-engine data files -> cost.jsonl
- **D-08:** On mid-sequence failure: log which step failed, stop. No rollback
- **D-09:** Select highest-priority `status: planned` article. Tie-break: first in file order
- **D-10:** Cannibalization check: exact slug match only against content-map.yaml
- **D-11:** ESM throughout (package.json "type": "module")
- **D-12:** SITE_BASE_PATH env var for all file paths
- **D-13:** MAX_ARTICLES_PER_RUN = 1 from constants.js
- **D-14:** Fresh file reads every run — no caching

### Claude's Discretion
- Internal pipeline module structure (how to split pipeline.js into sub-modules)
- Exact prompt wording and context injection format
- Error message formatting in logs
- cost.jsonl schema (as long as it captures tokens + estimated USD)

### Deferred Ideas (OUT OF SCOPE)
- Semantic cannibalization check (similarity scoring)
- Retry logic on validation failure
- Rollback on partial file update failure
- data-price= slug value validation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F1.1 | Context Loading — load and trim 8+ files at pipeline start | loader.js already loads 3/8; extend to load content-queue (YAML), seo-keywords (CSV), tone-guide (MD), blog-structures (YAML), INSTRUCTIONS (MD). Total target <=12K tokens |
| F1.2 | Topic Selection — pick highest-priority planned article, cannibalization check | content-queue.yaml uses `status: planned` + `priority: high/medium/low`. First planned item in file order by D-09. Cannibalization = slug exists in content-map trimmed |
| F1.3 | Article Generation — Claude API streaming, system prompt, max_tokens: 10000 | SDK v0.80.0 `client.messages.stream()` with `on('text')` + `finalMessage()`. Model `claude-sonnet-4-5` per D-03 |
| F1.4 | Post-Generation Validation — 7 regex checks on HTML output | All 7 checks are string/regex based; no DOM parsing needed |
| F1.5 | Config & Sitemap Updates — prepend to SITE_CONFIG.blog, terser, sitemap, seo-engine data | config.js uses specific JS object format; sitemap.xml has `<!-- Articles blog -->` comment marker; content-map/queue are YAML |
| F1.10 | Spend Safeguard — MAX_ARTICLES_PER_RUN=1, log to cost.jsonl | constants.js already exports MAX_ARTICLES_PER_RUN; usage object from finalMessage() provides all token counts |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | Claude API streaming | Already in node_modules; provides `messages.stream()` helper |
| `js-yaml` | 4.1.1 (installed) | Parse/write YAML files | Already used by loader.js |
| `pino` | 10.3.1 (installed) | Structured logging | Already used by server.js |
| `dotenv` | 17.3.1 (installed) | Load .env for ANTHROPIC_API_KEY | Already used by server.js |
| `terser` (CLI) | 5.46.1 (installed globally via npx) | Regenerate config.min.js | Already used in project workflow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js built-in `fs` | — | readFileSync, writeFileSync, appendFileSync | All file operations |
| Node.js built-in `path` | — | join() for cross-platform paths | All path construction |
| Node.js built-in `child_process` | — | execSync for `npx terser` | After config.js update |
| Node.js built-in `test` | — | Test runner | Unit tests (pattern from Phase 1) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `js-yaml` dump | Manual YAML string manipulation | js-yaml dump preserves structure; manual is fragile |
| `child_process` for terser | terser JS API | CLI invocation is simpler, matches documented workflow |
| Cheerio for HTML validation | Regex checks | Regex is sufficient for 7 simple checks; Cheerio is overkill and a new dependency |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
autopilot/
  pipeline/
    run.js              # Entry point (--dry-run flag parsing, orchestration)
    topic-selector.js   # F1.2: Select from queue + cannibalization check
    prompt-builder.js   # Build system prompt with all context
    generator.js        # F1.3: Claude API streaming call
    validator.js        # F1.4: 7 validation checks
    file-updater.js     # F1.5: config.js, sitemap.xml, seo-engine data
    cost-logger.js      # F1.10: Write to cost.jsonl
  config/
    loader.js           # (EXTEND) Add remaining 5 context sources
    constants.js        # (EXISTS) MAX_ARTICLES_PER_RUN
  tests/
    topic-selector.test.js
    validator.test.js
    file-updater.test.js
    cost-logger.test.js
```

### Pattern 1: Streaming with Text Accumulation
**What:** Use `client.messages.stream()` to get incremental text and final usage stats.
**When to use:** Article generation call.
**Example:**
```javascript
// Source: @anthropic-ai/sdk v0.80.0 MessageStream.d.mts (local node_modules)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 10000,
  system: systemPrompt,  // single mega-prompt with all context
  messages: [{ role: 'user', content: userPrompt }],
});

let htmlOutput = '';
stream.on('text', (delta) => {
  htmlOutput += delta;
});

const finalMsg = await stream.finalMessage();
// finalMsg.usage = { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }
```

### Pattern 2: Config.js Blog Entry Prepend
**What:** Insert a new blog entry at the HEAD of SITE_CONFIG.blog array.
**When to use:** After successful validation, during file-updater step.
**Example:**
```javascript
// Source: Existing config.js structure (lines 144+)
const newEntry = `        {
            slug: "${slug}",
            title: "${title}",
            description: "${description}",
            date: "${date}"
        }`;

// Find the blog array opening and insert after it
const configJs = readFileSync(configPath, 'utf8');
const updated = configJs.replace(
  /blog:\s*\[\s*\n/,
  `blog: [\n${newEntry},\n`
);
writeFileSync(configPath, updated, 'utf8');
```

### Pattern 3: Sitemap URL Insertion
**What:** Insert new blog URL after the `<!-- Articles blog -->` comment marker.
**When to use:** After config.js update.
**Example:**
```javascript
// Source: sitemap.xml structure (line 58)
const sitemapEntry = `    <url>
        <loc>https://www.magnetiseuse-lacoste-corinne.fr/blog/${slug}.html</loc>
        <lastmod>${date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`;

const sitemap = readFileSync(sitemapPath, 'utf8');
const updated = sitemap.replace(
  /<!-- Articles blog.*?-->\n/,
  `<!-- Articles blog (priorité moyenne) -->\n${sitemapEntry}\n`
);
```

### Pattern 4: Article Run Guard
**What:** Track articles generated in current run, block second call.
**When to use:** At pipeline start, checked before generation.
**Example:**
```javascript
import { MAX_ARTICLES_PER_RUN } from '../config/constants.js';

let articlesGenerated = 0;

function canGenerate() {
  if (articlesGenerated >= MAX_ARTICLES_PER_RUN) {
    logger.warn({ limit: MAX_ARTICLES_PER_RUN }, 'Article limit reached for this run');
    return false;
  }
  return true;
}
// Increment after successful generation
articlesGenerated++;
```

### Anti-Patterns to Avoid
- **DOM parsing for validation:** Do NOT use cheerio/jsdom for the 7 regex checks. They are simple string matches. Adding a DOM parser is a new dependency for no benefit.
- **Retry on validation failure:** Per D-04, a failing article means a prompt issue. Retrying wastes tokens.
- **In-memory caching of context files:** Per D-14, read fresh every run. Do not cache YAML parse results between runs.
- **String template literals for full HTML:** The Claude API generates the complete HTML. Do NOT try to template the article — let Claude produce the entire file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing/writing | Custom parser | `js-yaml` load/dump | YAML edge cases (multiline strings, special chars) are numerous |
| JS minification | Custom minifier | `npx terser` CLI | Terser is already the documented project tool |
| Streaming HTTP/SSE | Manual fetch + SSE parsing | `@anthropic-ai/sdk` `messages.stream()` | SDK handles reconnection, event parsing, type safety |
| Token counting (pre-call) | tiktoken port | Anthropic's `messages.countTokens()` API | SDK provides exact count for free (~200ms per F1.3) |
| Cost estimation | Hardcoded price table | Compute from usage object at runtime | Prices change; `usage.input_tokens * rate` is simple math |

**Key insight:** The pipeline's value is orchestration and validation, not library reimplementation. Every file format (YAML, JS, XML) already has tooling installed.

## Common Pitfalls

### Pitfall 1: Model Name String
**What goes wrong:** Using `claude-sonnet-4-5` instead of the full model ID `claude-sonnet-4-5-20250514` (or whatever the current dated version is).
**Why it happens:** The Anthropic API requires either a model alias or a dated version string.
**How to avoid:** Use the model alias `claude-sonnet-4-5` which the API resolves to the latest dated version. Store in constants.js.
**Warning signs:** 404 or invalid_model error from API.

**Note on model discrepancy:** CONTEXT.md (D-03) locks the model to `claude-sonnet-4-5`. REQUIREMENTS.md references `claude-sonnet-4-6`. The CONTEXT.md decision is the locked one. The planner should use `claude-sonnet-4-5` but make the model a constant for easy updates.

### Pitfall 2: Config.js is JavaScript, Not JSON
**What goes wrong:** Trying to JSON.parse config.js or write JSON back.
**Why it happens:** config.js uses JavaScript object syntax (no quotes on keys, trailing commas allowed).
**How to avoid:** Use string manipulation (regex replace) to prepend blog entries. Read the existing blog entries to understand exact whitespace/indent patterns.
**Warning signs:** Parse errors, broken config.js after write.

### Pitfall 3: content-queue.yaml Priority Ordering
**What goes wrong:** Assuming `priority: "high"` items come first numerically or alphabetically.
**Why it happens:** The YAML file uses string priorities ("high", "medium", "low"), not numeric.
**How to avoid:** Map priority strings to numeric values (high=3, medium=2, low=1), filter for `status: "planned"`, sort by priority descending, take first. Per D-09, tie-break is file order (array index).
**Warning signs:** Selecting a low-priority article when high-priority ones exist.

### Pitfall 4: Streaming Text May Include Non-HTML Preamble
**What goes wrong:** Claude may output explanation text before or after the HTML.
**Why it happens:** Without explicit instruction, Claude may add "Here is the article:" before the HTML.
**How to avoid:** System prompt must explicitly say: "Output ONLY the complete HTML file. No explanation, no markdown fences, nothing before <!DOCTYPE html> or after </html>." Then validate that output starts with `<!DOCTYPE html>`.
**Warning signs:** Validation check 1 (DOCTYPE) fails despite correct content.

### Pitfall 5: Terser Execution Path
**What goes wrong:** `npx terser` fails because the working directory is `autopilot/` not the site root.
**Why it happens:** Pipeline runs from `autopilot/` directory.
**How to avoid:** Use `execSync('npx terser ...', { cwd: process.env.SITE_BASE_PATH })` to set working directory to site root.
**Warning signs:** "Cannot find module terser" or wrong output path.

### Pitfall 6: YAML Dump Formatting
**What goes wrong:** `js-yaml.dump()` reformats the entire YAML file, losing comments and custom formatting.
**Why it happens:** YAML round-tripping destroys comments (YAML spec does not preserve them).
**How to avoid:** For content-queue.yaml status update, use targeted string replacement (`status: "planned"` -> `status: "drafted"`) rather than full YAML dump. For content-map.yaml, append the new entry as a YAML string at the end of the blogs array.
**Warning signs:** All comments in content-queue.yaml disappear after pipeline run.

### Pitfall 7: FAQPage Schema "name" Requirement
**What goes wrong:** Generated FAQPage schema missing the `"name"` property.
**Why it happens:** Standard FAQPage schema does not require `name`, but this project does (per INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md).
**How to avoid:** Include in the system prompt: "FAQPage schema MUST include a 'name' property." Validation check 5 should verify `"@type": "FAQPage"` AND `"name":` within the FAQPage block.
**Warning signs:** Google Search Console warning "Element sans nom".

## Code Examples

### Extending loader.js — Additional Context Sources
```javascript
// Source: Existing loader.js pattern + INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function loadPipelineContext() {
  const basePath = process.env.SITE_BASE_PATH;
  if (!basePath) throw new Error('SITE_BASE_PATH env var is required');

  // Existing loads from loader.js
  const { seoConfig, pricingSection, contentMapTrimmed } = loadSiteConfig();

  // Additional loads for pipeline
  const contentQueue = yaml.load(
    readFileSync(join(basePath, '.seo-engine', 'data', 'content-queue.yaml'), 'utf8')
  );

  const seoKeywordsCsv = readFileSync(
    join(basePath, '.seo-engine', 'data', 'seo-keywords.csv'), 'utf8'
  );

  const toneGuide = readFileSync(
    join(basePath, '.seo-engine', 'templates', 'tone-guide.md'), 'utf8'
  );

  const blogStructures = readFileSync(
    join(basePath, '.seo-engine', 'templates', 'blog-structures.yaml'), 'utf8'
  );

  const articleInstructions = readFileSync(
    join(basePath, 'INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md'), 'utf8'
  );

  return {
    seoConfig, pricingSection, contentMapTrimmed,
    contentQueue, seoKeywordsCsv, toneGuide,
    blogStructures, articleInstructions
  };
}
```

### Validation Function — 7 Checks
```javascript
// Source: CONTEXT.md D-05 validation checks
export function validateArticle(html) {
  const checks = [
    {
      name: 'DOCTYPE',
      pass: html.trimStart().startsWith('<!DOCTYPE html>'),
    },
    {
      name: 'no-hard-prices',
      pass: !/\d+\s*€|€\s*\d+/.test(html),
    },
    {
      name: 'no-rTMS',
      pass: !/rTMS|stimulation magnétique transcrânienne/i.test(html),
    },
    {
      name: 'has-data-price',
      pass: /data-price=/.test(html),
    },
    {
      name: 'has-FAQPage-schema',
      pass: /"@type":\s*"FAQPage"/.test(html),
    },
    {
      name: 'has-related-articles',
      pass: /data-blog-list="related"/.test(html),
    },
    {
      name: 'has-canonical',
      pass: /<link\s+rel="canonical"/.test(html),
    },
  ];

  const failures = checks.filter(c => !c.pass);
  return { valid: failures.length === 0, checks, failures };
}
```

### Cost Logging to JSONL
```javascript
// Source: CONTEXT.md + F1.10 requirements
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

// Sonnet 4.5 pricing (as of March 2026)
const PRICING = {
  input_per_million: 3.00,
  output_per_million: 15.00,
  cache_write_per_million: 3.75,
  cache_read_per_million: 0.30,
};

export function logCost(usage, slug, logPath) {
  const inputCost = (usage.input_tokens / 1_000_000) * PRICING.input_per_million;
  const outputCost = (usage.output_tokens / 1_000_000) * PRICING.output_per_million;
  const cacheWriteCost = ((usage.cache_creation_input_tokens || 0) / 1_000_000) * PRICING.cache_write_per_million;
  const cacheReadCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) * PRICING.cache_read_per_million;
  const totalUsd = inputCost + outputCost + cacheWriteCost + cacheReadCost;

  const entry = {
    timestamp: new Date().toISOString(),
    slug,
    model: 'claude-sonnet-4-5',
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_tokens: usage.cache_creation_input_tokens || 0,
    cache_read_tokens: usage.cache_read_input_tokens || 0,
    estimated_usd: Math.round(totalUsd * 10000) / 10000,
  };

  appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}
```

### Topic Selection Logic
```javascript
// Source: CONTEXT.md D-09, D-10
const PRIORITY_MAP = { high: 3, medium: 2, low: 1 };

export function selectTopic(contentQueue, contentMapTrimmed) {
  const queue = contentQueue.queue || [];
  const planned = queue.filter(q => q.status === 'planned');

  if (planned.length === 0) {
    return { selected: null, reason: 'No articles with status: planned' };
  }

  // Sort by priority (high first), preserve file order for ties
  planned.sort((a, b) => (PRIORITY_MAP[b.priority] || 0) - (PRIORITY_MAP[a.priority] || 0));

  const existingSlugs = new Set(contentMapTrimmed.map(e => e.slug));

  for (const candidate of planned) {
    // Cannibalization check: exact slug match
    const candidateSlug = candidate.title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    if (existingSlugs.has(candidateSlug)) {
      // Note: this is simplified — real slug may come from queue entry or be derived differently
      continue;
    }
    return { selected: candidate, reason: `Selected ${candidate.id}: ${candidate.title}` };
  }

  return { selected: null, reason: 'All planned articles have slug conflicts' };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `client.messages.create({ stream: true })` (returns raw SSE) | `client.messages.stream()` (high-level helper) | SDK v0.30+ | stream() provides `.on('text')`, `.finalMessage()`, error handling built-in |
| `@anthropic-ai/sdk` CommonJS | ESM exports (`import Anthropic from '@anthropic-ai/sdk'`) | SDK v0.50+ | Works with "type": "module" |
| Manual token counting | `client.messages.countTokens()` | SDK v0.50+ | Exact token count before generation call |

**Deprecated/outdated:**
- `client.completions.create()` — legacy completions API, do not use. Use `client.messages.stream()`.
- `HUMAN_PROMPT` / `AI_PROMPT` constants — from the legacy completions API. Not relevant for messages API.

## Open Questions

1. **Slug derivation for queue entries**
   - What we know: Queue entries have `title` and `id` but no explicit `slug` field. Existing articles use URL-friendly slugs.
   - What's unclear: Should the slug be derived from the title automatically, or should Claude generate it as part of the article? The queue entry for q_003 has notes referencing `slug: magnetiseur-troyes-corinne-vs-geoffron` which was NOT auto-derived from the title.
   - Recommendation: Add slug derivation to prompt-builder (ask Claude to return slug as first line) OR derive from title with a simple slugify function. The planner should decide which approach.

2. **seo-keywords.csv row filtering**
   - What we know: F1.1 says "3-5 relevant rows for the target keyword." Context loading specifies trimming.
   - What's unclear: How to match target keywords from queue entry to CSV rows (exact match? contains? CSV column name?).
   - Recommendation: Read CSV, filter rows where the keyword column contains any of the target_keywords from the queue entry. This requires knowing the CSV column structure.

3. **Pricing for claude-sonnet-4-5**
   - What we know: Sonnet 3.5/3.6 pricing is $3/$15 per million tokens. Sonnet 4.5 may differ.
   - What's unclear: Exact pricing for claude-sonnet-4-5 at time of deployment.
   - Recommendation: Store pricing as a constant object in constants.js. Update when pricing is confirmed. The cost log is an estimate, not billing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v22.17.1 | -- |
| @anthropic-ai/sdk | Article generation | Yes | 0.80.0 | -- |
| js-yaml | YAML parsing | Yes | 4.1.1 | -- |
| pino | Logging | Yes | 10.3.1 | -- |
| terser (npx) | config.min.js rebuild | Yes | 5.46.1 | -- |
| ANTHROPIC_API_KEY | API auth | Env var (not checked) | -- | Pipeline cannot run without it |

**Missing dependencies with no fallback:** None -- all packages installed.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None needed (pattern from Phase 1) |
| Quick run command | `cd autopilot && node --test tests/*.test.js` |
| Full suite command | `cd autopilot && node --test tests/*.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F1.1 | loader returns all 8 context sources | unit | `cd autopilot && node --test tests/loader.test.js` | Partially (existing tests cover 3/8) -- Wave 0 |
| F1.2 | topic-selector picks highest-priority planned, skips cannibalized | unit | `cd autopilot && node --test tests/topic-selector.test.js` | No -- Wave 0 |
| F1.3 | generator calls API with streaming, collects output + usage | integration | Manual (requires API key) | No -- manual-only |
| F1.4 | validator passes valid HTML, fails on each of 7 checks | unit | `cd autopilot && node --test tests/validator.test.js` | No -- Wave 0 |
| F1.5 | file-updater prepends config.js entry, updates sitemap, updates YAML | unit | `cd autopilot && node --test tests/file-updater.test.js` | No -- Wave 0 |
| F1.10 | cost-logger writes JSONL with tokens + USD, run guard blocks 2nd call | unit | `cd autopilot && node --test tests/cost-logger.test.js` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd autopilot && node --test tests/*.test.js`
- **Per wave merge:** Same (no separate full suite needed)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/topic-selector.test.js` -- covers F1.2 (mock content-queue + content-map data)
- [ ] `tests/validator.test.js` -- covers F1.4 (test each of 7 checks with pass/fail HTML)
- [ ] `tests/file-updater.test.js` -- covers F1.5 (test config.js prepend, sitemap insertion, YAML updates on temp files)
- [ ] `tests/cost-logger.test.js` -- covers F1.10 (test JSONL output format, run guard)
- [ ] `tests/loader.test.js` -- extend existing: add tests for the 5 new context sources

## Sources

### Primary (HIGH confidence)
- `@anthropic-ai/sdk` v0.80.0 `lib/MessageStream.d.mts` — streaming API: `on('text')`, `finalMessage()`, usage object shape
- `@anthropic-ai/sdk` v0.80.0 `resources/messages/messages.d.mts` — `stream()` method signature, `Usage` interface with `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- Existing codebase: `autopilot/config/loader.js`, `autopilot/config/constants.js`, `autopilot/server.js`, `autopilot/tests/loader.test.js`
- Existing articles: `blog/arreter-fumer-troyes-methodes-locales-comparatif.html` — verified HTML structure, schema patterns
- `TEMPLATE_article-blog.md` — verified full HTML template structure
- `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — verified checklist and data-price/data-blog-list patterns
- `assets/js/config.js` — verified SITE_CONFIG.blog array structure and prepend location
- `sitemap.xml` — verified `<!-- Articles blog -->` comment marker and URL format
- `.seo-engine/data/content-queue.yaml` — verified queue structure (id, title, priority, status, target_keywords fields)
- `.seo-engine/data/content-map.yaml` — verified blogs array structure (slug, title, status, target_keywords)

### Secondary (MEDIUM confidence)
- Claude Sonnet 4.5 pricing at $3/$15 per million tokens — based on Sonnet 3.5/3.6 pricing pattern; may differ for 4.5

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, API verified from local type definitions
- Architecture: HIGH -- patterns derived from existing codebase + SDK type definitions
- Pitfalls: HIGH -- identified from actual file analysis (config.js format, YAML comments, terser cwd)
- Cost estimation: MEDIUM -- pricing rates may differ for claude-sonnet-4-5 vs older models

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — SDK locked at 0.80.0, project structure stable)
