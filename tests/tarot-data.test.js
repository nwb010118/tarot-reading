const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const {
  splitSentences, wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const deck = getFullDeck();

// ---------------------------------------------------------------------------
// 구조 검증 (기존 검사 유지 + upright/reversed/keywords/advice만 새 shape로 갱신)
// ---------------------------------------------------------------------------

assert.strictEqual(deck.length, 78, 'Expected 78 cards, got ' + deck.length);

const ids = new Set(deck.map(function (c) { return c.cardId; }));
assert.strictEqual(ids.size, 78, 'Card IDs must be unique');

function assertPool(field, label) {
  assert.ok(field && typeof field === 'object' && !Array.isArray(field), label + ' must be an {a,b} object');
  ['a', 'b'].forEach(function (slot) {
    assert.ok(Array.isArray(field[slot]) && field[slot].length === 3, label + '.' + slot + ' must be an array of exactly 3 strings');
    field[slot].forEach(function (s, i) {
      assert.ok(typeof s === 'string' && s.length > 0, label + '.' + slot + '[' + i + '] must be a non-empty string');
    });
  });
}

deck.forEach(function (card) {
  assert.ok(card.name, 'Card ' + card.cardId + ' missing name');
  assertPool(card.upright, card.name + '.upright');
  assertPool(card.reversed, card.name + '.reversed');
  assert.ok(card.image.indexOf('images/') === 0, 'Card ' + card.cardId + ' has bad image path: ' + card.image);
});

deck.forEach(function (card) {
  const imagePath = path.join(__dirname, '..', card.image);
  assert.ok(fs.existsSync(imagePath), 'Card ' + card.cardId + ' image file missing: ' + card.image);
});

// Test that major arcana "The" prefix is stripped from filenames (기존 검사 유지)
const majorCards = deck.filter(function (c) { return c.type === 'major'; });
const foolCard = majorCards.find(function (c) { return c.cardId === 'major_0'; });
assert.strictEqual(foolCard.image, 'images/RWS_Tarot_00_Fool.jpg', 'The Fool should have "The" stripped');

const worldCard = majorCards.find(function (c) { return c.cardId === 'major_21'; });
assert.strictEqual(worldCard.image, 'images/RWS_Tarot_21_World.jpg', 'The World should have "The" stripped');

const hanggedManCard = majorCards.find(function (c) { return c.cardId === 'major_12'; });
assert.strictEqual(hanggedManCard.image, 'images/RWS_Tarot_12_Hanged_Man.jpg', 'The Hanged Man should have "The" stripped');

const strengthCard = majorCards.find(function (c) { return c.cardId === 'major_8'; });
assert.strictEqual(strengthCard.image, 'images/RWS_Tarot_08_Strength.jpg', 'Strength (no "The") should be unchanged');

// 카드당 부가정보(keywords/advice, 새 pool shape)와 세분화 카테고리 구조 검증(기존 검사 유지)
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    assert.ok(Array.isArray(card.keywords[o]) && card.keywords[o].length === 6,
      card.name + ' keywords.' + o + ' must be an array of exactly 6 items');
    assert.strictEqual(new Set(card.keywords[o]).size, 6, card.name + ' keywords.' + o + ' must all be distinct');
    assert.ok(Array.isArray(card.advice[o]) && card.advice[o].length === 3,
      card.name + ' advice.' + o + ' must be an array of exactly 3 items');
  });

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      assert.ok(entry && typeof entry === 'object', card.name + ' categories.' + cat + '.' + o + ' must be an object');
      assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[0] + ' must be a non-empty string');
      assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[1] + ' must be a non-empty string');
      assert.notStrictEqual(entry[keys[0]], entry[keys[1]], card.name + ' categories.' + cat + '.' + o + ' sub-choices must not be identical');
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      assert.ok(typeof card.categories[cat][o] === 'string' && card.categories[cat][o].length > 0,
        card.name + ' categories.' + cat + '.' + o + ' must be a non-empty string');
    });
  });
});

console.log('All 78 cards have valid a/b pool structure for upright/reversed, 6 keywords, 3 advice variants per orientation, valid images, and untouched category structure');

// ---------------------------------------------------------------------------
// Regression tests for the sentence-level "skeleton collision" blind spot
// (기존 검사 유지 그대로 — categories는 이번 플랜에서 변경하지 않으므로 영향 없음)
// ---------------------------------------------------------------------------

