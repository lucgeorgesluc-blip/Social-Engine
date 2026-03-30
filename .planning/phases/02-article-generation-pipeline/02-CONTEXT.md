# Phase 2: Article Generation Pipeline - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end pipeline that: picks the highest-priority planned article from content-queue.yaml, runs a cannibalization check, calls Claude API to generate a validated HTML article, updates all site files (blog/[slug].html, config.js + config.min.js, sitemap.xml, .seo-engine data files), and logs token costs — all runnable locally with `--dry-run`. No SFTP deploy, no Telegram (those are Phase 4/5).

</domain>

<decisions>
## Implementation Decisions

### Claude Prompt Strategy
- **D-01:** Single mega-prompt — one large system prompt with all context injected. Simpler to debug, Claude handles structure internally.
- **D-02:** Streaming — use streaming API (`@anthropic-ai/sdk` streaming) to avoid timeout on long articles (4000+ tokens). Required for production reliability.
- **D-03:** Model: `claude-sonnet-4-5` — best cost/quality ratio for long-form HTML generation.

### Validation Strictness
- **D-04:** Abort + log on failure, no retry. Log exactly which checks failed, exit cleanly. A failing article means a prompt issue — fix the prompt, re-run. Retries waste tokens.
- **D-05:** 6 validation checks (from success criteria):
  1. Starts with `<!DOCTYPE html>`
  2. No hard prices (no `€` or digit+€ patterns)
  3. No mention of `rTMS`
  4. Has `data-price=` attribute (presence only — value not validated in Phase 2)
  5. Has FAQPage schema (`"@type": "FAQPage"`)
  6. Has `data-blog-list="related"`
  7. Has canonical tag (`<link rel="canonical"`)
- **D-06:** `data-price=` check: presence only — attribute must exist, slug value not validated in Phase 2.

### File Update Ordering
- **D-07:** Order on success: `blog/[slug].html` → `assets/js/config.js` + `config.min.js` → `sitemap.xml` → `.seo-engine` data files (content-queue.yaml, content-map.yaml, changelog.md) → `autopilot/logs/cost.jsonl`
- **D-08:** On mid-sequence failure: log which step failed, stop. No rollback. Phase 2 is local dry-run only — manual correction is acceptable. Full rollback deferred to later phase.

### Article Selection Logic
- **D-09:** Select highest-priority `status: planned` article from content-queue.yaml. Tie-break: first in file order (deterministic, no extra logic).
- **D-10:** Cannibalization check: exact slug match only — check if the target keyword already exists as a slug in content-map.yaml slug+title pairs. Semantic similarity deferred to later phase.

### Inherited from Phase 1
- **D-11:** ESM throughout — all pipeline files use `import`/`export` (package.json has `"type": "module"`)
- **D-12:** `SITE_BASE_PATH` env var for all file paths relative to the site root
- **D-13:** `MAX_ARTICLES_PER_RUN = 1` from `constants.js` — pipeline enforces this; a second call in the same run is blocked
- **D-14:** Fresh file reads every run — no caching, no file-watching

### Claude's Discretion
- Internal pipeline module structure (how to split pipeline.js into sub-modules)
- Exact prompt wording and context injection format
- Error message formatting in logs
- cost.jsonl schema (as long as it captures tokens + estimated USD)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Site Config & Instructions
- `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — Mandatory checklist for every new article (structure, required elements, HTML patterns)
- `assets/js/config.js` — Source of truth for prices, SITE_CONFIG.blog array structure, how to prepend new entries
- `TEMPLATE_article-blog.md` — Article HTML template to follow

### SEO Engine Data Files
- `.seo-engine/config.yaml` — Site identity, author, trust signals
- `.seo-engine/templates/tone-guide.md` — Style + E-E-A-T rules (injected into prompt)
- `.seo-engine/templates/blog-structures.yaml` — Article outline templates by type
- `.seo-engine/data/content-queue.yaml` — Article queue (source of article selection)
- `.seo-engine/data/content-map.yaml` — Existing articles (used for cannibalization check + related articles)
- `.seo-engine/data/seo-keywords.csv` — Keyword data (3-5 rows for target keyword injected into prompt)

### Phase 1 Outputs
- `autopilot/config/loader.js` — Config loader pattern (SITE_BASE_PATH usage, content-map trimming)
- `autopilot/config/constants.js` — MAX_ARTICLES_PER_RUN = 1 enforcement

### Requirements
- `.planning/REQUIREMENTS.md` — F1.1 (article generation), F1.2 (validation), F1.3 (file updates), F1.4 (cost logging), F1.5 (spend protection), F1.10 (dry-run mode)
- `CLAUDE.md` — Project SEO rules (no rTMS, data-price= usage, config.js update pattern, terser rebuild)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `autopilot/config/loader.js` — Already reads all 8 context files; pipeline should call this at startup
- `autopilot/config/constants.js` — `MAX_ARTICLES_PER_RUN` already defined; pipeline imports and enforces
- `autopilot/server.js` — ESM + dotenv pattern to replicate in pipeline.js

### Established Patterns
- ESM imports with `import { config } from 'dotenv'; config()` at entry point
- `readFileSync(join(basePath, ...))` for all site file reads
- `js-yaml` for YAML parsing (already installed)
- `@anthropic-ai/sdk` streaming already in node_modules

### Integration Points
- `pipeline/run.js` is the entry point — called by `npm run pipeline` (already in package.json scripts)
- Config loader output feeds directly into prompt context assembly

</code_context>

<specifics>
## Specific Ideas

- `node autopilot/pipeline/run.js --dry-run` is the exact invocation (from success criteria)
- Token count + estimated USD must both be logged to `cost.jsonl` (not just tokens)
- `config.min.js` regenerated via `npx terser` after config.js update (per CLAUDE.md pattern)
- Validation log should name each failing check specifically (not just "validation failed")

</specifics>

<deferred>
## Deferred Ideas

- Semantic cannibalization check (similarity scoring) — too complex for Phase 2
- Retry logic on validation failure — deferred; fix the prompt instead
- Rollback on partial file update failure — deferred to a hardening phase
- data-price= slug value validation — deferred; presence check sufficient for Phase 2

</deferred>

---

*Phase: 02-article-generation-pipeline*
*Context gathered: 2026-03-30*
