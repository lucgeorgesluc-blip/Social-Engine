---
phase: 02-read-layer
verified: 2026-04-07T00:00:00Z
status: passed
score: 13/13 must-haves verified
---

# Phase 02: Read Layer Verification Report

**Phase Goal:** The operator can see all data in one dashboard — today's priorities, all posts by status, every comment per post, DM pipeline cards, content calendar, and conversion funnel — without being able to modify anything yet
**Verified:** 2026-04-07
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Homepage shows today's posts with status badges, capped at 5 + "Voir tout" | ✓ VERIFIED | `dashboard.ejs` has "Posts du jour" section; route uses `LIMIT 5` + `todayPostsTotal`; "Voir tout" link present |
| 2 | Homepage shows pending comments capped at 5 + "Voir tout" | ✓ VERIFIED | `dashboard.ejs` has "Commentaires en attente" section; route uses `LIMIT 5` + `pendingCommentsTotal` |
| 3 | Homepage shows DM follow-ups capped at 5 + "Voir tout" | ✓ VERIFIED | `dashboard.ejs` has "Suivis DM" section; route uses `LIMIT 5` + `activeProspectsTotal` |
| 4 | Comments older than 2h without response flagged as overdue | ✓ VERIFIED | `routes/dashboard.js` has `TWO_HOURS_MS`; `routes/comments.js` has same; both compute `isOverdue`/`dotState` |
| 5 | Overdue items use border-l-4 border-red-500 (no bg fill) | ✓ VERIFIED | `dashboard.ejs` and `pipeline.ejs` use `border-l-red-500`; `bg-red-50` only on DB error notice (line 29), not inbox cards |
| 6 | Sidebar nav items Posts/Commentaires/Pipeline/Statistiques are active links | ✓ VERIFIED | `layout.ejs` has `href="/posts"`, `href="/comments"`, `href="/pipeline"`, `href="/stats"`; no "Bientôt" badges; `currentPath` highlighting |
| 7 | GET /posts shows TABLE with Date/Titre/Statut/Nb commentaires columns | ✓ VERIFIED | `views/posts.ejs` contains `<table`, `Nb commentaires`, `Date`, `Titre`, `Statut` headers |
| 8 | Comment count comes from LEFT JOIN per post | ✓ VERIFIED | `routes/posts.js` has `LEFT JOIN` subquery producing `comment_count` |
| 9 | GET /posts/calendar shows monthly grid only, no week toggle | ✓ VERIFIED | `views/calendar.ejs` has `data-day-key`, no `view=week`, no `Semaine` toggle |
| 10 | Clicking a day expands posts below the grid (vanilla JS) | ✓ VERIFIED | `views/calendar.ejs` has `day-expand-panel`; `public/js/dashboard.js` handles `data-day-key` click events |
| 11 | GET /comments groups by post with accordion + 3-state dot (grey/green/orange) | ✓ VERIFIED | `routes/comments.js` computes `dotState` with `grey`/`orange`/`green`; `views/comments.ejs` has `data-accordion` and `orange-500` |
| 12 | GET /pipeline shows horizontal kanban INFO/CHAUD/RDV_PRÉVU/CONVERTI | ✓ VERIFIED | `routes/pipeline.js` defines `DISPLAY_STAGES`, `mapToDisplayStage()`, `lost` excluded; `views/pipeline.ejs` uses `overflow-x-auto` + `min-w-max` |
| 13 | GET /stats shows KPI rates and acquisition funnel | ✓ VERIFIED | `routes/stats.js` computes `engagement_rate`, `infoDmRate`; `views/stats.ejs` has "Taux" and "Entonnoir" |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `dashboard/lib/dm-config.js` | ✓ VERIFIED | Exports `getDmSequenceRules` with `DEFAULT_RULES` fallback; loads from `.social-engine/config.yaml` |
| `dashboard/views/layout.ejs` | ✓ VERIFIED | Active links to /posts /comments /pipeline /stats; `currentPath` highlight logic |
| `dashboard/routes/dashboard.js` | ✓ VERIFIED | 3x `LIMIT 5` queries, `CURRENT_DATE`, `TWO_HOURS_MS`, all totals passed to view |
| `dashboard/views/dashboard.ejs` | ✓ VERIFIED | 3 inbox sections, "Voir tout" links, `border-l-red-500` overdue accent, no bg fill on inbox cards |
| `dashboard/routes/posts.js` | ✓ VERIFIED | `LEFT JOIN` comment count, status filter, no week toggle |
| `dashboard/routes/comments.js` | ✓ VERIFIED | `dotState` computation (grey/orange/green), `TWO_HOURS_MS`, grouped by post |
| `dashboard/views/posts.ejs` | ✓ VERIFIED | `<table>` with 4 correct columns |
| `dashboard/views/calendar.ejs` | ✓ VERIFIED | `data-day-key`, `day-expand-panel`, monthly-only |
| `dashboard/views/comments.ejs` | ✓ VERIFIED | `data-accordion`, `orange-500` dot, accordion body markup |
| `dashboard/public/js/dashboard.js` | ✓ VERIFIED | Calendar day-click expand + comments accordion toggle |
| `dashboard/routes/pipeline.js` | ✓ VERIFIED | `DISPLAY_STAGES`, `mapToDisplayStage()`, `hasReply()`, `lost` excluded, `getDmSequenceRules` |
| `dashboard/routes/stats.js` | ✓ VERIFIED | `engagement_rate`, `infoDmRate`, `dmCalendlyRate`, `calendlyPatientRate` |
| `dashboard/views/pipeline.ejs` | ✓ VERIFIED | `overflow-x-auto`, `min-w-max`, `flex gap-4` columns, `border-l-red-500` overdue cards |
| `dashboard/views/stats.ejs` | ✓ VERIFIED | "Taux" KPI cards, "Entonnoir" funnel bars |
| `dashboard/tests/phase2/inbox.test.js` | ✓ VERIFIED | Exists, passes |
| `dashboard/tests/phase2/posts.test.js` | ✓ VERIFIED | Exists, passes |
| `dashboard/tests/phase2/calendar.test.js` | ✓ VERIFIED | Exists, passes |
| `dashboard/tests/phase2/comments.test.js` | ✓ VERIFIED | Exists, passes |
| `dashboard/tests/phase2/pipeline.test.js` | ✓ VERIFIED | Exists, passes |
| `dashboard/tests/phase2/stats.test.js` | ✓ VERIFIED | Exists, passes |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `routes/dashboard.js` | `lib/dm-config.js` | `require('../lib/dm-config')` + `getDmSequenceRules` | ✓ WIRED |
| `routes/dashboard.js` | `lib/db.js` | `query()` with `CURRENT_DATE` | ✓ WIRED |
| `routes/pipeline.js` | `lib/dm-config.js` | `require('../lib/dm-config')` + `getDmSequenceRules` | ✓ WIRED |
| `server.js` | `routes/posts.js` | `require('./routes/posts')` + `app.use('/', postsRouter)` | ✓ WIRED |
| `server.js` | `routes/comments.js` | `require('./routes/comments')` + `app.use('/', commentsRouter)` | ✓ WIRED |
| `server.js` | `routes/pipeline.js` | `require('./routes/pipeline')` + `app.use('/', pipelineRouter)` | ✓ WIRED |
| `server.js` | `routes/stats.js` | `require('./routes/stats')` + `app.use('/', statsRouter)` | ✓ WIRED |
| `views/calendar.ejs` | `public/js/dashboard.js` | `<script src="/js/dashboard.js">` + `data-day-key` handlers | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| 34 phase2 tests (inbox/posts/calendar/comments/pipeline/stats) | 34 pass, 0 fail | ✓ PASS |
| All 6 phase commits verified in git log | 64c9c7f, e1ee56f, 081caf9, 22b32f9, 3082929, e33c0df all present | ✓ PASS |

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| INBOX-01 | 02-01 | Homepage shows today's scheduled posts | ✓ SATISFIED | `routes/dashboard.js` queries posts WHERE `published_date = CURRENT_DATE` |
| INBOX-02 | 02-01 | Homepage shows unresponded comments | ✓ SATISFIED | Route queries comments WHERE `response_status = 'pending'` |
| INBOX-03 | 02-01 | Homepage shows DM follow-ups due | ✓ SATISFIED | Route queries prospects not in booked/converted/lost |
| INBOX-04 | 02-01 | Response time tracking flags comments older than 2h | ✓ SATISFIED | `TWO_HOURS_MS` in both dashboard and comments routes |
| POST-01 | 02-02 | View posts filtered by status | ✓ SATISFIED | `routes/posts.js` supports `?status=` filter with status tabs in view |
| POST-04 | 02-02 | View posts in calendar view | ✓ SATISFIED | `GET /posts/calendar` monthly grid with day-click expand |
| CMT-01 | 02-02 | View comments listed by post | ✓ SATISFIED | `routes/comments.js` groups by post, accordion per group |
| DM-01 | 02-03 | View prospect cards with current stage | ✓ SATISFIED | Pipeline kanban shows all non-lost prospects by stage |
| DM-04 | 02-03 | Highlights overdue follow-ups | ✓ SATISFIED | `border-l-red-500` on overdue cards in dashboard + pipeline |
| DM-05 | 02-03 | Conversion funnel with percentages | ✓ SATISFIED | Funnel in `views/pipeline.ejs` shows count + pct per stage |
| STAT-02 | 02-03 | KPI dashboard with key rates | ✓ SATISFIED | `routes/stats.js` computes 4 KPI rates; rendered in stats view |
| STAT-03 | 02-03 | Visual funnel chart | ✓ SATISFIED | 6-step proportional bar chart in `views/stats.ejs` |

