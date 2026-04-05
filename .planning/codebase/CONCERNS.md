# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Hardcoded prices in blog articles (14 files):**
- Issue: 14 blog articles contain hardcoded euro amounts (e.g., `120-240€`, `180€`, `212€`) instead of using `data-price="tabac"` dynamic tokens. If the price in `config.js` changes, these pages will show stale figures.
- Files: `blog/allen-carr-arreter-fumer-livre-avis.html`, `blog/hypnose-pour-arret-du-tabac-guide-complet.html`, `blog/hypnose-arret-tabac-cabinet-saint-germain-troyes.html`, `blog/gommes-nicorette-arret-tabac-efficacite.html`, `blog/douleurs-chroniques-magnetiseur-troyes-soulage.html`, `blog/cigarette-electronique-arreter-fumer-efficacite.html`, `blog/arreter-fumer-sans-medicaments-methodes-naturelles.html`, `blog/arret-tabac-patch-meilleurs-comparatif.html`, `blog/arret-tabac-par-hypnose-avis-temoignages.html`, `blog/arret-tabac-aube-methodes-naturelles-troyes.html`, `blog/acupuncture-arret-tabac-efficacite-avis.html`, `blog/substituts-nicotiniques-comparatif-efficacite.html`, `blog/magnetisme-arret-tabac-troyes-temoignages.html`, `blog/tarifs-magnetiseur-hypnotherapeute-troyes-prix.html`
- Impact: Price mismatch between pages and `config.js` confuses users and breaks trust. SEO inconsistency.
- Fix approach: Replace hardcoded amounts with `<span data-price="tabac"></span>` tokens per `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md`. Some amounts in comparison tables (competitor prices, book prices) can stay hardcoded as they are not Corinne's prices.

**Inconsistent schema @type on service pages:**
- Issue: `arret-tabac-troyes.html` uses `"@type": "MedicalBusiness"` and `"ratingValue": "5.0"`, while `magnetiseur-troyes.html` and `hypnose-troyes.html` correctly use `"HealthAndBeautyBusiness"`. Google may flag `MedicalBusiness` as inaccurate for a non-medical practitioner.
- Files: `arret-tabac-troyes.html` (lines ~943–958)
- Impact: Wrong schema type can suppress rich results; inflated 5.0 rating is inaccurate (actual 4.9).
- Fix approach: Change `"@type": "MedicalBusiness"` → `"HealthAndBeautyBusiness"` and `"ratingValue": "5.0"` → `"4.9"` in `arret-tabac-troyes.html`.

**Schema on index.html generated dynamically (fragile):**
- Issue: `index.html` comments indicate schema is injected by `config.min.js` at runtime. If JS fails to load or is blocked, Google crawls a page with no structured data. Two separate comment blocks at lines ~51 and ~1019 suggest possible duplication or dead code.
- Files: `index.html`
- Impact: Schema-dependent rich results (stars, address) absent for JS-blocked crawlers.
- Fix approach: Add a static JSON-LD fallback in the `<head>` as described in PHASE 2 of `SEO_WORKFLOW.md`.

**Duplicate pages at root vs. blog/ directory:**
- Issue: Several pages exist both at the root and inside `blog/`:
  - `E:/Site CL/guide-complet-arret-tabac-troyes.html` (root, in sitemap) AND `blog/guide-complet-arret-tabac-troyes.html` (canonical points to root URL)
  - `E:/Site CL/arret-tabac-timeline-jour-par-jour.html` (root, in sitemap) AND `blog/arret-tabac-timeline-jour-par-jour.html` (canonical points to root URL)
- Files: Root-level `guide-complet-arret-tabac-troyes.html`, `arret-tabac-timeline-jour-par-jour.html`; `blog/` copies of same.
- Impact: Duplicate content signal to Google even with canonical tags; confusing internal structure; untracked files in git suggest they are not committed.
- Fix approach: Pick canonical location (`blog/` preferred), redirect root version with a 301 or remove it. Ensure only one version is committed and in sitemap.

**`data-blog-list="related"` present in only 62 of 65 blog articles:**
- Issue: 3 blog files lack the related-articles block required by `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md`.
- Files: Check `blog/` for files missing `data-blog-list="related"` — approximately `blog/arret-tabac-timeline-jour-par-jour.html`, `blog/guide-complet-arret-tabac-troyes.html`, and one other.
- Impact: Internal linking broken on those articles; reduced crawl depth and PageRank flow.
- Fix approach: Add the standard related-articles block before `</main>` on missing files.

