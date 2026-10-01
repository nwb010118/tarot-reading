// 띠운세 하루 구성 보강 데이터(data/ddi-daily.js) 검사: 빠짐없음, 분량, 금지 표현, 문장 유사도, 화면 길이 맞춤 후보.
const assert = require('assert');
const { DDI_DATA } = require('../data/ddi-data.js');
const { DDI_DAILY } = require('../data/ddi-daily.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { splitSentences, wordJaccard, trigramJaccard, longestCommonSubstring } = require('./helpers/dedup.js');

const OVERALL = { min: 140, max: 175 };
const ADVICE = { min: 45, max: 70 };
const problems = [];
const entries = [];

assert.deepStrictEqual(Object.keys(DDI_DAILY).sort(), DDI_DATA.map(function (d) { return d.key; }).sort(), 'all 12 animals');

DDI_DATA.forEach(function (ddi) {
  const data = DDI_DAILY[ddi.key];
  assert.strictEqual(data.daily.length, 6, ddi.key + ' daily count');
  assert.strictEqual(data.tip.length, 3, ddi.key + ' tip count');
  assert.strictEqual(data.colors.length, 4, ddi.key + ' colors');
  assert.strictEqual(new Set(data.numbers).size, 5, ddi.key + ' numbers distinct');
  data.numbers.forEach(function (n) { assert.ok(Number.isInteger(n) && n >= 1 && n <= 9, ddi.key + ' number range'); });

  data.daily.forEach(function (t, i) {
    const where = ddi.key + '.daily.' + i;
    if (t.length < 64 || t.length > 120) problems.push(where + ' length ' + t.length + ' (64~120)');
    const ns = splitSentences(t).length;
    if (ns < 1 || ns > 3) problems.push(where + ' sentences ' + ns);
    entries.push({ where: where, field: 'daily', text: t, ddi: ddi });
  });
  data.tip.forEach(function (t, i) {
    const where = ddi.key + '.tip.' + i;
    if (t.length < 12 || t.length > 32) problems.push(where + ' length ' + t.length + ' (12~32)');
    entries.push({ where: where, field: 'tip', text: t, ddi: ddi });
  });

  // 화면에서 쓰는 조합 중 길이 범위에 드는 후보가 모든 줄에 있어야 한다
  const traitCombos = [];
  ddi.trait.a.forEach(function (a) { ddi.trait.b.forEach(function (b) { traitCombos.push(a + ' ' + b); }); });
  data.daily.forEach(function (d, i) {
    if (!traitCombos.some(function (t) { const n = (t + ' ' + d).length; return n >= OVERALL.min && n <= OVERALL.max; })) {
      problems.push('no overall-length candidate for ' + ddi.key + '.daily.' + i);
    }
  });
  data.tip.forEach(function (tip, i) {
    if (!ddi.advice.some(function (a) { const n = (a + ' ' + tip).length; return n >= ADVICE.min && n <= ADVICE.max; })) {
      problems.push('no advice-length candidate for ' + ddi.key + '.tip.' + i);
    }
  });
});

entries.forEach(function (e) {
  findBannedPhrases(e.text).forEach(function (p) { problems.push(e.where + ' banned phrase: ' + p); });
  if (/[぀-ヿ]/.test(e.text)) problems.push(e.where + ' has Japanese kana');
  if (/[A-Za-z0-9]/.test(e.text)) problems.push(e.where + ' has latin letters or digits');
});

for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.field !== b.field) continue;
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.3 || (wj >= 0.2 && tj >= 0.15) || tj >= 0.3) problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
  }
}

// 문장 단위(daily는 서로, 같은 띠의 기존 성격·조언 문장과도)
const sentences = [];
entries.filter(function (e) { return e.field === 'daily'; }).forEach(function (e) {
  splitSentences(e.text).forEach(function (s) { sentences.push({ where: e.where, text: s }); });
});
for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < sentences.length; j++) {
    const a = sentences[i], b = sentences[j];
    if (a.where === b.where) continue;
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.5 || tj >= 0.4) problems.push('similar sentence ' + a.where + ' ~ ' + b.where + ' | ' + a.text + ' | ' + b.text);
  }
}
entries.forEach(function (e) {
  const ddi = e.ddi;
  const pool = [].concat(ddi.trait.a, ddi.trait.b, ddi.advice);
  pool.forEach(function (s) {
    splitSentences(e.text).forEach(function (sent) {
      if (wordJaccard(sent, s) >= 0.5 || trigramJaccard(sent, s) >= 0.4) problems.push('sentence echoes existing ' + e.where + ' | ' + sent + ' | ' + s);
    });
  });
});

// 같은 띠의 기존 문장과 6자 이상 같은 구절을 공유하면 한 화면에서 같은 말이 반복돼 보인다
const normalize = function (s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); };
entries.forEach(function (e) {
  const own = [].concat(e.ddi.trait.a, e.ddi.trait.b, e.ddi.advice);
  own.forEach(function (s) {
    const l = longestCommonSubstring(normalize(e.text), normalize(s));
    if (l >= 6) problems.push('shares a ' + l + '-char phrase with same-animal text ' + e.where + ' | ' + s);
  });
});

if (problems.length) {
  console.error(problems.length + ' problems:\n' + problems.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('OK ddi-daily: ' + entries.length + ' texts');
