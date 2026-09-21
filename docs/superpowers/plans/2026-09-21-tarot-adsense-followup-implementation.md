# 애드센스 후속 배치(legal 문구/canonical·OG/404·Contact·FAQ/딥링크/메인 텍스트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이전에 완료한 타로 콘텐츠 페이지 작업(`/tarot/*.html`, About, nav, sitemap 뼈대)과 겹치지 않는 나머지 애드센스 준비 항목—`legal.html` 문구 수정, 모든 페이지의 canonical/OG 메타 태그, 404·Contact·FAQ 페이지, 리딩 결과→카드 상세 딥링크, 메인 페이지 텍스트 레이어 확장—을 완료한다.

**Architecture:** 기존 정적 사이트 패턴(순수 HTML + `data/*.js` 전역선언/`module.exports` 가드 + Node 생성 스크립트)을 그대로 따른다. 새 정적 페이지(404/Contact/FAQ)는 `about.html`처럼 손으로 작성한다. canonical/OG는 손으로 쓴 페이지엔 직접, 생성되는 78+1개 타로 페이지엔 `scripts/lib/tarot-page-data.js`/`render-tarot-pages.js`를 확장해 반영한다. 리딩→카드 상세 딥링크는 `scripts/generate-tarot-pages.js`가 `data/tarot-slugs.js`(cardId→slug 맵)를 함께 생성하고, `js/app.js`가 이를 읽어 링크를 만든다.

**Tech Stack:** 기존과 동일 — 순수 Node.js(`assert`만 사용), 프레임워크 없음, `css/salon.css` 기존 토큰/클래스 재사용.

## Global Constraints

- 참고 자료: `docs/superpowers/specs/2026-09-21-tarot-content-pages-design.md`(이전 배치 스펙), 사용자가 저장소 밖에서 관리하는 `tarot-adsense-redesign-spec.md`(`.gitignore` 처리됨, 이 계획의 문구/구조 출처).
- **겹치는 작업은 이번 범위에서 완전히 제외한다**: 타로 카드 상세 페이지 재작성, About 페이지 재작성, 상단 nav 뼈대, sitemap.xml 뼈대, 커스텀 도메인, 마이너 아르카나 확장, 애드센스 광고 코드/문구, 이미지 WebP 변환, Search Console 등록. 이 계획은 정확히 아래 9개 태스크만 다룬다.
- **운세 가이드(`/guides/`) 콘텐츠 작성은 이번 계획 범위 밖이다.** 사용자가 직접 채팅에서 초안을 쓰고 다듬은 뒤 별도로 반영하기로 했다. 따라서 상단 GNB에 "운세 가이드" 링크를 추가하지 않는다(가이드가 생긴 뒤 별도 작업).
- 내부 링크는 항상 **상대 경로**를 쓴다(커스텀 도메인 없음, GitHub Pages 서브경로 `nwb010118.github.io/tarot-reading/`). **예외**: canonical/OG 태그는 절대 URL이 표준이므로 `https://nwb010118.github.io/tarot-reading/`(기존 `SITE_BASE`, sitemap.xml과 동일 값) 기준 절대 URL을 쓴다.
- `/tarot/*.html`(78+1개)은 여전히 `scripts/generate-tarot-pages.js`로만 생성한다 — 손으로 수정하지 않는다.
- 404/Contact/FAQ 페이지는 `about.html`과 동일하게 손으로 작성한 정적 HTML이다.
- 공통 푸터 구성은 `소개 · 문의하기 · 자주 묻는 질문 · 개인정보처리방침 · 이용약관 · 면책조항` 순서로 통일한다(사이트 전체: `index.html`, `about.html`, `legal.html`, 새로 만드는 404/Contact/FAQ, 생성되는 타로 79페이지).
- `node scripts/run-tests.js`는 항상 전부 통과해야 한다(회귀 금지).
- 홈페이지(`index.html`)의 canonical은 `https://nwb010118.github.io/tarot-reading/`(마지막에 `index.html`을 붙이지 않음 — 기존 `sitemap.xml`의 홈 URL과 동일한 형태로 맞춰서, 이전 최종 리뷰에서 지적된 "internal link vs sitemap URL 불일치"를 함께 해소한다).

---

## Task 1: `legal.html` 문구 수정

**Files:**
- Modify: `legal.html`

**Interfaces:** 없음(독립적인 텍스트 수정).

- [ ] **Step 1: 이용약관 "비영리" 문구 교체**

`legal.html`의 기존 문구(`legal.html:24`):

```html
    <p>본 서비스("점집", 이하 "서비스")는 개인이 비영리 목적으로 운영하는 정적 웹사이트입니다.</p>
```

다음으로 교체:

```html
    <p>본 서비스("점집", 이하 "서비스")는 개인이 운영하는 무료 운세 콘텐츠 서비스입니다.</p>
```

- [ ] **Step 2: 면책조항에 전문가 상담 권유 문구 추가**

`legal.html`의 기존 면책조항 섹션(`legal.html:71-79`) 마지막 문단 다음에 새 문단 추가. 기존:

```html
    <p>이용자가 본 서비스의 콘텐츠를 근거로 내린 판단이나 행동으로 인해 발생한 손해에 대해, 운영자는 관계 법령이 허용하는 최대한의 범위에서 책임을 지지 않습니다.</p>
  </section>
```

다음으로 교체:

```html
    <p>이용자가 본 서비스의 콘텐츠를 근거로 내린 판단이나 행동으로 인해 발생한 손해에 대해, 운영자는 관계 법령이 허용하는 최대한의 범위에서 책임을 지지 않습니다.</p>

    <p>건강, 임신, 법률, 투자, 대출, 도박 등 중요한 결정은 본 서비스의 결과에 의존하지 말고 해당 분야의 전문가와 상담하시기 바랍니다. 마음이 계속 힘들다면 혼자 견디지 말고 전문 상담기관의 도움을 받으시기 바랍니다.</p>
  </section>
```

- [ ] **Step 3: 브라우저로 확인**

정적 서버(`.claude/launch.json`의 `static-preview`, 포트 8080)로 `legal.html`을 열어 이용약관/면책조항 섹션에 새 문구가 정상적으로 보이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add legal.html
git commit -m "content(legal): update non-profit wording and add expert-consultation disclaimer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: canonical/OG 메타 태그 (전체 페이지 + 생성 템플릿)

**Files:**
- Modify: `scripts/lib/tarot-page-data.js`
- Modify: `scripts/lib/render-tarot-pages.js`
- Modify: `scripts/generate-tarot-pages.js`
- Modify: `index.html`, `about.html`, `legal.html`
- Test: `tests/tarot-page-data.test.js`, `tests/render-tarot-pages.test.js`, `tests/generate-tarot-pages.test.js`(기존 파일들에 추가)

**Interfaces:**
- Consumes: 기존 `buildCardViewModel`, `renderCardPage`, `renderHubPage`, `generate()`
- Produces:
  - `tarot-page-data.js`가 새로 export하는 `SITE_BASE`(문자열 `'https://nwb010118.github.io/tarot-reading/'`) — Task 7(딥링크)에서도 재사용하지 않고 필요시 그대로 문자열 재선언 가능(작은 상수라 공유 필수 아님, 다만 이 태스크 안에서는 `generate-tarot-pages.js`가 자신의 로컬 `SITE_BASE`를 지우고 이 export를 가져다 쓴다).
  - `buildCardViewModel(deckCard)`가 반환하는 객체에 새 필드 `canonicalUrl: string` 추가(기존 필드는 전부 유지).
  - `renderHubPage(allViewModels, canonicalUrl)` — 시그니처 변경(두 번째 인자 필수 추가).

