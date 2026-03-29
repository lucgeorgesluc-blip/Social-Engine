# Node.js Daily Automation Pipeline — Research Findings

**Project:** magnetiseuse-lacoste-corinne.fr SEO content pipeline
**Researched:** 2026-03-29
**Node.js version in use:** v22.17.1 (LTS — excellent, no compatibility concerns)

---

## Key Findings (executive summary)

1. **Scheduling:** GitHub Actions cron is the best choice for a pipeline that runs once or a few times per day — zero infra, free, restartable, logs included. Use node-cron only if you need sub-minute or in-process scheduling.
2. **Anthropic SDK:** `@anthropic-ai/sdk` v0.80.0 is actively maintained by Anthropic staff. Token counting is a first-class API (`client.messages.countTokens()`). Use it before every generation call.
3. **Gemini image generation:** Use `@google/genai` v1.47.0 (the new unified Google AI SDK, not the deprecated `@google/generative-ai`). The image generation model `gemini-2.5-flash-preview-05-20` (or `imagen-3.0-generate-002`) is called via `ai.models.generateImages()`.
4. **SFTP:** `ssh2-sftp-client` v12.1.1 is the clear winner — actively maintained (published 4 days ago as of research date), Apache-2.0 licensed, wraps the rock-solid `ssh2` v1.17.0 underneath.
5. **Telegram bots:** Use `telegraf` v4.16.3 — it is the modern, TypeScript-first framework with native webhook + inline keyboard + callback_query support. `node-telegram-bot-api` v0.67.0 is older, uses deprecated `request` under the hood (`@cypress/request`), and is harder to wire for webhooks.
6. **Google Search Console:** Authenticate via service account (not OAuth) for unattended automation. Use `googleapis` v171.4.0 which includes the Search Console API v1 (URL Inspection endpoint).
7. **Retries:** Use `p-retry` v8.0.0 (Sindre Sorhus, ESM-first, tiny, wraps any async fn) for all external API calls.
8. **Pipeline structure:** Model as an array of atomic `Step` objects with a shared context bag. Each step declares its rollback action. A top-level runner catches errors, runs rollback in reverse, and sends a Telegram failure notification.

---

## 1. Scheduler: Where to Run the Cron

### Recommendation: GitHub Actions

**Why GitHub Actions beats the alternatives for this use case:**

| Criterion | GitHub Actions | Render Cron | node-cron (self-hosted) |
|-----------|---------------|-------------|------------------------|
| Infrastructure | None — free | Need a Render service (paid after free tier) | Need an always-on server |
| Log retention | 90 days, full per-step | Dashboard logs | None unless you add a logger |
| Restart / retry failed run | Manual re-run button or API | No built-in retry | Manual |
| Secrets management | GitHub encrypted secrets | Render env vars | .env file — risk of leaks |
| Cron resolution | 1 minute | 1 minute | 1 second |
| Cold start | ~10-30 seconds | ~0 (running service) | 0 |
| Cost | Free for public repos; 2000 min/month free for private | Free tier then $7/month | VPS cost |

**When to prefer node-cron instead:** If the pipeline must run more than once per hour, or if you need sub-minute precision, run node-cron inside a long-lived process (e.g., a Render background worker).

**GitHub Actions cron gotcha:** GitHub does not guarantee the exact scheduled time — during high load the runner can be delayed 5-15 minutes. This is acceptable for a daily blog post pipeline.

```yaml
# .github/workflows/daily-pipeline.yml
name: Daily SEO Content Pipeline
on:
  schedule:
    - cron: '0 7 * * *'   # 07:00 UTC daily
  workflow_dispatch:       # allow manual trigger from GitHub UI

jobs:
  pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: node pipeline/run.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GEMINI_API_KEY:    ${{ secrets.GEMINI_API_KEY }}
          SFTP_HOST:         ${{ secrets.SFTP_HOST }}
          SFTP_USER:         ${{ secrets.SFTP_USER }}
          SFTP_PASSWORD:     ${{ secrets.SFTP_PASSWORD }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID:  ${{ secrets.TELEGRAM_CHAT_ID }}
          GSC_SERVICE_ACCOUNT_JSON: ${{ secrets.GSC_SERVICE_ACCOUNT_JSON }}
```

---

## 2. Anthropic Claude API — Content Generation

### Library

