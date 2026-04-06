# Phase 5: Facebook Integration - Research

**Researched:** 2026-04-06
**Domain:** Meta Graph API v21.0, token management, comment polling, metrics retrieval, auto-publishing
**Confidence:** MEDIUM (Facebook API deprecation uncertainty)

<user_constraints>
## User Constraints (from project context)

### Locked Decisions
- Stack: Node 20 + Express 4 + EJS + pg (raw SQL) + Tailwind CSS
- Meta Graph API for all Facebook interactions
- Clipboard-copy fallback (Phase 3) must remain the primary posting path
- App Review for pages_manage_posts is unpredictable — auto-posting is conditional
- Token health must always be visible (banner)
- UI text in French

### Known Blockers (from STATE.md)
- **Facebook App Review uncertainty:** pages_manage_posts approval is unpredictable (days to months). Auto-posting depends on it. Must implement graceful fallback.
- **Facebook metrics endpoints (June 2026 deprecation):** Specific surviving endpoints not confirmed. Must verify against current Meta docs before implementation.

### Claude's Discretion
- Token refresh strategy (manual vs automated)
- Polling interval for comments
- Metrics caching approach
- Webhook vs polling for comment ingestion
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FB-01 | Auto-post scheduled content to Facebook page via Graph API | Pages API publish endpoint, conditional on App Review |
| FB-02 | Pull new comments from Facebook automatically | Comments edge polling, webhook alternative |
| FB-03 | Pull real metrics from Facebook (reach, impressions, engagement) | Page Insights API, post-level metrics |
| FB-04 | Token health check UI shows status and warns before expiry | Token debug endpoint, expiry tracking |
</phase_requirements>

---

## Summary

Phase 5 connects the dashboard to Facebook's Graph API for three purposes: pulling comments, pulling metrics, and optionally auto-publishing posts. The critical architectural decision is that **auto-posting (FB-01) is conditional** on Meta App Review approval for `pages_manage_posts`, which may take weeks or never arrive. The dashboard must work fully without it — clipboard-copy from Phase 3 remains the primary posting method.

Token management is the backbone: a Page Access Token with 60-day expiry must be stored in the DB, its health checked on every dashboard load, and the operator warned 7 days before expiry. A background cron job (node-cron, already available pattern from autopilot) polls for new comments every 15 minutes and syncs metrics daily.

**Primary recommendation:** Implement in 3 layers: (1) token management + health UI first, (2) comment polling + metrics sync second, (3) auto-posting last (behind a feature flag that only activates if App Review is approved). Use `node-cron` for scheduled jobs, `node-fetch` or built-in `fetch` (Node 20+) for Graph API calls.

---

## Technical Research

### 1. Meta Graph API Setup

**Required permissions:**
- `pages_read_engagement` — read comments and reactions (standard access, no App Review)
- `pages_read_user_content` — read user-posted content on page
- `read_insights` — read page and post metrics
- `pages_manage_posts` — publish posts (REQUIRES App Review)

**API version:** v21.0 (current stable as of 2026)

**Base URL:** `https://graph.facebook.com/v21.0/`

**No npm package needed** — use Node 20 built-in `fetch()` for all API calls. No `facebook-sdk` or `fb` package required.

### 2. Token Management (FB-04)

**Token types:**
- **Short-lived User Token:** 1-2 hours, obtained from OAuth flow
- **Long-lived User Token:** ~60 days, exchanged from short-lived
- **Page Access Token:** Derived from long-lived user token, lasts ~60 days

**Storage:**
```sql
CREATE TABLE fb_tokens (
  id SERIAL PRIMARY KEY,
  token_type VARCHAR(20) NOT NULL,  -- 'page_access'
  access_token TEXT NOT NULL,
  page_id VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Health check endpoint:**
```
GET https://graph.facebook.com/debug_token?input_token={token}&access_token={app_id}|{app_secret}
```

Response includes `expires_at`, `is_valid`, `scopes`.

**Token health banner logic:**
| Condition | Color | Message |
|-----------|-------|---------|
| Valid, > 7 days to expiry | Green | "Token Facebook valide" |
| Valid, <= 7 days to expiry | Amber | "Token expire dans X jours — Renouveler" |
| Expired or invalid | Red | "Token Facebook expiré — Reconnecter" |

**Token renewal flow:**
1. Operator clicks "Reconnecter" → redirects to Facebook OAuth
2. Server exchanges code for short-lived token
3. Exchanges short-lived for long-lived token
4. Derives page access token
5. Stores in `fb_tokens` table
6. Redirects back to dashboard

**OAuth routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/fb/auth` | Redirect to Facebook OAuth |
| GET | `/dashboard/fb/callback` | Handle OAuth callback, store token |

### 3. Comment Polling (FB-02)

**Endpoint:**
```
GET /{page-id}/feed?fields=id,message,created_time,comments{id,message,from,created_time}
```

Or per-post:
```
GET /{post-id}/comments?fields=id,message,from,created_time&since={last_poll_timestamp}
```

**Polling strategy:**
- Use `node-cron` to run every 15 minutes
- Store `last_poll_at` timestamp in a `fb_sync_state` table
- Use `since` parameter to only fetch new comments
- Upsert into `comments` table using Facebook comment ID as unique key
- New comments default to `handled = false`, `classification = null` (operator classifies manually)

**Sync state table:**
```sql
CREATE TABLE fb_sync_state (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Keys: 'comments_last_poll', 'metrics_last_sync', 'posts_last_publish_check'
```

**Important:** The `from` field on comments requires `pages_read_user_content` permission. Without it, commenter names may be anonymized.

### 4. Metrics Retrieval (FB-03)

**Post-level metrics:**
```
GET /{post-id}/insights?metric=post_impressions,post_reach,post_engaged_users,post_clicks
```

