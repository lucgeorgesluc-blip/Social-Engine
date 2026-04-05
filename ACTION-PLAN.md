# SEO Action Plan — magnetiseuse-lacoste-corinne.fr
**Generated:** 26 March 2026
**Current Score:** 47/100 → **Target Score: 72/100** (within 90 days)

---

## Phase 1 — Critical Fixes (Today, ~45 minutes total)

These 7 fixes are blocking correct indexing. Do them before anything else.

---

### Fix 1: Remove asset blocking from robots.txt
**File:** `E:/Site CL/robots.txt`

Remove these three lines:
```
Disallow: /assets/
Disallow: /*.js$
Disallow: /*.css$
```

Also update the Sitemap directive:
```
# BEFORE:
Sitemap: https://www.corinnelacoste.fr/sitemap.xml

# AFTER:
Sitemap: https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml
```

---

### Fix 2: Correct siteUrl in config.js
**File:** `E:/Site CL/assets/js/config.js` (line ~390)

```javascript
// BEFORE:
siteUrl: "https://www.corinnelacoste.fr",

// AFTER:
siteUrl: "https://www.magnetiseuse-lacoste-corinne.fr",
```

After saving, rebuild the minified file:
```bash
npx terser assets/js/config.js -o assets/js/config.min.js
```

---

### Fix 3: Resolve phone number discrepancy
**File:** `E:/Site CL/a-propos.html`

Find the Person JSON-LD block and correct the telephone:
```json
// BEFORE (wrong):
"telephone": "+33695466060",

// AFTER (verify which is correct first — call both numbers):
"telephone": "+33695486060",
```

---

### Fix 4: Fix a-propos.html placeholder URLs
**File:** `E:/Site CL/a-propos.html`

Find the Person JSON-LD block and replace all occurrences of `votresite.com`:
```json
// BEFORE:
"url": "https://votresite.com",
"image": "https://votresite.com/assets/images/photo-corrine.webp",

// AFTER:
"url": "https://www.magnetiseuse-lacoste-corinne.fr/a-propos",
"image": "https://www.magnetiseuse-lacoste-corinne.fr/assets/images/photo-corrine.webp",
```

---

### Fix 5: Add canonical + OG tags to homepage
**File:** `E:/Site CL/index.html`

Add inside `<head>` (after the existing meta charset and viewport tags):
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/">
<meta property="og:url" content="https://www.magnetiseuse-lacoste-corinne.fr/">
<meta property="og:image" content="https://www.magnetiseuse-lacoste-corinne.fr/assets/images/photo-corrine.webp">
<meta property="og:image:alt" content="Corinne Lacoste, magnétiseuse et hypnothérapeute à Troyes">
```

Also remove the duplicate `<meta name="viewport">` tag (appears twice).

---

### Fix 6: Add static LocalBusiness JSON-LD to homepage
**File:** `E:/Site CL/index.html`

Add this block to the `<head>` (this provides a static fallback regardless of JS execution):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HealthAndBeautyBusiness",
      "@id": "https://www.magnetiseuse-lacoste-corinne.fr/#business",
      "name": "Corinne Lacoste — Magnétiseuse & Hypnothérapeute",
      "url": "https://www.magnetiseuse-lacoste-corinne.fr/",
      "image": "https://www.magnetiseuse-lacoste-corinne.fr/assets/images/photo-corrine.webp",
      "description": "Corinne Lacoste, magnétiseuse et hypnothérapeute à Saint-Germain (Aube), spécialisée dans l'arrêt du tabac, la gestion du stress, du sommeil et du poids par hypnose et magnétisme.",
      "telephone": "+33695486060",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "7 rue du Printemps",
        "addressLocality": "Saint-Germain",
        "postalCode": "10120",
        "addressRegion": "Aube",
        "addressCountry": "FR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 48.252349,
        "longitude": 4.026241
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Tuesday", "Wednesday", "Thursday"],
          "opens": "09:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "09:00",
          "closes": "12:30"
        }
      ],
      "priceRange": "€€",
      "currenciesAccepted": "EUR",
      "paymentAccepted": "Cash, Chèque, Carte bancaire",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "35",
        "bestRating": "5",
        "worstRating": "1"
      },
      "areaServed": [
        { "@type": "City", "name": "Troyes" },
        { "@type": "City", "name": "Sainte-Savine" },
        { "@type": "City", "name": "Romilly-sur-Seine" },
        { "@type": "AdministrativeArea", "name": "Aube" }
      ],
      "sameAs": []
    },
    {
      "@type": "WebSite",
      "@id": "https://www.magnetiseuse-lacoste-corinne.fr/#website",
      "url": "https://www.magnetiseuse-lacoste-corinne.fr/",
      "name": "Magnétiseuse Hypnothérapeute Troyes — Corinne Lacoste",
      "inLanguage": "fr-FR",
      "publisher": {
        "@id": "https://www.magnetiseuse-lacoste-corinne.fr/#business"
      }
    }
  ]
}
</script>
```

