// 별자리 하루 구성 보강 데이터(data/zodiac-daily.js) 검사: 빠짐없음, 분량, 금지 표현, 문장 유사도,
// 화면 길이 맞춤 후보, 그리고 같은 날 함께 보일 수 있는 띠운세 문구와의 교차 중복.
const assert = require('assert');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');
const { ZODIAC_DAILY } = require('../data/zodiac-daily.js');
const { DDI_DATA } = require('../data/ddi-data.js');
const { DDI_DAILY } = require('../data/ddi-daily.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { splitSentences, wordJaccard, trigramJaccard, longestCommonSubstring } = require('./helpers/dedup.js');

const OVERALL = { min: 140, max: 175 };
const ADVICE = { min: 45, max: 70 };
const problems = [];
const entries = [];

assert.deepStrictEqual(Object.keys(ZODIAC_DAILY).sort(), ZODIAC_DATA.map(function (z) { return z.key; }).sort(), 'all 12 signs');

ZODIAC_DATA.forEach(function (zodiac) {
  const data = ZODIAC_DAILY[zodiac.key];
  assert.strictEqual(data.mood.length, 6, zodiac.key + ' mood count');
  assert.strictEqual(data.choice.length, 5, zodiac.key + ' choice count');
  assert.strictEqual(data.tip.length, 3, zodiac.key + ' tip count');

  data.mood.forEach(function (t, i) {
    const where = zodiac.key + '.mood.' + i;
    if (t.length < 64 || t.length > 120) problems.push(where + ' length ' + t.length + ' (64~120)');
    const ns = splitSentences(t).length;
    if (ns < 1 || ns > 3) problems.push(where + ' sentences ' + ns);
    entries.push({ where: where, field: 'mood', text: t, zodiac: zodiac });
  });
  data.choice.forEach(function (t, i) {
    const where = zodiac.key + '.choice.' + i;
    if (t.length < 70 || t.length > 105) problems.push(where + ' length ' + t.length + ' (70~105)');
    const ns = splitSentences(t).length;
    if (ns < 1 || ns > 3) problems.push(where + ' sentences ' + ns);
    entries.push({ where: where, field: 'choice', text: t, zodiac: zodiac });
  });
  data.tip.forEach(function (t, i) {
    const where = zodiac.key + '.tip.' + i;
    if (t.length < 12 || t.length > 32) problems.push(where + ' length ' + t.length + ' (12~32)');
    entries.push({ where: where, field: 'tip', text: t, zodiac: zodiac });
  });

  const traitCombos = [];
  zodiac.trait.a.forEach(function (a) { zodiac.trait.b.forEach(function (b) { traitCombos.push(a + ' ' + b); }); });
  data.mood.forEach(function (m, i) {
    if (!traitCombos.some(function (t) { const n = (t + ' ' + m).length; return n >= OVERALL.min && n <= OVERALL.max; })) {
      problems.push('no overall-length candidate for ' + zodiac.key + '.mood.' + i);
    }
  });
  data.tip.forEach(function (tip, i) {
    if (!zodiac.advice.some(function (a) { const n = (a + ' ' + tip).length; return n >= ADVICE.min && n <= ADVICE.max; })) {
      problems.push('no advice-length candidate for ' + zodiac.key + '.tip.' + i);
    }
  });
});

entries.forEach(function (e) {
  findBannedPhrases(e.text).forEach(function (p) { problems.push(e.where + ' banned phrase: ' + p); });
  if (/[぀-ヿ]/.test(e.text)) problems.push(e.where + ' has Japanese kana');
  if (/[A-Za-z0-9]/.test(e.text)) problems.push(e.where + ' has latin letters or digits');
});

// 같은 칸(필드) 안의 전체 쌍 비교
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.field !== b.field) continue;
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.3 || (wj >= 0.2 && tj >= 0.15) || tj >= 0.3) problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
  }
}

// 문장 단위: mood와 choice는 한 화면에 함께 나오므로 서로 비교한다
const sentences = [];
entries.filter(function (e) { return e.field !== 'tip'; }).forEach(function (e) {
  splitSentences(e.text).forEach(function (s) { sentences.push({ where: e.where, text: s }); });
});
for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < sentences.length; j++) {
    const a = sentences[i], b = sentences[j];
    if (a.where === b.where) continue;
    if (wordJaccard(a.text, b.text) >= 0.5 || trigramJaccard(a.text, b.text) >= 0.4) problems.push('similar sentence ' + a.where + ' ~ ' + b.where + ' | ' + a.text + ' | ' + b.text);
  }
}

// 같은 별자리의 기존 성격·조언 문장, 그리고 띠운세 새 문구·성격·조언 문장과의 교차 비교
const ddiPool = [];
DDI_DATA.forEach(function (d) { ddiPool.push.apply(ddiPool, [].concat(d.trait.a, d.trait.b, d.advice)); });
Object.keys(DDI_DAILY).forEach(function (k) { ddiPool.push.apply(ddiPool, [].concat(DDI_DAILY[k].daily, DDI_DAILY[k].tip)); });
const ddiSentences = [];
ddiPool.forEach(function (t) { splitSentences(t).forEach(function (s) { ddiSentences.push(s); }); });

entries.forEach(function (e) {
  const own = [].concat(e.zodiac.trait.a, e.zodiac.trait.b, e.zodiac.advice);
  splitSentences(e.text).forEach(function (sent) {
    own.forEach(function (s) {
      if (wordJaccard(sent, s) >= 0.5 || trigramJaccard(sent, s) >= 0.4) problems.push('echoes same-sign text ' + e.where + ' | ' + sent + ' | ' + s);
    });
    ddiSentences.forEach(function (s) {
      if (wordJaccard(sent, s) >= 0.5 || trigramJaccard(sent, s) >= 0.4) problems.push('echoes ddi text ' + e.where + ' | ' + sent + ' | ' + s);
    });
  });
});

// 같은 별자리의 기존 문장과 6자 이상 같은 구절을 공유하면 한 화면에서 같은 말이 반복돼 보인다
const normalize = function (s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); };
entries.forEach(function (e) {
  const own = [].concat(e.zodiac.trait.a, e.zodiac.trait.b, e.zodiac.advice);
  own.forEach(function (s) {
    const l = longestCommonSubstring(normalize(e.text), normalize(s));
    if (l >= 6) problems.push('shares a ' + l + '-char phrase with same-sign text ' + e.where + ' | ' + s);
  });
});

if (problems.length) {
  console.error(problems.length + ' problems:\n' + problems.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('OK zodiac-daily: ' + entries.length + ' texts');
