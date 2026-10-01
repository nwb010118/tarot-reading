global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;
const assert = require('assert');
const { zodiacFactors, ddiFactors, sajuFactors, ZODIAC_ORDER } = require('../js/compat-relations.js');
const { COMPAT_FACTOR_TEXT } = require('../data/compat-sections.js');
const { getEffectiveDdiYear } = require('../js/ddi-boundary.js');
const { lunarToSolar } = require('../js/lunar-convert.js');

const keyOf = function (factors) { return factors.map(function (f) { return f.key; }); };

// 별자리: 간격별 요소, 대칭
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'leo')), ['zodiac_gap_4']);
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'gemini')), ['zodiac_gap_2']);
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'cancer')), ['zodiac_gap_3']);
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'taurus')), ['zodiac_gap_1']);
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'libra')), ['zodiac_gap_6']);
assert.deepStrictEqual(keyOf(zodiacFactors('aries', 'aries')), ['zodiac_gap_0']);
assert.deepStrictEqual(keyOf(zodiacFactors('pisces', 'aries')), ['zodiac_gap_1'], '끝과 처음은 1칸');
ZODIAC_ORDER.forEach(function (a) {
  ZODIAC_ORDER.forEach(function (b) {
    assert.deepStrictEqual(zodiacFactors(a, b), zodiacFactors(b, a), 'symmetric ' + a + b);
    assert.ok(COMPAT_FACTOR_TEXT[zodiacFactors(a, b)[0].key], 'text exists for ' + a + b);
  });
});

// 띠: 원진, 육해, 없음 (겹치면 원진만)
assert.deepStrictEqual(keyOf(ddiFactors('tiger', 'rooster')), ['ddi_wonjin']);
assert.deepStrictEqual(keyOf(ddiFactors('rooster', 'tiger')), ['ddi_wonjin']);
assert.deepStrictEqual(keyOf(ddiFactors('rat', 'goat')), ['ddi_wonjin'], '원진과 육해가 겹치면 원진만');
assert.deepStrictEqual(keyOf(ddiFactors('tiger', 'snake')), ['ddi_hae']);
assert.deepStrictEqual(keyOf(ddiFactors('rat', 'rat')), ['ddi_none']);
assert.deepStrictEqual(keyOf(ddiFactors('rat', 'ox')), ['ddi_none']);

// 사주: 일지 관계는 항상 첫 요소, 천간합은 있을 때만 뒤에 붙는다
function chart(stem, branch) { return { day: { stemIdx: stem, branchIdx: branch } }; }
assert.deepStrictEqual(keyOf(sajuFactors(chart(0, 0), chart(5, 1))), ['saju_branch_yukhap', 'saju_stem_he'], '갑·자 vs 기·축');
assert.ok(sajuFactors(chart(0, 0), chart(5, 1))[1].label.includes('갑↔기'));
assert.deepStrictEqual(keyOf(sajuFactors(chart(0, 0), chart(2, 6))), ['saju_branch_chung']);
assert.deepStrictEqual(keyOf(sajuFactors(chart(0, 0), chart(1, 4))), ['saju_branch_samhap']);
assert.deepStrictEqual(keyOf(sajuFactors(chart(0, 0), chart(1, 7))), ['saju_branch_hae']);
assert.deepStrictEqual(keyOf(sajuFactors(chart(0, 2), chart(3, 2))), ['saju_branch_none'], '같은 지지는 관계 없음');
for (let b1 = 0; b1 < 12; b1 += 1) {
  for (let b2 = 0; b2 < 12; b2 += 1) {
    assert.deepStrictEqual(keyOf(sajuFactors(chart(0, b1), chart(1, b2))), keyOf(sajuFactors(chart(1, b2), chart(0, b1))));
    sajuFactors(chart(0, b1), chart(1, b2)).forEach(function (f) { assert.ok(COMPAT_FACTOR_TEXT[f.key], 'text exists for ' + f.key); });
  }
}
['ddi_wonjin', 'ddi_hae', 'ddi_none'].forEach(function (k) { assert.ok(COMPAT_FACTOR_TEXT[k], k); });

// 설날 경계: 2000년 설날은 2월 5일
const lt = function (y, m, d, i) { return lunarToSolar(y, m, d, i); };
assert.deepStrictEqual(lt(2000, 1, 1, false), { year: 2000, month: 2, day: 5 });
assert.deepStrictEqual(getEffectiveDdiYear(2000, 2, 4, lt), { year: 1999, adjusted: true, seollal: { year: 2000, month: 2, day: 5 } });
assert.strictEqual(getEffectiveDdiYear(2000, 2, 5, lt).year, 2000);
assert.strictEqual(getEffectiveDdiYear(2000, 1, 20, lt).year, 1999);
assert.strictEqual(getEffectiveDdiYear(2000, 12, 31, lt).year, 2000);
assert.deepStrictEqual(getEffectiveDdiYear(2000, null, null, lt), { year: 2000, adjusted: false });
assert.deepStrictEqual(getEffectiveDdiYear(2060, 1, 10, lt), { year: 2060, adjusted: false }, '표 범위 밖이면 연도만');
console.log('compat-relations ok');
