# Phase 10: Cannibalization + Ranking Trigger - Research

**Researched:** 2026-04-01
**Domain:** NLP text similarity (Jaccard), filesystem watching, Express API routes
**Confidence:** HIGH

## Summary

Phase 10 connects the Phase 9 audit engine to two automated triggers: (1) a cannibalization detector that compares page titles/H1 tokens using Jaccard similarity with French accent normalization and stopword filtering, and (2) an `fs.watch`-based ranking drop watcher that calls `runAudit()` when any tracked keyword drops 5+ positions. Two new API routes expose audit results behind existing session auth.

The codebase already has all prerequisite patterns. The SSE watcher in `routes/api.js` (lines 217-266) demonstrates `fs.watch` + debounce on state files. The `runAudit({ slugs })` function in `audit/runner.js` already accepts optional slug filtering for subset scans. Content-map.yaml has `cluster_id` on all 55 blog entries across 7 clusters, providing the first-pass grouping. The `live-rankings-history.json` file is an array of 46 snapshot objects, each with `checkedAt` and `results[{keyword, position, url}]`.

The only new dependency is a French stopword list (`autopilot/config/fr-stopwords.js`), which must be created from scratch. No npm packages are needed -- Jaccard similarity is a trivial set operation. Accent normalization uses standard `String.prototype.normalize('NFD')` with combining character regex.

**Primary recommendation:** Create `autopilot/audit/cannibalization.js` (pure function, no I/O) and `autopilot/audit/ranking-watcher.js` (fs.watch wrapper). Add two GET routes to `routes/api.js`. Create `config/fr-stopwords.js` as a curated ESM export of French stop words plus site-specific brand/geo tokens to exclude.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `detectCannibalization()` uses Jaccard similarity >= 0.15 on accent-normalised French tokens (NFD + strip combining chars)
- Stopwords in `autopilot/config/fr-stopwords.js`
- `cluster_id` first-pass from `content-map.yaml` groups same-cluster pairs ahead of cross-cluster pairs
- Ranking watcher uses `fs.watch` + 150ms debounce (same pattern as Phase 6 SSE watcher)
- API routes behind existing session auth middleware
- State files: `state/audit-results.json` (full audit), `state/audit-status.json` (trigger metadata)
- New plans: 10-01-PLAN.md (detectCannibalization + tests), 10-02-PLAN.md (watcher + routes + server wiring)

### Claude's Discretion
All implementation choices are at Claude's discretion -- pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F4.4 | Cannibalization Detector -- first pass by cluster_id, second pass Jaccard on stopword-cleaned accent-normalised H1+title tokens, >0.85 CRITICAL / 0.60-0.85 MEDIUM | Content-map.yaml has `cluster_id` on all 55 entries across 7 clusters. Titles contain accented French (`Magnetiseuse`, `Arret`, `Therapeute`). NFD normalization + `\p{M}` regex strips accents. Jaccard is `|A intersect B| / |A union B|` -- trivial pure function. |
| F4.5 | Ranking Trigger -- fs.watch on `state/live-rankings-history.json` with 150ms debounce, triggers runAudit when keyword drops >=5 positions | History file is a JSON array of 46 snapshots. Each has `results[{keyword, position, url}]`. Position can be `null` (not ranked). Existing SSE watcher in api.js lines 227-252 provides exact `safeWatch` + debounce pattern. `runAudit({ slugs })` in runner.js accepts slug-filtered mode. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:fs (watch) | built-in | Watch `live-rankings-history.json` for changes | Already used in SSE watcher (api.js line 240) |
| pino | 10.3.1 | Structured logging | Established project pattern |
| node:test | built-in | Test runner | Established project pattern (`node --test tests/*.test.js`) |
| js-yaml | 4.1.1 | Parse content-map.yaml for cluster_id | Already in project dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:path | built-in | Path construction | State file paths |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Jaccard | natural / compromise.js NLP | Massive overkill -- Jaccard on tokenized strings is ~10 lines of code |
| fs.watch | chokidar | Unnecessary dependency -- fs.watch works fine for single-file watching with debounce (proven in existing SSE code) |

**Installation:**
```bash
# No new dependencies needed -- all built-in or already installed
```

## Architecture Patterns

