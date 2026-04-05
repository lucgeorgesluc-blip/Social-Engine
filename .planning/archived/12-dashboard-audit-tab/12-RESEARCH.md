# Phase 12: Dashboard Audit Tab - Research

**Researched:** 2026-04-01
**Domain:** Alpine.js dashboard UI + Express API routes (frontend-heavy)
**Confidence:** HIGH

## Summary

Phase 12 adds an "Audit SEO" tab to the existing Alpine.js dashboard. The codebase is well-established with clear patterns: sidebar tab buttons toggle `$store.nav.tab`, content sections use `x-show` or `x-if`, data loads via `apiFetch()`, and real-time updates arrive via SSE. The existing `index.html` is 1714 lines and `routes/api.js` is 511 lines. Both files have consistent conventions that Phase 12 must follow exactly.

The backend half is partially done: `GET /api/audit` and `GET /api/audit/:slug` routes already exist in `routes/api.js` (lines 483-511). Three new routes are needed: `POST /api/audit/run`, `POST /api/audit/:slug/patch`, and `DELETE /api/audit/:slug/patch`. The `POST /api/audit/:slug/apply` route depends on Phase 11 (patch generator, validator, apply flow) which is planned but NOT yet implemented. Phase 12 must wire the UI to these endpoints regardless, with the understanding that Phase 11 modules will exist by execution time.

**Primary recommendation:** Follow the exact Alpine.js component pattern (`Alpine.data('auditPanel', ...)` registered in `alpine:init`), use `x-if` for the tab container (same as rankings/links/costs tabs to avoid rendering when hidden), and add the SSE `audit-complete` handler to the existing `evtSource.onmessage` switch block at line 920.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 5-column table: Slug / Score badge (color-coded) / Issues (critical + warning chips) / Last scanned / "Generer patch" action button
- In-row drill-down expansion using `selectedAuditSlug` toggle (same Alpine.js pattern as row expansion)
- Default sort: score ascending (worst pages first)
- "Run Audit" button in section header (top-right), same position as "Rediger un article" in queue tab
- Single "Generer un patch" button in drill-down header, visible only when page has auto-patchable issues
- Patch preview: `<pre>` block with highlight.js syntax highlighting (HTML snippet, not full diff)
- Issues grouped by severity: Critical -> Warning -> Healthy with badge chips
- Approve/Reject buttons at bottom of drill-down
- All 5 backend routes in routes/api.js (GET /api/audit, GET /api/audit/:slug, POST /api/audit/:slug/patch, POST /api/audit/run, DELETE /api/audit/:slug/patch)

### Claude's Discretion
- Highlight.js via CDN (same pattern as Chart.js/D3)
- `avgSeoScore` in stats row computed as mean of all page scores from page-audit.json
- Tab highlight when critical issues: red dot badge on sidebar (same as pending notification badge)
- SSE `audit-complete` event updates health grid without reload (same as `pipeline` event)

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F4.9 | Dashboard Audit Tab — health grid, drill-down, patch preview, chutes section, approve/reject | All UI patterns documented from existing dashboard. Backend routes partially exist. highlight.js CDN identified. SSE integration point located at line 920. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Alpine.js | 3.15.9 | Reactive UI (already loaded via CDN) | Locked by project |
| Tailwind CSS | 3 (Play CDN) | Utility classes (already loaded) | Locked by project |
| Express | (existing) | API routes | Locked by project |
| highlight.js | 11.x | HTML syntax highlighting for patch preview | CDN, same pattern as other libs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| highlight.js xml lang | 11.x | HTML language definition for hljs | Always (HTML = xml in hljs) |
| highlight.js github-dark theme | 11.x | Dark theme CSS for code blocks | Always |

**CDN URLs (from UI-SPEC):**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/languages/xml.min.js"></script>
```

**Installation:** No npm install needed. All dependencies loaded via CDN in `<head>`.

## Architecture Patterns

### Integration Points (files to modify)

```
autopilot/
  dashboard/
    index.html        # Add: sidebar tab, audit section HTML, auditPanel() component, SSE handler, hljs CDN
  routes/
    api.js            # Add: POST /api/audit/run, POST /api/audit/:slug/patch, DELETE /api/audit/:slug/patch
                      # Modify: GET /api/stats to include avgSeoScore
                      # Already exist: GET /api/audit, GET /api/audit/:slug
