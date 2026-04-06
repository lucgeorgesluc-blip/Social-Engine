# Phase 1: Foundation - Research

**Researched:** 2026-04-06
**Domain:** Node.js / Express 4 / PostgreSQL / EJS / Tailwind CSS — dashboard app scaffold
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dashboard lives in `dashboard/` at repo root
- **D-02:** Fully independent `package.json` — no shared deps with autopilot
- **D-03:** Stack: Node 20 + Express 4 + EJS + pg (raw SQL) + connect-pg-simple + bcrypt + Tailwind CSS
- **D-04:** Tailwind CSS — own build in `dashboard/`, own `tailwind.config.js` pointing to `dashboard/views/**/*.ejs`
- **D-05:** UI text in French
- **D-06:** Branded minimal login — centered card, brand colors (terracotta/green), "Social Dashboard" + "Corinne Lacoste" header
- **D-07:** No username field — single shared password only
- **D-08:** Sidebar nav left, content right. Hamburger on mobile (375px)
- **D-09:** All nav items visible from day 1, future ones greyed with "Bientôt" badge
- **D-10:** Homepage: health card (DB status, seed counts, "Bienvenue, Benjamin" greeting)
- **D-11:** Logout button in sidebar
- **D-12:** Render free PostgreSQL MUST NOT be used — must pick Render Starter ($7/mo) or Supabase free tier before any migrations

### Claude's Discretion
- DB schema design (table structure, relationships, indexes)
- Seed script implementation (conflict resolution, idempotent upsert approach)
- Express middleware stack ordering
- Health check endpoint design
- Error page styling

### Deferred Ideas (OUT OF SCOPE)
- None declared
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Single Express + EJS process on Render serving both API and frontend | Express 4 + EJS patterns below; Render web service config |
| INFRA-02 | PostgreSQL stores all application data | Schema derived from YAML shapes; pg raw SQL patterns |
| INFRA-03 | YAML seed import migrates `.social-engine/data/*.yaml` into DB on first run (idempotent) | js-yaml 4.x + ON CONFLICT DO NOTHING pattern |
| INFRA-04 | Simple password auth with server-side sessions (connect-pg-simple) | Autopilot auth.js pattern; connect-pg-simple 10.x |
| INFRA-05 | Responsive layout usable on mobile (375px) | Tailwind responsive classes; sidebar hamburger pattern |
</phase_requirements>

---

## Summary

Phase 1 builds a self-contained Express 4 app in `dashboard/` with PostgreSQL, server-rendered EJS views, bcrypt password auth, idempotent YAML seed, and a responsive sidebar shell. The tech stack is fully locked (D-03). An exact working auth pattern already exists in `autopilot/routes/auth.js` — the dashboard version simplifies it by removing the username field (D-07).

The biggest risk is the database tier decision (D-12): Render free PostgreSQL deletes data after 30 days and must not be used. Supabase free tier gives a persistent 500 MB Postgres database at no cost and is the recommended choice given the budget constraint. The seed script must be idempotent (run twice = no duplicates); `ON CONFLICT (id) DO NOTHING` is the correct pattern for all tables.

The dashboard's Tailwind build is independent from the main site's pre-built `tailwind.css` (which has class gaps per project memory). It needs its own `tailwind.config.js` scoped to `dashboard/views/**/*.ejs`.