---

## Known Bugs

**Phone number inconsistency (unresolved):**
- Symptoms: `a-propos.html` JSON-LD contains `+33695466060`; `config.js` and `hypnose-troyes.html` contain `+33695486060`. These differ by two digits (466 vs 486).
- Files: `a-propos.html` (line ~488), `assets/js/config.js`, `hypnose-troyes.html` (line ~96)
- Trigger: Any click-to-call or Google Business call from `a-propos.html` will dial a wrong number.
- Workaround: `config.js` drives most pages dynamically; only `a-propos.html` JSON-LD is wrong. Needs human verification of the correct number before fixing.

**`blog/arret-tabac-timeline-jour-par-jour.html` canonical mismatch:**
- Symptoms: The blog copy's canonical points to the root URL (`/arret-tabac-timeline-jour-par-jour.html`), but the root file is untracked/uncommitted. The sitemap lists the root URL, not the blog URL.
- Files: `blog/arret-tabac-timeline-jour-par-jour.html`, `sitemap.xml`
- Trigger: Google may index neither version or both, causing duplicate content penalty.
- Workaround: None currently. Needs decision on canonical home.

**`landing-tabac.html` canonical points to a different page:**
- Symptoms: `landing-tabac.html` has `<link rel="canonical" href=".../arret-tabac-troyes.html">` — it canonicalises to a completely different page.
- Files: `landing-tabac.html`
- Impact: If Google respects this, landing-tabac.html is treated as a duplicate of arret-tabac-troyes.html and will never rank independently.
- Fix approach: Either give it its own canonical or confirm it is intentionally a shadow page (and add `noindex`).

---

## Security Considerations

**`test-config.html` publicly accessible (partially):**
- Risk: Exposes site configuration details, pricing structure, and potentially API keys or config values to public.
- Files: `test-config.html` (root)
- Current mitigation: `robots.txt` includes `Disallow: /test-config.html` — but robots.txt is advisory only, not access control.
- Recommendations: Either delete the file or add server-side `.htaccess` protection. Do not rely on robots.txt alone.

**`autopilot/` and `.seo-engine/` not blocked by robots.txt:**
- Risk: `autopilot/` contains a Node.js app with `node_modules/`, dashboard login page, and potential API keys. `.seo-engine/` contains strategy data. Both are in the web root and crawlable.
- Files: `autopilot/`, `.seo-engine/`, `.social-engine/`, `.superpowers/`
- Current mitigation: None — these directories are not listed in `robots.txt` Disallow.
- Recommendations: Add `Disallow: /autopilot/`, `Disallow: /.seo-engine/`, `Disallow: /.social-engine/`, `Disallow: /.superpowers/` to `robots.txt`. Add server-side protection if these are deployed.

**`BingSiteAuth.xml` exposed at root:**
- Risk: Bing site verification token is publicly readable. Low risk but confirms site ownership to attackers.
- Files: `BingSiteAuth.xml`
- Current mitigation: None.
- Recommendations: Keep as-is (required for Bing Webmaster Tools), but ensure no other sensitive verification files are present.

---

## Performance Bottlenecks

**Hero image LCP on index.html — RESOLVED per audit:**
- Problem: Previously had `loading="lazy" fetchpriority="low"` on the above-the-fold hero image, which delayed Largest Contentful Paint.
- Files: `index.html` (lines ~279–281)
- Current state: Confirmed fixed (`loading="eager" fetchpriority="high"` per SEO_WORKFLOW.md Phase 1 Step 6). Verify in production.

**65 blog articles with no shared JS bundle caching:**
- Problem: Each blog page loads `config.min.js`, `main.min.js`, and `tailwind.css` independently. No HTTP/2 push or preload hints observed.
- Files: All `blog/*.html`
- Impact: First-visit load time on blog pages is higher than necessary.
- Improvement path: Add `<link rel="preload">` for `config.min.js` and `main.min.js` in blog article `<head>`. This is a minor optimization given static hosting.

---

## Fragile Areas