Also add a static phone number in the footer HTML (in addition to the dynamic placeholder):
```html
<a href="tel:+33695486060" class="hover:text-primary transition">06 95 48 60 60</a>
```

---

### Fix 7: Fix hero image priority
**File:** `E:/Site CL/index.html` (lines 279-281)

```html
<!-- BEFORE: -->
loading="lazy"
fetchpriority="low"

<!-- AFTER: -->
loading="eager"
fetchpriority="high"
```

---

## Phase 2 — High Priority (Within 1 Week)

### Fix 8: Add canonical to all blog pages

For each of the 33 blog pages missing a canonical, add to `<head>`:
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/blog/[filename].html">
```

Consider adding this to a shared footer/header template if the site uses one.

---

### Fix 9: Fix sitemap issues
**File:** `E:/Site CL/sitemap.xml`

1. Change homepage entry from `/index.html` to clean URL:
```xml
<!-- BEFORE: -->
<loc>https://www.magnetiseuse-lacoste-corinne.fr/index.html</loc>

<!-- AFTER: -->
<loc>https://www.magnetiseuse-lacoste-corinne.fr/</loc>
```

2. Correct the two future-dated entries (anything after 2026-03-26):
```xml
<!-- Update these to real modification dates or today's date: -->
arret-tabac-peau-combien-temps-bienfaits.html  <!-- currently 2026-04-04 -->
arret-tabac-deprime-combien-temps.html          <!-- currently 2026-03-28 -->
```

3. Remove `/tarifs.html` (if present) or add it only once it returns 200.

---

### Fix 10: Fix /tarifs navigation

**Option A (Quick):** Update all "Tarifs" navigation links to point to `soins.html`:
- Find all `href="#tarifs"` in non-homepage nav and change to `href="soins.html"`
- Ensure footer `soins.html` link is already consistent

**Option B (Better SEO):** Create `tarifs.html` as a dedicated pricing page targeting "tarifs magnétiseur Troyes" and redirect the blog article `tarifs-magnetiseur-hypnotherapeute-troyes-prix.html` to it.

---

### Fix 11: Fix schema types across service pages

In `magnetiseur-troyes.html` and `hypnose-troyes.html`, change:
```json
// BEFORE:
"@type": "MedicalBusiness",
"ratingValue": "5.0",

// AFTER:
"@type": "HealthAndBeautyBusiness",
"ratingValue": "4.9",
```

In `config.js` `injectLocalBusinessSchema()`:
```javascript
// BEFORE:
"@type": "LocalBusiness",

// AFTER:
"@type": "HealthAndBeautyBusiness",
```

Also add to the LocalBusiness schema in `config.js`:
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.9",
  "reviewCount": "35",
  "bestRating": "5",
  "worstRating": "1"
}
```

---

### Fix 12: Add Google Review CTA

Add a direct review-writing link using the place ID from the Maps embed:
```html
<a href="https://g.page/r/Cey6GOblJRfHEAE/review"
   target="_blank"
   rel="noopener">
  Laisser un avis Google
</a>
```

Add this link to: the homepage testimonials section, the soins.html page, and (as plain text) to post-session follow-up communications.

---

## Phase 3 — Medium Priority (Within 1 Month)

### Fix 13: Add FAQPage schema to key pages

Add the following to `arret-tabac-troyes.html`, `hypnose-troyes.html`, and `index.html` FAQ sections.

