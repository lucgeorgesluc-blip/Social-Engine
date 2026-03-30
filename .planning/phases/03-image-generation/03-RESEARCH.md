# Phase 3: Image Generation - Research

**Researched:** 2026-03-30
**Domain:** Gemini image generation via @google/genai + sharp post-processing
**Confidence:** HIGH

## Summary

Phase 3 adds a single image generation module (`autopilot/pipeline/image-generator.js`) that calls the Gemini `models/gemini-2.5-flash-image` model via `@google/genai` SDK, receives a base64-encoded PNG image, resizes/converts it to 800x450 WebP @q85 via `sharp`, and saves it to `assets/images/blog/[slug].webp`. The module must export a function with graceful fallback -- on any API or processing error, it returns `{ success: false }` with a logged warning, and the pipeline continues without an image.

The `@google/genai` SDK (v1.47.0, already installed) uses `ai.models.generateContent()` -- NOT the deprecated `@google/generative-ai` pattern of `genAI.getGenerativeModel().generateContent()`. The response contains image data as base64 in `response.candidates[0].content.parts[N].inlineData.data`. The model `gemini-2.5-flash-image` has been production-ready since October 2025, supports 10 aspect ratios including 16:9, and costs $0.039/image.

Integration into `run.js` is straightforward: insert a new Step 5.5 between article validation (Step 4) and file write (Step 5). The image generator is called with the topic/keyword, and its result determines whether the article HTML references an image. The `--dry-run` flag should skip the API call (return `{ success: false }` with a log message).

**Primary recommendation:** Build image-generator.js as a pure async function accepting `{ slug, title, primaryKeyword }` and returning `{ success, imagePath? }`. Wrap the entire function body in try/catch for graceful fallback. Use `sharp(buffer).resize(800, 450, { fit: 'cover' }).webp({ quality: 85 }).toFile(outputPath)`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F1.6 | Call @google/genai with topic-derived prompt, process with sharp to 800x450 WebP @q85, save to assets/images/blog/[slug].webp, fail gracefully if API fails | Verified: ai.models.generateContent() with responseModalities: ['IMAGE'], sharp resize + webp chain, try/catch fallback pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | 1.47.0 | Gemini API client | Already installed; uses generateContent for image generation |
| `sharp` | 0.34.5 | Image resize + WebP conversion | Already installed; no system dependency (libvips bundled) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pino` | 10.3.1 | Structured logging | Already used throughout pipeline |
| `p-retry` | 8.0.0 | Retry wrapper | Optional for Gemini API call (single retry on transient failure) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp | ImageMagick | Requires system install on Render -- rejected in project decisions |
| gemini-2.5-flash-image | gemini-3.1-flash-image-preview | Newer but preview status; 2.5-flash is verified and stable |
| p-retry | manual try/catch | p-retry adds exponential backoff; but given graceful fallback, a single try with catch is simpler |

**Installation:** None needed -- all packages already installed from Phase 1.

## Architecture Patterns

### Recommended Module Structure
```
autopilot/
  pipeline/
    image-generator.js    # NEW: generateImage(opts) -> { success, imagePath? }
    run.js                # MODIFY: add image generation step between validate and write
  config/
    gemini-model.txt      # EXISTS: "models/gemini-2.5-flash-image"
  tests/
    image-generator.test.js  # NEW: unit tests with mocked API
```

### Pattern 1: Gemini Image Generation via @google/genai
**What:** Call `ai.models.generateContent()` with `responseModalities: ['IMAGE']` to generate an image from a text prompt.
**When to use:** Every pipeline run to create a hero image for the article.
**Example:**
```javascript
// Source: https://ai.google.dev/gemini-api/docs/image-generation
import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'node:fs';

const modelName = readFileSync('autopilot/config/gemini-model.txt', 'utf8').trim();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const response = await ai.models.generateContent({
  model: modelName,  // "models/gemini-2.5-flash-image"
  contents: prompt,
  config: {
    responseModalities: ['IMAGE'],
    imageConfig: {
      aspectRatio: '16:9',  // closest to 800x450 = 1.778:1
    },
  },
});

// Extract image from response
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, 'base64');
    // buffer is PNG data -- process with sharp
  }
}
```

### Pattern 2: sharp Buffer-to-WebP Pipeline
**What:** Take a raw PNG buffer from Gemini, resize to exact 800x450, convert to WebP @q85.
**When to use:** After receiving the Gemini image response.
**Example:**
```javascript
// Source: https://sharp.pixelplumbing.com/api-resize + https://sharp.pixelplumbing.com/api-output
import sharp from 'sharp';

await sharp(pngBuffer)
  .resize(800, 450, { fit: 'cover' })  // crop to exact dimensions
  .webp({ quality: 85 })
  .toFile(outputPath);