```

### Pattern 1: Sidebar Tab Button
**What:** Add "Audit SEO" button between "Classements GSC" (line 92) and "Maillage interne" (line 108)
**When to use:** Always — this is the navigation entry point
**Example:**
```html
<!-- Exact pattern from existing sidebar buttons (lines 68-89) -->
<button
  @click="$store.nav.tab = 'audit'"
  :class="$store.nav.tab === 'audit' ? 'bg-[#3b82f6] text-white' : 'text-[#7d8590] hover:bg-[#21262d] hover:text-[#e6edf3]'"
  class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative"
>
  <!-- Shield-check SVG icon -->
  <span>Audit SEO</span>
  <!-- Red dot badge for critical issues (same as pendingCount badge on Queue) -->
</button>
```

### Pattern 2: Tab Content Container
**What:** Use `x-if` template (not `x-show`) to prevent hidden-tab rendering issues
**When to use:** Rankings, Links, and Costs tabs all use `<template x-if="...">` — audit must too
**Example:**
```html
<!-- Pattern from line 385 (rankings tab) -->
<template x-if="$store.nav.tab === 'audit'">
  <div x-data="auditPanel()" x-init="init()">
    <!-- Chutes section, health grid, drill-down -->
  </div>
</template>
```

### Pattern 3: Alpine.js Component Registration
**What:** Register `auditPanel` in the existing `alpine:init` listener (line 945)
**When to use:** All dashboard panel components use this pattern
**Example:**
```javascript
// Inside the existing document.addEventListener('alpine:init', () => { ... })
// After costsPanel registration (line 1710)
Alpine.data('auditPanel', () => ({
  loading: true,
  error: '',
  pages: [],
  chutes: [],
  selectedAuditSlug: null,
  selectedDetail: null,
  detailLoading: false,
  generating: new Set(),
  applying: new Set(),
  auditing: false,
  sortBy: 'score-asc',

  async init() {
    await this.loadAudit();
    this.loading = false;
  },

  async loadAudit() { /* GET /api/audit */ },
  async selectPage(slug) { /* GET /api/audit/:slug */ },
  async generatePatch(slug) { /* POST /api/audit/:slug/patch */ },
  async applyPatch(slug) { /* POST /api/audit/:slug/apply */ },
  async rejectPatch(slug) { /* DELETE /api/audit/:slug/patch */ },
  async runAudit() { /* POST /api/audit/run */ },
  scoreBadgeClass(score) { /* return color classes based on thresholds */ },
  severityBadgeClass(severity) { /* return color classes by severity level */ },
  get sortedPages() { /* sort by this.sortBy */ },
  closeDrillDown() { this.selectedAuditSlug = null; this.selectedDetail = null; }
}));
```

### Pattern 4: SSE Event Handling
**What:** Add `audit-complete` case to existing SSE handler
**Where:** Line 920 in `evtSource.onmessage`
**Example:**
```javascript
// Existing pattern (line 921-929):
if (msg.type === 'pipeline') {
  Alpine.store('nav')._pipelinePayload = msg.payload;
}
// Add:
if (msg.type === 'audit-complete') {
  // Dispatch custom event that auditPanel listens for
  window.dispatchEvent(new CustomEvent('audit-complete'));
}
```

### Pattern 5: Backend Route — Spawn Async Process
**What:** `POST /api/audit/run` spawns audit runner as background child process
**Why:** Same pattern as `POST /api/pipeline/run` (line 316) — returns immediately, process runs async
**Example:**
```javascript
apiRouter.post('/audit/run', (req, res) => {
  const runScript = join(__dirname, '..', 'audit', 'runner.js');
  const child = spawn(process.execPath, [runScript], {
    cwd: join(__dirname, '..'),
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  logger.info({ pid: child.pid }, 'Audit spawned from dashboard');
  res.json({ ok: true, pid: child.pid });
});
```

### Pattern 6: Backend Route — SSE Watch for Audit File
**What:** Add `safeWatch` for `page-audit.json` in the SSE `/api/events` handler
**Where:** After `safeWatch(PENDING_PATH, 'pending')` at line 254
**Example:**
```javascript
const AUDIT_PATH = join(STATE_DIR, 'page-audit.json');
// In /api/events handler:
safeWatch(AUDIT_PATH, 'audit-complete');
```

### Pattern 7: avgSeoScore in Stats Route
**What:** Read page-audit.json in `GET /api/stats` and compute average score
**Where:** Extend the existing stats route (line 282)
**Example:**
```javascript
let avgSeoScore = null;
try {
  const auditPath = join(STATE_DIR, 'page-audit.json');
  if (existsSync(auditPath)) {
    const auditData = JSON.parse(readFileSync(auditPath, 'utf8'));
    const scores = Object.values(auditData).map(p => p.score).filter(s => typeof s === 'number');
    if (scores.length > 0) {
      avgSeoScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }
} catch { /* non-critical */ }
// Add to response: res.json({ published, pending: pending.length, keywordsTop10, avgSeoScore });
```

### Pattern 8: Chutes Data Source
**What:** Read `state/audit-status.json` for ranking-drop events
**Structure:** The file is written by `ranking-watcher.js` with this schema:
```json
{
  "running": false,
  "triggeredAt": "2026-04-01T08:00:00.000Z",
  "triggerKeyword": "magnetiseuse troyes",
  "positionBefore": 8,
  "positionAfter": 15,
  "slugsScanned": ["magnetiseur-troyes"],
  "completedAt": "2026-04-01T08:01:00.000Z"
}
```
**Note:** This is a single-event flat file. The `GET /api/audit` response should include this as a `chutes` array (single entry or empty). If multiple triggers need to be tracked over time, the endpoint should wrap the single event in an array.

### Anti-Patterns to Avoid
- **Using `x-show` for tab container:** Use `x-if` to prevent Chart.js/hljs rendering issues when tab is hidden (documented decision from Phase 7)
- **Hardcoding color values in JS:** Always use Tailwind classes, never inline `style="color:..."` — the dashboard has zero inline color styles
- **Creating separate CSS file:** Everything is Tailwind utility classes inline. No custom CSS files exist in the dashboard
- **Using `fetch()` directly:** Always use the existing `apiFetch()` helper (line 890) which handles 401 redirects

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom tokenizer | highlight.js via CDN | Proven, zero-config for HTML |
| Score color mapping | Complex if/else chains | `scoreBadgeClass(score)` helper | Matches existing `statusBadgeClass()` pattern |
| SSE reconnection | Custom reconnect logic | Existing `connectSSE()` function | Already handles reconnect + 401 + health check |
| Confirm modal | New modal component | Existing `_confirmModal` store | Reusable modal pattern already in place |
| Timestamp formatting | Custom date logic | Existing `formatTimestamp()` function | Already handles French locale |

## Common Pitfalls

### Pitfall 1: highlight.js Not Initializing in Alpine.js Dynamic Content
**What goes wrong:** hljs.highlightElement() called before the DOM element exists (Alpine hasn't rendered the `x-if` template yet)
**Why it happens:** Alpine.js `x-if` inserts/removes DOM nodes. When drill-down expands, the `<code>` block doesn't exist until the next microtask
**How to avoid:** Use `$nextTick(() => hljs.highlightElement(...))` after setting the patch content, or use `hljs.highlight(code, {language: 'xml'}).value` and bind with `x-html` instead of relying on DOM mutation
**Warning signs:** Patch preview shows unstyled plain text

### Pitfall 2: SSE File Watcher Not Detecting audit-status.json
**What goes wrong:** `safeWatch` skips the file because it doesn't exist at SSE connection time
**Why it happens:** `audit-status.json` is only created on first ranking drop trigger. The file may not exist when the dashboard loads
**How to avoid:** The existing `safeWatch` function already handles this (checks `existsSync` first). But the watcher won't be created for non-existent files. Solution: watch `page-audit.json` instead (always exists after first audit), OR create audit-status.json with default empty state at startup
**Warning signs:** Running "Run Audit" button but no SSE refresh

### Pitfall 3: Set() Reactivity in Alpine.js
**What goes wrong:** `generating: new Set()` and `applying: new Set()` mutations don't trigger Alpine reactivity
**Why it happens:** Alpine.js does not track `Set.add()` or `Set.delete()` as reactive changes
**How to avoid:** Create a new Set on every mutation: `this.generating = new Set([...this.generating, slug])` and `const next = new Set(this.generating); next.delete(slug); this.generating = next;` — this is exactly the pattern used for `approving` and `generatingImage` in the existing dashboardApp (lines 1074, 1089-1091, 1123, 1139-1141)
**Warning signs:** Button loading states don't update after API call

### Pitfall 4: Drill-Down Row Expansion in HTML Table
**What goes wrong:** Inserting a drill-down `<div>` between `<tr>` elements is invalid HTML
**Why it happens:** Tables require `<tr>` direct children of `<tbody>`
**How to avoid:** The drill-down panel must be a `<tr>` with a single `<td colspan="6">` that contains the expanded content. Use `x-show="selectedAuditSlug === page.slug"` on this second `<tr>` row
**Warning signs:** Layout breaks, content appears outside the table

### Pitfall 5: Phase 11 Dependency
**What goes wrong:** `POST /api/audit/:slug/patch` and `POST /api/audit/:slug/apply` call modules that don't exist yet
**Why it happens:** Phase 11 (patch-generator, validator, apply-flow) is not yet implemented
**How to avoid:** The routes should import the modules dynamically (`await import(...)`) or check for their existence, and return a clear error message if unavailable. Alternatively, since phases execute sequentially and Phase 12 depends on Phase 11, the modules WILL exist at execution time. The planner should note this dependency explicitly.
**Warning signs:** Module import errors at startup

### Pitfall 6: GET /api/audit Response Shape for Frontend
**What goes wrong:** Frontend expects `{ pages: [...] }` array but backend returns object-keyed JSON
**Why it happens:** `page-audit.json` is slug-keyed: `{ "a-propos": {...}, "arret-tabac": {...} }`
**How to avoid:** The `GET /api/audit` route (already exists at line 483) returns the raw object. Frontend must convert: `Object.entries(data).map(([slug, d]) => ({ slug, ...d }))`. The existing route wraps in `{ pages: {} }` on empty state, but returns raw data otherwise. This inconsistency should be normalized.
**Warning signs:** `pages.map is not a function` error

## Code Examples

### Score Badge Helper (verified pattern from existing statusBadgeClass)
```javascript
function scoreBadgeClass(score) {
  if (score >= 80) return 'bg-[#22c55e] text-[#0d1117]';
  if (score >= 60) return 'bg-[#eab308] text-[#0d1117]';
  return 'bg-[#ef4444] text-white';
}
```

### Severity Badge Helper
```javascript
function severityBadgeClass(severity) {
  const map = {
    critical: 'bg-[#ef4444]/20 text-[#ef4444]',
    warning: 'bg-[#eab308]/20 text-[#eab308]',
    info: 'bg-[#3b82f6]/20 text-[#3b82f6]',
    healthy: 'bg-[#22c55e]/20 text-[#22c55e]',
  };
  return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' + (map[severity] || map.info);
}
```

### Drill-Down Row Pattern (table-compatible)
```html
<template x-for="page in sortedPages" :key="page.slug">
  <tbody>
    <tr @click="selectPage(page.slug)"
        class="border-t border-[#30363d] hover:bg-[#21262d] cursor-pointer transition-colors"
        :class="selectedAuditSlug === page.slug ? 'bg-[#21262d] border-l-2 border-l-[#3b82f6]' : ''">
      <!-- 6 columns -->
    </tr>
    <tr x-show="selectedAuditSlug === page.slug">
      <td colspan="6" class="bg-[#161b22] border-t border-[#30363d] p-6">
        <!-- drill-down content -->
      </td>
    </tr>
  </tbody>
</template>
```

### highlight.js Safe Initialization
```javascript
// Use hljs.highlight() programmatically instead of hljs.highlightElement()
// This avoids DOM timing issues with Alpine.js x-if
get patchHighlighted() {
  if (!this.selectedDetail?.pendingPatch) return '';
  if (typeof hljs === 'undefined') return this.selectedDetail.pendingPatch;
  return hljs.highlight(this.selectedDetail.pendingPatch, { language: 'xml' }).value;
}
// In template: <code class="hljs language-html" x-html="patchHighlighted"></code>
```

### Existing Confirm Modal Reuse
```javascript
// Reuse the _confirmModal store for patch approval (same pattern as article approval)
async applyPatch(slug) {
  const title = `Appliquer le patch SEO sur ${slug}`;
  Alpine.store('nav')._confirmModal = { open: true, slug, title };
  // Wire confirm/cancel events — same as approve() in dashboardApp (line 1095-1111)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `x-show` for all tabs | `x-if` for heavy tabs (rankings, links, costs) | Phase 7 | Prevents Chart.js/D3 zero-dimension bugs |
| Single `Alpine.data('dashboardApp')` | Separate panel components per tab | Phase 7 | Better code organization, lazy loading |
| Manual SSE reconnect | `connectSSE()` with 401 check + health probe | Phase 6 | Reliable reconnection |

## Open Questions

1. **audit-status.json as single-event vs. event log**
   - What we know: ranking-watcher.js overwrites `audit-status.json` with each trigger (single object, not array)
   - What's unclear: The UI "Chutes" section wants to show multiple ranking-drop events from "last 7 days"
   - Recommendation: For Plan 01, read the single event from audit-status.json and display as a 0-or-1-item list. If historical tracking is needed, that's a separate enhancement to ranking-watcher.js (store array of events). This is sufficient for F4.9 success criteria.

2. **POST /api/audit/:slug/apply route**
   - What we know: CONTEXT.md lists it. Phase 11 will create the apply-flow module.
   - What's unclear: The exact import path and function signature of the apply module
   - Recommendation: Plan 02 should define the route with a clear import from `../audit/apply-flow.js` and handle the case where the module doesn't exist (graceful 501 error). By execution time, Phase 11 will be complete.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend routes | Yes | 22.x | -- |
| highlight.js CDN | Patch preview | Yes (CDN) | 11.x | Plain `<pre>` without highlighting |
| page-audit.json | Health grid data | Yes | -- | Empty state UI |
| audit-status.json | Chutes section | May not exist | -- | Empty chutes array |
| audit/runner.js | POST /api/audit/run | Yes | -- | -- |
| audit/patch-generator.js | POST /api/audit/:slug/patch | No (Phase 11) | -- | 501 Not Implemented |
| audit/apply-flow.js | POST /api/audit/:slug/apply | No (Phase 11) | -- | 501 Not Implemented |

**Missing dependencies with no fallback:**
- None (Phase 11 modules will exist before Phase 12 executes)

**Missing dependencies with fallback:**
- `audit-status.json` may not exist on fresh install -- show empty Chutes section

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node --test (built-in, Node 22) |
| Config file | none -- node --test discovers by pattern |
| Quick run command | `cd autopilot && node --test tests/api-audit.test.js` |
| Full suite command | `cd autopilot && node --test tests/*.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F4.9-grid | GET /api/audit returns pages + avgSeoScore in stats | integration | `node --test tests/api-audit.test.js` | Yes (existing) |
| F4.9-detail | GET /api/audit/:slug returns single page detail | integration | `node --test tests/api-audit.test.js` | Yes (existing) |
| F4.9-run | POST /api/audit/run spawns audit runner | integration | `node --test tests/api-audit-actions.test.js` | No -- Wave 0 |
| F4.9-patch | POST /api/audit/:slug/patch triggers generation | integration | `node --test tests/api-audit-actions.test.js` | No -- Wave 0 |
| F4.9-reject | DELETE /api/audit/:slug/patch removes pending patch | integration | `node --test tests/api-audit-actions.test.js` | No -- Wave 0 |
| F4.9-stats | GET /api/stats returns avgSeoScore | integration | `node --test tests/api-audit.test.js` | Yes (extend) |
| F4.9-sse | SSE emits audit-complete on page-audit.json change | integration | `node --test tests/api-sse.test.js` | Yes (extend) |
| F4.9-ui | Frontend renders health grid, drill-down, patch preview | manual | Browser test | N/A |

### Sampling Rate
- **Per task commit:** `cd autopilot && node --test tests/api-audit.test.js tests/api-audit-actions.test.js`
- **Per wave merge:** `cd autopilot && node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api-audit-actions.test.js` -- covers POST /api/audit/run, POST /api/audit/:slug/patch, DELETE /api/audit/:slug/patch
- [ ] Extend `tests/api-audit.test.js` -- add avgSeoScore test for GET /api/stats
- [ ] Extend `tests/api-sse.test.js` -- add audit-complete event test

## Sources

### Primary (HIGH confidence)
- `autopilot/dashboard/index.html` -- existing Alpine.js patterns, sidebar structure, tab system, SSE handler, component registration, confirm modal
- `autopilot/routes/api.js` -- existing route patterns, SSE implementation, audit routes (GET), stats route, spawn pattern
- `autopilot/state/page-audit.json` -- actual data structure with real page audit data
- `autopilot/audit/ranking-watcher.js` -- audit-status.json write schema
- `12-CONTEXT.md` -- locked implementation decisions
- `12-UI-SPEC.md` -- complete visual and interaction contract

### Secondary (MEDIUM confidence)
- highlight.js CDN URLs (jsdelivr is stable, version 11.x is current)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use or specified in UI-SPEC
- Architecture: HIGH -- all patterns extracted directly from existing codebase (1714 lines of index.html analyzed)
- Pitfalls: HIGH -- identified from actual Alpine.js reactivity behavior and DOM structure constraints

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no moving parts, all patterns from existing code)
