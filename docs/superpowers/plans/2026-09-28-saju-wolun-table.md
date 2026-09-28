# 사주 월운(12개월표) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주 리딩 결과 화면의 세운표 아래에, 현재 연도(세운표에서 강조된 올해)의 12개월 월운표를 추가한다.

**Architecture:** `js/saju-calc.js`에 순수 함수 `getWolunList(yearStemIdx)`를 추가하고(기존 `getMonthPillar` 재사용), `js/app.js`의 `showSajuSummary()`에서 이미 계산된 올해(세운 강조 연도)의 연간 인덱스로 이 함수를 호출해 월운표 HTML을 만든다. CSS는 기존 `.seun-*` 클래스를 그대로 복제한 `.wolun-*` 클래스로 추가한다.

**Tech Stack:** 바닐라 JS(브라우저 전역 스크립트 + Node `module.exports` 겸용), 순수 `assert` 기반 테스트(`node scripts/run-tests.js`), 별도 빌드 도구 없음.

## Global Constraints

- 스코프는 대운/세운표 아래에 월운표를 추가하는 것으로 한정한다. 정확한 절기 경계 날짜 표시, 다른 연도의 월운표로 전환하는 인터랙션, 궁합모드 적용은 이 계획에 없다(설계 문서 "이번 스코프에서 제외" 참고).
- 월운표는 대운/세운표와 완전히 동일한 시각적 수준(간지 + 월건명 텍스트만, 오행 색상 없음)을 유지한다.
- 월운표는 시간을 아는 케이스(`saju.hour`가 존재)이고 활성 대운 구간(`activeDaeun`)이 있을 때만 렌더링한다 — 기존 세운표와 동일한 게이트.
- 코드 스타일: 화살표 함수를 쓰지 않고 `function` 표현식만 사용한다.
- 사용자 노출 텍스트는 전부 한국어.
- 커밋 메시지 끝에는 정확히 다음 줄을 verbatim으로 포함한다(서브에이전트 자신의 모델명으로 바꾸지 말 것):
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: `getWolunList` 순수 함수 + 단위 테스트

**Files:**
- Modify: `js/saju-calc.js:259-285`(`getDaeunList`/`getSeunList`/`module.exports` 블록)
- Modify: `tests/saju-calc.test.js:1-32`(require 목록), `tests/saju-calc.test.js`의 `getSeunList` 테스트 블록 뒤(202번째 줄 `console.log('All getSeunList tests passed');` 다음)