function isLockedCard(card) {
  return card.cardId === 'major_0' || /_Ace$/.test(card.cardId);
}

deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      keys.forEach(function (key) {
        const text = card.categories[cat][o][key];
        const count = splitSentences(text).length;
        assert.ok(count === 2 || count === 3,
          card.name + ' categories.' + cat + '.' + o + '.' + key + ' must have 2 or 3 sentences, got ' + count);
      });
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      const text = card.categories[cat][o];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        card.name + ' categories.' + cat + '.' + o + ' must have 2 or 3 sentences, got ' + count);
    });
  });
});

console.log('All non-locked cards have 2-3 sentence category fields');

// Test: on any single card, love/relationships, career/workplace, and
// money/business must never share an opening sentence or skeleton
// (기존 검사 유지 그대로)
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const forbiddenPairCollisions = [];
deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  ['upright', 'reversed'].forEach(function (o) {
    FORBIDDEN_PAIRS.forEach(function (pair) {
      const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
      subsA.forEach(function (subA) {
        subsB.forEach(function (subB) {
          const textA = card.categories[catA][o][subA];
          const textB = card.categories[catB][o][subB];
          splitSentences(textA).forEach(function (sentA) {
            splitSentences(textB).forEach(function (sentB) {
              const sim = wordJaccard(sentA, sentB);
              if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
                forbiddenPairCollisions.push(card.name + ' ' + o + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                  ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
              }
            });
          });
        });
      });
    });
  });
});

assert.strictEqual(forbiddenPairCollisions.length, 0,
  'Found ' + forbiddenPairCollisions.length + ' forbidden-pair sentence-level collisions:\n' + forbiddenPairCollisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

// ---------------------------------------------------------------------------
// 중복 검사 (이번 프로젝트 신규 축 — upright/reversed/keywords/advice pool 대상)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15, LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10, NEARVERBATIM_LCS_TH = 20;

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }

function fullCombinedIssues(s1, s2, keywords) {
  const issues = [];
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) issues.push('word=' + wj.toFixed(2));
  const tj = trigramJaccard(s1, s2);
  if (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH) issues.push('word+tri=' + wj.toFixed(2) + '/' + tj.toFixed(2));
  const kw1 = stripOwnKeywords(s1, keywords), kw2 = stripOwnKeywords(s2, keywords);
  const t1 = stripBoilerplateSuffix(kw1), t2 = stripBoilerplateSuffix(kw2);
  const lcs = longestCommonSubstring(t1, t2);
  const bj = bigramJaccard(t1, t2);
  const st1 = significantStems(s1, keywords), st2 = significantStems(s2, keywords);
  const shared = [...new Set(st1.filter(function (x) { return st2.indexOf(x) !== -1; }))];
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  return issues;
}

function collectCategoryTexts(card, orientation) {
  const texts = [];
  Object.keys(card.categories).forEach(function (cat) {
    const v = card.categories[cat][orientation];
    if (typeof v === 'string') texts.push(v);
    else Object.keys(v).forEach(function (k) { texts.push(v[k]); });
  });
  return texts;
}

