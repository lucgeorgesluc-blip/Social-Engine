const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');

describe('Objection Frequency Tracker', () => {
    const postId = 'TEST-OBJ-POST-' + Date.now();
    const commentIds = [];

    before(async () => {
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
        // Insert a test post for FK references
        await query(
            `INSERT INTO posts (id, content, platform, status, created_at) VALUES ($1,'test','facebook','published',NOW()) ON CONFLICT DO NOTHING`,
            [postId]
        );
    });

    it('getFrequentObjections returns array (may be empty)', async () => {
        const { getFrequentObjections } = require('../../lib/ai');
        const result = await getFrequentObjections();
        assert.ok(Array.isArray(result));
        result.forEach(r => {
            assert.ok(r.frequency >= 3, `frequency ${r.frequency} should be >= 3`);
        });
    });

    it('getFrequentObjections returns objections with frequency >= 3', async () => {
        // Insert 4 comments with same objection_type
        for (let i = 0; i < 4; i++) {
            const cid = 'TEST-OBJ-CMT-' + Date.now() + '-' + i;
            commentIds.push(cid);
            await query(
                `INSERT INTO comments (id, post_id, platform, author_name, classification, objection_type, comment_text, created_at)
                 VALUES ($1,$2,'facebook','User','objection','prix trop eleve','text',NOW())`,
                [cid, postId]
            );
        }

        const { getFrequentObjections } = require('../../lib/ai');
        const result = await getFrequentObjections();
        const found = result.find(r => r.objection_type === 'prix trop eleve');
        assert.ok(found, 'Expected objection type not found in results');
        assert.ok(found.frequency >= 3, `frequency ${found.frequency} should be >= 3`);
    });

    after(async () => {
        for (const cid of commentIds) {
            await query('DELETE FROM comments WHERE id=$1', [cid]);
        }
        await query('DELETE FROM posts WHERE id=$1', [postId]);
    });
});
