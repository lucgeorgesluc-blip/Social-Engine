---
phase: 2
slug: article-generation-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) |
| **Config file** | none — Wave 0 installs test stubs |
| **Quick run command** | `cd autopilot && node --test tests/*.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && node --test tests/*.test.js`
- **After every plan wave:** Run `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Wave 0 | 01 | 0 | F1.2 | unit | `cd autopilot && node --test tests/topic-selector.test.js` | ❌ W0 | ⬜ pending |
| Wave 0 | 01 | 0 | F1.4 | unit | `cd autopilot && node --test tests/validator.test.js` | ❌ W0 | ⬜ pending |
| Wave 0 | 01 | 0 | F1.5 | unit | `cd autopilot && node --test tests/file-updater.test.js` | ❌ W0 | ⬜ pending |
| Wave 0 | 01 | 0 | F1.10 | unit | `cd autopilot && node --test tests/cost-logger.test.js` | ❌ W0 | ⬜ pending |
| Wave 0 | 01 | 0 | F1.1 | unit | `cd autopilot && node --test tests/loader.test.js` | ⚠️ partial W0 | ⬜ pending |
| F1.3 | — | — | F1.3 | integration | Manual (requires API key) | ❌ manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/topic-selector.test.js` — stubs for F1.2 (mock content-queue + content-map data)
- [ ] `tests/validator.test.js` — stubs for F1.4 (test each of 7 checks with pass/fail HTML)
- [ ] `tests/file-updater.test.js` — stubs for F1.5 (test config.js prepend, sitemap insertion, YAML updates on temp files)
- [ ] `tests/cost-logger.test.js` — stubs for F1.10 (test JSONL output format, run guard)
- [ ] `tests/loader.test.js` — extend existing: add tests for the 5 new context sources (F1.1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude API streaming call produces complete HTML | F1.3 | Requires live API key; cost incurred per call | Run `node autopilot/pipeline/run.js --dry-run` with `ANTHROPIC_API_KEY` set; verify output file starts with `<!DOCTYPE html>` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
