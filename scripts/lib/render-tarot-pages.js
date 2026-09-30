var OG_IMAGE_URL = 'https://nwb010118.github.io/tarot-reading/images/og-image.jpg';
var ADSENSE_SCRIPT_TAG = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037" crossorigin="anonymous"></script>\n';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

// links: { homeHref, hubHref, guidesHref, aboutHref, contactHref, faqHref, legalHref } — 모두 "이 페이지 기준" 상대경로.
// 카드/허브 페이지(모두 /tarot/ 안에 있음)에서는 homeHref='../index.html', hubHref='index.html'(같은 폴더의 허브 자기 자신 또는 옆 페이지), guidesHref='../guides/index.html', aboutHref='../about.html', contactHref='../contact.html', faqHref='../faq.html', legalHref='../legal.html'.
function renderNav(links) {
  return '<nav class="site-nav" aria-label="사이트 내비게이션">' +
    '<a href="' + links.homeHref + '">홈</a>' +
    '<a href="' + links.hubHref + '">타로 카드 백과사전</a>' +
    '<a href="' + links.guidesHref + '">운세 가이드</a>' +
    '<a href="' + links.aboutHref + '">소개</a>' +
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
var TAROT_DIR_LINKS = { homeHref: '../index.html', hubHref: 'index.html', guidesHref: '../guides/index.html', aboutHref: '../about.html', contactHref: '../contact.html', faqHref: '../faq.html', legalHref: '../legal.html' };

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
    '<!-- 이 파일은 scripts/generate-tarot-pages.js가 자동 생성합니다. 직접 수정하지 마세요 — 데이터를 고친 뒤 `npm run build:tarot-pages`로 재생성하세요. -->\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    ADSENSE_SCRIPT_TAG +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + escapeHtml(vm.title) + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + escapeHtml(vm.description) + '">\n' +
    '<link rel="canonical" href="' + vm.canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + escapeHtml(vm.title) + '">\n' +
    '<meta property="og:description" content="' + escapeHtml(vm.description) + '">\n' +
    '<meta property="og:url" content="' + vm.canonicalUrl + '">\n' +
    '<meta property="og:image" content="' + OG_IMAGE_URL + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:image" content="' + OG_IMAGE_URL + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="tarot-page">\n' +
    renderHeader(TAROT_DIR_LINKS) +
    '<main class="card-page-main">\n' +
    '<p class="eyebrow">' + escapeHtml(vm.suitLabel) + ' · 타로 카드 백과사전</p>\n' +
    '<h1>' + escapeHtml(vm.name) + (vm.nameEn ? ' (' + escapeHtml(vm.nameEn) + ')' : '') + '</h1>\n' +
    '<figure class="card-hero-page"><img src="../' + vm.image + '" alt="' + escapeHtml(vm.name) + ' 타로 카드 이미지" loading="lazy"><figcaption>그림: Pamela Colman Smith · RWS 덱 · <a href="' + escapeHtml(vm.imageSourceUrl) + '">Wikimedia Commons 원본·이용 조건</a></figcaption></figure>\n' +
    renderEditorial(vm.editorial) +
    '<p class="reading-context">아래 상황별 문장은 상징을 일상에 연결하는 오락용 해석입니다. 실제 사건·건강 상태·투자 성과를 예측하지 않습니다.</p>\n' +
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

function renderEditorial(editorial) {
  return '<article class="card-editorial">' +
    '<p class="editorial-meta">편집: 점집 · 해설 보완: 2026년 9월 30일</p>' +
    '<h2>그림에서 읽는 상징</h2><p>' + escapeHtml(editorial.scene) + '</p>' +
    '<h2>점집의 해석</h2><p>' + escapeHtml(editorial.interpretation) + '</p>' +
    '<h3>역방향에서 돌아볼 점</h3><p>' + escapeHtml(editorial.reversed) + '</p>' +
    '<h2>질문에 적용하는 예시</h2><p class="example-question">“' + escapeHtml(editorial.question) + '”</p><p>' + escapeHtml(editorial.practice) + '</p>' +
    '<p class="editorial-meta">예시는 점집이 구성한 가상 상황입니다. 실제 상담 사례나 효과를 입증한 사례가 아닙니다.</p>' +
    '<details class="editorial-sources"><summary>해설 기준과 참고 자료</summary>' +
    '<p>그림 설명은 라이더–웨이트–스미스 덱의 도상을 관찰한 내용입니다. 이어지는 해석·역방향 질문·실천 예시는 점집의 자기성찰용 설명이며, 원전의 예언 문구를 번역한 것이 아닙니다. 덱과 해석 전통에 따라 의미는 달라질 수 있습니다.</p>' +
    '<p>전통적 도상 설명 참고: A. E. Waite, <a href="https://sacred-texts.com/tarot/pkt/">The Pictorial Key to the Tarot</a>. <a href="../about.html#editorial">점집의 편집 원칙</a> · <a href="../guides/how-to-ask-tarot.html">질문 만드는 법</a></p>' +
    '</details></article>\n';
}

function renderHubPage(allViewModels, canonicalUrl) {
  const suitOrder = ['major', 'wands', 'cups', 'swords', 'pentacles'];
  const suitLabels = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };
  const hubTitle = '타로 카드 78장 백과사전 | 점집';
  const hubDescription = '메이저 아르카나 22장과 마이너 아르카나(완드·컵·소드·펜타클) 56장, 타로 78장 전체의 정방향·역방향 키워드와 운세를 확인해보세요.';

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
    '<!-- 이 파일은 scripts/generate-tarot-pages.js가 자동 생성합니다. 직접 수정하지 마세요 — 데이터를 고친 뒤 `npm run build:tarot-pages`로 재생성하세요. -->\n' +
    '<html lang="ko">\n' +
    '<head>\n' +
    ADSENSE_SCRIPT_TAG +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + hubTitle + '</title>\n' +
    '<meta name="theme-color" content="#0b1422">\n' +
    '<link rel="icon" type="image/svg+xml" href="../images/moon-mark.svg">\n' +
    '<meta name="description" content="' + hubDescription + '">\n' +
    '<link rel="canonical" href="' + canonicalUrl + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + hubTitle + '">\n' +
    '<meta property="og:description" content="' + hubDescription + '">\n' +
    '<meta property="og:url" content="' + canonicalUrl + '">\n' +
    '<meta property="og:image" content="' + OG_IMAGE_URL + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:image" content="' + OG_IMAGE_URL + '">\n' +
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
