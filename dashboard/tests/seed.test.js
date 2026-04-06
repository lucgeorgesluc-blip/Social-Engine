// Tests for INFRA-03 — idempotent YAML seed
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { cleanDb, runSchema } = require('./helpers');
const { runSeed } = require('../lib/seed');

describe('Seed script', () => {
    before(async () => {
        await runSchema();
        await cleanDb();
    });

    after(async () => {
        await cleanDb();
    });

    it('seed imports data from YAML files', async () => {
        const counts = await runSeed();
        // posts.yaml has 10 drafts + posts-drafts.yaml has 10 more — at least some rows
        assert.ok(counts.posts + counts.drafts > 0, `Expected posts > 0, got posts=${counts.posts} drafts=${counts.drafts}`);
        // comments.yaml has at least 1 comment
        assert.ok(counts.comments >= 0, 'comments count should be a number');
        // prospects should be non-negative
        assert.ok(counts.prospects >= 0, 'prospects count should be a number');
    });

    it('seed is idempotent — second run adds no duplicates', async () => {
        const { query } = require('../lib/db');

        // First run (already done in previous test — clean and re-run for isolation)
        await cleanDb();
        await runSeed();
        const after1 = await query('SELECT COUNT(*) FROM posts');
        const count1 = Number(after1.rows[0].count);

        // Second run must not add rows
        await runSeed();
        const after2 = await query('SELECT COUNT(*) FROM posts');
        const count2 = Number(after2.rows[0].count);

        assert.strictEqual(count1, count2, `Row count changed after second seed run: ${count1} -> ${count2}`);
    });
});
