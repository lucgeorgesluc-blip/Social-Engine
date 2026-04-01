# Research: SEO Page Audit & Auto-Patch Feature Set

**Milestone:** Adding SEO Page Audit to existing Corinne SEO Autopilot
**Researched:** 2026-04-01
**Overall confidence:** MEDIUM — scoring weights from official tool docs (MEDIUM), similarity algorithms from research papers + community implementations (MEDIUM), auto-patch templates from schema.org + local SEO practice (HIGH)

---

## Context: The Problem Being Solved

`magnetiseur-aube.html` is 1,018 HTML words (≈ 300 visible words), has zero JSON-LD schema (no `@type`, no FAQPage, no AggregateRating), and the HTML source confirms no structured data whatsoever.

`magnetiseur-troyes.html` is 5,555 HTML words (≈ 2,000+ visible words), has `HealthAndBeautyBusiness` schema with `AggregateRating`, an 8-question `FAQPage` block, and multiple internal links confirmed via content-map.yaml.

This is the canonical example of what the audit system must detect: two pages targeting the same geographic cluster ("magnétiseur" + département), one fully optimised, one not — and the thin one is losing rankings.

---

## Q1: Page Health Signals — What Professional Tools Check

### Source Hierarchy Used
- SEMrush Site Audit methodology: official KB (`semrush.com/kb/114-total-score`, `semrush.com/kb/31-site-audit`) — MEDIUM confidence
- Screaming Frog Link Score documentation (`screamingfrog.co.uk`) — MEDIUM confidence
- Local SEO audit checklists from localmighty.com and searchenginejournal.com — MEDIUM confidence

### Core Signal Categories (all tools agree)

**Category A — Blocking / Critical (highest scoring penalty)**
These cause pages to be partially or fully excluded from ranking consideration:

| Signal | What to Check | Why Critical |
|--------|--------------|-------------|
| Canonical tag present | `<link rel="canonical" href="...">` in `<head>` | Without it Google may pick a different canonical |
| No `noindex` meta | `<meta name="robots" content="noindex">` absent | Indexed in sitemap.xml but noindexed = invisible |
| Title tag exists and is unique | `<title>` not empty, not duplicated across site | Duplicate titles confuse ranking signal assignment |
| Meta description exists | `content` not empty, 120–160 chars | Below 50 chars = Google rewrites it (signal of thin content) |
| Page in sitemap.xml | URL present in sitemap | Confirms Google should crawl it |

**Category B — High Impact / Local (primary differentiators)**
These are the signals where `magnetiseur-aube.html` fails hard:

| Signal | Check Method | Weight Rationale |
|--------|-------------|-----------------|
| LocalBusiness/HealthAndBeautyBusiness schema | JSON-LD `@type` in `<script type="application/ld+json">` | Rich result eligibility, Maps integration |
| AggregateRating in schema | `aggregateRating.ratingValue` and `reviewCount` present | Star ratings in SERP dramatically increase CTR |
| FAQPage schema | `@type: FAQPage` block with `Question` + `Answer` pairs | FAQ rich results appear in SERPs, push competitors down |
| NAP consistency | Phone number in schema matches config.js source of truth | Inconsistent NAP is a known local ranking penalty |
| H1 contains primary keyword | First `<h1>` tag content | Google uses H1 as strong page topic signal |
| Word count (visible text) | Strip HTML tags, count words | Thin content (<400 visible words) is explicit ranking signal |

**Category C — Medium Impact / Content Depth**

| Signal | Threshold | Notes |
|--------|----------|-------|
| Internal links out | Count `<a href>` to own domain pages | 0 internal links = orphan risk; ≥3 recommended |
| Internal links in | Count in content-map.yaml `internal_links_from` | Pages with 0 inbound links are invisible to PageRank |
| Image alt text | All `<img>` have non-empty `alt` | Missing alt = accessibility issue + missed keyword opportunity |
| H2/H3 structure | At least 2 H2s present | Signals content depth to crawlers |
| Keyword in first 100 words | Primary keyword appears in opening paragraph | Strong on-page signal |

**Category D — Lower Impact / Technical (rarely differentiating for this site)**

| Signal | Notes |
|--------|-------|
| Title length (30–60 chars) | Currently enforced at write time |
| OG tags present | og:title, og:description, og:url |
| Canonical is self-referencing | href matches page URL exactly |
| No duplicate H1 | Only one `<h1>` per page |

### Local Service Page Specifics (HIGH relevance for this project)

