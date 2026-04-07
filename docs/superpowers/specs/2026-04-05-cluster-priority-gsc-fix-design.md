# Cluster Priority + GSC Indexing Fix — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Approach:** C — Simple scorer + dashboard insights

---

## Overview

Two features for the SEO Autopilot:

1. **GSC Indexing Fix** — Replace the broken URL Inspection API call (read-only) with the actual Indexing API + sitemap ping fallback, so articles get indexed automatically after approval.
2. **Cluster Priority System** — Auto-balance article generation across topic clusters by completion %, with manual focus override via dashboard UI.

---

## 1. GSC Indexing Fix

### Problem

`gsc-ping.js` calls `searchConsole.urlInspection.index.inspect()` which only reads indexing status — it never requests indexing. The function returns `"submitted"` but nothing is actually submitted.

### Solution

Replace with two-tier approach:

**Primary: Google Indexing API**
- `google.indexing({ version: 'v3', auth })` with `urlNotifications.publish()`
- Request body: `{ url: articleUrl, type: 'URL_UPDATED' }`
- Scope: `https://www.googleapis.com/auth/indexing` (added alongside existing `webmasters` scope)
- Reuses `GSC_SERVICE_ACCOUNT_PATH` env var — no new credentials

**Fallback: Sitemap Ping**
- If Indexing API returns 403 (schema type restriction) or any error
- HTTP GET to `https://www.google.com/ping?sitemap=https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml`
- Lightweight, reliable, always works

### Return Value

```js
{
  status: 'indexed' | 'sitemap_pinged' | 'skipped' | 'error',
  method: 'indexing_api' | 'sitemap_ping' | null,
  reason?: string  // only on skip/error
}
```

### Contract

- Never throws — graceful failure preserved
- `deploy-orchestrator.js` integration unchanged (just richer status object)
- Telegram and dashboard UI can display which method succeeded

### Files Changed

- `autopilot/pipeline/gsc-ping.js` — rewrite core function
- `autopilot/tests/gsc-ping.test.js` — update mocks for new API

---

## 2. Cluster Priority System

### 2.1 Cluster Scorer

**New file:** `autopilot/pipeline/cluster-scorer.js`

#### Scoring Formula

```
score = base_priority + cluster_gap_bonus + focus_bonus

base_priority     = { high: 30, medium: 20, low: 10 }
cluster_gap_bonus = (1 - published / target) * 25
                    // empty cluster (0/8) = +25
                    // nearly full (6/8) = +6.25
                    // full (8/8) = +0
focus_bonus       = 50 if article.cluster_id === focused_cluster, else 0
```

**Design rationale:**
- Focus bonus (50) dominates — ensures pinned cluster always wins
- When no focus: gap bonus naturally prioritizes under-served clusters
- Base priority still matters within a cluster (high > medium > low)
- Formula is simple, transparent, debuggable

#### Inputs

| Source | Data |
|--------|------|
| `topic-clusters.yaml` | Cluster definitions; target = length of `cluster_pages` array (includes both published and planned entries) |
| `content-map.yaml` | Published/drafted article counts per cluster |
| `cluster-focus.json` | Manual focus state |

#### Exported Functions

```js
// Score a single candidate article
scoreCandidate(article, clusterStats, focus) => number

// Build cluster stats from data files
buildClusterStats(topicClusters, contentMap) => Map<clusterId, { target, published, drafted, planned }>

// Read/write focus state
readFocus(stateDir) => FocusState | null
writeFocus(stateDir, focusState) => void
clearFocus(stateDir) => void

// Decrement remaining articles count (for count mode)
decrementFocusCount(stateDir) => { cleared: boolean }
```

### 2.2 Focus State File

**Path:** `autopilot/state/cluster-focus.json`

```json
{
  "clusterId": "tc_magnetiseur_aube",
  "mode": "until_unpin",
  "remainingArticles": null,
  "setAt": "2026-04-05T10:00:00Z",
  "setBy": "dashboard"
}
```

**Count mode variant:**
```json
{
  "clusterId": "tc_magnetiseur_aube",
  "mode": "count",
  "remainingArticles": 3,
  "setAt": "2026-04-05T10:00:00Z",
  "setBy": "dashboard"
}
```

**Auto-clear:** When `mode: "count"` and `remainingArticles` hits 0 after a pipeline run, focus is cleared automatically. An activity event is logged: `"Focus auto-retire: tc_xxx (N articles generes)"`.

### 2.3 Topic Selector Integration

**File changed:** `autopilot/pipeline/topic-selector.js`

Current flow:
1. Filter `status: "planned"`
2. Sort by priority
3. Pick first non-conflicting slug

New flow:
1. Filter `status: "planned"`
2. **Score each candidate** via `scoreCandidate()`
3. Sort by score descending
4. Pick first non-conflicting slug
5. **After generation:** if focused cluster in count mode, call `decrementFocusCount()`

The cannibalization check (slug conflict) remains unchanged.

### 2.4 Pipeline Integration

**File changed:** `autopilot/pipeline/run.js`

After Step 8 (write pending state), add:
- If the generated article's `cluster_id` matches a count-mode focus, call `decrementFocusCount()`
- Log activity event if focus auto-cleared

---

## 3. API Endpoints

All endpoints added to `autopilot/routes/api.js`.

### GET /api/clusters

Returns all clusters with computed stats.

