# Phase 1: Foundation & Scaffolding - Research

**Researched:** 2026-03-29
**Domain:** Node.js project scaffolding, Express skeleton, YAML/JS config loading, Gemini model verification
**Confidence:** HIGH

## Summary

Phase 1 creates the `autopilot/` directory with a working Node.js project: all dependencies installed, an Express health-check server, a config loader that reads `.seo-engine/` files and `assets/js/config.js`, a `.env.example` with all required keys, and a verified Gemini model name for image generation.

The project uses ESM (`"type": "module"`) since key dependencies (`p-retry` v8, `pino` v10) are ESM-only. Node.js v22.17.1 (already installed) has full ESM support. The config loader needs `js-yaml` to parse YAML files -- this is an additional dependency not listed in the phase spec but required by the config loader.

**Primary recommendation:** Create `autopilot/` as a self-contained Node.js project with its own `package.json`, install all listed packages plus `js-yaml`, wire a minimal Express server with `/health`, and build a `config/loader.js` that reads the 3 target files synchronously at call time.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Flat `src/` layout -- `pipeline.js`, `server.js`, `config.js`, `deploy.js`, `validator.js` at same level. No nested domain folders.
- **D-02:** `public/` for dashboard frontend, `state/` for pending.json, `logs/` for cost.jsonl.
- **D-03:** Read `.seo-engine/` files fresh from disk every pipeline run. No caching, no file-watch. Simple and always current.
- **D-04:** Trim `content-map.yaml` to slug+title pairs only (drop 53KB to ~2K tokens). All other files loaded in full.
- **D-05:** Config loader reads relative to `SITE_BASE_PATH` env var (points to `E:/Site CL` locally, absolute path on Render).
- **D-06:** `npm run dev` starts Express server with `--dry-run` flag available.
- **D-07:** `--dry-run` skips SFTP deploy and sends Telegram to test chat. Pipeline runs but doesn't publish.
- **D-08:** `npm run pipeline` for running pipeline without server (cron simulation).
- **D-09:** Use `process.env.PORT || 3000` (required by Render).
- **D-10:** Health check on `GET /health` returning 200 -- Render monitors this.

### Claude's Discretion
- Package.json scripts naming
- ESM vs CJS module format
- Linting/formatting setup (if any)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F3.1 | Environment Variables -- all keys listed in `.env.example` | Full key list documented in REQUIREMENTS.md; `.env.example` template ready below |
| F3.2 | Render Setup -- `process.env.PORT` used throughout | D-09 locks this; Express skeleton uses `process.env.PORT \|\| 3000` |
| F3.3 | Local Dev -- `.env` in `.gitignore`, `.env.example` committed | Standard dotenv pattern; `.gitignore` additions documented below |
| F3.4 | Spend Protection -- `MAX_ARTICLES_PER_RUN = 1` hardcoded, cost log path | Constant in config, `autopilot/logs/cost.jsonl` path per D-02 |
</phase_requirements>

## Standard Stack

### Core (Phase 1 installs all; only a subset is wired in Phase 1)

| Library | Version | Purpose | Wired in Phase 1? |
|---------|---------|---------|---------------------|
| `express` | 5.2.1 | Dashboard web server | YES -- health check |
| `express-session` | 1.19.0 | Dashboard auth sessions | NO -- install only |
| `bcryptjs` | 3.0.3 | Password hashing | NO -- install only |
| `@anthropic-ai/sdk` | 0.80.0 | Claude API | NO -- install only |
| `@google/genai` | 1.47.0 | Gemini image generation | NO -- install only |
| `sharp` | 0.34.5 | Image processing (WebP) | NO -- install only |
| `ssh2-sftp-client` | 12.1.1 | SFTP deploy | NO -- install only |
| `telegraf` | 4.16.3 | Telegram bot | NO -- install only |
| `googleapis` | 171.4.0 | GSC API | NO -- install only |
| `p-retry` | 8.0.0 | Retry wrapper (ESM-only) | NO -- install only |
| `dotenv` | 17.3.1 | Env loading | YES -- server startup |
| `pino` | 10.3.1 | Structured logging | YES -- server logging |
| `js-yaml` | 4.1.1 | YAML parsing | YES -- config loader |

All versions verified against npm registry on 2026-03-29.

### Supporting (not in spec but required)

| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| `js-yaml` | 4.1.1 | Parse `.seo-engine/config.yaml` and `content-map.yaml` | Node.js has no native YAML parser; config loader MUST parse YAML |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `js-yaml` | `yaml` v2.8.3 | `yaml` is newer, supports YAML 1.2, heavier. `js-yaml` is lighter, YAML 1.1, well-established. Either works. |

**Installation:**
```bash
cd autopilot
npm init -y
npm install express express-session bcryptjs @anthropic-ai/sdk @google/genai sharp ssh2-sftp-client telegraf googleapis p-retry dotenv pino js-yaml
```

**Note on Express 5:** npm shows `express@5.2.1` as latest. Express 5 is the current stable release. Key differences from Express 4: `app.listen()` returns a Promise, async error handling built in (no need for `express-async-errors`), `req.query` is a getter. All patterns documented below use Express 5 API.

## Architecture Patterns

### Recommended Project Structure (per D-01, D-02)

```
autopilot/
  package.json          # "type": "module", all dependencies
  .env.example          # All key names, no values
  server.js             # Express skeleton (Phase 1 entry point)
  config/
    loader.js           # Reads .seo-engine/ + config.js
    constants.js        # MAX_ARTICLES_PER_RUN = 1, other constants
  public/               # Dashboard frontend (empty in Phase 1)
  state/                # pending.json (empty in Phase 1)
  logs/                 # cost.jsonl (empty in Phase 1)
```

**Why `config/` subfolder for loader:** D-01 says flat layout for pipeline files (`pipeline.js`, `server.js`, etc.). The config loader is infrastructure, not a pipeline step -- keeping it in `config/` avoids clutter and matches D-05 (config loading is its own concern).

### Pattern 1: ESM Module Format

**What:** Use `"type": "module"` in package.json.
**Why:** `p-retry` v8 and `pino` v10 are ESM-only. Node.js v22 has full ESM support. No reason to use CJS.
**Impact:** All files use `import`/`export`, not `require()`. File extensions in imports are optional with Node.js v22 but recommended for clarity.

```javascript
// server.js
import express from 'express';
import { config } from 'dotenv';
import pino from 'pino';

config(); // loads .env

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Autopilot server started');
});
```

### Pattern 2: Config Loader (D-03, D-04, D-05)

**What:** Synchronous file reads relative to `SITE_BASE_PATH` env var. Trim content-map.yaml to slug+title pairs.
**When to use:** Called at pipeline start (every run) and server start (for dashboard data).

```javascript
// config/loader.js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function loadSiteConfig() {
  const basePath = process.env.SITE_BASE_PATH;
  if (!basePath) throw new Error('SITE_BASE_PATH env var is required');

  // 1. .seo-engine/config.yaml -- full
  const seoConfig = yaml.load(
    readFileSync(join(basePath, '.seo-engine', 'config.yaml'), 'utf8')
  );

  // 2. assets/js/config.js -- pricing section only
  const configJsRaw = readFileSync(join(basePath, 'assets', 'js', 'config.js'), 'utf8');
  // Extract pricing block (from "pricing: {" to the next top-level key)
  const pricingMatch = configJsRaw.match(/pricing:\s*\{[\s\S]*?\n    \}/);
  const pricingSection = pricingMatch ? pricingMatch[0] : configJsRaw.slice(0, 2000);

  // 3. content-map.yaml -- slug+title pairs ONLY (D-04)
  const contentMapRaw = yaml.load(
    readFileSync(join(basePath, '.seo-engine', 'data', 'content-map.yaml'), 'utf8')
  );
  const contentMapTrimmed = (contentMapRaw?.blogs || []).map(b => ({
    slug: b.slug,
    title: b.title
  }));

  return { seoConfig, pricingSection, contentMapTrimmed };
}
```

**Key detail on config.js parsing:** `config.js` is a JavaScript file, not JSON. The pricing section extraction uses a regex match. This is intentionally simple -- a full JS parser is overkill for extracting a known section. The regex targets the `pricing: {` block which ends at the first `}` at 4-space indentation.

### Pattern 3: Constants File

```javascript
// config/constants.js
export const MAX_ARTICLES_PER_RUN = 1; // F3.4 -- hardcoded, NOT from env
export const COST_LOG_PATH = 'logs/cost.jsonl';
```

### Anti-Patterns to Avoid
- **Caching config files in memory across requests:** D-03 says fresh read every pipeline run. Do not memoize.
- **Using `require()` with ESM packages:** `p-retry` v8 and `pino` v10 will throw `ERR_REQUIRE_ESM`. Must use `import`.
- **Hardcoding `E:/Site CL` anywhere:** Always use `SITE_BASE_PATH` env var (D-05). The path differs between local Windows and Render Linux.
- **Using `path.join` with backslashes:** On Windows, `path.join` produces backslashes. For SFTP remote paths (Linux), always use forward slashes explicitly. For local file reads, `path.join` is fine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom parser | `js-yaml` v4.1.1 | YAML spec is complex; edge cases in quotes, anchors, multiline strings |
| Env var loading | Manual `.env` reader | `dotenv` v17.3.1 | Handles comments, multiline, encoding edge cases |
| Structured logging | `console.log` JSON wrapper | `pino` v10.3.1 | Fast, structured, log levels, child loggers for pipeline steps |
| Config.js pricing extraction | Full JS parser (acorn) | Regex extraction | Config.js has a known stable format; regex is sufficient and zero-dependency |

## Common Pitfalls

### Pitfall 1: sharp Installation on Windows
**What goes wrong:** `sharp` downloads prebuilt native binaries. On Windows with restricted permissions or corporate proxy, the download can fail silently.
**Why it happens:** `sharp` uses `prebuild-install` which downloads platform-specific `.node` binaries from GitHub releases.
**How to avoid:** Run `npm install` with network access. If behind a proxy, set `npm config set proxy`. Verify after install: `node -e "import('sharp').then(s => console.log('sharp OK'))"`.
**Warning signs:** `npm install` shows warnings about `sharp` but completes. Import fails at runtime.

### Pitfall 2: ESM + __dirname is Undefined
**What goes wrong:** `__dirname` and `__filename` are not available in ESM modules.
**Why it happens:** ESM uses `import.meta.url` instead.
**How to avoid:** Use this pattern:
```javascript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```
**Warning signs:** `ReferenceError: __dirname is not defined`.

### Pitfall 3: Config Loader Path Resolution on Render vs Local
**What goes wrong:** `SITE_BASE_PATH` is `E:/Site CL` locally but something like `/opt/render/project/src` on Render. Paths with spaces or Windows drive letters break if hardcoded.
**Why it happens:** Different OS, different filesystem layout.
**How to avoid:** Always use `path.join(process.env.SITE_BASE_PATH, ...)`. Never concatenate strings for paths. Test with a path containing spaces.

### Pitfall 4: content-map.yaml Trimming Misses Nested Structure
**What goes wrong:** The YAML file has `blogs:` as a top-level key containing an array. If the structure changes (e.g., `pages:` added), the loader silently returns empty.
**Why it happens:** Hard-coded `contentMapRaw.blogs` path.
**How to avoid:** Add a guard: `if (!contentMapRaw?.blogs) throw new Error('content-map.yaml missing blogs key')`.

