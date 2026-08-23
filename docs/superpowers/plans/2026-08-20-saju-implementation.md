# 정식 사주팔자 모드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "점집" 앱에 4번째 모드로 정식 사주팔자(년/월/일/시주 + 대운)를 추가한다. 절기 기반 천문 계산 + 음양력 대조 데이터로 정확하게 4주를 산출하고, 기존 카테고리/기간 시스템과 결합한 해설을 보여준다.

**Architecture:** 계산 로직(`js/saju-calc.js`, `js/lunar-convert.js`)과 콘텐츠(`data/saju-data.js`, `data/lunar-table.js`)를 분리하고, `index.html`/`js/app.js`에 기존 zodiac/ddi 모드와 동일한 패턴으로 통합한다. 순수 함수 기반이라 Node로 직접 테스트 가능(`node tests/*.test.js`), 브라우저에서는 `<script>` 태그로 그대로 로드된다.

**Tech Stack:** 순수 HTML/CSS/JS (빌드 도구 없음), Node.js는 테스트 실행에만 사용.

## Global Constraints

- 빌드 도구 없이 브라우저에서 `<script>` 태그로 직접 로드되어야 함 — ES 모듈(import/export) 금지, 모든 함수는 전역 선언 후 파일 하단에서 `if (typeof module !== 'undefined' && module.exports) module.exports = {...}` 패턴으로 Node 테스트에도 노출 (기존 `js/deck-logic.js` 패턴 참조)
- 모든 시각 계산은 KST(UTC+9) 기준
- 지원 출생연도 범위: 1900~2050년
- 커밋 메시지는 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`를 포함
- 테스트는 `node tests/<파일>.test.js`로 직접 실행 (프레임워크 없음, `assert` 모듈 사용, 기존 `tests/deck-logic.test.js` 패턴 참조)
- 참조 스펙: [docs/superpowers/specs/2026-08-20-saju-design.md](../specs/2026-08-20-saju-design.md)

---

## 검증된 계산 근거 (구현 전 필수 참고)

계획을 세우면서 아래 공식/데이터를 실제 값과 대조해 미리 검증했다. 각 태스크의 코드는 이 검증을 통과한 것이다.

- **일주 공식** `(JDN + 49) % 60`(0=갑자): 2026-08-01=정미, 2026-08-10=병진, 2026-08-20=병인 세 날짜를 사자사주 만세력(https://www.sazasaju.com/saju/manseryeok/iljin/2026/8)과 대조해 정확히 일치 확인.
- **년주 공식** `(연도-4)%10`, `(연도-4)%12`: 2026=병오년, 위와 같은 출처로 확인.
- **월간 오호둔 규칙**(갑기→병인월, 을경→무인월, 병신→경인월, 정임→임인월, 무계→갑인월)과 **시간 오둔법 규칙**(갑기→갑자시, 을경→병자시, 병신→무자시, 정임→경자시, 무계→임자시): 나무위키/한국민족문화대백과 등 공개 자료로 확인. 2026-08-20(입추 8/7 이후, 신월)은 년간 병(丙)에 오호둔 적용 시 병신월(丙申月)이 되는데, 사자사주가 제공한 2026년 8월 절기 정보(입추=8/7)와 조합해 계산한 결과와 정확히 일치.
- **입춘 범위**: 저정밀 태양 황경 공식(Meeus)으로 1900~2050년 전체 입춘 날짜를 계산한 결과 전부 2/3~2/5 범위 안에 들어옴을 확인(코드로 직접 실행 검증 완료).
- **음양력 대조 데이터**: usingsky/korean_lunar_calendar_js(MIT License, KASI 자료 기반, https://github.com/usingsky/korean_lunar_calendar_js )의 데이터 테이블을 그대로 사용. 포팅한 변환 함수로 "음력 2024-01-01→양력 2024-02-10", "음력 2026-01-01→양력 2026-02-17"을 계산해 실제 공개된 설날 날짜와 정확히 일치 확인.
- **대운수 반올림 규칙**: "절입일까지 일수 ÷ 3, 나머지 1이면 버림, 나머지 2면 올림" — `Math.round(일수/3)`로 정확히 구현됨을 수식으로 확인(brunch.co.kr, KNS뉴스통신 등 공개 자료로 확인).

---

### Task 1: 태양 황경 계산 + 절기 시각 역산

**Files:**
- Create: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Produces: `solarLongitude(date: Date): number` (0~360도), `findSolarTermMoment(seedInstant: Date, targetLongitude: number): Date`, `normalizeMod(n: number, m: number): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/saju-calc.test.js` 생성:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `Cannot find module '../js/saju-calc.js'`

- [ ] **Step 3: 최소 구현 작성**

`js/saju-calc.js` 생성:

```js
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc solar term tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add solar longitude and solar-term-moment calculation

Meeus low-precision solar coordinate formula plus a Newton-Raphson
solver for the exact instant of any solar term (used for 입춘/월지
boundaries later). Verified against the known Feb 3-5 range for
입춘 across 1900-2050.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 년주 + 월주 계산

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: `normalizeMod`, `solarLongitude`, `findSolarTermMoment` (Task 1)
- Produces: `CHEONGAN: string[10]`, `JIJI: string[12]`, `getYearPillar(sajuYear: number): {stemIdx, branchIdx}`, `getMonthOffset(longitude: number): number` (0~11, 0=인월), `getMonthPillar(yearStemIdx: number, monthOffset: number): {stemIdx, branchIdx}`, `findIpchun(calendarYear: number): Date`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/saju-calc.test.js`에 추가:

```js
const {
  CHEONGAN,
  JIJI,
  getYearPillar,
  getMonthOffset,
  getMonthPillar,
  findIpchun
} = require('../js/saju-calc.js');

function pillarLabel(p) { return CHEONGAN[p.stemIdx] + JIJI[p.branchIdx]; }

// 2026년 = 병오년 (사자사주 만세력 대조 확인됨)
assert.strictEqual(pillarLabel(getYearPillar(2026)), '병오');
// 2024년 = 갑진년, 2025년 = 을사년 (60갑자 순환 공식으로 자체 검증)
assert.strictEqual(pillarLabel(getYearPillar(2024)), '갑진');
assert.strictEqual(pillarLabel(getYearPillar(2025)), '을사');

// findIpchun: 2026년 입춘은 2/3 (KST)
const ipchun2026 = findIpchun(2026);
const ipchunKst = new Date(ipchun2026.getTime() + 9 * 3600000);
assert.strictEqual(ipchunKst.getUTCMonth(), 1);
assert.strictEqual(ipchunKst.getUTCDate(), 3);

// 2026-08-20은 입추(8/7) 이후 -> 신월(monthOffset=6), 년간 병(idx2) -> 오호둔으로 병신월
const longitudeAug20 = solarLongitude(new Date(Date.UTC(2026, 7, 20, 5, 30))); // KST 14:30
const monthOffset = getMonthOffset(longitudeAug20);
assert.strictEqual(monthOffset, 6, '입추~백로 사이는 monthOffset=6(신월)이어야 함');
const monthPillar = getMonthPillar(2, monthOffset); // 년간 idx2=병
assert.strictEqual(pillarLabel(monthPillar), '병신');

console.log('All saju-calc year/month pillar tests passed');
```

`solarLongitude`를 이 테스트 안에서도 쓰므로 상단 require에 `solarLongitude`를 추가한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getYearPillar is not a function` (또는 undefined)

- [ ] **Step 3: 구현 추가**

`js/saju-calc.js`의 `module.exports` 블록 위에 추가:

```js
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
```

`module.exports`에 `CHEONGAN, JIJI, getYearPillar, getMonthOffset, getMonthPillar, findIpchun`을 추가한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc year/month pillar tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add year and month pillar calculation

Year pillar from the standard (year-4)%10/%12 formula, month pillar
from the solar-longitude-derived month offset plus the 오호둔 stem
rule. Verified against 2026=병오년 and the 병신월 window after 입추.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 일주 계산 (60갑자, JDN 기반)

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Produces: `toJDN(year: number, month: number, day: number): number`, `getDayPillarIndex(year: number, month: number, day: number): number` (0~59, 0=갑자일)

- [ ] **Step 1: 실패하는 테스트 추가**

```js
const { toJDN, getDayPillarIndex } = require('../js/saju-calc.js');

function dayLabel(idx) { return CHEONGAN[idx % 10] + JIJI[idx % 12]; }

// 사자사주 만세력(2026년 8월 일진표)과 대조해 검증된 3개 날짜
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 1)), '정미');
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 10)), '병진');
assert.strictEqual(dayLabel(getDayPillarIndex(2026, 8, 20)), '병인');

console.log('All saju-calc day pillar tests passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getDayPillarIndex is not a function`

- [ ] **Step 3: 구현 추가**

```js
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
```

`module.exports`에 `toJDN, getDayPillarIndex` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc day pillar tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add day pillar calculation via JDN 60-cycle

(JDN+49)%60 gives the day's position in the 60갑자 cycle (0=갑자).
Verified against three real manseryeok reference dates (2026-08-01/
10/20 from sazasaju.com).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 시주 계산

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: `CHEONGAN`, `JIJI` (Task 2)
- Produces: `getHourBranchIndex(hour: number): number` (0~11), `getHourStemIndex(dayStemIdx: number, hourBranchIdx: number): number`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getHourBranchIndex is not a function`

- [ ] **Step 3: 구현 추가**

```js
// 자시=23:00~00:59, 이후 2시간 단위로 축인묘진사오미신유술해 순환
function getHourBranchIndex(hour) {
  return Math.floor(normalizeMod(hour + 1, 24) / 2);
}

// 오둔법: 일간의 짝(갑기/을경/병신/정임/무계)에 따라 자시의 시간이 정해짐
const HOUR_STEM_START = { 0: 0, 5: 0, 1: 2, 6: 2, 2: 4, 7: 4, 3: 6, 8: 6, 4: 8, 9: 8 };

