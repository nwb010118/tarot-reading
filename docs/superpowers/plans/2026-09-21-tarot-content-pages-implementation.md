# 타로 카드 백과사전 정적 페이지 & 사이트 구조 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 작성된 타로 78장 콘텐츠(`data/tarot-data-*.js`)를 검색엔진이 크롤링할 수 있는 정적 HTML 페이지 78개 + 허브 페이지로 노출하고, 사이트 전체(홈/legal/새 페이지들)에 공통 내비게이션과 About 페이지를 추가한다.

**Architecture:** GitHub Pages는 순수 정적 호스팅이므로, Node 빌드 스크립트(`scripts/generate-tarot-pages.js`)가 기존 데이터 파일을 읽어 `/tarot/<slug>.html` 78개와 `/tarot/index.html` 허브 페이지, 그리고 `sitemap.xml`을 생성해 저장소에 커밋한다. 데이터 변환(슬러그/카테고리 텍스트 추출)과 HTML 문자열 생성은 각각 별도의 순수 함수 모듈로 분리해 테스트 가능하게 만든다.

**Tech Stack:** 순수 Node.js (외부 의존성 없음, 기존 `scripts/run-tests.js` / `tests/*.test.js`와 동일하게 `assert` 모듈만 사용), 기존 `css/salon.css` 디자인 토큰 재사용.

## Global Constraints

- 참고 스펙: `docs/superpowers/specs/2026-09-21-tarot-content-pages-design.md`
- 정적 페이지는 **항상 상대 경로**만 사용한다 (커스텀 도메인이 아직 없고 GitHub Pages 서브경로 `nwb010118.github.io/tarot-reading/`에서 서빙되므로, 절대경로 `/`로 시작하는 링크는 금지).
- 카테고리 텍스트는 랜덤 선택 없이 **항상 `a[0]`(관찰) + `b[0]`(조언)의 고정 원문**만 노출한다. 값이 아직 순수 문자열인 잠긴 카드 예외는 그 문자열을 그대로 노출한다.
- `/tarot/*.html` 78+1개 파일은 **스크립트로만 생성**한다 — 손으로 직접 수정하지 않는다. 콘텐츠를 고치려면 `data/tarot-data-*.js`를 고치고 스크립트를 재실행한다.
- 사주(saju)·궁합(compatibility)의 정적 페이지화는 이번 계획 범위 밖이다.
- 기존 `node scripts/run-tests.js`는 이 작업이 끝난 뒤에도 항상 전부 통과해야 한다(회귀 금지).
- 카테고리 순서는 항상 `love, money, career, workplace, business, study, health, relationships, honor, moving, children` (기존 `index.html`의 카테고리 버튼 순서 및 `js/app.js`의 `CATEGORY_LABELS` 순서와 동일).
- 카테고리별 하위 항목(subchoice) 키/라벨은 `js/app.js`의 `CATEGORY_SUBCHOICES`(js/app.js:24-33)와 **정확히 동일**해야 한다. 두 파일 중 하나만 고치면 안 되며, `js/app.js`가 바뀌면 이 계획에서 만드는 사본도 함께 갱신해야 한다.

---

## Task 1: 카드 데이터 → 뷰모델 변환 모듈

**Files:**
- Create: `scripts/lib/tarot-page-data.js`
- Test: `tests/tarot-page-data.test.js`

**Interfaces:**
- Consumes: `getFullDeck()`, `TAROT_DATA` (`data/tarot-data.js`가 내보내는 것과 동일한 방식으로 `data/tarot-data-major.js`, `data/tarot-data-wands.js`, `data/tarot-data-cups.js`, `data/tarot-data-swords.js`, `data/tarot-data-pentacles.js`를 `global`에 올린 뒤 `require('../data/tarot-data.js')`)
- Produces:
  - `slugify(deckCard)` → `string` (예: `'major-19-sun'`, `'wands-ace'`, `'cups-10'`)
  - `buildCardViewModel(deckCard)` → `{ slug, title, description, image, name, nameEn, type, suitLabel, upright: OrientationView, reversed: OrientationView }`
  - `OrientationView` = `{ keywords: string[], advice: string, categories: Array<{ label: string, items: Array<{ subLabel: string|null, text: string }> }> }`
  - 이 두 함수를 Task 2/3/4에서 그대로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/tarot-page-data.test.js` 새로 작성:

```js
const assert = require('assert');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { slugify, buildCardViewModel, CATEGORY_ORDER } = require('../scripts/lib/tarot-page-data.js');

const deck = getFullDeck();

