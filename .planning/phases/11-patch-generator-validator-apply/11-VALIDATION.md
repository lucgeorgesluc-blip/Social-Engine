---
phase: 11
slug: patch-generator-validator-apply
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node --test (built-in, already used in autopilot/) |
| **Config file** | none — node --test discovers tests by pattern |
| **Quick run command** | `cd autopilot && node --test tests/patch-generator.test.js tests/patch-validator.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && node --test tests/patch-generator.test.js tests/patch-validator.test.js`
- **After every plan wave:** Run `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | F4.6 | unit | `node --test tests/patch-generator.test.js` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | F4.7 | unit | `node --test tests/patch-validator.test.js` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | F4.6 | unit | `node --test tests/patch-generator.test.js` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | F4.8 | integration | `node --test tests/patch-apply.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | F4.8 | integration | `node --test tests/patch-apply.test.js` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 2 | F4.8 | integration | `node --test tests/patch-apply.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/patch-generator.test.js` — stubs for F4.6 (generatePatch, never-auto-apply enforcement)
- [ ] `autopilot/tests/patch-validator.test.js` — stubs for F4.7 (all 8 checks)
- [ ] `autopilot/tests/patch-apply.test.js` — stubs for F4.8 (apply route, backup, rollback)
- [ ] `autopilot/tests/fixtures/patches/` — fixture HTML files for validator check scenarios

*Existing test infrastructure (node --test) covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SFTP rollback restores correct file on production | F4.8 | Requires live SFTP connection to IONOS server | After a successful apply, manually corrupt the state, trigger rollback, verify file restored on server |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
