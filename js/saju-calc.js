function normalizeMod(n, m) {
  return ((n % m) + m) % m;
}

function normalizeDegrees(deg) {
  return normalizeMod(deg, 360);
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function toJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Meeus 저정밀 태양 좌표 공식 (정확도 약 0.01도)
function solarLongitude(date) {
  const JD = toJulianDay(date);
  const T = (JD - 2451545.0) / 36525;
  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = degToRad(M);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);
  const trueLongitude = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  return normalizeDegrees(lambda);
}

// seedInstant에 가장 가까운, 태양황경이 targetLongitude가 되는 시각을 뉴턴법으로 역산
function findSolarTermMoment(seedInstant, targetLongitude) {
  let t = seedInstant;
  for (let i = 0; i < 8; i += 1) {
    const lambda = solarLongitude(t);
    let diff = targetLongitude - lambda;
    diff = normalizeMod(diff + 180, 360) - 180;
    t = new Date(t.getTime() + (diff / 0.9856) * 86400000);
  }
  return t;
}

const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

function getYearPillar(sajuYear) {
  return {
    stemIdx: normalizeMod(sajuYear - 4, 10),
    branchIdx: normalizeMod(sajuYear - 4, 12)
  };
}

// 315도(입춘)를 monthOffset=0(인월)로 삼아 30도 단위로 12개월 구간을 나눔
function getMonthOffset(longitude) {
  return Math.floor(normalizeMod(longitude - 315, 360) / 30);
}

// 오호둔: 년간의 짝(갑기/을경/병신/정임/무계)에 따라 인월(월지 시작)의 월간이 정해짐
const MONTH_STEM_START = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };

function getMonthPillar(yearStemIdx, monthOffset) {
  const branchIdx = normalizeMod(monthOffset + 2, 12); // monthOffset 0(인)=JIJI idx2
  const stemIdx = normalizeMod(MONTH_STEM_START[yearStemIdx] + monthOffset, 10);
  return { stemIdx, branchIdx };
}

function findIpchun(calendarYear) {
  const seed = new Date(Date.UTC(calendarYear, 1, 4));
  return findSolarTermMoment(seed, 315);
}

// 그레고리력 날짜 -> 율리우스일(JDN, 정오 기준 정수)
function toJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// (JDN+49)%60 == 0 이 갑자일. 사자사주 만세력의 2026-08-01/10/20 일진과 대조해 검증됨.
function getDayPillarIndex(year, month, day) {
  return normalizeMod(toJDN(year, month, day) + 49, 60);
}

// 자시=23:00~00:59, 이후 2시간 단위로 축인묘진사오미신유술해 순환
function getHourBranchIndex(hour) {
  return Math.floor(normalizeMod(hour + 1, 24) / 2);
}

// 오둔법: 일간의 짝(갑기/을경/병신/정임/무계)에 따라 자시의 시간이 정해짐
const HOUR_STEM_START = { 0: 0, 5: 0, 1: 2, 6: 2, 2: 4, 7: 4, 3: 6, 8: 6, 4: 8, 9: 8 };

function getHourStemIndex(dayStemIdx, hourBranchIdx) {
  return normalizeMod(HOUR_STEM_START[dayStemIdx] + hourBranchIdx, 10);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay, CHEONGAN, JIJI, getYearPillar, getMonthOffset, getMonthPillar, findIpchun, toJDN, getDayPillarIndex, getHourBranchIndex, getHourStemIndex };
}