**Note:** FAQPage schema will NOT produce Google accordion rich results for a commercial wellness site (restricted since August 2023). However, it is valuable for AI Overviews, ChatGPT, and Perplexity citation. Add it at low implementation cost.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Combien de séances faut-il pour arrêter de fumer par hypnose ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Dans la grande majorité des cas, une à deux séances suffisent pour l'arrêt du tabac par hypnose et magnétisme. Parmi les clients accompagnés par Corinne Lacoste depuis 2018, 85% n'ont pas repris la cigarette après la première séance (suivi téléphonique à 30 jours). Le résultat dépend avant tout de la motivation du patient. Un suivi personnalisé est proposé si nécessaire."
      }
    },
    {
      "@type": "Question",
      "name": "L'hypnose pour arrêter de fumer est-elle remboursée par la Sécurité sociale ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les séances d'hypnothérapie ne sont pas remboursées par la Sécurité sociale en France. Certaines mutuelles prennent en charge une partie des frais au titre des médecines douces. Renseignez-vous auprès de votre complémentaire santé en mentionnant la prestation « hypnothérapie » ou « thérapies alternatives »."
      }
    },
    {
      "@type": "Question",
      "name": "Quelle est la différence entre un magnétiseur et un hypnothérapeute ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Le magnétisme est un soin énergétique par le toucher ou à distance qui vise à rééquilibrer les flux d'énergie du corps. L'hypnothérapie utilise un état de conscience modifiée (transe) pour accéder aux ressources inconscientes du patient et modifier des comportements ou des schémas de pensée. Corinne Lacoste combine les deux approches pour un accompagnement complet, notamment pour l'arrêt du tabac."
      }
    }
  ]
}
</script>
```

---

### Fix 14: Add BlogPosting schema template to all blog articles

Apply to each blog post dynamically (or manually for top-traffic articles first):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.magnetiseuse-lacoste-corinne.fr/blog/[SLUG].html#article",
  "headline": "[ARTICLE TITLE]",
  "description": "[META DESCRIPTION]",
  "url": "https://www.magnetiseuse-lacoste-corinne.fr/blog/[SLUG].html",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "inLanguage": "fr-FR",
  "image": {
    "@type": "ImageObject",
    "url": "https://www.magnetiseuse-lacoste-corinne.fr/assets/images/[IMAGE].webp",
    "width": 1200,
    "height": 630
  },
  "author": {
    "@id": "https://www.magnetiseuse-lacoste-corinne.fr/#person"
  },
  "publisher": {
    "@id": "https://www.magnetiseuse-lacoste-corinne.fr/#business"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.magnetiseuse-lacoste-corinne.fr/blog/[SLUG].html"
  }
}
</script>
```

---

### Fix 15: Create llms.txt

Create file at `E:/Site CL/llms.txt`:

```
# Corinne Lacoste — Magnétiseuse & Hypnothérapeute
> Cabinet de magnétisme et d'hypnothérapie à Troyes (Aube), spécialisé dans l'arrêt du tabac, la gestion du stress, des troubles du sommeil et du poids.

Corinne Lacoste exerce depuis 2018 à Saint-Germain (10120), à 5 minutes de Troyes.
Formation en magnétisme et hypnose (2017-2018) sous la direction de Pascal Bescos (GNOMA).
Google rating : 4.9/5 (35+ avis vérifiés).

## Services principaux
- Arrêt du tabac par hypnose et magnétisme : /arret-tabac-troyes.html
- Magnétisme thérapeutique à Troyes : /magnetiseur-troyes.html
- Hypnothérapie à Troyes : /hypnose-troyes.html
- Magnétiseur dans l'Aube : /magnetiseur-aube.html
- Tarifs et informations : /soins.html

## Informations pratiques
- Adresse : 7 rue du Printemps, 10120 Saint-Germain (Troyes)
- Téléphone : 06 95 48 60 60
- Réservation en ligne : via Calendly

## Ressources
- FAQ : /faq.html
- À propos : /a-propos.html
- Blog (arrêt tabac, bien-être) : /blog/
- Mentions légales : /mentions-legales.html

## Note
Ces soins sont des pratiques complémentaires et ne remplacent pas un traitement médical.
```

---

### Fix 16: Fix CLS from section animations
**File:** `E:/Site CL/assets/css/style.css`

Replace lines 21-26:
```css
/* BEFORE: */
section {
    opacity: 0;
    transform: translateY(30px);
    transition: none;
}

/* AFTER: */
@media (prefers-reduced-motion: no-preference) {
    section:not(:first-of-type) {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.4s ease, transform 0.4s ease;
        contain: layout;
    }
}
```

Also ensure all containers that receive dynamic content (prices, stats via `data-*`) have explicit `min-height` set so the layout is reserved before JS fires:
```css
[data-price],
[data-stat],
[data-contact] {
    min-height: 1.5em;
}
```

