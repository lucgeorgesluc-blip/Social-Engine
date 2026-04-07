---
phase: 03-write-operations
plan: 01
status: complete
completed: 2026-04-07
---

# Plan 01 Summary — Migration + Flash + Clipboard

## What was built

- `dashboard/lib/migrations/001-add-scheduled-date.sql` — ALTER TABLE adds `scheduled_date DATE` column idempotently
- `dashboard/lib/migrate.js` — migration runner that reads `lib/migrations/*.sql` files in order, called at boot
- `dashboard/server.js` — added `runMigrations()` call between schema.sql and seed; added flash middleware setting `res.locals.flash = req.session.flash` and clearing it after read
- `dashboard/views/layout.ejs` — fixed script tag from `/js/app.js` → `/js/dashboard.js`; added flash banner that renders success (green) or error (red) once per request with dismiss button
- `dashboard/public/js/dashboard.js` — appended clipboard delegated handler IIFE; existing calendar + accordion code preserved intact
- `dashboard/tests/phase3/setup.test.js` — two tests: column exists, migration is idempotent

## Key decisions

- Flash middleware placed AFTER session, BEFORE route mounts — so all routes can write to `req.session.flash`
- No AJAX, no toast utility — all Phase 3 feedback via server-side flash + PRG redirect
- Clipboard delegated on `document` — any view using `data-copy="..."` attribute gets copy behaviour for free

## Acceptance criteria

- [x] `dashboard/lib/migrations/001-add-scheduled-date.sql` contains `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE`
- [x] `dashboard/lib/migrate.js` exports `runMigrations`
- [x] `dashboard/server.js` requires migrate and calls `runMigrations()` between schema.sql and seed
- [x] `dashboard/server.js` contains flash middleware setting `res.locals.flash` and clearing it
- [x] `dashboard/views/layout.ejs` contains flash banner block
- [x] `dashboard/views/layout.ejs` script tag references `/js/dashboard.js`
- [x] `dashboard/public/js/dashboard.js` has `data-copy` clipboard handler + original code preserved
