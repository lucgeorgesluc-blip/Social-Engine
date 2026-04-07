# Phase 2: Read Layer - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers a fully readable dashboard: the operator can see today's priority inbox (scheduled posts, unresponded comments, overdue DM follow-ups), browse all posts filtered by status, view a content calendar, see all comments grouped by post, navigate a DM pipeline with conversion funnel, and view stats — all read-only. Nothing is writable yet.

</domain>

<decisions>
## Implementation Decisions

### Homepage Priority Inbox
- 3 stacked cards with section headers + count badges — consistent with existing Phase 1 card pattern (`bg-white rounded-xl shadow-sm border border-gray-100 p-6`)
- Overdue items highlighted with red count badge + `border-l-4 border-red-500` on the card
- Compact density: count + top 3–5 items per section with "Voir tout →" link to the full section page
- Empty state: minimal `"Aucun élément en attente"` in grey text — no illustrations

### Post List & Content Calendar
- Post list as a table with columns: Date, Titre, Statut, Nb commentaires
- Tab bar filter above table: Tous / Brouillons / Planifiés / Publiés
- Calendar as monthly grid — click on a day to show that day's posts below; no drag-drop (read-only)
- Post detail on click: inline expand row showing post preview text + comment count (no modal)

### Comment List & DM Pipeline
- Comments grouped by post — accordion with post title as header, each comment as a row; overdue badge on group header
- DM pipeline as horizontal kanban columns: INFO → CHAUD → RDV_PRÉVU → CONVERTI with prospect name + last contact date
- Conversion funnel shown as % bar between kanban stages in the pipeline page header (e.g., INFO → CHAUD: 40%)
- Comment status: colored dot per row — grey = non-répondu, green = répondu, orange = en retard (>2h)

### Claude's Discretion
- Exact SQL queries for aggregating counts per section
- Pagination strategy for comment/post tables
- JS implementation for accordion and inline expand (vanilla JS, no framework)
- Tailwind class selection within established pattern (bg-white, rounded-xl, shadow-sm, border-gray-100)
- Route file structure for new views (posts, commentaires, pipeline, calendar)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/views/layout.ejs` — full shell with sidebar (w-60), mobile hamburger, main content area (md:ml-60). Use as-is.
- `dashboard/views/dashboard.ejs` — existing homepage with DB status card + 3-stat chips. Will be extended for Phase 2 inbox sections.
- `dashboard/routes/auth.js` — auth middleware available for all new routes
- `dashboard/routes/dashboard.js` — existing route pattern to follow for new routes
- `dashboard/public/css/tailwind.css` — pre-built Tailwind, may need rebuild for new classes (grid, line-through, etc.) — per feedback_tailwind_gaps.md

### Established Patterns
- Card pattern: `bg-white rounded-xl shadow-sm border border-gray-100 p-6`
- Stat chips: `bg-gray-50 rounded-lg px-4 py-3 text-center` with `text-2xl font-bold text-secondary`
- Brand colors: `text-secondary` (dark green), `text-primary` / `border-primary` (terracotta)
- Left accent border for active/alert states: `border-l-4 border-primary` (or `border-red-500` for overdue)
- All UI text in French
- EJS templating with `<%- body %>` injection via layout.ejs
- Sidebar nav items unlock per phase: remove `pointer-events-none text-white/40` + "Bientôt" badge, add `href`

### Integration Points
- New routes added to `dashboard/server.js` (or via `app.use()` with route files in `dashboard/routes/`)
- Nav items in `layout.ejs`: Posts, Commentaires, Pipeline, Statistiques — change from `<span>` to `<a href="...">` as each view is implemented
- DB queries via `pg` pool — same pattern as existing health check in dashboard.js route
- Phase 2 has 3 existing PLAN.md files — planner should use these as the execution guide

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what was decided above — open to standard approaches for the implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>
