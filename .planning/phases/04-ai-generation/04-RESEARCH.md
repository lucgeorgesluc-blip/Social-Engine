# Phase 4: AI Generation - Research

**Researched:** 2026-04-06
**Domain:** Claude API integration, prompt engineering, cost guardrails, objection tracking
**Confidence:** HIGH

<user_constraints>
## User Constraints (from project context)

### Locked Decisions
- Stack: Node 20 + Express 4 + EJS + pg (raw SQL) + @anthropic-ai/sdk + Tailwind CSS
- Claude API for generation (not OpenAI, not Gemini)
- Budget-conscious: cost guardrails mandatory (warn at 50/month, refuse at 100)
- Post types: objection-buster, temoignage, myth-buster, timeline, etc.
- UI text in French
- Never mention rTMS anywhere

### Claude's Discretion
- Prompt template design and structure
- Generation counter storage (DB vs memory)
- Objection frequency threshold logic
- Streaming vs non-streaming API response
- Token/cost estimation approach
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Generate post draft via Claude API by selecting type | @anthropic-ai/sdk message creation, prompt templates per type |
| AI-02 | Edit AI-generated draft inline before saving | Frontend contenteditable or textarea, save to posts table |
| AI-03 | Objection frequency tracker auto-suggests topics when >= 3 | SQL aggregation on comments.objection_type, homepage widget |
</phase_requirements>

---

## Summary

Phase 4 adds AI-powered post generation to the existing dashboard. The @anthropic-ai/sdk package is already in the project root dependencies (v0.80.0). The implementation is straightforward: a server-side route receives a post type, builds a prompt from templates, calls Claude API, and returns the generated text. The frontend renders it in an editable textarea for review before saving.

The main concerns are: (1) cost control — a `generation_counter` table tracking monthly usage with hard limits, (2) prompt quality — templates must produce Facebook-ready posts in French about magnetism/hypnosis for tobacco cessation, and (3) objection pattern detection — a SQL query aggregating comment classifications to surface repeated objection types.

**Primary recommendation:** Use `claude-haiku-4-5-20251001` for generation (fast, cheap, good enough for social posts), store prompts as EJS partials or JS objects, track usage in a dedicated DB table with month-based counters.

---

## Technical Research

### 1. Anthropic SDK Integration

**Package:** `@anthropic-ai/sdk` (already in project at v0.80.0)

**Server-side pattern:**
```javascript
const Anthropic = require('@anthropic-ai/sdk');
// Or if using the project's existing package:
// import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generatePost(type, context) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(type, context) }]
  });
  return message.content[0].text;
}
```

**Key decisions:**
- Model: `claude-haiku-4-5-20251001` — fastest, cheapest, sufficient quality for social media posts
- Max tokens: 1024 — Facebook posts are short (< 500 words)
- No streaming needed — response is fast enough with Haiku (< 5s typically)
- API key stored in `ANTHROPIC_API_KEY` env var

### 2. Prompt Template Architecture

**Post types and their prompt requirements:**

| Type | French Label | Key Elements |
|------|-------------|--------------|
| objection-buster | Contre-objection | Address a specific objection about magnetism/hypnosis |
| temoignage | Temoignage | Craft a testimonial-style post (anonymized) |
| myth-buster | Destructeur de mythes | Debunk a common myth about tobacco cessation methods |
| timeline | Chronologie | Day-by-day or week-by-week cessation journey |
| tip | Conseil pratique | Practical tip for managing cravings |
| motivation | Motivation | Motivational post for people considering quitting |

**Template structure:**
```javascript
const PROMPT_TEMPLATES = {
  'objection-buster': {
    system: `Tu es une rédactrice de contenu pour une magnétiseuse et hypnothérapeute à Troyes...`,
    user: `Écris un post Facebook qui répond à cette objection : {{objection_text}}...`
  },
  // ... per type
};
```

**Important constraints for all prompts:**
- Language: French
- Tone: warm, professional, non-medical
- Never mention rTMS (project rule from CLAUDE.md)
- Include a soft CTA (book appointment link)
- Target length: 150-300 words (Facebook optimal)

### 3. Cost Guardrails (AI-03 partial + budget control)

**DB table:**
```sql
CREATE TABLE ai_generations (
  id SERIAL PRIMARY KEY,
  month_key VARCHAR(7) NOT NULL,  -- '2026-04'
  post_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_gen_month ON ai_generations(month_key);
```

