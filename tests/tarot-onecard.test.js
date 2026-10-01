// 원카드 타로 보강 문구(data/tarot-onecard-*.js) 검사: 빠짐없음, 분량, 금지 표현, 문장 유사도.
// ONLY=wands 처럼 환경변수를 주면 그 슈트 파일만 검사한다(작성 중 확인용).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('../data/tarot-data.js');
const { findBannedPhrases } = require('./helpers/banned-phrases.js');
const { splitSentences, wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const SUITS = ['major', 'wands', 'cups', 'swords', 'pentacles'];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const DEEPEN = { min: 70, max: 130, sentences: [1, 3] };
const ACTION = { min: 105, max: 175, sentences: [2, 5] };

const deck = getFullDeck();
const problems = [];
const entries = [];

SUITS.forEach(function (suit) {
  if (only && only.indexOf(suit) === -1) return;
  const file = path.join(__dirname, '..', 'data', 'tarot-onecard-' + suit + '.js');
  if (!fs.existsSync(file)) { problems.push('missing file: ' + file); return; }
  const mod = require(file);
  const data = mod[Object.keys(mod)[0]];
  const cards = deck.filter(function (c) { return c.cardId.split('_')[0] === suit; });
  assert.strictEqual(Object.keys(data).length, cards.length, suit + ': card count');
  cards.forEach(function (card) {
    ['upright', 'reversed'].forEach(function (o) {
      const cell = data[card.cardId] && data[card.cardId][o];
      if (!cell) { problems.push('missing ' + card.cardId + '.' + o); return; }
      [['deepen', DEEPEN], ['action', ACTION]].forEach(function (pair) {
        const field = pair[0], spec = pair[1];
        const text = cell[field];
        const where = card.cardId + '.' + o + '.' + field;
        if (typeof text !== 'string') { problems.push('missing ' + where); return; }
        const len = text.length;
        if (len < spec.min || len > spec.max) problems.push(where + ' length ' + len + ' (' + spec.min + '~' + spec.max + ')');
        const ns = splitSentences(text).length;
        if (ns < spec.sentences[0] || ns > spec.sentences[1]) problems.push(where + ' sentences ' + ns);
        if (!/[.!?]$/.test(text)) problems.push(where + ' must end with terminal punctuation');
        if (/[぀-ヿ]/.test(text)) problems.push(where + ' contains Japanese kana');
        if (/[A-Za-z0-9]/.test(text)) problems.push(where + ' contains latin letters or digits');
        findBannedPhrases(text).forEach(function (p) { problems.push(where + ' banned phrase: ' + p); });
        entries.push({ where: where, field: field, text: text, card: card, o: o });
      });
    });
  });
});

// 같은 칸 안의 전체 쌍 비교(단어 + 글자 3-gram)
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.field !== b.field) continue;
    const wj = wordJaccard(a.text, b.text);
    const tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.3 || (wj >= 0.2 && tj >= 0.15) || tj >= 0.3) {
      problems.push('similar ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
    }
  }
}

// 문장 단위 비교(deepen과 action을 모두 포함): 뼈대만 공유하는 문장 잡기
const sentences = [];
entries.forEach(function (e) {
  splitSentences(e.text).forEach(function (s) { sentences.push({ where: e.where, text: s }); });
});
for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < sentences.length; j++) {
    const a = sentences[i], b = sentences[j];
    if (a.where === b.where) continue;
    const wj = wordJaccard(a.text, b.text);
    const tj = trigramJaccard(a.text, b.text);
    if (wj >= 0.5 || tj >= 0.4) problems.push('similar sentence ' + a.where + ' ~ ' + b.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2) + ' | ' + a.text + ' | ' + b.text);
  }
}

// 같은 카드의 기존 문장(해석 a/b, 조언)과의 중복: 한 화면에 함께 나오는 글이다
entries.forEach(function (e) {
  const base = e.card[e.o];
  const advice = e.card.advice[e.o];
  const pool = [].concat(base.a, base.b, advice);
  pool.forEach(function (s) {
    const wj = wordJaccard(e.text, s);
    const tj = trigramJaccard(e.text, s);
    if (wj >= 0.3 || tj >= 0.3) problems.push('echoes existing text ' + e.where + ' word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2) + ' | ' + s);
    splitSentences(e.text).forEach(function (sent) {
      if (wordJaccard(sent, s) >= 0.5 || trigramJaccard(sent, s) >= 0.4) problems.push('sentence echoes existing ' + e.where + ' | ' + sent + ' | ' + s);
    });
  });
});

// 화면에서 쓰는 조합 중 150~200자 범위에 드는 해석 후보가 모든 카드·방향에 있어야 한다
entries.filter(function (e) { return e.field === 'deepen'; }).forEach(function (e) {
  const base = e.card[e.o];
  const candidates = [];
  base.a.forEach(function (a) {
    base.b.forEach(function (b) { candidates.push(a + ' ' + b + ' ' + e.text); });
    candidates.push(a + ' ' + e.text);
  });
  if (!candidates.some(function (t) { return t.length >= 150 && t.length <= 200; })) {
    problems.push('no 150~200 interpretation candidate for ' + e.where);
  }
});

// 주제를 고르지 않았을 때(카드 조언 + 보강 조언)도 150~200자 후보가 있어야 한다
entries.filter(function (e) { return e.field === 'action'; }).forEach(function (e) {
  const candidates = e.card.advice[e.o].map(function (a) { return a + ' ' + e.text; });
  if (!candidates.some(function (t) { return t.length >= 150 && t.length <= 200; })) {
    problems.push('no 150~200 advice candidate (no category) for ' + e.where);
  }
});

if (problems.length) {
  console.error(problems.length + ' problems:\n' + problems.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('OK tarot-onecard: ' + entries.length + ' texts' + (only ? ' (' + only.join(',') + ')' : ''));