```
@anthropic-ai/sdk  v0.80.0   MIT   1 dependency (json-schema-to-ts)
```

Active maintainers from Anthropic: zak-anthropic, dylanc-anthropic, benjmann, nikhil-anthropic. Versioning is rapid (146 published versions). Updated regularly.

### Token Counting — Cost Control Pattern

The SDK exposes `client.messages.countTokens()` which is an API call that returns input token count WITHOUT running the model. Call it before generation when the prompt is variable-length.

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Hard limits per call — adjust to your budget
const TOKEN_LIMITS = {
  'claude-3-5-haiku-20241022': { maxInput: 50_000, maxOutput: 4096 },
  'claude-3-7-sonnet-20250219': { maxInput: 30_000, maxOutput: 8192 },
};

async function generateWithBudget(model, messages, maxTokens) {
  // Step 1: count tokens without consuming budget
  const countResult = await client.messages.countTokens({
    model,
    messages,
    max_tokens: maxTokens,  // required by API even for counting
  });

  const limit = TOKEN_LIMITS[model];
  if (countResult.input_tokens > limit.maxInput) {
    throw new Error(
      `Prompt too large: ${countResult.input_tokens} tokens > limit ${limit.maxInput}. ` +
      `Truncate the system prompt or reduce context.`
    );
  }

  console.log(`Token estimate: ${countResult.input_tokens} input → calling API`);

  // Step 2: generate
  const response = await client.messages.create({
    model,
    messages,
    max_tokens: maxTokens,
  });

  return response;
}
```

**Gotcha — countTokens is billed:** As of SDK v0.60+, `countTokens` is a real API call but costs much less than generation. Always worth calling for variable prompts.

**Cost control pattern — Haiku first, Sonnet fallback:**
```javascript
async function generateBlogHtml(topic, wordCount = 1200) {
  const messages = buildBlogPrompt(topic, wordCount);

  try {
    // Try cheap model first
    return await generateWithBudget('claude-3-5-haiku-20241022', messages, 4096);
  } catch (err) {
    if (err.message.includes('too large')) {
      // Fall back to higher-context model
      return await generateWithBudget('claude-3-7-sonnet-20250219', messages, 8192);
    }
    throw err;
  }
}
```

**Streaming for long HTML:** Use `client.messages.stream()` if generating articles > 2000 tokens to avoid timeout errors on slow connections.

---

## 3. Gemini Image Generation

### Library: @google/genai v1.47.0 (NOT @google/generative-ai)

```
@google/genai  v1.47.0   Apache-2.0   (Google's new unified JS SDK)
@google/generative-ai  v0.24.1 — DEPRECATED, last release 11 months ago
```

Google merged `@google/generative-ai`, `@google-cloud/vertexai`, and the Imagen SDK into `@google/genai`. The new SDK supports both Google AI Studio (API key) and Vertex AI (service account) backends.

**Model name for images:** The Gemini image generation model you want is accessed as `imagen-3.0-generate-002` (stable Imagen 3) or for the gemini-2.5-flash multimodal generation. Note: as of early 2026 the model called `gemini-2.5-flash-image` is not an official published model name in the API — the REST endpoint pattern is `models/imagen-3.0-generate-002:predict` for dedicated image generation via Vertex, or `models/gemini-2.0-flash-preview-image-generation` for inline image output. **Verify the exact model name against the Google AI Studio model list before coding.** Confidence on exact model string: LOW — verify at `https://ai.google.dev/gemini-api/docs/image-generation`.

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateBlogImage(prompt) {
  // Model name to verify — use Google AI Studio to confirm exact string
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/webp',
      aspectRatio: '16:9',
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error('Gemini returned no images');
  }

  // Returns base64-encoded image bytes
  const imageData = response.generatedImages[0].image.imageBytes;
  return Buffer.from(imageData, 'base64');
}
```

**Gotcha — REST API fallback:** If the SDK does not yet expose the specific model you need, fall back to the REST API directly:

```javascript
async function generateImageViaRest(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/` +
              `gemini-2.0-flash-preview-image-generation:generateContent` +
              `?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini REST error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Image data is in candidates[0].content.parts[n].inlineData.data
  const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
  if (!imagePart) throw new Error('No image part in Gemini response');
  return Buffer.from(imagePart.inlineData.data, 'base64');
}
```

**IMPORTANT — verify before building:** Before writing the image generation step, call the API manually with `curl` using your actual API key to confirm:
1. Which model name string works (`gemini-2.5-flash-image`, `imagen-3.0-generate-002`, etc.)
2. Whether your API key tier has access (Imagen 3 requires paid tier)
3. What the exact response shape is

---

## 4. SFTP Deployment

### Library: ssh2-sftp-client v12.1.1

```
ssh2-sftp-client  v12.1.1   Apache-2.0
  └── ssh2          v1.17.0
  └── concat-stream v2.0.0
