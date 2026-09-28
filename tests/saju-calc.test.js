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
  getDayPillarIndex,
  getHourBranchIndex,
  getHourStemIndex,
  kstDateToInstant,
  getSajuYear,
  calculateSaju,
  getElementCounts,
  classifyElementBalance,
  getDaeunDirection,
  getDaeunStartAge,
  getDaeunList,
  getStemElement,
  getSipsin,
  getJijanggan,
  getTwelveLifeStage,
  getGanjiIndex,
  getNapjeong,
  isChungBranchPair,
  getSeunList
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

// calculateSaju orchestration tests

// 골든 케이스: 2026-08-20 14:30 KST, 시간 앎
// 기대값: 년주 병오, 월주 병신, 일주 병인, 시주 을미 (Task 1~4 테스트로 개별 검증된 값의 조합)
const result = calculateSaju({ year: 2026, month: 8, day: 20, hour: 14, minute: 30, timeUnknown: false });
assert.strictEqual(pillarLabel(result.year), '병오');
assert.strictEqual(pillarLabel(result.month), '병신');
assert.strictEqual(pillarLabel(result.day), '병인');
assert.strictEqual(pillarLabel(result.hour), '을미');
assert.strictEqual(result.sajuYear, 2026);

// 시간 모름 -> hour는 null, 나머지 3주는 동일하게 계산됨
const resultUnknown = calculateSaju({ year: 2026, month: 8, day: 20, timeUnknown: true });
assert.strictEqual(resultUnknown.hour, null);
assert.strictEqual(pillarLabel(resultUnknown.year), '병오');
assert.strictEqual(pillarLabel(resultUnknown.day), '병인');

// 입춘 경계 테스트: 2026년 입춘은 2/4 KST. 그 전날(2/2)은 전년도(2025=을사년) 기준,
// 입춘 당일 이후(2/4)는 2026년(병오년) 기준이어야 함
const beforeIpchun = calculateSaju({ year: 2026, month: 2, day: 2, hour: 12, minute: 0, timeUnknown: false });
assert.strictEqual(pillarLabel(beforeIpchun.year), '을사');
const afterIpchun = calculateSaju({ year: 2026, month: 2, day: 4, hour: 12, minute: 0, timeUnknown: false });
assert.strictEqual(pillarLabel(afterIpchun.year), '병오');

console.log('All saju-calc calculateSaju tests passed');

// Element counts and balance classification tests

// 골든 케이스(2026-08-20 14:30)의 4주: 병오/병신/병인/을미
// 천간 병병병을(화화화목), 지지 오신인미(화금목토) -> 목2 화4 토1 금1 수0
const goldenPillars = calculateSaju({ year: 2026, month: 8, day: 20, hour: 14, minute: 30, timeUnknown: false });
const counts = getElementCounts(goldenPillars);
assert.deepStrictEqual(counts, { 목: 2, 화: 4, 토: 1, 금: 1, 수: 0 });

const balance = classifyElementBalance(counts);
assert.strictEqual(balance.state, 'excess');
assert.strictEqual(balance.element, '화');

// 시간 모름 -> 6글자만 집계 (hour 없음)
const noHourPillars = calculateSaju({ year: 2026, month: 8, day: 20, timeUnknown: true });
const noHourCounts = getElementCounts(noHourPillars);
const total = Object.keys(noHourCounts).reduce(function (sum, k) { return sum + noHourCounts[k]; }, 0);
assert.strictEqual(total, 6);

// 완전 균형 케이스(가상 데이터)로 balanced 분류 확인
const balanced = classifyElementBalance({ 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 });
assert.strictEqual(balanced.state, 'balanced');

console.log('All saju-calc element balance tests passed');

// Daeun (10-year luck cycle) tests

// 골든 케이스: 2026년 병오년(년간 병=idx2, 양간) + 남성 -> 순행(1)
assert.strictEqual(getDaeunDirection(2, 'male'), 1);
// 같은 년간 + 여성 -> 역행(-1)
assert.strictEqual(getDaeunDirection(2, 'female'), -1);
// 음간(을=idx1) + 남성 -> 역행(-1), + 여성 -> 순행(1)
assert.strictEqual(getDaeunDirection(1, 'male'), -1);
assert.strictEqual(getDaeunDirection(1, 'female'), 1);

