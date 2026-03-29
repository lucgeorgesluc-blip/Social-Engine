# Deployment & Security Research: Node.js on Render.com

**Project:** SEO Engine — magnetiseuse-lacoste-corinne.fr
**Researched:** 2026-03-29
**Confidence note:** WebSearch and WebFetch were unavailable in this session.
All findings are from training data (cutoff August 2025) + official Render docs
structure knowledge. Mark items tagged [VERIFY] for a manual check at
https://docs.render.com before implementation.

---

## 1. render.yaml — Web Service + Cron Job in the Same Repo

**Confidence: HIGH** — render.yaml IaC is a core, stable Render feature.

Render supports multiple services defined in a single `render.yaml` at the repo
root. The platform detects it on first deploy and prompts you to create all
services at once ("Blueprint" deploy). Each service is independent: separate
process, separate log, separate restart policy.

### Key fields

| Field | Web service | Cron job |
|-------|-------------|----------|
| `type` | `web` | `cron` |
| `schedule` | — | cron expression (UTC) |
| `startCommand` | `node src/server.js` | `node src/cron.js` |
| `plan` | `free` / `starter` / etc. | `starter` (free tier also available) |
| `envVars` | reference env group | reference same env group |

### render.yaml example

```yaml
services:
  - type: web
    name: seo-dashboard
    runtime: node
    plan: starter          # $7/month — stays alive, no cold starts
    region: frankfurt      # closest to France
    branch: main
    buildCommand: npm ci
    startCommand: node src/server.js
    healthCheckPath: /health
    envVarGroups:
      - seo-engine-secrets
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000        # Render injects PORT automatically; this is a safe fallback

  - type: cron
    name: seo-daily-cron
    runtime: node
    plan: starter
    region: frankfurt
    branch: main
    buildCommand: npm ci
    schedule: "0 6 * * *"   # 06:00 UTC = 08:00 Paris (summer), 07:00 (winter)
    startCommand: node src/cron.js
    envVarGroups:
      - seo-engine-secrets
    envVars:
      - key: NODE_ENV
        value: production
```

### Notes on cron timing

- Schedule is always **UTC**. France is UTC+1 (winter) / UTC+2 (summer).
  For a "morning run at 08:00 Paris time year-round" you need two options:
  - `"0 6 * * *"` — correct in summer (CEST, UTC+2), 1h early in winter
  - `"0 7 * * *"` — correct in winter (CET, UTC+1), 1h late in summer
  - Simpler: pick `"0 7 * * *"` (07:00 UTC = 08:00 winter, 09:00 summer) and
    accept the shift. Render does not support timezone-aware cron natively.
    [VERIFY: Render may have added timezone support after mid-2025]

- Cron jobs on Render are **one-shot processes**: Render spins up a container,
  runs the command to completion, then destroys it. The container does not stay
  alive between runs. This means:
  - No persistent in-memory state between runs (use a file or DB).
  - Cold start time (~20-40s) is included in the run window.
  - Max run time is 1 hour on free, no documented hard limit on paid [VERIFY].

---

## 2. Environment Variables — Best Practices

**Confidence: HIGH**

### Two mechanisms on Render

1. **Environment Variables** (key=value, single line)
   Set in the Render dashboard under a service's "Environment" tab, or via an
   "Environment Group" shared across services. Values are encrypted at rest and
   injected as `process.env.KEY` at runtime. Never appear in build logs.

2. **Secret Files** (arbitrary file content, multi-line)
   Set under "Secret Files" tab. Render writes the content to a path you choose
   inside the container (e.g., `/etc/secrets/gsc-service-account.json`).
   Accessible as a regular file at runtime.

### Which to use for what

| Secret | Mechanism | Reason |
|--------|-----------|--------|
| SFTP password | Env var | Single string |
| Anthropic API key | Env var | Single string |
| Telegram bot token | Env var | Single string |
| Google AI key | Env var | Single string |
| DataForSEO user | Env var | Single string |
| DataForSEO password | Env var | Single string |
| GSC Service Account JSON | **Secret File** | Multi-line JSON — env vars truncate or break on newlines |

### Environment Groups

Create a named group (e.g., `seo-engine-secrets`) in the Render dashboard and
attach it to both the web service and the cron job. This way you only manage
secrets in one place. Changes to the group trigger a redeploy of all attached
services.

Path: Dashboard → [Team] → "Env Groups" → New Group.

---

## 3. Google Service Account JSON on Render

**Confidence: HIGH**

The GSC service account key is a multi-line JSON file (~2KB). Storing it as a
plain env var is unreliable because:
- JSON contains newlines that break shell parsing
- Some deployment UIs silently truncate long values
- Base64 encoding works but adds complexity

### Recommended approach: Secret File

1. In Render dashboard → your service → "Secret Files" → Add Secret File
2. **Filename:** `/etc/secrets/gsc-service-account.json`
3. **Contents:** paste the raw JSON from the `.json` file downloaded from
   Google Cloud Console

In your Node.js code, read it with:

```js
const fs = require('fs');

// Production: read from Render secret file
// Development: read from local path (see .env section below)
const keyPath = process.env.GSC_KEY_PATH || '/etc/secrets/gsc-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
```

Add to your `.env.local` (never committed):
```
GSC_KEY_PATH=./secrets/gsc-service-account.json
```

Keep `./secrets/` in `.gitignore`.

### Alternative: base64 env var (if Secret Files unavailable on your plan)

```bash
# Encode locally
base64 -w 0 service-account.json   # Linux
base64 -i service-account.json     # macOS
```

Store the output as env var `GSC_KEY_BASE64`. Decode at runtime:

```js
const keyJson = Buffer.from(process.env.GSC_KEY_BASE64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(keyJson);
```

**Prefer Secret Files** — they're cleaner and Render documents them as the
intended solution for this use case.

---

## 4. Anthropic API Spend Protection

**Confidence: MEDIUM** — Anthropic added usage controls in 2024; exact UI paths
may have changed. Verify at https://console.anthropic.com

### What Anthropic offers (as of mid-2025)

- **Monthly spend limits** — Set in the Anthropic Console under
  "Plans & Billing" → "Usage Limits". You can set a hard monthly dollar cap.
  When reached, API calls return a 429 error (not silent failures).

- **Per-key limits** — Anthropic supports creating multiple API keys and
  assigning rate limits per key (tokens/minute, requests/minute). Create a
  dedicated key for this project with conservative limits.

- **Usage dashboard** — Console shows spending by model, by key, by day.

### Recommended configuration

```
Monthly hard cap:    $20   (enough for daily blog ops, alerts before runaway)
Per-minute tokens:   50k   (sufficient for sequential daily cron, not burst)
```

### Code-level protection (belt-and-suspenders)

```js
// In your cron job — cap total API calls per run
const MAX_ANTHROPIC_CALLS_PER_RUN = 10;
let callCount = 0;

async function safeAnthropicCall(params) {
  if (callCount >= MAX_ANTHROPIC_CALLS_PER_RUN) {
    throw new Error('Anthropic call limit for this run exceeded');
  }
  callCount++;
  return anthropic.messages.create(params);
}
```

---

## 5. Dashboard Security — Protecting the Web Service

**Confidence: HIGH** for the patterns; specific Express middleware is stable.

### Option A: HTTP Basic Auth (simplest, good enough)

Use the `express-basic-auth` package. One dependency, no session storage needed.

```bash
npm install express-basic-auth
```

```js
const basicAuth = require('express-basic-auth');

app.use(basicAuth({
  users: { [process.env.DASHBOARD_USER]: process.env.DASHBOARD_PASSWORD },
  challenge: true,   // sends WWW-Authenticate header → browser shows login dialog
  realm: 'SEO Dashboard'
}));
```

Set `DASHBOARD_USER` and `DASHBOARD_PASSWORD` as env vars on Render.
Choose a password of 20+ random characters.

**Pros:** Zero infrastructure, works in every browser, no cookies.
**Cons:** Credentials travel in every request (base64, not encrypted — but
HTTPS on Render means the transport is encrypted). Not suitable for multi-user.

### Option B: IP Allowlist via Render (no code needed)

Render supports IP allowlists at the platform level for paid plans.
Configure under: Service → "Access Control" → "IP Allow List".
Only requests from your listed IPs reach the service.

**Pros:** No code, no credentials to manage.
**Cons:** Breaks if your home IP changes (dynamic IP). Not viable if you need
access from multiple locations.

### Option C: Simple token in URL (acceptable for internal tools)

```js
app.use((req, res, next) => {
  const token = req.query.token || req.headers['x-dashboard-token'];
  if (token !== process.env.DASHBOARD_SECRET_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  next();
});
```

Access URL: `https://seo-dashboard.onrender.com/?token=yourtoken`

