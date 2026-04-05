# Project Research Summary

**Project:** Social Acquisition Dashboard — magnetiseuse-lacoste-corinne.fr
**Domain:** Single-operator social media acquisition dashboard (Facebook -> DM -> Booking)
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a single-user internal dashboard for a local wellness practitioner to manage a Facebook-driven patient acquisition funnel: post content to Facebook, monitor "INFO" comments from interested prospects, track them through a 3-message DM sequence, and confirm Calendly bookings. The domain is well-understood and the patterns are standard — the complexity comes from Facebook API constraints and Render free-tier limitations, not from the product logic itself. Experts build this type of tool as a thin Node.js/Express server-rendered app, with PostgreSQL as the sole data store and no frontend build pipeline.

The recommended approach is a single Render web service running Express + EJS (server-rendered HTML), backed by a managed PostgreSQL database. No SPA framework, no ORM, no separate frontend server. Seven existing YAML files in `.social-engine/data/` seed the database on first boot and become read-only artifacts thereafter. Features are built in three phases: read layer first (visibility), write operations second (action), AI and analytics third (leverage). Facebook API integration is treated as a progressive enhancement — the dashboard must be fully usable with manual copy-paste before any API posting is attempted.

The primary risks are infrastructure-level: Render's free PostgreSQL tier deletes data after 30 days, the free web service cold-starts make scheduled tasks unreliable, and Facebook App Review can block API features for weeks to months. All three require architectural decisions in Phase 1 before a single feature is built. Budget $7/month for Render Starter PostgreSQL from day one — this is not optional. Start the Facebook App Review process immediately and build a clipboard-copy fallback so the tool is usable regardless of API approval status.

## Key Findings

### Recommended Stack

The stack is intentionally minimal: Node 20 LTS + Express 4 + EJS 3 for server-rendered HTML, `pg` (raw SQL) for PostgreSQL access, `express-session` + `connect-pg-simple` + `bcrypt` for single-user auth. The Anthropic SDK (`@anthropic-ai/sdk` 0.82.0) handles Claude API calls; native `fetch` handles Facebook Graph API v22.0 calls (the official Facebook Node SDK targets Marketing/Ads API, not page content management). `node-cron` handles scheduled post triggers within the Express process.

**Core technologies:**
- Node 20 LTS + Express 4: runtime and HTTP server — LTS stability, Render-supported, single deployable process
- EJS 3: server-side templating — no build pipeline, no bundler, ships HTML directly
- pg 8.x (raw SQL): database driver — no ORM abstraction, no compile step, faster than Prisma for 8 tables
- express-session + connect-pg-simple: session management — sessions persisted in Postgres (MemoryStore is explicitly not production-safe per Express docs)
- @anthropic-ai/sdk 0.82.0: Claude API — official typed SDK, already used in project tooling
- Facebook Graph API v22.0: page posting and metrics — v21.0 reaches EOL September 2025; use v22.0 from day one
- node-cron 3.x: scheduled post triggers — simpler than Bull/BullMQ for a single-process single-service app

### Expected Features

**Must have (table stakes):**
- Priority inbox — next post to publish, unresponded INFO comments, overdue DM follow-ups in one glanceable view
- Post list with draft/scheduled/published status + copy-to-clipboard
- Comment list per post with classification (info/objection/positive) and mark-as-handled
- DM prospect pipeline cards — stage progression (new -> msg1 -> msg2 -> msg3 -> booked -> converted/lost)
- DM follow-up due alerts — highlight overdue cards (msg2 due J+2, msg3 due J+7)
- Content calendar (weekly list view)
- Manual metrics input per post (paste from Facebook Insights)
- Conversion funnel summary (reach -> comments -> DM -> Calendly -> patient)
- Simple password auth + YAML seed import

**Should have (differentiators):**
- INFO-to-DM one-click conversion — marks comment, pre-fills prospect card
- AI post generation (Claude API) — draft from objection type + post type in one click
- DM message templates — pre-written msg1/msg2/msg3 for copy-paste
- Objection-response library — categorized responses to copy-paste into comments
- Post performance benchmark — traffic-light vs. engagement rate target (>5%) and INFO target (>2/post)
- Objection frequency tracker — surfaces suggested post topic when an objection type appears 3+ times
- Weekly recap view — one-screen summary replacing manual metrics template

**Defer (v2+):**
- Automated Facebook posting via Graph API — requires Business verification + App Review; build clipboard fallback first
- Automated DM sending — Facebook policy explicitly prohibits; permanent defer
- Real-time comment polling / webhooks — overkill for 3 posts/week cadence
- LinkedIn platform — zero conversion data; add only if Facebook funnel is stable and producing bookings
- Calendly API integration — operator marks "booked" manually; no direct link needed at v1

### Architecture Approach

Single Node.js process serves both REST API (`/api/*`) and server-rendered HTML via EJS. Express middleware layers: static files -> auth check -> thin route handlers -> service functions -> DB layer. No separate frontend server, no microservices, no client-side build step. YAML files seed the database once on first boot (idempotent guard via `seed_completed_at` in `app_config` table); after that, PostgreSQL is the only source of truth and YAML files become read-only. Facebook client and Claude client are isolated modules called from service functions, never directly from route handlers.

**Major components:**
1. Express server — serves HTML pages, exposes `/api/*` routes, runs auth middleware on all protected routes
2. DB layer — all SQL queries via `pg.Pool`; business logic lives in service functions, not here
3. Seed service — one-time YAML-to-DB import with idempotency guard; runs on startup, skips if already complete
4. Posts / Comments / DM Pipeline / Metrics routers — thin handlers delegating to service layer
5. Claude client — generates post drafts via Anthropic API; called from AI router
6. Facebook client — pulls comments/metrics and (eventually) posts content; called from scheduler and routers
7. Scheduler (node-cron) — checks DB for posts due, triggers Facebook client; only reliable on paid Render tier

### Critical Pitfalls

1. **Render free PostgreSQL deleted after 30 days** — Use Render Starter ($7/mo) or Supabase free tier from day one. Never use Render free DB for production data. Decide in Phase 1 before writing migrations.
2. **Facebook App Review blocks API access for weeks** — Start App Review process in Phase 1. Build clipboard-copy fallback in Phase 2. Treat API auto-posting as Phase 3+ at earliest.
3. **Facebook Page Access Token expiry breaks posting silently** — Store token in PostgreSQL `app_config` table, not in `.env`. Add token health check (call `GET /me`) on dashboard startup, surface error as a red banner.
4. **Render free web service cold starts (30-second delay)** — Use an external ping service (UptimeRobot) to keep warm, or upgrade to Starter. Never run `node-cron` scheduled tasks on Render free tier — the process is dead during spin-down.
5. **Claude API runaway costs** — Keep system prompt under 500 tokens. Cache generated drafts in DB. Add a monthly generation counter and a soft limit (warn at 50, stop at 100). Use `claude-3-5-haiku` for generation, not Sonnet.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Infrastructure + Data Layer)
**Rationale:** All subsequent features depend on a working database and auth layer. Render free-tier pitfalls must be resolved before any code is written, or the foundation will need to be rebuilt. YAML seed must be proven correct before the read layer can be built on top of it.
**Delivers:** Working Express server on Render with Postgres (paid tier confirmed), session auth, complete DB schema, idempotent YAML seed script, health check endpoint.
**Addresses:** YAML seed import (table stakes), simple password auth (table stakes)
**Avoids:** Pitfall 1 (30-day DB deletion), Pitfall 4 (cold starts), Pitfall 6 (duplicate seeding), Pitfall 7 (client-side auth), Pitfall 9 (connection pool exhaustion)

### Phase 2: Read Layer (Visibility)
**Rationale:** The operator cannot act on what they cannot see. Building the read layer first delivers immediate value (replaces spreadsheet) with no external API dependencies — the dashboard is usable and deployable before Facebook or Claude integrations are added.
**Delivers:** Priority inbox, post list, comment list, DM pipeline cards, content calendar list view, conversion funnel summary. All populated from seeded DB data.
**Addresses:** Today's priority inbox, post list with status, comment list per post, DM prospect cards, content calendar, conversion funnel summary (all table stakes)
**Avoids:** Pitfall 5 (no Claude calls yet — no cost risk), Pitfall 2 (no Facebook API yet)

### Phase 3: Write Operations (Action)
**Rationale:** Once the operator can see the data, add write operations so the dashboard becomes an active management tool. INFO-to-DM one-click conversion is the highest-leverage single feature — it directly closes the comment-to-prospect gap where leads currently fall through.
**Delivers:** Mark comment as handled, INFO-to-DM one-click conversion, update DM stage, input post metrics, post draft inline editor with character count, DM message templates, objection-response library.
**Addresses:** Comment classification + mark-as-handled, DM follow-up due alerts, metrics input, DM templates, objection-response library (differentiators)
**Avoids:** Pitfall 10 (calendar drag-drop data loss — optimistic UI with confirmed server save)

### Phase 4: AI Generation (Leverage)
**Rationale:** AI post generation multiplies operator effectiveness but requires cost guardrails and the objection classification data built in Phase 3. Build this after write operations are stable.
**Delivers:** Claude-powered post draft generation, objection frequency tracker with suggested post topics, post performance benchmarks (traffic-light vs. targets), weekly recap view.
**Addresses:** AI post generation, objection frequency tracker, post performance benchmark, weekly recap view (differentiators)
**Avoids:** Pitfall 5 (runaway Claude costs) — generation counter, caching, and soft limits built from the start

