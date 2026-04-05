# SEO Workflow — magnetiseuse-lacoste-corinne.fr
**Objectif:** Apparaître en 1ère position sur Google pour "magnétiseuse Troyes", "hypnose arrêt tabac Troyes" et les mots-clés symptômes sevrage → générer des RDV.

**Score actuel: 47/100 → Cible: 72/100 en 90 jours**

---

## RÈGLE D'OR
> Corriger les problèmes techniques D'ABORD.
> Publier du contenu sur un site mal indexé = travailler pour rien.

---

## PHASE 1 — CORRECTIONS URGENTES (cette semaine, ~1h)
> Le site est partiellement invisible pour Google. Ces 4 corrections débloquent tout.

### Étape 1 · robots.txt (5 min)
**Fichier:** `E:/Site CL/robots.txt`

Remplacer le contenu entier par :
```
# robots.txt — magnetiseuse-lacoste-corinne.fr

User-agent: *
Allow: /
Disallow: /backup/
Disallow: /logs/
Disallow: /test-config.html

Allow: /assets/
Allow: /api/

# AI search crawlers
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml
```

---

### Étape 2 · config.js — corriger le domaine (5 min)
**Fichier:** `E:/Site CL/assets/js/config.js`

Chercher `corinnelacoste.fr` et remplacer par `magnetiseuse-lacoste-corinne.fr` partout.

Puis régénérer :
```bash
npx terser assets/js/config.js -o assets/js/config.min.js -c -m
```

---

### Étape 3 · Corriger le numéro de téléphone (2 min)
**Fichier:** `E:/Site CL/a-propos.html`

Dans le bloc JSON-LD (Person schema), chercher `"telephone"` et vérifier lequel est correct :
- a-propos.html a : `+33695466060`
- config.js a : `+33695486060`

Appeler les deux pour savoir lequel répond. Corriger le mauvais.

---

### Étape 4 · Corriger les placeholders votresite.com (2 min)
**Fichier:** `E:/Site CL/a-propos.html`

Chercher `votresite.com` et remplacer par `www.magnetiseuse-lacoste-corinne.fr`.

---

### Étape 5 · Ajouter la balise canonical sur la page d'accueil (3 min)
**Fichier:** `E:/Site CL/index.html`

Dans le `<head>`, après les meta existantes, ajouter :
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/">
```

Et supprimer la seconde balise `<meta name="viewport">` (elle apparaît en double).

---

### Étape 6 · Corriger l'image hero (2 min)
**Fichier:** `E:/Site CL/index.html` (lignes ~279-281)

Changer :
```html
loading="lazy" fetchpriority="low"
```
En :
```html
loading="eager" fetchpriority="high"
```

---

### Étape 7 · Déployer sur le serveur
Uploader via SFTP (WinSCP ou FileZilla) :
- Host: `home755449657.1and1-data.host` — Port 22
- User: `u95030755`
- Fichiers à uploader: `robots.txt`, `assets/js/config.js`, `assets/js/config.min.js`, `a-propos.html`, `index.html`

---

## PHASE 2 — SCHEMA ET ÉTOILES GOOGLE (semaine 2, ~1h)
> Ajouter les étoiles Google (4.9★) dans les résultats de recherche → augmente le taux de clics.

### Action 1 · Schema statique sur la page d'accueil
Dans `index.html`, ajouter ce bloc dans le `<head>` (voir ACTION-PLAN.md Fix 6 pour le JSON-LD complet).

Points clés à personnaliser :
- `"telephone"` → mettre le bon numéro (corrigé en Phase 1)
- `"aggregateRating"` → `"ratingValue": "4.9"`, `"reviewCount": "35"`
- `"@type"` → utiliser `"HealthAndBeautyBusiness"` (pas `"LocalBusiness"`)

### Action 2 · Corriger le type schema sur les pages services
Dans `magnetiseur-troyes.html` et `hypnose-troyes.html` :
- Remplacer `"@type": "MedicalBusiness"` par `"@type": "HealthAndBeautyBusiness"`
- Corriger `"ratingValue": "5.0"` → `"4.9"`

### Action 3 · Lien direct pour les avis Google
Ajouter sur la page d'accueil et la page soins un bouton :
```html
<a href="https://g.page/r/Cey6GOblJRfHEAE/review"
   target="_blank" rel="noopener">
  ⭐ Laisser un avis Google
