// 3카드 틀 문구(data/tarot-threecard.js) 검사: 구성 빠짐없음, 금지 표현, 문장 유사도, 이야기 틀 자리표시자.
const assert = require('assert');
const { THREECARD_POSITIONS, THREECARD_FRAMES, THREECARD_STORY, THREECARD_PATTERN } = require('../data/tarot-threecard.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

assert.deepStrictEqual(THREECARD_POSITIONS.map(function (p) { return p.key; }), ['past', 'present', 'future']);

const entries = [];
THREECARD_POSITIONS.forEach(function (p) {
  assert.ok(THREECARD_FRAMES[p.key].length >= 3, p.key + ' needs 3+ frames');
  THREECARD_FRAMES[p.key].forEach(function (t, i) { entries.push({ where: 'frame.' + p.key + '.' + i, text: t }); });
});
assert.ok(THREECARD_STORY.length >= 3);
THREECARD_STORY.forEach(function (t, i) {
  ['{a}', '{b}', '{c}'].forEach(function (slot) { assert.ok(t.indexOf(slot) !== -1, 'story.' + i + ' missing ' + slot); });
  entries.push({ where: 'story.' + i, text: t.replace(/\{[abc]\}/g, '') });
});
['u', 'r'].forEach(function (x) {
  ['u', 'r'].forEach(function (y) {
    ['u', 'r'].forEach(function (z) {
      const key = x + y + z;
      assert.ok(THREECARD_PATTERN[key] && THREECARD_PATTERN[key].length >= 2, 'pattern ' + key + ' needs 2+ sentences');
      THREECARD_PATTERN[key].forEach(function (t, i) { entries.push({ where: 'pattern.' + key + '.' + i, text: t }); });
    });
  });
});

const problems = [];
entries.forEach(function (e) {
  findBannedPhrases(e.text).forEach(function (p) { problems.push(e.where + ' banned phrase: ' + p); });
  if (/[぀-ヿ]/.test(e.text)) problems.push(e.where + ' has Japanese kana');
  if (/[A-Za-z0-9]/.test(e.text)) problems.push(e.where + ' has latin letters or digits');
});
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    const wj = wordJaccard(a.text, b.text), tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.4 || tj >= 0.35) problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('OK tarot-threecard: ' + entries.length + ' texts');
