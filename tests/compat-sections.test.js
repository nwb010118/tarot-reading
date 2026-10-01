// 궁합 섹션 문구(data/compat-sections.js) 검사: 구성 빠짐없음, 분량, 금지 표현(점수·순위 포함), 문장 유사도,
// 그리고 같은 화면에 함께 나오는 기존 유형 문장·성격·조언과의 반복.
const assert = require('assert');
const { COMPAT_SECTION_TEXT, COMPAT_FACTOR_TEXT, COMPAT_SECTION_EXTRA, COMPAT_KEYWORD_LINE } = require('../data/compat-sections.js');
const { COMPAT_TIER_DATA } = require('../data/compatibility-data.js');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');
const { DDI_DATA } = require('../data/ddi-data.js');
const { ILGAN_DATA } = require('../data/saju-data.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { splitSentences, wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const TIERS = Object.keys(COMPAT_TIER_DATA);
const FACTOR_KEYS = [
  'zodiac_gap_0', 'zodiac_gap_1', 'zodiac_gap_2', 'zodiac_gap_3', 'zodiac_gap_4', 'zodiac_gap_5', 'zodiac_gap_6',
  'ddi_wonjin', 'ddi_hae', 'ddi_none',
  'saju_branch_yukhap', 'saju_branch_samhap', 'saju_branch_chung', 'saju_branch_hae', 'saju_branch_none', 'saju_stem_he'
];
// 점수·순위를 말하는 표현은 쓰지 않는다
const RANK_WORDS = ['점수', '등급', '최고의 궁합', '최악', '%', '퍼센트'];

assert.deepStrictEqual(Object.keys(COMPAT_SECTION_TEXT).sort(), TIERS.slice().sort(), 'section text for every tier');
assert.deepStrictEqual(Object.keys(COMPAT_SECTION_EXTRA).sort(), TIERS.slice().sort(), 'extra text for every tier');
assert.deepStrictEqual(Object.keys(COMPAT_FACTOR_TEXT).sort(), FACTOR_KEYS.slice().sort(), 'factor text for every relation factor');
assert.strictEqual(COMPAT_KEYWORD_LINE.length, 2);
COMPAT_KEYWORD_LINE.forEach(function (t) { assert.ok(t.indexOf('{a}') !== -1 && t.indexOf('{b}') !== -1, 'keyword line placeholders'); });

const problems = [];
const entries = [];
function add(where, field, text, min, max, sentences) {
  if (typeof text !== 'string') { problems.push(where + ' missing'); return; }
  if (text.length < min || text.length > max) problems.push(where + ' length ' + text.length + ' (' + min + '~' + max + ')');
  const n = splitSentences(text).length;
  if (n < sentences[0] || n > sentences[1]) problems.push(where + ' sentences ' + n);
  entries.push({ where: where, field: field, text: text });
}

TIERS.forEach(function (tier) {
  const t = COMPAT_SECTION_TEXT[tier];
  const x = COMPAT_SECTION_EXTRA[tier];
  assert.strictEqual(t.summary.length, 3, tier + ' summary count');
  t.summary.forEach(function (s, i) { add(tier + '.summary.' + i, 'summary', s, 10, 45, [1, 1]); });
  ['overview', 'chemistry', 'conflict', 'resolve', 'keep'].forEach(function (f) {
    assert.strictEqual(t[f].length, 2, tier + '.' + f + ' count');
    t[f].forEach(function (s, i) { add(tier + '.' + f + '.' + i, f, s, 60, 200, [1, 3]); });
  });
  ['signal', 'trap', 'practice'].forEach(function (f) {
    assert.strictEqual(x[f].length, 2, tier + '.' + f + ' count');
    x[f].forEach(function (s, i) { add(tier + '.' + f + '.' + i, 'extra-' + f, s, 60, 200, [1, 3]); });
  });
});
FACTOR_KEYS.forEach(function (key) {
  add(key + '.overview', 'factor-overview', COMPAT_FACTOR_TEXT[key].overview, 40, 200, [1, 3]);
  add(key + '.conflict', 'factor-conflict', COMPAT_FACTOR_TEXT[key].conflict, 30, 160, [1, 2]);
});

entries.forEach(function (e) {
  findBannedPhrases(e.text).forEach(function (p) { problems.push(e.where + ' banned phrase: ' + p); });
  if (/(^|[^가-힣])순위/.test(e.text)) problems.push(e.where + ' mentions rank word: 순위');
  RANK_WORDS.forEach(function (w) { if (e.text.indexOf(w) !== -1) problems.push(e.where + ' mentions score/rank word: ' + w); });
  if (/[぀-ヿ]/.test(e.text)) problems.push(e.where + ' has Japanese kana');
  if (/[A-Za-z0-9]/.test(e.text)) problems.push(e.where + ' has latin letters or digits');
});

// 같은 칸(필드) 안의 전체 쌍 비교
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.field !== b.field) continue;
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    const tooSimilar = a.field === 'summary' ? (wj >= 0.5 || tj >= 0.4) : (wj >= 0.3 || (wj >= 0.2 && tj >= 0.2) || tj >= 0.35);
    if (tooSimilar) problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
  }
}

// 문장 단위(전체): 뼈대만 공유하는 문장 잡기
const sentences = [];
entries.forEach(function (e) { splitSentences(e.text).forEach(function (s) { sentences.push({ where: e.where, text: s }); }); });
for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < sentences.length; j++) {
    const a = sentences[i], b = sentences[j];
    if (a.where.split('.')[0] === b.where.split('.')[0] && a.where.split('.')[1] === b.where.split('.')[1]) continue;
    if (wordJaccard(a.text, b.text) >= 0.5 || trigramJaccard(a.text, b.text) >= 0.4) problems.push('similar sentence ' + a.where + ' ~ ' + b.where + ' | ' + a.text + ' | ' + b.text);
  }
}

// 같은 화면에 함께 나오는 기존 문장(유형 문장, 성격, 조언, 대인관계)과 비교
const existing = [];
TIERS.forEach(function (tier) {
  const d = COMPAT_TIER_DATA[tier];
  existing.push.apply(existing, [].concat(d.text.a, d.text.b, d.advice).map(function (s) { return { tier: tier, text: s.replace(/\{a\}와\(과\) \{b\}은\(는\) /, '') }; }));
});
const entityPool = [];
function pushEntity(e) {
  entityPool.push.apply(entityPool, [].concat(e.trait.a, e.trait.b, e.advice));
  const rel = e.categories.relationships;
  ['new', 'existing'].forEach(function (k) { entityPool.push.apply(entityPool, [].concat(rel[k].a, rel[k].b)); });
}
ZODIAC_DATA.forEach(pushEntity); DDI_DATA.forEach(pushEntity); ILGAN_DATA.forEach(pushEntity);
const poolSentences = [];
existing.forEach(function (e) { splitSentences(e.text).forEach(function (s) { poolSentences.push(s); }); });
entityPool.forEach(function (t) { splitSentences(t).forEach(function (s) { poolSentences.push(s); }); });
const seen = new Set();
entries.forEach(function (e) {
  splitSentences(e.text).forEach(function (sent) {
    poolSentences.forEach(function (s) {
      if (wordJaccard(sent, s) >= 0.5 || trigramJaccard(sent, s) >= 0.4) {
        const key = e.where + '|' + s;
        if (!seen.has(key)) { seen.add(key); problems.push('echoes existing text ' + e.where + ' | ' + sent + ' | ' + s); }
      }
    });
  });
});

if (problems.length) {
  console.error(problems.length + ' problems:\n' + problems.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('OK compat-sections: ' + entries.length + ' texts');