**Recommendation: Use Option A (Basic Auth)** — it's the right balance of
security and simplicity for a single-user internal dashboard. Combine with
a strong password stored only in Render env vars.

### Additional: HTTPS

Render provides free TLS for all services automatically. No configuration
needed. Your dashboard is HTTPS by default at `your-service.onrender.com`.

---

## 6. .env File Structure

### Local dev: `.env` (never committed)

```dotenv
# ─── Server ────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ─── Dashboard auth ────────────────────────────────────────────
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=change-me-local-dev-only

# ─── SFTP ──────────────────────────────────────────────────────
SFTP_HOST=home755449657.1and1-data.host
SFTP_PORT=22
SFTP_USER=u95030755
SFTP_PASSWORD=your-sftp-password-here

# ─── Anthropic ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ─── Telegram ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=your-chat-id

# ─── Google AI ─────────────────────────────────────────────────
GOOGLE_AI_KEY=AIza...

# ─── DataForSEO ────────────────────────────────────────────────
DATAFORSEO_LOGIN=your-login@example.com
DATAFORSEO_PASSWORD=your-dataforseo-password

# ─── Google Search Console ─────────────────────────────────────
# Path to local copy of the service account JSON key
GSC_KEY_PATH=./secrets/gsc-service-account.json
# OR: if using base64 encoding
# GSC_KEY_BASE64=<base64-encoded-json>

# ─── Site config ───────────────────────────────────────────────
SITE_URL=https://www.magnetiseuse-lacoste-corinne.fr
```

### Production (Render dashboard — no .env file)

All of the above as individual env vars, except:
- `GSC_KEY_PATH` → not needed (secret file is at `/etc/secrets/gsc-service-account.json`)
- `NODE_ENV=production`
- `PORT` is auto-injected by Render (your app must use `process.env.PORT`)

### .gitignore additions

```gitignore
# Environment
.env
.env.local
.env.*.local

# Local secrets
secrets/
*.json.key
*service-account*.json
```

---

## 7. ImageMagick on Render

**Confidence: MEDIUM** — Render's native Node.js environment does include
standard Ubuntu packages, but availability of specific tools varies by plan
and runtime. [VERIFY with Render support or docs before relying on this.]

### What Render provides

Render's Node.js runtime runs on Ubuntu. The build environment includes common
system packages. **ImageMagick is NOT pre-installed** in the default Node.js
environment.

### Solution A: Install via build script (recommended)

Add to your `render.yaml` `buildCommand`:

```yaml
buildCommand: apt-get install -y imagemagick && npm ci
```

**However**, `apt-get` requires root access, which is available during the
build phase on Render but NOT at runtime. This is the correct hook.

Test locally with:
```bash
which convert   # should return /usr/bin/convert if ImageMagick installed
convert --version
```

### Solution B: Use a sharp-based alternative (pure Node.js)

If ImageMagick is only used for image resizing/format conversion, replace it
with `sharp` (native Node.js, no system dependency):

```bash
npm install sharp
```

`sharp` is self-contained (uses libvips bundled as a native addon). It works
on Render without any system package installation. For the typical use case
(resize, convert to WebP), `sharp` is faster than ImageMagick.

**Recommendation: Use `sharp` instead of ImageMagick** if possible. It
eliminates the system dependency entirely and is the standard choice for
Node.js image processing. Only use ImageMagick if you need features that
`sharp` cannot provide.

### If you must use ImageMagick

```yaml
# render.yaml
services:
  - type: web
    name: seo-dashboard
    runtime: node
    buildCommand: apt-get install -y imagemagick && npm ci
    startCommand: node src/server.js
    # ... rest of config
```

Verify in your build logs that `imagemagick` installs successfully.

---

## 8. package.json Scripts

```json
{
  "name": "seo-engine",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "start:dev": "nodemon src/server.js",
    "cron": "node src/cron.js",
    "cron:dry": "DRY_RUN=true node src/cron.js",
    "dev": "concurrently \"npm run start:dev\" \"npm run cron:dry\"",
    "build": "echo 'No build step for plain Node.js'",
    "lint": "eslint src/",
    "test": "jest"
  }
}
```

**Script explanations:**

| Script | Purpose | When used |
|--------|---------|-----------|
| `npm start` | Launches Express dashboard | Render web service startCommand |
| `npm run cron` | Runs daily job once and exits | Render cron startCommand |
| `npm run cron:dry` | Cron without side effects | Local testing |
| `npm run dev` | Both services locally | Local development |

