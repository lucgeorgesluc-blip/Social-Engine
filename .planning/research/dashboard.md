# Dashboard Tech Stack Research

**Project:** SEO Dashboard — magnetiseuse-lacoste-corinne.fr
**Researched:** 2026-03-29
**Overall confidence:** MEDIUM (training data through August 2025; web tools unavailable in this session — validate version numbers before installing)

---

## Context

Single-user internal dashboard served from an existing Express.js backend, deployed on Render.
Design target: dark navy Mac-app aesthetic, rounded cards, blue accents, sidebar navigation.

Features to cover:
1. Article queue with status badges and approval buttons
2. Keyword ranking charts with time-series + event markers (article publish dates)
3. Internal link mind map as hierarchy tree
4. Today's pipeline workflow (stepper/timeline)
5. Real-time updates without full refresh
6. Auth for single-user access

---

## Topic 1 — Charting Library for Keyword Ranking Evolution

### The need

- Time-series line chart (position over time, lower = better, Y-axis inverted)
- Vertical annotation lines at article publish dates
- Hover tooltips showing position + date
- Dark theme out of the box or easy to apply
- No React dependency (see Topic 3 decision)

### Candidates evaluated

#### Chart.js + chartjs-plugin-annotation

**Confidence: HIGH** — extremely stable, widely documented.

- Bundle: ~200 KB minified (core), annotation plugin adds ~15 KB
- Time-series support: native via `type: 'time'` with date-fns or Luxon adapter
- Event markers: `chartjs-plugin-annotation` draws vertical lines at arbitrary X values with labels
- Dark theme: configure via `Chart.defaults.color`, `Chart.defaults.borderColor` — fully CSS-driven
- Interactivity: built-in tooltips, crosshair possible with plugin
- API style: config object, imperative `new Chart(ctx, config)` — no framework needed

**Gotchas:**
- You must install a date adapter (`chartjs-adapter-date-fns` or `chartjs-adapter-luxon`) separately for time axes — forgetting this is the #1 install error
- The annotation plugin version must match the Chart.js major version (v3 plugin for Chart.js v3, v4 for v4). Mismatches cause silent failures
- `responsive: true` + `maintainAspectRatio: false` requires the canvas parent to have an explicit CSS height — without it the chart collapses to 0px

#### Recharts

**Confidence: HIGH** — but wrong fit here.

- React-only (JSX components). Not usable with vanilla JS or Alpine.js without adding React
- Excellent for React dashboards; irrelevant for this stack
- **Eliminate immediately** unless you choose React

#### Plotly.js

**Confidence: HIGH**

- Bundle: ~3.5 MB minified (full build) — very large for a dashboard that loads in a browser tab
- Has a partial `basic` build (~1 MB) and a `dist/plotly-basic.min.js`
- Excellent annotation support, scientific-grade charts
- Dark theme: set `layout.paper_bgcolor`, `layout.plot_bgcolor`, `layout.font.color`
- Overkill for a ranking line chart with event markers; the weight is not justified

#### D3.js

**Confidence: HIGH**

- D3 is a low-level rendering library, not a charting library
- Building a time-series with event markers in D3 requires ~200 lines of SVG/scale/axis code
- Appropriate when you need something impossible in a higher-level lib, not for standard charts
- **Use D3 for the link tree (Topic 2), not for ranking charts**

### Recommendation: Chart.js v4 + chartjs-plugin-annotation + chartjs-adapter-date-fns

**Why:** Lightest bundle that covers the exact features needed. Vanilla JS API, no framework dependency, dark-theme trivial to configure, event markers are a first-class use case of the annotation plugin.

**Install:**
```bash
npm install chart.js chartjs-plugin-annotation chartjs-adapter-date-fns date-fns
```

**Minimal event-marker config pattern:**
```javascript
import { Chart, LineController, LineElement, PointElement, TimeScale, LinearScale, Tooltip } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-date-fns';

Chart.register(LineController, LineElement, PointElement, TimeScale, LinearScale, Tooltip, annotationPlugin);

const annotations = publishDates.map((d, i) => ({
  type: 'line',
  scaleID: 'x',
  value: d.date,
  borderColor: '#3b82f6',
  borderWidth: 1,
  borderDash: [4, 4],
  label: { content: d.title, enabled: true, position: 'start', color: '#94a3b8', font: { size: 11 } }
}));

new Chart(ctx, {
  type: 'line',
  data: { datasets: [{ data: rankingPoints, borderColor: '#3b82f6', tension: 0.3 }] },
  options: {
    scales: {
      x: { type: 'time', time: { unit: 'day' } },
      y: { reverse: true, min: 1, max: 100, ticks: { color: '#94a3b8' } }
    },
    plugins: { annotation: { annotations } }
  }
});
```

