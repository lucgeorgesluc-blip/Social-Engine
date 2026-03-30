---
phase: 06
slug: dashboard-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `autopilot/package.json` (jest config) |
| **Quick run command** | `cd autopilot && node --experimental-vm-modules node_modules/.bin/jest --testPathPattern="dashboard\|auth\|sse\|activity" --no-coverage -q` |
| **Full suite command** | `cd autopilot && node --experimental-vm-modules node_modules/.bin/jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | F2.7 | unit | `jest --testPathPattern="auth"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | F2.6 | unit | `jest --testPathPattern="activity"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | F2.1 | unit | `jest --testPathPattern="articles"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | F2.2 | unit | `jest --testPathPattern="rankings"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | F2.3 | unit | `jest --testPathPattern="links"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | F2.4 | unit | `jest --testPathPattern="pipeline-status\|sse"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/auth.test.js` — stubs for F2.7 (login, session, 401 protection)
- [ ] `autopilot/tests/activity-logger.test.js` — stubs for F2.6 (activity.jsonl write events)
- [ ] `autopilot/tests/api-articles.test.js` — stubs for F2.1 (GET /api/articles response shape)
- [ ] `autopilot/tests/api-rankings.test.js` — stubs for F2.2 (GSC Search Analytics mock)
- [ ] `autopilot/tests/api-links.test.js` — stubs for F2.3 (D3 hierarchy output shape)
- [ ] `autopilot/tests/api-sse.test.js` — stubs for F2.4 (pipeline-status.json + SSE headers)

*Existing jest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GSC Search Analytics returns real keyword positions | F2.2 | Requires live GSC service account credentials and production data | Run `node autopilot/test-gsc.js` with real `.env` after service account setup |
| SSE pushes to browser in real time | F2.4 | Browser EventSource behavior | Open dashboard, trigger a pipeline step, verify stepper updates without page reload |
| Session cookie survives browser refresh | F2.7 | Browser cookie behavior | Log in, refresh, verify still authenticated |
| /api/articles?status=pending badge count | F2.8 | Requires a real pending.json | Manually add a pending article to pending.json, verify count = 1 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
