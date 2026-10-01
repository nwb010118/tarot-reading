const assert = require('assert');
const { buildShareHash, parseShareHash, wrapText } = require('../js/share-logic.js');

const ctx = {
  cardIds: new Set(['major_17', 'cups_2', 'wands_Ace']),
  categories: { love: '연애운', money: '재물운' },
  subchoices: { love: [{ key: 'solo' }, { key: 'couple' }] },
  periods: { today: '오늘', week: '이번주' },
  zodiacKeys: new Set(['aries', 'leo']),
  ddiKeys: new Set(['pig', 'rat'])
};

// 타로 왕복
const tarotParams = { kind: 'tarot', cards: 'major_17.u,wands_Ace.r', c: 'love', b: 'solo', p: 'week', d: '2026-10-02', k: 'ab12cd34' };
const hash = buildShareHash(tarotParams);
assert.ok(hash.startsWith('#share=tarot&'));
const parsed = parseShareHash(hash, ctx);
assert.deepStrictEqual(parsed.cards, [{ cardId: 'major_17', orientation: 'upright' }, { cardId: 'wands_Ace', orientation: 'reversed' }]);
assert.strictEqual(parsed.c, 'love'); assert.strictEqual(parsed.b, 'solo'); assert.strictEqual(parsed.p, 'week'); assert.strictEqual(parsed.k, 'ab12cd34');

// 별자리·띠·오늘의 한 장 왕복, 주제 없음 허용
let r = parseShareHash(buildShareHash({ kind: 'zodiac', z: 'leo', c: null, b: null, p: 'today', d: '2026-10-02' }), ctx);
assert.deepStrictEqual(r, { kind: 'zodiac', d: '2026-10-02', c: null, b: null, p: 'today', z: 'leo', v: '' });
r = parseShareHash(buildShareHash({ kind: 'ddi', a: 'pig', c: 'money', p: 'today', d: '2026-10-02' }), ctx);
assert.strictEqual(r.a, 'pig'); assert.strictEqual(r.c, 'money');
r = parseShareHash(buildShareHash({ kind: 'daily', k: 'dev123', d: '2026-10-02' }), ctx);
assert.deepStrictEqual(r, { kind: 'daily', d: '2026-10-02', k: 'dev123' });

// 거부해야 하는 입력
const bad = [
  '', '#', '#share=saju&d=2026-10-02', '#share=zodiac&z=leo&p=today',
  '#share=zodiac&z=leo&p=today&d=2026-1-2', '#share=zodiac&z=nope&p=today&d=2026-10-02',
  '#share=zodiac&z=leo&p=forever&d=2026-10-02', '#share=zodiac&z=leo&p=today&d=2026-10-02&c=hack',
  '#share=zodiac&z=leo&p=today&d=2026-10-02&c=money&b=solo',
  '#share=tarot&cards=major_17.x&p=today&d=2026-10-02&k=ab',
  '#share=tarot&cards=nope.u&p=today&d=2026-10-02&k=ab',
  '#share=tarot&cards=major_17.u,major_17.u,major_17.u,major_17.u&p=today&d=2026-10-02&k=ab',
  '#share=tarot&cards=major_17.u&p=today&d=2026-10-02&k=<script>',
  '#share=daily&d=2026-10-02', '#share=daily&k=a%20b&d=2026-10-02'
];
bad.forEach(function (h) { assert.strictEqual(parseShareHash(h, ctx), null, 'should reject: ' + h); });

// wrapText
const measure = function (t) { return Array.from(t).length * 10; };
assert.deepStrictEqual(wrapText(measure, '가나다라마바사아', 40, 5), ['가나다라', '마바사아']);
assert.deepStrictEqual(wrapText(measure, '', 40, 3), []);
const clipped = wrapText(measure, '가나다라마바사아자차카타파하', 40, 2);
assert.strictEqual(clipped.length, 2);
assert.ok(clipped[1].endsWith('…') && measure(clipped[1]) <= 40);
assert.deepStrictEqual(wrapText(measure, '짧은 글', 100, 3), ['짧은 글']);
// 변주 값 v: 있으면 돌려주고, 없으면 예전 링크로 보고 빈 문자열, 이상한 값은 거부
r = parseShareHash(buildShareHash({ kind: 'zodiac', z: 'leo', p: 'today', d: '2026-10-02', v: 'a1b2' }), ctx);
assert.strictEqual(r.v, 'a1b2');
r = parseShareHash('#share=zodiac&z=leo&p=today&d=2026-10-02', ctx);
assert.strictEqual(r.v, '', 'legacy link has empty variant');
r = parseShareHash(buildShareHash({ kind: 'ddi', a: 'pig', p: 'today', d: '2026-10-02', v: 'zz9' }), ctx);
assert.strictEqual(r.v, 'zz9');
assert.strictEqual(parseShareHash('#share=zodiac&z=leo&p=today&d=2026-10-02&v=a%20b', ctx), null);
assert.strictEqual(parseShareHash('#share=zodiac&z=leo&p=today&d=2026-10-02&v=<x>', ctx), null);

console.log('share-logic ok');