- [ ] **Step 1: 실패하는 테스트 작성 — `tarot-page-data.test.js`에 canonicalUrl 검증 추가**

`tests/tarot-page-data.test.js`에서 기존 `deck.forEach(function (card) { const vm = buildCardViewModel(card); ...` 블록 안, `assert.ok(vm.image.startsWith('images/'));` 바로 다음 줄에 추가:

```js
  assert.strictEqual(vm.canonicalUrl, 'https://nwb010118.github.io/tarot-reading/tarot/' + vm.slug + '.html', card.cardId + ' canonicalUrl');
```

그리고 파일 상단 require 목록에 `SITE_BASE`를 추가로 가져와 값 자체도 검증(기존 `const { slugify, buildCardViewModel, CATEGORY_ORDER } = require('../scripts/lib/tarot-page-data.js');`를 아래로 교체):

```js
const { slugify, buildCardViewModel, CATEGORY_ORDER, SITE_BASE } = require('../scripts/lib/tarot-page-data.js');
```

`const deck = getFullDeck();` 다음 줄에 추가:

```js
assert.strictEqual(SITE_BASE, 'https://nwb010118.github.io/tarot-reading/');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/tarot-page-data.test.js`
Expected: `AssertionError` — `SITE_BASE` is `undefined` (아직 export 안 함)

- [ ] **Step 3: `tarot-page-data.js`에 `SITE_BASE`와 `canonicalUrl` 추가**

`scripts/lib/tarot-page-data.js` 상단, 기존 `const { CATEGORY_LABELS, CATEGORY_SUBCHOICES } = require('../../data/category-labels.js');` 바로 다음 줄에 추가:

```js
const SITE_BASE = 'https://nwb010118.github.io/tarot-reading/';
```

`buildCardViewModel` 함수의 반환 객체(기존):

```js
  return {
    slug: slug,
    cardId: deckCard.cardId,
    type: deckCard.type,
    suitKey: suitKey,
    suitLabel: SUIT_LABEL_KR[suitKey],
    name: deckCard.name,
    nameEn: deckCard.type === 'major' ? deckCard.nameEn : null,
    image: deckCard.image,
    title: titleName + ' 카드 의미 — 정방향·역방향 키워드와 운세 | 점집',
    description: '타로 ' + deckCard.name + ' 카드의 정방향·역방향 의미와 키워드(' + upKeywordsPreview + '), 조언, 연애·재물·직장 등 상황별 운세를 확인해보세요.',
    upright: buildOrientationView(deckCard, 'upright'),
    reversed: buildOrientationView(deckCard, 'reversed')
  };
```

다음으로 교체(마지막에 `canonicalUrl` 필드 추가):

```js
  return {
    slug: slug,
    cardId: deckCard.cardId,
    type: deckCard.type,
    suitKey: suitKey,
    suitLabel: SUIT_LABEL_KR[suitKey],
    name: deckCard.name,
    nameEn: deckCard.type === 'major' ? deckCard.nameEn : null,
    image: deckCard.image,
    title: titleName + ' 카드 의미 — 정방향·역방향 키워드와 운세 | 점집',
    description: '타로 ' + deckCard.name + ' 카드의 정방향·역방향 의미와 키워드(' + upKeywordsPreview + '), 조언, 연애·재물·직장 등 상황별 운세를 확인해보세요.',
    upright: buildOrientationView(deckCard, 'upright'),
    reversed: buildOrientationView(deckCard, 'reversed'),
    canonicalUrl: SITE_BASE + 'tarot/' + slug + '.html'
  };
```

`module.exports` 블록(기존):

```js
module.exports = {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_SUBCHOICES,
  SUIT_LABEL_KR,
  slugify,
  resolveCanonical,
  buildCardViewModel
};
```

다음으로 교체:

```js
module.exports = {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_SUBCHOICES,
  SUIT_LABEL_KR,
  SITE_BASE,
  slugify,
  resolveCanonical,
  buildCardViewModel
};
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/tarot-page-data.test.js`
Expected: `tarot-page-data.test.js: all assertions passed (78 cards)`, exit code 0

- [ ] **Step 5: 실패하는 테스트 작성 — `render-tarot-pages.test.js`에 canonical/OG 검증 추가**

`tests/render-tarot-pages.test.js`에서 `renderCardPage(vm, nav)` 호출 다음 줄들(기존 assertion들) 사이에, `assert.ok(html.includes(vm.title), ...)` 다음 줄에 추가:

```js
assert.ok(html.includes('<link rel="canonical" href="' + vm.canonicalUrl + '">'), 'canonical link must use vm.canonicalUrl');
assert.ok(html.includes('<meta property="og:title" content="' + vm.title + '">'), 'og:title must match vm.title');
assert.ok(html.includes('<meta property="og:description" content="' + vm.description + '">'), 'og:description must match vm.description');
assert.ok(html.includes('<meta property="og:url" content="' + vm.canonicalUrl + '">'), 'og:url must match vm.canonicalUrl');
assert.ok(html.includes('<meta property="og:type" content="website">'));
```

그리고 파일 하단의 허브 페이지 테스트 부분, 기존:

```js
// 허브 페이지
const hubHtml = renderHubPage(deck.map(buildCardViewModel));
```

다음으로 교체(두 번째 인자 추가):

```js
// 허브 페이지
const hubCanonicalUrl = 'https://nwb010118.github.io/tarot-reading/tarot/index.html';
const hubHtml = renderHubPage(deck.map(buildCardViewModel), hubCanonicalUrl);
```

그 아래 기존 `assert.ok(hubHtml.includes('major-19-sun.html'));` 다음 줄에 추가:

```js
assert.ok(hubHtml.includes('<link rel="canonical" href="' + hubCanonicalUrl + '">'));
assert.ok(hubHtml.includes('<meta property="og:url" content="' + hubCanonicalUrl + '">'));
```

- [ ] **Step 6: 테스트 실행해서 실패 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: FAIL — `html.includes(...)`가 canonical/OG를 못 찾음, 그리고 `renderHubPage`가 두 번째 인자를 안 받아 `href="undefined"`가 생기는 문제도 함께 드러남

- [ ] **Step 7: `render-tarot-pages.js`에 canonical/OG 추가**

`renderCardPage` 함수 안, 기존:

```js
    '<meta name="description" content="' + escapeHtml(vm.description) + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
```

다음으로 교체:

```js
    '<meta name="description" content="' + escapeHtml(vm.description) + '">\n' +
    '<link rel="canonical" href="' + vm.canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + escapeHtml(vm.title) + '">\n' +
    '<meta property="og:description" content="' + escapeHtml(vm.description) + '">\n' +
    '<meta property="og:url" content="' + vm.canonicalUrl + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
```

`renderHubPage` 함수 시그니처와 본문(기존):

```js
function renderHubPage(allViewModels) {
  const suitOrder = ['major', 'wands', 'cups', 'swords', 'pentacles'];
  const suitLabels = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };
```

다음으로 교체:

```js
function renderHubPage(allViewModels, canonicalUrl) {
  const suitOrder = ['major', 'wands', 'cups', 'swords', 'pentacles'];
  const suitLabels = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };
  const hubTitle = '타로 카드 78장 백과사전 | 점집';
  const hubDescription = '메이저 아르카나 22장과 마이너 아르카나(완드·컵·소드·펜타클) 56장, 타로 78장 전체의 정방향·역방향 키워드와 운세를 확인해보세요.';
```

