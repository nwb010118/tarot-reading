# 운세 가이드(`/guides/`) 콘텐츠 페이지 설계안

> 대상: `C:\Users\A\OneDrive\바탕 화면\원빈\클로드\운세` (GitHub `nwb010118/tarot-reading`, 배포 `https://nwb010118.github.io/tarot-reading/`)
> 목적: 애드센스 승인 완료 기준 중 남은 항목인 "가이드 12편(각 1,500자 이상)"을 채운다. 콘텐츠 원고는 이 스펙과 별개로, 카테고리 단위로 채팅에서 직접 작성·검토한다 — 이 문서는 그 원고를 사이트에 반영하는 구조를 정의한다.

## 1. 배경 및 범위

- 사용자가 저장소 밖에서 관리하는 `tarot-adsense-redesign-spec.md`(gitignore됨)에 가이드 12편의 주제·슬러그·필수 내용·분량이 이미 정의되어 있다. 이 스펙은 그 문서를 참고 자료로 삼아 기술 구조만 새로 정의한다. 주제 목록 자체는 변경하지 않는다.
- 카드 상세 페이지(78장) 작업과 달리, 가이드 12편은 균일한 스키마로 표현되지 않는다(표, 목록, 사례 등 글마다 구조가 다름). 따라서 78장 카드 페이지와 완전히 동일한 생성 파이프라인을 그대로 재사용하지 않고, "완성된 본문 HTML을 데이터로 저장 + 공통 챙김새(헤더/nav/푸터/canonical/브레드크럼)만 씌우는" 절충안을 쓴다.
- 이 스펙은 반영 파이프라인만 다룬다. 실제 원고 집필은 카테고리별로(타로 6편 → 별자리 1편 → 띠 1편 → 사주 3편 → 궁합 1편) 채팅에서 별도로 진행하고, 카테고리 하나가 끝날 때마다 이 파이프라인을 통해 즉시 사이트에 반영한다.

## 2. 콘텐츠 데이터 저장 형식

새 파일 `data/guides-data.js` (기존 `data/category-labels.js`/`data/tarot-slugs.js`와 동일한 패턴: 브라우저 전역 + `module.exports` 가드).

```js
const GUIDES = [
  {
    slug: 'what-is-tarot',
    category: 'tarot',                 // tarot | zodiac | ddi | saju | compatibility
    order: 1,                          // 카테고리 내부 표시 순서
    title: '타로란 무엇인가',
    description: '검색결과/OG에 쓸 1~2문장 요약(메타 설명 그대로 사용)',
    bodyHtml: [
      '<p>...채팅에서 검토 확정한 문단...</p>',
      '<h2>소제목</h2>',
      '<p>...</p>'
      // 문단 단위 HTML 블록 배열. escapeHtml 처리 없이 신뢰된 원고를 그대로 조립한다
      // (about.html 등 기존 손작성 페이지와 동일하게, 저자가 직접 검토한 정적 HTML이므로).
    ]
  },
  // ...총 12개, 카테고리별로 이어서 추가
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GUIDES };
}
```

- 카테고리별로 즉시 반영하는 방식이므로, 파일은 처음엔 타로 6개 항목만 가진 배열로 시작하고 이후 카테고리가 끝날 때마다 append한다(중간에 12개 전부를 미리 만들 필요 없음).
- `bodyHtml`은 신뢰된 원고이므로 `escapeHtml`을 적용하지 않는다 — `about.html`/`contact.html`/`faq.html` 손작성 페이지들도 동일하게 원고를 직접 HTML로 작성해 넣는 방식이라 일관적이다.

## 3. 렌더링 모듈

새 파일 `scripts/lib/render-guides-pages.js`, 기존 `scripts/lib/render-tarot-pages.js`의 `renderHeader`/`renderFooter`/`escapeHtml` 패턴을 그대로 복제해서 쓴다(공유 모듈로 추출하지는 않는다 — 두 생성기가 완전히 다른 디렉터리 깊이(`/guides/*.html`도 `/tarot/*.html`과 동일하게 사이트 루트 기준 한 단계 아래)와 nav 구성을 가지므로, 억지로 공유하면 오히려 두 파일 모두에 조건분기가 늘어난다. 대신 nav 항목("운세 가이드" 링크)이 늘어나는 이번 변경은 두 파일에 병렬로 반영한다).

`renderGuidePage(guide, allGuidesInCategory, nav)`:
- `<head>`: title(`{title} — 점집`), meta description(`guide.description`), canonical(`SITE_BASE + 'guides/' + slug + '.html'`), OG 태그(카드 페이지와 동일한 필드셋).
- 브레드크럼(스펙 10번 항목 요구사항): `홈 > 운세 가이드 > {title}`.
- 본문: `guide.bodyHtml.join('')`.
- 하단 "같은 카테고리 가이드 더보기": `allGuidesInCategory`에서 자기 자신을 제외한 나머지 링크(카테고리 내 전체 나열 — 6편짜리 타로도 5개 링크면 충분히 짧다).
- "도구로 돌아가기" 링크: 카테고리별 고정 목적지 — tarot → `../tarot/index.html`(타로 백과사전 허브), zodiac/ddi/saju/compatibility → `../index.html`(홈, 해당 모드는 SPA 내부에만 있어 전용 랜딩이 없음).
- 헤더/nav/푸터는 `TAROT_DIR_LINKS`와 동일한 형태의 `GUIDES_DIR_LINKS`(요소: homeHref/hubHref/aboutHref/contactHref/faqHref/legalHref/guidesHref, 전부 `../` 접두)를 새로 정의해서 사용.

