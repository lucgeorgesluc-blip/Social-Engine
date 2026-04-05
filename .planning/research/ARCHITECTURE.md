# Architecture Patterns — Social Acquisition Dashboard

**Domain:** Single-operator social media management dashboard
**Researched:** 2026-04-05
**Confidence:** HIGH (standard patterns, well-understood domain)

---

## Recommended Architecture

A single Node.js process serves both the REST API and the static frontend. No separate frontend server, no microservices. One Render web service, one PostgreSQL instance.

```
Browser (SPA or server-rendered HTML)
        |
        | HTTP (same origin)
        v
+---------------------------+
|   Express.js Application  |  ← single Render web service
|                           |
|  [Static file middleware] |  ← serves frontend assets
|  [Auth middleware]        |  ← shared password check, session cookie
|  [REST API routes]        |  ← /api/*
|       |                   |
|  [Service layer]          |  ← business logic, no DB calls here
|       |         |         |
|  [DB layer]  [Ext APIs]   |
+---------------------------+
       |              |
  PostgreSQL     Facebook Graph API
  (Render DB)    Claude API (Anthropic)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Static middleware | Serve frontend HTML/CSS/JS | Browser only |
| Auth middleware | Validate session cookie on all `/api/*` | Session store (in-memory or DB) |
| Posts router | CRUD for post drafts, schedule, status | DB layer, Facebook API client |
| Comments router | List, classify, mark-handled | DB layer |
| DM Pipeline router | Prospect stage transitions, follow-up dates | DB layer |
| Metrics router | Read weekly metrics, engagement rates | DB layer |
| AI router | Generate post draft via Claude | Claude API client, DB layer |
| Facebook client | Post content, pull comments/metrics | Facebook Graph API |
| Claude client | Generate post copy from prompt | Anthropic API |
| DB layer | All SQL queries, no business logic | PostgreSQL |
| Seed service | Import YAML files → DB (run-once on startup) | DB layer, filesystem |
| Scheduler (lightweight) | Trigger Facebook posting at scheduled times | Posts router, Facebook client |

---

## Data Flow

### Post Creation and Publishing

```
User clicks "Generate" in UI
  → POST /api/ai/generate-post (body: type, objection, hook)
  → Claude client sends prompt to Anthropic API
  → Response stored as draft in posts table
  → UI shows editable draft
  → User edits, clicks "Schedule"
  → POST /api/posts/:id/schedule (body: publish_at)
  → Scheduler picks it up at publish_at
  → Facebook client calls Graph API POST /page/feed
  → Post record updated: status=published, platform_post_id=FB_ID
```

### Comment Monitoring and DM Pipeline

```
Scheduler polls Facebook every N minutes (or webhook if Meta approves)
  → Facebook client GET /post/comments
  → New comments written to comments table
  → Dashboard shows unhandled comments flagged
  → User classifies: info / objection / positive
  → If info → User clicks "Create prospect"
  → New row in prospects table: stage=new
  → Dashboard shows DM follow-up card
  → User marks DM sent → stage=msg1_sent
  → System flags for follow-up after 48h (msg2) and 168h (msg3)
  → User marks booked → stage=calendly_booked
  → User marks converted/lost → funnel complete
```

### Metrics Aggregation

```
Weekly: user triggers "Refresh metrics"
  → Facebook client pulls reach/impressions/engagement per post
  → Metrics written to post_metrics table
  → Conversion rates computed server-side from DB joins
  → Dashboard renders funnel: reach → comments → DM → Calendly → patient
```

### YAML Seed (one-time)

```
App starts → Seed service checks if DB is empty
  → If empty: reads .social-engine/data/*.yaml
  → Transforms YAML schema → DB schema
  → Inserts posts, prospects, comments, objections
  → Sets seed_completed flag in config table
  → Never runs again (idempotent guard)
```

---

## Database Schema (key tables)

```sql
posts (id, platform, type, status, hook, content, scheduled_at, published_at,
       platform_post_id, objection_addressed, cta_type, tags)

post_metrics (post_id, impressions, reach, likes, comments, shares, saves,
              link_clicks, info_comments, dm_opened, calendly_booked,
              engagement_rate, recorded_at)

comments (id, post_id, platform_comment_id, author_name, author_id,
          content, classification, handled, created_at)

prospects (id, source_comment_id, source_post_id, platform, prospect_name,
           full_name, stage, date_first_contact, calendly_date,
           conversion_date, lost_reason, notes)

dm_messages (id, prospect_id, seq, content, sent_at)

objections (id, type, frequency, last_seen_at, post_suggestion)

app_config (key, value)  -- used for seed_completed flag, etc.
```

Stages for prospects (matches existing YAML):
`new → msg1_sent → msg2_sent → msg3_sent → calendly_booked → converted | lost`

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Frontend Build Server
**What:** Vite dev server or separate React SPA build process deployed independently.
**Why bad:** Two Render services = two billing units; CORS complexity; no benefit for single-user internal tool.
**Instead:** Express serves static files from `dashboard/public/`. Vanilla JS or minimal bundled JS (esbuild one-shot). No dev server in production.

### Anti-Pattern 2: Polling Facebook on Every Page Load
**What:** Hitting Facebook Graph API on every dashboard request.
**Why bad:** Rate limits (200 calls/hour per user token for Graph API v18+), slow UX.
**Instead:** Scheduled background fetch every 15 minutes (setInterval in the same process, or a cron-style endpoint). Cache results in DB.

### Anti-Pattern 3: Storing Facebook Token in Code
**What:** Hardcoding Page Access Token in source.
**Why bad:** Tokens expire; security exposure in git history.
**Instead:** Render environment variable `FB_PAGE_TOKEN`. Long-lived Page Access Token (60-day expiry) refreshed manually. Show expiry warning in dashboard.

### Anti-Pattern 4: Business Logic in Route Handlers
**What:** SQL queries and Facebook API calls directly in Express route callbacks.
**Why bad:** Untestable, hard to reuse, bloated handlers.
**Instead:** Thin routes → service functions → DB layer. Three distinct layers even in a simple app.

### Anti-Pattern 5: Syncing DB Back to YAML
**What:** Writing changes back to `.social-engine/data/*.yaml` when DB changes.
**Why bad:** Dual source of truth causes drift and conflicts.
**Instead:** After seed, DB is the only source of truth. YAML files become read-only historical artifacts.

---

## Suggested Build Order (dependency chain)

```
1. DB schema + migrations
   ↓
2. DB layer (query functions)
   ↓
3. Seed service (YAML → DB, proves schema is correct)
   ↓
4. Auth middleware (all subsequent routes depend on it)
   ↓
5. Posts CRUD API + basic frontend (earliest working loop)
   ↓
6. Claude API client + AI generation endpoint
   ↓
7. Comments API + DM pipeline API
   ↓
8. Facebook client (read: pull comments/metrics)
   ↓
9. Facebook client (write: auto-post scheduled content)
   ↓
10. Metrics aggregation + funnel dashboard
    ↓
11. Scheduler (ties Facebook read/write to time-based triggers)
```

Rationale: Steps 1-5 deliver a working tool with no external API dependencies — importable, usable, deployable. External APIs added incrementally so failures are isolated. Facebook write (step 9) comes after read (step 8) because publishing is riskier and requires read to verify the integration first.

---

## Scalability Considerations

This is a single-user internal tool. Scalability is not a concern. The architecture is intentionally sized for one operator, ~3 posts/week, ~10-50 prospects in pipeline at any time.

| Concern | At current scale | If this ever changes |
|---------|-----------------|---------------------|
| DB load | Trivial (< 100 rows/table) | Still trivial at 10K rows |
| Facebook API rate limits | 200 calls/hour — polling every 15 min is safe | Add webhook subscription |
| Claude API cost | ~$0.01/generation at current usage | Add a daily cap |
| Auth | Single shared password + session cookie | Add proper user table |

---

## Sources

- Facebook Graph API rate limits: META confidence HIGH (standard documented limits)
- Express static file serving pattern: HIGH confidence (official Express docs)
- Render single-service deployment: MEDIUM confidence (based on Render free tier constraints documented at render.com)
- Data model: HIGH confidence (derived directly from `.social-engine/data/*.yaml` files in this repo)
- Build order: MEDIUM confidence (dependency analysis from project requirements)
