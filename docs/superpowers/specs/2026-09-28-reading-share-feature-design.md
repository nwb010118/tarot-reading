# 리딩 결과 공유 기능 설계

## 배경 / 목표

타로/별자리/띠운세/사주/궁합 5개 리딩 결과 화면(`#summary`)에 "공유하기" 버튼을 추가해, 사용자가 방금 본 리딩 결과를 카카오톡 등으로 공유하거나 클립보드에 복사할 수 있게 한다. 이 사이트는 백엔드가 없는 정적 SPA이고 생년월일 등 입력값은 서버로 전송되지 않으므로(개인정보처리방침에 명시됨), "재현 가능한 링크 공유"나 "이미지 생성 공유"는 이번 스코프에 포함하지 않고 텍스트 요약 공유만 구현한다.

## 현재 상태

- `js/app.js`는 IIFE(즉시실행함수)로 감싸여 있고 `js/saju-calc.js` 등과 달리 Node에서 `require`할 수 없다 — 전부 브라우저에서만 동작.
- 5개 리딩 모드의 결과 렌더링 함수(`showSummary`(타로, 863번째 줄 부근), `showZodiacSummary`(428번째 줄), `showDdiSummary`(458번째 줄), `showSajuSummary`(712번째 줄), `showCompatibilitySummary`(788번째 줄))는 전부 `summaryEl.innerHTML = ...` 로 결과를 그려 넣은 뒤 `summaryEl.classList.remove('hidden'); newReadingButton.classList.remove('hidden');`로 마무리하는 공통 패턴을 따른다. (정확한 줄 번호는 계획 작성/구현 시점에 다시 확인할 것 — 이 문서 작성 이후에도 다른 작업으로 shift될 수 있음.)
- 공통으로 쓰이는 렌더링 헬퍼:
  - `renderReadingMeaning(meaning)`: `<p class="reading-lead-label">이번 리딩의 한마디</p><p class="reading-lead">...</p>` + (있으면) `<p class="reading-body">...</p>`를 반환.
  - `renderKeywordsAdviceHtml(keywordsList, adviceText)`: 내부에서 `pickKeywords`/`pickAdvice`로 **매 호출마다 랜덤하게** 키워드 3개/조언 1개를 골라 `<div class="card-extra"><p class="card-keywords">키워드: ...</p><p class="card-advice">조언: ...</p></div>`를 반환. **다시 호출하면 화면에 보이는 것과 다른 값이 나올 수 있음** — 공유 텍스트는 이 함수를 재호출하지 않고 이미 렌더링된 DOM에서 값을 읽어야 한다.
- 타로 모드(`showSummary`)만 카드가 1~3장이라 `<h4>카드명 (정방향)</h4>` + `renderReadingMeaning` + `renderKeywordsAdviceHtml`가 카드 수만큼 반복된다. 나머지 4개 모드는 전부 1세트만 렌더링.
- 궁합 모드(`showCompatibilitySummary`)는 `<p class="compat-score">72%</p><p class="compat-tier-label">...</p>`가 추가로 들어간다.
- 사주 모드(`showSajuSummary`)는 위 공통 요소 외에 `.myeongsik-detail-table`(명식 상세표), `.element-summary`(오행 개수), `.daeun-table`/`.seun-table`(대운/세운표), `.element-legend`(오행 범례) 같은 표 형태 콘텐츠가 추가로 들어간다 — 공유 텍스트에는 부적합(너무 길고 표 형태라 텍스트로 읽기 어려움).
- `index.html`의 `#screen-reading` 섹션 구조(244~248번째 줄): `#cards-container` → `#summary`(초기 `hidden`) → `#new-reading-button`(초기 `hidden`).
- `css/style.css` 68~84번째 줄: `#draw-button, #history-open-button, #new-reading-button, #clear-history-button, #history-close-button`이 공통 버튼 스타일(금색 테두리, 투명 배경, hover 시 은은한 배경)을 공유.
- 공유/클립보드 관련 코드는 현재 전무(새 기능).

## 설계

### 1. 공유 텍스트 생성 — DOM에서 읽기

`js/app.js`에 새 함수 `buildShareText()`를 추가한다:

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
```

- `querySelectorAll`은 매치된 여러 선택자의 결과를 **문서 순서(document order)**로 반환하므로, 위 선택자 목록만으로 타로(카드마다 h4+본문+키워드 반복)·궁합(점수+등급+본문)·나머지 3개 모드(제목+본문+키워드) 전부 화면에 보이는 순서 그대로 텍스트가 만들어진다.
- `.reading-lead-label`("이번 리딩의 한마디" 캡션)과 사주의 표 관련 클래스들은 선택자에 없으므로 자동으로 제외된다.
- 이 함수는 항상 클릭 시점에 `summaryEl`의 **현재 DOM**을 읽으므로, 랜덤으로 뽑힌 키워드/조언을 다시 계산하지 않고 화면에 보이는 값 그대로 가져온다.

### 2. 공유/복사 동작

```js
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

