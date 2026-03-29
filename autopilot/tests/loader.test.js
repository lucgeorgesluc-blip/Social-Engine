import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteConfig } from '../config/loader.js';

describe('loadSiteConfig', () => {
  before(() => {
    // Point to repo root (parent of autopilot/)
    process.env.SITE_BASE_PATH = process.cwd().replace(/[\\/]autopilot$/, '');
  });

  it('returns seoConfig with project.name', () => {
    const cfg = loadSiteConfig();
    assert.ok(cfg.seoConfig.project?.name, 'seoConfig.project.name should exist');
    assert.equal(cfg.seoConfig.project.name, 'magnetiseuse-lacoste-corinne.fr');
  });

  it('returns pricingSection as non-empty string containing pricing:', () => {
    const cfg = loadSiteConfig();
    assert.equal(typeof cfg.pricingSection, 'string');
    assert.ok(cfg.pricingSection.includes('pricing:'), 'should contain pricing: key');
    assert.ok(cfg.pricingSection.length > 50, 'pricing section should be substantial');
  });

  it('returns contentMapTrimmed as array of {slug, title} objects', () => {
    const cfg = loadSiteConfig();
    assert.ok(Array.isArray(cfg.contentMapTrimmed), 'should be an array');
    assert.ok(cfg.contentMapTrimmed.length > 0, 'should have at least one entry');
    const first = cfg.contentMapTrimmed[0];
    assert.ok(first.slug, 'first entry should have slug');
    assert.ok(first.title, 'first entry should have title');
    // D-04: should NOT have extra fields like status, keywords, etc.
    assert.equal(Object.keys(first).length, 2, 'trimmed entries should only have slug and title');
  });

  it('throws when SITE_BASE_PATH is unset', () => {
    const saved = process.env.SITE_BASE_PATH;
    delete process.env.SITE_BASE_PATH;
    assert.throws(() => loadSiteConfig(), /SITE_BASE_PATH/);
    process.env.SITE_BASE_PATH = saved;
  });
});
