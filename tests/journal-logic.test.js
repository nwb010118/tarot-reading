const assert = require('assert');
const { dueDateFor, addDays, getDueEntries, recordVisit, getStreak, PROMISE_REPLIES } = require('../js/journal-logic.js');
const { saveReading, updateReading, getHistory } = require('../js/history-store.js');

function fakeStorage() {
  const store = {};
  return { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
}

assert.strictEqual(dueDateFor('today', '2026-10-02'), '2026-10-03');
assert.strictEqual(dueDateFor('week', '2026-10-02'), '2026-10-09');
assert.strictEqual(dueDateFor('month', '2026-10-02'), '2026-11-01');
assert.strictEqual(dueDateFor('year', '2026-10-02'), '2027-10-02');
assert.strictEqual(dueDateFor('unknown', '2026-10-02'), '2026-10-03');
assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
assert.strictEqual(addDays('2026-03-01', -1), '2026-02-28');

const history = [
  { id: 'a', promise: { status: 'pending', dueDate: '2026-10-01' } },
  { id: 'b', promise: { status: 'done', dueDate: '2026-09-01' } },
  { id: 'c', promise: { status: 'pending', dueDate: '2026-10-05' } },
  { id: 'd' },
  { id: 'e', promise: { status: 'pending', dueDate: '2026-10-02' } }
];
assert.deepStrictEqual(getDueEntries(history, '2026-10-02').map(e => e.id), ['a', 'e']);
assert.strictEqual(getDueEntries(history, '2026-10-02', 1).length, 1);

const visits = fakeStorage();
assert.strictEqual(getStreak(visits, '2026-10-02'), 0);
['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-02'].forEach(d => recordVisit(visits, d));
assert.strictEqual(getStreak(visits, '2026-10-02'), 3);
assert.strictEqual(getStreak(visits, '2026-10-04'), 0, 'gap breaks the streak');
recordVisit(visits, '2026-10-04');
assert.strictEqual(getStreak(visits, '2026-10-04'), 1);
assert.strictEqual(getStreak(null, '2026-10-02'), 0);
recordVisit(null, '2026-10-02');
for (let i = 0; i < 100; i += 1) recordVisit(visits, addDays('2026-11-01', i));
assert.ok(JSON.parse(visits.getItem('jeomjip_visits')).length <= 60);

const store = fakeStorage();
saveReading(store, { date: 'x', cards: [] });
const id = getHistory(store)[0].id;
assert.ok(id, 'saveReading assigns an id');
updateReading(store, id, { promise: { text: '산책', status: 'pending', dueDate: '2026-10-03' } });
assert.strictEqual(getHistory(store)[0].promise.text, '산책');
updateReading(store, 'missing', { promise: null });
assert.strictEqual(getHistory(store).length, 1);
['done', 'partial', 'skipped'].forEach(k => assert.ok(PROMISE_REPLIES[k].length > 5));
console.log('journal-logic ok');
