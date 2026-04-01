# Architecture Research: SEO Page Audit Pipeline

**Project:** SEO Autopilot — Audit Engine Milestone
**Researched:** 2026-04-01
**Overall confidence:** HIGH (questions 1, 3, 4, 5 grounded in existing codebase patterns) / MEDIUM (questions 2 schema design — domain-specific, no official standard)

---

## Context: Existing Codebase Patterns

Before external research, the existing autopilot codebase was read in full. These patterns are already established and must be consistent:

- **File watching (SSE):** `routes/api.js` already uses native `fs.watch` with a 100ms debounce factory to handle Windows double-fire. This is working in production. The comment literally says "// Debounce factory — prevents Windows double-fire (RESEARCH.md Pitfall 6)".
- **State files:** JSON files in `state/`. Reads with `readFileSync`, writes with `writeFileSync`. No locking currently — single-process, single-writer assumption holds because the pipeline is spawned as a detached child process and writes sequentially.
- **Approval gate:** `pending.json` → `writePendingItem()` → `triggerDeploy()` → `removePendingBySlug()`. Array-based, slug-keyed.
- **DI pattern:** Every module accepts `_injected` overrides for testing (`_stateDir`, `_writeFn`, `_readFn`). New modules must follow this.
- **ESM:** `"type": "module"` in `package.json`. All imports are ESM. No CommonJS.
- **Stack:** Express 5, Alpine.js 3, Tailwind CDN, pino, no cheerio, no chokidar currently installed.

---

## Question 1: File Watcher — chokidar vs fs.watch vs polling

### Recommendation: Use native `fs.watch` + debounce (no new dependency)

**Rationale:**

The codebase already uses `fs.watch` with a 100ms debounce in `routes/api.js` (the SSE endpoint watches `pipeline-status.json` and `pending.json`). That pattern is proven and working on Windows. Adding `ranking-trigger.js` should use the exact same approach.

**Why NOT chokidar for this use case:**

- Chokidar v5 (released November 2025) is ESM-only and requires Node.js >= 20 — compatible with this project, but it is a new dependency (~200KB install) for a solved problem.
- Chokidar also internally uses `fs.watch` on Windows and normalizes events. The existing debounce already handles the Windows double-fire problem that chokidar would solve.
- The watcher here has a specific, narrow scope: one file (`live-rankings-history.json`), single process, local disk. Chokidar's value is watching directory trees across platforms — overkill here.
- npm downloads show chokidar at ~100M downloads/week, highly popular, but adding it only to watch one file conflicts with the project's minimal-dependency philosophy (the current `package.json` has 11 deps total).

**Why NOT polling (setInterval + stat):**

- Polling burns CPU and is imprecise. The existing code explicitly avoids it.
- `fs.watch` on Windows uses `ReadDirectoryChangesW` (kernel-level, event-driven) — zero CPU when idle.

**The right approach for `ranking-trigger.js`:**

```javascript
// ranking-trigger.js — reuse the exact debounce pattern from api.js
import { watch, readFileSync, existsSync } from 'node:fs';

function debounced(fn, ms = 150) {
  let timer = null;
  return () => { clearTimeout(timer); timer = setTimeout(fn, ms); };
}

export function watchRankingsForDrops(historyPath, onDrop) {
  if (!existsSync(historyPath)) return null;

  let previousSnapshot = null;

  const handler = debounced(() => {
    try {
      const current = JSON.parse(readFileSync(historyPath, 'utf8'));
      if (previousSnapshot !== null) {
        const drops = detectDrops(previousSnapshot, current);
        if (drops.length > 0) onDrop(drops);
      }
      previousSnapshot = current;
    } catch { /* file mid-write — skip */ }
  }, 150);

  const watcher = watch(historyPath, handler);
  return watcher; // caller must call watcher.close() on shutdown
}
```

**Debounce value:** Use 150ms (slightly longer than the 100ms in SSE) because `live-rankings-history.json` is written by `dataforseo-rankings.js` in a single synchronous `writeFileSync` call. Windows may fire 2 events for the same write. 150ms guarantees only the final stable state is read.

**Confidence:** HIGH — based on the existing working pattern in the codebase.

