# Requirements: Social Acquisition Dashboard

**Defined:** 2026-04-05
**Core Value:** See what needs attention right now and act on it in one click — so no lead falls through the cracks.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Server runs as single Express + EJS process on Render, serving both API and frontend
- [x] **INFRA-02**: PostgreSQL database stores all application data (posts, comments, prospects, metrics)
- [x] **INFRA-03**: YAML seed import migrates existing `.social-engine/data/*.yaml` into database on first run (idempotent)
- [ ] **INFRA-04**: Simple password authentication with server-side sessions (connect-pg-simple)
- [ ] **INFRA-05**: Responsive layout usable on mobile for quick checks

### Priority Inbox

- [ ] **INBOX-01**: Homepage shows today's scheduled post(s) with publish status (draft/scheduled/published)
- [ ] **INBOX-02**: Homepage shows count and list of unresponded comments needing action
- [ ] **INBOX-03**: Homepage shows DM follow-ups due with overdue items highlighted
- [ ] **INBOX-04**: Response time tracking flags comments older than 2h without response

### Post Management

- [ ] **POST-01**: User can view all posts filtered by status (draft/scheduled/published)
- [ ] **POST-02**: User can create a new post with content, type, platform, scheduled date
- [ ] **POST-03**: User can edit existing post content and metadata
- [ ] **POST-04**: User can view posts in a weekly/monthly calendar view
- [ ] **POST-05**: User can drag-and-drop posts between dates in calendar view
- [ ] **POST-06**: User can copy post content to clipboard for manual Facebook posting

### Comment Tracking

- [ ] **CMT-01**: User can view comments listed by post, classified as info/objection/positive
- [ ] **CMT-02**: User can mark a comment as handled (with response text)
- [ ] **CMT-03**: User can convert an INFO comment to a DM prospect in one click (creates prospect card)

### DM Pipeline

- [ ] **DM-01**: User can view prospect cards with current stage (new -> msg1_sent -> msg2_sent -> msg3_sent -> booked -> converted -> lost)
- [ ] **DM-02**: User can advance a prospect to the next stage or mark as lost with reason
- [ ] **DM-03**: User can view and copy DM templates to clipboard for each sequence step
- [ ] **DM-04**: Dashboard highlights overdue follow-ups based on DM sequence timing rules
- [ ] **DM-05**: Conversion funnel visualization shows prospects at each stage with percentages

### AI Generation

- [ ] **AI-01**: User can generate a post draft using Claude API by selecting a type (objection-buster, temoignage, myth-buster, timeline, etc.)
- [ ] **AI-02**: User can edit the AI-generated draft inline before saving to post list
- [ ] **AI-03**: Objection frequency tracker auto-suggests post topics when an objection reaches threshold (frequency >= 3)

### Analytics

- [ ] **STAT-01**: User can input weekly metrics manually (reach, impressions, likes, comments, shares, info_comments, dm_opened, calendly_booked)
- [ ] **STAT-02**: KPI dashboard displays key rates: engagement rate, INFO->DM conversion, DM->Calendly conversion, Calendly->Patient conversion
- [ ] **STAT-03**: Visual funnel chart showing reach -> comments -> DM -> Calendly -> patient flow
- [ ] **STAT-04**: Post performance comparison showing metrics across posts to identify top performers

### Facebook API

- [ ] **FB-01**: Dashboard can auto-post scheduled content to Facebook page via Graph API
- [ ] **FB-02**: Dashboard pulls new comments from Facebook automatically (polling or webhook)
- [ ] **FB-03**: Dashboard pulls real metrics from Facebook (reach, impressions, engagement) for published posts
- [ ] **FB-04**: Token health check UI shows current token status and warns before expiry

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Platform

- **PLAT-01**: LinkedIn posting and metrics integration
- **PLAT-02**: Instagram stories/reels support

### Advanced AI

- **AI-04**: A/B test post variants with AI-generated alternatives
- **AI-05**: AI-powered comment response suggestions
- **AI-06**: Automatic post performance prediction before publishing

### Automation

- **AUTO-01**: Calendly API integration for automatic booking detection
- **AUTO-02**: Push notifications for urgent actions (overdue comments, token expiry)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / role-based access | Single operator only, unnecessary complexity |
| Automated DM sending via API | Facebook policy prohibits automated DMs |
| Direct Calendly API | Just track bookings manually, no API needed for v1 |
| Real-time push notifications | Dashboard is checked on-demand, not a monitoring tool |
| LinkedIn integration | Facebook drives conversions; LinkedIn is secondary |
| Public-facing features | Internal tool only |
| Mobile native app | Responsive web is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INBOX-01 | Phase 2 | Pending |
| INBOX-02 | Phase 2 | Pending |
| INBOX-03 | Phase 2 | Pending |
| INBOX-04 | Phase 2 | Pending |
| POST-01 | Phase 2 | Pending |
| POST-02 | Phase 3 | Pending |
| POST-03 | Phase 3 | Pending |
| POST-04 | Phase 2 | Pending |
| POST-05 | Phase 3 | Pending |
| POST-06 | Phase 3 | Pending |
| CMT-01 | Phase 2 | Pending |
| CMT-02 | Phase 3 | Pending |
| CMT-03 | Phase 3 | Pending |
| DM-01 | Phase 2 | Pending |
| DM-02 | Phase 3 | Pending |
| DM-03 | Phase 3 | Pending |
| DM-04 | Phase 2 | Pending |
| DM-05 | Phase 2 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| STAT-01 | Phase 3 | Pending |
| STAT-02 | Phase 2 | Pending |
| STAT-03 | Phase 2 | Pending |
| STAT-04 | Phase 3 | Pending |
| FB-01 | Phase 5 | Pending |
| FB-02 | Phase 5 | Pending |
| FB-03 | Phase 5 | Pending |
| FB-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
