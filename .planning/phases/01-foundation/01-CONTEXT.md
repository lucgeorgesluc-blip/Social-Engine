# Phase 1: Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working Express app deployed on Render with a paid PostgreSQL database, password authentication, complete DB schema, idempotent YAML seed import, and a responsive dashboard shell. After Phase 1, visiting the Render URL shows a login page; entering the correct password shows a sidebar-nav dashboard with health status and seed data counts.

</domain>

<decisions>
## Implementation Decisions

### Project Structure
- **D-01:** Dashboard lives in a new `dashboard/` directory at repo root — separate from both the static site and `autopilot/`
- **D-02:** Fully independent `package.json` — no shared dependencies with autopilot. Own Express app, own deps, own deployment

### Technology
- **D-03:** Stack confirmed: Node 20 + Express 4 + EJS + pg (raw SQL) + connect-pg-simple + bcrypt + Tailwind CSS
- **D-04:** Tailwind CSS for styling, matching the main site's brand colors (primary/secondary/accent). Dashboard needs its own Tailwind build since the pre-built tailwind.css has class gaps
- **D-05:** UI text in French ("Mot de passe", "Se connecter", "Tableau de bord", etc.)

### Login Experience
- **D-06:** Branded minimal login page — centered card with brand colors (terracotta/green), "Social Dashboard" title, "Corinne Lacoste" subtitle, single password field, "Se connecter" button
- **D-07:** No username field — single shared password (INFRA-04)

### Post-Login Shell
- **D-08:** Sidebar navigation on the left, content area on the right. Collapses to hamburger menu on mobile (375px)
- **D-09:** All future nav items visible but disabled from day 1 — "Accueil", "Posts" (disabled), "Commentaires" (disabled), "Pipeline" (disabled), "Statistiques" (disabled). Greyed out with "Bientôt" badge. Each phase enables its section
- **D-10:** Homepage shows health status card: DB connection status, seed data counts (posts, comments, prospects), and "Bienvenue, Benjamin" greeting
- **D-11:** Logout button accessible from the sidebar

### Database
- **D-12:** Render free PostgreSQL MUST NOT be used — must choose Render Starter ($7/mo) or Supabase free tier before writing migrations (blocker from STATE.md, not discussed — user skipped this area)

### Claude's Discretion
- DB schema design (table structure, relationships, indexes) — researcher and planner decide based on YAML data shapes
- Seed script implementation details (conflict resolution strategy, idempotent upsert approach)
- Express middleware stack ordering
- Health check endpoint design
- Error page styling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Project vision, constraints, key decisions, out-of-scope items
- `.planning/REQUIREMENTS.md` — INFRA-01 through INFRA-05 define Phase 1 acceptance criteria
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 items that must be TRUE)

### Existing Data (seed source)
- `.social-engine/config.yaml` — Brand config, DM sequence rules, trust signals, platform settings
- `.social-engine/data/posts.yaml` — Published posts registry
- `.social-engine/data/posts-drafts.yaml` — Draft posts
- `.social-engine/data/content-calendar.yaml` — Scheduled content
- `.social-engine/data/comments.yaml` — Comment tracker with classifications
- `.social-engine/data/dm-pipeline.yaml` — Prospect cards with stage tracking
- `.social-engine/data/objections.yaml` — Objection frequency data
- `.social-engine/data/metrics-weekly.yaml` — Weekly metrics template

### Codebase Context
- `.planning/codebase/STACK.md` — Full technology stack analysis
- `.planning/codebase/ARCHITECTURE.md` — Existing site architecture patterns
- `.planning/codebase/CONVENTIONS.md` — Coding conventions to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Brand colors defined in `tailwind.config.js`: primary (#DC512C), secondary (#2C5F4F), accent (#F4E8D8)
- Font files: Inter + Playfair Display in `assets/fonts/` — can be referenced from dashboard
- `.social-engine/data/` contains 7 YAML files that define the complete DB schema shape

### Established Patterns
- `autopilot/` uses Express 5 + ESM + pino logging — dashboard should follow similar patterns but with Express 4 as decided in STATE.md
- Session auth with bcrypt already implemented in autopilot (can reference as pattern, not dependency)
- EJS templating chosen over React/frontend frameworks — server-rendered pages

### Integration Points
- Dashboard reads `.social-engine/data/*.yaml` for initial seed (one-time import at first boot)
- After seed, database owns all data — no ongoing sync with YAML files
- Dashboard deployed as separate Render web service (independent from autopilot)

</code_context>

<specifics>
## Specific Ideas

- Login page: centered card, brand colors, "Social Dashboard / Corinne Lacoste" header
- Sidebar nav: vertical menu, hamburger on mobile, disabled items with "Bientôt" badge
- Health card: DB status, row counts per table, seed verification

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-05*