---

## Question 2: State File Schema — page-audit.json

### Recommendation: Two-file design — `page-audit.json` (signals) + `audit-results.json` (scored issues)

**Rationale:** Separating raw extraction from scored analysis mirrors the existing pipeline pattern (`pipeline-status.json` tracks process state; `pending.json` tracks content state — two distinct concerns). It also allows `page-scanner.js` and `audit-engine.js` to be independently testable and replaceable.

### `state/page-audit.json` — Raw signal store

Stores what was extracted from each HTML file. Includes previous scan for diff without needing a separate history file.

```json
{
  "scannedAt": "2026-04-01T10:00:00.000Z",
  "pages": {
    "index": {
      "slug": "index",
      "file": "index.html",
      "scannedAt": "2026-04-01T10:00:00.000Z",
      "signals": {
        "title": "Magnétiseuse Troyes — Corinne Lacoste",
        "titleLength": 42,
        "metaDescription": "Corinne Lacoste, magnétiseuse à Troyes...",
        "metaDescriptionLength": 156,
        "canonical": "https://www.magnetiseuse-lacoste-corinne.fr/",
        "h1": "Magnétiseuse & Hypnothérapeute à Troyes",
        "h1Count": 1,
        "h2s": ["Soins proposés", "Arrêt du tabac", "Témoignages"],
        "h2Count": 3,
        "wordCount": 842,
        "imageCount": 3,
        "imagesWithoutAlt": ["hero.webp"],
        "internalLinks": ["soins.html", "hypnose-troyes.html"],
        "internalLinkCount": 7,
        "externalLinks": [],
        "schemaTypes": ["HealthAndBeautyBusiness", "FAQPage"],
        "hasSchemaRating": true,
        "ratingValue": "4.9",
        "reviewCount": "35",
        "openGraphTitle": "Magnétiseuse Troyes — Corinne Lacoste",
        "hasOpenGraph": true,
        "robotsMeta": null,
        "loadingEager": true
      },
      "previousSignals": {
        "title": "Magnétiseuse Troyes",
        "titleLength": 20,
        "scannedAt": "2026-03-25T10:00:00.000Z"
      },
      "diff": {
        "title": { "from": "Magnétiseuse Troyes", "to": "Magnétiseuse Troyes — Corinne Lacoste" },
        "titleLength": { "from": 20, "to": 42 }
      }
    }
  }
}
```

**Key design decisions:**

- **Keyed by slug** (not array) — O(1) lookup by slug for the API route `GET /api/audit/:slug`. Arrays require `.find()`.
- **`previousSignals` is a shallow copy of last scan's signals** — not a full history. Full history would bloat the file. If history is needed later, use `audit-history.jsonl` (append-only, like `activity.jsonl`).
- **`diff` is computed at scan time** — the scanner writes it when replacing `previousSignals`. This avoids recomputing it on every API read.
- **Only include diff keys that actually changed** — empty `diff: {}` means no change detected.

### `state/audit-results.json` — Scored issues

```json
{
  "generatedAt": "2026-04-01T10:00:00.000Z",
  "summary": {
    "totalPages": 12,
    "avgScore": 74,
    "pagesWithCritical": 2,
    "pagesWithWarnings": 5
  },
  "pages": {
    "index": {
      "slug": "index",
      "score": 91,
      "issues": []
    },
    "arret-tabac-troyes": {
      "slug": "arret-tabac-troyes",
      "score": 58,
      "issues": [
        {
          "id": "title-too-short",
          "severity": "critical",
          "signal": "titleLength",
          "value": 20,
          "threshold": 30,
          "message": "Titre trop court (20 chars). Minimum recommandé : 30.",
          "fix": "Allonger le titre pour inclure le mot-clé principal et la localisation."
        },
        {
          "id": "missing-h1",
          "severity": "critical",
          "signal": "h1Count",
          "value": 0,
          "threshold": 1,
          "message": "Aucun H1 détecté.",
          "fix": "Ajouter un H1 contenant le mot-clé principal."
        }
      ],
      "pendingPatch": null
    }
  }
}
```

**Key design decisions:**

