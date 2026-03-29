# Research: Anthropic Claude API for HTML Blog Article Generation

**Project:** magnetiseuse-lacoste-corinne.fr
**Date:** 2026-03-29
**Scope:** Programmatic Claude API usage to generate complete SEO blog articles in static HTML
**Model target:** claude-sonnet-4-6
**Confidence:** HIGH (Anthropic API docs are well-known; DataForSEO section is MEDIUM — training data, unverified against current pricing)

---

## 1. Context File Management & Token Budgeting

### File sizes (measured on disk)

| File | Bytes | Approx tokens* |
|------|-------|----------------|
| `.seo-engine/config.yaml` | 4 637 | ~1 160 |
| `.seo-engine/data/content-queue.yaml` | 10 474 | ~2 620 |
| `.seo-engine/data/seo-keywords.csv` | 5 632 | ~1 410 |
| `.seo-engine/data/content-map.yaml` | 53 627 | ~13 410 |
| `.seo-engine/templates/tone-guide.md` | 4 244 | ~1 060 |
| `.seo-engine/templates/blog-structures.yaml` | 6 318 | ~1 580 |
| `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` | 10 456 | ~2 615 |
| `assets/js/config.js` | 33 096 | ~8 275 |
| **Total (all files)** | **128 484** | **~32 130** |

*Rule of thumb: 1 token ≈ 4 bytes for French/English prose. YAML/JS may be slightly denser.

### Key insight: content-map.yaml is the problem

`content-map.yaml` is 53 KB (~13 400 tokens) — it alone consumes 40% of the context budget.
For article generation you only need a **summary of existing slugs** (for cannibalization check and internal links), not the full content map.

**Recommendation: trim what you pass.**

### What to actually pass per generation call

For a single article generation call, you need:

| File | Pass in full? | Alternative |
|------|--------------|-------------|
| `config.yaml` | Yes — 1 160 tokens | — |
| `tone-guide.md` | Yes — 1 060 tokens | — |
| `blog-structures.yaml` | Yes — 1 580 tokens | — |
| `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` | Yes — 2 615 tokens | — |
| `config.js` (pricing section only) | Partial — ~600 tokens | Extract lines 1–150 only |
| `content-queue.yaml` (target article entry only) | Partial — ~200 tokens | Extract the single queue item |
| `seo-keywords.csv` (target keyword rows only) | Partial — ~200 tokens | 3–5 relevant rows |
| `content-map.yaml` | Slug list only | Extract slug + title only (~2 000 tokens) |
| **SERP data (user-provided)** | As-is | Raw Google PAA / top 10 titles |

**Estimated lean context:** ~10 000–12 000 tokens
**Full-context worst case:** ~32 000+ tokens

---

## 2. How to Structure the API Call

### Message structure

The Claude Messages API uses this structure:

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-...")

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=8192,          # See section 6 for sizing
    system=SYSTEM_PROMPT,     # All context files go here
    messages=[
        {"role": "user", "content": USER_PROMPT}
    ]
)

print(response.content[0].text)
```

### System prompt architecture

The system prompt should contain all reference material. The user turn contains the specific article request.

**Recommended system prompt structure:**

```
<context>
  <site_config>
    [content of config.yaml]
  </site_config>

  <tone_guide>
    [content of tone-guide.md]
  </tone_guide>

  <blog_structures>
    [content of blog-structures.yaml]
  </blog_structures>

  <article_instructions>
    [content of INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md]
  </article_instructions>

  <pricing_config>
    [relevant extract from config.js — pricing object only]
  </pricing_config>

  <published_articles>
    [slug list extracted from content-map.yaml — slugs + titles only]
  </published_articles>
</context>

<rules>
  NEVER write prices as hard-coded amounts. Always use data-price="[slug]" attributes.
  NEVER mention rTMS.
  NEVER use: guérir, guérison, traitement médical.
  Schema FAQPage MUST include "name" property.
  Output ONLY the complete HTML file content. No explanation, no markdown fences.
