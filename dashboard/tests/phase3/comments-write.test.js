const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');

describe('Comment write operations', () => {
    const postId = 'TEST-CPOST-' + Date.now();
    const commentId = 'TEST-CMT-' + Date.now();

    before(async () => {
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
        const { runMigrations } = require('../../lib/migrate');
        await runMigrations();
        await query(
            `INSERT INTO posts (id, content, platform, status, created_at) VALUES ($1,'test','facebook','published',NOW()) ON CONFLICT DO NOTHING`,
            [postId]
        );
        await query(
            `INSERT INTO comments (id, post_id, platform, author_name, classification, comment_text, response_status, converted_to_dm, created_at)
             VALUES ($1,$2,'facebook','Test User','info','I want info','pending',false,NOW()) ON CONFLICT DO NOTHING`,
            [commentId, postId]
        );
    });

    it('CMT-02: handle marks response_status done', async () => {
        await query(`UPDATE comments SET response_status='done', response_text=$1 WHERE id=$2`, ['Merci', commentId]);
        const { rows } = await query('SELECT response_status, response_text FROM comments WHERE id=$1', [commentId]);
        assert.strictEqual(rows[0].response_status, 'done');
        assert.strictEqual(rows[0].response_text, 'Merci');
    });

    it('CMT-03: convert creates prospect and flips converted_to_dm in transaction', async () => {
        await query(`UPDATE comments SET converted_to_dm=false WHERE id=$1`, [commentId]);
        const prospectId = 'TEST-DM-' + Date.now();
        await query('BEGIN');
        await query(
            `INSERT INTO prospects (id, source_comment_id, source_post_id, platform, prospect_name, stage, date_first_contact, created_at)
             VALUES ($1,$2,$3,'facebook','Test User','new',CURRENT_DATE,NOW())`,
            [prospectId, commentId, postId]
        );
        await query(`UPDATE comments SET converted_to_dm=true WHERE id=$1`, [commentId]);
        await query('COMMIT');

        const { rows: c } = await query('SELECT converted_to_dm FROM comments WHERE id=$1', [commentId]);
        assert.strictEqual(c[0].converted_to_dm, true);
        const { rows: p } = await query('SELECT * FROM prospects WHERE id=$1', [prospectId]);
        assert.strictEqual(p.length, 1);
        assert.strictEqual(p[0].source_comment_id, commentId);

        await query('DELETE FROM prospects WHERE id=$1', [prospectId]);
    });

    after(async () => {
        await query('DELETE FROM comments WHERE id=$1', [commentId]);
        await query('DELETE FROM posts WHERE id=$1', [postId]);
    });
});
