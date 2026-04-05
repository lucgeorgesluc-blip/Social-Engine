# Phase 9: Audit Foundation - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Build the audit foundation: page inventory (buildPageInventory), signal extractor (extractPageSignals via cheerio), and page scorer (scorePageHealth, 100pt model) as pure Node.js ESM modules with tests. These modules are the prerequisite for ALL suggestion logic — no patch, comparison, or suggestion can run without first calling buildPageInventory(). Output written to state/page-audit.json (slug-keyed).

</domain>

<decisions>
## Implementation Decisions

### Module Structure
- New directory: `autopilot/audit/` (not inside pipeline/ — audit is a separate concern)
- `audit/page-inventory.js` — buildPageInventory(), pageExists(slug)
- `audit/signal-extractor.js` — extractPageSignals(slug, inventoryEntry)
- `audit/page-scorer.js` — scorePageHealth(signals) → {score, issues[]}
- `audit/runner.js` — runAudit(slugs?) orchestrator, writes state/page-audit.json

### Signal Extraction Rules
- Use cheerio for all HTML parsing (npm install cheerio in autopilot/)
- JSON-LD: scan FULL file (not head-only) — site has schemas in both head and body
- Word count: body text after removing nav/header/footer/script/style
- Internal links: classify via Node.js URL API against SITE_BASE_PATH domain

### Scoring Model (100pts)
- Schema present (LocalBusiness or HealthAndBeautyBusiness): 25pts
- Word count ≥ 400: 25pts
- FAQPage schema present: 15pts
- E-E-A-T signal (AggregateRating OR review container): 15pts
- Internal links in ≥ 1: 10pts
- Meta description 120–160 chars: 10pts
- Severity: green ≥80, yellow 50–79, red <50

### State File
- Path: autopilot/state/page-audit.json
- Slug-keyed object: {score, issues[], signals, previousSignals, diff, lastScanned}
- Deterministic: two consecutive scans of unchanged page → identical scores

### Claude's Discretion
All other implementation details (error handling, logging patterns, test structure) follow existing codebase conventions in autopilot/pipeline/*.js

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- pino logger pattern from autopilot/pipeline/*.js
- State file write pattern from autopilot/state/pipeline-status.json
- SITE_BASE_PATH env var from routes/api.js
- existsSync, readFileSync from node:fs (already used throughout)

### Established Patterns
- ESM modules with named exports
- pino({ name: 'module-name' }) for logging
- join(dirname(fileURLToPath(import.meta.url)), '...') for paths
- State files: plain JSON, written atomically

### Integration Points
- autopilot/package.json: add cheerio dependency
- autopilot/state/: new page-audit.json
- Will be imported by Phase 10 ranking-trigger.js and Phase 11 patch-generator.js

</code_context>

<specifics>
## Specific Ideas

- buildPageInventory() must normalize slugs: strip .html, strip blog/ prefix
- pageExists(slug) must be callable from any module as a boolean guard
- Signal extractor must handle pages with multiple JSON-LD blocks gracefully
- Issues array must use French language strings (site is French)

</specifics>

<deferred>
## Deferred Ideas

- Cannibalization detection → Phase 10
- Patch generation → Phase 11
- Dashboard UI → Phase 12

</deferred>
