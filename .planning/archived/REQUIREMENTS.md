# Requirements — Corinne SEO Autopilot

*Synthesized from 4 research agents + project scoping session — 2026-03-29*

---

## Tech Stack (Locked by Research)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js | Already in repo |
| Scheduler | Render cron service (render.yaml) | Render web service already set up |
| Article generation | `@anthropic-ai/sdk` — claude-sonnet-4-6 | Best quality/cost |
| Image generation | `@google/genai` v1.47.0 | Replaces deprecated @google/generative-ai |
| Image processing | `sharp` (Node.js native) | No system dependency |
| SFTP deploy | `ssh2-sftp-client` v12.1.1 | Only maintained Node.js SFTP client |
| Telegram bot | `telegraf` v4.16.3 | Avoids abandoned dependency |
| Dashboard charts | Chart.js v4 + chartjs-plugin-annotation | Ranking lines + article publish markers |
| Link tree | D3.js d3-hierarchy (tree layout) | Deterministic hierarchy |
| Dashboard frontend | Alpine.js 3 + Tailwind CSS 3 | Lightweight, no React needed |
| Dashboard auth | express-session + bcryptjs | Real login/logout |
| Real-time updates | SSE (Server-Sent Events) | Browser-native, no library needed |
| GSC auth | Google Service Account JSON (Render Secret File) | Official pattern |

---

## Functional Requirements

### F1 — Daily Article Pipeline