**`config.js` / `config.min.js` sync:**
- Files: `assets/js/config.js`, `assets/js/config.min.js`
- Why fragile: Every price or contact update requires manually running `npx terser assets/js/config.js -o assets/js/config.min.js -c -m`. If forgotten, live site shows stale data. No build pipeline enforces this.
- Safe modification: Always run the terser command immediately after editing `config.js`. Check `config.min.js` was modified before deploying.
- Test coverage: None — no automated check that min and source are in sync.

**`SITE_CONFIG.blog` array in `config.js` (order-sensitive):**
- Files: `assets/js/config.js`
- Why fragile: The blog listing and "related articles" widget depend on this array. New articles must be inserted in first position. If inserted in wrong position or duplicated, blog lists render in wrong order. No schema validation.
- Safe modification: Always prepend (never append) new entries. Verify array has no duplicate slugs after editing.

**Tailwind CSS pre-built file (not generated on demand):**
- Files: `assets/css/tailwind.css` (pre-built, not from PostCSS/JIT)
- Why fragile: Many utility classes are missing from the pre-built file (grid-cols, line-through, specific colors). New pages that use missing classes will silently show broken layout.
- Safe modification: Check `assets/css/tailwind.css` for the specific class before using it in any new HTML. Use only classes already present or add them via a `<style>` block.
- Test coverage: None — visual regression only.

---

## Scaling Limits

**Static HTML — no templating engine:**
- Current capacity: 101 HTML files managed manually.
- Limit: Adding shared components (nav, footer, schema) requires editing every file individually. At 100+ pages, any global change (e.g., phone number update, footer link) requires a mass find-replace across all files.
- Scaling path: Introduce a static site generator (e.g., Eleventy, Hugo) or at minimum a build script that injects shared partials. Currently mitigated by `config.js` for dynamic data, but structural HTML is still duplicated.

---

## Dependencies at Risk

**`autopilot/node_modules/` committed to site root:**
- Risk: `node_modules/` from the autopilot app appears to be in the web-accessible root at `E:/Site CL/autopilot/node_modules/`. If deployed to SFTP as-is, thousands of JS files are publicly served and crawlable.
- Impact: Server load, crawl budget waste, potential exposure of internal package details.
- Migration plan: Add `autopilot/node_modules/` to `.gitignore` and to `robots.txt` Disallow. Keep autopilot as a separate deployment, not co-located with the static site.

**Tailwind CSS CDN-less pre-built approach:**
- Risk: Pre-built `tailwind.css` is a snapshot — Tailwind security patches or upstream changes require manual rebuild.
- Impact: Low risk for a static marketing site, but class coverage gaps cause silent layout bugs (see Fragile Areas).

---

## Missing Critical Features

**No 301 redirects infrastructure:**
- Problem: Duplicate pages (root vs. blog/) and the landing-tabac.html canonical issue cannot be properly resolved without server-side redirects. The IONOS 1&1 SFTP hosting must support `.htaccess` for Apache redirects, but no `.htaccess` file exists in the project.
- Blocks: Proper canonical consolidation for duplicate pages.

**No automated sitemap update:**
- Problem: `sitemap.xml` must be manually edited every time a blog article is published. No script or build step automates this. With 65+ blog articles, omissions are likely.
- Files: `sitemap.xml`
- Risk: New articles not in sitemap = slower Google discovery.

**No Google Search Console ping after deploy:**
- Problem: `gsc-ping.js` is referenced in memory notes as part of the deploy pipeline but does not appear to be integrated into a deploy script. Manual GSC URL inspection is required after each publish.
- Files: Reference in `reference_gsc_indexing_api.md` memory; no `deploy.sh` or equivalent found.

---

## Test Coverage Gaps

**No automated tests of any kind:**
- What's not tested: HTML validity, broken internal links, missing canonical tags, schema markup correctness, price consistency between `config.js` and hardcoded values in blog posts.
- Files: All `*.html`, `assets/js/config.js`
- Risk: Regressions in schema, pricing display, or internal links go unnoticed until manual review.
- Priority: Medium — add a pre-deploy link checker (e.g., `html-validate`, `broken-link-checker`) as a `package.json` script.

**No visual regression testing:**
- What's not tested: Tailwind class rendering gaps, layout on mobile vs desktop, scroll animations.
- Risk: Missing Tailwind classes cause silent layout breaks on new pages.
- Priority: Low for current scale.

---

*Concerns audit: 2026-04-05*
