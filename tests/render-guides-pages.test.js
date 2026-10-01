const assert = require('assert');
const { GUIDES, GUIDE_CATEGORY_INTROS } = require('../data/guides-data.js');
const { renderGuidePage, renderGuidesIndexPage, escapeHtml } = require('../scripts/lib/render-guides-pages.js');

// Every guide page needs one primary heading identifying the page.
GUIDES.forEach(function (g) {
  const rendered = renderGuidePage(g, GUIDES.filter(function (other) { return other.category === g.category; }));
  const headings = [...rendered.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(function (match) { return match[1]; });
  assert.deepStrictEqual(headings, [escapeHtml(g.title)], g.slug + ' must have exactly one H1 with its title');
});

// what-is-tarot 카드 페이지 검증
const guide = GUIDES.find(function (g) { return g.slug === 'what-is-tarot'; });
const categoryGuides = GUIDES.filter(function (g) { return g.category === guide.category; });
const html = renderGuidePage(guide, categoryGuides);

assert.ok(html.startsWith('<!DOCTYPE html>'));
assert.ok(html.includes('<html lang="ko">'));
assert.ok(html.includes('<title>' + guide.title + ' | 운세 가이드 | 가만점방</title>'), 'title must include guide title');
const canonicalUrl = 'https://nwb010118.github.io/tarot-reading/guides/what-is-tarot.html';
assert.ok(html.includes('<link rel="canonical" href="' + canonicalUrl + '">'));
assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(guide.title + ' | 운세 가이드 | 가만점방') + '">'));
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
assert.ok(html.includes('>소개<'));
// 푸터 6링크
assert.ok(html.includes('href="../contact.html">문의하기'));
assert.ok(html.includes('href="../faq.html">자주 묻는 질문'));

// 목록 페이지 검증
const indexHtml = renderGuidesIndexPage(GUIDES);
assert.deepStrictEqual([...indexHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(function (match) { return match[1]; }), ['운세 가이드'], 'index must have exactly one H1 with its title');
assert.ok(indexHtml.includes('<h2>타로</h2>'), 'category heading must remain H2');
assert.ok(indexHtml.startsWith('<!DOCTYPE html>'));
const indexCanonical = 'https://nwb010118.github.io/tarot-reading/guides/index.html';
assert.ok(indexHtml.includes('<link rel="canonical" href="' + indexCanonical + '">'));
assert.ok(indexHtml.includes('타로'), 'index page must show the tarot category label');
assert.ok(indexHtml.includes('what-is-tarot.html'));
assert.ok(indexHtml.includes('how-to-ask-tarot.html'));
assert.ok(indexHtml.includes('<h2>별자리</h2>'), 'index must show the zodiac category');
assert.ok(indexHtml.includes('href="what-is-zodiac.html">12별자리 기본 가이드</a>'));
assert.ok(GUIDE_CATEGORY_INTROS.zodiac && GUIDE_CATEGORY_INTROS.zodiac.trim(), 'zodiac category must have an intro');
assert.ok(indexHtml.includes('<p>' + escapeHtml(GUIDE_CATEGORY_INTROS.zodiac) + '</p>'));

// 원고가 없는 카테고리는 필터링한 fixture로 검증한다.
const withoutZodiac = GUIDES.filter(function (g) { return g.category !== 'zodiac'; });
const filteredIndexHtml = renderGuidesIndexPage(withoutZodiac);
assert.ok(filteredIndexHtml.includes('<h2>타로</h2>'));
assert.ok(!filteredIndexHtml.includes('<h2>별자리</h2>'), 'category with zero guides must not render');
assert.ok(!filteredIndexHtml.includes('href="what-is-zodiac.html"'));

const zodiacGuide = GUIDES.find(function (g) { return g.slug === 'what-is-zodiac'; });
assert.ok(zodiacGuide, 'zodiac guide must exist');
const zodiacGuides = GUIDES.filter(function (g) { return g.category === 'zodiac'; });
assert.ok(zodiacGuides.length >= 1, 'zodiac category contains at least one guide');
const zodiacHtml = renderGuidePage(zodiacGuide, [zodiacGuide]);
assert.ok(!zodiacHtml.includes('같은 카테고리의 다른 가이드:'), 'single-guide category must omit sibling list');
assert.ok(!zodiacHtml.includes('href="what-is-zodiac.html"'), 'single guide must not link to itself');
assert.ok(zodiacHtml.includes('<a href="../index.html">가만점방 홈에서 직접 해보기 ↗</a>'), 'zodiac tool link must lead home');

console.log('render-guides-pages.test.js: all assertions passed');
