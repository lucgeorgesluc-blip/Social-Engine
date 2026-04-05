# Domain Pitfalls — Social Acquisition Dashboard

**Domain:** Social media management dashboard with Facebook API, Render hosting, Claude API, PostgreSQL
**Researched:** 2026-04-05
**Overall confidence:** MEDIUM-HIGH (Facebook API behavior verified via official Meta docs; Render limits verified via changelog)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or blocked deploys.

---

### Pitfall 1: Render Free PostgreSQL Deleted After 30 Days

**What goes wrong:** The Render free PostgreSQL tier now expires after 30 days (changed May 2024, was previously 90 days). After expiry, a 14-day grace window exists before data is permanently deleted. Developers assume a free DB is permanent.

**Why it happens:** Render's free tier is intended for prototyping, not production persistence. The policy change was quiet — old tutorials still reference "90 days."

**Consequences:** All YAML-seeded data is lost. The dashboard becomes non-functional. Re-seeding is possible but DM pipeline state, comment tracking history, and prospect stages are gone.

**Prevention:**
- Budget $7/month for Render Starter PostgreSQL from day one. This is not optional for a production tool.
- Alternatively, use Supabase free tier (500MB, no expiry, but connection pool limit of 60).
- Never use Render free DB for anything beyond initial development/demo.

**Detection:** Watch for Render email warnings. Add a health check endpoint that logs DB uptime date.

**Phase:** Address in Phase 1 (infrastructure setup) — decide paid vs. Supabase before writing any migration code.

---

### Pitfall 2: Facebook App Review Blocks API Access for Weeks

**What goes wrong:** `pages_manage_posts` and `pages_read_engagement` permissions require Meta App Review before they work for accounts beyond the app developer. Even for a single-operator tool where Benjamin is both developer and page admin, the app must be in "Development Mode" or go through review to use these permissions on the live page.

**Why it happens:** Meta has significantly tightened API access since 2021. App Review now requires a screencast video, test credentials, a privacy policy URL, and a data use explanation. Approval takes days to months. Rejection is common.

**Consequences:** The Facebook auto-post and metrics features cannot be built or tested until review passes. This can block an entire phase.

**Prevention:**
- Start the App Review process in Phase 1, not when you need the feature.
- In Development Mode, the app works for accounts with a Developer/Tester role on the app — add Benjamin's personal FB account immediately.
- Build a "manual clipboard copy" fallback for posting so the dashboard is useful even without API posting permission.
- Use a Page Access Token (not User Token) for posting — page tokens derived from long-lived user tokens do not expire under normal conditions.

**Detection:** Test permissions in the Graph API Explorer before writing any integration code. If the permission is grayed out or returns error code 200 (OAuthException), review is required.

**Phase:** Start review process in Phase 1. Build manual fallback in Phase 2. Assume API auto-post is Phase 3+ at earliest.

---

### Pitfall 3: Facebook Access Token Expiry Breaks Automated Posting Silently

**What goes wrong:** Short-lived user tokens expire in 1-2 hours. Long-lived user tokens expire in 60 days. If the refresh flow is not implemented, the dashboard stops posting silently — no error surfaced to the user.

**Why it happens:** Developers generate a token manually, hardcode it or store it in `.env`, and forget token rotation. The token expires 60 days later with no warning in the UI.

**Consequences:** Scheduled posts are silently dropped. The operator discovers the problem days later when engagement drops.

**Prevention:**
- Use Page Access Tokens (derived from long-lived user token) — these do not expire unless the user revokes app access or changes password.
- Store the token in the PostgreSQL `settings` table, not in `.env` files or code.
- Add a token validation check on dashboard startup: call `GET /me?access_token=...` and surface a prominent warning if it returns error code 190 (Invalid OAuth Token).
- Never retry on authentication errors (code 190, 401) without first refreshing the token.

**Detection:** Monitor `X-Business-Use-Case-Usage` response headers. Error code 190 = token expired. Surface this in the dashboard as a red banner, not a server log.

**Phase:** Token health check UI in Phase 2 (Facebook integration). Token refresh flow in Phase 3.

---

### Pitfall 4: Render Free Web Service Cold Starts (30-second delay)

**What goes wrong:** Render free web services spin down after 15 minutes of inactivity. The next request triggers a cold start taking 30 seconds to 2 minutes. For a dashboard the operator opens once a day, this means every session starts with a visible freeze.