</rules>
```

**Why XML tags?** Claude responds significantly better to XML-tagged sections for long structured prompts. Sections are easier to parse and recall during generation. This is an Anthropic-recommended pattern.

### User turn (per article)

```
Generate the complete HTML blog article for:

Slug: [slug-here]
Title: [Article Title]
Type: [comparison | how-to | tutorial | listicle | testimonial]
Primary keyword: [keyword]
Unique angle: [one sentence from content-queue.yaml]
SERP data:
  Top 10 titles: [paste titles]
  PAA questions: [paste questions]
  Intent: [informational | commercial | local]

Required internal links to: [slug1], [slug2]
Target word count: [1800]
Article date: [2026-03-29]

Output only the complete blog/[slug].html file. Start with <!DOCTYPE html>.
```

---

## 3. Extended Thinking — When to Use It

### What extended thinking does

Extended thinking gives Claude a scratchpad to reason before answering. It costs extra tokens (the thinking tokens are billed). For content generation, the trade-off is:

| Use case | Extended thinking needed? |
|----------|--------------------------|
| Short article (<2 000 words) | No — standard generation is fine |
| Long pillar article (3 500+ words) | Maybe — helps with structure coherence |
| Comparatif with multiple data points | Helpful — reasoning through table data |
| Cannibalization check + angle selection | YES — analytical task benefits most |
| Pure HTML output of known structure | No — structure is already in prompt |

### How to enable it

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 5000   # thinking tokens don't count toward max_tokens output
    },
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": USER_PROMPT}]
)

# Response has multiple content blocks
for block in response.content:
    if block.type == "thinking":
        print("THINKING:", block.thinking)   # optional — for debugging
    elif block.type == "text":
        print("OUTPUT:", block.text)         # the actual HTML
```

**Important:** `budget_tokens` is separate from `max_tokens`. If you set `budget_tokens=5000` and `max_tokens=8192`, total billed tokens can be up to ~13 000 for that call.

**Recommendation for this project:** Do NOT use extended thinking for article generation. The article structure is fully defined in `blog-structures.yaml`. Extended thinking is useful for the **pre-writing analysis step** (angle selection from SERP data), not the generation step. Consider a two-call workflow: call 1 = analysis with thinking, call 2 = generation without.

---

## 4. Streaming vs Non-Streaming

### Non-streaming (simpler)

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=8192,
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": USER_PROMPT}]
)
html_output = response.content[0].text
```

- Simple to implement
- Full response arrives as one object
- If connection drops, you get nothing — have to retry entire call
- No progress feedback during ~30–60 second generation

### Streaming (recommended for long output)

```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=8192,
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": USER_PROMPT}]
) as stream:
    with open("blog/output.html", "w", encoding="utf-8") as f:
        for text in stream.text_stream:
            f.write(text)
            print(text, end="", flush=True)   # live preview in terminal

final_message = stream.get_final_message()
print(f"\nTotal tokens: input={final_message.usage.input_tokens}, output={final_message.usage.output_tokens}")
```

**Recommendation: use streaming.** An 8 000-token HTML article takes 30–90 seconds. Streaming lets you:
- Write to disk incrementally (partial recovery if connection drops)
- Show live progress in terminal
- Detect early if the model is going off-track (wrong language, wrong structure)
- Get usage stats at the end for cost tracking

### Streaming with extended thinking

Extended thinking + streaming is supported but returns thinking blocks before text blocks. Requires handling multiple event types. More complex — avoid unless you specifically need the thinking output.

---

## 5. Enforcing Structured Output (Valid HTML with data-* Patterns)

Claude does not have a native HTML schema enforcement mode (unlike JSON with tool use). Use these strategies:

### Strategy 1: Hard rules in the system prompt (most important)

Put non-negotiable constraints in a dedicated `<rules>` block at the TOP of the system prompt (before context files):

```
ABSOLUTE RULES — never violate these:
1. Output ONLY the raw HTML file. No ```html fences, no explanations.
2. First character of output must be < (start of <!DOCTYPE html>).
3. NEVER write a price as a number. Always: <span data-price="tabac"></span>
4. NEVER mention rTMS.
5. Every <span> with data-price must use a key that exists in SITE_CONFIG.pricing.
6. Schema FAQPage JSON-LD must include "name" property on the root object.
7. data-blog-current attribute must exactly match the slug (no .html suffix).
```