function getHourStemIndex(dayStemIdx, hourBranchIdx) {
  return normalizeMod(HOUR_STEM_START[dayStemIdx] + hourBranchIdx, 10);
}
```

`module.exports`에 `getHourBranchIndex, getHourStemIndex` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc hour pillar tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add hour pillar calculation

2-hour branch blocks starting at 자시(23:00), stem via the 오둔법
rule keyed on the day stem. Verified against the wiki-documented
day-stem-to-hour-stem start table.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: calculateSaju() — 4주 통합 계산

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 전부 Task 1~4의 함수
- Produces: `kstDateToInstant(year, month, day, hour, minute): Date`, `getSajuYear(instant: Date, calendarYear: number): number`, `calculateSaju(input: {year, month, day, hour, minute, timeUnknown}): {year, month, day, hour|null, sajuYear, monthOffset}` (각 필드는 `{stemIdx, branchIdx}`)

- [ ] **Step 1: 실패하는 테스트 추가**

```js
const { kstDateToInstant, getSajuYear, calculateSaju } = require('../js/saju-calc.js');

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

// 입춘 경계 테스트: 2026년 입춘은 2/3 KST. 그 전날(2/2)은 전년도(2025=을사년) 기준,
// 입춘 당일 이후(2/4)는 2026년(병오년) 기준이어야 함
const beforeIpchun = calculateSaju({ year: 2026, month: 2, day: 2, hour: 12, minute: 0, timeUnknown: false });
assert.strictEqual(pillarLabel(beforeIpchun.year), '을사');
const afterIpchun = calculateSaju({ year: 2026, month: 2, day: 4, hour: 12, minute: 0, timeUnknown: false });
assert.strictEqual(pillarLabel(afterIpchun.year), '병오');

