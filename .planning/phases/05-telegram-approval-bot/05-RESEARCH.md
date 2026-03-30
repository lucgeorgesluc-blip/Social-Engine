# Phase 5: Telegram Approval Bot - Research

**Researched:** 2026-03-30
**Domain:** Telegram Bot API via telegraf v4, inline keyboards, callback queries, webhook/Express integration, conversation state management
**Confidence:** HIGH

## Summary

Phase 5 adds a Telegram bot that receives article previews after generation, presents them to Corinne with inline approve/modify buttons, and handles the full approval or edit-in-place cycle. The bot integrates into the existing Express server via webhook middleware in production and uses long-polling locally. The core challenge is managing per-article conversation state (which article is being edited, edit count, waiting-for-text state) using the existing `pending.json` file-based approach rather than telegraf's scene/session middleware.

All required pieces are already in the codebase: `deploy-orchestrator.js` provides `triggerDeploy()` for the approve flow, `validator.js` provides the 7-check validation for post-edit re-validation, and `generator.js` provides the Claude streaming pattern to replicate for edit-in-place calls. The telegraf library (v4.16.3) is already installed in `autopilot/package.json`.

**Primary recommendation:** Build `autopilot/telegram/bot.js` as a single module that exports `startBot(app)`. Use `pending.json` (upgraded to array format) as both the approval gate state and the conversation state store (edit_count, edit_history, awaiting_edit flag per item). No telegraf scenes or session middleware needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Webhook via Express in production -- register bot webhook to `${RENDER_URL}/telegram/webhook`. Render provides a public HTTPS URL, no polling loop needed.
- **D-02:** Long-polling locally (NODE_ENV != 'production') -- auto-detect via telegraf v4 mode switching. No ngrok or public URL required for local dev.
- **D-03:** Bot module imported in `server.js` -- `import { startBot } from './telegram/bot.js'`. Mounts the webhook route on the existing Express app. One process, one PORT. No separate bot process.
- **D-04:** `RENDER_URL` env var -- added to `.env.example`. Bot reads `process.env.RENDER_URL` to construct webhook URL.
- **D-05:** Edit-in-place -- when "Modifier" is pressed, send Claude: existing article HTML + edit instruction only. Claude returns modified HTML, NOT a full re-generation. Cost: ~$0.02 vs $0.11 for full re-gen.
- **D-06:** Full re-validation after edit -- run all 7 validator.js checks on the returned HTML. If validation fails: send Telegram error alert listing failing checks; edit attempt counts toward the 3-cycle limit.
- **D-07:** Reuse existing hero image -- edit-in-place modifies text content only, not image. No Gemini call on edit.
- **D-08:** Edit feedback storage in `pending.json` -- extend each pending article item with `edit_count: number` and `edit_history: string[]`. No separate session file.
- **D-09:** Stack up to 3 pending articles -- `pending.json` is an array of pending article objects (max 3 items). Pipeline's `writePending()` appends to array; if array already has 3 items, block new generation.
- **D-10:** Block pipeline + Telegram reminder when at stack limit -- if `pending.json` array has 3 items: send Telegram alert "3 articles attendent ta validation. Generation bloquee." and stop.
- **D-11:** One Telegram message per pending article -- each item gets its own message with its own inline buttons. Corinne acts on each independently.
- **D-12:** On rejection after 3 Modifier attempts -- leave generated files on disk (local only, not deployed), update `content-queue.yaml` status to `'abandoned'`. No rollback. Clear the item from `pending.json` array.
- **D-13:** Strip all HTML tags before extracting preview -- regex strip tags, collapse whitespace, truncate to 200 chars.
- **D-14:** Word count from stripped content -- same tag-stripping regex, then `split(/\s+/).length`.
- **D-15:** Internal link count = all `<a href>` tags in the article HTML. Regex: `/<a\s[^>]*href=/gi`.
- **D-16:** Image status = check `imagePath` field in `pending.json` item.
- **D-17:** Preview message format per ROADMAP success criteria.
- **D-18:** After approval: send confirmation message with live URL.
- **D-19:** After 3 failed Modifier cycles: send alert "Limite de modifications atteinte" and stop.
- **D-20:** Validation failure alert: send failing check names.

### Claude's Discretion
- telegraf v4 bot initialization pattern (Telegraf class setup, session middleware)
- Callback data encoding for inline buttons (slug identifier to disambiguate multi-article stack)
- Timeout handling if Corinne never responds to a Modifier prompt
- How to handle concurrent Telegram updates (telegraf handles this natively via queue)

### Deferred Ideas (OUT OF SCOPE)
- Per-article edit count > 3 as a configurable limit (hardcode 3 for now)
- Queue-mode configuration UI in dashboard
- Telegram message threading / reply to original message on edit cycle
- Automatic timeout: if no response within 48h, abandon and notify
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F1.7 | Approval Gate -- Telegram message with preview stats + inline buttons Approve/Modify, save pending state | telegraf inline keyboard API, `pending.json` array format, preview text extraction patterns |
| F1.7a | Edit via Prompt -- "Modifier" triggers free-text prompt, Claude re-generates with feedback, loop up to 3x | Edit-in-place Claude call pattern, `pending.json` conversation state, validator re-run |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| telegraf | 4.16.3 | Telegram Bot framework | Already installed. Native webhook + inline keyboard + callback_query. TypeScript types. |
| @anthropic-ai/sdk | ^0.80.0 | Claude API for edit-in-place | Already installed. Streaming pattern from generator.js. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express | ^5.2.1 | HTTP server for webhook | Already running in server.js. Bot mounts webhook middleware on it. |
| pino | ^10.3.1 | Structured logging | Established pattern: `pino({ name: 'telegram-bot' })` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| telegraf | node-telegram-bot-api | Depends on deprecated `@cypress/request`. Not an option. |
| File-based pending.json | Redis/SQLite | Overkill for single-user bot with max 3 pending items. File is simpler and already established. |
| telegraf Scenes | pending.json state flags | Scenes add session middleware complexity. pending.json already stores per-article state; adding `awaiting_edit` flag is simpler. |

**Installation:** No new packages needed. All dependencies already in `autopilot/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
autopilot/
  telegram/
    bot.js           # Telegraf instance, handlers, startBot(app) export
    edit-handler.js   # Edit-in-place Claude call + re-validation logic
    preview.js        # HTML stripping, preview text, stats extraction
  pipeline/
    deploy-orchestrator.js  # MODIFIED: writePending → array format, readPending → array
  config/
    constants.js      # MODIFIED: add MAX_PENDING_ARTICLES = 3, MAX_EDIT_CYCLES = 3
  state/
    pending.json      # MODIFIED: object → array of objects
```

### Pattern 1: Webhook + Polling Mode Switching
**What:** telegraf auto-detects mode based on environment
**When to use:** Always -- production uses webhook, local dev uses polling
**Example:**
```javascript
// Source: telegraf-docs/examples/webhook/express.ts + D-01/D-02
import { Telegraf, Markup } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

export async function startBot(app) {
  // Register all handlers before launching
  registerHandlers(bot);

  if (process.env.NODE_ENV === 'production') {
    // Webhook mode: mount on existing Express app
    const webhookPath = '/telegram/webhook';
    app.use(await bot.createWebhook({
      domain: process.env.RENDER_URL,
      path: webhookPath,
    }));
    logger.info({ path: webhookPath }, 'Bot webhook registered on Express');
  } else {
    // Polling mode: no public URL needed
    bot.launch();
    logger.info('Bot started in polling mode (local dev)');

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
}
```

### Pattern 2: Inline Keyboard with Slug-Scoped Callbacks
**What:** Each article gets its own buttons with slug-encoded callback data
**When to use:** For the multi-article stack (D-09, D-11)
**Example:**
```javascript
// Source: telegraf official docs + hanki.dev examples
function buildPreviewKeyboard(slug) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Approuver et deployer', `approve:${slug}`),
      Markup.button.callback('Modifier', `edit:${slug}`),
    ],
  ]);
}

// Handler uses regex to extract slug from callback data
bot.action(/^approve:(.+)$/, async (ctx) => {
  const slug = ctx.match[1];
  await ctx.answerCbQuery();
  // ... trigger deploy
});

bot.action(/^edit:(.+)$/, async (ctx) => {
  const slug = ctx.match[1];
  await ctx.answerCbQuery();
  // ... ask for edit instruction, set awaiting_edit flag
});
```

### Pattern 3: File-Based Conversation State (no scenes)
**What:** Use `pending.json` array items with `awaiting_edit` flag to track who is waiting for text input
**When to use:** When "Modifier" is pressed, set flag; when text arrives, check flag
**Example:**
```javascript
// When "Modifier" is tapped:
// 1. Set item.awaiting_edit = true in pending.json
// 2. Reply "Qu'est-ce que vous voulez modifier ?"

// When any text message arrives:
bot.on('text', async (ctx) => {
  const pending = readPendingArray();
  const awaitingItem = pending.find(item => item.awaiting_edit);
  if (!awaitingItem) return; // Not waiting for edit input

  const editInstruction = ctx.message.text;
  awaitingItem.awaiting_edit = false;
  awaitingItem.edit_count = (awaitingItem.edit_count || 0) + 1;
  awaitingItem.edit_history.push(editInstruction);
  savePendingArray(pending);

  // Trigger edit-in-place...
});
```

### Pattern 4: Edit-in-Place Claude Call
**What:** Lightweight Claude call with existing HTML + edit instruction (not full re-generation)
**When to use:** On "Modifier" flow (D-05)
**Example:**
```javascript
// Source: generator.js streaming pattern adapted for edit-in-place
import Anthropic from '@anthropic-ai/sdk';

const EDIT_MODEL = 'claude-sonnet-4-5';

async function editArticle(existingHtml, editInstruction) {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: EDIT_MODEL,
    max_tokens: 16000,
    system: 'You are editing an existing HTML article. Return ONLY the complete modified HTML file. Do not add explanations.',
    messages: [{
      role: 'user',
      content: `<existing_html>${existingHtml}</existing_html>\n<edit_instruction>${editInstruction}</edit_instruction>\nReturn only the modified complete HTML file.`,
    }],
  });

  let html = '';
  stream.on('text', (delta) => { html += delta; });
  const finalMsg = await stream.finalMessage();
  return { html, usage: finalMsg.usage };
}
```

### Anti-Patterns to Avoid
- **Using telegraf Scenes for simple state:** Scenes add session middleware, context types, and stage registration. The pending.json file already holds per-article state -- adding an `awaiting_edit` boolean is far simpler than introducing the Scenes subsystem.
- **Storing Telegram message_id in memory only:** The bot process may restart (Render deploys). Store `messageId` in `pending.json` alongside each item so the bot can edit the original preview message after an edit cycle.
- **Not calling `ctx.answerCbQuery()`:** Telegram shows a loading spinner on the button until the callback is answered. Always call it immediately, even before async work.
- **Callback data exceeding 64 bytes:** Telegram limits callback_data to 64 bytes. The `approve:${slug}` pattern is safe as long as slugs stay under ~55 chars (they are typically 3-6 words, well within limit).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram API communication | Raw HTTP calls to api.telegram.org | telegraf v4 | Handles updates, retries, type safety, middleware chain |
| Webhook verification | Manual secret token checking | `bot.createWebhook({ domain })` | telegraf sets and verifies the webhook secret automatically |
| Inline keyboard construction | Raw JSON `reply_markup` objects | `Markup.inlineKeyboard()` + `Markup.button.callback()` | Type-safe builder, less error-prone |
| HTML tag stripping | DOM parser (cheerio, jsdom) | Regex `/<[^>]*>/g` + collapse whitespace | Per D-13, no external parser dependency. Good enough for preview extraction. |
| SFTP deploy on approval | New deploy logic | `triggerDeploy()` from deploy-orchestrator.js | Already implemented and tested in Phase 4 |
| Article validation | New validation logic | `validateArticle()` from validator.js | Already implements all 7 checks |

**Key insight:** Phase 5 is primarily a coordination layer -- it connects existing pipeline modules (deploy, validate, generate) to Telegram's inline button UX. Almost no new "business logic" is needed; the work is glue code and state management.

## Common Pitfalls

### Pitfall 1: Webhook Not Receiving Updates
**What goes wrong:** Bot registers webhook but never receives updates from Telegram.
**Why it happens:** `bot.createWebhook()` must be called with the correct public domain. If RENDER_URL is wrong or missing the scheme, Telegram cannot reach the endpoint.
**How to avoid:** Validate that `RENDER_URL` starts with `https://` and is the actual Render service URL. Log the constructed webhook URL on startup.
**Warning signs:** Bot works in polling (local) but not in production. No errors in logs -- just silence.

### Pitfall 2: pending.json Race Condition (Object vs Array Migration)
**What goes wrong:** Pipeline writes an object to pending.json (Phase 4 format) while bot expects an array (Phase 5 format).
**Why it happens:** `writePending()` in deploy-orchestrator.js currently writes a single object. Phase 5 changes it to an array. If old code runs against new state file, parsing breaks.
**How to avoid:** Update `writePending()` and `readPending()` atomically in the same task. Add a migration guard: if `readPending()` returns a plain object (not array), wrap it in `[obj]` automatically.
**Warning signs:** `JSON.parse` succeeds but `.find()` on the result throws "not a function".

### Pitfall 3: Multiple Pending Articles -- Wrong Article Gets Acted On
**What goes wrong:** Corinne taps "Approuver" on article A but article B gets deployed.
**Why it happens:** Callback data does not encode which article the button belongs to.
**How to avoid:** Encode slug in callback data: `approve:${slug}`. Handler extracts slug via regex match and looks up the specific item in the pending array.
**Warning signs:** Wrong article deployed, or "no pending article" error when one exists.

### Pitfall 4: Text Message Arrives But No Article is Awaiting Edit
**What goes wrong:** Bot receives a random text message and tries to process it as an edit instruction.
**Why it happens:** The `bot.on('text')` handler fires for ALL text messages, not just edit responses.
**How to avoid:** Check `awaiting_edit` flag in pending.json. If no item has `awaiting_edit === true`, ignore the message (or reply "Aucun article en attente de modification").
**Warning signs:** Unexpected edit cycles triggered by unrelated messages.

### Pitfall 5: Edit-in-Place Returns Invalid HTML
**What goes wrong:** Claude's edit-in-place response fails validation (missing data-price, adds rTMS mention, etc.).
**Why it happens:** The edit prompt does not include the original system rules about forbidden patterns.
**How to avoid:** Include the key rules in the edit system prompt: no hard prices, no rTMS, keep data-price attributes, keep FAQPage schema. The edit prompt must be more than just "modify this HTML" -- it needs rule guardrails.
**Warning signs:** Validation failures after every edit cycle, burning through the 3-attempt limit.

### Pitfall 6: Bot Process Restart Loses Conversation State
**What goes wrong:** Corinne taps "Modifier", bot asks for text input, Render restarts the process, text response arrives but bot has forgotten it was waiting.
**Why it happens:** In-memory state is lost on restart.
**How to avoid:** Store `awaiting_edit: true` in `pending.json` (file-persisted). On startup, the `bot.on('text')` handler reads pending.json and finds the awaiting item. No in-memory state needed.
**Warning signs:** After a deploy/restart, edit flow breaks silently.

## Code Examples

### Preview Text Extraction (D-13, D-14, D-15, D-16)
```javascript
// Source: CONTEXT.md decisions D-13 through D-16
function extractPreview(html, pendingItem) {
  // Strip HTML tags, collapse whitespace
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const excerpt = stripped.slice(0, 200);
  const wordCount = stripped.split(/\s+/).length;
  const linkCount = (html.match(/<a\s[^>]*href=/gi) || []).length;
  const imageStatus = pendingItem.imagePath ? 'Image presente' : 'Aucune image';

  return { excerpt, wordCount, linkCount, imageStatus };
}
```

