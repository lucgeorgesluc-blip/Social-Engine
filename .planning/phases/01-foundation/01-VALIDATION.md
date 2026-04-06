---
phase: 01
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | `dashboard/package.json` (test script) |
| **Quick run command** | `cd dashboard && node --test tests/*.test.js` |
| **Full suite command** | `cd dashboard && node --test tests/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && node --test tests/*.test.js`
- **After every plan wave:** Run `cd dashboard && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01 | integration | `node --test tests/db.test.js` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFRA-02 | integration | `node --test tests/seed.test.js` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | INFRA-03 | unit | `node --test tests/health.test.js` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFRA-04 | integration | `node --test tests/auth.test.js` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | INFRA-05 | manual | N/A — verify Render DB tier | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/db.test.js` — stubs for INFRA-01 (DB schema creation)
- [ ] `dashboard/tests/seed.test.js` — stubs for INFRA-02 (idempotent seed)
- [ ] `dashboard/tests/health.test.js` — stubs for INFRA-03 (health endpoint)
- [ ] `dashboard/tests/auth.test.js` — stubs for INFRA-04 (password auth)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Render DB is paid tier | INFRA-05 | External service check | Verify Render dashboard shows Starter plan or Supabase project active |
| Mobile layout 375px | INFRA-01 | Visual check | Open Chrome DevTools, set viewport to 375px, verify no horizontal scroll |
| Login page renders correctly | INFRA-04 | Visual check | Visit Render URL, verify branded login page appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
