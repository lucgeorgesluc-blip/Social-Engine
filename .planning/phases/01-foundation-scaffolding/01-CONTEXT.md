# Phase 1: Foundation & Scaffolding - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a runnable `autopilot/` Node.js project: folder structure, all dependencies, config loader that reads `.seo-engine/` files with lean trimming, Express skeleton on PORT, Gemini model name verified via API, `.env.example` with all keys.

</domain>

<decisions>
## Implementation Decisions

### Folder Structure
- **D-01:** Flat `src/` layout — `pipeline.js`, `server.js`, `config.js`, `deploy.js`, `validator.js` at same level. No nested domain folders.
- **D-02:** `public/` for dashboard frontend, `state/` for pending.json, `logs/` for cost.jsonl.

### Config Loading
- **D-03:** Read `.seo-engine/` files fresh from disk every pipeline run. No caching, no file-watch. Simple and always current.
- **D-04:** Trim `content-map.yaml` to slug+title pairs only (drop 53KB → ~2K tokens). All other files loaded in full.
- **D-05:** Config loader reads relative to `SITE_BASE_PATH` env var (points to `E:/Site CL` locally, absolute path on Render).

### Local Dev
- **D-06:** `npm run dev` starts Express server with `--dry-run` flag available.
- **D-07:** `--dry-run` skips SFTP deploy and sends Telegram to test chat. Pipeline runs but doesn't publish.
- **D-08:** `npm run pipeline` for running pipeline without server (cron simulation).

### Express Skeleton
- **D-09:** Use `process.env.PORT || 3000` (required by Render).
- **D-10:** Health check on `GET /health` returning 200 — Render monitors this.

### Claude's Discretion
- Package.json scripts naming
- ESM vs CJS module format
- Linting/formatting setup (if any)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `.planning/PROJECT.md` — Full project scope, constraints, key decisions
- `.planning/REQUIREMENTS.md` — F3.1 (env vars), F3.2 (Render setup), F3.3 (local dev), F3.4 (spend protection)

### Research
- `.planning/research/pipeline.md` — Library versions (all verified live on npm 2026-03-29), ssh2-sftp-client v12.1.1, telegraf v4.16.3, @google/genai v1.47.0
- `.planning/research/deployment.md` — render.yaml structure, env var patterns, sharp vs ImageMagick, PORT requirement
- `.planning/research/content-generation.md` — Context trimming strategy, token estimates

### Site Files (read to understand config loader targets)
- `.seo-engine/config.yaml` — Site identity
- `.seo-engine/data/content-queue.yaml` — Article queue format
- `.seo-engine/data/content-map.yaml` — Map format (needs trimming)
- `assets/js/config.js` — Prices/contact section to extract

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` exists at repo root with `terser` dependency — autopilot/ gets its own package.json
- `.seo-engine/` data files — config loader reads these, does not modify structure

### Established Patterns
- Static HTML site with no build step — autopilot/ is a separate Node.js app that lives alongside
- `config.js` → `config.min.js` regeneration via `npx terser` — pipeline will need to call this

### Integration Points
- `SITE_BASE_PATH` env var points autopilot → site files
- Render web service already exists — autopilot deploys as addition to it

</code_context>

<specifics>
## Specific Ideas

- Gemini model name (`gemini-2.5-flash-image`) needs verification via `curl` to the models endpoint — this is a Phase 1 success criterion and a blocker for Phase 3
- Render is already set up with web service and env vars — Phase 1 just needs the code, not infra setup

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-scaffolding*
*Context gathered: 2026-03-29*
