# 운세 가이드 — 타로 6편 반영 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-09-21-fortune-guides-design.md` 설계에 따라, 채팅에서 이미 작성·검토를 마친 타로 가이드 6편(원고 확정본, 각 1,500~2,500자)을 `/guides/<slug>.html` 6개 + `/guides/index.html` 목록 페이지로 반영하고, 이를 지원하는 최초의 가이드 생성 파이프라인(데이터/렌더/생성 스크립트)을 구축한다. 별자리·띠·사주·궁합 가이드는 이 파이프라인을 그대로 재사용해 후속 계획에서 추가한다.

**Architecture:** 기존 `/tarot/*.html` 생성 패턴(`data/*.js` 전역+`module.exports` 가드, `scripts/lib/*.js` 렌더 모듈, `scripts/generate-*.js` 생성 스크립트)을 그대로 따른다. 다만 sitemap.xml은 지금까지 `generate-tarot-pages.js` 하나가 전담해서 써왔는데, 이번에 `generate-guides-pages.js`가 새로 생기면서 두 생성기가 각자 "전체 sitemap.xml"을 따로 쓰면 나중에 실행한 쪽이 먼저 쓴 URL들을 지워버리는 문제가 생긴다. 그래서 이 계획의 Task 1에서 sitemap 작성 책임을 `scripts/generate-sitemap.js`라는 별도 스크립트로 먼저 분리하고, 이후 두 페이지 생성기는 각자 HTML만 쓰고 sitemap.xml에는 손대지 않도록 만든다.

**Tech Stack:** 기존과 동일 — 순수 Node.js(`assert`만 사용), 프레임워크 없음, `css/style.css`의 `.legal-section` 스타일과 `css/salon.css`의 `.hub-grid` 계열 스타일 재사용.

## Global Constraints

- 참고 문서: `docs/superpowers/specs/2026-09-21-fortune-guides-design.md`(설계안), `tarot-adsense-redesign-spec.md`(사용자 관리, 가이드 12편 원본 주제 목록 출처 — 저장소 밖 문서).
- 내부 링크는 항상 **상대 경로**를 쓴다(GitHub Pages 서브경로 `nwb010118.github.io/tarot-reading/`). **예외**: canonical/OG 태그는 `SITE_BASE`(`https://nwb010118.github.io/tarot-reading/`, `scripts/lib/tarot-page-data.js`가 export하는 기존 상수) 기준 절대 URL을 쓴다 — 새로 선언하지 않고 반드시 이 상수를 그대로 import해서 쓴다.
- `/tarot/*.html`, `/guides/*.html`은 각각의 생성 스크립트로만 생성한다 — 손으로 수정하지 않는다.
- 공통 푸터는 `소개 · 문의하기 · 자주 묻는 질문 · 개인정보처리방침 · 이용약관 · 면책조항` 순서로 사이트 전체에 통일되어 있다(이번 작업으로 새로 생기는 `/guides/*.html`도 동일해야 한다).
- 공통 nav에 "운세 가이드" 링크를 추가한다. 손작성 6개 파일(`index.html`/`about.html`/`legal.html`/`404.html`/`contact.html`/`faq.html`)은 nav에 "홈" 텍스트 링크가 원래 없다(브랜드 로고가 그 역할) — 기존 순서 `타로 카드 백과사전 · About`을 `타로 카드 백과사전 · 운세 가이드 · About`으로 바꾼다. 생성되는 타로 79페이지와 새 가이드 7페이지는 nav에 "홈"이 이미 포함되어 있으므로 `홈 · 타로 카드 백과사전 · About`을 `홈 · 타로 카드 백과사전 · 운세 가이드 · About`으로 바꾼다. 이 두 패턴의 차이는 이번 작업 이전부터 있던 것으로, 이번 작업이 새로 만들거나 없애지 않는다.
- `node scripts/run-tests.js`는 항상 전부 통과해야 한다(회귀 금지). 테스트가 실제 저장소 파일(`sitemap.xml`, `data/*.js`, `tarot/*.html`, `guides/*.html`)을 조용히 오염시키는 일이 없도록, 파일을 쓰는 모든 테스트는 반드시 임시 디렉터리를 옵션으로 넘긴다 — 이 프로젝트가 이미 두 번 겪은 실수다.
- 가이드 원고 6편(`bodyHtml` 배열)은 채팅에서 이미 검토·확정된 최종본이다. 이 계획의 어떤 단계에서도 문장 내용을 바꾸지 않는다 — 오직 그대로 데이터 파일에 옮겨 담는다.
- 문장 중복 검사는 기존 공유 헬퍼 `tests/helpers/dedup.js`(순수 함수 `splitSentences`/`wordJaccard`/`trigramJaccard`)를 재사용한다. 이 파일의 `makeFullCombinedIssues`/`makeEchoIssue`는 카드·리딩 데이터의 키워드 제거 로직에 특화되어 있어 가이드처럼 자유 형식의 장문 에세이에는 그대로 쓰지 않는다 — 순수 유사도 함수만 가져다 쓴다.

---

## Task 1: sitemap 생성 책임을 `generate-tarot-pages.js`에서 분리

**Files:**
- Create: `scripts/lib/sitemap.js`
- Create: `scripts/generate-sitemap.js`
- Modify: `scripts/generate-tarot-pages.js`
- Modify: `package.json`
- Test: `tests/generate-tarot-pages.test.js` (sitemap 관련 assertion 제거)
- Test: `tests/generate-sitemap.test.js` (신규)

**Interfaces:**
- Produces: `scripts/lib/sitemap.js`가 export하는 `writeSitemapXml(urls, sitemapPath, today)` — `urls: Array<{loc: string, changefreq: string, priority: string}>`, 반환값 없음(파일에 씀).
- Produces: `scripts/generate-sitemap.js`가 export하는 `generateSitemap(options)` — `options: {sitemapPath?: string, today?: string}`. 타로 카드/가이드 데이터를 직접 읽어 합쳐진 URL 목록으로 sitemap.xml 전체를 새로 쓴다.
- Consumes: `scripts/generate-tarot-pages.js`의 `generate(options)`는 이제 `sitemapPath`/`today` 옵션을 받지 않는다(sitemap을 쓰지 않으므로) — `tarotDir`/`slugMapPath`만 받는다.

- [ ] **Step 1: `scripts/lib/sitemap.js` 작성**

```js
const fs = require('fs');

function writeSitemapXml(urls, sitemapPath, today) {
  const urlsXml = urls.map(function (u) {
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

  fs.writeFileSync(sitemapPath, xml, 'utf8');
}

module.exports = { writeSitemapXml };
```

- [ ] **Step 2: 실패하는 테스트 작성 — `tests/generate-sitemap.test.js`**

```js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateSitemap } = require('../scripts/generate-sitemap.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
const sitemapPath = path.join(tmpDir, 'sitemap.xml');

generateSitemap({ sitemapPath: sitemapPath, today: '2026-09-22' });

const sitemap = fs.readFileSync(sitemapPath, 'utf8');

assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(sitemap.includes('<loc>https://nwb010118.github.io/tarot-reading/</loc>'), 'home url must exist');
assert.ok(sitemap.includes('tarot-reading/about.html'));
assert.ok(sitemap.includes('tarot-reading/contact.html'));
assert.ok(sitemap.includes('tarot-reading/faq.html'));
assert.ok(sitemap.includes('tarot-reading/legal.html'));
assert.ok(sitemap.includes('tarot-reading/tarot/index.html'), 'tarot hub url must exist');
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'), 'sample tarot card url must exist');
assert.ok(sitemap.includes('<lastmod>2026-09-22</lastmod>'));

// 이 시점(가이드 파이프라인 구축 전)에는 84개(홈/about/contact/faq/legal/tarot허브/78카드)여야 한다.
assert.strictEqual((sitemap.match(/<url>/g) || []).length, 84, 'sitemap must contain exactly 84 <url> entries before guides exist');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-sitemap.test.js: all assertions passed');
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `node tests/generate-sitemap.test.js`
Expected: `Cannot find module '../scripts/generate-sitemap.js'`

- [ ] **Step 4: `scripts/generate-sitemap.js` 작성(가이드 데이터는 아직 없으므로 정적+타로만)**

**주의:** `data/tarot-data.js`는 모듈 최상단에서 `TAROT_MAJOR_ARCANA`/`TAROT_WANDS`/`TAROT_CUPS`/`TAROT_SWORDS`/`TAROT_PENTACLES`라는 전역 식별자를 바로 참조한다(`const TAROT_DATA = { major_arcana: TAROT_MAJOR_ARCANA, ... }`). 이 값들은 파일 자체에 정의되어 있지 않고, 호출하는 쪽이 `require()`한 뒤 `global.X = ...`로 미리 채워 넣어야 한다 — `scripts/generate-tarot-pages.js` 최상단의 `global.TAROT_MAJOR_ARCANA = require(...)` 5줄이 바로 그 역할이다. `getFullDeck()`을 쓰는 새 스크립트도 반드시 이 5줄을 그대로 먼저 실행해야 한다. 빠뜨리면 `require('../data/tarot-data.js')` 시점에 `ReferenceError: TAROT_MAJOR_ARCANA is not defined`로 즉시 죽는다.

```js
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
const { writeSitemapXml } = require('./lib/sitemap.js');

const ROOT = path.join(__dirname, '..');

function generateSitemap(options) {
  const opts = options || {};
  const sitemapPath = opts.sitemapPath || path.join(ROOT, 'sitemap.xml');
  const today = opts.today || new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });

  writeSitemapXml(staticUrls.concat(cardUrls), sitemapPath, today);
}

if (require.main === module) {
  generateSitemap();
  console.log('Generated sitemap.xml');
}

module.exports = { generateSitemap };
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `node tests/generate-sitemap.test.js`
Expected: `generate-sitemap.test.js: all assertions passed`

- [ ] **Step 6: `generate-tarot-pages.js`에서 sitemap 책임 제거**

