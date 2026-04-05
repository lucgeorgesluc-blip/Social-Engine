# Phase 11: Patch Generator + Validator + Apply - Research

**Researched:** 2026-04-01
**Domain:** Claude API patch generation, HTML validation, SFTP deploy with rollback
**Confidence:** HIGH

## Summary

Phase 11 adds three modules to the audit system: a patch generator that calls Claude API with minimal context (schema excerpts + issues, not full page HTML), a reusable 8-check validator, and an apply flow that writes backups, deploys via SFTP, and rolls back on failure. All three integrate with existing infrastructure: the Anthropic SDK is already in package.json (v0.80.0), cheerio (v1.2.0) is used by signal-extractor.js, deploy-orchestrator.js provides the SFTP pattern, and cost-logger.js provides the JSONL cost tracking pattern.

The key architectural decision from CONTEXT.md is that Claude receives only audit signals + head/schema excerpts + config.js schema data -- NOT the full page HTML. Claude returns targeted HTML snippets (e.g., a JSON-LD block), and cheerio inserts them at the correct DOM location. This means the patch generator is a snippet injector, not a full-page rewriter. The validator then checks the resulting merged HTML against 8 safety rules.

**Primary recommendation:** Follow existing DI patterns exactly (`_underscore` params, pino logging, ESM named exports). Reuse `deployFiles()` from sftp-deployer.js for the SFTP step. Store `pendingPatch` in `page-audit.json` per slug entry (not a separate file).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Claude receives: audit signals + existing schema/head excerpt + config.js schema data (NOT full page HTML -- token efficiency: skip 10K+ body tokens)
- Claude outputs: targeted HTML snippet(s) to inject (e.g., the JSON-LD block to add/replace) -- NOT the full page
- Cheerio applies the snippet at the correct DOM location (head for schema, end of body for FAQ)
- 1 pending patch per slug -- new audit overwrites previous pendingPatch in audit-results.json
- Module lives at: `autopilot/audit/patch-generator.js` (keeps all audit logic together)
- "One-command rollback" = `POST /api/audit/:slug/rollback` API endpoint (accessible from dashboard, no terminal needed)
- Backup retention: keep last 3 backups per slug at `state/backups/[slug]-[timestamp].html` (auto-prune oldest)
- SFTP failure recovery: restore local backup + alert via SSE (local and remote always in sync -- never diverge)
- SSE events: emit `audit-patch-applied` / `audit-patch-failed` on existing `/api/events` stream
- Fixture HTML files in `tests/fixtures/patches/` -- one per check scenario
- Separate test files: `tests/patch-generator.test.js` + `tests/patch-validator.test.js`
- Mock `client.messages.create()` in generator tests (no real API calls in CI)
- 1 happy-path integration test: generate -> validate -> apply -> backup created + local file patched (no SFTP in test)

### Claude's Discretion
- Never-auto-apply list enforcement (aggregateRating, canonical changes, H1/title changes, robots meta, multi-file patches) -- routes to human review, never to auto-apply
- Patch storage: `pendingPatch` field in `audit-results.json["pages"][slug]` (F4.6 spec)
- Apply endpoint: `POST /api/audit/:slug/apply` reads pendingPatch, validates, writes, deploys (F4.8 spec)
- Validator 8 checks as specified in F4.7 requirements

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F4.6 | Patch Generator -- generates HTML patch via Claude API for detected issues, stores as pendingPatch, enforces never-auto-apply list | Claude API streaming pattern from generator.js, cost-logger.js for spend tracking, page-audit.json for pendingPatch storage |
| F4.7 | Patch Validator -- 8 pre-apply safety checks as reusable module | cheerio for DOM parsing, existing validator.js pattern for check structure, pure function design |
| F4.8 | Apply Flow -- backup, validate, cheerio mutation, SFTP deploy, re-scan, rollback on failure | deploy-orchestrator.js triggerDeploy pattern, sftp-deployer.js deployFiles(), runner.js runAudit() for re-scan |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | Claude API calls for patch generation | Already used by pipeline/generator.js |
| `cheerio` | 1.2.0 (installed) | DOM parsing + snippet injection | Already used by audit/signal-extractor.js |
| `ssh2-sftp-client` | 12.1.1 (installed) | SFTP deploy of patched files | Already used by pipeline/sftp-deployer.js |
| `pino` | 10.3.1 (installed) | Structured logging | Project-wide standard |
| `p-retry` | 8.0.0 (installed) | SFTP retry on transient failure | Already used by sftp-deployer.js |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `express` | 5.2.1 | Route handler for apply/rollback endpoints | API routes in routes/api.js |

