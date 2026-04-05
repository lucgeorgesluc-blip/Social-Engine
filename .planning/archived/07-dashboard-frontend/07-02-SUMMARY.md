---
phase: 07-dashboard-frontend
plan: 02
subsystem: autopilot/dashboard
tags: [chart-js, d3, alpine-js, dashboard-spa, rankings, link-tree, modal]
requires:
  - phase: 07-01
    provides: Dashboard SPA shell with stub rankingsPanel and linksPanel, approving Set logic
provides:
  - autopilot/dashboard/index.html — fully functional dashboard with Chart.js rankings panel, D3 link tree, and approve confirmation modal
affects:
  - Phase 7 checkpoint human-verify (rankings chart + D3 tree ready for smoke test)
tech-stack:
  added:
    - Chart.js 4.5.1 (already in CDN from 07-01, now fully wired)
    - chartjs-adapter-date-fns 3.0.0 (time axis, already in CDN)
    - chartjs-plugin-annotation 3.1.0 (publish date vertical dashed lines)
    - D3 v7.9.0 (already in CDN from 07-01, now fully wired)
  patterns:
    - Chart.js time axis with reverse:true Y for rankings (position 1 at top)
    - D3 horizontal tree with d3.linkHorizontal + d3.tree().nodeSize
    - _children collapse pattern with _collapsed flag for D3 re-hierarchy
    - Client-side orphan detection via inboundCount map traversal
    - Alpine store _confirmModal for cross-component modal state
    - Window event listeners for modal confirm/cancel (dispatched via Alpine $dispatch)
key-files:
  modified:
    - autopilot/dashboard/index.html
key-decisions:
  - "Single commit for all three tasks — all changes were in index.html and staged together; commit bccacb5 covers Tasks 1-3"
  - "Modal uses Alpine $dispatch + window.addEventListener pattern to bridge dashboardApp and the modal overlay"
  - "D3 update() re-calls d3.hierarchy() on each render; _collapsed flag on raw data object persists across hierarchy rebuilds"
  - "Rankings panel destroys existing chart before creating new one to prevent canvas reuse errors"
metrics:
  duration: ~15min
  tasks_completed: 3
  files_modified: 1
  completed: "2026-03-30"
requirements:
  - F2.1
  - F2.2
  - F2.3
---

# Phase 7 Plan 2: Rankings Chart.js Panel + D3 Link Tree + Approve Modal Summary

Chart.js v4 rankings line chart (inverted Y, time selector, annotation markers), D3 v7 horizontal hierarchy tree (colored nodes, collapsible branches, click-highlight), and approve confirmation modal replacing window.confirm — all implemented in a single HTML file via surgical Edit tool modifications.

## Duration

- **Start:** 2026-03-30T23:15:00Z
- **End:** 2026-03-30T23:32:47Z
- **Duration:** ~18 minutes
- **Tasks completed:** 3/3
- **Files modified:** 1

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rankings Chart.js panel — time selector + annotation markers | bccacb5 | autopilot/dashboard/index.html |
| 2 | D3 v7 link tree — colored nodes, collapse, link highlighting | bccacb5 | autopilot/dashboard/index.html |
| 3 | Approve confirmation modal — replaces direct POST | bccacb5 | autopilot/dashboard/index.html |

## What Was Built

### Task 1: Rankings Chart.js Panel

Replaced the `rankingsPanel` stub with a full Chart.js v4 implementation:

- **Time selector buttons** (7j/30j/90j) in the card header — clicking calls `setPeriod(p)` which destroys the existing chart, updates `this.period`, and re-fetches `/api/rankings?period=X`
- **Chart.js line chart** on `<canvas id="rankingsChart">` with:
  - `type: 'time'` X-axis with `displayFormats: { day: 'dd MMM' }` (French locale via chartjs-adapter-date-fns)
  - `reverse: true` Y-axis (position 1 displayed at top) with title "Position Google"
  - One dataset per keyword from `data.keywords`, 6-color palette cycling
  - Dark theme: `rgba(48, 54, 61, 0.8)` grid lines, `#7d8590` ticks
- **Annotation markers**: vertical dashed lines at publish dates via chartjs-plugin-annotation, labels truncated to 20 chars
- **States**: loading spinner (flexbox centered), error state ("Données GSC non disponibles"), empty state (no GSC data yet)
- **Keyword legend pills** row below canvas — color dot + keyword text + current position badge

