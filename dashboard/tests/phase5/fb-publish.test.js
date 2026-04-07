// Tests for fb-publish.js — auto-publish service with mocked Graph API
// DB tests are skipped when DATABASE_URL is not available (run in CI only)
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dbAvailable = !!process.env.DATABASE_URL;

// ── Feature flag tests (requires DB) ─────────────────────────────────────────

describe('isAutoPublishEnabled', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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
        await query('DELETE FROM fb_sync_state');
    });

    it('returns false when no auto_publish_enabled key in fb_sync_state', async () => {
        delete require.cache[require.resolve('../../lib/fb-publish')];
        const { isAutoPublishEnabled } = require('../../lib/fb-publish');
        const result = await isAutoPublishEnabled();
        assert.strictEqual(result, false);
    });

    it('returns true after setting flag to "true"', async () => {
        const { query } = getTestDb();
        await query(
            `INSERT INTO fb_sync_state (key, value) VALUES ('auto_publish_enabled', 'true')
             ON CONFLICT (key) DO UPDATE SET value = 'true'`
        );
        delete require.cache[require.resolve('../../lib/fb-publish')];
        const { isAutoPublishEnabled } = require('../../lib/fb-publish');
        const result = await isAutoPublishEnabled();
        assert.strictEqual(result, true);
    });
});

// ── publishScheduledPosts — disabled flag (requires DB) ──────────────────────

describe('publishScheduledPosts — disabled', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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
        await query('DELETE FROM fb_sync_state');
        // Ensure flag is false (not set)
    });

    it('returns {published: 0, reason: "disabled"} when flag is off', async () => {
        delete require.cache[require.resolve('../../lib/fb-publish')];
        const { publishScheduledPosts } = require('../../lib/fb-publish');
        const result = await publishScheduledPosts();
        assert.strictEqual(result.published, 0);
        assert.strictEqual(result.reason, 'disabled');
    });
});

// ── publishScheduledPosts — no token (requires DB) ───────────────────────────

describe('publishScheduledPosts — no token', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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
        await query(
            `INSERT INTO fb_sync_state (key, value) VALUES ('auto_publish_enabled', 'true')
             ON CONFLICT (key) DO UPDATE SET value = 'true'`
        );
    });

    it('returns {published: 0, error: "no_token"} when flag enabled but no token', async () => {
        delete require.cache[require.resolve('../../lib/fb-publish')];
        const { publishScheduledPosts } = require('../../lib/fb-publish');
        const result = await publishScheduledPosts();
        assert.strictEqual(result.published, 0);
        assert.strictEqual(result.error, 'no_token');
    });
});

// ── publishSinglePost — mocked success (requires DB) ─────────────────────────

describe('publishSinglePost — mocked success', { skip: !dbAvailable ? 'No DATABASE_URL — skipping DB tests' : false }, () => {
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

        await query(
            `INSERT INTO fb_tokens (token_type, access_token, page_id)
             VALUES ('page_access', 'mock-publish-token', 'mock-page-123')`
        );

        await query(
            `INSERT INTO posts (id, status, platform, content, created_date)
             VALUES ('test-publish-post-1', 'scheduled', 'facebook', 'Mon super post Facebook!', NOW())
             ON CONFLICT (id) DO NOTHING`
        );

        global.fetch = async () => ({
            ok: true,
            json: async () => ({ id: 'fb_post_abc123' })
        });
    });

    after(() => { global.fetch = originalFetch; });

    it('publishes post, updates status to published, stores fb_post_id in metrics', async () => {
        delete require.cache[require.resolve('../../lib/fb-publish')];
        const { publishSinglePost } = require('../../lib/fb-publish');
        const result = await publishSinglePost('test-publish-post-1');

        assert.strictEqual(result.fbPostId, 'fb_post_abc123');

        const { query } = getTestDb();
        const rows = await query("SELECT status, metrics FROM posts WHERE id = 'test-publish-post-1'");
        assert.strictEqual(rows.rows[0].status, 'published');
        assert.strictEqual(rows.rows[0].metrics.fb_post_id, 'fb_post_abc123');
    });
});

// ── Module structure tests (no DB needed) ────────────────────────────────────

describe('fb-publish — module structure', () => {
    it('exports isAutoPublishEnabled, publishSinglePost, publishScheduledPosts', () => {
        const mod = require('../../lib/fb-publish');
        assert.strictEqual(typeof mod.isAutoPublishEnabled, 'function');
        assert.strictEqual(typeof mod.publishSinglePost, 'function');
        assert.strictEqual(typeof mod.publishScheduledPosts, 'function');
    });
});
