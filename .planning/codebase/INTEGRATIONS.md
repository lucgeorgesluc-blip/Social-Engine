# External Integrations

**Analysis Date:** 2026-04-05

## Analytics & Advertising

**Google Tag Manager:**
- ID: `GTM-MFK6BL36` (configured in `assets/js/config.js` → `SITE_CONFIG.google.gtmId`)
- Loaded on all pages via `<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17956035279">`
- GTM noscript iframe included in `<body>` on all pages
- Consent Mode v2 implemented: defaults `denied`, updates to `granted` on user consent (localStorage key `consentGranted`)

**Google Analytics 4:**
- ID: `G-5KYCNEBXRX` (configured in `assets/js/config.js` → `SITE_CONFIG.google.ga4Id`)
- Managed via GTM

**Google Ads:**
- ID: `AW-17956035279` (configured in `assets/js/config.js` → `SITE_CONFIG.google.googleAdsId`)
- Direct `gtag` script tag on all pages (including `paiement.html`)
- Conversion events tracked: CTA clicks (`cta_click`), phone clicks (`phone_click`) via `assets/js/main.js`

## Appointment Booking

**Calendly:**
- Widget URL: `https://calendly.com/corinnelacoste/appel?hide_gdpr_banner=1&primary_color=DC512C`
- Plain link: `https://calendly.com/corinnelacoste/appel`
- Configured in `assets/js/config.js` → `SITE_CONFIG.links.calendly` and `calendlyWidget`
- Pages preconnect/dns-prefetch Calendly domain: `https://calendly.com`, `https://assets.calendly.com`
- Embedded as inline widget or CTA link across service pages

## Payments

**Stripe:**
- Integration type: Stripe Buy Button (no server-side Stripe SDK)
- JS loaded from: `https://js.stripe.com/v3/buy-button.js`
- Three payment links on `paiement.html`:
  - Séance unique: `https://buy.stripe.com/5kQ6oH0y40AUcGebYMdUY00`
  - Pack Sérénité: `https://buy.stripe.com/fZu00j3Kg5Ve49IfaYdUY02`
  - Programme Minceur: `https://buy.stripe.com/eVq3cvgx2abucGe0g4dUY03`
- Page is `noindex, nofollow` — payment hub only, not SEO-targeted
- No server-side webhook for payment confirmation

## Google Search Console

**GSC Indexing API:**
- SDK: `googleapis` ^171.4.0 in autopilot
- Used by: `autopilot/pipeline/gsc-ping.js` — submits new article URLs for indexing after deploy
- Used by: `autopilot/pipeline/gsc-rankings.js` — fetches ranking data for keyword tracking
- Auth: Google service account (credentials via env var, not in repo)
- Reference: `docs/` directory contains GSC setup notes

## AI Content Generation

**Anthropic Claude:**
- SDK: `@anthropic-ai/sdk` ^0.80.0 in autopilot
- Used by: `autopilot/pipeline/generator.js` — primary blog content generation
- Auth: `ANTHROPIC_API_KEY` env var

**Google Gemini:**
- SDK: `@google/genai` ^1.47.0 in autopilot
- Used by: secondary generation pipeline
- Auth: Google API key via env var

## SEO Data

**DataForSEO:**
- Integration: `autopilot/pipeline/dataforseo-rankings.js`
- Plugin config: `claude-seo/extensions/dataforseo/field-config.json`
- Used for keyword ranking data (SERP tracking)
- Auth: DataForSEO API credentials via env var
- Status: Listed as optional in CLAUDE.md ("if DataForSEO MCP connected")

## Deployment & Hosting

**IONOS 1&1 Shared Hosting (static site):**
- Protocol: SFTP via `ssh2-sftp-client`
- Deployer: `autopilot/pipeline/sftp-deployer.js`
- Pattern: atomic temp-file + rename; retry via `p-retry`
- Host: `home755449657.1and1-data.host`, Port 22, User: `u95030755`
- Env vars: `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD` (or key), `SFTP_REMOTE_PATH`

**GitHub:**
- Webhook receiver: `POST /webhook/github` in `autopilot/server.js`
- Purpose: triggers immediate site repo pull when code is pushed
- Security: HMAC-SHA256 signature (`GITHUB_WEBHOOK_SECRET` env var)
- Repo sync: `autopilot/lib/site-repo.js` — `cloneOrPull`, `pullIfStale`

**Render.com (autopilot engine):**
- Hosting platform for the autopilot Node.js app
- Health check: `GET /health` returns `{ status: 'ok', timestamp }`
- Reverse proxy trust enabled in production

## Notifications & Bot

**Telegram:**
- Library: `telegraf` ^4.16.3
- Bot: `autopilot/telegram/bot.js`
- Features:
  - Deployment notifications
  - Preview of generated articles before publish (`autopilot/telegram/preview.js`)
  - Edit commands for article corrections (`autopilot/telegram/edit-handler.js`)
- Auth: `TELEGRAM_BOT_TOKEN` env var

## Local Business Signals

**Google Business Profile:**
- Review link: `https://g.page/r/Cey6GOblJRfHEAE/review`
- Configured in `assets/js/config.js` → `SITE_CONFIG.links.googleMaps` and `googleReviews`
- Used on pages as "Laisser un avis Google" CTA
- Rating data: 4.9★, 35 reviews (hardcoded in `SITE_CONFIG.stats`)

**Google Maps / Geo:**
- Coordinates in `assets/js/config.js`: `{ latitude: 48.252349, longitude: 4.026241 }`
- Used in Schema.org LocalBusiness JSON-LD on service pages

## Schema.org / Structured Data

**JSON-LD blocks on pages (inline, no external API):**
- `LocalBusiness` / `HealthAndBeautyBusiness` schema on `magnetiseur-troyes.html`, `hypnose-troyes.html`
- `Person` schema on `a-propos.html`
- `FAQPage` schema on blog articles
- `AggregateRating` embedded in LocalBusiness schema
- All contact/rating values sourced from `assets/js/config.js`

## Fonts (Self-hosted, No External CDN)

- Inter and Playfair Display fonts are self-hosted in `assets/fonts/`
- No Google Fonts CDN calls — all font files committed to repo
- Loaded via `assets/css/fonts.css`

## Bing

**Bing Webmaster Tools:**
- Verification file: `BingSiteAuth.xml` at root
- No active Bing API integration

## Environment Configuration

**Required env vars (autopilot):**
- `ANTHROPIC_API_KEY` — Claude content generation
- `TELEGRAM_BOT_TOKEN` — Telegram bot
- `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD` — IONOS deployment
- `SFTP_REMOTE_PATH` — Remote web root
- `GITHUB_WEBHOOK_SECRET` — Webhook HMAC validation
- Google service account credentials — GSC Indexing API

**Secrets location:**
- `autopilot/secrets/` directory (gitignored)
- `.env` file in `autopilot/` (gitignored)

---

*Integration audit: 2026-04-05*
