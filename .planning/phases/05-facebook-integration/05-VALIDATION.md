---
phase: 5
slug: facebook-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | `dashboard/package.json` — `"test": "node --test tests/*.test.js"` |
| **Quick run command** | `cd dashboard && node --test tests/phase5/*.test.js` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && node --test tests/phase5/*.test.js`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 6 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | FB-01 | integration | `node --test tests/phase5/fb-publish.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FB-02 | integration | `node --test tests/phase5/fb-comments.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FB-03 | integration | `node --test tests/phase5/fb-metrics.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FB-04 | unit+integration | `node --test tests/phase5/fb-token.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/tests/phase5/fb-token.test.js` — stubs for FB-04 (token health logic)
- [ ] `dashboard/tests/phase5/fb-comments.test.js` — stubs for FB-02 (mock Graph API)
- [ ] `dashboard/tests/phase5/fb-metrics.test.js` — stubs for FB-03 (mock Graph API)
- [ ] `dashboard/tests/phase5/fb-publish.test.js` — stubs for FB-01 (mock Graph API)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token health banner color accuracy | FB-04 | Visual CSS check | With valid token: verify green banner. Set expiry to 3 days out: verify amber. Use expired token: verify red |
| OAuth flow completes end-to-end | FB-04 | Requires real Facebook login | Click "Reconnecter", complete Facebook OAuth, verify token stored and banner turns green |
| Real Facebook comments appear | FB-02 | Requires real Facebook page | Post a test comment on Facebook page, wait 15 min, verify it appears in dashboard |
| Auto-publish posts to Facebook | FB-01 | Requires App Review approval | Schedule a post, wait for cron, verify it appears on Facebook page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 6s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