function copyShareText(text) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(function () {
    const original = shareButton.textContent;
    shareButton.textContent = '복사했어요!';
    setTimeout(function () { shareButton.textContent = original; }, 1500);
  });
}
```

- `navigator.share` 지원 브라우저(주로 모바일 Safari/Chrome)는 OS 공유시트(카카오톡, 메시지 등)를 띄운다.
- 미지원(대부분 데스크톱) 또는 공유시트에서 에러가 났지만 사용자 취소(`AbortError`)가 아닌 경우 클립보드 복사로 폴백한다.
- 복사 성공 시 버튼 텍스트를 1.5초간 "복사했어요!"로 바꿨다가 원래 라벨로 되돌린다(별도 토스트 UI 없이 최소 구현).
- `navigator.clipboard`가 아예 없는 아주 오래된 브라우저는 조용히 아무 동작도 하지 않는다(이 기능의 스코프 밖).

### 3. UI 배치

`index.html`의 `#screen-reading` 섹션(244~248번째 줄)을 아래로 교체:

```html
<section id="screen-reading" class="hidden">
  <div id="cards-container"></div>
  <div id="summary" class="hidden"></div>
  <button type="button" id="share-button" class="hidden">공유하기</button>
  <button type="button" id="new-reading-button" class="hidden">새 리딩 시작</button>
</section>
```

`css/style.css` 68~69번째 줄의 공통 버튼 선택자에 `#share-button`을 추가:

```css
#draw-button, #history-open-button, #new-reading-button,
#clear-history-button, #history-close-button, #share-button {
```

### 4. 노출 시점 — 5개 렌더링 함수에 한 줄씩 추가

`showSummary`(타로), `showZodiacSummary`, `showDdiSummary`, `showSajuSummary`, `showCompatibilitySummary` 각각에서 기존의 `newReadingButton.classList.remove('hidden');` 바로 다음 줄에 `shareButton.classList.remove('hidden');`를 추가한다. `newReadingButton`의 클릭 핸들러(현재 912번째 줄 부근, "새 리딩 시작" 클릭 시 `screenReading.classList.add('hidden')`으로 화면 자체를 감추므로 `#share-button`을 별도로 다시 숨길 필요는 없다 — 화면이 통째로 숨겨지기 때문).

## 테스트 / 검증 계획

- `js/app.js`는 IIFE로 Node에서 테스트 불가 — 이 기능은 브라우저 수동/자동화 검증으로만 확인한다(기존 `showSajuSummary` UI 작업과 동일한 패턴).
- 브라우저에서 5개 모드 각각 리딩을 끝까지 진행 → "공유하기" 버튼이 "새 리딩 시작"과 함께 나타나는지 확인.
- `navigator.share`를 모킹하거나 없는 환경(일반 데스크톱 브라우저)에서 클릭 → 클립보드에 기대한 텍스트가 복사되고 버튼이 "복사했어요!"로 잠깐 바뀌는지 확인(`navigator.clipboard.readText()` 또는 `read_clipboard` 도구로 검증).
- 타로 모드에서 카드 2~3장을 뽑은 경우 공유 텍스트에 카드별 본문이 전부(순서대로) 들어가는지 확인.
- 사주 모드에서 공유 텍스트에 명식표/대운표/세운표/오행범례 같은 표 내용이 섞여 들어가지 않는지(제목+본문+키워드+조언만 있는지) 확인.
- 궁합 모드에서 점수(`72%`)와 등급 라벨이 포함되는지 확인.
- 브라우저 콘솔에 에러 없는지 확인.

## 이번 스코프에서 제외

- 재현 가능한 딥링크 공유(URL에 입력값/뽑은 카드를 인코딩) — 타로의 랜덤 뽑기까지 인코딩해야 해서 복잡도가 크게 늘어남, 별도 과제로 남김.
- 결과를 이미지(canvas)로 렌더링해 공유/저장하는 기능 — 모드별로 레이아웃을 따로 그려야 해서 스코프 밖.
- 커스텀 공유 문구 편집(사용자가 공유 전 텍스트를 수정하는 UI) — 없음, 자동 생성된 텍스트 그대로 공유.
- 공유 횟수 집계/분석 — 백엔드가 없으므로 애초에 불가능.