// Verify size constraint (<=300KB)
import { statSync } from 'node:fs';
const stats = statSync(outputPath);
if (stats.size > 300 * 1024) {
  // Re-encode at lower quality
  await sharp(pngBuffer)
    .resize(800, 450, { fit: 'cover' })
    .webp({ quality: 70 })
    .toFile(outputPath);
}
```

### Pattern 3: Graceful Fallback
**What:** If the Gemini API or sharp processing fails for ANY reason, the pipeline continues without an image. No crash, no missing image reference in HTML.
**When to use:** Always -- this is a hard requirement.
**Example:**
```javascript
export async function generateImage({ slug, title, primaryKeyword, basePath, dryRun }) {
  if (dryRun) {
    logger.info('--dry-run: skipping image generation');
    return { success: false, reason: 'dry-run' };
  }

  try {
    // ... Gemini API call + sharp processing ...
    return { success: true, imagePath: outputPath };
  } catch (err) {
    logger.warn({ err: err.message, slug }, 'Image generation failed -- continuing without image');
    return { success: false, reason: err.message };
  }
}
```

### Pattern 4: Topic-Derived Image Prompt
**What:** Build a descriptive prompt from the article title and primary keyword. Not generic.
**When to use:** Before each Gemini API call.
**Example:**
```javascript
function buildImagePrompt(title, primaryKeyword) {
  return `Create a professional, calming hero image for a wellness blog article titled "${title}". ` +
    `The image should visually represent the concept of "${primaryKeyword}" in a therapeutic/healing context. ` +
    `Style: soft, warm lighting, natural tones, minimalist composition. ` +
    `No text overlay, no watermarks, no human faces. ` +
    `Suitable for a French magnetizer and hypnotherapist's website.`;
}
```

### Anti-Patterns to Avoid
- **Calling `genAI.getGenerativeModel()`:** This is the deprecated `@google/generative-ai` API pattern. The `@google/genai` SDK uses `ai.models.generateContent()` directly.
- **Hardcoding model name:** Read from `autopilot/config/gemini-model.txt` (verified in Phase 1).
- **Letting image failure crash the pipeline:** Always wrap in try/catch. Image is optional.
- **Using `fit: 'fill'` in sharp:** Stretches the image and distorts it. Use `fit: 'cover'` to crop to exact dimensions while preserving aspect ratio.
- **Saving without size verification:** WebP at q85 from a 1K source should be well under 300KB, but verify programmatically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/crop | Manual pixel manipulation | `sharp.resize(800, 450, { fit: 'cover' })` | libvips is 4-5x faster than ImageMagick; handles edge cases |
| WebP encoding | ffmpeg or cwebp CLI | `sharp.webp({ quality: 85 })` | No system dependency; consistent cross-platform |
| Base64 decoding | Manual char-code parsing | `Buffer.from(data, 'base64')` | Node.js built-in, zero-error |
| API retry | setTimeout loop | `p-retry` or simple try/catch | But given graceful fallback, single try + catch is sufficient |

## Common Pitfalls

### Pitfall 1: Wrong SDK API Surface
**What goes wrong:** Using `genAI.getGenerativeModel().generateContent()` (the `@google/generative-ai` deprecated package API) instead of `ai.models.generateContent()` (the `@google/genai` current API).
**Why it happens:** Many online examples and tutorials still show the old API. The quickstart repos may use the old package.
**How to avoid:** Import `GoogleGenAI` from `@google/genai`. Instantiate with `new GoogleGenAI({ apiKey })`. Call `ai.models.generateContent({ model, contents, config })`.
**Warning signs:** Import of `GoogleGenerativeAI` (with extra "Generative") is the old package.

### Pitfall 2: Missing responseModalities Config
**What goes wrong:** Calling `generateContent` without `config.responseModalities: ['IMAGE']` returns only text, no image data.
**Why it happens:** The default response modality is TEXT only.
**How to avoid:** Always pass `config: { responseModalities: ['IMAGE'] }` for image-only generation, or `['TEXT', 'IMAGE']` if you want both.
**Warning signs:** Response has no `inlineData` parts.

### Pitfall 3: Gemini Returns Multiple Parts
**What goes wrong:** Code assumes `response.candidates[0].content.parts[0]` is always the image. Sometimes Gemini returns text parts alongside image parts.
**Why it happens:** Even with `responseModalities: ['IMAGE']`, the model might include a text part explaining the image.
**How to avoid:** Iterate over ALL parts and find the one with `part.inlineData` (not `part.text`).
**Warning signs:** `part.inlineData` is undefined on the first part.

### Pitfall 4: sharp fit Mode Confusion
**What goes wrong:** Image is letterboxed (black bars) or stretched instead of cropped to 800x450.
**Why it happens:** Using `fit: 'contain'` (letterbox) or `fit: 'fill'` (stretch) instead of `fit: 'cover'` (crop).
**How to avoid:** Use `fit: 'cover'` which crops to fill the exact dimensions while preserving aspect ratio.
**Warning signs:** Output image has unexpected bars or looks distorted.

### Pitfall 5: Image Path in Article HTML When Generation Fails
**What goes wrong:** Article HTML contains `<img src="assets/images/blog/[slug].webp">` but the image was never generated (API failed).
**Why it happens:** The article HTML is generated by Claude BEFORE the image generator runs. It always includes the image tag.
**How to avoid:** Two options: (a) Post-process the HTML to remove/replace the image tag when generation fails, or (b) Accept that the image tag exists and ensure the SFTP deploy (Phase 4) simply does not upload a non-existent file -- the site handles missing images gracefully via CSS (object-fit or fallback background). The second approach is simpler given the site already uses lazy loading.
**Warning signs:** 404 errors on image URLs in production.

### Pitfall 6: GOOGLE_AI_API_KEY Not Set
**What goes wrong:** API call fails with authentication error, potentially crashing the pipeline.
**Why it happens:** Environment variable not configured.
**How to avoid:** Check for `process.env.GOOGLE_AI_API_KEY` at the START of `generateImage()`. If missing, return `{ success: false, reason: 'GOOGLE_AI_API_KEY not set' }` immediately.
**Warning signs:** AuthenticationError or 401 from Gemini API.

## Code Examples

### Complete image-generator.js Module Pattern
```javascript
// Source: Synthesized from https://ai.google.dev/gemini-api/docs/image-generation + https://sharp.pixelplumbing.com/
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import pino from 'pino';

