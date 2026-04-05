# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
E:/Site CL/                         # Project root — also web root
├── index.html                      # Homepage
├── magnetiseur-troyes.html         # Primary service page (main SEO target)
├── hypnose-troyes.html             # Hypnosis service page
├── arret-tabac-troyes.html         # Tobacco cessation service page
├── soins.html                      # All services listing
├── magnetiseur-aube.html           # Geographic landing (Aube department)
├── a-propos.html                   # About/practitioner page
├── faq.html                        # FAQ page (FAQPage schema injected)
├── paiement.html                   # Stripe payment hub (tobacco packages)
├── cgv.html                        # Terms of sale
├── mentions-legales.html           # Legal notices
├── politique-confidentialite.html  # Privacy policy
├── landing-tabac.html              # Minimal ad landing page
├── test-config.html                # Dev tool: config.js injection tester
├── sitemap.xml                     # XML sitemap (manually maintained)
├── robots.txt                      # Crawler directives
├── .htaccess                       # Apache config (redirects, caching)
├── BingSiteAuth.xml                # Bing Webmaster verification
├── package.json                    # Only used for terser (config.min.js rebuild)
│
├── blog/                           # Blog articles (70+ HTML files)
│   └── [slug].html                 # One file per article
│
├── assets/
│   ├── css/
│   │   ├── tailwind.css            # Pre-built Tailwind utility classes (DO NOT edit directly)
│   │   ├── tailwind-src.css        # Tailwind source (input for rebuild)
│   │   ├── style.css               # Custom overrides, animations, site-specific styles
│   │   └── fonts.css               # @font-face declarations for self-hosted fonts
│   ├── js/
│   │   ├── config.js               # SOURCE OF TRUTH — all prices, contact, blog index, schema
│   │   ├── config.min.js           # Minified config (deployed version — regenerate after edits)
│   │   ├── main.js                 # UI behaviour, analytics, RGPD consent
│   │   └── main.min.js             # Minified main (deployed version)
│   ├── fonts/
│   │   ├── inter-latin.woff2       # Body font (self-hosted)
│   │   └── playfair-latin.woff2    # Heading font (self-hosted)
│   └── images/
│       ├── blog/                   # Blog article images ([slug].webp naming)
│       ├── favicon.svg / .ico / .png  # Favicons
│       └── [page-image].webp       # Service/about page images
│
├── api/                            # Empty — PHP contact form placeholder
│
├── .planning/                      # GSD planning docs (not deployed)
│   ├── codebase/                   # Codebase analysis documents
│   └── phases/                     # Implementation phase plans
│
├── .seo-engine/                    # SEO content engine data (not deployed)
├── .social-engine/                 # Social media engine (not deployed)
├── .superpowers/                   # Claude GSD tooling (not deployed)
├── .claude/                        # Claude project memory (not deployed)
│
├── autopilot/                      # Separate git repo — SEO autopilot Node.js app
├── claude-seo/                     # Separate git repo — Claude SEO plugin
│
└── docs/                           # Superpowers plans/specs (not deployed)
```

## Directory Purposes

**Root HTML files:**
- Purpose: All public-facing pages live at the root level (not in subdirectories)
- Contains: Service pages, legal pages, payment page, landing pages
- Key files: `index.html` (homepage), `magnetiseur-troyes.html` (primary SEO page)

**`blog/`:**
- Purpose: All blog article pages — 70+ files targeting long-tail SEO keywords
- Contains: Standalone HTML files, one per article
- Key files: Any `[slug].html` matching an entry in `SITE_CONFIG.blog` in `assets/js/config.js`
- Note: Articles are registered in config.js to appear in related-articles blocks site-wide

**`assets/js/`:**
- Purpose: All JavaScript — config data and UI behaviour
- Key files: `config.js` (edit this), `config.min.js` (deploy this), `main.js` (edit this), `main.min.js` (deploy this)

**`assets/css/`:**
- Purpose: All stylesheets
- Key files: `tailwind.css` (pre-built, many utility classes may be missing — verify before use), `style.css` (custom overrides)

**`assets/images/blog/`:**
- Purpose: One image per blog article
- Naming convention: `[slug].webp` matching the article slug

**`.planning/codebase/`:**
- Purpose: Architecture analysis documents for GSD commands
- Generated: By `/gsd:map-codebase`
- Committed: Yes (planning artifacts)

## Key File Locations

**Entry Points:**
- `index.html`: Homepage and primary brand entry point
- `magnetiseur-troyes.html`: Primary SEO target page

**Configuration (source of truth):**
- `assets/js/config.js`: All prices, contact info, blog list, schema generators — edit this file
- `assets/js/config.min.js`: Minified deployed version — regenerate after every config.js edit

**Styling:**
- `assets/css/style.css`: Custom styles, animation classes, site-specific overrides
- `assets/css/tailwind.css`: Pre-built Tailwind — do not edit; rebuild from `tailwind-src.css` if needed

**SEO Infrastructure:**
- `sitemap.xml`: Add every new page URL manually
- `robots.txt`: Crawler rules
- `.htaccess`: Apache redirects and caching headers

**Blog articles:**
- `blog/[slug].html`: Individual article files

## Naming Conventions

**Root HTML files:**
- Pattern: `kebab-case.html` matching the primary keyword phrase
- Examples: `arret-tabac-troyes.html`, `magnetiseur-aube.html`, `mentions-legales.html`

**Blog article files:**
- Pattern: `blog/[slug].html` where slug matches `SITE_CONFIG.blog[n].slug`
- Examples: `blog/hypnose-arret-tabac-troyes.html`, `blog/sevrage-tabac-combien-de-temps-calendrier-30-jours.html`
- Rule: Slug must be ≤ 6 words, contain primary keyword, registered in config.js

**Blog images:**
- Pattern: `assets/images/blog/[slug].webp`
- Rule: Same slug as the article file, always `.webp` format

**JS/CSS files:**
- Pattern: `[name].js` (source) + `[name].min.js` (minified deployed version)
- Rule: Always edit source, always deploy minified

## Where to Add New Code

**New blog article:**
1. Create `blog/[slug].html` following `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md`
2. Add entry to TOP of `SITE_CONFIG.blog` array in `assets/js/config.js`
3. Regenerate: `npx terser assets/js/config.js -o assets/js/config.min.js -c -m`
4. Add URL to `sitemap.xml`
5. Add image to `assets/images/blog/[slug].webp`

**New root service/landing page:**
1. Create `[slug].html` at project root
2. Add URL to `sitemap.xml`
3. Use `data-price`, `data-contact` attributes — never hard-code prices

**New price or contact change:**
1. Edit ONLY `assets/js/config.js`
2. Regenerate config.min.js — the change propagates to all pages automatically

**New CSS utility class:**
1. Check `assets/css/tailwind.css` first — many classes are missing from the pre-built file
2. Add custom class to `assets/css/style.css` if missing from Tailwind

**New UI behaviour:**
1. Edit `assets/js/main.js`
2. Regenerate: `npx terser assets/js/main.js -o assets/js/main.min.js -c -m`

## Special Directories

**`autopilot/`:**
- Purpose: Standalone Node.js SEO autopilot application (Telegram bot, audit pipeline, skills)
- Generated: No
- Committed: Separate git repo (`autopilot/.git`)
- Note: Do NOT mix commits with root site files

**`claude-seo/`:**
- Purpose: Claude SEO plugin/extension framework
- Generated: No
- Committed: Separate git repo (`claude-seo/.git`)
- Note: Do NOT mix commits with root site files

**`.seo-engine/`:**
- Purpose: SEO content engine data files (YAML/CSV keyword data, content queue, topic clusters)
- Generated: Partially (logs)
- Committed: Engine config yes, logs/data no (see `.gitignore`)

**`image-prompts/`:**
- Purpose: AI image generation prompts for blog article images
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-05*
