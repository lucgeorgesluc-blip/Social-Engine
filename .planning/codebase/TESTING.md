# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:** None configured

`package.json` contains:
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

No test framework is installed. No `jest.config.*`, `vitest.config.*`, `cypress.config.*`, or `.spec.*` / `.test.*` files exist in the project.

**There is no automated test suite for this codebase.**

---

## Build Scripts (only automated tooling present)

```bash
npm run build:css    # tailwindcss -i assets/css/tailwind-src.css -o assets/css/tailwind.css --minify
```

```bash
npx terser assets/js/config.js -o assets/js/config.min.js -c -m    # Minify config after changes
```

---

## Manual Verification Checklist (used instead of tests)

The project uses a documented manual checklist in `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md`. After creating any blog article, verify:

- [ ] `blog/[slug].html` created with correct structure
- [ ] Entry added as first item in `SITE_CONFIG.blog` in `assets/js/config.js`
- [ ] `config.min.js` regenerated with terser
- [ ] URL added in `sitemap.xml` (first position in blog section)
- [ ] `data-blog-list="related"` block present with correct `data-blog-current` attribute
- [ ] `data-price="tabac"` used (no hardcoded price amounts)
- [ ] No mention of rTMS
- [ ] Schema FAQPage has `"name"` property
- [ ] Featured image at `assets/images/blog/[slug].webp` (800×450)
- [ ] `og:image` uses absolute URL
- [ ] Canonical URL set correctly
- [ ] Files uploaded via SFTP to production server
- [ ] URL inspected in Google Search Console

---

## SEO/Config Validation

`test-config.html` exists at project root — this is a manual browser-based config test page used to verify that `config.js` / `config.min.js` load correctly and that `data-*` attribute injection works. It is explicitly blocked from Google indexing via `robots.txt` (`Disallow: /test-config.html`).

---

## What to Test When Making Changes

Since there is no automated testing, follow these manual checks:

**When modifying `config.js`:**
1. Run `npx terser assets/js/config.js -o assets/js/config.min.js -c -m`
2. Open `test-config.html` in browser and verify `data-price`, `data-contact` attributes render correctly
3. Check that the related articles block on any blog page still populates

**When modifying `main.js`:**
1. Run `npx terser assets/js/main.js -o assets/js/main.min.js -c -m` (if minified version is used)
2. Test nav scroll behavior, cookie consent banner, and CTA click tracking in browser
3. Check browser console for errors

**When modifying Tailwind (`tailwind-src.css`):**
1. Run `npm run build:css`
2. Visually verify layout on key pages: `index.html`, one blog article, `paiement.html`
3. Check mobile breakpoints (nav hamburger, grid columns)

**When adding a new HTML page:**
1. Validate JSON-LD schema with Google's Rich Results Test
2. Check canonical URL is set
3. Check meta description length (≤ 160 chars)
4. Verify `data-price` attributes resolve (not showing raw placeholder text)
5. Test mobile menu works (Alpine.js `x-data` present on `<nav>`)

---

## Known Testing Gaps

- No unit tests for JavaScript utilities in `main.js` (`formatPhoneNumber`, `scrollToTop`)
- No integration tests for `config.js` data injection (`data-price`, `data-contact`, `data-blog-list`)
- No E2E tests for user flows (booking via Calendly widget, cookie consent accept/decline)
- No automated accessibility checks (WCAG)
- No automated performance regression tests (Core Web Vitals)
- No automated broken-link checking across the ~60+ HTML pages
- Schema markup correctness is manually verified via Google Rich Results Test

---

## If You Add Testing

Recommended approach for this static HTML project:

**Unit tests (JS utilities):**
- Use Vitest (zero-config, fast): `npm install -D vitest`
- Test files: `assets/js/__tests__/config.test.js`

**E2E tests:**
- Use Playwright: `npm install -D @playwright/test`
- Test scenarios: cookie consent flow, Calendly widget load, `data-price` injection, mobile nav

**Link checking:**
- Use `broken-link-checker` or `lychee` as a CI step

**Schema validation:**
- Automate via Google's Rich Results Test API or `schema-dts` validator

---

*Testing analysis: 2026-04-05*
