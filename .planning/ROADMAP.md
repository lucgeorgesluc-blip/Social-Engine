# Roadmap: Social Acquisition Dashboard

## Overview

Five phases deliver a complete Facebook acquisition management tool: infrastructure first (DB, auth, seed), then visibility (read layer), then action (write operations), then leverage (AI generation), then automation (Facebook API). Each phase is independently deployable. The dashboard is fully usable after Phase 3 with manual copy-paste; Phases 4 and 5 multiply operator effectiveness without being prerequisites to core value.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Express server on Render with paid Postgres, session auth, complete DB schema, idempotent YAML seed
- [x] **Phase 2: Read Layer** - Priority inbox, post list, comment list, DM pipeline, calendar — all visible, nothing writable yet (completed 2026-04-07)
- [ ] **Phase 3: Write Operations** - Mark handled, INFO-to-DM conversion, stage advancement, metrics input, clipboard workflows
- [ ] **Phase 4: AI Generation** - Claude-powered post drafts, objection frequency tracker, performance benchmarks
- [ ] **Phase 5: Facebook Integration** - Comment pull, metrics sync, token health check, auto-posting if App Review approved

## Phase Details

### Phase 1: Foundation
**Goal**: A working Express app is deployed on Render with a paid Postgres database, password auth, complete DB schema, and all existing YAML data successfully seeded
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Visiting the Render URL shows a login page; entering the correct password grants access; wrong password is rejected
  2. After first boot, all posts/comments/prospects/metrics from `.social-engine/data/*.yaml` exist in the database; running boot a second time adds no duplicates
  3. A health check endpoint returns 200 with DB connection status confirmed
  4. The layout renders without horizontal scroll on a 375px-wide mobile screen
  5. Render free PostgreSQL is NOT the active database — a paid Render Starter or Supabase free tier is confirmed before any data is written
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold project, DB schema, seed script, health endpoint
- [x] 01-02-PLAN.md — Auth flow, EJS views, sidebar nav shell, responsive layout
- [ ] 01-03-PLAN.md — Render deploy config, DB provisioning, end-to-end verification
**UI hint**: yes

### Phase 2: Read Layer
**Goal**: The operator can see all data in one dashboard — today's priorities, all posts by status, every comment per post, DM pipeline cards, content calendar, and conversion funnel — without being able to modify anything yet
**Depends on**: Phase 1
**Requirements**: INBOX-01, INBOX-02, INBOX-03, INBOX-04, POST-01, POST-04, CMT-01, DM-01, DM-04, DM-05, STAT-02, STAT-03
**Success Criteria** (what must be TRUE):
  1. Homepage shows today's scheduled post(s) with publish status, count of unresponded comments, and DM follow-ups due — overdue items visually highlighted
  2. Comments older than 2 hours without a response are flagged on the homepage
  3. Post list page shows all posts filterable by draft/scheduled/published status
  4. Calendar page shows posts in weekly and monthly views
  5. DM pipeline page shows prospect cards at each stage with conversion percentages between stages
**Plans**: TBD
**UI hint**: yes

### Phase 3: Write Operations
**Goal**: The operator can act on everything they see — mark comments handled, convert INFO comments to prospects in one click, advance DM stages, create and edit posts, copy content to clipboard, and input weekly metrics
**Depends on**: Phase 2
**Requirements**: POST-02, POST-03, POST-05, POST-06, CMT-02, CMT-03, DM-02, DM-03, STAT-01, STAT-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Handled" on a comment saves the response text and removes it from the homepage unresponded list immediately
  2. Clicking "Convert to DM" on an INFO comment creates a prospect card pre-filled with commenter name and comment text — visible on the DM pipeline page instantly
  3. A prospect card can be advanced to the next stage or marked lost with a reason; funnel percentages update
  4. User can copy a post's full text to clipboard in one click for manual Facebook posting
  5. User can input weekly metrics and view a post performance comparison table across all published posts
**Plans**: TBD
**UI hint**: yes

### Phase 4: AI Generation
**Goal**: The operator can generate Facebook post drafts via Claude API, edit them inline, and the system surfaces objection-based topic suggestions when patterns repeat — all with cost guardrails preventing runaway API spend
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. Selecting a post type (objection-buster, temoignage, myth-buster, timeline, etc.) and clicking Generate produces a draft post in under 10 seconds
  2. The generated draft is editable inline and saveable to the post list with one click
  3. When an objection type appears 3+ times in tracked comments, a suggested post topic appears on the dashboard homepage
  4. A generation counter is visible; the system warns at 50 generations/month and refuses at 100
**Plans**: 2 plans
Plans:
- [ ] 04-01-PLAN.md — AI backend: Claude API wrapper, prompt templates, cost guardrails, objection tracker, routes
- [ ] 04-02-PLAN.md — AI frontend: generation page, inline edit, save-as-draft, homepage suggestions, sidebar nav

### Phase 5: Facebook Integration
**Goal**: The dashboard pulls real comments and metrics from Facebook automatically, the token health is always visible, and — if App Review for pages_manage_posts is approved — scheduled posts are auto-published without operator action
**Depends on**: Phase 4
**Requirements**: FB-01, FB-02, FB-03, FB-04
**Success Criteria** (what must be TRUE):
  1. A token health banner is always visible — green if valid, amber with days-until-expiry if within 7 days, red with "expired" if invalid
  2. New Facebook comments appear in the dashboard comment list without manual import
  3. Real reach, impressions, and engagement metrics from Facebook are visible for each published post
  4. If pages_manage_posts App Review is approved: a scheduled post publishes to the Facebook page at its scheduled time without operator action
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In Progress|  |
| 2. Read Layer | 3/3 | Complete   | 2026-04-07 |
| 3. Write Operations | 0/? | Not started | - |
| 4. AI Generation | 0/2 | Not started | - |
| 5. Facebook Integration | 0/? | Not started | - |
