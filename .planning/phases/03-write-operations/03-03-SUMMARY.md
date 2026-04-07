---
phase: 03-write-operations
plan: 03
status: complete
completed: 2026-04-07
---

# Plan 03 Summary — Pipeline Write + Metrics Input

## What was built

- `dashboard/lib/dm-templates.js` — loads DM templates from `.social-engine/config.yaml` with hardcoded fallbacks for msg1/2/3
- `dashboard/routes/pipeline.js` — added: POST /prospects/:id/advance (server-side STAGES guard), POST /prospects/:id/lost; GET /pipeline now passes `dmTemplates` to view
- `dashboard/views/pipeline.ejs` — advance/lost forms per card; confirm() guard on CONVERTI advance and LOST; DM template clipboard button via `data-copy`
- `dashboard/routes/metrics.js` — GET /metrics/input (weekly form), POST /metrics/:week (upsert with ON CONFLICT), GET /metrics/compare (JSONB COALESCE engagement_rate); mounted in server.js
- `dashboard/views/metrics/input.ejs` — 9-field weekly metrics form with upsert POST
- `dashboard/views/metrics/compare.ejs` — published posts performance table with engagement rate
- `dashboard/views/stats.ejs` — added header links to /metrics/input and /metrics/compare
- `dashboard/tests/phase3/pipeline-write.test.js` — stage advancement, walk to converted, mark lost
- `dashboard/tests/phase3/metrics-input.test.js` — upsert insert, upsert idempotent, JSONB COALESCE

## Key decisions

- Prospect write routes added to pipeline.js (not a new prospects.js) — avoids splitting related logic
- STAGES array duplicated in pipeline.js (not shared) — single file, no coupling needed
- advance rejects from `converted`, `lost`, and index ≥ 5 server-side — not just view-level confirm()
- metrics.js mounted separately from stats.js — keeps weekly input distinct from read-only KPI view

## Acceptance criteria

- [x] POST /prospects/:id/advance and POST /prospects/:id/lost (no PATCH)
- [x] Server-side STAGES guard rejects invalid advances
- [x] confirm() in pipeline view for CONVERTI advance and LOST mark
- [x] DM template data-copy button rendered server-side per prospect stage
- [x] POST /metrics/:week uses ON CONFLICT DO UPDATE
- [x] GET /metrics/compare with COALESCE engagement_rate
- [x] flash set before every redirect in all new routes
- [x] Tailwind rebuilt successfully