### New Files
```
autopilot/
  audit/
    cannibalization.js     # detectCannibalization() -- pure function
    ranking-watcher.js     # startRankingWatcher(), stopRankingWatcher()
  config/
    fr-stopwords.js        # French stopword list (ESM export)
  state/
    audit-status.json      # Written by ranking watcher (trigger metadata)
```

### Modified Files
```
autopilot/
  routes/api.js            # Add GET /api/audit, GET /api/audit/:slug
  server.js                # No changes needed (api.js is already mounted at /api behind auth)
```

### Pattern 1: Cannibalization Detection Algorithm

**What:** Two-pass detection: cluster_id grouping then Jaccard similarity on normalized tokens.

**When to use:** Called by runAudit or manually via API.

**Algorithm:**
```javascript
// Step 1: Normalize French text
// "Magnétiseuse Troyes : Arrêt Tabac" -> ["magnetiseuse", "troyes", "arret", "tabac"]
function normalizeTokens(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining diacritical marks
    .toLowerCase()
    .split(/[\s\-:,|.!?'"()\[\]\/]+/)  // split on whitespace + punctuation
    .filter(t => t.length > 1)          // drop single chars
    .filter(t => !FR_STOPWORDS.has(t)); // remove stopwords
}

// Step 2: Jaccard similarity
function jaccard(setA, setB) {
  const intersection = setA.filter(t => setB.includes(t));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

// Step 3: First pass -- group by cluster_id from content-map.yaml
// Step 4: Compare all pairs within same cluster (O(n^2) per cluster, but clusters are small: max 16 entries)
// Step 5: Flag cross-cluster pairs only if they share >= 2 normalized tokens (pre-filter for performance)
```

**Key insight:** The requirement says "pages sharing >= 2 normalised French tokens, Jaccard >= 0.15, cluster_id first-pass grouping." This means:
1. Same-cluster pairs: always compute Jaccard, flag if >= 0.15
2. Cross-cluster pairs: only compute Jaccard if they share >= 2 tokens (optimization)
3. Severity: >0.85 = CRITICAL, 0.60-0.85 = MEDIUM, 0.15-0.60 = LOW (monitoring)

### Pattern 2: Ranking Watcher (fs.watch + debounce)

**What:** Watches `state/live-rankings-history.json`, compares last two snapshots, triggers audit on drop >= 5.

**Existing pattern to follow (api.js lines 227-252):**
```javascript
// Debounce factory from existing SSE code
function debounced(fn, ms = 150) {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

// fs.watch with safe error handling
const watcher = watch(filePath, debounced(() => {
  // read file, compare snapshots, trigger audit if needed
}));
```

**Drop detection logic:**
```javascript
// Compare last two snapshots in history array
const history = JSON.parse(readFileSync(historyPath, 'utf8'));
if (history.length < 2) return; // need at least 2 snapshots

const prev = history[history.length - 2];
const curr = history[history.length - 1];

for (const result of curr.results) {
  const prevResult = prev.results.find(r => r.keyword === result.keyword);
  if (!prevResult || prevResult.position === null || result.position === null) continue;

  const drop = result.position - prevResult.position; // positive = dropped
  if (drop >= 5) {
    // Find affected slug from seo-keywords.csv mapping or from result.url
    // Trigger: runAudit({ slugs: [affectedSlug] })
  }
}
```

### Pattern 3: State Files

**`state/audit-status.json`:**
```json
{
  "running": false,
  "lastTrigger": {
    "type": "ranking-drop",
    "keyword": "magnetiseur Troyes",
    "drop": 8,
    "previousPosition": 22,
    "currentPosition": 30,
    "affectedSlug": "magnetiseur-troyes",
    "triggeredAt": "2026-04-01T14:00:00.000Z"
  },
  "lastCompleted": "2026-04-01T14:00:05.000Z"
}
```

### Pattern 4: API Route Structure (follows existing api.js conventions)

```javascript
// GET /api/audit -- returns full state/audit-results.json (page-audit.json)
apiRouter.get('/audit', (req, res) => {
  const auditPath = join(STATE_DIR, 'page-audit.json');
  if (!existsSync(auditPath)) return res.json({ pages: {} });
  try {
    res.json(JSON.parse(readFileSync(auditPath, 'utf8')));
  } catch {
    res.json({ pages: {} });
  }
});

// GET /api/audit/:slug -- single page record or 404
apiRouter.get('/audit/:slug', (req, res) => {
  const auditPath = join(STATE_DIR, 'page-audit.json');
  if (!existsSync(auditPath)) return res.status(404).json({ error: 'No audit data' });
  try {
    const data = JSON.parse(readFileSync(auditPath, 'utf8'));
    const record = data[req.params.slug];
    if (!record) return res.status(404).json({ error: 'Slug not found' });
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Failed to read audit data' });
  }
});
```

