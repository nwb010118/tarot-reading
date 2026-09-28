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

// KST 기준 생년월일시를 절대 시각(UTC 인스턴트)으로 변환
function kstDateToInstant(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute || 0));
}

// birthDate가 그 해 입춘 이전이면 사주상 연도는 전년도
function getSajuYear(instant, calendarYear) {
  const ipchun = findIpchun(calendarYear);
  return instant < ipchun ? calendarYear - 1 : calendarYear;
}

function calculateSaju(input) {
  // 시간을 모르면 절기/월지 판단용으로 정오를 기준 시각으로 사용(오차는 하루 안쪽 절기 경계 근처에서만 발생 가능하며,
  // 이 경우 UI에서 시주/대운을 아예 표시하지 않으므로 영향 없음)
  const hour = input.timeUnknown ? 12 : input.hour;
  const minute = input.timeUnknown ? 0 : input.minute;
  const instant = kstDateToInstant(input.year, input.month, input.day, hour, minute);

  const sajuYear = getSajuYear(instant, input.year);
  const yearPillar = getYearPillar(sajuYear);

  const longitude = solarLongitude(instant);
  const monthOffset = getMonthOffset(longitude);
  const monthPillar = getMonthPillar(yearPillar.stemIdx, monthOffset);

  const dayIndex = getDayPillarIndex(input.year, input.month, input.day);
  const dayPillar = { stemIdx: normalizeMod(dayIndex, 10), branchIdx: normalizeMod(dayIndex, 12) };

  let hourPillar = null;
  if (!input.timeUnknown) {
    const hourBranchIdx = getHourBranchIndex(input.hour);
    const hourStemIdx = getHourStemIndex(dayPillar.stemIdx, hourBranchIdx);
    hourPillar = { stemIdx: hourStemIdx, branchIdx: hourBranchIdx };
  }

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    sajuYear: sajuYear,
    monthOffset: monthOffset,
    instant: instant
  };
}

const CHEONGAN_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const JIJI_ELEMENT = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

function getStemElement(stemIdx) {
  return CHEONGAN_ELEMENT[stemIdx];
}

const ELEMENT_ORDER = ['목', '화', '토', '금', '수'];

function getElementOrderIndex(element) {
  return ELEMENT_ORDER.indexOf(element);
}

const SIPSIN_NAMES = {
  0: ['비견', '겁재'],
  1: ['식신', '상관'],
  2: ['편재', '정재'],
  3: ['편관', '정관'],
  4: ['편인', '정인']
};

function getSipsin(dayStemIdx, targetStemIdx) {
  const dayEl = getStemElement(dayStemIdx);
  const targetEl = getStemElement(targetStemIdx);
  const diff = normalizeMod(getElementOrderIndex(targetEl) - getElementOrderIndex(dayEl), 5);
  const sameYinYang = isYangStem(dayStemIdx) === isYangStem(targetStemIdx);
  return SIPSIN_NAMES[diff][sameYinYang ? 0 : 1];
}

// 지지별 정기(본기) 지장간 — CHEONGAN 인덱스. 순서: 자축인묘진사오미신유술해
const JIJANGGAN_JEONGGI = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

function getJijanggan(branchIdx) {
  return JIJANGGAN_JEONGGI[branchIdx];
}

const TWELVE_LIFESTAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 천간별 장생 지지(화토동법: 무=병과 동일, 기=정과 동일). 순서: 갑을병정무기경신임계
const LIFESTAGE_START_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

function getTwelveLifeStage(dayStemIdx, targetBranchIdx) {
  const direction = isYangStem(dayStemIdx) ? 1 : -1;
  const start = LIFESTAGE_START_BRANCH[dayStemIdx];
  const position = normalizeMod(direction * (targetBranchIdx - start), 12);
  return TWELVE_LIFESTAGES[position];
}

// 60갑자를 2개씩 묶어 공유하는 납음 이름 30개(갑자을축=해중금부터 임술계해=대해수까지)
const NAPJEONG_NAMES = [
  '해중금', '노중화', '대림목', '노방토', '검봉금', '산두화', '간하수', '성두토', '백랍금', '양류목',
  '정천수', '옥상토', '벽력화', '송백목', '장류수', '사중금', '산하화', '평지목', '벽상토', '금박금',
  '복등화', '천하수', '대역토', '채천금', '상자목', '대계수', '사중토', '천상화', '석류목', '대해수'
];

