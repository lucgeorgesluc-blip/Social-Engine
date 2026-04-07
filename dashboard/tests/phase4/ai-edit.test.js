const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { POST_TYPES } = require('../../lib/prompts');

function renderAi(overrides) {
    const template = fs.readFileSync(path.join(__dirname, '../../views/ai.ejs'), 'utf8');
    const defaults = {
        postTypes: POST_TYPES,
        usage: { count: 5, limit: 100, warning: 50 },
        suggestions: [],
        generated: null,
        error: null,
        selectedType: 'tip',
        context: ''
    };
    return ejs.render(template, Object.assign({}, defaults, overrides), { rmWhitespace: false });
}

describe('AI Edit Flow', () => {
    it('ai.ejs renders with Generer and textarea', () => {
        const html = renderAi({ generated: 'Test post content' });
        assert.ok(html.includes('Générer'), 'Missing Generer button');
        assert.ok(html.includes('Sauvegarder comme brouillon'), 'Missing save button');
        assert.ok(html.includes('textarea'), 'Missing textarea');
    });

    it('ai.ejs shows warning when usage >= 50', () => {
        const html = renderAi({ usage: { count: 55, limit: 100, warning: 50 } });
        assert.ok(html.includes('approchez'), 'Missing warning message');
    });

    it('ai.ejs shows limit message and disabled when usage >= 100', () => {
        const html = renderAi({ usage: { count: 100, limit: 100, warning: 50 } });
        assert.ok(html.includes('Limite mensuelle'), 'Missing limit message');
        assert.ok(html.includes('disabled'), 'Button not disabled at limit');
    });

    it('ai.ejs shows suggestions when provided', () => {
        const html = renderAi({ suggestions: [{ objection_type: 'prix', frequency: 5 }] });
        assert.ok(html.includes('prix'), 'Missing objection type in suggestions');
        assert.ok(html.includes('vu 5 fois'), 'Missing frequency in suggestions');
    });

    it('ai.ejs has correct form actions', () => {
        const html = renderAi({ generated: 'Some text' });
        assert.ok(html.includes('/dashboard/ai/generate'), 'Missing generate form action');
        assert.ok(html.includes('action="/posts"'), 'Missing save-as-draft form action');
    });
});