### Task 2: D3 v7 Link Tree Panel

Replaced the `linksPanel` stub with full D3 horizontal tree:

- **Horizontal layout**: `d3.tree().nodeSize([28, 200])` + `d3.linkHorizontal().x(d => d.y).y(d => d.x)`
- **Node colors**: pillar `#f59e0b` (gold), service `#3b82f6` (blue), blog `#06b6d4` (cyan), orphan `#ef4444` (red)
- **Orphan detection**: client-side `countInbound()` traversal builds inbound count map from raw JSON `links_to` arrays; nodes with `count === 0` AND `type !== 'pillar'` AND `type !== 'root'` are orphans
- **Collapse/expand**: click a node with children → sets `d.data._collapsed = true`, stores children in `d._children`; `update()` re-calls `d3.hierarchy()` and restores state from `_collapsed` flag
- **Click highlight**: stores `selectedSlug`; connected edges turn `#3b82f6` stroke-width 2, others fade to opacity 0.1; clicking same node deselects; clicking SVG background resets
- **Zoom**: `d3.zoom().scaleExtent([0.3, 3])` on SVG
- **Legend**: 4 color dots (Pilier/Service/Article/Orphelin) below treeContainer
- **Error/loading states**: centered spinner or error message

### Task 3: Approve Confirmation Modal

Replaced the direct POST in `approve()` with a two-step confirmation flow:

- **Modal HTML**: fixed overlay (`z-50`, `bg-black/60`), centered card with article title, "Confirmer le déploiement ?" message, "Annuler" + "Déployer" buttons
- **Alpine store**: `_confirmModal: { open: false, slug: null, title: '' }` added to `Alpine.store('nav')`
- **`approve(slug)`**: opens modal with article title, registers one-shot `window` event listeners for `confirm-approve` and `cancel-approve` (dispatched by modal buttons via Alpine `$dispatch`)
- **`confirmApprove()`**: closes modal, runs original POST to `/api/articles/:slug/approve`, optimistic update (badge → 'published'), decrements `pendingCount`
- **`cancelApprove()`**: closes modal, no API call
- All existing `approving` Set and optimistic update logic preserved

## Verification Results

37 tests pass across 10 suites — no regression:

```
ok 1  - writeActivityEvent (4 subtests)
ok 2  - readRecentActivity (4 subtests)
ok 3  - formatActivity (6 subtests)
ok 4  - writePipelineStatus (4 subtests)
ok 5  - GET /api/articles — article status mapping (3 subtests)
ok 6  - GET /api/links — buildLinkTree() (3 subtests)
ok 7  - GET /api/rankings — getRankings() (3 subtests)
ok 8  - isAuthenticated (4 subtests)
ok 9  - loginHandler (4 subtests)
ok 10 - logoutHandler (2 subtests)

# tests 37 / pass 37 / fail 0
```

Content checks all pass:
```
rankings OK
links OK
modal OK
chartjs CDN OK
d3 CDN OK
```

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Notes

- The plan task description mentions fetching `/api/articles` separately for publish date annotations in the rankings chart. The API response from `/api/rankings` already includes `publishDates` in its response shape (per the interfaces section), so no second fetch to `/api/articles` was needed for annotations. The `renderChart(data)` function uses `data.publishDates` directly from the rankings response. This matches the interface spec and avoids an unnecessary API call.

- All three tasks were staged and committed together (single `git add dashboard/index.html`) since all changes were to the same file. Commit `bccacb5` covers Tasks 1, 2, and 3.

## Known Stubs

None. All stubs from Plan 01 (`rankingsPanel` and `linksPanel`) have been replaced with full implementations. The dashboard is complete.

## Self-Check: PASSED

- `autopilot/dashboard/index.html` exists: YES
- `grep -q "rankingsPanel" index.html`: YES
- `grep -q "linksPanel" index.html`: YES
- `grep -q "_confirmModal" index.html`: YES
- `grep -q "renderChart" index.html`: YES
- `grep -q "renderTree" index.html`: YES
- `grep -q "confirmApprove" index.html`: YES
- `grep -q "reverse: true" index.html`: YES (Y-axis inverted)
- `grep -q "d3.linkHorizontal" index.html`: YES
- Commit bccacb5 exists: YES
- All 37 tests pass (node --test): YES