`scripts/generate-tarot-pages.js`의 기존 전체 내용을 다음으로 교체(‑ `writeSitemap` 함수와 그 호출 제거, `sitemapPath` 옵션 제거):

```js
const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE, slugify } = require('./lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('./lib/render-tarot-pages.js');

const ROOT = path.join(__dirname, '..');
const TAROT_DIR = path.join(ROOT, 'tarot');

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

function generate(options) {
  const opts = options || {};
  const tarotDir = opts.tarotDir || TAROT_DIR;

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);

  if (!fs.existsSync(tarotDir)) fs.mkdirSync(tarotDir, { recursive: true });

  viewModels.forEach(function (vm, index) {
    const nav = buildNavFor(index, viewModels);
    const html = renderCardPage(vm, nav);
    fs.writeFileSync(path.join(tarotDir, vm.slug + '.html'), html, 'utf8');
  });

  const hubHtml = renderHubPage(viewModels, SITE_BASE + 'tarot/index.html');
  fs.writeFileSync(path.join(tarotDir, 'index.html'), hubHtml, 'utf8');

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

if (require.main === module) {
  generate();
  console.log('Generated 78 tarot card pages + 1 hub page');
}

module.exports = { generate };
```

- [ ] **Step 7: `tests/generate-tarot-pages.test.js`에서 sitemap assertion 제거**

기존 파일 전체를 다음으로 교체(`sitemapPath` 변수와 sitemap 관련 3개 assertion 제거, 나머지는 그대로):

```js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generate } = require('../scripts/generate-tarot-pages.js');

// 실제 저장소 경로를 건드리지 않도록 임시 디렉터리/파일에 생성한다.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-pages-test-'));
const tarotDir = path.join(tmpDir, 'tarot');
const slugMapPath = path.join(tmpDir, 'tarot-slugs.js');

generate({ tarotDir: tarotDir, slugMapPath: slugMapPath });

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
assert.ok(sunHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/tarot/major-19-sun.html">'));

const wandsAceHtml = fs.readFileSync(path.join(tarotDir, 'wands-ace.html'), 'utf8');
assert.ok(wandsAceHtml.includes('완드 에이스'));

// 순환 이전/다음 링크: 메이저 0번의 이전은 마지막 카드(pentacles-king)여야 함
const foolHtml = fs.readFileSync(path.join(tarotDir, 'major-0-fool.html'), 'utf8');
assert.ok(foolHtml.includes('pentacles-king.html'), 'first card (major-0) must link back to the last card as prev');

const hubHtml = fs.readFileSync(path.join(tarotDir, 'index.html'), 'utf8');
assert.ok(hubHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/tarot/index.html">'));

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

- [ ] **Step 8: `package.json` 스크립트 정리**

기존:

```json
  "scripts": {
    "test": "node scripts/run-tests.js",
    "build:tarot-pages": "node scripts/generate-tarot-pages.js"
  }
```

다음으로 교체:

```json
  "scripts": {
    "test": "node scripts/run-tests.js",
    "build:tarot-pages": "node scripts/generate-tarot-pages.js",
    "build:sitemap": "node scripts/generate-sitemap.js"
  }
```

- [ ] **Step 9: 전체 테스트 실행 + 실제 재생성**

Run: `node scripts/run-tests.js` → 13개 파일(신규 `generate-sitemap.test.js` 포함 14개) 전부 통과 확인
Run: `npm run build:tarot-pages` → 79개 파일 재생성(이제 sitemap.xml은 건드리지 않음을 확인 — `git status`로 `sitemap.xml`이 변경되지 않았는지 확인)
Run: `npm run build:sitemap` → `sitemap.xml`이 84개 URL로 재생성되는지 확인(`grep -c "<url>" sitemap.xml`)

- [ ] **Step 10: 커밋**

```bash
git add scripts/lib/sitemap.js scripts/generate-sitemap.js scripts/generate-tarot-pages.js package.json tests/generate-tarot-pages.test.js tests/generate-sitemap.test.js sitemap.xml
git commit -m "refactor(sitemap): extract sitemap generation into its own script

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `data/guides-data.js` — 타로 가이드 6편 원고 데이터

**Files:**
- Create: `data/guides-data.js`

**Interfaces:**
- Produces: `GUIDES`(`Array<{slug, category, order, title, description, bodyHtml: string[]}>`), `GUIDE_CATEGORY_LABELS`(`{[category]: string}`), `GUIDE_CATEGORY_ORDER`(`string[]`), `GUIDE_CATEGORY_INTROS`(`{[category]: string}`) — 모두 `module.exports`로 내보낸다.

- [ ] **Step 1: `data/guides-data.js` 작성**