**F1.1 Context Loading**
- Load and trim at pipeline start:
  - `.seo-engine/config.yaml` — full
  - `.seo-engine/data/content-queue.yaml` — full
  - `.seo-engine/data/seo-keywords.csv` — full
  - `.seo-engine/data/content-map.yaml` — **slug + title pairs only** (full file is 53KB / 13K tokens)
  - `.seo-engine/data/features.yaml` — full
  - `.seo-engine/templates/tone-guide.md` — full
  - `.seo-engine/templates/blog-structures.yaml` — full
  - `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — full
  - `assets/js/config.js` — prices/contact section only
- Total lean context target: ≤12,000 tokens

**F1.2 Topic Selection**
- Pick highest-priority article with `status: planned` from content-queue.yaml
- Cannibalization check: scan content-map for overlapping primary keyword
- If overlap: skip, pick next in queue, log warning
- If DataForSEO available: fetch SERP data for primary keyword (`/v3/serp/google/organic/live/advanced`, `location_code: 1006483` for Troyes)

**F1.3 Article Generation**
- Call Claude API (claude-sonnet-4-6) with streaming
- Token count before call (free, ~200ms) — abort if context > 40K tokens
- System prompt structure:
  1. `<rules>` block: no hard prices (use `data-price="tabac"`), no rTMS, no hard-coded euros
  2. One-shot HTML example showing correct `data-price` pattern
  3. All context files
  4. Article instructions from `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md`
- `max_tokens: 10000`
- Write to disk incrementally via stream
- Estimated cost: $0.11–$0.14/article

**F1.4 Post-Generation Validation**
- Regex checks on generated HTML:
  - No `€` or hard-coded price numbers in price context
  - No `rTMS` mention (case-insensitive)
  - Has `data-price=` attribute
  - Has FAQPage schema with `"name"` fields
  - Has `data-blog-list="related"` block
  - Has `<link rel="canonical"` tag
- If validation fails: do NOT proceed, send Telegram error alert with details

**F1.5 Config & Sitemap Updates**
- Add article entry at HEAD of `SITE_CONFIG.blog` in `assets/js/config.js`
- Regenerate `assets/js/config.min.js` via terser
- Add URL to `sitemap.xml` (changefreq: monthly, priority: 0.6, today's date)
- Update `.seo-engine/data/content-map.yaml` — add new entry
- Update `.seo-engine/data/content-queue.yaml` — mark `status: drafted`
- Update `.seo-engine/logs/changelog.md`

**F1.6 Image Generation**
- Call `@google/genai` with topic-derived prompt
- Process with `sharp`: 800×450 WebP @q85
- Save to `assets/images/blog/[slug].webp`
- Fail gracefully: article continues without image (log warning, note in Telegram message)

**F1.7 Approval Gate**
- Send Telegram message with:
  - Article title, excerpt (first 200 chars), word count, internal link count, image status ✓/✗
  - Two inline buttons: `✅ Approuver et déployer` | `✏️ Modifier`
- Save pending state to `autopilot/state/pending.json`

**F1.7a Edit via Prompt (on ✏️ Modifier)**
- Bot replies: *"Qu'est-ce que vous voulez modifier ?"*
- User types free-form prompt: e.g. *"Ajoute plus de liens internes vers la page hypnose"* or *"Raccourcis l'introduction"*
- Pipeline reruns article generation with original context + user feedback appended
- Sends new preview with same Approve / Modify buttons
- Loop up to 3 times (after 3rd modify: alert and stop to prevent infinite loop)

**F1.8 SFTP Deploy (on ✅ Approval)**
- Deploy atomically:
  - `blog/[slug].html`
  - `assets/images/blog/[slug].webp` (if generated)
  - `assets/js/config.js`
  - `assets/js/config.min.js`
  - `sitemap.xml`
- On SFTP error: retry once, then Telegram alert, do NOT mark as deployed
- Mark `status: published` in content-queue.yaml + content-map.yaml

**F1.9 GSC Ping**
- Submit article URL to Google Search Console URL Inspection API for indexing
- Log result: submitted / already indexed / error

**F1.10 Spend Safeguard**
- `MAX_ARTICLES_PER_RUN = 1` — hardcoded, not overridable via env
- Log token count + estimated USD cost to `autopilot/logs/cost.jsonl` after every generation
- If API returns 529 (overloaded): skip, log, Telegram alert

---

### F2 — Dashboard

**F2.1 Article Queue (main view)**
- List all articles with: title, status badge, word count, internal links, image ✓/✗, date
- Status badges: `Published` (green) | `Pending Approval` (yellow) | `Drafted` (blue) | `Queued` (gray)
- Actions: `View` | `Approve & Deploy` (pending only) | `Discard` (pending only)
- Search bar
- Approval here also triggers the SFTP deploy pipeline (same as Telegram ✅)

**F2.2 Keyword Rankings**
- Line chart per keyword over time — data from GSC Search Analytics API
- Time selector: 7d / 30d / 90d
- Vertical annotation markers = article publish dates on the timeline
- Current rank + delta vs previous period per keyword
- Keywords from `.seo-engine/data/seo-keywords.csv` (priority ≥ 7)

**F2.3 Internal Link Tree (Maillage interne)**
- D3 d3.tree() hierarchy — arbre généalogique structure
- Built from content-map.yaml internal_links data
- Node types by color: Pillar (gold) | Service (blue) | Blog (cyan) | Orphan/0-inbound (red)
- Click node → highlight all inbound + outbound links
- Collapsible branches

**F2.4 Today's Pipeline Stepper**
- 6-step visual flow: Read Context → Pick Topic → Draft → Generate Image → Await Approval → Deploy
- Current step animated/highlighted; completed steps checked; failed steps red
- Updated via SSE push from server
- Shows last run timestamp + next scheduled run

**F2.5 Stats Row**
- Articles published (total) | Pending approval | Avg SEO score | Keywords in top 10

**F2.6 Activity Feed**
- Human-readable event sentences (not raw JSON logs)
- Examples: *"Article rédigé: auriculotherapie-arret-tabac (2 340 mots, 8 liens)"*
- Last 20 events, newest first, color-coded (green/yellow/red)

**F2.7 Auth**
- Login page with username + password (stored as env var hash)
- express-session + bcryptjs
- All routes protected (middleware before static files)
- Logout button

**F2.8 Pending Notification Indicator**
- Badge/dot in top nav when article pending approval
- Click → goes to queue view

---

### F3 — Security & Operations

**F3.1 Environment Variables**
```
# Render env vars (already set up)
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SFTP_HOST=home755449657.1and1-data.host
SFTP_PORT=22
SFTP_USER=u95030755
SFTP_PASSWORD=
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
GSC_SERVICE_ACCOUNT_PATH=/etc/secrets/gsc-service-account.json
DASHBOARD_USERNAME=
DASHBOARD_PASSWORD_HASH=
SESSION_SECRET=
PORT=3000
SITE_BASE_PATH=/path/to/site-cl   # absolute path to E:/Site CL on server
```

**F3.2 Render Setup (already done)**
- Web service running — add cron service via render.yaml
- GSC service account JSON → add as Render Secret File post-deploy
- `process.env.PORT` used throughout (Render injects dynamically)

**F3.3 Local Dev**
- `.env` in `.gitignore`
- `.env.example` committed (keys only, no values)

**F3.4 Spend Protection**
- `MAX_ARTICLES_PER_RUN = 1` hardcoded
- Cost log: `autopilot/logs/cost.jsonl`
- Set monthly cap in Anthropic Console (user action, documented in README)

---

## Out of Scope (v1)

- rTMS content anywhere — pipeline validator enforces
- Hard-coded prices in articles — validator enforces
- Auto-publish without approval — approval gate is permanent
- Multi-site support — single site only
- Email notifications — Telegram only
- Mobile app — responsive web dashboard only
- Full CMS-style article editor — editing is via Telegram prompt loop (F1.7a)

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| F1.1 — Context Loading | Phase 2 | Pending |
| F1.2 — Topic Selection | Phase 2 | Pending |
| F1.3 — Article Generation | Phase 2 | Pending |
| F1.4 — Post-Generation Validation | Phase 2 | Pending |
| F1.5 — Config & Sitemap Updates | Phase 2 | Pending |
| F1.6 — Image Generation | Phase 3 | Pending |
| F1.7 — Approval Gate | Phase 4 | Pending |
| F1.7a — Edit via Prompt | Phase 5 | Pending |
| F1.8 — SFTP Deploy | Phase 4 | Complete |
| F1.9 — GSC Ping | Phase 4 | Complete |
| F1.10 — Spend Safeguard | Phase 2 | Pending |
| F2.1 — Article Queue | Phase 6, Phase 7 | Pending |
| F2.2 — Keyword Rankings | Phase 6, Phase 7 | Pending |
| F2.3 — Internal Link Tree | Phase 6, Phase 7 | Pending |
| F2.4 — Pipeline Stepper | Phase 6, Phase 7 | Pending |
| F2.5 — Stats Row | Phase 6, Phase 7 | Pending |
| F2.6 — Activity Feed | Phase 6, Phase 7 | Partial (backend logger done, API route in Plan 02) |
| F2.7 — Auth | Phase 6, Phase 7 | Partial (middleware done, full route protection in Plan 02) |
| F2.8 — Pending Notification Indicator | Phase 6, Phase 7 | Pending |
| F3.1 — Environment Variables | Phase 1 | Pending |
| F3.2 — Render Setup | Phase 8 | Pending |
| F3.3 — Local Dev | Phase 1 | Pending |
| F3.4 — Spend Protection | Phase 1, Phase 2 | Pending |

---

---

## F4 — SEO Page Audit & Auto-Patch *(v1.48.0)*

### F4.1 Page Inventory (fix original bug)
- `buildPageInventory()` runs as **step 0** of every audit and suggestion pipeline — before any file is read, compared, or queried
- Scans all `.html` files under `SITE_BASE_PATH` (excludes `node_modules`, `backup`, `logs`)
- Normalises slugs: strips `.html` extension, strips `blog/` prefix → produces canonical slug map
- Exposes `pageExists(slug)` → `boolean` — any suggestion module MUST call this before proposing to create a page
- Output stored in `state/page-inventory.json` (slug → file path + last modified)

### F4.2 Signal Extractor
- For each HTML file in inventory, extracts:
  - Schema types present (all `@type` values from all JSON-LD blocks, full-file scan — not head-only)
  - JSON-LD validity (must `JSON.parse()` without error)
  - Word count of visible content (body text, excluding nav/header/footer/script/style), threshold ≥ 400
  - H1 text (first occurrence)
  - Meta description text + length
  - Canonical URL (presence + value)
  - FAQ item count (FAQPage schema mainEntity array length)
  - Review/testimonial signals (presence of review-text containers or AggregateRating in schema)
  - Internal links: in-count (pages linking to this slug) + out-count (links from this page to site pages)
- Uses `cheerio` for DOM parsing (never regex for structural HTML)
- Output per-page signals stored in `state/page-audit.json` (slug-keyed, includes `previousSignals` + `diff` vs last scan)

### F4.3 Page Scorer
- 100-point weighted health score per page:
  - Schema presence (LocalBusiness or HealthAndBeautyBusiness): 25 pts
  - Word count ≥ 400: 25 pts
  - FAQPage schema present: 15 pts
  - E-E-A-T signal (AggregateRating OR review container): 15 pts
  - Internal links in ≥ 1: 10 pts
  - Meta description 120–160 chars: 10 pts
- Severity tiers: 🟢 ≥80 (healthy), 🟡 50–79 (warning), 🔴 <50 (critical)
- Scores stored in `state/audit-results.json` alongside issues list

### F4.4 Cannibalization Detector
- First pass: pages sharing same `cluster_id` in `content-map.yaml` → flag as potential cannibalization pair
- Second pass: Jaccard similarity on stop-word-cleaned, accent-normalised H1 + title tokens
  - >0.85 = CRITICAL cannibalisation
  - 0.60–0.85 = MEDIUM (monitor)
- Uses French stop-word list (curated for this site's brand/geo tokens)
- Output: list of cannibalising pairs with similarity score + recommendation

### F4.5 Ranking Trigger
- Watches `state/live-rankings-history.json` via `fs.watch` + 150ms debounce (extends existing `safeWatch` pattern)
- Triggers audit when a tracked keyword drops ≥ 5 positions between two consecutive entries
- Identifies the affected slug via `seo-keywords.csv` keyword → blog slug mapping
- Stores trigger event in `state/audit-status.json` (running flag + last trigger reason)
- Manual trigger: `POST /api/audit/run` (dashboard button + on-demand)

### F4.6 Patch Generator
- Generates HTML patch for detected issues via Claude API (claude-sonnet-4-6)
- Auto-generatable patches (go to approval queue):
  - Missing LocalBusiness/HealthAndBeautyBusiness schema (data sourced from `config.js` — no hard-coded values)
  - Missing FAQPage schema (Claude generates Q&A from page content)
  - Missing canonical tag
- **Never-auto-apply list** (always routes to human review queue, never to approval flow):
  - `aggregateRating` values (ratingValue, reviewCount) — risk of Google manual action
  - Canonical URL changes (page already has a canonical)
  - Title / H1 text changes
  - `robots` meta tag changes
  - Any patch touching more than one file simultaneously
- Patch stored as `pendingPatch` field in `audit-results.json["pages"][slug]`

### F4.7 Patch Validator
- Pre-apply validation (reusable module, runs before local write AND as post-SFTP smoke test):
  1. HTML structure parseable by cheerio without errors
  2. All JSON-LD blocks in patched file pass `JSON.parse()`
  3. Canonical tag count = 1 (no duplicates introduced)
  4. No `x-data` attribute content modified (Alpine.js safety)
  5. Patch is idempotent — re-applying produces identical result (no duplicate schema injection)
  6. No new schema `@type` duplicates introduced
  7. Word count did not decrease (patch does not remove content)
  8. `data-price` pattern preserved (no hard-coded prices introduced)
- On validation failure: reject patch, log specific failed checks, alert via dashboard (not auto-deploy)

### F4.8 Apply Flow
- `POST /api/audit/:slug/apply` → reads `pendingPatch` from `audit-results.json`
- Runs F4.7 validator before any file write
- Creates backup at `state/backups/[slug]-[timestamp].html` before patching
- Applies patch via cheerio mutation → atomic write (`writeFileSync(tmp)` + `renameSync(tmp, htmlPath)`)
- Triggers SFTP deploy via existing `deploy-orchestrator.js` (reuses exact same flow as article approval)
- On success: clears `pendingPatch`, triggers re-scan (F4.2), updates `audit-results.json`
- On SFTP error: restores backup, logs, alerts via dashboard — does NOT leave patched local file deployed

### F4.9 Dashboard Audit Tab
- New "Audit SEO" tab in existing sidebar (between Rankings and Link Tree)
- Master grid view (when no page selected):
  - Card per page: slug, health score badge (🟢🟡🔴), top issue summary, "issues count" chip
  - "Chutes" alert section at top: pages that triggered a ranking drop event in last 7 days
  - Sort by: score asc (worst first, default) / score desc / alphabetical
  - "Run Audit" button → triggers `POST /api/audit/run`
  - Running state: spinner + "Audit en cours..." replaces button while `audit-status.json` running flag is true
- Drill-down panel (when page card clicked):
  - Full signal breakdown: each scored dimension with ✅/⚠️/❌ + value
  - Issues list with severity + explanation (e.g. "Schema LocalBusiness absent — présent sur magnetiseur-troyes.html")
  - Pending patch preview (HTML diff-style view, syntax-highlighted)
  - Approve / Reject patch buttons (same pattern as article approval)
  - Cannibalization warning if detected (links to the competing page)
- SSE updates: audit tab refreshes in real-time when audit run completes (extends existing `/api/events` stream)
- Stats row `avgSeoScore` field populated from `audit-results.json` (field already exists in `index.html` line ~208)

---

## Traceability Matrix (v1.48.0 additions)

| Requirement | Phase | Status |
|-------------|-------|--------|
| F4.1 — Page Inventory | Phase 9 | Planned |
| F4.2 — Signal Extractor | Phase 9 | Planned |
| F4.3 — Page Scorer | Phase 9 | Planned |
| F4.4 — Cannibalisation Detector | Phase 10 | Planned |
| F4.5 — Ranking Trigger | Phase 10 | Planned |
| F4.6 — Patch Generator | Phase 11 | Planned |
| F4.7 — Patch Validator | Phase 11 | Planned |
| F4.8 — Apply Flow | Phase 11 | Planned |
| F4.9 — Dashboard Audit Tab | Phase 12 | Planned |

---

*Generated: 2026-03-29 — Traceability added after roadmap creation*
*Updated: 2026-04-01 — v1.48.0 SEO Audit requirements added*