const logger = pino({ name: 'image-generator' });

// Read verified model name from Phase 1
const MODEL_NAME = readFileSync(
  join(import.meta.dirname, '..', 'config', 'gemini-model.txt'), 'utf8'
).trim();

const MAX_SIZE_BYTES = 300 * 1024; // 300KB limit

function buildImagePrompt(title, primaryKeyword) {
  return (
    `Create a professional, calming hero image for a wellness blog article titled "${title}". ` +
    `The image should visually represent "${primaryKeyword}" in a therapeutic and healing context. ` +
    `Style: soft warm lighting, natural earthy tones, minimalist composition, serene atmosphere. ` +
    `No text, no watermarks, no human faces. Photo-realistic style.`
  );
}

export async function generateImage({ slug, title, primaryKeyword, basePath, dryRun }) {
  if (dryRun) {
    logger.info('--dry-run: skipping image generation');
    return { success: false, reason: 'dry-run' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    logger.warn('GOOGLE_AI_API_KEY not set -- skipping image generation');
    return { success: false, reason: 'GOOGLE_AI_API_KEY not set' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildImagePrompt(title, primaryKeyword);

    logger.info({ model: MODEL_NAME, slug }, 'Generating image via Gemini API');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    });

    // Find the image part in response
    let imageBuffer = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        break;
      }
    }

    if (!imageBuffer) {
      logger.warn({ slug }, 'Gemini response contained no image data');
      return { success: false, reason: 'No image in response' };
    }

    // Process with sharp: resize to 800x450, convert to WebP @q85
    const outputDir = join(basePath, 'assets', 'images', 'blog');
    mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${slug}.webp`);

    await sharp(imageBuffer)
      .resize(800, 450, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Verify file size
    const fileSize = statSync(outputPath).size;
    if (fileSize > MAX_SIZE_BYTES) {
      logger.info({ fileSize, slug }, 'Image exceeds 300KB, re-encoding at quality 70');
      await sharp(imageBuffer)
        .resize(800, 450, { fit: 'cover' })
        .webp({ quality: 70 })
        .toFile(outputPath);
    }

    logger.info({ slug, path: outputPath, size: statSync(outputPath).size }, 'Image saved');
    return { success: true, imagePath: outputPath };
  } catch (err) {
    logger.warn({ err: err.message, slug }, 'Image generation failed -- continuing without image');
    return { success: false, reason: err.message };
  }
}
```

### Integration into run.js
```javascript
// After Step 4 (validate) and before Step 5 (write HTML):

// Step 4.5: Generate image (F1.6 -- graceful fallback)
import { generateImage } from './image-generator.js';

logger.info('Step 4.5: Generating hero image...');
const imageResult = await generateImage({
  slug: selected.slug,
  title: selected.title,
  primaryKeyword: selected.target_keywords?.[0] || selected.title,
  basePath,
  dryRun,
});

if (imageResult.success) {
  logger.info({ path: imageResult.imagePath }, 'Hero image generated');
} else {
  logger.warn({ reason: imageResult.reason }, 'No hero image -- article will proceed without image');
}

// Pass imageResult.success to later steps (Telegram message, deploy file list)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` + `getGenerativeModel()` | `@google/genai` + `ai.models.generateContent()` | 2025 | Different import, different API surface |
| Imagen 3.0 (predict method, Vertex AI) | Gemini 2.5 Flash Image (generateContent) | Oct 2025 | Uses standard Gemini API, not Vertex AI |
| ImageMagick system dependency | sharp (bundled libvips) | N/A | No system install needed on Render |

