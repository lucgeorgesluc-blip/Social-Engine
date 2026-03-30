# Phase 6: Dashboard Backend - Research

**Researched:** 2026-03-30
**Domain:** Express API routes, GSC Search Analytics, SSE real-time, session auth, JSONL activity logging
**Confidence:** HIGH

## Summary

Phase 6 adds the authenticated API layer that powers the dashboard frontend (Phase 7). The existing Express server (`autopilot/server.js`) is a minimal skeleton with a `/health` endpoint and Telegram bot startup. This phase mounts 7 routes: `POST /login`, `GET /api/articles`, `GET /api/rankings`, `GET /api/links`, `GET /api/pipeline-status`, `GET /api/events` (SSE), and `POST /api/articles/:slug/approve`. It also adds an `activity.jsonl` writer to `run.js` and `bot.js`, and creates `pipeline-status.json` written by the pipeline at each step transition.

All dependencies are already installed: `express@5.2.1`, `express-session@1.19.0`, `bcryptjs@3.0.3`, `googleapis@171.4.0`. No new packages needed. The GSC Search Analytics API uses the same `googleapis` package and service account auth pattern already established in `gsc-ping.js`. The SSE endpoint is pure Express (no library), watching 2 state files with `fs.watch`. Auth is session-based with bcrypt password hash comparison.

**Primary recommendation:** Build 4 new modules (`routes/auth.js`, `routes/api.js`, `gsc-rankings.js`, `activity-logger.js`) following the existing DI pattern, mount them on the Express app, and add activity/status writes to `run.js` at each step boundary.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dedicated `autopilot/state/activity.jsonl` -- pipeline writes one JSON line per major event. Server reads last 20 lines and formats as human-readable sentences.
- **D-02:** Events written by `run.js` (and `bot.js` for deploy):
  - **Article drafted** -- after Claude API returns valid HTML: `{ event: "drafted", slug, wordCount, linkCount, imageStatus, ts }`
  - **Sent to Telegram** -- when preview message is dispatched: `{ event: "telegram_sent", slug, ts }`
  - **Article deployed** -- after successful SFTP deploy: `{ event: "deployed", slug, url, ts }`
  - **Error events** -- validation failure / SFTP failure / API error: `{ event: "error", step, message, slug, ts }`
- **D-03:** Server formats each line into a human sentence: `"Article redige: [slug] ([wordCount] mots, [linkCount] liens)"`, `"Deploye: [slug] -> [url]"`, etc.

### Claude's Discretion
- **GSC rankings caching** -- Decide whether to cache in `state/rankings-cache.json` with a TTL (recommended: 1h TTL to avoid rate limits) or fetch fresh on each request.
- **Dashboard approve route** -- `POST /api/articles/:slug/approve` should call `triggerDeploy(slug)` directly (same code path as Telegram bot). This is the simplest and most reliable approach since the dashboard Express process has full filesystem access.
- **Pipeline status shape** -- `run.js` writes `autopilot/state/pipeline-status.json` with `{ step, stepName, ts, history[] }`. SSE endpoint uses `fs.watch()` on this file + `pending.json` to push updates. Six steps: Read Context (1) -> Pick Topic (2) -> Draft (3) -> Generate Image (4) -> Await Approval (5) -> Deploy (6).
- **Session credentials storage** -- `DASHBOARD_USERNAME` + `DASHBOARD_PASSWORD_HASH` as env vars. `bcryptjs.compareSync()` at login time. No plaintext password in env.
- **SSE cleanup** -- Use `req.on('close', ...)` to remove fs.watch listeners when client disconnects.

