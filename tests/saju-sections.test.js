// 사주 5섹션 문구(data/saju-sections.js) 검사: 분량, 금지 표현, 문장 유사도, 같은 일간의 기존 문장과의 반복(한 화면에 함께 나옴).
const assert = require('assert');
const text = require('../data/saju-sections.js');
const { ILGAN_DATA, ELEMENT_BALANCE_TEXT } = require('../data/saju-data.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { splitSentences, wordJaccard, trigramJaccard, longestCommonSubstring } = require('./helpers/dedup.js');

const problems = [];
const entries = [];
function add(where, field, value, min, max, sentences) {
  if (typeof value !== 'string') { problems.push(where + ' missing'); return; }
  if (value.length < min || value.length > max) problems.push(where + ' length ' + value.length + ' (' + min + '~' + max + ')');
  const n = splitSentences(value).length;
  if (n < sentences[0] || n > sentences[1]) problems.push(where + ' sentences ' + n);
  entries.push({ where: where, field: field, text: value, ilgan: where.split('.')[0] });
}

ILGAN_DATA.forEach(function (ilgan) {
  ['overall', 'work', 'bond', 'practice'].forEach(function (f) {
    text.SAJU_ILGAN_TEXT[ilgan.key][f].forEach(function (s, i) { add(ilgan.key + '.' + f + '.' + i, 'ilgan-' + f, s, 60, 200, [1, 3]); });
  });
});
Object.keys(text.SAJU_SEASON_RELATION).forEach(function (k) { add('season.' + k, 'season', text.SAJU_SEASON_RELATION[k].replace('{season}', '겨울의 기운이 도는 달'), 70, 200, [1, 3]); });
Object.keys(text.SAJU_GROUP_TEXT).forEach(function (g) {
  ['lead', 'money', 'love', 'year'].forEach(function (f) { add('group.' + g + '.' + f, 'group-' + f, text.SAJU_GROUP_TEXT[g][f], 70, 200, [1, 3]); });
});
Object.keys(text.SAJU_HEALTH_ELEMENT).forEach(function (k) { add('health.' + k, 'health', text.SAJU_HEALTH_ELEMENT[k], 70, 200, [1, 3]); });
Object.keys(text.SAJU_REMEDY_ELEMENT).forEach(function (k) { add('remedy.' + k, 'remedy', text.SAJU_REMEDY_ELEMENT[k], 70, 200, [1, 3]); });
add('remedy.balanced', 'remedy', text.SAJU_REMEDY_BALANCED, 70, 200, [1, 3]);
add('health.disclaimer', 'disclaimer', text.SAJU_HEALTH_DISCLAIMER, 60, 200, [1, 3]);
['SAJU_WORK_ELEMENT:work', 'SAJU_LOVE_ELEMENT:love', 'SAJU_NOW_CARE:care', 'SAJU_ROUTINE_ELEMENT:routine'].forEach(function (pair) {
  const name = pair.split(':')[0], field = pair.split(':')[1];
  assert.deepStrictEqual(Object.keys(text[name]).sort(), ['금', '목', '수', '토', '화'], name + ' covers five elements');
  Object.keys(text[name]).forEach(function (k) { add(field + '.' + k, field, text[name][k], 70, 220, [1, 3]); });
});
assert.ok(text.SAJU_CHART_LINE.indexOf('{ilgan}') !== -1 && text.SAJU_CHART_LINE.indexOf('{counts}') !== -1);

entries.forEach(function (e) {
  findBannedPhrases(e.text).forEach(function (p) { problems.push(e.where + ' banned phrase: ' + p); });
  if (/[぀-ヿ]/.test(e.text)) problems.push(e.where + ' has Japanese kana');
  if (/[A-Za-z0-9]/.test(e.text)) problems.push(e.where + ' has latin letters or digits');
  if (/(^|[^가-힣])(반드시|확실히|무조건|틀림없이)/.test(e.text)) problems.push(e.where + ' has a certainty word');
});

// 같은 칸(필드) 안의 전체 쌍 비교
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.field !== b.field) continue;
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.3 || (wj >= 0.2 && tj >= 0.2) || tj >= 0.35) problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
  }
}

// 문장 단위(전체): 서로 다른 항목 사이에서 뼈대를 공유하는 문장
const sentences = [];
entries.forEach(function (e) { splitSentences(e.text).forEach(function (s) { sentences.push({ where: e.where, text: s }); }); });
for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < sentences.length; j++) {
    const a = sentences[i], b = sentences[j];
    if (a.where === b.where) continue;
    if (wordJaccard(a.text, b.text) >= 0.5 || trigramJaccard(a.text, b.text) >= 0.4) problems.push('similar sentence ' + a.where + ' ~ ' + b.where + ' | ' + a.text + ' | ' + b.text);
  }
}

// 기존 문장(일간 성격·조언·재물/직업/연애/대인관계/건강 풀이, 오행 균형 한 줄)과의 반복
const normalize = function (s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); };
const globalPool = [];
Object.keys(ELEMENT_BALANCE_TEXT).forEach(function (k) {
  const v = ELEMENT_BALANCE_TEXT[k];
  if (typeof v === 'string') globalPool.push(v); else Object.keys(v).forEach(function (el) { globalPool.push(v[el]); });
});
const ilganPools = {};
ILGAN_DATA.forEach(function (ilgan) {
  const pool = [].concat(ilgan.trait.a, ilgan.trait.b, ilgan.advice);
  ['love', 'money', 'career', 'relationships', 'health'].forEach(function (c) {
    const rec = function (x) {
      if (x && x.a && x.b) pool.push.apply(pool, [].concat(x.a, x.b));
      else if (x && typeof x === 'object') Object.values(x).forEach(rec);
    };
    rec(ilgan.categories[c]);
  });
  ilganPools[ilgan.key] = pool;
});
const allIlganPool = [].concat.apply([], Object.keys(ilganPools).map(function (k) { return ilganPools[k]; }));
const seen = new Set();
entries.forEach(function (e) {
  // 일간 전용 문구는 같은 일간의 기존 문장과 6자 이상 같은 구절을 공유하면 안 된다. 공용 문구는 모든 일간과 문장 단위로 비교한다.
  const own = ilganPools[e.ilgan];
  if (own) {
    own.forEach(function (s) {
      const l = longestCommonSubstring(normalize(e.text), normalize(s));
      if (l >= 7) problems.push('shares a ' + l + '-char phrase with same-ilgan text ' + e.where + ' | ' + s);
    });
  }
  const pool = own ? own : allIlganPool.concat(globalPool);
  splitSentences(e.text).forEach(function (sent) {
    pool.concat(globalPool).forEach(function (s) {
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
console.log('OK saju-sections: ' + entries.length + ' texts');