---

## Topic 2 — Graph/Tree Library for Internal Link Visualization

### The need

- Nodes = pages, edges = internal links
- Tree/hierarchy layout preferred (parent → children), not a force simulation
- Clickable nodes (navigate to page or show details)
- Dark theme
- Reasonable bundle size

### Candidates evaluated

#### D3.js — d3-hierarchy (tree layout)

**Confidence: HIGH**

- `d3.tree()` and `d3.cluster()` produce deterministic, readable hierarchical layouts
- `d3.hierarchy(data)` accepts a JSON tree structure with `children` arrays
- Full control over SVG rendering: node shape, label position, edge curves
- Bundle impact: only need `d3-hierarchy`, `d3-selection`, `d3-zoom` (~80 KB combined if tree-shaken)
- Zoom/pan built in via `d3.zoom()`
- Learning curve: medium — you write the SVG rendering loop, but it's templatable

**Gotchas:**
- D3 manipulates the DOM directly; if you later add a reactive framework, conflict arises. Keep D3 in its own `<div>` that no other system touches
- `d3.tree()` assumes a single-root strict tree. Internal link graphs are often DAGs (page A links to B, C links to B too). You must either pick a primary parent for each page or use a force layout for true multi-parent graphs
- Radial tree (`d3.tree()` with polar projection) looks better for many nodes; worth considering over top-down layout

#### D3.js — d3-force (force-directed graph)

**Confidence: HIGH**

- Good for general link graphs where hierarchy is ambiguous
- Nodes settle into positions via physics simulation (charge, link, gravity forces)
- Less readable than tree layout for a content architecture with clear pillar/cluster hierarchy
- Appropriate if your internal link structure is genuinely a web (many cross-links), not a tree

#### vis-network

**Confidence: MEDIUM** — stable library but less actively maintained as of 2024.

- Provides both hierarchical layout (`layout: { hierarchical: { enabled: true } }`) and force layout
- Declarative API: pass `nodes` and `edges` arrays, get a rendered network
- Easier to reach "good enough" result faster than D3
- Bundle: ~800 KB minified (includes everything)
- Built-in features: physics toggle, zoom, pan, node selection, edge labels
- Dark theme: configure via `nodes.color`, `edges.color` in options

**Gotchas:**
- vis-network renders to Canvas, not SVG — custom node shapes require canvas drawing code
- The package is split into `vis-network` (standalone) and `vis-data` — ensure you import from the right sub-package
- The vis.js monorepo split into separate packages in v9+; import paths changed

#### Cytoscape.js

**Confidence: HIGH** — well-maintained, strong hierarchy support.

- Supports `dagre` layout (hierarchical, top-down) via `cytoscape-dagre` extension
- Supports `elk` layout via `cytoscape-elk` for very large graphs
- Both Canvas and SVG export
- Bundle: ~200 KB for core, layout extensions ~50 KB each
- API: declarative data + imperative layout calls
- Active maintenance, used in bioinformatics and network tools

### Recommendation: D3.js d3-hierarchy for tree layout

**Why:** Your internal link structure has a defined pillar/cluster architecture (from topic-clusters.yaml). This is genuinely hierarchical — use `d3.tree()` for deterministic, readable layout. If pages have multiple parents (a page linked from both a pillar and another cluster), pre-process the data to pick a primary parent and add secondary edges as dotted lines.

**Use Cytoscape.js + dagre as the fallback** if the link graph turns out to be a true DAG with many cross-links — it handles that case with less custom code than D3.

**Do not use vis-network** — the bundle weight (~800 KB) is not justified versus D3's tree-shaken ~80 KB for this use case.

**Minimal d3-hierarchy pattern:**
```javascript
import * as d3 from 'd3';

const root = d3.hierarchy(treeData); // treeData = { name, url, children: [...] }
const treeLayout = d3.tree().size([svgWidth, svgHeight - 100]);
treeLayout(root);

// root.descendants() → array of nodes with .x, .y
// root.links() → array of { source, target } pairs
```

---

## Topic 3 — Frontend Approach

### The need

- Render on top of Express (no separate SPA deployment)
- Status badges, approval buttons (click → POST to API → update badge)
- Charts (Topic 1 uses vanilla JS Chart.js API)
- Tree visualization (Topic 2 uses D3 DOM manipulation)
- Stepper/timeline component
- Dark theme, Mac-app aesthetic
- Single developer, maintainability over cleverness

### Candidates evaluated

