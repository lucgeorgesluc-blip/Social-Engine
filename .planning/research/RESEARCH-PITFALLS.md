# PITFALLS Research: SEO Page Audit & Auto-Patch System

**Project:** magnetiseuse-lacoste-corinne.fr — SEO Autopilot
**Context:** Subsequent milestone — auto-patch system that modifies production HTML and deploys via SFTP
**Site profile:** ~30 static HTML files, Tailwind CSS + Alpine.js, JSON-LD schemas, French language
**Researched:** 2026-04-01
**Overall Confidence:** HIGH (site code directly inspected; supplemented with targeted web research)

---

## Executive Summary

Auto-patching production HTML is high-consequence work. The site uses Alpine.js reactive attributes, multiple JSON-LD schema blocks per page, dynamically-injected schemas (config.min.js), and Tailwind utility classes — all of which have specific failure modes when HTML is modified programmatically. The original bug (suggesting to create a page that already existed) was a **read-before-write** failure. This document maps every failure mode in the patch lifecycle and provides concrete mitigations.

The single most important finding: **a silent failure is more dangerous than a visible crash.** Malformed JSON-LD and broken canonical tags do not produce 500 errors — the page loads normally, and Google silently ignores the broken schema or drops the page from results. Detecting silent failures requires explicit post-patch validation, not just "does the page respond 200."

---

## 1. Failure Modes When Auto-Patching HTML Files

### 1.1 Malformed JSON-LD (CRITICAL)

**What goes wrong:** A patch inserts or modifies a `<script type="application/ld+json">` block with invalid JSON. A single missing comma, unclosed bracket, unescaped quotation mark, or trailing comma silently breaks the entire schema block.

**Why it happens:**
- String interpolation into JSON (e.g., article titles with apostrophes `l'arrêt` or double quotes) without proper escaping
- Concatenating JSON fragments as raw strings instead of building objects first then serializing
- Patching inside an existing JSON-LD block with regex (fragile against whitespace and newline variations)

**Consequences for this site:**
- Google silently ignores the broken schema block — no error in Search Console until next crawl
- AggregateRating stars disappear from search results (major CTR drop)
- FAQPage rich results lost
- The page continues to load normally — no visible sign of breakage

**Correct pattern:**
```javascript
// WRONG — string interpolation into JSON
const schema = `{"@type": "FAQPage", "name": "${title}"}`;

// CORRECT — build object, validate, then serialize
const schema = { "@type": "FAQPage", "name": title };
JSON.parse(JSON.stringify(schema)); // round-trip validates serialization
const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
```

**Detection:** Run `JSON.parse()` on every extracted JSON-LD block after patching. If it throws, the patch has failed.

