---

## PROMPT STARTS HERE

---

You are setting up an SEO Content Engine in this project. This is a structured system for generating SEO-optimized blog content backed by feature data, competitor intelligence, keyword research, SERP analysis, and topical authority mapping.

**Sub-Agent Rule:** Use sub-agents aggressively to parallelize work. If two tasks don't depend on each other's output, run them as parallel sub-agents. Specifically:
- Doc scanning: one sub-agent per batch of 15-20 files
- Blog scanning: one sub-agent per batch of blog files
- Data file generation: parallel where no dependency
- Blog writing: sub-agents for research, drafting sections, and post-writing updates

---

## PHASE 1: AUTO-DETECT EVERYTHING

Scan the project and auto-detect as much as possible. Run these in parallel:

### 1.1 — Project identity
- Read `package.json` → extract `name`, `description`, `author`, `homepage`
- Read `README.md` → extract first paragraph as description, project name from title
- Run `git config user.name` and `git config user.email` → use as default author
- Check for an "About" page in docs or site content → extract origin story if found

### 1.2 — CMS & directories
- Detect CMS: look for `astro.config.*`, `docusaurus.config.*`, `hugo.toml`, `hugo.yaml`, `next.config.*`, `gatsby-config.*`, `_config.yml`, or similar
- Find docs directory: `docs/`, `src/content/docs/`, `documentation/`, `wiki/`
- Find blog directory: `blog/`, `src/content/blog/`, `content/blog/`, `content/posts/`, `_posts/`
- Find image directory: `public/images/`, `static/images/`, `assets/images/`

### 1.3 — Frontmatter schema
- If existing blog posts found: read the first one and extract the frontmatter schema
- If no blogs: use default schema for the detected CMS

### 1.4 — Existing state
- Check if `CLAUDE.md` exists (will append, not overwrite)
- Check if `.seo-engine/` exists (re-initialization — preserve data files)

### 1.5 — Author detection
- From git config, package.json, or existing blog frontmatter
- Use first found as default author name

Store ALL findings for use in Phase 2 and 3.

---

## PHASE 2: QUICK INTERVIEW (5 questions only)

Present findings and ask ONLY these questions in a single message:

```
I scanned your project. Here's what I auto-detected:

📦 Project: {name from package.json/README, or "couldn't detect"}
📝 Description: {from README/package.json, or "couldn't detect"}
🛠️ CMS: {detected type, or "couldn't detect"}
📂 Docs: {path, or "not found"}
📂 Blog: {path, or "not found"}
✍️ Author: {from git/package.json, or "unknown"}

If anything above is wrong, just correct it in your answer.

Now I need a few things I can't auto-detect:

1. COMPETITORS — List 3-5 main competitors (name + website)
   Example: Typeform (https://typeform.com), JotForm (https://jotform.com)

2. PRIMARY TOPICS — 3-5 keyword areas you want to rank for
   Example: "form builder", "no-code forms", "online surveys"

3. REVIEW LINKS — Paste any review page URLs you have (or type "skip")
   G2, Trustpilot, Capterra, Product Hunt, RightFeature, Canny, etc.

4. NOTABLE METRICS — Anything impressive to cite in blogs? (or type "skip")
   Example: "10K+ forms created", "99.9% uptime", "used by teams at Stripe"

5. BRAND TERMS — Any brand names to track in SEO? (or type "skip")
   Example: "FormNX", "formnx"

That's it. Everything else is auto-configured and you can edit .seo-engine/config.yaml later.
```

**Wait for the user's response. Then proceed to Phase 3 with no further questions.**

---

## PHASE 3: CREATE THE ENGINE

Execute all steps. Use sub-agents for parallel tasks. Do not ask for confirmation between steps.

### Step 3.1 — Create directory structure

```
.seo-engine/
├── config.yaml
├── data/
│   ├── features.yaml
│   ├── competitors.yaml
│   ├── seo-keywords.csv
│   ├── content-map.yaml
│   ├── content-queue.yaml
│   └── topic-clusters.yaml
├── templates/
│   ├── blog-frontmatter.yaml
│   ├── blog-structures.yaml
│   ├── comparison-template.md
│   └── tone-guide.md
├── logs/
│   └── changelog.md
└── USAGE-GUIDE.md
```