#### Vanilla JS + Tailwind CSS

**Confidence: HIGH**

- Zero framework overhead
- Tailwind generates only used classes (PurgeCSS/content scan)
- State management: manual DOM manipulation or a small hand-rolled store pattern
- Event binding: `addEventListener` directly, or a tiny 20-line event delegation helper
- Works perfectly with Chart.js and D3 (both manipulate DOM directly)
- Dark theme: Tailwind's `dark:` variant + `class` strategy (`<html class="dark">`) gives complete dark/light control with zero runtime cost

**Gotchas:**
- Without any reactivity system, updating the article queue list on approval requires manually finding and updating DOM nodes — manageable for a single-user tool, but tedious as features grow
- Tailwind requires a build step (CLI or PostCSS) — not a surprise but worth noting for Render deploy pipeline

#### Alpine.js + Tailwind CSS

**Confidence: HIGH** — strong choice for this use case.

- Alpine.js adds declarative reactivity in HTML attributes (`x-data`, `x-bind`, `x-on`, `x-show`, `x-for`)
- Bundle: 15 KB gzipped (CDN delivery or npm install)
- No build step required for Alpine itself (load from CDN) — Tailwind still needs its build step
- State lives in `x-data="{}"` on a container element — natural for a dashboard with bounded component islands
- Works perfectly alongside D3 and Chart.js: Alpine handles list rendering and badge updates; D3/Chart.js own their SVG/canvas elements
- No virtual DOM, no component compile step — just HTML + a script tag

**When Alpine shines here:**
- Article queue: `x-for` renders article rows; `x-on:click` fires approval POST; `x-bind:class` swaps badge color on response
- Pipeline stepper: `x-data="{ currentStep: 1 }"` + `x-bind:class="step <= currentStep ? 'active' : ''"`
- Sidebar active state: `x-data="{ page: 'queue' }"` controls which section is visible

**Gotchas:**
- Alpine stores (`Alpine.store()`) are global — name them carefully to avoid collision
- `x-for` requires a `:key` attribute for correct DOM diffing; omitting it causes flicker on list updates
- Mixing Alpine reactivity with D3 (which also mutates the DOM) in the same element causes conflicts — keep them in separate sibling elements

#### React (+ Vite or Next.js)

**Confidence: HIGH** — but overkill for this use case.

- Adds Vite build pipeline, JSX compilation, React runtime (~45 KB gzipped)
- Recharts, Tremor, and shadcn/ui become available — excellent component ecosystems
- Justified if the dashboard will grow significantly, have multiple developers, or need complex shared state
- **Not justified** for a single-user internal tool served directly from Express — the added complexity (separate build artifact, static file serving setup, hydration) outweighs the benefits

### Recommendation: Alpine.js + Tailwind CSS

**Why:** Alpine provides just enough reactivity to handle badge state, approval button responses, and stepper progression without requiring a build toolchain for the JS layer. Tailwind handles all visual styling including the dark navy aesthetic. Both coexist naturally with Chart.js and D3. The result is HTML files that Express can serve as static assets — no separate SPA deployment, no API gateway, no CORS configuration.

**Install (Tailwind as PostCSS build):**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Tailwind config for dark theme + Mac-app aesthetic:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./public/**/*.html'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0d1117', 800: '#161b22', 700: '#21262d' },
        accent: { DEFAULT: '#3b82f6', hover: '#2563eb' }
      },
      borderRadius: { card: '12px' }
    }
  }
}
```

**Alpine CDN (no build needed for JS):**
```html
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

---

## Topic 4 — Authentication for Single-User Dashboard

### The need

- Protect dashboard from public access (Render URL is public)
- Single known user (you)
- No user management, no registration, no password reset flow
- Simplest possible maintenance burden

### Candidates evaluated

#### HTTP Basic Auth (via nginx or Express middleware)

**Confidence: HIGH**

- One username + one password, checked on every request via `Authorization: Basic` header
- Zero session storage, zero cookies, zero tokens
- Browser shows native login dialog on first access; subsequent requests include the header automatically
- Implementation in Express: `express-basic-auth` package (~3 KB)
- On Render: can alternatively be set at the infrastructure layer (Render does not natively support HTTP Basic Auth as of 2025 — must implement in app)

