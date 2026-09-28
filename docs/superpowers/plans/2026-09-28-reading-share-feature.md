# 리딩 결과 공유 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로/별자리/띠운세/사주/궁합 5개 리딩 결과 화면에 "공유하기" 버튼을 추가해, 방금 본 리딩을 공유시트(모바일) 또는 클립보드 복사(데스크톱)로 공유할 수 있게 한다.

**Architecture:** 공유 텍스트는 새 함수를 만들지 않고 이미 렌더링된 `#summary` DOM에서 고정된 CSS 선택자 목록으로 필요한 요소만 읽어 조립한다(`buildShareText`). 클릭 시 `navigator.share` 지원 여부로 공유시트/클립보드를 분기하는 `shareCurrentReading`/`copyShareText`를 추가하고, 5개 리딩 렌더링 함수 각각에 버튼 노출 한 줄씩만 추가한다.

**Tech Stack:** 바닐라 JS(브라우저 전용, `js/app.js`는 IIFE라 Node 테스트 불가), `navigator.share`/`navigator.clipboard` Web API, 별도 빌드 도구 없음.

## Global Constraints

- `js/app.js`는 브라우저 전용 IIFE라 이 기능은 Node `assert` 테스트로 커버할 수 없다 — 전부 브라우저 수동/자동화 검증으로 확인한다.
- 공유 텍스트는 반드시 **이미 렌더링된 DOM**에서 읽어야 한다 — `renderKeywordsAdviceHtml`을 다시 호출하면 안 된다(내부에서 키워드/조언을 랜덤으로 다시 뽑아 화면과 달라질 수 있음).
- 사이트 URL 상수: `https://nwb010118.github.io/tarot-reading/` (하드코딩, `SITE_URL`).
- 버튼 id는 `share-button`, 기본 라벨 "공유하기", 복사 성공 시 1.5초간 "복사했어요!"로 바뀜.
- 화살표 함수를 쓰지 않고 `function` 표현식만 사용한다(이 저장소의 기존 스타일).
- 사용자 노출 텍스트는 전부 한국어.
- 커밋 메시지 끝에는 정확히 다음 줄을 verbatim으로 포함한다(서브에이전트 자신의 모델명으로 바꾸지 말 것):
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: 공유 핵심 로직 + 사주 모드 연동

**Files:**
- Modify: `index.html:244-248`
- Modify: `css/style.css:68-69`
- Modify: `js/app.js:114`(변수 선언부), `js/app.js:911-912`(공유 함수 삽입 위치), `js/app.js:761-767`(`showSajuSummary` 꼬리부)

**Interfaces:**
- Produces: `buildShareText()` → `string`(공유 텍스트), `shareCurrentReading()` → `void`(클릭 핸들러에서 호출), `copyShareText(text: string)` → `void`. 전부 `js/app.js`의 IIFE 안에서만 쓰이는 내부 함수(브라우저 전역 노출 없음).
- Consumes: 기존 `summaryEl`(`#summary` 엘리먼트), 새로 추가하는 `shareButton`(`#share-button` 엘리먼트).

- [ ] **Step 1: HTML에 공유 버튼 추가**

`index.html`의 244~248번째 줄:

```html
  <section id="screen-reading" class="hidden">
    <div id="cards-container"></div>
    <div id="summary" class="hidden"></div>
    <button type="button" id="new-reading-button" class="hidden">새 리딩 시작</button>
  </section>
```

아래로 교체:

```html
  <section id="screen-reading" class="hidden">
    <div id="cards-container"></div>
    <div id="summary" class="hidden"></div>
    <button type="button" id="share-button" class="hidden">공유하기</button>
    <button type="button" id="new-reading-button" class="hidden">새 리딩 시작</button>
  </section>
```

- [ ] **Step 2: CSS에 버튼 스타일 합류**

`css/style.css`의 68~69번째 줄:

```css
#draw-button, #history-open-button, #new-reading-button,
#clear-history-button, #history-close-button {
```

아래로 교체:

```css
#draw-button, #history-open-button, #new-reading-button,
#clear-history-button, #history-close-button, #share-button {
```

- [ ] **Step 3: `shareButton` 엘리먼트 참조 추가**

`js/app.js`의 114번째 줄(`const newReadingButton = document.getElementById('new-reading-button');`) 바로 뒤에 추가:

```js
  const shareButton = document.getElementById('share-button');
```

(전체 컨텍스트 확인용 — 113~115번째 줄 현재 내용)

```js
  const summaryEl = document.getElementById('summary');
  const newReadingButton = document.getElementById('new-reading-button');
  const historyOpenButton = document.getElementById('history-open-button');
```

이걸 아래로 교체:

```js
  const summaryEl = document.getElementById('summary');
  const newReadingButton = document.getElementById('new-reading-button');
  const shareButton = document.getElementById('share-button');
  const historyOpenButton = document.getElementById('history-open-button');
```

