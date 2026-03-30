---
phase: 3
slug: image-generation
status: active
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-30
updated: 2026-03-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | None (uses package.json script) |
| **Quick run command** | `cd autopilot && node --test tests/image-generator.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && node --test tests/image-generator.test.js`
- **After every plan wave:** Run `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 3-01-T1 | 01 | 1 | F1.6 a-g | unit (mocked API + real sharp) | `cd autopilot && node --test tests/image-generator.test.js` | pending |
| 3-01-T2 | 01 | 1 | F1.6 | integration (run.js wiring) | `cd autopilot && node --test tests/*.test.js` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

**Wave 0 is satisfied within Task 1 itself (TDD within-task model).**

Task 1 writes tests first (`autopilot/tests/image-generator.test.js`) before implementing `autopilot/pipeline/image-generator.js`. The test file is created as the first action of Task 1, not as a separate prerequisite plan.

There are no external Wave 0 prerequisite files or plans needed. The existing test infrastructure from Phase 1/2 (node:test runner, ESM imports, sharp installed) provides the foundation.

- [x] Test runner: `node:test` (built-in, no install needed)
- [x] Assertion library: `node:assert/strict` (built-in)
- [x] sharp: already installed (Phase 1)
- [x] Test file `autopilot/tests/image-generator.test.js`: created by Task 1 TDD approach

---

## Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| F1.6-a | generateImage returns { success: true, imagePath } with valid inputs | unit (mocked API) | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-b | sharp produces 800x450 WebP at quality 85 | unit (real sharp, test buffer) | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-c | API failure returns { success: false } without throwing | unit (mocked API error) | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-d | Missing API key returns { success: false } immediately | unit | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-e | dry-run returns { success: false, reason: 'dry-run' } | unit | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-f | Image prompt contains article title and primary keyword | unit | `cd autopilot && node --test tests/image-generator.test.js` |
| F1.6-g | Output file is <=300KB | unit (real sharp with test image) | `cd autopilot && node --test tests/image-generator.test.js` |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Image visually correct (not garbled/corrupt) | F1.6 | Binary WebP quality cannot be asserted by grep | Open assets/images/blog/[slug].webp in image viewer, confirm 800x450, topic-relevant |
| Gemini API actually charges $0.039 | F1.6 | Cost only visible in Google AI Console | Check Google AI Studio usage dashboard after test run |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 satisfied (within-task TDD model)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated
