# 사주 세운(10년 연운표) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주 리딩 결과 화면의 대운표 아래에, 현재 나이가 속한 대운 10년 구간을 연도 단위로 쪼갠 "세운표"를 추가한다.

**Architecture:** `js/saju-calc.js`에 순수 함수 `getSeunList(startYear, count)`를 추가하고(기존 `getYearPillar` 재사용), `js/app.js`의 `showSajuSummary()`에서 이미 계산된 활성 대운 구간을 기준으로 이 함수를 호출해 세운표 HTML을 만든다. CSS는 기존 `.daeun-*` 클래스를 그대로 복제한 `.seun-*` 클래스로 추가한다.

**Tech Stack:** 바닐라 JS(브라우저 전역 스크립트 + Node `module.exports` 겸용), 순수 `assert` 기반 테스트(`node scripts/run-tests.js`), 별도 빌드 도구 없음.

## Global Constraints

- 스코프는 원국표(사주팔자)가 아니라 대운/세운 렌더링 블록에 한정한다. 월운, 궁합모드 적용은 이 계획에 없다(설계 문서 "이번 스코프에서 제외" 참고).
- 세운표는 대운표와 완전히 동일한 시각적 수준(간지 + 나이/연도 텍스트만, 오행 색상 없음)을 유지한다.
- 세운표는 시간을 아는 케이스(`saju.hour`가 존재)에서만 렌더링한다 — 기존 대운표와 동일한 게이트.
- 코드 스타일: 이 저장소의 `js/app.js`/`js/saju-calc.js`는 화살표 함수를 쓰지 않고 `function` 표현식만 사용한다(`.map(function (x) {...})` 등). 새 코드도 이 스타일을 따른다.
- 사용자 노출 텍스트는 전부 한국어.
- 커밋 메시지 끝에는 정확히 다음 줄을 verbatim으로 포함한다(서브에이전트 자신의 모델명으로 바꾸지 말 것):
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: `getSeunList` 순수 함수 + 단위 테스트

**Files:**
- Modify: `js/saju-calc.js:259-274`
- Modify: `tests/saju-calc.test.js:1-31`(require 목록), `tests/saju-calc.test.js`의 대운 테스트 블록 뒤(183번째 줄 `console.log('All saju-calc daeun tests passed');` 다음)

**Interfaces:**
- Produces: `getSeunList(startYear, count)` → `Array<{ year: number, stemIdx: number, branchIdx: number }>`. `js/saju-calc.js`의 `module.exports`에 포함되어 Node 테스트에서 쓸 수 있고, `index.html`이 `js/saju-calc.js`를 `<script>` 태그로 `js/app.js`보다 먼저 로드하므로 브라우저 전역으로도 자동으로 쓸 수 있다(다른 함수들과 동일한 패턴).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/saju-calc.test.js` 1~31번째 줄의 require 목록에서 `isChungBranchPair` 다음에 `getSeunList`를 추가:

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
  getSeunList
} = require('../js/saju-calc.js');
```

그다음 183번째 줄 `console.log('All saju-calc daeun tests passed');` 바로 뒤(185번째 줄 `// getStemElement` 주석 앞)에 새 테스트 블록을 추가:

```js
// getSeunList: 시작 연도부터 count개 연도의 세운 간지 목록
// (getYearPillar(2024)=갑진, getYearPillar(2025)=을사, getYearPillar(2026)=병오는 위에서 이미 검증됨)
const seunGoldenList = getSeunList(2024, 3);
assert.strictEqual(seunGoldenList.length, 3);
assert.strictEqual(seunGoldenList[0].year, 2024);
assert.strictEqual(seunGoldenList[1].year, 2025);
assert.strictEqual(seunGoldenList[2].year, 2026);
assert.strictEqual(pillarLabel(seunGoldenList[0]), '갑진');
assert.strictEqual(pillarLabel(seunGoldenList[1]), '을사');
assert.strictEqual(pillarLabel(seunGoldenList[2]), '병오');

console.log('All getSeunList tests passed');
```

