const assert = require('assert');
const { VOICE, getVoiceLine, getOutroKind } = require('../data/voice.js');
const { createRng } = require('../js/seeded-random.js');
const { wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const FORBIDDEN = ['반드시', '무조건', '확실', '틀림없', '예언', '절대', '100%'];
const JAPANESE = /[぀-ヿ]/;
const ENDING = /(요|다)\.$/;

const all = [];
Object.keys(VOICE).forEach(function (kind) {
  assert.ok(VOICE[kind].length >= 3, kind + ' needs variants');
  VOICE[kind].forEach(function (line) {
    assert.ok(ENDING.test(line), kind + ' calm polite ending: ' + line);
    assert.ok(line.length <= 40, kind + ' short enough: ' + line);
    assert.ok(!JAPANESE.test(line), 'no Japanese characters: ' + line);
    FORBIDDEN.forEach(function (word) { assert.ok(line.indexOf(word) === -1, 'no absolute claim "' + word + '": ' + line); });
    all.push(line);
  });
});

assert.strictEqual(new Set(all).size, all.length, 'no duplicate lines');
for (let i = 0; i < all.length; i += 1) {
  for (let j = i + 1; j < all.length; j += 1) {
    const w = wordJaccard(all[i], all[j]);
    const t = trigramJaccard(all[i], all[j]);
    assert.ok(!(w >= 0.5 || (w >= 0.34 && t >= 0.25)), 'too similar: ' + all[i] + ' / ' + all[j]);
  }
}

// 결정성과 분기
assert.strictEqual(getVoiceLine('tarot', createRng(['a'])), getVoiceLine('tarot', createRng(['a'])));
const seen = new Set();
for (let i = 0; i < 40; i += 1) seen.add(getVoiceLine('outro', createRng(['k', i])));
assert.ok(seen.size > 1, 'different seeds reach different lines');
assert.strictEqual(getOutroKind('health', 'body'), 'outroHealth');
assert.strictEqual(getOutroKind('money', 'invest'), 'outroInvest');
assert.strictEqual(getOutroKind('money', 'income'), 'outro');
assert.strictEqual(getOutroKind(null, null), 'outro');
assert.strictEqual(getOutroKind('love', 'solo'), 'outro');

console.log('voice ok (' + all.length + ' lines)');