같은 함수 안, 기존:

```js
    '<title>타로 카드 78장 백과사전 | 점집</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="메이저 아르카나 22장과 마이너 아르카나(완드·컵·소드·펜타클) 56장, 타로 78장 전체의 정방향·역방향 키워드와 운세를 확인해보세요.">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
```

다음으로 교체:

```js
    '<title>' + hubTitle + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + hubDescription + '">\n' +
    '<link rel="canonical" href="' + canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + hubTitle + '">\n' +
    '<meta property="og:description" content="' + hubDescription + '">\n' +
    '<meta property="og:url" content="' + canonicalUrl + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
```

- [ ] **Step 8: 테스트 실행해서 통과 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: `render-tarot-pages.test.js: all assertions passed`, exit code 0

- [ ] **Step 9: `generate-tarot-pages.js`가 공유 `SITE_BASE`를 쓰도록 수정 + 허브 호출에 canonicalUrl 전달**

기존:

```js
const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel } = require('./lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('./lib/render-tarot-pages.js');

const ROOT = path.join(__dirname, '..');
const TAROT_DIR = path.join(ROOT, 'tarot');
const SITE_BASE = 'https://nwb010118.github.io/tarot-reading/';
```

다음으로 교체(로컬 `SITE_BASE` 선언 제거, import로 대체):

```js
const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('./lib/render-tarot-pages.js');

const ROOT = path.join(__dirname, '..');
const TAROT_DIR = path.join(ROOT, 'tarot');
```

`generate()` 함수 안, 기존:

```js
  const hubHtml = renderHubPage(viewModels);
```

다음으로 교체:

```js
  const hubHtml = renderHubPage(viewModels, SITE_BASE + 'tarot/index.html');
```

- [ ] **Step 10: 테스트 실행해서 실패 확인 (아직 재생성 전)**

Run: `node tests/generate-tarot-pages.test.js`
Expected: PASS(기존 assertion들은 그대로 통과 — 아직 canonical 관련 assertion을 안 넣었으므로). 이 스텝은 "코드가 깨지지 않았다"만 확인하는 중간 체크포인트.

- [ ] **Step 11: `generate-tarot-pages.test.js`에 canonical 검증 추가**

`tests/generate-tarot-pages.test.js`에서 기존 `const sunHtml = fs.readFileSync(path.join(tarotDir, 'major-19-sun.html'), 'utf8');` 블록의 assertion들 다음 줄에 추가:

```js
assert.ok(sunHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/tarot/major-19-sun.html">'));
```

기존 `const foolHtml = fs.readFileSync(...)` 블록 다음, sitemap 검증 위쪽에 추가:

```js
const hubHtml = fs.readFileSync(path.join(tarotDir, 'index.html'), 'utf8');
assert.ok(hubHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/tarot/index.html">'));
```

- [ ] **Step 12: 테스트 실행해서 통과 확인 + 전체 재생성**

Run: `node tests/generate-tarot-pages.test.js` → PASS 확인
Run: `npm run build:tarot-pages` → 79개 파일 + sitemap.xml 실제 재생성
Run: `node scripts/run-tests.js` → 13개 파일 전부 통과 확인

- [ ] **Step 13: `index.html`, `about.html`, `legal.html`에 canonical/OG 수동 추가**

`index.html`의 기존(`index.html:9-10`):

```html
<meta name="description" content="타로, 별자리, 띠운세, 사주와 궁합. 잠시 마음을 고르고 나만의 운세를 만나보세요.">
<link rel="stylesheet" href="css/style.css">
```

다음으로 교체:

```html
<meta name="description" content="타로, 별자리, 띠운세, 사주와 궁합. 잠시 마음을 고르고 나만의 운세를 만나보세요.">
<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/">
<meta property="og:type" content="website">
<meta property="og:title" content="점집 — 오늘의 흐름을 읽는 시간">
<meta property="og:description" content="타로, 별자리, 띠운세, 사주와 궁합. 잠시 마음을 고르고 나만의 운세를 만나보세요.">
<meta property="og:url" content="https://nwb010118.github.io/tarot-reading/">
<link rel="stylesheet" href="css/style.css">
```

`about.html`의 기존(`about.html:9-10`):

```html
<meta name="description" content="점집을 만든 이유와 콘텐츠를 대하는 태도를 소개합니다.">
<link rel="stylesheet" href="css/style.css">
```

다음으로 교체:

```html
<meta name="description" content="점집을 만든 이유와 콘텐츠를 대하는 태도를 소개합니다.">
<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/about.html">
<meta property="og:type" content="website">
<meta property="og:title" content="About — 점집">
<meta property="og:description" content="점집을 만든 이유와 콘텐츠를 대하는 태도를 소개합니다.">
<meta property="og:url" content="https://nwb010118.github.io/tarot-reading/about.html">
<link rel="stylesheet" href="css/style.css">
```

`legal.html`은 현재 `<meta name="description">`이 없다. 기존(`legal.html:6-7`):

```html
<title>법적 고지 - 점집</title>
<link rel="stylesheet" href="css/style.css">
```

다음으로 교체:

```html
<title>법적 고지 - 점집</title>
<meta name="description" content="점집의 개인정보처리방침, 이용약관, 면책조항을 안내합니다.">
<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/legal.html">
<meta property="og:type" content="website">
<meta property="og:title" content="법적 고지 - 점집">
<meta property="og:description" content="점집의 개인정보처리방침, 이용약관, 면책조항을 안내합니다.">
<meta property="og:url" content="https://nwb010118.github.io/tarot-reading/legal.html">
<link rel="stylesheet" href="css/style.css">
```

- [ ] **Step 14: 브라우저로 확인**

`index.html`, `about.html`, `legal.html`, `tarot/major-19-sun.html`, `tarot/index.html`을 열어 각 페이지의 `<head>`에 canonical/OG 태그가 정확한 절대 URL로 들어있는지 `read_page` 또는 페이지 소스로 확인.

- [ ] **Step 15: 커밋**

```bash
git add scripts/lib/tarot-page-data.js scripts/lib/render-tarot-pages.js scripts/generate-tarot-pages.js tests/tarot-page-data.test.js tests/render-tarot-pages.test.js tests/generate-tarot-pages.test.js tarot/ sitemap.xml index.html about.html legal.html
git commit -m "feat(seo): add canonical and Open Graph tags across all pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: 404 페이지

**Files:**
- Create: `404.html`

**Interfaces:** 없음. GitHub Pages는 프로젝트 저장소 루트의 `404.html`을 실제 404 응답 시 자동으로 보여준다(별도 설정 불필요).

- [ ] **Step 1: `404.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>페이지를 찾을 수 없습니다 - 점집</title>
<meta name="theme-color" content="#0b1422">
<link rel="icon" type="image/svg+xml" href="images/moon-mark.svg">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/salon.css">
</head>
<body>
<div id="app" class="legal-page">
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
  </header>

  <section class="legal-section">
    <h2>페이지를 찾을 수 없습니다</h2>
    <p>찾으시는 페이지의 주소가 바뀌었거나 더 이상 존재하지 않습니다.</p>
    <p><a href="index.html">홈으로 돌아가기</a> · <a href="tarot/index.html">타로 카드 백과사전 보기</a></p>
  </section>

  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
  <p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>
