const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');

describe('Post write operations', () => {
    const testId = 'TEST-POST-' + Date.now();

    before(async () => {
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
        const { runMigrations } = require('../../lib/migrate');
        await runMigrations();
    });

    it('POST-02: INSERT creates a post', async () => {
        await query(
            `INSERT INTO posts (id, content, type, platform, scheduled_date, hook, status, is_draft, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,'draft',true,NOW())`,
            [testId, 'Test content', 'objection-buster', 'facebook', '2026-05-01', 'Hook']
        );
        const { rows } = await query('SELECT * FROM posts WHERE id=$1', [testId]);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].content, 'Test content');
    });

    it('POST-03: UPDATE modifies post', async () => {
        await query(`UPDATE posts SET content=$1, status=$2 WHERE id=$3`, ['Updated', 'scheduled', testId]);
        const { rows } = await query('SELECT * FROM posts WHERE id=$1', [testId]);
        assert.strictEqual(rows[0].content, 'Updated');
        assert.strictEqual(rows[0].status, 'scheduled');
    });

    it('POST-05: UPDATE scheduled_date', async () => {
        await query('UPDATE posts SET scheduled_date=$1 WHERE id=$2', ['2026-06-15', testId]);
        const { rows } = await query('SELECT scheduled_date FROM posts WHERE id=$1', [testId]);
        const dateStr = rows[0].scheduled_date instanceof Date
            ? rows[0].scheduled_date.toISOString().split('T')[0]
            : String(rows[0].scheduled_date);
        assert.strictEqual(dateStr, '2026-06-15');
    });

    after(async () => {
        await query('DELETE FROM posts WHERE id=$1', [testId]);
    });
});
