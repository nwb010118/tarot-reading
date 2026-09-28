const { SITE_BASE } = require('./tarot-page-data.js');
const { GUIDE_CATEGORY_LABELS, GUIDE_CATEGORY_ORDER, GUIDE_CATEGORY_INTROS } = require('../../data/guides-data.js');

var OG_IMAGE_URL = SITE_BASE + 'images/og-image.jpg';
var ADSENSE_SCRIPT_TAG = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037" crossorigin="anonymous"></script>\n';

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
    ADSENSE_SCRIPT_TAG +
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
    '<meta property="og:image" content="' + OG_IMAGE_URL + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:image" content="' + OG_IMAGE_URL + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="legal-page">\n' +
    renderHeader(GUIDES_DIR_LINKS) +
    '<p class="hero-copy"><a href="' + GUIDES_DIR_LINKS.homeHref + '">홈</a> &gt; <a href="' + GUIDES_DIR_LINKS.guidesHref + '">운세 가이드</a> &gt; ' + escapeHtml(guide.title) + '</p>\n' +
    '<section class="legal-section">\n' +
    '<h1>' + escapeHtml(guide.title) + '</h1>\n' +
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
    ADSENSE_SCRIPT_TAG +
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
    '<meta property="og:image" content="' + OG_IMAGE_URL + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:image" content="' + OG_IMAGE_URL + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '<link rel="stylesheet" href="../css/salon.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app" class="legal-page">\n' +
    renderHeader(GUIDES_DIR_LINKS) +
    '<p><a href="' + GUIDES_DIR_LINKS.homeHref + '">← 점집으로 돌아가기</a></p>\n' +
    '<section class="legal-section"><h1>운세 가이드</h1><p>' + escapeHtml(pageDescription) + '</p></section>\n' +
    sectionsHtml + '\n' +
    renderFooter(GUIDES_DIR_LINKS) +
    '</div>\n' +
    '</body>\n' +
    '</html>\n';
}

module.exports = { renderGuidePage, renderGuidesIndexPage, escapeHtml, GUIDES_DIR_LINKS };
