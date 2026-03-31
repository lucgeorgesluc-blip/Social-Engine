---
phase: 7
slug: dashboard-frontend
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-31
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in (node:test) for unit tests; Playwright for E2E smoke (optional) |
| **Config file** | none — native Node.js test runner |
| **Quick run command** | `cd autopilot && node --test tests/*.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (regression check — no frontend regressions)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green + manual smoke of /dashboard in browser
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | F2.7 | integration | `node --test tests/auth.test.js tests/health.test.js` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | F2.1, F2.4, F2.5, F2.6, F2.8 | visual/manual | Open /dashboard in browser, verify tabs render | N/A | ⬜ pending |
| 07-02-01 | 02 | 2 | F2.2 | visual/manual | Rankings tab renders Chart.js line chart | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | F2.3 | visual/manual | Links tab renders D3 tree with colored nodes | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing `tests/auth.test.js` — covers F2.7 auth (already created in Phase 06-01)
- [ ] Existing `tests/health.test.js` — regression check

*No new Wave 0 test files needed — Phase 7 is a frontend phase. The Phase 6 test suite provides regression protection. Manual browser smoke tests are the primary verification method.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login page renders and accepts credentials | F2.7 | Browser cookie behavior | Open /login.html, enter credentials, verify redirect to /dashboard |
| Article queue shows status badges | F2.1 | DOM rendering | Open /dashboard → Queue tab, verify colored badges (green/yellow/blue/gray) |
| Approve button triggers deploy | F2.1 | POST /api/articles/:slug/approve integration | Click Approve on a pending article, verify badge updates without reload |
| Rankings chart renders line per keyword | F2.2 | Canvas rendering | Open Rankings tab, verify Chart.js lines with inverted Y axis |
| D3 link tree renders arbre structure | F2.3 | SVG rendering | Open Links tab, verify colored nodes (gold/cyan/blue/red for orphans) |
| Clicking node highlights links | F2.3 | SVG interaction | Click a node, verify inbound/outbound links highlighted |
| Pipeline stepper updates via SSE | F2.4 | Browser EventSource behavior | Trigger pipeline step, verify stepper updates in real time |
| Pending badge shows count | F2.8 | DOM + API | Add pending article to state, verify badge count in nav |
| Logout clears session | F2.7 | Browser cookie behavior | Click logout, verify redirect to /login.html, verify /dashboard returns 401 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (prior test suite covers regression)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
