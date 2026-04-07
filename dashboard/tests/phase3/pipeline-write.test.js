const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { query } = require('../../lib/db');

describe('Prospect stage machine (DM-02)', () => {
    const postId = 'TEST-PPOST-' + Date.now();
    const prospectId = 'TEST-PROS-' + Date.now();
    const STAGES = ['new', 'msg1_sent', 'msg2_sent', 'msg3_sent', 'booked', 'converted', 'lost'];

    before(async () => {
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
        await query(
            `INSERT INTO posts (id, content, platform, status, created_at) VALUES ($1,'t','facebook','published',NOW()) ON CONFLICT DO NOTHING`,
            [postId]
        );
        await query(
            `INSERT INTO prospects (id, source_post_id, platform, prospect_name, stage, date_first_contact, created_at)
             VALUES ($1,$2,'facebook','Test','new',CURRENT_DATE,NOW()) ON CONFLICT DO NOTHING`,
            [prospectId, postId]
        );
    });

    it('advances new -> msg1_sent', async () => {
        await query('UPDATE prospects SET stage=$1 WHERE id=$2', ['msg1_sent', prospectId]);
        const { rows } = await query('SELECT stage FROM prospects WHERE id=$1', [prospectId]);
        assert.strictEqual(rows[0].stage, 'msg1_sent');
    });

    it('walks through to converted', async () => {
        for (let i = 1; i < STAGES.length - 1; i++) {
            await query('UPDATE prospects SET stage=$1 WHERE id=$2', [STAGES[i], prospectId]);
        }
        const { rows } = await query('SELECT stage FROM prospects WHERE id=$1', [prospectId]);
        assert.strictEqual(rows[0].stage, 'converted');
    });

    it('marks as lost with reason', async () => {
        await query('UPDATE prospects SET stage=$1, lost_reason=$2 WHERE id=$3', ['lost', 'Pas intéressé', prospectId]);
        const { rows } = await query('SELECT stage, lost_reason FROM prospects WHERE id=$1', [prospectId]);
        assert.strictEqual(rows[0].stage, 'lost');
        assert.strictEqual(rows[0].lost_reason, 'Pas intéressé');
    });

    after(async () => {
        await query('DELETE FROM prospects WHERE id=$1', [prospectId]);
        await query('DELETE FROM posts WHERE id=$1', [postId]);
    });
});

describe('DM templates (DM-03)', () => {
    it('returns templates for msg1/2/3', () => {
        const { getDmTemplates } = require('../../lib/dm-templates');
        const t = getDmTemplates();
        assert.ok(t.msg1_sent && t.msg2_sent && t.msg3_sent);
        assert.ok(t.msg1_sent.text.length > 10);
    });
});
