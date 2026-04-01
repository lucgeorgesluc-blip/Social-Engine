# Roadmap: Corinne SEO Autopilot

## Overview

Eight phases that take the project from an empty `autopilot/` folder to a
production-ready autonomous pipeline. Phases 1-4 build the core pipeline
(generate → validate → image → deploy → GSC ping). Phases 5-7 add the human
control layer (Telegram approval bot + web dashboard). Phase 8 wires everything
into a scheduled cron service on Render and ships to production.

Phases 9-12 add the SEO Page Audit & Auto-Patch milestone (v1.48.0): automated
health scoring for every HTML page, cannibalization detection, ranking-drop
triggers, AI-generated patches with validation and SFTP rollback, and a new
Audit SEO tab in the existing dashboard.

## Phases

- [ ] **Phase 1: Foundation & Scaffolding** — autopilot/ folder, deps, config loader, skeleton Express server
- [ ] **Phase 2: Article Generation Pipeline** — Claude API, context loading, topic selection, post-gen validation, config/sitemap updates
- [ ] **Phase 3: Image Generation** — @google/genai integration, sharp processing, graceful fallback
- [ ] **Phase 4: SFTP Deploy + GSC Ping** — atomic 5-file deploy, retry logic, GSC URL Inspection, state file
- [ ] **Phase 5: Telegram Approval Bot** — telegraf webhook, approve/edit inline buttons, edit prompt loop, error alerts
- [x] **Phase 6: Dashboard Backend** — Express API routes, GSC Search Analytics, SSE endpoint, auth middleware (completed 2026-03-30)
- [x] **Phase 7: Dashboard Frontend** — Mac-app dark UI, Alpine.js + Tailwind, queue/rankings/link-tree/pipeline views (completed 2026-03-30)
- [ ] **Phase 8: Cron Orchestrator + Production** — cron wiring, render.yaml, smoke test, README
- [ ] **Phase 9: Audit Foundation** — page inventory, signal extractor, health scorer, state/page-audit.json
- [x] **Phase 10: Cannibalization + Ranking Trigger** — Jaccard cannibalizer, fs.watch ranking trigger, audit API routes (completed 2026-04-01)
- [x] **Phase 11: Patch Generator + Validator + Apply** — Claude patch generation, 8-check validator, SFTP apply + backup + rollback (completed 2026-04-01)
- [ ] **Phase 12: Dashboard Audit Tab** — Audit SEO tab, health grid, chutes alerts, patch preview, approve/reject flow

## Phase Details

### Phase 1: Foundation & Scaffolding
**Goal**: A runnable autopilot/ skeleton exists with all dependencies installed, environment loading confirmed, and a skeleton Express server responding on localhost
**Complexity**: S
**Depends on**: Nothing (first phase)
**Requirements**: F3.1, F3.2, F3.3, F3.4
**Success Criteria** (what must be TRUE):
  1. `npm install` inside `autopilot/` completes without errors and all required packages (listed below) are present in node_modules
  2. Running `node autopilot/server.js` starts an Express server that responds 200 on `GET /health`
  3. `autopilot/config/loader.js` reads `.seo-engine/config.yaml` and `assets/js/config.js` (pricing section only) without crashing, and trims content-map.yaml to slug+title pairs
  4. `.env.example` is committed with all required key names and no values
  5. A `curl` test against the Google AI API confirms the exact Gemini image model name string
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Project setup, deps, Express server, config loader, env template, tests
- [x] 01-02-PLAN.md — Gemini image model name verification via API

**Key packages to install:**
- `@anthropic-ai/sdk` — Claude API
- `@google/genai` v1.47.0 — Gemini image generation (NOT deprecated `@google/generative-ai`)
- `sharp` — image processing (NOT ImageMagick — no system dependency)
- `ssh2-sftp-client` v12.1.1 — SFTP deploy (NOT abandoned alternatives)
- `telegraf` v4.16.3 — Telegram bot (NOT `node-telegram-bot-api` which depends on deprecated `request`)
- `googleapis` — GSC API + Search Analytics
- `express`, `express-session`, `bcryptjs` — dashboard server + auth
- `p-retry` — retry wrapper for all external calls
- `dotenv`, `pino` — env loading + structured logging

**Open question (must resolve in this phase):**
The Gemini exact model name is LOW confidence. Research flags two candidates:
`imagen-3.0-generate-002` and `gemini-2.0-flash-preview-image-generation`.
Before writing Phase 3, run:
```
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | jq '.[].name'
```
Document the working model name in `autopilot/config/gemini-model.txt` for Phase 3.