**No new dependencies required.** Everything needed is already in package.json.

## Architecture Patterns

### Module Placement
```
autopilot/
  audit/
    patch-generator.js     # NEW — F4.6: Claude API call + prompt builder + snippet output
    patch-validator.js      # NEW — F4.7: 8-check validation, reusable pure function
    page-inventory.js       # Existing
    signal-extractor.js     # Existing (reused for re-scan after apply)
    page-scorer.js          # Existing (reused for re-scan after apply)
    runner.js               # Existing (reused for re-scan after apply)
  routes/
    api.js                  # EXTEND — add POST /api/audit/:slug/apply + POST /api/audit/:slug/rollback
  state/
    page-audit.json         # EXTEND — add pendingPatch field per slug
    backups/                # NEW — timestamped backup HTML files
  tests/
    patch-generator.test.js # NEW
    patch-validator.test.js # NEW
    fixtures/patches/       # NEW — HTML fixtures for validator tests
```

### Pattern 1: Snippet Injection (not full-page rewrite)
**What:** Claude returns a JSON-LD block or `<link>` tag. Cheerio inserts it at the correct location.
**When to use:** All auto-generatable patches (schema, FAQ, canonical).
**Example:**
```javascript
// patch-generator.js returns snippet + insertion target
// { snippet: '<script type="application/ld+json">...</script>', target: 'head', action: 'append' }

import { load } from 'cheerio';

function applySnippet(html, patch) {
  const $ = load(html);
  if (patch.action === 'append') {
    $(patch.target).append(patch.snippet);
  } else if (patch.action === 'replace') {
    // For replacing existing JSON-LD blocks by @type
    $(`script[type="application/ld+json"]`).each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data['@type'] === patch.replaceType) {
          $(el).replaceWith(patch.snippet);
        }
      } catch { /* skip invalid blocks */ }
    });
  }
  return $.html();
}
```

### Pattern 2: DI for Claude API (testability)
**What:** Inject `_client` parameter so tests can mock `client.messages.create()` without real API calls.
**Example:**
```javascript
// Same DI pattern as pipeline/generator.js but with _client injection
export async function generatePatch(slug, issues, pageContext, { _client } = {}) {
  const client = _client || new Anthropic();
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: buildPatchSystemPrompt(),
    messages: [{ role: 'user', content: buildPatchUserPrompt(slug, issues, pageContext) }],
  });
  let snippet = '';
  stream.on('text', (delta) => { snippet += delta; });
  const finalMsg = await stream.finalMessage();
  return { snippet, usage: finalMsg.usage };
}
```

### Pattern 3: Atomic File Write (existing project pattern)
**What:** Write to tmp file, then rename -- prevents partial writes on crash.
**Example:**
```javascript
import { writeFileSync, renameSync } from 'node:fs';
const tmpPath = htmlPath + '.tmp';
writeFileSync(tmpPath, patchedHtml, 'utf-8');
renameSync(tmpPath, htmlPath);
```

### Pattern 4: Backup + Auto-Prune
**What:** Keep last 3 backups per slug, auto-delete oldest.
**Example:**
```javascript
import { readdirSync, unlinkSync } from 'node:fs';
function pruneBackups(backupDir, slug, keepCount = 3) {
  const prefix = `${slug}-`;
  const files = readdirSync(backupDir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.html'))
    .sort(); // ISO timestamps sort lexicographically
  while (files.length > keepCount) {
    unlinkSync(join(backupDir, files.shift()));
  }
}
```

### Pattern 5: Never-Auto-Apply Guard
**What:** Check issue types before calling Claude API. If any issue touches the never-auto-apply list, skip API call and log warning.
**Guard list (from F4.6):**
- `aggregateRating` values
- Canonical URL changes (page already has a canonical)
- Title / H1 text changes
- `robots` meta tag changes
- Multi-file patches

### Anti-Patterns to Avoid
- **Full-page rewrite via Claude:** Sending entire HTML to Claude and asking for modified HTML wastes tokens and risks unintended changes. Use snippet injection instead.
- **Storing patches as separate files:** Use `pendingPatch` field in page-audit.json -- one source of truth per slug.
- **Skipping re-scan after apply:** The whole point is to verify the score improved. Always re-run extractPageSignals + scorePageHealth after successful deploy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM manipulation | String regex replacement | cheerio `load()` + `$.html()` | Regex breaks on nested tags, attributes |
| SFTP upload | Custom SSH connection | Existing `deployFiles()` from sftp-deployer.js | Already handles retry, tmp+rename, cleanup |
| Cost tracking | New cost format | Existing `logCost()` from cost-logger.js | Same JSONL format, same pricing constants |
| JSON-LD parsing | Manual string search | `JSON.parse()` on `<script type="application/ld+json">` content | Handles @graph, nested types |
| Idempotency check | Diff algorithm | Apply patch twice, compare with `===` | Simple, reliable, no library needed |

