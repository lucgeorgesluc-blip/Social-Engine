import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Loads site config files fresh from disk (D-03: no caching).
 * Reads relative to SITE_BASE_PATH env var (D-05).
 *
 * Returns:
 *   seoConfig — parsed .seo-engine/config.yaml (full)
 *   pricingSection — string extracted from assets/js/config.js pricing block
 *   contentMapTrimmed — array of { slug, title } from content-map.yaml (D-04)
 */
export function loadSiteConfig() {
  const basePath = process.env.SITE_BASE_PATH;
  if (!basePath) throw new Error('SITE_BASE_PATH env var is required');

  // 1. .seo-engine/config.yaml — full
  const seoConfig = yaml.load(
    readFileSync(join(basePath, '.seo-engine', 'config.yaml'), 'utf8')
  );

  // 2. assets/js/config.js — pricing section only
  const configJsRaw = readFileSync(join(basePath, 'assets', 'js', 'config.js'), 'utf8');
  const pricingMatch = configJsRaw.match(/pricing:\s*\{[\s\S]*?\n {4}\}/);
  const pricingSection = pricingMatch ? pricingMatch[0] : configJsRaw.slice(0, 2000);

  // 3. content-map.yaml — slug+title pairs ONLY (D-04: trim 53KB to ~2K tokens)
  const contentMapRaw = yaml.load(
    readFileSync(join(basePath, '.seo-engine', 'data', 'content-map.yaml'), 'utf8')
  );
  if (!contentMapRaw?.blogs) throw new Error('content-map.yaml missing blogs key');
  const contentMapTrimmed = contentMapRaw.blogs.map(b => ({
    slug: b.slug,
    title: b.title
  }));

  return { seoConfig, pricingSection, contentMapTrimmed };
}