### Anti-Patterns to Avoid
- **Do not use `fs.watchFile` (polling):** `fs.watch` is event-based and more efficient. `watchFile` polls every 5 seconds by default.
- **Do not compute Jaccard on raw HTML:** Must extract title/H1 text first, normalize, then compare tokens.
- **Do not import the full content-map in cannibalization module:** Pass pre-parsed data via function parameter for testability (DI pattern).
- **Do not throw on missing state files:** Return empty/default values -- same graceful pattern as existing api.js routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| French accent normalization | Custom char mapping table | `String.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` | Unicode standard, handles all French accents (e, a, u, i, o, c cedilla) correctly |
| YAML parsing | Regex on content-map.yaml | `js-yaml` (already installed) | Content-map has 55 entries with nested arrays -- regex would be fragile |
| File watching debounce | npm debounce package | Inline `setTimeout`/`clearTimeout` closure | Already proven in api.js SSE watcher -- 5 lines of code |

## Common Pitfalls

### Pitfall 1: Windows fs.watch Double-Fire
**What goes wrong:** `fs.watch` on Windows fires twice for a single file write (once for content change, once for metadata update).
**Why it happens:** Windows NTFS triggers change events for both data and metadata timestamps.
**How to avoid:** 150ms debounce (already specified in requirements). The existing SSE watcher uses 100ms; this phase uses 150ms per spec.
**Warning signs:** Audit triggers twice in rapid succession for the same ranking drop.

### Pitfall 2: Null Positions in Rankings History
**What goes wrong:** Comparing positions when one or both are `null` (keyword not found in top results).
**Why it happens:** `live-rankings-history.json` uses `null` for keywords not ranking in top results. `null - 22 = NaN`, `30 - null = NaN`.
**How to avoid:** Skip comparison when either position is null. A keyword going from ranked to null is a disappearance (could flag separately), but null-to-null or null-to-ranked is not a "drop."
**Warning signs:** NaN comparisons, false positive triggers.

### Pitfall 3: French Stopwords Must Include Site Brand/Geo Terms
**What goes wrong:** "Troyes" and "magnetiseuse" appear in nearly every title. Without excluding them, Jaccard scores will be inflated for unrelated pages.
**Why it happens:** Site-specific brand and geographic terms are common across all pages but carry no discriminating semantic value for cannibalization.
**How to avoid:** The stopword list must include standard French stopwords (le, la, de, du, des, et, pour, etc.) PLUS site-specific terms: troyes, magnetiseuse, magnetiseur, corinne, lacoste, saint-germain, aube.
**Warning signs:** Every same-cluster pair flagged as cannibalizing.

### Pitfall 4: Watcher Startup Before File Exists
**What goes wrong:** `fs.watch` throws `ENOENT` if `live-rankings-history.json` doesn't exist yet (e.g., fresh deployment before first DataForSEO check).
**Why it happens:** Unlike `fs.watchFile`, `fs.watch` requires the file to exist at watch time.
**How to avoid:** Check `existsSync` before watching, and handle ENOENT gracefully (log warning, skip). The existing `safeWatch` pattern in api.js already does this.
**Warning signs:** Server crash on startup in fresh environment.

### Pitfall 5: Slug Extraction from Ranking URL
**What goes wrong:** Cannot determine which slug was affected by a ranking drop because the URL in rankings data needs parsing.
**Why it happens:** Rankings history stores full URLs like `https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html` or `https://www.magnetiseuse-lacoste-corinne.fr/blog/hypnose-arret-tabac-...html`.
**How to avoid:** Parse URL pathname, strip domain, then use `normalizeSlug()` from `page-inventory.js` (strips `.html` and `blog/` prefix). This function already exists and handles both root and blog paths.
**Warning signs:** Slugs not matching audit inventory keys.