**Render config mapping:**
```yaml
# Web service
startCommand: npm start

# Cron service
startCommand: npm run cron
```

Both use `npm ci` as buildCommand (faster than `npm install`, uses lockfile).

---

## Key Findings Summary

1. **render.yaml supports both service types natively.** Define `type: web` and
   `type: cron` in the same file. Use an Environment Group to share all secrets
   between them without duplication.

2. **GSC Service Account JSON must be a Secret File, not an env var.** Multi-line
   JSON breaks as an env var. Mount it at `/etc/secrets/gsc-service-account.json`.

3. **Anthropic spend caps exist and should be set.** Use the Console to set a
   monthly hard cap ($20 recommended) and per-key rate limits. Also add a
   call-count guard in the cron code itself.

4. **Basic Auth is the right dashboard security choice.** `express-basic-auth`
   is one package, zero infrastructure, works with Render's automatic HTTPS.

5. **Avoid ImageMagick if possible — use `sharp` instead.** `sharp` is a
   pure Node.js package that avoids the system dependency problem entirely.
   If ImageMagick is required, install via `apt-get install -y imagemagick`
   in the `buildCommand`.

6. **Cron schedule is UTC.** For Paris morning runs, `"0 7 * * *"` (07:00 UTC)
   gives 08:00 in winter and 09:00 in summer — acceptable drift.

7. **Free tier caveats.** Render's free web service spins down after 15 minutes
   of inactivity (cold starts ~30s). For an internal dashboard this is acceptable.
   The `starter` plan ($7/month) stays always-on. Cron jobs run on their own
   container and are not affected by the web service sleep state.

---

## Gotchas

| Gotcha | Detail | Mitigation |
|--------|--------|------------|
| PORT must come from env | Render injects `PORT` dynamically — hardcoding 3000 breaks health checks | `const PORT = process.env.PORT \|\| 3000` |
| Cron timezone is UTC | No TZ support in Render cron natively | Add note in schedule comment, accept small seasonal drift |
| Free tier sleeps | Web service on free plan goes cold after 15min inactivity | Use `starter` plan for dashboard |
| Secret file not in render.yaml | Secret files cannot be defined in render.yaml (IaC) — they must be set manually in the dashboard [VERIFY] | Document as manual post-deploy step |
| `npm ci` requires lockfile | If `package-lock.json` is missing, `npm ci` fails | Commit `package-lock.json` to the repo |
| Build vs runtime apt-get | System packages installed in buildCommand are available at runtime for web services (same image). For cron jobs, the build image is shared. | Test the cron container separately if using apt-get |
| GSC API quota | GSC API has daily query limits (free tier: 200 queries/day for most endpoints) | Cache GSC responses locally; don't hit API on every cron run |
| Render cold start in cron | Each cron invocation is a fresh container — ~20-40s startup overhead | Factor into run time estimates; 1-hour daily job is well within limits |

---

## Items to Verify Manually

These items were not verifiable without web access. Check before implementation:

- [ ] `render.yaml` secret file syntax — confirm Secret Files cannot be defined
  in IaC vs must be set in dashboard:
  https://docs.render.com/secret-files

- [ ] Render cron max runtime limit on starter plan:
  https://docs.render.com/cronjobs

- [ ] Render native timezone support for cron (may have been added):
  https://docs.render.com/cronjobs#schedule

- [ ] Anthropic Console spend limits UI location:
  https://console.anthropic.com → Plans & Billing

- [ ] `apt-get` availability during Render build phase for Node.js runtime:
  https://docs.render.com/custom-build-and-start-commands

- [ ] Render IP allowlist feature availability on your plan tier:
  https://docs.render.com/firewall

---

## Sources

- Render Infrastructure as Code docs: https://docs.render.com/infrastructure-as-code
- Render Environment Variables: https://docs.render.com/environment-variables
- Render Secret Files: https://docs.render.com/secret-files
- Render Cron Jobs: https://docs.render.com/cronjobs
- Render Custom Build Commands: https://docs.render.com/custom-build-and-start-commands
- Render Firewall/IP Allowlist: https://docs.render.com/firewall
- Anthropic Console (spend limits): https://console.anthropic.com
- express-basic-auth npm: https://www.npmjs.com/package/express-basic-auth
- sharp npm: https://www.npmjs.com/package/sharp

*Note: All URLs are provided for manual verification. Web access was unavailable
during this research session.*
