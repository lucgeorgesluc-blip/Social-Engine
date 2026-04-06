// Tests for INFRA-01 (DB layer) and INFRA-02 (schema)
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { runSchema } = require('./helpers');

describe('DB layer', () => {
    before(async () => {
        await runSchema();
    });

    it('query function works — SELECT 1 returns 1', async () => {
        const { query } = require('../lib/db');
        const result = await query('SELECT 1 AS val');
        assert.strictEqual(Number(result.rows[0].val), 1);
    });

    it('schema creates all 5 tables', async () => {
        const { query } = require('../lib/db');
        const result = await query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );
        const tableNames = result.rows.map(r => r.tablename);
        assert.ok(tableNames.includes('posts'), 'posts table missing');
        assert.ok(tableNames.includes('comments'), 'comments table missing');
        assert.ok(tableNames.includes('prospects'), 'prospects table missing');
        assert.ok(tableNames.includes('metrics_weekly'), 'metrics_weekly table missing');
        assert.ok(tableNames.includes('user_sessions'), 'user_sessions table missing');
    });
});
