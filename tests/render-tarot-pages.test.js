const assert = require('assert');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel } = require('../scripts/lib/tarot-page-data.js');
const { renderCardPage, renderHubPage, escapeHtml } = require('../scripts/lib/render-tarot-pages.js');

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
assert.ok(html.includes('<link rel="canonical" href="' + vm.canonicalUrl + '">'), 'canonical link must use vm.canonicalUrl');
assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(vm.title) + '">'), 'og:title must match escaped vm.title');
assert.ok(html.includes('<meta property="og:description" content="' + escapeHtml(vm.description) + '">'), 'og:description must match escaped vm.description');
assert.ok(html.includes('<meta property="og:url" content="' + vm.canonicalUrl + '">'), 'og:url must match vm.canonicalUrl');
assert.ok(html.includes('<meta property="og:type" content="website">'));
assert.ok(html.includes('<h1>태양 (The Sun)</h1>'), 'h1 must show card name');
assert.ok(html.includes('../images/RWS_Tarot_19_Sun.jpg'), 'image src must be relative (../images/...)');
assert.ok(html.includes('href="../index.html">홈'), 'nav must link home via ../index.html');
assert.ok(html.includes('href="index.html">타로 카드 백과사전'), 'nav must link the hub via the same-directory index.html, not a roundabout ../tarot/index.html');
assert.ok(html.includes('href="../about.html">About'), 'nav must link about via ../about.html');
assert.ok(html.includes('major-18-moon.html'), 'prev link present');
assert.ok(html.includes('major-20-judgement.html'), 'next link present');
assert.ok(html.includes('href="../contact.html">문의하기'), 'footer must link contact.html');
assert.ok(html.includes('href="../faq.html">자주 묻는 질문'), 'footer must link faq.html');
assert.ok(!html.includes('undefined'), 'no stray undefined in output');
assert.ok(!/^\//m.test(html.replace(/<!DOCTYPE html>/, '')) || true); // 절대경로(href="/...") 금지: 아래 정규식으로 별도 검증
assert.ok(!/href="\/[^/]/.test(html), 'must not contain a root-absolute href="/..."');

// 카테고리 11개(19블록) 텍스트가 실제로 본문에 존재하는지 표본 확인
assert.ok(html.includes(vm.upright.categories[0].items[0].text), 'first upright category text must render');
assert.ok(html.includes(vm.reversed.categories[0].items[0].text), 'first reversed category text must render');

// 허브 페이지
const hubCanonicalUrl = 'https://nwb010118.github.io/tarot-reading/tarot/index.html';
const hubHtml = renderHubPage(deck.map(buildCardViewModel), hubCanonicalUrl);
assert.ok(hubHtml.includes('메이저 아르카나'));
assert.ok(hubHtml.includes('완드'));
assert.ok(hubHtml.includes('major-19-sun.html'));
assert.ok(hubHtml.includes('wands-ace.html'));
assert.ok(!/href="\/[^/]/.test(hubHtml), 'hub must not contain a root-absolute href="/..."');
assert.ok(hubHtml.includes('<link rel="canonical" href="' + hubCanonicalUrl + '">'));
assert.ok(hubHtml.includes('<meta property="og:url" content="' + hubCanonicalUrl + '">'));

console.log('render-tarot-pages.test.js: all assertions passed');
