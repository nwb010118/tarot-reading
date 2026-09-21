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