### Deferred Ideas (OUT OF SCOPE)
- GSC rankings cache invalidation via webhook (not needed for v1 -- TTL is fine)
- Per-user auth / multiple accounts (single-user tool, one set of credentials)
- Article discard from dashboard (mentioned in F2.1 but not in Phase 6 success criteria -- Phase 7 scope)
- Pagination for `/api/articles` (not needed initially -- site has <50 articles)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F2.1 | Article Queue (main view) -- list all articles with title, status, word count, links, image, date | `/api/articles` reads content-map.yaml + pending.json; status badge derived from content_type + status fields |
| F2.2 | Keyword Rankings -- line chart per keyword over time from GSC Search Analytics API | `/api/rankings` calls `searchconsole.searchanalytics.query()` with dimensions `["date","query"]`; cache with 1h TTL |
| F2.3 | Internal Link Tree -- D3 d3-hierarchy consumable JSON | `/api/links` transforms content-map.yaml `internal_links_to` into `{ name, type, children[] }` tree |
| F2.4 | Pipeline Stepper -- current step, timestamp, history, SSE push | `/api/pipeline-status` reads `pipeline-status.json`; `/api/events` SSE watches state files |
| F2.5 | Stats Row -- articles published, pending, avg SEO score, keywords in top 10 | Computed server-side from content-map + pending.json + GSC rankings data |
| F2.6 | Activity Feed -- human-readable event sentences, last 20 | `/api/articles` or dedicated endpoint reads `activity.jsonl` tail 20 lines, formats per D-03 |
| F2.7 | Auth -- login/session/logout, all routes protected | `express-session` + `bcryptjs`; middleware on all `/api/*` and `/dashboard` routes |
| F2.8 | Pending Notification Indicator -- badge count | `/api/articles?status=pending` returns filtered pending array length |
| F3.1 | Environment Variables | New env vars: `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD_HASH`, `SESSION_SECRET` |
| F3.2 | Render Setup | Session secret + dashboard credentials added to Render env group |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | 5.2.1 | HTTP server, route handling | Already in use (server.js) |
| express-session | 1.19.0 | Session management, cookie-based auth | Standard Express auth pattern, already installed |
| bcryptjs | 3.0.3 | Password hash comparison at login | Pure JS bcrypt, no native compilation, already installed |
| googleapis | 171.4.0 | GSC Search Analytics API calls | Already used in gsc-ping.js for URL Inspection |
| pino | 10.3.1 | Structured logging | Project standard logger |
| js-yaml | 4.1.1 | Parse content-map.yaml | Already used by loader.js |

### Supporting (No New Installs)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | fs.watch for SSE, file reads for state | SSE endpoint, activity.jsonl reads |
| node:readline | built-in | Read last N lines of activity.jsonl efficiently | Activity feed endpoint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| express-session (memory store) | connect-redis | Overkill for single-user tool; memory store is fine since server restart = re-login (acceptable) |
| fs.watch | chokidar | fs.watch is sufficient for watching 2 specific files; chokidar adds 15MB of deps for no gain |
| Custom SSE | express-sse npm | 3-line Express SSE setup doesn't justify a dependency |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
cd autopilot && npm ls express-session bcryptjs googleapis
```

## Architecture Patterns

### Recommended Project Structure
```
autopilot/
  server.js              # Mount session middleware + routes (modified)
  routes/
    auth.js              # POST /login, POST /logout, isAuthenticated middleware
    api.js               # GET /api/articles, /rankings, /links, /pipeline-status, /events, POST /api/articles/:slug/approve
  pipeline/
    run.js               # Modified: add writeActivity() + writePipelineStatus() calls
    gsc-rankings.js      # NEW: GSC Search Analytics query + cache
    activity-logger.js   # NEW: appendActivityEvent(), readRecentActivity(), formatActivity()
    deploy-orchestrator.js  # Existing: triggerDeploy() called by approve route
  state/
    pending.json         # Existing (Phase 5)
    activity.jsonl       # NEW: append-only event log
    pipeline-status.json # NEW: current pipeline step
    rankings-cache.json  # NEW: cached GSC rankings with TTL
  telegram/
    bot.js               # Modified: add writeActivity() calls for telegram_sent and deployed events