### Send Preview Message (D-17)
```javascript
// Source: CONTEXT.md D-17 message format
async function sendPreview(bot, chatId, pendingItem, html) {
  const { excerpt, wordCount, linkCount, imageStatus } = extractPreview(html, pendingItem);
  const imgIcon = pendingItem.imagePath ? '\u2705' : '\u274C';

  const text = [
    `\uD83D\uDCDD ${pendingItem.title}`,
    '',
    `${excerpt}...`,
    '',
    `\uD83D\uDCCA ~${wordCount} mots \u00B7 \uD83D\uDD17 ${linkCount} liens internes \u00B7 \uD83D\uDDBC ${imgIcon} ${imageStatus}`,
  ].join('\n');

  return bot.telegram.sendMessage(chatId, text, {
    parse_mode: undefined, // plain text, no HTML/Markdown parsing issues
    ...buildPreviewKeyboard(pendingItem.slug),
  });
}
```

### Pending Array Read/Write (D-08, D-09)
```javascript
// Source: deploy-orchestrator.js pattern extended for array format
export function readPendingArray({ _stateDir } = {}) {
  const stateDir = _stateDir || defaultStateDir();
  const pendingPath = join(stateDir, 'pending.json');
  if (!existsSync(pendingPath)) return [];
  const data = JSON.parse(readFileSync(pendingPath, 'utf8'));
  // Migration guard: wrap legacy single-object format
  return Array.isArray(data) ? data : [data];
}

export function writePendingArray(items, { _stateDir } = {}) {
  const stateDir = _stateDir || defaultStateDir();
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'pending.json'), JSON.stringify(items, null, 2), 'utf8');
}
```

### Abandon After 3 Edits (D-12, D-19)
```javascript
// Source: CONTEXT.md D-12 + D-19
async function handleMaxEditsReached(ctx, item, pendingArray) {
  // Send alert
  await ctx.reply(`\u26A0\uFE0F Limite de modifications atteinte pour '${item.title}'. Article abandonne.`);

  // Update content-queue.yaml status to 'abandoned'
  updateQueueStatus(item.slug, 'abandoned');

  // Remove from pending array
  const filtered = pendingArray.filter(i => i.slug !== item.slug);
  writePendingArray(filtered);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bot.startWebhook()` + manual HTTP | `bot.createWebhook({ domain })` returns Express middleware | telegraf v4.12+ | Simpler Express integration, auto secret token |
| `Telegraf.Extra.inlineKeyboard()` | `Markup.inlineKeyboard()` | telegraf v4.0 | New Markup API, old Extra removed |
| `ctx.telegram.answerCbQuery()` | `ctx.answerCbQuery()` | telegraf v4.0 | Context shortcuts preferred |
| Single pending object | Pending array with edit state | Phase 5 | Supports multi-article stack + edit tracking |

