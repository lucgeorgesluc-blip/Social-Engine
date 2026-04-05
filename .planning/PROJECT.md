# Social Acquisition Dashboard

## What This Is

A web dashboard hosted on Render that gives a single operator (Benjamin) full visibility and control over Corinne Lacoste's social media acquisition engine. It reads/writes to a PostgreSQL database (seeded from existing `.social-engine/` YAML files), connects to Facebook API for auto-posting and metrics, and uses Claude API for AI-powered post generation. The goal: convert Facebook engagement into booked appointments for a magnetiseuse near Troyes.

## Core Value

See what needs attention right now (posts to publish, comments to answer, prospects to DM) and act on it in one click — so no lead falls through the cracks.

## Requirements

### Validated

- YAML-based social engine exists with: posts registry, post drafts, content calendar, comments tracker, DM pipeline, objections tracker, weekly metrics template
- Brand config, trust signals, DM sequence rules already defined in `.social-engine/config.yaml`
- 10 draft posts ready, 1 published post with real comment/prospect data

### Active

- [ ] Dashboard homepage with today's priorities: next post to publish, pending comments, DM follow-ups due
- [ ] Post management: calendar view, create/edit/schedule posts, copy-to-clipboard for manual posting
- [ ] AI post generation: click to generate a draft using Claude API, edit inline, save to schedule
- [ ] Comment tracking: list unresponded comments, classify (info/objection/positive), mark as handled
- [ ] DM pipeline: prospect cards with stage tracking (new -> msg1 -> msg2 -> msg3 -> booked -> converted/lost)
- [ ] Performance dashboard: weekly metrics, engagement rate, conversion funnel (reach -> comments -> DM -> Calendly -> patient)
- [ ] Objection tracker: frequency-based objection detection, auto-suggest post topics when threshold hit
- [ ] Facebook API integration: auto-post scheduled content, pull real metrics/comments from Facebook
- [ ] Content calendar: visual weekly/monthly view with drag-and-drop scheduling
- [ ] Simple password authentication (single user)
- [ ] YAML import: seed database from existing `.social-engine/data/*.yaml` files on first run
- [ ] Responsive design (usable on mobile for quick checks)

### Out of Scope

- Multi-user / role-based access — single operator only
- LinkedIn integration — Facebook first, LinkedIn later
- Automated DM sending — DMs are manual (Facebook policy), dashboard only tracks them
- Direct Calendly integration — just track if prospect booked, no API connection
- Real-time notifications / push alerts — check dashboard when needed
- Public-facing features — this is an internal tool only

## Context

- **Existing data:** `.social-engine/` contains 7 YAML files with posts, drafts, calendar, comments, DM pipeline, objections, and metrics template. This is the seed data.
- **Niche:** Tobacco cessation via magnetism/hypnosis near Troyes. Posts target smokers, use objection-busting and social proof strategies.
- **Conversion funnel:** Post -> "INFO" comment -> DM sequence (3 messages max) -> Calendly booking -> Patient
- **Key KPIs:** Engagement rate >5%, INFO comments >2/post, INFO->DM >80%, DM->Calendly >30%, Calendly->Patient >70%
- **Posting cadence:** 3/week on Facebook, best hours 07:00-09:00 and 18:00-20:00
- **Trust signals:** 85% success rate, 4.9 stars (35+ reviews), 15+ years experience, Pascal Bescos training

## Constraints

- **Hosting:** Render single web service (free or starter tier)
- **Database:** Render free PostgreSQL
- **Auth:** Simple shared password (no OAuth, no user management)
- **AI:** Claude API (Anthropic) for post generation
- **Facebook API:** Meta Graph API for posting, metrics, and comment retrieval
- **Budget:** Minimal — free tiers where possible, only pay for AI API calls
- **Tech stack:** Simplest that works (to be decided during research — likely Node.js + lightweight frontend)
- **Repo:** Lives inside the existing Site CL repo under a dedicated directory (e.g., `dashboard/`)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Render for hosting | Already familiar, single service simplicity | — Pending |
| Free PostgreSQL over SQLite | No persistent disk needed, more robust for production | — Pending |
| Claude API for generation | Already have API access, consistent with existing tooling | — Pending |
| Seed from YAML, then DB owns data | Clean break from file-based system, no sync complexity | — Pending |
| Single password auth | Only one user, minimal complexity | — Pending |
| Facebook-first, no LinkedIn v1 | Focus on the platform that drives actual conversions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*