### Step 3.2 — Generate `config.yaml`

Merge auto-detected data + user answers. Use sensible defaults for everything not provided.

```yaml
# SEO Content Engine — Project Configuration
# Auto-generated. Edit anything here anytime — Claude Code reads this before every task.

project:
  name: "{auto-detected or user corrected}"
  tagline: "{inferred from description, first sentence}"
  description: "{auto-detected or user corrected}"
  website: "{from package.json homepage or inferred}"
  target_audience:
    primary: "{inferred from docs content, e.g., 'developers' if technical docs}"
    secondary: ""
    technical_level: "{inferred: beginner/intermediate/advanced/mixed}"

# Author — auto-detected, edit if needed
author:
  name: "{from git config / package.json / blog frontmatter}"
  title: ""
  bio: ""
  website: ""
  social_links: {}

# Trust signals — used for E-E-A-T in blogs
trust_signals:
  review_links:
    # Populated from user answer Q3. Empty if skipped.
    g2: ""
    trustpilot: ""
    capterra: ""
    product_hunt: ""
    rightfeature: ""
    canny: ""
    other: []
  testimonials: []          # Add manually or Claude Code extracts from review links
  metrics:                  # From user answer Q4
    - "{metric 1}"
    - "{metric 2}"

# CMS — auto-detected
cms:
  type: "{detected}"
  blog_directory: "{detected path}"
  docs_directory: "{detected path}"
  frontmatter_format: "yaml"
  date_format: "YYYY-MM-DD"
  slug_style: "kebab-case"
  slug_max_words: 5
  image_directory: "{detected or default}"
  frontmatter_schema:       # Extracted from existing blog post or CMS default
    required:
      - title
      - description
      - date
    optional:
      - author
      - tags
      - category
      - image
      - draft

competitors:
  # From user answer Q1
  - name: "{name}"
    website: "{url}"
    id: "comp_{snake_case_name}"

seo:
  primary_topics: ["{from user answer Q2}"]
  brand_terms: ["{from user answer Q5, or [project_name]}"]
  avoid_terms: []
  target_regions: ["Global"]
  language: "en"

content:
  min_word_count: 1500
  max_word_count: 4000
  default_author: "{auto-detected author name}"
  tone: "professional-conversational"
  include_faq: true
  include_toc: true
  cta_text: "Try {project_name} free"
  cta_url: "{website}/signup"
  max_posts_per_month: 8
  requires_human_review: true

technical_seo:
  meta_description_max_chars: 160
  title_tag_max_chars: 60
  image_alt_text_required: true
  canonical_url_pattern: "{website}/blog/{slug}"

integrations:
  seo_tool: "none"
  analytics: "none"
  search_console: false
```

### Step 3.3 — Generate `features.yaml`

**Use sub-agents for large doc directories — one sub-agent per batch.**

Scan the documentation directory. For every feature, capability, or functionality documented:

1. Extract name and description
2. Categorize (mirror documentation's own folder/section structure)
3. Record source document path and section
4. Assign unique ID: `feat_{snake_case}`
5. Set status to `available`
6. Extract details: options, parameters, limitations

Scanning strategy:
- List all files: `find {docs_dir} -name "*.md" -o -name "*.mdx" | sort`
- If 30+ files: split into batches of 15-20, one sub-agent per batch, merge results
- Read each file FULLY — features are often deep in a file
- Extract ALL features including sub-features and options

```yaml
project: "{project_name}"
last_updated: "{today}"
generated_from: "{docs_directory}"

categories:
  - id: "cat_{slug}"
    name: "{Category}"
    description: "{what this covers}"
    subcategories:
      - id: "sub_{slug}"
        name: "{Subcategory}"
        features:
          - id: "feat_{slug}"
            name: "{Feature}"
            description: "{1-2 sentences from docs}"
            status: "available"
            doc_refs:
              - path: "{relative path}"
                section: "{section name}"
            blog_refs: []
            tags: ["{tags}"]
            notes: ""
```

### Step 3.4 — Generate `competitors.yaml`

Shell for each competitor. Feature matrix entry for every feature in features.yaml.
- Own project: fill from docs
- Competitors: `supported: null`, `confidence: "unverified"` — never guess

```yaml
last_updated: "{today}"
last_verified: "{today}"

competitors:
  - id: "comp_{slug}"
    name: "{Name}"
    website: "{URL}"
    category: "{inferred}"
    pricing_model: "unknown"
    strengths: ""
    weaknesses: ""
    notes: "Not yet verified."

feature_matrix:
  - feature_id: "feat_{id}"
    our_project:
      supported: true
      details: "{from docs}"
      tier: "unknown"
    competitors:
      comp_{slug}:
        supported: null
        details: ""
        tier: "unknown"
        confidence: "unverified"
        last_verified: ""
```

### Step 3.5 — Generate `seo-keywords.csv`

```csv
keyword,search_volume,keyword_difficulty,cpc,intent,funnel_stage,serp_features,content_format_needed,mapped_feature_ids,mapped_blog_slugs,cluster_id,content_type,priority,status,last_updated,source,notes
```

Generate 15-25 seed keywords from:
- Primary topics (user answer Q2)
- Features from docs scan
- Patterns: "{project} vs {competitor}", "{competitor} alternative", "best {category}", "how to {feature}", "{project} review"
- Set volume/KD/CPC to 0, serp_features and content_format_needed to empty
- Set funnel_stage from pattern (awareness/consideration/decision)
- Set content_type (pillar for broad, cluster for specific)

### Step 3.6 — Generate `topic-clusters.yaml`

Design pillar/cluster architecture from topics + features + keywords:

```yaml
last_updated: "{today}"

clusters:
  - cluster_id: "tc_{slug}"
    name: "{Topic Cluster Name}"
    description: "{what this covers}"

    pillar:
      title: "{Comprehensive Pillar Title}"
      target_keyword: "{broad keyword}"
      slug: "{slug}"
      status: "planned"
      blog_slug: ""

    cluster_pages:
      - title: "{Specific Page Title}"
        target_keyword: "{long-tail keyword}"
        slug: "{slug}"
        angle: "{what makes this different from pillar}"
        status: "planned"
        blog_slug: ""

    linking_rules:
      - "Every cluster page MUST link to pillar"
      - "Pillar MUST link to all published cluster pages"
      - "Cluster pages MAY cross-link when relevant"
```

Rules:
- Each primary topic → one cluster
- Cluster pages can be designed from features.yaml + topic knowledge without SERP data
- Each cluster: 5-10 planned pages
- **Pillar page requires SERP data before finalizing.** Before setting the pillar title, angle, and structure:
  - IF SEO MCP tool connected → pull SERP data for the pillar keyword
  - OTHERWISE → ask user: "I'm designing the pillar page for this cluster. Please Google '{pillar keyword}' and share: top 5 results, People Also Ask, related searches."
  - Use SERP data to determine: should the pillar be a how-to guide, a tool/template page, a listicle, or a hybrid? (Apply SERP Intent Interpretation Rules)
  - Use People Also Ask to ensure pillar covers foundational subtopics (what is, why, types, etc.)
  - WAIT for user response before finalizing the pillar design

### Step 3.7 — Generate `content-map.yaml` AND extract competitor intelligence

**Use sub-agents — one per batch of blog files.**

For each existing blog post:
1. Read FULL content
2. Extract frontmatter
3. Match features from features.yaml
4. Match competitors mentioned
5. **Extract competitor intelligence** (claims like "X doesn't support Y") → update competitors.yaml with `confidence: "from_blog"`
6. Count words, find internal links, infer keywords
7. Assign to topic cluster if fits
8. Register in content-map

```yaml
last_updated: "{today}"

blogs:
  - slug: "{from filename/frontmatter}"
    title: "{from frontmatter}"
    file_path: "{relative path}"
    status: "published"
    published_date: "{from frontmatter}"
    last_updated: "{from frontmatter}"
    blog_type: "{listicle/comparison/tutorial/how-to/review/thought-leadership}"
    content_type: "{pillar/cluster/supporting/standalone}"
    cluster_id: "{tc_slug or empty}"
    target_keywords:
      - keyword: "{inferred}"
        search_volume: 0
        is_primary: true
    features_mentioned:
      - feature_id: "feat_{id}"
        context: "{how mentioned}"
    competitors_mentioned:
      - competitor_id: "comp_{id}"
    internal_links_to: ["{slugs}"]
    internal_links_from: []
    word_count: {count}
    has_eeat_signals: false
    needs_update_reason: ""
```

After scanning, back-populate:
- `features.yaml` → blog_refs
- `competitors.yaml` → feature_matrix from blog intelligence
- `seo-keywords.csv` → keywords from existing blogs (status: published)
- `topic-clusters.yaml` → assign existing blogs, mark published
- `internal_links_from` → cross-reference all entries

### Step 3.8 — Generate `content-queue.yaml`

```yaml
last_updated: "{today}"

queue:
  - id: "q_001"
    title: "{Blog title}"
    blog_type: "{type}"
    content_type: "{pillar/cluster/supporting}"
    cluster_id: "{tc_slug or empty}"
    target_keywords: ["{keywords}"]
    target_features: ["{feature IDs}"]
    unique_angle: "{REQUIRED — what's different from what already ranks}"
    priority: "high"
    priority_reason: "{why}"
    status: "planned"           # idea | planned | in-progress | human-review | published
    estimated_word_count: {number}
    eeat_plan: "{what experience/data/testimonial to include}"
    serp_analyzed: false
    cannibalization_check: "passed"   # passed | conflict_with_{slug}
    notes: ""
    depends_on: []
    internal_link_targets: ["{slugs}"]
```

Generation rules:
1. **Pillar pages first** — if cluster has no pillar, queue as high priority
2. **Cluster pages next** — supporting published pillars
3. **Competitor comparisons** — for each competitor
4. **Feature tutorials** — for uncovered features
5. **Cannibalization check** — scan existing blogs for overlapping keywords before adding
6. **unique_angle required** — "more comprehensive" is NOT an angle
7. Priority: high = pillars + main competitor comparisons, medium = cluster pages + tutorials, low = supporting + thought leadership

### Step 3.9 — Generate template files

**`templates/blog-frontmatter.yaml`** — For detected CMS ONLY. Enforce:
- title ≤ 60 chars, description ≤ 160 chars, slug ≤ 5 words

**`templates/blog-structures.yaml`** — Blog type structures with VOICE VARIATION:
- `comparison` — analytical, data-driven (~2000-3000 words)
- `listicle` — helpful curator (~2500-4000 words)
- `tutorial` — patient teacher, use "I", share experience (~1500-2500 words)
- `how_to` — problem-solver (~1200-2000 words)
- `review` — honest reviewer, admit drawbacks (~2000-3000 words)
- `thought_leadership` — opinionated, take-a-stand (~1500-2500 words)

Each must specify where to inject E-E-A-T signals (testimonial, metric, experience).

**`templates/comparison-template.md`** — X vs Y template with sections.

**`templates/tone-guide.md`** — Style rules including:
- Every blog MUST include at least one: testimonial, metric, experience, or review link from config
- Never write "another version of what exists" — unique angle required
- Competitor mentions: respectful, lead with their strengths
- CTA: soft, once, at end

### Step 3.10 — Initialize changelog

Log all setup actions with file counts.

### Step 3.11 — Update or Create CLAUDE.md

- If exists: APPEND after `---` separator
- If not: CREATE new file
- Insert full engine instructions from APPENDIX A

---

## PHASE 4: SUMMARY

```
✅ SEO Content Engine initialized!

📊 Summary:
- Features: {count} across {count} categories
- Topic clusters: {count} ({count} pillar pages planned)
- Competitors: {count} ({count} data points from existing blogs)
- Seed keywords: {count}
- Existing blogs registered: {count}
- Blog ideas queued: {count} ({count} high priority)
- Cannibalization conflicts: {count or "none"}

⚠️ All blogs are saved as "human-review" — review before publishing.

📂 Everything is in .seo-engine/ — edit config.yaml anytime to change settings.
📖 Read .seo-engine/USAGE-GUIDE.md for all commands.

🔜 Next:
1. Verify features.yaml is accurate
2. Say "Write the next blog" to start
```

---

## PHASE 5: SAVE USAGE GUIDE

Save to `.seo-engine/USAGE-GUIDE.md`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 SEO ENGINE — USAGE GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type these into Claude Code. Or just describe what you want naturally.

─── WRITING ─────────────────────────────────────

"Write the next blog"
   → Picks top priority, runs SERP research, drafts, saves as human-review.

"Write a blog about [topic]"
   → Checks for cannibalization first, then writes.

"Write a comparison: [Project] vs [Competitor]"
   → Uses competitor data from competitors.yaml.

"Write the pillar page for [cluster]"
   → Comprehensive pillar for a topic cluster.

"Approve blog [slug]"
   → Marks as published after your review.

"Blog [slug] needs changes: [feedback]"
   → Revises and keeps in review.

─── SERP RESEARCH ───────────────────────────────

Before every blog, Claude Code needs real SERP data from Google.
It will NOT use its own web search — that gives generic results.

IF dedicated SEO MCP tool connected (Semrush, Ahrefs) → uses that.

OTHERWISE → Claude Code asks YOU to search Google and provide:
   1. Top 3-5 ranking page titles + URLs
   2. People Also Ask questions
   3. Related searches from bottom of Google
   4. Related keywords from your SEO tools (optional)

This ensures blogs are written against real competition, not guesses.

─── NEW DOCS & FEATURES ─────────────────────────

"Scan new docs at [path]"
"New feature: [name] at [doc path]"

─── COMPETITORS ─────────────────────────────────

"Update competitor: [name] now supports [feature]"
"[Competitor] raised pricing. Update."

─── KEYWORDS ────────────────────────────────────

"Import keywords: [paste data]"
"Pull keywords via MCP for [topic]"

─── TOPIC CLUSTERS ──────────────────────────────

"Show topic cluster status"
"Create cluster for [topic]"
"What cluster pages to write next?"

─── AUDITS ──────────────────────────────────────

"Run a content audit"
"Check keyword cannibalization"
"What should I write next?"
"Which blogs need updating?"

─── CONFIG ──────────────────────────────────────

Edit .seo-engine/config.yaml anytime to change:
- Author info, trust signals, testimonials
- CTA text/URL, word count limits
- Add/remove competitors
- Change publishing cadence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## APPENDIX A: CLAUDE.md ENGINE INSTRUCTIONS

Append to (or create as) CLAUDE.md:

```markdown
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
| `templates/blog-frontmatter.yaml` | Frontmatter format | When generating |
| `templates/blog-structures.yaml` | Outlines by type | When structuring |
| `templates/tone-guide.md` | Style + E-E-A-T rules | Before writing |
| `logs/changelog.md` | Audit trail | After every action |

### Core Rules

1. **Read before writing.** Always read: config, features, content-map, content-queue, topic-clusters, tone-guide.
2. **Never fabricate features.** Only reference what's in features.yaml.
3. **Competitor claims need confidence.** If "unverified" or 90+ days old → caveat or direct reader to competitor's page.
4. **No web search for SERP data.** NEVER use your built-in web search to research keywords or SERP results. It produces generic data that leads to generic content. ALWAYS ask the user to provide real Google SERP data (top results, PAA, related searches). The ONLY exception is if a dedicated SEO MCP tool (Semrush, Ahrefs) is connected.
5. **Cannibalization check before every blog.** Search content-map for overlapping keywords. If conflict → recommend updating existing blog. Only proceed if angle is genuinely different.
6. **Every blog needs a unique angle.** Define what's different from what ranks. "More comprehensive" is NOT an angle.
7. **E-E-A-T mandatory.** Every blog must include at least one: testimonial, metric, experience, or review link from config.trust_signals. If config has no trust signals yet, ask user to provide one before publishing.
8. **Human review required.** Save all blogs as `status: "human-review"`. Never auto-publish. Alert user to review.
9. **Respect pillar/cluster linking.** Cluster pages → link to pillar. Pillar → link to all cluster pages. Non-negotiable.
10. **Update all files after writing:**
   - content-map.yaml (register blog)
   - features.yaml (blog_refs)
   - seo-keywords.csv (mapped_blog_slugs)
   - content-queue.yaml (status)
   - topic-clusters.yaml (if cluster blog)
   - changelog.md (log action)
11. **Never delete data.** Add or update only.
12. **Log everything** to changelog.md.

### SERP Intent Interpretation Rules

When analyzing SERP data (whether from user-provided Google results or SEO MCP tool), classify the intent BEFORE deciding content structure:

**All product/tool/template pages in top results:**
→ Intent is TRANSACTIONAL. Google wants tools, not guides.
→ Your content MUST serve the transactional intent first (provide tool/template/CTA immediately), then add educational depth below.
→ Do NOT write a pure informational guide — it will not rank.

**Mix of guides + product pages:**
→ Intent is BLENDED. Google rewards both formats.
→ A comprehensive guide with embedded tool/template CTAs works well here.

**All informational guides/blogs in top results:**
→ Intent is INFORMATIONAL. Google wants educational content.
→ Write a thorough guide. Product mentions should be natural, not forced.

**All comparison/listicle pages:**
→ Intent is COMMERCIAL INVESTIGATION. User is evaluating options.
→ Write a comparison or listicle. Don't write a how-to.

**Rule: NEVER fight the SERP.** If Google shows product pages, don't write a pure guide. If Google shows guides, don't write a product page. Match the dominant intent, then add your unique value on top.

### Blog Writing Workflow

**STEP 1: Pre-Writing Research** (sub-agents for parallel tasks)

a) Read all data files
b) Pick topic: from queue (highest priority "planned") or user request
c) **Cannibalization check** — scan content-map for overlapping keywords. If conflict: recommend update. If proceeding: document why in queue.
d) **SERP Analysis — CRITICAL RULE:**
   - **DO NOT use your built-in web search tool for SERP research.** Your web search does not provide search volume, keyword difficulty, People Also Ask layout, or the actual SERP format Google shows. It gives generic results that lead to generic content.
   - IF a dedicated SEO MCP tool is connected (like Semrush, Ahrefs MCP) → use that tool for structured keyword data
   - In ALL other cases → ask the user to manually search Google and provide real SERP data:
     ```
     Before writing, I need real SERP data for: "{keyword}"
     Please search this on Google and provide:
     1. Top 3-5 ranking page titles + URLs
     2. People Also Ask questions (4-6)
     3. Related searches shown at the bottom of Google
     4. Related keywords from your SEO tools like Ahrefs, SEMrush, Ubersuggest (optional)
     ```
   - WAIT for response before proceeding. Do NOT proceed without SERP data. Do NOT substitute your own web search.
e) **Define unique angle** from SERP data gaps. 1 sentence. If no genuine gap found, tell user.

**STEP 2: Draft** (sub-agents for long blog sections)

a) Select structure from blog-structures.yaml
   **If writing a PILLAR page**, it MUST include ALL of these sections (adapt order based on SERP intent):
   - Definition: What is {topic}? (even if brief — cluster pages link here for this)
   - Why it matters: Why do people need {topic}?
   - Types/categories: Different kinds of {topic} (these map to cluster pages — link to each)
   - How-to / step-by-step: How to create/do/use {topic}
   - Best practices / tips: What makes a good {topic}
   - Common mistakes to avoid
   - Tools/templates: Options available (include your product naturally)
   - FAQ from People Also Ask data
   If SERP intent is transactional: lead with tools/templates/CTA section, then educational sections below.
   If SERP intent is informational: lead with definition and how-to, tools section later.
   A pillar page that skips foundational sections (definition, types, why it matters) is INCOMPLETE — cluster pages need these sections to link back to.
b) Read tone-guide.md — use correct voice for this blog type
c) Build frontmatter: title ≤ 60 chars, description ≤ 160 chars, slug ≤ 5 words
d) Write blog:
   - Primary keyword in: title, first paragraph, one H2, description, slug
   - Secondary keywords natural
   - FAQ from People Also Ask data
   - Internal links: prioritize pillar (if cluster page), then relevant blogs. Varied anchor text.
   - External links: 1-2 authoritative (not competitors)
e) **Inject E-E-A-T:** author name, testimonial/metric/experience from config, review link
f) **Ask user:**
   ```
   Before I finalize, want to add anything?
   - A personal experience or story related to this topic?
   - Specific user feedback or quotes?
   - External sources to reference?
   (Say "skip" if ready as-is)
   ```

**STEP 3: Post-Writing** (sub-agents — all parallel)

a) Save blog with status: "human-review"
b) Update content-map, features, keywords, queue, clusters, changelog
c) **Alert:**
   ```
   ✅ Blog drafted: "{title}"
   📄 File: {path} | Words: {count} | Links: {count}
   🏗️ Cluster: {name or "standalone"}

   ⚠️ REVIEW REQUIRED — say "Approve blog {slug}" or give feedback.
   ```

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

### Evaluate / Review Blog Workflow

When asked to evaluate, review, analyze, or give feedback on a blog (existing or draft):

1. Read the blog file
2. Read config.yaml, features.yaml, competitors.yaml, content-map.yaml, topic-clusters.yaml, tone-guide.md
3. Evaluate against ALL of these criteria:
   - **SEO check:** Primary keyword in title, first paragraph, one H2, description, slug? Title ≤ 60 chars? Description ≤ 160 chars?
   - **Keyword cannibalization:** Does another blog target the same keyword?
   - **Feature accuracy:** Are all mentioned features actually in features.yaml? Any fabricated claims?
   - **Competitor accuracy:** Are competitor claims backed by data in competitors.yaml? What's the confidence level?
   - **E-E-A-T signals:** Does the blog include testimonials, metrics, experience, or review links? If not, flag it.
   - **Cluster alignment:** Is this blog part of a cluster? Does it link to its pillar? Does the pillar link back?
   - **Internal linking:** Links to at least 2 other blogs? Anchor text varied and contextual?
   - **Unique angle:** What is this blog's angle? Is it genuinely different from what ranks for the target keyword?
   - **Tone/voice:** Does it match the blog type's voice from blog-structures.yaml?
   - **Content quality:** Is it specific and concrete or vague and generic? Does it read like AI filler?
   - **Word count:** Meets minimum from config?
   - **Pillar completeness (if pillar):** Does it have ALL mandatory sections — definition, types, why it matters, how-to, best practices, common mistakes, tools, FAQ?
   - **SERP intent match:** Does the content format match what Google rewards for this keyword? (Apply SERP Intent Interpretation Rules)
   - **FAQ quality:** Are FAQ questions drawn from real People Also Ask data or generic?
4. Output a structured report with: score (out of 10), strengths, issues found, specific fix recommendations
5. If blog is in content-map with status "human-review": provide clear approve/reject recommendation

### Create Topic Cluster Workflow

When asked to create a new topic cluster:

1. Read features.yaml and existing topic-clusters.yaml
2. Design cluster pages from features + topic knowledge (no SERP needed for these)
3. **Before finalizing the pillar page:** ask user for SERP data on the pillar keyword:
   ```
   I'm designing the pillar page for the "{cluster name}" cluster.
   Please Google "{pillar keyword}" and share:
   1. Top 5 ranking page titles + URLs
   2. People Also Ask questions
   3. Related searches
   ```
4. WAIT for response
5. Apply SERP Intent Interpretation Rules to decide pillar format (guide vs tool page vs hybrid)
6. Ensure pillar includes ALL mandatory sections (definition, types, why it matters, how-to, best practices, common mistakes, tools, FAQ)
7. Save cluster to topic-clusters.yaml
8. Add all pages to content-queue.yaml (with cannibalization check)
9. Add keywords to seo-keywords.csv
10. Log to changelog.md

### New Feature Workflow

1. Add to features.yaml
2. Add to competitors.yaml (unverified)
3. Generate keywords → seo-keywords.csv
4. Assign to cluster or create new in topic-clusters.yaml
5. Check existing blogs → mark needs-update
6. Queue blog ideas (with cannibalization check)
7. Log

### SEO Data Import Workflow

1. Merge into seo-keywords.csv (no dupes)
2. Map to features
3. Update SERP fields if available
4. Assign to clusters
5. Recalculate queue priorities
6. Generate new queue items (with cannibalization check)
7. Log

### Changelog Format

```
## {YYYY-MM-DD HH:MM}
**Action:** {what}
**Files:** {list}
**Summary:** {1-2 sentences}
**Triggered by:** {user / audit / detection / import}
```
```