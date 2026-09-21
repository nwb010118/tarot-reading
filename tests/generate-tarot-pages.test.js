const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { generate } = require('../scripts/generate-tarot-pages.js');

const root = path.join(__dirname, '..');
generate();

const tarotDir = path.join(root, 'tarot');
const files = fs.readdirSync(tarotDir).filter(function (f) { return f.endsWith('.html'); });

// 78장 + index.html 허브
assert.strictEqual(files.length, 79, 'expected 78 card pages + 1 hub page, got ' + files.length);
assert.ok(files.includes('index.html'), 'hub page must exist');
assert.ok(files.includes('major-19-sun.html'), 'sample major card page must exist');
assert.ok(files.includes('wands-ace.html'), 'sample minor card page must exist');

// 표본 파일 내용 확인
const sunHtml = fs.readFileSync(path.join(tarotDir, 'major-19-sun.html'), 'utf8');
assert.ok(sunHtml.includes('태양'));
assert.ok(sunHtml.includes('../images/RWS_Tarot_19_Sun.jpg'));

const wandsAceHtml = fs.readFileSync(path.join(tarotDir, 'wands-ace.html'), 'utf8');
assert.ok(wandsAceHtml.includes('완드 에이스'));

// 순환 이전/다음 링크: 메이저 0번의 이전은 마지막 카드(pentacles-king)여야 함
const foolHtml = fs.readFileSync(path.join(tarotDir, 'major-0-fool.html'), 'utf8');
assert.ok(foolHtml.includes('pentacles-king.html'), 'first card (major-0) must link back to the last card as prev');

// sitemap.xml 갱신 확인
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'));
assert.ok(sitemap.includes('tarot-reading/tarot/index.html'));
assert.ok((sitemap.match(/<url>/g) || []).length >= 80, 'sitemap must contain at least 80 <url> entries (2 existing + 78 cards + hub, about.html added in a later task)');

console.log('generate-tarot-pages.test.js: all assertions passed');
