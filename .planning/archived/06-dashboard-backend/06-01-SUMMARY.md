---
phase: 06-dashboard-backend
plan: 01
subsystem: autopilot/pipeline, autopilot/routes, autopilot/telegram, autopilot/tests
tags: [auth, activity-logger, session, bcrypt, pipeline-instrumentation, wave-0, tdd]
requires:
  - Phase 5 (Telegram bot approval flow)
  - autopilot/pipeline/deploy-orchestrator.js (triggerDeploy, readPendingArray)
  - autopilot/pipeline/cost-logger.js (DI pattern reference)
provides:
  - autopilot/pipeline/activity-logger.js (writeActivityEvent, readRecentActivity, formatActivity, writePipelineStatus)
  - autopilot/routes/auth.js (setupAuth, isAuthenticated, loginHandler, logoutHandler)
  - autopilot/state/activity.jsonl writer (via run.js + bot.js instrumentation)
  - autopilot/state/pipeline-status.json writer (via run.js instrumentation)
  - Wave 0 test stubs for all Phase 6 API routes (6 test files)
affects:
  - autopilot/server.js (body parsing + session middleware + login/logout routes added)
  - autopilot/pipeline/run.js (5 pipeline status writes + 3 activity events added)
  - autopilot/telegram/bot.js (2 activity events added: telegram_sent + deployed)
tech-stack:
  added: []
  patterns:
    - DI pattern (_appendFn, _readFn, _writeFn injectable) for all new modules
    - express-session with bcryptjs.compareSync for session-based auth
    - JSONL append-only event log (activity.jsonl)
    - TDD: RED (failing tests) → GREEN (implementation) → verified for Tasks 1 and 2
key-files:
  created:
    - autopilot/pipeline/activity-logger.js
    - autopilot/routes/auth.js
    - autopilot/tests/activity-logger.test.js
    - autopilot/tests/auth.test.js
    - autopilot/tests/api-articles.test.js
    - autopilot/tests/api-rankings.test.js
    - autopilot/tests/api-links.test.js
    - autopilot/tests/api-sse.test.js
  modified:
    - autopilot/server.js
    - autopilot/pipeline/run.js
    - autopilot/telegram/bot.js
key-decisions:
  - DI pattern uses both _appendFn and _activityPath injection to fully decouple tests from real filesystem
  - writePipelineStatus uses try/catch on readFn (not existsSync) so injected readFn works in tests
  - logoutHandler wraps session.destroy() in Promise for async/await compatibility, returns 500 on error
  - run.js telegram_sent event placed after sendPreview() .catch() closes to avoid double-counting failed sends
  - bot.js telegram_sent in sendPreview (not approveHandler) since run.js also calls sendPreview
requirements-completed:
  - F2.6
  - F2.7
  - F3.1
duration: 17 min
completed: 2026-03-30
---

# Phase 6 Plan 1: Auth Middleware + Activity Logger Foundation Summary

Activity logger (JSONL append/read/format + pipeline status writer) and session-based auth middleware (express-session + bcryptjs) providing the foundation for all dashboard API routes — with run.js and bot.js instrumented to emit 5 pipeline status transitions and 4 activity event types.

## Duration

- **Start:** 2026-03-30T22:08:13Z
- **End:** 2026-03-30T22:25:17Z
- **Duration:** 17 minutes
- **Tasks completed:** 3/3
- **Files created:** 8 | **Files modified:** 3

## Tasks Completed

| Task | Description | Commit | Tests |
|------|-------------|--------|-------|
| 1 | activity-logger.js with DI pattern | 24a5442 | 18/18 pass |
| 2 | routes/auth.js + server.js session setup | c3a5a80 | 10/10 pass |
| 3 | run.js + bot.js instrumentation + 4 Wave 0 stubs | 7bba830 | 72/72 pass (excl. health) |

## What Was Built

### Task 1: activity-logger.js

Four exported functions following the project DI pattern (`_appendFn`, `_readFn`, `_writeFn`, `_activityPath`, `_statusPath` injectable):

- `writeActivityEvent(event, opts)` — appends a JSON line + `\n` to `state/activity.jsonl`. Creates state directory if missing. Adds `ts` field if not provided.
- `readRecentActivity(count, opts)` — reads last N events newest-first. Returns `[]` on ENOENT. Skips unparseable lines with per-line try/catch.
- `formatActivity(event)` — formats as French human-readable sentence per D-03: `drafted` → "Article rédigé : slug (N mots, N liens)", `telegram_sent` → "Envoyé sur Telegram : slug", `deployed` → "Déployé : slug → url", `error` → "Erreur (step) : message", default → "event: slug"
- `writePipelineStatus(stepNumber, opts)` — writes `state/pipeline-status.json` with `{ step, stepName, ts, history[] }`. Six steps: 1=Read Context, 2=Pick Topic, 3=Draft, 4=Generate Image, 5=Await Approval, 6=Deploy. Appends to existing history.

### Task 2: routes/auth.js + server.js