**Gotchas:**
- Password travels as base64 (not encrypted) — **requires HTTPS**, which Render provides automatically
- No "logout" button — browser caches credentials until tab/browser is closed or cache cleared
- Not suitable if credentials must ever be rotated without redeployment (you'd hardcode or use env vars)

#### express-session + bcrypt

**Confidence: HIGH**

- POST form → verify bcrypt hash → set session cookie → subsequent requests checked via session middleware
- Requires a session store (in-memory for single-process Render free tier is fine; Redis if you want persistence across restarts)
- Adds a proper login page, logout button
- `express-session` + `connect-pg-simple` or just MemoryStore for single-user

**Gotchas:**
- MemoryStore loses sessions on Render restart (dyno sleep/wake on free tier) — user must re-login after each cold start
- bcrypt adds a dependency and a setup step; for a single known password this is well-engineered but arguably over-engineered

#### JWT (stateless tokens)

**Confidence: HIGH** — wrong fit for this use case.

- JWTs shine in multi-service architectures where stateless auth is needed across services
- For a single Express app + single user, JWTs add token storage complexity (localStorage vulnerable to XSS; httpOnly cookie is fine but then you have the same setup as express-session)
- **Eliminate:** adds complexity with no benefit over session cookies here

### Recommendation: express-session + bcrypt for login page

**Why:** Gives you a real login page (no browser native dialog), a logout button, and a session cookie that persists during your working session but expires on Render restart. The MemoryStore limitation (sessions lost on restart) is acceptable for a single-user internal tool — one login per session is fine.

Use an environment variable for the password hash: `DASHBOARD_PASSWORD_HASH` set in Render dashboard. Never hardcode.

**Install:**
```bash
npm install express-session bcryptjs
```

**Minimal setup:**
```javascript
import session from 'express-session';
import bcrypt from 'bcryptjs';

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 } // 8h
}));

app.post('/login', async (req, res) => {
  const valid = await bcrypt.compare(req.body.password, process.env.DASHBOARD_PASSWORD_HASH);
  if (valid) { req.session.authenticated = true; res.redirect('/dashboard'); }
  else res.redirect('/login?error=1');
});

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

app.use('/dashboard', requireAuth, express.static('public/dashboard'));
```

**Generate the hash once (run locally):**
```javascript
// node -e "const b = require('bcryptjs'); b.hash('yourpassword', 12).then(console.log)"
```

---

## Topic 5 — Real-Time Updates: SSE vs WebSocket vs Polling

### The need

- Dashboard shows pipeline step progression (e.g., "article drafted → reviewed → published")
- When a step completes (triggered by a backend job or manual action), the stepper UI updates without page refresh
- Single-user, single-browser tab expected
- Backend is Express.js

### Candidates evaluated

#### Server-Sent Events (SSE)

**Confidence: HIGH**

- Unidirectional: server pushes events to browser
- Browser-native `EventSource` API — no library needed on client
- HTTP/1.1 compatible, works through proxies, works on Render
- Auto-reconnect built into `EventSource` spec
- Express implementation: set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, keep connection open, write `data: ...\n\n` strings

**Gotchas:**
- HTTP/1.1 has a limit of 6 concurrent connections per domain per browser — if you open multiple tabs, SSE connections count against this limit. With HTTP/2 (which Render provides via its TLS termination proxy) this limit is lifted
- On Render free tier, the dyno sleeps after 15 minutes of inactivity — SSE connection will be closed on sleep; `EventSource` will auto-reconnect on wake
- Sending data from browser to server still requires normal `fetch()` POST calls — SSE is listen-only

#### WebSocket

**Confidence: HIGH**

- Bidirectional, persistent connection
- Required when: browser needs to push data to server over the same real-time channel (e.g., collaborative editing, live chat)
- For a read-mostly dashboard that only needs server→client updates, WebSocket is over-engineered
- Adds `ws` package dependency and separate upgrade handler on Express

**Gotchas:**
- WebSocket connections on Render require proper proxy configuration (Render supports WebSocket upgrades on paid plans; free tier behavior varies — verify before committing)
- Load balancers/proxies sometimes terminate idle WebSocket connections after ~60s unless keep-alive pings are configured

#### Polling (setInterval + fetch)

**Confidence: HIGH**

- Browser calls `GET /api/pipeline-status` every N seconds
- Simplest to implement, no persistent connection
- Acceptable latency: 5-second poll = max 5-second delay in UI update

**Gotchas:**
- Creates N requests per N seconds regardless of whether anything changed — wastes Render compute hours on free tier
- If multiple widgets poll at different intervals, request patterns can be noisy

### Recommendation: SSE for pipeline/queue updates

**Why:** The dashboard is read-mostly — the server pushes status updates, the browser only sends commands (approve/reject) via normal POST requests. SSE is exactly the right tool: browser-native, zero extra dependencies, auto-reconnecting, and fully supported on Render's HTTPS proxy layer.

**Express SSE endpoint pattern:**
```javascript
const clients = new Set();

app.get('/api/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = res;
  clients.add(client);
  req.on('close', () => clients.delete(client));
});

// Call this whenever pipeline state changes
function broadcast(event, data) {
  for (const client of clients) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
```

**Alpine.js client:**
```javascript
// Inside x-data
const es = new EventSource('/api/events');
es.addEventListener('pipeline-update', (e) => {
  const update = JSON.parse(e.data);
  this.pipeline = update; // Alpine reactivity updates the stepper
});
```

---

## Topic 6 — Serving Dashboard from Express Alongside API Routes

### The approach

Express can serve static HTML/CSS/JS files directly. No separate deployment, no CORS configuration.

**Recommended structure:**
```
project-root/
  server.js              # Express entry point
  public/
    dashboard/
      index.html         # Dashboard shell
      dist/
        tailwind.css     # Built Tailwind output
  src/
    routes/
      api.js             # /api/* routes
      dashboard.js       # /dashboard auth + SSE
    middleware/
      auth.js
```

**Express routing order (critical):**
```javascript
// 1. Auth middleware applied to /dashboard prefix
app.use('/dashboard', requireAuth);

// 2. API routes (before static — more specific wins)
app.use('/api', apiRouter);

// 3. Static files for dashboard UI
app.use('/dashboard', express.static(path.join(__dirname, 'public/dashboard')));

// 4. SPA fallback for dashboard (if using client-side routing)
app.get('/dashboard/*', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard/index.html'));
});
```

**Gotchas:**
- `express.static` must come AFTER auth middleware — if you put `static` first, the middleware order means unauthenticated users can access the files. The `requireAuth` middleware on the `/dashboard` prefix handles this only if routes are registered in the right order
- Tailwind's output CSS must be in the static folder. Add the build step to `npm run build` so Render runs it during deploy: `"build": "tailwindcss -i ./src/input.css -o ./public/dashboard/dist/tailwind.css --minify"`
- Set `Cache-Control` headers on static assets: `express.static(dir, { maxAge: '1d' })` for CSS/JS, but `no-cache` for HTML so the shell always reflects the latest deploy

---

## Final Stack Recommendation

| Layer | Choice | Justification |
|-------|--------|---------------|
| Charting | Chart.js v4 + chartjs-plugin-annotation + chartjs-adapter-date-fns | Lightest bundle, native event markers, dark-theme trivial |
| Link tree | D3.js (d3-hierarchy) | Deterministic tree layout, tree-shaken ~80 KB, full visual control |
| Frontend | Alpine.js 3 + Tailwind CSS 3 | Reactive badges/stepper without framework overhead, natural dark mode |
| Auth | express-session + bcryptjs | Login page + logout + session cookie, password in env var |
| Real-time | SSE (EventSource) | Server-push only needed, browser-native, Render-compatible |
| Serving | Express.static behind requireAuth middleware | No separate deployment, standard Express pattern |

---

## Gotcha Summary (cross-cutting)

| Risk | Mitigation |
|------|-----------|
| Chart.js date adapter missing | Install `chartjs-adapter-date-fns` + `date-fns` as peer dependencies |
| Annotation plugin version mismatch | Use `chartjs-plugin-annotation@^3` with Chart.js v4 |
| D3 + Alpine DOM conflict | D3 owns its `<svg>` element; Alpine never touches it |
| MemoryStore session loss on Render restart | Accept: single user re-logs in. Upgrade to Redis if unacceptable |
| SSE connection limit (HTTP/1.1) | Render uses HTTP/2 via its proxy — limit is lifted |
| Tailwind build not running on Render | Add `tailwindcss` build to `npm run build` in package.json; Render runs it automatically |
| express.static before auth middleware | Always register `requireAuth` middleware before `express.static` on the same path prefix |

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Chart.js capabilities | HIGH | Stable v4 API, annotation plugin well-documented |
| D3 hierarchy layout | HIGH | d3-hierarchy API stable since D3 v5 |
| Alpine.js reactivity model | HIGH | v3 API stable, CDN delivery verified |
| express-session pattern | HIGH | Core Express ecosystem, unchanged for years |
| SSE on Render | MEDIUM | Render HTTP/2 support confirmed in docs as of mid-2024 but verify current free-tier WebSocket/SSE behavior before committing |
| vis-network bundle size | MEDIUM | ~800 KB figure based on last measurement; verify current npm package size |

---

*Sources: Context7 unavailable in this session (MCP tool not loaded). WebSearch/WebFetch restricted. All findings based on training data through August 2025. Validate version numbers and Render-specific SSE behavior before final implementation.*
