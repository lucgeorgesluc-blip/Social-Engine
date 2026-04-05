# Feature Landscape — Social Acquisition Dashboard

**Domain:** Single-operator social media acquisition dashboard (Facebook -> DM -> Booking)
**Researched:** 2026-04-05
**Context:** Local wellness practitioner (magnetiseuse/hypnotherapist, Troyes). One operator, one funnel: Facebook post -> "INFO" comment -> manual DM sequence (3 msgs) -> Calendly booking -> patient.

---

## Table Stakes

Features the single operator expects. Missing = dashboard is not usable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Today's priority inbox | Core value prop from PROJECT.md: "what needs attention right now" | Low | Next post to publish, unresponded INFO comments, DMs overdue for follow-up. Single glanceable screen. |
| Post list with status | Can't manage what you can't see. Draft/scheduled/published states. | Low | Already have 10 drafts + 2 published in YAML. Status badge + scheduled date. |
| Post detail view + copy-to-clipboard | Facebook posting is manual (no API required at MVP). Need the content ready to paste. | Low | Copy button for body text. One click. |
| Comment list per post | 10 comments on first post, 2 INFO prospects. Must see unanswered comments. | Low | Filter by classification: info / objection / positive / other. |
| Comment classification + mark-as-handled | Operator needs to triage fast. "INFO" comments trigger DM creation. | Low | Radio: info / objection / positive. Checkbox: handled. |
| DM prospect cards with stage | The funnel core. 3 prospects tracked manually. Stage: new -> msg1 -> msg2 -> msg3 -> booked -> converted / lost. | Medium | Card per prospect, stage selector, next action date. |
| DM follow-up due alerts | Delays cost conversions (Sylvie turned hostile after slow response). msg2 due J+2, msg3 due J+7. | Low | Highlight overdue cards in priority inbox. No push needed. |
| Content calendar (list view) | 10 drafts already scheduled by date. Need to see the plan. | Low | Weekly list view: date, post type, platform, status. |
| Metrics input per post | Real data comes from Facebook Insights manually at MVP. Operator pastes numbers. | Low | Form: impressions, reach, likes, comments, INFO comments, DMs opened, Calendly booked. |
| Conversion funnel summary | KPIs defined: reach -> comments -> DM -> Calendly -> patient. | Low | Aggregate across all posts. Running totals + rates. |
| Simple password auth | Single user, internal tool. | Low | Single shared password, session cookie. |
| YAML seed import | 7 YAML files must become DB seed on first run. | Medium | One-time migration script. Posts, drafts, comments, DMs, calendar, metrics. |
| Mobile-readable layout | Operator may check between appointments. | Low | Responsive, not app-like. Read-mostly on mobile. |

---

## Differentiators

Features that make this dashboard meaningfully better than a spreadsheet.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI post generation (Claude API) | Generate new draft from objection type + post type in one click. Saves 30-60 min per post. | Medium | Prompt uses config.yaml (trust signals, tone, brand). Operator edits inline before saving. |
| Objection frequency tracker | When an objection (volonte, arnaque, trop_cher...) appears 3+ times in comments, surface a suggested post topic. Already planned in YAML. | Medium | Requires comment classification data. Auto-surface in priority inbox: "OBJ-volonte seen 3x this week — generate a post?" |
| INFO-to-DM one-click conversion | When operator marks a comment as "info", offer "Create DM prospect" button. Pre-fills name, source post, date. | Low | Eliminates manual copy-paste between comment list and DM pipeline. Reduces lead drop. |
| Post performance benchmark | Show engagement rate vs target (>5%), INFO comments vs target (>2/post). Traffic-light indicator. | Low | Target KPIs already defined in PROJECT.md. Compare actuals to targets. |
| DM message templates | Pre-written msg1/msg2/msg3 based on dm_sequence rules. Operator picks template, copies to Facebook DM. | Low | Templates stored in DB, editable. Removes cognitive load of writing fresh each time. |
| Objection-response library | Categorized responses to common objections (volonte, arnaque, peur_hypnose, trop_cher, magie...). Copy-paste into comments. | Low | Seed from existing YAML objections tracker. Speeds up comment responses. |
| Weekly recap view | One-screen summary of the week: posts published, INFO comments received, DMs sent, Calendly bookings. | Low | Replaces manual weekly metrics template in YAML. |
| Post draft inline editor | Edit post body in dashboard before copying. No need to open a separate file. | Medium | Textarea with character count (max 1500 for Facebook). Save to DB. |