### Strategy 2: One-shot example (high impact)

Include a minimal example of correct data-price usage and correct data-blog-list block in the system prompt. Claude learns patterns from examples more reliably than from rules alone.

```html
<!-- CORRECT pattern for prices: -->
<p>La séance coûte <span data-price="tabac"></span> — un investissement unique.</p>

<!-- CORRECT pattern for related articles block: -->
<div class="grid md:grid-cols-3 gap-6"
     data-blog-list="related"
     data-blog-current="slug-without-html"
     data-blog-limit="3">
</div>
```

### Strategy 3: Post-generation validation

Run a simple script to verify output before writing to disk:

```python
import re

def validate_html_article(html: str, slug: str) -> list[str]:
    errors = []

    # No hard-coded prices
    if re.search(r'\b(120|80|90|45)€', html):
        errors.append("FAIL: Hard-coded price found (€ amount)")

    # data-price attributes present for tabac articles
    if "tabac" in slug and 'data-price="tabac"' not in html:
        errors.append("FAIL: Missing data-price='tabac' in tabac article")

    # rTMS never mentioned
    if re.search(r'rTMS|stimulation magnétique transcrânienne', html, re.IGNORECASE):
        errors.append("FAIL: rTMS mentioned")

    # data-blog-current matches slug
    if f'data-blog-current="{slug}"' not in html:
        errors.append(f"FAIL: data-blog-current not set to '{slug}'")

    # FAQPage schema has "name"
    if '"@type": "FAQPage"' in html and '"name"' not in html:
        errors.append("FAIL: FAQPage schema missing 'name' property")

    # Output starts with HTML doctype
    if not html.strip().startswith("<!DOCTYPE html>"):
        errors.append("FAIL: Output does not start with <!DOCTYPE html>")

    return errors
```

If `errors` is non-empty, either fix automatically (regex substitution for known patterns) or re-prompt with the error list.

### Strategy 4: Tool use for structured fields (optional, advanced)

For extracting config.js entry metadata (slug, title, description, date), you can define a tool that Claude must call before generating the HTML. This guarantees those fields are machine-parseable:

```python
tools = [{
    "name": "register_article_metadata",
    "description": "Register the article metadata for config.js before generating HTML",
    "input_schema": {
        "type": "object",
        "properties": {
            "slug": {"type": "string"},
            "title": {"type": "string", "maxLength": 60},
            "description": {"type": "string", "maxLength": 160},
            "date": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$"}
        },
        "required": ["slug", "title", "description", "date"]
    }
}]
```

Then in a second call (or via multi-turn), generate the HTML body. This is overkill for most cases — only useful if you're automating config.js updates programmatically.

---

## 6. Token Counting Before the Call (Cost Control)

### Use the count_tokens endpoint

```python
# Before making the generation call, check token count
token_response = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": USER_PROMPT}]
)

input_tokens = token_response.input_tokens
print(f"Input tokens: {input_tokens}")

# Pricing as of early 2026 (MEDIUM confidence — verify at console.anthropic.com)
# claude-sonnet-4-6: $3 per 1M input tokens, $15 per 1M output tokens
cost_input = input_tokens * 3 / 1_000_000
cost_output_est = 7000 * 15 / 1_000_000   # estimate 7000 output tokens
print(f"Estimated call cost: ${cost_input + cost_output_est:.4f}")
```

**Important:** `count_tokens` is a real API call (fast, ~200ms) that costs nothing. Always call it before long generation runs.

### Expected token ranges for this project

| Scenario | Input tokens | Output tokens | Estimated cost |
|----------|-------------|---------------|----------------|
| Lean context (trimmed files) | ~12 000 | ~5 000–7 000 | ~$0.11–$0.14 |
| Full context (all files) | ~32 000 | ~5 000–8 000 | ~$0.17–$0.22 |
| Full context + thinking (5k budget) | ~32 000 | ~5 000–8 000 + 5 000 thinking | ~$0.22–$0.30 |