### Pitfall 6: Large Cluster Pair Explosion
**What goes wrong:** O(n^2) comparisons within a cluster. The largest cluster `tc_comparatifs_tabac` has 16 entries = 120 pairs.
**Why it happens:** Brute-force all-pairs comparison.
**How to avoid:** 120 pairs is fine for this site size (< 1ms computation). But pre-filter cross-cluster pairs by requiring >= 2 shared tokens before computing Jaccard. Total site has 55 pages = 1,485 total pairs, still trivial.
**Warning signs:** None at current scale. Would need optimization only at 500+ pages.

## Code Examples

### French Accent Normalization (verified via Unicode spec)
```javascript
// NFD decomposes e.g. 'e' (U+00E9) into 'e' (U+0065) + combining acute (U+0301)
// Then regex strips all combining marks (Unicode range U+0300-U+036F)
const text = "Magnetiseuse Hypnotherapeute a Troyes";
const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// -> "Magnetiseuse Hypnotherapeute a Troyes"

// C cedilla: c (U+00E7) -> 'c' + combining cedilla
const cedilla = "garcon francais";
cedilla.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// -> "garcon francais"
```

### Jaccard Similarity (pure function)
```javascript
function jaccard(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersectionSize = 0;
  for (const t of setA) {
    if (setB.has(t)) intersectionSize++;
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}
```

