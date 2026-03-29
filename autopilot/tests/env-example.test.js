import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('.env.example', () => {
  const content = readFileSync(join(__dirname, '..', '.env.example'), 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const keys = lines.map(l => l.split('=')[0].trim());

  const requiredKeys = [
    'PORT', 'NODE_ENV', 'SITE_BASE_PATH',
    'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
    'SFTP_HOST', 'SFTP_PORT', 'SFTP_USER', 'SFTP_PASSWORD',
    'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD',
    'GSC_SERVICE_ACCOUNT_PATH',
    'DASHBOARD_USERNAME', 'DASHBOARD_PASSWORD_HASH', 'SESSION_SECRET'
  ];

  for (const key of requiredKeys) {
    it(`contains ${key}`, () => {
      assert.ok(keys.includes(key), `Missing key: ${key}`);
    });
  }

  it('has no actual secret values (API keys are empty)', () => {
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      const k = key.trim();
      // Keys that have default non-secret values are OK
      if (['PORT', 'NODE_ENV', 'SITE_BASE_PATH', 'SFTP_HOST', 'SFTP_PORT', 'SFTP_USER', 'GSC_SERVICE_ACCOUNT_PATH'].includes(k)) continue;
      assert.equal(value, '', `${k} should have empty value but got: ${value}`);
    }
  });
});