These are per-article costs. At 4 articles/month: ~$0.50–$1.20/month total.

### Output token sizing: max_tokens guidance

| Article type | Expected HTML output | Recommended max_tokens |
|-------------|---------------------|------------------------|
| How-to / Tutorial (1 500–2 000 words) | 4 000–5 500 tokens | 6 000 |
| Comparatif (2 000–3 000 words) | 5 500–7 500 tokens | 8 192 |
| Pillar (3 000–4 000 words) | 7 500–10 000 tokens | 12 000 |
| Listicle (2 500–4 000 words) | 6 000–9 000 tokens | 10 000 |

Note: HTML wrapping (tags, attributes, schema JSON-LD) adds ~20–30% token overhead vs raw word count.

**claude-sonnet-4-6 max output tokens: 8 192** (as of training cutoff). For pillar articles that may exceed this, consider generating in two passes: structure + content of first half, then continuation.

---

## 7. DataForSEO API: SERP Data for Angle Selection

### What DataForSEO provides that matters for this project

For angle selection before writing, the relevant endpoints are:

#### 7a. SERP Organic Results (most important)
```
POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced
```

Request body:
```json
{
  "data": [{
    "keyword": "magnétiseur arrêt tabac Troyes",
    "location_code": 1006483,   // Troyes, France
    "language_code": "fr",
    "device": "desktop",
    "depth": 10
  }]
}
```

Returns for each result: `title`, `url`, `description`, `rank_group`, `type` (organic/featured_snippet/local_pack).

**What to extract for angle selection:**
- Top 10 titles — reveals dominant content format (guide vs local page vs comparison)
- Presence of local pack — signals strong local intent
- Featured snippet content — reveals what Google already considers the best answer
- Whether competitors appear — Geoffron, Julie Lafitte, etc.

**Cost (MEDIUM confidence — verify):** DataForSEO SERP organic live ~$0.002–$0.006 per keyword. At 1 keyword per article: negligible.

#### 7b. People Also Ask (PAA)
```
POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced
```

Same endpoint — PAA results appear in the `items` array with `type: "people_also_ask"`. Extract:
```python
paa_questions = [
    item["title"]
    for item in result["items"]
    if item["type"] == "people_also_ask"
]
```

PAA questions become FAQ section headings in the article.

#### 7c. Keyword Data (volume, difficulty)
```
POST https://api.dataforseo.com/v3/dataforseo_labs/google/keywords_for_keywords/live
```

Or for exact volume:
```
POST https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

**For this project's seo-keywords.csv:** All volumes show `0` (not yet populated). This endpoint would populate them. At 25 keywords: ~$0.01–$0.05 total.

#### 7d. Location code for Troyes
`location_code: 1006483` is the DataForSEO code for Troyes, France.
Alternatively, use `location_name: "Troyes,Aube,France"` for string-based lookup.

Verify location codes at:
```
GET https://api.dataforseo.com/v3/serp/google/locations
```

### Integration pattern for the article workflow

```python
import requests
import base64

DATAFORSEO_LOGIN = "your_login"
DATAFORSEO_PASSWORD = "your_password"
credentials = base64.b64encode(f"{DATAFORSEO_LOGIN}:{DATAFORSEO_PASSWORD}".encode()).decode()

def get_serp_data(keyword: str) -> dict:
    """Fetch SERP data for angle selection before article generation."""
    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json"
    }
    payload = [{
        "keyword": keyword,
        "location_code": 1006483,   # Troyes
        "language_code": "fr",
        "device": "desktop",
        "depth": 10
    }]
    resp = requests.post(
        "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
        headers=headers,
        json={"data": payload}
    )
    resp.raise_for_status()
    result = resp.json()["tasks"][0]["result"][0]

    top_10 = [
        {"title": item["title"], "url": item["url"], "type": item["type"]}
        for item in result["items"]
        if item["type"] in ("organic", "featured_snippet")
    ][:10]

    paa = [
        item["title"]
        for item in result["items"]
        if item["type"] == "people_also_ask"
    ]

    return {
        "top_10_titles": top_10,
        "paa_questions": paa,
        "total_count": result.get("items_count", 0)
    }
