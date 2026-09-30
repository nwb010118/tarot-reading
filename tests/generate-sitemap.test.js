const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateSitemap } = require('../scripts/generate-sitemap.js');
const { GUIDES } = require('../data/guides-data.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
const sitemapPath = path.join(tmpDir, 'sitemap.xml');

generateSitemap({ sitemapPath: sitemapPath, today: '2026-09-22' });

const sitemap = fs.readFileSync(sitemapPath, 'utf8');

assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(sitemap.includes('<loc>https://nwb010118.github.io/tarot-reading/</loc>'), 'home url must exist');
assert.ok(sitemap.includes('tarot-reading/about.html'));
assert.ok(sitemap.includes('tarot-reading/contact.html'));
assert.ok(sitemap.includes('tarot-reading/faq.html'));
assert.ok(sitemap.includes('tarot-reading/legal.html'));
assert.ok(sitemap.includes('tarot-reading/tarot/index.html'), 'tarot hub url must exist');
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'), 'sample tarot card url must exist');
assert.ok(sitemap.includes('tarot-reading/guides/index.html'), 'guides index url must exist');
assert.ok(sitemap.includes('tarot-reading/guides/what-is-tarot.html'), 'sample guide url must exist');
assert.ok(sitemap.includes('<lastmod>2026-09-22</lastmod>'));

// 84(홈/about/contact/faq/legal/tarot허브/78카드) + 가이드 인덱스 1 + 가이드 전체 편수.
const EXPECTED_URLS = 84 + 1 + GUIDES.length;
assert.strictEqual((sitemap.match(/<url>/g) || []).length, EXPECTED_URLS, 'sitemap must contain exactly ' + EXPECTED_URLS + ' <url> entries');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(function (match) { return match[1]; });
assert.strictEqual(urls.length, EXPECTED_URLS, 'every sitemap entry must have a URL');
assert.strictEqual(new Set(urls).size, urls.length, 'all sitemap URLs must be unique');
assert.ok(urls.includes('https://nwb010118.github.io/tarot-reading/guides/what-is-zodiac.html'), 'zodiac guide URL must exist');

assert.ok(urls.includes('https://nwb010118.github.io/tarot-reading/guides/zodiac-animals.html'));

for (const slug of ['what-is-saju', 'heavenly-stems-earthly-branches', 'lunar-solar-birth-time']) {
  assert.ok(urls.includes('https://nwb010118.github.io/tarot-reading/guides/' + slug + '.html'));
}

assert.ok(urls.includes('https://nwb010118.github.io/tarot-reading/guides/compatibility-guide.html'), 'compatibility guide URL must exist');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-sitemap.test.js: all assertions passed');
