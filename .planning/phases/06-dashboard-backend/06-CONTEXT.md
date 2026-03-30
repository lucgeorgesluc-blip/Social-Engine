# Phase 6: Dashboard Backend - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the authenticated Express API layer that powers all dashboard panels. This phase delivers: API routes returning structured data, auth middleware (login/session/logout), SSE endpoint for real-time pipeline state, and an activity log written by the pipeline. No UI work — that's Phase 7.

Routes to implement: `POST /login`, `GET /api/articles`, `GET /api/rankings`, `GET /api/links`, `GET /api/pipeline-status`, `GET /api/events` (SSE), `POST /api/articles/:slug/approve`.

</domain>

<decisions>
## Implementation Decisions

### Activity Feed
- **D-01:** Dedicated `autopilot/state/activity.jsonl` — pipeline writes one JSON line per major event. Server reads last 20 lines and formats as human-readable sentences.
- **D-02:** Events written by `run.js` (and `bot.js` for deploy):
  - **Article drafted** — after Claude API returns valid HTML: `{ event: "drafted", slug, wordCount, linkCount, imageStatus, ts }`
  - **Sent to Telegram** — when preview message is dispatched: `{ event: "telegram_sent", slug, ts }`
  - **Article deployed** — after successful SFTP deploy: `{ event: "deployed", slug, url, ts }`
  - **Error events** — validation failure / SFTP failure / API error: `{ event: "error", step, message, slug, ts }`
- **D-03:** Server formats each line into a human sentence: `"Article rédigé: [slug] ([wordCount] mots, [linkCount] liens)"`, `"Déployé: [slug] → [url]"`, etc.

### Claude's Discretion
- **GSC rankings caching** — Decide whether to cache in `state/rankings-cache.json` with a TTL (recommended: 1h TTL to avoid rate limits) or fetch fresh on each request.
- **Dashboard approve route** — `POST /api/articles/:slug/approve` should call `triggerDeploy(slug)` directly (same code path as Telegram bot). This is the simplest and most reliable approach since the dashboard Express process has full filesystem access.
- **Pipeline status shape** — `run.js` writes `autopilot/state/pipeline-status.json` with `{ step, stepName, ts, history[] }`. SSE endpoint uses `fs.watch()` on this file + `pending.json` to push updates. Six steps: Read Context (1) → Pick Topic (2) → Draft (3) → Generate Image (4) → Await Approval (5) → Deploy (6).
- **Session credentials storage** — `DASHBOARD_USERNAME` + `DASHBOARD_PASSWORD_HASH` as env vars. `bcryptjs.compareSync()` at login time. No plaintext password in env.
- **SSE cleanup** — Use `req.on('close', ...)` to remove fs.watch listeners when client disconnects.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Outputs to Integrate With
- `autopilot/server.js` — Express app skeleton, exports `app`; Phase 6 adds all routes here (or imports a router)
- `autopilot/deploy-orchestrator.js` — `triggerDeploy(slug)`, `readPending()` already implemented; approve route calls these
- `autopilot/pipeline/run.js` — Phase 6 requires run.js to write to `activity.jsonl` and `pipeline-status.json`
- `autopilot/gsc-ping.js` — GSC URL Inspection (Phase 4); Search Analytics is a different call, new module needed
- `autopilot/state/` — directory exists; `pending.json` (array format from Phase 5), `activity.jsonl` (new), `pipeline-status.json` (new)

### Requirements
- `.planning/REQUIREMENTS.md` — F2.1 (article queue), F2.2 (rankings), F2.3 (link tree), F2.4 (pipeline stepper), F2.5 (stats row), F2.6 (activity feed), F2.7 (auth), F2.8 (pending badge)
- `.planning/PROJECT.md` — Constraints: secrets in .env only, approval gate non-negotiable, spend cap

### SEO Data Sources
- `.seo-engine/data/content-map.yaml` — source for `/api/articles` (published articles) and `/api/links` (internal_links data)
- `.seo-engine/data/seo-keywords.csv` — keywords with priority ≥ 7 for `/api/rankings`
- `autopilot/state/pending.json` — pending approval articles (array format, Phase 5 schema)

### Auth Stack
- `express-session` + `bcryptjs` already in `autopilot/package.json` (Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deploy-orchestrator.js` — `triggerDeploy(slug)` callable from server process; also provides `readPending()` for pending article count
- `gsc-ping.js` — GSC service account auth pattern to replicate for Search Analytics API (uses `googleapis` package)
- `cost-logger.js` — DI pattern example (`_fn` injectable) to follow for new activity-logger module

### Established Patterns
- ESM modules (`import`/`export`) throughout
- DI pattern: pass `_fn` options for injectable functions (enables testing without real APIs)
- `pino` logger with `{ name: 'module-name' }` per module
- Env vars via `process.env` — never hardcoded

### Integration Points
- `server.js` `app` object — all API routes mount here (or via `app.use('/api', router)`)
- `pending.json` — watched by SSE endpoint; also read by `/api/articles?status=pending` for badge count
- `run.js` — needs two new write calls: `writeActivityEvent()` at draft/telegram/deploy/error steps + `writePipelineStatus()` at each step transition

</code_context>

<specifics>
## Specific Ideas

- `activity.jsonl` line format: `{ "event": "drafted", "slug": "...", "wordCount": 2340, "linkCount": 8, "imageStatus": "present", "ts": "2026-03-30T09:01:23Z" }`
- `/api/events` SSE: use `fs.watch()` on `state/pipeline-status.json` + `state/pending.json`; on change emit `data: { type, payload }\n\n`
- `/api/links` response: D3 d3-hierarchy consumable JSON `{ id, name, type, children[] }` — derive from content-map.yaml `internal_links` field
- Auth middleware: `isAuthenticated = (req, res, next) => req.session?.user ? next() : res.status(401).json({ error: 'Unauthorized' })` — applied to all `/api/*` and `/dashboard` routes

</specifics>

<deferred>
## Deferred Ideas

- GSC rankings cache invalidation via webhook (not needed for v1 — TTL is fine)
- Per-user auth / multiple accounts (single-user tool, one set of credentials)
- Article discard from dashboard (mentioned in F2.1 but not in Phase 6 success criteria — Phase 7 scope)
- Pagination for `/api/articles` (not needed initially — site has <50 articles)

</deferred>

---

*Phase: 06-dashboard-backend*
*Context gathered: 2026-03-30*
