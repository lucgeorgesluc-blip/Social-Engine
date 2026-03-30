# Phase 7: Dashboard Frontend - Research

**Researched:** 2026-03-31
**Domain:** Vanilla-JS dashboard — Alpine.js 3, Tailwind CSS 3, Chart.js v4, D3 d3-hierarchy, SSE EventSource, Express static serving
**Confidence:** HIGH (all critical questions verified against official docs and CDN inspection)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F2.1 | Article queue view: status badges, approve action, search bar | Alpine.js x-data tab switching + fetch POST /api/articles/:slug/approve |
| F2.2 | Keyword rankings chart: line per keyword, inverted Y, time selector, annotation markers | Chart.js v4 time axis + chartjs-plugin-annotation vertical line annotations |
| F2.3 | Internal link tree: d3.tree() hierarchy, colored nodes, collapsible, click highlight | d3-hierarchy 3.1.2 UMD CDN, node._children pattern for collapse |
| F2.4 | Pipeline stepper: 6-step visual, SSE real-time updates, animated current step | EventSource /api/events + Alpine.js reactive state update |
| F2.5 | Stats row: published / pending / keywords top 10 | GET /api/stats → Alpine x-data binding |
| F2.6 | Activity feed: last 20 events, color-coded | GET /api/activity → Alpine x-for list render |
| F2.7 | Auth: login page, session cookie, logout | Express serves login.html public; session cookie sent automatically with fetch() same-origin |
| F2.8 | Pending badge in nav | GET /api/articles?status=pending count → Alpine reactive badge |
</phase_requirements>

---

## Summary

Phase 7 builds the static HTML dashboard that the Phase 6 backend already serves. The backend is fully complete: 7 authenticated API routes, SSE endpoint, auth middleware, session-based login — all tested and green. Phase 7's only job is to create the HTML/CSS/JS files consumed by the browser.

The tech stack is locked: Alpine.js 3 for reactivity (no virtual DOM, no build step), Tailwind CSS 3 Play CDN for styling, Chart.js v4 for rankings, d3-hierarchy for the link tree, native EventSource for SSE. All libraries load via CDN script tags — no webpack, no npm build, no node_modules in the dashboard.

The Express server in `server.js` already has `app.use('/dashboard', isAuthenticated)` in place. Phase 7 adds `express.static('dashboard')` immediately after that middleware line, and creates the `autopilot/dashboard/` directory with static files. The login page lives at the root (`/login.html`, served publicly) so unauthenticated users can reach it.

**Primary recommendation:** Create `autopilot/dashboard/` with one `index.html` (multi-tab SPA using Alpine.js tab switching), one `login.html`, and one `style.css`. Keep all JavaScript inline or in `autopilot/dashboard/js/` — no build pipeline.

---

## Key Findings per Technical Question

### Q1: How to serve static HTML from Express behind isAuthenticated

**Answer (HIGH confidence):** The pattern is chain middleware on the same `app.use('/dashboard', ...)` call:

```javascript
// server.js — replace the placeholder line with:
app.use('/dashboard', isAuthenticated, express.static(join(__dirname, 'dashboard')));
```

**How it works:**
- `isAuthenticated` runs first. If session invalid, it calls `res.status(401).json({error: 'Unauthorized'})` and does NOT call `next()` — so `express.static` never runs.
- If session valid, `isAuthenticated` calls `next()` and `express.static` serves the file.
- The key insight from Phase 6's `server.js` line 37 is that the placeholder `app.use('/dashboard', isAuthenticated)` already exists — it just needs `express.static(...)` appended as a third argument or chained.

**Current server.js line 37:**
```javascript
app.use('/dashboard', isAuthenticated);  // Phase 7 extends this
```

**Phase 7 replacement:**
```javascript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Replace line 37:
app.use('/dashboard', isAuthenticated, express.static(join(__dirname, 'dashboard')));
```

**Login redirect flow:**
- Login page at `/login.html` must be served publicly (before any auth middleware)
- Add `app.use('/login.html', express.static(join(__dirname, 'dashboard')))` before the auth gates, OR
- Simpler: `app.use('/login.html', (req, res) => res.sendFile(join(__dirname, 'dashboard', 'login.html')))`
- On 401 from any `/api/*` call, JS redirects to `/login.html`

**IMPORTANT:** `isAuthenticated` currently sends JSON 401. For dashboard HTML pages, a browser redirect is better. Add a redirect variant:

