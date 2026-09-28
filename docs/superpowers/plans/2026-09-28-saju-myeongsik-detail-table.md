# 사주 명식 상세표 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주 리딩 결과 화면의 명식표(년/월/일/시주)를 십성·지장간·12운성·납음오행·충 표시가 있는 상세 표로 교체한다.

**Architecture:** `js/saju-calc.js`에 다섯 개의 순수 계산 함수(십성/지장간/12운성/납음/충)를 추가하고, `js/app.js`의 `showSajuSummary()`가 이 함수들을 조합해 새 HTML 표를 만든다. 오행별 배경색은 `css/style.css`에 5개 클래스로 추가한다. 대운표·오행균형·리딩 문구 로직은 그대로 둔다.

**Tech Stack:** 바닐라 JS(브라우저 전역 스크립트 + Node `module.exports` 겸용), 순수 `assert` 기반 테스트(`node scripts/run-tests.js`), 별도 빌드 도구 없음.

## Global Constraints

- 새 함수는 전부 `js/saju-calc.js`의 기존 패턴(순수 함수, `if (typeof module !== 'undefined' ...)` 하단 export)을 따른다.
- 기존 `CHEONGAN`/`JIJI`/`CHEONGAN_ELEMENT`/`JIJI_ELEMENT`/`getStemElement`/`isYangStem`/`normalizeMod` 등 이미 정의된 것들을 재사용하고, 중복 정의하지 않는다.
- 지장간은 **정기(본기) 1개만** 사용한다(초기/중기 없음).
- 형충회합 중 **충(沖)만** 구현한다.
- 이번 스코프는 원국표만: 세운/월운/궁합모드/대운표 개선/진태양시보정은 손대지 않는다.
- 시주가 없을 때(시간 모름)는 표에서 시주 컬럼 자체를 생략한다(지금 동작과 동일).
- 커밋 메시지 끝에는 다음 줄을 포함한다: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: 십성(十星) 계산 함수

**Files:**
- Modify: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 기존 `getStemElement(stemIdx)`, `isYangStem(stemIdx)`, `normalizeMod(n, m)`
- Produces: `getSipsin(dayStemIdx, targetStemIdx)` → 문자열('비견'|'겁재'|'식신'|'상관'|'편재'|'정재'|'편관'|'정관'|'편인'|'정인'). 이후 Task 8(app.js)이 이 함수를 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/saju-calc.test.js` 맨 위 `require` 목록에 `getSipsin`을 추가하고(다른 이름들과 같은 방식으로 콤마로 나열), 파일 맨 끝에 아래를 추가:

```js
// getSipsin: 일간 대비 대상 천간의 십성
// 일간 갑(0,목,양) 기준
assert.strictEqual(getSipsin(0, 0), '비견'); // 갑 vs 갑: 같은오행, 같은음양
assert.strictEqual(getSipsin(0, 2), '식신'); // 갑 vs 병(화): 목생화, 둘다양
assert.strictEqual(getSipsin(0, 3), '상관'); // 갑 vs 정(화,음): 목생화, 음양다름
assert.strictEqual(getSipsin(0, 6), '편재'); // 갑 vs 경(금,양): 목극금 방향 아님 주의 -> 아래 확인
assert.strictEqual(getSipsin(0, 7), '정재'); // 갑 vs 신(금,음)
assert.strictEqual(getSipsin(0, 4), '편관'); // 갑 vs 무(토,양): 토가 목을 극함? 실제로는 목극토이므로 무는 갑에게 재성이어야 함 -> 아래 재검증
assert.strictEqual(getSipsin(0, 9), '정인'); // 갑 vs 계(수,음): 수생목

// 사용자가 준 스크린샷 예시로 교차검증 (일간 임=8, 수, 양)
assert.strictEqual(getSipsin(8, 8), '비견');
assert.strictEqual(getSipsin(8, 6), '편인'); // 임 vs 경(금,양): 금생수, 같은음양
assert.strictEqual(getSipsin(8, 2), '편재'); // 임 vs 병(화,양): 수극화, 같은음양
assert.strictEqual(getSipsin(8, 4), '편관'); // 임 vs 무(토,양): 토극수, 같은음양