```js
const GUIDE_CATEGORY_ORDER = ['tarot', 'zodiac', 'ddi', 'saju', 'compatibility'];

const GUIDE_CATEGORY_LABELS = {
  tarot: '타로',
  zodiac: '별자리',
  ddi: '띠운세',
  saju: '사주',
  compatibility: '궁합'
};

// 카테고리별로 최소 1편이 반영된 뒤에만 이 맵에 항목을 추가한다.
// 아직 반영되지 않은 카테고리는 목록 페이지에서 자동으로 건너뛴다(Task 4의 renderGuidesIndexPage 참고).
const GUIDE_CATEGORY_INTROS = {
  tarot: '타로는 78장의 카드를 통해 지금의 생각을 다른 각도에서 들여다보는 도구입니다. 아래 6편에서 카드 구성부터 정방향·역방향 읽는 법, 원 카드와 3장 스프레드, 질문 만드는 법까지 순서대로 살펴볼 수 있습니다.'
};

const GUIDES = [
  {
    slug: 'what-is-tarot',
    category: 'tarot',
    order: 1,
    title: '타로란 무엇인가',
    description: '타로 78장의 구성과 유래, 점술이 아닌 자기성찰 도구로 타로를 대하는 관점을 소개합니다.',
    bodyHtml: [
      '<p>타로는 78장의 그림 카드로 이루어진 도구입니다. 카드 한 장 한 장에는 각자의 상징과 이야기가 담겨 있고, 무작위로 뽑은 카드가 지금의 상황이나 질문에 어떤 각도로든 연결될 수 있다는 전제에서 출발합니다. 미래를 정확히 맞히는 예언 장치가 아니라, 낯선 그림을 매개로 자신의 생각을 다른 방향에서 들여다보게 해주는 도구에 가깝습니다. 카드를 뽑는 행위 자체보다, 그 카드를 보고 무슨 생각이 떠오르는지가 더 중요하다고 이야기되는 것도 이런 이유입니다.</p>',
      '<p>타로 한 벌은 크게 두 그룹으로 나뉩니다. 바보, 마법사, 별, 세계처럼 하나하나 고유한 이름과 이야기를 가진 22장의 메이저 아르카나, 그리고 완드·컵·소드·펜타클 네 개 수트로 나뉘어 각각 에이스부터 킹까지 14장씩 이어지는 56장의 마이너 아르카나입니다. 메이저 아르카나는 인생의 큰 전환점이나 굵직한 주제를 다루는 경우가 많고, 마이너 아르카나는 하루하루의 감정이나 관계, 일상적인 선택처럼 좀 더 구체적인 장면을 그리는 경우가 많다고 이야기됩니다.</p>',
      '<p>마이너 아르카나의 네 수트는 각자 조금씩 다른 영역을 가리킨다고 알려져 있습니다. 완드는 열정이나 행동, 새로 시작하는 일과 관련이 깊고, 컵은 감정과 관계, 마음이 오가는 상황을 주로 그립니다. 소드는 생각과 갈등, 결정을 내려야 하는 순간을, 펜타클은 돈이나 일, 눈에 보이는 현실적인 결과를 다루는 경우가 많습니다. 이 구분을 외울 필요는 없지만, 어떤 카드가 나왔을 때 "이건 감정 쪽 이야기일까, 현실적인 이야기일까"를 가늠하는 정도로만 참고해도 충분합니다. 이 사이트의 카드 백과사전에서 78장 전체의 정방향·역방향 의미를 하나씩 찾아볼 수 있습니다.</p>',
      '<p>타로가 처음부터 점술 도구였던 것은 아닙니다. 전통적으로 15세기 이탈리아에서 귀족들이 즐기던 카드 게임에서 비롯되었다고 알려져 있고, 지금 우리가 아는 것과 같은 신비주의적·점술적 해석이 널리 퍼진 것은 그보다 한참 뒤인 18~19세기 유럽에서였다고 전해집니다. 어느 문화권에서 정확히 언제 무슨 목적으로 시작됐는지에 대해서는 여러 설이 엇갈리기 때문에, 이 글에서도 이것이 정답이다라고 단정하기보다는 널리 알려진 큰 흐름만 소개합니다. 중요한 것은 타로가 오랜 시간에 걸쳐 게임에서 상징 체계로, 다시 자기 성찰의 도구로 쓰임이 바뀌어 왔다는 점입니다. 지금 이 순간에도 타로를 대하는 방식은 사람마다, 문화마다 조금씩 다릅니다.</p>',
      '<p>이 사이트에서 타로를 다루는 방식도 이런 관점에 가깝습니다. 나는 취업에 성공할까처럼 예/아니오로 답을 정해버리는 질문보다는, 지금 이직을 준비하면서 내가 놓치고 있는 부분은 무엇일까처럼 스스로 생각할 여지를 남기는 질문에 타로가 더 잘 어울립니다. 예를 들어 마음이 복잡한 상태에서 검(소드) 계열 카드가 나왔다면, 그 카드가 미래를 결정짓는다고 받아들이기보다 지금 내 생각이 너무 날카로운 판단 쪽으로 쏠려 있진 않은가를 한 번 점검해보는 계기로 삼아볼 수 있습니다. 반대로 관계에 대한 고민 중에 컵 계열 카드가 나왔다면, 지금 내가 상대방의 감정보다 내 감정에만 집중하고 있진 않은지 돌아보는 식으로 읽어볼 수도 있습니다. 카드가 어떤 답을 정해주는 것이 아니라, 평소라면 지나쳤을 질문을 붙잡고 잠시 머무르게 해주는 셈입니다.</p>',
      '<p>타로를 처음 접한다면 카드의 의미를 전부 외우려 하기보다, 지금 마음에 걸리는 질문 하나를 먼저 떠올려보세요. 거창한 질문이 아니어도 괜찮습니다. "오늘 하루를 어떤 태도로 보내면 좋을까" 정도의 가벼운 질문으로 시작해도 충분합니다. 그 다음 이 사이트의 오늘의 카드나 3장 스프레드로 카드를 뽑아, 나온 카드의 의미를 그 질문에 비추어 읽어보세요. 처음 몇 번은 의미가 잘 와닿지 않을 수 있지만, 몇 차례 반복하다 보면 어떤 카드가 자신에게 유독 자주 말을 거는지 자연스럽게 알게 되는 경우가 많습니다.</p>',
      '<p>타로에 조금 더 익숙해지고 싶다면, 정방향과 역방향을 어떻게 구분해서 읽으면 좋을지, 원 카드 리딩은 어떤 순간에 특히 도움이 되는지를 다룬 다른 가이드 글도 함께 읽어보시길 권합니다. 카드를 뽑는 방법 자체는 단순하지만, 그 카드를 자신의 상황에 맞게 해석하는 감각은 여러 번 시도해볼수록 조금씩 자연스러워집니다.</p>'
    ]
  },
  {
    slug: 'major-and-minor-arcana',
    category: 'tarot',
    order: 2,
    title: '메이저·마이너 아르카나 차이',
    description: '메이저 아르카나 22장과 마이너 아르카나 56장이 실제 리딩에서 어떻게 다르게 읽히는지 예시와 함께 설명합니다.',
    bodyHtml: [
      '<p>타로 78장은 메이저 아르카나 22장과 마이너 아르카나 56장으로 나뉜다고 앞선 글에서 간단히 짚었습니다. 이번 글에서는 이 둘이 실제 리딩에서 어떻게 다르게 읽히는지, 조금 더 실전적인 관점에서 살펴보겠습니다.</p>',
      '<p>메이저 아르카나 22장은 바보에서 시작해 세계로 끝나는 하나의 흐름으로 설명되곤 합니다. 이를 흔히 "바보의 여정"이라고 부르는데, 순진한 상태로 세상에 나선 인물이 마법사, 여사제, 황제 같은 존재들을 거치며 시련과 배움을 쌓다가 결국 완성에 이른다는 이야기 구조로 읽는 방식입니다. 실제로 이 여정이 정확히 어떤 순서와 의미로 만들어졌는지는 문헌마다 조금씩 다르게 설명되지만, 메이저 아르카나 각 장이 삶에서 한 번쯤 마주치는 굵직한 전환점을 상징한다는 점에는 대체로 의견이 모입니다. 죽음 카드가 나왔다고 실제 죽음을 뜻하는 것이 아니라 한 단계가 끝나고 다른 단계가 시작되는 변화를 가리킨다고 읽히고, 탑 카드는 갑작스러운 붕괴나 예상 못한 사건을, 태양 카드는 회복과 명료함을 가리킨다고 흔히 설명됩니다. 그래서 스프레드에 메이저 아르카나가 여러 장 나오면, 지금 다루는 주제가 일시적인 기분보다는 삶의 방향과 관련된 무게 있는 질문일 가능성이 높다고 보는 경우가 많습니다.</p>',
      '<p>마이너 아르카나 56장은 완드·컵·소드·펜타클 네 수트로 나뉘고, 각 수트마다 숫자 카드 에이스부터 10까지 열 장, 그리고 페이지·나이트·퀸·킹의 코트 카드 네 장씩 총 열네 장으로 구성됩니다. 숫자 카드의 흐름에는 어느 정도 공통된 패턴이 있다고 알려져 있는데, 에이스는 그 수트가 상징하는 영역에서 새로운 기운이나 가능성이 막 시작되는 시점을, 10은 그 흐름이 한 차례 매듭지어지거나 포화 상태에 이른 시점을 가리키는 경우가 많습니다. 예를 들어 완드 에이스가 새로운 열정이 막 피어나는 순간을 그린다면, 완드 10은 그 열정을 좇다가 짐이 너무 많아진 상태를 그리는 식입니다. 코트 카드는 특정 성향이나 태도를 가진 사람, 혹은 자기 안의 그런 면모를 가리킨다고 읽히는 경우가 많아서, 실제 주변 인물을 떠올리며 해석하기도 합니다. 네 수트는 전통적으로 자연의 네 요소와 짝지어 설명되기도 하는데, 완드는 불, 컵은 물, 소드는 바람, 펜타클은 흙에 대응한다고 알려져 있습니다. 다만 이런 대응 관계 역시 문헌이나 유파마다 조금씩 다르게 정리되어 있어서, 참고할 수 있는 여러 관점 중 하나 정도로 받아들이는 편이 자연스럽습니다.</p>',
      '<p>그래서 메이저와 마이너 중 어느 쪽이 많이 나왔는지는 리딩을 읽는 데 유용한 힌트가 됩니다. 예를 들어 "이번 달 인간관계는 어떨까"라는 질문으로 3장을 뽑았는데 셋 다 마이너 아르카나, 그중에서도 컵 계열이라면, 큰 사건보다는 일상적인 감정 교류에 좀 더 신경 쓸 만한 시기라고 가볍게 읽어볼 수 있습니다. 반대로 같은 질문에 메이저 아르카나가 두 장 이상 섞여 나온다면, 지금의 관계가 단순히 스쳐가는 감정이 아니라 한 번쯤 진지하게 짚고 넘어갈 시점일 수 있다는 정도로 참고해볼 수 있습니다. 물론 이것도 하나의 참고 기준일 뿐, 카드 몇 장의 조합만으로 상황을 단정 지을 필요는 없습니다.</p>',
      '<p>조금 다른 예로, "이직을 준비하는 지금 무엇을 챙겨야 할까"라는 질문에 펜타클 카드와 메이저 아르카나의 별 카드가 함께 나왔다고 해봅시다. 펜타클은 현실적인 조건이나 실질적인 준비를, 별 카드는 회복이나 희망적인 전망을 가리킨다고 흔히 설명되니, 이 조합은 "지금 당장의 서류나 조건을 꼼꼼히 챙기면서도, 결과를 너무 조급하게 걱정하지 않아도 괜찮다"는 방향으로 풀어볼 수 있습니다. 이렇게 메이저 한 장과 마이너 한 장을 나란히 놓고 서로 다른 결의 이야기를 이어 붙여 보는 것이, 두 그룹의 차이를 실제 리딩에 활용하는 가장 기본적인 방법입니다.</p>',
      '<p>메이저와 마이너의 차이를 이해했다면, 이제 카드가 정방향으로 나왔는지 역방향으로 나왔는지에 따라 같은 카드를 어떻게 다르게 읽을 수 있는지 살펴보는 것도 도움이 됩니다. 두 가지 구분을 함께 쓸 줄 알게 되면, 카드 한 장을 읽을 때 참고할 수 있는 관점이 한층 다양해집니다. 이어지는 가이드에서 정방향과 역방향을 구분해서 읽는 법을 다루니 함께 참고해보세요.</p>'
    ]
  },
  {
    slug: 'upright-and-reversed',
    category: 'tarot',
    order: 3,
    title: '정방향과 역방향 읽는 법',
    description: '타로 카드의 정방향·역방향을 나쁨/좋음이 아니라 같은 기운의 다른 방향으로 읽는 관점을 예시와 함께 설명합니다.',
    bodyHtml: [
      '<p>타로 카드를 뽑다 보면 그림이 똑바로 나오기도 하고, 거꾸로 뒤집혀 나오기도 합니다. 똑바로 나온 상태를 정방향, 거꾸로 뒤집혀 나온 상태를 역방향이라고 부릅니다. 같은 카드라도 정방향이냐 역방향이냐에 따라 의미를 다르게 읽는 방식이 널리 쓰이고 있어서, 이 사이트의 리딩 결과에도 두 가지를 구분해서 보여드리고 있습니다.</p>',
      '<p>문제는 역방향을 접했을 때 "안 좋은 카드가 나왔다"라고 단순하게 받아들이는 경우가 많다는 점입니다. 하지만 역방향은 정방향의 반대말이라기보다, 같은 주제를 다른 각도에서 바라보는 방식에 가깝습니다. 흔히 쓰이는 해석 방식 몇 가지를 소개하면, 카드가 상징하는 에너지가 겉으로 드러나지 않고 안으로 향해 있다고 보거나, 그 흐름이 아직 충분히 무르익지 않아 지연되고 있다고 보거나, 반대로 그 에너지가 과하게 쌓여 있다고 보는 관점 등이 있습니다. 어떤 관점을 택하든 공통점은 "이 카드가 나쁘다"가 아니라 "이 카드의 기운이 지금 어떤 모양으로 움직이고 있는가"를 살피는 데 있습니다.</p>',
      '<p>예를 들어 전차 카드는 정방향일 때 방향을 정하고 앞으로 밀고 나가는 추진력을 가리킨다고 흔히 설명됩니다. 이 카드가 역방향으로 나왔다면, 그 추진력 자체가 사라졌다기보다 방향을 아직 정하지 못했거나 서로 다른 방향으로 끌어당기는 힘들 사이에서 균형을 잡지 못하고 있는 상태로 읽어볼 수 있습니다. "당장 밀어붙이기보다, 지금 여러 갈래로 흩어진 생각을 먼저 한데 모아보는 편이 낫겠다"는 식으로 참고할 수 있는 것입니다. 또 다른 예로 컵 2 카드는 정방향일 때 두 사람 사이의 조화롭고 균형 잡힌 관계를 가리킨다고 설명됩니다. 이 카드가 역방향으로 나왔다면 관계가 완전히 끝났다는 뜻이 아니라, 지금 두 사람 사이의 균형이 한쪽으로 살짝 기울어 있거나 마음을 표현하는 방식이 서로 어긋나 있는 상태로 읽어볼 수 있습니다. 관계를 포기해야 한다는 신호가 아니라, 대화 방식을 한 번 점검해볼 시점이라는 관점으로 받아들일 수 있는 것입니다.</p>',
      '<p>이렇게 보면 역방향은 오히려 더 섬세하게 상황을 들여다볼 기회를 주기도 합니다. 정방향 카드가 "지금 이런 흐름이 있다"를 보여준다면, 역방향 카드는 "그 흐름이 지금 어디에서 막혀 있거나 비틀려 있는가"를 짚어주는 역할에 가깝습니다. 그래서 역방향 카드가 나왔을 때는 낙담하기보다, "이 카드가 원래 가리키는 기운이 지금 내 상황에서는 어떤 식으로 방해받고 있을까"를 스스로에게 물어보는 편이 훨씬 도움이 됩니다.</p>',
      '<p>3장 스프레드처럼 여러 장을 함께 뽑는 경우라면, 역방향 카드가 유독 여러 장 몰려 나왔는지도 참고할 만한 지점입니다. 세 장 중 두세 장이 모두 역방향이라면, 지금 상황 전반에서 여러 가지 흐름이 겉으로 잘 드러나지 않고 안에서만 맴돌고 있을 가능성으로 가볍게 읽어볼 수 있습니다. 반대로 정방향이 많다면 지금 벌어지고 있는 일들이 비교적 겉으로 뚜렷하게 드러나 있는 상태라고 참고할 수 있습니다.</p>',
      '<p>물론 역방향 해석을 아예 쓰지 않고, 정방향 의미만으로 카드를 읽는 방식을 선호하는 사람들도 있습니다. 어느 쪽이 맞고 틀리다기보다 취향과 익숙함의 문제에 가까우니, 처음에는 이 사이트에서 제공하는 정방향·역방향 구분을 참고 삼아 읽어보다가, 스스로에게 더 잘 맞는 방식을 찾아가시면 됩니다.</p>',
      '<p>실제로 오늘의 카드를 뽑았는데 역방향으로 나왔다면, 결과 화면에 함께 나오는 "이 카드 자세히 보기" 링크를 눌러 그 카드의 정방향 의미까지 나란히 읽어보는 것도 좋은 방법입니다. 정방향 의미를 먼저 이해한 다음 "지금 내 상황에서는 이 기운이 어느 지점에서 막혀 있을까"를 생각해보면, 역방향을 단순히 "안 좋은 결과"로 넘겨버리지 않고 조금 더 구체적으로 소화할 수 있습니다. 예를 들어 완드 3 카드가 역방향으로 나왔다면, 정방향에서 가리키는 "계획한 일이 순조롭게 뻗어나가는 흐름"을 먼저 떠올린 뒤, 지금 내 계획 중 어느 부분이 예상보다 더디게 진행되고 있는지를 짚어보는 식으로 이어갈 수 있습니다. 다음 가이드에서는 이렇게 익힌 정방향·역방향 감각을 실제로 카드 한 장을 뽑는 원 카드 리딩에 어떻게 활용하면 좋을지 다룹니다.</p>'
    ]
  },
  {
    slug: 'one-card-reading',
    category: 'tarot',
    order: 4,
    title: '원 카드 리딩 활용법',
    description: '카드 한 장으로 하루를 점검하는 원 카드 리딩의 활용 시점, 질문 만들기, 기록 습관을 안내합니다.',
    bodyHtml: [
      '<p>원 카드 리딩은 말 그대로, 여러 장이 아니라 카드 한 장만 뽑아서 읽는 가장 단순한 방식입니다. 여러 장을 배열해서 서로의 관계를 살피는 스프레드보다 훨씬 간단해서, 매일 아침 하루를 시작하기 전이나 짧게 마음을 정리하고 싶을 때 부담 없이 활용하기 좋습니다. 이 사이트의 "오늘의 카드"도 바로 이 원 카드 리딩 방식으로 만들어져 있습니다.</p>',
      '<p>카드를 뽑기 전에 가장 먼저 할 일은 질문을 정하는 것입니다. 원 카드 리딩은 한 장으로 답해야 하기 때문에, 너무 크고 복잡한 질문보다는 오늘 하루나 지금 이 순간에 한정된 좁은 질문이 더 잘 어울립니다. "이번 생애 전체가 어떻게 흘러갈까" 같은 질문보다는 "오늘 하루를 어떤 마음가짐으로 보내면 좋을까", "지금 미뤄두고 있는 이 일을 어떻게 대하면 좋을까"처럼 지금 시점에 걸려 있는 구체적인 질문을 떠올려보세요. 질문이 명확할수록 카드 한 장에서도 훨씬 더 구체적인 힌트를 끌어낼 수 있습니다. 예를 들어 "나는 성공할까"보다는 "지금 준비하고 있는 발표에서 내가 놓치기 쉬운 부분은 무엇일까"가, "그 사람은 나를 좋아할까"보다는 "이 관계에서 내가 먼저 표현하지 못하고 있는 마음은 무엇일까"가 훨씬 다루기 좋은 질문입니다. 질문의 범위를 오늘, 이번 대화, 이번 결정처럼 눈에 보이는 단위로 좁힐수록 카드의 키워드와 조언이 훨씬 더 손에 잡히게 다가옵니다.</p>',
      '<p>아침 시간 외에도 원 카드 리딩을 활용하기 좋은 순간들이 있습니다. 중요한 미팅이나 대화를 앞두고 있을 때, 며칠째 같은 고민을 붙잡고 있을 때, 혹은 하루를 마무리하며 오늘을 돌아보고 싶을 때도 한 장이면 충분합니다. 굳이 매일 아침으로 시간을 정해두지 않아도, 마음이 복잡해지는 순간마다 짧게 카드 한 장을 뽑아 스스로에게 질문을 던지는 습관만으로도 도움이 됩니다.</p>',
      '<p>질문을 정했다면 잠깐 그 질문을 머릿속으로 되뇌면서 카드를 뽑아보세요. 특별한 의식이 필요한 것은 아니고, 질문을 흐릿하게 둔 채로 뽑기보다 한 번이라도 또렷하게 떠올리고 뽑는 것만으로도 카드를 해석할 때 훨씬 수월해집니다. 카드가 나오면 정방향인지 역방향인지, 그리고 그 카드가 주는 첫인상이 무엇인지를 먼저 살펴본 다음, 카드 설명에 나온 키워드와 조언을 오늘의 질문에 하나씩 대입해보며 읽어나가면 됩니다. 키워드 하나하나가 질문과 정확히 맞아떨어지지 않아도 괜찮습니다. 여러 키워드 중에서 지금 상황에 가장 마음에 걸리는 단어 하나를 골라, 그 단어를 오늘 하루 동안 어떻게 실천해볼 수 있을지 생각해보는 정도로도 충분히 의미가 있습니다.</p>',
      '<p>원 카드 리딩을 꾸준히 활용하고 싶다면, 뽑은 카드를 간단하게라도 기록해두는 습관을 추천합니다. 거창한 일기일 필요는 없고, 날짜와 카드 이름, 그날 떠올렸던 질문, 그리고 하루가 끝난 뒤 실제로 어떤 일이 있었는지를 한두 줄로 적어두는 정도면 충분합니다. 이렇게 몇 주만 쌓아두어도 "이 카드가 나온 날은 유독 이런 일이 자주 있었네" 하는 식으로 스스로만의 패턴을 발견하게 되는 경우가 많습니다. 예를 들어 소드 계열 카드가 나온 날마다 유독 사람들과 의견 충돌이 있었다는 걸 기록을 통해 알아차렸다면, 다음에 같은 카드가 나왔을 때는 그 사실을 미리 염두에 두고 하루를 조금 더 신중하게 보낼 수 있습니다. 반대로 컵이나 별처럼 마음이 편안해지는 카드가 나온 날의 기록을 다시 읽어보면, 그날 자신을 편안하게 만들어준 것이 무엇이었는지를 되짚어보는 계기가 되기도 합니다. 기록은 길게 쓸 필요가 없고, 카드 이름과 질문, 그날의 한 줄 요약 정도만으로도 몇 달 뒤에 다시 읽었을 때 충분히 의미 있는 자료가 됩니다.</p>',
      '<p>같은 질문으로 마음에 들지 않는 카드가 나왔다고 해서 곧바로 다시 뽑기보다는, 처음 나온 카드를 있는 그대로 받아들이고 그 안에서 배울 점을 찾아보는 편을 권합니다. 원하는 카드가 나올 때까지 반복해서 뽑으면, 결국 스스로가 듣고 싶은 말만 골라 듣게 되어 카드가 주는 새로운 관점을 놓치기 쉽습니다. 한 장으로 읽는 감각이 어느 정도 손에 익었다면, 이제 카드를 여러 장 늘어놓고 읽는 3장 스프레드로 넘어가볼 차례입니다. 다음 가이드에서 자세히 다룹니다.</p>'
    ]
  },
  {
    slug: 'three-card-spread',
    category: 'tarot',
    order: 5,
    title: '3장 스프레드 읽는 법',
    description: '과거·현재·미래, 상황·장애물·조언 두 가지 3장 배열의 의미와 읽는 순서를 예시와 함께 설명합니다.',
    bodyHtml: [
      '<p>원 카드 리딩이 지금 이 순간에 대한 짧은 메시지를 준다면, 3장 스프레드는 카드 세 장을 나란히 놓고 그 사이의 흐름을 함께 살펴보는 방식입니다. 카드 한 장만으로는 보기 어려운 앞뒤 맥락이나 관계까지 함께 들여다볼 수 있어서, 지금 겪고 있는 상황을 조금 더 입체적으로 이해하고 싶을 때 잘 어울립니다.</p>',
      '<p>가장 널리 쓰이는 배열은 과거·현재·미래입니다. 첫 번째 카드는 지금 상황을 만든 배경이나 이미 지나온 흐름을, 두 번째 카드는 지금 당장의 상태를, 세 번째 카드는 지금 이대로 흘러갈 경우 다가올 방향을 가리킨다고 읽습니다. 다만 여기서 미래는 정해진 결말이 아니라 "지금 이 흐름대로라면 이렇게 이어질 가능성이 있다"는 하나의 참고 지점으로 받아들이는 편이 좋습니다. 예를 들어 "요즘 이어지고 있는 친구와의 갈등을 어떻게 풀어가면 좋을까"라는 질문에 과거 자리에 소드 카드가, 현재 자리에 은둔자 카드가, 미래 자리에 태양 카드가 나왔다고 해봅시다. 이 경우 과거의 날카로운 언쟁이 지금은 서로 거리를 두고 생각을 정리하는 시기로 이어졌고, 이대로 시간을 두면 관계가 다시 밝아질 가능성이 있다는 흐름으로 읽어볼 수 있습니다.</p>',
      '<p>또 하나 자주 쓰이는 배열은 상황·장애물·조언입니다. 첫 번째 카드는 지금 벌어지고 있는 상황 자체를, 두 번째 카드는 그 상황에서 발목을 잡고 있는 장애물이나 마음속 걸림돌을, 세 번째 카드는 그것을 다루기 위한 조언을 가리킵니다. 시간의 흐름보다 지금 이 순간의 구조를 파악하는 데 더 초점이 맞춰진 배열이라, "지금 이 일이 왜 이렇게 막혀 있는지 모르겠다"처럼 원인을 잘 모르겠는 고민에 특히 도움이 됩니다. 예를 들어 이직 준비가 자꾸 미뤄지는 상황에서 상황 자리에 펜타클 카드, 장애물 자리에 컵 카드, 조언 자리에 별 카드가 나왔다면, 현실적인 조건은 어느 정도 갖춰져 있는데 마음 한켠의 불안이나 망설임이 실제로 발목을 잡고 있고, 그 불안을 인정하고 조금 더 편안하게 나아가라는 조언으로 이어서 읽어볼 수 있습니다.</p>',
      '<p>두 배열 중 어느 쪽을 고를지 고민된다면, 지금 궁금한 것이 "왜 이렇게 됐고 앞으로 어떻게 될까"에 가깝다면 과거·현재·미래를, "지금 이 상황을 어떻게 풀어야 할까"에 가깝다면 상황·장애물·조언을 고르는 편이 자연스럽습니다. 두 배열 모두 자리마다 정해진 역할이 있다는 점은 같지만, 하나는 시간의 흐름을 따라가고 다른 하나는 지금 이 순간의 구조를 파고든다는 차이가 있습니다. 이 사이트의 3장 스프레드 결과 화면도 뽑힌 순서 그대로 세 장을 나란히 보여주기 때문에, 어떤 배열로 읽을지 미리 정하고 뽑는 편이 결과를 이해하기 훨씬 수월합니다.</p>',
      '<p>세 장을 읽을 때는 먼저 카드 하나하나를 각자의 자리 의미에 맞춰 따로따로 읽어보고, 그다음에 세 장을 하나의 이야기로 이어 붙이는 순서를 추천합니다. 각 카드를 따로 읽을 때는 정방향·역방향과 키워드를 먼저 확인하고, 그 카드가 해당 자리(과거·현재·미래, 혹은 상황·장애물·조언)에서 어떤 의미로 연결되는지를 한 문장으로 정리해보세요. 세 문장이 만들어지면 마지막으로 그 세 문장을 순서대로 이어 읽으면서 하나의 흐름으로 정리합니다. 세 카드가 서로 어울리지 않는 것처럼 느껴질 때도 있는데, 그럴 때는 억지로 짜맞추기보다 "이 세 가지 다른 결이 지금 내 상황 안에 실제로 공존하고 있구나" 정도로 받아들여도 충분합니다.</p>',
      '<p>예를 들어 상황·장애물·조언 배열에서 상황 자리에는 희망적인 카드가, 장애물 자리에는 무겁게 느껴지는 카드가 나왔다면, 겉으로는 괜찮아 보이는 상황 안에 아직 해결되지 않은 걱정이 숨어 있다는 뜻으로 읽어볼 수 있습니다. 이렇게 서로 다른 결의 카드가 한 스프레드 안에 함께 나오는 것은 오히려 자연스러운 일입니다. 실제 상황도 좋은 면과 불편한 면이 동시에 존재하는 경우가 많으니, 세 장이 하나의 단순한 결론으로 딱 떨어지지 않는다고 해서 리딩이 잘못됐다고 여길 필요는 없습니다.</p>',
      '<p>3장 스프레드는 배열의 의미만 알면 어렵지 않게 시작할 수 있지만, 결국 좋은 결과를 얻으려면 애초에 어떤 질문을 들고 카드를 뽑느냐가 더 중요합니다. 다음 가이드에서는 타로에 어울리는 질문을 만드는 방법을 좀 더 구체적으로 다룹니다.</p>'
    ]
  },
  {
    slug: 'how-to-ask-tarot',
    category: 'tarot',
    order: 6,
    title: '타로 질문 잘 만드는 법',
    description: '예/아니오 질문의 한계와 더 나은 질문으로 바꾸는 실전 팁을 비교 표와 함께 설명합니다.',
    bodyHtml: [
      '<p>타로 리딩의 질을 결정짓는 건 사실 카드보다 질문입니다. 아무리 카드 해석에 익숙해져도, 애초에 질문이 애매하거나 카드로 답하기 어려운 형태라면 결과도 흐릿해질 수밖에 없습니다. 반대로 질문을 다듬는 데 몇 분만 더 들여도, 뽑힌 카드를 대하는 태도 자체가 크게 달라집니다. 이번 가이드에서는 이 사이트의 도구 화면에서 오늘의 카드나 3장 스프레드를 뽑기 전, 질문을 어떻게 다듬으면 좋을지 구체적인 예시와 함께 살펴봅니다.</p>',
      '<p>가장 먼저 피해야 할 것은 예/아니오로만 답할 수 있는 질문입니다. "그 사람이 나를 좋아할까", "이 시험에 합격할까"처럼 결과를 딱 잘라 확인하려는 질문은 타로와 잘 맞지 않습니다. 카드 한 장이나 세 장으로 다른 사람의 마음이나 정해진 결과를 단정할 수는 없을뿐더러, 이런 질문은 카드가 무슨 그림으로 나오든 "맞다" 또는 "아니다" 둘 중 하나로 억지로 끼워 맞추게 되기 쉽습니다. 그 결과 카드가 원래 담고 있는 섬세한 뉘앙스는 사라지고, 뽑는 사람이 듣고 싶은 답만 골라 듣는 확증 편향으로 이어지기 쉽습니다.</p>',
      '<p>아래는 같은 고민을 예/아니오 질문과 열린 질문으로 각각 바꿔본 예시입니다.</p>',
      '<table><thead><tr><th>피해야 할 질문</th><th>더 나은 질문</th></tr></thead><tbody><tr><td>우리 결혼할 수 있을까?</td><td>결혼을 앞두고 지금 우리 관계에서 더 이야기해봐야 할 부분은 무엇일까?</td></tr><tr><td>이번 자격증 시험, 합격할까?</td><td>시험 준비 과정에서 지금 내가 보완해야 할 부분은 무엇일까?</td></tr><tr><td>우리는 재결합할까?</td><td>이 관계를 다시 이어가려면 어떤 태도가 필요할까?</td></tr><tr><td>새로 시작하는 이 사업, 잘 될까?</td><td>사업을 시작하기 전에 미리 점검해두면 좋을 위험 요소는 무엇일까?</td></tr></tbody></table>',
      '<p>위 표에서 볼 수 있듯이, 더 나은 질문들은 공통적으로 "나"를 주어로 두고, 결과를 확인하기보다 지금 할 수 있는 선택이나 태도를 묻고 있습니다. 다른 사람의 마음이나 외부 사건의 결과는 애초에 내가 통제할 수 없는 영역이지만, 내가 어떤 태도로 그 상황에 다가가고 무엇을 준비할지는 스스로 선택할 수 있는 영역입니다. 타로는 바로 이 선택의 영역에서 가장 힘을 발휘합니다.</p>',
      '<p>질문을 다듬는 몇 가지 실전 팁을 정리하면 다음과 같습니다. 첫째, 질문의 주어를 상대방이 아니라 나로 바꿔봅니다. "그 사람은 어떤 마음일까"보다 "나는 이 관계에서 무엇을 원하는가"가 훨씬 다루기 좋습니다. 둘째, 질문의 시간 범위를 좁힙니다. "인생이 어떻게 풀릴까" 같은 막연한 질문보다 "이번 주", "이번 결정", "오늘 하루"처럼 눈에 보이는 단위로 좁혀보세요. 셋째, 결과보다 과정을 묻습니다. "성공할까"가 아니라 "성공하기 위해 지금 무엇을 준비하면 좋을까"로 바꾸면 카드의 조언을 훨씬 구체적으로 활용할 수 있습니다. 넷째, 질문 하나에 여러 궁금증을 한꺼번에 담지 않습니다. "이직도 잘 되고 연애도 잘 풀릴까"처럼 서로 다른 주제를 한 질문에 욱여넣으면 카드 한 장이 어느 쪽 이야기를 하는 건지 구분하기 어려워집니다. 궁금한 주제가 여러 개라면 하나씩 나눠서 각각 카드를 뽑는 편이 훨씬 명확합니다.</p>',
      '<p>질문을 다듬는 과정을 실제로 따라가보면 이렇습니다. 처음 떠오른 질문이 "이 프로젝트, 잘 될까"였다면, 먼저 예/아니오 질문이라는 점을 알아차리고 "나"를 주어로 바꿔 "나는 이 프로젝트에서 무엇을 기대하고 있을까"로 고쳐봅니다. 그다음 범위가 아직 넓다고 느껴지면 "이번 주 회의에서 내가 준비해야 할 태도는 무엇일까"처럼 시간과 상황을 구체적으로 좁힙니다. 이렇게 두세 단계만 거쳐도 처음 질문보다 훨씬 다루기 쉬운 질문이 만들어집니다.</p>',
      '<p>이 여섯 편의 가이드로 카드 구성부터 정방향·역방향, 원 카드와 3장 스프레드, 그리고 질문 만드는 법까지 타로의 기본기를 한 바퀴 살펴보았습니다. 처음부터 완벽한 질문을 떠올리려 애쓰지 않아도 괜찮습니다. 일단 떠오르는 대로 질문을 적어보고, 이 가이드에서 소개한 몇 가지 기준으로 한 번씩 다듬어보는 것만으로도 충분합니다. 이제 카드 백과사전을 오가며 궁금한 카드를 하나씩 찾아보거나, 오늘의 카드와 3장 스프레드로 직접 질문을 던져보면서 자신만의 리딩 감각을 조금씩 쌓아가시길 바랍니다.</p>'
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GUIDES, GUIDE_CATEGORY_LABELS, GUIDE_CATEGORY_ORDER, GUIDE_CATEGORY_INTROS };
}
```