- **`pendingPatch`** — when `patch-generator.js` produces a fix for a page, it stores the patch reference here (not in a separate file). The `POST /api/audit/:slug/apply` route reads this field.
- **`severity` values:** `"critical"` | `"warning"` | `"info"` — maps directly to dashboard badge colors.
- **Score formula (recommended):** Start at 100, subtract per issue: critical = -15, warning = -5, info = -1. Cap at 0. Simple, deterministic, no external dependency.

### Signals to extract (for `page-scanner.js`)

| Signal | Extractor | How |
|--------|-----------|-----|
| title | cheerio | `$('title').text()` |
| metaDescription | cheerio | `$('meta[name="description"]').attr('content')` |
| canonical | cheerio | `$('link[rel="canonical"]').attr('href')` |
| h1 / h1Count | cheerio | `$('h1')` |
| h2s | cheerio | `$('h2').map()` |
| wordCount | regex on body text | strip tags, count words |
| imagesWithoutAlt | cheerio | `$('img:not([alt])')` |
| internalLinks | cheerio | `$('a[href]')` filter by domain |
| schemaTypes | cheerio | `$('script[type="application/ld+json"]')` → parse JSON → extract `@type` |
| hasSchemaRating | cheerio + JSON.parse | check for `aggregateRating` |
| robotsMeta | cheerio | `$('meta[name="robots"]').attr('content')` |
| loadingEager | cheerio | `$('img[loading="eager"]').length > 0` |

**Tool: cheerio** — not currently installed. Must add: `npm install cheerio`. Cheerio is the Node.js standard for server-side HTML parsing (jQuery-like API, uses parse5 under the hood). Confidence HIGH — widely used, stable API, no headless browser needed since these HTML files are static (no client-side rendering to worry about).

---

## Question 3: Patch-Apply Flow

### Recommendation: Extend the existing pending/approve gate, don't create a parallel system

The article approval flow already implements: generate → store in state → user approves → apply → deploy. The audit patch flow is the same shape with one difference: instead of writing a new file, it edits an existing file.

**Proposed flow:**

```
1. audit-engine.js detects issue on slug X
2. patch-generator.js calls Claude API with:
   - current HTML snippet (problematic section only, not full file)
   - issue description + fix recommendation from audit-results.json
   - returns: { patchType: "replace", selector: "title", before: "...", after: "..." }
3. audit-results.json["pages"][slug]["pendingPatch"] = { patchType, selector, before, after, generatedAt }
4. SSE fires → dashboard "Audit SEO" tab shows yellow badge on that page
5. User clicks "Appliquer" in dashboard → POST /api/audit/:slug/apply
6. apply handler:
   a. reads pendingPatch from audit-results.json
   b. reads HTML file from SITE_BASE_PATH/[file]
   c. applies patch (cheerio mutation → serialize back to HTML)
   d. writeFileSync (atomic write pattern: write to .tmp, rename)
   e. re-scans page → updates page-audit.json + audit-results.json
   f. calls sftp-deployer.deployFiles() for that single file
   g. clears pendingPatch field
   h. logs to activity.jsonl
```

**Patch representation — keep it simple, avoid JSON Patch (RFC 6902):**

JSON Patch (RFC 6902) is the standard for JSON diffs but does not apply to HTML. For HTML, use a cheerio-based selector approach:

```json
{
  "patchType": "attr-replace",
  "selector": "title",
  "attribute": null,
  "before": "Magnétiseuse Troyes",
  "after": "Magnétiseuse & Hypnothérapeute à Troyes | Corinne Lacoste"
}
```

Supported `patchType` values for v1: `"text-replace"` (change element text), `"attr-replace"` (change an attribute), `"insert-after"` (add element after selector). This covers 90% of SEO fixes (title, meta description, canonical, alt text, h1 text).

**Atomic write pattern (already implied by the codebase):**

```javascript
// Write to temp file then rename — prevents partial reads during write
const tmpPath = htmlPath + '.tmp';
writeFileSync(tmpPath, newHtml, 'utf8');
renameSync(tmpPath, htmlPath);
```

`renameSync` is atomic on the same filesystem on both Linux and Windows (NTFS). This matters because the SSE watcher may read the file during a write.

