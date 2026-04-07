# Phase 3: Write Operations - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 makes the dashboard fully actionable: mark comments handled, convert INFO comments to prospects in one click, advance DM pipeline stages, create and edit posts, copy post content to clipboard, and input weekly metrics. Every write operation uses standard HTML form POST with session flash feedback and PRG redirect — no AJAX, no JS framework.

</domain>

<decisions>
## Implementation Decisions

### Action UX Pattern
- All write actions use standard HTML form POST — consistent with Express/EJS stack, no AJAX complexity
- Success/error feedback via session-based flash messages: `req.session.flash = { type, message }` read on redirect, cleared after display
- Irreversible actions (stage→CONVERTI, stage→LOST) guarded by browser `confirm()` — no custom modal
- Post-action: PRG pattern — always redirect back to same page after POST, prevents double-submit

### Post Management
- Create/edit on dedicated pages: `GET /posts/new` → create form, `GET /posts/:id/edit` → edit form
- No auto-save — explicit "Enregistrer brouillon" and "Publier" buttons only
- Status transitions via explicit buttons per allowed path: Draft → Scheduled (with date), Scheduled → Published
- Delete = soft delete: set `status = 'archived'`, hidden from default list filter

### DM Stage & Comments & Clipboard
- INFO comment → prospect: one-click POST button in comment row (`/comments/:id/convert`) — creates prospect record instantly, no form
- Weekly metrics input: form on `/stats` page with number inputs per KPI, single "Enregistrer" button, redirects back
- DM stage advancement: `<button>Passer au suivant</button>` on each pipeline card; `confirm()` only for CONVERTI and LOST transitions
- Clipboard copy: button text → `"Copié ✓"` for 2 seconds via vanilla JS (already in `dashboard.js`), no library

### Claude's Discretion
- Flash message display component placement in layout.ejs vs per-view
- Exact SQL for stage advancement (UPDATE prospects SET stage = ?, updated_at = NOW())
- Form validation approach (server-side only, redirect with error flash)
- Prospect record fields auto-populated on INFO conversion (name from comment author, post_id, initial notes)
- `dashboard.js` clipboard handler implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/routes/auth.js` — `isAuthenticated` middleware for all write routes
- `dashboard/lib/db.js` — `query()` helper, used in every existing route
- `dashboard/views/layout.ejs` — shell with sidebar; add flash banner slot here
- `dashboard/public/js/dashboard.js` — vanilla JS already present; add clipboard handler here
- `dashboard/routes/posts.js` — existing GET routes to extend with POST handlers
- `dashboard/routes/comments.js` — existing GET route to extend with POST /convert
- `dashboard/routes/pipeline.js` — existing GET route to extend with POST /advance
- `dashboard/routes/stats.js` — existing GET route to extend with POST /metrics

### Established Patterns
- Route handler: `async (req, res, next)` with `try/catch` calling `next(err)`
- SQL: `await query(sql, [params])` returning `{ rows }`
- Auth guard: `router.use(isAuthenticated)` or per-route
- Redirect: `res.redirect('back')` or specific path after POST
- Flash pattern (to add): `req.session.flash = { type: 'success'|'error', message: '...' }` → read in layout.ejs
- Phase 2 tests use `Module._load` mock (no real DB) — follow same pattern for Phase 3 tests

### Integration Points
- `layout.ejs`: add flash banner (reads `res.locals.flash` set by middleware)
- All POST routes registered in same router files as GET routes
- Phase 2 Tailwind CSS may need rebuild for new form/button classes

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what was decided — open to standard approaches for implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>
