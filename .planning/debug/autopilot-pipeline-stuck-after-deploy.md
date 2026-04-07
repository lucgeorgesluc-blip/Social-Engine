---
status: awaiting_human_verify
trigger: "After article deployment, queue item stays 'in progress' forever. Pipeline never advances to post-deploy steps (GSC ping, sitemap update, notify). No errors in logs — fails silently."
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T11:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (second bug) — writePipelineStatus(6) is never called after triggerDeploy completes. pipeline-status.json is permanently stuck at step 5 "Await Approval" after every deployment.
test: Grepped entire autopilot/ for writePipelineStatus(6) — zero matches. writePipelineStatus(5) is called in run.js line 293 before writing pending.json, but no code advances to step 6 after deploy.
expecting: Fix applied — added writePipelineStatus(6) call in deploy-orchestrator.js after removePendingBySlug.
next_action: Human verification — run a pipeline cycle and confirm pipeline-status.json advances to step 6 after deployment.

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: After article deployment, pipeline continues to next step (GSC ping, sitemap, notify) and queue item transitions to completed
actual: Queue item stays 'in progress' forever — the pipeline is stuck and never advances after the deploy step
errors: No errors — fails silently
reproduction: Deploy an article through the autopilot queue
started: Never worked as expected (first time this pipeline stage was tested)

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Missing post-deploy callback/continuation in pipeline runner
  evidence: triggerDeploy() does complete all steps (SFTP, GSC, content-map update, pending removal, git push) — the problem is it does so synchronously while the HTTP connection waits
  timestamp: 2026-04-07T10:00:00Z

- hypothesis: Queue tab has a separate data source that doesn't update
  evidence: Queue tab uses filteredArticles computed from this.articles array. confirmApprove() sets a.status = 'published' optimistically on success, which removes the item from the 'active' filter. Same data source, correct update path.
  timestamp: 2026-04-07T10:00:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-07T10:00:00Z
  checked: autopilot/routes/api.js line 401
  found: `const result = await triggerDeploy({ slug })` — fully synchronous, response sent only after all steps complete
  implication: HTTP response blocked for entire deploy duration (SFTP upload + GSC ping + file writes + git push)

- timestamp: 2026-04-07T10:00:00Z
  checked: autopilot/pipeline/deploy-orchestrator.js lines 178-237
  found: triggerDeploy() runs sequentially: SFTP deploy → GSC ping → content-queue.yaml update → content-map.yaml update → removePendingBySlug → commitAndPush. No timeout. commitAndPush can fail non-fatally (warn only).
  implication: Total time can be 30-90+ seconds. Frontend fetch has no timeout, shows "Déploiement..." spinner for entire duration.

- timestamp: 2026-04-07T10:00:00Z
  checked: autopilot/dashboard/index.html confirmApprove() lines 1852-1878
  found: On r.ok, sets a.status = 'published' and decrements pendingCount. filteredArticles (statusFilter='active') filters to pending|drafted only — so article correctly disappears when status becomes 'published'.
  implication: The optimistic update logic is correct. The only problem is the response never arrives (or takes too long), keeping approving.has(slug)=true and the row frozen.

- timestamp: 2026-04-07T10:00:00Z
  checked: SSE handler in index.html lines 1577-1597
  found: SSE handles 'pipeline', 'pending', 'audit', 'audit-complete', 'cluster-focus' message types. No 'deploy-complete' or 'article-published' type handled.
  implication: Even if server emits deploy completion via SSE, frontend ignores it. Need to add handler.

- timestamp: 2026-04-07T10:00:00Z
  checked: deploy-orchestrator.js line 221
  found: content-map update regex `.replace(/(status:\s*"published")/, `$1\n    published_at: "..."`)` — if entry is already published, this appends a second published_at line on every deploy
  implication: Secondary bug — duplicate published_at lines accumulate in content-map.yaml. Not the stuck-UI bug but should be fixed.

- timestamp: 2026-04-07T11:00:00Z
  checked: grep for writePipelineStatus(6) across entire autopilot/ directory
  found: zero matches — writePipelineStatus(6) was never called anywhere
  implication: After triggerDeploy() clears pending.json, pipeline-status.json stays at step 5 forever. Dashboard stepper shows "Await Approval" indefinitely even after successful deployment.

- timestamp: 2026-04-07T11:00:00Z
  checked: pending.json = [] + pipeline-status.json stuck at step 5
  found: article arret-tabac-sans-rien-5-methodes-100-gratuites-2026 was deployed via Telegram (removePendingBySlug called), clearing pending.json, but writePipelineStatus(6) was never reached
  implication: The article was NOT lost — it was deployed. The "stuck" symptom was entirely explained by the missing step-6 status write.

- timestamp: 2026-04-07T11:00:00Z
  checked: deploy-orchestrator.js — where writePipelineStatus(6) should be called
  found: triggerDeploy() does: SFTP → GSC ping → content-queue update → content-map update → removePendingBySlug → commitAndPush. No writePipelineStatus call anywhere.
  implication: Fix applied — added import of writePipelineStatus from activity-logger.js and call after removePendingBySlug (line ~237).

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Two bugs found:
  1. (Previously fixed) POST /api/articles/:slug/approve awaited triggerDeploy() synchronously (30-90s), blocking the HTTP response. Frontend spinner frozen for entire SFTP+GSC+git duration.
  2. (This session) writePipelineStatus(6) was never called anywhere in the codebase. After triggerDeploy() completed and pending.json was cleared, pipeline-status.json remained permanently at step 5 "Await Approval". The article disappearing from pending.json while status stayed at step 5 is what created the appearance of "stuck" pipeline — the article was actually deployed correctly, but the stepper never advanced.

fix: |
  Bug 1 (previous session):
  1. autopilot/routes/api.js: approve route responds 202 immediately, runs triggerDeploy in background, writes result to state/deploy-events.json
  2. autopilot/routes/api.js: SSE poller emits 'deploy-complete' type
  3. autopilot/dashboard/index.html: SSE handler + confirmApprove() updated for fire-and-forget flow
  4. autopilot/pipeline/deploy-orchestrator.js: fixed duplicate published_at lines
  Bug 2 (this session):
  5. autopilot/pipeline/deploy-orchestrator.js: added writePipelineStatus(6) call after removePendingBySlug in triggerDeploy() + imported writePipelineStatus from activity-logger.js

verification: pending human test
files_changed:
  - autopilot/routes/api.js
  - autopilot/dashboard/index.html
  - autopilot/pipeline/deploy-orchestrator.js