**Git commit:** After apply, spawn `git commit -m "fix(seo): [slug] — [issue description]"` as a child process (same pattern as `POST /api/pipeline/run` which spawns `run.js`). Do not `await` — fire and forget, log output to `activity.jsonl`.

**Confidence:** HIGH — this is a direct extension of the existing approval gate pattern with no new architectural concepts.

---

## Question 4: Concurrent Audit Runs — Lock Strategy

### Recommendation: In-memory flag + lock file, no external library needed

**Analysis of the concurrency situation:**

This is a single-process Node.js application (one `server.js` instance). The audit pipeline is triggered by:
1. The ranking-trigger.js watcher (event-driven)
2. A future API route `POST /api/audit/run` (manual trigger)

Both triggers run in the same process. Node.js is single-threaded — there is no true concurrent execution. The risk is **interleaving async operations**: trigger fires while a previous audit is mid-execution (e.g., halfway through scanning 12 HTML files).

**The right solution: in-memory boolean flag + state file flag**

```javascript
// audit-engine.js
let _auditRunning = false;

export async function runAudit({ force = false } = {}) {
  if (_auditRunning && !force) {
    logger.info('Audit already running — skipped');
    return { skipped: true };
  }
  _auditRunning = true;
  // write running flag to state for dashboard visibility
  writeAuditStatus({ running: true, startedAt: new Date().toISOString() });
  try {
    // ... scan + score ...
  } finally {
    _auditRunning = false;
    writeAuditStatus({ running: false });
  }
}
```

**Why NOT `proper-lockfile`:**

- `proper-lockfile` is designed for multi-process locking (multiple Node.js processes, possibly on different machines). This app is single-process.
- Adding `proper-lockfile` (a CJS package, requires compatibility shim in ESM) for a problem solvable with a boolean flag is unnecessary complexity.
- The existing codebase has zero inter-process locking — the pipeline is a detached child process that does not write to the same state files as the server. That design avoids the problem entirely.

**The one genuine race condition:** The pipeline's detached child (`run.js`) and the audit engine both run as Node.js processes. If `run.js` and the audit engine both write to `audit-results.json` simultaneously, corruption is possible. **Solution:** The audit engine does not write during pipeline runs. Check `pipeline-status.json` before starting an audit:

```javascript
function isPipelineRunning() {
  try {
    const status = JSON.parse(readFileSync(PIPELINE_STATUS_PATH, 'utf8'));
    // Pipeline is "idle" when step is 0 or file is stale (>10min)
    const age = Date.now() - new Date(status.ts).getTime();
    return status.step > 0 && age < 600000;
  } catch { return false; }
}
```

**State file for dashboard visibility:**

```json
// state/audit-status.json
{
  "running": false,
  "startedAt": null,
  "completedAt": "2026-04-01T10:00:00.000Z",
  "pageCount": 12,
  "durationMs": 1842
}
```

This file is watched by the SSE endpoint (extend the existing `safeWatch` call in `GET /api/events`).

**Confidence:** HIGH — single-process analysis is grounded in the existing architecture. The pipeline-running check is a concrete, testable guard.

---

## Question 5: Dashboard "Audit SEO" Tab — Alpine.js Architecture

### Recommendation: Master/detail split-pane with score grid, reusing existing dashboardApp() component

The existing dashboard uses a single `dashboardApp()` function registered in `index.html` with Alpine.js `x-data`. The audit tab should follow the same pattern: add audit state to `dashboardApp()`, not create a separate `x-data` component.

**State to add to `dashboardApp()`:**

```javascript
// additions to dashboardApp() in index.html
auditPages: [],        // array, sorted by score ASC for worst-first
auditSummary: null,    // { totalPages, avgScore, pagesWithCritical, pagesWithWarnings }
auditLoading: false,
auditRunning: false,
selectedAuditSlug: null,  // null = show grid; set = show drill-down panel

get selectedAuditPage() {
  return this.auditPages.find(p => p.slug === this.selectedAuditSlug) ?? null;
},
```

**Health score grid (master view):**

