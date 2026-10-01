const assert = require('assert');
const fs = require('fs');
const path = require('path');
const modulePath = path.join(__dirname, '../data/reading-guidance.js');
assert.ok(fs.existsSync(modulePath), 'shared reading guidance must exist');
const { getPracticePlan, getSensitiveReading, getSensitiveReflections } = require(modulePath);
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const periods = ['today', 'week', 'month', 'month3', 'month6', 'year'];
const actions = periods.map(period => getPracticePlan(period, 'love').schedule);
assert.strictEqual(new Set(actions).size, periods.length, 'periods must change the action, not just a prefix');
assert.notStrictEqual(getPracticePlan('week', 'love').focus, getPracticePlan('week', 'career').focus);
assert.deepStrictEqual(getPracticePlan('bad', null), getPracticePlan('today', null));
assert.strictEqual(getSensitiveReading('love', 'solo', []), null);
assert.strictEqual(getSensitiveReading('money', 'income', []), null, 'preserve income content');
['body', 'mind'].forEach(choice => assert.ok(getSensitiveReading('health', choice, ['회복']).includes('예측하지')));
assert.ok(getSensitiveReading('money', 'invest', ['협력']).includes('협력'));
assert.ok(getSensitiveReading('money', 'invest', []).includes('수익'));
// 안전 문구 뒤에 붙는 자기성찰 문장: 민감 주제에만 있고, 예측·단정·상투어가 없으며 길이가 다양해 규격 길이에 맞출 수 있다
assert.strictEqual(getSensitiveReflections('love', 'solo'), null);
assert.strictEqual(getSensitiveReflections('money', 'income'), null);
[['health', 'body'], ['health', 'mind'], ['money', 'invest']].forEach(function (c) {
  const list = getSensitiveReflections(c[0], c[1]);
  assert.ok(list.length >= 5, c.join('/') + ' has several lengths');
  const lens = list.map(function (t) { return t.length; });
  assert.ok(Math.min.apply(null, lens) <= 40 && Math.max.apply(null, lens) >= 120, c.join('/') + ' length spread: ' + lens);
  list.forEach(function (t) {
    assert.deepStrictEqual(findBannedPhrases(t), [], 'banned phrase in: ' + t);
    assert.ok(!/(것입니다|될 것|하게 됩니다)/.test(t), 'no prediction wording: ' + t);
    assert.ok(!/[A-Za-z0-9]/.test(t) && !/[぀-ヿ]/.test(t), 'no latin/digits/kana: ' + t);
  });
});
console.log('reading guidance: periods, topic actions, and sensitive categories passed');