- [ ] **Step 2: 커밋**

```bash
git add data/guides-data.js
git commit -m "content(guides): add tarot guide manuscripts (6 articles)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `scripts/lib/render-guides-pages.js` — 가이드 페이지 렌더링

**Files:**
- Create: `scripts/lib/render-guides-pages.js`
- Test: `tests/render-guides-pages.test.js`

**Interfaces:**
- Consumes: `data/guides-data.js`의 `GUIDES`/`GUIDE_CATEGORY_LABELS`/`GUIDE_CATEGORY_ORDER`/`GUIDE_CATEGORY_INTROS`, `scripts/lib/tarot-page-data.js`의 `SITE_BASE`.
- Produces: `renderGuidePage(guide, categoryGuides)` → `string`(guide.description은 이미 escapeHtml 이전 원문, 함수 내부에서 escape), `renderGuidesIndexPage(allGuides)` → `string`, `GUIDES_DIR_LINKS`(객체), `escapeHtml(str)`.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/render-guides-pages.test.js`**

```js
const assert = require('assert');
const { GUIDES } = require('../data/guides-data.js');
const { renderGuidePage, renderGuidesIndexPage, escapeHtml } = require('../scripts/lib/render-guides-pages.js');

// what-is-tarot 카드 페이지 검증
const guide = GUIDES.find(function (g) { return g.slug === 'what-is-tarot'; });
const categoryGuides = GUIDES.filter(function (g) { return g.category === guide.category; });
const html = renderGuidePage(guide, categoryGuides);

assert.ok(html.startsWith('<!DOCTYPE html>'));
assert.ok(html.includes('<html lang="ko">'));
assert.ok(html.includes('<title>' + guide.title + ' | 운세 가이드 | 점집</title>'), 'title must include guide title');
const canonicalUrl = 'https://nwb010118.github.io/tarot-reading/guides/what-is-tarot.html';
assert.ok(html.includes('<link rel="canonical" href="' + canonicalUrl + '">'));
assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(guide.title + ' | 운세 가이드 | 점집') + '">'));
assert.ok(html.includes('<meta property="og:description" content="' + escapeHtml(guide.description) + '">'));
assert.ok(html.includes('<meta property="og:url" content="' + canonicalUrl + '">'));
// 본문은 신뢰된 원고이므로 escape 없이 그대로 포함되어야 한다.
assert.ok(html.includes(guide.bodyHtml[0]), 'first body paragraph must appear verbatim');
// 브레드크럼
assert.ok(html.includes('운세 가이드'));
assert.ok(html.includes(guide.title));
// 같은 카테고리 다른 가이드로의 링크(자기 자신 제외)
assert.ok(html.includes('major-and-minor-arcana.html'), 'must link to a sibling guide in the same category');
assert.ok(!html.includes('href="what-is-tarot.html"'), 'must not link to itself in the sibling list');
// 도구 링크: 타로 카테고리는 타로 허브로
assert.ok(html.includes('../tarot/index.html'), 'tarot-category guide must link back to the tarot hub');
// nav에 4개 항목 모두 포함
assert.ok(html.includes('>홈<'));
assert.ok(html.includes('>타로 카드 백과사전<'));
assert.ok(html.includes('>운세 가이드<'));
assert.ok(html.includes('>About<'));
// 푸터 6링크
assert.ok(html.includes('href="../contact.html">문의하기'));
assert.ok(html.includes('href="../faq.html">자주 묻는 질문'));

// 목록 페이지 검증
const indexHtml = renderGuidesIndexPage(GUIDES);
assert.ok(indexHtml.startsWith('<!DOCTYPE html>'));
const indexCanonical = 'https://nwb010118.github.io/tarot-reading/guides/index.html';
assert.ok(indexHtml.includes('<link rel="canonical" href="' + indexCanonical + '">'));
assert.ok(indexHtml.includes('타로'), 'index page must show the tarot category label');
assert.ok(indexHtml.includes('what-is-tarot.html'));
assert.ok(indexHtml.includes('how-to-ask-tarot.html'));
// 아직 원고가 없는 카테고리(별자리 등)는 표시되지 않아야 한다.
assert.ok(!indexHtml.includes('별자리'), 'category with zero guides must not render');

console.log('render-guides-pages.test.js: all assertions passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/render-guides-pages.test.js`
Expected: `Cannot find module '../scripts/lib/render-guides-pages.js'`

