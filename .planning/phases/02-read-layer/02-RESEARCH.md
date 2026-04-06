# Phase 2: Read Layer — Research

**Researched:** 2026-04-06
**Domain:** EJS multi-view server-rendered dashboard — SQL read queries, data display, calendar UI, funnel chart
**Confidence:** HIGH

<user_constraints>
## User Constraints (from Phase 1 decisions — no Phase 2 CONTEXT.md yet)

### Locked Decisions (inherited from Phase 1)
- **D-01:** Dashboard lives in `dashboard/` at repo root
- **D-02:** Fully independent `package.json` — no shared deps with autopilot or main site
- **D-03:** Stack: Node 20 + Express 4 + EJS + pg (raw SQL) + connect-pg-simple + bcrypt + Tailwind CSS v3
- **D-04:** Tailwind CSS v3 — own build in `dashboard/`, scoped to `dashboard/views/**/*.ejs`
- **D-05:** UI text in French
- **D-08:** Sidebar nav left, content right. Hamburger on mobile (375px)
- **D-09:** Phase 2 enables: Accueil, Posts, Commentaires, Pipeline, Statistiques nav items (previously disabled)
- **Stack confirmed CJS:** No ESM in dashboard

### Phase 2 Scope (Read-only)
- No CREATE / UPDATE / DELETE operations in this phase
- All pages are display-only — operator sees data, cannot yet modify it
- Write operations (marking comments handled, advancing prospects, etc.) are Phase 3

### Deferred Ideas (OUT OF SCOPE for Phase 2)
- Creating/editing posts (Phase 3)
- Marking comments as handled (Phase 3)
- Advancing DM prospects (Phase 3)
- Manual metric input (Phase 3)
- AI post generation (Phase 4)
- Facebook API auto-posting (Phase 5)
- Drag-and-drop calendar (Phase 3)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INBOX-01 | Homepage shows today's scheduled post(s) with publish status | SQL: posts WHERE scheduled_date = TODAY; EJS conditional rendering |
| INBOX-02 | Homepage shows count and list of unresponded comments needing action | SQL: comments WHERE response_status = 'pending'; EJS list render |
| INBOX-03 | Homepage shows DM follow-ups due with overdue items highlighted | SQL: prospects WHERE stage NOT IN ('booked','converted','lost'); date diff logic |
| INBOX-04 | Response time tracking flags comments older than 2h without response | SQL: comments WHERE response_status='pending' AND created_at < NOW() - INTERVAL '2 hours' |
| POST-01 | View all posts filterable by status (draft/scheduled/published) | SQL: posts WHERE status = $1; query param filter |
| POST-04 | View posts in weekly/monthly calendar view | SQL: posts with scheduled_date grouping; no heavy calendar library needed |
| CMT-01 | View comments listed by post, classified as info/objection/positive | SQL: comments JOIN posts ORDER BY post_id, date; EJS grouped render |
| DM-01 | View prospect cards with current stage | SQL: SELECT * FROM prospects ORDER BY date_first_contact DESC |
| DM-04 | Dashboard highlights overdue follow-ups based on DM sequence timing rules | SQL: stage-based date diff; sequence rules from .social-engine/config.yaml |
| DM-05 | Conversion funnel shows prospects at each stage with percentages | SQL: GROUP BY stage COUNT; percentage calculation in JS/EJS |
| STAT-02 | KPI dashboard displays key rates (engagement, INFO->DM, DM->Calendly, Calendly->Patient) | SQL: metrics_weekly + prospects aggregate; computed in route handler |
| STAT-03 | Visual funnel chart: reach -> comments -> DM -> Calendly -> patient | SQL: SUM from metrics_weekly + prospects stage counts |
</phase_requirements>

---

## Summary

Phase 2 adds 5 new EJS views on top of the Phase 1 shell: an enhanced homepage (priority inbox), a post list with status filter, a calendar view, a comments-by-post view, and a DM pipeline view with funnel. All data comes from read-only SQL queries against the same 4 tables Phase 1 already seeded. No new tables or schema changes are needed.

