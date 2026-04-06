---
phase: 2
slug: read-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | `dashboard/package.json` — `"test": "node --test tests/*.test.js"` |
| **Quick run command** | `cd dashboard && node --test tests/phase2/*.test.js` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && node --test tests/phase2/*.test.js`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | INBOX-01 | integration | `node --test tests/phase2/inbox.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INBOX-02 | integration | `node --test tests/phase2/inbox.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INBOX-03 | integration | `node --test tests/phase2/inbox.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INBOX-04 | integration | `node --test tests/phase2/inbox.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | POST-01 | integration | `node --test tests/phase2/posts.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | POST-04 | integration | `node --test tests/phase2/calendar.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CMT-01 | integration | `node --test tests/phase2/comments.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DM-01 | integration | `node --test tests/phase2/pipeline.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DM-04 | integration | `node --test tests/phase2/pipeline.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DM-05 | integration | `node --test tests/phase2/pipeline.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STAT-02 | integration | `node --test tests/phase2/stats.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | STAT-03 | integration | `node --test tests/phase2/stats.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/phase2/inbox.test.js` — stubs for INBOX-01 through INBOX-04
- [ ] `dashboard/tests/phase2/posts.test.js` — stubs for POST-01
- [ ] `dashboard/tests/phase2/calendar.test.js` — stubs for POST-04
- [ ] `dashboard/tests/phase2/comments.test.js` — stubs for CMT-01
- [ ] `dashboard/tests/phase2/pipeline.test.js` — stubs for DM-01, DM-04, DM-05
- [ ] `dashboard/tests/phase2/stats.test.js` — stubs for STAT-02, STAT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar weekly/monthly view renders correctly | POST-04 | Visual layout check | Navigate to /dashboard/calendar, switch between week/month views, verify posts appear on correct dates |
| Overdue items visually highlighted | INBOX-03 | CSS visual check | Create a DM follow-up in the past, verify it appears with red/warning styling |
| Funnel chart displays percentages | DM-05 | Visual rendering | Navigate to /dashboard/pipeline, verify funnel percentages match DB data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