Professional local SEO auditors emphasise that local pages fail on a different axis than blog content: the problem is rarely technical (robots.txt, crawlability) and almost always **content depth + structured data**. The gap between a thin local page and a ranking local page breaks down as:

1. Schema absence (no LocalBusiness/FAQPage) — highest impact
2. Word count below competitive threshold — second highest
3. Missing AggregateRating — CTR killer even when ranking
4. Zero internal links from/to — link equity isolation

Source: localmighty.com local-seo-audit-checklist, searchenginejournal.com 11-point checklist — MEDIUM confidence.

---

## Q2: Cannibalization Detection — Programmatic Methods

### Source Hierarchy
- Thatware.co semantic cannibalization documentation — MEDIUM confidence
- Medium article on text similarity in JavaScript — MEDIUM confidence
- Research paper on Jaccard vs cosine for article titles (ScienceDirect) — HIGH confidence
- topicalmap.ai cannibalization checker tooling survey — LOW confidence

### What "Cannibalization" Means in Practice for This Project

Two or more pages compete for the same keyword cluster when:
1. Their `<title>` tags share 60%+ of significant tokens (stop words excluded)
2. Their primary `<meta name="description">` content overlaps semantically
3. They target the same geographic modifier + service term combination

For this project: `magnetiseur-troyes.html` vs a future `magnetiseur-troyes-tarifs.html` could both rank for "magnétiseur Troyes" — the audit system needs to flag this before a page is deployed.

### Algorithm Options (ranked by implementation fit for this stack)

**Option 1: Jaccard Similarity on Title Tokens — RECOMMENDED for this project**

Jaccard Similarity = |intersection of token sets| / |union of token sets|

```
title_a = "Magnétiseur dans l'Aube (10) | Cabinet à Troyes | Corinne Lacoste"
title_b = "Magnétiseur Troyes | Cabinet de magnétisme | Corinne Lacoste"

tokens_a = {magnetiseur, aube, cabinet, troyes, corinne, lacoste}
tokens_b = {magnetiseur, troyes, cabinet, magnetisme, corinne, lacoste}

intersection = {magnetiseur, troyes, cabinet, corinne, lacoste} = 5
union = {magnetiseur, aube, troyes, cabinet, magnetisme, corinne, lacoste} = 7
jaccard = 5/7 = 0.71 → MEDIUM overlap, flag for review
```

Thresholds derived from research: >0.85 = HIGH risk (likely cannibalization), 0.60–0.85 = MEDIUM (review needed), <0.60 = LOW (distinct).

**Preprocessing required:**
- Lowercase
- Remove stop words: articles (le, la, les, de, du, des, un, une), prepositions, pipe characters, parentheses, département codes like "(10)"
- Normalise accents: é→e, è→e, ê→e, à→a, etc.
- Strip domain name / brand terms that appear on all pages ("Corinne Lacoste")

**Option 2: TF-IDF Cosine Similarity on Full Body Text**

More accurate but requires computing TF-IDF vectors across all pages — significant overhead for a small site. Cosine similarity on embeddings (OpenAI text-embedding-ada-002 or similar) achieves >90% accuracy for cannibalization detection per research, but adds API cost per audit run.

Verdict: Overkill for this site. Jaccard on titles + meta descriptions is sufficient. The site has ≈60 pages; a full pairwise Jaccard comparison is 60×60/2 = 1,800 operations — trivially fast in Node.js with no external API.

**Option 3: Keyword Cluster Mapping (existing data — use this first)**

The project already has `.seo-engine/data/content-map.yaml` with `primary_keyword` per slug and `.seo-engine/data/seo-keywords.csv` with `cluster_id`. Before running any similarity algorithm, check:

- Does `primary_keyword` in content-map appear in more than one published page entry?
- Do two pages share the same `cluster_id` AND the same content type (both pillar, or both cluster)?

This deterministic check is zero-compute and should run first. Similarity scoring is the fallback for cases not caught by cluster metadata.

**Combined Detection Pipeline (recommended):**

```
1. Cluster metadata check:
   - Same primary_keyword in content-map? → CRITICAL flag
   - Same cluster_id + same content_type? → HIGH flag

2. Title Jaccard similarity:
   - Pairwise across all pages, stop-word cleaned
   - >0.85 → HIGH, 0.60-0.85 → MEDIUM, skip <0.60

3. Meta description Jaccard similarity:
   - Same preprocessing
   - Threshold: >0.70 → flag

Report: slug_a vs slug_b, score, recommended action (consolidate / differentiate / canonical)
```