(`pillarLabel`은 58번째 줄에 이미 정의된 `function pillarLabel(p) { return CHEONGAN[p.stemIdx] + JIJI[p.branchIdx]; }` 헬퍼를 재사용한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: FAIL — `getSeunList is not a function` (아직 `js/saju-calc.js`에 구현 없음, require 구조분해로 `undefined`가 들어와 호출 시 TypeError 발생)

- [ ] **Step 3: `getSeunList` 최소 구현**

`js/saju-calc.js`의 259~274번째 줄(`getDaeunList` 함수와 `module.exports` 블록)을 아래로 교체:

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
// "OOOO년 세운"은 그 해 입춘~다음해 입춘 전을 가리키며 getYearPillar(캘린더연도) 공식과 정확히 일치하므로 그대로 재사용한다.
function getSeunList(startYear, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const year = startYear + i;
    const pillar = getYearPillar(year);
    list.push({ year: year, stemIdx: pillar.stemIdx, branchIdx: pillar.branchIdx });
  }
  return list;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay, CHEONGAN, JIJI, getYearPillar, getMonthOffset, getMonthPillar, findIpchun, toJDN, getDayPillarIndex, getHourBranchIndex, getHourStemIndex, kstDateToInstant, getSajuYear, calculateSaju, getElementCounts, classifyElementBalance, getDaeunDirection, getDaeunStartAge, getDaeunList, getSeunList, getStemElement, getElementOrderIndex, getSipsin, getJijanggan, getTwelveLifeStage, getGanjiIndex, getNapjeong, isChungBranchPair };
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
git commit -m "feat(saju): add getSeunList for yearly (se-un) fortune calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 세운표 렌더링 + 대운/세운 라벨 + CSS

**Files:**
- Modify: `js/app.js:719-733`(`showSajuSummary` 안 `daeunHtml` 계산부), `js/app.js:743`(`summaryEl.innerHTML` 조립부)
- Modify: `css/style.css:245-250`

**Interfaces:**
- Consumes: Task 1의 `getSeunList(startYear, count)`(브라우저 전역, 별도 script 태그 추가 불필요 — `index.html`이 `js/saju-calc.js`를 이미 `js/app.js`보다 먼저 로드함), 기존 `pillarText(pillar)`, `getDaeunDirection`, `getDaeunStartAge`, `getDaeunList`.
- Produces: 없음(최종 렌더링 결과물).

- [ ] **Step 1: `daeunHtml` 계산부를 확장해 `seunHtml`도 함께 계산**

`js/app.js`의 719~733번째 줄:

```js
    let daeunHtml = '';
    if (saju.hour) {
      const direction = getDaeunDirection(saju.year.stemIdx, selectedGender);
      const startAge = getDaeunStartAge(saju.instant, saju.monthOffset, direction);
      const daeunList = getDaeunList(saju.month.stemIdx, saju.month.branchIdx, direction, startAge);
      const today = new Date();
      // 대운 구간은 한국식 세는나이 기준으로 판단
      const currentAge = today.getFullYear() - input.year + 1;
      daeunHtml = '<div class="daeun-table">' +
        daeunList.map(function (d) {
          const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
          return '<div class="daeun-col' + (isCurrent ? ' current' : '') + '"><span class="daeun-ganji">' + pillarText(d) + '</span><span class="daeun-age">' + d.startAge + '~' + d.endAge + '세</span></div>';
        }).join('') +
        '</div>';
    }
```

아래로 교체:

```js
    let daeunHtml = '';
    let seunHtml = '';
    if (saju.hour) {
      const direction = getDaeunDirection(saju.year.stemIdx, selectedGender);
      const startAge = getDaeunStartAge(saju.instant, saju.monthOffset, direction);
      const daeunList = getDaeunList(saju.month.stemIdx, saju.month.branchIdx, direction, startAge);
      const today = new Date();
      // 대운 구간은 한국식 세는나이 기준으로 판단
      const currentAge = today.getFullYear() - input.year + 1;
      daeunHtml = '<p class="table-label">대운</p><div class="daeun-table">' +
        daeunList.map(function (d) {
          const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
          return '<div class="daeun-col' + (isCurrent ? ' current' : '') + '"><span class="daeun-ganji">' + pillarText(d) + '</span><span class="daeun-age">' + d.startAge + '~' + d.endAge + '세</span></div>';
        }).join('') +
        '</div>';

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

- [ ] **Step 2: `summaryEl.innerHTML` 조립부에 `seunHtml` 추가**

`js/app.js`의 741~744번째 줄(Step 1 수정 후에는 줄 번호가 뒤로 밀려 있을 수 있음 — `summaryEl.innerHTML = '<h3>' + heading` 로 시작하는 블록을 찾을 것):

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml +
      extraHtml;
```