// --- slugify ---
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'major_19'; })), 'major-19-sun');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'major_0'; })), 'major-0-fool');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'major_2'; })), 'major-2-high-priestess');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'major_10'; })), 'major-10-wheel-of-fortune');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'wands_Ace'; })), 'wands-ace');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'cups_10'; })), 'cups-10');
assert.strictEqual(slugify(deck.find(function (c) { return c.cardId === 'swords_King'; })), 'swords-king');

// --- 슬러그 78개 전부 유일 ---
const slugs = deck.map(slugify);
assert.strictEqual(new Set(slugs).size, 78, 'slugs must be unique across all 78 cards');
slugs.forEach(function (s) {
  assert.ok(/^[a-z0-9-]+$/.test(s), 'slug must be lowercase alnum+hyphen: ' + s);
});

// --- buildCardViewModel: 구조 검증 (78장 전부) ---
deck.forEach(function (card) {
  const vm = buildCardViewModel(card);
  assert.strictEqual(vm.slug, slugify(card));
  assert.ok(vm.title.length > 0);
  assert.ok(vm.description.length > 0);
  assert.ok(vm.image.startsWith('images/'));

  ['upright', 'reversed'].forEach(function (orientation) {
    const view = vm[orientation];
    assert.ok(Array.isArray(view.keywords) && view.keywords.length > 0, card.cardId + '.' + orientation + '.keywords');
    assert.ok(typeof view.advice === 'string' && view.advice.length > 0, card.cardId + '.' + orientation + '.advice');
    assert.strictEqual(view.categories.length, CATEGORY_ORDER.length, card.cardId + '.' + orientation + ' category count');

    let totalItems = 0;
    view.categories.forEach(function (cat) {
      cat.items.forEach(function (item) {
        totalItems++;
        assert.ok(typeof item.text === 'string' && item.text.length > 0, card.cardId + '.' + orientation + '.' + cat.label + ' text');
      });
    });
    // 8개 카테고리 x 2개 subchoice + 3개 단일 카테고리 = 19
    assert.strictEqual(totalItems, 19, card.cardId + '.' + orientation + ' total category items (expected 19)');
  });
});

console.log('tarot-page-data.test.js: all assertions passed (' + deck.length + ' cards)');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/tarot-page-data.test.js`
Expected: `Error: Cannot find module '../scripts/lib/tarot-page-data.js'`

- [ ] **Step 3: 최소 구현 작성**

`scripts/lib/tarot-page-data.js` 새로 작성:

```js
// js/app.js의 CATEGORY_LABELS / CATEGORY_SUBCHOICES(js/app.js:18-33)와 동일해야 함.
// app.js를 고칠 때 이 사본도 함께 갱신할 것.
const CATEGORY_LABELS = {
  love: '연애운', money: '재물운', career: '취업운', workplace: '직장운', business: '사업운',
  study: '학업운', health: '건강운', relationships: '대인관계운', honor: '명예운',
  moving: '이사운', children: '자식운'
};

const CATEGORY_ORDER = [
  'love', 'money', 'career', 'workplace', 'business',
  'study', 'health', 'relationships', 'honor', 'moving', 'children'
];

const CATEGORY_SUBCHOICES = {
  love: [{ key: 'solo', label: '솔로' }, { key: 'couple', label: '커플' }],
  money: [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }],
  career: [{ key: 'jobseek', label: '구직' }, { key: 'switch', label: '이직' }],
  business: [{ key: 'startup', label: '창업준비' }, { key: 'running', label: '운영중' }],
  study: [{ key: 'exam', label: '시험준비' }, { key: 'path', label: '진로고민' }],
  health: [{ key: 'body', label: '신체' }, { key: 'mind', label: '정신' }],
  relationships: [{ key: 'new', label: '새로운 인연' }, { key: 'existing', label: '기존 관계' }],
  workplace: [{ key: 'team', label: '팀워크' }, { key: 'personal', label: '개인성과' }]
};

const SUIT_LABEL_KR = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };

function slugifyMajorName(nameEn) {
  return nameEn
    .replace(/^The\s+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function slugify(deckCard) {
  if (deckCard.type === 'major') {
    const id = deckCard.cardId.split('_')[1];
    return 'major-' + id + '-' + slugifyMajorName(deckCard.nameEn);
  }
  const parts = deckCard.cardId.split('_');
  const suit = parts[0];
  const rank = parts[1];
  return suit + '-' + rank.toLowerCase();
}

function resolveCanonical(value) {
  if (typeof value === 'string') return value;
  return value.a[0] + ' ' + value.b[0];
}

function suitKeyOf(deckCard) {
  if (deckCard.type === 'major') return 'major';
  return deckCard.cardId.split('_')[0];
}

function buildOrientationView(entity, orientation) {
  const categories = CATEGORY_ORDER.map(function (categoryKey) {
    const catObj = entity.categories[categoryKey];
    const raw = catObj[orientation];
    const subchoices = CATEGORY_SUBCHOICES[categoryKey];
    const items = subchoices
      ? subchoices.map(function (sc) {
          return { subLabel: sc.label, text: resolveCanonical(raw[sc.key]) };
        })
      : [{ subLabel: null, text: resolveCanonical(raw) }];
    return { label: CATEGORY_LABELS[categoryKey], items: items };
  });

  return {
    keywords: entity.keywords[orientation],
    advice: entity.advice[orientation][0],
    categories: categories
  };
}

function buildCardViewModel(deckCard) {
  const suitKey = suitKeyOf(deckCard);
  const slug = slugify(deckCard);
  const titleName = deckCard.type === 'major' ? (deckCard.name + ' (' + deckCard.nameEn + ')') : deckCard.name;
  const upKeywordsPreview = deckCard.keywords.upright.slice(0, 3).join(', ');

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
}

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

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/tarot-page-data.test.js`
Expected: `tarot-page-data.test.js: all assertions passed (78 cards)` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/tarot-page-data.js tests/tarot-page-data.test.js
git commit -m "feat(tarot-pages): add card data-to-viewmodel transform module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: HTML 렌더링 모듈 (카드 페이지 + 허브 페이지)

**Files:**
- Create: `scripts/lib/render-tarot-pages.js`
- Test: `tests/render-tarot-pages.test.js`

**Interfaces:**
- Consumes: Task 1의 `buildCardViewModel(deckCard)` 반환 타입, `CATEGORY_ORDER`, `SUIT_LABEL_KR`
- Produces:
  - `renderCardPage(vm, nav)` → `string` (완전한 HTML 문서). `nav = { prevHref, prevLabel, nextHref, nextLabel, suitLinks: Array<{href, label, isCurrent}> }`
  - `renderHubPage(allViewModels)` → `string` (완전한 HTML 문서)
  - Task 4(오케스트레이터)가 이 두 함수를 그대로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/render-tarot-pages.test.js` 새로 작성:

```js
const assert = require('assert');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel } = require('../scripts/lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('../scripts/lib/render-tarot-pages.js');

const deck = getFullDeck();
const sunCard = deck.find(function (c) { return c.cardId === 'major_19'; });
const vm = buildCardViewModel(sunCard);

const nav = {
  prevHref: 'major-18-moon.html', prevLabel: '달',
  nextHref: 'major-20-judgement.html', nextLabel: '심판',
  suitLinks: [{ href: 'major-0-fool.html', label: '바보', isCurrent: false }]
};

const html = renderCardPage(vm, nav);

assert.ok(html.startsWith('<!DOCTYPE html>'));
assert.ok(html.includes('<html lang="ko">'));
assert.ok(html.includes(vm.title), 'title must appear in <title>');
assert.ok(html.includes('<h1>태양 (The Sun)</h1>'), 'h1 must show card name');
assert.ok(html.includes('../images/RWS_Tarot_19_Sun.jpg'), 'image src must be relative (../images/...)');
assert.ok(html.includes('href="../index.html">홈'), 'nav must link home via ../index.html');
assert.ok(html.includes('href="index.html">타로 카드 백과사전'), 'nav must link the hub via the same-directory index.html, not a roundabout ../tarot/index.html');
assert.ok(html.includes('href="../about.html">About'), 'nav must link about via ../about.html');
assert.ok(html.includes('major-18-moon.html'), 'prev link present');
assert.ok(html.includes('major-20-judgement.html'), 'next link present');
assert.ok(!html.includes('undefined'), 'no stray undefined in output');
assert.ok(!/^\//m.test(html.replace(/<!DOCTYPE html>/, '')) || true); // 절대경로(href="/...") 금지: 아래 정규식으로 별도 검증
assert.ok(!/href="\/[^/]/.test(html), 'must not contain a root-absolute href="/..."');

// 카테고리 11개(19블록) 텍스트가 실제로 본문에 존재하는지 표본 확인
assert.ok(html.includes(vm.upright.categories[0].items[0].text), 'first upright category text must render');
assert.ok(html.includes(vm.reversed.categories[0].items[0].text), 'first reversed category text must render');

// 허브 페이지
const hubHtml = renderHubPage(deck.map(buildCardViewModel));
assert.ok(hubHtml.includes('메이저 아르카나'));
assert.ok(hubHtml.includes('완드'));
assert.ok(hubHtml.includes('major-19-sun.html'));
assert.ok(hubHtml.includes('wands-ace.html'));
assert.ok(!/href="\/[^/]/.test(hubHtml), 'hub must not contain a root-absolute href="/..."');

console.log('render-tarot-pages.test.js: all assertions passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: `Error: Cannot find module '../scripts/lib/render-tarot-pages.js'`

- [ ] **Step 3: 최소 구현 작성**

`scripts/lib/render-tarot-pages.js` 새로 작성:

```js
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

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

function renderOrientationSection(orientationLabel, view) {
  const categoriesHtml = view.categories.map(function (cat) {
    const itemsHtml = cat.items.map(function (item) {
      const heading = item.subLabel ? '<h4>' + escapeHtml(item.subLabel) + '</h4>' : '';
      return '<div class="subchoice-block">' + heading + '<p>' + escapeHtml(item.text) + '</p></div>';
    }).join('');
    return '<div class="category-item"><h3>' + escapeHtml(cat.label) + '</h3>' + itemsHtml + '</div>';
  }).join('');

  return '<section class="orientation-block">' +
    '<h2>' + escapeHtml(orientationLabel) + '</h2>' +
    '<p class="card-keywords">키워드: ' + escapeHtml(view.keywords.join(' · ')) + '</p>' +
    '<p class="card-advice">조언: ' + escapeHtml(view.advice) + '</p>' +
    '<div class="category-list">' + categoriesHtml + '</div>' +
    '</section>';
}

function renderCardPage(vm, nav) {
  const suitLinksHtml = nav.suitLinks.map(function (link) {
    const cls = link.isCurrent ? ' class="current"' : '';
    return '<a href="' + link.href + '"' + cls + '>' + escapeHtml(link.label) + '</a>';
  }).join(' · ');

  return '<!DOCTYPE html>\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + escapeHtml(vm.title) + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + escapeHtml(vm.description) + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="tarot-page">\n' +
    renderHeader(TAROT_DIR_LINKS) +
    '<main class="card-page-main">\n' +
    '<p class="eyebrow">' + escapeHtml(vm.suitLabel) + ' · 타로 카드 백과사전</p>\n' +
    '<h1>' + escapeHtml(vm.name) + (vm.nameEn ? ' (' + escapeHtml(vm.nameEn) + ')' : '') + '</h1>\n' +
    '<div class="card-hero-page"><img src="../' + vm.image + '" alt="' + escapeHtml(vm.name) + ' 타로 카드 이미지" loading="lazy"></div>\n' +
    renderOrientationSection('정방향', vm.upright) +
    renderOrientationSection('역방향', vm.reversed) +
    '<nav class="card-pager" aria-label="다른 카드 보기">' +
    '<a href="' + nav.prevHref + '">← ' + escapeHtml(nav.prevLabel) + '</a>' +
    '<a href="index.html">전체 카드 목록</a>' +
    '<a href="' + nav.nextHref + '">' + escapeHtml(nav.nextLabel) + ' →</a>' +
    '</nav>\n' +
    '<p class="suit-links">같은 슈트: ' + suitLinksHtml + '</p>\n' +
    '<a class="cta-home" href="../index.html">홈에서 직접 카드 뽑아보기 ↗</a>\n' +
    '</main>\n' +
    renderFooter(TAROT_DIR_LINKS) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n';
}

function renderHubPage(allViewModels) {
  const suitOrder = ['major', 'wands', 'cups', 'swords', 'pentacles'];
  const suitLabels = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };

  const sections = suitOrder.map(function (suitKey) {
    const cards = allViewModels.filter(function (vm) { return vm.suitKey === suitKey; });
    const gridHtml = cards.map(function (vm) {
      return '<a class="hub-card-link" href="' + vm.slug + '.html">' +
        '<img src="../' + vm.image + '" alt="" loading="lazy">' +
        '<span>' + escapeHtml(vm.name) + '</span>' +
        '</a>';
    }).join('');
    return '<section class="hub-suit-group"><h2>' + escapeHtml(suitLabels[suitKey]) + '</h2>' +
      '<div class="hub-grid">' + gridHtml + '</div></section>';
  }).join('');

  return '<!DOCTYPE html>\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>타로 카드 78장 백과사전 | 점집</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="메이저 아르카나 22장과 마이너 아르카나(완드·컵·소드·펜타클) 56장, 타로 78장 전체의 정방향·역방향 키워드와 운세를 확인해보세요.">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="tarot-page">\n' +
    renderHeader(TAROT_DIR_LINKS) +
    '<main class="hub-main">\n' +
    '<p class="eyebrow">타로 카드 백과사전</p>\n' +
    '<h1>타로 78장, 카드 하나하나의 의미</h1>\n' +
    '<p class="hero-copy">이 페이지들은 무료로 참고할 수 있는 타로 카드 사전입니다. 실제로 카드를 뽑아 나만의 운세를 보려면 <a href="../index.html">홈</a>에서 진행해보세요.</p>\n' +
    sections +
    '</main>\n' +
    renderFooter(TAROT_DIR_LINKS) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n';
}

module.exports = { renderCardPage, renderHubPage, escapeHtml };
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: `render-tarot-pages.test.js: all assertions passed`, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/render-tarot-pages.js tests/render-tarot-pages.test.js
git commit -m "feat(tarot-pages): add HTML render module for card and hub pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: 오케스트레이터 스크립트 (78+1 파일 생성 + sitemap.xml 갱신)

**Files:**
- Create: `scripts/generate-tarot-pages.js`
- Modify: `package.json` (스크립트 항목 추가)
- Test: `tests/generate-tarot-pages.test.js`

**Interfaces:**
- Consumes: Task 1의 `buildCardViewModel`/`slugify`, Task 2의 `renderCardPage`/`renderHubPage`
- Produces: `generate()` (module export) — 호출 시 `tarot/*.html` 78+1개와 `sitemap.xml`을 디스크에 씀. `require.main === module`일 때 자동 실행.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/generate-tarot-pages.test.js` 새로 작성:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { generate } = require('../scripts/generate-tarot-pages.js');

const root = path.join(__dirname, '..');
generate();

const tarotDir = path.join(root, 'tarot');
const files = fs.readdirSync(tarotDir).filter(function (f) { return f.endsWith('.html'); });

// 78장 + index.html 허브
assert.strictEqual(files.length, 79, 'expected 78 card pages + 1 hub page, got ' + files.length);
assert.ok(files.includes('index.html'), 'hub page must exist');
assert.ok(files.includes('major-19-sun.html'), 'sample major card page must exist');
assert.ok(files.includes('wands-ace.html'), 'sample minor card page must exist');

// 표본 파일 내용 확인
const sunHtml = fs.readFileSync(path.join(tarotDir, 'major-19-sun.html'), 'utf8');
assert.ok(sunHtml.includes('태양'));
assert.ok(sunHtml.includes('../images/RWS_Tarot_19_Sun.jpg'));

const wandsAceHtml = fs.readFileSync(path.join(tarotDir, 'wands-ace.html'), 'utf8');
assert.ok(wandsAceHtml.includes('완드 에이스'));

// 순환 이전/다음 링크: 메이저 0번의 이전은 마지막 카드(pentacles-king)여야 함
const foolHtml = fs.readFileSync(path.join(tarotDir, 'major-0-fool.html'), 'utf8');
assert.ok(foolHtml.includes('pentacles-king.html'), 'first card (major-0) must link back to the last card as prev');

// sitemap.xml 갱신 확인
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'));
assert.ok(sitemap.includes('tarot-reading/tarot/index.html'));
assert.ok((sitemap.match(/<url>/g) || []).length >= 80, 'sitemap must contain at least 80 <url> entries (2 existing + 78 cards + hub, about.html added in a later task)');

console.log('generate-tarot-pages.test.js: all assertions passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: `Error: Cannot find module '../scripts/generate-tarot-pages.js'`

- [ ] **Step 3: 최소 구현 작성**

`scripts/generate-tarot-pages.js` 새로 작성:

```js
const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel } = require('./lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('./lib/render-tarot-pages.js');

const ROOT = path.join(__dirname, '..');
const TAROT_DIR = path.join(ROOT, 'tarot');
const SITE_BASE = 'https://nwb010118.github.io/tarot-reading/';

function buildNavFor(index, viewModels) {
  const total = viewModels.length;
  const prev = viewModels[(index - 1 + total) % total];
  const next = viewModels[(index + 1) % total];
  const current = viewModels[index];
  const suitLinks = viewModels
    .filter(function (vm) { return vm.suitKey === current.suitKey; })
    .map(function (vm) {
      return { href: vm.slug + '.html', label: vm.name, isCurrent: vm.slug === current.slug };
    });

  return {
    prevHref: prev.slug + '.html', prevLabel: prev.name,
    nextHref: next.slug + '.html', nextLabel: next.name,
    suitLinks: suitLinks
  };
}

function generate() {
  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);

  if (!fs.existsSync(TAROT_DIR)) fs.mkdirSync(TAROT_DIR);

  viewModels.forEach(function (vm, index) {
    const nav = buildNavFor(index, viewModels);
    const html = renderCardPage(vm, nav);
    fs.writeFileSync(path.join(TAROT_DIR, vm.slug + '.html'), html, 'utf8');
  });

  const hubHtml = renderHubPage(viewModels);
  fs.writeFileSync(path.join(TAROT_DIR, 'index.html'), hubHtml, 'utf8');

  writeSitemap(viewModels);
}