</div>
</body>
</html>
```

(이 태스크 시점에는 아직 Contact/FAQ 페이지가 없으므로 푸터에 두 링크를 넣지 않는다 — Task 6에서 사이트 전체 푸터를 한 번에 갱신할 때 이 파일도 함께 갱신한다.)

- [ ] **Step 2: 브라우저로 확인**

`http://localhost:8080/404.html`을 직접 열어 정상 렌더링 확인(로컬 정적 서버는 실제 404 라우팅을 재현하지 않으므로, 파일 자체가 깨지지 않고 보이는지만 확인하면 된다).

- [ ] **Step 3: 커밋**

```bash
git add 404.html
git commit -m "feat(404): add custom not-found page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Contact 페이지

**Files:**
- Create: `contact.html`
- Modify: `scripts/generate-tarot-pages.js` (sitemap에 `contact.html` 추가)
- Test: `tests/generate-tarot-pages.test.js`

**Interfaces:** 없음.

- [ ] **Step 1: `contact.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>문의하기 - 점집</title>
<meta name="theme-color" content="#0b1422">
<link rel="icon" type="image/svg+xml" href="images/moon-mark.svg">
<meta name="description" content="점집 이용 중 오류, 제안, 문의사항을 남길 수 있는 연락처를 안내합니다.">
<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/contact.html">
<meta property="og:type" content="website">
<meta property="og:title" content="문의하기 - 점집">
<meta property="og:description" content="점집 이용 중 오류, 제안, 문의사항을 남길 수 있는 연락처를 안내합니다.">
<meta property="og:url" content="https://nwb010118.github.io/tarot-reading/contact.html">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/salon.css">
</head>
<body>
<div id="app" class="legal-page">
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
  </header>

  <p><a href="index.html">← 점집으로 돌아가기</a></p>

  <section class="legal-section">
    <h2>문의하기</h2>
    <p>서비스 이용 중 오류를 발견하셨거나 제안, 문의하실 내용이 있다면 아래 이메일로 보내주세요.</p>
    <p>이메일: nwb010118@gmail.com</p>

    <h3>문의 시 함께 적어주시면 좋은 내용</h3>
    <ul>
      <li>사용하신 기기와 브라우저 (예: 아이폰 Safari)</li>
      <li>문제가 발생한 페이지 주소</li>
      <li>어떤 문제가 있었는지</li>
    </ul>

    <p>보내주신 이메일 주소와 문의 내용은 답변을 위한 목적으로만 사용하며, 처리 후 지체 없이 파기합니다.</p>
  </section>

  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
  <p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>
</div>
</body>
</html>
```

- [ ] **Step 2: 실패하는 테스트 작성 — sitemap에 contact.html 포함 검증**

`tests/generate-tarot-pages.test.js`의 기존 sitemap 검증 블록, `assert.ok(sitemap.includes('tarot-reading/tarot/index.html'));` 다음 줄에 추가:

```js
assert.ok(sitemap.includes('tarot-reading/contact.html'), 'sitemap must include contact.html');
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: FAIL — sitemap에 `contact.html`이 아직 없음

- [ ] **Step 4: `generate-tarot-pages.js`의 sitemap 정적 목록에 추가**

`scripts/generate-tarot-pages.js`의 `writeSitemap` 함수, 기존:

```js
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
```

다음으로 교체:

```js
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
```

- [ ] **Step 5: 테스트 실행해서 통과 확인 + 재생성**

Run: `node tests/generate-tarot-pages.test.js` → PASS
Run: `npm run build:tarot-pages` → sitemap.xml 갱신
Run: `node scripts/run-tests.js` → 전체 통과 확인

- [ ] **Step 6: 브라우저로 확인**

`http://localhost:8080/contact.html`을 열어 렌더링 확인.

- [ ] **Step 7: 커밋**

```bash
git add contact.html scripts/generate-tarot-pages.js tests/generate-tarot-pages.test.js sitemap.xml
git commit -m "feat(contact): add contact page and register it in the sitemap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: FAQ 페이지

**Files:**
- Create: `faq.html`
- Modify: `scripts/generate-tarot-pages.js` (sitemap에 `faq.html` 추가)
- Test: `tests/generate-tarot-pages.test.js`

**Interfaces:** 없음.

- [ ] **Step 1: `faq.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>자주 묻는 질문 - 점집</title>
<meta name="theme-color" content="#0b1422">
<link rel="icon" type="image/svg+xml" href="images/moon-mark.svg">
<meta name="description" content="점집 이용 방법, 개인정보 저장 방식, 타로·사주 결과를 보는 방법 등 자주 묻는 질문 10가지에 답합니다.">
<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/faq.html">
<meta property="og:type" content="website">
<meta property="og:title" content="자주 묻는 질문 - 점집">
<meta property="og:description" content="점집 이용 방법, 개인정보 저장 방식, 타로·사주 결과를 보는 방법 등 자주 묻는 질문 10가지에 답합니다.">
<meta property="og:url" content="https://nwb010118.github.io/tarot-reading/faq.html">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/salon.css">
</head>
<body>
<div id="app" class="legal-page">
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
  </header>

  <p><a href="index.html">← 점집으로 돌아가기</a></p>

  <section class="legal-section">
    <h2>자주 묻는 질문</h2>

    <h3>타로 결과는 미래를 정확히 맞히나요?</h3>
    <p>아니요. 점집의 타로, 별자리, 사주 등 모든 결과는 확정된 미래를 예언하는 것이 아니라, 전통 이론과 무작위 요소에 기반한 오락·자기성찰 콘텐츠입니다. 결과를 참고해서 지금의 생각을 정리하는 용도로 가볍게 즐겨주세요.</p>

    <h3>입력한 생년월일은 저장되나요?</h3>
    <p>서버로 전송되지 않고 이용자의 브라우저(localStorage)에만 저장됩니다. 운영자를 포함한 누구도 이 데이터에 접근할 수 없으며, 홈 화면의 "지난 기록" 메뉴에서 "전체 삭제" 버튼으로 언제든 직접 지울 수 있습니다.</p>

    <h3>같은 질문을 여러 번 뽑아도 되나요?</h3>
    <p>가능합니다. 다만 마음에 드는 결과가 나올 때까지 반복하기보다, 처음 뽑힌 카드나 결과를 곱씹어보는 방식을 추천합니다.</p>

    <h3>1장과 3장 뽑기는 어떻게 다른가요?</h3>
    <p>오늘의 카드 1장은 지금 이 순간에 대한 짧은 메시지를 보여주고, 3장 스프레드는 여러 장의 카드를 통해 조금 더 넓은 흐름과 맥락을 살펴봅니다.</p>

    <h3>역방향 카드는 나쁜 뜻인가요?</h3>
    <p>아닙니다. 역방향은 "나쁨"이 아니라 같은 카드를 다른 각도에서 보는 해석입니다. 정방향과 마찬가지로 관찰과 조언을 함께 담고 있습니다.</p>

    <h3>사주에서 태어난 시각을 모르면 어떻게 하나요?</h3>
    <p>생년월일 입력 화면에서 "태어난 시간을 몰라요"를 선택하면 시간 정보 없이도 사주 결과를 볼 수 있습니다. 다만 시주(태어난 시각에 해당하는 기둥)를 제외한 정보로 해석하므로 정확도에는 한계가 있습니다.</p>

    <h3>음력 생일은 어떻게 입력하나요?</h3>
    <p>생년월일 입력 화면에서 "음력"을 선택하면 음력 날짜 입력란과 윤달 여부 체크박스가 나타납니다. 음력 생일이라면 이 옵션을 사용해주세요.</p>

    <h3>별자리와 띠 운세는 무엇을 기준으로 하나요?</h3>
    <p>별자리는 태어난 날짜(양력)를 기준으로 한 12개 구간, 띠는 태어난 해를 기준으로 한 12간지를 기준으로 합니다. 두 방식 모두 전통적으로 알려진 구간·기준을 그대로 사용합니다.</p>

    <h3>건강·투자·법률 문제에 참고해도 되나요?</h3>
    <p>안 됩니다. 점집의 모든 콘텐츠는 오락 목적이며 법률·의료·재정·심리 상담을 대체하지 않습니다. 중요한 결정을 앞두고 있다면 반드시 해당 분야의 전문가와 상담하세요.</p>

    <h3>오류가 생기면 어떻게 하나요?</h3>
    <p><a href="contact.html">문의하기</a> 페이지의 이메일로 사용하신 기기/브라우저, 문제가 발생한 페이지 주소, 어떤 문제였는지를 함께 보내주시면 확인 후 답변드리겠습니다.</p>
  </section>

  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="contact.html">문의하기</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
  <p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>