### fs.watch Debounce (from existing api.js pattern)
```javascript
function debounced(fn, ms = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

### French Stopword List (curated for this site)
```javascript
// autopilot/config/fr-stopwords.js
export const FR_STOPWORDS = new Set([
  // Standard French stopwords
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans', 'en', 'entre',
  'ne', 'pas', 'plus', 'que', 'qui', 'quoi', 'dont',
  'est', 'sont', 'etre', 'avoir', 'fait', 'faire',
  'tout', 'tous', 'toute', 'toutes',
  'si', 'se', 'y',
  'comment', 'pourquoi', 'quand', 'combien',
  // Site-specific brand/geo tokens (inflate Jaccard if not removed)
  'troyes', 'magnetiseuse', 'magnetiseur', 'corinne', 'lacoste',
  'saint', 'germain', 'aube',
  // Common article structural words
  'guide', 'complet', 'methode', 'methodes',
]);
```

### Ranking Drop Detection
```javascript
// From live-rankings-history.json structure:
// [{ checkedAt, results: [{ keyword, position, url }] }, ...]
function detectDrops(history) {
  if (history.length < 2) return [];
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  const drops = [];

  for (const r of curr.results) {
    if (r.position === null) continue;
    const p = prev.results.find(pr => pr.keyword === r.keyword);
    if (!p || p.position === null) continue;
    const drop = r.position - p.position; // positive = ranking got worse
    if (drop >= 5) {
      drops.push({
        keyword: r.keyword,
        previousPosition: p.position,
        currentPosition: r.position,
        drop,
        url: r.url,
      });
    }
  }
  return drops;
}
```

## Data Structures Reference

### live-rankings-history.json (input for watcher)
```json
[
  {
    "checkedAt": "2026-04-01T13:00:00.000Z",
    "results": [
      { "keyword": "magnetiseur Troyes", "position": 22, "url": "https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html" },
      { "keyword": "hypnose arret tabac Troyes", "position": null, "url": null }
    ]
  }
]
```

### content-map.yaml cluster_id values (input for cannibalization)
| cluster_id | Count | Example titles |
|------------|-------|----------------|
| tc_arret_tabac | 14 | "Hypnose Arret Tabac...", "Magnetiseur Arret Tabac..." |
| tc_comparatifs_tabac | 16 | "Arreter Fumer Troyes...", "Patch vs Hypnose..." |
| tc_sevrage_symptomes | 9 | "Fatigue Arret Tabac...", "Irritabilite Arret Tabac..." |
| tc_bien_etre_troyes | 6 | "Hypnose Stress...", "Magnetisme Adulte..." |
| tc_magnetiseur_troyes | 3 | "Magnetiseur Troyes...", "Hypnotherapeute Troyes..." |
| tc_magnetiseur_aube | 2 | "Magnetiseur Aube..." |
| (empty) | 5 | Unclustered pages |

### state/audit-results.json (written by runAudit, served by GET /api/audit)
Already exists from Phase 9 as `state/page-audit.json`. Slug-keyed object with `{ score, issues[], signals, previousSignals, diff, lastScanned }`.

**Important note:** The requirement says `state/audit-results.json` but Phase 9 wrote to `state/page-audit.json`. The API routes should read `page-audit.json` (the file that actually exists). If the requirement insists on `audit-results.json`, the watcher can write a separate file, or we alias. Recommend reading `page-audit.json` for the GET /api/audit route (consistent with Phase 9 runner.js line 37).

### state/audit-status.json (new, written by ranking watcher)
```json
{
  "running": false,
  "lastTrigger": {
    "type": "ranking-drop",
    "keyword": "magnetiseur Troyes",
    "drop": 8,
    "previousPosition": 22,
    "currentPosition": 30,
    "affectedSlugs": ["magnetiseur-troyes"],
    "triggeredAt": "2026-04-01T14:00:00.000Z"
  },
  "lastCompleted": "2026-04-01T14:00:05.000Z"
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) v22.17.1 |
| Config file | none (no config needed) |
| Quick run command | `node --test tests/cannibalization.test.js tests/ranking-watcher.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F4.4-a | detectCannibalization returns pairs sharing >=2 tokens with Jaccard >=0.15 | unit | `node --test tests/cannibalization.test.js` | Wave 0 |
| F4.4-b | Accent normalization (NFD + strip combining chars) | unit | `node --test tests/cannibalization.test.js` | Wave 0 |
| F4.4-c | cluster_id first-pass grouping (same-cluster before cross-cluster) | unit | `node --test tests/cannibalization.test.js` | Wave 0 |
| F4.4-d | French stopwords filtered from tokens | unit | `node --test tests/cannibalization.test.js` | Wave 0 |
| F4.5-a | Watcher triggers on >=5 position drop | unit | `node --test tests/ranking-watcher.test.js` | Wave 0 |
| F4.5-b | Watcher ignores null positions | unit | `node --test tests/ranking-watcher.test.js` | Wave 0 |
| F4.5-c | audit-status.json records trigger metadata | unit | `node --test tests/ranking-watcher.test.js` | Wave 0 |
| F4.5-d | GET /api/audit returns full audit state | integration | `node --test tests/api-audit.test.js` | Wave 0 |
| F4.5-e | GET /api/audit/:slug returns single record or 404 | integration | `node --test tests/api-audit.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/cannibalization.test.js tests/ranking-watcher.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/cannibalization.test.js` -- covers F4.4 (pure function tests with synthetic data)
- [ ] `tests/ranking-watcher.test.js` -- covers F4.5 watcher logic (DI for fs + runAudit)
- [ ] `tests/api-audit.test.js` -- covers GET /api/audit and GET /api/audit/:slug routes

## DI Strategy (follows established project conventions)

All modules must accept DI parameters prefixed with underscore for testability:

| Module | DI Parameters | Purpose |
|--------|---------------|---------|
| `cannibalization.js` | None needed -- pure function taking data arguments | Input data passed directly; no I/O |
| `ranking-watcher.js` | `_stateDir`, `_historyPath`, `_runAudit`, `_readFile`, `_watch` | Decouple from real filesystem and audit runner |
| API routes | Existing pattern -- read from `STATE_DIR` constant | Same as other api.js routes |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `autopilot/routes/api.js` lines 217-266 (SSE watcher pattern with debounce)
- Existing codebase: `autopilot/audit/runner.js` (runAudit with slug filtering)
- Existing codebase: `autopilot/audit/page-inventory.js` (normalizeSlug function)
- Existing codebase: `autopilot/pipeline/dataforseo-rankings.js` (rankings history structure)
- Existing codebase: `autopilot/state/live-rankings-history.json` (46 entries, verified structure)
- Existing codebase: `.seo-engine/data/content-map.yaml` (55 blogs, 7 clusters, cluster_id field)
- Unicode Standard: NFD normalization + combining diacritical marks range U+0300-U+036F

### Secondary (MEDIUM confidence)
- Node.js v22 docs: `fs.watch` API behavior on Windows (double-fire known issue, mitigated by debounce)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns already proven in codebase
- Architecture: HIGH -- direct extension of existing audit/runner.js and api.js watcher pattern
- Pitfalls: HIGH -- Windows fs.watch double-fire already solved in Phase 6; null position handling verified against real data (46 snapshots inspected)

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no external dependency changes expected)
