const assert = require('assert');
const { createRng, todayKey, getDeviceId, DEVICE_ID_KEY } = require('../js/seeded-random.js');

function take(rng, n) { const out = []; for (let i = 0; i < n; i += 1) out.push(rng()); return out; }

assert.deepStrictEqual(take(createRng(['a', 1, '2026-10-02']), 20), take(createRng(['a', 1, '2026-10-02']), 20));
assert.notDeepStrictEqual(take(createRng(['a', 1, '2026-10-02']), 5), take(createRng(['a', 1, '2026-10-03']), 5));
assert.notDeepStrictEqual(take(createRng(['ab', 'c']), 5), take(createRng(['a', 'bc']), 5), 'part boundaries must matter');
take(createRng(['x']), 2000).forEach(function (v) { assert.ok(v >= 0 && v < 1); });

const sample = take(createRng(['dist']), 4000);
const mean = sample.reduce(function (a, b) { return a + b; }, 0) / sample.length;
assert.ok(mean > 0.45 && mean < 0.55, 'roughly uniform, got ' + mean);

assert.strictEqual(todayKey(new Date(2026, 9, 2)), '2026-10-02');
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(todayKey()));

const store = {};
const fake = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = v; } };
const id1 = getDeviceId(fake);
assert.ok(id1.length > 5);
assert.strictEqual(store[DEVICE_ID_KEY], id1);
assert.strictEqual(getDeviceId(fake), id1);
assert.ok(getDeviceId(null).length > 5, 'works without storage');
const broken = { getItem: function () { throw new Error('blocked'); }, setItem: function () { throw new Error('blocked'); } };
assert.ok(getDeviceId(broken).length > 5, 'works with throwing storage');

console.log('seeded-random ok');
