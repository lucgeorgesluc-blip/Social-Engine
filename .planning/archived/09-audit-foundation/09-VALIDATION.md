---
phase: 9
slug: audit-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) v22.17.1 |
| **Config file** | `autopilot/package.json` scripts.test |
| **Quick run command** | `node --test autopilot/tests/page-scorer.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test autopilot/tests/<changed-module>.test.js`
- **After every plan wave:** Run `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-W0 | 01 | 0 | F4.1, F4.2, F4.3 | stub | `cd autopilot && npm install cheerio` | ❌ W0 | ⬜ pending |
| 09-01-01 | 01 | 1 | F4.1-a, F4.1-b, F4.1-c, F4.1-d | unit | `node --test autopilot/tests/page-inventory.test.js` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | F4.2-a, F4.2-b, F4.2-c, F4.2-d | unit | `node --test autopilot/tests/signal-extractor.test.js` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | F4.3-a, F4.3-b, F4.3-c, F4.3-d, F4.3-e | unit | `node --test autopilot/tests/page-scorer.test.js` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | F4-int | integration | `node --test autopilot/tests/audit-runner.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/page-inventory.test.js` — stubs for F4.1 (buildPageInventory, pageExists)
- [ ] `autopilot/tests/signal-extractor.test.js` — stubs for F4.2 (extractPageSignals, JSON-LD full doc)
- [ ] `autopilot/tests/page-scorer.test.js` — stubs for F4.3 (scorePageHealth, determinism, French messages)
- [ ] `autopilot/tests/audit-runner.test.js` — stubs for integration (full scan → state/page-audit.json)
- [ ] `cd autopilot && npm install cheerio` — only new dependency

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| French issue messages readable | F4.3 | Language quality judgment | Run scanner on real page, read messages field |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
