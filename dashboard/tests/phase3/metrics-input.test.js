const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');

describe('Metrics write operations', () => {
    const testWeek = 'TEST-2026-W99';

    before(async () => {
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
    });

    it('STAT-01: upsert inserts new week', async () => {
        await query(
            `INSERT INTO metrics_weekly (week, posts_published, total_reach, total_likes, created_at)
             VALUES ($1, 5, 1200, 80, NOW())
             ON CONFLICT (week) DO UPDATE SET posts_published=EXCLUDED.posts_published, total_reach=EXCLUDED.total_reach, total_likes=EXCLUDED.total_likes`,
            [testWeek]
        );
        const { rows } = await query('SELECT * FROM metrics_weekly WHERE week=$1', [testWeek]);
        assert.strictEqual(rows[0].posts_published, 5);
    });

    it('STAT-01: upsert is idempotent (no duplicate row)', async () => {
        await query(
            `INSERT INTO metrics_weekly (week, posts_published, total_reach, total_likes, created_at)
             VALUES ($1, 7, 2000, 150, NOW())
             ON CONFLICT (week) DO UPDATE SET posts_published=EXCLUDED.posts_published, total_reach=EXCLUDED.total_reach, total_likes=EXCLUDED.total_likes`,
            [testWeek]
        );
        const { rows } = await query('SELECT * FROM metrics_weekly WHERE week=$1', [testWeek]);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].posts_published, 7);
    });

    it('STAT-04: COALESCE extracts JSONB metrics safely', async () => {
        const postId = 'TEST-MPOST-' + Date.now();
        await query(
            `INSERT INTO posts (id, content, platform, status, published_date, metrics, created_at)
             VALUES ($1, 't', 'facebook', 'published', '2026-04-01', '{"reach":500,"likes":30}', NOW())
             ON CONFLICT DO NOTHING`,
            [postId]
        );
        const { rows } = await query(
            "SELECT COALESCE((metrics->>'reach')::int, 0) AS reach FROM posts WHERE id=$1",
            [postId]
        );
        assert.strictEqual(rows[0].reach, 500);
        await query('DELETE FROM posts WHERE id=$1', [postId]);
    });

    after(async () => {
        await query('DELETE FROM metrics_weekly WHERE week=$1', [testWeek]);
    });
});
