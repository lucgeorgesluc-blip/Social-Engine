// Tests for fb-comments.js — comment sync with mocked Graph API
// DB tests are skipped when DATABASE_URL is not available (run in CI only)
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dbAvailable = !!process.env.DATABASE_URL;

// ── No-token test (requires DB) ───────────────────────────────────────────────

describe('syncComments — no token', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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
        const { syncComments } = require('../../lib/fb-comments');
        const result = await syncComments();
        assert.strictEqual(result.synced, 0);
        assert.strictEqual(result.error, 'no_token');
    });
});

// ── Mocked fetch tests (requires DB) ─────────────────────────────────────────

describe('syncComments — with mocked fetch', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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

        // Insert a page token
        await query(
            `INSERT INTO fb_tokens (token_type, access_token, page_id)
             VALUES ('page_access', 'mock-token-123', 'mock-page-id')`
        );

        // Insert a published Facebook post
        await query(
            `INSERT INTO posts (id, status, platform, content, published_date)
             VALUES ('test-post-fb-sync', 'published', 'facebook', 'Test post', NOW())
             ON CONFLICT (id) DO NOTHING`
        );

        // Mock fetch to return 2 comments
        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                data: [
                    { id: 'fb-comment-1', message: 'Super post!', from: { name: 'Marie Dupont' }, created_time: '2026-04-07T10:00:00+0000' },
                    { id: 'fb-comment-2', message: 'Merci beaucoup', from: { name: 'Jean Martin' }, created_time: '2026-04-07T11:00:00+0000' }
                ]
            })
        });
    });

    after(() => { global.fetch = originalFetch; });

    it('upserts 2 comments with platform=facebook and response_status=pending', async () => {
        delete require.cache[require.resolve('../../lib/fb-comments')];
        const { syncComments } = require('../../lib/fb-comments');
        const result = await syncComments();
        assert.strictEqual(result.synced, 2);
        assert.strictEqual(result.posts_checked, 1);

        const { query } = getTestDb();
        const rows = await query("SELECT * FROM comments WHERE platform = 'facebook' ORDER BY id");
        assert.strictEqual(rows.rows.length, 2);
        assert.strictEqual(rows.rows[0].response_status, 'pending');
        assert.strictEqual(rows.rows[0].platform, 'facebook');
    });

    it('second sync with same data inserts no duplicates (ON CONFLICT DO NOTHING)', async () => {
        delete require.cache[require.resolve('../../lib/fb-comments')];
        const { syncComments } = require('../../lib/fb-comments');
        const result = await syncComments();
        assert.strictEqual(result.synced, 0);

        const { query } = getTestDb();
        const rows = await query("SELECT COUNT(*) FROM comments WHERE platform = 'facebook'");
        assert.strictEqual(parseInt(rows.rows[0].count, 10), 2);
    });
});

// ── Pure function / module structure tests (no DB needed) ────────────────────

describe('syncComments — module structure', () => {
    it('exports syncComments function', () => {
        const mod = require('../../lib/fb-comments');
        assert.strictEqual(typeof mod.syncComments, 'function');
    });
});