```

### What data to pass to Claude for angle selection

```
SERP Analysis for: "magnétiseur arrêt tabac"

Top 10 results:
1. [organic] "Arrêt du tabac par le magnétiseur : est-ce efficace ?" — guide informatif
2. [organic] "Magnétiseur pour arrêter de fumer près de chez moi" — page service locale
...

PAA questions:
- "Le magnétiseur peut-il vraiment aider à arrêter de fumer ?"
- "Combien de séances chez le magnétiseur pour arrêter de fumer ?"
- "Quelle différence entre magnétiseur et hypnothérapeute pour l'arrêt tabac ?"

What angle is MISSING from the top 10? What can this article offer that none of the top results provide?
```

---

## 8. Recommended End-to-End Workflow

```
Step 1: Select article from content-queue.yaml (highest priority "planned")
   ↓
Step 2: Fetch SERP data via DataForSEO (top 10 + PAA) for primary keyword
   ↓
Step 3: Count tokens (count_tokens API) to verify budget
   ↓
Step 4: Call Claude API (streaming) with lean context + SERP data
        → Outputs complete blog/[slug].html
   ↓
Step 5: Validate output (validate_html_article function)
        → If errors: re-prompt with error list (max 2 retries)
   ↓
Step 6: Extract metadata (slug, title, description, date) from generated HTML
        → Update config.js SITE_CONFIG.blog array (prepend new entry)
        → Run: npx terser assets/js/config.js -o assets/js/config.min.js -c -m
        → Add URL to sitemap.xml
   ↓
Step 7: Update engine data files:
        → content-map.yaml (add new entry)
        → seo-keywords.csv (mark keyword status)
        → content-queue.yaml (mark status: "done")
        → changelog.md (log the action)
   ↓
Step 8: Set status: "human-review" — do NOT auto-publish
```

---

## 9. Gotchas & Known Pitfalls

### Gotcha 1: Claude truncates output if max_tokens too low
If `max_tokens` is too small for a pillar article, Claude will stop mid-sentence. Always set `max_tokens` generously (10 000–12 000 for pillar). The model stops when the article is done, not at the limit — you only pay for tokens actually generated.

### Gotcha 2: HTML inside JSON-LD confuses the model
The schema JSON-LD blocks contain nested quotes and special characters. Claude sometimes corrupts them. Include a note in the system prompt: "Schema JSON-LD blocks must use proper JSON escaping. Test mentally that the JSON is valid before outputting."

### Gotcha 3: data-price attribute inconsistency
Claude sometimes writes `data-price="120"` (with the actual value) instead of `data-price="tabac"`. This is the most common constraint violation. Put this rule first in your `<rules>` block, and include a one-shot example. Add it to the validator.

### Gotcha 4: content-map.yaml grows to 53KB — don't pass it whole
Already identified above. Extract only slugs + titles. A Python one-liner:
```python
import yaml
with open(".seo-engine/data/content-map.yaml") as f:
    data = yaml.safe_load(f)