Source: text similarity algorithms — MEDIUM confidence; threshold values — LOW confidence (derived from community practice, validate with real data).

---

## Q3: Auto-Patch Generation — What Can Be Automated

### Source Hierarchy
- BrightLocal schema templates (brightlocal.com/learn/local-seo-schema-templates) — MEDIUM confidence
- Schema.org LocalBusiness specification — HIGH confidence
- localmighty.com local-business-schema-markup — MEDIUM confidence
- Existing site patterns (magnetiseur-troyes.html as ground truth) — HIGH confidence

### The Four Auto-Patchable Gaps (in priority order)

**Patch 1: HealthAndBeautyBusiness + AggregateRating Schema — HIGHEST PRIORITY**

This is the single highest-impact fix. The template is fully deterministic from `assets/js/config.js` (which is the source of truth for NAP + review count).

Template (inject into `<head>` if absent):
```json
{
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "name": "Corinne Lacoste — Magnétiseuse & Hypnothérapeute",
  "url": "https://www.magnetiseuse-lacoste-corinne.fr/[PAGE_SLUG]",
  "telephone": "[FROM_CONFIG_JS]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7 rue du Printemps",
    "addressLocality": "Saint-Germain",
    "postalCode": "10120",
    "addressCountry": "FR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "[FROM_CONFIG_JS]"
  },
  "areaServed": "[GEOGRAPHIC_MODIFIER_FROM_PAGE]"
}
```

**Auto-generation is fully possible** because all data lives in config.js. The only page-specific variable is `areaServed` which can be derived from the page's primary keyword (e.g., "Aube" for magnetiseur-aube.html).

**Patch 2: FAQPage Schema Block**

Requires generating 3–5 question/answer pairs relevant to the page topic. This cannot be fully templated — it needs Claude API generation. However, the structure is deterministic:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[QUESTION]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[ANSWER]"
      }
    }
  ]
}
```

Auto-patch approach: Generate FAQ via Claude API using page title + primary keyword as context. Cost: ~$0.01 per page (minimal prompt). This is the right approach — do not hard-code FAQ content.

**Patch 3: Canonical Tag**

Fully automatable. If `<link rel="canonical">` is absent in `<head>`, insert:
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/[FILE_PATH]">
```
File path derived from the HTML file name.

**Patch 4: HTML Content Expansion (Thin Content)**

Cannot be auto-patched by template — requires Claude API generation of a full content section. The patch strategy for thin pages (<400 visible words) is to generate a supplementary section: "Votre magnétiseuse dans [REGION]" or a "Zone d'intervention" section with geographical depth.

Cost: ~$0.08–0.12 per page (similar to a blog article, shorter). This patch must go through the same approval gate as articles — it modifies live content.

### What CANNOT Be Auto-Patched (requires human judgment)

- Phone number if inconsistent across files (requires human verification — see Phase 1 correction)
- Service prices (must use `data-price` pattern, not hard-coded values)
- Any claim about treatment efficacy
- rTMS mentions (enforce by detecting + flagging, not auto-removing)

---

## Q4: Scoring Model Design

### Source Hierarchy
- SEMrush Site Audit scoring methodology (official KB) — MEDIUM confidence
- Screaming Frog Link Score (logarithmic 0–100) — MEDIUM confidence
- Local SEO scoring practice: 1–5 per category — MEDIUM confidence

### SEMrush's Actual Methodology (best available reference)

SEMrush Site Health Score = `(total_checks_passed / total_checks_performed) × 100`, modified by:
- **Errors** have ~2× the weight of warnings on the final score
- **Fixing all issues of one check type** has higher impact than fixing isolated issues across different checks
- Scale: 0–100%, with 80%+ considered "healthy"

This is the industry-standard model for site-wide health. For **page-level** scoring (what this milestone needs), the adaptation is:

### Recommended Page Health Score Model

**A 100-point weighted checklist, three severity tiers:**

```
CRITICAL checks (fail = -25 pts each, max 2 checks = 50 pts):
  - LocalBusiness/HealthAndBeautyBusiness schema present
  - Visible word count >= 400

HIGH checks (fail = -10 pts each, max 4 checks = 40 pts):
  - FAQPage schema present
  - AggregateRating in schema
  - H1 contains primary keyword
  - Canonical tag present and self-referencing

MEDIUM checks (fail = -2.5 pts each, max 4 checks = 10 pts):
  - Meta description exists (50–160 chars)
  - At least 3 internal links out
  - At least 1 internal link in (from content-map)
  - OG tags present (og:title, og:description)

SCORE = 100 - sum(penalties for failed checks)
```

