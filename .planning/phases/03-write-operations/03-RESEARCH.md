# Phase 3: Write Operations - Research

**Researched:** 2026-04-06
**Domain:** Express 4 POST routes / EJS form patterns / Fetch API mutations / Clipboard API / pg write operations
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POST-02 | User can create a new post with content, type, platform, scheduled date | Express POST /posts route + EJS form + pg INSERT |
| POST-03 | User can edit existing post content and metadata | Express POST /posts/:id route + pg UPDATE |
| POST-05 | User can drag-and-drop posts between dates in calendar view | Vanilla JS drag-and-drop + PATCH /posts/:id/date fetch call |
| POST-06 | User can copy post content to clipboard in one click | Clipboard API (navigator.clipboard.writeText) |
| CMT-02 | User can mark a comment as handled (with response text) | PATCH /comments/:id + response_status = 'done' + response_text |
| CMT-03 | User can convert an INFO comment to a DM prospect in one click | POST /prospects (pre-filled from comment data) + UPDATE comment.converted_to_dm = true |
| DM-02 | User can advance a prospect to next stage or mark lost with reason | PATCH /prospects/:id/stage + stage machine validation |
| DM-03 | User can view and copy DM templates to clipboard | Clipboard API + template data from config/DB |
| STAT-01 | User can input weekly metrics manually | POST/PUT /metrics/:week + EJS form with 9 numeric fields |
| STAT-04 | Post performance comparison table across all published posts | GET /metrics/compare + joined query posts + metrics JSONB |

</phase_requirements>

---

## Summary

Phase 3 adds write capability on top of Phase 2's read views. The pattern is uniform across all requirements: an HTML form (or a small fetch call from an EJS page) submits data to an Express POST/PATCH/PUT route, which runs a parameterized pg UPDATE/INSERT, then redirects back (PRG pattern) or returns JSON for inline DOM updates.

The stack is already locked (Express 4 CJS, EJS, pg raw SQL, Tailwind). Phase 3 introduces no new library dependencies. The only new browser API is `navigator.clipboard.writeText()` (POST-06, DM-03) — no polyfill needed for a single-operator internal tool targeting a modern browser.

The biggest design decision is **inline updates vs. full page reload**. Two patterns apply: (1) PRG (Post-Redirect-Get) for form submissions — simple, reliable, no JS required; (2) fetch-based PATCH for single-field mutations that should update the UI without a page reload (e.g., "Mark Handled", "Convert to DM", stage advance buttons). Pattern 2 requires a small amount of vanilla JS and JSON endpoints. Both patterns coexist cleanly in Express 4.

Stage machine validation for DM-02 is the most complex logic: a prospect can only advance to the next valid stage, not skip. This must be enforced server-side regardless of client-side UI.

**Primary recommendation:** Use PRG for full forms (post create/edit, metrics input). Use fetch + JSON response for one-click actions (mark handled, convert to DM, advance stage). Never use a frontend framework — vanilla JS with fetch is sufficient for an internal single-operator tool.

---

## Standard Stack

### Core (all inherited from Phase 1 — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21.2 | POST/PATCH/PUT route handlers | Locked D-03 |
| pg | ^8.20.0 | Parameterized INSERT/UPDATE/DELETE | Locked D-03 |
| ejs | ^5.0.1 | Form rendering in views | Locked D-03 |
| express-ejs-layouts | ^2.5.1 | Shared layout wrapping forms | Already chosen Phase 1 |

### Browser APIs (no install)

| API | Purpose | Availability |
|-----|---------|--------------|
| `navigator.clipboard.writeText()` | Copy post/DM text to clipboard (POST-06, DM-03) | All modern browsers — requires HTTPS or localhost |
| HTML `<form method="POST">` | Standard form submission for creates/edits | Universal |
| `fetch()` | One-click PATCH actions without page reload | All modern browsers |
| HTML drag-and-drop API | Calendar date reordering (POST-05) | All modern browsers |

### No New Dependencies Required

Phase 3 adds zero new npm packages. All write patterns are achievable with the Phase 1 stack. Drag-and-drop (POST-05) uses the native HTML5 Drag and Drop API — no library needed for a simple date-change interaction.

**Version verification:** No new packages — all versions confirmed in Phase 1 research (2026-04-06).

---

## Architecture Patterns

### Recommended Route Structure

