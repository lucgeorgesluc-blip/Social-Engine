# Phase 11: Patch Generator + Validator + Apply - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Given an audit result (from Phase 9/10), generate a targeted HTML patch via Claude API, validate it passes 8 safety checks, and apply it through the existing SFTP deploy flow with a timestamped backup and rollback. No new frontend work — the API endpoints expose this to Phase 12's dashboard tab. Three modules: patch-generator.js, patch-validator.js, and apply flow wired into routes/api.js.

</domain>

<decisions>
## Implementation Decisions

### Patch Generation Input & Format
- Claude receives: audit signals + existing schema/head excerpt + config.js schema data (NOT full page HTML — token efficiency: skip 10K+ body tokens)
- Claude outputs: targeted HTML snippet(s) to inject (e.g., the JSON-LD block to add/replace) — NOT the full page
- Cheerio applies the snippet at the correct DOM location (head for schema, end of body for FAQ)
- 1 pending patch per slug — new audit overwrites previous pendingPatch in audit-results.json
- Module lives at: `autopilot/audit/patch-generator.js` (keeps all audit logic together)

### Apply Flow & Rollback
- "One-command rollback" = `POST /api/audit/:slug/rollback` API endpoint (accessible from dashboard, no terminal needed)
- Backup retention: keep last 3 backups per slug at `state/backups/[slug]-[timestamp].html` (auto-prune oldest)
- SFTP failure recovery: restore local backup + alert via SSE (local and remote always in sync — never diverge)
- SSE events: emit `audit-patch-applied` / `audit-patch-failed` on existing `/api/events` stream

### Claude's Discretion
- Never-auto-apply list enforcement (aggregateRating, canonical changes, H1/title changes, robots meta, multi-file patches) — routes to human review, never to auto-apply
- Patch storage: `pendingPatch` field in `audit-results.json["pages"][slug]` (F4.6 spec)
- Apply endpoint: `POST /api/audit/:slug/apply` reads pendingPatch, validates, writes, deploys (F4.8 spec)
- Validator 8 checks as specified in F4.7 requirements

### Test Structure
- Fixture HTML files in `tests/fixtures/patches/` — one per check scenario (readable + maintainable)
- Separate test files: `tests/patch-generator.test.js` + `tests/patch-validator.test.js`
- Mock `client.messages.create()` in generator tests (no real API calls in CI)
- 1 happy-path integration test: generate → validate → apply → backup created + local file patched (no SFTP in test)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `autopilot/audit/runner.js` — runAudit(), reads/writes audit-results.json
- `autopilot/audit/page-inventory.js` — buildPageInventory(), pageExists()
- `autopilot/pipeline/deploy-orchestrator.js` — triggerDeploy(), deployFiles() pattern to reuse
- `autopilot/pipeline/sftp-deployer.js` — deployFiles() — exact same SFTP flow for patch deploy
- `autopilot/routes/api.js` — extend with new /api/audit/:slug/apply + /api/audit/:slug/rollback routes
- Existing SSE stream at `/api/events` — emit new event types for patch lifecycle
- `autopilot/config/constants.js` — shared constants
- Anthropic SDK already in package.json (used by pipeline/generator.js)

### Established Patterns
- ESM named exports, pino({ name: 'module-name' }) logging
- DI via `_underscore` params for testability
- `node --test tests/*.test.js` test runner
- State files in `autopilot/state/` as plain JSON, written atomically
- Cheerio already in package.json (used by audit/signal-extractor.js)

### Integration Points
- `audit-results.json` — add `pendingPatch` field per slug, cleared on apply
- `state/backups/` — new subdirectory for pre-patch HTML backups
- `routes/api.js` — add apply + rollback + (Phase 12) read endpoints
- SSE `/api/events` — new event types: `audit-patch-applied`, `audit-patch-failed`, `audit-patch-generated`

</code_context>

<specifics>
## Specific Ideas

- Token efficiency is a priority for patch generation — send minimal context to Claude, not full page HTML
- The 8 validator checks are pre-specified in F4.7 (no new checks to design)
- Rollback must be API-accessible (dashboard button in Phase 12, not CLI only)
- Backup auto-pruning: keep last 3 per slug to prevent disk accumulation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