</div>
</body>
</html>
```

- [ ] **Step 2: 실패하는 테스트 작성 — sitemap에 faq.html 포함 검증**

`tests/generate-tarot-pages.test.js`의 sitemap 검증 블록, Task 4에서 추가한 `assert.ok(sitemap.includes('tarot-reading/contact.html'), ...)` 다음 줄에 추가:

```js
assert.ok(sitemap.includes('tarot-reading/faq.html'), 'sitemap must include faq.html');
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: FAIL — sitemap에 `faq.html`이 아직 없음

- [ ] **Step 4: `generate-tarot-pages.js`의 sitemap 정적 목록에 추가**

`scripts/generate-tarot-pages.js`의 `writeSitemap` 함수, Task 4에서 만들어진 상태(기존):

```js
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
```

다음으로 교체:

```js
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
```

- [ ] **Step 5: 테스트 실행해서 통과 확인 + 재생성**

Run: `node tests/generate-tarot-pages.test.js` → PASS
Run: `npm run build:tarot-pages` → sitemap.xml 갱신
Run: `node scripts/run-tests.js` → 전체 통과 확인

- [ ] **Step 6: 브라우저로 확인**

`http://localhost:8080/faq.html`을 열어 10개 질문/답변이 다 보이는지, "문의하기" 링크가 `contact.html`로 가는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add faq.html scripts/generate-tarot-pages.js tests/generate-tarot-pages.test.js sitemap.xml
git commit -m "feat(faq): add FAQ page and register it in the sitemap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: 사이트 전체 푸터 통일 (소개 · 문의하기 · FAQ 링크 반영)

**Files:**
- Modify: `index.html`, `legal.html`, `404.html`
- Modify: `scripts/lib/render-tarot-pages.js` (79개 생성 페이지의 공통 푸터)
- Test: `tests/render-tarot-pages.test.js`

**Interfaces:** 없음(기존 `renderFooter(links)` 시그니처 유지, 출력 내용만 확장).

- [ ] **Step 1: `index.html` 푸터 갱신**

기존(`index.html:249-253`):

```html
  <footer id="site-footer">
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
```

다음으로 교체:

```html
  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="contact.html">문의하기</a>
    <a href="faq.html">자주 묻는 질문</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
```

- [ ] **Step 2: `legal.html` 푸터 갱신**

기존(`legal.html`의 푸터, `about.html` 병합 이후 파일 끝부분에 없음 — 실제로는 `legal.html`에는 별도 `<footer>`가 없다. 대신 페이지 최상단에 `<p><a href="index.html">← 점집으로 돌아가기</a></p>`만 있다). **`legal.html`에는 공통 푸터를 새로 추가한다.** `</div>` 바로 앞(파일 끝, `legal.html:79-80`) 기존:

```html
  </section>
</div>
```

다음으로 교체:

```html
  </section>

  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="contact.html">문의하기</a>
    <a href="faq.html">자주 묻는 질문</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
  <p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>
</div>
```

- [ ] **Step 3: `404.html` 푸터 갱신**

기존(Task 3에서 만든 상태):

```html
  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
```

다음으로 교체:

```html
  <footer id="site-footer">
    <a href="about.html">소개</a>
    <a href="contact.html">문의하기</a>
    <a href="faq.html">자주 묻는 질문</a>
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
```

(`about.html`, `contact.html`, `faq.html`은 각각 만들어질 때 이미 최종 형태의 푸터를 갖고 있으므로 이 태스크에서 다시 손대지 않는다.)

- [ ] **Step 4: 실패하는 테스트 작성 — 생성 페이지 푸터 검증**

`tests/render-tarot-pages.test.js`의 기존 assertion들 사이, `assert.ok(html.includes('major-18-moon.html'), ...)` 다음 줄에 추가:

```js
assert.ok(html.includes('href="../contact.html">문의하기'), 'footer must link contact.html');
assert.ok(html.includes('href="../faq.html">자주 묻는 질문'), 'footer must link faq.html');
```

- [ ] **Step 5: 테스트 실행해서 실패 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: FAIL — 생성 템플릿 푸터에 아직 문의하기/FAQ 링크가 없음

- [ ] **Step 6: `render-tarot-pages.js`의 `renderFooter`와 `TAROT_DIR_LINKS` 확장**

기존:

```js
// links: { homeHref, hubHref, aboutHref, legalHref } — 모두 "이 페이지 기준" 상대경로.
// 카드/허브 페이지(모두 /tarot/ 안에 있음)에서는 homeHref='../index.html', hubHref='index.html'(같은 폴더의 허브 자기 자신 또는 옆 페이지), aboutHref='../about.html', legalHref='../legal.html'.
function renderNav(links) {
  return '<nav class="site-nav" aria-label="사이트 내비게이션">' +
    '<a href="' + links.homeHref + '">홈</a>' +
    '<a href="' + links.hubHref + '">타로 카드 백과사전</a>' +
    '<a href="' + links.aboutHref + '">About</a>' +
    '</nav>';
}

function renderHeader(links) {
  return '<header class="site-header">' +
    '<a class="brand" href="' + links.homeHref + '" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>' +
    renderNav(links) +
    '</header>';
}

function renderFooter(links) {
  return '<footer id="site-footer">' +
    '<a href="' + links.legalHref + '#privacy">개인정보처리방침</a>' +
    '<a href="' + links.legalHref + '#terms">이용약관</a>' +
    '<a href="' + links.legalHref + '#disclaimer">면책조항</a>' +
    '</footer>' +
    '<p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>';
}

// /tarot/ 디렉터리 안의 페이지(카드 페이지, 허브 페이지 모두)에서 공통으로 쓰는 링크 세트.
var TAROT_DIR_LINKS = { homeHref: '../index.html', hubHref: 'index.html', aboutHref: '../about.html', legalHref: '../legal.html' };
```

다음으로 교체(`links`에 `contactHref`/`faqHref` 추가, `renderFooter`가 이를 사용):