```javascript
export function isAuthenticatedOrRedirect(req, res, next) {
  if (req.session?.user) return next();
  // For HTML page requests, redirect; for API requests, JSON 401
  const isApiRequest = req.headers.accept?.includes('application/json') ||
                       req.path.startsWith('/api');
  if (isApiRequest) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login.html');
}
```

Alternatively (simpler for this single-user tool): keep JSON 401 and handle redirect in the dashboard JS itself:

```javascript
// In dashboard JS: on any 401, redirect to login
async function apiFetch(path) {
  const r = await fetch(path, { credentials: 'same-origin' });
  if (r.status === 401) { window.location.href = '/login.html'; return null; }
  return r.json();
}
```

**Recommendation:** Use the simpler JS-redirect approach — no server.js auth.js change needed. Confidence: HIGH.

---

### Q2: Alpine.js 3 + Tailwind CSS 3 via CDN

**Confirmed CDN URLs (all verified via official docs and live CDN):**

```html
<!-- Tailwind CSS v3 Play CDN — loads the full v3 JIT compiler in browser -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js v3.15.9 — defer is REQUIRED per official docs -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.9/dist/cdn.min.js"></script>
```

**Tailwind CSS v3 vs v4 CDN distinction (CRITICAL):**
- `https://cdn.tailwindcss.com` serves v3 (JIT, supports all v3 utility classes)
- `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` serves v4 (different API, breaking changes)
- The locked stack is **v3** — use `https://cdn.tailwindcss.com` only

**Tailwind dark mode — use class-based:**
```html
<html class="dark">  <!-- Add 'dark' class to html element -->
```
```javascript
// In tailwind.config block (required for class-based dark mode with Play CDN):
tailwind.config = {
  darkMode: 'class',
  theme: { extend: { /* custom colors */ } }
}
```
```html
<!-- Add inline config before the Tailwind CDN script: -->
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          navy: { 900: '#0d1117', 800: '#161b22' },
          accent: { DEFAULT: '#3b82f6' }
        }
      }
    }
  }
</script>
<script src="https://cdn.tailwindcss.com"></script>
```

**Alpine.js tab switching pattern (verified from official docs):**

```html
<!-- Global store for current tab -->
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('nav', { tab: 'queue' });
  });
</script>

<!-- Sidebar nav button -->
<button @click="$store.nav.tab = 'queue'"
        :class="{ 'bg-blue-600': $store.nav.tab === 'queue' }">
  Queue
</button>

<!-- Tab panels -->
<div x-show="$store.nav.tab === 'queue'" x-data="queuePanel()">
  ...
</div>
<div x-show="$store.nav.tab === 'rankings'" x-data="rankingsPanel()">
  ...
</div>
```

**Alpine.js component registration pattern:**
```javascript
// Define components before Alpine loads (or in alpine:init)
document.addEventListener('alpine:init', () => {
  Alpine.data('queuePanel', () => ({
    articles: [],
    loading: true,
    async init() {
      const data = await apiFetch('/api/articles');
      if (data) this.articles = data.articles;
      this.loading = false;
    },
    async approve(slug) {
      const r = await fetch(`/api/articles/${slug}/approve`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (r.ok) {
        // Optimistic update
        const a = this.articles.find(a => a.slug === slug);
        if (a) a.status = 'published';
      }
    }
  }));
});
```

**Confidence: HIGH** — verified from official Alpine.js docs.

---

### Q3: Chart.js v4 with chartjs-plugin-annotation — CDN and initialization

**Confirmed CDN script tags (load ORDER matters):**

```html
<!-- 1. Chart.js v4.5.1 UMD -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>

<!-- 2. date-fns v2 (adapter requires v2, NOT v4) -->
<script src="https://cdn.jsdelivr.net/npm/date-fns@2/index.min.js"></script>

<!-- 3. chartjs-adapter-date-fns BUNDLE (bundles its own adapter logic, but needs date-fns loaded) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

<!-- 4. chartjs-plugin-annotation (auto-registers with Chart.js when loaded after it) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js"></script>
```

**CRITICAL version note:** `chartjs-adapter-date-fns@3.0.0` requires `date-fns@2.x` (NOT date-fns v4 which is the npm latest). Use `date-fns@2` explicitly on CDN.

**Plugin auto-registration confirmed (HIGH confidence):** Inspection of the `chartjs-plugin-annotation@3.1.0` UMD bundle reveals it calls `afterRegister(){ t.Chart.register(zt) }` internally. When loaded after Chart.js via `<script>` tag, it self-registers. No manual `Chart.register(annotationPlugin)` call needed in CDN context.

**Rankings chart initialization:**

