const assert = require('assert');
const {
  solarLongitude,
  findSolarTermMoment,
  normalizeMod,
  CHEONGAN,
  JIJI,
  getYearPillar,
  getMonthOffset,
  getMonthPillar,
  findIpchun,
  toJDN,
  getDayPillarIndex
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

// Year and month pillar tests
function pillarLabel(p) { return CHEONGAN[p.stemIdx] + JIJI[p.branchIdx]; }

// 2026년 = 병오년 (사자사주 만세력 대조 확인됨)
assert.strictEqual(pillarLabel(getYearPillar(2026)), '병오');
// 2024년 = 갑진년, 2025년 = 을사년 (60갑자 순환 공식으로 자체 검증)
assert.strictEqual(pillarLabel(getYearPillar(2024)), '갑진');
assert.strictEqual(pillarLabel(getYearPillar(2025)), '을사');

// findIpchun: 2026년 입춘 계산
// Note: Brief's hardcoded Feb 3 is incorrect reference data; Meeus formula correctly calculates Feb 4 KST
const ipchun2026 = findIpchun(2026);
const ipchunKst = new Date(ipchun2026.getTime() + 9 * 3600000);
assert.strictEqual(ipchunKst.getUTCMonth(), 1);
assert.strictEqual(ipchunKst.getUTCDate(), 4, 'ipchun 2026 = Feb 4 KST per Meeus astronomical calculation');

// 2026-08-20은 입추(8/7) 이후 -> 신월(monthOffset=6), 년간 병(idx2) -> 오호둔으로 병신월
const longitudeAug20 = solarLongitude(new Date(Date.UTC(2026, 7, 20, 5, 30))); // KST 14:30
const monthOffset = getMonthOffset(longitudeAug20);
assert.strictEqual(monthOffset, 6, '입추~백로 사이는 monthOffset=6(신월)이어야 함');
const monthPillar = getMonthPillar(2, monthOffset); // 년간 idx2=병
assert.strictEqual(pillarLabel(monthPillar), '병신');

console.log('All saju-calc year/month pillar tests passed');

// Day pillar tests (JDN-based 60갑자)
function dayLabel(idx) { return CHEONGAN[idx % 10] + JIJI[idx % 12]; }

// 사자사주 만세력(2026년 8월 일진표)과 대조해 검증된 3개 날짜
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 1)), '정미');
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 10)), '병진');
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 20)), '병인');

console.log('All saju-calc day pillar tests passed');

// Hour pillar tests
const { getHourBranchIndex, getHourStemIndex } = require('../js/saju-calc.js');

// 자시(23~00시)는 branchIdx 0
assert.strictEqual(getHourBranchIndex(23), 0);
assert.strictEqual(getHourBranchIndex(0), 0);
assert.strictEqual(getHourBranchIndex(1), 1); // 축시
assert.strictEqual(getHourBranchIndex(13), 7); // 미시(13~15시)
assert.strictEqual(getHourBranchIndex(22), 11); // 해시

// 일간이 병(idx2, 병신일→무자시 시작)일 때 미시(idx7)의 시간은 을미
// HOUR_STEM_START[2]=4(무), (4+7)%10=1(을)
assert.strictEqual(getHourStemIndex(2, 7), 1);
// 일간이 갑(idx0, 갑기일→갑자시 시작)일 때 자시(idx0)의 시간은 갑자
assert.strictEqual(getHourStemIndex(0, 0), 0);

console.log('All saju-calc hour pillar tests passed');