**Counter logic:**
```javascript
// Before generation:
const { count } = await db.query(
  `SELECT COUNT(*) as count FROM ai_generations WHERE month_key = $1`,
  [currentMonthKey()]
);
if (count >= 100) return res.status(429).json({ error: 'Limite mensuelle atteinte (100)' });
if (count >= 50) // Include warning in response

// After generation:
await db.query(
  `INSERT INTO ai_generations (month_key, post_type, tokens_used) VALUES ($1, $2, $3)`,
  [currentMonthKey(), type, message.usage.output_tokens]
);
```

**Monthly limits:**
- 50 generations: warning banner displayed
- 100 generations: hard block, no more API calls
- Counter resets each calendar month (month_key changes)
- Cost estimate: Haiku at ~$0.001/generation = ~$0.10/month at full usage

### 4. Inline Editing (AI-02)

**Pattern:** Generate → display in textarea → user edits → save as draft post

**Flow:**
1. User selects post type + optional context (e.g., specific objection)
2. Click "Generer" → POST `/dashboard/ai/generate`
3. Server calls Claude API, returns text
4. Frontend displays in `<textarea>` with full editing capability
5. User clicks "Sauvegarder comme brouillon" → POST `/dashboard/posts` with status='draft'
6. Redirect to post edit page

**No contenteditable needed** — a simple textarea is more reliable and consistent with the EJS/server-rendered approach.

### 5. Objection Frequency Tracking (AI-03)

**SQL query for detecting repeated objections:**
```sql
SELECT objection_type, COUNT(*) as frequency
FROM comments
WHERE objection_type IS NOT NULL
  AND created_at > NOW() - INTERVAL '90 days'
GROUP BY objection_type
HAVING COUNT(*) >= 3
ORDER BY frequency DESC;
```

**Homepage widget:**
- Show on dashboard homepage when query returns results
- Display: "Suggestion: Ecrire un post sur '{objection_type}' (vu {frequency} fois)"
- Link to generate page pre-filled with that objection type
- Only show objections that don't already have a corresponding post (LEFT JOIN with posts to exclude covered topics)

### 6. Route Structure

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/ai` | AI generation page (type selector + generate form) |
| POST | `/dashboard/ai/generate` | Call Claude API, return generated text |
| GET | `/dashboard/ai/usage` | Current month usage stats (AJAX) |

### 7. Dependencies

**No new npm packages required.** `@anthropic-ai/sdk` is already installed in the project. The dashboard's `package.json` needs to add it:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0"
  }
}
```

### 8. Security Considerations

- `ANTHROPIC_API_KEY` must be in `.env`, never in client-side code
- Generation endpoint must be behind auth middleware (already applied to all `/dashboard/*` routes)
- Rate limiting is handled by the monthly counter, no additional rate limiter needed
- Input sanitization: user-provided context (objection text) must be escaped before prompt injection

---

## Validation Architecture

### Critical Paths
1. Generate flow: select type → call API → display result → edit → save as draft
2. Cost guardrails: counter increments → warning at 50 → block at 100
3. Objection detection: comments aggregation → suggestion widget on homepage

### Test Approach
- Unit tests for prompt template builders
- Integration test for generation endpoint (mock Claude API)
- DB test for counter logic (month boundary, limit enforcement)
- E2E: generate → edit → save → verify post in list

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API key exposure | LOW | HIGH | Server-side only, .env, never client |
| Runaway costs | LOW | MEDIUM | Hard limit at 100/month, Haiku is very cheap |
| Slow generation | LOW | LOW | Haiku typically responds in 2-5s |
| Poor prompt quality | MEDIUM | MEDIUM | Iterate on templates, test with real scenarios |
| Objection type not tracked | MEDIUM | LOW | Depends on Phase 2/3 comment classification being populated |

---

## Open Questions

1. Should prompts reference `.social-engine/config.yaml` trust signals (testimonials, stats) for richer generation? Recommendation: YES — read trust_signals at startup for prompt context.
2. Exact objection_type values in comments table — depends on Phase 2/3 implementation. Planner should check schema.
3. Whether to store generated text history (for regeneration/comparison) or just the final saved draft. Recommendation: store in ai_generations table for audit trail.

---

*Phase: 04-ai-generation*
*Research completed: 2026-04-06*