Published 4 days ago — actively maintained by theophilusx
```

The library wraps `ssh2` with a Promise-based API. It is the most actively maintained Node.js SFTP client — 78 published versions, sole maintainer who is responsive on GitHub.

**Alternatives considered:**
- `node-sftp`: abandoned, last update 2017
- Raw `ssh2`: works but you write all the SFTP protocol by hand
- `ftp-sftp-client`: less mature, fewer stars

### Connection and Upload Pattern

```javascript
import SftpClient from 'ssh2-sftp-client';

const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,   // home755449657.1and1-data.host
  port: 22,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  // Alternatively use privateKey: fs.readFileSync('~/.ssh/id_rsa')
  retries: 2,
  retry_factor: 2,
  retry_minTimeout: 2000,
};

const REMOTE_BASE = '/';  // root of the IONOS web root — confirm with hosting

async function deployFiles(files) {
  // files: Array<{ localPath: string, remotePath: string }>
  const sftp = new SftpClient();

  try {
    await sftp.connect(SFTP_CONFIG);

    for (const file of files) {
      // Ensure remote directory exists
      const remoteDir = file.remotePath.split('/').slice(0, -1).join('/');
      if (remoteDir) await sftp.mkdir(remoteDir, true); // true = recursive

      await sftp.put(file.localPath, file.remotePath);
      console.log(`Uploaded: ${file.localPath} → ${file.remotePath}`);
    }
  } finally {
    // ALWAYS close — ssh2-sftp-client will leak the connection if you don't
    await sftp.end();
  }
}
```

**Critical gotchas:**

1. **Always call `sftp.end()` in a finally block.** Unclosed connections cause hanging processes.
2. **`sftp.mkdir(path, true)` throws if the directory already exists** in versions < 11. In v12 it silently succeeds — but guard anyway.
3. **Upload to a temp name, then rename:** Prevents serving half-written files.
   ```javascript
   await sftp.put(localPath, remotePath + '.tmp');
   await sftp.rename(remotePath + '.tmp', remotePath);
   ```
4. **Connection timeout on IONOS:** Add `readyTimeout: 20000` to config — IONOS 1&1 SFTP servers can be slow to respond.
5. **SFTP path on IONOS:** The remote root is typically `/` but the web root may be at `/htdocs/` or `/`. Verify by connecting with WinSCP first.

**Rollback for SFTP:** Keep a list of successfully uploaded files. On failure, issue `sftp.delete(remotePath)` for each. Only feasible if the remote allows deletion.

---

## 5. Telegram Bot — Inline Keyboard Approval Flow

### Library: telegraf v4.16.3

```
telegraf  v4.16.3   MIT   8 dependencies
Modern Telegram Bot Framework — TypeScript-first
```

**Why telegraf over node-telegram-bot-api:**
- `node-telegram-bot-api` v0.67.0 depends on `@cypress/request` (a fork of the long-deprecated `request` library). The request library has been unmaintained since 2020. This is a maintenance red flag.
- `telegraf` uses `node-fetch` and has active TypeScript types via `@telegraf/types`.
- `telegraf` has a proper middleware stack, making the callback_query → approval webhook flow clean to implement.
- `telegraf` has a CLI (`telegraf` bin) for quick scaffolding.

### Approval Flow Architecture

Two deployment modes for webhooks:

**Mode A — Webhook server (best for Render / always-on service):**
The bot registers a webhook URL. When the user taps an inline button, Telegram posts to your webhook URL. Your server processes it.

**Mode B — Long polling (best for GitHub Actions one-shot run):**
The pipeline sends the approval message, then polls `getUpdates` for a response within a time window. Simpler but the pipeline must stay alive while waiting.

For a GitHub Actions pipeline that generates content and wants human approval before publishing:

```
Pipeline run → sends Telegram message with [Approve] [Reject] buttons
             → waits for callback_query via polling (or exits and stores state)
             → on approval: SFTP upload + GSC ping
             → on rejection: delete draft, notify
