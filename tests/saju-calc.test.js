const assert = require('assert');
const {
  solarLongitude,
  findSolarTermMoment,
  normalizeMod
} = require('../js/saju-calc.js');

// normalizeMod
assert.strictEqual(normalizeMod(-1, 60), 59);
assert.strictEqual(normalizeMod(61, 60), 1);
assert.strictEqual(normalizeMod(0, 12), 0);

// solarLongitude: 하지(6/21 무렵) 근처는 90도, 춘분(3/20 무렵) 근처는 0도에 가까워야 함
const summerLon = solarLongitude(new Date(Date.UTC(2026, 5, 21, 12)));
assert.ok(Math.abs(summerLon - 90) < 2, '하지 근처 황경은 90도±2도: got ' + summerLon);

const springLon = solarLongitude(new Date(Date.UTC(2026, 2, 20, 12)));
const springDiff = Math.min(Math.abs(springLon - 0), Math.abs(springLon - 360));
assert.ok(springDiff < 2, '춘분 근처 황경은 0도±2도: got ' + springLon);

// findSolarTermMoment: 입춘(315도)은 매년 2/3~2/5 KST 안에 들어야 함
for (let year = 1900; year <= 2050; year += 1) {
  const seed = new Date(Date.UTC(year, 1, 4));
  const ipchun = findSolarTermMoment(seed, 315);
  const kst = new Date(ipchun.getTime() + 9 * 3600000);
  assert.strictEqual(kst.getUTCMonth(), 1, year + '년 입춘은 2월이어야 함');
  assert.ok(kst.getUTCDate() >= 3 && kst.getUTCDate() <= 5, year + '년 입춘은 2/3~2/5 사이여야 함: got ' + kst.toISOString());
}

console.log('All saju-calc solar term tests passed');
