# Phase 12: Dashboard Audit Tab - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a new "Audit SEO" tab to the existing Alpine.js dashboard. The tab surfaces all page health scores, ranking-drop alerts (Chutes), an in-row drill-down panel with issue details and patch generation, and Approve/Reject buttons for pending patches. Five new backend API routes are added to routes/api.js. No new CSS framework — extend existing Tailwind utility classes only.

</domain>

<decisions>
## Implementation Decisions

### Master Health Grid Layout
- 5-column table: Slug / Score badge (color-coded) / Issues (critical + warning chips) / Last scanned / "Générer patch" action button
- In-row drill-down expansion using `selectedAuditSlug` toggle — same Alpine.js pattern as article queue (`selectedArticle`)
- Default sort: score ascending (worst pages first) — most actionable
- "Run Audit" button in the section header (top-right), same position as "Rédiger un article" in the queue tab

### Drill-down Panel & Patch Preview
- Single "Générer un patch" button in drill-down header — visible only when page has auto-patchable issues (not on never-auto-apply pages)
- Patch preview: `<pre>` block with `highlight.js` syntax highlighting of the HTML snippet (just the generated snippet, not a full diff)
- Issues grouped by severity: 🔴 Critical → 🟡 Warning → ✅ Healthy with badge chips
- Approve/Reject buttons at bottom of drill-down: Approve (blue primary) / Reject (gray secondary) — same row layout as article queue

### Backend API Routes (all in routes/api.js)
- `GET /api/audit` — returns all page scores from `state/page-audit.json`
- `GET /api/audit/:slug` — returns single page detail including `pendingPatch` field
- `POST /api/audit/:slug/patch` — triggers patch generation via `generatePatch()`
- `POST /api/audit/run` — triggers `runAudit()` (manual audit trigger)
- `DELETE /api/audit/:slug/patch` — removes `pendingPatch` from `page-audit.json` (Reject flow)
- All routes extend existing `routes/api.js` (consistent with codebase pattern)

### Claude's Discretion
- Highlight.js: use CDN (same pattern as Chart.js / D3 already loaded via CDN)
- `avgSeoScore` in stats row: computed as mean of all page scores from `page-audit.json` (already declared at line 210)
- Tab highlight when critical issues exist: red dot badge on sidebar tab item (same pattern as pending notification badge)
- SSE `audit-complete` event: update health grid data without full reload (same pattern as `pipeline` event)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `$store.nav.tab` toggle system — `@click="$store.nav.tab = 'audit'"` in sidebar
- `selectedAuditSlug` pattern from article queue's row expansion (replicate `selectedArticle`)
- SSE `evtSource.onmessage` handler (line ~920) — add `msg.type === 'audit-complete'` case
- Status badge CSS classes: `statusBadgeClass()` helper pattern → replicate as `scoreBadgeClass(score)`
- Pending count badge pattern (sidebar dot) → replicate for critical issue count

### Established Patterns
- Alpine.js `x-data="auditPanel()"` component registered in `alpine:init`
- `fetch('/api/audit', { credentials: 'include' })` for authenticated requests
- Loading skeleton: `<span class="block w-12 h-6 bg-[#21262d] rounded animate-pulse" x-show="loading">`
- Color scheme: `#0d1117` bg, `#161b22` card surfaces, `border-radius: 12px`, `#3b82f6` blue accents

### Integration Points
- `autopilot/dashboard/index.html` — add sidebar tab + audit view section + Alpine component
- `autopilot/routes/api.js` — add 5 new audit routes
- `autopilot/state/page-audit.json` — read by `GET /api/audit` and `GET /api/audit/:slug`
- `autopilot/state/audit-status.json` — read by `GET /api/audit` for Chutes section
- `autopilot/audit/runner.js` — called by `POST /api/audit/run`
- `autopilot/audit/patch-generator.js` — called by `POST /api/audit/:slug/patch` (Phase 11)
- `autopilot/routes/api.js` line 210: `avgSeoScore` field in `/api/stats` response — populate from `page-audit.json`

</code_context>

<specifics>
## Specific Ideas

- The "Audit SEO" tab sits between Rankings and Link Tree in the sidebar (per ROADMAP success criteria)
- Tab highlighted (accent color + optional red dot) when last audit found critical issues
- `highlight.js` loaded via CDN for patch preview syntax coloring
- Score thresholds: ≥80 green, 60–79 amber, <60 red (matching existing severity tiers from Phase 9)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