function writeSitemap(viewModels) {
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });
  const today = new Date().toISOString().slice(0, 10);

  const urlsXml = staticUrls.concat(cardUrls).map(function (u) {
    return '  <url>\n' +
      '    <loc>' + u.loc + '</loc>\n' +
      '    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>' + u.changefreq + '</changefreq>\n' +
      '    <priority>' + u.priority + '</priority>\n' +
      '  </url>';
  }).join('\n');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urlsXml + '\n' +
    '</urlset>\n';

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
}

if (require.main === module) {
  generate();
  console.log('Generated 78 tarot card pages + 1 hub page + sitemap.xml');
}

module.exports = { generate };
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/generate-tarot-pages.test.js`
Expected: `generate-tarot-pages.test.js: all assertions passed`, exit code 0

- [ ] **Step 5: `package.json`에 빌드 스크립트 추가**

`package.json`의 `"scripts"` 객체를 수정:

```json
  "scripts": {
    "test": "node scripts/run-tests.js",
    "build:tarot-pages": "node scripts/generate-tarot-pages.js"
  },
```

- [ ] **Step 6: 전체 테스트 스위트 재확인**

Run: `node scripts/run-tests.js`
Expected: 기존 10개 + 신규 3개(`tarot-page-data`, `render-tarot-pages`, `generate-tarot-pages`) = 13개 파일, 13/13 통과

- [ ] **Step 7: 커밋**

```bash
git add scripts/generate-tarot-pages.js tests/generate-tarot-pages.test.js package.json tarot/ sitemap.xml
git commit -m "feat(tarot-pages): generate 78 static tarot card pages + hub + sitemap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: 카드 백과사전 페이지 전용 CSS