```

**Recommended pattern for GitHub Actions: Store-and-Resume**

The single pipeline run generates content, uploads it to a staging path, and sends the Telegram message. A second GitHub Actions workflow triggers on `workflow_dispatch` (or a webhook from a separate always-on bot server) for the approval step. This avoids keeping a GitHub Actions runner alive for hours waiting for human input.

```
Run 1 (scheduled):
  1. Generate HTML
  2. Upload to /staging/[slug].html (not live)
  3. Send Telegram: "New article ready: [title]\n[Approve to publish] [Reject]"
  4. Pipeline ends

Separate lightweight bot server (Render free tier, Fly.io, etc.):
  5. Receives callback_query from Telegram
  6. On "approve": triggers GitHub Actions via API → moves file to live path
  7. On "reject": deletes staging file, notifies

Run 2 (triggered by bot or workflow_dispatch):
  8. Move /staging/[slug].html → /[live path]
  9. Update sitemap.xml, config.js
  10. GSC ping
  11. Final Telegram confirmation
```

### Code: Sending a Message with Inline Keyboard

```javascript
import { Telegraf, Markup } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function sendApprovalMessage(articleSlug, previewUrl) {
  await bot.telegram.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `Article prêt pour publication :\n\n*${articleSlug}*\n[Prévisualiser](${previewUrl})`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('Publier', `approve:${articleSlug}`),
          Markup.button.callback('Rejeter', `reject:${articleSlug}`),
        ],
      ]),
    }
  );
}
```

### Code: Handling callback_query (bot server side)

```javascript
bot.action(/^approve:(.+)$/, async (ctx) => {
  const slug = ctx.match[1];
  await ctx.answerCbQuery('Publication en cours...');
  await ctx.editMessageText(`Publié : ${slug}`);
  await triggerPublishWorkflow(slug); // call GitHub Actions API
});

bot.action(/^reject:(.+)$/, async (ctx) => {
  const slug = ctx.match[1];
  await ctx.answerCbQuery('Article rejeté');
  await ctx.editMessageText(`Rejeté : ${slug}`);
  await deleteStagingFile(slug);
});

// CRITICAL: always call answerCbQuery within 10 seconds or Telegram shows "loading" forever
```

### Gotcha: answerCbQuery timeout

Every `callback_query` must be answered within 10 seconds via `ctx.answerCbQuery()`. If your handler is async and slow, call `answerCbQuery` immediately, then do the work:

```javascript
bot.action('approve:*', async (ctx) => {
  await ctx.answerCbQuery('En cours...'); // answer immediately
  // ... long async work below ...
});
```

### Sending simple notifications (no approval needed)

```javascript
async function notify(message) {
  await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
    parse_mode: 'HTML',
  });
}
```

---

## 6. Google Search Console — URL Inspection API

### Library: googleapis v171.4.0

```
googleapis  v171.4.0   Apache-2.0
  └── google-auth-library  v10.x
  └── googleapis-common    v8.x
Published 1 month ago (actively maintained by Google bot)
```

### Authentication: Service Account (recommended for automation)

**Service account vs OAuth comparison:**

| | Service Account | OAuth 2.0 |
|--|----------------|-----------|
| Setup | Create in Google Cloud Console, download JSON key | Requires user browser login flow |
| Token refresh | Handled automatically by google-auth-library | Requires storing refresh token, handling expiry |
| Suitable for automation | YES | NO (requires human re-auth periodically) |
| GSC access | Service account email must be added as a property user in GSC | Direct user access |

**Setup steps (one-time):**
1. Google Cloud Console → IAM & Admin → Service Accounts → Create
2. Download JSON key file → store as GitHub Secret (as JSON string)
3. In Google Search Console → Settings → Users and permissions → Add user: `[service-account-email]@[project].iam.gserviceaccount.com` with Owner or Full User permission
4. Enable "Google Search Console API" in the Cloud project

### URL Inspection API Call

```javascript
import { google } from 'googleapis';