```js
// links: { homeHref, hubHref, aboutHref, contactHref, faqHref, legalHref } — 모두 "이 페이지 기준" 상대경로.
// 카드/허브 페이지(모두 /tarot/ 안에 있음)에서는 homeHref='../index.html', hubHref='index.html'(같은 폴더의 허브 자기 자신 또는 옆 페이지), aboutHref='../about.html', contactHref='../contact.html', faqHref='../faq.html', legalHref='../legal.html'.
function renderNav(links) {
  return '<nav class="site-nav" aria-label="사이트 내비게이션">' +
    '<a href="' + links.homeHref + '">홈</a>' +
    '<a href="' + links.hubHref + '">타로 카드 백과사전</a>' +
    '<a href="' + links.aboutHref + '">About</a>' +
    '</nav>';
}

function renderHeader(links) {
  return '<header class="site-header">' +
    '<a class="brand" href="' + links.homeHref + '" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>' +
    renderNav(links) +
    '</header>';
}

function renderFooter(links) {
  return '<footer id="site-footer">' +
    '<a href="' + links.aboutHref + '">소개</a>' +
    '<a href="' + links.contactHref + '">문의하기</a>' +
    '<a href="' + links.faqHref + '">자주 묻는 질문</a>' +
    '<a href="' + links.legalHref + '#privacy">개인정보처리방침</a>' +
    '<a href="' + links.legalHref + '#terms">이용약관</a>' +
    '<a href="' + links.legalHref + '#disclaimer">면책조항</a>' +
    '</footer>' +
    '<p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>';
}

// /tarot/ 디렉터리 안의 페이지(카드 페이지, 허브 페이지 모두)에서 공통으로 쓰는 링크 세트.
var TAROT_DIR_LINKS = { homeHref: '../index.html', hubHref: 'index.html', aboutHref: '../about.html', contactHref: '../contact.html', faqHref: '../faq.html', legalHref: '../legal.html' };
```

- [ ] **Step 7: 테스트 실행해서 통과 확인 + 재생성**

Run: `node tests/render-tarot-pages.test.js` → PASS
Run: `npm run build:tarot-pages` → 79개 파일 재생성(푸터 갱신 반영)
Run: `node scripts/run-tests.js` → 전체 통과 확인

- [ ] **Step 8: 브라우저로 확인**

`index.html`, `legal.html`, `404.html`, `tarot/major-19-sun.html`, `tarot/index.html`을 열어 푸터에 소개/문의하기/자주 묻는 질문 링크가 모두 보이고 정상 작동하는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add index.html legal.html 404.html scripts/lib/render-tarot-pages.js tests/render-tarot-pages.test.js tarot/
git commit -m "feat(footer): unify site footer with about/contact/faq links everywhere

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: 리딩 결과 → 카드 상세 딥링크

**Files:**
- Create: `data/tarot-slugs.js` (생성물, `scripts/generate-tarot-pages.js`가 씀 — 손으로 만들지 않는다)
- Modify: `scripts/generate-tarot-pages.js`
- Modify: `index.html` (스크립트 태그 추가)
- Modify: `js/app.js`
- Test: `tests/generate-tarot-pages.test.js`

**Interfaces:**
- Produces: `data/tarot-slugs.js`가 전역/module.exports로 내보내는 `TAROT_SLUGS`: `{ [cardId: string]: string }` (예: `{"major_19": "major-19-sun", "wands_Ace": "wands-ace", ...}`, 78개 키). `js/app.js`가 브라우저에서 `TAROT_SLUGS[item.card.cardId]`로 조회해서 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성 — `data/tarot-slugs.js` 생성 검증**

`tests/generate-tarot-pages.test.js`는 실제 저장소 경로를 절대 건드리지 않도록 임시 디렉터리에서 `generate()`를 호출하는 구조로 이미 돼 있다(`tmpDir`/`tarotDir`/`sitemapPath` 변수, 끝에서 `fs.rmSync(tmpDir, ...)`로 정리). 새로 만드는 `data/tarot-slugs.js`도 **반드시 같은 임시 디렉터리 안에** 쓰도록 옵션을 추가해야 한다 — 그렇지 않으면 테스트를 한 번 돌릴 때마다 실제 저장소의 `data/tarot-slugs.js`가 조용히 다시 쓰여, 이전에 sitemap.xml에서 겪었던 것과 똑같은 "테스트가 실제 파일을 오염시키는" 문제가 재발한다.

기존(파일 상단):

```js
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-pages-test-'));
const tarotDir = path.join(tmpDir, 'tarot');
const sitemapPath = path.join(tmpDir, 'sitemap.xml');

generate({ tarotDir: tarotDir, sitemapPath: sitemapPath, today: '2026-09-21' });
```

다음으로 교체:

```js
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-pages-test-'));
const tarotDir = path.join(tmpDir, 'tarot');
const sitemapPath = path.join(tmpDir, 'sitemap.xml');
const slugMapPath = path.join(tmpDir, 'tarot-slugs.js');

generate({ tarotDir: tarotDir, sitemapPath: sitemapPath, slugMapPath: slugMapPath, today: '2026-09-21' });
```

그리고 파일 끝, 기존:

```js
// 임시 디렉터리 정리
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-tarot-pages.test.js: all assertions passed');
```

다음으로 교체(정리 전에 슬러그 맵 검증):

```js
// TAROT_SLUGS 검증 (임시 디렉터리 정리 전에)
const { TAROT_SLUGS } = require(slugMapPath);
assert.strictEqual(Object.keys(TAROT_SLUGS).length, 78, 'TAROT_SLUGS must have exactly 78 entries');
assert.strictEqual(TAROT_SLUGS['major_19'], 'major-19-sun');
assert.strictEqual(TAROT_SLUGS['wands_Ace'], 'wands-ace');
assert.strictEqual(TAROT_SLUGS['pentacles_King'], 'pentacles-king');

// 임시 디렉터리 정리
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-tarot-pages.test.js: all assertions passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: FAIL — `generate()`가 아직 `slugMapPath` 옵션을 쓰지 않으므로(현재는 그냥 무시됨) `data/tarot-slugs.js`가 어디에도 생성되지 않고, `require(slugMapPath)`가 `Cannot find module`로 던짐

- [ ] **Step 3: `generate-tarot-pages.js`가 `data/tarot-slugs.js`도 쓰도록 확장**

`scripts/generate-tarot-pages.js` 상단의 require 목록(Task 2에서 만들어진 상태), 기존:

```js
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
```

다음으로 교체(`slugify` 추가):

```js
const { buildCardViewModel, SITE_BASE, slugify } = require('./lib/tarot-page-data.js');
```

`generate()` 함수, 기존:

```js
  const hubHtml = renderHubPage(viewModels, SITE_BASE + 'tarot/index.html');
  fs.writeFileSync(path.join(tarotDir, 'index.html'), hubHtml, 'utf8');

  writeSitemap(viewModels, sitemapPath, today);
}
```

다음으로 교체:

```js
  const hubHtml = renderHubPage(viewModels, SITE_BASE + 'tarot/index.html');
  fs.writeFileSync(path.join(tarotDir, 'index.html'), hubHtml, 'utf8');

  writeSitemap(viewModels, sitemapPath, today);
  writeSlugMap(deck, opts.slugMapPath || path.join(ROOT, 'data', 'tarot-slugs.js'));
}