**Sources:** [Common Structured Data Errors](https://www.seoclarity.net/blog/structured-data-common-issues), [Malformed JSON-LD — SiteLint](https://www.sitelint.com/docs/seo/malformed-json-ld-found), [JSON-LD Mistakes 2024](https://jemsu.com/what-are-common-mistakes-to-avoid-while-implementing-json-ld-for-seo-in-2024/)

---

### 1.2 Duplicate Schema Tags (CRITICAL)

**What goes wrong:** The patch injects a new JSON-LD block without checking whether one already exists for that `@type`. Result: two `HealthAndBeautyBusiness` blocks on the same page, or two `FAQPage` blocks.

**Why it happens:**
- Patch is not idempotent — running it twice adds the block twice
- Code checks for the block type in the `<head>` but the second block is in the `<body>` (both are valid HTML locations)
- Patch searches for `application/ld+json` but misses the block because it was minified or whitespace differs

**This site's specific risk:** `magnetiseur-troyes.html` already has a `HealthAndBeautyBusiness` block in the `<head>` (line 90) AND a `FAQPage` block in the `<body>` (line 741). An audit patch that injects a new `FAQPage` without checking the body location creates a duplicate.

**Consequences:**
- Google may apply both, apply neither, or apply the one it finds "dominant" — behavior is undefined and can change between crawls
- Conflicting `aggregateRating` values (one says 4.9, another says 5.0) send contradictory signals

**Correct pattern:**
```javascript
// Scan the ENTIRE file for all JSON-LD blocks, not just the <head>
function getAllJsonLdBlocks(html) {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push({ raw: match[0], parsed: JSON.parse(match[1]), position: match.index });
    } catch {
      blocks.push({ raw: match[0], parsed: null, position: match.index, malformed: true });
    }
  }
  return blocks;
}

// Before injecting: check if @type already exists anywhere in the file
function schemaTypeExists(html, type) {
  const blocks = getAllJsonLdBlocks(html);
  return blocks.some(b => b.parsed?.['@type'] === type);
}
```

---

### 1.3 Breaking Alpine.js x-data Attributes (CRITICAL)

**What goes wrong:** A patch modifies content inside or adjacent to an element that has an `x-data` attribute. This breaks Alpine.js initialization for that component.

**Why it happens:**
- Regex-based patching replaces text inside an `x-data="{ ... }"` attribute (e.g., trying to update a value in the reactive state object)
- A patch inserts an element with unescaped double quotes inside an `x-data` value (Alpine.js evaluates x-data as a JavaScript expression, not JSON — HTML attribute parsing breaks on unescaped quotes)
- A patch injects new HTML immediately before/after an element that contains multi-line x-data, confusing the parser

**This site's specific risk:**
- `index.html` line 170: a large multi-line `x-data` object with a typewriter animation (init, startTyping, texts array, etc.)
- `index.html` line 788: `x-data="{ openFaq: null }"` on the FAQ accordion
- `nav` element across all pages: `x-data="{ mobileMenuOpen: false, servicesOpen: false }"`

**Known Alpine.js failure mode:** If x-data contains a JavaScript expression and the patch creates malformed HTML (e.g., an injected `>` or `"` breaks the attribute boundary), Alpine.js throws `SyntaxError: Unexpected token` at initialization. The navigation and all interactive elements on the page stop working. This is a **visible user-facing failure**.

**Mitigation:**
- Never patch inside or within 2 DOM siblings of an element with an `x-data` attribute
- Use a proper HTML parser (parse5 or cheerio) — never regex for structural modifications
- If the patch target is near Alpine.js components, flag for human review instead of auto-applying

---

### 1.4 Breaking Tailwind Class Structure

**What goes wrong:** A patch modifies or removes class attributes, accidentally stripping Tailwind utility classes from an element, or introduces an inline `style` attribute that conflicts with Tailwind classes.

**Why it happens:**
- Regex pattern `class="[^"]*"` used to replace classes replaces the entire class attribute instead of appending/modifying
- Patch adds a `style="..."` inline style that overrides Tailwind responsive classes at certain breakpoints
- Whitespace normalization in the patch engine collapses multi-line class attributes

**Consequences:** Visual layout breaks at specific breakpoints. Hard to detect without visual testing.

**Mitigation:** Auto-patches should never modify existing `class` attributes. Additions should use `<style>` tags only as a last resort and only if the patch target is a newly-injected element.

---

### 1.5 Encoding and Character Set Issues

**What goes wrong:** The French site uses accented characters (`é`, `à`, `ô`, `è`). A patch that reads the file with the wrong encoding, or that fails to write back with UTF-8, can corrupt those characters — both visible to users and potentially breaking JSON-LD strings (French titles in schema name fields).

**Mitigation:**
```javascript
// Always explicit UTF-8
const content = await fs.readFile(filePath, 'utf8');
await fs.writeFile(filePath, patchedContent, 'utf8');
```

---

### 1.6 Half-Written Files (Production Risk)

**What goes wrong:** The patch process writes to the production file directly. If the Node.js process crashes mid-write (OOM, SIGKILL, disk full), the file is left partially written — valid HTML up to the write position, then truncated. The production page serves a broken document.

**Mitigation:** Atomic write pattern — write to a temp file, then rename:
```javascript
const tmpPath = filePath + '.patch.tmp';
await fs.writeFile(tmpPath, patchedContent, 'utf8');
await fs.rename(tmpPath, filePath); // atomic on same filesystem
```
The same pattern applies to SFTP uploads (already noted in pipeline research: `.tmp` → rename).

---

## 2. Safe JSON-LD Schema Injection: Idempotency and Duplicate Detection

### 2.1 The Idempotency Requirement

Every patch must be **idempotent**: running it twice on the same file produces the same result as running it once. Without this, the cron job could accumulate duplicate schemas over multiple runs.

**Implementation:**

```javascript
async function injectSchema(filePath, newSchema) {
  const html = await fs.readFile(filePath, 'utf8');
  const existingBlocks = getAllJsonLdBlocks(html);

  const targetType = newSchema['@type'];

  // 1. Check for exact type match (idempotency — already done)
  const exactMatch = existingBlocks.find(b => b.parsed?.['@type'] === targetType);
  if (exactMatch) {
    // Schema already exists — check if it needs updating or is already correct
    if (JSON.stringify(exactMatch.parsed) === JSON.stringify(newSchema)) {
      console.log(`[inject-schema] ${targetType} already present and identical — no-op`);
      return { action: 'noop', reason: 'already_present_identical' };
    }
    // Schema exists but differs — this is an UPDATE, not an insert, flag for human review
    return { action: 'human_review', reason: 'schema_exists_with_different_values', existing: exactMatch.parsed };
  }

  // 2. Check for malformed block of same type (partial/broken prior patch)
  const malformedMatch = existingBlocks.find(b => b.malformed && b.raw.includes(targetType));
  if (malformedMatch) {
    // Malformed block found — do not inject on top of it, flag for manual repair
    return { action: 'human_review', reason: 'malformed_existing_block' };
  }

  // 3. Safe to inject
  const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(newSchema, null, 2)}\n</script>`;
  // Insert before </head>
  const patched = html.replace('</head>', `${scriptTag}\n</head>`);

  // 4. Verify the injection is unique and parseable in result
  const resultBlocks = getAllJsonLdBlocks(patched);
  const injectedCount = resultBlocks.filter(b => b.parsed?.['@type'] === targetType).length;
  if (injectedCount !== 1) {
    throw new Error(`Injection created ${injectedCount} instances of ${targetType} — aborting`);
  }

  return { action: 'injected', patched };
}
```

### 2.2 Injection Position Priority

When injecting a JSON-LD block, insertion position matters:

| Position | Rule |
|----------|------|
| Before `</head>` | Preferred — Google finds it early in the document |
| Before `</body>` | Acceptable — but check for Alpine.js x-data elements nearby |
| Inside a conditional comment or template | FORBIDDEN — Google may not see it |

**Do not inject inside the `<body>` adjacent to Alpine.js components.** If the only safe insertion point is near an `x-data` element, flag for human review.

### 2.3 Schema Conflict Rules

Specific type conflicts for this site:

| New schema type | Conflict to check |
|----------------|------------------|
| `HealthAndBeautyBusiness` | Already on `magnetiseur-troyes.html`, `hypnose-troyes.html` — patch must UPDATE not ADD |
| `FAQPage` | Already on `magnetiseur-troyes.html` body — check full file, not just head |
| `AggregateRating` | This is a nested property, not a top-level schema — treat as part of the parent object update |
| `Person` | Already in `a-propos.html` — UPDATE only |
| `Article` | Blog articles only — should not exist yet on new articles |

---

## 3. Pre-Patch Validation Checklist

**All checks must pass before writing the patched file to disk. A failed check = no patch applied + human_review flag.**

### 3.1 Structural HTML Validity

```javascript
async function validateHtml(html) {
  const checks = [];

  // 1. Doctype present
  checks.push({
    name: 'has_doctype',
    pass: /^<!DOCTYPE html>/i.test(html.trim()),
    critical: true,
  });

  // 2. <head> and <body> tags present (not stripped by patch)
  checks.push({
    name: 'has_head_body',
    pass: /<head[^>]*>/.test(html) && /<body[^>]*>/.test(html),
    critical: true,
  });

  // 3. Closing tags present
  checks.push({
    name: 'has_closing_tags',
    pass: /<\/head>/.test(html) && /<\/body>/.test(html) && /<\/html>/.test(html),
    critical: true,
  });

  // 4. Tailwind CSS link still present (not accidentally removed)
  checks.push({
    name: 'has_tailwind',
    pass: /assets\/css\/tailwind\.css/.test(html),
    critical: true,
  });

  // 5. Alpine.js script still present
  checks.push({
    name: 'has_alpinejs',
    pass: /alpinejs/.test(html),
    critical: true,
  });

  // 6. Canonical tag count — exactly one
  const canonicalMatches = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/gi) || [];
  checks.push({
    name: 'single_canonical',
    pass: canonicalMatches.length === 1,
    critical: true,
    detail: `Found ${canonicalMatches.length} canonical tags`,
  });

  // 7. No meta robots noindex accidentally introduced
  checks.push({
    name: 'no_accidental_noindex',
    pass: !/<meta[^>]+content=["'][^"']*noindex[^"']*["']/i.test(html),
    critical: true,
  });

  // 8. No duplicate meta charset
  const charsetMatches = html.match(/<meta[^>]+charset[^>]*>/gi) || [];
  checks.push({
    name: 'single_charset',
    pass: charsetMatches.length === 1,
    critical: false,
  });

  return checks;
}
```

### 3.2 JSON-LD Validity

```javascript
function validateAllJsonLd(html) {
  const blocks = getAllJsonLdBlocks(html);
  const results = [];

  for (const block of blocks) {
    if (block.malformed) {
      results.push({ valid: false, position: block.position, error: 'JSON parse failed' });
      continue;
    }

    // Check required fields per @type
    const schema = block.parsed;
    const errors = [];

    if (schema['@type'] === 'FAQPage') {
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
        errors.push('FAQPage.mainEntity is empty or missing');
      }
    }

    if (['HealthAndBeautyBusiness', 'LocalBusiness'].includes(schema['@type'])) {
      if (!schema.name) errors.push('missing name');
      if (!schema.telephone) errors.push('missing telephone');
      if (!schema.address) errors.push('missing address');
    }

    if (schema['@type'] === 'Article') {
      if (!schema.headline) errors.push('missing headline');
      if (!schema.author) errors.push('missing author');
    }

    results.push({ valid: errors.length === 0, position: block.position, errors, type: schema['@type'] });
  }

  return results;
}
```

### 3.3 Site-Specific Content Rules

```javascript
function validateSiteRules(html, slug) {
  const checks = [];

  // No hard-coded euro prices — must use data-price attribute
  const hardPricePattern = /\b\d{2,3}\s*€|\b€\s*\d{2,3}/g;
  const hardPriceMatches = html.match(hardPricePattern) || [];
  checks.push({
    name: 'no_hard_prices',
    pass: hardPriceMatches.length === 0,
    critical: true,
    detail: hardPriceMatches,
  });

  // No rTMS mentions (per project rules)
  checks.push({
    name: 'no_rtms',
    pass: !/rTMS|rtms/i.test(html),
    critical: true,
  });

  // Canonical URL contains correct domain
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    checks.push({
      name: 'canonical_correct_domain',
      pass: canonicalMatch[1].includes('magnetiseuse-lacoste-corinne.fr'),
      critical: true,
      detail: canonicalMatch[1],
    });
  }

  // For blog articles: check data-blog-list="related" block exists
  if (slug && slug.startsWith('blog/')) {
    checks.push({
      name: 'has_related_articles_block',
      pass: /data-blog-list=["']related["']/.test(html),
      critical: false,
    });
  }

  return checks;
}
```

### 3.4 No Broken Internal Links

For patches that inject `<a href="...">` tags, verify that the linked path exists locally before writing. This catches the original bug (suggesting to create a page that already existed, or linking to a page that doesn't exist).

```javascript
async function validateInternalLinks(html, siteRoot) {
  const linkPattern = /<a[^>]+href=["']([^"'#?]+)["']/gi;
  const broken = [];
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    // Only check relative links (not external https://, not anchors)
    if (!href.startsWith('http') && !href.startsWith('//') && !href.startsWith('mailto:')) {
      const localPath = path.join(siteRoot, href.startsWith('/') ? href.slice(1) : href);
      try {
        await fs.access(localPath);
      } catch {
        broken.push({ href, localPath });
      }
    }
  }

  return broken;
}
```

---

## 4. Rollback Strategy

### 4.1 Git-First Rollback (Recommended — MEDIUM confidence)

Since the site is a git repository, the most reliable rollback mechanism is to commit before patching and revert after failure. This also provides a complete audit trail.

**Pattern:**

```javascript
async function safeApplyPatch(filePath, patchFn) {
  // 1. Pre-patch validation (inventory check — original bug fix)
  const exists = await fileExists(filePath);

  // 2. Git: capture pre-patch state
  const commitBefore = execSync('git rev-parse HEAD', { cwd: SITE_ROOT }).toString().trim();

  // 3. Create backup file (belt-and-suspenders)
  const backupPath = filePath + `.backup.${Date.now()}`;
  await fs.copyFile(filePath, backupPath);

  try {
    // 4. Apply patch (atomic write pattern)
    const original = await fs.readFile(filePath, 'utf8');
    const patched = await patchFn(original);

    // 5. Run all validation checks
    const htmlChecks = await validateHtml(patched);
    const jsonLdChecks = validateAllJsonLd(patched);
    const siteChecks = validateSiteRules(patched, filePath);

    const criticalFailures = [
      ...htmlChecks.filter(c => !c.pass && c.critical),
      ...jsonLdChecks.filter(c => !c.valid),
      ...siteChecks.filter(c => !c.pass && c.critical),
    ];

    if (criticalFailures.length > 0) {
      throw new Error(`Validation failed: ${criticalFailures.map(f => f.name || f.type).join(', ')}`);
    }

    // 6. Atomic write
    const tmpPath = filePath + '.patch.tmp';
    await fs.writeFile(tmpPath, patched, 'utf8');
    await fs.rename(tmpPath, filePath);

    // 7. Clean up backup on success
    await fs.unlink(backupPath);

    return { success: true, filePath, commitBefore };

  } catch (err) {
    // 8. Rollback from backup file
    await fs.copyFile(backupPath, filePath);
    await fs.unlink(backupPath);

    // 9. Log to human review queue
    await appendToReviewQueue({ filePath, error: err.message, commitBefore });

    return { success: false, error: err.message, rolledBack: true };
  }
}
```

### 4.2 SFTP Rollback Limitation

SFTP rollback is **not reliable** for this project. The IONOS server cannot atomically swap files. Rollback from SFTP is:

- Possible if you keep the previous version locally (re-upload old file)
- Not guaranteed if the process died mid-upload (file may be truncated)
- Not atomic — a gap of seconds between delete and re-upload exists

**Strategy:** The rollback window is local (before SFTP upload). If validation fails before SFTP, nothing is deployed. If SFTP itself fails mid-way:
1. Re-upload the backup file immediately (in the catch block)
2. Send Telegram alert with the specific file and error
3. Do NOT update content-map or sitemap if SFTP failed

```javascript
// In SFTP deploy step — rollback on partial failure
const uploaded = [];
try {
  for (const file of filesToUpload) {
    await sftp.put(file.local + '.tmp', file.remote + '.tmp');
    await sftp.rename(file.remote + '.tmp', file.remote);
    uploaded.push(file);
  }
} catch (err) {
  // Re-upload previous versions for all successfully uploaded files
  for (const file of uploaded) {
    await sftp.put(file.previousLocal, file.remote).catch(() => {});
  }
  throw err;
}
```

### 4.3 State File for Recovery

Write a `autopilot/state/patch-log.jsonl` before every patch attempt:

```json
{"ts":"2026-04-01T09:00:00Z","file":"magnetiseur-troyes.html","action":"inject-schema","type":"FAQPage","git":"abc1234","status":"started"}
{"ts":"2026-04-01T09:00:02Z","file":"magnetiseur-troyes.html","action":"inject-schema","type":"FAQPage","git":"abc1234","status":"success"}
```

On failure:
```json
{"ts":"2026-04-01T09:00:02Z","file":"magnetiseur-troyes.html","action":"inject-schema","type":"FAQPage","git":"abc1234","status":"failed","error":"Validation: duplicate canonical"}
```

This log is the audit trail for both automated recovery and manual post-mortem.

---

## 5. What Should NEVER Be Auto-Applied Without Human Review

This is the most important section. Auto-patching is appropriate for narrowly-scoped, verifiable, reversible changes. Anything that requires contextual judgment, touches multiple interdependent files simultaneously, or could cause a Google penalty must go to human review.

### 5.1 NEVER Auto-Apply

| Category | Specific case | Why |
|----------|--------------|-----|
| **Content rewrite** | Rewriting `<p>` body text, headings, meta description | Could introduce factual errors, violate E-E-A-T signals, or change the medical/wellness claims in ways Google scrutinizes |
| **AggregateRating values** | Changing ratingValue or reviewCount | Rating inflation is a Google manual action trigger; must reflect reality |
| **Canonical changes** | Changing the canonical URL of an existing page | Can remove pages from Google index permanently |
| **robots meta** | Adding or modifying `meta name="robots"` | A noindex patch on the wrong page = page disappears from Google overnight |
| **Title and H1 changes** | Modifying `<title>` or the primary `<h1>` | These are primary ranking signals; wrong keyword targeting can cause ranking drops |
| **Schema type changes** | Changing `@type` from `LocalBusiness` to `HealthAndBeautyBusiness` | Requires verifying Google's current acceptance of the new type for this business |
| **Internal link removal** | Removing existing internal links | Can degrade link equity flow; may break the site's internal link tree |
| **config.js changes** | Price updates, contact info, SITE_CONFIG.blog ordering | config.js is the source of truth for the entire site — errors propagate everywhere |
| **Multi-file coordinated changes** | Any patch touching 3+ files atomically | If file 3 fails, files 1 and 2 are already modified — complex rollback |
| **New page creation** | Deciding whether a new page is needed | This is the original bug — inventory check must happen first, and the decision to create vs redirect vs add content to existing requires judgment |
| **Hreflang or alternate tags** | Any internationalization markup | Not currently used; accidental addition could confuse Googlebot |
| **Open Graph image changes** | `og:image` URL patches | Requires verifying the image exists at the new URL |

### 5.2 Safe to Auto-Apply (With Full Validation)

| Category | Specific case | Safeguards |
|----------|--------------|------------|
| **New JSON-LD injection** | Adding a FAQPage schema to a page that has none | Idempotency check + JSON.parse validation + no duplicate check |
| **Canonical tag addition** | Adding canonical where none exists | Check: exactly 0 before, exactly 1 after |
| **Image attribute fix** | `loading="lazy"` → `loading="eager"` on hero image | Verify element is the `<img>` in the hero section, not all images |
| **Missing alt text addition** | Adding `alt=""` to decorative images | Only if alt is completely absent; never overwrite existing alt text |
| **Schema field update** | Updating a telephone number in JSON-LD | Only if the new value is explicitly provided and validated as a phone number format |
| **Sitemap URL addition** | Adding a new URL to sitemap.xml | After verifying the file exists on SFTP |

### 5.3 The Human Review Queue

Any patch the system cannot safely auto-apply must be written to a `autopilot/state/review-queue.json` file and surfaced in the dashboard:

```json
[
  {
    "id": "patch-001",
    "file": "magnetiseur-troyes.html",
    "action": "update-aggregate-rating",
    "reason": "Schema exists with different values — manual verification required",
    "proposed_change": { "ratingValue": "4.9", "reviewCount": "38" },
    "current_value": { "ratingValue": "4.9", "reviewCount": "35" },
    "created": "2026-04-01T09:00:00Z",
    "status": "pending"
  }
]
```

Dashboard displays these as a "Pending Review" list with diff view and one-click approve/reject.

---

## 6. Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Page inventory check | False negative — file exists but at different path (trailing slash, `.html` vs no extension) | Normalize paths before comparison; check both `magnetiseur-troyes.html` and `magnetiseur-troyes/index.html` |
| JSON-LD injection | Injecting before `</head>` breaks if there are conditional comments before `</head>` | Parse `</head>` position with cheerio/parse5, not regex |
| Schema update | Overwriting existing schema loses fields not in the patch (e.g., patch updates ratingValue but loses address) | Always merge patch into existing schema, never replace wholesale |
| Multi-file sync | config.js updated but config.min.js regeneration fails (terser error) | Run terser in a try/catch; if it fails, revert config.js and flag for review |
| SFTP partial deploy | 3 of 5 files uploaded before network error | Track uploaded file list; on failure, report exactly which files are live vs old |
| Canonical deduplication | Page already has canonical + patch adds another | Count canonicals before AND after patching; any count > 1 after = abort |
| Alpine.js near patch target | Patch target `<div>` is inside an `x-data` component | Use parse5 to walk the DOM tree; abort if any ancestor or sibling within 2 levels has `x-data` |
| Blog article validation | `data-blog-current` slug doesn't match file slug | Extract slug from `filePath.basename` and cross-check with the data attribute |
| French encoding | `é` becomes `Ã©` after re-encoding | Always specify `'utf8'` in both read and write; validate that accented characters are preserved |

---

## 7. The Original Bug: Insufficient Inventory Check

The bug that motivated this milestone (suggesting to "create a page" when one already existed) is a **read-before-write** failure. The correct pattern:

```javascript
async function auditAndPatch(targetSlug) {
  const SITE_ROOT = 'E:/Site CL';

  // STEP 1: Full inventory before any suggestion or action
  const inventory = await buildPageInventory(SITE_ROOT);
  // inventory = { 'index': 'index.html', 'magnetiseur-troyes': 'magnetiseur-troyes.html', ... }
  // Also includes blog/: { 'arret-tabac': 'blog/arret-tabac.html', ... }

  // STEP 2: Normalize the target slug
  const normalizedSlug = targetSlug
    .replace(/\.html$/, '')
    .replace(/^blog\//, '');

  // STEP 3: Check existence before any action
  const existingFile = inventory[normalizedSlug] || inventory[`blog/${normalizedSlug}`];

  if (existingFile) {
    // Page exists — audit and patch it, never create it
    return { action: 'patch', file: existingFile };
  } else {
    // Page does not exist — creation requires human approval (Out of Scope for auto-patch)
    return { action: 'human_review', reason: 'page_does_not_exist', suggestion: `Create ${normalizedSlug}.html` };
  }
}
```

**Inventory must be built fresh from the filesystem at the start of every run.** Never cache the inventory between runs — new files may have been added manually.

---

## 8. Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Alpine.js failure modes | HIGH | Direct inspection of site code; Alpine.js GitHub issues confirm x-data parse behavior |
| JSON-LD duplicate/malformed risks | HIGH | Verified against site HTML directly; SEO tool documentation confirms silent failure |
| Canonical duplicate risk | HIGH | Google Search Central documentation; AIOSEO documentation |
| SFTP rollback limitations | HIGH | ssh2-sftp-client documentation; IONOS does not support server-side atomic swap |
| "Never auto-apply" list | HIGH | Based on Google's documented manual action triggers + direct site risk analysis |
| Parse5/cheerio HTML manipulation | MEDIUM | npm-compare and GitHub README confirm capabilities; specific edge cases need testing |
| Atomic write via rename | HIGH | Standard POSIX guarantee; Node.js fs.rename is atomic on same filesystem |
| Schema type conflict rules | HIGH | Based on direct inspection of each site page's existing JSON-LD blocks |

---

## Sources

- [Common Structured Data Errors & How to Fix Them — SEO Clarity](https://www.seoclarity.net/blog/structured-data-common-issues)
- [Malformed JSON-LD — SiteLint Documentation](https://www.sitelint.com/docs/seo/malformed-json-ld-found)
- [JSON-LD Mistakes 2024 — JEMSU](https://jemsu.com/what-are-common-mistakes-to-avoid-while-implementing-json-ld-for-seo-in-2024/)
- [Canonicalization — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Block Indexing with noindex — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Duplicate Without User-Selected Canonical — AIOSEO](https://aioseo.com/docs/how-to-fix-the-duplicate-without-user-selected-canonical-error-in-google-search-console/)
- [Alpine.js x-data Docs](https://alpinejs.dev/directives/data)
- [Don't Let Alpine.js x-data Blow Up Your Site — Matt Vanderpol (2024)](https://mattvanderpol.com/2024/04/21/dont-let-data-for-alpine-js-components-blow-up-your-web-site/)
- [parse5 vs htmlparser2 comparison — npm-compare](https://npm-compare.com/htmlparser2,parse5)
- [Git revert documentation](https://git-scm.com/docs/git-revert)
- [How to Avoid Schema Markup Drift — Hill Web Creations](https://www.hillwebcreations.com/how-to-avoid-schema-markup-drift/)
- [Google Schema Penalty — Clixlogix](https://www.clixlogix.com/blog/googles-schema-markup-manual-action/)
- [DOM-Patch Engine: Idempotency and Rollback — LBAI Blog](https://blog.lbai.ai/archives/dom-patch-engine-idempotency-and-rollback-guarantees-for-frontend-ai-updates)
- Direct inspection of site HTML: `E:/Site CL/index.html`, `E:/Site CL/magnetiseur-troyes.html`

*Research complete — 2026-04-01*
