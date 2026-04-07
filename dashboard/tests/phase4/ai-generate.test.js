const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { POST_TYPES, buildPrompt } = require('../../lib/prompts');

describe('Prompt Templates', () => {
    it('buildPrompt returns system and user for each POST_TYPE', () => {
        POST_TYPES.forEach(pt => {
            const result = buildPrompt(pt.id, 'test context');
            assert.ok(result.system && result.system.length > 10, `${pt.id}: system missing`);
            assert.ok(result.user && result.user.length > 10, `${pt.id}: user missing`);
            assert.ok(!result.system.includes('rTMS'), `${pt.id}: system contains rTMS`);
            assert.ok(!result.user.includes('rTMS'), `${pt.id}: user contains rTMS`);
        });
    });

    it('buildPrompt with context replaces {{context}} placeholder', () => {
        const result = buildPrompt('objection-buster', 'ca ne marche pas');
        assert.ok(result.user.includes('ca ne marche pas'), 'context not injected');
        assert.ok(!result.user.includes('{{context}}'), '{{context}} placeholder not replaced');
    });

    it('buildPrompt throws for unknown type', () => {
        assert.throws(() => buildPrompt('unknown'), /Type de post inconnu/);
    });

    it('POST_TYPES has exactly 6 entries', () => {
        assert.strictEqual(POST_TYPES.length, 6);
    });

    it('POST_TYPES contains required ids', () => {
        const ids = POST_TYPES.map(p => p.id);
        for (const id of ['objection-buster', 'temoignage', 'myth-buster', 'timeline', 'tip', 'motivation']) {
            assert.ok(ids.includes(id), `Missing POST_TYPE: ${id}`);
        }
    });
});

describe('Cost Guardrails', () => {
    before(async () => {
        const { query } = require('../../lib/db');
        await query(fs.readFileSync(path.join(__dirname, '../../lib/schema.sql'), 'utf8'));
        await query(fs.readFileSync(path.join(__dirname, '../../lib/ai-schema.sql'), 'utf8'));
    });

    it('getMonthlyUsage returns count, limit, and warning fields', async () => {
        const { getMonthlyUsage } = require('../../lib/ai');
        const result = await getMonthlyUsage();
        assert.strictEqual(typeof result.count, 'number');
        assert.strictEqual(result.limit, 100);
        assert.strictEqual(result.warning, 50);
    });
});