const golden = calculateSaju({ year: 2026, month: 8, day: 20, hour: 14, minute: 30, timeUnknown: false });
const direction = getDaeunDirection(golden.year.stemIdx, 'male');
const startAge = getDaeunStartAge(golden.instant, golden.monthOffset, direction);
assert.ok(startAge >= 0 && startAge <= 10, '대운수는 보통 0~10 사이: got ' + startAge);

const daeunList = getDaeunList(golden.month.stemIdx, golden.month.branchIdx, direction, startAge);
assert.strictEqual(daeunList.length, 9);
assert.strictEqual(daeunList[0].startAge, startAge);
assert.strictEqual(daeunList[0].endAge, startAge + 9);
assert.strictEqual(daeunList[1].startAge, startAge + 10);
// 순행이므로 월주(병신, stemIdx2/branchIdx8)에서 다음 갑자로 진행: 정유(stemIdx3/branchIdx9)
assert.strictEqual(daeunList[0].stemIdx, 3);
assert.strictEqual(daeunList[0].branchIdx, 9);

console.log('All saju-calc daeun tests passed');

// getSeunList: 알려진 연도의 간지와 반환 필드
assert.deepStrictEqual(getSeunList(1984, 1), [{ year: 1984, stemIdx: 0, branchIdx: 0 }]);
assert.strictEqual(pillarLabel(getSeunList(1984, 1)[0]), '갑자');
const seunGoldenList = getSeunList(2024, 3);
assert.deepStrictEqual(seunGoldenList.map(function (p) { return p.year; }), [2024, 2025, 2026]);
assert.deepStrictEqual(seunGoldenList.map(pillarLabel), ['갑진', '을사', '병오']);

// 10개 연도가 연속하며 계해에서 갑자로 천간과 지지가 함께 순환
const seunTenYears = getSeunList(1983, 10);
assert.strictEqual(seunTenYears.length, 10);
assert.deepStrictEqual(seunTenYears.map(function (p) { return p.year; }),
  [1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992]);
assert.deepStrictEqual(seunTenYears.map(pillarLabel),
  ['계해', '갑자', '을축', '병인', '정묘', '무진', '기사', '경오', '신미', '임신']);
assert.deepStrictEqual(getSeunList(2024, 0), []);

console.log('All getSeunList tests passed');

// getStemElement: 천간 인덱스 -> 오행
assert.strictEqual(getStemElement(0), '목'); // 갑
assert.strictEqual(getStemElement(2), '화'); // 병
assert.strictEqual(getStemElement(4), '토'); // 무
assert.strictEqual(getStemElement(6), '금'); // 경
assert.strictEqual(getStemElement(8), '수'); // 임

console.log('All getStemElement tests passed');

// getSipsin: 일간 대비 대상 천간의 십성
// 일간 갑(0,목,양) 기준
assert.strictEqual(getSipsin(0, 0), '비견'); // 갑 vs 갑: 같은오행, 같은음양
assert.strictEqual(getSipsin(0, 2), '식신'); // 갑 vs 병(화): 목생화, 둘다양
assert.strictEqual(getSipsin(0, 3), '상관'); // 갑 vs 정(화,음): 목생화, 음양다름
assert.strictEqual(getSipsin(0, 6), '편관'); // 갑 vs 경(금,양): 금극목이므로 관성
assert.strictEqual(getSipsin(0, 7), '정관'); // 갑 vs 신(금,음): 금극목이므로 관성
assert.strictEqual(getSipsin(0, 4), '편재'); // 갑 vs 무(토,양): 목극토이므로 재성
assert.strictEqual(getSipsin(0, 9), '정인'); // 갑 vs 계(수,음): 수생목

// 사용자가 준 스크린샷 예시로 교차검증 (일간 임=8, 수, 양)
assert.strictEqual(getSipsin(8, 8), '비견');
assert.strictEqual(getSipsin(8, 6), '편인'); // 임 vs 경(금,양): 금생수, 같은음양
assert.strictEqual(getSipsin(8, 2), '편재'); // 임 vs 병(화,양): 수극화, 같은음양
assert.strictEqual(getSipsin(8, 4), '편관'); // 임 vs 무(토,양): 토극수, 같은음양

console.log('All getSipsin tests passed');