// axis 1: 필드 내부 자기중복, axis 2: advice 자기중복, axis 3: echo, axis 5: keyword 자기 echo
const withinCardIssues = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    const keywords = card.keywords[dir];

    ['a', 'b'].forEach(function (slot) {
      const pool = card[dir][slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const found = fullCombinedIssues(pool[i], pool[j], keywords);
          if (found.length) withinCardIssues.push('AXIS1 ' + card.name + ' ' + dir + '.' + slot + '[' + i + ',' + j + '] (' + found.join('|') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
        }
      }
    });

    const advicePool = card.advice[dir];
    for (let i = 0; i < advicePool.length; i++) {
      for (let j = i + 1; j < advicePool.length; j++) {
        const wj = wordJaccard(advicePool[i], advicePool[j]);
        if (wj >= WORD_TH) withinCardIssues.push('AXIS2 ' + card.name + ' advice.' + dir + '[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + advicePool[i] + '\n  ' + advicePool[j]);
      }
    }

    function echoIssue(s1, s2) {
      const wj = wordJaccard(s1, s2);
      const t1 = stripBoilerplateSuffix(normalizeForEcho(s1));
      const t2 = stripBoilerplateSuffix(normalizeForEcho(s2));
      const bj = bigramJaccard(t1, t2), lcs = longestCommonSubstring(t1, t2);
      if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
      return null;
    }
    const catTexts = collectCategoryTexts(card, dir);
    advicePool.forEach(function (adv, i) {
      const advLocked = (i === 0);
      card[dir].b.forEach(function (b, j) {
        if (advLocked && j === 0) return; // locked-locked skip: both pre-existing, unfixable
        const found = echoIssue(adv, b);
        if (found) withinCardIssues.push('AXIS3 ' + card.name + ' advice.' + dir + '[' + i + '] vs ' + dir + '.b[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + b);
      });
      if (advLocked) return; // category text is always locked (untouched this phase); skip if advice is also locked
      catTexts.forEach(function (c, j) {
        const found = echoIssue(adv, c);
        if (found) withinCardIssues.push('AXIS3 ' + card.name + ' advice.' + dir + '[' + i + '] vs category-text[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + c);
      });
    });

    const ownTexts = [
      { s: card[dir].a[0], locked: true }, { s: card[dir].a[1], locked: false }, { s: card[dir].a[2], locked: false },
      { s: card[dir].b[0], locked: true }, { s: card[dir].b[1], locked: false }, { s: card[dir].b[2], locked: false },
      { s: advicePool[0], locked: true }, { s: advicePool[1], locked: false }, { s: advicePool[2], locked: false }
    ].concat(catTexts.map(function (s) { return { s: s, locked: true }; }));
    keywords.forEach(function (kw, ki) {
      const nk = normalizeForEcho(kw);
      const kwLocked = ki < 3;
      ownTexts.forEach(function (t) {
        if (kwLocked && t.locked) return;
        if (normalizeForEcho(t.s).indexOf(nk) !== -1) withinCardIssues.push('AXIS5 ' + card.name + ' ' + dir + ': keyword "' + kw + '" appears in its own pool (locked=' + t.locked + '): ' + t.s);
      });
    });
  });
});
assert.strictEqual(withinCardIssues.length, 0, 'Found ' + withinCardIssues.length + ' within-card issues:\n' + withinCardIssues.join('\n\n'));
console.log('No within-card self-collisions (axis 1), advice self-collisions (axis 2), advice<->b/category echo (axis 3), or keyword self-echo (axis 5)');

// axis 4: 카드 간 완전동일 + 근접축자
const seen = new Map();
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        const where = card.name + ' ' + dir + '.' + slot + '[' + idx + ']';
        if (!seen.has(s)) seen.set(s, []);
        seen.get(s).push({ where: where, locked: idx === 0 });
      });
    });
  });
});
const exactIssues = [];
seen.forEach(function (occ, text) {
  if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
    exactIssues.push('"' + text + '" appears in: ' + occ.map(function (o) { return o.where; }).join(' | '));
  }
});
assert.strictEqual(exactIssues.length, 0, 'Found ' + exactIssues.length + ' cross-card exact-match collisions:\n' + exactIssues.join('\n'));
console.log('No cross-card exact-match collisions');

const nearVerbatimIssues = [];
for (let i = 0; i < deck.length; i++) {
  for (let j = i + 1; j < deck.length; j++) {
    const c1 = deck[i], c2 = deck[j];
    ['upright', 'reversed'].forEach(function (dir) {
      ['a', 'b'].forEach(function (slot) {
        c1[dir][slot].forEach(function (s1, x) {
          c2[dir][slot].forEach(function (s2, y) {
            if (x === 0 && y === 0) return;
            const lcs = longestCommonSubstring(stripBoilerplateSuffix(normalizeForEcho(s1)), stripBoilerplateSuffix(normalizeForEcho(s2)));
            if (lcs >= NEARVERBATIM_LCS_TH) {
              nearVerbatimIssues.push(c1.name + ' ' + dir + '.' + slot + x + ' <-> ' + c2.name + ' ' + dir + '.' + slot + y + ' (lcs=' + lcs + ')\n  ' + s1 + '\n  ' + s2);
            }
          });
        });
      });
    });
  }
}
assert.strictEqual(nearVerbatimIssues.length, 0, 'Found ' + nearVerbatimIssues.length + ' cross-card near-verbatim collisions:\n' + nearVerbatimIssues.join('\n'));
console.log('No cross-card near-verbatim collisions');

console.log('All tarot-data tests passed');
