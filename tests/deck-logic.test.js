const assert = require('assert');
const { drawCards } = require('../js/deck-logic.js');

function makeFakeRng(values) {
  let i = 0;
  return function () {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

const deck = [{ cardId: 'a' }, { cardId: 'b' }, { cardId: 'c' }];

// pool=[a,b,c]; pick index=floor(0.9*3)=2 -> 'c'; orientation rng=0.1 -> upright
// pool=[a,b];   pick index=floor(0.9*2)=1 -> 'b'; orientation rng=0.9 -> reversed
const rng = makeFakeRng([0.9, 0.1, 0.9, 0.9]);
const result = drawCards(deck, 2, rng);

assert.strictEqual(result.length, 2);
assert.strictEqual(result[0].card.cardId, 'c');
assert.strictEqual(result[0].orientation, 'upright');
assert.strictEqual(result[1].card.cardId, 'b');
assert.strictEqual(result[1].orientation, 'reversed');

const drawnIds = result.map(function (r) { return r.card.cardId; });
assert.strictEqual(new Set(drawnIds).size, drawnIds.length, 'No duplicate cards in a single draw');

console.log('All deck-logic tests passed');