```javascript
// Rankings chart with inverted Y-axis (lower position = better rank = higher on chart)
const rankingChart = new Chart(ctx, {
  type: 'line',
  data: {
    datasets: keywords.map((kw, i) => ({
      label: kw.keyword,
      data: kw.data.map(d => ({ x: d.date, y: d.position })),
      borderColor: COLORS[i % COLORS.length],
      tension: 0.3,
      pointRadius: 3,
    }))
  },
  options: {
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day', displayFormats: { day: 'dd MMM' } },
        adapters: { date: { locale: fr } }  // optional date-fns locale
      },
      y: {
        reverse: true,   // INVERTED: position 1 at top, position 50 at bottom
        min: 1,
        title: { display: true, text: 'Position Google' }
      }
    },
    plugins: {
      annotation: {
        annotations: articlePublishAnnotations  // vertical dashed lines
      }
    }
  }
});

// Article publish date annotation (vertical line)
const articlePublishAnnotations = {
  publishLine1: {
    type: 'line',
    scaleID: 'x',
    value: '2026-03-15',  // ISO date string
    borderColor: 'rgba(59, 130, 246, 0.6)',
    borderWidth: 1,
    borderDash: [4, 4],
    label: {
      content: 'Article publié',
      display: true,
      position: 'start'
    }
  }
};
```

**Time selector (7d/30d/90d):** Re-fetch `/api/rankings?period=7d` and call `chart.data.datasets = newDatasets; chart.update()`.

**Confidence: HIGH** — CDN URLs verified, plugin inspection confirmed auto-registration.

---

### Q4: D3 d3-hierarchy tree layout

**CDN URL (verified — exposes global `d3` object):**
```html
<script src="https://cdn.jsdelivr.net/npm/d3-hierarchy@3.1.2/dist/d3-hierarchy.min.js"></script>
```

**Note:** d3-hierarchy CDN only includes hierarchy functions, NOT SVG/DOM utilities. For path drawing (links), use SVG path math manually or load `d3-shape` separately. The collapsible tree pattern uses SVG directly.

**Full D3 UMD alternative (simpler, includes everything):**
```html
<!-- Full D3 v7 — 70KB gzipped, includes d3-hierarchy + d3-selection + d3-shape -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
```

**Recommendation:** Load full `d3@7.9.0` via CDN — simpler than loading 5 separate sub-packages. 70KB gzipped is acceptable for a single-user internal tool. The full d3 bundle exposes `window.d3` with all required functions.

**Collapsible tree pattern (collapse via `_children`):**
```javascript
// Collapse: move children to _children (hidden), clear children
function collapse(node) {
  if (node.children) {
    node._children = node.children;
    node._children.forEach(collapse);
    node.children = null;
  }
}

// Toggle on click
function click(event, d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}
```

**Node color by type (from F2.3 spec):**
```javascript
const nodeColor = {
  pillar: '#f59e0b',   // gold
  service: '#3b82f6',  // blue
  blog: '#06b6d4',     // cyan
  root: '#6b7280',     // gray
};
// Orphan (0 inbound links): override to red '#ef4444'
```

**Detecting orphans:** The backend `buildLinkTree()` does not currently flag inbound link counts. Phase 7 must compute this client-side after receiving the tree from `/api/links`:

```javascript
// Count inbound links per slug
const inboundCount = {};
function countInbound(node) {
  (node.links_to || []).forEach(slug => {
    inboundCount[slug] = (inboundCount[slug] || 0) + 1;
  });
  (node.children || []).forEach(countInbound);
}
countInbound(tree);
// Orphan = type !== 'pillar' AND inboundCount[slug] === 0
```

**Link highlighting on click:** Change stroke color/opacity of SVG path elements whose `source.data.slug === clickedSlug` or `target.data.slug === clickedSlug`.