**Primary recommendation:** Scaffold `dashboard/` as a standard CJS Express 4 app (not ESM — autopilot is ESM, keep them distinct), use Supabase free tier for PostgreSQL, and copy the auth pattern from autopilot with the username check removed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | 4.x (pin `^4.21.2`) | HTTP server + routing | Locked D-03. Express 5 is autopilot's choice; 4.x for dashboard per STATE.md |
| ejs | 5.0.1 (latest) | Server-side HTML templates | Locked D-03. Simple, no build step, works with Express `res.render()` |
| pg | 8.20.0 | PostgreSQL client (raw SQL) | Locked D-03. No ORM — full SQL control, minimal dep surface |
| connect-pg-simple | 10.0.0 | Session store in PostgreSQL | Locked D-03 / INFRA-04. Stores sessions in DB so Render restarts don't kill sessions |
| bcryptjs | 3.0.3 | Password hashing | Locked D-03. Already in autopilot, same version |
| express-session | 1.19.0 | Session middleware | Required by connect-pg-simple |
| js-yaml | 4.1.1 | Parse `.social-engine/data/*.yaml` for seed | Already in project root deps |
| tailwindcss | 4.2.2 | CSS utility classes | Locked D-04. Own build in `dashboard/` |
| dotenv | 17.x | Load env vars from `.env` | Pattern from autopilot |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/cli | 4.x | Tailwind v4 CLI build | Required if using Tailwind v4 — replaces postcss pipeline |
| nodemon | 3.x | Dev auto-restart | Development only |

### Version Notes

- `express` latest is 5.2.1 but **D-03 locks Express 4**. Pin `"express": "^4.21.2"` explicitly.
- `tailwindcss` latest is 4.2.2. Tailwind v4 changed config format significantly (no more `tailwind.config.js` in v4 — uses CSS `@theme` directive). **Recommend staying on Tailwind v3 (`^3.4.19`) for the dashboard** to match the main site's proven setup and avoid v4 migration surprises. Verify with user if v4 is acceptable.
- `ejs` 5.0.1 is the current major — compatible with Express 4 `res.render()`.
- `connect-pg-simple` 10.x requires the `session` table to be created manually before first use.

### Installation

```bash
cd dashboard
npm init -y
npm install express@^4.21.2 ejs pg connect-pg-simple bcryptjs express-session js-yaml dotenv
npm install --save-dev tailwindcss@^3.4.19 nodemon
npx tailwindcss init
```

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
├── package.json          # independent, CJS ("type" omitted = CommonJS)
├── tailwind.config.js    # content: ["./views/**/*.ejs"]
├── tailwind.src.css      # @tailwind base/components/utilities
├── public/
│   ├── css/
│   │   └── tailwind.css  # compiled output (never hand-edit)
│   └── js/
│       └── app.js        # minimal client-side JS (hamburger toggle)
├── views/
│   ├── layout.ejs        # base template (head, sidebar, content slot)
│   ├── login.ejs         # login page
│   ├── dashboard.ejs     # post-login home (health card)
│   └── error.ejs         # error page
├── routes/
│   ├── auth.js           # login / logout handlers + isAuthenticated middleware
│   └── dashboard.js      # GET / (health card), GET /health
├── lib/
│   ├── db.js             # pg Pool singleton + query helper
│   ├── seed.js           # idempotent YAML → DB import
│   └── schema.sql        # CREATE TABLE IF NOT EXISTS statements
└── server.js             # app entry point
```

### Pattern 1: Express 4 CJS App Entry (not ESM)

The autopilot uses `"type": "module"` (ESM). The dashboard must NOT inherit this. Omit `"type"` in `package.json` to default to CJS.

```javascript
// dashboard/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { pool } = require('./lib/db');
const authRouter = require('./routes/auth');
const dashRouter = require('./routes/dashboard');