// getJijanggan: 지지의 정기 지장간(천간 인덱스)
assert.strictEqual(CHEONGAN[getJijanggan(0)], '계'); // 자
assert.strictEqual(CHEONGAN[getJijanggan(1)], '기'); // 축
assert.strictEqual(CHEONGAN[getJijanggan(2)], '갑'); // 인
assert.strictEqual(CHEONGAN[getJijanggan(3)], '을'); // 묘
assert.strictEqual(CHEONGAN[getJijanggan(4)], '무'); // 진
assert.strictEqual(CHEONGAN[getJijanggan(5)], '병'); // 사
assert.strictEqual(CHEONGAN[getJijanggan(6)], '정'); // 오
assert.strictEqual(CHEONGAN[getJijanggan(7)], '기'); // 미
assert.strictEqual(CHEONGAN[getJijanggan(8)], '경'); // 신
assert.strictEqual(CHEONGAN[getJijanggan(9)], '신'); // 유
assert.strictEqual(CHEONGAN[getJijanggan(10)], '무'); // 술
assert.strictEqual(CHEONGAN[getJijanggan(11)], '임'); // 해

console.log('All getJijanggan tests passed');

// getTwelveLifeStage: 일간 기준 대상 지지의 12운성
// 일간 임(8,수,양)의 장생지는 신(8). 순행(양간)이므로 신에서 시작해 지지 순서대로 진행.
assert.strictEqual(getTwelveLifeStage(8, 8), '장생'); // 신
assert.strictEqual(getTwelveLifeStage(8, 4), '묘');   // 진 (스크린샷 일주 예시)
assert.strictEqual(getTwelveLifeStage(8, 10), '관대'); // 술 (스크린샷 월주 예시)
assert.strictEqual(getTwelveLifeStage(8, 0), '제왕');  // 자 (스크린샷 년주 예시)

// 음간(역행) 방향도 확인 — 위 테스트는 전부 양간(임)만 다뤘음
assert.strictEqual(getTwelveLifeStage(1, 6), '장생'); // 을(1,음목)의 장생지는 오(6), 역행
assert.strictEqual(getTwelveLifeStage(1, 5), '목욕'); // 을 기준 사(5)는 장생 한 칸 전(역행이므로 -1 방향)
assert.strictEqual(getTwelveLifeStage(9, 3), '장생'); // 계(9,음수)의 장생지는 묘(3), 역행
assert.strictEqual(getTwelveLifeStage(5, 9), '장생'); // 기(5,음토, 화토동법으로 정과 동일)의 장생지는 유(9), 역행

console.log('All getTwelveLifeStage tests passed');

// getGanjiIndex / getNapjeong
assert.strictEqual(getGanjiIndex(0, 0), 0); // 갑자
assert.strictEqual(getGanjiIndex(1, 1), 1); // 을축
assert.strictEqual(getGanjiIndex(8, 4), 28); // 임진

// 스크린샷 예시 4개 전부 대조
assert.strictEqual(getNapjeong(4, 8), '대역토'); // 무신(시주)
assert.strictEqual(getNapjeong(8, 4), '장류수'); // 임진(일주)
assert.strictEqual(getNapjeong(2, 10), '옥상토'); // 병술(월주)
assert.strictEqual(getNapjeong(6, 0), '벽상토'); // 경자(년주)

console.log('All getNapjeong tests passed');

// isChungBranchPair: 지지 충 판정 (자오/축미/인신/묘유/진술/사해)
assert.strictEqual(isChungBranchPair(0, 6), true);  // 자-오
assert.strictEqual(isChungBranchPair(1, 7), true);  // 축-미
assert.strictEqual(isChungBranchPair(4, 10), true); // 진-술
assert.strictEqual(isChungBranchPair(6, 0), true);  // 순서 바뀌어도 true
assert.strictEqual(isChungBranchPair(0, 1), false); // 자-축은 충 아님
assert.strictEqual(isChungBranchPair(4, 8), false); // 진-신은 충 아님

console.log('All isChungBranchPair tests passed');

// 골든케이스: 2020-10-16 16:00 KST 출생 (사용자 제공 스크린샷 예시)
// 기대 명식: 년주 경자, 월주 병술, 일주 임진, 시주 무신
const screenshotCase = calculateSaju({ year: 2020, month: 10, day: 16, hour: 16, minute: 0, timeUnknown: false });