- `setupAuth(app)` — mounts express-session (httpOnly, secure in production, sameSite lax, 24h cookie)
- `isAuthenticated(req, res, next)` — checks `req.session?.user`, returns 401 if absent
- `loginHandler` — compares against `DASHBOARD_USERNAME` + `DASHBOARD_PASSWORD_HASH` env vars using `bcrypt.compareSync()`, sets `req.session.user` on success
- `logoutHandler` — calls `session.destroy()` wrapped in Promise, returns 500 on error

server.js additions (in correct Express 5 order):
1. `express.json()` + `express.urlencoded()` — body parsing before all routes
2. `setupAuth(app)` — session middleware
3. `POST /login` — public route
4. `POST /logout` — authenticated route

### Task 3: Pipeline Instrumentation + Wave 0 Stubs

run.js additions:
- `writePipelineStatus(1)` at Step 1 (Load Context)
- `writePipelineStatus(2)` at Step 2 (Select Topic)
- `writePipelineStatus(3)` at Step 3 (Build Prompt)
- `writePipelineStatus(4)` at Step 4.5 (Generate Image)
- `writePipelineStatus(5)` at Step 8 (Write Pending)
- `writeActivityEvent('drafted')` with wordCount + linkCount after validation passes
- `writeActivityEvent('error')` on validation failure before process.exit(1)
- `writeActivityEvent('telegram_sent')` after sendPreview() call

bot.js additions:
- `writeActivityEvent('telegram_sent')` in `sendPreview()` after `bot.telegram.sendMessage()` resolves
- `writeActivityEvent('deployed')` in `approveHandler` after successful `triggerDeploy()` + reply

Wave 0 test stubs (all pass immediately — will be filled in Plan 02):
- `tests/api-articles.test.js` — 3 stubs for F2.1 (GET /api/articles)
- `tests/api-rankings.test.js` — 3 stubs for F2.2 (GET /api/rankings)
- `tests/api-links.test.js` — 3 stubs for F2.3 (GET /api/links)
- `tests/api-sse.test.js` — 3 stubs for F2.4 (GET /api/events SSE + /api/pipeline-status)

## Verification Results

```
# Full suite (excl. health test which needs server):
# tests 72, suites 26, pass 72, fail 0

# With health test:
# All suites ok including GET /health (regression confirmed green)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] writePipelineStatus used existsSync before injected readFn — broke DI in tests**
- **Found during:** Task 1 (designing implementation)
- **Issue:** Original design used `existsSync(path)` before calling `read(path)`. When `_statusPath` is a fake path in tests, `existsSync` would always return false and the injected `_readFn` returning existing data would never be called.
- **Fix:** Removed the `existsSync` guard. Use `try/catch` on `read(path)` directly — covers both ENOENT and injected readFn. Also removed unused `existsSync` import.
- **Files modified:** `autopilot/pipeline/activity-logger.js`
- **Commit:** 24a5442

**2. [Rule 2 - Missing Critical] logoutHandler had no error handling for session.destroy() failure**
- **Found during:** Task 2 (writing auth tests)
- **Issue:** Plan specified `req.session.destroy(); return res.json({ ok: true })` without handling the destroy callback error. In the test, session.destroy() can fail and the server should return 500 rather than crashing.
- **Fix:** Wrapped `session.destroy()` in a Promise with error branch returning `res.status(500).json({ error: 'Logout failed' })`.
- **Files modified:** `autopilot/routes/auth.js`
- **Commit:** c3a5a80

**Total deviations:** 2 auto-fixed. **Impact:** Correctness improvements — DI works correctly in tests, logout failures handled gracefully.

## Known Stubs

The following are intentional stubs — they will be wired in Plan 02:

| File | Stub | Reason |
|------|------|--------|
| `tests/api-articles.test.js` | 3 `assert.ok(true)` stubs | API route (routes/api.js) not implemented until Plan 02 |
| `tests/api-rankings.test.js` | 3 `assert.ok(true)` stubs | GSC rankings module not implemented until Plan 02 |
| `tests/api-links.test.js` | 3 `assert.ok(true)` stubs | Link tree builder not implemented until Plan 02 |
| `tests/api-sse.test.js` | 3 `assert.ok(true)` stubs | SSE endpoint not implemented until Plan 02 |

These stubs satisfy Wave 0 Nyquist compliance and will be filled with real assertions in Plan 02 when the implementations exist.

## Next

Ready for Plan 02 (06-02-PLAN.md): GSC rankings module, all API routes (articles/rankings/links/pipeline-status/events/activity/stats/approve), server.js wiring, .env.example update.

## Self-Check: PASSED

- `autopilot/pipeline/activity-logger.js` exists: YES
- `autopilot/routes/auth.js` exists: YES
- `autopilot/tests/activity-logger.test.js` exists: YES
- `autopilot/tests/auth.test.js` exists: YES
- `autopilot/tests/api-articles.test.js` exists: YES
- `autopilot/tests/api-rankings.test.js` exists: YES
- `autopilot/tests/api-links.test.js` exists: YES
- `autopilot/tests/api-sse.test.js` exists: YES
- Commit 24a5442 exists: YES
- Commit c3a5a80 exists: YES
- Commit 7bba830 exists: YES
- `grep -q "writeActivityEvent" autopilot/pipeline/run.js`: YES
- `grep -q "setupAuth" autopilot/server.js`: YES