## Common Pitfalls

### Pitfall 1: Cheerio $.html() Encoding
**What goes wrong:** cheerio's `$.html()` may encode entities differently than the original file (e.g., `&eacute;` vs `e`). This breaks the UTF-8 encoding preservation check.
**Why it happens:** cheerio normalizes HTML entities by default.
**How to avoid:** Use `$.html({ decodeEntities: false })` to preserve original encoding. Test with French characters (e, a, c).
**Warning signs:** Accent characters changed in output HTML.

### Pitfall 2: JSON-LD Inside Body (not just head)
**What goes wrong:** Some pages have JSON-LD in `<body>` (e.g., FAQ schema at bottom). The validator must scan the full document, not just `<head>`.
**Why it happens:** signal-extractor.js already handles this (scans full document), but a new validator might assume head-only.
**How to avoid:** Validator checks use `$('script[type="application/ld+json"]')` without `.find('head ...)` scoping.
**Warning signs:** Pages with body-placed schema fail JSON-LD validity check.

### Pitfall 3: Idempotency Check Must Use Cheerio-Normalized HTML
**What goes wrong:** Comparing `originalHtml === patchedTwiceHtml` fails because cheerio normalizes whitespace/attributes on first parse.
**Why it happens:** `$.html()` output is not byte-identical to input.
**How to avoid:** For idempotency, compare `applyPatch(patchedOnce)` vs `patchedOnce` -- both have been through cheerio once. Don't compare against the raw original.
**Warning signs:** Idempotency check always fails even when patch is correct.

### Pitfall 4: SFTP Deploy Uses Fixed File List
**What goes wrong:** `sftp-deployer.js` `deployFiles()` is designed for article deploys (blog HTML + config.js + sitemap). Patch deploys only need the single patched HTML file.
**Why it happens:** The existing function builds a hardcoded file list.
**How to avoid:** Don't reuse `deployFiles()` directly. Either create a simpler `deploySingleFile()` helper, or pass a custom file list. The SFTP connection pattern (connect, upload .tmp, rename, end) can be extracted.
**Warning signs:** Patch deploy also re-uploads config.js and sitemap.xml unnecessarily.

### Pitfall 5: pendingPatch Field in Wrong JSON Structure
**What goes wrong:** page-audit.json is slug-keyed at the top level (e.g., `{ "a-propos": { score, issues, signals } }`). Adding `pendingPatch` must go inside the slug object.
**Why it happens:** Easy to accidentally nest it outside.
**How to avoid:** `auditData[slug].pendingPatch = patchData;` -- never at root level.
**Warning signs:** Dashboard can't find pending patches for specific pages.

### Pitfall 6: SSE Event Emission Requires Access to Response Objects
**What goes wrong:** The apply flow runs inside an API route handler but needs to emit SSE events to all connected clients.
**Why it happens:** SSE connections are managed in the `/api/events` handler, not accessible from other routes.
**How to avoid:** Use a shared event emitter (or write to a state file that the SSE watcher picks up). The simplest approach: write an `audit-events.json` state file, watch it from the SSE handler (same pattern as pipeline-status.json).
**Warning signs:** Patches apply correctly but dashboard doesn't update in real-time.

### Pitfall 7: Backup Timestamp Collision on Windows
**What goes wrong:** `new Date().toISOString()` contains colons which are invalid in Windows filenames.
**Why it happens:** ISO 8601 format `2026-04-01T09:30:00.000Z` has colons.
**How to avoid:** Replace colons: `new Date().toISOString().replace(/[:\.]/g, '-')` producing `2026-04-01T09-30-00-000Z`.
**Warning signs:** `writeFileSync` throws ENOENT on Windows when path contains colons.

## Code Examples

### Claude API Patch Generation (streaming pattern matching generator.js)
```javascript
import Anthropic from '@anthropic-ai/sdk';
import pino from 'pino';
import { logCost } from '../pipeline/cost-logger.js';
import { COST_LOG_PATH } from '../config/constants.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const logger = pino({ name: 'patch-generator' });
const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL = 'claude-sonnet-4-6';

export async function generatePatch(slug, issues, pageContext, { _client, _logCost } = {}) {
  const client = _client || new Anthropic();
  const costLogger = _logCost || logCost;

  const systemPrompt = `You are an SEO HTML patch generator for a French wellness website.
