const assert = require('assert');
const sajuCalc = require('../js/saju-calc.js');
global.calculateSaju = sajuCalc.calculateSaju;
global.getStemElement = sajuCalc.getStemElement;
global.getIlganByIndex = require('../data/saju-data.js').getIlganByIndex;
const { getSajuCompatibility } = require('../js/compatibility-calc.js');
const { getCompatTierInfo } = require('../data/compatibility-data.js');

// Returning the wrong person's chart, inventing an hour, or changing a tier
// must fail even though the compatibility description is randomly selected.
const first = { year: 2026, month: 8, day: 20 };
[
  { day: 21, tier: 'bihwa', name: '정화', stemIdx: 3 },
  { day: 22, tier: 'sangsaeng', name: '무토', stemIdx: 4 },
  { day: 24, tier: 'sanggeuk', name: '경금', stemIdx: 6 }
].forEach(function (fixture) {
  const second = { year: 2026, month: 8, day: fixture.day };
  const result = getSajuCompatibility(first, second);
  assert.strictEqual(result.tier, fixture.tier);
  assert.strictEqual(result.ilganName1, '병화');
  assert.strictEqual(result.ilganName2, fixture.name);
  assert.strictEqual(getCompatTierInfo(result.tier, result.ilganName1, result.ilganName2).score, undefined, 'tier info carries no score');
  [first, second].forEach(function (date, index) {
    const chart = result['saju' + (index + 1)];
    assert.ok(chart, 'compatibility must return person ' + (index + 1) + ' chart');
    assert.deepStrictEqual(chart, sajuCalc.calculateSaju({ ...date, timeUnknown: true }));
    assert.ok(!chart.hour, 'unknown birth time must not invent an hour pillar');
    assert.strictEqual(['year', 'month', 'day', 'hour'].filter(function (key) { return chart[key]; }).length, 3);
  });
  assert.strictEqual(result.saju1.day.stemIdx, 2);
  assert.strictEqual(result.saju2.day.stemIdx, fixture.stemIdx);
});

console.log('Compatibility charts and tier tests passed (no score)');