```json
{
  "clusters": [
    {
      "id": "tc_magnetiseur_aube",
      "name": "Magnetiseur Aube",
      "pillarSlug": "magnetiseur-aube",
      "totalTarget": 8,
      "published": 2,
      "drafted": 0,
      "planned": 1,
      "completionPct": 25,
      "avgPosition": 42.3,
      "positionTrend": -2.1
    }
  ],
  "focus": {
    "clusterId": "tc_magnetiseur_aube",
    "mode": "until_unpin",
    "remainingArticles": null
  }
}
```

**Data sources:**
- `topic-clusters.yaml` — cluster definitions, target counts, names
- `content-map.yaml` — published/drafted/planned counts per cluster
- `state/rankings-live-cache.json` — avg position per cluster (matched by cluster keywords)
- `state/cluster-focus.json` — focus state

### POST /api/clusters/:id/focus

Set focus on a cluster.

```json
// Request body:
{ "mode": "until_unpin" }
// or:
{ "mode": "count", "articleCount": 3 }
```

**Validation:**
- `id` must exist in `topic-clusters.yaml`
- `articleCount` must be 1-10 when mode is "count"
- Returns 400 on invalid input

**Response:** `{ "ok": true, "focus": { ... } }`

### DELETE /api/clusters/focus

Remove focus, return to auto-balance.

**Response:** `{ "ok": true }`

---

## 4. Dashboard UI

### 4.1 New Sidebar Tab: "Clusters"

Added to the Alpine.js `$store.nav` tab list alongside existing tabs.

**Layout:** 2-column grid of cluster cards (stacks to 1 column on mobile).

**Each cluster card contains:**
- Cluster name + ID
- Completion progress bar (color-coded: blue=focused, green>60%, amber 30-60%, red<30%)
- Stats: `published / target (pct%)`, avg Google position, position trend arrow
- Planned article count
- Two action buttons:
  - "Focus" — sets `until_unpin` mode
  - "N articles..." — inline dropdown with number input (1-10, default 3) + Appliquer/Annuler

**Focus banner:** When a cluster is focused, a blue banner appears at the top:
- Shows focused cluster name + mode description
- "Retirer le focus" button to clear

### 4.2 Queue Articles Tab: Cluster Summary Bar

Collapsible section at the top of the existing Queue Articles tab.

**Header row (always visible):**
- "Strategie clusters" label
- Focus badge showing active focus (if any)
- Expand/collapse toggle

**Expanded content:**
- 3-column grid of mini cluster cards (2 on mobile)
- Each shows: name, completion bar, `pct% (n/total)`, avg position
- Read-only — no focus controls here
- "Voir details & gerer le focus" link navigates to Clusters tab

### 4.3 SSE Integration

The existing SSE `/api/events` endpoint will poll `cluster-focus.json` alongside existing state files. Focus changes trigger UI refresh.

Add to `FILES_TO_POLL`:
```js
{ path: join(STATE_DIR, 'cluster-focus.json'), type: 'cluster-focus' }
```

---

## 5. Test Strategy

All tests use Node.js built-in test runner (`node:test` + `node:assert/strict`).

### cluster-scorer.test.js (new)
- `buildClusterStats()` correctly counts articles per cluster
- `scoreCandidate()` base priority scoring (high > medium > low)
- `scoreCandidate()` gap bonus: empty cluster > full cluster
- `scoreCandidate()` focus bonus dominates: low-priority focused > high-priority unfocused
- `readFocus()` / `writeFocus()` / `clearFocus()` state file operations
- `decrementFocusCount()` decrements and auto-clears at 0

### gsc-ping.test.js (updated)
- Indexing API success path returns `{ status: 'indexed', method: 'indexing_api' }`
- Indexing API 403 triggers sitemap ping fallback
- Sitemap ping success returns `{ status: 'sitemap_pinged', method: 'sitemap_ping' }`
- Both fail returns `{ status: 'error' }` without throwing
- Missing credentials returns `{ status: 'skipped' }`

### api-clusters.test.js (new)
- `GET /api/clusters` returns all clusters with stats
- `GET /api/clusters` includes focus state when present
- `POST /api/clusters/:id/focus` creates focus file
- `POST /api/clusters/:id/focus` with count mode
- `POST /api/clusters/:id/focus` rejects invalid cluster ID (400)
- `DELETE /api/clusters/focus` clears focus file

### topic-selector.test.js (updated)
- Scorer integration: focused cluster article wins over higher-priority unfocused
- Auto-balance: least complete cluster gets picked when no focus
- Count mode decrement after selection

---

## 6. Files Summary

### New Files
| File | Purpose |
|------|---------|
| `autopilot/pipeline/cluster-scorer.js` | Scoring algorithm + focus state management |
| `autopilot/tests/cluster-scorer.test.js` | Scorer unit tests |
| `autopilot/tests/api-clusters.test.js` | Clusters API integration tests |

### Modified Files
| File | Change |
|------|--------|
| `autopilot/pipeline/gsc-ping.js` | Replace Inspection API with Indexing API + sitemap ping |
| `autopilot/pipeline/topic-selector.js` | Integrate scorer, replace simple priority sort |
| `autopilot/pipeline/run.js` | Add focus count decrement after generation |
| `autopilot/routes/api.js` | Add 3 cluster endpoints |
| `autopilot/dashboard/index.html` | Add Clusters tab + Queue summary bar |
| `autopilot/tests/gsc-ping.test.js` | Update for new API |
| `autopilot/tests/topic-selector.test.js` | Add scorer integration tests |

### State Files (runtime, not committed)
| File | Purpose |
|------|---------|
| `autopilot/state/cluster-focus.json` | Manual focus override |