### Pitfall 5: Express 5 Breaking Changes from Express 4
**What goes wrong:** Express 5 is the current latest on npm (5.2.1). If using Express 4 patterns from tutorials, some may break.
**Key differences:**
- `app.listen()` returns a Promise in Express 5 (can be awaited)
- Rejected promises in route handlers are automatically caught (no `express-async-errors` needed)
- `req.host` returns the full host including port
- `app.del()` removed (use `app.delete()`)
**How to avoid:** For the Phase 1 health-check skeleton, none of these differences matter. Just be aware for later phases.

### Pitfall 6: Gemini Model Name Verification Requires API Key
**What goes wrong:** The `curl` test to list models requires a valid `GOOGLE_AI_API_KEY`. If the key doesn't exist yet or has no permissions, the test fails.
**How to avoid:** Ensure the API key is created in Google AI Studio (https://aistudio.google.com/apikey) before running the verification curl. The models list endpoint is free and doesn't consume quota.

## Code Examples

### Express Health Check Server (Phase 1 entry point)

```javascript
// autopilot/server.js
import express from 'express';
import { config } from 'dotenv';
import pino from 'pino';

config(); // Load .env in local dev; no-op if no .env file

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }  // optional dev dependency
    : undefined
});

const app = express();
const PORT = process.env.PORT || 3000;

// Health check -- Render pings this (D-10)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Autopilot server listening');
});
```

### Config Loader Smoke Test

```javascript
// Quick test: node config/loader.js
import { loadSiteConfig } from './loader.js';

try {
  const cfg = loadSiteConfig();
  console.log('seoConfig project name:', cfg.seoConfig.project?.name);
  console.log('pricingSection length:', cfg.pricingSection.length, 'chars');
  console.log('contentMap articles:', cfg.contentMapTrimmed.length, 'entries');
  console.log('First entry:', cfg.contentMapTrimmed[0]);
} catch (err) {
  console.error('Config loader failed:', err.message);
  process.exit(1);
}
```

### .env.example Template

```dotenv
# === Server ===
PORT=3000
NODE_ENV=development
SITE_BASE_PATH=E:/Site CL

# === API Keys ===
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# === SFTP Deploy ===
SFTP_HOST=home755449657.1and1-data.host
SFTP_PORT=22
SFTP_USER=u95030755
SFTP_PASSWORD=

# === DataForSEO (optional) ===
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# === Google Search Console ===
GSC_SERVICE_ACCOUNT_PATH=/etc/secrets/gsc-service-account.json

# === Dashboard Auth ===
DASHBOARD_USERNAME=
DASHBOARD_PASSWORD_HASH=
SESSION_SECRET=
```

### Gemini Model Verification (curl)

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_AI_API_KEY" | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); \
  JSON.parse(d).models.filter(m=>m.name.includes('imagen')||m.name.includes('image')).forEach(m=>console.log(m.name,m.description?.slice(0,80)))"
```

Save the working model name to `autopilot/config/gemini-model.txt` (plain text, one line).

### package.json Template

```json
{
  "name": "autopilot",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "pipeline": "node pipeline.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@google/genai": "^1.47.0",
    "bcryptjs": "^3.0.3",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-session": "^1.19.0",
    "googleapis": "^171.4.0",
    "js-yaml": "^4.1.1",
    "p-retry": "^8.0.0",
    "pino": "^10.3.1",
    "sharp": "^0.34.5",
    "ssh2-sftp-client": "^12.1.1",
    "telegraf": "^4.16.3"
  }
}
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v22.17.1 | -- |
| npm | Package manager | Yes | 11.5.2 | -- |
| curl | Gemini model verification | Yes (Git Bash) | -- | Use Node.js fetch() |
| npx/terser | config.min.js rebuild (future) | Yes | -- | -- |
| GOOGLE_AI_API_KEY | Gemini model list curl test | Unknown | -- | User must create at aistudio.google.com |

**Missing dependencies with no fallback:**
- `GOOGLE_AI_API_KEY` must exist before the Gemini model verification step can run. If user hasn't created it, this step blocks.

