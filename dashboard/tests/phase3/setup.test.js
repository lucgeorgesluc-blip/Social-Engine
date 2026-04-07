const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');
const { runMigrations } = require('../../lib/migrate');

describe('Phase 3 setup', () => {
    before(async () => {
        const schema = fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8');
        await query(schema);
        await runMigrations();
    });

    it('posts table has scheduled_date column', async () => {
        const { rows } = await query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'posts' AND column_name = 'scheduled_date'
        `);
        assert.strictEqual(rows.length, 1);
    });

    it('migration is idempotent', async () => {
        await runMigrations();
        const { rows } = await query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'posts' AND column_name = 'scheduled_date'
        `);
        assert.strictEqual(rows.length, 1);
    });
});