### Phase 5: Facebook Integration (Automation)
**Rationale:** Facebook API integration is the highest-risk phase due to App Review uncertainty and token management complexity. Starting App Review in Phase 1 gives the maximum lead time. This phase is additive — the dashboard is fully functional without it.
**Delivers:** Facebook comment pull (read), metrics sync from Graph API, token health check UI. Optional: auto-posting if App Review approves `pages_manage_posts`.
**Addresses:** Automated metrics sync (differentiator), scheduled auto-posting (if approved)
**Avoids:** Pitfall 2 (App Review delays — already started in Phase 1), Pitfall 3 (token expiry — health check UI built here), Pitfall 8 (rate limits — Batch API, hourly cache, BUC header monitoring)

### Phase Ordering Rationale

- Infrastructure decisions (DB tier, Render plan, Facebook App Review) must precede all feature work — three of the five critical pitfalls are infrastructure-level.
- Read before write: the seeded data proves the schema is correct and delivers immediate value before any mutation logic is added.
- Manual operations before API automation: the clipboard-copy workflow delivers a working product regardless of Facebook API approval status; automation is layered on top.
- AI generation after write operations: objection classification data (built in Phase 3) feeds the objection frequency tracker and enriches AI prompts.
- Facebook API last: highest external risk, lowest urgency (manual copy-paste covers the core use case).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Facebook Integration):** Facebook API permissions, App Review requirements, and Batch API implementation details change frequently. Verify specific endpoints and permissions against current Meta developer docs before planning implementation tasks. LOW confidence on metrics endpoints due to announced June 2026 deprecations.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Express + pg + Render patterns. Stack is confirmed. No research needed.
- **Phase 2 (Read Layer):** Standard CRUD read operations on a seeded DB. No external dependencies. No research needed.
- **Phase 3 (Write Operations):** Standard form submissions and state transitions. No research needed.
- **Phase 4 (AI Generation):** Anthropic SDK is well-documented. Prompt engineering is straightforward for short Facebook posts. Cost guardrail patterns are standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Node 20 + Express + pg + EJS confirmed stable on Render. Anthropic SDK version verified on npm. Only FB API version is MEDIUM (v22.0 per Meta blog, Jan 2025). |
| Features | HIGH | Derived directly from authoritative project files (PROJECT.md, YAML data files). Feature scope matches actual existing data. |
| Architecture | HIGH | Standard single-process Express pattern. Data model derived from real YAML schema. Build order validated by dependency analysis. |
| Pitfalls | MEDIUM-HIGH | Render DB expiry, FB App Review, and token expiry are verified against official docs. Facebook metrics deprecation (June 2026) is LOW confidence — specific endpoints not yet confirmed. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Facebook metrics endpoints (June 2026 deprecation):** Specific metrics that survive post-deprecation are not yet confirmed. Before planning Phase 5 tasks, check `developers.facebook.com/docs/graph-api/reference/insights/` for the current list of available metrics. Do not build metric queries against 2024 documentation.
- **Facebook App Review timeline:** Approval time is unpredictable (days to months). Phase 5 should be planned with a fallback track that assumes API posting is not approved — manual clipboard workflow must remain the primary path.
- **Render Starter vs. Supabase decision:** Both prevent the 30-day DB deletion. Render Starter ($7/mo) is simpler (same platform, same connection string format). Supabase free tier is $0 but adds a connection pool limit (60) and a different connection string. Decision should be made before Phase 1 starts.

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — Requirements, KPIs, out-of-scope decisions
- `.social-engine/config.yaml` + `data/*.yaml` — Brand config, DM sequence rules, real post/prospect data
- Render Free PostgreSQL changelog — 30-day expiry confirmed
- Meta Graph API rate limiting — official docs
- Meta App Review process — official docs
- Meta Access Token guide — official docs
- Express session middleware docs — MemoryStore production warning
- Claude API rate limits — official Anthropic docs

### Secondary (MEDIUM confidence)
- [Graph API v22.0 announcement](https://developers.facebook.com/blog/post/2025/01/21/introducing-graph-api-v22-and-marketing-api-v22/) — version confirmed, January 2025
- [Render free tier limits](https://www.freetiers.com/directory/render) — cold start and spin-down behavior
- [HTMX server examples](https://htmx.org/server-examples/) — progressive enhancement pattern
- node-cron on Render single-service — community-verified pattern

### Tertiary (LOW confidence)
- Facebook Page Insights metrics post-June 2026 — specific surviving endpoints not yet confirmed; check Meta docs before Phase 5 planning
- Facebook App Review approval timeline — highly variable; 2-8 weeks is community estimate, not guaranteed

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