```
dashboard/routes/
├── auth.js           # existing (Phase 1)
├── dashboard.js      # existing — GET / health
├── posts.js          # NEW Phase 3 — GET/POST/PATCH /posts
├── comments.js       # NEW Phase 3 — GET/PATCH /comments
├── prospects.js      # NEW Phase 3 — GET/POST/PATCH /prospects
└── metrics.js        # NEW Phase 3 — GET/POST/PUT /metrics
```

All routes protected by `isAuthenticated` middleware (from auth.js).

### Pattern 1: PRG (Post-Redirect-Get) for Full Forms

Use for: POST-02 (create post), POST-03 (edit post), STAT-01 (input weekly metrics).

```javascript
// dashboard/routes/posts.js
const router = require('express').Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

// Show create form
router.get('/posts/new', isAuthenticated, (req, res) => {
  res.render('posts/new', { error: null });
});

// Handle form submission
router.post('/posts', isAuthenticated, async (req, res, next) => {
  try {
    const { content, type, platform, scheduled_date, hook } = req.body;
    // Validate required fields
    if (!content || !platform) {
      return res.render('posts/new', { error: 'Contenu et plateforme requis.' });
    }
    const id = `POST-${new Date().toISOString().slice(0,10)}-${Date.now()}`;
    await query(
      `INSERT INTO posts (id, content, type, platform, scheduled_date, hook, status, is_draft, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',true,NOW())`,
      [id, content, type || null, platform, scheduled_date || null, hook || null]
    );
    res.redirect('/posts');         // PRG — prevents double-submit on reload
  } catch (err) {
    next(err);  // Express 4: must call next(err) explicitly
  }
});
```

**Key:** Always `next(err)` in catch blocks — Express 4 does NOT auto-catch async errors (unlike Express 5).

### Pattern 2: Fetch-based PATCH for One-Click Actions

Use for: CMT-02 (mark handled), CMT-03 (convert to DM), DM-02 (advance stage), POST-05 (drag-and-drop date).

Server side — returns JSON:

```javascript
// PATCH /comments/:id/handle
router.patch('/comments/:id/handle', isAuthenticated, async (req, res, next) => {
  try {
    const { response_text } = req.body;
    await query(
      `UPDATE comments SET response_status='done', response_text=$1 WHERE id=$2`,
      [response_text || '', req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

Client side — minimal vanilla JS in EJS template or public/js/app.js:

```javascript
// In EJS: <button data-comment-id="CMT-001" class="btn-handle">Traité</button>
document.querySelectorAll('.btn-handle').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.commentId;
    const responseText = document.querySelector(`#response-${id}`)?.value || '';
    const res = await fetch(`/comments/${id}/handle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_text: responseText })
    });
    if (res.ok) {
      // Remove comment card from DOM immediately
      btn.closest('.comment-card').remove();
    }
  });
});
```

### Pattern 3: Convert Comment to Prospect (CMT-03)

Two writes in one transaction: INSERT prospect + UPDATE comment.converted_to_dm = true.

```javascript
router.post('/comments/:id/convert', isAuthenticated, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM comments WHERE id=$1', [req.params.id]);
    const comment = rows[0];
    if (!comment) return res.status(404).json({ ok: false, error: 'Comment not found' });

    const prospectId = `DM-${new Date().toISOString().slice(0,10)}-${Date.now()}`;
    // Atomic: both writes in a transaction
    await query('BEGIN');
    await query(
      `INSERT INTO prospects (id, source_comment_id, source_post_id, platform, prospect_name,
        full_name, stage, date_first_contact, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'new',NOW()::date,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [prospectId, comment.id, comment.post_id, comment.platform,
       comment.author_name, comment.full_name]
    );
    await query(
      `UPDATE comments SET converted_to_dm=true WHERE id=$1`, [comment.id]
    );
    await query('COMMIT');
    res.json({ ok: true, prospectId });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    next(err);
  }
});
```

### Pattern 4: DM Stage Machine (DM-02)

Valid stage transitions are ordered. Server must reject invalid advances.

```javascript
const STAGES = ['new','msg1_sent','msg2_sent','msg3_sent','booked','converted','lost'];

router.patch('/prospects/:id/stage', isAuthenticated, async (req, res, next) => {
  try {
    const { action, lost_reason } = req.body; // action: 'advance' | 'lost'
    const { rows } = await query('SELECT stage FROM prospects WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false });

    let newStage;
    if (action === 'lost') {
      newStage = 'lost';
    } else {
      const idx = STAGES.indexOf(rows[0].stage);
      if (idx === -1 || idx >= STAGES.length - 2) {  // can't advance past 'converted'
        return res.status(400).json({ ok: false, error: 'Cannot advance from this stage' });
      }
      newStage = STAGES[idx + 1];
    }

    await query(
      `UPDATE prospects SET stage=$1, lost_reason=$2 WHERE id=$3`,
      [newStage, lost_reason || null, req.params.id]
    );
    res.json({ ok: true, newStage });
  } catch (err) { next(err); }
});
```

### Pattern 5: Clipboard Copy (POST-06, DM-03)

Pure client-side — no server call needed. The text is already on the page.

```javascript
// In EJS: <button class="btn-copy" data-text="<%= post.content %>">Copier</button>
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.text;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copié !';
      setTimeout(() => btn.textContent = 'Copier', 2000);
    } catch (err) {
      // Fallback for non-HTTPS (shouldn't happen on Render)
      console.error('Clipboard error:', err);
      alert('Copiez manuellement: ' + text);
    }
  });
});
```

**Requirement:** `navigator.clipboard` requires HTTPS or localhost. Render serves HTTPS by default — no issue.

### Pattern 6: Weekly Metrics Input (STAT-01)

Upsert pattern — same form used for create and update:

```javascript
router.post('/metrics/:week', isAuthenticated, async (req, res, next) => {
  try {
    const { week } = req.params;
    const fields = ['posts_published','total_reach','total_impressions','total_likes',
                    'total_comments','total_shares','info_comments','dm_opened','calendly_booked'];
    const values = fields.map(f => parseInt(req.body[f] || 0, 10));

    await query(
      `INSERT INTO metrics_weekly (week, ${fields.join(',')}, created_at)
       VALUES ($1,${fields.map((_,i)=>'$'+(i+2)).join(',')}, NOW())
       ON CONFLICT (week) DO UPDATE SET
         ${fields.map((f,i)=>`${f}=EXCLUDED.${f}`).join(', ')}`,
      [week, ...values]
    );
    res.redirect('/metrics');
  } catch (err) { next(err); }
});
```

### Pattern 7: Drag-and-Drop Date Change (POST-05)

HTML5 drag-and-drop: `draggable="true"` on post card, `dragover`/`drop` on date cells, PATCH on drop.

```javascript
// Minimal drag-and-drop — set data on drag start
postCard.addEventListener('dragstart', e => {
  e.dataTransfer.setData('text/plain', postCard.dataset.postId);
});