### Phase 2: Article Generation Pipeline
**Goal**: The pipeline can generate a validated HTML article, update config.js + sitemap.xml, and update all .seo-engine data files — end to end on a local dry run
**Complexity**: L
**Depends on**: Phase 1
**Requirements**: F1.1, F1.2, F1.3, F1.4, F1.5, F1.10
**Success Criteria** (what must be TRUE):
  1. Running `node autopilot/pipeline/run.js --dry-run` loads all 8 context files, picks the highest-priority `status: planned` article from content-queue.yaml, performs a cannibalization check, and logs the selected topic
  2. The Claude API call (streaming) produces a complete HTML file that starts with `<!DOCTYPE html>` and passes all 6 post-generation validation checks (no hard prices, no rTMS, has `data-price=`, has FAQPage schema, has `data-blog-list="related"`, has canonical tag)
  3. After a successful run, `assets/js/config.js` has the new article entry prepended to `SITE_CONFIG.blog`, `config.min.js` is regenerated via terser, and `sitemap.xml` contains the new URL
  4. `content-queue.yaml` marks the article `status: drafted`, `content-map.yaml` has a new entry, and `changelog.md` has a timestamped log line
  5. Token count is logged to `autopilot/logs/cost.jsonl` with estimated USD cost, and `MAX_ARTICLES_PER_RUN = 1` is enforced — a second call in the same run is blocked
  6. If the Claude API returns a validation-failing article, the pipeline sends no further requests and logs the specific failing checks