**Files:**
- Modify: `css/salon.css` (파일 끝에 새 섹션 추가)

**Interfaces:**
- Consumes: 기존 `:root` 토큰(`--night`, `--panel`, `--gold`, `--ink`, `--muted`, `--line`)
- Produces: Task 3에서 생성한 HTML이 사용하는 클래스 전부: `.site-nav`, `.tarot-page`, `.card-page-main`, `.card-hero-page`, `.orientation-block`, `.category-list`, `.category-item`, `.subchoice-block`, `.card-pager`, `.suit-links`, `.cta-home`, `.hub-main`, `.hub-suit-group`, `.hub-grid`, `.hub-card-link`

- [ ] **Step 1: CSS 추가**

`css/salon.css` 파일 끝에 추가:

```css
/* 타로 카드 백과사전 페이지 */
.site-nav { display: flex; gap: 18px; font-size: 13px; }
.site-nav a { color: var(--muted); text-decoration: none; }
.site-nav a:hover { color: var(--gold); }
.card-page-main, .hub-main { border: 1px solid var(--line); background: linear-gradient(135deg, #142235, #0f1b2b); border-radius: 20px; padding: 36px; margin-top: 24px; }
.card-hero-page { text-align: center; margin: 24px 0 32px; }
.card-hero-page img { max-width: 240px; width: 100%; height: auto; border-radius: 10px; box-shadow: 0 20px 50px #00000040; }
.orientation-block { border-top: 1px solid var(--line); padding-top: 24px; margin-top: 24px; }
.orientation-block h2 { font-family: Batang, 'AppleMyungjo', serif; color: var(--gold); font-weight: 400; }
.category-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-top: 16px; }
.category-item { background: #0e1a2a; border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.category-item h3 { margin: 0 0 8px; font-size: 15px; color: var(--gold); }
.subchoice-block { margin-top: 10px; }
.subchoice-block h4 { margin: 0 0 4px; font-size: 12px; color: var(--muted); font-weight: 500; }
.subchoice-block p { margin: 0; font-size: 14px; line-height: 1.75; color: #d2d9e2; word-break: keep-all; }
.card-pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13px; }
.card-pager a { color: var(--muted); text-decoration: none; }
.card-pager a:hover { color: var(--gold); }
.suit-links { margin-top: 16px; font-size: 13px; color: var(--muted); word-break: keep-all; }
.suit-links a { color: var(--muted); }
.suit-links a.current { color: var(--gold); }
.cta-home { display: inline-block; margin-top: 24px; padding: 12px 22px; background: linear-gradient(110deg, #e2cda5, #c8ac79); color: #172131; border-radius: 8px; text-decoration: none; font-weight: 700; }
.hub-suit-group { margin-top: 32px; }
.hub-suit-group h2 { font-family: Batang, 'AppleMyungjo', serif; color: var(--gold); font-weight: 400; }
.hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; margin-top: 16px; }
.hub-card-link { display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; color: var(--ink); font-size: 12px; text-align: center; }
.hub-card-link img { width: 90px; height: auto; border-radius: 6px; border: 1px solid var(--line); }
.hub-card-link:hover img { border-color: var(--gold); }
@media (max-width: 700px) {
  .card-page-main, .hub-main { padding: 20px; }
  .category-list { grid-template-columns: 1fr; }
  .site-nav { gap: 12px; font-size: 12px; }
}
```

