---
phase: 10
slug: cannibalization-ranking-trigger
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) v22.17.1 |
| **Config file** | none |
| **Quick run command** | `cd autopilot && node --test tests/cannibalization.test.js tests/ranking-watcher.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** `cd autopilot && node --test tests/cannibalization.test.js tests/ranking-watcher.test.js`
- **After every plan wave:** `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | F4.4-a, F4.4-b, F4.4-c, F4.4-d | unit | `cd autopilot && node --test tests/cannibalization.test.js` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | F4.5-a, F4.5-b, F4.5-c | unit | `cd autopilot && node --test tests/ranking-watcher.test.js` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | F4.5-d, F4.5-e | integration | `cd autopilot && node --test tests/api-audit.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/cannibalization.test.js` — covers F4.4 (pure function tests with synthetic data)
- [ ] `autopilot/tests/ranking-watcher.test.js` — covers F4.5 watcher logic (DI for fs + runAudit)
- [ ] `autopilot/tests/api-audit.test.js` — covers GET /api/audit and GET /api/audit/:slug routes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | All behaviors have automated verification |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