You output ONLY valid HTML snippets. No commentary, no markdown fences, no explanation.
Rules:
- Never output hard-coded euro amounts; use data-price= attributes
- Never mention rTMS
- Use HealthAndBeautyBusiness (not MedicalBusiness) for schema @type
- All JSON-LD must be valid JSON inside <script type="application/ld+json"> tags
- Output ONLY the snippet to inject, not the full page`;

  const userPrompt = `Page: ${slug}
Issues to fix: ${JSON.stringify(issues)}
Current schema/head excerpt: ${pageContext.headExcerpt}
Config.js schema data: ${JSON.stringify(pageContext.schemaData)}

Generate the HTML snippet(s) to fix these issues. Output format:
- One <script type="application/ld+json"> block per schema to add
- Or one <link> tag if adding canonical
Return ONLY valid HTML.`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let snippet = '';
  stream.on('text', (delta) => { snippet += delta; });
  const finalMsg = await stream.finalMessage();

  // Log cost
  const logPath = join(__dirname, '..', COST_LOG_PATH);
  costLogger(finalMsg.usage, slug, logPath);

  return { snippet: snippet.trim(), usage: finalMsg.usage };
}
```

### 8-Check Validator (pure function, cheerio-based)
```javascript
import { load } from 'cheerio';

export function validatePatch(originalHtml, patchedHtml) {
  const failedChecks = [];

  // 1. HTML parseable by cheerio
  let $;
  try {
    $ = load(patchedHtml);
  } catch {
    return { valid: false, failedChecks: ['HTML_PARSE_ERROR'] };
  }

  // 2. All JSON-LD blocks valid JSON
  $('script[type="application/ld+json"]').each((_, el) => {
    try { JSON.parse($(el).text()); }
    catch { failedChecks.push('INVALID_JSONLD'); }
  });

  // 3. Exactly one canonical tag
  const canonicalCount = $('link[rel="canonical"]').length;
  if (canonicalCount !== 1) failedChecks.push('CANONICAL_COUNT');

  // 4. No x-data attribute removed (Alpine.js safety)
  const $orig = load(originalHtml);
  const origXData = [];
  $orig('[x-data]').each((_, el) => origXData.push($orig(el).attr('x-data')));
  const patchedXData = [];
  $('[x-data]').each((_, el) => patchedXData.push($(el).attr('x-data')));
  if (origXData.length > patchedXData.length) failedChecks.push('ALPINE_XDATA_REMOVED');

  // 5. Idempotent (apply patch logic twice -> same result)
  // Caller must implement this check by re-running the apply function

  // 6. No new @type duplicates
  const types = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data['@type']) types.push(data['@type']);
    } catch { /* already caught in check 2 */ }
  });
  const typeSet = new Set(types);
  if (typeSet.size < types.length) failedChecks.push('DUPLICATE_SCHEMA_TYPE');

  // 7. Word count did not decrease
  const origWords = $orig('body').text().split(/\s+/).filter(Boolean).length;
  const patchedWords = $('body').text().split(/\s+/).filter(Boolean).length;
  if (patchedWords < origWords) failedChecks.push('WORD_COUNT_DECREASED');

  // 8. data-price preserved
  const origPriceCount = $orig('[data-price]').length;
  const patchedPriceCount = $('[data-price]').length;
  if (patchedPriceCount < origPriceCount) failedChecks.push('DATA_PRICE_REMOVED');

  return { valid: failedChecks.length === 0, failedChecks };
}
```