const app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Trust Render's proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use('/', authRouter);
app.use('/', dashRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Dashboard on :${PORT}`));
```

### Pattern 2: Auth — No Username Field (adapted from autopilot)

The autopilot checks `username + password`. Dashboard checks password only (D-07).

```javascript
// dashboard/routes/auth.js
const bcrypt = require('bcryptjs');

function isAuthenticated(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/login');
}

async function loginHandler(req, res) {
  const { password } = req.body || {};
  const hash = process.env.DASHBOARD_PASSWORD_HASH;
  if (password && hash && bcrypt.compareSync(password, hash)) {
    req.session.user = 'benjamin';
    return res.redirect('/');
  }
  res.render('login', { error: 'Mot de passe incorrect.' });
}

async function logoutHandler(req, res) {
  req.session.destroy(() => res.redirect('/login'));
}
```

Generate the hash once:
```bash
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
```

### Pattern 3: pg Pool Singleton

```javascript
// dashboard/lib/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
```

Note: Supabase requires `ssl: { rejectUnauthorized: false }` in production. Render Starter Postgres also requires SSL.

### Pattern 4: connect-pg-simple Session Table

Must be created before first server start:

```sql
-- Run once against the DB (add to schema.sql)
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey"
  PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON "user_sessions" ("expire");
```

### Pattern 5: Idempotent YAML Seed

```javascript
// dashboard/lib/seed.js
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function seedPosts() {
  const file = path.resolve(__dirname, '../../.social-engine/data/posts.yaml');
  const { posts } = yaml.load(fs.readFileSync(file, 'utf8'));
  for (const p of posts) {
    await query(
      `INSERT INTO posts (id, status, platform, type, hook, created_date, published_date, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.status, p.platform, p.type, p.hook,
       p.created_date, p.published_date, JSON.stringify(p.tags)]
    );
  }
}
// Similar functions for comments, prospects, metrics
// Call all at server startup (wrapped in try/catch — never crash the server)
```

### Anti-Patterns to Avoid

- **ESM in dashboard:** `"type": "module"` bleeds from autopilot if you copy package.json — omit it entirely
- **connect-pg-simple without pre-created table:** Sessions silently fail; create the table in `schema.sql` before first boot
- **Hardcoded DATABASE_URL:** Must come from env var; SSL required for both Supabase and Render Postgres
- **Running seed on every request:** Seed runs once at startup, never in route handlers
- **Tailwind v4 without reading migration guide:** v4 removes `tailwind.config.js` entirely — breaking change vs. v3

---

## DB Schema (derived from YAML data shapes)

### Tables

```sql
-- Posts (from posts.yaml + posts-drafts.yaml)
CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,           -- e.g. POST-2026-04-09-01
  status          TEXT NOT NULL,              -- draft | scheduled | published
  platform        TEXT NOT NULL,              -- facebook | both
  type            TEXT,                       -- objection-buster | temoignage | etc.
  hook            TEXT,
  cta_type        TEXT,
  objection_addressed TEXT,
  created_date    DATE,
  published_date  DATE,
  tags            JSONB DEFAULT '[]',
  metrics         JSONB DEFAULT '{}',         -- all numeric metrics as JSON blob
  is_draft        BOOLEAN DEFAULT false,
  content         TEXT,                       -- full post text (from posts-drafts.yaml)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (from comments.yaml)