```html
<!-- Audit SEO tab — master grid -->
<div x-show="$store.nav.tab === 'audit'">

  <!-- Summary bar -->
  <div class="grid grid-cols-4 gap-4 mb-6" x-show="auditSummary">
    <div class="bg-[#1c2128] border border-[#30363d] rounded-xl p-5">
      <p class="text-xs text-[#7d8590] mb-2">Score moyen</p>
      <p class="text-2xl font-semibold"
         :class="auditSummary?.avgScore >= 80 ? 'text-[#22c55e]' : auditSummary?.avgScore >= 60 ? 'text-[#eab308]' : 'text-[#ef4444]'"
         x-text="auditSummary?.avgScore + '/100'"></p>
    </div>
    <!-- ... pagesWithCritical, pagesWithWarnings, totalPages -->
  </div>

  <!-- Page grid — show when no page selected -->
  <div x-show="selectedAuditSlug === null"
       class="grid grid-cols-3 gap-3">
    <template x-for="page in auditPages" :key="page.slug">
      <div @click="selectedAuditSlug = page.slug"
           class="bg-[#1c2128] border rounded-xl p-4 cursor-pointer hover:border-[#3b82f6] transition-colors"
           :class="page.issues.some(i => i.severity === 'critical')
             ? 'border-[#ef4444]/40'
             : page.issues.some(i => i.severity === 'warning')
               ? 'border-[#eab308]/40'
               : 'border-[#30363d]'">
        <!-- Score donut or number -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-[#e6edf3]" x-text="page.slug"></span>
          <span class="text-xl font-bold"
                :class="page.score >= 80 ? 'text-[#22c55e]' : page.score >= 60 ? 'text-[#eab308]' : 'text-[#ef4444]'"
                x-text="page.score"></span>
        </div>
        <!-- Issue count badges -->
        <div class="flex gap-2 flex-wrap">
          <span x-show="page.issues.filter(i => i.severity === 'critical').length > 0"
                class="text-xs bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full"
                x-text="page.issues.filter(i => i.severity === 'critical').length + ' critique(s)'"></span>
          <span x-show="page.issues.filter(i => i.severity === 'warning').length > 0"
                class="text-xs bg-[#eab308]/20 text-[#eab308] px-2 py-0.5 rounded-full"
                x-text="page.issues.filter(i => i.severity === 'warning').length + ' warning(s)'"></span>
          <span x-show="page.pendingPatch !== null"
                class="text-xs bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-0.5 rounded-full">
            Correctif prêt
          </span>
        </div>
      </div>
    </template>
  </div>

  <!-- Drill-down panel — show when a page is selected -->
  <div x-show="selectedAuditSlug !== null" x-cloak>
    <button @click="selectedAuditSlug = null"
            class="text-xs text-[#7d8590] hover:text-[#e6edf3] mb-4 flex items-center gap-1">
      &larr; Retour à la grille
    </button>
    <template x-if="selectedAuditPage">
      <div class="bg-[#1c2128] border border-[#30363d] rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold" x-text="selectedAuditPage.slug + '.html'"></h3>
          <span class="text-3xl font-bold"
                :class="selectedAuditPage.score >= 80 ? 'text-[#22c55e]' : selectedAuditPage.score >= 60 ? 'text-[#eab308]' : 'text-[#ef4444]'"
                x-text="selectedAuditPage.score + '/100'"></span>
        </div>
        <!-- Issues list -->
        <div class="space-y-3">
          <template x-for="issue in selectedAuditPage.issues" :key="issue.id">
            <div class="border rounded-lg p-4"
                 :class="issue.severity === 'critical' ? 'border-[#ef4444]/30 bg-[#ef4444]/5' : 'border-[#eab308]/30 bg-[#eab308]/5'">
              <p class="text-sm font-medium text-[#e6edf3]" x-text="issue.message"></p>
              <p class="text-xs text-[#7d8590] mt-1" x-text="issue.fix"></p>
            </div>
          </template>
        </div>
        <!-- Apply patch button (when patch is ready) -->
        <div x-show="selectedAuditPage.pendingPatch !== null" class="mt-4">
          <button @click="applyPatch(selectedAuditPage.slug)"
                  class="bg-[#22c55e] hover:bg-[#16a34a] text-[#0d1117] text-sm font-semibold px-4 py-2 rounded-lg">
            Appliquer le correctif automatique
          </button>
        </div>
      </div>
    </template>
  </div>
</div>
```

