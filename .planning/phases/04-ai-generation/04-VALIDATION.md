---
phase: 4
slug: ai-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | `dashboard/package.json` — `"test": "node --test tests/*.test.js"` |
| **Quick run command** | `cd dashboard && node --test tests/phase4/*.test.js` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && node --test tests/phase4/*.test.js`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AI-01 | unit+integration | `node --test tests/phase4/ai-generate.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AI-02 | integration | `node --test tests/phase4/ai-edit.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AI-03 | unit | `node --test tests/phase4/objection-tracker.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/phase4/ai-generate.test.js` — stubs for AI-01 (mock Claude API)
- [ ] `dashboard/tests/phase4/ai-edit.test.js` — stubs for AI-02
- [ ] `dashboard/tests/phase4/objection-tracker.test.js` — stubs for AI-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generated post reads naturally in French | AI-01 | Quality is subjective | Generate 3 different post types, review text quality and tone |
| Inline editing UX is smooth | AI-02 | UX feel check | Generate a post, edit it in the textarea, save — verify no layout issues |
| Generation counter visible in UI | AI-03 | Visual check | Generate a post, verify counter increments visually in the header/sidebar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
