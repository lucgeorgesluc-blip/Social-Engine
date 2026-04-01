/**
 * Ranking watcher — F4.5
 * Watches state/live-rankings-history.json for changes, compares the last two
 * snapshots, and triggers runAudit() when any keyword drops >= 5 positions.
 *
 * Uses fs.watch + 150ms debounce (same pattern as SSE watcher in api.js).
 *
 * DI: _stateDir, _historyPath, _runAudit, _readFile, _writeFile, _watch, _existsSync
 *
 * @module ranking-watcher
 */

import { readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { runAudit } from './runner.js';

const logger = pino({ name: 'ranking-watcher' });
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATE_DIR = join(__dirname, '..', 'state');

/**
 * Detect keywords that dropped >= 5 positions between the last two snapshots.
 * @param {Array} history - Full live-rankings-history.json array
 * @returns {Array<{keyword, previousPosition, currentPosition, drop, url}>}
 */
export function detectDrops(history) {
  if (!history || history.length < 2) return [];

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

/**
 * Extract a slug from a full site URL.
 * 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' -> 'magnetiseur-troyes'
 * 'https://www.magnetiseuse-lacoste-corinne.fr/blog/hypnose-arret-tabac.html' -> 'hypnose-arret-tabac'
 * @param {string} url
 * @returns {string}
 */
export function extractSlugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    return pathname
      .replace(/^\//, '')       // strip leading /
      .replace(/^blog\//, '')   // strip blog/ prefix
      .replace(/\.html$/, '');  // strip .html suffix
  } catch {
    // Fallback: treat as path string
    return url
      .replace(/^\//, '')
      .replace(/^blog\//, '')
      .replace(/\.html$/, '');
  }
}

/**
 * Debounce factory — prevents Windows double-fire (Pitfall 1).
 * Uses 150ms per spec (not 100ms like SSE watcher).
 */
function debounced(fn, ms = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Start watching live-rankings-history.json for ranking drops.
 * When a drop >= 5 is detected, writes audit-status.json and calls runAudit.
 *
 * @param {Object} [opts] - DI parameters
 * @param {string} [opts._stateDir] - State directory path
 * @param {string} [opts._historyPath] - Path to live-rankings-history.json
 * @param {Function} [opts._runAudit] - runAudit function (DI)
 * @param {Function} [opts._readFile] - readFileSync replacement (DI)
 * @param {Function} [opts._writeFile] - writeFileSync replacement (DI)
 * @param {Function} [opts._watch] - fs.watch replacement (DI)
 * @param {Function} [opts._existsSync] - existsSync replacement (DI)
 * @returns {Object|null} - The watcher handle, or null if file missing
 */
export function startRankingWatcher(opts = {}) {
  const stateDir = opts._stateDir || DEFAULT_STATE_DIR;
  const historyPath = opts._historyPath || join(stateDir, 'live-rankings-history.json');
  const doRunAudit = opts._runAudit || runAudit;
  const doReadFile = opts._readFile || ((p) => readFileSync(p, 'utf8'));
  const doWriteFile = opts._writeFile || ((p, d) => writeFileSync(p, d, 'utf8'));
  const doWatch = opts._watch || watch;
  const doExistsSync = opts._existsSync || existsSync;

  // Pitfall 4: gracefully handle missing file
  if (!doExistsSync(historyPath)) {
    logger.warn({ historyPath }, 'Rankings history file not found — watcher not started');
    return null;
  }

  const onChange = async () => {
    try {
      const raw = doReadFile(historyPath);
      const history = JSON.parse(raw);
      const drops = detectDrops(history);

      if (drops.length === 0) return;

      // Extract affected slugs (Pitfall 5: URL-to-slug conversion)
      const affectedSlugs = [...new Set(drops.map(d => extractSlugFromUrl(d.url)))];

      logger.info(
        { keyword: drops[0].keyword, drop: drops[0].drop, slugs: affectedSlugs },
        'Ranking drop detected — triggering audit'
      );

      // Write audit-status.json: running = true (flat ROADMAP SC5 schema)
      const statusPath = join(stateDir, 'audit-status.json');
      doWriteFile(statusPath, JSON.stringify({
        running: true,
        triggeredAt: new Date().toISOString(),
        triggerKeyword: drops[0].keyword,
        positionBefore: drops[0].previousPosition,
        positionAfter: drops[0].currentPosition,
        slugsScanned: affectedSlugs,
        completedAt: null,
      }, null, 2));

      // Run audit on affected slugs
      await doRunAudit({ slugs: affectedSlugs });

      // Update audit-status.json: running = false
      const currentStatus = JSON.parse(doReadFile(statusPath));
      doWriteFile(statusPath, JSON.stringify({
        ...currentStatus,
        running: false,
        completedAt: new Date().toISOString(),
      }, null, 2));

    } catch (err) {
      logger.error({ err: err?.message }, 'Ranking watcher onChange error');
    }
  };

  const watcher = doWatch(historyPath, debounced(onChange));
  return watcher;
}

/**
 * Stop the ranking watcher.
 * @param {Object} watcher - The watcher handle from startRankingWatcher
 */
export function stopRankingWatcher(watcher) {
  if (!watcher) return;
  try {
    watcher.close();
  } catch { /* ignore — watcher may already be closed */ }
}