- [ ] **Step 2: 커밋**

```bash
git add css/salon.css
git commit -m "style(tarot-pages): add styles for card encyclopedia and hub pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: 생성 결과 브라우저 검증

**Files:** (변경 없음 — 검증 전용 태스크)

- [ ] **Step 1: 정적 서버로 미리보기**

`.claude/launch.json`의 기존 `static-preview` 설정(포트 8080)을 사용해 로컬 서버를 띄운다.

- [ ] **Step 2: 다음 페이지를 브라우저로 열어 확인**

  - `http://localhost:8080/tarot/index.html` — 5개 슈트 그룹, 78개 카드 썸네일/링크가 보이는지
  - `http://localhost:8080/tarot/major-19-sun.html` — 메이저 카드, 정/역방향 키워드·조언·11개 카테고리(19블록)가 다 보이는지, 이전/다음 링크가 `major-18-moon.html`/`major-20-judgement.html`로 걸리는지
  - `http://localhost:8080/tarot/wands-ace.html` — 잠긴 카드(예외) 페이지가 깨지지 않고 나오는지
  - `http://localhost:8080/tarot/pentacles-king.html` — 순환의 마지막 카드, "다음" 링크가 `major-0-fool.html`로 돌아가는지
  - 브라우저 콘솔에 에러가 없는지 (`read_console_messages`)