The primary technical work is: (1) writing the correct SQL queries for each view, (2) rendering grouped/filtered data in EJS, (3) implementing a lightweight calendar grid in pure HTML/Tailwind (no JS calendar library needed for a read-only view), and (4) building a CSS-only funnel chart (horizontal bar or step diagram using Tailwind width utilities).

The DM sequence timing rules live in `.social-engine/config.yaml` — the route handler must read these to compute overdue status (INBOX-03, DM-04). This is a one-time read at server start, not a per-request DB query.

**Primary recommendation:** Build each view as a dedicated Express route + EJS template. Keep all business logic (date diffs, percentage calculations, overdue detection) in the route handler — EJS templates receive pre-computed display values only. No client-side JS for data fetching.

---

## Standard Stack

### Core (all inherited from Phase 1 — no new deps needed)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| express | ^4.21.2 | Route handlers for each view | Already installed |
| ejs | ^5.0.1 | Server-rendered templates | Already installed |
| pg | ^8.20.0 | SQL read queries | Already installed |
| tailwindcss | ^3.4.19 | Calendar grid, funnel bars, status badges | Already installed |

### New Dependencies (Phase 2)

None required. All 5 views are achievable with the existing stack:
- Calendar grid: CSS Grid via Tailwind (`grid grid-cols-7`)
- Funnel chart: Tailwind width utilities (`w-[X%]` or inline style `width: X%`) — no chart library
- Date arithmetic: Node.js built-in `Date` object — no date library needed for simple diff calculations
- Status badges: Tailwind `bg-green-100 text-green-800` etc. — no badge library

**Installation:** No new `npm install` required for Phase 2.

---

## Architecture Patterns

### Route → View Map

```
GET /                    → views/home.ejs          (INBOX-01,02,03,04)
GET /posts               → views/posts.ejs          (POST-01)
GET /posts/calendar      → views/calendar.ejs       (POST-04)
GET /comments            → views/comments.ejs       (CMT-01)
GET /pipeline            → views/pipeline.ejs       (DM-01, DM-04, DM-05)
GET /stats               → views/stats.ejs          (STAT-02, STAT-03)
```

### Recommended File Structure Changes

```
dashboard/
├── routes/
│   ├── auth.js           # existing
│   ├── dashboard.js      # existing — extend with new routes
│   ├── posts.js          # NEW — GET /posts, GET /posts/calendar
│   ├── comments.js       # NEW — GET /comments
│   ├── pipeline.js       # NEW — GET /pipeline
│   └── stats.js          # NEW — GET /stats
├── views/
│   ├── layout.ejs        # existing — enable nav items
│   ├── login.ejs         # existing
│   ├── error.ejs         # existing
│   ├── home.ejs          # UPDATED (was dashboard.ejs) — add inbox sections
│   ├── posts.ejs         # NEW
│   ├── calendar.ejs      # NEW
│   ├── comments.ejs      # NEW
│   ├── pipeline.ejs      # NEW
│   └── stats.ejs         # NEW
└── lib/
    ├── db.js             # existing
    ├── seed.js           # existing
    ├── schema.sql        # existing
    └── dm-config.js      # NEW — loads .social-engine/config.yaml DM sequence rules
```

### Pattern 1: Route Handler — Pre-compute Display Values

Never put date arithmetic or percentage calculations in EJS. Compute everything in the route handler:

```javascript
// dashboard/routes/pipeline.js
const { query } = require('../lib/db');
const { getDmSequenceRules } = require('../lib/dm-config');

router.get('/pipeline', isAuthenticated, async (req, res, next) => {
  try {
    const rules = getDmSequenceRules(); // loaded once at startup
    const { rows: prospects } = await query(
      `SELECT * FROM prospects ORDER BY date_first_contact DESC`
    );

    // Compute overdue flag in JS, not in EJS
    const now = new Date();
    const prospectsWithFlags = prospects.map(p => {
      const daysSince = Math.floor((now - new Date(p.date_first_contact)) / 86400000);
      const dueDays = rules[p.stage]?.follow_up_after_days ?? null;
      return {
        ...p,
        isOverdue: dueDays !== null && daysSince > dueDays,
        daysSince
      };
    });

    // Funnel counts by stage
    const stageCounts = await query(
      `SELECT stage, COUNT(*) AS count FROM prospects GROUP BY stage`
    );

    res.render('pipeline', {
      prospects: prospectsWithFlags,
      stageCounts: stageCounts.rows,
      totalProspects: prospects.length
    });
  } catch (err) {
    next(err);
  }
});
```