async function pingGoogleSearchConsole(pageUrl) {
  const siteUrl = 'https://www.magnetiseuse-lacoste-corinne.fr/'; // must match GSC property exactly

  // Parse service account JSON from environment
  const credentials = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    const response = await searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: pageUrl,  // e.g. 'https://www.magnetiseuse-lacoste-corinne.fr/blog/mon-article'
        siteUrl,
      },
    });

    const result = response.data.inspectionResult;
    console.log('GSC indexing status:', result.indexStatusResult?.coverageState);
    console.log('Last crawl:', result.indexStatusResult?.lastCrawlTime);
    return result;
  } catch (err) {
    // GSC ping failure is non-fatal — log and continue
    console.error('GSC inspection failed (non-fatal):', err.message);
    return null;
  }
}
```

**Important:** The URL Inspection API has a quota of **2000 requests per day** per property. Each `inspect()` call costs 1 quota unit. This is more than enough for a daily pipeline.

**Gotcha — property URL must match exactly:** If your GSC property is verified as `https://www.magnetiseuse-lacoste-corinne.fr/` (with trailing slash and www), then `siteUrl` must be exactly that string. A mismatch returns a 403.

**Alternative — IndexNow:** For a lighter-weight ping that does not require authentication, IndexNow (`https://api.indexnow.org/indexnow`) supports Bing and several Google-adjacent engines. It does not replace GSC but is instantaneous and free. Can be sent in parallel with the GSC call:

```javascript
async function pingIndexNow(pageUrl) {
  const body = {
    host: 'www.magnetiseuse-lacoste-corinne.fr',
    key: process.env.INDEXNOW_KEY,   // text file must exist at /<key>.txt on your server
    urlList: [pageUrl],
  };
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
}
```

---

## 7. Retry and Error Recovery

### Library: p-retry v8.0.0

```
p-retry  v8.0.0   MIT   Sindre Sorhus (highly reliable, ESM-first)
  └── is-network-error  v1.3.0
```

p-retry wraps any async function and retries on failure with configurable exponential backoff.

### Pattern: Wrapping Every External Call

```javascript
import pRetry from 'p-retry';

async function withRetry(fn, label, options = {}) {
  return pRetry(fn, {
    retries: 3,
    minTimeout: 1000,   // 1s before first retry
    maxTimeout: 15000,  // cap at 15s
    factor: 2,          // exponential: 1s, 2s, 4s
    onFailedAttempt: (error) => {
      console.warn(
        `[${label}] Attempt ${error.attemptNumber} failed. ` +
        `${error.retriesLeft} retries left. Error: ${error.message}`
      );
    },
    ...options,
  });
}

// Usage:
const html = await withRetry(
  () => generateBlogHtml(topic),
  'anthropic-generate',
  { retries: 2 }   // fewer retries for expensive AI calls
);

const image = await withRetry(
  () => generateBlogImage(imagePrompt),
  'gemini-image',
  { retries: 3 }
);
```

**Gotcha — do not retry on business logic errors.** Distinguish network/rate-limit errors from content policy rejections:

```javascript
async function generateWithRetry(fn, label) {
  return pRetry(async () => {
    try {
      return await fn();
    } catch (err) {
      // Do NOT retry on these — they won't self-resolve
      if (err.status === 400) throw new pRetry.AbortError(err.message); // bad request
      if (err.status === 401) throw new pRetry.AbortError('Invalid API key');
      if (err.status === 403) throw new pRetry.AbortError('Permission denied');
      throw err; // retry on 429 (rate limit), 500, 503, network errors
    }
  }, { retries: 3, minTimeout: 2000, factor: 2 });
}
```

---

## 8. Pipeline Structure — Atomic Steps with Rollback

### Design Pattern: Step Runner

Model the pipeline as an ordered array of step objects. Each step has:
- `name`: label for logging
- `run(ctx)`: async function that mutates a shared context object
- `rollback(ctx)`: async function to undo the step's side effects

```javascript
// pipeline/runner.js

export async function runPipeline(steps, initialContext = {}) {
  const ctx = { ...initialContext, completedSteps: [] };
  const completed = [];

  for (const step of steps) {
    try {
      console.log(`[PIPELINE] Starting: ${step.name}`);
      await step.run(ctx);
      completed.push(step);
      ctx.completedSteps.push(step.name);
      console.log(`[PIPELINE] Done: ${step.name}`);
    } catch (err) {
      console.error(`[PIPELINE] FAILED at step "${step.name}":`, err.message);

      // Run rollbacks in reverse order
      for (const completedStep of [...completed].reverse()) {
        if (completedStep.rollback) {
          try {
            console.log(`[PIPELINE] Rolling back: ${completedStep.name}`);
            await completedStep.rollback(ctx);
          } catch (rollbackErr) {
            console.error(`[PIPELINE] Rollback failed for "${completedStep.name}":`, rollbackErr.message);
          }
        }
      }

      // Notify failure via Telegram
      await notifyFailure(step.name, err.message, ctx);
      process.exit(1);
    }
  }

  return ctx;
}
```

