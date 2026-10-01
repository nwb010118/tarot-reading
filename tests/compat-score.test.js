global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;
const assert = require('assert');
const { scoreZodiac, scoreDdi, scoreSaju, ZODIAC_ORDER, SCORE_MIN, SCORE_MAX } = require('../js/compat-score.js');
const { getEffectiveDdiYear } = require('../js/ddi-boundary.js');
const { lunarToSolar } = require('../js/lunar-convert.js');

// 별자리: 간격별 가감, 대칭, 범위
assert.strictEqual(scoreZodiac('aries', 'leo', 90).score, 94, '4칸 +4');
assert.strictEqual(scoreZodiac('aries', 'gemini', 82).score, 85, '2칸 +3');
assert.strictEqual(scoreZodiac('aries', 'cancer', 60).score, 54, '3칸 -6');
assert.strictEqual(scoreZodiac('aries', 'taurus', 60).score, 52, '1칸 -8');
assert.strictEqual(scoreZodiac('aries', 'libra', 82).score, 82, '6칸 0');
assert.strictEqual(scoreZodiac('aries', 'aries', 90).score, 90);
assert.strictEqual(scoreZodiac('pisces', 'aries', 60).score, 52, '끝과 처음은 1칸');
ZODIAC_ORDER.forEach(function (a) {
  ZODIAC_ORDER.forEach(function (b) {
    const r = scoreZodiac(a, b, 60);
    assert.strictEqual(r.score, scoreZodiac(b, a, 60).score, 'symmetric ' + a + b);
    assert.ok(r.score >= SCORE_MIN && r.score <= SCORE_MAX);
  });
});

// 띠: 원진 -8, 육해 -6, 없으면 0
assert.strictEqual(scoreDdi('tiger', 'rooster', 62).score, 54);
assert.strictEqual(scoreDdi('rooster', 'tiger', 62).score, 54);
assert.strictEqual(scoreDdi('rat', 'goat', 62).score, 54, '원진과 육해가 겹치면 원진만');
assert.strictEqual(scoreDdi('tiger', 'snake', 62).score, 56);
assert.strictEqual(scoreDdi('rat', 'rat', 74).score, 74);
assert.deepStrictEqual(scoreDdi('rat', 'ox', 86).factors, []);

// 사주: stem/branch만 쓰는 최소 입력
function chart(stem, branch) { return { day: { stemIdx: stem, branchIdx: branch } }; }
let r = scoreSaju(chart(0, 0), chart(5, 1), 85); // 갑·자 vs 기·축: 천간합 +10, 육합 +8
assert.strictEqual(r.score, 99, 'clamped to 99');
assert.strictEqual(r.factors.length, 2);
assert.ok(r.factors[0].label.includes('갑↔기'));
r = scoreSaju(chart(0, 0), chart(2, 6), 70);
assert.strictEqual(r.score, 60, '충 -10');
r = scoreSaju(chart(0, 0), chart(1, 4), 70);
assert.strictEqual(r.score, 75, '삼합 +5');
r = scoreSaju(chart(0, 0), chart(1, 7), 70);
assert.strictEqual(r.score, 65, '해 -5');
r = scoreSaju(chart(0, 2), chart(3, 2), 45);
assert.strictEqual(r.score, 45, '같은 지지는 가감 없음');
assert.strictEqual(scoreSaju(chart(0, 0), chart(2, 6), 20).score, 20, 'clamped to min');
for (let b1 = 0; b1 < 12; b1 += 1) {
  for (let b2 = 0; b2 < 12; b2 += 1) {
    assert.strictEqual(scoreSaju(chart(0, b1), chart(1, b2), 70).score, scoreSaju(chart(1, b2), chart(0, b1), 70).score);
  }
}

// 설날 경계: 2000년 설날은 2월 5일
const lt = function (y, m, d, i) { return lunarToSolar(y, m, d, i); };
assert.deepStrictEqual(lt(2000, 1, 1, false), { year: 2000, month: 2, day: 5 });
assert.deepStrictEqual(getEffectiveDdiYear(2000, 2, 4, lt), { year: 1999, adjusted: true, seollal: { year: 2000, month: 2, day: 5 } });
assert.strictEqual(getEffectiveDdiYear(2000, 2, 5, lt).year, 2000);
assert.strictEqual(getEffectiveDdiYear(2000, 1, 20, lt).year, 1999);
assert.strictEqual(getEffectiveDdiYear(2000, 12, 31, lt).year, 2000);
assert.deepStrictEqual(getEffectiveDdiYear(2000, null, null, lt), { year: 2000, adjusted: false });
assert.deepStrictEqual(getEffectiveDdiYear(2060, 1, 10, lt), { year: 2060, adjusted: false }, '표 범위 밖이면 연도만');
console.log('compat-score ok');