slug_list = [f"- {b['slug']}: {b['title']}" for b in data.get("blogs", [])]
compact = "\n".join(slug_list)  # ~2 000 tokens instead of 13 400
```

### Gotcha 5: French accents in slugs
DataForSEO keywords contain accents (é, è, à). HTML slug must be accent-free kebab-case. Claude usually handles this correctly but validate with:
```python
import re, unicodedata
def to_slug(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
```

### Gotcha 6: Model output starts with markdown fence
Sometimes Claude adds ` ```html ` before the HTML despite instructions. Add to validator:
```python
if html.strip().startswith("```"):
    html = re.sub(r"^```html?\n?", "", html.strip())
    html = re.sub(r"\n?```$", "", html)
```

### Gotcha 7: DataForSEO rate limits and sandbox
DataForSEO has a sandbox mode (returns fake data, free):
```
POST https://sandbox.dataforseo.com/v3/serp/google/organic/live/advanced
```
Use sandbox for development. Switch to `api.dataforseo.com` for production. Credentials are the same.

### Gotcha 8: Extended thinking not available on all models
Verify that `claude-sonnet-4-6` supports extended thinking. As of training cutoff, extended thinking was available on `claude-3-7-sonnet-20250219` and newer Sonnet/Opus models. Confirm model ID support at https://console.anthropic.com or docs before using `thinking` parameter.

---

## 10. Minimal Working Implementation

```python
#!/usr/bin/env python3
"""
Minimal blog article generator for magnetiseuse-lacoste-corinne.fr
Requires: pip install anthropic pyyaml
"""
import anthropic
import yaml
import re
import sys
from pathlib import Path

ROOT = Path("E:/Site CL")

def load_context_lean() -> str:
    """Load context files, trimming content-map to slug list only."""

    config = (ROOT / ".seo-engine/config.yaml").read_text("utf-8")
    tone = (ROOT / ".seo-engine/templates/tone-guide.md").read_text("utf-8")
    structures = (ROOT / ".seo-engine/templates/blog-structures.yaml").read_text("utf-8")
    instructions = (ROOT / "INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md").read_text("utf-8")

    # config.js: pricing section only (approx first 150 lines)
    config_js_lines = (ROOT / "assets/js/config.js").read_text("utf-8").split("\n")
    pricing_js = "\n".join(config_js_lines[:150])

    # content-map: slugs and titles only
    with open(ROOT / ".seo-engine/data/content-map.yaml", encoding="utf-8") as f:
        cmap = yaml.safe_load(f)
    slug_list = "\n".join(
        f"- {b['slug']}: {b.get('title', '')}"
        for b in cmap.get("blogs", [])
    )

    return f"""<context>
<site_config>
{config}
</site_config>

<tone_guide>
{tone}
</tone_guide>

<blog_structures>
{structures}
</blog_structures>

<article_instructions>
{instructions}
</article_instructions>

<pricing_config>
// From assets/js/config.js — SITE_CONFIG.pricing
{pricing_js}
</pricing_config>

<published_articles>
{slug_list}
</published_articles>
</context>"""


RULES = """
<rules>
ABSOLUTE CONSTRAINTS — never violate:
1. Output ONLY the raw HTML file. No markdown fences. No explanations.
2. First line must be: <!DOCTYPE html>
3. NEVER write a price as a euro amount. Always use: <span data-price="KEY"></span>
4. NEVER mention rTMS, stimulation magnétique transcrânienne.
5. NEVER write: guérir, guérison, traitement médical, remboursé Sécurité Sociale.
6. Schema FAQPage JSON-LD must have "name" property on the root object.
7. data-blog-current must equal the slug exactly (no .html suffix).
8. Related articles block must use data-blog-list="related" with empty div interior.
9. Use data-contact="adresse" for address, data-contact="rdvSousJours" for appointment delay.
10. Article is in French. Write entirely in French.
</rules>
"""


def generate_article(slug: str, title: str, article_type: str,
                      primary_keyword: str, unique_angle: str,
                      serp_data: dict, word_count: int = 2000) -> str:
    """Generate a complete HTML article. Returns HTML string."""

    client = anthropic.Anthropic()
    context = load_context_lean()
    system_prompt = context + "\n\n" + RULES

    user_prompt = f"""Generate the complete HTML blog article:

Slug: {slug}
Title: {title}
Type: {article_type}
Primary keyword: {primary_keyword}
Unique angle: {unique_angle}
Target word count: {word_count}
Article date: 2026-03-29

SERP Top 10 titles:
{chr(10).join(f'{i+1}. {t}' for i, t in enumerate(serp_data.get('top_10_titles', [])))}

PAA Questions (use as FAQ headings):
{chr(10).join(f'- {q}' for q in serp_data.get('paa_questions', []))}

Output only the complete blog/{slug}.html file. Start immediately with <!DOCTYPE html>."""

    # Token check
    count = client.messages.count_tokens(
        model="claude-sonnet-4-6",
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    print(f"Input tokens: {count.input_tokens}")

    # Generate with streaming
    html_parts = []
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=10000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    ) as stream:
        for text in stream.text_stream:
            html_parts.append(text)
            print(text, end="", flush=True)

        final = stream.get_final_message()
        print(f"\n\nOutput tokens: {final.usage.output_tokens}")

    html = "".join(html_parts)

    # Strip markdown fences if present
    html = re.sub(r"^```html?\n?", "", html.strip())
    html = re.sub(r"\n?```$", "", html)

    return html


def validate_html_article(html: str, slug: str) -> list:
    errors = []
    if re.search(r'\b(120|80|90|45)€', html):
        errors.append("Hard-coded price found")
    if re.search(r'rTMS|stimulation magnétique transcrânienne', html, re.IGNORECASE):
        errors.append("rTMS mentioned")
    if f'data-blog-current="{slug}"' not in html:
        errors.append(f"data-blog-current not set to '{slug}'")
    if not html.strip().startswith("<!DOCTYPE html>"):
        errors.append("Output does not start with <!DOCTYPE html>")
    if '"@type": "FAQPage"' in html:
        # Check if "name" appears after the FAQPage declaration
        faq_pos = html.index('"@type": "FAQPage"')
        surrounding = html[faq_pos:faq_pos+200]
        if '"name"' not in surrounding:
            errors.append("FAQPage schema missing 'name' property")
    return errors


if __name__ == "__main__":
    # Example usage
    html = generate_article(
        slug="magnetiseur-arret-tabac-seance-unique",
        title="Magnétiseur Arrêt Tabac : Tout Savoir sur la Séance Unique",
        article_type="tutorial",
        primary_keyword="magnétiseur arrêt tabac",
        unique_angle="Seul article qui détaille minute par minute ce qui se passe pendant la séance combo magnétisme+hypnose",
        serp_data={"top_10_titles": [], "paa_questions": []},
        word_count=2000
    )

    errors = validate_html_article(html, "magnetiseur-arret-tabac-seance-unique")
    if errors:
        print(f"\nVALIDATION ERRORS: {errors}")
        sys.exit(1)

    output_path = ROOT / "blog/magnetiseur-arret-tabac-seance-unique.html"
    output_path.write_text(html, encoding="utf-8")
    print(f"\nSaved to {output_path}")
```

---

## Summary Table

| Question | Answer |
|----------|--------|
| Best context structure | XML-tagged sections in system prompt |
| Most expensive file to pass | content-map.yaml (53KB / ~13K tokens) — trim to slug list |
| Lean context size | ~10 000–12 000 tokens |
| Extended thinking for generation | Not needed — use only for pre-writing analysis |
| Streaming vs non-streaming | Streaming — better recovery, live progress |
| HTML enforcement method | Rules block + one-shot example + post-generation validator |
| Token counting | `client.messages.count_tokens()` before every call |
| Output token budget | 6 000–12 000 depending on article type |
| Cost per article (lean context) | ~$0.11–$0.14 |
| DataForSEO endpoint for SERP | `/v3/serp/google/organic/live/advanced` |
| DataForSEO PAA | Same endpoint — filter `type == "people_also_ask"` |
| Troyes location code | `1006483` |
| DataForSEO sandbox | `sandbox.dataforseo.com` (free, fake data) |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Claude Messages API structure | HIGH | Core API, well-documented, stable |
| Streaming implementation | HIGH | Standard SDK feature |
| Token counting endpoint | HIGH | `count_tokens` is an official endpoint |
| Extended thinking parameters | MEDIUM | Feature exists; verify `claude-sonnet-4-6` specifically supports it |
| Output token limits (8192) | MEDIUM | Was 8192 for Sonnet as of training cutoff; verify current model |
| DataForSEO endpoints | MEDIUM | Endpoints correct as of training knowledge; verify against current docs |
| DataForSEO pricing | LOW | Verify at https://dataforseo.com/apis/serp-api/ — changes frequently |
| Troyes location code 1006483 | MEDIUM | Common DataForSEO city code; verify with locations endpoint |

---

*Research compiled 2026-03-29 — based on Anthropic API documentation (training cutoff August 2025) and DataForSEO API knowledge. Verify pricing and model-specific limits at https://console.anthropic.com before production use.*