</a>
```

---

## PHASE 3 — NOUVEAUX ARTICLES BLOG (en cours, 1 article/semaine)
> Les 9 articles de LISTE_9_ARTICLES_blog.md sont déjà écrits. Voici le workflow pour les suivants.

### Commande à donner à Claude Code pour un nouvel article :

```
Crée l'article de blog [TITRE]. Fichier : blog/[slug].html.
Applique intégralement INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md :
- Bloc "Articles qui pourraient vous intéresser" avec data-blog-list="related" et data-blog-current="[slug]"
- Ajouter en première position de SITE_CONFIG.blog dans config.js
- Régénérer config.min.js
- Ajouter l'URL dans sitemap.xml
- Prendre la dernière image de articles-to-do/ → assets/images/blog/[slug].webp
- Utiliser data-price="tabac" pour les prix, pas de montant en dur
- Schema FAQPage avec "name"
- Pas de mention rTMS
```

### Checklist publication après chaque article :
- [ ] Fichier `blog/[slug].html` créé
- [ ] Entrée ajoutée en tête de `SITE_CONFIG.blog` dans `config.js`
- [ ] `config.min.js` régénéré
- [ ] URL ajoutée dans `sitemap.xml`
- [ ] Fichiers uploadés sur SFTP
- [ ] URL inspectée dans Google Search Console (outil "Inspection d'URL")

---

## PHASE 4 — AVIS GOOGLE (objectif: 50+ avis en 3 mois)
> 35 avis aujourd'hui → objectif 50+. Les avis améliorent le classement local.

**Méthode :** Après chaque séance réussie, envoyer un SMS ou message :
> "Bonjour [Prénom], je suis ravie que notre séance vous ait aidé. Si vous souhaitez partager votre expérience, voici le lien pour laisser un avis Google (ça m'aide beaucoup) : [lien court]"

**Lien avis Google :** https://g.page/r/Cey6GOblJRfHEAE/review

---

## PHASE 5 — CITATIONS LOCALES (dans le mois)
> Se faire lister sur les annuaires français = signaux de confiance pour Google.

Par ordre de priorité :
1. **Pages Jaunes** (pagesjaunes.fr) — chercher le cabinet, revendiquer la fiche
2. **Annuaire-magnetiseurs.fr** — créer une fiche praticienne
3. **GNOMA** — si membre (formateur Pascal Bescos est GNOMA)
4. **Therapeutes.com** — fiche praticienne
5. **Bing Places** — synchroniser avec Google Business Profile

NAP à utiliser partout (identique) :
- Nom : `Corinne Lacoste — Magnétiseuse & Hypnothérapeute`
- Adresse : `7 rue du Printemps, 10120 Saint-Germain`
- Téléphone : `06 95 48 60 60` (à confirmer en Phase 1)

---

## TABLEAU DE BORD — Progression SEO

| Semaine | Action | Impact |
|---------|--------|--------|
| 1 | Fixes critiques robots.txt + config.js + canonical | +8 pts score |
| 2 | Schema HealthAndBeautyBusiness + AggregateRating | +6 pts |
| 3-6 | Articles blog hebdomadaires | +3 pts/article |
| 4 | Citations Pages Jaunes + annuaire-magnetiseurs | +4 pts |
| 8 | 50+ avis Google | +3 pts |
| 12 | Score estimé | ~72/100 |

---

## COMMENT UTILISER CLAUDE CODE COMME MENTOR SEO

### Pour créer un article :
```
Crée l'article blog [titre]. Fichier blog/[slug].html.
Suis INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md.
```

### Pour corriger une page existante :
```
Optimise [nom-page].html selon OPTIMISATIONS_pages-existantes.md
et les recommandations de l'FULL-AUDIT-REPORT.md.
```

### Pour vérifier l'état du site :
```
Vérifie que les 7 corrections de Phase 1 du SEO_WORKFLOW.md ont été appliquées.
Donne-moi un statut pour chacune.
```

### Pour déployer :
```
Déploie les fichiers modifiés via SFTP sur home755449657.1and1-data.host
(demande-moi le mot de passe avant de commencer).
```

### Pour le prochain article de blog :
```
Quel est le prochain article à écrire selon LISTE_9_ARTICLES_blog.md ?
Écris-le en suivant INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md.
```

---

## FICHIERS DE RÉFÉRENCE

| Fichier | Utilité |
|---------|---------|
| `FULL-AUDIT-REPORT.md` | Rapport complet de l'audit SEO |
| `ACTION-PLAN.md` | Toutes les corrections avec code prêt à copier |
| `SEO_WORKFLOW.md` | Ce fichier — workflow simplifié |
| `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` | Checklist création article |
| `LISTE_9_ARTICLES_blog.md` | Planning éditorial 9 articles |
| `OPTIMISATIONS_pages-existantes.md` | Améliorations pages actuelles |
| `assets/js/config.js` | Source de vérité prix/contact/schema |

---

*Généré le 26 mars 2026 — audit 8 sous-agents SEO*

---

## SEO Content Engine

SEO engine lives in `.seo-engine/`. Use it for all blog and SEO tasks.

**UNIVERSAL RULE: For ANY task involving blogs, content, SEO, keywords, competitors, or documentation in this project — ALWAYS read `.seo-engine/config.yaml` and the relevant data files FIRST before responding.** This includes writing, evaluating, reviewing, editing, auditing, planning, or answering questions about content. Never rely on your default behavior — always check the engine data.

**Sub-Agent Rule:** Parallelize independent tasks. Don't do sequentially what can run simultaneously.

### File Reference

| File | Purpose | When |
|------|---------|------|
| `config.yaml` | Settings, author, trust signals | Before any task |
| `data/features.yaml` | Feature registry | Before writing |
| `data/competitors.yaml` | Competitor matrix | Before comparisons |
| `data/seo-keywords.csv` | Keywords + SERP data | Before choosing topics |
| `data/content-map.yaml` | Blog ↔ feature ↔ keyword map | Before writing |
| `data/content-queue.yaml` | Prioritized ideas | When deciding what to write |
| `data/topic-clusters.yaml` | Pillar/cluster architecture | Before writing |
| `templates/blog-frontmatter.yaml` | Frontmatter format (HTML) | When generating |
| `templates/blog-structures.yaml` | Outlines by type | When structuring |
| `templates/tone-guide.md` | Style + E-E-A-T rules | Before writing |
| `logs/changelog.md` | Audit trail | After every action |

### Core Rules

1. **Read before writing.** Always read: config, features, content-map, content-queue, topic-clusters, tone-guide.
2. **Never fabricate features.** Only reference what's in features.yaml.
3. **Competitor claims need confidence.** If "unverified" or 90+ days old → caveat or direct reader to competitor's page.
4. **No web search for SERP data.** NEVER use built-in web search for keywords/SERP. Always ask user to provide real Google SERP data. Exception: if DataForSEO MCP connected.
5. **Cannibalization check before every blog.** Search content-map for overlapping keywords.
6. **Every blog needs a unique angle.** "More comprehensive" is NOT an angle.
7. **E-E-A-T mandatory.** Every blog must include at least one: testimonial, metric, experience, or review link from config.trust_signals.
8. **Human review required.** Save all blogs as `status: "human-review"`. Never auto-publish.
9. **Respect pillar/cluster linking.** Cluster pages → link to pillar. Pillar → link to all cluster pages.
10. **Update all files after writing:** content-map.yaml, features.yaml, seo-keywords.csv, content-queue.yaml, topic-clusters.yaml, changelog.md.
11. **Never delete data.** Add or update only.
12. **Log everything** to changelog.md.
13. **Static HTML specifics:**
    - Toujours utiliser `data-price="tabac"` (ou autre slug) — JAMAIS de montant en dur
    - Ne jamais mentionner rTMS
    - Ajouter EN TÊTE de SITE_CONFIG.blog dans config.js
    - Régénérer config.min.js : `npx terser assets/js/config.js -o assets/js/config.min.js -c -m`
    - Ajouter URL dans sitemap.xml
    - Suivre INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md pour la création d'articles

### SERP Intent Interpretation Rules

**All product/tool/local pages in top results:**
→ Intent is TRANSACTIONAL/LOCAL. Provide clear service info + CTA first, then educational content.

**Mix of guides + local pages:**
→ Intent is BLENDED. Comprehensive guide with embedded CTA works well.

**All informational guides:**
→ Intent is INFORMATIONAL. Write a thorough guide. Product mentions natural, not forced.

**All comparison/listicle pages:**
→ Intent is COMMERCIAL INVESTIGATION. Write a comparison or listicle.

**Rule: NEVER fight the SERP.** Match the dominant intent, then add unique value.

### Blog Writing Workflow

**STEP 1: Pre-Writing Research**
a) Read all data files
b) Pick topic from queue (highest priority "planned") or user request
c) Cannibalization check — scan content-map for overlapping keywords
d) SERP Analysis — ask user for real Google SERP data (never use built-in web search)
e) Define unique angle from SERP data gaps

**STEP 2: Draft**
a) Select structure from blog-structures.yaml
b) Read tone-guide.md
c) Build frontmatter: title ≤ 60 chars total, description ≤ 160 chars, slug ≤ 6 mots
d) Write blog with primary keyword in: title, first paragraph, one H2, description, slug
e) Inject E-E-A-T
f) Ask user for personal additions before finalizing

**STEP 3: Post-Writing**
a) Save blog with status: "human-review"
b) Update content-map, features, keywords, queue, clusters, changelog
c) Follow INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md checklist

### Audit Workflow

1. Feature coverage gaps (empty blog_refs)
2. Keyword gaps (high priority, no blog)
3. Cluster completion (% per cluster)
4. Keyword cannibalization
5. Stale content (90+ days)
6. Competitor data freshness (90+ days)
7. Internal linking gaps
8. E-E-A-T gaps (has_eeat_signals: false)
9. Report + update queue + log

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Social Acquisition Dashboard**

A web dashboard hosted on Render that gives a single operator (Benjamin) full visibility and control over Corinne Lacoste's social media acquisition engine. It reads/writes to a PostgreSQL database (seeded from existing `.social-engine/` YAML files), connects to Facebook API for auto-posting and metrics, and uses Claude API for AI-powered post generation. The goal: convert Facebook engagement into booked appointments for a magnetiseuse near Troyes.

**Core Value:** See what needs attention right now (posts to publish, comments to answer, prospects to DM) and act on it in one click — so no lead falls through the cracks.

### Constraints

- **Hosting:** Render single web service (free or starter tier)
- **Database:** Render free PostgreSQL
- **Auth:** Simple shared password (no OAuth, no user management)
- **AI:** Claude API (Anthropic) for post generation
- **Facebook API:** Meta Graph API for posting, metrics, and comment retrieval
- **Budget:** Minimal — free tiers where possible, only pay for AI API calls
- **Tech stack:** Simplest that works (to be decided during research — likely Node.js + lightweight frontend)
- **Repo:** Lives inside the existing Site CL repo under a dedicated directory (e.g., `dashboard/`)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- HTML5 — All pages (static site, 20+ `.html` files at root + `blog/` directory)
- JavaScript (ES5/ES6) — Frontend interactivity (`assets/js/main.js`, `assets/js/config.js`)
- JavaScript (ESM, Node.js) — Autopilot SEO engine (`autopilot/server.js` and all pipeline modules)
- CSS3 — Custom styles (`assets/css/style.css`, `assets/css/tailwind-src.css`)
- YAML — SEO engine configuration (`.seo-engine/config.yaml`, `data/*.yaml`)
## Runtime
- Node.js (version not pinned — no `.nvmrc` or `.node-version` detected)
- npm
- Lockfile: `package-lock.json` present at root; separate `autopilot/package-lock.json` for the autopilot sub-app
## Frameworks
- None — Pure static HTML, no SSG or SSR framework
- Tailwind CSS ^3.4.19 — Utility-first CSS, compiled via `npm run build:css`
- Alpine.js 3.x — Loaded from CDN (`https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js`), defer-loaded
- Express 5.x — HTTP server + REST API + webhook handler
- ESM modules (`"type": "module"` in `autopilot/package.json`)
- Node.js built-in test runner (`node --test tests/*.test.js`)
- terser — Minifies `assets/js/config.js` → `assets/js/config.min.js`
## Key Dependencies
- `tailwindcss` ^3.4.19 — CSS build only (devDependency)
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
- Loaded via `dotenv` in autopilot (`config({ override: true })`)
- `.env` file present — contains secrets (never read contents)
- Key env vars referenced in code:
- `assets/js/config.js` — All prices, contact info, Google IDs, Calendly links, blog list
- After any edit: rebuild `assets/js/config.min.js` with terser
- `tailwind.config.js` — Tailwind configuration (content globs, theme)
- `package.json` — `build:css` script
## Fonts
- Inter (latin) — `assets/fonts/inter-latin.woff2`, referenced in `assets/css/fonts.css`
- Playfair Display (latin) — `assets/fonts/playfair-latin.woff2`
- Preloaded with `<link rel="preload">` on all pages
## Platform Requirements
- Node.js + npm (version unspecified)
- terser available via npx (no global install required)
- SFTP access to IONOS for deployment
- IONOS 1&1 shared hosting — SFTP upload
- Render.com — Node.js web service
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Naming Patterns
- Root pages: `kebab-case.html` — e.g., `arret-tabac-troyes.html`, `hypnose-troyes.html`, `a-propos.html`
- Blog articles: `blog/kebab-case-descriptive-slug.html` — e.g., `blog/arret-tabac-par-hypnose-avis-temoignages.html`
- Slugs are French, SEO-optimised, max ~6 words, contain primary keyword
- `assets/js/config.js` — source of truth, human-readable
- `assets/js/config.min.js` — minified output (generated, never hand-edited)
- `assets/js/main.js` → `assets/js/main.min.js`
- `assets/css/tailwind-src.css` — Tailwind source input
- `assets/css/tailwind.css` — compiled output (generated via `npm run build:css`)
- `assets/css/style.css` — custom overrides
- `assets/css/fonts.css` — self-hosted font declarations
- Blog featured images: `assets/images/blog/[slug].webp` (800×450, quality 85)
- Avatars: `assets/images/avatar-[prenom]-64.webp` (48×48, rounded)
- General: `assets/images/[descriptive-name].[ext]`
- Constants: `SCREAMING_SNAKE_CASE` — e.g., `SITE_CONFIG`
- Functions: `camelCase` — e.g., `initCookieConsent`, `showConsentBanner`, `grantConsent`
- Config keys: `camelCase` — e.g., `tabac`, `magnetisme_adulte`, `telephoneFormatted`
- Pricing keys use `snake_case` — e.g., `magnetisme_adulte`, `stress_anxiete`
## HTML Structure Pattern
## CSS / Tailwind Conventions
- Content columns: `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8`
- Wide layouts (nav, footer): `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- `text-primary` / `bg-primary` — brand orange/terracotta
- `text-secondary` / `bg-secondary` — dark green
- `bg-accent` — light accent tone
- CTA buttons: `bg-primary text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition font-medium`
- Section alternation: `bg-white` / `bg-accent/10`
- Cards: `bg-white rounded-lg p-6 shadow border-l-4 border-[color]`
- Badges/tags: `inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium`
- Article body: `class="prose prose-lg max-w-none"`
- Headings: `font-serif font-bold text-secondary`
## JavaScript Conventions
- ES6+ features: arrow functions, template literals, `const`/`let`, destructuring
- 4-space indentation
- Single quotes for strings
- Semicolons used
- Comments in French for business logic, English for technical code
- DOM ready: `document.addEventListener('DOMContentLoaded', () => { ... })`
- Event listeners attached via `querySelectorAll(...).forEach()`
- Guard checks before DOM access: `if (nav) { ... }`
- Analytics wrapped in `typeof gtag !== 'undefined'` guard
- Public utilities exported via `window.siteUtils = { formatPhoneNumber, scrollToTop, handleFormSubmit }`
- Config exported as global `SITE_CONFIG` (from `config.js` / `config.min.js`)
- Fetch errors: `.catch(error => { console.error('Error:', error); alert('Erreur technique...'); })`
- No centralised error handler
- `console.log` used for debug/tracking events (not removed in production)
## Config-Driven Dynamic Data
| Data type | Attribute to use |
|-----------|-----------------|
| Service price | `<span data-price="tabac"></span>` (or other service key) |
| Contact address | `<span data-contact="adresse"></span>` |
| Appointment delay | `<span data-contact="rdvSousJours"></span>` |
| Session duration | `<span data-duration="tabac"></span>` |
| Meta description price | `data-meta-price="tabac"` + `{{price}}` placeholder |
| ROI calculator | `data-calc="economiesAnnuelle"` etc. |
## Schema / JSON-LD Conventions
- Schema blocks are inline `<script type="application/ld+json">` in `<head>`
- Format: compact single-line JSON (not pretty-printed) for blog articles
- Blog articles use `@type: "Article"` with: `headline`, `description`, `author` (Person, Corinne Lacoste), `datePublished`, `dateModified`, `image`
- FAQPage schemas must include `"name"` property on the FAQ object to avoid Google Search Console warnings
- `LocalBusiness` schema is injected dynamically by `config.min.js` on the homepage
- Use `"@type": "HealthAndBeautyBusiness"` — NOT `"MedicalBusiness"` or `"LocalBusiness"`
- `"aggregateRating"`: `"ratingValue": "4.9"`, `"reviewCount": "35"`
- Never mention rTMS / TMS / stimulation magnétique transcrânienne anywhere
## Navigation Pattern
## Blog Article HTML Conventions
## Comments
- Section dividers use `// ========================================` style
- Business-facing comments in French (e.g., `// Vérifier que le nav existe (pas sur landing pages)`)
- Technical comments in English
- Config.js has JSDoc-style header comment explaining purpose and edit instructions
- HTML comments used to mark dynamic injection points: `<!-- Liens injectés automatiquement depuis assets/js/config.js -->`
## What NOT to Do
- Do not hardcode prices (use `data-price` attributes)
- Do not hand-edit `config.min.js` (regenerate with terser)
- Do not hand-edit `tailwind.css` (regenerate with `npm run build:css`)
- Do not mention rTMS anywhere
- Do not use `"MedicalBusiness"` schema type
- Do not add Co-Authored-By lines to git commits
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- No server-side rendering, no build framework — pure HTML/CSS/JS deployed via SFTP
- Single source of truth for all prices, contact info, and structured data: `assets/js/config.js`
- Runtime DOM injection: config.js populates `data-*` attributes in HTML at page load
- Schema.org JSON-LD injected dynamically by config.js (not hard-coded in HTML)
- Alpine.js handles interactive UI components (accordion, mobile menu, dropdowns)
## Layers
- Purpose: Central source of truth for all site data
- Location: `assets/js/config.js` (minified to `assets/js/config.min.js`)
- Contains: Pricing, contact info, Google IDs, external links, stats, full blog index, Schema.org generators
- Depends on: Nothing
- Used by: Every HTML page via `<script src="assets/js/config.min.js">`
- Purpose: Static HTML pages with data-attribute placeholders
- Location: Root-level `.html` files (service pages) and `blog/` directory (articles)
- Contains: Page markup with `data-price`, `data-duration`, `data-contact`, `data-blog-list`, `data-link` placeholders
- Depends on: config.min.js (data injection), tailwind.css (styles), main.min.js (behaviour)
- Used by: End users via browser
- Purpose: Visual presentation
- Location: `assets/css/`
- Contains: `tailwind.css` (pre-built Tailwind utility classes), `style.css` (custom overrides and animations), `fonts.css` (self-hosted Inter + Playfair Display)
- Depends on: Nothing
- Used by: All HTML pages
- Purpose: UI interactions, analytics, RGPD consent
- Location: `assets/js/main.js` (minified to `assets/js/main.min.js`)
- Contains: Smooth scroll, navbar shadow on scroll, Intersection Observer fade-in, CTA/phone click tracking, Calendly booking tracking, RGPD cookie consent banner (Google Consent Mode v2)
- Depends on: config.min.js (for gtag IDs), Alpine.js (CDN)
- Used by: All main site pages (not landing pages)
- Purpose: Server-side contact form handler (PHP stub, currently unused)
- Location: `api/` (empty directory)
- Contains: Placeholder for `contact.php` — referenced in main.js but not implemented
- Depends on: Nothing
- Used by: main.js form handler (dead code path)
## Data Flow
## Key Abstractions
- Purpose: Single global object holding all runtime data
- Examples: `assets/js/config.js` (source), `assets/js/config.min.js` (deployed)
- Pattern: Plain JS object with nested sections: `pricing`, `contact`, `google`, `links`, `stats`, `blog`, `calculations`, `seo`
- Rule: NEVER hard-code prices or contact info in HTML — always use `data-price="[key]"` attributes
- Purpose: Decouple content data from HTML structure
- Supported attributes: `data-price="[pricing key]"`, `data-duration="[pricing key]"`, `data-contact="[contact key]"`, `data-link="[links key]"`, `data-calendly-url`, `data-blog-list="related|index"`, `data-blog-current="[slug]"`, `data-blog-limit="[n]"`, `data-meta-price="[pricing key]"` (on meta tags)
- Pattern: HTML placeholder → config.js runtime injection
- Purpose: SEO-targeted content pages
- Location: `blog/[slug].html`
- Pattern: Each article is a standalone HTML file; articles are registered in `SITE_CONFIG.blog` array in config.js (newest first); related articles block uses `data-blog-list="related"`
## Entry Points
- Location: `index.html`
- Triggers: Direct navigation, Google search
- Responsibilities: Brand presentation, primary CTA (Calendly booking), social proof, service overview, FAQ, schema injection
- Location: `magnetiseur-troyes.html`, `hypnose-troyes.html`, `arret-tabac-troyes.html`, `soins.html`, `magnetiseur-aube.html`
- Triggers: Organic search on local/service keywords
- Responsibilities: Detailed service info, SEO landing, CTA to book
- Location: `blog/[slug].html` (70+ articles)
- Triggers: Long-tail keyword search traffic
- Responsibilities: Informational content, internal linking to service pages, CTA to book
- Location: `paiement.html`
- Triggers: Direct link from CTAs for tobacco cessation packages
- Responsibilities: Stripe payment hub for 3 tobacco cessation packages
- Location: `landing-tabac.html`
- Triggers: Ad campaigns
- Responsibilities: Minimal page (no nav/footer), focused conversion
## Error Handling
- config.js DOM injection: null checks before setting textContent (`if (priceValue !== null)`)
- main.js form: `fetch` with `.catch()` showing `alert()` on network error
- main.js: nav existence check before scroll handler (`if (nav)`) to support landing pages without nav
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