### Step Definitions Example

```javascript
// pipeline/steps.js

export const steps = [
  {
    name: 'select-topic',
    async run(ctx) {
      ctx.topic = await selectNextTopic();        // reads from content-queue
      ctx.slug = toSlug(ctx.topic.title);
    },
    rollback: null,  // no side effects
  },
  {
    name: 'count-tokens',
    async run(ctx) {
      ctx.tokenCount = await countPromptTokens(ctx.topic);
      if (ctx.tokenCount > 45_000) throw new Error('Prompt exceeds budget');
    },
    rollback: null,
  },
  {
    name: 'generate-html',
    async run(ctx) {
      ctx.html = await generateWithRetry(() => generateBlogHtml(ctx.topic), 'anthropic');
      ctx.localHtmlPath = await saveToDisk(ctx.html, ctx.slug);
    },
    async rollback(ctx) {
      if (ctx.localHtmlPath) await fs.unlink(ctx.localHtmlPath);
    },
  },
  {
    name: 'generate-image',
    async run(ctx) {
      ctx.imageBuffer = await generateWithRetry(() => generateBlogImage(ctx.topic), 'gemini');
      ctx.localImagePath = await saveImageToDisk(ctx.imageBuffer, ctx.slug);
    },
    async rollback(ctx) {
      if (ctx.localImagePath) await fs.unlink(ctx.localImagePath);
    },
  },
  {
    name: 'send-approval-request',
    async run(ctx) {
      await sendApprovalMessage(ctx.slug, buildStagingUrl(ctx.slug));
      // For GitHub Actions: pipeline exits here, approval triggers Run 2
    },
    rollback: null,
  },

  // === Run 2 starts here (triggered by approval) ===

  {
    name: 'sftp-upload',
    async run(ctx) {
      ctx.uploadedFiles = [];
      const filesToUpload = buildUploadManifest(ctx);
      await deployFiles(filesToUpload);
      ctx.uploadedFiles = filesToUpload.map(f => f.remotePath);
    },
    async rollback(ctx) {
      if (ctx.uploadedFiles?.length) {
        await deleteRemoteFiles(ctx.uploadedFiles);
      }
    },
  },
  {
    name: 'update-config-and-sitemap',
    async run(ctx) {
      await updateConfigJs(ctx.slug, ctx.topic);
      await updateSitemap(ctx.slug);
      await deployFiles([
        { localPath: 'assets/js/config.js', remotePath: '/assets/js/config.js' },
        { localPath: 'assets/js/config.min.js', remotePath: '/assets/js/config.min.js' },
        { localPath: 'sitemap.xml', remotePath: '/sitemap.xml' },
      ]);
    },
    rollback: null,  // config rollback is complex — Telegram notifies for manual fix
  },
  {
    name: 'gsc-ping',
    async run(ctx) {
      const url = `https://www.magnetiseuse-lacoste-corinne.fr/blog/${ctx.slug}`;
      ctx.gscResult = await pingGoogleSearchConsole(url);
      await pingIndexNow(url);  // fire and forget, non-fatal
    },
    rollback: null,  // GSC ping has no rollback
  },
  {
    name: 'notify-success',
    async run(ctx) {
      await notify(
        `Article publié : <b>${ctx.topic.title}</b>\n` +
        `URL: https://www.magnetiseuse-lacoste-corinne.fr/blog/${ctx.slug}\n` +
        `GSC: ${ctx.gscResult?.indexStatusResult?.coverageState ?? 'pinged'}`
      );
    },
    rollback: null,
  },
];
```

---

## 9. Supporting Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `p-retry` | 8.0.0 | Retry any async fn with backoff | ESM-only in v8 |
| `dotenv` | 17.3.1 | Local env var loading | Only for local dev; CI uses native env |
| `pino` | 10.3.1 | Structured JSON logging | Preferred over `winston` for new projects — faster, simpler |
| `p-limit` | 7.3.0 | Concurrency control | Limit parallel SFTP uploads |

**Note on ESM vs CommonJS:** `p-retry` v8 and `p-limit` v7 are ESM-only (`"type": "module"` in package.json). If you need CJS compatibility, use `p-retry` v6 or `p-limit` v4 instead. Node.js v22 has full ESM support — prefer ESM for new pipelines.

---

## 10. Security Patterns

```javascript
// Never log API keys, even in error messages
process.on('uncaughtException', (err) => {
  const sanitized = err.message
    .replace(/sk-ant-[A-Za-z0-9-_]+/g, 'sk-ant-***')
    .replace(/AIza[A-Za-z0-9-_]+/g, 'AIza***');
  console.error('Uncaught exception:', sanitized);
  process.exit(1);
});

