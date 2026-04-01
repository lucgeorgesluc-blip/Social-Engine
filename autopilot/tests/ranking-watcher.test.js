import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const { detectDrops, extractSlugFromUrl, startRankingWatcher, stopRankingWatcher } = await import('../audit/ranking-watcher.js');

/* ─── detectDrops ─── */

describe('detectDrops()', () => {
  it('returns drop entry when keyword drops >= 5 positions', () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 5, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 12, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
    ];
    const drops = detectDrops(history);
    assert.equal(drops.length, 1);
    assert.equal(drops[0].keyword, 'magnetiseur Troyes');
    assert.equal(drops[0].previousPosition, 5);
    assert.equal(drops[0].currentPosition, 12);
    assert.equal(drops[0].drop, 7);
  });

  it('returns empty when drop is below threshold (< 5)', () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 5, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 8, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
    ];
    const drops = detectDrops(history);
    assert.equal(drops.length, 0);
  });

  it('ignores null previous position', () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'test', position: null, url: null }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'test', position: 10, url: 'https://www.magnetiseuse-lacoste-corinne.fr/index.html' }] },
    ];
    assert.equal(detectDrops(history).length, 0);
  });

  it('ignores null current position', () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'test', position: 5, url: 'https://www.magnetiseuse-lacoste-corinne.fr/index.html' }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'test', position: null, url: null }] },
    ];
    assert.equal(detectDrops(history).length, 0);
  });

  it('returns empty for history with fewer than 2 entries', () => {
    assert.deepEqual(detectDrops([]), []);
    assert.deepEqual(detectDrops([{ checkedAt: '2026-04-01T12:00:00Z', results: [] }]), []);
  });

  it('detects multiple drops across different keywords', () => {
    const history = [
      {
        checkedAt: '2026-04-01T12:00:00Z',
        results: [
          { keyword: 'kw1', position: 3, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' },
          { keyword: 'kw2', position: 10, url: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/hypnose-arret-tabac.html' },
        ],
      },
      {
        checkedAt: '2026-04-01T13:00:00Z',
        results: [
          { keyword: 'kw1', position: 9, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' },
          { keyword: 'kw2', position: 20, url: 'https://www.magnetiseuse-lacoste-corinne.fr/blog/hypnose-arret-tabac.html' },
        ],
      },
    ];
    const drops = detectDrops(history);
    assert.equal(drops.length, 2);
  });
});

/* ─── extractSlugFromUrl ─── */

describe('extractSlugFromUrl()', () => {
  it('extracts slug from root page URL', () => {
    assert.equal(
      extractSlugFromUrl('https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html'),
      'magnetiseur-troyes'
    );
  });

  it('extracts slug from blog page URL', () => {
    assert.equal(
      extractSlugFromUrl('https://www.magnetiseuse-lacoste-corinne.fr/blog/hypnose-arret-tabac.html'),
      'hypnose-arret-tabac'
    );
  });

  it('handles URL without .html extension', () => {
    const slug = extractSlugFromUrl('https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes');
    assert.equal(slug, 'magnetiseur-troyes');
  });
});

/* ─── startRankingWatcher / stopRankingWatcher ─── */

describe('startRankingWatcher()', () => {
  it('calls runAudit with affected slugs when drop detected', async () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 5, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'magnetiseur Troyes', position: 15, url: 'https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html' }] },
    ];

    let auditCalls = [];
    let writeFiles = [];
    let watchCallback = null;

    const fakeWatch = (filePath, cb) => {
      watchCallback = cb;
      return { close: () => {} };
    };
    const fakeReadFile = () => JSON.stringify(history);
    const fakeRunAudit = async (opts) => { auditCalls.push(opts); return {}; };
    const fakeWriteFile = (path, data) => { writeFiles.push({ path, data }); };
    const fakeExistsSync = () => true;

    const TMP = join(tmpdir(), 'rw-test-' + process.pid);
    mkdirSync(TMP, { recursive: true });

    const watcher = startRankingWatcher({
      _stateDir: TMP,
      _historyPath: join(TMP, 'live-rankings-history.json'),
      _runAudit: fakeRunAudit,
      _readFile: fakeReadFile,
      _writeFile: fakeWriteFile,
      _watch: fakeWatch,
      _existsSync: fakeExistsSync,
    });

    assert.ok(watcher, 'should return watcher handle');
    assert.ok(watchCallback, 'should have registered a watch callback');

    // Manually trigger the debounced callback (simulate file change)
    await watchCallback();

    // Wait for debounce
    await new Promise(r => setTimeout(r, 200));

    assert.equal(auditCalls.length, 1, 'runAudit should be called once');
    assert.deepEqual(auditCalls[0].slugs, ['magnetiseur-troyes']);

    // Verify audit-status.json was written
    const statusWrites = writeFiles.filter(w => w.path.includes('audit-status.json'));
    assert.ok(statusWrites.length >= 1, 'should write audit-status.json');
    const statusData = JSON.parse(statusWrites[0].data);
    assert.equal(statusData.running, true);
    assert.equal(statusData.triggerKeyword, 'magnetiseur Troyes');
    assert.equal(statusData.positionBefore, 5);
    assert.equal(statusData.positionAfter, 15);

    rmSync(TMP, { recursive: true, force: true });
  });

  it('writes audit-status.json with trigger metadata', async () => {
    const history = [
      { checkedAt: '2026-04-01T12:00:00Z', results: [{ keyword: 'hypnose Troyes', position: 3, url: 'https://www.magnetiseuse-lacoste-corinne.fr/hypnose-troyes.html' }] },
      { checkedAt: '2026-04-01T13:00:00Z', results: [{ keyword: 'hypnose Troyes', position: 12, url: 'https://www.magnetiseuse-lacoste-corinne.fr/hypnose-troyes.html' }] },
    ];

    let writeFiles = [];
    let watchCallback = null;

    const TMP = join(tmpdir(), 'rw-test2-' + process.pid);
    mkdirSync(TMP, { recursive: true });

    startRankingWatcher({
      _stateDir: TMP,
      _historyPath: join(TMP, 'live-rankings-history.json'),
      _runAudit: async () => ({}),
      _readFile: () => JSON.stringify(history),
      _writeFile: (path, data) => { writeFiles.push({ path, data }); },
      _watch: (fp, cb) => { watchCallback = cb; return { close: () => {} }; },
      _existsSync: () => true,
    });

    await watchCallback();
    await new Promise(r => setTimeout(r, 200));

    // Should have at least 2 writes: running=true, then running=false
    const statusWrites = writeFiles.filter(w => w.path.includes('audit-status.json'));
    assert.ok(statusWrites.length >= 2, 'should write status before and after audit');
    const finalStatus = JSON.parse(statusWrites[statusWrites.length - 1].data);
    assert.equal(finalStatus.running, false);
    assert.ok(finalStatus.completedAt, 'should have completedAt timestamp');

    rmSync(TMP, { recursive: true, force: true });
  });

  it('returns null when history file does not exist', () => {
    const TMP = join(tmpdir(), 'rw-test3-' + process.pid);
    mkdirSync(TMP, { recursive: true });

    let watchCalled = false;
    const watcher = startRankingWatcher({
      _stateDir: TMP,
      _historyPath: join(TMP, 'nonexistent.json'),
      _runAudit: async () => ({}),
      _readFile: () => '[]',
      _writeFile: () => {},
      _watch: () => { watchCalled = true; return { close: () => {} }; },
      _existsSync: () => false,
    });

    assert.equal(watcher, null, 'should return null when file missing');
    assert.equal(watchCalled, false, 'should not start watching');

    rmSync(TMP, { recursive: true, force: true });
  });
});

describe('stopRankingWatcher()', () => {
  it('closes the watcher handle', () => {
    let closed = false;
    const fakeWatcher = { close: () => { closed = true; } };
    stopRankingWatcher(fakeWatcher);
    assert.equal(closed, true);
  });

  it('does not throw if watcher is null', () => {
    assert.doesNotThrow(() => stopRankingWatcher(null));
    assert.doesNotThrow(() => stopRankingWatcher(undefined));
  });
});