### Pattern 2: Homepage Priority Inbox SQL

```javascript
// dashboard/routes/dashboard.js — updated GET /

// Today's posts (scheduled or published today)
const todayPosts = await query(`
  SELECT id, hook, status, platform, type, published_date
  FROM posts
  WHERE published_date = CURRENT_DATE
     OR (status = 'scheduled' AND published_date = CURRENT_DATE)
  ORDER BY created_at ASC
`);

// Unresponded comments (pending)
const pendingComments = await query(`
  SELECT c.*, p.hook AS post_hook
  FROM comments c
  LEFT JOIN posts p ON c.post_id = p.id
  WHERE c.response_status = 'pending'
  ORDER BY c.date ASC
`);

// Comments older than 2h without response (INBOX-04)
const overdueComments = await query(`
  SELECT id, author_name, comment_text, created_at
  FROM comments
  WHERE response_status = 'pending'
    AND created_at < NOW() - INTERVAL '2 hours'
  ORDER BY created_at ASC
`);

// DM follow-ups due (prospects not in terminal stage)
const activeDmProspects = await query(`
  SELECT * FROM prospects
  WHERE stage NOT IN ('booked', 'converted', 'lost')
  ORDER BY date_first_contact ASC
`);
```

### Pattern 3: Posts Filter by Status

```javascript
// dashboard/routes/posts.js
router.get('/posts', isAuthenticated, async (req, res, next) => {
  try {
    const { status } = req.query; // 'draft' | 'scheduled' | 'published' | undefined
    const validStatuses = ['draft', 'scheduled', 'published'];
    const filterStatus = validStatuses.includes(status) ? status : null;

    const { rows: posts } = await query(
      filterStatus
        ? `SELECT * FROM posts WHERE status = $1 ORDER BY COALESCE(published_date, created_at) DESC`
        : `SELECT * FROM posts ORDER BY COALESCE(published_date, created_at) DESC`,
      filterStatus ? [filterStatus] : []
    );

    res.render('posts', { posts, filterStatus });
  } catch (err) { next(err); }
});
```

### Pattern 4: Calendar View — SQL Grouping

```javascript
// dashboard/routes/posts.js
router.get('/posts/calendar', isAuthenticated, async (req, res, next) => {
  // Determine week/month from query params; default to current week
  const { view = 'week', date } = req.query;
  const anchor = date ? new Date(date) : new Date();

  // Compute date range
  const startOfWeek = new Date(anchor);
  startOfWeek.setDate(anchor.getDate() - anchor.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const { rows: posts } = await query(`
    SELECT id, hook, status, platform, type, published_date
    FROM posts
    WHERE published_date BETWEEN $1 AND $2
    ORDER BY published_date ASC
  `, [startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]]);

  // Group posts by date string for EJS rendering
  const postsByDate = {};
  posts.forEach(p => {
    const key = p.published_date?.toISOString?.().split('T')[0] || String(p.published_date);
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  });

  res.render('calendar', { view, postsByDate, weekStart: startOfWeek, weekEnd: endOfWeek });
});
```

### Pattern 5: Funnel Chart — CSS Only

No chart library. Use Tailwind width utilities with inline percentage style:

```html
<!-- views/pipeline.ejs — funnel bars -->
<% const stages = ['new', 'msg1_sent', 'msg2_sent', 'msg3_sent', 'booked', 'converted']; %>
<% const maxCount = Math.max(...stageCounts.map(s => parseInt(s.count))); %>
<% stages.forEach(stage => { %>
  <% const count = stageCounts.find(s => s.stage === stage)?.count || 0; %>
  <% const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0; %>
  <div class="flex items-center gap-3 mb-2">
    <span class="text-sm text-gray-600 w-28 text-right"><%= stage %></span>
    <div class="flex-1 bg-gray-100 rounded-full h-6 relative">
      <div class="bg-primary h-6 rounded-full transition-all" style="width: <%= pct %>%"></div>
    </div>
    <span class="text-sm font-semibold text-secondary w-8"><%= count %></span>
  </div>
<% }); %>
```