**Score bands:**
- 80–100: HEALTHY (green) — no action needed
- 60–79: NEEDS ATTENTION (yellow) — queue patches
- 40–59: CRITICAL (orange) — priority auto-patch
- 0–39: FAILING (red) — immediate action + dashboard alert

**Concrete scoring for `magnetiseur-aube.html` today:**
- LocalBusiness schema: ABSENT → -25
- Word count 300 words: FAIL → -25
- FAQPage schema: ABSENT → -10
- AggregateRating: ABSENT → -10
- H1 contains "magnétiseur" and "Aube": PASS → 0
- Canonical: PRESENT → 0
- Meta description: PRESENT → 0
- Internal links out: 0 (not in content-map internal_links_to) → -2.5
- Internal links in: 0 (not in content-map internal_links_from) → -2.5

**Estimated score: 100 - 74.5 = ~25/100 (FAILING)**

**Concrete scoring for `magnetiseur-troyes.html` today:**
- All schema present: 0 penalty
- Word count 2000+: 0 penalty
- Internal links: multiple in and out: 0 penalty
- All checks pass: ~95/100

This directly validates the scoring model against the known problem.

### Rationale for This Model

- **CRITICAL tier for schema and word count**: These are the two signals where local service pages most commonly fail AND where the gap between ranking and non-ranking pages is largest. Schema absence is binary (either you have it or you don't) and has clear auto-patch paths.
- **Pass/fail not percentages**: Simpler to implement, easier to explain to Corinne in the dashboard ("your page is missing 3 things").
- **100-point scale**: Familiar, maps directly to a progress bar in the dashboard UI.

---

## Q5: Correlating Ranking Drops with Page Signal Changes

### Source Hierarchy
- Google Search Console API documentation (developers.google.com/webmaster-tools) — HIGH confidence
- Sitechecker.pro SEO monitoring description — MEDIUM confidence
- Community GSC API usage patterns — MEDIUM confidence

### GSC API Data Available (confirmed)

The Search Console Search Analytics API (`searchanalytics.query`) returns, per page per keyword:
- `clicks` — total clicks in date range
- `impressions` — total impressions
- `ctr` — click-through rate
- `position` — average ranking position

**Critical limitation**: GSC data has a 2–3 day lag. Real-time ranking detection is not possible. Weekly snapshot comparison is the realistic approach.

**The project already has `autopilot/pipeline/gsc-rankings.js`** — this module exists and can be extended for ranking drop detection without building from scratch.

### Correlation Architecture (what to build)

The problem is correlating two independent timeseries:
1. Page health score (computed by the audit system, stored as a snapshot)
2. GSC ranking position for the page's primary keyword

**Detection flow:**

```
Weekly (or on-demand):
1. Run page health audit → store as JSON snapshot
   {slug, score, checks_failed, timestamp}

2. Query GSC for position of primary keyword for this slug
   → compare to snapshot from 7 days ago
   → if delta > +5 positions (worse) → flag as "ranking drop"

3. If ranking_drop AND health_score < 70:
   → "Likely correlation" — surface in dashboard
   → Queue auto-patches for failed checks

4. If ranking_drop AND health_score >= 70:
   → "Technical issue unlikely" — may be algorithm update
   → Log, surface without auto-patch recommendation
```

**Keyword-to-page mapping**: Use `content-map.yaml` `primary_keyword` field → matches directly to GSC `query` parameter in search analytics response.

### Important Reality Check

Ranking drops have many causes beyond on-page signals:
- Algorithm updates (Google Search Status Dashboard is the reference)
- Competitor page improvements
- New competitor entering the SERP
- Seasonal variation
- Backlink losses

The system should surface correlations as **hypotheses**, not diagnoses. Dashboard language should be: "Page health dropped to 25/100 around the time rankings for 'magnétiseur Aube' worsened. Recommended fixes: [list]."

**Do not claim causation.** This is important for Corinne's trust in the system.

### Trigger Logic

Three trigger conditions for the audit system to run automatically:

1. **Scheduled weekly**: Every Monday, audit all service pages (root HTML files, not blog posts)
2. **Post-publish**: After any article or page is deployed via SFTP, audit that specific page
3. **On-demand**: Dashboard "Audit now" button per page

Blog posts should be audited for schema presence and word count only (simpler subset). Service pages get the full 100-point scoring.

---

## Implementation Recommendations for the Roadmap

### New Module: `autopilot/audit/`

```
autopilot/audit/
  page-auditor.js       — main scoring engine, parses HTML, runs all checks
  cannibalization.js    — Jaccard similarity across all pages
  patch-generator.js    — generates auto-patch suggestions + schema JSON
  ranking-correlator.js — queries GSC, compares to audit snapshots
  snapshot-store.js     — reads/writes audit-snapshots.jsonl
```

### New Dashboard Tab: "Audit"

Extends the existing Alpine.js + Tailwind dashboard (Phases 6–7 complete) with:
- Health score per page (color-coded badge: red/orange/yellow/green)
- Per-check breakdown (which checks failed, which passed)
- "Generate patch" button per failed check
- Cannibalization warnings panel
- Ranking correlation timeline (reuse existing Chart.js ranking chart)

### Integration with Existing Pipeline

The audit system reads from two existing data sources already in the codebase:
- `assets/js/config.js` — NAP, phone, review count (source of truth for schema patches)
- `.seo-engine/data/content-map.yaml` — internal links, primary keywords, cluster IDs

No new external dependencies required for the core audit. Schema patch generation reuses the Claude API client already in `autopilot/pipeline/generator.js`.

---

## Pitfalls to Avoid in This Milestone

**Pitfall 1: Auditing blog posts with the same weight as service pages**
Blog posts don't need LocalBusiness schema or AggregateRating. Running the full scoring model on blogs will produce false "FAILING" scores. Solution: two scoring profiles — `service_page` (full 100-point model) and `blog_post` (simplified: word count, canonical, FAQPage only).

**Pitfall 2: Overwriting manually edited HTML with auto-patches**
The patch system must generate a patch file (diff/suggestion) and require approval before writing to disk — same approval gate as article generation. Never auto-write to the live HTML without an approval step.

**Pitfall 3: False cannibalization positives on the brand name**
"Corinne Lacoste" appears in every page title. Strip brand tokens before Jaccard comparison or every page will score high similarity to every other page.

**Pitfall 4: GSC data freshness**
GSC data is 2–3 days old. Do not display ranking positions as "current" — always show the data date. Label charts as "Last updated: [date from GSC response]."

**Pitfall 5: Hard-coding prices in auto-generated schema patches**
Schema JSON-LD for service prices must use the same `data-price` pattern as articles, or query config.js at runtime. Never hard-code "120€" in generated schema.

---

## Sources

- [SEMrush Site Health Score KB](https://www.semrush.com/kb/114-total-score) — official methodology
- [SEMrush Site Audit Overview](https://www.semrush.com/kb/540-site-audit-overview) — check categories
- [Screaming Frog Link Score](https://www.screamingfrog.co.uk/seo-spider/tutorials/link-score/) — logarithmic scoring model
- [Semantic Cannibalization Detection — Thatware](https://thatware.co/semantic-content-cannibalization-detection/) — cosine similarity on embeddings
- [Text Similarity in JavaScript — Medium](https://medium.com/mastering-javascript/exploring-text-similarity-in-javascript-d72717ecbd25) — Jaccard/cosine implementation
- [Local SEO Audit Checklist 2026 — LocalMighty](https://www.localmighty.com/blog/local-seo-audit-checklist/)
- [Local Business Schema Templates — BrightLocal](https://www.brightlocal.com/learn/local-seo-schema-templates/)
- [Google Search Console API](https://developers.google.com/webmaster-tools) — searchAnalytics.query spec
- [How to Investigate Ranking Drops Using GSC — Linkody](https://blog.linkody.com/seo-analytics/investigating-ranking-drops-with-google-search-console)
- [Local SEO Audit: Find What's Costing You Leads — Digital Success](https://www.digitalsuccess.us/blog/what-is-a-local-seo-audit-a-complete-guide-to-fixing-your-local-search-visibility.html)
- [SEO Cannibalization Complete Guide 2026 — Quantum IT](https://quantumitinnovation.com/blog/seo-cannibalization-complete-guide)

---

*Confidence summary:*
- *Q1 (page health signals): MEDIUM — tool methodologies confirmed via official KB, local-specific weights derived from practice*
- *Q2 (cannibalization detection): MEDIUM — Jaccard algorithm is well-documented, thresholds are community-derived*
- *Q3 (auto-patch generation): HIGH — schema templates from schema.org spec + existing site as ground truth*
- *Q4 (scoring model): MEDIUM — SEMrush methodology confirmed, specific weights for this model are design decisions*
- *Q5 (ranking correlation): MEDIUM — GSC API confirmed, correlation logic is standard practice*