- [ ] **Step 4: 공유 텍스트 조립/전송 함수 추가**

`js/app.js`의 912번째 줄 `newReadingButton.addEventListener('click', function () {` 바로 앞에 새 블록을 삽입:

```js
  const SHARE_SELECTOR = 'h3, h4, .compat-score, .compat-tier-label, .reading-lead, .reading-body, .card-keywords, .card-advice';
  const SITE_URL = 'https://nwb010118.github.io/tarot-reading/';

  function buildShareText() {
    const parts = Array.prototype.map.call(
      summaryEl.querySelectorAll(SHARE_SELECTOR),
      function (el) { return el.textContent.trim(); }
    );
    return parts.join('\n\n') + '\n\n점집에서 나도 운세 보러 가기\n' + SITE_URL;
  }

  function copyShareText(text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      const original = shareButton.textContent;
      shareButton.textContent = '복사했어요!';
      setTimeout(function () { shareButton.textContent = original; }, 1500);
    });
  }

  function shareCurrentReading() {
    const text = buildShareText();
    if (navigator.share) {
      navigator.share({ text: text }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        copyShareText(text);
      });
    } else {
      copyShareText(text);
    }
  }

  shareButton.addEventListener('click', shareCurrentReading);

  newReadingButton.addEventListener('click', function () {
```

(마지막 줄 `newReadingButton.addEventListener('click', function () {`은 기존 코드 그대로 — 새 블록 다음에 원래 있던 줄이 자연스럽게 이어지도록 새 블록을 그 줄 **앞**에 끼워 넣는다는 뜻이다. `newReadingButton.addEventListener` 줄 자체는 수정하지 않는다.)

- [ ] **Step 5: `showSajuSummary`에 공유 버튼 노출 추가**

`js/app.js`의 761~767번째 줄:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml + seunHtml +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

아래로 교체:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml + daeunHtml + seunHtml +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }
```

- [ ] **Step 6: 브라우저에서 사주 모드로 공유 텍스트 검증**

Run: preview_start `{name: "static-preview"}`로 dev 서버 열기(이미 떠 있으면 생략) → `http://localhost:8080/` 접속 → 사주 모드 선택 → 양력, 생년월일 2020-10-16, 시간 16:00 입력 → 운세 보기.

그다음 `javascript_tool`로 클립보드를 가로채는 스텁을 심고 공유 버튼을 클릭:

```js
navigator.clipboard.writeText = function (t) { window.__shareText = t; return Promise.resolve(); };
document.getElementById('share-button').click();
```

약 200ms 뒤(또는 `wait` 액션으로 짧게 대기 후) `window.__shareText`를 읽어 확인:

```js
window.__shareText
```

Expected:
- 텍스트 맨 앞에 `<h3>` 내용(예: `임수 일간 · 오늘 오늘의운 리딩` 형태의 헤딩)이 있음.
- `키워드:`로 시작하는 줄과 `조언:`으로 시작하는 줄이 있음.
- 맨 끝이 `점집에서 나도 운세 보러 가기\nhttps://nwb010118.github.io/tarot-reading/`로 끝남.
- **다음 문자열이 전혀 포함되지 않음**: `시주`, `일주`, `월주`, `년주`(명식표 헤더), `대운`, `세운`(대운/세운표 라벨), `목1`(오행 개수 요약 시작 부분), `초록색 =`(오행 범례) — 표/범례 콘텐츠가 제외됐는지 확인하는 것이 핵심.
- `document.getElementById('share-button').textContent`가 `복사했어요!`로 바뀌어 있음 → 1.6초 후 다시 읽으면 `공유하기`로 돌아와 있음.
- 브라우저 콘솔에 에러 없음.

- [ ] **Step 7: `navigator.share` 경로(모바일 공유시트) 동작 확인**

테스트에 쓰는 브라우저는 보통 `navigator.share`가 없어서(Step 6은 자동으로 클립보드 폴백 경로를 탔음) 공유시트 분기를 별도로 확인해야 한다. 같은 사주 결과 화면에서 `javascript_tool`로:

```js
window.__sharedPayload = null;
navigator.share = function (payload) { window.__sharedPayload = payload; return Promise.resolve(); };
navigator.clipboard.writeText = function () { window.__clipboardCalled = true; return Promise.resolve(); };
window.__clipboardCalled = false;
document.getElementById('share-button').click();
```

그다음 확인:

```js
JSON.stringify({ shared: !!window.__sharedPayload, sharedTextSample: window.__sharedPayload && window.__sharedPayload.text.slice(0, 20), clipboardCalled: window.__clipboardCalled })
```

Expected: `shared`가 `true`, `sharedTextSample`이 헤딩 앞부분과 일치, `clipboardCalled`는 `false`(공유시트가 있으면 클립보드 폴백은 타지 않아야 함).

