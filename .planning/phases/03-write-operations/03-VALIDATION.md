---
phase: 3
slug: write-operations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | `dashboard/package.json` — `"test": "node --test tests/*.test.js"` |
| **Quick run command** | `cd dashboard && node --test tests/phase3/*.test.js` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && node --test tests/phase3/*.test.js`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | POST-02 | integration | `node --test tests/phase3/posts-write.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | POST-03 | integration | `node --test tests/phase3/posts-write.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | POST-05 | integration | `node --test tests/phase3/calendar-dnd.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | POST-06 | integration | `node --test tests/phase3/clipboard.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CMT-02 | integration | `node --test tests/phase3/comments-write.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CMT-03 | integration | `node --test tests/phase3/comments-write.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DM-02 | integration | `node --test tests/phase3/pipeline-write.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DM-03 | integration | `node --test tests/phase3/dm-templates.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STAT-01 | integration | `node --test tests/phase3/metrics-input.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STAT-04 | integration | `node --test tests/phase3/metrics-input.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/phase3/posts-write.test.js` — stubs for POST-02, POST-03
- [ ] `dashboard/tests/phase3/calendar-dnd.test.js` — stubs for POST-05
- [ ] `dashboard/tests/phase3/clipboard.test.js` — stubs for POST-06
- [ ] `dashboard/tests/phase3/comments-write.test.js` — stubs for CMT-02, CMT-03
- [ ] `dashboard/tests/phase3/pipeline-write.test.js` — stubs for DM-02
- [ ] `dashboard/tests/phase3/dm-templates.test.js` — stubs for DM-03
- [ ] `dashboard/tests/phase3/metrics-input.test.js` — stubs for STAT-01, STAT-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clipboard copy works in browser | POST-06 | Clipboard API requires secure context | Click "Copier" on a post, paste in Notepad, verify text matches |
| Drag-and-drop calendar interaction | POST-05 | Browser DnD requires visual interaction | Drag a post card from one date to another, verify DB update |
| Comment disappears from inbox after "Handled" | CMT-02 | Real-time DOM update | Mark comment handled, verify it disappears without page reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