아래로 교체:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml + seunHtml +
      extraHtml;
```

- [ ] **Step 3: CSS 클래스 추가**

`css/style.css`의 245~250번째 줄:

```css
.daeun-col.current { border-color: #d4af37; background: #2a1f42; }

.daeun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.daeun-age { font-size: 11px; color: #c9bde0; }

.myeongsik-detail-wrap { margin: 16px 0; overflow-x: auto; }
```

아래로 교체:

```css
.daeun-col.current { border-color: #d4af37; background: #2a1f42; }

.daeun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.daeun-age { font-size: 11px; color: #c9bde0; }

.table-label { font-size: 12px; color: #c9bde0; margin: 16px 0 4px; }

.seun-table {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.seun-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #4a3a68;
  border-radius: 8px;
  background: #1a1330;
}

.seun-col.current { border-color: #d4af37; background: #2a1f42; }

.seun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.seun-age { font-size: 11px; color: #c9bde0; }

.myeongsik-detail-wrap { margin: 16px 0; overflow-x: auto; }
```

- [ ] **Step 4: 시간을 아는 케이스로 브라우저 확인**

Run: preview_start `{name: "static-preview"}`로 dev 서버 열기(이미 떠 있으면 생략) → `http://localhost:8080/` 접속 → 사주 모드 선택 → 양력, 생년월일 2020-10-16, 시간 16:00, 성별 남자(기본 선택값) 입력 → 결과 보기.

Expected(사전에 `node -e`로 직접 계산해 확정한 값, 오늘 날짜 2026-09-28 기준):
- "대운" 라벨과 함께 대운표 9칸: `7~16세 정해`(금색 테두리로 강조, 현재 구간), `17~26세 무자`, `27~36세 기축`, `37~46세 경인`, `47~56세 신묘`, `57~66세 임진`, `67~76세 계사`, `77~86세 갑오`, `87~96세 을미`.
- "세운" 라벨과 함께 세운표 10칸(대운표 바로 아래): `2026년 · 7세 병오`(금색 테두리로 강조, 올해), `2027년 · 8세 정미`, `2028년 · 9세 무신`, `2029년 · 10세 기유`, `2030년 · 11세 경술`, `2031년 · 12세 신해`, `2032년 · 13세 임자`, `2033년 · 14세 계축`, `2034년 · 15세 갑인`, `2035년 · 16세 을묘`.
- 세운표 첫 칸의 연도(2026)가 활성 대운 구간의 시작 나이(7세)와 일치(출생연도 2020 + 7 - 1 = 2026).
- 브라우저 콘솔에 JS 에러 없음(`read_console_messages`로 확인).

- [ ] **Step 5: 시간 모름 케이스로 회귀 확인**

Run: 같은 화면에서 "태어난 시간을 몰라요" 체크 후 같은 생년월일(2020-10-16)로 다시 조회.

Expected: 대운표와 세운표 둘 다 렌더링되지 않음("대운"/"세운" 라벨도 없음). 에러 없음. (기존 대운표 게이트 `if (saju.hour)`를 세운표도 그대로 공유하므로 회귀 없어야 함.)

- [ ] **Step 6: 전체 테스트 스위트 재실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 `js/app.js`, `css/style.css`만 건드렸고 둘 다 브라우저 전용이라 새 Node 테스트는 추가되지 않음 — 기존 테스트가 전부 그대로 통과하는지만 확인)

- [ ] **Step 7: 커밋**

```bash
git add js/app.js css/style.css
git commit -m "feat(saju): render seun (yearly fortune) table below daeun table

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
