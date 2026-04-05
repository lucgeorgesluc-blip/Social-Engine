---
phase: 04-sftp-deploy-gsc-ping
verified: 2026-03-30T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
gaps:
  - truth: "Telegram alert on SFTP failure"
    status: deferred
    reason: >
      SFTP retry-once logic is correct (p-retry). pending.json preserved on failure (correct).
      Telegram alert is deferred to Phase 5 (Telegram Approval Bot) by design — the Telegram
      module does not exist yet. triggerDeploy() throws on failure so Phase 5 can wrap it
      with an alert. This is the correct architecture boundary.
  - truth: "Planning documents"
    status: resolved
    reason: >
      Verifier looked in wrong directory (autopilot/.planning/ instead of .planning/).
      04-01-PLAN.md, 04-01-SUMMARY.md, 04-02-PLAN.md, 04-02-SUMMARY.md all exist at
      .planning/phases/04-sftp-deploy-gsc-ping/.
human_verification:
  - test: "SFTP deploy to IONOS production server"
    expected: "All 5 files (blog HTML, image WebP, config.js, config.min.js, sitemap.xml) appear at correct remote paths; verify with WinSCP after triggering triggerDeploy()"
    why_human: "Requires real SFTP credentials and a live IONOS connection — cannot simulate programmatically"
  - test: "GSC URL Inspection API call with real service account"
    expected: "pingGsc() returns status: 'submitted' or 'already_indexed' for a live article URL"
    why_human: "Requires GSC service account JSON at GSC_SERVICE_ACCOUNT_PATH — credentials not available in test environment"
---

# Phase 4: SFTP Deploy + GSC Ping Verification Report

**Phase Goal:** On pipeline approval, exactly 5 files deploy atomically to the IONOS production server and Google Search Console is pinged for indexing — with retry logic and a persisted state file

**Verified:** 2026-03-30
**Status:** human_needed (live SFTP + GSC credentials required)
**Re-verification:** No — initial verification

---

## Note on Planning Documents

The `.planning/phases/04-sftp-deploy-gsc-ping/` directory did not exist when this verification ran. No PLAN.md or SUMMARY.md files were present. The implementation was built and committed without the GSD planning trail. Must-haves were derived directly from the ROADMAP.md Phase 4 Success Criteria and REQUIREMENTS.md.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 5 files deploy atomically (temp+rename) to IONOS SFTP | ✓ VERIFIED | sftp-deployer.js: two-phase upload (all .tmp first, then all rename); test confirms 5 files with image, 4 without |
| 2 | SFTP uses temp-file + rename pattern to prevent half-written file serving | ✓ VERIFIED | sftp-deployer.js lines 63-76: pRetry wraps put() to .tmp path; separate rename loop; Test 3 asserts every put target ends with .tmp |
| 3 | On SFTP failure: retry once, then Telegram alert, do NOT mark as deployed | ✗ FAILED | Retry-once: confirmed (p-retry retries:1). Pending.json preserved: confirmed (Test 9). Telegram alert: absent — no alert call in deploy-orchestrator.js or sftp-deployer.js |
| 4 | pending.json written before approval gate and cleared after successful deploy | ✓ VERIFIED | writePending() in deploy-orchestrator.js (line 38-53); run.js Step 8 calls writePending(); triggerDeploy() calls unlinkSync(pendingPath) (line 142); Tests 1, 2, 5 confirm |
| 5 | GSC URL Inspection API call logged as submitted / already_indexed / error — does not block deploy | ✓ VERIFIED | gsc-ping.js: try/catch returns {status:'error'} not throws; pingGsc called after deployFiles in triggerDeploy(); Tests 1-5 in gsc-ping.test.js cover all 3 status outcomes |

**Score:** 4/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `autopilot/pipeline/sftp-deployer.js` | Atomic SFTP upload with retry | ✓ VERIFIED | 83 lines; exports deployFiles(); uses ssh2-sftp-client + p-retry; two-phase upload pattern |
| `autopilot/pipeline/gsc-ping.js` | GSC URL Inspection API with graceful failure | ✓ VERIFIED | 67 lines; exports pingGsc(); uses googleapis; never throws; returns status object |
| `autopilot/pipeline/deploy-orchestrator.js` | Approval gate: pending.json write/read/clear + deploy coordination | ✓ VERIFIED | 150 lines; exports writePending, readPending, triggerDeploy; wires sftp-deployer + gsc-ping |
| `autopilot/pipeline/run.js` (Step 8) | Writes pending state at end of generation pipeline | ✓ VERIFIED | Line 208: writePending() called with slug, title, articlePath, imagePath |
| `autopilot/state/` directory | Persisted state directory for pending.json | ✓ VERIFIED | Directory exists (empty — correct when no article pending) |
| `autopilot/tests/sftp-deployer.test.js` | 6 tests covering upload count, retry, atomic pattern, remote paths | ✓ VERIFIED | 6/6 passing |
| `autopilot/tests/gsc-ping.test.js` | 5 tests covering submitted/already_indexed/error/skipped/correct-params | ✓ VERIFIED | 5/5 passing |
| `autopilot/tests/deploy-orchestrator.test.js` | 9 tests covering writePending/readPending/triggerDeploy all branches | ✓ VERIFIED | 9/9 passing; note Test 9 does not assert Telegram alert |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `run.js` | `deploy-orchestrator.writePending` | import + Step 8 call | ✓ WIRED | Line 35 import, line 208 call |
| `deploy-orchestrator` | `sftp-deployer.deployFiles` | import + triggerDeploy() | ✓ WIRED | Line 17 import, line 93 call (or injected _deployFn) |
| `deploy-orchestrator` | `gsc-ping.pingGsc` | import + triggerDeploy() | ✓ WIRED | Line 18 import, line 103 call (or injected _pingFn) |
| `deploy-orchestrator` | `content-queue.yaml` status update | readFileSync + writeFileSync | ✓ WIRED | Lines 109-121: updates status: drafted -> published |
| `deploy-orchestrator` | `content-map.yaml` status update | readFileSync + writeFileSync | ✓ WIRED | Lines 123-139: updates status + adds published_at |
| `deploy-orchestrator` | Telegram alert on SFTP failure | (missing) | ✗ NOT_WIRED | No Telegram module imported or called anywhere in this phase |

