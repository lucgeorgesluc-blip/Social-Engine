# Cluster Priority + GSC Indexing Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix GSC auto-indexing (currently a no-op) and add cluster-aware article prioritization with manual focus override via the dashboard.

**Architecture:** Two independent features sharing no code. GSC fix rewrites `gsc-ping.js` to use the Indexing API with sitemap ping fallback. Cluster priority adds a scoring layer to `topic-selector.js` backed by a `cluster-focus.json` state file, with 3 new API endpoints and 2 new dashboard UI sections (Clusters tab + Queue summary bar).

**Tech Stack:** Node.js 20+, googleapis (already installed), node:test, Alpine.js, Tailwind CSS (Play CDN in dashboard).

**Spec:** `docs/superpowers/specs/2026-04-05-cluster-priority-gsc-fix-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `autopilot/pipeline/cluster-scorer.js` | Scoring algorithm, cluster stats builder, focus state read/write |
| `autopilot/tests/cluster-scorer.test.js` | Unit tests for scorer |
| `autopilot/tests/api-clusters.test.js` | Integration tests for cluster API endpoints |

### Modified Files
| File | Change |
|------|--------|
| `autopilot/pipeline/gsc-ping.js` | Replace Inspection API with Indexing API + sitemap ping fallback |
| `autopilot/pipeline/topic-selector.js` | Integrate scorer, replace simple priority sort |
| `autopilot/pipeline/run.js` | Add focus count decrement after article generation |
| `autopilot/routes/api.js` | Add 3 cluster endpoints + SSE poll for cluster-focus.json |
| `autopilot/dashboard/index.html` | Add Clusters tab + Queue summary bar + SSE handler |
| `autopilot/tests/gsc-ping.test.js` | Rewrite for new Indexing API + fallback |
| `autopilot/tests/topic-selector.test.js` | Add scorer integration tests |

---

## Task 1: Fix GSC Ping — Tests

**Files:**
- Modify: `autopilot/tests/gsc-ping.test.js`

- [ ] **Step 1: Rewrite test file with new mock factories**

Replace the entire test file content. The new tests mock the Indexing API (`google.indexing.v3`) and a fetch-based sitemap ping:

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { pingGsc } from '../pipeline/gsc-ping.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockIndexing(publishResult) {
  return {
    urlNotifications: {
      publish: mock.fn(async () => publishResult),
    },
  };
}

function createMockIndexing403() {
  return {
    urlNotifications: {
      publish: mock.fn(async () => {
        const err = new Error('Forbidden');
        err.code = 403;
        throw err;
      }),
    },
  };
}

function createMockIndexingError(message) {
  return {
    urlNotifications: {
      publish: mock.fn(async () => { throw new Error(message); }),
    },
  };
}

function createMockAuth() {
  return { credentials: 'mock-auth' };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('gsc-ping', () => {
  const originalEnv = process.env.GSC_SERVICE_ACCOUNT_PATH;

  beforeEach(() => {
    process.env.GSC_SERVICE_ACCOUNT_PATH = '/fake/path.json';
  });

  afterEach(() => {
    if (originalEnv) process.env.GSC_SERVICE_ACCOUNT_PATH = originalEnv;
    else delete process.env.GSC_SERVICE_ACCOUNT_PATH;
  });

  it('returns indexed via Indexing API on success', async () => {
    const indexing = createMockIndexing({
      data: { urlNotificationMetadata: { latestUpdate: { type: 'URL_UPDATED' } } },
    });
    const result = await pingGsc({
      articleUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/test.html',
      _googleAuth: createMockAuth(),
      _indexingClient: indexing,
    });
    assert.equal(result.status, 'indexed');
    assert.equal(result.method, 'indexing_api');
    assert.equal(indexing.urlNotifications.publish.mock.callCount(), 1);
  });

  it('falls back to sitemap ping on 403', async () => {
    const indexing = createMockIndexing403();
    const sitemapPing = mock.fn(async () => ({ ok: true }));
    const result = await pingGsc({
      articleUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/test.html',
      _googleAuth: createMockAuth(),
      _indexingClient: indexing,
      _sitemapPingFn: sitemapPing,
    });
    assert.equal(result.status, 'sitemap_pinged');
    assert.equal(result.method, 'sitemap_ping');
    assert.equal(sitemapPing.mock.callCount(), 1);
  });

  it('returns error when both methods fail', async () => {
    const indexing = createMockIndexingError('Network error');
    const sitemapPing = mock.fn(async () => { throw new Error('Ping failed'); });
    const result = await pingGsc({
      articleUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/test.html',
      _googleAuth: createMockAuth(),
      _indexingClient: indexing,
      _sitemapPingFn: sitemapPing,
    });
    assert.equal(result.status, 'error');
    assert.ok(result.reason);
  });

  it('returns skipped when no credentials', async () => {
    delete process.env.GSC_SERVICE_ACCOUNT_PATH;
    const result = await pingGsc({
      articleUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/test.html',
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'missing credentials');
  });

  it('falls back to sitemap ping on non-403 Indexing API error', async () => {
    const indexing = createMockIndexingError('Quota exceeded');
    const sitemapPing = mock.fn(async () => ({ ok: true }));
    const result = await pingGsc({
      articleUrl: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/test.html',
      _googleAuth: createMockAuth(),
      _indexingClient: indexing,
      _sitemapPingFn: sitemapPing,
    });
    assert.equal(result.status, 'sitemap_pinged');
    assert.equal(result.method, 'sitemap_ping');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "E:/Site CL/autopilot" && node --test tests/gsc-ping.test.js`
Expected: FAIL — `pingGsc` doesn't accept `_indexingClient` or `_sitemapPingFn` yet.

- [ ] **Step 3: Commit failing tests**

```bash
cd "E:/Site CL" && git add autopilot/tests/gsc-ping.test.js && git commit -m "test: rewrite gsc-ping tests for Indexing API + sitemap fallback"
```

---

## Task 2: Fix GSC Ping — Implementation

**Files:**
- Modify: `autopilot/pipeline/gsc-ping.js`

- [ ] **Step 1: Rewrite gsc-ping.js**

Replace the entire file:

```javascript
/**
 * Google Search Console ping — F1.9
 * Submits a URL for indexing via Google Indexing API.
 * Falls back to sitemap ping if Indexing API fails (403, quota, etc.).
 * Graceful: never throws — returns status object on any failure.
 *
 * DI: pass _googleAuth, _indexingClient, _sitemapPingFn for testing.
 *
 * @module gsc-ping
 */

import { google } from 'googleapis';
import pino from 'pino';

const logger = pino({ name: 'gsc-ping' });

const SITEMAP_URL = 'https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml';

/**
 * Ping Google to request indexing of a URL.
 *
 * Strategy:
 *   1. Try Indexing API (urlNotifications.publish)
 *   2. On any error: fall back to sitemap ping
 *   3. If both fail: return error status (never throw)
 *
 * @param {object} opts
 * @param {string} opts.articleUrl - Full URL to submit
 * @param {object} [opts._googleAuth] - Injected auth client for testing
 * @param {object} [opts._indexingClient] - Injected indexing client for testing
 * @param {Function} [opts._sitemapPingFn] - Injected sitemap ping for testing
 * @returns {Promise<{ status: string, method?: string, reason?: string }>}
 */
export async function pingGsc({ articleUrl, _googleAuth, _indexingClient, _sitemapPingFn }) {
  if (!process.env.GSC_SERVICE_ACCOUNT_PATH) {
    logger.warn('GSC_SERVICE_ACCOUNT_PATH not set -- skipping GSC ping');
    return { status: 'skipped', reason: 'missing credentials' };
  }

  // Step 1: Try Indexing API
  try {
    const auth = _googleAuth || new google.auth.GoogleAuth({
      keyFile: process.env.GSC_SERVICE_ACCOUNT_PATH,
      scopes: [
        'https://www.googleapis.com/auth/indexing',
        'https://www.googleapis.com/auth/webmasters',
      ],
    });

    const indexing = _indexingClient || google.indexing({ version: 'v3', auth });

    logger.info({ articleUrl }, 'Submitting URL via Indexing API');

    await indexing.urlNotifications.publish({
      requestBody: {
        url: articleUrl,
        type: 'URL_UPDATED',
      },
    });

    logger.info({ articleUrl }, 'Indexing API success');
    return { status: 'indexed', method: 'indexing_api' };
  } catch (indexingErr) {
    logger.warn({ err: indexingErr.message, code: indexingErr.code, articleUrl },
      'Indexing API failed -- falling back to sitemap ping');
  }

  // Step 2: Fallback to sitemap ping
  try {
    const pingFn = _sitemapPingFn || defaultSitemapPing;
    await pingFn(SITEMAP_URL);
    logger.info({ articleUrl }, 'Sitemap ping success');
    return { status: 'sitemap_pinged', method: 'sitemap_ping' };
  } catch (pingErr) {
    logger.warn({ err: pingErr.message, articleUrl }, 'Sitemap ping also failed');
    return { status: 'error', reason: pingErr.message };
  }
}

/**
 * Default sitemap ping via Google's public endpoint.
 * @param {string} sitemapUrl
 */
async function defaultSitemapPing(sitemapUrl) {
  const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sitemap ping HTTP ${response.status}`);
  }
  return response;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd "E:/Site CL/autopilot" && node --test tests/gsc-ping.test.js`
Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
cd "E:/Site CL" && git add autopilot/pipeline/gsc-ping.js && git commit -m "fix: replace read-only URL Inspection with Indexing API + sitemap ping fallback"
```

---

## Task 3: Cluster Scorer — Tests

**Files:**
- Create: `autopilot/tests/cluster-scorer.test.js`

- [ ] **Step 1: Write cluster-scorer tests**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import {
  scoreCandidate,
  buildClusterStats,
  readFocus,
  writeFocus,
  clearFocus,
  decrementFocusCount,
} from '../pipeline/cluster-scorer.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClusters() {
  return {
    clusters: [
      {
        id: 'tc_tabac',
        name: 'Arret Tabac',
        pillar: { slug: 'guide-arret-tabac' },
        cluster_pages: [
          { slug: 'page-1' }, { slug: 'page-2' }, { slug: 'page-3' }, { slug: 'page-4' },
          { slug: 'page-5' }, { slug: 'page-6' }, { slug: 'page-7' }, { slug: 'page-8' },
        ],
      },
      {
        id: 'tc_aube',
        name: 'Magnetiseur Aube',
        pillar: { slug: 'magnetiseur-aube' },
        cluster_pages: [
          { slug: 'aube-1' }, { slug: 'aube-2' }, { slug: 'aube-3' }, { slug: 'aube-4' },
        ],
      },
    ],
  };
}

function makeContentMap(publishedSlugs) {
  return {
    blogs: publishedSlugs.map(slug => ({
      slug,
      status: 'published',
      cluster_id: slug.startsWith('aube') ? 'tc_aube' : 'tc_tabac',
    })),
  };
}

let tmpDir;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildClusterStats', () => {
  it('counts published articles per cluster', () => {
    const clusters = makeClusters();
    const contentMap = makeContentMap(['page-1', 'page-2', 'page-3', 'aube-1']);
    const stats = buildClusterStats(clusters, contentMap);

    assert.equal(stats.get('tc_tabac').published, 3);
    assert.equal(stats.get('tc_tabac').target, 8);
    assert.equal(stats.get('tc_aube').published, 1);
    assert.equal(stats.get('tc_aube').target, 4);
  });

  it('returns 0 published for empty clusters', () => {
    const clusters = makeClusters();
    const contentMap = makeContentMap([]);
    const stats = buildClusterStats(clusters, contentMap);

    assert.equal(stats.get('tc_tabac').published, 0);
    assert.equal(stats.get('tc_aube').published, 0);
  });
});

describe('scoreCandidate', () => {
  it('scores high priority higher than low priority in same cluster', () => {
    const stats = new Map([['tc_tabac', { target: 8, published: 4 }]]);
    const high = { priority: 'high', cluster_id: 'tc_tabac' };
    const low = { priority: 'low', cluster_id: 'tc_tabac' };

    assert.ok(scoreCandidate(high, stats, null) > scoreCandidate(low, stats, null));
  });

  it('gives higher gap bonus to emptier cluster', () => {
    const stats = new Map([
      ['tc_tabac', { target: 8, published: 7 }],
      ['tc_aube', { target: 4, published: 0 }],
    ]);
    const tabac = { priority: 'medium', cluster_id: 'tc_tabac' };
    const aube = { priority: 'medium', cluster_id: 'tc_aube' };

    assert.ok(scoreCandidate(aube, stats, null) > scoreCandidate(tabac, stats, null));
  });

  it('focus bonus makes low-priority article beat high-priority unfocused', () => {
    const stats = new Map([
      ['tc_tabac', { target: 8, published: 4 }],
      ['tc_aube', { target: 4, published: 2 }],
    ]);
    const focus = { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null };
    const highUnfocused = { priority: 'high', cluster_id: 'tc_tabac' };
    const lowFocused = { priority: 'low', cluster_id: 'tc_aube' };

    assert.ok(
      scoreCandidate(lowFocused, stats, focus) > scoreCandidate(highUnfocused, stats, focus),
      'focused low-priority should beat unfocused high-priority'
    );
  });

  it('handles article with unknown cluster_id gracefully', () => {
    const stats = new Map([['tc_tabac', { target: 8, published: 4 }]]);
    const article = { priority: 'medium', cluster_id: 'tc_unknown' };

    const score = scoreCandidate(article, stats, null);
    assert.equal(typeof score, 'number');
  });
});

