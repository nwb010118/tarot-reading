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

// ---------------------------------------------------------------------------
// Regression tests for the sentence-level "skeleton collision" blind spot
// (Task 17 final review). The old field-level n-gram audit tools compare
// whole category-field strings and miss a collision when two fields share
// sentence 1 but differ in sentence 2 (or vice versa) -- the differing
// sentence dilutes the whole-field similarity score below threshold. These
// tests operate sentence-by-sentence instead, so this failure mode can't
// silently recur for this suit or for future modes (사주/별자리/띠운세/궁합)
// that reuse this category-field pattern.
// ---------------------------------------------------------------------------

function isLockedCard(card) {
  return card.cardId === 'major_0' || /_Ace$/.test(card.cardId);
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

// Test: every non-locked card's subdivided+single category field (both
// orientations) has exactly 2 or 3 sentences.
deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      keys.forEach(function (key) {
        const text = card.categories[cat][o][key];
        const count = splitSentences(text).length;
        assert.ok(count === 2 || count === 3,
          card.name + ' categories.' + cat + '.' + o + '.' + key + ' must have 2 or 3 sentences, got ' + count);
      });
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      const text = card.categories[cat][o];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        card.name + ' categories.' + cat + '.' + o + ' must have 2 or 3 sentences, got ' + count);
    });
  });
});

console.log('All non-locked cards have 2-3 sentence category fields');

// Test: on any single card, love/relationships, career/workplace, and
// money/business must never share an opening sentence or skeleton in any
// of their 4 subkey combinations (sentence-level word-Jaccard >= 0.3),
// independent of any whole-field similarity threshold.
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  ['upright', 'reversed'].forEach(function (o) {
    FORBIDDEN_PAIRS.forEach(function (pair) {
      const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
      subsA.forEach(function (subA) {
        subsB.forEach(function (subB) {
          const textA = card.categories[catA][o][subA];
          const textB = card.categories[catB][o][subB];
          splitSentences(textA).forEach(function (sentA) {
            splitSentences(textB).forEach(function (sentB) {
              const sim = wordJaccard(sentA, sentB);
              if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
                collisions.push(card.name + ' ' + o + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                  ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
              }
            });
          });
        });
      });
    });
  });
});

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' forbidden-pair sentence-level collisions:\n' + collisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

console.log('All tarot-data tests passed (' + deck.length + ' cards)');
