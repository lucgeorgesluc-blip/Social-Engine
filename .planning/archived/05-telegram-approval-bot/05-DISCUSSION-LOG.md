# Phase 5: Telegram Approval Bot - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 05-telegram-approval-bot
**Areas discussed:** Re-generation scope, Concurrent pending handling, Preview text extraction, Bot architecture

---

## Re-generation scope

| Option | Description | Selected |
|--------|-------------|----------|
| Generator only | Re-call Claude with same topic + original context + edit feedback. Skip topic selection, image gen. | |
| Full pipeline re-run | Re-run run.js from Step 1 with --feedback flag. Re-selects topic, re-generates image. | |

**Follow-up: Token-optimized re-generation mode**

| Option | Description | Selected |
|--------|-------------|----------|
| Edit-in-place | Send existing HTML + edit instruction only. Claude returns modified sections. ~$0.02/edit. | ✓ |
| Full re-gen with edit context | Full article re-generation + edit feedback injected. $0.11/edit. | |
| Targeted section re-gen | Claude identifies and rewrites one section. $0.04–0.07/edit. | |

**User's choice:** Edit-in-place — token efficiency was the priority.

**Re-validation after edit:**
- Full re-validation (all 7 checks): ✓ Selected — safe, Corinne's edit could break checks

**Image on edit:**
- Reuse existing image: ✓ Selected — edit changes text only, not image topic

**Edit storage:**
- pending.json with feedback field + edit_count: ✓ Selected — most efficient and practical
- Separate edit-session.json: Not selected

---

## Concurrent pending handling

| Option | Description | Selected |
|--------|-------------|----------|
| Block + Telegram reminder | Check pending.json at startup, stop if found | |
| Overwrite old pending | Silent replace, orphaned buttons risk | |
| Alert Corinne first | Adds Telegram dependency to pipeline startup | |
| Stack up to 3 pending | Allow multiple pending articles as array | ✓ |

**User's choice:** Stack up to 3 pending — user wanted flexibility to have multiple articles waiting.
**Notes:** Queue/stack mode was explicitly requested for Phase 5 (not deferred).

**Stack storage:**
- Single pending.json as array: ✓ Selected

**Multiple article messages:**
- One message per article: ✓ Selected

**Rollback on 3-Modifier failure:**
- Leave files, mark status 'abandoned' in content-queue.yaml: ✓ Selected — no rollback complexity

---

## Preview text extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Strip all HTML tags, then truncate | Regex remove tags, collapse whitespace, 200 chars | ✓ |
| Find first <p> tag | Targeted but fragile | |

**Word count:**
- Content only (strip HTML first): ✓ Selected

**Internal link count:**
- Any <a href> tag (simple count, all links): ✓ Selected — simpler regex, no domain filtering

---

## Bot architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook via Express | Register webhook to Render HTTPS URL, Express handles updates | ✓ |
| Long polling in server.js | Polls Telegram, works anywhere, open connection | |

**Bot startup:**
- Bot module imported in server.js, mounts on app: ✓ Selected — one process, one PORT

**Local dev mode:**
- Auto-detect: polling locally, webhook on Render (NODE_ENV check): ✓ Selected

**Render URL:**
- RENDER_URL env var: ✓ Selected — added to .env.example

---

## Claude's Discretion

The following were not discussed — left to Claude/planner:
- telegraf v4 bot initialization pattern
- Callback data encoding for inline buttons
- Timeout handling for unanswered Modifier prompts
- How telegraf handles concurrent updates internally
