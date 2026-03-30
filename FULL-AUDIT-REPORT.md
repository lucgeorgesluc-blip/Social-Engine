# SEO Audit Report — magnetiseuse-lacoste-corinne.fr
**Business:** Corinne Lacoste — Magnétiseuse & Hypnothérapeute
**Audit Date:** 26 March 2026
**Business Type:** Local Service — Wellness Practitioner (Brick-and-mortar / SAB hybrid)
**Location:** 7 rue du Printemps, 10120 Saint-Germain (Troyes, Aube, France)
**Pages audited:** 46 (full site)

---

## SEO Health Score: 47 / 100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 22% | 54 | 11.9 |
| Content Quality (E-E-A-T) | 23% | 40 | 9.2 |
| On-Page SEO | 20% | 55 | 11.0 |
| Schema / Structured Data | 10% | 35 | 3.5 |
| Performance (Core Web Vitals) | 10% | 45 | 4.5 |
| AI Search Readiness | 10% | 41 | 4.1 |
| Images | 5% | 55 | 2.75 |
| **TOTAL** | | | **47 / 100** |

---

## Executive Summary

The site has strong commercial foundations: a verified Google presence (4.9/5, 35+ reviews), a genuine local practitioner identity, solid keyword coverage across 46 pages, and a well-structured blog targeting the tobacco cessation niche. However, the technical implementation contains **four critical defects** that are actively preventing Googlebot from indexing the site correctly — including a `robots.txt` rule that blocks all CSS, JavaScript, and font files, and a site-wide schema injection system pointing to the wrong domain. These issues must be fixed before any content or marketing work will have meaningful impact.

### Top 5 Critical Issues
1. `robots.txt` blocks `/assets/` — Googlebot cannot render the page or read any structured data
2. `config.js` `siteUrl` points to `corinnelacoste.fr` — all schema and canonical URLs reference the wrong domain
3. Phone number discrepancy between `a-propos.html` JSON-LD (+33695**46**6060) and `config.js` (+33695**48**6060)
4. Homepage has no canonical tag — highest-PageRank page is unprotected from www/non-www duplication
5. All critical content (prices, phone, schema) is JavaScript-only — if Googlebot fails to execute JS, the page indexes as an empty shell

### Top 5 Quick Wins
1. Remove `Disallow: /assets/` from `robots.txt` (5 minutes, Critical impact)
2. Fix `siteUrl` in `config.js` and rebuild `config.min.js` (5 minutes, Critical impact)
3. Add canonical tag to `index.html` (3 minutes, Critical impact)
4. Fix the phone number discrepancy in `a-propos.html` (2 minutes, Critical impact)
5. Change hero image from `loading="lazy" fetchpriority="low"` to `loading="eager" fetchpriority="high"` (2 minutes, High LCP impact)

---

## 1. Technical SEO — 54/100

### Critical Issues

**C1. robots.txt blocks /assets/ — Googlebot is rendering-blind**

`E:/Site CL/robots.txt` contains `Disallow: /assets/`, which blocks Googlebot from fetching the compiled Tailwind CSS, all custom JavaScript (`config.min.js`, `main.min.js`), and self-hosted fonts. Since the entire LocalBusiness schema, phone number, prices, and contact details are injected at runtime by `config.min.js`, Googlebot currently indexes a page with empty placeholders and no structured data. The wildcard `Disallow: /*.js$` and `Disallow: /*.css$` rules compound the issue.

**Fix:** Remove `Disallow: /assets/`, `Disallow: /*.js$`, and `Disallow: /*.css$` from `robots.txt`.

---

**C2. robots.txt Sitemap directive points to wrong domain**

The `Sitemap:` directive in `robots.txt` points to `https://www.corinnelacoste.fr/sitemap.xml`. The live site is `magnetiseuse-lacoste-corinne.fr`. This means Search Console cannot find the sitemap from the robots.txt directive.

**Fix:** Change to `Sitemap: https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml`

---

**C3. Homepage has no canonical tag**

`index.html` is the only page with no `<link rel="canonical">`. Every inner page points to `www.magnetiseuse-lacoste-corinne.fr` but the homepage itself is unprotected. Given the www/non-www ambiguity, PageRank is being split across two versions of the highest-value page on the site.

**Fix:** Add to `index.html` `<head>`:
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/">
<meta property="og:url" content="https://www.magnetiseuse-lacoste-corinne.fr/">
<meta property="og:image" content="https://www.magnetiseuse-lacoste-corinne.fr/assets/images/photo-corrine.webp">
```

---

**C4. All critical content is JavaScript-only**

Prices, phone number, SIRET, opening hours, and the entire LocalBusiness JSON-LD block are injected by `config.min.js` at runtime. No static fallback exists. Combined with the `/assets/` robots.txt block, Googlebot is currently indexing a blank shell.

**Fix:** At minimum, hard-code a static `<script type="application/ld+json">` LocalBusiness block in `index.html`. Add a static `<a href="tel:+33695486060">06 95 48 60 60</a>` anchor to the footer HTML of every page.

### High Issues

**H1. /tarifs returns 404 with active nav links**

Navigation on every page links to "Tarifs" but the URL returns 404. There is also an inconsistency: the top nav uses `#tarifs` (anchor), while the footer links to `soins.html`.

**Fix:** Standardize all "Tarifs" navigation links to `soins.html` or create a dedicated `/tarifs.html` page (the blog article `tarifs-magnetiseur-hypnotherapeute-troyes-prix.html` could serve this purpose via redirect).

**H2. 33 of 42 blog pages have no canonical tag (78%)**

Only 9 blog articles have a `<link rel="canonical">`. The remaining 33 are exposed to www/non-www duplication.

**Fix:** Add canonical tags to all blog pages using a shared template.

**H3. Hero image has `loading="lazy"` and `fetchpriority="low"`**

The full-width hero image — almost certainly the LCP element — is explicitly deprioritised by both attributes. This pushes LCP into the "Needs Improvement" or "Poor" range.

**Fix:** Change line 279-281 of `index.html` to `loading="eager" fetchpriority="high"`.

**H4. CSS opacity:0 on all sections causes CLS**

`style.css` lines 21-26 set `opacity: 0; transform: translateY(30px)` on all `<section>` elements. This causes Cumulative Layout Shift when the IntersectionObserver fires. The pattern also makes all content invisible if JavaScript is slow or blocked.

**Fix:** Use `@media (prefers-reduced-motion: no-preference)` to scope animations, and ensure sections have their natural height reserved before JS fires.

**H5. Sitemap homepage URL uses `/index.html` instead of clean `/`**

Causes a potential duplicate URL between `https://www.magnetiseuse-lacoste-corinne.fr/` and `https://www.magnetiseuse-lacoste-corinne.fr/index.html`.

**Fix:** Change the sitemap `<loc>` for the homepage to `https://www.magnetiseuse-lacoste-corinne.fr/`.

### Medium Issues

- **M1.** Duplicate `<meta name="viewport">` in `index.html` (lines 7 and 41) — remove the duplicate
- **M2.** Two separate GTM + GA4 implementations — the Google Ads tag fires before Consent Mode settles; risk of duplicate pageview events
- **M3.** Blog entry point in navigation links directly to one article — no `/blog/` index page exists, limiting internal link equity to the blog cluster
- **M4.** 4 blog articles in sitemap have future `lastmod` dates (April 2026) — signals fabricated timestamps
- **M5.** Google Maps iframe loads without consent gate — potential CNIL/GDPR violation for French visitors

### Low Issues

- **L1.** `preconnect` targets `calendly.com` but the widget script loads from `assets.calendly.com` — update preconnect to `assets.calendly.com`
- **L2.** `test-config.html` exists in the repository root — exclude from deployment via `.gitignore`, not just via robots.txt
- **L3.** No IndexNow key file — Bing/Yandex won't receive instant indexing notifications when blog articles are published

---

## 2. Content Quality (E-E-A-T) — 40/100

**YMYL Classification:** This site is a Your Money or Your Life health service site. Google applies its highest E-E-A-T standards. The current profile would likely receive a "Slightly Meets" rating from a quality rater.

### E-E-A-T Breakdown

| Factor | Score | Weight | Weighted |
|--------|-------|--------|----------|
| Experience | 52/100 | 20% | 10.4 |
| Expertise | 34/100 | 25% | 8.5 |
| Authoritativeness | 28/100 | 25% | 7.0 |
| Trustworthiness | 48/100 | 30% | 14.4 |
| **Composite** | | | **40.3/100** |

**Experience (52/100):** Real testimonials with names and ages are positive. The 4.9/5 Google rating is a credible off-site signal. However, the "95% success first session" claim lacks methodology, sample size, or time frame — a YMYL liability, not an asset. No case studies or detailed outcome narratives.

**Expertise (34/100):** Training credentials (Pascal Bescos, 2017-2018) are named and dated — better than nothing. But: the training institution cannot be independently verified against a recognised professional body; there is no continuing professional development post-2018 (8 years of apparent stasis); no professional federation membership displayed; blog articles cite no external sources.

**Authoritativeness (28/100):** No external press coverage, no backlinks from authoritative French health directories (Doctolib is excluded for unregulated practitioners), no mentions from professional communities or wellness associations. 35 Google reviews is strong locally but modest for a 7+ year business.

**Trustworthiness (48/100):** Real name and location are present. However: no full street address in visible static HTML (only dynamically injected); no telephone number in static HTML; no pricing page (the `/tarifs` URL returns 404); RGPD/privacy policy pages exist but are not prominent; the "95% success" claim is unsubstantiated and potentially violates French advertising standards (ARPP); no disclaimer that hypnotherapy/magnetism are complementary, not medical, treatments.

### Thin Content Risk

With 35+ blog articles on a niche topic published since early 2026, there is an elevated risk of:
- Near-duplicate content across multiple "hypnose arrêt tabac" variants
- Keyword cannibalization between similar-topic posts
- AI-generated blog content without genuine practitioner voice

Any blog article under 800 words should be expanded to 1,500+ words or merged with a related article via 301 redirect.

### AI Citation Readiness — 22/100

The site's most citable asset (the FAQ page) contains statistics ("85% arrêtent dès la première séance", "78% ne fument plus après 6 mois") that are unattributed and lack methodology. AI systems apply health claim safety filters and will deprioritise these. No citations to INSERM, HAS, or Santé Publique France appear anywhere on the site.

---

## 3. On-Page SEO — 55/100

### Title Tags
Well-structured across service pages. Keyword-city pattern is correctly implemented:
- `magnetiseur-troyes.html`: "Magnétiseur à Troyes : Séances de Magnétisme par Corinne Lacoste" — good
- `arret-tabac-troyes.html`: "Arrêt du Tabac par Hypnose & Magnétisme | Troyes | Corinne Lacoste" — good
- `soins.html`: "Services & Tarifs **2026** | Magnétisme Hypnose | Corinne Lacoste Troyes" — the year will become stale

### H1 Tags — Weak
Most H1s prioritise marketing over SEO:
- Homepage: "Libérez-vous du tabac" — no city or service keyword
- `a-propos.html`: "À propos de Corinne Lacoste" — no local signal
- `arret-tabac-troyes.html`: "Arrêter de fumer, retrouver votre liberté" — no city keyword
- `magnetiseur-aube.html`: "Magnétiseur dans l'Aube (10)" — good

### Internal Linking
The navigation dropdown creates dedicated service pages (Hypnose, Magnétisme, Arrêt tabac) — aligned with best practice. The blog entry point links directly to one article with no index page, limiting link equity distribution. Cross-linking between blog posts and service pages could be deeper.

### Missing Opportunities
- No location pages for Romilly-sur-Seine, Sainte-Savine, or Bar-sur-Aube despite these being explicitly cited service area cities
- No dedicated "tarifs" / pricing page (404)
- No "before and after" testimonial page

---

## 4. Schema / Structured Data — 35/100

### Current State (Critical Problems)

| Page | Current Schema | Status |
|------|---------------|--------|
| index.html | LocalBusiness (JS-injected) | Invisible when /assets/ blocked |
| a-propos.html | Person (hardcoded) | Wrong phone, placeholder URLs (`votresite.com`) |
| magnetiseur-troyes.html | MedicalBusiness (hardcoded) | Wrong schema type; `ratingValue: 5.0` (actual 4.9) |
| hypnose-troyes.html | MedicalBusiness (hardcoded) | Wrong schema type |
| arret-tabac-troyes.html | None | Missing entirely |
| magnetiseur-aube.html | None | `config.min.js` not loaded |
| faq.html | FAQPage (JS-injected) | Only 2 FAQs; invisible when /assets/ blocked |
| Blog articles | None | Missing entirely |

### Schema Issues

1. **Wrong `@type`:** `LocalBusiness` and `MedicalBusiness` should be `HealthAndBeautyBusiness` for an unregulated wellness practitioner
2. **Wrong `siteUrl`:** `config.js` has `"url": "https://www.corinnelacoste.fr"` — all schema `url` and `image` properties reference the wrong domain
3. **No `AggregateRating`:** Despite 4.9/5 with 35+ reviews, no star display in SERPs
4. **Placeholder URLs:** `a-propos.html` Person schema still contains `"https://votresite.com"` for both `url` and `image`
5. **Phone discrepancy:** `a-propos.html` hardcodes `+33695466060` vs `config.js` canonical `+33695486060`
6. **No Article schema** on any of the 35+ blog posts
7. **No BreadcrumbList** on any page
8. **Rating inflated:** `magnetiseur-troyes.html` schema uses `ratingValue: "5.0"` but actual rating is 4.9

### Recommended JSON-LD Implementations

See `ACTION-PLAN.md` for complete ready-to-deploy JSON-LD blocks for:
- `HealthAndBeautyBusiness` + `AggregateRating` + `WebSite` (homepage)
- `Person` (a-propos)
- `Service` blocks per service
- `FAQPage` (FAQ page and service pages)
- `BlogPosting` template (blog articles)
- `BreadcrumbList` (all pages)

---

## 5. Performance (Core Web Vitals) — 45/100

### LCP — HIGH RISK

The full-width hero image is set with both `loading="lazy"` and `fetchpriority="low"`. The image is hosted on an external CDN (Pexels), adding a DNS lookup + connection overhead. Setting `fetchpriority="low"` on the LCP element is one of the most impactful single-line performance bugs possible — it explicitly tells the browser to deprioritise the element that determines LCP score.

**Threshold:** Good < 2.5s / Needs Improvement 2.5-4s / Poor > 4s

### CLS — HIGH RISK

Two sources of Cumulative Layout Shift:
1. `style.css` sets `opacity: 0; transform: translateY(30px)` on all `<section>` elements — content shifts when IntersectionObserver fires
2. Dynamic content injection via `data-*` attributes (prices, stats, contact info) into unsized containers will cause layout shift when JS populates them

**Threshold:** Good < 0.1 / Needs Improvement 0.1-0.25 / Poor > 0.25

### INP — MEDIUM RISK

Multiple Alpine.js event listeners, a continuous `setInterval` typewriter animation, and the Calendly iframe all contribute to main thread contention. The deferred GTM adds ~2 seconds before firing. The Calendly preconnect targets the wrong subdomain (`calendly.com` instead of `assets.calendly.com`).

**Threshold:** Good < 200ms / Needs Improvement 200-500ms / Poor > 500ms

---

## 6. AI Search Readiness — 41/100

| Platform | Score | Primary Blocker |
|----------|-------|-----------------|
| Google AI Overviews | 38/100 | No FAQPage schema on main pages; JS-hidden success rate; unattributed statistics |
| ChatGPT (via Bing) | 42/100 | FAQPage on one page only; no external authority links |
| Perplexity | 45/100 | Blog topic alignment strong; passage self-containment weak; no llms.txt |
| Bing Copilot | 40/100 | Same FAQPage and citation gaps; schema data inconsistency |
| Google Local (Maps AI) | 65/100 | GBP active with reviews; MedicalBusiness schema present; address consistent |

### Key Gaps

- **No `llms.txt`** — the file returns 404. For a 46-page niche site, a structured `llms.txt` allows AI systems to understand the site scope efficiently
- **No FAQPage schema** on the homepage, arret-tabac-troyes, or hypnose-troyes pages (only magnetiseur-troyes.html has it)
- **Statistics are invisible or unattributed** — the success rate on the homepage is rendered blank by JavaScript; FAQ statistics lack methodology and source attribution
- **No outbound links to authoritative sources** — no citations to INSERM, HAS, Tabac Info Service, or any peer-reviewed research
- **No YouTube presence** — YouTube brand mention correlation with AI citation frequency is 0.737 (strongest available signal for a business of this size)
- **robots.txt has no explicit AI bot directives** — passive wildcard allow is correct but not proactive

