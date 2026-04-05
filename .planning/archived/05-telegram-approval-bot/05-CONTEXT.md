# Phase 5: Telegram Approval Bot - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the interactive Telegram bot that: receives article previews from the pipeline after generation, sends Corinne a formatted message with preview stats + inline buttons "Approuver et deployer" / "Modifier", handles approval (triggers SFTP deploy + GSC ping), handles edit requests (edit-in-place Claude call, up to 3 cycles), and manages up to 3 concurrently pending articles as a stack.

No new article selection logic, no new image generation on edit, no dashboard changes.

</domain>

<decisions>
## Implementation Decisions

### Bot Architecture
- **D-01:** Webhook via Express in production — register bot webhook to `${RENDER_URL}/telegram/webhook`. Render provides a public HTTPS URL, no polling loop needed.
- **D-02:** Long-polling locally (NODE_ENV ≠ 'production') — auto-detect via telegraf v4 mode switching. No ngrok or public URL required for local dev.
- **D-03:** Bot module imported in `server.js` — `import { startBot } from './telegram/bot.js'`. Mounts the webhook route on the existing Express app. One process, one PORT. No separate bot process.
- **D-04:** `RENDER_URL` env var — added to `.env.example`. Bot reads `process.env.RENDER_URL` to construct webhook URL.

### Re-generation Scope (Modifier flow)
- **D-05:** Edit-in-place — when "Modifier" is pressed, send Claude: existing article HTML + edit instruction only. Claude returns modified HTML, NOT a full re-generation. Cost: ~$0.02 vs $0.11 for full re-gen.
- **D-06:** Full re-validation after edit — run all 7 validator.js checks on the returned HTML (no rTMS, data-price=, FAQPage schema, etc.). If validation fails: send Telegram error alert listing failing checks; edit attempt counts toward the 3-cycle limit.
- **D-07:** Reuse existing hero image — edit-in-place modifies text content only, not image. Image was already saved; no Gemini call on edit.
- **D-08:** Edit feedback storage in `pending.json` — extend each pending article item with `edit_count: number` and `edit_history: string[]` (array of edit instructions). No separate session file.

### Pending Article Stack
- **D-09:** Stack up to 3 pending articles — `pending.json` is an array of pending article objects (max 3 items). Pipeline's `writePending()` appends to the array; if array already has 3 items, block new generation.
- **D-10:** Block pipeline + Telegram reminder when at stack limit — if `pending.json` array has 3 items: send Telegram alert "3 articles attendent ta validation. Génération bloquée." and stop. Clean exit, no crash.
- **D-11:** One Telegram message per pending article — each item gets its own message with its own inline buttons. Corinne acts on each independently.
- **D-12:** On rejection after 3 Modifier attempts — leave generated files on disk (local only, not deployed), update `content-queue.yaml` status to `'abandoned'`. No rollback. Clear the item from `pending.json` array.

### Preview Text Extraction
- **D-13:** Strip all HTML tags before extracting preview — regex strip tags, collapse whitespace, truncate to 200 chars. No external parser dependency.
- **D-14:** Word count from stripped content — same tag-stripping regex, then `split(/\s+/).length`.
- **D-15:** Internal link count = all `<a href>` tags in the article HTML (simple count, not filtered by domain). Regex: `/<a\s[^>]*href=/gi`.
- **D-16:** Image status = check `imagePath` field in `pending.json` item — `null` → "❌ Aucune image", non-null → "✅ Image présente".

### Telegram Message Format
- **D-17:** Preview message format (per ROADMAP success criteria):
  ```
  📝 [Article Title]

  [first 200 chars of stripped content]...

  📊 ~[word count] mots · 🔗 [link count] liens internes · 🖼 [image status]
  ```
  Followed by two inline buttons: `[✅ Approuver et déployer]` `[✏️ Modifier]`
