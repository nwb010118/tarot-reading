const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generate } = require('../scripts/generate-guides-pages.js');
const { GUIDES } = require('../data/guides-data.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guides-pages-test-'));
const guidesDir = path.join(tmpDir, 'guides');

generate({ guidesDir: guidesDir });

const files = fs.readdirSync(guidesDir).filter(function (f) { return f.endsWith('.html'); });

assert.strictEqual(files.length, GUIDES.length + 1, 'expected ' + GUIDES.length + ' guide pages + 1 index page, got ' + files.length);
assert.ok(files.includes('index.html'));
assert.ok(files.includes('what-is-tarot.html'));
assert.ok(files.includes('how-to-ask-tarot.html'));
assert.ok(files.includes('what-is-zodiac.html'));

const zodiacHtml = fs.readFileSync(path.join(guidesDir, 'what-is-zodiac.html'), 'utf8');
assert.ok(zodiacHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/what-is-zodiac.html">'));
assert.ok(zodiacHtml.includes('<h1>12별자리 기본 가이드</h1>'));

const html = fs.readFileSync(path.join(guidesDir, 'what-is-tarot.html'), 'utf8');
assert.ok(html.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/what-is-tarot.html">'));

const indexHtml = fs.readFileSync(path.join(guidesDir, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('<h2>별자리</h2>'));
assert.ok(indexHtml.includes('href="what-is-zodiac.html">12별자리 기본 가이드</a>'));
assert.ok(indexHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/index.html">'));

const ddiHtml = fs.readFileSync(path.join(guidesDir, 'zodiac-animals.html'), 'utf8');
assert.ok(ddiHtml.includes('<h1>12띠 기본 가이드</h1>'));
assert.ok(ddiHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/zodiac-animals.html">'));
assert.ok(indexHtml.includes('href="zodiac-animals.html">12띠 기본 가이드</a>'));
assert.ok(indexHtml.includes('<h2>띠운세</h2>'));

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-guides-pages.test.js: all assertions passed');