function getGanjiIndex(stemIdx, branchIdx) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return -1;
}

function getNapjeong(stemIdx, branchIdx) {
  return NAPJEONG_NAMES[Math.floor(getGanjiIndex(stemIdx, branchIdx) / 2)];
}

function isChungBranchPair(branchIdxA, branchIdxB) {
  return normalizeMod(branchIdxA - branchIdxB, 12) === 6;
}

function getElementCounts(pillars) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const list = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) list.push(pillars.hour);
  list.forEach(function (p) {
    counts[CHEONGAN_ELEMENT[p.stemIdx]] += 1;
    counts[JIJI_ELEMENT[p.branchIdx]] += 1;
  });
  return counts;
}

function classifyElementBalance(counts) {
  const entries = Object.keys(counts).map(function (el) { return { el: el, count: counts[el] }; });
  entries.sort(function (a, b) { return b.count - a.count; });
  const max = entries[0];
  const zero = entries.filter(function (e) { return e.count === 0; });
  if (max.count >= 3) return { state: 'excess', element: max.el };
  if (zero.length > 0) return { state: 'deficient', element: zero[0].el };
  return { state: 'balanced', element: null };
}

function isYangStem(stemIdx) { return stemIdx % 2 === 0; }

// 양간+남자 또는 음간+여자 -> 순행(1), 그 외 -> 역행(-1)
function getDaeunDirection(yearStemIdx, gender) {
  const yang = isYangStem(yearStemIdx);
  const forward = (yang && gender === 'male') || (!yang && gender === 'female');
  return forward ? 1 : -1;
}

function getDaeunBoundary(instant, monthOffset, direction) {
  const targetLongitude = direction === 1
    ? normalizeMod(315 + (monthOffset + 1) * 30, 360)
    : normalizeMod(315 + monthOffset * 30, 360);
  return findSolarTermMoment(instant, targetLongitude);
}

// 절입일까지 일수 ÷ 3 (나머지 1=버림, 2=올림 규칙은 Math.round와 동치)
function getDaeunStartAge(instant, monthOffset, direction) {
  const boundary = getDaeunBoundary(instant, monthOffset, direction);
  const diffDays = Math.abs(boundary.getTime() - instant.getTime()) / 86400000;
  return Math.round(diffDays / 3);
}

function getDaeunList(monthStemIdx, monthBranchIdx, direction, startAge) {
  const list = [];
  let stemIdx = monthStemIdx;
  let branchIdx = monthBranchIdx;
  for (let i = 0; i < 9; i += 1) {
    stemIdx = normalizeMod(stemIdx + direction, 10);
    branchIdx = normalizeMod(branchIdx + direction, 12);
    list.push({ stemIdx: stemIdx, branchIdx: branchIdx, startAge: startAge + i * 10, endAge: startAge + i * 10 + 9 });
  }
  return list;
}

// startYear부터 count개 연도의 세운(년운) 간지 목록.
// 해당 연도 입춘부터 다음해 입춘 전까지의 간지는 getYearPillar 공식을 재사용한다.
function getSeunList(startYear, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const year = startYear + i;
    const pillar = getYearPillar(year);
    list.push({ year: year, stemIdx: pillar.stemIdx, branchIdx: pillar.branchIdx });
  }
  return list;
}

// yearStemIdx(연간 인덱스) -> 인월(monthOffset 0)부터 축월(monthOffset 11)까지 12개월 월운 간지 목록.
// 기존 getMonthPillar(오호둔 공식)를 그대로 재사용한다.
function getWolunList(yearStemIdx) {
  const list = [];
  for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
    const pillar = getMonthPillar(yearStemIdx, monthOffset);
    list.push({ monthOffset: monthOffset, stemIdx: pillar.stemIdx, branchIdx: pillar.branchIdx });
  }
  return list;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay, CHEONGAN, JIJI, getYearPillar, getMonthOffset, getMonthPillar, findIpchun, toJDN, getDayPillarIndex, getHourBranchIndex, getHourStemIndex, kstDateToInstant, getSajuYear, calculateSaju, getElementCounts, classifyElementBalance, getDaeunDirection, getDaeunStartAge, getDaeunList, getSeunList, getWolunList, getStemElement, getElementOrderIndex, getSipsin, getJijanggan, getTwelveLifeStage, getGanjiIndex, getNapjeong, isChungBranchPair };
}