**Why it happens:** Free tier = no persistent container. Render bills by the second on paid tiers, so free tier shuts down idle services.

**Consequences:** Poor UX — operator sees a blank screen for up to 2 minutes. Scheduled tasks (if implemented via cron) will not fire during spin-down.

**Prevention:**
- Use Render Starter tier ($7/month) which does not spin down. Best option.
- If staying free: use an external ping service (cron-job.org, UptimeRobot) to hit the health endpoint every 10 minutes — keeps the service warm. Free.
- Never implement scheduled posting via `setInterval` or `node-cron` on a Render free tier — the process is dead during spin-down.
- For scheduled posts: store schedule in DB, check on each dashboard load, trigger on user action or a reliable external cron (Render Cron Job service, even on free, is separate from web service).

**Detection:** First request after inactivity returns 200 but takes >15s. Add a `/health` endpoint that responds instantly with `{ status: "ok" }`.

**Phase:** Architecture decision in Phase 1. Implement keep-alive or upgrade plan before any scheduling feature.

---

### Pitfall 5: Claude API Runaway Costs from Unguarded Post Generation

**What goes wrong:** Each "Generate post" click calls Claude API. If prompts are verbose (800+ tokens of system context) and the operator clicks repeatedly, costs accumulate unexpectedly. Claude Sonnet at $3/MTok input means a 1000-token prompt = $0.003/call — manageable individually but painful if called 500 times/month with no guardrails.

**Why it happens:** Developers prototype with large system prompts and never optimize. No per-call cost display means the operator has no feedback on usage.

**Consequences:** Unexpected API bill. At very high usage, hitting rate limits (Anthropic Tier 1 limits apply to new accounts).

**Prevention:**
- Keep system prompt under 500 tokens. Use `config.yaml` trust signals and brand data as the source — not a full blog article dump.
- Cache generated drafts in PostgreSQL — never regenerate what's already been generated.
- Add a simple generation counter in the UI ("X posts generated this month").
- Implement a soft limit: warn after 50 generations/month, hard stop at 100 (configurable in settings).
- Use `claude-haiku-3-5` for draft generation (cheapest), `claude-sonnet` only for final polish if needed.

**Detection:** Log every API call with token count and estimated cost to the DB. Surface monthly cost in the dashboard settings page.

**Phase:** Cost guardrails in Phase 2 (AI generation feature). Model selection decision in Phase 1 (stack).

---

## Moderate Pitfalls

---

### Pitfall 6: YAML Seed Run Multiple Times, Duplicating Data

**What goes wrong:** The YAML import script runs on every deploy or restart, inserting duplicate posts, prospects, and comments. PostgreSQL does not deduplicate automatically.

**Why it happens:** Seed scripts are written without idempotency checks. "On first run only" logic is skipped to save time.

**Prevention:**
- Use `INSERT ... ON CONFLICT DO NOTHING` with a unique constraint on a natural key (e.g., `post_slug`, `prospect_fb_id`).
- Store a `seed_completed_at` timestamp in a `meta` table. Skip seed if already set.
- Run seed script manually once via CLI, not on every app start.

**Phase:** Address in Phase 1 (database schema and migration).

---

### Pitfall 7: Single Password Auth — Credential Exposed in Client-Side Code

**What goes wrong:** The hardcoded password is compared in client-side JavaScript, or the session secret is committed to git.

**Why it happens:** "Single user, internal tool" triggers a shortcut mentality. Developer skips standard server-side auth.

**Prevention:**
- Always compare passwords server-side only (Express route, never client JS).
- Hash the stored password with bcrypt even for a single user — never store plaintext in `.env` or DB.
- Set `SESSION_SECRET` as a Render environment variable, never in code.
- Set cookie flags: `httpOnly: true`, `secure: true` (HTTPS only), `sameSite: 'strict'`.
- Add basic brute-force protection: lock after 10 failed attempts per IP per hour.

**Phase:** Phase 1 (auth foundation). Get this right from the start — retrofitting auth is painful.

---

### Pitfall 8: Facebook Rate Limits Hit During Metrics Sync

**What goes wrong:** Pulling post metrics, comments, and insights for multiple posts in rapid succession hits the Business Use Case (BUC) rate limit. The API returns error code 32 or 613. The app crashes or enters a retry loop.