// Validate secrets exist at startup
function assertEnv(...keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

assertEnv(
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'SFTP_HOST', 'SFTP_USER', 'SFTP_PASSWORD',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  'GSC_SERVICE_ACCOUNT_JSON'
);
```

---

## 11. Recommended Project Structure

```
pipeline/
  run.js                  # entrypoint — imports and runs steps
  runner.js               # generic step runner with rollback
  steps/
    01-select-topic.js
    02-count-tokens.js
    03-generate-html.js
    04-generate-image.js
    05-send-approval.js
    06-sftp-upload.js
    07-update-config.js
    08-gsc-ping.js
    09-notify-success.js
  lib/
    anthropic.js          # claude API wrapper
    gemini.js             # gemini image wrapper
    sftp.js               # sftp deploy helper
    telegram.js           # bot notification helpers
    gsc.js                # google search console helper
    retry.js              # p-retry wrappers
  package.json            # "type": "module" for ESM
```

---

## 12. Recommended Library Installation

```bash
# Core
npm install @anthropic-ai/sdk @google/genai googleapis telegraf ssh2-sftp-client

# Utility
npm install p-retry dotenv pino

# Dev
npm install -D @types/node
```

**Final package.json dependencies:**
```json
{
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@google/genai": "^1.47.0",
    "googleapis": "^171.4.0",
    "telegraf": "^4.16.3",
    "ssh2-sftp-client": "^12.1.1",
    "p-retry": "^8.0.0",
    "pino": "^10.3.1",
    "dotenv": "^17.3.1"
  }
}
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Library versions | HIGH | Fetched live from npm registry (2026-03-29) |
| @anthropic-ai/sdk API | HIGH | Well-documented, stable, token counting confirmed in recent versions |
| @google/genai (unified SDK) | HIGH | Latest unified SDK confirmed on npm |
| Gemini image model name `gemini-2.5-flash-image` | LOW | Model naming changes frequently — must verify against Google AI Studio before building |
| Imagen 3 REST endpoint | MEDIUM | Based on documented pattern, verify exact path |
| ssh2-sftp-client v12 API | HIGH | Stable, IONOS SFTP confirmed working in project |
| Telegraf inline keyboard | HIGH | Well-documented, stable API |
| GSC URL Inspection API auth | HIGH | Service account pattern is official Google recommendation |
| GitHub Actions cron timing | MEDIUM | Known 5-15 min delay under load — documented behavior |

---

## Open Questions / Flags for Implementation

1. **Gemini model name:** Run a quick `curl` test with your API key to confirm the exact model string before coding the image step. Check `https://generativelanguage.googleapis.com/v1beta/models` with your key.
2. **IONOS SFTP remote root path:** Connect with WinSCP and note the exact absolute path of the web root (is it `/`, `/htdocs/`, or `/html/`?). The pipeline must use the correct base path.
3. **GSC property format:** Verify whether your GSC property is domain-type (`magnetiseuse-lacoste-corinne.fr`) or URL-prefix-type (`https://www.magnetiseuse-lacoste-corinne.fr/`) — the service account must be added to the right property type.
4. **Telegram chat ID:** Run `https://api.telegram.org/bot<TOKEN>/getUpdates` after sending a message to the bot to get the `chat.id`. Store as `TELEGRAM_CHAT_ID`.
5. **Approval flow architecture decision:** Decide whether you want Run 1 (generate) and Run 2 (publish) to be two separate GitHub Actions workflows triggered by Telegram callbacks, or a single always-on bot server on Render/Fly.io that orchestrates everything. The two-workflow approach has zero ongoing cost; the bot-server approach is simpler to reason about.
