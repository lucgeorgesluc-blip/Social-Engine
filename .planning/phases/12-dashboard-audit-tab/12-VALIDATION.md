---
phase: 12
slug: dashboard-audit-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser smoke test (manual) + node --test for backend routes |
| **Config file** | none |
| **Quick run command** | `cd autopilot && node --test tests/audit-routes.test.js` |
| **Full suite command** | `cd autopilot && node --test tests/*.test.js` |
| **Estimated runtime** | ~5 seconds (backend); manual browser check ~2 min |

---

## Sampling Rate

- **After every task commit:** Run `cd autopilot && node --test tests/audit-routes.test.js`
- **After every plan wave:** Run `cd autopilot && node --test tests/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser smoke check
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | F4.9 | unit | `node --test tests/audit-routes.test.js` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | F4.9 | manual | Browser: visit /dashboard, check Audit SEO tab visible | n/a | ⬜ pending |
| 12-02-01 | 02 | 2 | F4.9 | unit | `node --test tests/audit-routes.test.js` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | F4.9 | manual | Browser: click page row, verify drill-down + patch flow | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `autopilot/tests/audit-routes.test.js` — stubs for F4.9 backend routes (GET /api/audit, GET /api/audit/:slug, POST /api/audit/run, POST /api/audit/:slug/patch, DELETE /api/audit/:slug/patch)

*Existing test infrastructure (node --test) covers all other requirements. Frontend is validated manually via browser.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit SEO tab visible, positioned between Rankings and Link Tree | F4.9 SC1 | Requires browser render | Open dashboard, verify tab order in sidebar |
| Health grid color-coding correct | F4.9 SC2 | Visual check | Verify ≥80=green, 60-79=amber, <60=red badges |
| SSE auto-refresh on audit-complete | F4.9 SC2 | Requires live SSE stream | Trigger POST /api/audit/run, verify grid refreshes without reload |
| Drill-down expansion on row click | F4.9 SC3 | Requires browser interaction | Click a row, verify issues panel expands |
| Patch preview syntax highlighting | F4.9 SC5 | Visual check | Generate patch, verify highlight.js coloring in preview |
| Approve/Reject UI without full reload | F4.9 SC5 | Requires browser interaction | Click Approve, verify no page reload, status updates inline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