**Confidence: HIGH** for d3.tree() layout; MEDIUM for orphan detection (backend doesn't return inbound counts, computed client-side).

---

### Q5: SSE EventSource — reconnection and connection status

**Pattern (native browser EventSource):**

```javascript
let evtSource = null;

function connectSSE() {
  evtSource = new EventSource('/api/events', { withCredentials: false });
  // Same-origin: cookies are sent automatically (no withCredentials needed)

  evtSource.onopen = () => {
    Alpine.store('nav').sseStatus = 'connected';
  };

  evtSource.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'pipeline') {
      Alpine.store('pipeline').step = msg.payload.step;
      Alpine.store('pipeline').stepName = msg.payload.stepName;
    }
    if (msg.type === 'pending') {
      Alpine.store('nav').pendingCount = msg.payload.length;
    }
  };

  evtSource.onerror = () => {
    Alpine.store('nav').sseStatus = 'disconnected';
    evtSource.close();
    // Auto-reconnect after 5 seconds
    setTimeout(connectSSE, 5000);
  };
}
```

**Key facts (HIGH confidence):**
- `EventSource` automatically reconnects after network errors (browser-native behavior)
- For same-origin requests: session cookie is sent automatically — no `withCredentials: true` needed
- If server returns 401 on `/api/events` (session expired), `onerror` fires — handle by redirecting to `/login.html`
- The backend's `/api/events` sends `: keepalive` comments every 30s to prevent proxy timeouts — this does NOT trigger `onmessage` (comments are ignored by EventSource)
- The backend's `req.on('close')` cleanup is critical — already implemented in Phase 6

**Connection status indicator:** Alpine store tracks `sseStatus: 'connected' | 'disconnected'` — show a colored dot in header.

---

### Q6: Session cookie with fetch() API calls

**Answer (HIGH confidence):**

Since the dashboard and API are **same-origin** (both served from the same Express server on the same port), the session cookie is sent automatically with every `fetch()` call — no special configuration needed:

```javascript
// Correct — credentials: 'same-origin' is the DEFAULT for same-origin fetch
const res = await fetch('/api/articles');

// Explicit same-origin (same effect, slightly more readable):
const res = await fetch('/api/articles', { credentials: 'same-origin' });
```

**No CORS config needed** because there are no cross-origin requests. The session cookie has `sameSite: 'lax'` and `httpOnly: true` (set in Phase 6 auth.js) — both are compatible with same-origin fetch.

**For POST requests (approve):**
```javascript
const res = await fetch(`/api/articles/${slug}/approve`, {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' }
});
```

No CSRF token needed for this single-user internal tool on a private server.

---

### Q7: Login page → redirect to /dashboard flow

**Flow:**

1. User navigates to `/login.html` (served publicly)
2. User submits form → JS calls `POST /login` with `{ username, password }`
3. On `{ ok: true }` response: `window.location.href = '/dashboard/'`
4. Express serves `/dashboard/index.html` (via `express.static`)
5. On `401` error: show inline error message

**Server.js changes needed:**
```javascript
// Serve login.html publicly (before auth middleware)
app.get('/login.html', (req, res) =>
  res.sendFile(join(__dirname, 'dashboard', 'login.html'))
);

// Replace placeholder with actual static serving:
app.use('/dashboard', isAuthenticated, express.static(join(__dirname, 'dashboard')));
```

**Login form HTML pattern:**
```html
<form x-data="loginForm()" @submit.prevent="submit">
  <input x-model="username" type="text" />
  <input x-model="password" type="password" />
  <p x-show="error" x-text="error" class="text-red-500"></p>
  <button type="submit" :disabled="loading">Se connecter</button>
</form>

<script>
document.addEventListener('alpine:init', () => {
  Alpine.data('loginForm', () => ({
    username: '', password: '', error: '', loading: false,
    async submit() {
      this.loading = true; this.error = '';
      const r = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password })
      });
      if (r.ok) {
        window.location.href = '/dashboard/';
      } else {
        this.error = 'Identifiants incorrects';
        this.loading = false;
      }
    }
  }));
});
</script>
```

**Confidence: HIGH.**

---

### Q8: Tailwind CSS dark mode approach

**Use `class` strategy with `html` element:**

```html
<!-- Always in dark mode (no toggle needed — dashboard is always dark) -->
<html class="dark" lang="fr">
```

```javascript
// In tailwind.config block:
tailwind.config = {
  darkMode: 'class',
  // ...
}
```

All dark mode utility classes (`dark:bg-gray-900`, etc.) activate when `dark` is on the `html` element. Since the dashboard is always dark, no toggle logic is needed — just hardcode `class="dark"` on `<html>`.

**Mac-app design tokens (from spec):**
```css
/* Equivalent Tailwind classes: */
bg-[#0d1117]   /* main bg (navy-900) */
bg-[#161b22]   /* card bg (navy-800) */
bg-[#21262d]   /* hover/border */
text-[#c9d1d9] /* primary text */
text-[#8b949e] /* secondary text */
bg-[#3b82f6]   /* accent blue (maps to Tailwind blue-500) */
rounded-xl      /* border-radius: 12px */
```

**Confidence: HIGH** — Tailwind v3 Play CDN confirmed, class dark mode is standard v3 pattern.

---

### Q9: Alpine.js component pattern for tab switching

**Recommended pattern (Alpine.store for cross-component state):**

```html
<body x-data>
  <!-- Sidebar: changes global tab store -->
  <nav>
    <button @click="$store.nav.tab = 'queue'"
            :class="$store.nav.tab === 'queue' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'">
      Queue
      <!-- Pending badge -->
      <span x-show="$store.nav.pendingCount > 0"
            x-text="$store.nav.pendingCount"
            class="ml-2 bg-yellow-500 text-black rounded-full px-2 text-xs">
      </span>
    </button>
    <!-- ... other tabs ... -->
  </nav>

  <!-- Tab panels: each lazy-loads its data on first show -->
  <div x-show="$store.nav.tab === 'queue'"
       x-data="queuePanel()"
       x-init="$watch('$store.nav.tab', v => { if(v==='queue' && !loaded) init(); })">
    <!-- queue content -->
  </div>

  <div x-show="$store.nav.tab === 'rankings'"
       x-data="rankingsPanel()"
       x-init="$watch('$store.nav.tab', v => { if(v==='rankings' && !chartReady) init(); })">
    <!-- rankings chart canvas -->
  </div>
</body>
```

**`$watch` for lazy tab loading:** When a tab becomes active, initialize its data fetch. This avoids loading all tab data on page load.

**Chart.js with Alpine.js caveat:** Chart.js must initialize on a visible `<canvas>`. If the canvas is inside an `x-show="false"` element, its computed dimensions are 0x0. Use `x-show` with `display: none` (what Alpine.js uses) — Chart.js can still initialize but gets 0 dimensions. Fix: call `chart.resize()` after the tab becomes visible, or use `x-if` and re-create the chart on tab switch.

**Recommendation:** Use `x-if` instead of `x-show` for the rankings tab panel so the canvas element is removed/re-created on tab switch, ensuring correct Chart.js initialization:

```html
<template x-if="$store.nav.tab === 'rankings'">
  <div x-data="rankingsPanel()" x-init="init()">
    <canvas id="rankingsChart"></canvas>
  </div>
</template>
```

**Confidence: HIGH** for Alpine patterns; MEDIUM for the Chart.js/x-show dimension issue (verified from community reports).

---

### Q10: POST /api/articles/:slug/approve — fetch + optimistic UI

**Pattern:**

```javascript
Alpine.data('queuePanel', () => ({
  articles: [],
  approving: new Set(),

  async approve(slug) {
    if (this.approving.has(slug)) return; // debounce
    this.approving.add(slug);

    // Optimistic update: change status immediately
    const article = this.articles.find(a => a.slug === slug);
    const prevStatus = article.status;
    if (article) article.status = 'publishing...';

    try {
      const r = await fetch(`/api/articles/${slug}/approve`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (r.ok) {
        if (article) article.status = 'published';
        // Update pending badge
        Alpine.store('nav').pendingCount = Math.max(0,
          Alpine.store('nav').pendingCount - 1);
      } else {
        // Rollback on error
        if (article) article.status = prevStatus;
        const err = await r.json();
        alert(`Erreur : ${err.error}`);
      }
    } catch {
      if (article) article.status = prevStatus;
    } finally {
      this.approving.delete(slug);
    }
  }
}));
```

**Alpine.js reactivity note:** Mutating a property of an object inside an array (`article.status = 'published'`) is reactive in Alpine.js 3 because it uses JavaScript Proxies. No `$nextTick` or explicit re-render needed.

**Confidence: HIGH.**

---

## Decisions (Locked Choices)

| Decision | Rationale |
|----------|-----------|
| CDN-only (no build step) | Single-user tool, no CI needed, Phase 6 backend is already Node.js — dashboard is static files only |
| `https://cdn.tailwindcss.com` (v3 Play CDN) | Stack locked to v3; `@tailwindcss/browser@4` is a different breaking API |
| Alpine.js `defer` attribute required | Official Alpine docs specify `defer` in `<head>` |
| Alpine.store for tab state | Enables nav badge updates from SSE events without prop drilling |
| `x-if` for rankings tab (not `x-show`) | Chart.js needs a visible canvas with non-zero dimensions for initialization |
| Full `d3@7.9.0` CDN (not d3-hierarchy only) | d3-hierarchy alone lacks `d3.select`, `d3.linkHorizontal`, `d3.zoom` — needed for SVG rendering and interaction |
| chartjs-plugin-annotation auto-registers from CDN | Confirmed via UMD source inspection — no `Chart.register()` call needed |
| `date-fns@2` (not `@4`) for chartjs-adapter-date-fns@3 | Adapter requires v2 API; date-fns v4 has breaking changes |
| No CSRF token | Single-user, private network, session cookie with sameSite lax is sufficient |
| `credentials: 'same-origin'` (default) for fetch | Dashboard and API on same origin — no special credentials config needed |
| Login page redirect in JS (401 → window.location.href) | Simpler than adding server-side redirect variant; auth.js unchanged |
| Always-dark class on `<html>` | Dashboard is permanently dark-themed — no theme toggle needed |
| Single `index.html` multi-tab SPA | Fewer files, simpler routing, no client-side router needed |

---

## Pitfalls

### Pitfall 1: Chart.js canvas in hidden `x-show` element has zero dimensions
**What goes wrong:** Initializing a `new Chart(canvas, ...)` while the canvas's parent has `display: none` (which is how Alpine.js implements `x-show`) results in a 0×0 chart. Chart renders but is invisible or incorrectly sized when tab becomes visible.
**Why it happens:** Chart.js reads `canvas.clientWidth` at initialization time. Hidden element = 0.
**How to avoid:** Use `x-if` instead of `x-show` for the rankings tab. `x-if` removes the element from DOM entirely and re-creates it when condition becomes true — Chart.js initializes with correct dimensions.
**Warning signs:** Chart appears as empty canvas or has overlapping text on first view.

### Pitfall 2: Alpine.js `defer` omitted
**What goes wrong:** Without `defer`, Alpine.js executes during HTML parsing. `x-data` on elements not yet parsed are silently ignored — partially broken UI.
**How to avoid:** Always: `<script defer src="alpinejs cdn">` in `<head>`.

### Pitfall 3: Wrong date-fns version with chartjs-adapter
**What goes wrong:** Loading `date-fns@4` (latest npm as of 2026) with `chartjs-adapter-date-fns@3` causes "TypeError: parse is not a function" because date-fns v4 changed its module structure.
**How to avoid:** Pin CDN URL to `date-fns@2`: `https://cdn.jsdelivr.net/npm/date-fns@2/index.min.js`

### Pitfall 4: EventSource 401 after session expiry causes silent reconnect loop
**What goes wrong:** When session expires, the server returns 401 on `/api/events`. `EventSource.onerror` fires, the auto-reconnect fires 5s later, gets 401 again — infinite loop.
**How to avoid:** In `onerror`, check if the original HTTP response was 401 (EventSource doesn't expose HTTP status directly). Use a periodic `/api/stats` health check to detect session expiry, then redirect:
```javascript
evtSource.onerror = () => {
  evtSource.close();
  // Test if session is still valid
  fetch('/api/stats').then(r => {
    if (r.status === 401) window.location.href = '/login.html';
    else setTimeout(connectSSE, 5000);
  });
};
```

### Pitfall 5: D3 tree node text overlap at deep hierarchy
**What goes wrong:** The arbre généalogique structure can have many blog posts at the same depth. Default `d3.tree().size([height, width])` may overlap labels.
**How to avoid:** Use `d3.tree().nodeSize([nodeHeight, nodeWidth])` instead of `.size()` — ensures fixed spacing between nodes. Add horizontal scroll on the SVG container if tree exceeds viewport.

### Pitfall 6: ESM import of Alpine.js plugins fails (CDN `defer` conflict)
**What goes wrong:** If you try to mix ESM `import AlpineCollapse from '...'` with the CDN `defer` script, the plugin import resolves before Alpine is initialized.
**How to avoid:** In CDN context, only use plugins that are loaded as separate `<script>` tags before Alpine's `defer` script — or use the `alpine:init` event for all registrations. No ESM imports in CDN context.

### Pitfall 7: `express.static` serves `index.html` for all unmatched paths (SPA mode)
**What goes wrong:** By default `express.static` does NOT serve `index.html` for unmatched subpaths (that's `serve-static`'s `fallthrough` behavior). Navigating directly to `/dashboard/rankings` (if you add routes later) would 404.
**How to avoid:** For this phase, there are no subpath routes — everything is on `/dashboard/`. Not a problem now, but document for Phase 8.

---

## Validation Architecture

**nyquist_validation: true** — validation section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | None — uses `tests/*.test.js` glob pattern |
| Quick run command | `cd autopilot && node --test tests/dashboard.test.js` |
| Full suite command | `cd autopilot && node --test tests/*.test.js` |

### What Can Be Tested vs Manual-Only

**Automated (unit/integration):**

| Req ID | Behavior | Test Type | Command | Notes |
|--------|----------|-----------|---------|-------|
| F2.7 | Login page served publicly at `/login.html` | Integration | `node --test tests/dashboard.test.js` | Use `supertest` or test that `sendFile` is registered |
| F2.7 | POST /login sets session, GET /dashboard/index.html returns 200 | Integration | `node --test tests/dashboard.test.js` | HTTP round-trip test |
| F2.7 | GET /dashboard returns 401 without session | Integration | `node --test tests/dashboard.test.js` | isAuthenticated already tested in auth.test.js |
| F2.4 | SSE `/api/events` sends `connected` event | Unit | Already in `tests/api-sse.test.js` (Phase 6) | Pass |
| F2.1 | Article approval optimistic update logic | Unit | Test `mapStatus` logic (already in api-articles.test.js) | Pass |
| server.js | `/dashboard` route now serves static + auth | Integration | `node --test tests/dashboard.test.js` | Wave 0 file |

**Manual-only (visual/browser):**

| Req ID | Behavior | Justification |
|--------|----------|---------------|
| F2.2 | Rankings chart renders correctly with inverted Y | Requires live GSC data + browser canvas rendering |
| F2.3 | D3 link tree renders, nodes are clickable, collapsible | Requires browser + SVG interaction |
| F2.4 | Pipeline stepper animates on SSE update | Requires live pipeline run + browser |
| F2.5 | Stats row numbers are correct | Visual check against known data |
| F2.6 | Activity feed color coding | Visual check |
| F2.8 | Pending badge updates on SSE push | Requires pending article in state |
| Design | Mac-app dark theme matches spec | Visual review |

### Phase 7 Wave 0 Test Gaps

The following test file must be created in Wave 0 (Task 1) before HTML work begins:

- [ ] `autopilot/tests/dashboard.test.js` — covers:
  - `GET /login.html` returns 200 (publicly accessible)
  - `GET /dashboard/` without session returns 401
  - `GET /dashboard/` with valid session returns 200
  - `server.js` correctly chains `isAuthenticated` + `express.static`

**Test infrastructure:** No new packages needed — `node:http` built-in is sufficient for HTTP integration tests, following the established pattern in `tests/auth.test.js`.

### Sampling Rate

- **Per task commit:** `node --test tests/dashboard.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green (currently 40/40 tests pass from Phase 6)

---

## File Structure

```
autopilot/
├── dashboard/                         # NEW — all static files served at /dashboard/
│   ├── index.html                     # Main SPA: queue/rankings/links/pipeline tabs
│   ├── login.html                     # Login page (served publicly at /login.html)
│   └── js/
│       ├── app.js                     # Alpine.js component definitions, store setup
│       ├── charts.js                  # Chart.js rankings chart init and update
│       └── tree.js                    # D3 link tree init, render, collapse, highlight
├── routes/
│   └── auth.js                        # NO CHANGE — isAuthenticated remains JSON 401
├── server.js                          # MODIFY: replace placeholder with static serve
└── tests/
    └── dashboard.test.js              # NEW Wave 0 — auth gate + static serving tests
```

**server.js change (minimal — 3 lines):**
- Add `import { join, dirname } from 'node:path'` and `import { fileURLToPath } from 'node:url'` (already imported in `routes/api.js` — may need to add to `server.js` if not already there)
- Replace line 37: `app.use('/dashboard', isAuthenticated)` with:
  ```javascript
  app.use('/dashboard', isAuthenticated, express.static(join(__dirname, 'dashboard')));
  ```
- Add before auth routes: `app.get('/login.html', (req, res) => res.sendFile(join(__dirname, 'dashboard', 'login.html')))`

**`__dirname` in ESM modules:** server.js uses ESM (`"type": "module"` in package.json). Must derive `__dirname`:
```javascript
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

---

## Implementation Order

Dependencies between tasks — must execute in this order:

### Wave 0 (foundation — no HTML yet)
**Task 1:** Create `dashboard.test.js` (Wave 0 gap) + modify `server.js` to serve static files
- Tests: Write failing tests first (TDD)
- Create `autopilot/dashboard/` directory with placeholder `index.html` and `login.html`
- Modify `server.js`: add `__dirname`, replace placeholder, add `/login.html` route
- Run `node --test tests/dashboard.test.js` → GREEN

### Wave 1 (login page)
**Task 2:** Create `autopilot/dashboard/login.html`
- Full login form with Alpine.js x-data
- Tailwind dark theme, Mac-app card design
- POST /login → redirect to /dashboard/ on success
- Error display on 401
- Manual test: open browser, verify form works

### Wave 2 (dashboard skeleton + queue)
**Task 3:** Create `autopilot/dashboard/index.html` + `autopilot/dashboard/js/app.js`
- HTML skeleton: sidebar nav, tab panels, stats row
- Alpine.store setup for global nav state
- queuePanel component: fetch /api/articles, render table, approve button
- pendingBadge: fetch /api/articles?status=pending count
- activityFeed: fetch /api/activity
- statsRow: fetch /api/stats
- SSE connection in app.js: connect to /api/events, update Alpine stores
- Manual test: open dashboard, verify queue loads

### Wave 3 (charts and advanced panels)
**Task 4:** Create `autopilot/dashboard/js/charts.js`
- rankingsPanel component with Chart.js time-series chart
- Time selector (7d/30d/90d) triggering re-fetch
- Article publish date annotation lines
- Manual test: verify chart renders with mock data

**Task 5:** Create `autopilot/dashboard/js/tree.js`
- D3 link tree SVG rendering
- Node colors by type
- Collapsible branches
- Click highlight for inbound/outbound links
- Orphan detection (0 inbound = red)
- Manual test: verify tree renders with real content-map data

### Wave 4 (pipeline stepper)
**Task 6:** Pipeline stepper HTML panel
- 6-step visual layout
- SSE update handler: update step state in Alpine store
- Animated current step (CSS animation on active step indicator)
- Manual test: verify stepper shows correct step from /api/pipeline-status

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | server.js runtime | Yes | v22.17.1 | — |
| Express (npm) | Static file serving | Yes | 5.2.1 (in node_modules) | — |
| Browser (Chrome/Edge) | Manual dashboard testing | Yes (assumed) | — | — |
| CDN (jsDelivr) | Alpine.js, Chart.js, D3 | Yes (internet access) | — | Self-host from node_modules if offline |
| GSC credentials | Rankings data | Unknown (env var) | — | Dashboard shows "No GSC data" gracefully (Phase 6 fallback) |
| `autopilot/state/pipeline-status.json` | Pipeline stepper | May not exist | — | Phase 6 returns idle state `{ step: 0, stepName: 'Idle' }` |
| `autopilot/state/pending.json` | Approve action | May not exist | — | Phase 6 returns `[]` gracefully |

**CDN offline fallback:** All four CDN libraries are already in `autopilot/node_modules` (Chart.js and D3 as transitive deps of other packages, or installable). If offline deployment needed, copy dist files to `dashboard/vendor/`. Not required for Phase 7.

---

## Sources

### Primary (HIGH confidence)
- Alpine.js official docs (alpinejs.dev) — CDN script tag, defer requirement, Alpine.store, x-data component pattern
- Tailwind CSS v3 official docs (v3.tailwindcss.com) — Play CDN script tag
- chartjs-adapter-date-fns GitHub README — bundle vs non-bundle CDN URLs, date-fns version requirement
- CDN live inspection: `chart.js@4.5.1/dist/chart.umd.min.js` — confirmed valid UMD
- CDN live inspection: `chartjs-plugin-annotation@3.1.0` UMD source — confirmed auto-registration via `afterRegister()`
- CDN live inspection: `d3-hierarchy@3.1.2` UMD source — confirmed `d3` global variable
- Phase 6 source code (`autopilot/server.js`, `autopilot/routes/api.js`, `autopilot/routes/auth.js`) — exact current state of backend
- Phase 6 SUMMARY files (06-01-SUMMARY.md, 06-02-SUMMARY.md) — confirmed all 7 API routes live and tested

### Secondary (MEDIUM confidence)
- d3js.org/d3-hierarchy/tree — d3.tree() API and basic usage pattern
- MDN EventSource/withCredentials — same-origin cookie behavior
- Chart.js docs — time axis configuration, `reverse: true` for Y axis

### Tertiary (LOW confidence — needs browser verification)
- Alpine.js `x-if` vs `x-show` for Chart.js canvas sizing (community reports, not official docs)
- Orphan detection via client-side inbound link counting (derived from API response shape, not a documented pattern)

---

## Metadata

**Confidence breakdown:**
- CDN URLs: HIGH — verified against live CDN
- Alpine.js patterns: HIGH — official docs
- Chart.js initialization: HIGH — official docs + CDN inspection
- D3 tree layout: HIGH — official docs
- SSE pattern: HIGH — MDN + Phase 6 backend code
- Express static serving: HIGH — Express docs + Phase 6 code inspection
- Orphan detection: MEDIUM — client-side derivation, not backend-supported

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable libraries; Tailwind v3 Play CDN is maintained; Chart.js v4 LTS)