### Pattern 6: DM Sequence Rules — Load Once at Startup

```javascript
// dashboard/lib/dm-config.js
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

let _rules = null;

function getDmSequenceRules() {
  if (_rules) return _rules;
  try {
    const config = yaml.load(
      fs.readFileSync(
        path.resolve(__dirname, '../../.social-engine/config.yaml'), 'utf8'
      )
    );
    _rules = config.dm_sequence?.stages || {};
  } catch (e) {
    console.error('[dm-config] Could not load config.yaml:', e.message);
    _rules = {};
  }
  return _rules;
}

module.exports = { getDmSequenceRules };
```

### Pattern 7: Comments Grouped by Post

```javascript
// dashboard/routes/comments.js
const { rows: comments } = await query(`
  SELECT c.*, p.hook AS post_hook, p.status AS post_status
  FROM comments c
  LEFT JOIN posts p ON c.post_id = p.id
  ORDER BY c.post_id ASC, c.date ASC
`);

// Group in JS for EJS rendering
const byPost = {};
comments.forEach(c => {
  if (!byPost[c.post_id]) {
    byPost[c.post_id] = { post_hook: c.post_hook, comments: [] };
  }
  byPost[c.post_id].comments.push(c);
});

res.render('comments', { byPost });
```

### Pattern 8: KPI Computation for Stats View

```javascript
// dashboard/routes/stats.js
// Most recent week
const { rows: [latestWeek] } = await query(`
  SELECT * FROM metrics_weekly ORDER BY week DESC LIMIT 1
`);

// Prospect stage counts for funnel
const { rows: stageCounts } = await query(`
  SELECT stage, COUNT(*) AS count FROM prospects GROUP BY stage
`);

// Compute KPIs
const infoDmRate = latestWeek?.info_comments > 0
  ? Math.round((latestWeek.dm_opened / latestWeek.info_comments) * 100)
  : null;
const dmCalendlyRate = latestWeek?.dm_opened > 0
  ? Math.round((latestWeek.calendly_booked / latestWeek.dm_opened) * 100)
  : null;

res.render('stats', { latestWeek, stageCounts, kpis: { infoDmRate, dmCalendlyRate } });
```

### Anti-Patterns to Avoid

- **Date arithmetic in EJS:** Never do `<%= new Date() - record.created_at %>` in templates — compute in route handler
- **N+1 queries:** Do not query posts in a loop per comment — always JOIN or batch
- **Installing Chart.js for Phase 2:** CSS-only funnel is sufficient for a read-only view; Chart.js adds 200KB and client-side complexity — defer until Phase 5 if needed
- **Calendar library (FullCalendar, flatpickr):** Overkill for a static weekly grid — use CSS Grid directly
- **Unguarded `req.query` status values:** Always whitelist filter values before passing to SQL to prevent injection

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status color badges | Custom CSS classes | Tailwind color utilities (`bg-green-100 text-green-800`) | Already compiled in tailwind.css |
| Calendar grid layout | CSS float/flex hack | Tailwind `grid grid-cols-7` | CSS Grid is correct tool; Tailwind handles it |
| Date formatting | Custom locale code | `date.toLocaleDateString('fr-FR', {...})` | Built into JS; no library needed |
| Funnel percentages | Chart.js or D3 | CSS width percentage (inline style) | 5 lines of EJS; chart library = 200KB |
| SQL injection prevention | Manual string sanitization | Parameterized queries (`$1, $2`) | Already in use in Phase 1 patterns |
| "Overdue" detection | Complex cron / background job | Route-level date diff on each request | Data volume is small; synchronous is fine |

---

## Common Pitfalls