`renderGuidesIndexPage(allGuides)`:
- `/guides/index.html`. 카테고리별 소제목(타로/별자리/띠운세/사주/궁합) 아래 해당 가이드 링크 나열 + 카테고리 소개 2~3문장(스펙 6번 항목 요구사항).
- canonical: `SITE_BASE + 'guides/index.html'`.

## 4. 생성 스크립트

새 파일 `scripts/generate-guides-pages.js`, `scripts/generate-tarot-pages.js`와 같은 뼈대(`generate({guidesDir, sitemapPath, today})` 형태로 옵션 주입 가능, 테스트는 반드시 임시 디렉터리를 넘겨 실제 저장소를 건드리지 않음 — 이 프로젝트가 두 번 겪은 실수라 이번에도 명시).

- `data/guides-data.js`의 `GUIDES` 배열을 읽어 카테고리+`order`로 정렬 후 각 가이드 페이지 + 목록 페이지를 생성.
- `sitemap.xml`에 가이드 URL들을 등록(기존 `writeSitemap`과는 별도 함수로 두거나, `generate-tarot-pages.js`의 sitemap 로직을 두 스크립트가 공유하도록 소폭 리팩터링할지는 구현 단계에서 실제 코드를 보고 결정 — 이 시점에는 "가이드가 몇 개 반영됐든 그 시점의 sitemap.xml 최종 URL 수와 항상 일치해야 한다"는 요구사항만 확정).
- `npm run build:tarot-pages`와 별개로 `npm run build:guides-pages` 스크립트를 `package.json`에 추가.

## 5. 기존 페이지 변경 (nav에 "운세 가이드" 추가)

타로 1편이 처음 반영되는 시점에 한 번에 적용:

- 손작성 6개 파일(`index.html`, `about.html`, `legal.html`, `404.html`, `contact.html`, `faq.html`)의 `<nav class="site-nav">`에 `<a href="guides/index.html">운세 가이드</a>` 추가(About 앞 또는 뒤 — 기존 "홈·타로 카드 백과사전·About" 순서에 맞춰 "운세 가이드"를 "About" 앞에 삽입: 홈·타로 카드 백과사전·운세 가이드·About).
- `scripts/lib/render-tarot-pages.js`의 `renderNav`에도 동일하게 `guidesHref` 링크 추가, `TAROT_DIR_LINKS`에 `guidesHref: '../guides/index.html'` 추가.
- 79개 타로 페이지 재생성.

## 6. 문장 중복 검사

새 테스트 `tests/guides-data.test.js`. 이 프로젝트가 이미 확립한 방식(단어 단위 Jaccard + 문장 단위 trigram Jaccard 조합 — 한국어 교착어 특성상 단어 Jaccard 단독으로는 놓치는 경우가 있어서 병용) 그대로, 12편 사이 모든 문단 쌍에 대해 유사도를 계산해 임계치 초과 시 실패시킨다. 기존 리딩 데이터용으로 추출된 공유 dedup-axes 헬퍼는 재사용하지 않는다(그 헬퍼는 "카테고리×서브키×정역방향" 구조의 짧은 문구용으로 설계되어 있고, 가이드는 장문 에세이 12개뿐이라 훨씬 단순한 전수 문단 비교로 충분하다) — 다만 임계치·정규화 로직(조사 제거 등)은 동일한 걸 재사용한다.

## 7. 완료 기준 (이 스펙 범위)

- [ ] `data/guides-data.js`, `scripts/lib/render-guides-pages.js`, `scripts/generate-guides-pages.js` 작성
- [ ] 타로 6편 반영 시 nav "운세 가이드" 링크를 손작성 6개 파일 + 생성 템플릿에 추가
- [ ] 카테고리별로 반영할 때마다 `node scripts/run-tests.js` 전체 통과 + sitemap URL 수 갱신 확인
- [ ] 12편 전체 반영 후 `tests/guides-data.test.js`(중복 문장 검사) 통과
- [ ] 각 가이드 페이지: canonical/OG/브레드크럼/카테고리 내 상호링크/도구 링크 확인

## 8. 범위 밖

- 실제 원고 집필(문장 하나하나)은 이 스펙이 다루지 않는다 — 카테고리별로 별도 채팅 세션에서 진행.
- `Article`/`BreadcrumbList` JSON-LD 구조화 데이터는 스펙 원문에서도 "선택" 항목이라 이번 범위에서 제외(추후 별도 태스크로 고려 가능).
- 추가 후보 가이드(운세를 재미있게 활용하는 법 등, 스펙의 "여유 있을 때" 항목)는 이번 12편에 포함하지 않는다.