assert.strictEqual(CHEONGAN[screenshotCase.year.stemIdx] + JIJI[screenshotCase.year.branchIdx], '경자');
assert.strictEqual(CHEONGAN[screenshotCase.month.stemIdx] + JIJI[screenshotCase.month.branchIdx], '병술');
assert.strictEqual(CHEONGAN[screenshotCase.day.stemIdx] + JIJI[screenshotCase.day.branchIdx], '임진');
assert.strictEqual(CHEONGAN[screenshotCase.hour.stemIdx] + JIJI[screenshotCase.hour.branchIdx], '무신');

const dayStemIdx = screenshotCase.day.stemIdx;

// 십성(천간): 일주는 자기 자신이라 getSipsin 대상 아님
assert.strictEqual(getSipsin(dayStemIdx, screenshotCase.year.stemIdx), '편인');
assert.strictEqual(getSipsin(dayStemIdx, screenshotCase.month.stemIdx), '편재');
assert.strictEqual(getSipsin(dayStemIdx, screenshotCase.hour.stemIdx), '편관');

// 십성(지지, 정기 기준) — 일지(辰)는 스크린샷(상관)과 다르게 정기 기준 정답인 편관으로 검증한다.
// (설계 문서 참고: 스크린샷은 일지에 한해 초기 지장간을 쓴 것으로 보이는 고급 유파 규칙이라, 이번 스코프의
// "정기만" 방침과는 다른 값이 나온다. 우리는 정기 기준으로 일관되게 간다.)
assert.strictEqual(getSipsin(dayStemIdx, getJijanggan(screenshotCase.year.branchIdx)), '겁재');
assert.strictEqual(getSipsin(dayStemIdx, getJijanggan(screenshotCase.month.branchIdx)), '편관');
assert.strictEqual(getSipsin(dayStemIdx, getJijanggan(screenshotCase.day.branchIdx)), '편관');
assert.strictEqual(getSipsin(dayStemIdx, getJijanggan(screenshotCase.hour.branchIdx)), '편인');

// 지장간(정기)
assert.strictEqual(CHEONGAN[getJijanggan(screenshotCase.year.branchIdx)], '계');
assert.strictEqual(CHEONGAN[getJijanggan(screenshotCase.month.branchIdx)], '무');
assert.strictEqual(CHEONGAN[getJijanggan(screenshotCase.day.branchIdx)], '무');
assert.strictEqual(CHEONGAN[getJijanggan(screenshotCase.hour.branchIdx)], '경');

// 12운성
assert.strictEqual(getTwelveLifeStage(dayStemIdx, screenshotCase.year.branchIdx), '제왕');
assert.strictEqual(getTwelveLifeStage(dayStemIdx, screenshotCase.month.branchIdx), '관대');
assert.strictEqual(getTwelveLifeStage(dayStemIdx, screenshotCase.day.branchIdx), '묘');
assert.strictEqual(getTwelveLifeStage(dayStemIdx, screenshotCase.hour.branchIdx), '장생');

// 납음오행
assert.strictEqual(getNapjeong(screenshotCase.year.stemIdx, screenshotCase.year.branchIdx), '벽상토');
assert.strictEqual(getNapjeong(screenshotCase.month.stemIdx, screenshotCase.month.branchIdx), '옥상토');
assert.strictEqual(getNapjeong(screenshotCase.day.stemIdx, screenshotCase.day.branchIdx), '장류수');
assert.strictEqual(getNapjeong(screenshotCase.hour.stemIdx, screenshotCase.hour.branchIdx), '대역토');

// 충: 이 명식에서는 일지(辰)-월지(戌) 한 쌍만 충
assert.strictEqual(isChungBranchPair(screenshotCase.day.branchIdx, screenshotCase.month.branchIdx), true);
assert.strictEqual(isChungBranchPair(screenshotCase.day.branchIdx, screenshotCase.year.branchIdx), false);
assert.strictEqual(isChungBranchPair(screenshotCase.day.branchIdx, screenshotCase.hour.branchIdx), false);
assert.strictEqual(isChungBranchPair(screenshotCase.month.branchIdx, screenshotCase.year.branchIdx), false);
assert.strictEqual(isChungBranchPair(screenshotCase.month.branchIdx, screenshotCase.hour.branchIdx), false);
assert.strictEqual(isChungBranchPair(screenshotCase.year.branchIdx, screenshotCase.hour.branchIdx), false);

console.log('All saju myeongsik detail golden-case tests passed');