**Interfaces:**
- Produces: `getWolunList(yearStemIdx)` → `Array<{ monthOffset: number, stemIdx: number, branchIdx: number }>`(정확히 12개, 인월(monthOffset 0)부터 축월(monthOffset 11)까지 순서대로). `js/saju-calc.js`의 `module.exports`에 포함되어 Node 테스트에서 쓸 수 있고, `index.html`이 `js/saju-calc.js`를 `js/app.js`보다 먼저 로드하므로 브라우저 전역으로도 자동으로 쓸 수 있다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/saju-calc.test.js` 1~32번째 줄의 require 목록에서 `getSeunList` 다음에 `getWolunList`를 추가:

```js
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
  getSeunList,
  getWolunList
} = require('../js/saju-calc.js');
```

그다음 202번째 줄 `console.log('All getSeunList tests passed');` 바로 뒤(204번째 줄 이후 다음 섹션 앞)에 새 테스트 블록을 추가:

```js
// getWolunList: 연간 인덱스 -> 12개월 월운 간지 목록 (인월~축월 순서)
// 갑(yearStemIdx=0) 기준: getMonthPillar(0, 0)=병인은 위 오호둔 표에서 이미 검증된 공식과 동일.
const wolunGab = getWolunList(0);
assert.strictEqual(wolunGab.length, 12);
assert.deepStrictEqual(wolunGab.map(function (p) { return p.monthOffset; }),
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
assert.deepStrictEqual(wolunGab.map(pillarLabel),
  ['병인', '정묘', '무진', '기사', '경오', '신미', '임신', '계유', '갑술', '을해', '병자', '정축']);

// 병(yearStemIdx=2) 기준 골든 값도 교차검증
const wolunByeong = getWolunList(2);
assert.deepStrictEqual(wolunByeong.map(pillarLabel),
  ['경인', '신묘', '임진', '계사', '갑오', '을미', '병신', '정유', '무술', '기해', '경자', '신축']);

console.log('All getWolunList tests passed');
```

(`pillarLabel`은 58번째 줄에 이미 정의된 `function pillarLabel(p) { return CHEONGAN[p.stemIdx] + JIJI[p.branchIdx]; }` 헬퍼를 재사용한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getWolunList is not a function` (아직 `js/saju-calc.js`에 구현 없음, require 구조분해로 `undefined`가 들어와 호출 시 TypeError 발생)

- [ ] **Step 3: `getWolunList` 최소 구현**

`js/saju-calc.js`의 259~285번째 줄(`getDaeunList`/`getSeunList` 함수와 `module.exports` 블록)을 아래로 교체:

```js
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: PASS, 마지막 줄에 `All saju myeongsik detail golden-case tests passed`까지 전부 출력(스크립트가 끝까지 에러 없이 실행됨)

- [ ] **Step 5: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS, 마지막 줄에 `N test files, N passed, 0 failed`

- [ ] **Step 6: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add getWolunList for monthly (wol-un) fortune calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 월운표 렌더링 + CSS

**Files:**
- Modify: `js/app.js:716-770`(`showSajuSummary` 안 `if (activeDaeun) { ... }` 블록과 `summaryEl.innerHTML` 조립부)
- Modify: `css/style.css:250-276`

**Interfaces:**
- Consumes: Task 1의 `getWolunList(yearStemIdx)`(브라우저 전역, 별도 script 태그 추가 불필요), 기존 `pillarText(pillar)`, `getYearPillar(year)`, `getMonthOffset(longitude)`, `solarLongitude(date)`, `JIJI` 배열.
- Produces: 없음(최종 렌더링 결과물).

- [ ] **Step 1: `activeDaeun` 블록을 확장해 `wolunHtml`도 함께 계산**

`js/app.js`의 745~757번째 줄:

```js
      const activeDaeun = daeunList.find(function (d) { return currentAge >= d.startAge && currentAge <= d.endAge; });
      if (activeDaeun) {
        const seunStartYear = input.year + activeDaeun.startAge - 1;
        const seunList = getSeunList(seunStartYear, 10);
        const thisYear = today.getFullYear();
        seunHtml = '<p class="table-label">세운</p><div class="seun-table">' +
          seunList.map(function (s) {
            const isCurrent = s.year === thisYear;
            return '<div class="seun-col' + (isCurrent ? ' current' : '') + '"><span class="seun-ganji">' + pillarText(s) + '</span><span class="seun-age">' + s.year + '년 · ' + (s.year - input.year + 1) + '세</span></div>';
          }).join('') +
          '</div>';
      }
    }
```

아래로 교체:

```js
      const activeDaeun = daeunList.find(function (d) { return currentAge >= d.startAge && currentAge <= d.endAge; });
      if (activeDaeun) {
        const seunStartYear = input.year + activeDaeun.startAge - 1;
        const seunList = getSeunList(seunStartYear, 10);
        const thisYear = today.getFullYear();
        seunHtml = '<p class="table-label">세운</p><div class="seun-table">' +
          seunList.map(function (s) {
            const isCurrent = s.year === thisYear;
            return '<div class="seun-col' + (isCurrent ? ' current' : '') + '"><span class="seun-ganji">' + pillarText(s) + '</span><span class="seun-age">' + s.year + '년 · ' + (s.year - input.year + 1) + '세</span></div>';
          }).join('') +
          '</div>';

        const thisYearStemIdx = getYearPillar(thisYear).stemIdx;
        const wolunList = getWolunList(thisYearStemIdx);
        const currentMonthOffset = getMonthOffset(solarLongitude(new Date()));
        wolunHtml = '<p class="table-label">월운</p><div class="wolun-table">' +
          wolunList.map(function (w) {
            const isCurrent = w.monthOffset === currentMonthOffset;
            return '<div class="wolun-col' + (isCurrent ? ' current' : '') + '"><span class="wolun-ganji">' + pillarText(w) + '</span><span class="wolun-month">' + JIJI[w.branchIdx] + '월</span></div>';
          }).join('') +
          '</div>';
      }
    }
```

- [ ] **Step 2: `wolunHtml` 변수 선언 추가**

`js/app.js`의 729~730번째 줄:

```js
    let daeunHtml = '';
    let seunHtml = '';