---

## Anti-Features

Features to deliberately NOT build in this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Automated Facebook posting | Meta Graph API page posting requires Business verification + app review. High setup cost, can break. Facebook policy also restricts automation patterns. | Manual copy-paste with clipboard button. Add FB API post-launch if verified. |
| Automated DM sending | Facebook explicitly prohibits automated DMs via API. Risk of page ban. | Dashboard tracks DM stages and provides templates. Sending is always manual. |
| Real-time comment polling | Requires Facebook Webhook setup + server infrastructure. Overkill for 3 posts/week cadence. | Operator pastes new comment data. Or add FB API read-only as phase 2. |
| Calendly API integration | No direct link between Calendly bookings and prospects. Added complexity for minimal gain. | Operator manually marks prospect as "booked" in dashboard. |
| Multi-platform management (LinkedIn) | Config.yaml has LinkedIn but conversion data is zero. Adds schema complexity and UI noise. | Facebook only at v1. LinkedIn toggle is a phase 2 add if needed. |
| Push notifications / alerts | Single user checking dashboard when available. No mobile app. | Priority inbox on dashboard home is sufficient. Color-coded urgency. |
| Analytics export / reporting | One operator, internal tool. Not managing clients. | On-screen metrics are enough. No CSV export needed at v1. |
| Post approval workflow | Single operator is both creator and publisher. No second reviewer. | Save as draft, edit, copy. No approval states beyond draft/scheduled/published. |
| User management / roles | Explicitly out of scope. Single shared password. | Never add. Adds auth complexity with zero benefit. |
| AI auto-publish | Generate + publish without human review. Risk of tone errors in sensitive health niche. | Always: generate -> human edits -> copy-paste. Mandatory human gate. |

---

## Feature Dependencies

```
YAML seed import -> all other features (no data without seed)

Comment classification -> INFO-to-DM one-click conversion
Comment classification -> Objection frequency tracker
Objection frequency tracker -> AI post generation (objection type as input)

Post metrics input -> Post performance benchmark
Post metrics input -> Conversion funnel summary
Post metrics input -> Weekly recap view

DM prospect cards -> DM follow-up due alerts
DM prospect cards -> Priority inbox (overdue DMs surface here)

Comment list -> Priority inbox (unresponded INFO comments surface here)
Post list + scheduled date -> Priority inbox (next post to publish surfaces here)

AI post generation -> Post draft inline editor (generated draft lands in editor)
Post draft inline editor -> Copy-to-clipboard (edited content is what gets copied)
```

---

## MVP Recommendation

**Phase 1 — Visibility (week 1-2):** Build the read layer first. Priority inbox, post list, comment list, DM pipeline cards. Seed from YAML. This alone replaces the spreadsheet and stops leads from falling through.

**Phase 2 — Action (week 3-4):** Add write operations. Mark comment as handled, create DM from INFO comment, update DM stage, input post metrics. Dashboard becomes operational tool.

**Phase 3 — Leverage (week 5-6):** AI post generation, objection frequency alerts, DM templates, post performance benchmarks. These multiply operator effectiveness.

**Defer entirely:**
- Facebook API (Graph API): defer until page is Business-verified and posting volume justifies setup cost.
- LinkedIn: defer until Facebook funnel is stable and producing bookings consistently.
- Any automation that touches Facebook messaging: permanent defer (policy risk).

---

## Sources

- `.planning/PROJECT.md` — Requirements, KPIs, out-of-scope decisions (HIGH confidence — authoritative project doc)
- `.social-engine/config.yaml` — Brand config, DM sequence rules, platform settings (HIGH confidence)
- `.social-engine/data/posts.yaml` — Post types, metrics schema, real post learnings (HIGH confidence)
- `.social-engine/data/comments.yaml` — Comment classification schema, real prospect data (HIGH confidence)
- `.social-engine/data/dm-pipeline.yaml` — Prospect stages, real conversion data (HIGH confidence)
- `.social-engine/data/content-calendar.yaml` — Calendar structure, thematic planning (HIGH confidence)
- Meta Platform Policy on automated messaging — permanent constraint on DM automation (MEDIUM confidence — well-known policy, not re-verified against current docs)