**Why it happens:** Naive implementation calls the API once per post in a loop without delay or batching.

**Prevention:**
- Use Facebook's Batch API to combine up to 50 requests into one HTTP call.
- Check `X-Business-Use-Case-Usage` header on every response. If >80% consumed, back off.
- Never auto-retry on rate limit errors without an exponential backoff + `Retry-After` header check.
- Cache metrics in PostgreSQL. Sync at most once per hour, not on every dashboard load.

**Detection:** Monitor for error codes 32, 613 in API responses. Log all FB API calls with response code.

**Phase:** Phase 3 (Facebook metrics integration).

---

## Minor Pitfalls

---

### Pitfall 9: PostgreSQL Connection Pool Exhaustion on Render

**What goes wrong:** Render's smallest PostgreSQL tier has a connection limit (typically 25 for Starter). Node.js without a connection pool (using `pg` directly) opens a new connection per request, exhausting the limit under load.

**Prevention:** Always use `pg.Pool` with `max: 10`. Never use `pg.Client` per-request in production.

**Phase:** Phase 1 (database setup).

---

### Pitfall 10: Drag-and-Drop Calendar Loses Data on Page Refresh Without Auto-Save

**What goes wrong:** User drags a post to a new date slot. The UI updates but the PATCH request fails silently or is never made. Refresh = lost scheduling change.

**Prevention:** Optimistic UI updates + confirmed server persistence. Disable drag-and-drop while the save is in flight. Show a toast on failure. Never treat a successful UI animation as a successful save.

**Phase:** Phase 3 (content calendar UI).

---

### Pitfall 11: YAML Files Modified After Seeding, Creating State Divergence

**What goes wrong:** `.social-engine/data/*.yaml` files are edited directly after the DB is seeded. DB and YAML are now out of sync. Future developers don't know which is authoritative.

**Prevention:** After seeding, mark YAML files as "archived source — DB is authoritative." Add a README comment in each YAML file. Remove write access from the engine workflow once the dashboard is live.

**Phase:** Phase 1 (migration strategy). Document the handoff explicitly.

---

## Phase-Specific Warning Summary

| Phase | Topic | Key Pitfall | Mitigation |
|-------|-------|-------------|------------|
| 1 | Infrastructure | Render free DB deleted in 30 days | Budget Starter tier ($7/mo) or use Supabase |
| 1 | Infrastructure | Cold starts on free web service | Keep-alive ping or Starter tier |
| 1 | Auth | Password compared client-side | Server-side bcrypt, env vars for secrets |
| 1 | DB Schema | Duplicate seeding | Idempotent seed with unique constraints |
| 1 | DB | Connection pool exhaustion | Use `pg.Pool`, max 10 |
| 2 | Facebook setup | App Review blocking API access | Start review early, build clipboard fallback first |
| 2 | Facebook setup | Token expiry breaks posting silently | Page token + health check UI |
| 2 | AI generation | Runaway Claude API costs | Token limit guardrails, response caching |
| 3 | Facebook metrics | Rate limit crashes | Batch API, BUC header monitoring, hourly cache |
| 3 | Calendar UI | Drag-drop data loss | Confirmed server persistence before UI update |

---

## Sources

- [Meta Graph API Rate Limiting — Official Docs](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/) — HIGH confidence
- [Meta App Review Process — Official Docs](https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review) — HIGH confidence
- [Meta Access Token Guide — Official Docs](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/) — HIGH confidence
- [Render Free PostgreSQL 30-Day Expiry — Official Changelog](https://render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90) — HIGH confidence
- [Render Free Tier Limits 2025](https://www.freetiers.com/directory/render) — MEDIUM confidence
- [Express Security Best Practices — Official Docs](https://expressjs.com/en/advanced/best-practice-security.html) — HIGH confidence
- [Claude API Rate Limits — Official Docs](https://platform.claude.com/docs/en/api/rate-limits) — HIGH confidence
- [Why Meta Graph API approval is hard — Substack analysis](https://graphapi.substack.com/p/why-it-is-so-damn-hard-to-get-approved) — MEDIUM confidence (community source)
- [Node.js DB migration pitfalls — InfiniteJS](https://infinitejs.com/posts/mastering-db-migrations-nodejs-mistakes/) — MEDIUM confidence
