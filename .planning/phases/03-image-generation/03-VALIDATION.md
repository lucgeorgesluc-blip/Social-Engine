---
phase: 3
slug: image-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (Node.js) |
| **Config file** | autopilot/package.json (jest config) |
| **Quick run command** | `cd autopilot && npx jest pipeline/image-generator --no-coverage` |
| **Full suite command** | `cd autopilot && npx jest --no-coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && npx jest pipeline/image-generator --no-coverage`
- **After every plan wave:** Run `cd autopilot && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | F1.6 | unit | `cd autopilot && npx jest pipeline/image-generator --no-coverage` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | F1.6 | unit | `cd autopilot && npx jest pipeline/image-generator --no-coverage` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | F1.6 | unit | `cd autopilot && npx jest pipeline/image-generator --no-coverage` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | F1.6 | integration | `cd autopilot && npx jest pipeline/image-generator.integration --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/pipeline/image-generator.test.js` — stubs for F1.6 (unit tests for generateImage module)
- [ ] `autopilot/tests/pipeline/image-generator.integration.test.js` — integration test with mocked @google/genai
- [ ] `autopilot/tests/mocks/genai.mock.js` — shared mock for @google/genai SDK

*Existing jest infrastructure from Phase 1/2 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Image visually correct (not garbled/corrupt) | F1.6 | Binary WebP quality cannot be asserted by grep | Open assets/images/blog/[slug].webp in image viewer, confirm 800x450, topic-relevant |
| Gemini API actually charges $0.039 | F1.6 | Cost only visible in Google AI Console | Check Google AI Studio usage dashboard after test run |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