console.log('All getSipsin tests passed');
```

위 주석 중 `갑 vs 경`, `갑 vs 무` 부분은 손으로 다시 계산해서 실제 기대값으로 바꿔야 한다(Step 3에서 구현하면서 아래 표로 확정):

오행 순환 순서는 `ELEMENT_ORDER = ['목','화','토','금','수']`(목생화, 화생토, 토생금, 금생수, 수생목). `diff = (targetElIdx - dayElIdx + 5) % 5`:
- diff 0 → 비겁(같은오행): 같은음양=비견, 다른음양=겁재
- diff 1 → 식상(내가 생함): 같은음양=식신, 다른음양=상관
- diff 2 → 재성(내가 극함): 같은음양=편재, 다른음양=정재
- diff 3 → 관성(나를 극함): 같은음양=편관, 다른음양=정관
- diff 4 → 인성(나를 생함): 같은음양=편인, 다른음양=정인

갑(목,idx0) vs 경(금,idx6): diff=(3-0+5)%5=3 → 편관 (금극목이므로 관성 맞음. 위 임시 주석의 '편재'는 오타였다 — Step1에서 코드로 옮길 때 `'편관'`으로 적을 것)
갑(목,idx0) vs 무(토,idx4): diff=(2-0+5)%5=2 → 편재 (목극토이므로 재성 맞음. 위 임시 주석의 '편관'도 오타 — `'편재'`로 적을 것)

**최종 확정된 테스트 값**(Step 1에서 실제로 파일에 쓸 내용):

```js
assert.strictEqual(getSipsin(0, 0), '비견');
assert.strictEqual(getSipsin(0, 2), '식신');
assert.strictEqual(getSipsin(0, 3), '상관');
assert.strictEqual(getSipsin(0, 6), '편관');
assert.strictEqual(getSipsin(0, 7), '정관');
assert.strictEqual(getSipsin(0, 4), '편재');
assert.strictEqual(getSipsin(0, 9), '정인');
assert.strictEqual(getSipsin(8, 8), '비견');
assert.strictEqual(getSipsin(8, 6), '편인');
assert.strictEqual(getSipsin(8, 2), '편재');
assert.strictEqual(getSipsin(8, 4), '편관');

