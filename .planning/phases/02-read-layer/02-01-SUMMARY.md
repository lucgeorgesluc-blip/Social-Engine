---
phase: 02-read-layer
plan: "01"
subsystem: dashboard
tags: [inbox, sidebar, navigation, overdue, dm-config, tailwind, tests]
dependency_graph:
  requires: ["01-03"]
  provides: ["priority-inbox-homepage", "dm-config-helper", "active-sidebar-nav"]
  affects: ["dashboard/views/dashboard.ejs", "dashboard/views/layout.ejs", "dashboard/routes/dashboard.js"]
tech_stack:
  added: ["ejs rendering tests with node:test", "js-yaml config loader (dm-config.js)"]
  patterns: ["LIMIT 5 cap pattern", "total count + capped rows split query", "border-l-4 overdue accent (D-04)"]
key_files:
  created:
    - dashboard/lib/dm-config.js
    - dashboard/tests/phase2/inbox.test.js
  modified:
    - dashboard/views/layout.ejs
    - dashboard/views/dashboard.ejs
    - dashboard/routes/dashboard.js
    - dashboard/public/css/tailwind.css
decisions:
  - "D-04 overdue style: border-l-4 border-l-red-500 only, no bg fill — inbox cards must not use bg-red-50"
  - "Test assertion for non-overdue uses regex on rendered div class attribute (not full HTML) to avoid false positive from EJS template source strings"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 6
---

# Phase 02 Plan 01: Priority Inbox Homepage Summary

**One-liner:** Active sidebar nav + priority inbox with 3 capped (5-item) sections, DM timing helper from YAML, and red left-border overdue accent per D-04.

## What Was Built

### Task 1 — DM config helper + active sidebar nav + enhanced homepage route
- `dashboard/lib/dm-config.js`: `getDmSequenceRules()` loads `dm_sequence` delays from `.social-engine/config.yaml` with `DEFAULT_RULES` fallback (new/msg1_sent/msg2_sent/msg3_sent)
- `dashboard/views/layout.ejs`: replaced 4 disabled `<span>` items with active `<a>` links to `/posts`, `/comments`, `/pipeline`, `/stats`; removed `pointer-events-none` and "Bientôt" badges; added `currentPath` highlighting
- `dashboard/routes/dashboard.js`: replaced simple count query with 4 inbox SQL queries — today's posts (LIMIT 5 + total), pending comments (LIMIT 5 + total), active prospects (LIMIT 5 + total), plus `TWO_HOURS_MS` overdue flag for INBOX-04; passes `currentPath: '/'` to render

### Task 2 — Priority inbox view + tests + Tailwind rebuild
- `dashboard/views/dashboard.ejs`: 3 inbox sections (Posts du jour, Commentaires en attente, Suivis DM), each capped at 5 items with "Voir tout →" link when total > 0; overdue items use `border-l-4 border-l-red-500` (no bg fill per D-04)
- `dashboard/tests/phase2/inbox.test.js`: 11 tests across 4 suites — section headers, Voir tout links, D-04 overdue styling (border + no bg-red-50), 5-item cap, dm-config rules — all pass
- `dashboard/public/css/tailwind.css`: rebuilt to include `border-l-red-500`, `line-clamp-2`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 64c9c7f | feat(02-01): DM config helper, active sidebar nav, priority inbox route |
| 2 | e1ee56f | feat(02-01): priority inbox view with capped sections, Voir tout links, D-04 overdue style + tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed false-positive test assertion for non-overdue comment**
- **Found during:** Task 2 test run (1/11 failing)
- **Issue:** Test checked `!html.includes('border-l-red-500')` on full rendered HTML — the EJS template source string itself contains `border-l-red-500` in the conditional, so it always matched
- **Fix:** Changed assertion to extract rendered card div class attribute via regex and check only that string
- **Files modified:** `dashboard/tests/phase2/inbox.test.js`
- **Commit:** e1ee56f

## Known Stubs

None — all 3 inbox sections wire directly to live SQL queries. The `bg-red-50` class in dashboard.ejs line 29 is the pre-existing DB error notice (not an inbox card) and is intentional.

## Self-Check: PASSED

All files exist and both commits verified in git log.