- **D-18:** After approval: send confirmation message `"✅ Article déployé : https://www.magnetiseuse-lacoste-corinne.fr/blog/[slug].html"`
- **D-19:** After 3 failed Modifier cycles: send `"⚠️ Limite de modifications atteinte pour '[title]'. Article abandonné."`
- **D-20:** Validation failure alert: send `"❌ Validation échouée pour '[slug]' :\n- [check 1 that failed]\n- [check 2]"` (exact failing check names).

### Claude's Discretion
- telegraf v4 bot initialization pattern (Telegraf class setup, session middleware)
- Callback data encoding for inline buttons (slug identifier to disambiguate multi-article stack)
- Timeout handling if Corinne never responds to a Modifier prompt
- How to handle concurrent Telegram updates (telegraf handles this natively via queue)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Outputs to Integrate With
- `autopilot/pipeline/deploy-orchestrator.js` — `writePending()`, `readPending()`, `triggerDeploy()` already implemented; Phase 5 extends `writePending()` to handle array + edit fields
- `autopilot/pipeline/run.js` — Step 8 calls `writePending()`; Phase 5 adds the stack limit check before Step 1
- `autopilot/pipeline/validator.js` — Reuse in edit-in-place re-validation flow
- `autopilot/server.js` — Phase 5 adds bot startup call here
- `autopilot/.env.example` — Add `RENDER_URL` env var

### Requirements
- `.planning/REQUIREMENTS.md` — F1.7 (approval gate), F1.7a (Telegram bot spec), F1.8 (SFTP deploy), F1.9 (GSC ping)
- `.planning/PROJECT.md` — Core value: Corinne approves from phone, no manual work

### Library Decision
- `telegraf` v4.16.3 — already in `autopilot/package.json`. Use this, NOT `node-telegram-bot-api`.

### Prior Phase Patterns
- `autopilot/pipeline/generator.js` — Claude streaming pattern to replicate for edit-in-place call
- `autopilot/config/constants.js` — `MAX_ARTICLES_PER_RUN` pattern; Phase 5 adds `MAX_PENDING_ARTICLES = 3`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deploy-orchestrator.js` — `triggerDeploy()` fully implements SFTP + GSC ping + status update. Bot just calls this on approval.
- `validator.js` — 7-check validation function already implemented. Call it on edit-in-place result.
- `generator.js` — Claude streaming API call pattern. Edit-in-place uses same pattern with different prompt (existing HTML + edit instruction, not full article generation).
- `server.js` — Express app already instantiated; bot mounts webhook route onto it.

### Established Patterns
- ESM imports (`import`/`export`) throughout
- DI pattern for testing: pass `_fn` options to injectable functions
- `pino` logger with `{ name: 'module-name' }` per module
- `.env` / `process.env` for all secrets — never hardcoded

### Integration Points
- `pending.json` (array format after Phase 5) — central state between pipeline and bot
- `server.js` — `startBot(app)` called after app setup
- `pipeline/run.js` Step 0 — adds stack-limit check before run guard check

</code_context>

<specifics>
## Specific Ideas

- telegraf v4 inline keyboard: `Markup.inlineKeyboard([[Markup.button.callback('✅ Approuver', `approve:${slug}`), Markup.button.callback('✏️ Modifier', `edit:${slug}`)]])`
- Callback data pattern `action:slug` disambiguates which article from the stack is being acted on
- `NODE_ENV=production` → webhook mode; otherwise → polling mode
- Webhook URL: `${process.env.RENDER_URL}/telegram/webhook`
- Edit-in-place prompt structure: `<existing_html>[article HTML]</existing_html>\n<edit_instruction>[Corinne's text]</edit_instruction>\nReturn only the modified complete HTML file.`

</specifics>

<deferred>
## Deferred Ideas

- Per-article edit count > 3 as a configurable limit (hardcode 3 for now per ROADMAP)
- Queue-mode configuration UI in dashboard (allow user to set max pending from dashboard)
- Telegram message threading / reply to original message on edit cycle
- Automatic timeout: if no response within 48h, abandon and notify (future hardening phase)

</deferred>

---

*Phase: 05-telegram-approval-bot*
*Context gathered: 2026-03-30*
