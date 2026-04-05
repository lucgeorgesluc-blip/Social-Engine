# Technology Stack

**Project:** Social Acquisition Dashboard — magnetiseuse-lacoste-corinne.fr
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH (core stack well-established; Facebook API specifics LOW due to deprecation churn)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20 LTS | Runtime | LTS stability, native fetch, Render-supported |
| Express.js | 4.x | HTTP server + API routing | Minimal overhead, zero magic, single-file deployable. No need for NestJS/Fastify complexity for one user |
| EJS | 3.x | Server-side HTML templating | Renders full pages server-side — no client build step, no bundler, no hydration. One server = one Render service |

**Why not React/Next.js/Vue:** The dashboard is a single-user internal tool. A full SPA adds a build pipeline, client-side state management, and a second mental model. EJS (or plain HTML partials) renders on the server and ships HTML. No npm build step on Render free tier, no cold-start JS bundle.

**Why not HTMX:** HTMX is valid for partial updates (comments list, DM pipeline cards). Include it as a progressive enhancement for AJAX interactions — it does not require a framework switch. `<script src="https://unpkg.com/htmx.org@1.9">` is enough.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 15 (Render managed) | Primary data store | Render free tier provides managed Postgres. Already decided in PROJECT.md |
| `pg` (node-postgres) | 8.x | DB driver | Raw SQL, zero overhead, no schema generation step. pg has 10.9M weekly downloads vs Prisma's 5.7M. For a project with ~8 tables and one developer, SQL is faster to write and easier to debug than ORM magic |

**Why not Prisma:** Prisma adds a schema compilation step, a migration engine, and a Prisma Client build. On Render free tier this adds deploy time and cold start weight. For 8 tables and one developer, raw SQL with pg is faster and produces no hidden abstractions. Prisma's 2x query overhead (documented in their own issue tracker) is also unnecessary.

**Why not SQLite:** PROJECT.md already decided against it — Render free tier has no persistent disk, so SQLite would lose data on redeploy.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `express-session` | 1.x | Session management | Standard Express session middleware |
| `connect-pg-simple` | 9.x | Session store (Postgres) | Persists sessions in the same Postgres DB. Avoids MemoryStore leak (MemoryStore is explicitly not for production per Express docs) |
| `bcrypt` | 5.x | Password hashing | Hash the single shared password at startup; compare on login. Do not store plaintext in env vars |

**Flow:** Single hardcoded password (from `DASHBOARD_PASSWORD` env var, bcrypt-hashed at boot). Login form → express-session cookie → all routes check `req.session.authenticated`. No JWT, no OAuth, no Passport.js — all unnecessary for one user.

---

### Facebook Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `fetch` (Node 20) | built-in | Graph API HTTP calls | No SDK needed. The official `facebook-nodejs-business-sdk` is a Marketing API SDK (ads/campaigns), not suited for page post management. Raw fetch against Graph API endpoints is simpler and more debuggable |
| Facebook Graph API | **v22.0** | Page posting, metrics, comments | v22.0 released January 2025. v21.0 reaches end-of-life September 2025. Use v22.0 from day one |

**Critical warning (LOW confidence — verify before building metrics):** Meta announced that several Page Insights metrics will be deprecated by June 15, 2026. Before implementing the performance dashboard, verify which metrics survive at `developers.facebook.com/docs/graph-api/reference/insights/`. Build metric queries against what is confirmed available, not against what worked in 2024.

**Auth tokens:** Facebook Page Access Token (long-lived, ~60 days). Store in Postgres, refresh via `/oauth/access_token?grant_type=fb_exchange_token`. Build a token-refresh warning into the dashboard (show expiry date on settings page).

---

### AI Content Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@anthropic-ai/sdk` | 0.82.0 (latest as of 2026-04-05) | Claude API calls for post generation | Official SDK with typed interfaces, streaming, automatic retries. 7M+ weekly downloads. Already used in project tooling |

**Model:** `claude-3-5-haiku-20241022` for post generation (fast, cheap, sufficient for 1500-char Facebook posts). Use `claude-3-5-sonnet` only if output quality is demonstrably insufficient.

**Pattern:** POST `/api/generate-post` → server calls Claude with brand context from `config.yaml` → returns draft JSON → client renders editable textarea. No streaming needed for post generation (content is short).

---

### Infrastructure & Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Render Web Service | free/starter | Hosting | Single service constraint from PROJECT.md. Express serves both API and HTML |
| Render PostgreSQL | free tier | Database | Managed, no ops burden |
| `dotenv` | 16.x | Env var management | `DATABASE_URL`, `ANTHROPIC_API_KEY`, `FB_PAGE_TOKEN`, `DASHBOARD_PASSWORD`, `SESSION_SECRET` |