- [ ] **Step 3: `scripts/lib/render-guides-pages.js` 작성**

```js
const { SITE_BASE } = require('./tarot-page-data.js');
const { GUIDE_CATEGORY_LABELS, GUIDE_CATEGORY_ORDER, GUIDE_CATEGORY_INTROS } = require('../../data/guides-data.js');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

// /guides/ 디렉터리 안의 페이지(가이드 상세, 목록 모두)에서 공통으로 쓰는 링크 세트.
var GUIDES_DIR_LINKS = {
  homeHref: '../index.html',
  tarotHubHref: '../tarot/index.html',
  guidesHref: 'index.html',
  aboutHref: '../about.html',
  contactHref: '../contact.html',
  faqHref: '../faq.html',
  legalHref: '../legal.html'
};

function renderNav(links) {
  return '<nav class="site-nav" aria-label="사이트 내비게이션">' +
    '<a href="' + links.homeHref + '">홈</a>' +
    '<a href="' + links.tarotHubHref + '">타로 카드 백과사전</a>' +
    '<a href="' + links.guidesHref + '">운세 가이드</a>' +
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

function renderGuidePage(guide, categoryGuides) {
  const pageTitle = guide.title + ' | 운세 가이드 | 점집';
  const canonicalUrl = SITE_BASE + 'guides/' + guide.slug + '.html';
  const categoryLabel = GUIDE_CATEGORY_LABELS[guide.category];
  const toolHref = guide.category === 'tarot' ? GUIDES_DIR_LINKS.tarotHubHref : GUIDES_DIR_LINKS.homeHref;
  const toolLabel = guide.category === 'tarot' ? '타로 카드 백과사전' : '점집 홈';

  const siblingLinksHtml = categoryGuides
    .filter(function (g) { return g.slug !== guide.slug; })
    .map(function (g) { return '<a href="' + g.slug + '.html">' + escapeHtml(g.title) + '</a>'; })
    .join(' · ');

  return '<!DOCTYPE html>\n' +
    '<!-- 이 파일은 scripts/generate-guides-pages.js가 자동 생성합니다. 직접 수정하지 마세요 — 원고를 고친 뒤 `npm run build:guides-pages`로 재생성하세요. -->\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + escapeHtml(pageTitle) + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + escapeHtml(guide.description) + '">\n' +
    '<link rel="canonical" href="' + canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + escapeHtml(pageTitle) + '">\n' +
    '<meta property="og:description" content="' + escapeHtml(guide.description) + '">\n' +
    '<meta property="og:url" content="' + canonicalUrl + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="legal-page">\n' +
    renderHeader(GUIDES_DIR_LINKS) +
    '<p class="hero-copy"><a href="' + GUIDES_DIR_LINKS.homeHref + '">홈</a> &gt; <a href="' + GUIDES_DIR_LINKS.guidesHref + '">운세 가이드</a> &gt; ' + escapeHtml(guide.title) + '</p>\n' +
    '<section class="legal-section">\n' +
    '<h2>' + escapeHtml(guide.title) + '</h2>\n' +
    '<p class="eyebrow">' + escapeHtml(categoryLabel) + '</p>\n' +
    guide.bodyHtml.join('\n') + '\n' +
    '</section>\n' +
    (siblingLinksHtml ? '<p>같은 카테고리의 다른 가이드: ' + siblingLinksHtml + '</p>\n' : '') +
    '<p><a href="' + toolHref + '">' + escapeHtml(toolLabel) + '에서 직접 해보기 ↗</a></p>\n' +
    renderFooter(GUIDES_DIR_LINKS) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n';
}

function renderGuidesIndexPage(allGuides) {
  const pageTitle = '운세 가이드 | 점집';
  const pageDescription = '운세를 더 깊이 이해하고 싶을 때 참고할 수 있는 운세 가이드 모음입니다.';
  const canonicalUrl = SITE_BASE + 'guides/index.html';

  const sectionsHtml = GUIDE_CATEGORY_ORDER
    .filter(function (category) { return allGuides.some(function (g) { return g.category === category; }); })
    .map(function (category) {
      const guidesInCategory = allGuides
        .filter(function (g) { return g.category === category; })
        .sort(function (a, b) { return a.order - b.order; });
      const itemsHtml = guidesInCategory.map(function (g) {
        return '<li><a href="' + g.slug + '.html">' + escapeHtml(g.title) + '</a></li>';
      }).join('');
      return '<section class="legal-section">' +
        '<h2>' + escapeHtml(GUIDE_CATEGORY_LABELS[category]) + '</h2>' +
        '<p>' + escapeHtml(GUIDE_CATEGORY_INTROS[category]) + '</p>' +
        '<ul>' + itemsHtml + '</ul>' +
        '</section>';
    }).join('\n');

  return '<!DOCTYPE html>\n' +
    '<!-- 이 파일은 scripts/generate-guides-pages.js가 자동 생성합니다. 직접 수정하지 마세요 — 원고를 고친 뒤 `npm run build:guides-pages`로 재생성하세요. -->\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + escapeHtml(pageTitle) + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + escapeHtml(pageDescription) + '">\n' +
    '<link rel="canonical" href="' + canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + escapeHtml(pageTitle) + '">\n' +
    '<meta property="og:description" content="' + escapeHtml(pageDescription) + '">\n' +
    '<meta property="og:url" content="' + canonicalUrl + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="legal-page">\n' +
    renderHeader(GUIDES_DIR_LINKS) +
    '<p><a href="' + GUIDES_DIR_LINKS.homeHref + '">← 점집으로 돌아가기</a></p>\n' +
    '<section class="legal-section"><h2>운세 가이드</h2><p>' + escapeHtml(pageDescription) + '</p></section>\n' +
    sectionsHtml + '\n' +
    renderFooter(GUIDES_DIR_LINKS) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n';
}

module.exports = { renderGuidePage, renderGuidesIndexPage, escapeHtml, GUIDES_DIR_LINKS };
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/render-guides-pages.test.js`
Expected: `render-guides-pages.test.js: all assertions passed`

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/render-guides-pages.js tests/render-guides-pages.test.js
git commit -m "feat(guides): add guide page and index page renderer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `scripts/generate-guides-pages.js` + sitemap 연동