console.log('All saju-calc calculateSaju tests passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `calculateSaju is not a function`

- [ ] **Step 3: 구현 추가**

```js
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
```

`module.exports`에 `kstDateToInstant, getSajuYear, calculateSaju` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc calculateSaju tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add calculateSaju orchestration function

Ties year/month/day/hour pillar calculation together, handling the
KST-to-instant conversion, the 입춘 year-boundary crossover, and the
time-unknown case (falls back to noon for term lookups, omits the
hour pillar). Verified against a cross-checked golden date and an
explicit 입춘 boundary-crossing test.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 오행 분포 + 균형 분류

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: `calculateSaju` 결과 형태의 pillars
- Produces: `getElementCounts(pillars: {year,month,day,hour}): {목,화,토,금,수}`, `classifyElementBalance(counts): {state: 'excess'|'deficient'|'balanced', element: string|null}`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
const { getElementCounts, classifyElementBalance } = require('../js/saju-calc.js');

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
const total = Object.keys(noHourCounts).reduce((sum, k) => sum + noHourCounts[k], 0);
assert.strictEqual(total, 6);

// 완전 균형 케이스(가상 데이터)로 balanced 분류 확인
const balanced = classifyElementBalance({ 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 });
assert.strictEqual(balanced.state, 'balanced');

console.log('All saju-calc element balance tests passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getElementCounts is not a function`

- [ ] **Step 3: 구현 추가**

```js
const CHEONGAN_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const JIJI_ELEMENT = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

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
```

`module.exports`에 `getElementCounts, classifyElementBalance` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc element balance tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add five-element distribution and balance classification

Counts 목화토금수 across the 8 (or 6, when time is unknown) pillar
characters and classifies the reading as excess/deficient/balanced
for the interpretation modifier.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 대운 계산

**Files:**
- Modify: `js/saju-calc.js`
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: `calculateSaju` 결과(`monthOffset`, `instant`, `year.stemIdx`), `findSolarTermMoment`
- Produces: `getDaeunDirection(yearStemIdx: number, gender: 'male'|'female'): 1|-1`, `getDaeunStartAge(instant, monthOffset, direction): number`, `getDaeunList(monthStemIdx, monthBranchIdx, direction, startAge): Array<{stemIdx, branchIdx, startAge, endAge}>`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
const { getDaeunDirection, getDaeunStartAge, getDaeunList } = require('../js/saju-calc.js');

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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getDaeunDirection is not a function`

- [ ] **Step 3: 구현 추가**

```js
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
```

`module.exports`에 `getDaeunDirection, getDaeunStartAge, getDaeunList` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS — `All saju-calc daeun tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add daeun (10-year luck cycle) calculation

Direction from year-stem yin/yang + gender, start age from days to
the nearest term boundary divided by 3, and a 9-period ganzi
sequence stepping from the month pillar. Verified direction flips
correctly across all four yang/yin x gender combinations.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 음력 변환 (음양력 대조 데이터 + 변환 함수)

**Files:**
- Create: `data/lunar-table.js`
- Create: `js/lunar-convert.js`
- Create: `tests/lunar-convert.test.js`

**Interfaces:**
- Consumes: 없음 (독립 모듈)
- Produces: `LUNAR_TABLE_DATA: object` (데이터 전용), `lunarToSolar(lunarYear, lunarMonth, lunarDay, isIntercalation): {year,month,day} | null`

- [ ] **Step 1: 데이터 파일 작성**

`data/lunar-table.js` 생성 (출처: usingsky/korean_lunar_calendar_js, MIT License, Copyright (c) 2022 Jinil Lee, https://github.com/usingsky/korean_lunar_calendar_js — 한국천문연구원(KASI) 음양력 자료 기반. 1000~2050년 전체 범위를 그대로 포팅했으며, 앱에서는 1900~2050년만 사용):

```js
// 1000~2050년 음양력 대조 데이터
// 출처: usingsky/korean_lunar_calendar_js (MIT License, Copyright (c) 2022 Jinil Lee)
// https://github.com/usingsky/korean_lunar_calendar_js — 한국천문연구원(KASI) 음양력 자료 기반
const LUNAR_TABLE_DATA = {
  BASE_YEAR: 1000,
  SOLAR_LUNAR_DAY_DIFF: 43,
  LUNAR_SMALL_MONTH_DAY: 29,
  LUNAR_BIG_MONTH_DAY: 30,
  SOLAR_SMALL_YEAR_DAY: 365,
  SOLAR_BIG_YEAR_DAY: 366,
  SOLAR_DAYS: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 29],
  DATA: [
    0x82c60a57, 0x82fec52b, 0x82c40d2a, 0x82c60d55, 0xc30095ad, 0x82c4056a, 0x82c6096d, 0x830054dd,
    0xc2c404ad, 0x82c40a4d, 0x83002e4d, 0x82c40b26, 0xc300ab56, 0x82c60ad5, 0x82c4035a, 0x8300697a,
    0xc2c6095b, 0x82c4049b, 0x83004a9b, 0x82c40a4b, 0xc301caa5, 0x82c406aa, 0x82c60ad5, 0x830092dd,
    0xc2c402b5, 0x82c60957, 0x82fe54ae, 0x82c60c97, 0xc2c4064b, 0x82ff254a, 0x82c60da9, 0x8300a6b6,
    0xc2c6066d, 0x82c4026e, 0x8301692e, 0x82c4092e, 0xc2c40c96, 0x83004d95, 0x82c40d4a, 0x8300cd69,
    0xc2c40b58, 0x82c80d6b, 0x8301926b, 0x82c4025d, 0xc2c4092b, 0x83005aab, 0x82c40a95, 0x82c40b4a,
    0xc3021eab, 0x82c402d5, 0x8301b55a, 0x82c604bb, 0xc2c4025b, 0x83007537, 0x82c4052b, 0x82c40695,
    0xc3003755, 0x82c406aa, 0x8303cab5, 0x82c40275, 0xc2c404b6, 0x83008a5e, 0x82c40a56, 0x82c40d26,
    0xc3005ea6, 0x82c60d55, 0x82c405aa, 0x83001d6a, 0xc2c6096d, 0x8300b4af, 0x82c4049d, 0x82c40a4d,
    0xc3007d2d, 0x82c40aa6, 0x82c60b55, 0x830045d5, 0xc2c4035a, 0x82c6095d, 0x83011173, 0x82c4045b,
    0xc3009a4f, 0x82c4064b, 0x82c40aa5, 0x83006b69, 0xc2c606b5, 0x82c402da, 0x83002ab6, 0x82c60937,
    0xc2fec497, 0x82c60c97, 0x82c4064b, 0x82fe86aa, 0xc2c60da5, 0x82c405b4, 0x83034a6d, 0x82c402ae,
    0xc2c40e61, 0x83002d2e, 0x82c40c96, 0x83009d4d, 0x82c40d4a, 0x82c60d65, 0x83016595, 0x82c6055d,
    0xc2c4026d, 0x83002a5d, 0x82c4092b, 0x8300aa97, 0xc2c40a95, 0x82c40b4a, 0x83008b5a, 0x82c60ad5,
    0xc2c6055b, 0x830042b7, 0x82c40457, 0x82c4052b, 0xc3001d2b, 0x82c40695, 0x8300972d, 0x82c405aa,
    0xc2c60ab5, 0x830054ed, 0x82c404b6, 0x82c60a57, 0xc2ff344e, 0x82c40d26, 0x8301be92, 0x82c60d55,
    0xc2c405aa, 0x830089ba, 0x82c6096d, 0x82c404ae, 0xc3004a9d, 0x82c40a4d, 0x82c40d25, 0x83002f25,
    0xc2c40b54, 0x8303ad69, 0x82c402da, 0x82c6095d, 0xc301649b, 0x82c4049b, 0x82c40a4b, 0x83004b4b,
    0xc2c406a5, 0x8300bb53, 0x82c406b4, 0x82c60ab6, 0xc3018956, 0x82c60997, 0x82c40497, 0x83004697,
    0xc2c4054b, 0x82fec6a5, 0x82c60da5, 0x82c405ac, 0xc303aab5, 0x82c4026e, 0x82c4092e, 0x83006cae,
    0xc2c40c96, 0x82c40d4a, 0x83002f4a, 0x82c60d55, 0xc300b56b, 0x82c6055b, 0x82c4025d, 0x8300793d,
    0xc2c40927, 0x82c40a95, 0x83015d15, 0x82c40b4a, 0xc2c60b55, 0x830112d5, 0x82c604db, 0x82fe925e,
    0xc2c60a57, 0x82c4052b, 0x83006aab, 0x82c40695, 0xc2c406aa, 0x83003baa, 0x82c60ab5, 0x8300b4b7,
    0xc2c404ae, 0x82c60a57, 0x82fe752e, 0x82c40d26, 0xc2c60e93, 0x830056d5, 0x82c405aa, 0x82c609b5,
    0xc300256d, 0x82c404ae, 0x8301aa4d, 0x82c40a4d, 0xc2c40d26, 0x83006d65, 0x82c40b52, 0x82c60d6a,
    0xc30026da, 0x82c6095d, 0x8301c49d, 0x82c4049b, 0xc2c40a4b, 0x83008aab, 0x82c406a5, 0x82c40b54,
    0xc3004bb4, 0x82c60ab6, 0x82c6095b, 0x83002537, 0xc2c40497, 0x8300964f, 0x82c4054b, 0x82c406a5,
    0xc30176c5, 0x82c405ac, 0x82c60ab6, 0x8301386e, 0xc2c4092e, 0x8300cc97, 0x82c40c96, 0x82c40d4a,
    0xc3008daa, 0x82c60b55, 0x82c4056a, 0x83025adb, 0xc2c4025d, 0x82c4092e, 0x83002d2b, 0x82c40a95,
    0xc3009d4d, 0x82c40b2a, 0x82c60b55, 0x83007575, 0xc2c404da, 0x82c60a5b, 0x83004557, 0x82c4052b,
    0xc301ca93, 0x82c40693, 0x82c406aa, 0x83008ada, 0xc2c60ae5, 0x82c404b6, 0x83004aae, 0x82c60a57,
    0xc2c40527, 0x82ff2526, 0x82c60e53, 0x8300a6cb, 0xc2c405aa, 0x82c605ad, 0x830164ad, 0x82c404ae,
    0xc2c40a4e, 0x83004d4d, 0x82c40d26, 0x8300bd53, 0xc2c40b52, 0x82c60b6a, 0x8301956a, 0x82c60557,
    0xc2c4049d, 0x83015a1b, 0x82c40a4b, 0x82c40aa5, 0xc3001ea5, 0x82c40b52, 0x8300bb5a, 0x82c60ab6,
    0xc2c6095b, 0x830064b7, 0x82c40497, 0x82c4064b, 0xc300374b, 0x82c406a5, 0x8300b6b3, 0x82c405ac,
    0xc2c60ab6, 0x830182ad, 0x82c4049e, 0x82c40a4d, 0xc3005d4b, 0x82c40b25, 0x82c40b52, 0x83012e52,
    0xc2c60b5a, 0x8300a95e, 0x82c6095b, 0x82c4049b, 0xc3006a57, 0x82c40a4b, 0x82c40aa5, 0x83004ba5,
    0xc2c406d4, 0x8300cad6, 0x82c60ab6, 0x82c60937, 0x8300849f, 0x82c40497, 0x82c4064b, 0x82fe56ca,
    0xc2c60da5, 0x82c405aa, 0x83001d6c, 0x82c60a6e, 0xc300b92f, 0x82c4092e, 0x82c40c96, 0x83007d55,
    0xc2c40d4a, 0x82c60d55, 0x83013555, 0x82c4056a, 0xc2c60a6d, 0x83001a5d, 0x82c4092b, 0x83008a5b,
    0xc2c40a95, 0x82c40b2a, 0x83015b2a, 0x82c60ad5, 0xc2c404da, 0x83001cba, 0x82c60a57, 0x8300952f,
    0xc2c40527, 0x82c40693, 0x830076b3, 0x82c406aa, 0xc2c60ab5, 0x83003575, 0x82c404b6, 0x8300ca67,
    0xc2c40a2e, 0x82c40d16, 0x83008e96, 0x82c40d4a, 0xc2c60daa, 0x830055ea, 0x82c6056d, 0x82c404ae,
    0xc301285d, 0x82c40a2d, 0x8300ad17, 0x82c40aa5, 0xc2c40b52, 0x83007d74, 0x82c60ada, 0x82c6055d,
    0xc300353b, 0x82c4045b, 0x82c40a2b, 0x83011a2b, 0xc2c40aa5, 0x83009b55, 0x82c406b2, 0x82c60ad6,
    0xc3015536, 0x82c60937, 0x82c40457, 0x83003a57, 0xc2c4052b, 0x82feaaa6, 0x82c60d95, 0x82c405aa,
    0xc3017aac, 0x82c60a6e, 0x82c4052e, 0x83003cae, 0xc2c40a56, 0x8300bd2b, 0x82c40d2a, 0x82c60d55,
    0xc30095ad, 0x82c4056a, 0x82c60a6d, 0x8300555d, 0xc2c4052b, 0x82c40a8d, 0x83002e55, 0x82c40b2a,
    0xc300ab56, 0x82c60ad5, 0x82c404da, 0x83006a7a, 0xc2c60a57, 0x82c4051b, 0x83014a17, 0x82c40653,
    0xc301c6a9, 0x82c405aa, 0x82c60ab5, 0x830092bd, 0xc2c402b6, 0x82c60a37, 0x82fe552e, 0x82c40d16,
    0x82c60e4b, 0x82fe3752, 0x82c60daa, 0x8301b5b4, 0xc2c6056d, 0x82c402ae, 0x83007a3d, 0x82c40a2d,
    0xc2c40d15, 0x83004d95, 0x82c40b52, 0x8300cb69, 0xc2c60ada, 0x82c6055d, 0x8301925b, 0x82c4045b,
    0xc2c40a2b, 0x83005aab, 0x82c40a95, 0x82c40b52, 0xc3001eaa, 0x82c60ab6, 0x8300c55b, 0x82c604b7,
    0xc2c40457, 0x83007537, 0x82c4052b, 0x82c40695, 0xc3014695, 0x82c405aa, 0x8300cab5, 0x82c60a6e,
    0xc2c404ae, 0x83008a5e, 0x82c40a56, 0x82c40d2a, 0xc3006eaa, 0x82c60d55, 0x82c4056a, 0x8301295a,
    0xc2c6095d, 0x8300b4af, 0x82c4049b, 0x82c40a4d, 0xc3007d2d, 0x82c40b2a, 0x82c60b55, 0x830045d5,
    0xc2c402da, 0x82c6095b, 0x83011157, 0x82c4049b, 0xc3009a4f, 0x82c4064b, 0x82c406a9, 0x83006aea,
    0xc2c606b5, 0x82c402b6, 0x83002aae, 0x82c60937, 0xc2ffb496, 0x82c40c96, 0x82c60e4b, 0x82fe76b2,
    0xc2c60daa, 0x82c605ad, 0x8300336d, 0x82c4026e, 0xc2c4092e, 0x83002d2d, 0x82c40c95, 0x83009d4d,
    0xc2c40b4a, 0x82c60b69, 0x8301655a, 0x82c6055b, 0xc2c4025d, 0x83002a5b, 0x82c4092b, 0x8300aa97,
    0xc2c40695, 0x82c4074a, 0x83008b5a, 0x82c60ab6, 0xc2c6053b, 0x830042b7, 0x82c40257, 0x82c4052b,
    0xc3001d2b, 0x82c40695, 0x830096ad, 0x82c405aa, 0xc2c60ab5, 0x830054ed, 0x82c404ae, 0x82c60a57,
    0xc2ff344e, 0x82c40d2a, 0x8301bd94, 0x82c60b55, 0x82c4056a, 0x8300797a, 0x82c6095d, 0x82c404ae,
    0xc3004a9b, 0x82c40a4d, 0x82c40d25, 0x83011aaa, 0xc2c60b55, 0x8300956d, 0x82c402da, 0x82c6095b,
    0xc30054b7, 0x82c40497, 0x82c40a4b, 0x83004b4b, 0xc2c406a9, 0x8300cad5, 0x82c605b5, 0x82c402b6,
    0xc300895e, 0x82c6092f, 0x82c40497, 0x82fe4696, 0xc2c40d4a, 0x8300cea5, 0x82c60d69, 0x82c6056d,
    0xc301a2b5, 0x82c4026e, 0x82c4092e, 0x83006cad, 0xc2c40c95, 0x82c40d4a, 0x83002f4a, 0x82c60b59,
    0xc300c56d, 0x82c6055b, 0x82c4025d, 0x8300793b, 0xc2c4092b, 0x82c40a95, 0x83015b15, 0x82c406ca,
    0xc2c60ad5, 0x830112b6, 0x82c604bb, 0x8300925f, 0xc2c40257, 0x82c4052b, 0x82fe6aaa, 0x82c60e95,
    0xc2c406aa, 0x83003baa, 0x82c60ab5, 0x8300b4b7, 0xc2c404ae, 0x82c60a57, 0x82fe752d, 0x82c40d26,
    0xc2c60d95, 0x830055d5, 0x82c4056a, 0x82c6096d, 0xc300255d, 0x82c404ae, 0x8300aa4f, 0x82c40a4d,
    0xc2c40d25, 0x83006d69, 0x82c60b55, 0x82c4035a, 0xc3002aba, 0x82c6095b, 0x8301c49b, 0x82c40497,
    0xc2c40a4b, 0x83008b2b, 0x82c406a5, 0x82c406d4, 0xc3034ab5, 0x82c402b6, 0x82c60937, 0x8300252f,
    0xc2c40497, 0x82fe964e, 0x82c40d4a, 0x82c60ea5, 0xc30166a9, 0x82c6056d, 0x82c402b6, 0x8301385e,
    0xc2c4092e, 0x8300bc97, 0x82c40a95, 0x82c40d4a, 0xc3008daa, 0x82c60b4d, 0x82c6056b, 0x830042db,
    0xc2c4025d, 0x82c4092d, 0x83002d2b, 0x82c40a95, 0xc3009b4d, 0x82c406aa, 0x82c60ad5, 0x83006575,
    0xc2c604bb, 0x82c4025b, 0x83013457, 0x82c4052b, 0xc2ffba94, 0x82c60e95, 0x82c406aa, 0x83008ada,
    0xc2c609b5, 0x82c404b6, 0x83004aae, 0x82c60a4f, 0xc2c20526, 0x83012d26, 0x82c60d55, 0x8301a5a9,
    0xc2c4056a, 0x82c6096d, 0x8301649d, 0x82c4049e, 0xc2c40a4d, 0x83004d4d, 0x82c40d25, 0x8300bd53,
    0xc2c40b54, 0x82c60b5a, 0x8301895a, 0x82c6095b, 0xc2c4049b, 0x83004a97, 0x82c40a4b, 0x82c40aa5,
    0xc3001ea5, 0x82c406d4, 0x8302badb, 0x82c402b6, 0xc2c60937, 0x830064af, 0x82c40497, 0x82c4064b,
    0xc2fe374a, 0x82c60da5, 0x8300b6b5, 0x82c6056d, 0xc2c402ae, 0x8300793e, 0x82c4092e, 0x82c40c96,
    0xc3015d15, 0x82c40d4a, 0x82c60da5, 0x83013555, 0xc2c4056a, 0x83007a7a, 0x82c60a5d, 0x82c4092d,
    0xc3006aab, 0x82c40a95, 0x82c40b4a, 0x83004baa, 0xc2c60ad5, 0x82c4055a, 0x830128ba, 0x82c60a5b,
    0xc3007537, 0x82c4052b, 0x82c40693, 0x83015715, 0xc2c406aa, 0x82c60ad5, 0x830035b5, 0x82c404b6,
    0xc3008a5e, 0x82c40a4e, 0x82c40d26, 0x83006ea6, 0xc2c40d52, 0x82c60daa, 0x8301466a, 0x82c6056d,
    0xc2c404ae, 0x83003a9d, 0x82c40a4d, 0x83007d2b, 0xc2c40b25, 0x82c40d52, 0x83015d54, 0x82c60b5a,
    0xc2c6055d, 0x8300355b, 0x82c4049b, 0x83007657, 0x82c40a4b, 0x82c40aa5, 0x83006b65, 0x82c406d2,
    0xc2c60ada, 0x830045b6, 0x82c60937, 0x82c40497, 0xc3003697, 0x82c4064d, 0x82fe76aa, 0x82c60da5,
    0xc2c405aa, 0x83005aec, 0x82c60aae, 0x82c4092e, 0xc3003d2e, 0x82c40c96, 0x83018d45, 0x82c40d4a,
    0xc2c60d55, 0x83016595, 0x82c4056a, 0x82c60a6d, 0xc300455d, 0x82c4052d, 0x82c40a95, 0x83013c95,
    0xc2c40b4a, 0x83017b4a, 0x82c60ad5, 0x82c4055a, 0xc3015a3a, 0x82c60a5b, 0x82c4052b, 0x83014a17,
    0xc2c40693, 0x830096ab, 0x82c406aa, 0x82c60ab5, 0xc30064f5, 0x82c404b6, 0x82c60a57, 0x82fe452e,
    0xc2c40d16, 0x82c60e93, 0x82fe3752, 0x82c60daa, 0xc30175aa, 0x82c6056d, 0x82c404ae, 0x83015a1d,
    0xc2c40a2d, 0x82c40d15, 0x83004da5, 0x82c40b52, 0xc3009d6a, 0x82c60ada, 0x82c6055d, 0x8301629b,
    0xc2c4045b, 0x82c40a2b, 0x83005b2b, 0x82c40a95, 0xc2c40b52, 0x83012ab2, 0x82c60ad6, 0x83017556,
    0xc2c60537, 0x82c40457, 0x83005657, 0x82c4052b, 0xc2c40695, 0x83003795, 0x82c405aa, 0x8300aab6,
    0xc2c60a6d, 0x82c404ae, 0x83006a6e, 0x82c40a56, 0xc2c40d2a, 0x83005eaa, 0x82c60d55, 0x82c405aa,
    0xc3003b6a, 0x82c60a6d, 0x830074bd, 0x82c404ab, 0xc2c40a8d, 0x83005d55, 0x82c40b2a, 0x82c60b55,
    0xc30045d5, 0x82c404da, 0x82c6095d, 0x83002557, 0xc2c4049b, 0x83006a97, 0x82c4064b, 0x82c406a9,
    0x83004baa, 0x82c606b5, 0x82c402ba, 0x83002ab6, 0xc2c60937, 0x82fe652e, 0x82c40d16, 0x82c60e4b,
    0xc2fe56d2, 0x82c60da9, 0x82c605b5, 0x8300336d, 0xc2c402ae, 0x82c40a2e, 0x83002e2d, 0x82c40c95,
    0xc3006d55, 0x82c40b52, 0x82c60b69, 0x830045da, 0xc2c6055d, 0x82c4025d, 0x83003a5b, 0x82c40a2b,
    0xc3017a8b, 0x82c40a95, 0x82c40b4a, 0x83015b2a, 0xc2c60ad5, 0x82c6055b, 0x830042b7, 0x82c40257,
    0xc300952f, 0x82c4052b, 0x82c40695, 0x830066d5, 0xc2c405aa, 0x82c60ab5, 0x8300456d, 0x82c404ae,
    0xc2c60a57, 0x82ff3456, 0x82c40d2a, 0x83017e8a, 0xc2c60d55, 0x82c405aa, 0x83005ada, 0x82c6095d,
    0xc2c404ae, 0x83004aab, 0x82c40a4d, 0x83008d2b, 0xc2c40b29, 0x82c60b55, 0x83007575, 0x82c402da,
    0xc2c6095d, 0x830054d7, 0x82c4049b, 0x82c40a4b, 0xc3013a4b, 0x82c406a9, 0x83008ad9, 0x82c606b5,
    0xc2c402b6, 0x83015936, 0x82c60937, 0x82c40497, 0xc2fe4696, 0x82c40e4a, 0x8300aea6, 0x82c60da9,
    0xc2c605ad, 0x830162ad, 0x82c402ae, 0x82c4092e, 0xc3005cad, 0x82c40c95, 0x82c40d4a, 0x83013d4a,
    0xc2c60b69, 0x8300757a, 0x82c6055b, 0x82c4025d, 0xc300595b, 0x82c4092b, 0x82c40a95, 0x83004d95,
    0xc2c40b4a, 0x82c60b55, 0x830026d5, 0x82c6055b, 0xc3006277, 0x82c40257, 0x82c4052b, 0x82fe5aaa,
    0xc2c60e95, 0x82c406aa, 0x83003baa, 0x82c60ab5, 0x830084bd, 0x82c404ae, 0x82c60a57, 0x82fe554d,
    0xc2c40d26, 0x82c60d95, 0x83014655, 0x82c4056a, 0xc2c609ad, 0x8300255d, 0x82c404ae, 0x83006a5b,
    0xc2c40a4d, 0x82c40d25, 0x83005da9, 0x82c60b55, 0xc2c4056a, 0x83002ada, 0x82c6095d, 0x830074bb,
    0xc2c4049b, 0x82c40a4b, 0x83005b4b, 0x82c406a9, 0xc2c40ad4, 0x83024bb5, 0x82c402b6, 0x82c6095b,
    0xc3002537, 0x82c40497, 0x82fe6656, 0x82c40e4a, 0xc2c60ea5, 0x830156a9, 0x82c605b5, 0x82c402b6,
    0xc30138ae, 0x82c4092e, 0x83017c8d, 0x82c40c95, 0xc2c40d4a, 0x83016d8a, 0x82c60b69, 0x82c6056d,
    0xc301425b, 0x82c4025d, 0x82c4092d, 0x83002d2b, 0xc2c40a95, 0x83007d55, 0x82c40b4a, 0x82c60b55,
    0xc3015555, 0x82c604db, 0x82c4025b, 0x83013857, 0xc2c4052b, 0x83008a9b, 0x82c40695, 0x82c406aa,
    0xc3006aea, 0x82c60ab5, 0x82c404b6, 0x83004aae, 0xc2c60a57, 0x82c40527, 0x82fe3726, 0x82c60d95,
    0xc30076b5, 0x82c4056a, 0x82c609ad, 0x830054dd, 0xc2c404ae, 0x82c40a4e, 0x83004d4d, 0x82c40d25,
    0xc3008d59, 0x82c40b54, 0x82c60d6a, 0x8301695a, 0xc2c6095b, 0x82c4049b, 0x83004a9b, 0x82c40a4b,
    0xc300ab27, 0x82c406a5, 0x82c406d4, 0x83026b75, 0xc2c402b6, 0x82c6095b, 0x830054b7, 0x82c40497,
    0xc2c4064b, 0x82fe374a, 0x82c60ea5, 0x830086d9, 0xc2c605ad, 0x82c402b6, 0x8300596e, 0x82c4092e,
    0xc2c40c96, 0x83004e95, 0x82c40d4a, 0x82c60da5, 0xc3002755, 0x82c4056c, 0x83027abb, 0x82c4025d,
    0xc2c4092d, 0x83005cab, 0x82c40a95, 0x82c40b4a, 0xc3013b4a, 0x82c60b55, 0x8300955d, 0x82c404ba,
    0xc2c60a5b, 0x83005557, 0x82c4052b, 0x82c40a95, 0xc3004b95, 0x82c406aa, 0x82c60ad5, 0x830026b5,
    0xc2c404b6, 0x83006a6e, 0x82c60a57, 0x82c40527, 0xc2fe56a6, 0x82c60d93, 0x82c405aa, 0x83003b6a,
    0xc2c6096d, 0x8300b4af, 0x82c404ae, 0x82c40a4d, 0xc3016d0d, 0x82c40d25, 0x82c40d52, 0x83005dd4,
    0xc2c60b6a, 0x82c6096d, 0x8300255b, 0x82c4049b, 0xc3007a57, 0x82c40a4b, 0x82c40b25, 0x83015b25,
    0xc2c406d4, 0x82c60ada, 0x830138b6,
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LUNAR_TABLE_DATA };
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/lunar-convert.test.js` 생성:

```js
const assert = require('assert');
const { lunarToSolar } = require('../js/lunar-convert.js');

// 공개적으로 알려진 설날(음력 1월 1일, 평달) 양력 날짜와 대조
assert.deepStrictEqual(lunarToSolar(2024, 1, 1, false), { year: 2024, month: 2, day: 10 });
assert.deepStrictEqual(lunarToSolar(2026, 1, 1, false), { year: 2026, month: 2, day: 17 });

// 범위 밖(1000년 이전 base year 밖) 입력은 null
assert.strictEqual(lunarToSolar(999, 1, 1, false), null);
assert.strictEqual(lunarToSolar(2051, 1, 1, false), null);

console.log('All lunar-convert tests passed');
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node tests/lunar-convert.test.js`
Expected: FAIL — `Cannot find module '../js/lunar-convert.js'`

- [ ] **Step 4: 구현 작성**

`js/lunar-convert.js` 생성 (usingsky/korean_lunar_calendar_js의 `setLunarDateByLunarDate`/`getLunarAbsDays`/`getSolarAbsDays` 로직을 음력→양력 단방향으로만 포팅, MIT License):

```js
function getLunarRawData(year) {
  return LUNAR_TABLE_DATA.DATA[year - LUNAR_TABLE_DATA.BASE_YEAR];
}

function getLunarIntercalationMonth(lunarData) {
  return (lunarData >> 12) & 0x000f;
}

function getLunarYearDays(year) {
  return (getLunarRawData(year) >> 17) & 0x01ff;
}

function getLunarMonthDays(year, month, isIntercalation) {
  const lunarData = getLunarRawData(year);
  const isBigMonth = (isIntercalation && getLunarIntercalationMonth(lunarData) === month)
    ? ((lunarData >> 16) & 0x01) > 0
    : ((lunarData >> (12 - month)) & 0x01) > 0;
  return isBigMonth ? LUNAR_TABLE_DATA.LUNAR_BIG_MONTH_DAY : LUNAR_TABLE_DATA.LUNAR_SMALL_MONTH_DAY;
}

function getLunarDaysBeforeBaseYear(year) {
  let days = 0;
  for (let y = LUNAR_TABLE_DATA.BASE_YEAR; y <= year; y += 1) days += getLunarYearDays(y);
  return days;
}

function getLunarDaysBeforeBaseMonth(year, month, isIntercalation) {
  let days = 0;
  if (year >= LUNAR_TABLE_DATA.BASE_YEAR && month > 0) {
    for (let m = 1; m <= month; m += 1) days += getLunarMonthDays(year, m, false);
    if (isIntercalation) {
      const im = getLunarIntercalationMonth(getLunarRawData(year));
      if (im > 0 && im < month + 1) days += getLunarMonthDays(year, im, true);
    }
  }
  return days;
}

function getLunarAbsDays(year, month, day, isIntercalation) {
  let days = getLunarDaysBeforeBaseYear(year - 1) + getLunarDaysBeforeBaseMonth(year, month - 1, true) + day;
  if (isIntercalation && getLunarIntercalationMonth(getLunarRawData(year)) === month) {
    days += getLunarMonthDays(year, month, false);
  }
  return days;
}

function isSolarIntercalationYear(lunarData) {
  return ((lunarData >> 30) & 0x01) > 0;
}

function getSolarYearDays(year) {
  return isSolarIntercalationYear(getLunarRawData(year)) ? LUNAR_TABLE_DATA.SOLAR_BIG_YEAR_DAY : LUNAR_TABLE_DATA.SOLAR_SMALL_YEAR_DAY;
}

function getSolarMonthDays(year, month) {
  if (month === 2 && isSolarIntercalationYear(getLunarRawData(year))) return LUNAR_TABLE_DATA.SOLAR_DAYS[12];
  return LUNAR_TABLE_DATA.SOLAR_DAYS[month - 1];
}

function getSolarDaysBeforeBaseYear(year) {
  let days = 0;
  for (let y = LUNAR_TABLE_DATA.BASE_YEAR; y <= year; y += 1) days += getSolarYearDays(y);
  return days;
}

function getSolarDaysBeforeBaseMonth(year, month) {
  let days = 0;
  for (let m = 1; m <= month; m += 1) days += getSolarMonthDays(year, m);
  return days;
}

function getSolarAbsDays(year, month, day) {
  return getSolarDaysBeforeBaseYear(year - 1) + getSolarDaysBeforeBaseMonth(year, month - 1) + day - LUNAR_TABLE_DATA.SOLAR_LUNAR_DAY_DIFF;
}

// 음력 날짜 -> 양력 날짜. 지원 범위(1000~2050) 밖이거나 유효하지 않으면 null.
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isIntercalation) {
  if (lunarYear < LUNAR_TABLE_DATA.BASE_YEAR || lunarYear > LUNAR_TABLE_DATA.BASE_YEAR + LUNAR_TABLE_DATA.DATA.length - 1) {
    return null;
  }
  if (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1) {
    return null;
  }

  const absDays = getLunarAbsDays(lunarYear, lunarMonth, lunarDay, isIntercalation);
  const solarYear = absDays < getSolarAbsDays(lunarYear + 1, 1, 1) ? lunarYear : lunarYear + 1;
  let solarMonth = 0;
  let solarDay = 0;

  for (let month = 12; month > 0; month -= 1) {
    const absDaysByMonth = getSolarAbsDays(solarYear, month, 1);
    if (absDays >= absDaysByMonth) {
      solarMonth = month;
      solarDay = absDays - absDaysByMonth + 1;
      break;
    }
  }

  return { year: solarYear, month: solarMonth, day: solarDay };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lunarToSolar };
}
```

`tests/lunar-convert.test.js`에서 `require('../js/lunar-convert.js')`가 `data/lunar-table.js`의 `LUNAR_TABLE_DATA` 전역 변수에 의존하므로, 테스트 파일 상단에 다음을 추가한다(브라우저에서는 `<script>` 로드 순서로 해결되지만 Node 테스트에서는 명시적으로 로드해야 함):

```js
require('../data/lunar-table.js');
global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node tests/lunar-convert.test.js`
Expected: PASS — `All lunar-convert tests passed`

- [ ] **Step 6: 커밋**

```bash
git add data/lunar-table.js js/lunar-convert.js tests/lunar-convert.test.js
git commit -m "$(cat <<'EOF'
feat(saju): add lunar-to-solar date conversion

Ports the lunar<->solar conversion logic from usingsky/korean_lunar_
calendar_js (MIT License, KASI-based data, 1000-2050) rather than
computing new-moon/leap-month timing from scratch, to avoid the
accuracy risk that shelved 사주 support in an earlier session.
Verified against two independently published 설날 dates.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 일간 콘텐츠 (`data/saju-data.js`)

**Files:**
- Create: `data/saju-data.js`

**Interfaces:**
- Produces: `ILGAN_DATA: Array<{key, name_kr, element, trait, categories: {love,money,career,workplace,business,study,health,relationships,honor,moving,children}}>` (10개), `ELEMENT_BALANCE_TEXT: {excess: {목,화,토,금,수}, deficient: {목,화,토,금,수}, balanced: string}`

- [ ] **Step 1: 파일 작성**

`data/saju-data.js` 생성:

```js
const ILGAN_DATA = [
  {
    key: 'gap', name_kr: '갑목', element: '목',
    trait: '큰 나무처럼 곧고 정직한 갑목은 타고난 리더십으로 주변을 이끕니다. 다만 융통성을 조금 더하면 관계가 한결 부드러워집니다.',
    categories: {
      love: '직진하는 매력으로 마음을 사로잡는 시기입니다.',
      money: '정직하고 계획적인 태도가 재정에 안정을 더하는 시기입니다.',
      career: '곧은 신념으로 원하는 자리를 향해 나아가는 시기입니다.',
      workplace: '책임감 있는 태도로 신뢰를 얻는 시기입니다.',
      business: '확고한 원칙이 사업의 기반을 단단히 다지는 시기입니다.',
      study: '목표를 세우면 흔들림 없이 밀고 나가는 시기입니다.',
      health: '활력이 넘치지만 과로하지 않도록 조심하세요.',
      relationships: '솔직한 태도로 신뢰받는 관계를 만드는 시기입니다.',
      honor: '곧은 행보로 주변의 인정을 받는 시기입니다.',
      moving: '확신이 서면 망설임 없이 움직이는 시기입니다.',
      children: '든든한 울타리가 되어주는 시기입니다.'
    }
  },
  {
    key: 'eul', name_kr: '을목', element: '목',
    trait: '화초처럼 유연한 을목은 어떤 환경에서도 잘 적응하며 살아남습니다. 다만 우유부단함을 줄이면 원하는 것을 더 빨리 이룰 수 있어요.',
    categories: {
      love: '부드러운 배려로 상대의 마음을 여는 시기입니다.',
      money: '유연한 대처가 뜻밖의 재정 기회로 이어지는 시기입니다.',
      career: '상황에 맞춰 능숙하게 적응하며 자리를 잡는 시기입니다.',
      workplace: '부드러운 처세로 조직 안에서 잘 어우러지는 시기입니다.',
      business: '변화에 유연하게 대응하며 사업을 키워가는 시기입니다.',
      study: '여러 방법을 유연하게 시도하며 성과를 찾는 시기입니다.',
      health: '예민해지기 쉬우니 마음의 여유를 챙기세요.',
      relationships: '부드러운 소통으로 관계가 편안해지는 시기입니다.',
      honor: '은근한 매력으로 좋은 평판을 쌓는 시기입니다.',
      moving: '새 환경에도 금세 적응하며 자리 잡는 시기입니다.',
      children: '아이의 속도에 맞춰 유연하게 함께하는 시기입니다.'
    }
  },
  {
    key: 'byeong', name_kr: '병화', element: '화',
    trait: '태양처럼 밝은 병화는 존재만으로 주변을 환하게 비춥니다. 다만 지나친 과시는 삼가는 것이 좋습니다.',
    categories: {
      love: '환한 매력으로 시선을 사로잡는 시기입니다.',
      money: '적극적인 행동이 재정 기회를 넓히는 시기입니다.',
      career: '밝은 에너지로 존재감을 드러내는 시기입니다.',
      workplace: '활기찬 태도로 분위기를 이끄는 시기입니다.',
      business: '과감한 추진력이 사업에 활기를 더하는 시기입니다.',
      study: '열정적으로 몰입해 빠르게 성과를 내는 시기입니다.',
      health: '에너지가 넘치지만 급한 성격에 무리하지 않도록 하세요.',
      relationships: '밝은 에너지로 주변을 즐겁게 만드는 시기입니다.',
      honor: '화려한 존재감으로 주목받는 시기입니다.',
      moving: '새로운 곳에서도 금세 활기를 되찾는 시기입니다.',
      children: '밝은 에너지로 즐겁게 함께하는 시기입니다.'
    }
  },
  {
    key: 'jeong', name_kr: '정화', element: '화',
    trait: '촛불처럼 은은한 정화는 따뜻한 마음으로 주변을 세심히 챙깁니다. 다만 소심해지지 않도록 자신감을 가지세요.',
    categories: {
      love: '섬세한 배려로 깊은 신뢰를 쌓는 시기입니다.',
      money: '꼼꼼한 관리가 안정적인 재정으로 이어지는 시기입니다.',
      career: '세심한 준비가 좋은 결실로 이어지는 시기입니다.',
      workplace: '따뜻한 배려로 동료들의 마음을 얻는 시기입니다.',
      business: '섬세한 감각이 사업의 디테일을 살리는 시기입니다.',
      study: '차분하고 꾸준한 노력이 빛을 발하는 시기입니다.',
      health: '예민한 감정을 잘 다스리면 컨디션이 안정되는 시기입니다.',
      relationships: '은은한 배려로 깊은 유대를 만드는 시기입니다.',
      honor: '묵묵한 정성으로 신뢰를 쌓는 시기입니다.',
      moving: '충분히 준비한 뒤 조심스럽게 움직이는 시기입니다.',
      children: '세심한 손길로 아이를 살피는 시기입니다.'
    }
  },
  {
    key: 'mu', name_kr: '무토', element: '토',
    trait: '큰 산처럼 든든한 무토는 넓은 포용력으로 주변을 품어줍니다. 다만 고집이 세지 않도록 유연함을 더하세요.',
    categories: {
      love: '듬직한 존재감으로 안정감을 주는 시기입니다.',
      money: '묵직한 안정감으로 재정을 든든히 지키는 시기입니다.',
      career: '안정적인 기반 위에서 착실히 성장하는 시기입니다.',
      workplace: '믿음직한 태도로 중심을 잡아주는 시기입니다.',
      business: '탄탄한 기반이 사업을 뒷받침하는 시기입니다.',
      study: '우직한 끈기로 꾸준히 실력을 쌓는 시기입니다.',
      health: '느긋한 성격이 도움이 되지만 몸을 자주 움직여주세요.',
      relationships: '믿음직한 태도로 든든한 관계를 만드는 시기입니다.',
      honor: '묵직한 존재감으로 신뢰를 얻는 시기입니다.',
      moving: '신중하게 고민한 뒤 안정적으로 자리 잡는 시기입니다.',
      children: '든든한 버팀목이 되어주는 시기입니다.'
    }
  },
  {
    key: 'gi', name_kr: '기토', element: '토',
    trait: '논밭처럼 실용적인 기토는 묵묵한 헌신으로 주변을 돌봅니다. 다만 지나친 걱정은 내려놓아도 좋습니다.',
    categories: {
      love: '헌신적인 마음이 상대에게 깊이 전해지는 시기입니다.',
      money: '알뜰하고 계획적인 관리가 빛을 보는 시기입니다.',
      career: '성실한 태도가 인정받아 자리를 잡는 시기입니다.',
      workplace: '묵묵한 헌신으로 동료들의 신뢰를 얻는 시기입니다.',
      business: '실속 있는 운영이 사업을 안정시키는 시기입니다.',
      study: '꾸준하고 실용적인 학습이 성과로 이어지는 시기입니다.',
      health: '걱정이 많아지기 쉬우니 마음을 편히 가지세요.',
      relationships: '헌신적인 태도로 깊은 신뢰를 쌓는 시기입니다.',
      honor: '성실함이 쌓여 좋은 평판으로 이어지는 시기입니다.',
      moving: '실용적인 조건을 꼼꼼히 따져 움직이는 시기입니다.',
      children: '세심하고 헌신적으로 아이를 돌보는 시기입니다.'
    }
  },
  {
    key: 'gyeong', name_kr: '경금', element: '금',
    trait: '무쇠처럼 강인한 경금은 흔들림 없는 결단력으로 목표를 밀고 나갑니다. 다만 유연함을 더하면 관계가 편해집니다.',
    categories: {
      love: '확고한 태도로 상대에게 믿음을 주는 시기입니다.',
      money: '과감한 결단이 재정에 좋은 결과를 가져오는 시기입니다.',
      career: '강한 추진력으로 목표에 다가서는 시기입니다.',
      workplace: '단호한 실행력으로 성과를 내는 시기입니다.',
      business: '강단 있는 결정이 사업의 전환점이 되는 시기입니다.',
      study: '집중력을 발휘해 단기간에 성과를 내는 시기입니다.',
      health: '긴장이 쌓이기 쉬우니 몸을 유연하게 풀어주세요.',
      relationships: '의리 있는 태도로 신뢰를 쌓는 시기입니다.',
      honor: '강단 있는 모습으로 인정받는 시기입니다.',
      moving: '결정하면 신속하게 실행에 옮기는 시기입니다.',
      children: '엄격하지만 든든한 지지자가 되어주는 시기입니다.'
    }
  },
  {
    key: 'sin', name_kr: '신금', element: '금',
    trait: '정교하게 세공된 보석 같은 신금은 예민한 감각으로 섬세함을 발휘합니다. 다만 완벽주의는 조금 내려놓아도 좋습니다.',
    categories: {
      love: '세련된 매력으로 마음을 끄는 시기입니다.',
      money: '정교한 계산이 재정 관리에 도움이 되는 시기입니다.',
      career: '정확하고 꼼꼼한 일 처리로 인정받는 시기입니다.',
      workplace: '세밀한 감각으로 완성도를 높이는 시기입니다.',
      business: '디테일에 강한 감각이 사업의 품질을 높이는 시기입니다.',
      study: '예리한 분석력으로 깊이 있는 성과를 내는 시기입니다.',
      health: '예민함이 스트레스로 쌓이지 않도록 관리하세요.',
      relationships: '세심한 배려로 관계의 질을 높이는 시기입니다.',
      honor: '정교한 안목으로 좋은 평판을 얻는 시기입니다.',
      moving: '꼼꼼히 따져본 뒤 확실한 곳으로 옮기는 시기입니다.',
      children: '세심하게 챙기며 정성을 쏟는 시기입니다.'
    }
  },
  {
    key: 'im', name_kr: '임수', element: '수',
    trait: '큰 바다처럼 깊은 임수는 넓은 포용력과 지혜로 주변을 아우릅니다. 다만 감정 기복을 다스리면 더 큰 힘을 발휘합니다.',
    categories: {
      love: '깊고 넓은 마음으로 상대를 감싸는 시기입니다.',
      money: '큰 그림을 보는 안목이 재정 기회로 이어지는 시기입니다.',
      career: '넓은 시야로 새로운 가능성을 여는 시기입니다.',
      workplace: '유연한 사고로 문제를 풀어가는 시기입니다.',
      business: '큰 흐름을 읽는 안목이 사업을 키우는 시기입니다.',
      study: '폭넓은 지식을 흡수하며 성장하는 시기입니다.',
      health: '감정 기복이 클 수 있으니 마음을 다스리세요.',
      relationships: '포용력 있는 태도로 관계를 넓히는 시기입니다.',
      honor: '지혜로운 처신으로 신망을 얻는 시기입니다.',
      moving: '큰 흐름을 읽고 과감히 움직이는 시기입니다.',
      children: '넓은 마음으로 아이를 품어주는 시기입니다.'
    }
  },
  {
    key: 'gye', name_kr: '계수', element: '수',
    trait: '이슬비처럼 섬세한 계수는 조용히 스며들며 주변을 촉촉이 적십니다. 다만 우유부단함을 줄이면 원하는 바를 더 빨리 이룰 수 있어요.',
    categories: {
      love: '은은한 진심이 서서히 마음을 적시는 시기입니다.',
      money: '세심한 절약이 차곡차곡 쌓이는 시기입니다.',
      career: '조용히 실력을 쌓아 인정받는 시기입니다.',
      workplace: '섬세한 배려로 신뢰를 얻는 시기입니다.',
      business: '치밀한 준비가 사업의 토대를 다지는 시기입니다.',
      study: '차분하게 스며들 듯 지식을 쌓는 시기입니다.',
      health: '생각이 많아지기 쉬우니 마음의 여유를 가지세요.',
      relationships: '은근하고 진실한 태도로 신뢰를 쌓는 시기입니다.',
      honor: '조용한 성실함이 좋은 평판으로 이어지는 시기입니다.',
      moving: '충분히 고민한 뒤 조심스럽게 움직이는 시기입니다.',
      children: '섬세한 손길로 아이의 마음을 어루만지는 시기입니다.'
    }
  }
];

const ELEMENT_BALANCE_TEXT = {
  excess: {
    목: '목 기운이 강해 추진력은 넘치지만 유연함을 잃지 않는 것이 관건입니다.',
    화: '화 기운이 강해 열정이 넘치지만 조급함은 다스리는 것이 좋습니다.',
    토: '토 기운이 강해 안정적이지만 변화 앞에서 너무 신중해지지 않도록 하세요.',
    금: '금 기운이 강해 결단력이 돋보이지만 주변과의 조화도 챙기는 것이 좋습니다.',
    수: '수 기운이 강해 지혜롭지만 생각이 많아지지 않도록 균형을 잡으세요.'
  },
  deficient: {
    목: '목 기운이 약해 결단이 필요한 순간엔 조금 더 과감해져도 좋습니다.',
    화: '화 기운이 약해 표현을 아끼는 편이니 마음을 조금 더 드러내 보세요.',
    토: '토 기운이 약해 기반을 다지는 데 조금 더 시간을 들이는 것이 좋습니다.',
    금: '금 기운이 약해 맺고 끊는 결단이 필요한 순간엔 조금 더 단호해지세요.',
    수: '수 기운이 약해 유연한 대응이 필요한 순간엔 한 박자 쉬어가는 것도 좋습니다.'
  },
  balanced: '오행이 고르게 균형을 이루고 있어 안정적인 흐름을 유지하는 시기입니다.'
};

function getIlganByIndex(stemIdx) {
  return ILGAN_DATA[stemIdx];
}

function getElementBalanceText(balance) {
  if (balance.state === 'balanced') return ELEMENT_BALANCE_TEXT.balanced;
  return ELEMENT_BALANCE_TEXT[balance.state][balance.element];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ILGAN_DATA, ELEMENT_BALANCE_TEXT, getIlganByIndex, getElementBalanceText };
}
```

- [ ] **Step 2: 데이터 무결성 테스트 작성 및 통과 확인**

`tests/saju-data.test.js` 생성 (기존 `tests/tarot-data.test.js`가 78장 전부 검증하는 것과 같은 패턴):

```js
const assert = require('assert');
const { ILGAN_DATA } = require('../data/saju-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];

assert.strictEqual(ILGAN_DATA.length, 10, '일간은 10개여야 함');
assert.deepStrictEqual(ILGAN_DATA.map(d => d.key), EXPECTED_KEYS, '갑을병정무기경신임계 순서와 key가 일치해야 함');

ILGAN_DATA.forEach(function (entry) {
  assert.ok(entry.trait && entry.trait.length > 0, entry.key + ' trait 누락');
  CATEGORY_KEYS.forEach(function (cat) {
    assert.ok(entry.categories[cat] && entry.categories[cat].length > 0, entry.key + '.' + cat + ' 누락');
  });
});

console.log('All saju-data tests passed');
```

Run: `node tests/saju-data.test.js`
Expected: PASS — `All saju-data tests passed`

- [ ] **Step 3: 커밋**

```bash
git add data/saju-data.js tests/saju-data.test.js
git commit -m "$(cat <<'EOF'
content(saju): add ilgan (day-master) interpretation content

10 day-master entries (갑을병정무기경신임계), each with a trait plus
11 category sentences, matching the zodiac/ddi content pattern. Plus
11 short 오행 balance modifier clauses (5 elements x excess/deficient
+ balanced).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: index.html UI 마크업

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: 없음 (마크업만, JS 연결은 Task 11)
- Produces: DOM 구조 (`#saju-select`, 그 안의 입력 요소들)

- [ ] **Step 1: 모드 탭에 사주 버튼 추가**

`index.html`의 `#mode-select`를 수정:

```html
<div id="mode-select">
  <button type="button" class="category-btn mode-btn selected" data-mode="tarot">타로</button>
  <button type="button" class="category-btn mode-btn" data-mode="zodiac">별자리</button>
  <button type="button" class="category-btn mode-btn" data-mode="ddi">띠운세</button>
  <button type="button" class="category-btn mode-btn" data-mode="saju">사주</button>
</div>
```

- [ ] **Step 2: `#saju-select` 블록 추가**

`#ddi-select` 블록 바로 다음에 추가:

```html
<div id="saju-select" class="hidden">
  <label>양력/음력을 선택하세요</label>
  <div id="calendar-type-select" class="button-grid">
    <button type="button" class="category-btn calendar-type-btn selected" data-calendar-type="solar">양력</button>
    <button type="button" class="category-btn calendar-type-btn" data-calendar-type="lunar">음력</button>
  </div>
  <div id="intercalation-select" class="hidden">
    <label><input type="checkbox" id="intercalation-checkbox"> 윤달이에요</label>
  </div>

  <label for="saju-date-input">생년월일을 입력하세요</label>
  <input type="date" id="saju-date-input" min="1900-01-01" max="2050-12-31">

  <label for="saju-time-input">태어난 시각을 입력하세요</label>
  <input type="time" id="saju-time-input">
  <label><input type="checkbox" id="time-unknown-checkbox"> 태어난 시간을 몰라요</label>

  <label>성별을 선택하세요</label>
  <div id="gender-select" class="button-grid">
    <button type="button" class="category-btn gender-btn selected" data-gender="male">남자</button>
    <button type="button" class="category-btn gender-btn" data-gender="female">여자</button>
  </div>

  <p id="saju-error" class="hidden"></p>
</div>
```

- [ ] **Step 3: script 태그 추가**

`</body>` 앞 script 목록을 수정:

```html
<script src="data/tarot-data.js"></script>
<script src="data/zodiac-data.js"></script>
<script src="data/ddi-data.js"></script>
<script src="data/lunar-table.js"></script>
<script src="data/saju-data.js"></script>
<script src="js/deck-logic.js"></script>
<script src="js/history-store.js"></script>
<script src="js/lunar-convert.js"></script>
<script src="js/saju-calc.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 4: 브라우저에서 HTML 구조 확인**

`python -m http.server <port>`로 로컬 서버를 띄우고 페이지를 열어, 콘솔 에러 없이 로드되는지 확인한다(이 시점엔 `app.js`가 아직 사주 모드를 처리하지 않으므로 사주 탭 클릭은 아무 동작도 하지 않아야 정상).

Run: `node -e "require('./js/saju-calc.js'); require('./js/lunar-convert.js'); console.log('scripts load without syntax errors')"`
Expected: PASS (문법 오류 없이 로드됨)

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(saju): add saju mode UI markup

Adds the 사주 mode tab and the #saju-select block (solar/lunar
toggle, intercalation checkbox, date/time inputs, time-unknown
checkbox, gender selector) plus script tags for the new data/calc
files. No JS wiring yet — that's the next task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: app.js 통합

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `calculateSaju`, `getElementCounts`, `classifyElementBalance`, `getDaeunDirection`, `getDaeunStartAge`, `getDaeunList`, `CHEONGAN`, `JIJI` (js/saju-calc.js), `lunarToSolar` (js/lunar-convert.js), `ILGAN_DATA`, `getIlganByIndex`, `getElementBalanceText` (data/saju-data.js)
- Produces: `showSajuSummary()`, `saveSajuReading()`, `calculateAndValidateSajuInput()` 내부 함수들 — 기존 `drawButton` 클릭 핸들러와 `renderHistory()`에 사주 분기 추가

- [ ] **Step 1: 상태 변수 및 DOM 참조 추가**

`js/app.js` 상단, 기존 상태 변수들 옆에 추가:

```js
let selectedCalendarType = 'solar';
let selectedIntercalation = false;
let selectedGender = 'male';
let selectedTimeUnknown = false;
```

기존 DOM 참조 블록에 추가:

```js
const sajuSelect = document.getElementById('saju-select');
const calendarTypeButtons = document.querySelectorAll('#calendar-type-select .calendar-type-btn');
const intercalationSelect = document.getElementById('intercalation-select');
const intercalationCheckbox = document.getElementById('intercalation-checkbox');
const sajuDateInput = document.getElementById('saju-date-input');
const sajuTimeInput = document.getElementById('saju-time-input');
const timeUnknownCheckbox = document.getElementById('time-unknown-checkbox');
const genderButtons = document.querySelectorAll('#gender-select .gender-btn');
const sajuErrorEl = document.getElementById('saju-error');
```

기존 `MODE_BUTTON_LABELS`에 `saju: '운세 보기'` 추가.

- [ ] **Step 2: 모드 전환 로직에 사주 분기 추가**

기존 `modeButtons.forEach(...)` 핸들러의 `zodiacSelect.classList.toggle(...)` 줄들 옆에 추가:

```js
sajuSelect.classList.toggle('hidden', selectedMode !== 'saju');
```

- [ ] **Step 3: 입력 이벤트 핸들러 추가**

```js
calendarTypeButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    calendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    selectedCalendarType = btn.dataset.calendarType;
    intercalationSelect.classList.toggle('hidden', selectedCalendarType !== 'lunar');
  });
});