All 12 required IDs satisfied. No orphaned requirements found for Phase 2.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `views/dashboard.ejs` | 29 | `bg-red-50` | ℹ️ Info | DB error notice panel — intentional, not an inbox card; confirmed by SUMMARY |

No stubs, no TODOs, no placeholder returns, no hardcoded empty arrays in rendering paths.

### Human Verification Required

1. **Inbox visual layout**
   - **Test:** Log in, check homepage with seed data loaded
   - **Expected:** Three sections visible with status badges, "Voir tout" links, and red left-border on any overdue item
   - **Why human:** Visual correctness of Tailwind classes (`border-l-4 border-l-red-500`) requires browser rendering

2. **Calendar day-click expand**
   - **Test:** Navigate to /posts/calendar, click a day cell that has posts
   - **Expected:** Panel expands below grid showing that day's posts; clicking another day updates panel; close button collapses
   - **Why human:** Vanilla JS interaction requires browser; cannot verify with static grep

3. **Comments accordion toggle**
   - **Test:** Navigate to /comments, click an accordion header
   - **Expected:** Body expands/collapses; icon toggles ▸/▾
   - **Why human:** DOM interaction requires browser

4. **Horizontal kanban scroll on mobile**
   - **Test:** Load /pipeline on a narrow viewport (< 640px)
   - **Expected:** All 4 columns accessible via horizontal scroll without layout break
   - **Why human:** Responsive overflow behavior requires browser

### Gaps Summary

No gaps. All 13 truths verified, all 12 requirement IDs satisfied, all 34 tests pass, all 6 commits present in git history.

---

_Verified: 2026-04-07_
_Verifier: Claude (gsd-verifier)_