CREATE TABLE IF NOT EXISTS comments (
  id              TEXT PRIMARY KEY,           -- e.g. CMT-2026-04-05-01
  post_id         TEXT REFERENCES posts(id),
  date            DATE,
  platform        TEXT,
  author_name     TEXT,
  full_name       TEXT,
  classification  TEXT,                       -- info | objection | positive
  objection_type  TEXT,
  comment_text    TEXT,
  response_text   TEXT,
  response_status TEXT DEFAULT 'pending',     -- pending | done
  converted_to_dm BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects / DM Pipeline (from dm-pipeline.yaml)
CREATE TABLE IF NOT EXISTS prospects (
  id                  TEXT PRIMARY KEY,       -- e.g. DM-2026-04-05-01
  source_comment_id   TEXT,
  source_post_id      TEXT REFERENCES posts(id),
  platform            TEXT,
  prospect_name       TEXT,
  full_name           TEXT,
  date_first_contact  DATE,
  stage               TEXT DEFAULT 'new',     -- new|msg1_sent|msg2_sent|msg3_sent|booked|converted|lost
  messages            JSONB DEFAULT '[]',
  calendly_date       DATE,
  conversion_date     DATE,
  lost_reason         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Metrics (from metrics-weekly.yaml)
CREATE TABLE IF NOT EXISTS metrics_weekly (
  week                TEXT PRIMARY KEY,       -- e.g. 2026-W14
  dates               TEXT,
  posts_published     INT DEFAULT 0,
  total_reach         INT DEFAULT 0,
  total_impressions   INT DEFAULT 0,
  total_likes         INT DEFAULT 0,
  total_comments      INT DEFAULT 0,
  total_shares        INT DEFAULT 0,
  info_comments       INT DEFAULT 0,
  dm_opened           INT DEFAULT 0,
  calendly_booked     INT DEFAULT 0,
  patients_converted  INT DEFAULT 0,
  engagement_rate     NUMERIC(5,2) DEFAULT 0,
  best_post_id        TEXT,
  worst_post_id       TEXT,
  top_objection       TEXT,
  learnings           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Session table (connect-pg-simple — see Pattern 4 above)
```

**Note on metrics column in posts:** Store as JSONB blob to avoid 10+ nullable columns. Phase 3 can normalize if needed.

**Note on objections:** The `objections.yaml` file tracks objection frequency. Seed as a simple key-value table or fold into app config — not a blocking schema concern for Phase 1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session store | Custom file/memory session | connect-pg-simple | Memory sessions die on Render restart; DB sessions survive redeploys |
| Password hashing | Custom hash | bcryptjs | bcrypt handles salt, timing attack resistance, work factor |
| PostgreSQL client | Raw `net.Socket` | pg Pool | Connection pooling, SSL, error handling built-in |
| YAML parsing | Regex/split | js-yaml | Handles multi-line strings, anchors, null values correctly |
| Idempotent insert | SELECT then INSERT | `ON CONFLICT (id) DO NOTHING` | Single round-trip, race-condition safe |
| CSS utility classes | Custom CSS file | Tailwind CSS (own build) | Responsive breakpoints, hover states, mobile sidebar — trivial with Tailwind |

---

## Common Pitfalls

### Pitfall 1: Render Free PostgreSQL Data Loss
**What goes wrong:** Developer uses Render's free PostgreSQL addon → data deleted after 90 days (formerly 30). Seeds run fine, then all data vanishes.
**Why it happens:** Free tier is explicitly not for production use.
**How to avoid:** D-12 is a hard blocker. Use Supabase free tier (500 MB persistent, no expiry) or Render Starter ($7/mo). Set `DATABASE_URL` env var from chosen provider before any migration runs.
**Warning signs:** Render dashboard showing "Free" badge on the PostgreSQL service.

### Pitfall 2: ESM/CJS Mix
**What goes wrong:** Copying `package.json` from autopilot brings `"type": "module"` into dashboard → `require()` calls fail with `ERR_REQUIRE_ESM`.
**Why it happens:** autopilot is ESM; dashboard should be CJS (simpler, no `.mjs` extensions needed).
**How to avoid:** Do not set `"type"` in `dashboard/package.json`. Keep all files as `.js` with CJS `require()`.

### Pitfall 3: connect-pg-simple Table Not Created
**What goes wrong:** Server starts, user logs in, session never persists → infinite redirect loop to login.
**Why it happens:** connect-pg-simple does NOT auto-create the `user_sessions` table.
**How to avoid:** Include the session table DDL in `schema.sql` and run it as Wave 0 setup step.

### Pitfall 4: SSL Not Configured for Supabase/Render Postgres
**What goes wrong:** `pg` throws `Error: SSL/TLS required` in production.
**Why it happens:** Both Supabase and Render Postgres require SSL; default pg config doesn't enable it.
**How to avoid:** Pass `ssl: { rejectUnauthorized: false }` in Pool config when `NODE_ENV === 'production'`.

### Pitfall 5: Seed Re-runs Create Duplicates
**What goes wrong:** Server restarts seed every boot → duplicate rows, constraint errors.
**Why it happens:** Simple INSERT without conflict handling.
**How to avoid:** Always use `ON CONFLICT (id) DO NOTHING`. Never use `INSERT OR REPLACE` (not valid Postgres syntax anyway).

### Pitfall 6: Tailwind Classes Missing in Build
**What goes wrong:** EJS templates use Tailwind classes that don't appear in compiled CSS.
**Why it happens:** `tailwind.config.js` content paths don't match actual template locations.
**How to avoid:** Set `content: ["./views/**/*.ejs", "./public/js/**/*.js"]` in `dashboard/tailwind.config.js`.

### Pitfall 7: Express 4 vs Express 5 API Differences
**What goes wrong:** Code copied from autopilot (Express 5) breaks in dashboard (Express 4). Specifically: Express 5 wraps async route errors automatically; Express 4 does NOT — unhandled promise rejections in routes crash the process silently.
**Why it happens:** autopilot uses Express 5 patterns.
**How to avoid:** Wrap all async route handlers in try/catch and call `next(err)` explicitly in Express 4.

---

## Code Examples

### Health Check Endpoint

```javascript
// dashboard/routes/dashboard.js
const { query } = require('./lib/db'); // adjust path
const router = require('express').Router();

router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM posts) AS posts,
        (SELECT COUNT(*) FROM comments) AS comments,
        (SELECT COUNT(*) FROM prospects) AS prospects,
        (SELECT COUNT(*) FROM metrics_weekly) AS metrics
    `);
    res.json({ status: 'ok', db: 'connected', counts: counts.rows[0] });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});
```

### Tailwind Config for Dashboard

```javascript
// dashboard/tailwind.config.js
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#DC512C',
        secondary: '#2C5F4F',
        accent: '#F4E8D8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### Build Scripts in package.json

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build:css": "tailwindcss -i ./tailwind.src.css -o ./public/css/tailwind.css --minify",
    "watch:css": "tailwindcss -i ./tailwind.src.css -o ./public/css/tailwind.css --watch"
  }
}
```

Render build command: `npm install && npm run build:css`
Render start command: `node server.js`

### EJS Layout Pattern

```html
<!-- dashboard/views/layout.ejs -->
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Social Dashboard — Corinne Lacoste</title>
  <link rel="stylesheet" href="/css/tailwind.css">
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Sidebar (hidden on mobile, toggle via JS) -->
  <aside id="sidebar" class="fixed inset-y-0 left-0 w-64 bg-secondary text-white transform -translate-x-full md:translate-x-0 transition-transform z-30">
    <!-- nav items -->
  </aside>
  <!-- Main content -->
  <main class="md:ml-64 p-6">
    <%- body %>
  </main>
  <script src="/js/app.js"></script>
</body>
</html>
```

Note: EJS does not have a built-in layout system. Use `ejs-mate` or `express-ejs-layouts` package, or implement manually via `res.locals` partial pattern.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22.17.1 | — |
| npm | Package install | ✓ | 11.5.2 | — |
| PostgreSQL (local) | Dev DB | ✗ | — | Use Supabase free tier for dev too |
| Supabase / Render Postgres | INFRA-02 | Must provision | — | No fallback — D-12 blocker |

**Missing dependencies with no fallback:**
- PostgreSQL instance: Developer must provision Supabase free tier (or Render Starter) and set `DATABASE_URL` env var before any seed or migration task can run. This is a Wave 0 prerequisite.

**Missing dependencies with fallback:**
- Local PostgreSQL: Use Supabase free tier directly (works for development with Supabase connection string).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — matches autopilot pattern |
| Quick run command | `node --test tests/*.test.js` |
| Full suite command | `node --test tests/**/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Express server starts on PORT, returns 200 on /health | smoke | `node --test tests/server.test.js` | ❌ Wave 0 |
| INFRA-02 | pg Pool connects to DB, query returns rows | integration | `node --test tests/db.test.js` | ❌ Wave 0 |
| INFRA-03 | Seed runs twice; row count unchanged on second run | integration | `node --test tests/seed.test.js` | ❌ Wave 0 |
| INFRA-04 | POST /login with correct password sets session; wrong password returns redirect to /login with error | integration | `node --test tests/auth.test.js` | ❌ Wave 0 |
| INFRA-05 | Login page and dashboard shell render without horizontal scroll at 375px | manual | Visual check in browser DevTools | manual-only |

### Sampling Rate

- **Per task commit:** `node --test tests/server.test.js tests/db.test.js`
- **Per wave merge:** `node --test tests/**/*.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/tests/server.test.js` — covers INFRA-01 (health endpoint smoke)
- [ ] `dashboard/tests/db.test.js` — covers INFRA-02 (DB connection)
- [ ] `dashboard/tests/seed.test.js` — covers INFRA-03 (idempotent seed)
- [ ] `dashboard/tests/auth.test.js` — covers INFRA-04 (login/logout)
- [ ] `dashboard/tests/fixtures/` — shared DB setup/teardown helpers
- [ ] Framework: Node.js built-in — no install needed

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| express-session in-memory store | connect-pg-simple session store | Render restarts are common | Sessions survive deploys |
| Tailwind JIT via PostCSS | Tailwind CLI (`tailwindcss` binary) | Tailwind v3+ | Simpler build, no PostCSS config |
| `INSERT ... SELECT WHERE NOT EXISTS` | `INSERT ... ON CONFLICT DO NOTHING` | PostgreSQL 9.5+ | Atomic, race-safe idempotent insert |

---

## Open Questions

1. **Supabase vs Render Starter for DB**
   - What we know: D-12 forbids Render free tier. Supabase free = 500 MB, no expiry. Render Starter = $7/mo, 1 GB.
   - What's unclear: User has not confirmed which to use. Supabase free tier is sufficient for Phase 1 data volume (< 1 MB of YAML).
   - Recommendation: Planner should include a Wave 0 task "Provision Supabase free tier OR Render Starter and set DATABASE_URL" — this blocks all DB tasks.

2. **EJS layout strategy**
   - What we know: EJS has no built-in layout support. Options: `express-ejs-layouts` package (adds 1 dep), or manual `res.render()` with `res.locals.body` partial pattern.
   - What's unclear: Whether to add a dep or keep zero layout deps.
   - Recommendation: Use `express-ejs-layouts` (lightweight, 1 dep) — avoids hand-rolling include chains.

3. **Tailwind v3 vs v4**
   - What we know: Latest tailwindcss is 4.2.2. v4 removes `tailwind.config.js` entirely — uses CSS `@theme` directive. Main site uses v3 (^3.4.19).
   - Recommendation: Use Tailwind v3 for the dashboard to match main site conventions and avoid a migration risk. Pin `"tailwindcss": "^3.4.19"`.

---

## Project Constraints (from CLAUDE.md)

- Do not add Co-Authored-By lines to git commits
- Do not hardcode prices (not applicable to dashboard, but don't hardcode passwords)
- Do not hand-edit `config.min.js` — not applicable to dashboard
- Do not mention rTMS anywhere
- Dashboard lives in `dashboard/` — separate from static site and autopilot
- Use `"type"` omission (CJS) — do not copy autopilot's ESM setup
- After any config.js edit: rebuild config.min.js — not applicable to dashboard

---

## Sources

### Primary (HIGH confidence)
- `E:/Site CL/autopilot/routes/auth.js` — working bcrypt + express-session pattern (verified in codebase)
- `E:/Site CL/tailwind.config.js` — brand color tokens (verified)
- `E:/Site CL/.social-engine/data/*.yaml` — exact schema shapes (verified by reading 4 files)
- npm registry (`npm view` verified) — all package versions confirmed 2026-04-06

### Secondary (MEDIUM confidence)
- connect-pg-simple README pattern — session table DDL (standard, widely documented)
- PostgreSQL `ON CONFLICT DO NOTHING` — official PostgreSQL 9.5+ feature

### Tertiary (LOW confidence)
- Supabase free tier limits (500 MB, no expiry) — based on training knowledge; verify at supabase.com/pricing before provisioning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified 2026-04-06
- Architecture: HIGH — patterns derived from existing autopilot code in same repo
- DB Schema: HIGH — derived directly from YAML data files
- Pitfalls: HIGH — based on verified codebase patterns and known Render/pg behaviors

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (stable stack — 90 days)