intercalationCheckbox.addEventListener('change', function () {
  selectedIntercalation = intercalationCheckbox.checked;
});

timeUnknownCheckbox.addEventListener('change', function () {
  selectedTimeUnknown = timeUnknownCheckbox.checked;
  sajuTimeInput.disabled = selectedTimeUnknown;
});

genderButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    genderButtons.forEach(function (b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    selectedGender = btn.dataset.gender;
  });
});
```

- [ ] **Step 4: 계산 오케스트레이션 함수 추가**

```js
// 입력을 검증하고 calculateSaju에 넘길 형태로 정규화. 실패 시 null을 반환하고 에러 메시지를 표시.
function resolveSajuInput() {
  sajuErrorEl.classList.add('hidden');

  if (!sajuDateInput.value) {
    sajuErrorEl.textContent = '생년월일을 입력해주세요.';
    sajuErrorEl.classList.remove('hidden');
    return null;
  }
  if (!selectedTimeUnknown && !sajuTimeInput.value) {
    sajuErrorEl.textContent = '태어난 시각을 입력하거나 "시간을 몰라요"를 선택해주세요.';
    sajuErrorEl.classList.remove('hidden');
    return null;
  }

  const dateParts = sajuDateInput.value.split('-').map(Number);
  let year = dateParts[0];
  let month = dateParts[1];
  let day = dateParts[2];

  if (year < 1900 || year > 2050) {
    sajuErrorEl.textContent = '1900년~2050년 사이의 생년월일만 지원합니다.';
    sajuErrorEl.classList.remove('hidden');
    return null;
  }

  if (selectedCalendarType === 'lunar') {
    const solar = lunarToSolar(year, month, day, selectedIntercalation);
    if (!solar) {
      sajuErrorEl.textContent = '입력한 음력 날짜를 양력으로 변환할 수 없습니다. 날짜를 다시 확인해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }
    year = solar.year;
    month = solar.month;
    day = solar.day;
  }

  let hour = 0;
  let minute = 0;
  if (!selectedTimeUnknown) {
    const timeParts = sajuTimeInput.value.split(':').map(Number);
    hour = timeParts[0];
    minute = timeParts[1];
  }

  return { year: year, month: month, day: day, hour: hour, minute: minute, timeUnknown: selectedTimeUnknown };
}

function pillarText(pillar) {
  return CHEONGAN[pillar.stemIdx] + JIJI[pillar.branchIdx];
}

function showSajuSummary(input, saju) {
  const category = selectedCategory;
  const period = selectedPeriod;
  const ilgan = getIlganByIndex(saju.day.stemIdx);
  const heading = ilgan.name_kr + ' 일간 · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

  const myeongsikRows = [
    { label: '년주', text: pillarText(saju.year) },
    { label: '월주', text: pillarText(saju.month) },
    { label: '일주', text: pillarText(saju.day) },
    { label: '시주', text: saju.hour ? pillarText(saju.hour) : '모름' }
  ];
  const myeongsikHtml = '<div class="myeongsik-table">' +
    myeongsikRows.map(function (row) {
      return '<div class="myeongsik-col"><span class="myeongsik-label">' + row.label + '</span><span class="myeongsik-value">' + row.text + '</span></div>';
    }).join('') +
    '</div>';

  const counts = getElementCounts(saju);
  const elementHtml = '<p class="element-summary">' +
    ['목', '화', '토', '금', '수'].map(function (el) { return el + counts[el]; }).join(' ') +
    '</p>';

  let daeunHtml = '';
  if (saju.hour) {
    const direction = getDaeunDirection(saju.year.stemIdx, selectedGender);
    const startAge = getDaeunStartAge(saju.instant, saju.monthOffset, direction);
    const daeunList = getDaeunList(saju.month.stemIdx, saju.month.branchIdx, direction, startAge);
    const today = new Date();
    const currentAge = today.getFullYear() - input.year + 1;
    daeunHtml = '<div class="daeun-table">' +
      daeunList.map(function (d) {
        const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
        return '<div class="daeun-col' + (isCurrent ? ' current' : '') + '"><span class="daeun-ganji">' + CHEONGAN[d.stemIdx] + JIJI[d.branchIdx] + '</span><span class="daeun-age">' + d.startAge + '~' + d.endAge + '세</span></div>';
      }).join('') +
      '</div>';
  }

  const balance = classifyElementBalance(counts);
  const balanceText = getElementBalanceText(balance);
  const baseMeaning = category && ilgan.categories[category]
    ? PERIOD_PREFIXES[period] + ' ' + ilgan.categories[category]
    : ilgan.trait;
  const meaning = baseMeaning + ' ' + balanceText;

  summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
    myeongsikHtml + elementHtml + daeunHtml +
    '<div class="reading-detail"><p>' + meaning + '</p></div>';
  summaryEl.classList.remove('hidden');
  newReadingButton.classList.remove('hidden');
}

function saveSajuReading(input, saju) {
  if (!storage) return;
  const entry = {
    date: new Date().toISOString(),
    mode: 'saju',
    calendarType: selectedCalendarType,
    birthDate: input.year + '-' + String(input.month).padStart(2, '0') + '-' + String(input.day).padStart(2, '0'),
    birthTime: input.timeUnknown ? null : (String(input.hour).padStart(2, '0') + ':' + String(input.minute).padStart(2, '0')),
    timeUnknown: input.timeUnknown,
    gender: selectedGender,
    dayIlganName: getIlganByIndex(saju.day.stemIdx).name_kr,
    category: selectedCategory,
    period: selectedPeriod,
    cards: []
  };
  saveReading(storage, entry);
}
```

- [ ] **Step 5: `drawButton` 클릭 핸들러에 사주 분기 추가**

기존 `if (selectedMode === 'ddi') { ... return; }` 블록 바로 다음에 추가:

```js
if (selectedMode === 'saju') {
  const input = resolveSajuInput();
  if (!input) return;
  const saju = calculateSaju(input);
  cardsContainer.innerHTML = '';
  screenStart.classList.add('hidden');
  screenReading.classList.remove('hidden');
  showSajuSummary(input, saju);
  saveSajuReading(input, saju);
  return;
}
```

- [ ] **Step 6: `newReadingButton` 리셋 로직에 사주 초기화 추가**

기존 `newReadingButton.addEventListener(...)` 핸들러 안에 추가:

```js
calendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
calendarTypeButtons[0].classList.add('selected');
selectedCalendarType = 'solar';
intercalationSelect.classList.add('hidden');
intercalationCheckbox.checked = false;
selectedIntercalation = false;
sajuDateInput.value = '';
sajuTimeInput.value = '';
sajuTimeInput.disabled = false;
timeUnknownCheckbox.checked = false;
selectedTimeUnknown = false;
genderButtons.forEach(function (b) { b.classList.remove('selected'); });
genderButtons[0].classList.add('selected');
selectedGender = 'male';
sajuErrorEl.classList.add('hidden');
```

- [ ] **Step 7: `renderHistory()`에 사주 분기 추가**

기존 `if (entry.mode === 'zodiac') { ... } else if (entry.mode === 'ddi') { ... }` 체인에 추가:

```js
} else if (entry.mode === 'saju') {
  cardsText = entry.birthDate + ' ' + (entry.timeUnknown ? '(시간 모름)' : entry.birthTime) + ' · ' + entry.dayIlganName + ' 일간';
}
```

- [ ] **Step 8: 수동 브라우저 검증**

로컬 서버로 페이지를 열어 사주 탭 선택 → 양력 생년월일시 입력 → 카테고리/기간 선택 → "운세 보기" 클릭 → 명식표/오행/대운표/해설이 정상 표시되는지 확인. 시간 모름 체크 시 대운표가 숨겨지는지, 음력 선택 시 윤달 체크박스가 나타나는지, 지난 기록에 사주 항목이 올바르게 뜨는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add js/app.js
git commit -m "$(cat <<'EOF'
feat(saju): wire saju mode into app.js

Adds input resolution (solar/lunar + intercalation, time-unknown,
gender), the calculate-and-render flow (명식표/오행/대운표/해설),
history save/render, and reset handling — following the same
pattern as the zodiac and ddi modes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: CSS 스타일링

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: 없음 (Task 10/11에서 만든 클래스명에 스타일만 입힘)

- [ ] **Step 1: 명식표/오행/대운표/입력 스타일 추가**

`css/style.css` 끝에 추가:

```css
#saju-date-input, #saju-time-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #4a3a68;
  background: #1a1330;
  color: #f0e6c8;
  margin-bottom: 12px;
  font-size: 15px;
}

