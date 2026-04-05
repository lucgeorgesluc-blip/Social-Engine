# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- HTML5 — All pages (static site, 20+ `.html` files at root + `blog/` directory)
- JavaScript (ES5/ES6) — Frontend interactivity (`assets/js/main.js`, `assets/js/config.js`)
- JavaScript (ESM, Node.js) — Autopilot SEO engine (`autopilot/server.js` and all pipeline modules)

**Secondary:**
- CSS3 — Custom styles (`assets/css/style.css`, `assets/css/tailwind-src.css`)
- YAML — SEO engine configuration (`.seo-engine/config.yaml`, `data/*.yaml`)

## Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version` detected)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present at root; separate `autopilot/package-lock.json` for the autopilot sub-app

## Frameworks

**Core (static site):**
- None — Pure static HTML, no SSG or SSR framework

**CSS:**
- Tailwind CSS ^3.4.19 — Utility-first CSS, compiled via `npm run build:css`
  - Config: `tailwind.config.js`
  - Source: `assets/css/tailwind-src.css`
  - Output: `assets/css/tailwind.css` (committed, pre-built)
  - Custom colors: `primary: #DC512C`, `secondary: #2C5F4F`, `accent: #F4E8D8`
  - Custom fonts: Inter (sans), Playfair Display (serif)
  - **Known gap:** Pre-built `tailwind.css` is missing many utility classes (grid-cols, line-through, some colors) — always verify before using a new class

**Frontend interactivity:**
- Alpine.js 3.x — Loaded from CDN (`https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js`), defer-loaded

**Autopilot SEO Engine (`autopilot/`):**
- Express 5.x — HTTP server + REST API + webhook handler
- ESM modules (`"type": "module"` in `autopilot/package.json`)

**Testing (autopilot):**
- Node.js built-in test runner (`node --test tests/*.test.js`)

**Build/Dev:**
- terser — Minifies `assets/js/config.js` → `assets/js/config.min.js`
  - Command: `npx terser assets/js/config.js -o assets/js/config.min.js -c -m`
  - **Must be run after every change to `config.js`**

## Key Dependencies

**Static site (root `package.json`):**
- `tailwindcss` ^3.4.19 — CSS build only (devDependency)

**Autopilot engine (`autopilot/package.json`):**
- `@anthropic-ai/sdk` ^0.80.0 — Claude AI for blog content generation
- `@google/genai` ^1.47.0 — Google Gemini AI (secondary generation)
- `express` ^5.2.1 — HTTP server
- `express-session` ^1.19.0 — Session management (bcryptjs auth)
- `bcryptjs` ^3.0.3 — Password hashing for dashboard auth
- `googleapis` ^171.4.0 — Google Search Console API (GSC ping + rankings)
- `ssh2-sftp-client` ^12.1.1 — SFTP deploy to IONOS
- `telegraf` ^4.16.3 — Telegram bot for notifications and editing
- `sharp` ^0.34.5 — Image processing/generation
- `cheerio` ^1.2.0 — HTML parsing for site editing
- `pino` ^10.3.1 — Structured logging
- `js-yaml` ^4.1.1 — YAML parsing for SEO engine data files
- `dotenv` ^17.3.1 — Environment variable loading
- `p-retry` ^8.0.0 — Retry logic for SFTP and API calls

## Configuration

**Environment:**
- Loaded via `dotenv` in autopilot (`config({ override: true })`)
- `.env` file present — contains secrets (never read contents)
- Key env vars referenced in code:
  - `PORT` (default 3000)
  - `NODE_ENV` (production triggers proxy trust)
  - `GITHUB_WEBHOOK_SECRET` — HMAC validation for GitHub webhooks
  - `SFTP_REMOTE_PATH` — Remote web root on IONOS (default `/`)
  - `LOG_LEVEL` — Pino log level (default `info`)

**Site config (source of truth):**
- `assets/js/config.js` — All prices, contact info, Google IDs, Calendly links, blog list
- After any edit: rebuild `assets/js/config.min.js` with terser

**Build:**
- `tailwind.config.js` — Tailwind configuration (content globs, theme)
- `package.json` — `build:css` script

## Fonts

**Self-hosted (performance):**
- Inter (latin) — `assets/fonts/inter-latin.woff2`, referenced in `assets/css/fonts.css`
- Playfair Display (latin) — `assets/fonts/playfair-latin.woff2`
- Preloaded with `<link rel="preload">` on all pages

## Platform Requirements

**Development:**
- Node.js + npm (version unspecified)
- terser available via npx (no global install required)
- SFTP access to IONOS for deployment

**Production (static site):**
- IONOS 1&1 shared hosting — SFTP upload
  - Host: `home755449657.1and1-data.host`, Port 22
  - User: `u95030755`
  - No build step required — static HTML served directly

**Production (autopilot engine):**
- Render.com — Node.js web service
  - Health check endpoint: `GET /health`
  - Trusts Render reverse proxy for HTTPS (`trust proxy: 1`)

---

*Stack analysis: 2026-04-05*