**Page-level metrics:**
```
GET /{page-id}/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&since={date}&until={date}
```

**Deprecation concern (June 2026):**
- Meta announced deprecation of some legacy Insights endpoints
- `post_impressions` and `post_reach` are expected to survive (core metrics)
- `page_fans` may be replaced — check Meta changelog before implementation
- **Mitigation:** Abstract metrics fetching behind a service layer so endpoints can be swapped without route changes

**Sync strategy:**
- Daily cron job (once per day, e.g., 6:00 AM)
- Fetch metrics for all published posts from last 7 days (metrics stabilize after ~3 days)
- Store in `post_metrics` table:

```sql
CREATE TABLE post_metrics (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  fb_post_id VARCHAR(100),
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, DATE(synced_at))
);
```

### 5. Auto-Publishing (FB-01) — Conditional

**Endpoint:**
```
POST /{page-id}/feed
Content-Type: application/json

{
  "message": "Post content here...",
  "access_token": "{page_access_token}"
}
```

**Requires:** `pages_manage_posts` permission (App Review required)

**Implementation strategy:**
- Feature flag in DB: `fb_sync_state` key `'auto_publish_enabled'` = `'true'`/'`false'`
- Default: `false` (clipboard-copy remains primary)
- Cron job checks every 5 minutes for posts with `status = 'scheduled'` and `scheduled_date <= NOW()`
- If auto_publish enabled AND token valid: publish via API, update post status to 'published', store `fb_post_id`
- If auto_publish disabled: skip (operator uses clipboard-copy from Phase 3)

**Admin toggle:**
- Settings page: "Publication automatique Facebook" toggle
- Only activatable if token has `pages_manage_posts` scope (check via debug_token)
- If scope missing: show "Nécessite l'approbation Meta App Review" message

### 6. Background Jobs Architecture

**Using node-cron (pattern from autopilot):**

```javascript
const cron = require('node-cron');

// Comment polling — every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await syncFacebookComments();
});

// Metrics sync — daily at 6 AM
cron.schedule('0 6 * * *', async () => {
  await syncFacebookMetrics();
});

// Auto-publish check — every 5 minutes (if enabled)
cron.schedule('*/5 * * * *', async () => {
  if (await isAutoPublishEnabled()) {
    await publishScheduledPosts();
  }
});
```

**Error handling:** Each job wraps in try/catch, logs errors to `pino`, does NOT crash the Express server. Failed jobs retry on next cron tick.

### 7. Route Structure

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/fb/auth` | Initiate Facebook OAuth |
| GET | `/dashboard/fb/callback` | OAuth callback |
| GET | `/dashboard/fb/status` | Token health JSON (AJAX) |
| POST | `/dashboard/fb/sync-comments` | Manual comment sync trigger |
| POST | `/dashboard/fb/sync-metrics` | Manual metrics sync trigger |
| GET | `/dashboard/settings` | Settings page with auto-publish toggle |
| POST | `/dashboard/settings/auto-publish` | Toggle auto-publish |

### 8. Dependencies

**New packages for dashboard/package.json:**
```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  }
}
```

**No Facebook SDK package** — use native `fetch()` (Node 20+). The Graph API is REST-based and doesn't benefit from a client library for our simple use cases.

### 9. Security Considerations

- **App Secret** must be in `.env`, never client-side
- **Page Access Token** stored encrypted in DB (or at minimum, never exposed to frontend)
- **OAuth state parameter** must be validated to prevent CSRF
- **Rate limits:** Graph API allows 200 calls/hour per user token — our polling schedule stays well under this
- **Token rotation:** When token is refreshed, old token is overwritten (not accumulated)

---

## Validation Architecture

### Critical Paths
1. Token flow: OAuth → exchange → store → health check → banner display
2. Comment sync: cron triggers → fetch new comments → upsert to DB → appear in dashboard
3. Metrics sync: cron triggers → fetch post metrics → store → display in analytics
4. Auto-publish (conditional): cron checks → token valid + permission → publish → update status

### Test Approach
- Unit tests for token health calculation (valid/warning/expired)
- Integration test for comment sync (mock Graph API responses)
- Integration test for metrics sync (mock responses)
- E2E: OAuth flow → token stored → health banner green
- Feature flag test: auto-publish disabled → no API calls made

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App Review rejected | MEDIUM | MEDIUM | Auto-posting is optional; clipboard-copy works without it |
| Metrics endpoint deprecated | MEDIUM | MEDIUM | Abstract behind service layer; swap endpoints when Meta updates |
| Token expiry unnoticed | LOW | HIGH | Health banner on every page load + amber warning at 7 days |
| Rate limiting | LOW | LOW | Polling intervals well under 200 calls/hour limit |
| Comment sync misses data | LOW | MEDIUM | Manual sync button as fallback; store last_poll timestamp |
| OAuth flow complexity | LOW | MEDIUM | Well-documented Meta OAuth; follow standard pattern |

---

## Open Questions

1. **Exact surviving metrics endpoints post-June 2026** — Must check Meta developer changelog before implementation. Planner should include a "verify endpoints" task in Wave 0.
2. **Webhook vs polling for comments** — Webhooks require a public HTTPS endpoint and Meta verification. Polling is simpler for a single-operator tool. Recommendation: polling (simpler, sufficient for 15-min freshness).
3. **Token encryption at rest** — Is AES encryption of the stored token worth the complexity? Recommendation: YES for production, but acceptable to defer to a hardening pass.
4. **node-cron vs pg-based job queue** — node-cron is simpler but doesn't survive process restarts mid-job. Recommendation: node-cron is fine for this scale (single operator, non-critical timing).

---

*Phase: 05-facebook-integration*
*Research completed: 2026-04-06*
