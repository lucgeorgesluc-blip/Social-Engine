---
phase: 1
slug: foundation-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node --test) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd autopilot && node --test test/` |
| **Full suite command** | `cd autopilot && node --test test/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && node --test test/`
- **After every plan wave:** Run `cd autopilot && node --test test/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | F3.1 | integration | `npm install --prefix autopilot && echo $?` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | F3.2 | integration | `node autopilot/server.js & sleep 2 && curl -s http://localhost:3000/health` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | F3.3 | unit | `cd autopilot && node --test test/config-loader.test.js` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | F3.1 | file check | `test -f autopilot/.env.example && echo OK` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | F3.4 | manual | `curl with API key` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/test/config-loader.test.js` — stubs for F3.3 config loading
- [ ] `autopilot/test/server.test.js` — stubs for F3.2 health check
- [ ] Node.js built-in test runner — no install needed (Node 22+)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gemini model name verification | F3.4 | Requires valid API key | Run curl against Google AI API with user's key, verify model name response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
