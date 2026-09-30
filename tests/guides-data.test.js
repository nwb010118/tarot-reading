const assert = require('assert');
const { GUIDES } = require('../data/guides-data.js');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');
const { splitSentences, wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const WORD_TH = 0.3;
const OPEN_WORD_TH = 0.20;
const OPEN_TRI_TH = 0.15;

function bodyToText(guide) {
  return guide.bodyHtml.join(' ').replace(/<[^>]+>/g, ' ');
}

const zodiacGuide = GUIDES.find(function (g) { return g.slug === 'what-is-zodiac'; });
assert.ok(zodiacGuide, 'what-is-zodiac guide must exist');
assert.strictEqual(zodiacGuide.category, 'zodiac');
assert.strictEqual(zodiacGuide.title, '12별자리 기본 가이드');
const zodiacTextLength = bodyToText(zodiacGuide).replace(/\s/g, '').length;
assert.ok(zodiacTextLength >= 2200 && zodiacTextLength <= 8000,
  'zodiac body must contain 2200–8000 characters excluding tags and whitespace, got ' + zodiacTextLength);

const zodiacBody = zodiacGuide.bodyHtml.join('\n');
const tables = zodiacBody.match(/<table\b[^>]*>[\s\S]*?<\/table>/g) || [];
assert.strictEqual(ZODIAC_DATA.length, 12);
assert.ok(tables.some(function (table) {
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(function (row) {
    return [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map(function (cell) {
      return cell[1].replace(/<[^>]+>/g, '').replace(/\s/g, '');
    });
  });
  return ZODIAC_DATA.every(function (sign) {
    return rows.filter(function (cells) {
      return cells.includes(sign.name_kr) && cells.includes(sign.dateRange.replace(/\s/g, ''));
    }).length === 1;
  });
}), 'date table must pair all 12 zodiac names with their data dateRange labels exactly once');

const ddiGuide = GUIDES.find(g => g.slug === 'zodiac-animals');
assert.ok(ddiGuide);
assert.strictEqual(ddiGuide.category, 'ddi');
const ddiLength = bodyToText(ddiGuide).replace(/\s/g, '').length;
assert.ok(ddiLength >= 2200 && ddiLength <= 8000, 'ddi guide body length: ' + ddiLength);
const { getDdiByYear } = require('../data/ddi-data.js');
const ddiRows = [...ddiGuide.bodyHtml.join('').matchAll(/<tr><th scope="row">([^<]+)<\/th><td>[^<]+<\/td><td>([^<]+)<\/td><\/tr>/g)];
assert.strictEqual(ddiRows.length, 12);
assert.strictEqual(new Set(ddiRows.map(r => r[1])).size, 12);
for (const row of ddiRows) {
  const years = row[2].split(' · ').map(Number);
  assert.strictEqual(years.length, 3);
  for (const year of years) assert.strictEqual(getDdiByYear(year).name_kr, row[1]);
}

const sajuGuides = GUIDES.filter(g => g.category === 'saju');
assert.deepStrictEqual(sajuGuides.map(g => g.slug), ['what-is-saju', 'heavenly-stems-earthly-branches', 'lunar-solar-birth-time']);
assert.deepStrictEqual(sajuGuides.map(g => g.order), [1, 2, 3]);
for (const guide of sajuGuides) {
  const length = bodyToText(guide).replace(/\s/g, '').length;
  assert.ok(length >= 2200 && length <= 8000, guide.slug + ' body length: ' + length);
}

const compatGuide = GUIDES.find(function (g) { return g.slug === 'compatibility-guide'; });
assert.ok(compatGuide, 'compatibility-guide must exist');
assert.strictEqual(compatGuide.category, 'compatibility');
assert.strictEqual(compatGuide.order, 1);
const compatLength = bodyToText(compatGuide).replace(/\s/g, '').length;
assert.ok(compatLength >= 2200 && compatLength <= 8000, 'compatibility guide body length: ' + compatLength);
const compatBody = compatGuide.bodyHtml.join(' ');
assert.ok(compatBody.includes('별자리 궁합'), 'must mention 별자리 궁합 (matches index.html compat-subtype-select)');
assert.ok(compatBody.includes('띠 궁합'), 'must mention 띠 궁합 (matches index.html compat-subtype-select)');
assert.ok(compatBody.includes('사주 궁합'), 'must mention 사주 궁합 (matches index.html compat-subtype-select)');

const docs = GUIDES.map(function (g) {
  return { slug: g.slug, sentences: splitSentences(bodyToText(g)).filter(function (s) { return s.trim().length > 8; }) };
});

const issues = [];
for (let i = 0; i < docs.length; i++) {
  for (let j = i + 1; j < docs.length; j++) {
    for (const s1 of docs[i].sentences) {
      for (const s2 of docs[j].sentences) {
        const wj = wordJaccard(s1, s2);
        const tj = trigramJaccard(s1, s2);
        const flagged = wj >= WORD_TH || (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH);
        if (flagged) {
          issues.push(docs[i].slug + ' <-> ' + docs[j].slug + '\n  A: ' + s1 + '\n  B: ' + s2 + '\n  word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
        }
      }
    }
  }
}

assert.strictEqual(issues.length, 0, '가이드 사이에 유사도 높은 문장이 있습니다:\n' + issues.join('\n\n'));

console.log('guides-data.test.js: all assertions passed (' + GUIDES.length + ' guides, ' + docs.reduce(function (n, d) { return n + d.sentences.length; }, 0) + ' sentences compared pairwise)');