### Pitfall 1: `published_date` is a DATE type — timezone traps
**What goes wrong:** `WHERE published_date = CURRENT_DATE` returns no rows because the date was stored as a string and compared against a timestamptz.
**Why it happens:** pg returns DATE columns as JS `Date` objects with UTC midnight. `CURRENT_DATE` depends on the Postgres server timezone (UTC on Render/Supabase).
**How to avoid:** Always use `CURRENT_DATE` (Postgres built-in) rather than passing today's date as a JS string from Node. For display, use `.toLocaleDateString('fr-FR')` in EJS.
**Warning signs:** "Today's posts" section showing 0 even when posts exist for today.

### Pitfall 2: Express 4 async route errors silently swallowed
**What goes wrong:** A SQL error in a route handler causes no response — browser hangs indefinitely.
**Why it happens:** Express 4 does NOT auto-wrap async route errors (unlike Express 5 in autopilot). Unhandled promise rejection = silent failure.
**How to avoid:** Every async route handler must use `try { ... } catch (err) { next(err); }`. The error handler in server.js renders error.ejs with status 500.

### Pitfall 3: EJS layout body slot collision with new views
**What goes wrong:** New views render without layout, or layout nests inside itself.
**Why it happens:** `express-ejs-layouts` requires `layout: 'layout'` to be set globally OR per render. Login page uses `{ layout: false }` — other views must NOT set `layout: false`.
**How to avoid:** Set `app.set('layout', 'layout')` globally in server.js. Never pass `layout: false` except for login.ejs. New routes call `res.render('posts', { data })` without a layout option.

### Pitfall 4: Tailwind classes used in new views not in compiled CSS
**What goes wrong:** New EJS views use Tailwind classes that appear unstyled because they weren't in the CSS when `npm run build:css` last ran.
**Why it happens:** Tailwind v3 scans content files at build time — classes added after the build are missing.
**How to avoid:** Run `npm run build:css` after all new views are written (as final step before commit). During development, use `npm run watch:css`.

### Pitfall 5: DM sequence rules not in config.yaml
**What goes wrong:** `getDmSequenceRules()` returns `{}` — all prospects show as non-overdue because no rules are found.
**Why it happens:** `.social-engine/config.yaml` may not have a `dm_sequence.stages` key, or the key structure differs.
**How to avoid:** Read and verify the actual key structure in `config.yaml` before writing dm-config.js. Add a fallback: if rules are empty, use hardcoded defaults (e.g., msg1 due after 1 day, msg2 after 3 days).

### Pitfall 6: Navigation items still showing "Bientôt" after Phase 2
**What goes wrong:** Nav items for Posts, Commentaires, Pipeline, Statistiques remain disabled after routes are live.
**Why it happens:** layout.ejs has hardcoded disabled spans with `pointer-events-none`.
**How to avoid:** Update layout.ejs as the first task in Phase 2 — replace disabled `<span>` elements with active `<a href>` links for the 4 new sections.

### Pitfall 7: GROUP BY stage returns only non-empty stages
**What goes wrong:** Funnel chart missing stages that have 0 prospects (e.g., 'msg3_sent' is never shown).
**Why it happens:** `GROUP BY stage` only returns stages with rows.
**How to avoid:** Define the stage list in the route handler and merge with SQL results — zero out missing stages:
```javascript
const ALL_STAGES = ['new','msg1_sent','msg2_sent','msg3_sent','booked','converted','lost'];
const countMap = Object.fromEntries(stageCounts.map(r => [r.stage, parseInt(r.count)]));
const funnel = ALL_STAGES.map(s => ({ stage: s, count: countMap[s] || 0 }));
```

---

## Code Examples

### Status Badge Helper (EJS include or inline)

```html
<!-- In EJS: status badge for a post -->
<%
  const badgeClass = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700'
  }[post.status] || 'bg-gray-100 text-gray-500';
%>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium <%= badgeClass %>">
  <%= post.status %>
</span>
```

### Overdue Comment Flag (INBOX-04)

```javascript
// In route handler — flag comments older than 2h without response
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const now = Date.now();
const flaggedComments = pendingComments.map(c => ({
  ...c,
  isOverdue: (now - new Date(c.created_at).getTime()) > TWO_HOURS_MS
}));
```

