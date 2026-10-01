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

const sajuGuides = GUIDES.filter(g => g.category === 'saju');
assert.ok(indexHtml.includes('<h2>사주</h2>'));
for (const guide of sajuGuides) {
  const page = fs.readFileSync(path.join(guidesDir, guide.slug + '.html'), 'utf8');
  assert.ok(page.includes('<h1>' + guide.title + '</h1>'));
  assert.ok(page.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/' + guide.slug + '.html">'));
  assert.ok(indexHtml.includes('href="' + guide.slug + '.html"'));
  assert.ok(page.includes('<a href="../index.html">가만점방 홈에서 직접 해보기 ↗</a>'));
  for (const sibling of sajuGuides.filter(g => g.slug !== guide.slug)) {
    assert.ok(page.includes('href="' + sibling.slug + '.html"'), guide.slug + ' links to ' + sibling.slug);
  }
}

const compatGuide = GUIDES.find(g => g.slug === 'compatibility-guide');
assert.ok(indexHtml.includes('<h2>궁합</h2>'));
assert.ok(indexHtml.includes('href="compatibility-guide.html">' + compatGuide.title + '</a>'));
const compatHtml = fs.readFileSync(path.join(guidesDir, 'compatibility-guide.html'), 'utf8');
assert.ok(compatHtml.includes('<h1>' + compatGuide.title + '</h1>'));
assert.ok(compatHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/compatibility-guide.html">'));
assert.ok(compatHtml.includes('<a href="../index.html">가만점방 홈에서 직접 해보기 ↗</a>'));

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-guides-pages.test.js: all assertions passed');