**Missing dependencies with fallback:**
- `curl` on Windows: available via Git Bash. Alternatively, write a Node.js script using `fetch()` to list Gemini models.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node --test` (v22 has stable test runner) |
| Config file | None needed -- built-in |
| Quick run command | `node --test autopilot/tests/` |
| Full suite command | `node --test autopilot/tests/` |

**Rationale:** Phase 1 has 5 discrete success criteria that map to simple smoke tests. No need for Jest/Vitest overhead. Node.js v22 `node --test` is stable and zero-dependency.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | `npm install` completes, all packages in node_modules | smoke | `cd autopilot && npm ls --depth=0` | No -- Wave 0 |
| SC-2 | `node server.js` responds 200 on GET /health | integration | `node --test autopilot/tests/health.test.js` | No -- Wave 0 |
| SC-3 | Config loader reads 3 files without crash, trims content-map | unit | `node --test autopilot/tests/loader.test.js` | No -- Wave 0 |
| SC-4 | `.env.example` has all required keys, no values | unit | `node --test autopilot/tests/env-example.test.js` | No -- Wave 0 |
| SC-5 | Gemini model name verified and saved | manual | `cat autopilot/config/gemini-model.txt` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test autopilot/tests/`
- **Per wave merge:** Same (small phase)
- **Phase gate:** All 5 success criteria pass before verify

### Wave 0 Gaps
- [ ] `autopilot/tests/health.test.js` -- SC-2: start server, fetch /health, assert 200
- [ ] `autopilot/tests/loader.test.js` -- SC-3: call loadSiteConfig(), assert 3 properties returned
- [ ] `autopilot/tests/env-example.test.js` -- SC-4: parse .env.example, check all keys present

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4.x | Express 5.x (5.2.1) | 2025 | Async error handling built-in, `app.listen()` returns Promise |
| `@google/generative-ai` | `@google/genai` v1.47.0 | 2025 | Old package deprecated; new unified SDK |
| CJS (`require`) | ESM (`import`) | Node.js v22 | `p-retry` v8 and `pino` v10 are ESM-only |
| `winston` for logging | `pino` v10 | Ongoing trend | Faster, simpler, structured JSON by default |

## Open Questions

1. **Gemini exact model name**
   - What we know: Candidates are `imagen-3.0-generate-002` and `gemini-2.0-flash-preview-image-generation`. Research also mentioned `gemini-2.5-flash-image` in PROJECT.md but this is unverified.
   - What's unclear: Which model string actually works with the user's API key and tier.
   - Recommendation: Run the curl/fetch test as a Phase 1 task. Save result to `autopilot/config/gemini-model.txt`. This unblocks Phase 3.

2. **Config.js pricing regex robustness**
   - What we know: The pricing block starts at line 11 and uses consistent 8-space indentation.
   - What's unclear: Whether future edits to config.js could break the regex.
   - Recommendation: For Phase 1, a simple regex is fine. If it breaks later, switch to a proper AST parser. Keep the regex simple and add a test.

## Sources

### Primary (HIGH confidence)
- npm registry -- all 13 package versions verified live (2026-03-29)
- Local filesystem -- `.seo-engine/config.yaml`, `assets/js/config.js`, `.seo-engine/data/content-map.yaml` structure confirmed
- Node.js v22.17.1 -- ESM support confirmed locally

### Secondary (MEDIUM confidence)
- `.planning/research/pipeline.md` -- library research from earlier phase (2026-03-29)
- `.planning/research/deployment.md` -- Render patterns and env var strategy
- `.planning/research/content-generation.md` -- context trimming strategy

### Tertiary (LOW confidence)
- Gemini model names -- multiple candidates, must verify with live API call

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified on npm today
- Architecture: HIGH -- decisions locked in CONTEXT.md, patterns are straightforward
- Pitfalls: HIGH -- well-known Node.js/ESM/Windows issues, documented from experience
- Gemini model name: LOW -- requires live API verification

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- stable domain, only Gemini model name may shift)