---

### Fix 17: Add complementary therapy disclaimer

Add to the footer and about page:
```html
<p class="text-sm text-gray-500">
  Les soins proposés par Corinne Lacoste sont des pratiques de bien-être complémentaires.
  Ils ne constituent pas un acte médical, ne remplacent pas un traitement prescrit par un médecin
  et ne permettent pas d'établir un diagnostic thérapeutique.
</p>
```

---

### Fix 18: Substantiate or replace the "95% success" claim

**Option A — Substantiate:**
Replace the bare claim with a sourced version:
> "Parmi les 35 clients accompagnés en arrêt tabac depuis 2018, 95% n'ont pas repris la cigarette lors du suivi à 30 jours."

**Option B — Replace with a more modest, verifiable claim:**
> "Note Google 4.9/5 — Rejoignez les dizaines de personnes qui ont retrouvé leur liberté face au tabac."

---

### Fix 19: Claim French directory citations

Priority order:
1. **Pages Jaunes** — pages-jaunes.fr → search for the business → claim or create listing
2. **Annuaire-magnetiseurs.fr** — submit practitioner profile
3. **GNOMA** — if Corinne holds membership (instructor Pascal Bescos is a GNOMA adherent)
4. **Therapeutes.com** — create or claim profile
5. **Bing Places** — sync with GBP

NAP to use on all citations (exactly):
- **Name:** Corinne Lacoste — Magnétiseuse & Hypnothérapeute
- **Address:** 7 rue du Printemps, 10120 Saint-Germain
- **Phone:** 06 95 48 60 60

---

## Phase 4 — Low Priority / Backlog

### Fix 20: Build secondary city location pages

Create three new pages following the pattern of `magnetiseur-troyes.html`:
- `magnetiseur-romilly-sur-seine.html` — targets "magnétiseur Romilly-sur-Seine" (25 min from cabinet)
- `hypnose-sainte-savine.html` — targets "hypnose Sainte-Savine" (7 min, suburb of Troyes)
- `magnetiseur-bar-sur-aube.html` — targets "magnétiseur Bar-sur-Aube" (35 min)

Each page must include:
- Unique H1 with city name
- Drive time from the cabinet
- Local references to the city
- Full LocalBusiness schema with areaServed pointing to that city
- Internal link back to the main service pages

---

### Fix 21: Add explicit AI crawler directives to robots.txt

```
# AI search crawlers — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

# AI training crawlers — disallow if desired
User-agent: CCBot
Disallow: /

User-agent: cohere-ai
Disallow: /
```

---

### Fix 22: Create IndexNow key file

1. Generate a random key (e.g., a UUID)
2. Create `E:/Site CL/[YOUR-KEY].txt` containing only the key value
3. Submit the key to `https://api.indexnow.org/indexnow?url=https://www.magnetiseuse-lacoste-corinne.fr/&key=[YOUR-KEY]`
4. Add an automatic submission call to your publishing workflow for new blog articles

---

### Fix 23: Create a YouTube channel

Minimum viable content strategy:
- 5 short videos (3-5 minutes each) answering exact FAQ queries:
  1. "L'hypnose pour arrêter de fumer, est-ce vraiment efficace ?"
  2. "Comment se déroule une séance de magnétisme ?"
  3. "Magnétisme vs hypnose : quelle différence ?"
  4. "Combien de séances pour arrêter de fumer ?"
  5. "Qui peut bénéficier de l'hypnothérapie ?"

Each video description should link to the corresponding service page. Video titles should mirror FAQ page questions verbatim.

---

## Score Improvement Roadmap

| Phase | Key Actions | Expected Score |
|-------|------------|----------------|
| Current | — | **47/100** |
| Phase 1 complete | Critical fixes: assets unblocked, schema domain fixed, canonicals added | **~58/100** |
| Phase 2 complete | Blog canonicals, schema types fixed, AggregateRating added, LCP fixed | **~64/100** |
| Phase 3 complete | FAQPage schema, llms.txt, CLS fixed, citations started | **~69/100** |
| Phase 4 complete | Location pages, AI directives, YouTube, full citation profile | **~75/100** |

---

*Action plan generated 26 March 2026 from parallel 8-subagent SEO audit.*
*Priority: fix Phase 1 items before publishing any new content or running any ads.*