function writeSlugMap(deck, slugMapPath) {
  const entries = deck.map(function (card) {
    return '  ' + JSON.stringify(card.cardId) + ': ' + JSON.stringify(slugify(card));
  });
  const js = '// 이 파일은 scripts/generate-tarot-pages.js가 자동 생성합니다. 직접 수정하지 마세요.\n' +
    'const TAROT_SLUGS = {\n' + entries.join(',\n') + '\n};\n\n' +
    'if (typeof module !== \'undefined\' && module.exports) {\n' +
    '  module.exports = { TAROT_SLUGS };\n' +
    '}\n';
  fs.writeFileSync(slugMapPath, js, 'utf8');
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: `generate-tarot-pages.test.js: all assertions passed`

- [ ] **Step 5: `npm run build:tarot-pages`로 실제 파일 생성**

Run: `npm run build:tarot-pages`
확인: `data/tarot-slugs.js` 파일이 생성됐고 78개 항목을 담고 있는지 `node -e "console.log(Object.keys(require('./data/tarot-slugs.js').TAROT_SLUGS).length)"`로 확인(78 출력).

- [ ] **Step 6: `index.html`에 스크립트 태그 추가**

`index.html`의 기존(`index.html:268`, `data/category-labels.js` 다음 줄):

```html
<script src="data/category-labels.js"></script>
<script src="js/deck-logic.js"></script>
```

다음으로 교체:

```html
<script src="data/category-labels.js"></script>
<script src="data/tarot-slugs.js"></script>
<script src="js/deck-logic.js"></script>
```

- [ ] **Step 7: `js/app.js`에 딥링크 렌더링 추가**

`js/app.js`의 `showSummary` 함수(`js/app.js:780-806`) 안, 기존:

```js
    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? resolveMeaningText(resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice))
        : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;

      const keywordsList = item.card.keywords && item.card.keywords[item.orientation];
      const adviceText = item.card.advice && item.card.advice[item.orientation];
      const extraHtml = renderKeywordsAdviceHtml(keywordsList, adviceText);

      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        renderReadingMeaning(meaning) +
        extraHtml +
        '</div>';
    });
```

다음으로 교체(카드 상세 링크 추가):

```js
    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? resolveMeaningText(resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice))
        : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;

      const keywordsList = item.card.keywords && item.card.keywords[item.orientation];
      const adviceText = item.card.advice && item.card.advice[item.orientation];
      const extraHtml = renderKeywordsAdviceHtml(keywordsList, adviceText);
      const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
      const detailLinkHtml = slug
        ? '<a class="card-detail-link" href="tarot/' + slug + '.html">이 카드 자세히 보기 →</a>'
        : '';

      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        renderReadingMeaning(meaning) +
        extraHtml +
        detailLinkHtml +
        '</div>';
    });
```

(`typeof TAROT_SLUGS !== 'undefined'` 가드를 두는 이유: 이 함수는 타로 모드에서만 호출되지만, 혹시 스크립트 로드 순서 문제나 향후 리팩터링으로 `TAROT_SLUGS`가 없는 상황이 생겨도 페이지 전체가 죽지 않고 링크만 조용히 빠지게 하기 위함이다.)

- [ ] **Step 8: CSS 한 줄 추가**

`css/salon.css` 파일 끝에 추가:

```css
.card-detail-link { display: inline-block; margin-top: 12px; color: var(--gold); font-size: 13px; text-decoration: none; }
.card-detail-link:hover { text-decoration: underline; }
```

- [ ] **Step 9: 브라우저로 확인**

정적 서버로 `index.html`을 열어 타로 모드로 카드 1장을 뽑고, 결과 화면에 "이 카드 자세히 보기 →" 링크가 나타나는지, 클릭하면 해당 카드의 `/tarot/<slug>.html`로 정확히 이동하는지 확인. 3장 스프레드도 카드마다 각자의 링크가 붙는지 확인. 콘솔 에러 없는지 확인.

- [ ] **Step 10: 커밋**

```bash
git add data/tarot-slugs.js scripts/generate-tarot-pages.js index.html js/app.js css/salon.css tests/generate-tarot-pages.test.js
git commit -m "feat(tarot): link reading results to their static card detail page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 메인 페이지 텍스트 레이어 확장

**Files:**
- Modify: `index.html`
- Modify: `css/salon.css`

**Interfaces:** 없음.

- [ ] **Step 1: 새 섹션들을 `index.html`에 추가**

`index.html`의 기존, `<section id="screen-reading" class="hidden">...</section>` 다음, `<div id="history-modal">` 이전(`index.html:236-238` 사이)에 아래 블록을 통째로 삽입:

```html
  <section class="info-section">
    <h2>운세 종류별 안내</h2>
    <ul class="fortune-guide-list">
      <li class="fortune-guide-item">
        <h3>타로</h3>
        <p>타로는 78장의 카드가 가진 상징을 바탕으로 지금의 고민을 다른 각도에서 바라보게 돕는 도구입니다. 정답을 알려주기보다 스스로 질문을 정리하는 계기로 삼아보세요.</p>
      </li>
      <li class="fortune-guide-item">
        <h3>별자리</h3>
        <p>태어난 날짜로 정해지는 12별자리의 성향과 오늘의 흐름을 가볍게 살펴봅니다.</p>
      </li>
      <li class="fortune-guide-item">
        <h3>띠운세</h3>
        <p>태어난 해의 12간지(띠)를 기준으로 한 해, 한 달의 분위기를 읽어봅니다.</p>
      </li>
      <li class="fortune-guide-item">
        <h3>사주</h3>
        <p>생년월일과 태어난 시각으로 타고난 기질을 살펴보는 전통적인 해석 방식입니다.</p>
      </li>
      <li class="fortune-guide-item">
        <h3>궁합</h3>
        <p>두 사람의 별자리, 띠, 사주를 나란히 놓고 서로의 다른 점과 맞는 점을 알아봅니다.</p>
      </li>
    </ul>
  </section>

  <section class="info-section">
    <h2>타로 카드 둘러보기</h2>
    <p class="hero-copy">메이저 아르카나 22장의 의미를 미리 읽어볼 수 있습니다. 카드를 누르면 정방향·역방향 키워드와 상황별 운세를 바로 확인할 수 있어요.</p>
    <div class="hub-grid">
      <a class="hub-card-link" href="tarot/major-0-fool.html"><img src="images/RWS_Tarot_00_Fool.jpg" alt="" loading="lazy"><span>바보</span></a>
      <a class="hub-card-link" href="tarot/major-1-magician.html"><img src="images/RWS_Tarot_01_Magician.jpg" alt="" loading="lazy"><span>마법사</span></a>
      <a class="hub-card-link" href="tarot/major-2-high-priestess.html"><img src="images/RWS_Tarot_02_High_Priestess.jpg" alt="" loading="lazy"><span>여사제</span></a>
      <a class="hub-card-link" href="tarot/major-3-empress.html"><img src="images/RWS_Tarot_03_Empress.jpg" alt="" loading="lazy"><span>여황제</span></a>
      <a class="hub-card-link" href="tarot/major-4-emperor.html"><img src="images/RWS_Tarot_04_Emperor.jpg" alt="" loading="lazy"><span>황제</span></a>
      <a class="hub-card-link" href="tarot/major-5-hierophant.html"><img src="images/RWS_Tarot_05_Hierophant.jpg" alt="" loading="lazy"><span>교황</span></a>
      <a class="hub-card-link" href="tarot/major-6-lovers.html"><img src="images/RWS_Tarot_06_Lovers.jpg" alt="" loading="lazy"><span>연인</span></a>
      <a class="hub-card-link" href="tarot/major-7-chariot.html"><img src="images/RWS_Tarot_07_Chariot.jpg" alt="" loading="lazy"><span>전차</span></a>
      <a class="hub-card-link" href="tarot/major-8-strength.html"><img src="images/RWS_Tarot_08_Strength.jpg" alt="" loading="lazy"><span>힘</span></a>
      <a class="hub-card-link" href="tarot/major-9-hermit.html"><img src="images/RWS_Tarot_09_Hermit.jpg" alt="" loading="lazy"><span>은둔자</span></a>
      <a class="hub-card-link" href="tarot/major-10-wheel-of-fortune.html"><img src="images/RWS_Tarot_10_Wheel_of_Fortune.jpg" alt="" loading="lazy"><span>운명의 수레바퀴</span></a>
      <a class="hub-card-link" href="tarot/major-11-justice.html"><img src="images/RWS_Tarot_11_Justice.jpg" alt="" loading="lazy"><span>정의</span></a>
      <a class="hub-card-link" href="tarot/major-12-hanged-man.html"><img src="images/RWS_Tarot_12_Hanged_Man.jpg" alt="" loading="lazy"><span>매달린 사람</span></a>
      <a class="hub-card-link" href="tarot/major-13-death.html"><img src="images/RWS_Tarot_13_Death.jpg" alt="" loading="lazy"><span>죽음</span></a>
      <a class="hub-card-link" href="tarot/major-14-temperance.html"><img src="images/RWS_Tarot_14_Temperance.jpg" alt="" loading="lazy"><span>절제</span></a>
      <a class="hub-card-link" href="tarot/major-15-devil.html"><img src="images/RWS_Tarot_15_Devil.jpg" alt="" loading="lazy"><span>악마</span></a>
      <a class="hub-card-link" href="tarot/major-16-tower.html"><img src="images/RWS_Tarot_16_Tower.jpg" alt="" loading="lazy"><span>탑</span></a>
      <a class="hub-card-link" href="tarot/major-17-star.html"><img src="images/RWS_Tarot_17_Star.jpg" alt="" loading="lazy"><span>별</span></a>
      <a class="hub-card-link" href="tarot/major-18-moon.html"><img src="images/RWS_Tarot_18_Moon.jpg" alt="" loading="lazy"><span>달</span></a>
      <a class="hub-card-link" href="tarot/major-19-sun.html"><img src="images/RWS_Tarot_19_Sun.jpg" alt="" loading="lazy"><span>태양</span></a>
      <a class="hub-card-link" href="tarot/major-20-judgement.html"><img src="images/RWS_Tarot_20_Judgement.jpg" alt="" loading="lazy"><span>심판</span></a>
      <a class="hub-card-link" href="tarot/major-21-world.html"><img src="images/RWS_Tarot_21_World.jpg" alt="" loading="lazy"><span>세계</span></a>
    </div>
    <p class="hero-copy"><a href="tarot/index.html">타로 78장 전체 보기 →</a></p>
  </section>

  <section class="info-section">
    <h2>이 서비스에 대해</h2>
    <p>점집은 타로, 별자리, 띠운세, 사주, 궁합을 하나의 공간에서 가볍게 즐길 수 있는 무료 운세 서비스입니다. 카드 한 장, 별자리 하나마다 상황에 맞는 문장을 따로 정성껏 담았습니다.</p>
    <p class="hero-copy"><a href="about.html">서비스 소개 자세히 보기 →</a></p>
  </section>

  <section class="info-section">
    <h2>자주 묻는 질문</h2>
    <dl class="faq-preview-list">
      <div class="faq-preview-item">
        <dt>타로 결과는 미래를 정확히 맞히나요?</dt>
        <dd>아니요. 확정된 미래를 예언하는 것이 아니라 오락·자기성찰을 위한 콘텐츠입니다.</dd>
      </div>
      <div class="faq-preview-item">
        <dt>입력한 생년월일은 저장되나요?</dt>
        <dd>서버로 전송되지 않고 이용자의 브라우저에만 저장됩니다.</dd>
      </div>
      <div class="faq-preview-item">
        <dt>역방향 카드는 나쁜 뜻인가요?</dt>
        <dd>아닙니다. 같은 카드를 다른 각도에서 보는 해석일 뿐입니다.</dd>
      </div>
    </dl>
    <p class="hero-copy"><a href="faq.html">자주 묻는 질문 전체 보기 →</a></p>
  </section>

```

- [ ] **Step 2: CSS 추가**

`css/salon.css` 파일 끝에 추가:

```css
.info-section { border-top: 1px solid var(--line); padding-top: 32px; margin-top: 32px; }
.info-section h2 { font-family: Batang, 'AppleMyungjo', serif; color: var(--gold); font-weight: 400; font-size: 22px; margin-bottom: 16px; }
.fortune-guide-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.fortune-guide-item h3 { margin: 0 0 6px; font-size: 15px; color: var(--ink); }
.fortune-guide-item p { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.75; word-break: keep-all; }
.faq-preview-list { margin: 0; }
.faq-preview-item { margin-bottom: 16px; }
.faq-preview-item dt { font-size: 14px; color: var(--ink); font-weight: 600; margin-bottom: 4px; }
.faq-preview-item dd { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.7; }
@media (max-width: 700px) {
  .fortune-guide-list { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: 브라우저로 확인**

정적 서버로 `index.html`을 열고 페이지 하단까지 스크롤해서: 운세 종류별 안내 5개, 타로 카드 둘러보기 22장 그리드(클릭 시 해당 카드 페이지로 이동 확인 최소 2장), 서비스 소개 요약 + about 링크, FAQ 요약 3개 + 전체보기 링크가 모두 정상 렌더링되는지 확인. 콘솔 에러 없는지 확인. 모바일 뷰(`resize_window` preset mobile)에서도 레이아웃이 깨지지 않는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add index.html css/salon.css
git commit -m "content(home): add readable text sections around the interactive tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: 최종 회귀 검증

**Files:** (변경 없음 — 검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 13개 파일 전부 통과(테스트 파일 개수 자체는 이번 배치에서 늘지 않음 — 기존 파일들에 assertion만 추가했으므로)

- [ ] **Step 2: 브라우저 전체 동선 확인**

홈(`index.html`) 스크롤 다운 → 새 텍스트 섹션들 확인 → 타로 카드 둘러보기 그리드에서 카드 1장 클릭 → 카드 상세 페이지 확인(canonical/OG 태그 포함) → 하단 nav로 다시 홈 → 타로 모드로 카드 뽑기 → 결과 화면의 "이 카드 자세히 보기" 링크 클릭 → 다시 홈 → 푸터의 소개/문의하기/자주 묻는 질문/개인정보처리방침 링크 각각 클릭 확인 → `404.html` 직접 열어 확인. 콘솔 에러 없음(`read_console_messages`) 확인.

- [ ] **Step 3: sitemap.xml 최종 확인**

`grep -c "<url>" sitemap.xml`로 개수 확인 — 기존 82개(홈/about/legal/hub/78카드) + contact.html + faq.html = 84개.

- [ ] **Step 4: 남은 변경사항 커밋**

```bash
git status --short
git add -A
git commit -m "chore(adsense-followup): finalize legal copy, SEO tags, new pages, and homepage content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" # 변경사항이 있을 때만
```

- [ ] **Step 5: 사용자에게 push 여부 확인 후 push**

커밋 완료 후 사용자에게 push 진행 여부를 확인받는다(자동으로 push하지 않는다).
