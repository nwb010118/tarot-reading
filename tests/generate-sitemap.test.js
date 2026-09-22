const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateSitemap } = require('../scripts/generate-sitemap.js');

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
assert.ok(sitemap.includes('<lastmod>2026-09-22</lastmod>'));

// 이 시점(가이드 파이프라인 구축 전)에는 84개(홈/about/contact/faq/legal/tarot허브/78카드)여야 한다.
assert.strictEqual((sitemap.match(/<url>/g) || []).length, 84, 'sitemap must contain exactly 84 <url> entries before guides exist');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-sitemap.test.js: all assertions passed');