dateCell.addEventListener('dragover', e => e.preventDefault());
dateCell.addEventListener('drop', async e => {
  e.preventDefault();
  const postId = e.dataTransfer.getData('text/plain');
  const newDate = dateCell.dataset.date; // ISO date from data attribute
  await fetch(`/posts/${postId}/date`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_date: newDate })
  });
  // Reload calendar or move card in DOM
  location.reload();
});
```

Server:
```javascript
router.patch('/posts/:id/date', isAuthenticated, async (req, res, next) => {
  try {
    await query(
      `UPDATE posts SET scheduled_date=$1 WHERE id=$2`,
      [req.body.scheduled_date, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});
```

### Post Performance Comparison (STAT-04)

SQL join across posts and their JSONB metrics field:

```javascript
router.get('/metrics/compare', isAuthenticated, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, hook, type, platform, published_date,
             (metrics->>'reach')::int AS reach,
             (metrics->>'likes')::int AS likes,
             (metrics->>'comments')::int AS comments,
             CASE WHEN (metrics->>'reach')::int > 0
               THEN ROUND(((metrics->>'likes')::numeric + (metrics->>'comments')::numeric)
                    / (metrics->>'reach')::numeric * 100, 2)
               ELSE 0
             END AS engagement_rate
      FROM posts
      WHERE status='published' AND metrics != '{}'
      ORDER BY published_date DESC
    `);
    res.render('metrics/compare', { posts: rows });
  } catch (err) { next(err); }
});
```

### Anti-Patterns to Avoid

- **Missing `next(err)` in async routes:** Express 4 silently drops unhandled promise rejections — always try/catch + next(err)
- **String concatenation in SQL:** Always use parameterized queries (`$1, $2...`) — never `"WHERE id='" + id + "'"`
- **Clipboard without HTTPS check:** Wrap in try/catch — clipboard API throws on non-HTTPS
- **No transaction for CMT-03:** If INSERT prospect succeeds but UPDATE comment fails, the comment is un-convertible again — always use BEGIN/COMMIT/ROLLBACK
- **Double form submission:** Always use PRG (redirect after POST) — never render a view directly after POST
- **Hardcoding stage list in client only:** Stage machine must be enforced server-side — client buttons are UI hints, not trust boundary

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL injection prevention | String interpolation | pg parameterized queries ($1, $2) | pg handles escaping; manual is fragile |
| CSRF protection | Custom token system | Method override for fetch (same-session) | Internal single-operator tool — SameSite=lax cookie + session is sufficient |
| Clipboard | execCommand('copy') | navigator.clipboard.writeText() | execCommand deprecated; clipboard API is standard |
| Drag-and-drop | jQuery UI sortable | HTML5 native drag-and-drop API | No jQuery in stack; native is sufficient for date-move use case |
| Atomic multi-table writes | Sequential queries | BEGIN/COMMIT/ROLLBACK transaction | Sequential queries leave DB in inconsistent state on partial failure |
| Stage validation | Client-side only | Server-side STAGES array validation | Client is untrustworthy; server is the source of truth |

---

## Common Pitfalls

### Pitfall 1: Express 4 Async Error Swallowing
**What goes wrong:** Async route throws → no 500 response → request hangs or times out.
**Why it happens:** Express 4 doesn't wrap async handlers. Express 5 (autopilot) does.
**How to avoid:** Every async route must have `try { ... } catch (err) { next(err); }`. Add a global error handler in server.js: `app.use((err, req, res, next) => { console.error(err); res.status(500).render('error', { message: err.message }); })`.
**Warning signs:** Requests that hang without a response on form submit.

### Pitfall 2: Double Form Submission on Reload
**What goes wrong:** User submits form, page shows success, user hits F5 → form resubmits → duplicate record.
**Why it happens:** Browser resends the POST on reload if there's no redirect.
**How to avoid:** Always redirect after POST (PRG pattern). `res.redirect('/posts')` after successful INSERT.

### Pitfall 3: Clipboard API on HTTP
**What goes wrong:** `navigator.clipboard.writeText()` throws `NotAllowedError` on HTTP.
**Why it happens:** Clipboard API requires secure context (HTTPS or localhost).
**How to avoid:** Render provides HTTPS. In local dev use `localhost` (not `127.0.0.1` in some browsers). Always wrap in try/catch with fallback alert.

### Pitfall 4: Partial Failure in CMT-03 Convert
**What goes wrong:** Prospect created but comment not updated → comment shows as "convertible" again → duplicate prospect on next click.
**Why it happens:** Two separate queries without a transaction.
**How to avoid:** Wrap both writes in `BEGIN`/`COMMIT`. Check `converted_to_dm=true` before allowing conversion (server-side guard).

### Pitfall 5: JSONB metrics Field Extraction
**What goes wrong:** `metrics->>'reach'` returns NULL if field not present → `::int` cast throws or returns NULL → comparison table shows NULLs.
**Why it happens:** JSONB keys are absent for seeded posts with no metrics.
**How to avoid:** Use `COALESCE((metrics->>'reach')::int, 0)` in all metric extractions. Filter with `WHERE metrics != '{}'` for comparison table.

### Pitfall 6: Scheduled_date Column Missing from Phase 1 Schema
**What goes wrong:** POST-02 inserts `scheduled_date` but the column doesn't exist in the Phase 1 `posts` table (Phase 1 schema used `published_date` and `created_date`).
**Why it happens:** Phase 1 schema derived from YAML shapes which had `published_date`, not `scheduled_date` as a distinct column.
**How to avoid:** Phase 3 Wave 0 must add `scheduled_date DATE` column via `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE`. This is a migration task, not a schema rewrite.

### Pitfall 7: fetch PATCH with EJS CSRF Gap
**What goes wrong:** fetch calls don't automatically include CSRF tokens.
**Why it happens:** Standard forms have CSRF protection (in frameworks); fetch calls bypass form mechanisms.
**How to avoid:** For this internal single-operator dashboard with SameSite=lax cookies, this is acceptable. No additional CSRF library needed — the session cookie itself is the auth boundary. Document this as a known accepted risk.

---

## Code Examples

### Global Error Handler (server.js addition)

```javascript
// Must be LAST middleware in server.js — after all routes
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  if (req.headers.accept?.includes('application/json')) {
    return res.status(status).json({ ok: false, error: err.message });
  }
  res.status(status).render('error', { message: err.message, status });
});
```

### EJS Form with Validation Error Display

```html
<!-- dashboard/views/posts/new.ejs -->
<% if (error) { %>
  <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
    <%= error %>
  </div>
<% } %>
<form method="POST" action="/posts">
  <div class="mb-4">
    <label class="block text-sm font-medium text-secondary mb-1">Contenu</label>
    <textarea name="content" rows="6"
      class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      required></textarea>
  </div>
  <div class="grid grid-cols-2 gap-4 mb-4">
    <div>
      <label class="block text-sm font-medium text-secondary mb-1">Type</label>
      <select name="type" class="w-full border border-gray-300 rounded-lg px-3 py-2">
        <option value="">-- Choisir --</option>
        <option value="objection-buster">Objection Buster</option>
        <option value="temoignage">Témoignage</option>
        <option value="myth-buster">Myth Buster</option>
        <option value="timeline">Timeline</option>
        <option value="tips">Tips</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-secondary mb-1">Plateforme</label>
      <select name="platform" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
        <option value="facebook">Facebook</option>
        <option value="both">Les deux</option>
      </select>
    </div>
  </div>
  <div class="mb-6">
    <label class="block text-sm font-medium text-secondary mb-1">Date prévue</label>
    <input type="date" name="scheduled_date"
      class="border border-gray-300 rounded-lg px-3 py-2">
  </div>
  <button type="submit"
    class="bg-primary text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition font-medium">
    Créer le post
  </button>
</form>
```

### Mark Comment Handled — EJS + JS

```html
<!-- In comment card -->
<textarea id="response-<%= comment.id %>" placeholder="Réponse..." rows="2"
  class="w-full border rounded px-2 py-1 text-sm mb-2"></textarea>
<button class="btn-handle bg-green-600 text-white px-3 py-1 rounded text-sm"
  data-comment-id="<%= comment.id %>">
  Traité ✓
</button>
```

---

## Runtime State Inventory

> This is a Phase 3 write operations phase — not a rename/migration phase. No runtime state inventory required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22.17.1 | — |
| npm | Package install | ✓ | 11.5.2 | — |
| PostgreSQL (via existing db.js) | All write routes | Must be provisioned (Phase 1 blocker) | — | — |
| navigator.clipboard | POST-06, DM-03 | ✓ (Render HTTPS) | Browser native | alert() fallback |
| HTML5 Drag-and-drop | POST-05 | ✓ (all modern browsers) | Browser native | Manual date field |

**Missing dependencies with no fallback:** None for Phase 3 specifically. The DB tier (Phase 1 blocker) must be resolved before Phase 3 executes.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none |
| Quick run command | `node --test tests/routes/*.test.js` |
| Full suite command | `node --test tests/**/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POST-02 | POST /posts creates a row in DB, redirects to /posts | integration | `node --test tests/routes/posts.test.js` | ❌ Wave 0 |
| POST-03 | POST /posts/:id updates content and redirects | integration | `node --test tests/routes/posts.test.js` | ❌ Wave 0 |
| POST-05 | PATCH /posts/:id/date updates scheduled_date column | integration | `node --test tests/routes/posts.test.js` | ❌ Wave 0 |
| POST-06 | Clipboard button exists in rendered HTML; navigator.clipboard called | manual | Browser DevTools | manual-only |
| CMT-02 | PATCH /comments/:id/handle sets response_status='done' | integration | `node --test tests/routes/comments.test.js` | ❌ Wave 0 |
| CMT-03 | POST /comments/:id/convert creates prospect + sets converted_to_dm=true atomically | integration | `node --test tests/routes/comments.test.js` | ❌ Wave 0 |
| DM-02 | PATCH /prospects/:id/stage advances stage correctly; rejects invalid advances | integration | `node --test tests/routes/prospects.test.js` | ❌ Wave 0 |
| DM-03 | DM template text present in rendered HTML; copy button present | manual | Browser DevTools | manual-only |
| STAT-01 | POST /metrics/:week upserts row; second submit updates, not duplicates | integration | `node --test tests/routes/metrics.test.js` | ❌ Wave 0 |
| STAT-04 | GET /metrics/compare returns posts with extracted metrics; NULL reach handled | integration | `node --test tests/routes/metrics.test.js` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/routes/[relevant].test.js`
- **Per wave merge:** `node --test tests/**/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/tests/routes/posts.test.js` — covers POST-02, POST-03, POST-05
- [ ] `dashboard/tests/routes/comments.test.js` — covers CMT-02, CMT-03
- [ ] `dashboard/tests/routes/prospects.test.js` — covers DM-02
- [ ] `dashboard/tests/routes/metrics.test.js` — covers STAT-01, STAT-04
- [ ] `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE` — migration required before tests
- [ ] Global error handler in server.js — required for all routes to return 500 instead of hanging

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `execCommand('copy')` | `navigator.clipboard.writeText()` | ~2018 | execCommand deprecated; clipboard API standard |
| jQuery AJAX | `fetch()` + JSON | ~2017 | No jQuery dependency; native and lighter |
| jQuery UI drag-and-drop | HTML5 native drag-and-drop | ~2015 | No library needed for simple date-move |
| `INSERT ... WHERE NOT EXISTS` | `INSERT ... ON CONFLICT DO UPDATE` | PostgreSQL 9.5 | Upsert is atomic; WHERE NOT EXISTS is not |

---

## Open Questions

1. **scheduled_date vs published_date in Phase 1 schema**
   - What we know: Phase 1 schema has `published_date DATE` (for past posts) and `created_date DATE`. Phase 3 needs `scheduled_date DATE` (for future posts). They are semantically different.
   - What's unclear: Did Phase 1 execution include `scheduled_date`? The plan's schema section doesn't include it.
   - Recommendation: Wave 0 of Phase 3 must run `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE` as a migration step. Planner should include this as an explicit task.

2. **DM template storage location**
   - What we know: DM-03 says "view and copy DM templates". Templates exist in `.social-engine/config.yaml` (DM sequence rules). They were seeded to DB or are read from config.
   - What's unclear: Phase 1 seed may not have imported DM templates — only posts/comments/prospects/metrics were seeded.
   - Recommendation: Read DM sequence templates from `.social-engine/config.yaml` at runtime (require + js-yaml) rather than from DB. Simpler, no migration needed.

3. **Phase 2 route structure**
   - What we know: Phase 2 (read layer) hasn't been researched or planned yet. Phase 3 builds on Phase 2's EJS views and route structure.
   - What's unclear: Exact route paths Phase 2 will establish (e.g., `/posts`, `/comments`, `/prospects`, `/metrics`).
   - Recommendation: Phase 3 research assumes standard RESTful paths. If Phase 2 uses different paths, Phase 3 planner must align. Phase 3 routes extend Phase 2 routes — same files, additional POST/PATCH handlers added.

---

## Project Constraints (from CLAUDE.md)

- Do not add Co-Authored-By lines to git commits
- Do not hardcode prices — not applicable to dashboard, but no hardcoded passwords
- Do not mention rTMS anywhere
- Dashboard is CJS (no `"type": "module"`) — all new route files use `require()`/`module.exports`
- UI text in French (D-05) — form labels, error messages, button text all in French
- No new npm dependencies for Phase 3 — all write patterns achievable with Phase 1 stack

---

## Sources

### Primary (HIGH confidence)
- `E:/Site CL/.planning/phases/01-foundation/01-RESEARCH.md` — DB schema, stack, patterns
- `E:/Site CL/.planning/phases/01-foundation/01-01-PLAN.md` — exact files created in Phase 1
- `E:/Site CL/.planning/REQUIREMENTS.md` — exact requirement definitions
- `E:/Site CL/.planning/phases/01-foundation/01-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- Express 4 async error handling documentation — `next(err)` requirement verified against Express 4 docs
- PostgreSQL `ON CONFLICT DO UPDATE` (upsert) — standard PostgreSQL 9.5+ feature, widely documented
- `navigator.clipboard` MDN — browser standard, requires HTTPS

### Tertiary (LOW confidence)
- HTML5 drag-and-drop browser compatibility for POST-05 — assumed modern browser support; verify if Safari/iOS is a concern (single operator, likely desktop Chrome)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns use Phase 1 confirmed stack
- Architecture: HIGH — PRG + fetch patterns are well-established Express 4 conventions
- DB write patterns: HIGH — parameterized pg queries, transactions, upserts all standard
- Browser APIs: HIGH — clipboard and drag-and-drop are stable browser standards
- Phase 2 dependency: MEDIUM — Phase 2 route structure assumed, not confirmed

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (stable stack — 90 days)