---

## 7. Images — 55/100

- Practitioner portrait has descriptive alt text: "Corinne Lacoste, magnétiseuse spécialisée dans l'arrêt du tabac" — good
- Hero image uses an external Pexels stock photo — negative trust signal for a personal wellness practitioner; should be replaced with an authentic photo of Corinne or her practice environment
- Hero image format and compression status unknown (external CDN URL)
- Self-hosted images should use WebP format with JPEG fallback
- Hero image should have explicit `width` and `height` attributes to prevent CLS
- Font preloads are correctly implemented (`inter-latin.woff2`, `playfair-latin.woff2`) — but are blocked by the `/assets/` robots.txt rule

---

## 8. Local SEO — 61/100

| Dimension | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| GBP Signals | 25% | 72/100 | 18.0 |
| Reviews & Reputation | 20% | 75/100 | 15.0 |
| Local On-Page SEO | 20% | 68/100 | 13.6 |
| NAP Consistency & Citations | 15% | 45/100 | 6.8 |
| Local Schema | 10% | 42/100 | 4.2 |
| Local Link & Authority | 10% | 35/100 | 3.5 |
| **Total** | | | **61.1** |

### NAP Consistency Issues

| Source | Issue |
|--------|-------|
| `a-propos.html` Person schema | Phone: +33695**46**6060 (differs from config) |
| `config.js` canonical | Phone: +33695**48**6060 |
| `magnetiseur-troyes.html` MedicalBusiness | Name: "Corinne Lacoste - Magnétiseur Troyes" (variant) |
| `hypnose-troyes.html` MedicalBusiness | Name: "Corinne Lacoste - Hypnose Troyes" (variant) |
| GBP listing (Maps embed) | Name: "Corinne LACOSTE - Magnétiseuse à Saint-Germain (Troyes)" (variant) |
| `a-propos.html` Person schema | `"url": "https://votresite.com"` (placeholder, never updated) |
| `a-propos.html` Person schema | `"image": "https://votresite.com/assets/images/photo-corrine.webp"` (placeholder) |
| Calendly URLs | `config.js` uses `calendly.com/corinnelacoste/appel`; `arret-tabac-troyes.html` hardcodes `calendly.com/magnetiseuse-lacoste-corinne/rdv` — one may be inactive |

### GBP Assessment

Active Google Business Profile confirmed via Maps embed (place ID: `0x47ee99f913505779:0xc71725e5e618baec`). Rating 4.9/5 from 35+ reviews is excellent — top 5% for this practitioner category. Weaknesses:
- "Voir tous les avis Google" link goes to a Maps search, not a direct review-writing URL — friction prevents new reviews
- No structured ask for reviews anywhere on the site
- 35 reviews over 7+ years = ~5 reviews/year — low velocity; risk of ranking cliff if 18-day gap between reviews occurs

### Citation Opportunities (French Directories)

Priority order for citation building:
1. **Pages Jaunes** — highest-DR French business directory; likely has an auto-generated unverified listing — claim and update immediately
2. **Annuaire-magnetiseurs.fr** — topically authoritative niche directory
3. **GNOMA practitioner directory** — Pascal Bescos is a GNOMA adherent; if Corinne qualifies, this is a high-value citation
4. **Therapeutes.com / Annuaire-thérapeutes** — French wellness practitioner directories
5. **Bing Places** — mirror GBP data
6. **Societe.com / Infogreffe.fr** — auto-included from SIRET; verify business name consistency

**NAP to use consistently across all citations:**
- Name: Corinne Lacoste — Magnétiseuse & Hypnothérapeute
- Address: 7 rue du Printemps, 10120 Saint-Germain
- Phone: 06 95 48 60 60 (once discrepancy is resolved)

### Missing Location Pages

Cities explicitly mentioned as service area but with no dedicated page:
- Romilly-sur-Seine (25 min) — "magnétiseur Romilly-sur-Seine" has search demand
- Sainte-Savine (7 min) — "hypnose Sainte-Savine" is an adjacent suburb keyword
- Bar-sur-Aube (35 min) — "magnétiseur Bar-sur-Aube"

---

## Summary of All Issues

### Critical (fix immediately)