**Why `x-show` + `selectedAuditSlug === null` instead of a router:**

The existing dashboard uses this exact same master/detail pattern for the "approve modal" (`_confirmModal.open` flag in `Alpine.store('nav')`). The audit drill-down is the same pattern — a state toggle — not a route change. No `x-if` on the grid itself (keep it in DOM so Alpine doesn't re-render all 12 cards on each back-navigation). Use `x-show` on both panels.

**SSE integration:** Extend the existing SSE `safeWatch` call to also watch `audit-status.json`. When `running: true` received, show a spinner in the audit tab header. When `running: false` received, call `loadAudit()` to refresh data.

**`loadAudit()` function:**

```javascript
async loadAudit() {
  this.auditLoading = true;
  try {
    const r = await fetch('/api/audit', { credentials: 'same-origin' });
    const data = await r.json();
    this.auditPages = data.pages.sort((a, b) => a.score - b.score); // worst first
    this.auditSummary = data.summary;
  } catch (e) {
    console.error('Audit load failed', e);
  } finally {
    this.auditLoading = false;
  }
},

async applyPatch(slug) {
  const r = await fetch(`/api/audit/${slug}/apply`, {
    method: 'POST',
    credentials: 'same-origin'
  });
  if (r.ok) {
    await this.loadAudit();
    this.selectedAuditSlug = null;
  }
},
```

**Confidence:** HIGH — directly derived from reading the existing Alpine.js patterns in `index.html`. No new Alpine features needed.

---

## New API Routes — Specification

```
GET  /api/audit
     → { summary: {...}, pages: [{ slug, score, issues: [...], pendingPatch: null|{...} }] }

GET  /api/audit/:slug
     → { slug, score, issues, pendingPatch, signals: {...} }
     (includes raw signals for power-user debugging)

POST /api/audit/run
     → { ok: true, skipped: boolean }
     (triggers runAudit() — idempotent, returns skipped:true if already running)

POST /api/audit/:slug/apply
     → { ok: true, deployed: boolean }
     (applies pendingPatch to HTML file, re-scans, deploys via SFTP)

POST /api/audit/:slug/generate-patch
     → { ok: true }
     (triggers patch-generator.js for this slug — async, result appears in audit-results.json)
```

Extend `GET /api/events` SSE: add `safeWatch(AUDIT_STATUS_PATH, 'audit-status')` — same pattern as pipeline and pending watches.

Extend `GET /api/stats`: add `avgSeoScore` field computed from `audit-results.json` summary. The dashboard `stats` row already has a placeholder for this field (line 208-211 of `index.html`: `x-text="stats.avgSeoScore != null ? stats.avgSeoScore + '/100' : '—'"`).

---

## New Files to Create

| File | Role |
|------|------|
| `pipeline/page-scanner.js` | Crawl HTML files → extract signals → write `state/page-audit.json` |
| `pipeline/audit-engine.js` | Score signals against thresholds → write `state/audit-results.json` |
| `pipeline/ranking-trigger.js` | Watch `state/live-rankings-history.json` → trigger audit on drop |
| `pipeline/patch-generator.js` | Claude API → generate patch → store in `audit-results.json` |
| `state/page-audit.json` | Raw signal store (created by scanner) |
| `state/audit-results.json` | Scored issues + pending patches (created by engine) |
| `state/audit-status.json` | Running flag + timing (created by engine, watched by SSE) |

---

## New Dependencies to Install

| Package | Version | Justification |
|---------|---------|---------------|
| `cheerio` | `^1.0.0` | HTML parsing for `page-scanner.js`. Standard Node.js HTML parser. No alternatives needed. |

No other new dependencies required. Do NOT add chokidar, proper-lockfile, or any file-watching library.

Install: `npm install cheerio` in `E:/Site CL/autopilot/`.

---

## Critical Pitfalls

### Pitfall 1: Double-fire on Windows fs.watch
**What:** `fs.watch` on Windows fires 2 events for a single `writeFileSync` call — one for content change, one for metadata. Without debounce, the handler runs twice and reads the file twice.
**Prevention:** 150ms debounce (already the pattern in api.js for SSE). Use identical `debounced()` factory.

### Pitfall 2: Reading file while write is in progress
**What:** `writeFileSync` is not atomic on Windows. If the audit reads `live-rankings-history.json` exactly when `dataforseo-rankings.js` is mid-write, `JSON.parse()` throws.
**Prevention:** Wrap every `JSON.parse(readFileSync(...))` in try/catch. If parse fails, log and skip — next watcher event will have the complete file.

### Pitfall 3: Patch corrupting HTML
**What:** Using regex to modify HTML (find/replace title text etc.) can break adjacent attributes or encoding.
**Prevention:** Use cheerio for all HTML mutation. Load → mutate with `$('title').text(newTitle)` → serialize with `$.html()`. Never regex-replace HTML.

### Pitfall 4: Audit overwrites a file the pipeline is currently deploying
**What:** If `POST /api/audit/:slug/apply` deploys a file via SFTP while `triggerDeploy()` is also running an SFTP upload, both writes to the same remote file could conflict.
**Prevention:** Check `audit-status.json` from the audit side and `pipeline-status.json` from the pipeline side before any SFTP operation. Both are cheap synchronous reads.

### Pitfall 5: Score regression on re-scan after patch
**What:** Applying a patch and immediately re-scanning might score differently because cheerio serializes slightly different HTML than the original (e.g., attribute order, self-closing tags).
**Prevention:** Accept minor HTML normalization as acceptable. Document that the scanner uses cheerio for both read and write to ensure consistency.

### Pitfall 6: `x-cloak` missing on drill-down panel
**What:** Alpine.js renders all `x-show` elements briefly before hiding them, causing a flash on page load.
**Prevention:** Add `x-cloak` attribute + CSS `[x-cloak] { display: none !important; }` to the drill-down panel. The existing dashboard already uses this pattern (the stats loading skeletons use `x-show="loading"`).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| File watcher strategy | HIGH | Directly derived from existing working code in api.js |
| State file schema | MEDIUM | No official standard; schema is custom. Design is sound but field names may evolve. |
| Patch-apply flow | HIGH | Direct extension of proven pending/approve gate pattern |
| Concurrency strategy | HIGH | Single-process analysis; in-memory flag is correct for this architecture |
| Alpine.js dashboard | HIGH | Directly derived from reading existing Alpine patterns in index.html |
| cheerio for HTML parsing | HIGH | Industry standard, stable API, no alternatives needed for static HTML |

---

## Sources

- [chokidar npm page](https://www.npmjs.com/package/chokidar) — chokidar v5 ESM-only, requires Node.js 20+
- [chokidar GitHub — double-fire issue #610](https://github.com/paulmillr/chokidar/issues/610) — confirmed Windows double-fire exists in chokidar too
- [Vite issue: Use fs.watch instead of chokidar if Node.js >=v19.1](https://github.com/vitejs/vite/issues/12495) — validates the native fs.watch + debounce approach for modern Node.js
- [proper-lockfile npm](https://www.npmjs.com/package/proper-lockfile) — inter-process locking; confirmed overkill for single-process
- [LogRocket: Node.js file locking](https://blog.logrocket.com/understanding-node-js-file-locking/) — locking options and when to use each
- [cheerio.js.org](https://cheerio.js.org/) — official docs, confirmed HTML mutation API
- [WebScraping.AI: Extract JSON-LD with Cheerio](https://webscraping.ai/faq/cheerio/how-do-you-extract-structured-data-like-json-ld-or-microdata-using-cheerio) — confirmed `$('script[type="application/ld+json"]')` approach
- Existing codebase: `E:/Site CL/autopilot/routes/api.js` — SSE watcher + debounce pattern (PRIMARY SOURCE)
- Existing codebase: `E:/Site CL/autopilot/pipeline/deploy-orchestrator.js` — approval gate pattern (PRIMARY SOURCE)
- Existing codebase: `E:/Site CL/autopilot/dashboard/index.html` — Alpine.js patterns (PRIMARY SOURCE)