**Files:**
- Create: `scripts/generate-guides-pages.js`
- Modify: `scripts/generate-sitemap.js`
- Modify: `package.json`
- Test: `tests/generate-guides-pages.test.js`
- Test: `tests/generate-sitemap.test.js` (URL 개수 갱신)

**Interfaces:**
- Produces: `scripts/generate-guides-pages.js`가 export하는 `generate(options)` — `options: {guidesDir?: string}`. `/guides/<slug>.html` + `/guides/index.html`을 쓴다(sitemap.xml에는 손대지 않는다 — Task 1에서 정한 원칙).
- Consumes: `scripts/generate-sitemap.js`가 이제 `data/guides-data.js`의 `GUIDES`도 읽어 가이드 URL을 sitemap에 포함한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/generate-guides-pages.test.js`**

```js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generate } = require('../scripts/generate-guides-pages.js');
const { GUIDES } = require('../data/guides-data.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guides-pages-test-'));
const guidesDir = path.join(tmpDir, 'guides');

generate({ guidesDir: guidesDir });

const files = fs.readdirSync(guidesDir).filter(function (f) { return f.endsWith('.html'); });

assert.strictEqual(files.length, GUIDES.length + 1, 'expected ' + GUIDES.length + ' guide pages + 1 index page, got ' + files.length);
assert.ok(files.includes('index.html'));
assert.ok(files.includes('what-is-tarot.html'));
assert.ok(files.includes('how-to-ask-tarot.html'));

