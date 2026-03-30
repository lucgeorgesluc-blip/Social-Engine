---
status: partial
phase: 04-sftp-deploy-gsc-ping
source: [04-VERIFICATION.md]
started: 2026-03-30T00:00:00.000Z
updated: 2026-03-30T00:00:00.000Z
---

## Current Test

[awaiting human testing — requires live credentials]

## Tests

### 1. SFTP deploy to IONOS production server

expected: After calling triggerDeploy(slug), all 5 files appear at correct remote paths on home755449657.1and1-data.host. Verify with WinSCP: blog/[slug].html, assets/images/blog/[slug].webp (if image exists), assets/js/config.js, assets/js/config.min.js, sitemap.xml.

result: [pending — requires SFTP credentials in .env]

### 2. GSC URL Inspection API ping

expected: pingGsc() returns status: "submitted" or "already_indexed" for a live article URL. Check autopilot/logs/pipeline.log for the gsc_status field.

result: [pending — requires GSC_SERVICE_ACCOUNT_PATH in .env]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