#saju-time-input:disabled { opacity: 0.4; }

#intercalation-select label, #saju-select label:has(input[type="checkbox"]) {
  display: flex;
  align-items: center;
  gap: 6px;
}

#saju-error { color: #e08080; font-size: 13px; margin: -4px 0 12px; }

.myeongsik-table, .daeun-table {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.daeun-table { grid-template-columns: repeat(3, 1fr); }

.myeongsik-col, .daeun-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #4a3a68;
  border-radius: 8px;
  background: #1a1330;
}

.daeun-col.current { border-color: #d4af37; background: #2a1f42; }

.myeongsik-label { font-size: 12px; color: #c9bde0; }
.myeongsik-value, .daeun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.daeun-age { font-size: 11px; color: #c9bde0; }

.element-summary { text-align: center; color: #c9bde0; font-size: 13px; margin: 0 0 8px; }
```

- [ ] **Step 2: 브라우저에서 시각 확인**

로컬 서버로 사주 리딩 결과 화면을 열어 명식표/대운표가 모바일 폭(375px)과 데스크톱 폭 모두에서 깨지지 않는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add css/style.css
git commit -m "$(cat <<'EOF'
style(saju): add styling for myeongsik/daeun tables and inputs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: 전체 테스트 스위트 + 수동 종단 검증

**Files:**
- 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run:
```bash
node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js
```
Expected: 6개 파일 전부 PASS

- [ ] **Step 2: 브라우저 종단 시나리오 검증**

로컬 서버(매번 새 포트, 캐시 회피)로 앱을 열고 다음을 확인:
1. 양력 + 시간 있음 + 남자: 명식표 4주, 오행 분포, 대운표(9구간, 현재 구간 강조), 해설 정상 표시
2. 양력 + 시간 있음 + 여자: 같은 생년월일이어도 대운 방향/시작나이가 남자와 다르게 나오는지
3. 음력 + 평달: 윤달 체크박스가 보이고, 변환된 양력 기준으로 계산되는지
4. 음력 + 윤달 체크: 계산이 달라지는지(윤달 있는 연도로 테스트)
5. 시간 모름 체크: 시주 칸 "모름", 대운표 안 보임, 오행은 6글자만 집계
6. 카테고리 미선택(오늘의운): 일간 trait만 표시, 기간 프리픽스 없음
7. 카테고리 선택: 기간 프리픽스 + 카테고리 문장 + 오행 균형 문장 조합 표시
8. 지원 범위 밖 연도(1899, 2051) 입력 시 에러 메시지
9. 지난 기록 모달에 사주 항목이 올바른 텍스트로 표시되고 개별 삭제 가능
10. 새 리딩 시작 버튼으로 입력이 전부 초기화되는지

- [ ] **Step 3: 발견된 문제 수정 후 재검증**

버그가 있으면 해당 태스크로 돌아가 수정하고, 관련 테스트를 다시 실행해 통과를 확인한 뒤 별도 커밋으로 남긴다.
