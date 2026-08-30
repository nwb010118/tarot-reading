const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');

const deck = getFullDeck();

assert.strictEqual(deck.length, 78, 'Expected 78 cards, got ' + deck.length);

const ids = new Set(deck.map(function (c) { return c.cardId; }));
assert.strictEqual(ids.size, 78, 'Card IDs must be unique');

deck.forEach(function (card) {
  assert.ok(card.name, 'Card ' + card.cardId + ' missing name');
  assert.ok(card.upright, 'Card ' + card.cardId + ' missing upright text');
  assert.ok(card.reversed, 'Card ' + card.cardId + ' missing reversed text');
  assert.ok(card.image.indexOf('images/') === 0, 'Card ' + card.cardId + ' has bad image path: ' + card.image);
});

deck.forEach(function (card) {
  const imagePath = path.join(__dirname, '..', card.image);
  assert.ok(fs.existsSync(imagePath), 'Card ' + card.cardId + ' image file missing: ' + card.image);
});

// Test that major arcana "The" prefix is stripped from filenames
const majorCards = deck.filter(function (c) { return c.type === 'major'; });
const foolCard = majorCards.find(function (c) { return c.cardId === 'major_0'; });
assert.strictEqual(foolCard.image, 'images/RWS_Tarot_00_Fool.jpg', 'The Fool should have "The" stripped');

const worldCard = majorCards.find(function (c) { return c.cardId === 'major_21'; });
assert.strictEqual(worldCard.image, 'images/RWS_Tarot_21_World.jpg', 'The World should have "The" stripped');

const hanggedManCard = majorCards.find(function (c) { return c.cardId === 'major_12'; });
assert.strictEqual(hanggedManCard.image, 'images/RWS_Tarot_12_Hanged_Man.jpg', 'The Hanged Man should have "The" stripped');

const strengthCard = majorCards.find(function (c) { return c.cardId === 'major_8'; });
assert.strictEqual(strengthCard.image, 'images/RWS_Tarot_08_Strength.jpg', 'Strength (no "The") should be unchanged');

// 카드당 부가정보(keywords/advice)와 세분화 카테고리 구조 검증
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    assert.ok(card.keywords && Array.isArray(card.keywords[o]) && card.keywords[o].length === 3,
      card.name + ' keywords.' + o + ' must be an array of exactly 3 items');
    assert.ok(card.advice && typeof card.advice[o] === 'string' && card.advice[o].length > 0,
      card.name + ' advice.' + o + ' must be a non-empty string');
  });

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      assert.ok(entry && typeof entry === 'object', card.name + ' categories.' + cat + '.' + o + ' must be an object');
      assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[0] + ' must be a non-empty string');
      assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[1] + ' must be a non-empty string');
      assert.notStrictEqual(entry[keys[0]], entry[keys[1]], card.name + ' categories.' + cat + '.' + o + ' sub-choices must not be identical');
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      assert.ok(typeof card.categories[cat][o] === 'string' && card.categories[cat][o].length > 0,
        card.name + ' categories.' + cat + '.' + o + ' must be a non-empty string');
    });
  });
});

console.log('All 78 cards have valid keywords/advice/subdivided-category structure');

console.log('All tarot-data tests passed (' + deck.length + ' cards)');
