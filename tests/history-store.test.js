const assert = require('assert');
const { getHistory, saveReading, deleteReading, clearHistory } = require('../js/history-store.js');

function makeFakeStorage() {
  const store = {};
  return {
    getItem: function (key) { return key in store ? store[key] : null; },
    setItem: function (key, value) { store[key] = value; }
  };
}

const storage = makeFakeStorage();

assert.deepStrictEqual(getHistory(storage), [], 'Empty history should be an empty array');

const entry1 = { date: '2026-08-19T10:00:00.000Z', question: 'Q1', spreadType: '1', cards: [{ name: '바보', orientation: 'upright' }] };
saveReading(storage, entry1);
let history = getHistory(storage);
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].question, 'Q1');

const entry2 = { date: '2026-08-19T11:00:00.000Z', question: 'Q2', spreadType: '3', cards: [] };
saveReading(storage, entry2);
history = getHistory(storage);
assert.strictEqual(history.length, 2);
assert.strictEqual(history[0].question, 'Q2', 'Newest reading should be first');

deleteReading(storage, 1);
history = getHistory(storage);
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].question, 'Q2');

clearHistory(storage);
assert.deepStrictEqual(getHistory(storage), []);

console.log('All history-store tests passed');