- [ ] **Step 3: 문제 발견 시**

Task 1~4로 돌아가 데이터/렌더 함수를 고치고, `node scripts/run-tests.js` 재확인 후 `npm run build:tarot-pages`로 재생성 → 다시 커밋.

---

## Task 6: `index.html` / `legal.html`에 공통 내비게이션 추가

**Files:**
- Modify: `index.html`
- Modify: `legal.html`

**Interfaces:**
- Consumes: Task 4에서 추가한 `.site-nav` CSS 클래스

- [ ] **Step 1: `index.html` 헤더 수정**

`index.html`의 기존 헤더(`index.html:15-18`):

```html
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <span class="header-note">당신을 위한 작은 쉼표</span>
  </header>
```

다음으로 교체:

```html
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
  </header>
```

(기존 `<span class="header-note">`는 모바일에서 이미 `display:none` 처리돼 있던 장식 문구라 nav로 교체한다.)

- [ ] **Step 2: `legal.html` 헤더 수정**

`legal.html`의 기존 헤더(`legal.html:11-13`):

```html
  <header>
    <h1>점집</h1>
  </header>
```

다음으로 교체:

```html
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="점집 처음으로"><span class="brand-seal" aria-hidden="true">점</span> 점집 <small>마음을 비추는 곳</small></a>
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
  </header>
```

`legal.html`은 `css/salon.css`를 로드하지 않으므로(`legal.html:7`에 `css/style.css`만 있음), 이 헤더가 salon 스타일을 받으려면 `<head>`에 `<link rel="stylesheet" href="css/salon.css">`를 `css/style.css` 다음 줄에 추가한다.

- [ ] **Step 3: 브라우저 확인**

`http://localhost:8080/index.html`, `http://localhost:8080/legal.html`을 열어 nav가 보이고 링크가 동작하는지 확인 (아직 `about.html`이 없으므로 About 링크는 Task 7 완료 전까지 404 — 정상).

- [ ] **Step 4: 커밋**