**Deprecated/outdated:**
- `Telegraf.Extra` -- removed in v4, use `Markup` instead
- `bot.startWebhook(path, tls, port)` -- still works but `createWebhook()` is preferred for Express integration
- `node-telegram-bot-api` -- depends on abandoned `@cypress/request`, avoid

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node --test) |
| Config file | None -- invoked via `npm test` script in package.json |
| Quick run command | `node --test autopilot/tests/telegram-bot.test.js` |
| Full suite command | `cd autopilot && npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F1.7-1 | Preview message contains title, excerpt, word count, link count, image status | unit | `node --test autopilot/tests/preview.test.js` | Wave 0 |
| F1.7-2 | Inline keyboard has approve + modify buttons with slug-encoded data | unit | `node --test autopilot/tests/telegram-bot.test.js::keyboard` | Wave 0 |
| F1.7-3 | Approve callback triggers triggerDeploy and sends confirmation | unit | `node --test autopilot/tests/telegram-bot.test.js::approve` | Wave 0 |
| F1.7-4 | Pending array: read/write/append/remove, max 3 limit | unit | `node --test autopilot/tests/deploy-orchestrator.test.js` | Exists (needs update) |
| F1.7a-1 | Modify callback sets awaiting_edit, sends prompt | unit | `node --test autopilot/tests/telegram-bot.test.js::modify` | Wave 0 |
| F1.7a-2 | Text message with awaiting_edit triggers edit-in-place | unit | `node --test autopilot/tests/edit-handler.test.js` | Wave 0 |
| F1.7a-3 | Edit-in-place result is re-validated with validator.js | unit | `node --test autopilot/tests/edit-handler.test.js::validation` | Wave 0 |
| F1.7a-4 | After 3 edits: alert sent, status set to abandoned, item cleared | unit | `node --test autopilot/tests/telegram-bot.test.js::max-edits` | Wave 0 |
| F1.7a-5 | Validation failure sends alert with failing check names | unit | `node --test autopilot/tests/telegram-bot.test.js::validation-alert` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test autopilot/tests/telegram-bot.test.js autopilot/tests/preview.test.js autopilot/tests/edit-handler.test.js`
- **Per wave merge:** `cd autopilot && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `autopilot/tests/preview.test.js` -- covers F1.7-1 (HTML stripping, word count, link count, image status)
- [ ] `autopilot/tests/telegram-bot.test.js` -- covers F1.7-2, F1.7-3, F1.7a-1, F1.7a-4, F1.7a-5 (bot handlers with DI mocks)
- [ ] `autopilot/tests/edit-handler.test.js` -- covers F1.7a-2, F1.7a-3 (edit-in-place + re-validation)
- [ ] Update `autopilot/tests/deploy-orchestrator.test.js` -- covers F1.7-4 (array format migration)

## Open Questions

1. **TELEGRAM_CHAT_ID scope**
   - What we know: `TELEGRAM_CHAT_ID` is already in `.env.example`. It is Corinne's personal chat ID.
   - What's unclear: Is it her personal chat or a group chat? This affects whether `ctx.from.id` validation is needed to prevent unauthorized button clicks.
   - Recommendation: Assume personal chat (1:1 with bot). Add a guard `if (ctx.from.id !== Number(process.env.TELEGRAM_CHAT_ID)) return` on all handlers for safety.

2. **Parse mode for preview messages**
   - What we know: Telegram supports plain text, Markdown, and HTML parse modes.
   - What's unclear: The preview format (D-17) uses emoji but no formatting that requires parse_mode.
   - Recommendation: Use no parse_mode (plain text) to avoid escaping issues with article content that may contain special characters.

3. **Bot process restarts on Render during edit flow**
   - What we know: Render may restart the web service during deploys. File-based state in pending.json survives restarts.
   - What's unclear: Whether Telegram will re-deliver the text message if the webhook times out during a restart.
   - Recommendation: Telegram retries unacknowledged updates. The bot's `text` handler is idempotent if it checks `awaiting_edit` flag, so duplicate delivery is safe.

## Sources

### Primary (HIGH confidence)
- [telegraf v4.16.3 API docs](https://telegraf.js.org/classes/Telegraf-1.html) - createWebhook, action, on methods
- [telegraf GitHub](https://github.com/telegraf/telegraf) - README, webhook examples
- [telegraf-docs Express webhook example](https://github.com/feathers-studio/telegraf-docs/blob/master/examples/webhook/express.ts) - Official Express integration pattern
- Existing codebase: `deploy-orchestrator.js`, `generator.js`, `validator.js`, `server.js` - Integration patterns

### Secondary (MEDIUM confidence)
- [hanki.dev telegraf tips](https://hanki.dev/telegraf-tips/) - Inline keyboard and callback patterns verified against official docs
- [npm telegraf v4.16.3](https://www.npmjs.com/package/telegraf) - Version confirmed via `npm view`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - telegraf v4.16.3 already installed, API verified via official docs
- Architecture: HIGH - integration points fully understood from reading existing codebase (deploy-orchestrator, generator, validator, server.js)
- Pitfalls: HIGH - derived from codebase analysis (pending.json migration, state persistence) and telegraf documentation (callback_data limits, answerCbQuery requirement)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- telegraf v4 is mature, no breaking changes expected)
