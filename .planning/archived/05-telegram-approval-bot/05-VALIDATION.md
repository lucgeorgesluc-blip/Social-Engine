---
phase: 5
slug: telegram-approval-bot
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `autopilot/package.json` (jest config) |
| **Quick run command** | `cd autopilot && npm test -- --testPathPattern=telegram` |
| **Full suite command** | `cd autopilot && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && npm test -- --testPathPattern=telegram`
- **After every plan wave:** Run `cd autopilot && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | F1.7 | unit stub | `npm test -- --testPathPattern=telegram-bot` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | F1.7 | unit | `npm test -- --testPathPattern=telegram-bot` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | F1.7 | unit | `npm test -- --testPathPattern=telegram-bot` | ✅ | ⬜ pending |
| 05-01-04 | 01 | 1 | F1.7 | unit | `npm test -- --testPathPattern=telegram-bot` | ✅ | ⬜ pending |
| 05-01-05 | 01 | 2 | F1.7a | unit | `npm test -- --testPathPattern=telegram-bot` | ✅ | ⬜ pending |
| 05-01-06 | 01 | 2 | F1.7a | unit | `npm test -- --testPathPattern=telegram-bot` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/src/__tests__/telegram-bot.test.js` — stubs for F1.7, F1.7a (inline keyboard, approve flow, edit loop, limit guard)
- [ ] Jest already installed (`"jest": "^29.x"` in package.json — confirm or add)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Telegram message received on phone with inline buttons | F1.7 | Requires real Telegram account + bot token + live network | Send test article, check phone receives preview with "Approuver" / "Modifier" buttons |
| "Approuver" triggers SFTP deploy and confirmation message | F1.7 | Requires live SFTP credentials + Telegram | Tap Approuver, verify site updated + confirmation message received |
| "Modifier" → text input → re-generation → new preview | F1.7a | Requires Claude API + Telegram interaction | Tap Modifier, type edit request, verify new preview arrives |
| 3-attempt limit sends "Limite de modifications atteinte" | F1.7a | Requires multi-step Telegram interaction | Exhaust 3 edit attempts, verify bot stops and sends alert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