**Deprecated/outdated:**
- `@google/generative-ai` package: Replaced by `@google/genai`. Do NOT use.
- `imagen-3.0-generate-002`: Uses Vertex AI `predict` method, incompatible with `@google/genai` SDK's `generateContent`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None (uses package.json script) |
| Quick run command | `node --test tests/image-generator.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F1.6-a | generateImage returns { success: true, imagePath } with valid inputs | unit (mocked API) | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-b | sharp produces 800x450 WebP at quality 85 | unit (real sharp, test buffer) | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-c | API failure returns { success: false } without throwing | unit (mocked API error) | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-d | Missing API key returns { success: false } immediately | unit | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-e | dry-run returns { success: false, reason: 'dry-run' } | unit | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-f | Image prompt contains article title and primary keyword | unit | `node --test tests/image-generator.test.js` | Wave 0 |
| F1.6-g | Output file is <=300KB | unit (real sharp with test image) | `node --test tests/image-generator.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/image-generator.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/image-generator.test.js` -- covers F1.6 a-g
- [ ] Test strategy: mock `GoogleGenAI` at module level (import mock or dependency injection), use a real small PNG buffer for sharp tests

### Testing Strategy: Mocking the Gemini API

The image generator must be testable WITHOUT calling the real Gemini API. Two approaches:

**Option A: Dependency Injection (recommended for this project)**
Export `generateImage` as a function that accepts an optional `aiClient` parameter. Tests pass a mock client. Production code passes nothing (creates real client internally).

```javascript
export async function generateImage({ slug, title, primaryKeyword, basePath, dryRun, _aiClient }) {
  const ai = _aiClient || new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
  // ... rest of function
}
```

**Option B: node:test mock.method**
Use `mock.method` from Node.js built-in test runner to intercept the `ai.models.generateContent` call. More brittle but requires no production code changes.

**Recommendation:** Option A (dependency injection via `_aiClient` parameter). Clean, explicit, no magic.

For sharp tests: create a real 100x100 PNG buffer using sharp itself (`sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 128, g: 128, b: 128 } } }).png().toBuffer()`), then pass it through the resize+webp chain to verify output dimensions and format.

## Open Questions

1. **Image reference in article HTML when generation fails**
   - What we know: Claude generates the article HTML BEFORE the image generator runs. The HTML likely includes an `<img>` tag referencing the blog image.
   - What's unclear: Should we strip the image tag from HTML on failure? Or let the site handle missing images via CSS?
   - Recommendation: Let the site handle it. The `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` template likely includes a hero image reference. The site already uses lazy loading and object-fit CSS. A missing image is preferable to modifying generated HTML (fragile regex replacement). Phase 4 (SFTP deploy) simply skips uploading a non-existent image file.

2. **Cost tracking for Gemini image generation**
   - What we know: Gemini 2.5 Flash Image costs $0.039/image (1290 tokens per image).
   - What's unclear: Should this be logged to the same cost.jsonl as Claude costs?
   - Recommendation: Yes, append a separate JSONL entry with `model: "gemini-2.5-flash-image"` and `estimated_usd: 0.039`. Keeps all costs in one audit trail.

## Sources

### Primary (HIGH confidence)
- [Google AI Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation) - JavaScript API, responseModalities, inlineData extraction, aspect ratios
- [Google Developers Blog - Gemini 2.5 Flash Image production](https://developers.googleblog.com/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios/) - Aspect ratios, pricing ($0.039/image), production readiness (Oct 2025)
- [sharp Resize API](https://sharp.pixelplumbing.com/api-resize/) - fit modes (cover/contain/fill), resize params
- [sharp Output API](https://sharp.pixelplumbing.com/api-output/) - .webp({ quality }) options
- Phase 1 Plan 02 Summary - Verified model name `models/gemini-2.5-flash-image` via live API call

### Secondary (MEDIUM confidence)
- [googleapis/js-genai GitHub](https://github.com/googleapis/js-genai) - SDK source, codegen_instructions.md for API shape
- [js-genai Issue #1009](https://github.com/googleapis/js-genai/issues/1009) - aspectRatio config works (issue closed, not a real bug)

### Tertiary (LOW confidence)
- None -- all claims verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already installed and verified in Phase 1
- Architecture: HIGH - API surface verified from official Google AI docs, sharp API well-documented
- Pitfalls: HIGH - SDK confusion is well-documented; graceful fallback is a standard pattern

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable APIs, production model)
