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

console.log('All tarot-data tests passed (' + deck.length + ' cards)');
