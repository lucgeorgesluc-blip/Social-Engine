import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('gemini-model.txt', () => {
  it('exists and contains a model name', () => {
    const content = readFileSync(join(__dirname, '..', 'config', 'gemini-model.txt'), 'utf8').trim();
    assert.ok(content.length > 5, 'Model name should be more than 5 chars');
    assert.ok(
      content.includes('imagen') || content.includes('gemini') || content.includes('image'),
      `Model name should contain imagen, gemini, or image — got: ${content}`
    );
  });

  it('is exactly one line', () => {
    const content = readFileSync(join(__dirname, '..', 'config', 'gemini-model.txt'), 'utf8');
    const lines = content.trim().split('\n');
    assert.equal(lines.length, 1, `Expected 1 line, got ${lines.length}`);
  });
});