### Apply Flow (backup + deploy + rollback)
```javascript
// Simplified flow for POST /api/audit/:slug/apply
export async function applyPatch(slug, { _stateDir, _basePath, _deployFn } = {}) {
  // 1. Read pendingPatch from page-audit.json
  // 2. Check never-auto-apply guard (should already be checked at generation time)
  // 3. Read original HTML file
  // 4. Apply snippet via cheerio
  // 5. Run validatePatch(original, patched)
  // 6. Write backup to state/backups/[slug]-[timestamp].html
  // 7. Prune old backups (keep 3)
  // 8. Atomic write patched file locally
  // 9. SFTP deploy single file
  // 10. On SFTP failure: restore from backup, return 500
  // 11. On success: clear pendingPatch, re-run extractPageSignals + scorePageHealth
  // 12. Emit SSE event
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-page Claude rewrite | Snippet injection via cheerio | CONTEXT.md decision | 90% token reduction, safer patches |
| CLI-only rollback | API endpoint rollback | CONTEXT.md decision | Dashboard-accessible, no terminal needed |
| Unlimited backups | Keep last 3 per slug | CONTEXT.md decision | Prevents disk bloat |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none (scripts.test in package.json) |
| Quick run command | `node --test tests/patch-validator.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F4.6-a | generatePatch returns snippet + usage with mocked client | unit | `node --test tests/patch-generator.test.js -x` | Wave 0 |
| F4.6-b | never-auto-apply blocks aggregateRating/canonical/H1/robots/multi-file issues | unit | `node --test tests/patch-generator.test.js -x` | Wave 0 |
| F4.6-c | cost logged to cost.jsonl after generation | unit | `node --test tests/patch-generator.test.js -x` | Wave 0 |
| F4.7-a | validatePatch passes for valid patched HTML | unit | `node --test tests/patch-validator.test.js -x` | Wave 0 |
| F4.7-b | validatePatch fails for each of 8 check scenarios | unit | `node --test tests/patch-validator.test.js -x` | Wave 0 |
| F4.8-a | apply creates backup before patching | integration | `node --test tests/patch-apply.test.js -x` | Wave 0 |
| F4.8-b | apply restores backup on SFTP failure | integration | `node --test tests/patch-apply.test.js -x` | Wave 0 |
| F4.8-c | apply re-scans page and updates page-audit.json | integration | `node --test tests/patch-apply.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/patch-validator.test.js tests/patch-generator.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/patch-generator.test.js` -- covers F4.6
- [ ] `tests/patch-validator.test.js` -- covers F4.7
- [ ] `tests/fixtures/patches/` -- HTML fixtures for each validation check scenario

## SFTP Deploy for Single Files

The existing `deployFiles()` in sftp-deployer.js is designed for article deploys (hardcoded file list: blog HTML + config.js + config.min.js + sitemap.xml). For patch deploys, only the patched HTML file needs uploading.

**Recommended approach:** Create a lightweight `deploySingleFile(localPath, remotePath, { _sftpClient })` function in sftp-deployer.js (or a new `patch-deployer.js`) that reuses the same connection pattern (connect, put .tmp, rename, end) but for a single file. This avoids modifying the existing article deploy function.

## pendingPatch Data Shape

```javascript
// Inside page-audit.json[slug]:
{
  "score": 35,
  "issues": [...],
  "signals": {...},
  "pendingPatch": {
    "snippet": "<script type=\"application/ld+json\">...</script>",
    "target": "head",          // "head" | "body-end"
    "action": "append",        // "append" | "replace"
    "replaceType": null,       // e.g., "LocalBusiness" if replacing existing schema
    "issuesCovered": ["MISSING_SCHEMA", "MISSING_FAQ"],
    "generatedAt": "2026-04-01T10:00:00.000Z",
    "estimatedCostUsd": 0.008
  },
  "lastScanned": "..."
}
```

## Open Questions

1. **Config.js schema data extraction**
   - What we know: Claude needs schema data from config.js (business name, address, phone, etc.) to generate accurate JSON-LD
   - What's unclear: Exact format of the relevant section in config.js to extract
   - Recommendation: Read config.js at generation time, extract the SITE_CONFIG object's schema/business fields, pass as JSON string to Claude prompt

2. **SSE event emission from route handler**
   - What we know: SSE connections are managed in the `/api/events` route with file watchers
   - What's unclear: Best way to emit events from the apply route handler to all connected SSE clients
   - Recommendation: Write an event to a state file (e.g., `state/audit-events.json`), add a watcher in the SSE handler (same pattern as pipeline-status.json watcher)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `autopilot/pipeline/generator.js` -- Claude API streaming pattern
- Existing codebase: `autopilot/pipeline/sftp-deployer.js` -- SFTP deploy pattern
- Existing codebase: `autopilot/pipeline/cost-logger.js` -- JSONL cost logging pattern
- Existing codebase: `autopilot/audit/signal-extractor.js` -- cheerio DOM parsing pattern
- Existing codebase: `autopilot/pipeline/validator.js` -- validation check structure
- Existing codebase: `autopilot/routes/api.js` -- route + SSE patterns
- CONTEXT.md -- all architectural decisions locked by user discussion

### Secondary (MEDIUM confidence)
- `@anthropic-ai/sdk` v0.80.0 installed, v0.81.0 latest on npm -- streaming API stable
- cheerio v1.2.0 -- `$.html({ decodeEntities: false })` verified in cheerio docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in the project
- Architecture: HIGH -- patterns established by 10 prior phases, CONTEXT.md locks all decisions
- Pitfalls: HIGH -- derived from hands-on analysis of existing code and Windows filesystem constraints

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no new dependencies, all internal code patterns)