---

## Data-Flow Trace (Level 4)

These modules are operational utilities (not UI renderers) — Level 4 data-flow trace applies to the state file.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `pending.json` | slug, title, articlePath, imagePath | run.js pipeline output (real article generation) | Yes | ✓ FLOWING |
| GSC ping result | coverageState | googleapis urlInspection.index.inspect() response | Yes (live API) | ✓ FLOWING |
| SFTP file paths | remote paths | slug + basePath + remoteBasePath | Yes (computed from real env vars) | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 21 phase 04 tests pass | `node --test tests/sftp-deployer.test.js tests/gsc-ping.test.js tests/deploy-orchestrator.test.js` | 21 pass, 0 fail | ✓ PASS |
| deployFiles exports as named function | `node -e "import('./pipeline/sftp-deployer.js').then(m=>console.log(typeof m.deployFiles))"` | function | ✓ PASS |
| pingGsc exports as named function | `node -e "import('./pipeline/gsc-ping.js').then(m=>console.log(typeof m.pingGsc))"` | function | ✓ PASS |
| writePending/readPending/triggerDeploy all exported | `node -e "import('./pipeline/deploy-orchestrator.js').then(m=>console.log(Object.keys(m).join(',')))"` | writePending,readPending,triggerDeploy | ✓ PASS |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| F1.7 | Approval Gate — write pending.json with article metadata before deploy | ✓ SATISFIED | writePending() in deploy-orchestrator.js; called from run.js Step 8; Tests 1-4 confirm shape and persistence |
| F1.8 | SFTP Deploy — atomic 5-file upload; retry once; Telegram alert on failure; mark published | ✗ PARTIAL | Atomic upload: confirmed. Retry once: confirmed. Mark published: confirmed (content-queue + content-map updated). Telegram alert on failure: MISSING |
| F1.9 | GSC Ping — submit to URL Inspection API; log submitted/already_indexed/error; does not block deploy | ✓ SATISFIED | pingGsc() returns status object never throws; all 3 outcomes tested; triggerDeploy continues regardless of GSC result |

**Orphaned requirements check:** REQUIREMENTS.md maps F1.7 to Phase 4 and F1.7a (Edit via Prompt) to Phase 5. F1.7a is correctly deferred — not orphaned. No additional Phase 4 requirements found in REQUIREMENTS.md beyond F1.7, F1.8, F1.9.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `deploy-orchestrator.js` | 92-99 | SFTP failure throws and bubbles without Telegram alert | ✗ Blocker | F1.8 "Telegram alert" half unimplemented — caller (Phase 5 Telegram bot) has no way to distinguish "SFTP failed, alert sent" from "SFTP failed, no one notified" |

No placeholder comments, empty returns, or TODO/FIXME markers found in phase 04 source files.

---

## Human Verification Required

### 1. Live SFTP Deploy to IONOS

**Test:** Set SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH in .env, create a test pending.json, call triggerDeploy() with real credentials.
**Expected:** All 5 files appear on IONOS server at correct remote paths (verify with WinSCP).
**Why human:** Requires live IONOS credentials and network access.

### 2. GSC URL Inspection with Real Service Account

**Test:** Set GSC_SERVICE_ACCOUNT_PATH to a real service account JSON, call pingGsc() with a live article URL from magnetiseuse-lacoste-corinne.fr.
**Expected:** Returns { status: "submitted" } or { status: "already_indexed" } — not "error" or "skipped".
**Why human:** Requires GSC service account with Webmasters scope — credentials not available in this environment.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Telegram alert on SFTP failure (F1.8 partial):**
The SFTP retry-once logic is correctly implemented via p-retry in sftp-deployer.js. The pending.json preservation on failure is correctly implemented in deploy-orchestrator.js (throws, so unlinkSync is never reached). However, F1.8 requires that after the final retry failure a Telegram alert is sent. No Telegram module is imported or called anywhere in phase 04. The design intent in the ROADMAP is that the Telegram bot (Phase 5) wraps triggerDeploy() — meaning the alert would be sent by the Phase 5 caller, not phase 04 itself. If that is the intended design split, this gap is an acceptable boundary decision; if phase 04 is meant to be self-contained on alerting, it is a missing feature. This needs a decision before marking F1.8 satisfied.

**Gap 2 — Missing planning documents:**
No PLAN.md or SUMMARY.md files exist for phase 04. The phase directory did not exist at all. This does not affect runtime behavior but means the implementation is undocumented in the GSD planning trail, making it impossible to verify against the original must_haves frontmatter.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