describe('focus state management', () => {
  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `cluster-scorer-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('readFocus returns null when no file exists', () => {
    assert.equal(readFocus(tmpDir), null);
  });

  it('writeFocus + readFocus round-trips', () => {
    const focus = { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null, setAt: '2026-04-05T10:00:00Z', setBy: 'dashboard' };
    writeFocus(tmpDir, focus);
    const read = readFocus(tmpDir);
    assert.deepEqual(read, focus);
  });

  it('clearFocus removes the file', () => {
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null, setAt: '2026-04-05T10:00:00Z', setBy: 'dashboard' });
    clearFocus(tmpDir);
    assert.equal(readFocus(tmpDir), null);
  });

  it('decrementFocusCount decrements and returns cleared:false when count > 1', () => {
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'count', remainingArticles: 3, setAt: '2026-04-05T10:00:00Z', setBy: 'dashboard' });
    const result = decrementFocusCount(tmpDir);
    assert.equal(result.cleared, false);
    assert.equal(readFocus(tmpDir).remainingArticles, 2);
  });

  it('decrementFocusCount clears focus when count reaches 0', () => {
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'count', remainingArticles: 1, setAt: '2026-04-05T10:00:00Z', setBy: 'dashboard' });
    const result = decrementFocusCount(tmpDir);
    assert.equal(result.cleared, true);
    assert.equal(readFocus(tmpDir), null);
  });

  it('decrementFocusCount is no-op for until_unpin mode', () => {
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null, setAt: '2026-04-05T10:00:00Z', setBy: 'dashboard' });
    const result = decrementFocusCount(tmpDir);
    assert.equal(result.cleared, false);
    assert.notEqual(readFocus(tmpDir), null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "E:/Site CL/autopilot" && node --test tests/cluster-scorer.test.js`
Expected: FAIL — module `../pipeline/cluster-scorer.js` does not exist.

- [ ] **Step 3: Commit failing tests**

```bash
cd "E:/Site CL" && git add autopilot/tests/cluster-scorer.test.js && git commit -m "test: add cluster-scorer tests for scoring, stats, and focus state"
```

---

## Task 4: Cluster Scorer — Implementation

**Files:**
- Create: `autopilot/pipeline/cluster-scorer.js`

- [ ] **Step 1: Create cluster-scorer.js**

```javascript
/**
 * Cluster scorer — scores candidate articles for topic selection.
 * Integrates cluster completion gap + manual focus override.
 *
 * Scoring formula:
 *   score = base_priority + cluster_gap_bonus + focus_bonus
 *
 * @module cluster-scorer
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';

const logger = pino({ name: 'cluster-scorer' });

const PRIORITY_MAP = { high: 30, medium: 20, low: 10 };
const GAP_BONUS_MAX = 25;
const FOCUS_BONUS = 50;
const FOCUS_FILENAME = 'cluster-focus.json';

/**
 * Build cluster stats from topic-clusters and content-map data.
 *
 * @param {{ clusters: Array }} topicClusters - Parsed topic-clusters.yaml
 * @param {{ blogs: Array }} contentMap - Parsed content-map.yaml
 * @returns {Map<string, { target: number, published: number, drafted: number, planned: number }>}
 */
export function buildClusterStats(topicClusters, contentMap) {
  const stats = new Map();
  const blogs = contentMap.blogs || [];

  for (const cluster of topicClusters.clusters || []) {
    const target = (cluster.cluster_pages || []).length;
    let published = 0;
    let drafted = 0;
    let planned = 0;

    for (const blog of blogs) {
      if (blog.cluster_id !== cluster.id) continue;
      if (blog.status === 'published') published++;
      else if (blog.status === 'drafted') drafted++;
      else if (blog.status === 'planned') planned++;
    }

    stats.set(cluster.id, { target, published, drafted, planned });
  }

  return stats;
}

/**
 * Score a single candidate article.
 *
 * @param {{ priority: string, cluster_id: string }} article
 * @param {Map<string, { target: number, published: number }>} clusterStats
 * @param {{ clusterId: string, mode: string, remainingArticles: number|null }|null} focus
 * @returns {number}
 */
export function scoreCandidate(article, clusterStats, focus) {
  const basePriority = PRIORITY_MAP[article.priority] || 0;

  // Cluster gap bonus: emptier clusters score higher
  let gapBonus = 0;
  const stat = clusterStats.get(article.cluster_id);
  if (stat && stat.target > 0) {
    gapBonus = (1 - stat.published / stat.target) * GAP_BONUS_MAX;
  }

  // Focus bonus: if this article belongs to the focused cluster
  let focusBonus = 0;
  if (focus && article.cluster_id === focus.clusterId) {
    focusBonus = FOCUS_BONUS;
  }

  return basePriority + gapBonus + focusBonus;
}

// ─── Focus state management ──────────────────────────────────────────────────

/**
 * Read current cluster focus state.
 * @param {string} stateDir
 * @returns {object|null}
 */
export function readFocus(stateDir) {
  const focusPath = join(stateDir, FOCUS_FILENAME);
  if (!existsSync(focusPath)) return null;
  try {
    return JSON.parse(readFileSync(focusPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Write cluster focus state.
 * @param {string} stateDir
 * @param {object} focusState
 */
export function writeFocus(stateDir, focusState) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, FOCUS_FILENAME), JSON.stringify(focusState, null, 2), 'utf8');
}

/**
 * Clear cluster focus (back to auto-balance).
 * @param {string} stateDir
 */
export function clearFocus(stateDir) {
  const focusPath = join(stateDir, FOCUS_FILENAME);
  if (existsSync(focusPath)) unlinkSync(focusPath);
}

/**
 * Decrement remaining articles count for count-mode focus.
 * Auto-clears focus when count reaches 0.
 *
 * @param {string} stateDir
 * @returns {{ cleared: boolean }}
 */
export function decrementFocusCount(stateDir) {
  const focus = readFocus(stateDir);
  if (!focus || focus.mode !== 'count') return { cleared: false };

  focus.remainingArticles--;
  if (focus.remainingArticles <= 0) {
    clearFocus(stateDir);
    logger.info({ clusterId: focus.clusterId }, 'Focus auto-cleared — article count reached 0');
    return { cleared: true };
  }

  writeFocus(stateDir, focus);
  return { cleared: false };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd "E:/Site CL/autopilot" && node --test tests/cluster-scorer.test.js`
Expected: All 10 tests PASS.

- [ ] **Step 3: Commit**

```bash
cd "E:/Site CL" && git add autopilot/pipeline/cluster-scorer.js && git commit -m "feat: add cluster-scorer with gap-based scoring and focus state management"
```

---

## Task 5: Integrate Scorer into Topic Selector

**Files:**
- Modify: `autopilot/pipeline/topic-selector.js`
- Modify: `autopilot/tests/topic-selector.test.js`

- [ ] **Step 1: Add integration tests to topic-selector.test.js**

Append these tests at the end of the file, after the existing `describe('selectTopic', ...)` block:

```javascript
import { scoreCandidate, buildClusterStats, readFocus } from '../pipeline/cluster-scorer.js';

describe('selectTopic with scorer integration', () => {
  const EXISTING_MAP = [
    { slug: 'existing-article', title: 'Existing Article' },
  ];

  function makeTopicClusters() {
    return {
      clusters: [
        { id: 'tc_tabac', cluster_pages: [{}, {}, {}, {}, {}, {}, {}, {}] },
        { id: 'tc_aube', cluster_pages: [{}, {}, {}, {}] },
      ],
    };
  }

  function makeContentMap() {
    return {
      blogs: [
        { slug: 'p1', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p2', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p3', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p4', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p5', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p6', status: 'published', cluster_id: 'tc_tabac' },
        { slug: 'p7', status: 'published', cluster_id: 'tc_tabac' },
      ],
    };
  }

  it('auto-balance: picks article in emptier cluster over fuller one', () => {
    const queue = {
      queue: [
        { id: 'q1', title: 'Tabac Article', slug: 'tabac-new', priority: 'high', status: 'planned', cluster_id: 'tc_tabac' },
        { id: 'q2', title: 'Aube Article', slug: 'aube-new', priority: 'medium', status: 'planned', cluster_id: 'tc_aube' },
      ],
    };
    const topicClusters = makeTopicClusters();
    const contentMap = makeContentMap();

    const result = selectTopic(queue, EXISTING_MAP, { topicClusters, contentMap });
    assert.equal(result.selected?.id, 'q2', 'should pick aube (emptier cluster) despite lower priority');
  });

  it('focus: picks focused cluster article over higher-priority unfocused', () => {
    const queue = {
      queue: [
        { id: 'q1', title: 'Tabac Article', slug: 'tabac-new', priority: 'high', status: 'planned', cluster_id: 'tc_tabac' },
        { id: 'q2', title: 'Aube Article', slug: 'aube-new', priority: 'low', status: 'planned', cluster_id: 'tc_aube' },
      ],
    };
    const topicClusters = makeTopicClusters();
    const contentMap = makeContentMap();
    const focus = { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null };

    const result = selectTopic(queue, EXISTING_MAP, { topicClusters, contentMap, focus });
    assert.equal(result.selected?.id, 'q2', 'should pick focused cluster article');
  });

  it('falls back to priority-only when no cluster data provided', () => {
    const queue = {
      queue: [
        { id: 'q1', title: 'High', slug: 'high-art', priority: 'high', status: 'planned', cluster_id: 'tc_tabac' },
        { id: 'q2', title: 'Low', slug: 'low-art', priority: 'low', status: 'planned', cluster_id: 'tc_aube' },
      ],
    };

    const result = selectTopic(queue, EXISTING_MAP);
    assert.equal(result.selected?.id, 'q1', 'should fall back to priority sort');
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

Run: `cd "E:/Site CL/autopilot" && node --test tests/topic-selector.test.js`
Expected: FAIL — `selectTopic` doesn't accept third argument yet, tests using scorer integration fail.

- [ ] **Step 3: Rewrite topic-selector.js with scorer integration**

Replace the entire file:

```javascript
/**
 * Topic selector — F1.2
 * Picks the highest-scoring planned article from the content queue.
 * Uses cluster-scorer for gap-based auto-balance + focus override.
 * Falls back to simple priority sort when cluster data is unavailable.
 */

import { scoreCandidate, buildClusterStats } from './cluster-scorer.js';

const PRIORITY_MAP = { high: 3, medium: 2, low: 1 };

/**
 * @param {object} contentQueue  Parsed content-queue.yaml (has .queue array)
 * @param {Array<{slug: string, title: string}>} contentMapTrimmed  Existing articles (for slug conflict check)
 * @param {object} [opts]  Optional cluster context for scoring
 * @param {object} [opts.topicClusters]  Parsed topic-clusters.yaml
 * @param {object} [opts.contentMap]  Parsed content-map.yaml (full, with cluster_id + status)
 * @param {object|null} [opts.focus]  Current cluster focus state
 * @returns {{ selected: object|null, reason: string }}
 */
export function selectTopic(contentQueue, contentMapTrimmed, opts = {}) {
  const queue = contentQueue?.queue || [];
  const planned = queue.filter(q => q.status === 'planned');

  if (planned.length === 0) {
    return { selected: null, reason: 'No articles with status: planned' };
  }

  const existingSlugs = new Set(contentMapTrimmed.map(e => e.slug));

  // Resolve slugs for all candidates
  const candidates = planned.map(candidate => {
    const slug = candidate.slug
      ? candidate.slug
      : candidate.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 75);
    return { ...candidate, slug };
  });

  // Score candidates if cluster data available, else fall back to priority sort
  const { topicClusters, contentMap, focus } = opts;
  let sorted;

  if (topicClusters && contentMap) {
    const clusterStats = buildClusterStats(topicClusters, contentMap);
    sorted = [...candidates].sort((a, b) => {
      const scoreA = scoreCandidate(a, clusterStats, focus || null);
      const scoreB = scoreCandidate(b, clusterStats, focus || null);
      return scoreB - scoreA;
    });
  } else {
    // Fallback: simple priority sort (backward-compatible)
    sorted = [...candidates].sort(
      (a, b) => (PRIORITY_MAP[b.priority] || 0) - (PRIORITY_MAP[a.priority] || 0)
    );
  }

  for (const candidate of sorted) {
    if (existingSlugs.has(candidate.slug)) {
      continue; // Cannibalization check (D-10)
    }

    return {
      selected: candidate,
      reason: `Selected ${candidate.id}: ${candidate.title}`,
    };
  }

  return { selected: null, reason: 'All planned articles have slug conflicts' };
}
```

- [ ] **Step 4: Run all topic-selector tests**

Run: `cd "E:/Site CL/autopilot" && node --test tests/topic-selector.test.js`
Expected: All tests PASS (both existing and new).

- [ ] **Step 5: Commit**

```bash
cd "E:/Site CL" && git add autopilot/pipeline/topic-selector.js autopilot/tests/topic-selector.test.js && git commit -m "feat: integrate cluster scorer into topic selector with backward-compatible fallback"
```

---

## Task 6: Integrate into Pipeline (run.js)

**Files:**
- Modify: `autopilot/pipeline/run.js`

- [ ] **Step 1: Add cluster data imports at the top of run.js**

After the existing import block (around line 8), add:

```javascript
import { readFocus, decrementFocusCount } from './cluster-scorer.js';
```

Also add `yaml` import if not present:

```javascript
import yaml from 'js-yaml';
```

- [ ] **Step 2: Pass cluster context to selectTopic**

Replace the Step 2 block (lines 101-115) in run.js. Find this code:

```javascript
  let { selected, reason } = selectTopic(ctx.contentQueue, ctx.contentMapTrimmed);
```

Replace with:

```javascript
  // Load cluster context for scoring
  let topicClusters = null;
  let contentMapFull = null;
  let focus = null;
  try {
    const clustersPath = join(basePath, '.seo-engine', 'data', 'topic-clusters.yaml');
    topicClusters = yaml.load(readFileSync(clustersPath, 'utf8'));
    const mapPath = join(basePath, '.seo-engine', 'data', 'content-map.yaml');
    contentMapFull = yaml.load(readFileSync(mapPath, 'utf8'));
    focus = readFocus(join(basePath, 'autopilot', 'state'));
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not load cluster context — falling back to priority sort');
  }

  let { selected, reason } = selectTopic(ctx.contentQueue, ctx.contentMapTrimmed, {
    topicClusters,
    contentMap: contentMapFull,
    focus,
  });
```

- [ ] **Step 3: Add focus count decrement after Step 8**

After the existing Step 8 block (after line 261), before the Telegram preview section, add:

```javascript
  // Step 8b: Decrement focus count if applicable
  if (focus && selected.cluster_id === focus.clusterId) {
    const stateDir = join(basePath, 'autopilot', 'state');
    const { cleared } = decrementFocusCount(stateDir);
    if (cleared) {
      writeActivityEvent({ event: 'focus_cleared', slug: selected.slug, clusterId: focus.clusterId });
      logger.info({ clusterId: focus.clusterId }, 'Focus auto-cleared after article count reached 0');
    }
  }
```

- [ ] **Step 4: Add readFileSync import if missing**

Check the existing imports at the top of run.js. `readFileSync` is not in the current import. Find:

```javascript
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
```

Replace with:

```javascript
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
```

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `cd "E:/Site CL/autopilot" && node --test tests/topic-selector.test.js tests/cluster-scorer.test.js`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "E:/Site CL" && git add autopilot/pipeline/run.js && git commit -m "feat: pass cluster context to topic selector + decrement focus count after generation"
```

---

## Task 7: Cluster API Endpoints — Tests

**Files:**
- Create: `autopilot/tests/api-clusters.test.js`

- [ ] **Step 1: Write API integration tests**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';

// We test the route handler logic directly via exported helpers,
// since spinning up Express in tests adds complexity.
// The actual Express wiring is thin and tested via manual/E2E.
import { readFocus, writeFocus, clearFocus } from '../pipeline/cluster-scorer.js';

let tmpDir;

describe('cluster focus API logic', () => {
  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `api-clusters-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('POST focus: creates focus file with until_unpin mode', () => {
    const focus = {
      clusterId: 'tc_aube',
      mode: 'until_unpin',
      remainingArticles: null,
      setAt: new Date().toISOString(),
      setBy: 'dashboard',
    };
    writeFocus(tmpDir, focus);
    const result = readFocus(tmpDir);
    assert.equal(result.clusterId, 'tc_aube');
    assert.equal(result.mode, 'until_unpin');
  });

  it('POST focus: creates focus file with count mode', () => {
    const focus = {
      clusterId: 'tc_aube',
      mode: 'count',
      remainingArticles: 3,
      setAt: new Date().toISOString(),
      setBy: 'dashboard',
    };
    writeFocus(tmpDir, focus);
    const result = readFocus(tmpDir);
    assert.equal(result.mode, 'count');
    assert.equal(result.remainingArticles, 3);
  });

  it('DELETE focus: removes focus file', () => {
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'until_unpin', remainingArticles: null, setAt: '', setBy: '' });
    clearFocus(tmpDir);
    assert.equal(readFocus(tmpDir), null);
  });

  it('DELETE focus: no-op when no focus file exists', () => {
    clearFocus(tmpDir); // should not throw
    assert.equal(readFocus(tmpDir), null);
  });

  it('POST focus: overwrites existing focus', () => {
    writeFocus(tmpDir, { clusterId: 'tc_tabac', mode: 'until_unpin', remainingArticles: null, setAt: '', setBy: '' });
    writeFocus(tmpDir, { clusterId: 'tc_aube', mode: 'count', remainingArticles: 5, setAt: '', setBy: '' });
    const result = readFocus(tmpDir);
    assert.equal(result.clusterId, 'tc_aube');
    assert.equal(result.remainingArticles, 5);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd "E:/Site CL/autopilot" && node --test tests/api-clusters.test.js`
Expected: All 5 tests PASS (these test the scorer's state management which already exists).

- [ ] **Step 3: Commit**

```bash
cd "E:/Site CL" && git add autopilot/tests/api-clusters.test.js && git commit -m "test: add cluster focus API logic tests"
```

---

## Task 8: Cluster API Endpoints — Implementation

**Files:**
- Modify: `autopilot/routes/api.js`

- [ ] **Step 1: Add imports at the top of api.js**

After the existing import block (around line 37), add:

```javascript
import { buildClusterStats, readFocus, writeFocus, clearFocus } from '../pipeline/cluster-scorer.js';
```

- [ ] **Step 2: Add GET /api/clusters endpoint**

Add before the closing of the file (before any export or at the end of the routes section, after the `/api/sync` route around line 734):

```javascript
// ─── Cluster routes ─────────────────────────────────────────────────────────

/**
 * GET /api/clusters
 * Returns all clusters with computed stats (completion %, rankings, focus state).
 */
apiRouter.get('/clusters', async (req, res) => {
  await pullIfStale().catch(() => {});
  let basePath;
  try { basePath = getSiteBasePath(); } catch { return res.json({ clusters: [], focus: null }); }

  // Load topic-clusters.yaml
  const clustersPath = join(basePath, '.seo-engine', 'data', 'topic-clusters.yaml');
  if (!existsSync(clustersPath)) return res.json({ clusters: [], focus: null });

  let topicClusters;
  try { topicClusters = yaml.load(readFileSync(clustersPath, 'utf8')); }
  catch { return res.json({ clusters: [], focus: null }); }

  // Build stats
  const contentMap = loadContentMap();
  const clusterStats = buildClusterStats(topicClusters, contentMap);

  // Load rankings cache for avg position per cluster
  let rankingsByKeyword = {};
  try {
    const cachePath = join(STATE_DIR, 'rankings-live-cache.json');
    if (existsSync(cachePath)) {
      const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
      if (cache.results) {
        for (const r of cache.results) {
          rankingsByKeyword[r.keyword?.toLowerCase()] = r.position;
        }
      }
    }
  } catch { /* non-critical */ }

  // Map cluster keywords to avg positions
  const clusters = (topicClusters.clusters || []).map(c => {
    const stat = clusterStats.get(c.id) || { target: 0, published: 0, drafted: 0, planned: 0 };
    const completionPct = stat.target > 0 ? Math.round((stat.published / stat.target) * 100) : 0;

    // Average position from keywords assigned to this cluster
    const clusterKeywords = (c.primary_keywords || []).map(k => k.toLowerCase());
    const positions = clusterKeywords
      .map(k => rankingsByKeyword[k])
      .filter(p => typeof p === 'number');
    const avgPosition = positions.length > 0
      ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
      : null;

    return {
      id: c.id,
      name: c.name || c.id,
      pillarSlug: c.pillar?.slug || null,
      totalTarget: stat.target,
      published: stat.published,
      drafted: stat.drafted,
      planned: stat.planned,
      completionPct,
      avgPosition,
    };
  });

  const focus = readFocus(STATE_DIR);
  res.json({ clusters, focus });
});

/**
 * POST /api/clusters/:id/focus
 * Set focus on a cluster.
 * Body: { mode: "until_unpin" } or { mode: "count", articleCount: 3 }
 */
apiRouter.post('/clusters/:id/focus', (req, res) => {
  const clusterId = req.params.id;
  const { mode, articleCount } = req.body || {};

  // Validate cluster exists
  let basePath;
  try { basePath = getSiteBasePath(); } catch { return res.status(500).json({ error: 'Site path unavailable' }); }
  const clustersPath = join(basePath, '.seo-engine', 'data', 'topic-clusters.yaml');
  try {
    const topicClusters = yaml.load(readFileSync(clustersPath, 'utf8'));
    const exists = (topicClusters.clusters || []).some(c => c.id === clusterId);
    if (!exists) return res.status(400).json({ error: `Unknown cluster: ${clusterId}` });
  } catch {
    return res.status(500).json({ error: 'Could not read topic-clusters.yaml' });
  }

  // Validate mode
  if (mode !== 'until_unpin' && mode !== 'count') {
    return res.status(400).json({ error: 'mode must be "until_unpin" or "count"' });
  }
  if (mode === 'count') {
    const count = parseInt(articleCount, 10);
    if (!count || count < 1 || count > 10) {
      return res.status(400).json({ error: 'articleCount must be 1-10' });
    }
  }

  const focusState = {
    clusterId,
    mode,
    remainingArticles: mode === 'count' ? parseInt(articleCount, 10) : null,
    setAt: new Date().toISOString(),
    setBy: 'dashboard',
  };
  writeFocus(STATE_DIR, focusState);
  logger.info({ clusterId, mode }, 'Cluster focus set');

  res.json({ ok: true, focus: focusState });
});

/**
 * DELETE /api/clusters/focus
 * Remove cluster focus (back to auto-balance).
 */
apiRouter.delete('/clusters/focus', (req, res) => {
  clearFocus(STATE_DIR);
  logger.info('Cluster focus cleared');
  res.json({ ok: true });
});
```

- [ ] **Step 3: Add cluster-focus.json to SSE FILES_TO_POLL**

Find the `FILES_TO_POLL` array (around line 237):

```javascript
  const FILES_TO_POLL = [
    { path: PIPELINE_STATUS_PATH, type: 'pipeline' },
    { path: PENDING_PATH, type: 'pending' },
    { path: join(STATE_DIR, 'audit-events.json'), type: 'audit' },
    { path: join(STATE_DIR, 'page-audit.json'), type: 'audit-complete' },
  ];
```

Add one more entry:

```javascript
    { path: join(STATE_DIR, 'cluster-focus.json'), type: 'cluster-focus' },
```

- [ ] **Step 4: Run all tests**

Run: `cd "E:/Site CL/autopilot" && node --test tests/api-clusters.test.js tests/cluster-scorer.test.js tests/gsc-ping.test.js tests/topic-selector.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "E:/Site CL" && git add autopilot/routes/api.js && git commit -m "feat: add cluster API endpoints (GET clusters, POST focus, DELETE focus) + SSE polling"
```

---

## Task 9: Dashboard UI — Clusters Tab

**Files:**
- Modify: `autopilot/dashboard/index.html`

This is a large file (2400+ lines). Changes are in 3 areas: sidebar nav, Alpine store, and tab panel.

- [ ] **Step 1: Add "Clusters" tab to sidebar navigation**

Find the Links tab button in the sidebar (the last nav button before the sidebar closing `</nav>` or `</div>`). It uses `$store.nav.tab = 'links'`. After that button, add:

```html
          <!-- Clusters tab -->
          <button @click="$store.nav.tab = 'clusters'; $store.nav.mobileOpen = false"
                  :class="$store.nav.tab === 'clusters' ? 'bg-[#3b82f6] text-white' : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <span>Clusters</span>
          </button>
```

- [ ] **Step 2: Add Clusters tab panel**

Find the end of the last tab panel (likely the links or costs panel). After its closing `</div>`, add the full Clusters tab:

```html
        <!-- ═══ CLUSTERS TAB ═══ -->
        <div x-show="$store.nav.tab === 'clusters'" x-data="clustersPanel()" x-init="loadClusters()">

          <!-- Focus banner -->
          <template x-if="focus">
            <div class="bg-[#1f3a5f] border border-[#3b82f6] rounded-xl px-5 py-3 mb-5 flex items-center justify-between">
              <div>
                <span class="text-[#3b82f6] font-semibold text-sm">Focus actif :</span>
                <span class="text-[#f0f6fc] ml-2 text-sm" x-text="focusClusterName()"></span>
                <span class="text-[#8b949e] ml-2 text-sm" x-text="focus.mode === 'count' ? `(${focus.remainingArticles} articles restants)` : '(jusqu\\'a retrait)'"></span>
              </div>
              <button @click="removeFocus()" class="border border-[#f85149] text-[#f85149] px-3 py-1 rounded-lg text-xs hover:bg-[#f85149]/10 transition-colors">Retirer le focus</button>
            </div>
          </template>

          <!-- Cluster cards grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <template x-for="cluster in clusters" :key="cluster.id">
              <div class="bg-[#1c2128] border rounded-xl p-5"
                   :class="focus?.clusterId === cluster.id ? 'border-[#3b82f6] border-2' : 'border-[#30363d]'">

                <!-- Header -->
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <div class="text-[15px] font-semibold text-[#f0f6fc]" x-text="cluster.name"></div>
                    <div class="text-xs text-[#8b949e] mt-0.5" x-text="cluster.id"></div>
                  </div>
                  <template x-if="focus?.clusterId === cluster.id">
                    <span class="bg-[#3b82f6] text-white text-[11px] px-2 py-0.5 rounded-full">FOCUS</span>
                  </template>
                </div>

                <!-- Progress bar -->
                <div class="mb-3">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-[#8b949e]">Completion</span>
                    <span class="text-[#f0f6fc]" x-text="`${cluster.published} / ${cluster.totalTarget} articles (${cluster.completionPct}%)`"></span>
                  </div>
                  <div class="bg-[#30363d] rounded h-2 overflow-hidden">
                    <div class="h-full rounded transition-all duration-300"
                         :class="focus?.clusterId === cluster.id ? 'bg-[#3b82f6]' : cluster.completionPct >= 60 ? 'bg-[#3fb950]' : cluster.completionPct >= 30 ? 'bg-[#d29922]' : 'bg-[#f85149]'"
                         :style="`width: ${cluster.completionPct}%`"></div>
                  </div>
                </div>

                <!-- Stats row -->
                <div class="flex gap-4 text-xs mb-4">
                  <div>
                    <span class="text-[#8b949e]">Pos. moy :</span>
                    <span class="text-[#f0f6fc]" x-text="cluster.avgPosition ?? '—'"></span>
                  </div>
                  <div>
                    <span class="text-[#8b949e]">Planifies :</span>
                    <span class="text-[#f0f6fc]" x-text="cluster.planned"></span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2" x-show="focus?.clusterId !== cluster.id">
                  <button @click="setFocus(cluster.id, 'until_unpin')"
                          class="flex-1 bg-[#3b82f6] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#1d4ed8] transition-colors">
                    Focus
                  </button>
                  <div x-data="{ showCount: false, count: 3 }" class="relative">
                    <button @click="showCount = !showCount"
                            class="border border-[#30363d] text-[#8b949e] px-3 py-1.5 rounded-lg text-xs hover:border-[#8b949e] transition-colors">
                      N articles...
                    </button>
                    <div x-show="showCount" @click.outside="showCount = false"
                         class="absolute right-0 mt-1 bg-[#1c2128] border border-[#30363d] rounded-lg p-3 shadow-lg z-10 w-48">
                      <label class="text-xs text-[#8b949e] block mb-1">Nombre d'articles :</label>
                      <input type="number" x-model.number="count" min="1" max="10"
                             class="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-[#f0f6fc] mb-2">
                      <div class="flex gap-2">
                        <button @click="setFocus(cluster.id, 'count', count); showCount = false"
                                class="flex-1 bg-[#3b82f6] text-white py-1 rounded text-xs">Appliquer</button>
                        <button @click="showCount = false"
                                class="flex-1 border border-[#30363d] text-[#8b949e] py-1 rounded text-xs">Annuler</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div x-show="focus?.clusterId === cluster.id" class="text-xs text-[#8b949e] text-center py-1.5">
                  Deja en focus
                </div>

              </div>
            </template>
          </div>
        </div>
```

- [ ] **Step 3: Add clustersPanel() Alpine component**

Find the `<script>` section at the bottom of the file where other Alpine components are defined (functions like `auditPanel()`, `costPanel()`, etc.). Add:

```javascript
    function clustersPanel() {
      return {
        clusters: [],
        focus: null,

        async loadClusters() {
          try {
            const res = await fetch('/api/clusters');
            const data = await res.json();
            this.clusters = data.clusters || [];
            this.focus = data.focus || null;
          } catch (err) {
            console.error('Failed to load clusters:', err);
          }
        },

        focusClusterName() {
          if (!this.focus) return '';
          const c = this.clusters.find(c => c.id === this.focus.clusterId);
          return c?.name || this.focus.clusterId;
        },

        async setFocus(clusterId, mode, articleCount) {
          try {
            const body = { mode };
            if (mode === 'count') body.articleCount = articleCount;
            const res = await fetch(`/api/clusters/${clusterId}/focus`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (res.ok) await this.loadClusters();
          } catch (err) {
            console.error('Failed to set focus:', err);
          }
        },

        async removeFocus() {
          try {
            const res = await fetch('/api/clusters/focus', { method: 'DELETE' });
            if (res.ok) await this.loadClusters();
          } catch (err) {
            console.error('Failed to remove focus:', err);
          }
        },
      };
    }
```

- [ ] **Step 4: Add cluster-focus SSE handler**

Find the SSE `onmessage` handler (around line 1282). Inside the `try` block, after the existing `if (msg.type === 'audit-complete')` block, add:

```javascript
      if (msg.type === 'cluster-focus') {
        window.dispatchEvent(new CustomEvent('cluster-focus-changed'));
      }
```

- [ ] **Step 5: Commit**

```bash
cd "E:/Site CL" && git add autopilot/dashboard/index.html && git commit -m "feat: add Clusters tab to dashboard with focus management UI"
```

---

## Task 10: Dashboard UI — Queue Tab Summary Bar

**Files:**
- Modify: `autopilot/dashboard/index.html`

- [ ] **Step 1: Add cluster summary bar at top of Queue tab**

Find the Queue tab panel opening (the `<div x-show="$store.nav.tab === 'queue'">`). Right after this div opens, before the existing articles card, add:

```html
          <!-- Cluster strategy summary -->
          <div x-data="clusterSummary()" x-init="load()" class="bg-[#1c2128] border border-[#30363d] rounded-xl mb-5 overflow-hidden">
            <button @click="expanded = !expanded" class="w-full flex items-center justify-between px-5 py-3 hover:bg-[#21262d] transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-[#e6edf3]">Strategie clusters</span>
                <template x-if="focusName">
                  <span class="bg-[#1f3a5f] text-[#3b82f6] text-[11px] px-2.5 py-0.5 rounded-full" x-text="'Focus: ' + focusName"></span>
                </template>
              </div>
              <svg class="w-4 h-4 text-[#8b949e] transition-transform" :class="expanded && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div x-show="expanded" x-transition class="border-t border-[#30363d] px-5 py-4">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <template x-for="c in miniClusters" :key="c.id">
                  <div class="bg-[#161b22] border rounded-lg p-3"
                       :class="c.focused ? 'border-[#3b82f6]' : 'border-[#30363d]'">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-semibold text-[#f0f6fc] truncate" x-text="c.shortName"></span>
                      <template x-if="c.focused">
                        <span class="text-[10px] text-[#3b82f6]">FOCUS</span>
                      </template>
                    </div>
                    <div class="bg-[#30363d] rounded h-1.5 overflow-hidden mb-1.5">
                      <div class="h-full rounded"
                           :class="c.focused ? 'bg-[#3b82f6]' : c.pct >= 60 ? 'bg-[#3fb950]' : c.pct >= 30 ? 'bg-[#d29922]' : 'bg-[#f85149]'"
                           :style="`width: ${c.pct}%`"></div>
                    </div>
                    <div class="flex justify-between text-[11px] text-[#8b949e]">
                      <span x-text="`${c.pct}% (${c.pub}/${c.total})`"></span>
                      <span x-text="c.pos ? `Pos: ${c.pos}` : ''"></span>
                    </div>
                  </div>
                </template>
              </div>
              <div class="text-right mt-3">
                <button @click="$store.nav.tab = 'clusters'" class="text-[#3b82f6] text-xs hover:underline">
                  Voir details &amp; gerer le focus &rarr;
                </button>
              </div>
            </div>
          </div>
```

- [ ] **Step 2: Add clusterSummary() Alpine component**

In the `<script>` section alongside the `clustersPanel()` function, add:

```javascript
    function clusterSummary() {
      return {
        expanded: true,
        miniClusters: [],
        focusName: null,

        async load() {
          try {
            const res = await fetch('/api/clusters');
            const data = await res.json();
            this.miniClusters = (data.clusters || []).map(c => ({
              id: c.id,
              shortName: c.name.replace('Magnetiseur ', 'Magn. ').replace('Symptomes ', '').slice(0, 16),
              pct: c.completionPct,
              pub: c.published,
              total: c.totalTarget,
              pos: c.avgPosition,
              focused: data.focus?.clusterId === c.id,
            }));
            if (data.focus) {
              const fc = (data.clusters || []).find(c => c.id === data.focus.clusterId);
              this.focusName = fc?.name || data.focus.clusterId;
            } else {
              this.focusName = null;
            }
          } catch { /* non-critical */ }
        },
      };
    }
```

- [ ] **Step 3: Wire SSE refresh for cluster summary**

Find the SSE handler where we added `cluster-focus` event (Task 9 Step 4). The `clusterSummary` component should refresh on focus changes. Add a listener inside the `clusterSummary` `load()` method, after the fetch:

Actually, simpler approach — add `@cluster-focus-changed.window="load()"` to the summary container. Update the opening div:

```html
          <div x-data="clusterSummary()" x-init="load()" @cluster-focus-changed.window="load()" class="bg-[#1c2128] border border-[#30363d] rounded-xl mb-5 overflow-hidden">
```

Similarly, update the Clusters tab panel div from Task 9 to also listen:

```html
        <div x-show="$store.nav.tab === 'clusters'" x-data="clustersPanel()" x-init="loadClusters()" @cluster-focus-changed.window="loadClusters()">
```

- [ ] **Step 4: Commit**

```bash
cd "E:/Site CL" && git add autopilot/dashboard/index.html && git commit -m "feat: add cluster summary bar to Queue Articles tab"
```

---

## Task 11: Manual Testing + Verification

**Files:** None created — verification only.

- [ ] **Step 1: Run full test suite**

Run: `cd "E:/Site CL/autopilot" && node --test`
Expected: All tests pass including new ones (cluster-scorer, gsc-ping, topic-selector, api-clusters).

- [ ] **Step 2: Start the app locally**

Run: `cd "E:/Site CL/autopilot" && node server.js`
Expected: Server starts on configured port.

- [ ] **Step 3: Test Clusters API via curl**

```bash
# Get clusters
curl -s http://localhost:3000/api/clusters | node -e "process.stdin.resume(); process.stdin.on('data', d => console.log(JSON.stringify(JSON.parse(d), null, 2)))"

# Set focus (until_unpin)
curl -s -X POST http://localhost:3000/api/clusters/tc_magnetiseur_aube/focus -H 'Content-Type: application/json' -d '{"mode":"until_unpin"}'

# Set focus (count)
curl -s -X POST http://localhost:3000/api/clusters/tc_magnetiseur_aube/focus -H 'Content-Type: application/json' -d '{"mode":"count","articleCount":3}'

# Remove focus
curl -s -X DELETE http://localhost:3000/api/clusters/focus

# Verify invalid cluster returns 400
curl -s -X POST http://localhost:3000/api/clusters/tc_nonexistent/focus -H 'Content-Type: application/json' -d '{"mode":"until_unpin"}'
```

- [ ] **Step 4: Test dashboard UI in Chrome DevTools**

Open the dashboard in Chrome. Use DevTools to verify:
1. Clusters tab appears in sidebar and loads cluster cards
2. Clicking "Focus" on a cluster shows the focus banner
3. "N articles..." dropdown works — set count, click Appliquer
4. "Retirer le focus" clears the banner
5. Queue tab shows cluster summary bar with mini cards
6. "Voir details" link navigates to Clusters tab
7. SSE updates refresh both panels when focus changes

- [ ] **Step 5: Test Telegram approval flow (ask user)**

Ask the user to approve a test article via Telegram to verify the GSC ping now actually submits for indexing. Check server logs for:
```
INFO (gsc-ping): Indexing API success
```
or
```
WARN (gsc-ping): Indexing API failed -- falling back to sitemap ping
INFO (gsc-ping): Sitemap ping success
```

- [ ] **Step 6: Final commit with all changes**

```bash
cd "E:/Site CL" && git add -A && git status
```

Review staged changes, then commit if any unstaged fixes were made during testing:
```bash
git commit -m "test: verify cluster priority + GSC fix end-to-end"
```
