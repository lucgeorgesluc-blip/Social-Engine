// Tests for fb-token.js — token health (pure function) + DB CRUD
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { checkTokenHealth } = require('../../lib/fb-token');

// ─── Pure function tests (no DB needed) ─────────────────────────────────────

describe('checkTokenHealth — missing token', () => {
    it('returns missing/red when called with null', () => {
        const result = checkTokenHealth(null);
        assert.strictEqual(result.status, 'missing');
        assert.strictEqual(result.color, 'red');
        assert.ok(result.message.includes('Aucun token Facebook'));
    });
});

describe('checkTokenHealth — expired token', () => {
    it('returns expired/red when is_valid is false', () => {
        const result = checkTokenHealth({ is_valid: false });
        assert.strictEqual(result.status, 'expired');
        assert.strictEqual(result.color, 'red');
        assert.ok(result.message.includes('Token Facebook expiré'));
    });
});

describe('checkTokenHealth — expiring soon', () => {
    it('returns expiring/amber when token expires within 7 days', () => {
        const soonMs = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now
        const result = checkTokenHealth({
            is_valid: true,
            expires_at: Math.floor(soonMs / 1000) // Unix timestamp
        });
        assert.strictEqual(result.status, 'expiring');
        assert.strictEqual(result.color, 'amber');
        assert.ok(result.message.includes('Token expire dans'));
        assert.ok(typeof result.daysLeft === 'number');
        assert.ok(result.daysLeft <= 7);
    });
});

describe('checkTokenHealth — valid token', () => {
    it('returns valid/green when token expires in > 7 days', () => {
        const futureMs = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const result = checkTokenHealth({
            is_valid: true,
            expires_at: Math.floor(futureMs / 1000)
        });
        assert.strictEqual(result.status, 'valid');
        assert.strictEqual(result.color, 'green');
        assert.strictEqual(result.message, 'Token Facebook valide');
    });

    it('returns valid/green when token has no expires_at (never expires)', () => {
        const result = checkTokenHealth({ is_valid: true });
        assert.strictEqual(result.status, 'valid');
        assert.strictEqual(result.color, 'green');
    });
});