const html = fs.readFileSync(path.join(guidesDir, 'what-is-tarot.html'), 'utf8');
assert.ok(html.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/what-is-tarot.html">'));

const indexHtml = fs.readFileSync(path.join(guidesDir, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/index.html">'));

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('generate-guides-pages.test.js: all assertions passed');
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node tests/generate-guides-pages.test.js`
Expected: `Cannot find module '../scripts/generate-guides-pages.js'`

- [ ] **Step 3: `scripts/generate-guides-pages.js` 작성**

```js
const fs = require('fs');
const path = require('path');

const { GUIDES } = require('../data/guides-data.js');
const { renderGuidePage, renderGuidesIndexPage } = require('./lib/render-guides-pages.js');

const ROOT = path.join(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'guides');

function generate(options) {
  const opts = options || {};
  const guidesDir = opts.guidesDir || GUIDES_DIR;

  if (!fs.existsSync(guidesDir)) fs.mkdirSync(guidesDir, { recursive: true });

  GUIDES.forEach(function (guide) {
    const categoryGuides = GUIDES.filter(function (g) { return g.category === guide.category; });
    const html = renderGuidePage(guide, categoryGuides);
    fs.writeFileSync(path.join(guidesDir, guide.slug + '.html'), html, 'utf8');
  });

  const indexHtml = renderGuidesIndexPage(GUIDES);
  fs.writeFileSync(path.join(guidesDir, 'index.html'), indexHtml, 'utf8');
}

if (require.main === module) {
  generate();
  console.log('Generated ' + GUIDES.length + ' guide pages + 1 index page');
}

module.exports = { generate };
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `node tests/generate-guides-pages.test.js`
Expected: `generate-guides-pages.test.js: all assertions passed`

- [ ] **Step 5: `generate-sitemap.js`가 가이드 URL도 포함하도록 확장**

기존:

```js
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
const { writeSitemapXml } = require('./lib/sitemap.js');

const ROOT = path.join(__dirname, '..');

function generateSitemap(options) {
  const opts = options || {};
  const sitemapPath = opts.sitemapPath || path.join(ROOT, 'sitemap.xml');
  const today = opts.today || new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });

  writeSitemapXml(staticUrls.concat(cardUrls), sitemapPath, today);
}

if (require.main === module) {
  generateSitemap();
  console.log('Generated sitemap.xml');
}

module.exports = { generateSitemap };
```

다음으로 교체:

```js
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
const { GUIDES } = require('../data/guides-data.js');
const { writeSitemapXml } = require('./lib/sitemap.js');

const ROOT = path.join(__dirname, '..');

function generateSitemap(options) {
  const opts = options || {};
  const sitemapPath = opts.sitemapPath || path.join(ROOT, 'sitemap.xml');
  const today = opts.today || new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_BASE + 'guides/index.html', changefreq: 'monthly', priority: '0.6' }
  ];

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });

  const guideUrls = GUIDES.map(function (guide) {
    return { loc: SITE_BASE + 'guides/' + guide.slug + '.html', changefreq: 'monthly', priority: '0.5' };
  });

  writeSitemapXml(staticUrls.concat(cardUrls).concat(guideUrls), sitemapPath, today);
}

if (require.main === module) {
  generateSitemap();
  console.log('Generated sitemap.xml');
}

module.exports = { generateSitemap };
```

- [ ] **Step 6: `tests/generate-sitemap.test.js`의 URL 개수 갱신**

기존:

```js
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'), 'sample tarot card url must exist');
assert.ok(sitemap.includes('<lastmod>2026-09-22</lastmod>'));

// 이 시점(가이드 파이프라인 구축 전)에는 84개(홈/about/contact/faq/legal/tarot허브/78카드)여야 한다.
assert.strictEqual((sitemap.match(/<url>/g) || []).length, 84, 'sitemap must contain exactly 84 <url> entries before guides exist');
```

다음으로 교체:

```js
assert.ok(sitemap.includes('tarot-reading/tarot/major-19-sun.html'), 'sample tarot card url must exist');
assert.ok(sitemap.includes('tarot-reading/guides/index.html'), 'guides index url must exist');
assert.ok(sitemap.includes('tarot-reading/guides/what-is-tarot.html'), 'sample guide url must exist');
assert.ok(sitemap.includes('<lastmod>2026-09-22</lastmod>'));

// 84(홈/about/contact/faq/legal/tarot허브/78카드) + 가이드 인덱스 1 + 타로 가이드 6편 = 91.
assert.strictEqual((sitemap.match(/<url>/g) || []).length, 91, 'sitemap must contain exactly 91 <url> entries after the tarot guides batch');
```

- [ ] **Step 7: `package.json`에 `build:guides-pages` 추가**

기존:

```json
  "scripts": {
    "test": "node scripts/run-tests.js",
    "build:tarot-pages": "node scripts/generate-tarot-pages.js",
    "build:sitemap": "node scripts/generate-sitemap.js"
  }
```

다음으로 교체:

```json
  "scripts": {
    "test": "node scripts/run-tests.js",
    "build:tarot-pages": "node scripts/generate-tarot-pages.js",
    "build:guides-pages": "node scripts/generate-guides-pages.js",
    "build:sitemap": "node scripts/generate-sitemap.js"
  }
```

- [ ] **Step 8: 테스트 실행해서 통과 확인 + 실제 생성**

Run: `node tests/generate-sitemap.test.js` → PASS(91개로 통과)
Run: `node scripts/run-tests.js` → 전체 통과 확인(테스트 파일 16개: 이 계획 이전의 13개 + Task 1에서 추가된 `generate-sitemap.test.js` + Task 3의 `render-guides-pages.test.js` + 이 태스크의 `generate-guides-pages.test.js`)
Run: `npm run build:guides-pages` → 실제 `guides/` 디렉터리에 7개 파일 생성
Run: `npm run build:sitemap` → `sitemap.xml`이 91개 URL로 갱신되는지 확인

- [ ] **Step 9: 커밋**

```bash
git add scripts/generate-guides-pages.js scripts/generate-sitemap.js package.json tests/generate-guides-pages.test.js tests/generate-sitemap.test.js guides/ sitemap.xml
git commit -m "feat(guides): generate guide pages and wire them into the sitemap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: CSS 추가 + 브라우저 확인

**Files:**
- Modify: `css/style.css`

**Interfaces:** 없음(순수 스타일 추가).

- [ ] **Step 1: 표/목록 스타일 추가**

`css/style.css`의 기존:

```css
.legal-date { color: #c9bde0; font-size: 12px; margin-top: 16px; }
```

다음으로 교체(바로 다음 줄에 추가):

```css
.legal-date { color: #c9bde0; font-size: 12px; margin-top: 16px; }
.legal-section table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
.legal-section th, .legal-section td { border: 1px solid #4a3a68; padding: 8px 10px; font-size: 13px; text-align: left; }
.legal-section th { color: #d4af37; font-weight: 600; }
.legal-section ul { padding-left: 20px; margin: 0 0 10px; }
.legal-section li { margin-bottom: 6px; font-size: 14px; line-height: 1.6; }
```

- [ ] **Step 2: 브라우저로 확인**

`mcp__Claude_Browser__preview_start` name "static-preview"(포트 8080)로 다음을 확인:
- `guides/index.html`: "타로" 섹션 아래 6개 가이드 링크가 보이고, 각 링크가 정상 이동하는지.
- `guides/what-is-tarot.html`: 브레드크럼, 본문 7문단, "같은 카테고리의 다른 가이드" 5개 링크, "타로 카드 백과사전에서 직접 해보기" 링크, 6링크 푸터가 모두 정상 렌더링되는지.
- `guides/how-to-ask-tarot.html`: 표가 정상적으로 렌더링되는지(4행 2열).
- `read_console_messages`로 콘솔 에러 없는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add css/style.css
git commit -m "style(guides): add table and list styles for guide pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: 사이트 전체 nav에 "운세 가이드" 추가

**Files:**
- Modify: `index.html`, `about.html`, `legal.html`, `404.html`, `contact.html`, `faq.html`
- Modify: `scripts/lib/render-tarot-pages.js`
- Test: `tests/render-tarot-pages.test.js`

**Interfaces:** 없음(기존 `TAROT_DIR_LINKS`에 필드 추가, `renderNav` 출력만 확장).

- [ ] **Step 1: 손작성 6개 파일의 nav 갱신**

`index.html`, `about.html`, `legal.html`, `404.html`, `contact.html`, `faq.html` 6개 파일 모두 다음과 같이 **동일한** 기존 블록을 갖고 있다:

```html
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="about.html">About</a>
    </nav>
```

6개 파일 모두에서 다음으로 교체:

```html
    <nav class="site-nav" aria-label="사이트 내비게이션">
      <a href="tarot/index.html">타로 카드 백과사전</a>
      <a href="guides/index.html">운세 가이드</a>
      <a href="about.html">About</a>
    </nav>
```

- [ ] **Step 2: 실패하는 테스트 작성 — `tests/render-tarot-pages.test.js`에 nav 검증 추가**

`tests/render-tarot-pages.test.js`의 기존(현재 37번째 줄):

```js
assert.ok(html.includes('href="../about.html">About'), 'nav must link about via ../about.html');
```

다음으로 교체(바로 다음 줄에 추가):

```js
assert.ok(html.includes('href="../about.html">About'), 'nav must link about via ../about.html');
assert.ok(html.includes('href="../guides/index.html">운세 가이드'), 'nav must link to guides index');
```

허브 페이지 검증 부분의 기존(현재 56번째 줄):

```js
assert.ok(hubHtml.includes('wands-ace.html'));
```

다음으로 교체:

```js
assert.ok(hubHtml.includes('wands-ace.html'));
assert.ok(hubHtml.includes('href="../guides/index.html">운세 가이드'), 'hub nav must link to guides index');
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `node tests/render-tarot-pages.test.js`
Expected: FAIL — 생성 템플릿 nav에 아직 "운세 가이드" 링크가 없음

- [ ] **Step 4: `render-tarot-pages.js`의 `renderNav`/`TAROT_DIR_LINKS` 확장**

기존:

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
```

다음으로 교체:

```js
// links: { homeHref, hubHref, guidesHref, aboutHref, contactHref, faqHref, legalHref } — 모두 "이 페이지 기준" 상대경로.
// 카드/허브 페이지(모두 /tarot/ 안에 있음)에서는 homeHref='../index.html', hubHref='index.html'(같은 폴더의 허브 자기 자신 또는 옆 페이지), guidesHref='../guides/index.html', aboutHref='../about.html', contactHref='../contact.html', faqHref='../faq.html', legalHref='../legal.html'.
function renderNav(links) {
  return '<nav class="site-nav" aria-label="사이트 내비게이션">' +
    '<a href="' + links.homeHref + '">홈</a>' +
    '<a href="' + links.hubHref + '">타로 카드 백과사전</a>' +
    '<a href="' + links.guidesHref + '">운세 가이드</a>' +
    '<a href="' + links.aboutHref + '">About</a>' +
    '</nav>';
}
```

기존:

```js
var TAROT_DIR_LINKS = { homeHref: '../index.html', hubHref: 'index.html', aboutHref: '../about.html', contactHref: '../contact.html', faqHref: '../faq.html', legalHref: '../legal.html' };
```

다음으로 교체:

```js
var TAROT_DIR_LINKS = { homeHref: '../index.html', hubHref: 'index.html', guidesHref: '../guides/index.html', aboutHref: '../about.html', contactHref: '../contact.html', faqHref: '../faq.html', legalHref: '../legal.html' };
```

- [ ] **Step 5: 테스트 실행해서 통과 확인 + 재생성**

Run: `node tests/render-tarot-pages.test.js` → PASS
Run: `npm run build:tarot-pages` → 79개 파일 재생성(nav 갱신 반영)
Run: `node scripts/run-tests.js` → 전체 통과 확인

- [ ] **Step 6: 브라우저로 확인**

`index.html`, `about.html`, `legal.html`, `404.html`, `contact.html`, `faq.html`을 열어 nav가 `타로 카드 백과사전 · 운세 가이드 · About` 순서로 보이는지, `tarot/major-19-sun.html`, `tarot/index.html`, `guides/index.html`, `guides/what-is-tarot.html`을 열어 nav가 `홈 · 타로 카드 백과사전 · 운세 가이드 · About` 순서로 보이는지 확인하고, 모든 페이지에서 "운세 가이드" 클릭 시 `guides/index.html`(또는 `../guides/index.html`)로 정상 이동하는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add index.html about.html legal.html 404.html contact.html faq.html scripts/lib/render-tarot-pages.js tests/render-tarot-pages.test.js tarot/
git commit -m "feat(nav): add 운세 가이드 link across the whole site

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: 가이드 간 문장 중복 검사

**Files:**
- Create: `tests/guides-data.test.js`

**Interfaces:**
- Consumes: `tests/helpers/dedup.js`의 `splitSentences`/`wordJaccard`/`trigramJaccard`(순수 함수만 — `makeFullCombinedIssues`/`makeEchoIssue`는 카드 키워드 제거 로직에 특화되어 있어 쓰지 않는다), `data/guides-data.js`의 `GUIDES`.

- [ ] **Step 1: 실패하는 테스트를 먼저 작성할 필요 없음(회귀 검증용 테스트) — 바로 구현**

이 태스크는 새 버그를 고치는 TDD가 아니라 "12편이 늘어나도 항상 통과해야 하는 회귀 검사"를 추가하는 것이므로, RED 단계 없이 바로 작성하고 초록으로 통과하는지 확인한다.

`tests/guides-data.test.js` 작성:

```js
const assert = require('assert');
const { GUIDES } = require('../data/guides-data.js');
const { splitSentences, wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const WORD_TH = 0.3;
const OPEN_WORD_TH = 0.20;
const OPEN_TRI_TH = 0.15;

function bodyToText(guide) {
  return guide.bodyHtml.join(' ').replace(/<[^>]+>/g, ' ');
}

const docs = GUIDES.map(function (g) {
  return { slug: g.slug, sentences: splitSentences(bodyToText(g)).filter(function (s) { return s.trim().length > 8; }) };
});

const issues = [];
for (let i = 0; i < docs.length; i++) {
  for (let j = i + 1; j < docs.length; j++) {
    for (const s1 of docs[i].sentences) {
      for (const s2 of docs[j].sentences) {
        const wj = wordJaccard(s1, s2);
        const tj = trigramJaccard(s1, s2);
        const flagged = wj >= WORD_TH || (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH);
        if (flagged) {
          issues.push(docs[i].slug + ' <-> ' + docs[j].slug + '\n  A: ' + s1 + '\n  B: ' + s2 + '\n  word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
        }
      }
    }
  }
}

assert.strictEqual(issues.length, 0, '가이드 사이에 유사도 높은 문장이 있습니다:\n' + issues.join('\n\n'));

console.log('guides-data.test.js: all assertions passed (' + GUIDES.length + ' guides, ' + docs.reduce(function (n, d) { return n + d.sentences.length; }, 0) + ' sentences compared pairwise)');
```

- [ ] **Step 2: 테스트 실행해서 통과 확인**

Run: `node tests/guides-data.test.js`
Expected: `guides-data.test.js: all assertions passed (6 guides, N sentences compared pairwise)` — 만약 실패한다면(즉 유사 문장이 실제로 발견된다면), 이 계획을 실행하는 사람은 **여기서 멈추고 사람에게 보고한다** — 원고 내용을 임의로 고치지 않는다(Global Constraints 참고).

- [ ] **Step 3: 커밋**

```bash
git add tests/guides-data.test.js
git commit -m "test(guides): add cross-guide sentence duplication check

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 최종 회귀 검증

**Files:** (변경 없음 — 검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 통과(정확한 파일 개수는 이 시점까지 추가된 테스트 파일 수에 따라 달라짐 — 실패 없이 통과하는지만 확인).

- [ ] **Step 2: 브라우저 전체 동선 확인**

홈(`index.html`) → nav의 "운세 가이드" 클릭 → `guides/index.html`에서 타로 섹션 확인 → 가이드 1편 클릭 → 본문/브레드크럼/같은 카테고리 링크/도구 링크/푸터 확인 → "같은 카테고리의 다른 가이드" 링크로 2, 3번째 가이드까지 옮겨다니며 확인 → "타로 카드 백과사전에서 직접 해보기" 링크로 `tarot/index.html`까지 이동 확인 → 다시 홈으로 돌아와 타로 카드 뽑기 진행 → 결과 화면 확인(회귀 없는지) → 콘솔 에러 없음(`read_console_messages`) 확인.

- [ ] **Step 3: sitemap.xml 최종 확인**

`grep -c "<url>" sitemap.xml`로 91개인지 확인.

- [ ] **Step 4: 남은 변경사항 커밋**

```bash
git status --short
git add -A
git commit -m "chore(guides): finalize tarot guides batch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" # 변경사항이 있을 때만
```

- [ ] **Step 5: 사용자에게 push 여부 확인 후 push**

커밋 완료 후 사용자에게 push 진행 여부를 확인받는다(자동으로 push하지 않는다).