```bash
git add index.html legal.html
git commit -m "feat(nav): add site navigation to home and legal pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: About 페이지 신규 작성

**Files:**
- Create: `about.html`

**Interfaces:**
- Consumes: `css/style.css`, `css/salon.css`, Task 4의 `.site-nav`

- [ ] **Step 1: `about.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About — 점집</title>
<meta name="theme-color" content="#0b1422">
<link rel="icon" type="image/svg+xml" href="images/moon-mark.svg">
<meta name="description" content="점집을 만든 이유와 콘텐츠를 대하는 태도를 소개합니다.">
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
    <h2>점집 운영팀 소개</h2>
    <p>안녕하세요, 점집 운영팀입니다. 저희는 실명이나 신상 정보를 따로 공개하지 않고, "점집 운영팀"이라는 이름으로 이 서비스를 운영하고 있습니다.</p>

    <h3>왜 점집을 만들었나요</h3>
    <p>타로, 별자리, 띠운세, 사주, 궁합 같은 콘텐츠는 인터넷 어디에나 있지만, 대충 짜깁기된 문장을 반복해서 보여주는 곳이 많다고 느꼈습니다. 점집은 카드 한 장, 별자리 하나, 띠 하나마다 상황(연애·재물·직장·건강 등)에 맞는 문장을 따로 정성껏 써서 담고 있습니다. 같은 카드를 여러 번 뽑아도 표현이 조금씩 달라지도록 여러 버전의 문장을 준비해두었습니다.</p>

    <h3>어떤 서비스인가요</h3>
    <p>점집은 무료로 제공되는 오락 목적의 웹사이트입니다. 회원가입이나 결제 없이 누구나 바로 이용할 수 있고, 입력하신 생년월일 등의 정보는 서버로 전송되지 않고 이용자의 브라우저에만 저장됩니다. 자세한 내용은 <a href="legal.html#privacy">개인정보처리방침</a>을 참고해주세요.</p>

    <h3>콘텐츠를 대하는 태도</h3>
    <p>타로·사주 등은 어디까지나 전통 이론과 무작위 요소에 기반한 오락 콘텐츠이며, 법률·의료·재정·심리 상담을 대체하지 않습니다. 자세한 내용은 <a href="legal.html#disclaimer">면책조항</a>을 확인해주세요.</p>

    <h3>문의</h3>
    <p>서비스에 대한 의견이나 문의는 아래 이메일로 연락해주세요.<br>이메일: nwb010118@gmail.com</p>
  </section>

  <footer id="site-footer">
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
  <p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>
</div>
</body>
</html>
```

- [ ] **Step 2: 브라우저 확인**

`http://localhost:8080/about.html`을 열어 레이아웃이 `legal.html`과 일관되게 보이는지, nav의 홈/타로 백과사전/About 링크가 모두 정상 동작하는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add about.html
git commit -m "feat(about): add anonymous About page with site navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 최종 회귀 검증 및 마무리

**Files:** (변경 없음 — 검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 13개 파일 전부(기존 10 + 신규 3) 통과, `13 test files, 13 passed, 0 failed`

- [ ] **Step 2: 브라우저로 전체 동선 확인**

홈(`index.html`) → nav의 "타로 카드 백과사전" 클릭 → 허브 페이지 → 카드 한 장 클릭 → 카드 페이지에서 "이전/다음" 및 "같은 슈트" 링크 클릭 → "홈에서 직접 카드 뽑아보기" 클릭 → 다시 홈으로 → nav의 "About" 클릭 → About 페이지 → "개인정보처리방침" 클릭 → `legal.html`로 이동 확인. 콘솔 에러 없음(`read_console_messages`) 확인.

- [ ] **Step 3: `robots.txt`/`sitemap.xml` 최종 확인**

`sitemap.xml`에 `about.html`, `tarot/index.html`, 78개 카드 URL이 전부 포함됐는지 `grep -c "<url>" sitemap.xml`로 개수 확인(2개 정적 + about + hub + 78 = 82개 이상).

- [ ] **Step 4: 남은 변경사항 커밋**

```bash
git status --short
git add -A
git commit -m "chore(tarot-pages): finalize content pages and navigation rollout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" # 변경사항이 있을 때만
```

- [ ] **Step 5: 사용자에게 push 여부 확인 후 push**

이전 대화에서 확립된 절차대로, push는 라이브 사이트에 바로 반영되는 공개 배포이므로 커밋 완료 후 사용자에게 push 진행 여부를 확인받는다(자동으로 push하지 않는다).
