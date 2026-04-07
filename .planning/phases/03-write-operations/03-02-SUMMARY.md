---
phase: 03-write-operations
plan: 02
status: complete
completed: 2026-04-07
---

# Plan 02 Summary — Posts Write + Comments Handle/Convert

## What was built

- `dashboard/routes/posts.js` — added: GET /posts/new, POST /posts (create), GET /posts/:id/edit, POST /posts/:id (update), POST /posts/:id/date
- `dashboard/views/posts/new.ejs` — create post form (content, hook, type, platform, scheduled_date)
- `dashboard/views/posts/edit.ejs` — edit form pre-filled; clipboard button via `data-copy`; status select
- `dashboard/views/posts.ejs` — added "Nouveau post" button + Edit/Copier action column per row
- `dashboard/routes/comments.js` — added: POST /comments/:id/handle (mark done), POST /comments/:id/convert (atomic TX creates prospect)
- `dashboard/views/comments.ejs` — inline handle form + convert button per comment; shows "Converti" badge
- `dashboard/tests/phase3/posts-write.test.js` — INSERT, UPDATE content/status, UPDATE scheduled_date
- `dashboard/tests/phase3/comments-write.test.js` — handle marks done, convert creates prospect in atomic TX

## Key decisions

- All writes via standard HTML `<form method="POST">` + PRG redirect + flash — no AJAX
- Clipboard uses existing `data-copy` delegated handler from Plan 01
- POST /posts/new and GET /posts/calendar both registered before `:id` param routes — order matters
- convert uses BEGIN/COMMIT/ROLLBACK for atomicity: prospect INSERT + converted_to_dm=true must both succeed

## Acceptance criteria

- [x] POST /posts, POST /posts/:id, POST /posts/:id/date all present (no PATCH)
- [x] `req.session.flash` set before every redirect
- [x] `data-copy` in edit.ejs
- [x] No inline `<script>` in new.ejs or edit.ejs
- [x] BEGIN/COMMIT/ROLLBACK in convert handler
- [x] `converted_to_dm` guard prevents double-convert
- [x] Tests exist for INSERT, UPDATE, handle, convert
