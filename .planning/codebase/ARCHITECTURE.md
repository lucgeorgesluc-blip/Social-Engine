# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Config-driven static site with client-side data injection

**Key Characteristics:**
- No server-side rendering, no build framework — pure HTML/CSS/JS deployed via SFTP
- Single source of truth for all prices, contact info, and structured data: `assets/js/config.js`
- Runtime DOM injection: config.js populates `data-*` attributes in HTML at page load
- Schema.org JSON-LD injected dynamically by config.js (not hard-coded in HTML)
- Alpine.js handles interactive UI components (accordion, mobile menu, dropdowns)

## Layers

**Configuration Layer:**
- Purpose: Central source of truth for all site data
- Location: `assets/js/config.js` (minified to `assets/js/config.min.js`)
- Contains: Pricing, contact info, Google IDs, external links, stats, full blog index, Schema.org generators
- Depends on: Nothing
- Used by: Every HTML page via `<script src="assets/js/config.min.js">`

**Presentation Layer:**
- Purpose: Static HTML pages with data-attribute placeholders
- Location: Root-level `.html` files (service pages) and `blog/` directory (articles)
- Contains: Page markup with `data-price`, `data-duration`, `data-contact`, `data-blog-list`, `data-link` placeholders
- Depends on: config.min.js (data injection), tailwind.css (styles), main.min.js (behaviour)
- Used by: End users via browser

**Styling Layer:**
- Purpose: Visual presentation
- Location: `assets/css/`
- Contains: `tailwind.css` (pre-built Tailwind utility classes), `style.css` (custom overrides and animations), `fonts.css` (self-hosted Inter + Playfair Display)
- Depends on: Nothing
- Used by: All HTML pages

**Behaviour Layer:**
- Purpose: UI interactions, analytics, RGPD consent
- Location: `assets/js/main.js` (minified to `assets/js/main.min.js`)
- Contains: Smooth scroll, navbar shadow on scroll, Intersection Observer fade-in, CTA/phone click tracking, Calendly booking tracking, RGPD cookie consent banner (Google Consent Mode v2)
- Depends on: config.min.js (for gtag IDs), Alpine.js (CDN)
- Used by: All main site pages (not landing pages)

**API Layer:**
- Purpose: Server-side contact form handler (PHP stub, currently unused)
- Location: `api/` (empty directory)
- Contains: Placeholder for `contact.php` — referenced in main.js but not implemented
- Depends on: Nothing
- Used by: main.js form handler (dead code path)

## Data Flow

**Price/Contact injection flow:**

1. Browser loads HTML page with empty `<span data-price="tabac"></span>` placeholders
2. `config.min.js` loaded in `<head>` or end of `<body>`
3. `initConfig()` fires on `DOMContentLoaded` (or immediately if DOM ready)
4. `updateDynamicContent()` queries all `[data-price]`, `[data-duration]`, `[data-contact]`, `[data-link]`, `[data-calendly-url]`, `[data-blog-list]` elements
5. Values from `SITE_CONFIG` object are injected as `textContent` or `href`
6. `injectLocalBusinessSchema()` creates a `<script type="application/ld+json">` tag and appends it to `<head>`
7. If on `faq.html`, `injectFAQPageSchema()` also fires

**Blog "related articles" flow:**

1. Blog page contains `<div data-blog-list="related" data-blog-current="[slug]" data-blog-limit="3">`
2. config.js reads `SITE_CONFIG.blog` array (ordered newest-first)
3. Filters out current page's slug
4. Renders first N article cards as HTML and injects into the container

**Analytics/Consent flow:**

1. Google Consent Mode v2 default (all denied) set inline in `<head>` before any scripts
2. `localStorage.getItem('consentGranted')` checked — if `'true'`, consent updated to granted immediately
3. GTM and GA4 load after consent check
4. main.js shows RGPD cookie banner if no prior consent stored
5. User accept/decline updates gtag consent and writes to localStorage

## Key Abstractions

**SITE_CONFIG object:**
- Purpose: Single global object holding all runtime data
- Examples: `assets/js/config.js` (source), `assets/js/config.min.js` (deployed)
- Pattern: Plain JS object with nested sections: `pricing`, `contact`, `google`, `links`, `stats`, `blog`, `calculations`, `seo`
- Rule: NEVER hard-code prices or contact info in HTML — always use `data-price="[key]"` attributes

**data-* attribute injection system:**
- Purpose: Decouple content data from HTML structure
- Supported attributes: `data-price="[pricing key]"`, `data-duration="[pricing key]"`, `data-contact="[contact key]"`, `data-link="[links key]"`, `data-calendly-url`, `data-blog-list="related|index"`, `data-blog-current="[slug]"`, `data-blog-limit="[n]"`, `data-meta-price="[pricing key]"` (on meta tags)
- Pattern: HTML placeholder → config.js runtime injection

**Blog article pages:**
- Purpose: SEO-targeted content pages
- Location: `blog/[slug].html`
- Pattern: Each article is a standalone HTML file; articles are registered in `SITE_CONFIG.blog` array in config.js (newest first); related articles block uses `data-blog-list="related"`

## Entry Points

**Homepage:**
- Location: `index.html`
- Triggers: Direct navigation, Google search
- Responsibilities: Brand presentation, primary CTA (Calendly booking), social proof, service overview, FAQ, schema injection

**Service pages (root level):**
- Location: `magnetiseur-troyes.html`, `hypnose-troyes.html`, `arret-tabac-troyes.html`, `soins.html`, `magnetiseur-aube.html`
- Triggers: Organic search on local/service keywords
- Responsibilities: Detailed service info, SEO landing, CTA to book

**Blog articles:**
- Location: `blog/[slug].html` (70+ articles)
- Triggers: Long-tail keyword search traffic
- Responsibilities: Informational content, internal linking to service pages, CTA to book

**Payment page:**
- Location: `paiement.html`
- Triggers: Direct link from CTAs for tobacco cessation packages
- Responsibilities: Stripe payment hub for 3 tobacco cessation packages

**Landing page:**
- Location: `landing-tabac.html`
- Triggers: Ad campaigns
- Responsibilities: Minimal page (no nav/footer), focused conversion

## Error Handling

**Strategy:** No centralized error handling — fail silently in JS, PHP contact form returns JSON success/error

**Patterns:**
- config.js DOM injection: null checks before setting textContent (`if (priceValue !== null)`)
- main.js form: `fetch` with `.catch()` showing `alert()` on network error
- main.js: nav existence check before scroll handler (`if (nav)`) to support landing pages without nav

## Cross-Cutting Concerns

**Analytics:** Google Tag Manager (GTM-MFK6BL36) + GA4 (G-5KYCNEBXRX) + Google Ads (AW-17956035279) + Ahrefs Analytics — all loaded conditionally after RGPD consent check
**RGPD/Consent:** Google Consent Mode v2 inline in every page `<head>`, banner managed by main.js, state stored in localStorage
**Schema.org:** Injected dynamically by config.min.js on every page (LocalBusiness) + FAQPage on faq.html
**Fonts:** Self-hosted Inter (body) and Playfair Display (headings) via `assets/fonts/` + `assets/css/fonts.css`
**Interactivity:** Alpine.js 3.x from CDN — used for mobile menu, service dropdowns, FAQ accordions

---

*Architecture analysis: 2026-04-05*