console.log('All getSipsin tests passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: `getSipsin is not defined` 관련 에러로 실패

- [ ] **Step 3: 최소 구현**

`js/saju-calc.js`에서 `getStemElement` 함수 정의 바로 다음(현재 파일 150번째 줄 근처, `function getElementCounts` 이전)에 추가:

```js
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
```

`module.exports` 목록에 `getElementOrderIndex, getSipsin` 추가.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: 마지막 줄에 `All getSipsin tests passed` 출력, 에러 없이 종료(exit code 0)

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add getSipsin (ten gods) calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 지장간(정기) 조회 함수

**Files:**
- Modify: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 없음(고정 테이블)
- Produces: `getJijanggan(branchIdx)` → 천간 인덱스(0~9, `CHEONGAN` 배열 인덱스). Task 8이 이 값을 `getSipsin`의 두번째 인자로 그대로 넘긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`require` 목록에 `getJijanggan` 추가. 파일 끝에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: `getJijanggan is not defined` 에러

- [ ] **Step 3: 최소 구현**

`js/saju-calc.js`의 `getSipsin` 함수 다음에 추가:

```js
// 지지별 정기(본기) 지장간 — CHEONGAN 인덱스. 순서: 자축인묘진사오미신유술해
const JIJANGGAN_JEONGGI = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

function getJijanggan(branchIdx) {
  return JIJANGGAN_JEONGGI[branchIdx];
}
```

`module.exports`에 `getJijanggan` 추가.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: `All getJijanggan tests passed` 출력

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add getJijanggan (hidden stem) lookup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: 12운성 계산 함수

**Files:**
- Modify: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 기존 `isYangStem(stemIdx)`, `normalizeMod(n, m)`
- Produces: `getTwelveLifeStage(dayStemIdx, targetBranchIdx)` → 문자열('장생'|'목욕'|'관대'|'건록'|'제왕'|'쇠'|'병'|'사'|'묘'|'절'|'태'|'양')

- [ ] **Step 1: 실패하는 테스트 작성**

`require` 목록에 `getTwelveLifeStage` 추가. 파일 끝에 추가:

```js
// getTwelveLifeStage: 일간 기준 대상 지지의 12운성
// 일간 임(8,수,양)의 장생지는 신(8). 순행(양간)이므로 신에서 시작해 지지 순서대로 진행.
assert.strictEqual(getTwelveLifeStage(8, 8), '장생'); // 신
assert.strictEqual(getTwelveLifeStage(8, 4), '묘');   // 진 (스크린샷 일주 예시)
assert.strictEqual(getTwelveLifeStage(8, 10), '관대'); // 술 (스크린샷 월주 예시)
assert.strictEqual(getTwelveLifeStage(8, 0), '제왕');  // 자 (스크린샷 년주 예시)

console.log('All getTwelveLifeStage tests passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: `getTwelveLifeStage is not defined` 에러

- [ ] **Step 3: 최소 구현**

`js/saju-calc.js`의 `getJijanggan` 다음에 추가:

```js
const TWELVE_LIFESTAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 천간별 장생 지지(화토동법: 무=병과 동일, 기=정과 동일). 순서: 갑을병정무기경신임계
const LIFESTAGE_START_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

function getTwelveLifeStage(dayStemIdx, targetBranchIdx) {
  const direction = isYangStem(dayStemIdx) ? 1 : -1;
  const start = LIFESTAGE_START_BRANCH[dayStemIdx];
  const position = normalizeMod(direction * (targetBranchIdx - start), 12);
  return TWELVE_LIFESTAGES[position];
}
```

`module.exports`에 `getTwelveLifeStage` 추가.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: `All getTwelveLifeStage tests passed` 출력

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add getTwelveLifeStage (12-stage cycle) calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: 납음오행 조회 함수

**Files:**
- Modify: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 없음(고정 테이블)
- Produces: `getGanjiIndex(stemIdx, branchIdx)` → 0~59 정수, `getNapjeong(stemIdx, branchIdx)` → 문자열(납음 이름)

- [ ] **Step 1: 실패하는 테스트 작성**

`require` 목록에 `getGanjiIndex, getNapjeong` 추가. 파일 끝에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: `getGanjiIndex is not defined` 에러

- [ ] **Step 3: 최소 구현**

`js/saju-calc.js`의 `getTwelveLifeStage` 다음에 추가:

```js
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
```

`module.exports`에 `getGanjiIndex, getNapjeong` 추가.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: `All getNapjeong tests passed` 출력

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add getNapjeong (60-ganji sound element) lookup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: 충(沖) 판정 함수

**Files:**
- Modify: `js/saju-calc.js`
- Test: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: 기존 `normalizeMod(n, m)`
- Produces: `isChungBranchPair(branchIdxA, branchIdxB)` → boolean

- [ ] **Step 1: 실패하는 테스트 작성**

`require` 목록에 `isChungBranchPair` 추가. 파일 끝에 추가:

```js
// isChungBranchPair: 지지 충 판정 (자오/축미/인신/묘유/진술/사해)
assert.strictEqual(isChungBranchPair(0, 6), true);  // 자-오
assert.strictEqual(isChungBranchPair(1, 7), true);  // 축-미
assert.strictEqual(isChungBranchPair(4, 10), true); // 진-술
assert.strictEqual(isChungBranchPair(6, 0), true);  // 순서 바뀌어도 true
assert.strictEqual(isChungBranchPair(0, 1), false); // 자-축은 충 아님
assert.strictEqual(isChungBranchPair(4, 8), false); // 진-신은 충 아님

console.log('All isChungBranchPair tests passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/saju-calc.test.js`
Expected: `isChungBranchPair is not defined` 에러

- [ ] **Step 3: 최소 구현**

`js/saju-calc.js`의 `getNapjeong` 다음에 추가:

```js
function isChungBranchPair(branchIdxA, branchIdxB) {
  return normalizeMod(branchIdxA - branchIdxB, 12) === 6;
}
```

`module.exports`에 `isChungBranchPair` 추가.

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: `All isChungBranchPair tests passed` 출력

- [ ] **Step 5: 커밋**

```bash
git add js/saju-calc.js tests/saju-calc.test.js
git commit -m "feat(saju): add isChungBranchPair (branch clash) detection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: 골든케이스 통합 테스트

이전 다섯 태스크는 각 함수를 독립적으로 테스트했다. 이 태스크는 사용자가 제공한 실제 예시(양력 2020-10-16 16:00, 년주庚子/월주丙戌/일주壬辰/시주戊申) 하나를 놓고 `calculateSaju`부터 시작해서 새 함수 다섯 개를 전부 연결해 봤을 때 값이 서로 모순 없이 맞물리는지 확인한다.

**Files:**
- Modify: `tests/saju-calc.test.js`

**Interfaces:**
- Consumes: `calculateSaju`, `getSipsin`, `getJijanggan`, `getTwelveLifeStage`, `getNapjeong`, `isChungBranchPair`(모두 Task 1~5에서 완성됨)
- Produces: 없음(회귀 테스트만 추가)

- [ ] **Step 1: 테스트 작성**

파일 끝에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실행해서 통과 확인**

Run: `node tests/saju-calc.test.js`
Expected: 에러 없이 끝까지 실행되고 `All saju myeongsik detail golden-case tests passed` 출력. 만약 실패하면 Task 1~5 구현이나 이 테스트의 기대값 자체를 다시 손계산해서 맞출 것 — 절대 assert를 실제 결과에 맞춰 임의로 고치지 말 것(설계 문서의 검증 계산을 다시 확인).

- [ ] **Step 3: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS, 마지막 줄이 `N test files, N passed, 0 failed`

- [ ] **Step 4: 커밋**

```bash
git add tests/saju-calc.test.js
git commit -m "test(saju): add golden-case regression test for myeongsik detail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: 오행 색상 CSS 클래스 + 명식표 스타일

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: 없음
- Produces: CSS 클래스 `.el-wood`, `.el-fire`, `.el-earth`, `.el-metal`, `.el-water`(오행별 배경/글자색), `.myeongsik-detail-table`과 관련 클래스(표 레이아웃). Task 8의 HTML이 이 클래스명을 그대로 사용한다.

- [ ] **Step 1: 기존 `.myeongsik-table` 관련 CSS를 확인하고 낡은 규칙을 정리**

`css/style.css:227` 부근의 아래 블록을:

```css
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
```

아래로 교체(대운표 부분은 그대로 보존, `.myeongsik-*` 관련 선택자만 제거):

```css
.daeun-table {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.daeun-col {
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

.daeun-ganji { font-size: 16px; font-weight: bold; color: #d4af37; }
.daeun-age { font-size: 11px; color: #c9bde0; }

.myeongsik-detail-wrap { margin: 16px 0; overflow-x: auto; }

.myeongsik-detail-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 320px;
  text-align: center;
  font-size: 13px;
}

.myeongsik-detail-table th, .myeongsik-detail-table td {
  border: 1px solid #4a3a68;
  padding: 6px 4px;
}

.myeongsik-detail-table thead th { background: #1a1330; color: #c9bde0; font-weight: normal; }
.myeongsik-detail-table tbody th { background: #1a1330; color: #c9bde0; font-weight: normal; white-space: nowrap; }

.myeongsik-detail-table .ganji-cell { font-size: 18px; font-weight: bold; letter-spacing: 2px; }

.el-wood { background: #3a7a4a; color: #fff; }
.el-fire { background: #a33333; color: #fff; }
.el-earth { background: #8b744e; color: #fff; }
.el-metal { background: #d6bd8b; color: #111; }
.el-water { background: #1a2a3a; color: #d6bd8b; }

.chung-note { text-align: center; color: #c9bde0; font-size: 13px; margin: 4px 0 8px; }
```

`css/salon.css:70`의 `.myeongsik-col, .daeun-col { background: #0c1726; border-color: var(--line); }`는 `.daeun-col { background: #0c1726; border-color: var(--line); }`로 수정(`.myeongsik-col` 제거).

- [ ] **Step 2: 브라우저에서 CSS 문법 오류가 없는지 확인**

Run: 없음(정적 CSS). 대신 이 저장소의 dev 서버(`http://localhost:8080/`, `.claude/launch.json`의 `static-preview`)가 이미 떠 있다면 아무 페이지나 새로고침해서 콘솔에 CSS 파싱 에러가 없는지 확인. Task 8 완료 후 실제 표가 이 클래스들을 쓰므로 시각적 확인은 Task 8에서 한다.

- [ ] **Step 3: 커밋**

```bash
git add css/style.css css/salon.css
git commit -m "style(saju): add element-color classes and myeongsik detail table styles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `showSajuSummary()` 렌더링 교체

**Files:**
- Modify: `js/app.js:633-684`(`showSajuSummary` 함수)

**Interfaces:**
- Consumes: Task 1~5의 `getSipsin`, `getJijanggan`, `getTwelveLifeStage`, `getNapjeong`, `isChungBranchPair`(브라우저 전역으로 이미 로드돼 있음, `data/tarot-data.js`처럼 `<script>` 태그로 불러오는 `js/saju-calc.js`가 이미 `index.html`에 포함돼 있음 — 별도 script 태그 추가 불필요)
- Produces: 없음(최종 렌더링 결과물)

- [ ] **Step 1: `showSajuSummary` 안의 `myeongsikRows`/`myeongsikHtml` 생성부를 교체**

`js/app.js`에서 아래 블록(현재 639~649줄)을:

```js
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
```

아래로 교체:

```js
    const myeongsikHtml = renderMyeongsikDetailTable(saju);
```

- [ ] **Step 2: `renderMyeongsikDetailTable` 함수 작성**

`showSajuSummary` 함수 바로 위(현재 632줄, `pillarText` 함수 다음)에 새 함수를 추가:

```js
  const ELEMENT_CLASS = { 목: 'el-wood', 화: 'el-fire', 토: 'el-earth', 금: 'el-metal', 수: 'el-water' };

  function ganjiCellHtml(stemIdx, branchIdx) {
    const stemEl = getStemElement(stemIdx);
    const branchEl = JIJI_ELEMENT[branchIdx];
    return '<td class="ganji-cell">' +
      '<span class="' + ELEMENT_CLASS[stemEl] + '">' + CHEONGAN[stemIdx] + '</span>' +
      '<span class="' + ELEMENT_CLASS[branchEl] + '">' + JIJI[branchIdx] + '</span>' +
      '</td>';
  }

  // saju(연/월/일/시주)를 받아 십성/간지/지장간/12운성/납음 상세표 HTML을 만든다.
  // 시주가 없으면(시간 모름) 시주 컬럼 자체를 생략한다.
  function renderMyeongsikDetailTable(saju) {
    const pillars = [
      { key: 'hour', label: '시주', pillar: saju.hour },
      { key: 'day', label: '일주', pillar: saju.day },
      { key: 'month', label: '월주', pillar: saju.month },
      { key: 'year', label: '년주', pillar: saju.year }
    ].filter(function (p) { return p.pillar; });

    const dayStemIdx = saju.day.stemIdx;

    const headerHtml = pillars.map(function (p) { return '<th>' + p.label + '</th>'; }).join('');

    const sipsinStemRowHtml = pillars.map(function (p) {
      const text = p.key === 'day' ? '일간(나)' : getSipsin(dayStemIdx, p.pillar.stemIdx);
      return '<td>' + text + '</td>';
    }).join('');

    const ganjiRowHtml = pillars.map(function (p) {
      return ganjiCellHtml(p.pillar.stemIdx, p.pillar.branchIdx);
    }).join('');

    const sipsinBranchRowHtml = pillars.map(function (p) {
      return '<td>' + getSipsin(dayStemIdx, getJijanggan(p.pillar.branchIdx)) + '</td>';
    }).join('');

    const jijangganRowHtml = pillars.map(function (p) {
      return '<td>' + CHEONGAN[getJijanggan(p.pillar.branchIdx)] + '</td>';
    }).join('');

    const lifeStageRowHtml = pillars.map(function (p) {
      return '<td>' + getTwelveLifeStage(dayStemIdx, p.pillar.branchIdx) + '</td>';
    }).join('');

    const napjeongRowHtml = pillars.map(function (p) {
      return '<td>' + getNapjeong(p.pillar.stemIdx, p.pillar.branchIdx) + '</td>';
    }).join('');

    const chungPairs = [];
    for (let i = 0; i < pillars.length; i += 1) {
      for (let j = i + 1; j < pillars.length; j += 1) {
        if (isChungBranchPair(pillars[i].pillar.branchIdx, pillars[j].pillar.branchIdx)) {
          chungPairs.push(pillars[i].label.replace('주', '지') + '·' + pillars[j].label.replace('주', '지') +
            ' 충 (' + JIJI[pillars[i].pillar.branchIdx] + '·' + JIJI[pillars[j].pillar.branchIdx] + ')');
        }
      }
    }
    const chungHtml = chungPairs.length ? '<p class="chung-note">' + chungPairs.join(', ') + '</p>' : '';

    return '<div class="myeongsik-detail-wrap"><table class="myeongsik-detail-table">' +
      '<thead><tr><th></th>' + headerHtml + '</tr></thead>' +
      '<tbody>' +
      '<tr><th>십성</th>' + sipsinStemRowHtml + '</tr>' +
      '<tr><th>간지</th>' + ganjiRowHtml + '</tr>' +
      '<tr><th>십성</th>' + sipsinBranchRowHtml + '</tr>' +
      '<tr><th>지장간</th>' + jijangganRowHtml + '</tr>' +
      '<tr><th>12운성</th>' + lifeStageRowHtml + '</tr>' +
      '<tr><th>납음</th>' + napjeongRowHtml + '</tr>' +
      '</tbody></table></div>' + chungHtml;
  }
```

`JIJI_ELEMENT`는 `js/saju-calc.js`에 이미 정의돼 있고 `module.exports`에도 포함돼 있으니(파일 상단 `const CHEONGAN_ELEMENT = ...` 옆 줄 확인) 브라우저 전역으로 바로 쓸 수 있다. 혹시 `module.exports`에만 있고 전역 선언이 아니라면(브라우저에서 `<script>`로 로드 시 `const`는 자동으로 전역이 됨) 별도 조치 불필요 — 이미 다른 곳(`getElementCounts` 등)에서도 같은 방식으로 쓰고 있다.

- [ ] **Step 3: 시간을 아는 케이스로 브라우저 확인**

Run: preview_start `{name: "static-preview"}`로 dev 서버 열기(이미 떠 있으면 생략) → `http://localhost:8080/` 접속 → 사주 모드 선택 → 생년월일 2020-10-16, 시간 16:00 입력 → 결과 보기.

Expected:
- 시주/일주/월주/년주 4컬럼 표가 뜨고, 첫 행(십성)에 편관/일간(나)/편재/편인, 간지 행에 무신/임진/병술/경자(각 글자 배경색이 오행별로 다름), 12운성 행에 장생/묘/관대/제왕, 납음 행에 대역토/장류수/옥상토/벽상토가 나옴.
- 표 아래에 "일지·월지 충 (辰·戌)" 문구가 나옴(한글 지지 표기이므로 실제로는 "일지·월지 충 (진·술)"로 나와야 함 — Step 2 코드에서 `JIJI[...]`를 쓰므로 자동으로 한글).
- 콘솔에 JS 에러 없음.

- [ ] **Step 4: 시간 모름 케이스로 브라우저 확인**

Run: 같은 화면에서 "시간을 몰라요" 체크 후 같은 생년월일로 다시 조회.

Expected: 표가 3컬럼(일주/월주/년주)만 나오고, 시주 관련 줄이 아예 없음. 에러 없음.

- [ ] **Step 5: 전체 테스트 스위트 재실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 `js/app.js`만 건드렸고 브라우저 전용 코드라 새 Node 테스트는 추가되지 않음 — 기존 테스트가 전부 그대로 통과하는지만 확인)

- [ ] **Step 6: 커밋**

```bash
git add js/app.js
git commit -m "feat(saju): render detailed myeongsik table with sipsin/jijanggan/lifestage/napjeong/chung

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: 최종 정리

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트 스위트 최종 확인**

Run: `node scripts/run-tests.js`
Expected: `N test files, N passed, 0 failed`

- [ ] **Step 2: git status로 누락된 변경사항 없는지 확인**

Run: `git status --short`
Expected: 의도하지 않은 미커밋 변경 없음(있다면 무엇인지 확인 후 커밋하거나 되돌림)

- [ ] **Step 3: push**

```bash
git push origin master
```

Expected: 정상 push. 이 단계는 사용자에게 push 여부를 먼저 확인한 뒤 진행한다(이 저장소의 관례 — 매 작업 단위로 push해왔음).
