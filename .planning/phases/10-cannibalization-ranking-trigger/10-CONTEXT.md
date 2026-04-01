# Phase 10: Cannibalization + Ranking Trigger - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Wire the Phase 9 audit engine into two automated triggers: (1) a cannibalization detector that finds page pairs competing for the same French keywords using Jaccard similarity, and (2) an fs.watch ranking-drop watcher that triggers runAudit() when any keyword falls ≥5 positions. Expose the audit results via two authenticated Express API routes. No frontend work — this phase is pure backend plumbing.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Key constraints from ROADMAP:
- `detectCannibalization()` uses Jaccard similarity ≥ 0.15 on accent-normalised French tokens (NFD + strip combining chars), stopwords in `autopilot/config/fr-stopwords.js`
- `cluster_id` first-pass from `content-map.yaml` groups same-cluster pairs ahead of cross-cluster pairs
- Ranking watcher uses `fs.watch` + 150ms debounce (same pattern as Phase 6 SSE watcher)
- API routes behind existing session auth middleware
- State files: `state/audit-results.json` (full audit), `state/audit-status.json` (trigger metadata)
- New plans: 10-01-PLAN.md (detectCannibalization + tests), 10-02-PLAN.md (watcher + routes + server wiring)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `autopilot/audit/runner.js` — runAudit(slugs?) from Phase 9
- `autopilot/audit/page-inventory.js` — buildPageInventory(), pageExists()
- Phase 6 SSE watcher pattern — fs.watch + debounce for ranking-drop trigger
- Existing session auth middleware in server.js

### Established Patterns
- ESM named exports, pino logging, DI via `_underscore` params
- `node --test tests/*.test.js` for test runner
- State files in `autopilot/state/`

### Integration Points
- `server.js` — add GET /api/audit and GET /api/audit/:slug routes
- `state/live-rankings-history.json` — watched for ≥5 position drops
- `state/audit-results.json` and `state/audit-status.json` — written by watcher

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
