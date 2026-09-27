const assert = require('assert');
const { GUIDES } = require('../data/guides-data.js');
const { splitSentences, wordJaccard, trigramJaccard } = require('./helpers/dedup.js');

const WORD_TH = 0.3;
const OPEN_WORD_TH = 0.20;
const OPEN_TRI_TH = 0.15;

function bodyToText(guide) {
  return guide.bodyHtml.join(' ').replace(/<[^>]+>/g, ' ');
}

const docs = GUIDES.map(function (g) {
  return { slug: g.slug, sentences: splitSentences(bodyToText(g)).filter(function (s) { return s.trim().length > 8; }) };
});

const issues = [];
for (let i = 0; i < docs.length; i++) {
  for (let j = i + 1; j < docs.length; j++) {
    for (const s1 of docs[i].sentences) {
      for (const s2 of docs[j].sentences) {
        const wj = wordJaccard(s1, s2);
        const tj = trigramJaccard(s1, s2);
        const flagged = wj >= WORD_TH || (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH);
        if (flagged) {
          issues.push(docs[i].slug + ' <-> ' + docs[j].slug + '\n  A: ' + s1 + '\n  B: ' + s2 + '\n  word=' + wj.toFixed(2) + ' tri=' + tj.toFixed(2));
        }
      }
    }
  }
}

assert.strictEqual(issues.length, 0, '가이드 사이에 유사도 높은 문장이 있습니다:\n' + issues.join('\n\n'));

console.log('guides-data.test.js: all assertions passed (' + GUIDES.length + ' guides, ' + docs.reduce(function (n, d) { return n + d.sentences.length; }, 0) + ' sentences compared pairwise)');