**Context loading (lean — target ≤12 000 tokens):**
- `config.yaml` — full (~1 160 tokens)
- `tone-guide.md` — full (~1 060 tokens)
- `blog-structures.yaml` — full (~1 580 tokens)
- `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — full (~2 615 tokens)
- `config.js` — pricing section only, first ~150 lines (~600 tokens)
- `content-queue.yaml` — target article entry only (~200 tokens)
- `seo-keywords.csv` — 3-5 relevant rows for the target keyword (~200 tokens)
- `content-map.yaml` — slug + title pairs ONLY (full file = 53KB / ~13K tokens; trimmed = ~2 000 tokens)

**Plans:** 1/2 plans executed
Plans:
- [x] 02-01-PLAN.md — Pure-function modules: loader extension, topic-selector, validator, cost-logger + tests
- [x] 02-02-PLAN.md — Generator, prompt-builder, file-updater, run.js orchestrator + tests

### Phase 3: Image Generation
**Goal**: The pipeline generates a 800x450 WebP hero image for each article, saved to `assets/images/blog/[slug].webp`, with graceful fallback when the Gemini API fails
**Complexity**: M
**Depends on**: Phase 1 (Gemini model name confirmed)
**Requirements**: F1.6
**Success Criteria** (what must be TRUE):
  1. A test run generates a WebP image at exactly 800x450 pixels, ≤300KB, saved to the correct blog image path
  2. `sharp` processes the Gemini response to WebP @q85 — no ImageMagick or system dependency required
  3. When the Gemini API call fails (e.g., wrong API key, network error), the pipeline continues without the image, logs a warning, and the article HTML does not reference a missing image path
  4. The image prompt is derived from the article topic and primary keyword (not generic)

**Library decisions:**
- Use `@google/genai` (NOT deprecated `@google/generative-ai`)
- Use `sharp` for image processing (NOT ImageMagick — eliminates Render system dependency)
- Model name: use verified string from Phase 1 `curl` test

**Plans:** 2 plans
Plans:
- [x] 03-01-PLAN.md — Image generator module (Gemini API + sharp) + run.js integration
- [x] 03-02-PLAN.md — Strip img tag from HTML when image generation fails (gap closure)

### Phase 4: SFTP Deploy + GSC Ping
**Goal**: On pipeline approval, exactly 5 files deploy atomically to the IONOS production server and Google Search Console is pinged for indexing — with retry logic and a persisted state file
**Complexity**: M
**Depends on**: Phase 2, Phase 3
**Requirements**: F1.7, F1.8, F1.9
**Success Criteria** (what must be TRUE):
  1. After a dry-run approval trigger, all 5 files (blog HTML, image WebP, config.js, config.min.js, sitemap.xml) appear on the SFTP server at the correct remote paths (verified with WinSCP)
  2. SFTP uses temp-file + rename pattern (`file.tmp` → `file`) to prevent half-written file serving
  3. On a simulated SFTP failure, the pipeline retries once, then sends a Telegram error alert and does NOT mark the article as deployed
  4. `autopilot/state/pending.json` is written before the approval gate and cleared after successful deploy
  5. GSC URL Inspection API call is logged as `submitted`, `already indexed`, or `error` — a GSC failure does not block the deploy
**Plans:** 2 plans
Plans:
- [x] 04-01-PLAN.md — SFTP deployer module + GSC ping module + tests
- [x] 04-02-PLAN.md — Deploy orchestrator + pending.json state + run.js Step 8 wiring + tests
**UI hint**: no

### Phase 5: Telegram Approval Bot
**Goal**: Corinne receives a Telegram message with article preview and can approve (triggering deploy) or request edits (triggering a re-generation loop up to 3 times) entirely from her phone
**Complexity**: M
**Depends on**: Phase 4
**Requirements**: F1.7, F1.7a
**Success Criteria** (what must be TRUE):
  1. After article generation, a Telegram message arrives containing: article title, first 200 chars of content, word count, internal link count, image status (present/missing), and two inline buttons: "Approuver et deployer" / "Modifier"
  2. Tapping "Approuver" triggers the SFTP deploy pipeline and sends a confirmation message with the live URL
  3. Tapping "Modifier" prompts for a free-text edit request; the pipeline re-generates the article with the feedback appended to the original context and sends a new preview — this loop works up to 3 times
  4. After 3 Modifier attempts without approval, the bot sends an alert ("Limite de modifications atteinte") and stops — no infinite loop
  5. If post-generation validation fails, Corinne receives a Telegram alert listing the specific failed checks — not a silent failure

**Library decision:** Use `telegraf` v4.16.3 (NOT `node-telegram-bot-api` which depends on deprecated `@cypress/request`). telegraf has native webhook + inline keyboard + callback_query support and TypeScript types.

**Plans:** 2 plans
Plans:
- [x] 05-01-PLAN.md — Preview extraction, pending array migration, bot core with approve flow
- [x] 05-02-PLAN.md — Edit-in-place handler, server.js/run.js wiring, stack limit

### Phase 6: Dashboard Backend
**Goal**: All dashboard data is available via authenticated Express API routes and a real-time SSE stream reflects pipeline state — the frontend can be wired up against real data
**Complexity**: M
**Depends on**: Phase 4
**Requirements**: F2.1, F2.2, F2.3, F2.4, F2.5, F2.6, F2.7, F2.8, F3.1, F3.2
**Success Criteria** (what must be TRUE):
  1. `GET /api/articles` returns all articles with title, status, word count, internal link count, image status, and date — reading from content-map.yaml and `autopilot/state/`
  2. `GET /api/rankings` returns per-keyword position over time sourced from GSC Search Analytics API (keywords with priority ≥ 7 from seo-keywords.csv), with article publish date markers
  3. `GET /api/links` returns the internal link tree derived from content-map.yaml internal_links data, in a format consumable by D3 d3-hierarchy
  4. `GET /api/pipeline-status` returns current step name, timestamp, and history — and `GET /api/events` (SSE) pushes updates in real time when pipeline state changes
  5. `POST /login` with correct credentials sets a session cookie and redirects to dashboard; all `/api/*` and `/dashboard` routes return 401 without a valid session
  6. A pending-approval badge count is available via `/api/articles?status=pending` for the nav indicator
**Plans:** 2/2 plans complete
Plans:
- [x] 06-01-PLAN.md — Auth middleware, activity-logger module, run.js+bot.js instrumentation, Wave 0 test stubs
- [x] 06-02-PLAN.md — GSC rankings module, all API routes (articles/rankings/links/pipeline-status/events/activity/stats/approve), server.js wiring, .env.example

### Phase 7: Dashboard Frontend
**Goal**: The dashboard is a functional Mac-app dark UI where Corinne (or the site manager) can view the article queue, inspect keyword rankings, explore the internal link tree, and watch the pipeline stepper in real time
**Complexity**: L
**Depends on**: Phase 6
**Requirements**: F2.1, F2.2, F2.3, F2.4, F2.5, F2.6, F2.7, F2.8
**Success Criteria** (what must be TRUE):
  1. The article queue view shows all articles with correct color-coded status badges (Published green, Pending yellow, Drafted blue, Queued gray), and the Approve & Deploy action for a pending article triggers the deploy pipeline and updates the badge without a page reload
  2. The keyword rankings chart renders a line per keyword (inverted Y-axis, lower = better), a time selector (7d/30d/90d) updates the data, and vertical dashed lines mark article publish dates on the timeline
  3. The internal link tree renders as a d3-hierarchy tree with node colors: Pillar (gold), Service (blue), Blog (cyan), Orphan/0-inbound (red) — clicking a node highlights its inbound and outbound links
  4. The pipeline stepper shows the 6 steps, the current step is animated, completed steps are checked, and it updates in real time via SSE without a page refresh
  5. The login page accepts username + password, a wrong password shows an error, and the logout button ends the session — all dashboard routes redirect to login without a valid session cookie
**Plans:** 2/2 plans complete
Plans:
- [x] 07-01-PLAN.md — server.js wiring + login.html + dashboard index.html shell (sidebar, stats, queue, pipeline, SSE)
- [x] 07-02-PLAN.md — Rankings Chart.js panel + D3 link tree + approve confirmation modal
**UI hint**: yes

**Design reference:** Mac-app dark theme (banana_20260329_114555_292068.png) — navy bg (#0d1117 / #161b22), rounded cards (border-radius: 12px), blue accents (#3b82f6), sidebar navigation.

**Library decisions:**
- Alpine.js 3 + Tailwind CSS 3 (NOT React — no build complexity for a single-user tool)
- Chart.js v4 + `chartjs-plugin-annotation` + `chartjs-adapter-date-fns` for rankings (NOT Plotly.js — 3.5MB bundle unjustified)
- D3.js `d3-hierarchy` tree layout for internal link tree (NOT vis-network — 800KB bundle unjustified; D3 tree-shaken ~80KB)
- SSE (EventSource) for real-time updates (NOT WebSocket — server-push only, browser-native, no library needed)

### Phase 8: Cron Orchestrator + Production
**Goal**: The full pipeline runs on schedule via Render cron, the dashboard stays live on Render web service, all secrets are documented, and an end-to-end smoke test confirms the system works in production
**Complexity**: M
**Depends on**: Phase 5, Phase 6, Phase 7
**Requirements**: F3.2, F3.3, F3.4, F1.1–F1.10 (orchestration wiring)
**Success Criteria** (what must be TRUE):
  1. `render.yaml` defines both a `web` service (dashboard, always-on starter plan) and a `cron` service (`"0 7 * * *"` UTC) sharing a single `seo-engine-secrets` environment group
  2. A manual trigger of the cron job via Render dashboard runs the complete pipeline (F1.1 → F1.10 in sequence), produces a Telegram approval message, and on approval deploys to production SFTP
  3. The pipeline orchestrator handles step failures with rollback in reverse order and sends a Telegram failure notification with the step name and error message — it does not silently stop
  4. `.env.example` has every required key documented with a comment describing what it is and where to get it
  5. A README in `autopilot/` explains the one-time setup steps: GSC service account creation, Render Secret File for GSC JSON, Telegram bot creation, Anthropic Console spend cap, SFTP path verification

**Render scheduler note:** Schedule is UTC. `"0 7 * * *"` = 08:00 Paris in winter (CET), 09:00 in summer (CEST) — a one-hour seasonal drift is acceptable for a daily blog pipeline.

### Phase 9: Audit Foundation
**Goal**: Every HTML page on the site can be inventoried and scored for SEO health before any suggestion or patch logic runs — the system always knows what pages exist and their current signal state
**Complexity**: M
**Depends on**: Phase 6 (config loader, pino logger already wired)
**Requirements**: F4.1, F4.2, F4.3
**Success Criteria** (what must be TRUE):
  1. Calling `buildPageInventory()` from any module returns a slug-keyed list of all HTML pages under `blog/`, root service pages, and index — with file path and last-modified date — without requiring any other module to be initialised first
  2. `extractPageSignals(slug)` returns a structured object containing: title tag, meta description, canonical URL, H1 count, JSON-LD types found (scanning the full file, not head-only), `data-price` usage, internal link count, and image alt coverage
  3. `scorePageHealth(signals)` produces a numeric score 0–100 and a `issues[]` array where each issue has a `code`, `severity` (critical/warning/info), and human-readable `message` in French
  4. After a full scan, `state/page-audit.json` is written with one entry per slug containing `score`, `issues`, `lastScanned` timestamp — and the file is valid JSON that can be read back without errors
  5. Running the scanner twice on an unchanged page produces identical scores (deterministic output)

**New dependency:** `cheerio` — install via `npm install cheerio` inside `autopilot/`. No other new packages required.

**Key constraint:** JSON-LD scanning must parse the full HTML file (both `<head>` and `<body>`). The production site places some schemas in `<body>` — a head-only scan will miss them and produce incorrect scores.

**Plans:** 2 plans
Plans:
- [x] 09-01-PLAN.md — `buildPageInventory`, `extractPageSignals`, `scorePageHealth` pure modules + unit tests
- [x] 09-02-PLAN.md — Full-site scanner, `state/page-audit.json` writer, pino logging, integration test

### Phase 10: Cannibalization + Ranking Trigger
**Goal**: The system automatically detects keyword-cannibalizing page pairs and triggers a fresh audit when any tracked keyword drops 5 or more positions — connecting the existing ranking history to the audit engine
**Complexity**: M
**Depends on**: Phase 9
**Requirements**: F4.4, F4.5
**Success Criteria** (what must be TRUE):
  1. `detectCannibalization()` returns all page pairs that share two or more normalised French tokens (accent-stripped, stopwords removed), with a Jaccard similarity score ≥ 0.15, and groups pairs that share the same `cluster_id` from `content-map.yaml` ahead of cross-cluster pairs
  2. When `state/live-rankings-history.json` is updated with a keyword that dropped ≥ 5 positions relative to its previous entry, the watcher triggers `runAudit(affectedSlugs)` within 150 ms — using `fs.watch` + debounce, the same pattern as the existing SSE watcher in Phase 6
  3. `GET /api/audit` returns the full `state/page-audit.json` payload (all slugs, scores, issues, cannibalization pairs) behind the existing session auth middleware
  4. `GET /api/audit/:slug` returns the single-page audit record for that slug, or 404 if the slug is not in the inventory
  5. After a ranking-drop trigger, `state/audit-status.json` records `{ triggeredAt, triggerKeyword, positionBefore, positionAfter, slugsScanned, completedAt }` so the dashboard can display what caused the last audit run

**Cannibalization algorithm:** Jaccard on accent-normalised French tokens. Accent normalisation: `NFD + strip combining chars`. Stopwords list (French): a minimal set covering articles, prepositions, and common verbs — stored in `autopilot/config/fr-stopwords.js`. `cluster_id` first-pass from `content-map.yaml` reduces false positives between unrelated clusters.

**State files created in this phase:**
- `state/page-audit.json` — full audit output, all slugs (written by Phase 9 runner)
- `state/audit-status.json` — last trigger metadata

**Plans:** 3/3 plans complete
Plans:
- [x] 10-01-PLAN.md — `detectCannibalization` module (Jaccard + cluster_id first pass + French stopwords) + unit tests
- [x] 10-02-PLAN.md — `fs.watch` ranking trigger (150 ms debounce), `GET /api/audit` + `GET /api/audit/:slug` routes, server.js wiring
- [x] 10-03-PLAN.md — Gap closure: flat audit-status.json schema (ROADMAP SC5) + fix audit-results.json naming typo

### Phase 11: Patch Generator + Validator + Apply
**Goal**: Given an audit result, the system generates a valid HTML patch via Claude API, validates it passes 8 safety checks, and applies it through the existing SFTP deploy flow with a timestamped backup and one-command rollback
**Complexity**: L
**Depends on**: Phase 9, Phase 10
**Requirements**: F4.6, F4.7, F4.8
**Success Criteria** (what must be TRUE):
  1. `generatePatch(slug, issues)` calls the Claude API with the page HTML + issues list and returns a patched HTML string — estimated cost ≤ $0.01 per page; cost is logged to `autopilot/logs/cost.jsonl`
  2. `validatePatch(original, patched)` runs 8 checks and returns `{ valid: boolean, failedChecks: string[] }` — the 8 checks are: valid JSON-LD, exactly one canonical tag, no Alpine.js `x-data` attribute removed, idempotent (applying patch twice produces same output), no hard-coded euro amounts, `data-price` attribute preserved where present, no rTMS mention introduced, and UTF-8 encoding preserved
  3. Pages on the `never-auto-apply` list (configurable in `autopilot/config/audit-config.js`) are blocked before the patch reaches the approval queue — an attempt logs a warning and returns without calling the Claude API
  4. `POST /api/audit/:slug/apply` (authenticated) validates the patch, writes a backup to `state/backups/[slug]-[timestamp].html`, calls the existing deploy-orchestrator with the patched file, then re-runs `extractPageSignals` + `scorePageHealth` and updates `state/page-audit.json` with the new score
  5. If the SFTP deploy fails, the original file is restored from backup automatically and `state/page-audit.json` is not updated — the apply endpoint returns a 500 with `{ error, backupPath }`

**Claude API usage:** Patch generation uses `claude-sonnet-4-6` (same model as article generation). Prompt includes: original HTML (full), issues array, and a strict instruction to return only valid HTML with no commentary. Response is streamed to a string buffer — not parsed as JSON.

**Pre-patch validation is a reusable module** (`autopilot/audit/patch-validator.js`) — callable independently of the apply flow for testing.

**Plans:** 2/2 plans complete
Plans:
- [x] 11-01-PLAN.md — `generatePatch` module (Claude API + prompt builder + cost logger), `validatePatch` module (8 checks), `never-auto-apply` enforcement + unit tests
- [x] 11-02-PLAN.md — `POST /api/audit/:slug/apply` route, backup writer, deploy-orchestrator wiring, re-scan after apply, rollback on SFTP failure + integration tests

### Phase 12: Dashboard Audit Tab
**Goal**: The site manager can see all page health scores, get alerted on ranking drops that triggered an audit, drill into any page's issues, preview a generated patch, and approve or reject it — all from a new tab in the existing dashboard without leaving the browser
**Complexity**: M
**Depends on**: Phase 11
**Requirements**: F4.9
**Success Criteria** (what must be TRUE):
  1. An "Audit SEO" tab appears in the existing Alpine.js sidebar between the Rankings and Link Tree tabs — clicking it shows the audit view without a page reload, and the tab is highlighted when the last audit detected any critical issues
  2. The master health grid displays one row per page with: slug, SEO score (color-coded: ≥80 green, 60–79 amber, <60 red), issue count by severity, and last-scanned timestamp — the grid updates automatically via SSE when a new audit completes
  3. Clicking a row expands a drill-down panel listing all issues for that page with severity badges and French-language messages, and a "Générer un patch" button that calls `POST /api/audit/:slug/patch` and shows a loading state while the Claude API runs
  4. The "Chutes" section at the top of the audit tab lists ranking-drop events from `state/audit-status.json` — each entry shows the keyword, position before/after, and the slugs that were re-scanned as a result
  5. When a patch exists for a slug (`pendingPatch` field in `state/page-audit.json`), the drill-down panel shows a syntax-highlighted HTML preview of the diff, and Approve / Reject buttons — Approve calls `POST /api/audit/:slug/apply`, Reject clears `pendingPatch`, both update the UI without a full reload

**Design constraints:** Dark Mac-app aesthetic matching the existing dashboard — navy `#0d1117` background, `#161b22` card surfaces, `border-radius: 12px`, blue accents `#3b82f6`. No new CSS framework or library — extend existing Tailwind utility classes only. The `avgSeoScore` field already declared in the dashboard stats row is populated by this phase.

**Alpine.js pattern:** Drill-down uses `selectedAuditSlug` toggle (set slug on row click, clear on close) — same pattern as the existing article queue detail panel. SSE reuse: audit tab listens on the existing `GET /api/events` stream for `{ type: 'audit-complete' }` events.

**Plans:** 2 plans
Plans:
- [ ] 12-01-PLAN.md — Static "Audit SEO" tab structure, master health grid (Alpine.js data binding, color coding, SSE refresh), "Chutes" alert section
- [ ] 12-02-PLAN.md — Drill-down panel (issue list + severity badges), patch preview (syntax highlight), Approve/Reject flow, `avgSeoScore` stat population
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Scaffolding | 0/2 | Planning complete | - |
| 2. Article Generation Pipeline | 1/2 | In Progress|  |
| 3. Image Generation | 1/2 | Planning complete | - |
| 4. SFTP Deploy + GSC Ping | 0/2 | Planning complete | - |
| 5. Telegram Approval Bot | 0/2 | Planning complete | - |
| 6. Dashboard Backend | 2/2 | Complete   | 2026-03-30 |
| 7. Dashboard Frontend | 2/2 | Complete   | 2026-03-30 |
| 8. Cron Orchestrator + Production | 0/2 | Planning complete | - |
| 9. Audit Foundation | 0/2 | Not started | - |
| 10. Cannibalization + Ranking Trigger | 3/3 | Complete    | 2026-04-01 |
| 11. Patch Generator + Validator + Apply | 2/2 | Complete   | 2026-04-01 |
| 12. Dashboard Audit Tab | 0/2 | Not started | - |