작업 끝나면 다음 스텝에 영향 없도록 `navigator.share`를 원래 상태로 되돌릴 필요는 없다(페이지를 새로고침하면 자동으로 초기화됨) — 이후 스텝은 새 페이지 로드에서 진행한다.

- [ ] **Step 8: 전체 테스트 스위트 실행(회귀 확인)**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 `index.html`, `css/style.css`, `js/app.js`만 건드렸고 전부 브라우저 전용이라 새 Node 테스트는 추가되지 않음 — 기존 테스트가 전부 그대로 통과하는지만 확인)

- [ ] **Step 9: 커밋**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat(share): add share button and text builder for saju reading

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 나머지 4개 모드(타로/별자리/띠운세/궁합) 연동

**Files:**
- Modify: `js/app.js:428-442`(`showZodiacSummary`), `js/app.js:458-472`(`showDdiSummary`), `js/app.js:788-798`(`showCompatibilitySummary`), `js/app.js:863-894`(`showSummary`, 타로)

**Interfaces:**
- Consumes: Task 1의 `shareButton`(전역 변수, 같은 IIFE 스코프), `shareCurrentReading`(이미 `shareButton`에 바인딩됨 — 이 태스크에서는 건드리지 않음).
- Produces: 없음(각 모드 렌더링 함수 마무리부에 노출 한 줄씩 추가).

- [ ] **Step 1: `showZodiacSummary`에 공유 버튼 노출 추가**

`js/app.js`의 428~442번째 줄:

```js
  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(zodiac, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(zodiac.keywords, zodiac.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

아래로 교체:

```js
  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(zodiac, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(zodiac.keywords, zodiac.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }
```

- [ ] **Step 2: `showDdiSummary`에 공유 버튼 노출 추가**

`js/app.js`의 458~472번째 줄:

```js
  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(ddi, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(ddi.keywords, ddi.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

아래로 교체:

```js
  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(ddi, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(ddi.keywords, ddi.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }
```

- [ ] **Step 3: `showCompatibilitySummary`에 공유 버튼 노출 추가**

`js/app.js`의 788~798번째 줄:

```js
  function showCompatibilitySummary(label1, label2, tierInfo) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    const extraHtml = renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice);
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail">' + renderReadingMeaning(tierInfo.text) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

아래로 교체:

```js
  function showCompatibilitySummary(label1, label2, tierInfo) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    const extraHtml = renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice);
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail">' + renderReadingMeaning(tierInfo.text) + '</div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }
```

- [ ] **Step 4: `showSummary`(타로)에 공유 버튼 노출 추가**

`js/app.js`의 891~894번째 줄:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

아래로 교체:

```js
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }
```

- [ ] **Step 5: 브라우저에서 나머지 4개 모드 공유 텍스트 검증**

Run: `http://localhost:8080/`(이미 떠 있는 dev 서버 재사용)에서 아래 4가지를 각각 진행. 매번 클릭 전에 클립보드 스텁을 다시 심는다:

```js
navigator.clipboard.writeText = function (t) { window.__shareText = t; return Promise.resolve(); };
```

**(a) 타로**: 카드 1장 스프레드로 뽑기 → 카드를 클릭해 뒤집기(요약이 뜰 때까지) → 공유 버튼 클릭 → `window.__shareText` 확인.
Expected: 카드 이름이 포함된 `<h4>`(예: `바보 (정방향)`) 텍스트가 들어있고, 키워드/조언 줄이 있고, 맨 끝은 사이트 URL로 끝남.

**(b) 별자리**: 별자리 아무거나 선택 → 운세 보기 → 공유 버튼 클릭 → 확인.
Expected: `<h3>` 헤딩(별자리 이름 포함)과 키워드/조언 줄, 사이트 URL로 끝남.

**(c) 띠운세**: 출생연도 입력(예: 1990) → 운세 보기 → 공유 버튼 클릭 → 확인.
Expected: `<h3>` 헤딩(띠 이름 포함)과 키워드/조언 줄, 사이트 URL로 끝남.

**(d) 궁합**: 궁합 종류 아무거나(예: 별자리 궁합) 선택, 두 사람 정보 입력 → 운세 보기 → 공유 버튼 클릭 → 확인.
Expected: 텍스트 안에 `%` 기호가 들어간 점수 줄과 등급 라벨 줄이 포함되어 있고, 키워드/조언 줄, 사이트 URL로 끝남.

모든 케이스에서 브라우저 콘솔에 에러가 없어야 한다.

- [ ] **Step 6: 전체 테스트 스위트 재실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 `js/app.js`만 건드렸고 브라우저 전용이라 새 Node 테스트는 추가되지 않음)

- [ ] **Step 7: 커밋**

```bash
git add js/app.js
git commit -m "feat(share): wire share button into tarot/zodiac/ddi/compatibility readings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
