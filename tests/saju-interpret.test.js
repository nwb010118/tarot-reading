global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;
const assert = require('assert');
const sajuCalc = require('../js/saju-calc.js');
const { interpretSaju, sajuElementDistanceGroup, SAJU_ELEMENTS, SAJU_GROUP_ORDER, SAJU_SIPSIN_GROUP } = require('../js/saju-interpret.js');
const { ILGAN_DATA } = require('../data/saju-data.js');
const text = require('../data/saju-sections.js');

const helpers = {
  getSipsin: sajuCalc.getSipsin,
  getJijanggan: sajuCalc.getJijanggan,
  classifyElementBalance: sajuCalc.classifyElementBalance
};

// 오행 순환 거리와 십성 묶음이 일치한다 (일간과 같은 오행은 비겁, 일간을 낳는 오행은 인성)
assert.strictEqual(sajuElementDistanceGroup('목', '목'), 'bigeop');
assert.strictEqual(sajuElementDistanceGroup('목', '화'), 'siksang');
assert.strictEqual(sajuElementDistanceGroup('목', '토'), 'jaeseong');
assert.strictEqual(sajuElementDistanceGroup('목', '금'), 'gwanseong');
assert.strictEqual(sajuElementDistanceGroup('목', '수'), 'inseong');
assert.strictEqual(sajuElementDistanceGroup('수', '목'), 'siksang');
// 모든 일간×대상 천간에서 getSipsin의 묶음과 오행 거리 묶음이 같다
for (let d = 0; d < 10; d += 1) {
  for (let t = 0; t < 10; t += 1) {
    assert.strictEqual(
      SAJU_SIPSIN_GROUP[sajuCalc.getSipsin(d, t)],
      sajuElementDistanceGroup(sajuCalc.getStemElement(d), sajuCalc.getStemElement(t)),
      'group mismatch ' + d + ',' + t
    );
  }
}

// 실제 명식으로 계산: 같은 입력이면 같은 결과, 구조가 유효하다
const input = { year: 1990, month: 5, day: 15, hour: 10, minute: 30, timeUnknown: false };
const saju = sajuCalc.calculateSaju(input);
const counts = sajuCalc.getElementCounts(saju);
const a = interpretSaju(saju, counts, helpers, 2);
const b = interpretSaju(saju, counts, helpers, 2);
assert.deepStrictEqual(a, b);
assert.ok(SAJU_ELEMENTS.indexOf(a.dayElement) !== -1 && SAJU_ELEMENTS.indexOf(a.monthElement) !== -1);
assert.ok(SAJU_GROUP_ORDER.indexOf(a.seasonRelation) !== -1);
assert.ok(SAJU_GROUP_ORDER.indexOf(a.dominantGroup) !== -1);
assert.ok(SAJU_GROUP_ORDER.indexOf(a.yearGroup) !== -1);
const groupTotal = Object.keys(a.groupCounts).reduce(function (s, k) { return s + a.groupCounts[k]; }, 0);
assert.strictEqual(groupTotal, 3 + 4, '천간 3(일간 제외) + 지지 4 = 7');
assert.strictEqual(interpretSaju(saju, counts, helpers, null).yearGroup, null, '올해 세운이 없으면 관계도 없음');

// 시간을 모르는 경우: 3개 기둥, 천간 2(일간 제외) + 지지 3 = 5
const noHour = sajuCalc.calculateSaju({ year: 1990, month: 5, day: 15, timeUnknown: true });
const r3 = interpretSaju(noHour, sajuCalc.getElementCounts(noHour), helpers, 2);
assert.strictEqual(Object.keys(r3.groupCounts).reduce(function (s, k) { return s + r3.groupCounts[k]; }, 0), 5);

// 개운 오행 규칙: 없는 오행을 보태고, 강한 오행은 다음 오행으로 풀고, 균형이면 없음
const fake = function (state, element) { return { classifyElementBalance: function () { return { state: state, element: element }; }, getSipsin: helpers.getSipsin, getJijanggan: helpers.getJijanggan }; };
assert.strictEqual(interpretSaju(saju, counts, fake('deficient', '금'), 2).remedyElement, '금');
assert.strictEqual(interpretSaju(saju, counts, fake('excess', '수'), 2).remedyElement, '목');
assert.strictEqual(interpretSaju(saju, counts, fake('excess', '목'), 2).remedyElement, '화');
assert.strictEqual(interpretSaju(saju, counts, fake('balanced', null), 2).remedyElement, null);
assert.strictEqual(interpretSaju(saju, counts, fake('balanced', null), 2).healthElement, a.dayElement);

// 문구 데이터가 모든 키를 덮는다
ILGAN_DATA.forEach(function (ilgan) {
  const t = text.SAJU_ILGAN_TEXT[ilgan.key];
  assert.ok(t, 'ilgan text for ' + ilgan.key);
  ['overall', 'work', 'bond', 'practice'].forEach(function (f) { assert.strictEqual(t[f].length, 2, ilgan.key + '.' + f); });
});
SAJU_ELEMENTS.forEach(function (el) {
  assert.ok(text.SAJU_SEASON_LABEL[el] && text.SAJU_HEALTH_ELEMENT[el] && text.SAJU_REMEDY_ELEMENT[el], 'element text ' + el);
});
SAJU_GROUP_ORDER.forEach(function (g) {
  assert.ok(text.SAJU_SEASON_RELATION[g] && text.SAJU_SEASON_RELATION[g].indexOf('{season}') !== -1, 'season relation ' + g);
  ['lead', 'money', 'love', 'year'].forEach(function (f) { assert.ok(text.SAJU_GROUP_TEXT[g][f], g + '.' + f); });
});
console.log('saju-interpret ok');