```

아래로 교체:

```js
    let daeunHtml = '';
    let seunHtml = '';
    let wolunHtml = '';
```

- [ ] **Step 3: `summaryEl.innerHTML` 조립부에 `wolunHtml` 추가**

`js/app.js`에서 (Step 1~2 반영 후) `summaryEl.innerHTML = '<h3>' + heading` 로 시작하는 블록을 찾는다 — 현재 내용:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml + seunHtml +
      extraHtml;
```

아래로 교체:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml + seunHtml + wolunHtml +
      extraHtml;
```

- [ ] **Step 4: CSS 클래스 추가**

`css/style.css`의 270~276번째 줄:

```css
.seun-col.current { border-color: #d4af37; background: #2a1f42; }

.seun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.seun-age { font-size: 11px; color: #c9bde0; }

.myeongsik-detail-wrap { margin: 16px 0; overflow-x: auto; }
```

아래로 교체:

```css
.seun-col.current { border-color: #d4af37; background: #2a1f42; }

.seun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.seun-age { font-size: 11px; color: #c9bde0; }

.wolun-table {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.wolun-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #4a3a68;
  border-radius: 8px;
  background: #1a1330;
}

.wolun-col.current { border-color: #d4af37; background: #2a1f42; }

.wolun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.wolun-month { font-size: 11px; color: #c9bde0; }

.myeongsik-detail-wrap { margin: 16px 0; overflow-x: auto; }
```

- [ ] **Step 5: 시간을 아는 케이스로 브라우저 확인**

Run: preview_start `{name: "static-preview"}`로 dev 서버 열기(이미 떠 있으면 생략) → `http://localhost:8080/` 접속 → 사주 모드 선택 → 양력, 생년월일 2020-10-16, 시간 16:00, 성별 남자(기본 선택값) 입력 → 결과 보기.

Expected(사전에 `node -e`로 직접 계산해 확정한 값, 오늘 날짜 2026-09-28 기준. 대운표는 `7~16세 정해`가 활성 구간, 세운표 첫 칸은 `2026년 · 7세 병오` — 둘 다 기존 세운표 계획에서 이미 검증된 값):

- "월운" 라벨과 함께 월운표 12칸(2026년=병년, `getYearPillar(2026).stemIdx`=2 기준): `경인 인월`, `신묘 묘월`, `임진 진월`, `계사 사월`, `갑오 오월`, `을미 미월`, `병신 신월`, `정유 유월`(금색 테두리로 강조, 이번 달), `무술 술월`, `기해 해월`, `경자 자월`, `신축 축월`.
- 월운표가 세운표 바로 아래에 나타남.
- 브라우저 콘솔에 JS 에러 없음(`read_console_messages`로 확인).

(주의: "이번 달" 강조 칸은 실행 시점의 실제 날짜에 따라 달라진다 — 위 `정유 유월`은 2026-09-28 기준값이다. 검증 시점이 다르면 `node -e "const { solarLongitude, getMonthOffset, getMonthPillar, getYearPillar, CHEONGAN, JIJI } = require('./js/saju-calc.js'); const mo = getMonthOffset(solarLongitude(new Date())); const p = getMonthPillar(getYearPillar(new Date().getFullYear()).stemIdx, mo); console.log(mo, CHEONGAN[p.stemIdx]+JIJI[p.branchIdx], JIJI[p.branchIdx]+'월');"`로 그 시점의 정답을 다시 계산해서 대조할 것.)

- [ ] **Step 6: 시간 모름 케이스로 회귀 확인**

Run: 같은 화면에서 "태어난 시간을 몰라요" 체크 후 같은 생년월일(2020-10-16)로 다시 조회.

Expected: 대운표/세운표/월운표 전부 렌더링되지 않음("대운"/"세운"/"월운" 라벨도 없음). 에러 없음.

- [ ] **Step 7: 전체 테스트 스위트 재실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 `js/app.js`, `css/style.css`만 건드렸고 둘 다 브라우저 전용이라 새 Node 테스트는 추가되지 않음 — 기존 테스트가 전부 그대로 통과하는지만 확인)

- [ ] **Step 8: 커밋**

```bash
git add js/app.js css/style.css
git commit -m "feat(saju): render wolun (monthly fortune) table below seun table

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