**Single-service architecture:** Express serves static assets (`/public`), renders EJS templates for pages, and exposes `/api/*` routes. No separate frontend build, no separate API service. One Render service = one `package.json` + `node server.js`.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` | 4.x | YAML import at first boot | Parse existing `.social-engine/data/*.yaml` files to seed DB |
| `node-cron` | 3.x | Scheduled post auto-publishing | Cron job inside the Express process — checks DB for posts due, calls Graph API. Simpler than a separate worker |
| `dayjs` | 1.x | Date/time handling | Lightweight (2KB), handles timezone display for post scheduling (Troyes = Europe/Paris) |
| `multer` | 1.x | Image upload for posts | If image attachment to Facebook posts is needed — add in a later phase |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Templating | EJS | React/Next.js | Build pipeline + SPA complexity for a single internal user |
| Templating | EJS | HTMX standalone | HTMX works as enhancement on top of EJS, not a replacement |
| ORM | pg (raw SQL) | Prisma | Schema compilation, deploy weight, 2x query overhead on free tier |
| ORM | pg (raw SQL) | Drizzle ORM | Valid alternative to Prisma, but still adds abstraction layer for 8 tables |
| Auth | express-session | JWT | Stateless JWT brings no benefit for a single-server single-user app |
| Auth | express-session | Passport.js | Passport is for multi-strategy auth — overkill for one shared password |
| Facebook SDK | Native fetch | facebook-nodejs-business-sdk | SDK targets Marketing/Ads API, not page content management |
| Scheduler | node-cron | Bull/BullMQ | Queue system is for distributed workers — not needed on a single Render service |
| Runtime | Node 20 LTS | Bun | Render support for Bun is not yet first-class; stick with Node for reliable free-tier deploys |

---

## Installation

```bash
# Runtime dependencies
npm install express ejs pg connect-pg-simple express-session bcrypt
npm install @anthropic-ai/sdk js-yaml node-cron dayjs dotenv

# Optional (add in later phases)
npm install multer

# Dev dependencies
npm install -D nodemon
```

---

## Key Environment Variables

```
DATABASE_URL=          # Render Postgres internal URL
ANTHROPIC_API_KEY=     # Anthropic API key
FB_PAGE_ID=            # Facebook Page ID
FB_PAGE_ACCESS_TOKEN=  # Long-lived Page Access Token
FB_TOKEN_EXPIRY=       # ISO date string, show warning in dashboard
DASHBOARD_PASSWORD=    # Plaintext at deploy; bcrypt-hashed at runtime
SESSION_SECRET=        # Random 32-char string for session signing
NODE_ENV=production
PORT=10000             # Render assigns this
```

---

## Confidence Assessment

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Node 20 + Express 4 + EJS | HIGH | Render docs confirm Node 20 support; Express 4 is stable and dominant |
| pg over Prisma | HIGH | npm download data + Prisma perf issue confirmed in their issue tracker |
| express-session + connect-pg-simple | HIGH | Official Express docs explicitly warn against MemoryStore in production |
| Graph API v22.0 | MEDIUM | v22.0 announced January 2025; current stable per community reports |
| Facebook metrics endpoints | LOW | Deprecation announced June 2026 — verify specific metrics before building |
| @anthropic-ai/sdk 0.82.0 | HIGH | Current npm latest as of 2026-04-05, 7M+ weekly downloads |
| node-cron for scheduling | MEDIUM | Works within single-process Express; verified pattern for Render single services |

---

## Sources

- [Building a Node.js App with Postgres on Render](https://sodiqfarhan.hashnode.dev/building-a-nodejs-app-with-postgres-database-on-render-a-step-by-step-guide-beginner-friendly)
- [node-postgres vs prisma npm trends](https://npmtrends.com/node-postgres-vs-pg-vs-prisma-vs-sequelize)
- [Prisma 2x query overhead issue](https://github.com/prisma/prisma/issues/23573)
- [express-session middleware docs](https://expressjs.com/en/resources/middleware/session.html)
- [@anthropic-ai/sdk on npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Introducing Graph API v22.0](https://developers.facebook.com/blog/post/2025/01/21/introducing-graph-api-v22-and-marketing-api-v22/)
- [Page Insights deprecation notice](https://developers.facebook.com/docs/graph-api/reference/insights/)
- [facebook-nodejs-business-sdk (Marketing API)](https://github.com/facebook/facebook-nodejs-business-sdk)
- [HTMX server-side examples](https://htmx.org/server-examples/)