```

### Pattern 1: Auth Middleware
**What:** Session-based authentication with bcrypt password verification
**When to use:** All `/api/*` and `/dashboard` routes
**Example:**
```javascript
// Source: express-session docs + project DI pattern
import session from 'express-session';
import bcrypt from 'bcryptjs';

// Middleware factory
export function setupAuth(app) {
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
}

export function isAuthenticated(req, res, next) {
  if (req.session?.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// POST /login handler
export async function loginHandler(req, res) {
  const { username, password } = req.body;
  if (
    username === process.env.DASHBOARD_USERNAME &&
    bcrypt.compareSync(password, process.env.DASHBOARD_PASSWORD_HASH)
  ) {
    req.session.user = username;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
}
```

### Pattern 2: SSE Endpoint with fs.watch
**What:** Server-Sent Events pushing pipeline state changes to connected clients
**When to use:** `/api/events` endpoint
**Example:**
```javascript
// Source: Express SSE pattern + MDN SSE spec
const clients = new Set();

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  clients.add(res);

  // Watch state files
  const watchers = [
    fs.watch(pipelineStatusPath, () => {
      const data = JSON.parse(fs.readFileSync(pipelineStatusPath, 'utf8'));
      res.write(`data: ${JSON.stringify({ type: 'pipeline', payload: data })}\n\n`);
    }),
    fs.watch(pendingPath, () => {
      const pending = readPendingArray();
      res.write(`data: ${JSON.stringify({ type: 'pending', payload: { count: pending.length } })}\n\n`);
    }),
  ];

  // Keepalive every 30s
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clients.delete(res);
    clearInterval(keepalive);
    watchers.forEach(w => w.close());
  });
}
```

### Pattern 3: GSC Search Analytics Query
**What:** Fetch per-keyword position over time from Google Search Console
**When to use:** `/api/rankings` endpoint
**Example:**
```javascript
// Source: Google Search Console API docs + existing gsc-ping.js auth pattern
import { google } from 'googleapis';

export async function fetchRankings({ keywords, startDate, endDate, _searchConsole }) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GSC_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchConsole = _searchConsole || google.searchconsole({ version: 'v1', auth });

  const response = await searchConsole.searchanalytics.query({
    siteUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/',
    requestBody: {
      startDate,       // "2026-03-01"
      endDate,         // "2026-03-30"
      dimensions: ['date', 'query'],
      dimensionFilterGroups: [{
        filters: keywords.map(kw => ({
          dimension: 'query',
          operator: 'equals',
          expression: kw,
        })),
        groupType: 'or',
      }],
      rowLimit: 25000,
      dataState: 'all',
    },
  });

  // Response shape: { rows: [{ keys: ["2026-03-01", "magnetiseur troyes"], clicks, impressions, ctr, position }] }
  return response.data.rows || [];
}
```

### Pattern 4: D3 Hierarchy Data Shape
**What:** Transform content-map.yaml internal links into tree structure for d3.hierarchy()
**When to use:** `/api/links` endpoint
**Example:**
```javascript
// Source: d3-hierarchy docs (https://d3js.org/d3-hierarchy/hierarchy)
// d3.hierarchy() expects: { name, children: [{ name, children: [...] }] }

function buildLinkTree(contentMap) {
  // Root node = site
  const tree = {
    name: 'magnetiseuse-lacoste-corinne.fr',
    type: 'root',
    children: [],
  };

  // Group by cluster_id
  const clusters = {};
  for (const blog of contentMap.blogs) {
    const cid = blog.cluster_id || 'unclustered';
    if (!clusters[cid]) clusters[cid] = [];
    clusters[cid].push(blog);
  }

  // Each cluster becomes a subtree
  for (const [clusterId, pages] of Object.entries(clusters)) {
    const pillar = pages.find(p => p.content_type === 'pillar');
    const clusterNode = {
      name: pillar?.title || clusterId,
      type: 'pillar',
      slug: pillar?.slug || clusterId,
      children: pages
        .filter(p => p.content_type !== 'pillar')
        .map(p => ({
          name: p.title,
          type: p.content_type === 'standalone' ? 'standalone' : 'blog',
          slug: p.slug,
          links_to: p.internal_links_to || [],
          links_from: p.internal_links_from || [],
          children: [], // leaf nodes
        })),
    };
    tree.children.push(clusterNode);
  }

  // Add service pages referenced in internal_links_to but not in blogs[]
  // (e.g., "arret-tabac-troyes.html", "magnetiseur-troyes.html")
  const blogSlugs = new Set(contentMap.blogs.map(b => b.slug));
  const externalRefs = new Set();
  for (const blog of contentMap.blogs) {
    for (const link of (blog.internal_links_to || [])) {
      const slug = link.replace('.html', '');
      if (!blogSlugs.has(slug)) externalRefs.add(slug);
    }
  }
  if (externalRefs.size > 0) {
    tree.children.push({
      name: 'Pages Services',
      type: 'service',
      children: [...externalRefs].map(slug => ({
        name: slug,
        type: 'service',
        slug,
        children: [],
      })),
    });
  }

  return tree;
}
```

### Pattern 5: Activity Logger (DI pattern)
**What:** Append-only JSONL writer following project DI conventions
**When to use:** Called by `run.js` at each step boundary and `bot.js` on deploy/telegram events
**Example:**
```javascript
// Source: project convention from cost-logger.js DI pattern
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function writeActivityEvent(event, { _appendFn } = {}) {
  const append = _appendFn || appendFileSync;
  const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + '\n';
  mkdirSync(dirname(activityPath), { recursive: true });
  append(activityPath, line, 'utf8');
}

export function readRecentActivity(count = 20, { _readFn } = {}) {
  const read = _readFn || readFileSync;
  try {
    const content = read(activityPath, 'utf8');
    return content.trim().split('\n').slice(-count).reverse().map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

export function formatActivity(event) {
  switch (event.event) {
    case 'drafted':
      return `Article redige : ${event.slug} (${event.wordCount} mots, ${event.linkCount} liens)`;
    case 'telegram_sent':
      return `Envoye sur Telegram : ${event.slug}`;
    case 'deployed':
      return `Deploye : ${event.slug} -> ${event.url}`;
    case 'error':
      return `Erreur (${event.step}) : ${event.message}`;
    default:
      return `${event.event}: ${event.slug || ''}`;
  }
}
```

### Anti-Patterns to Avoid
- **Do NOT use `res.send()` or `res.end()` in SSE handler** -- these close the connection. Use only `res.write()`.
- **Do NOT use `writeFileSync` for activity.jsonl** -- use `appendFileSync` to avoid reading + rewriting the entire file.
- **Do NOT create a separate auth system** -- use the existing `express-session` + `bcryptjs` already installed. No JWT, no passport.js.
- **Do NOT use `google.webmasters` (v3 API)** -- use `google.searchconsole` (v1 API) which is the current version with `searchanalytics.query()`.
- **Do NOT poll for SSE updates** -- use `fs.watch()` on the specific state files, not a polling interval.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom cookie/token system | `express-session` (installed) | Handles signing, expiry, store management, cookie security options |
| Password hashing | Raw comparison or custom hash | `bcryptjs.compareSync()` (installed) | Timing-safe comparison, adaptive work factor |
| GSC API auth | Manual JWT token generation | `google.auth.GoogleAuth` from `googleapis` (installed) | Handles token refresh, scope management, key file parsing |
| YAML parsing | Regex-based content-map extraction | `js-yaml` (installed) | Handles all YAML edge cases, already used by loader.js |
| SSE protocol | Custom event framing | Express `res.write('data: ...\n\n')` | SSE spec is simple enough -- 3 lines of headers + write. No library needed. |

**Key insight:** Every dependency for this phase is already installed. The research confirms zero new `npm install` commands are needed.

## Common Pitfalls

### Pitfall 1: GSC Service Account Permission
**What goes wrong:** Search Analytics API returns 403 Forbidden even with valid credentials.
**Why it happens:** The service account email must be added as a "user" in Google Search Console with "Full" permission. URL Inspection (Phase 4) and Search Analytics use different permission levels.
**How to avoid:** Verify the service account email is listed under Settings > Users and Permissions in GSC with "Full" access (not just "Restricted").
**Warning signs:** `pingGsc()` works (URL Inspection) but `fetchRankings()` fails -- different API methods, same auth.

### Pitfall 2: GSC Property Format Mismatch
**What goes wrong:** `searchanalytics.query()` returns empty rows despite having data in GSC dashboard.
**Why it happens:** The `siteUrl` parameter format must match exactly how the property is registered in GSC. A domain property uses `sc-domain:example.com` while a URL-prefix property uses `https://www.example.com/`.
**How to avoid:** Check GSC registration. The existing `gsc-ping.js` uses `https://www.magnetiseuse-lacoste-corinne.fr/` -- verify this matches the GSC property type. Note: STATE.md flags this as an unresolved concern.
**Warning signs:** API returns 200 with `{ rows: [] }` instead of actual data.

### Pitfall 3: Express 5 Body Parsing
**What goes wrong:** `req.body` is `undefined` in POST /login handler.
**Why it happens:** Express 5 does not include body-parser middleware by default. The existing `server.js` has no body parsing middleware.
**How to avoid:** Add `app.use(express.json())` and `app.use(express.urlencoded({ extended: true }))` before route registration.
**Warning signs:** POST requests arrive with empty body, login always fails.

### Pitfall 4: SSE Connection Leak
**What goes wrong:** Server accumulates fs.watch handles and memory over time.
**Why it happens:** Clients disconnect (browser tab close, network drop) without the SSE handler cleaning up watchers.
**How to avoid:** Always listen for `req.on('close', ...)` and close all `fs.watch` instances + clear intervals in the callback. Track clients in a Set for debugging.
**Warning signs:** Increasing memory usage on server, "too many open files" errors.

### Pitfall 5: JSONL Corruption on Concurrent Writes
**What goes wrong:** `activity.jsonl` gets corrupted JSON lines when pipeline writes and server reads simultaneously.
**Why it happens:** `appendFileSync` is not atomic on all platforms. If the pipeline crashes mid-write, the last line may be truncated.
**How to avoid:** (1) Always append a complete line ending with `\n`. (2) When reading, use `try/catch` per line and skip unparseable lines. (3) Single-process writes (pipeline is the only writer at any given time; bot.js writes on deploy which is sequential).
**Warning signs:** JSON.parse errors when reading the last line of activity.jsonl.

### Pitfall 6: fs.watch Double-Fire on Windows
**What goes wrong:** SSE sends duplicate events to clients.
**Why it happens:** `fs.watch` on Windows fires the callback twice for a single file write (once for content change, once for metadata update).
**How to avoid:** Debounce the callback with a 100ms timeout. If a second event arrives within 100ms of the first, ignore it.
**Warning signs:** Frontend receives duplicate pipeline status updates.

### Pitfall 7: GSC API Rate Limits
**What goes wrong:** Rankings endpoint returns errors under moderate dashboard use.
**Why it happens:** GSC API allows 2,000 queries/day and 600 queries/minute. Each dashboard page load could trigger a rankings fetch.
**How to avoid:** Cache rankings data in `state/rankings-cache.json` with a 1-hour TTL. Serve from cache when fresh; only hit GSC API when cache is stale or missing.
**Warning signs:** 429 responses from GSC API; dashboard rankings panel shows errors.

## Code Examples

### GSC Search Analytics Complete Module
```javascript
// autopilot/pipeline/gsc-rankings.js
// Source: Google Search Console API docs + existing gsc-ping.js pattern
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import pino from 'pino';

const logger = pino({ name: 'gsc-rankings' });
const SITE_URL = 'https://www.magnetiseuse-lacoste-corinne.fr/';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getRankings({ period = '30d', cachePath, _searchConsole } = {}) {
  // Check cache first
  if (cachePath && existsSync(cachePath)) {
    const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
    if (Date.now() - cache.fetchedAt < CACHE_TTL_MS && cache.period === period) {
      logger.info('Serving rankings from cache');
      return cache.data;
    }
  }

  // Calculate date range
  const endDate = new Date().toISOString().slice(0, 10);
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GSC_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = _searchConsole || google.searchconsole({ version: 'v1', auth });

  const response = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['date', 'query'],
      rowLimit: 25000,
      dataState: 'all',
    },
  });

  const rows = response.data.rows || [];
  // rows: [{ keys: ["2026-03-01", "magnetiseur troyes"], clicks, impressions, ctr, position }]

  // Write to cache
  if (cachePath) {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify({ fetchedAt: Date.now(), period, data: rows }), 'utf8');
  }

  return rows;
}
```

### Pipeline Status Writer (for run.js integration)
```javascript
// Added to activity-logger.js -- called by run.js at each step transition
const STEPS = [
  { step: 1, name: 'Read Context' },
  { step: 2, name: 'Pick Topic' },
  { step: 3, name: 'Draft' },
  { step: 4, name: 'Generate Image' },
  { step: 5, name: 'Await Approval' },
  { step: 6, name: 'Deploy' },
];

export function writePipelineStatus(stepNumber, { statusPath, _writeFn } = {}) {
  const write = _writeFn || writeFileSync;
  const existing = existsSync(statusPath)
    ? JSON.parse(readFileSync(statusPath, 'utf8'))
    : { history: [] };

  const stepDef = STEPS.find(s => s.step === stepNumber) || { step: stepNumber, name: `Step ${stepNumber}` };
  const status = {
    step: stepDef.step,
    stepName: stepDef.name,
    ts: new Date().toISOString(),
    history: [
      ...existing.history,
      { step: stepDef.step, stepName: stepDef.name, ts: new Date().toISOString() },
    ],
  };

  write(statusPath, JSON.stringify(status, null, 2), 'utf8');
}
```

### Express 5 Middleware Order
```javascript
// server.js modifications -- order matters
import express from 'express';
import session from 'express-session';
import { setupAuth, isAuthenticated, loginHandler, logoutHandler } from './routes/auth.js';
import { apiRouter } from './routes/api.js';

const app = express();

// 1. Body parsing (Express 5 requires explicit middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Session middleware
setupAuth(app);

// 3. Public routes (no auth)
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/login', loginHandler);

// 4. Auth wall -- everything below requires session
app.use('/api', isAuthenticated, apiRouter);
app.use('/dashboard', isAuthenticated, express.static('dashboard'));
app.post('/logout', logoutHandler);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google.webmasters` (v3) | `google.searchconsole` (v1) | 2022+ | v1 is the current API; v3 still works but deprecated |
| Express 4 built-in body-parser | Express 5 explicit `express.json()` | Express 5 (2024) | Must add body parsing middleware explicitly |
| WebSocket for real-time | SSE for server-push only | Standard | SSE is simpler, browser-native, reconnects automatically |
| MemoryStore warning | Accepted for single-user | Always | express-session MemoryStore warns in prod but is fine for 1 user |

**Deprecated/outdated:**
- `passport.js` for this use case: overkill for single-user username/password; raw `bcryptjs.compareSync` is simpler
- `body-parser` npm package: integrated into Express 5 as `express.json()`

## Open Questions

1. **GSC Property Format**
   - What we know: `gsc-ping.js` uses `https://www.magnetiseuse-lacoste-corinne.fr/` as siteUrl
   - What's unclear: Whether the GSC property is registered as URL-prefix or domain-level (`sc-domain:magnetiseuse-lacoste-corinne.fr`)
   - Recommendation: Use the same siteUrl as gsc-ping.js. If Search Analytics returns empty rows, try the `sc-domain:` format. Log the siteUrl used so debugging is easy.

2. **Service Account Search Analytics Access**
   - What we know: Service account auth works for URL Inspection (Phase 4 proven)
   - What's unclear: Whether the service account has been granted "Full" permission in GSC (required for Search Analytics, not just URL Inspection)
   - Recommendation: Implement graceful fallback -- if GSC returns 403, return `{ error: 'GSC access not configured', rows: [] }` and log a setup instruction.

3. **Keyword Filtering Strategy**
   - What we know: seo-keywords.csv has a `priority` column with values "high" and "medium"
   - What's unclear: CONTEXT.md says "priority >= 7" but CSV uses text values ("high", "medium"), not numbers
   - Recommendation: Map "high" -> priority >= 7, filter for "high" priority keywords only. Parse CSV and extract the `keyword` column for GSC query filtering.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None (convention: `tests/*.test.js`) |
| Quick run command | `node --test tests/auth.test.js tests/api-routes.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F2.1 | GET /api/articles returns articles with all fields | unit | `node --test tests/api-routes.test.js -x` | No -- Wave 0 |
| F2.2 | GET /api/rankings returns GSC data with cache | unit | `node --test tests/gsc-rankings.test.js -x` | No -- Wave 0 |
| F2.3 | GET /api/links returns d3-hierarchy JSON | unit | `node --test tests/api-routes.test.js -x` | No -- Wave 0 |
| F2.4 | GET /api/pipeline-status + SSE events | unit | `node --test tests/api-routes.test.js -x` | No -- Wave 0 |
| F2.5 | Stats row computed correctly | unit | `node --test tests/api-routes.test.js -x` | No -- Wave 0 |
| F2.6 | Activity feed reads + formats JSONL | unit | `node --test tests/activity-logger.test.js -x` | No -- Wave 0 |
| F2.7 | Auth middleware blocks unauthenticated, allows authenticated | unit | `node --test tests/auth.test.js -x` | No -- Wave 0 |
| F2.8 | Pending badge count via ?status=pending | unit | `node --test tests/api-routes.test.js -x` | No -- Wave 0 |
| F3.1 | New env vars documented in .env.example | smoke | `node --test tests/env-example.test.js -x` | Yes (extend) |
| F3.2 | Render-compatible session config | manual-only | N/A | N/A |

### Sampling Rate
- **Per task commit:** `node --test tests/auth.test.js tests/api-routes.test.js tests/gsc-rankings.test.js tests/activity-logger.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/auth.test.js` -- covers F2.7 (login, logout, middleware)
- [ ] `tests/api-routes.test.js` -- covers F2.1, F2.3, F2.4, F2.5, F2.8
- [ ] `tests/gsc-rankings.test.js` -- covers F2.2 (GSC query + cache)
- [ ] `tests/activity-logger.test.js` -- covers F2.6 (JSONL write, read, format)
- [ ] Extend `tests/env-example.test.js` -- add DASHBOARD_USERNAME, DASHBOARD_PASSWORD_HASH, SESSION_SECRET

## Sources

### Primary (HIGH confidence)
- [Google Search Console API: searchanalytics.query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) -- request body format, dimensions, response shape, date format, rowLimit
- [express-session npm docs](https://www.npmjs.com/package/express-session) -- cookie options (httpOnly, secure, sameSite, maxAge), session secret, resave/saveUninitialized
- [d3-hierarchy official docs](https://d3js.org/d3-hierarchy/hierarchy) -- `d3.hierarchy()` expects `{ name, children[] }` nested object
- [d3-hierarchy tree layout docs](https://d3js.org/d3-hierarchy/tree) -- `d3.tree()` layout API
- Existing codebase: `gsc-ping.js` (auth pattern), `deploy-orchestrator.js` (DI pattern), `cost-logger.js` (append pattern)

### Secondary (MEDIUM confidence)
- [Express SSE pattern verified by DigitalOcean tutorial](https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app) -- headers, flushHeaders, res.write pattern
- [Mastering JS: SSE with Express](https://masteringjs.io/tutorials/express/server-sent-events) -- keepalive, client disconnect
- [Code Concisely: GSC API in Node.js](https://www.codeconcisely.com/posts/how-to-use-google-search-console-api-in-node-js/) -- googleapis searchanalytics.query call syntax

### Tertiary (LOW confidence)
- fs.watch Windows double-fire behavior -- community reports, not officially documented as guaranteed behavior. Debounce is defensive.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and verified in project
- Architecture: HIGH -- follows established project patterns (DI, pino, ESM), well-documented APIs
- GSC Search Analytics: MEDIUM -- API docs are clear but service account permission and property format are unverified for this site
- SSE: HIGH -- simple spec, well-documented, no library dependency
- Pitfalls: HIGH -- drawn from official docs, Windows behavior, and project-specific concerns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain, no fast-moving dependencies)
