// Tests for fb-metrics.js — metrics sync with mocked Graph API
// DB tests are skipped when DATABASE_URL is not available (run in CI only)
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dbAvailable = !!process.env.DATABASE_URL;

// ── No-token test (requires DB) ───────────────────────────────────────────────

describe('syncMetrics — no token', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
    const { getTestDb, cleanDb, runSchema } = require('../helpers');

    async function runFullSchema() {
        await runSchema();
        const { pool } = getTestDb();
        const schemaFbSQL = fs.readFileSync(path.join(__dirname, '../../lib/schema-fb.sql'), 'utf8');
        await pool.query(schemaFbSQL);
    }

    before(async () => {
        await runFullSchema();
        await cleanDb();
        const { query } = getTestDb();
        await query('DELETE FROM fb_tokens');
        await query('DELETE FROM fb_sync_state');
    });

    it('returns {synced: 0, error: "no_token"} when no token exists', async () => {
        const { syncMetrics } = require('../../lib/fb-metrics');
        const result = await syncMetrics();
        assert.strictEqual(result.synced, 0);
        assert.strictEqual(result.error, 'no_token');
    });
});

// ── Mocked fetch tests (requires DB) ─────────────────────────────────────────

describe('syncMetrics — with mocked fetch', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
    const { getTestDb, cleanDb, runSchema } = require('../helpers');
    const originalFetch = global.fetch;

    async function runFullSchema() {
        await runSchema();
        const { pool } = getTestDb();
        const schemaFbSQL = fs.readFileSync(path.join(__dirname, '../../lib/schema-fb.sql'), 'utf8');
        await pool.query(schemaFbSQL);
    }

    before(async () => {
        await runFullSchema();
        await cleanDb();
        const { query } = getTestDb();
        await query('DELETE FROM fb_tokens');
        await query('DELETE FROM fb_sync_state');
        await query('DELETE FROM post_metrics');

        await query(
            `INSERT INTO fb_tokens (token_type, access_token, page_id)
             VALUES ('page_access', 'mock-token-456', 'mock-page-id')`
        );

        await query(
            `INSERT INTO posts (id, status, platform, content, published_date)
             VALUES ('test-post-metrics-1', 'published', 'facebook', 'Test post', NOW())
             ON CONFLICT (id) DO NOTHING`
        );

        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                data: [
                    { name: 'post_impressions', values: [{ value: 1500 }] },
                    { name: 'post_reach', values: [{ value: 800 }] },
                    { name: 'post_engaged_users', values: [{ value: 120 }] },
                    { name: 'post_clicks', values: [{ value: 45 }] }
                ]
            })
        });
    });

    after(() => { global.fetch = originalFetch; });

    it('creates a post_metrics row with correct values', async () => {
        delete require.cache[require.resolve('../../lib/fb-metrics')];
        const { syncMetrics } = require('../../lib/fb-metrics');
        const result = await syncMetrics();
        assert.strictEqual(result.synced, 1);

        const { query } = getTestDb();
        const rows = await query("SELECT * FROM post_metrics WHERE post_id = 'test-post-metrics-1'");
        assert.strictEqual(rows.rows.length, 1);
        assert.strictEqual(rows.rows[0].impressions, 1500);
        assert.strictEqual(rows.rows[0].reach, 800);
        assert.strictEqual(rows.rows[0].engagement, 120);
    });

    it('updates fb_sync_state with metrics_last_sync after success', async () => {
        const { query } = getTestDb();
        const rows = await query("SELECT value FROM fb_sync_state WHERE key = 'metrics_last_sync'");
        assert.strictEqual(rows.rows.length, 1);
        assert.ok(rows.rows[0].value);
    });
});

// ── Module structure tests (no DB needed) ────────────────────────────────────

describe('syncMetrics — module structure', () => {
    it('exports syncMetrics function', () => {
        const mod = require('../../lib/fb-metrics');
        assert.strictEqual(typeof mod.syncMetrics, 'function');
    });
});