| # | Issue | File | Time |
|---|-------|------|------|
| C1 | Remove `Disallow: /assets/` from robots.txt | `robots.txt` | 5 min |
| C2 | Fix Sitemap directive domain in robots.txt | `robots.txt` | 2 min |
| C3 | Fix `siteUrl` in config.js → rebuild config.min.js | `assets/js/config.js` | 5 min |
| C4 | Add canonical + og:url + og:image to index.html | `index.html` | 5 min |
| C5 | Resolve phone number discrepancy (466060 vs 486060) | `a-propos.html` + `config.js` | 5 min |
| C6 | Add static LocalBusiness JSON-LD to index.html | `index.html` | 15 min |
| C7 | Fix placeholder URLs in a-propos.html Person schema | `a-propos.html` | 5 min |

### High (fix within 1 week)

| # | Issue | File | Time |
|---|-------|------|------|
| H1 | Fix hero image to `loading="eager" fetchpriority="high"` | `index.html` | 2 min |
| H2 | Add canonical to remaining 33 blog pages | `blog/*.html` | 30 min |
| H3 | Fix or create /tarifs destination; fix nav links | All nav HTML | 20 min |
| H4 | Fix sitemap homepage URL (/index.html → /) | `sitemap.xml` | 2 min |
| H5 | Add static phone number to all page footers | All HTML files | 20 min |
| H6 | Change all schema @type to HealthAndBeautyBusiness | `config.js` + service pages | 15 min |
| H7 | Add AggregateRating to LocalBusiness schema | `config.js` | 10 min |
| H8 | Remove future-dated lastmod entries from sitemap | `sitemap.xml` | 10 min |
| H9 | Fix ratingValue "5.0" → "4.9" in service page schemas | `magnetiseur-troyes.html` | 5 min |
| H10 | Add/improve review CTA with direct review link | Site-wide | 20 min |

### Medium (fix within 1 month)

| # | Issue | File | Time |
|---|-------|------|------|
| M1 | Remove duplicate viewport meta | `index.html` | 1 min |
| M2 | Add og:url + og:image to index.html | `index.html` | 5 min |
| M3 | Fix CSS opacity:0 animation to prevent CLS | `style.css` | 30 min |
| M4 | Gate Google Maps iframe behind consent | `index.html` | 30 min |
| M5 | Create /blog/ index page | New file | 60 min |
| M6 | Add FAQPage schema to homepage and arret-tabac | HTML files | 30 min |
| M7 | Add Article/BlogPosting schema to all blog pages | Blog template | 60 min |
| M8 | Add BreadcrumbList to all pages | All HTML files | 60 min |
| M9 | Fix preconnect to `assets.calendly.com` | `index.html` | 2 min |
| M10 | Substantiate or replace "95% success" claim | `index.html` | 30 min |
| M11 | Add medical disclaimer (complementary therapy) | Site-wide | 30 min |
| M12 | Claim Pages Jaunes listing; build French citations | External | 2 hrs |
| M13 | Create llms.txt | New file | 2 hrs |
| M14 | Remove year from soins.html title or update annually | `soins.html` | 5 min |
| M15 | Verify/align Calendly URLs (config.js vs arret-tabac) | `config.js` | 10 min |

### Low (backlog)

| # | Issue | Time |
|---|-------|------|
| L1 | Create IndexNow key file + publish workflow | 20 min |
| L2 | Exclude test-config.html from deployment | 5 min |
| L3 | Replace Pexels stock hero image with authentic photo | Creative |
| L4 | Add explicit AI bot directives to robots.txt (GPTBot, ClaudeBot, PerplexityBot) | 10 min |
| L5 | Add YouTube channel with FAQ-format videos | Ongoing |
| L6 | Build location pages for Romilly-sur-Seine, Sainte-Savine, Bar-sur-Aube | 3 hrs |
| L7 | Add sameAs links to LocalBusiness schema once citations are built | 15 min |
| L8 | Add citations to INSERM/HAS in service pages and blog posts | Ongoing |
| L9 | Publish 3-5 anonymised case studies | Content |
| L10 | Expand FAQ answers to 134-167 words for AI citation | Content |

---

*Report generated 26 March 2026. Parallel analysis by 8 specialized SEO subagents: seo-technical, seo-content, seo-schema, seo-sitemap, seo-performance, seo-geo, seo-local, seo-visual.*
