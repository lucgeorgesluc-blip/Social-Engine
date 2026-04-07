---
phase: 02-read-layer
plan: 03
subsystem: dashboard
tags: [pipeline, kanban, stats, kpi, funnel, ejs, express]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [GET /pipeline, GET /stats]
  affects: [dashboard/server.js, dashboard/public/css/tailwind.css]
tech_stack:
  added: []
  patterns: [horizontal-kanban, kpi-computation, funnel-bars, db-to-display-mapping]
key_files:
  created:
    - dashboard/routes/pipeline.js
    - dashboard/views/pipeline.ejs
    - dashboard/routes/stats.js
    - dashboard/views/stats.ejs
    - dashboard/tests/phase2/pipeline.test.js
    - dashboard/tests/phase2/stats.test.js
  modified:
    - dashboard/server.js
    - dashboard/public/css/tailwind.css
decisions:
  - "CHAUD detection uses reply heuristic: messages JSONB role/from='prospect' OR notes contains [reply]/repondu/répondu"
  - "Lost prospects excluded from kanban (mapToDisplayStage returns null)"
  - "Funnel bars proportional to max value in dataset (not total reach)"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 02 Plan 03: Pipeline Kanban + Stats Dashboard Summary

**One-liner:** Horizontal 4-column DM kanban (INFO/CHAUD/RDV_PRÉVU/CONVERTI) with DB→display stage mapping and overdue detection, plus stats dashboard with 4 KPI rate cards and proportional acquisition funnel bars.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pipeline route + horizontal kanban view | 3082929 | routes/pipeline.js, views/pipeline.ejs |
| 2 | Stats route + view + server mounts + tests + Tailwind | e33c0df | routes/stats.js, views/stats.ejs, server.js, 2 test files, tailwind.css |

## What Was Built

### GET /pipeline — Horizontal Kanban

- `DISPLAY_STAGES = ['INFO', 'CHAUD', 'RDV_PREVU', 'CONVERTI']` with explicit DB→display mapping
- `mapToDisplayStage()`: new/msg3_sent→INFO, msg1_sent/msg2_sent→INFO or CHAUD (reply heuristic), booked→RDV_PREVU, converted→CONVERTI, lost→null (excluded)
- `hasReply()`: checks `messages` JSONB for `role/from='prospect'`, or `notes` for `[reply]`/`repondu`/`répondu`
- Overdue detection: compares `hoursSince(date_first_contact)` against `getDmSequenceRules()` thresholds
- View: `overflow-x-auto` + `min-w-max` + `flex gap-4` horizontal layout; `border-l-4 border-l-red-500` for overdue cards; funnel summary at top

### GET /stats — KPIs + Funnel

- 4 KPI cards: `engagementRate` (computed from raw or stored), `infoDmRate`, `dmCalendlyRate`, `calendlyPatientRate`
- Null-safe: rates shown as "—" when denominator is 0
- Acquisition funnel: 6 steps (Portée → Commentaires → INFO → DM → Calendly → Convertis), bars proportional to max value
- Previous weeks table (last 3 before current)

### server.js

Mounted `pipelineRouter` and `statsRouter` after `commentsRouter`.

## Test Results

14/14 tests pass across both test files:
- `pipeline.test.js`: auth redirect, 200 response, heading, 4 columns, overflow-x-auto, lost excluded, overdue class
- `stats.test.js`: auth redirect, 200 response, heading, 4 KPI Taux cards, Entonnoir section, engagement rate computation (~6.7%), funnel steps

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All data sourced from DB queries; empty states handled gracefully with "Vide" / "Aucun prospect" / "Aucune donnée" messages.

## Self-Check: PASSED