### Weekly Calendar Grid (7 columns)

```html
<!-- views/calendar.ejs — week grid -->
<div class="grid grid-cols-7 gap-1">
  <% ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].forEach((day, i) => { %>
    <% const d = new Date(weekStart); d.setDate(d.getDate() + i); %>
    <% const key = d.toISOString().split('T')[0]; %>
    <div class="min-h-24 bg-white rounded-lg p-2 border border-gray-100">
      <div class="text-xs font-medium text-gray-500 mb-1"><%= day %> <%= d.getDate() %></div>
      <% (postsByDate[key] || []).forEach(post => { %>
        <div class="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 mb-1 truncate" title="<%= post.hook %>">
          <%= post.hook?.substring(0, 30) %>...
        </div>
      <% }); %>
    </div>
  <% }); %>
</div>
```

### DM Stage Label Map (French)

```javascript
// In route handler or shared lib
const STAGE_LABELS = {
  new: 'Nouveau',
  msg1_sent: 'Message 1 envoyé',
  msg2_sent: 'Message 2 envoyé',
  msg3_sent: 'Message 3 envoyé',
  booked: 'RDV pris',
  converted: 'Patient',
  lost: 'Perdu'
};
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 has no new external dependencies. All dependencies (Node.js, npm, pg, express, ejs, tailwindcss) were verified available in Phase 1 Research.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — matches Phase 1 pattern |
| Quick run command | `node --test tests/routes.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INBOX-01 | GET / shows today's posts section | integration | `node --test tests/home.test.js` | ❌ Wave 0 |
| INBOX-02 | GET / shows pending comment count | integration | `node --test tests/home.test.js` | ❌ Wave 0 |
| INBOX-03 | GET / shows DM follow-ups section | integration | `node --test tests/home.test.js` | ❌ Wave 0 |
| INBOX-04 | Comments older than 2h are flagged as overdue | unit | `node --test tests/overdue.test.js` | ❌ Wave 0 |
| POST-01 | GET /posts returns 200 with post list; ?status=draft filters correctly | integration | `node --test tests/posts.test.js` | ❌ Wave 0 |
| POST-04 | GET /posts/calendar returns 200 with 7-day grid data | integration | `node --test tests/posts.test.js` | ❌ Wave 0 |
| CMT-01 | GET /comments returns 200 with comments grouped by post | integration | `node --test tests/comments.test.js` | ❌ Wave 0 |
| DM-01 | GET /pipeline returns 200 with prospect cards | integration | `node --test tests/pipeline.test.js` | ❌ Wave 0 |
| DM-04 | Overdue prospects are flagged (isOverdue=true) in pipeline response | unit | `node --test tests/overdue.test.js` | ❌ Wave 0 |
| DM-05 | Funnel stage counts include all 7 stages (zero-filled) | unit | `node --test tests/pipeline.test.js` | ❌ Wave 0 |
| STAT-02 | GET /stats returns 200 with KPI rates computed | integration | `node --test tests/stats.test.js` | ❌ Wave 0 |
| STAT-03 | Stats view contains funnel data (reach → patient chain) | integration | `node --test tests/stats.test.js` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/home.test.js tests/posts.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/tests/home.test.js` — covers INBOX-01, INBOX-02, INBOX-03
- [ ] `dashboard/tests/overdue.test.js` — covers INBOX-04, DM-04 (pure unit tests, no DB needed)
- [ ] `dashboard/tests/posts.test.js` — covers POST-01, POST-04
- [ ] `dashboard/tests/comments.test.js` — covers CMT-01
- [ ] `dashboard/tests/pipeline.test.js` — covers DM-01, DM-05
- [ ] `dashboard/tests/stats.test.js` — covers STAT-02, STAT-03
- [ ] Framework: Node.js built-in — no install needed

---

## Open Questions

1. **DM sequence timing rules key structure in config.yaml**
   - What we know: `.social-engine/config.yaml` exists. Phase 1 CONTEXT.md references it as "Brand config, DM sequence rules". The YAML data shows `stage` values: new, msg1_sent, msg2_sent, msg3_sent, booked, converted, lost.
   - What's unclear: The exact key path for follow-up timing (e.g., `dm_sequence.stages.msg1_sent.follow_up_after_days`). The file was not read during this research.
   - Recommendation: Planner includes a task to read `config.yaml` first and document the actual key path. Fallback defaults should be hardcoded (msg1: 1 day, msg2: 3 days, msg3: 7 days) in dm-config.js if the key is missing.

2. **Homepage view naming: `dashboard.ejs` vs `home.ejs`**
   - What we know: Phase 1 Plan 02 creates `dashboard/views/dashboard.ejs` for the health card. Phase 2 extends it with inbox sections.
   - What's unclear: Should Phase 2 update `dashboard.ejs` in place (adding inbox sections below health card), or rename/replace it with `home.ejs`?
   - Recommendation: Update `dashboard.ejs` in place — keep the route at `GET /` and extend the view. Less disruption to existing Phase 1 work.

3. **`scheduled_date` vs `published_date` column name**
   - What we know: Phase 1 schema defines `published_date DATE` in the posts table. The YAML uses `published_date`. INBOX-01 talks about "scheduled posts" for today.
   - What's unclear: Posts with `status='scheduled'` may not have a `published_date` set yet (it's null in the YAML for drafts).
   - Recommendation: For "today's scheduled posts", query `WHERE status IN ('scheduled','published') AND published_date = CURRENT_DATE`. For display, show the `status` badge clearly.

4. **Phase 1 execution state**
   - What we know: STATE.md says "Stopped at: Completed 01-foundation/01-01-PLAN.md" — only Plan 01 (backend scaffold) is done. Plans 02 (auth + views) and 03 (deploy) are not yet executed.
   - What's unclear: Whether Plans 02 and 03 will be complete before Phase 2 starts.
   - Recommendation: Phase 2 plans must declare `depends_on: ["01-03"]` (all Phase 1 plans complete). The planner should note that `layout.ejs`, `login.ejs`, `auth.js`, and `dashboard.ejs` from Plan 02 are prerequisites.

---

## Project Constraints (from CLAUDE.md)

- Do not add Co-Authored-By lines to git commits
- Dashboard lives in `dashboard/` — separate from static site and autopilot
- Use CJS (`require`) — no ESM in dashboard
- Do not mention rTMS anywhere
- No hardcoded prices (not applicable to dashboard)
- Never rebuild `config.min.js` or `tailwind.css` for the main site during dashboard work

---

## Sources

### Primary (HIGH confidence)
- `E:/Site CL/.planning/phases/01-foundation/01-RESEARCH.md` — Phase 1 stack, schema, and patterns (verified)
- `E:/Site CL/.planning/phases/01-foundation/01-01-PLAN.md` — confirmed schema columns and seed structure
- `E:/Site CL/.planning/phases/01-foundation/01-02-PLAN.md` — confirmed layout.ejs, auth.js patterns and Express 4 conventions
- `E:/Site CL/.social-engine/data/posts.yaml` — actual post fields (verified)
- `E:/Site CL/.social-engine/data/comments.yaml` — actual comment fields (verified)
- `E:/Site CL/.social-engine/data/dm-pipeline.yaml` — actual prospect fields and stages (verified)
- `E:/Site CL/.planning/REQUIREMENTS.md` — Phase 2 requirement definitions (verified)

### Secondary (MEDIUM confidence)
- PostgreSQL `CURRENT_DATE`, `NOW() - INTERVAL '2 hours'` — standard SQL, widely documented
- Tailwind CSS v3 `grid grid-cols-7` — CSS Grid support, verified in Tailwind v3 docs patterns

### Tertiary (LOW confidence)
- `.social-engine/config.yaml` DM sequence rule structure — file not read; key path assumed based on context description

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; Phase 1 stack fully proven
- SQL queries: HIGH — derived from verified schema columns
- Architecture patterns: HIGH — extends proven Phase 1 Express 4 + EJS patterns
- DM sequence rules key path: LOW — config.yaml not read; planner must verify
- Calendar/funnel CSS approach: HIGH — Tailwind Grid + inline width is a standard pattern

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (stable stack — 90 days)
