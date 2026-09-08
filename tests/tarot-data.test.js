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
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

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
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);

const WORD_TH = 0.3;
const NEARVERBATIM_LCS_TH = 20;
function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }
function stripForEcho(s) { return stripBoilerplateSuffix(normalizeForEcho(s)); }
const echoIssue = makeEchoIssue(stripForEcho);
const simpleWord = simpleWordCollision(wordJaccard, WORD_TH);

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
    const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, keywords); };

    withinCardIssues.push.apply(withinCardIssues, checkPoolSelfCollisions([
      { label: 'AXIS1 ' + card.name + ' ' + dir + '.a', values: card[dir].a },
      { label: 'AXIS1 ' + card.name + ' ' + dir + '.b', values: card[dir].b }
    ], cmp));

    const advicePool = card.advice[dir];
    withinCardIssues.push.apply(withinCardIssues, checkPoolSelfCollisions(
      [{ label: 'AXIS2 ' + card.name + ' advice.' + dir, values: advicePool }], simpleWord
    ));

    const catTexts = collectCategoryTexts(card, dir);
    withinCardIssues.push.apply(withinCardIssues, checkCrossPoolCollisions(
      [{ labelA: 'AXIS3 ' + card.name + ' advice.' + dir, valuesA: advicePool, labelB: dir + '.b', valuesB: card[dir].b }],
      echoIssue, function (i, j) { return i === 0 && j === 0; }
    ));
    withinCardIssues.push.apply(withinCardIssues, checkCrossPoolCollisions(
      [{ labelA: 'AXIS3 ' + card.name + ' advice.' + dir, valuesA: advicePool, labelB: 'category-text', valuesB: catTexts }],
      echoIssue, function (i, j) { return i === 0; }
    ));

    const ownTexts = [
      { s: card[dir].a[0], locked: true }, { s: card[dir].a[1], locked: false }, { s: card[dir].a[2], locked: false },
      { s: card[dir].b[0], locked: true }, { s: card[dir].b[1], locked: false }, { s: card[dir].b[2], locked: false },
      { s: advicePool[0], locked: true }, { s: advicePool[1], locked: false }, { s: advicePool[2], locked: false }
    ].concat(catTexts.map(function (s) { return { s: s, locked: true }; }));
    const keywordEntries = keywords.map(function (kw, ki) { return { value: kw, locked: ki < 3 }; });
    const textEntries = ownTexts.map(function (t) { return { value: t.s, locked: t.locked }; });
    const echoMatches = checkKeywordSelfEcho(keywordEntries, textEntries, normalizeForEcho, function (kw, t) { return kw.locked && t.locked; });
    echoMatches.forEach(function (m) {
      withinCardIssues.push('AXIS5 ' + card.name + ' ' + dir + ': keyword "' + m.keyword.value + '" appears in its own pool (locked=' + m.text.locked + '): ' + m.text.value);
    });
  });
});
assert.strictEqual(withinCardIssues.length, 0, 'Found ' + withinCardIssues.length + ' within-card issues:\n' + withinCardIssues.join('\n\n'));
console.log('No within-card self-collisions (axis 1), advice self-collisions (axis 2), advice<->b/category echo (axis 3), or keyword self-echo (axis 5)');

// axis 4: 카드 간 완전동일 + 근접축자
const occurrences = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        occurrences.push({ value: s, where: card.name + ' ' + dir + '.' + slot + '[' + idx + ']', locked: idx === 0 });
      });
    });
  });
});
const exactIssues = checkExactMatchCollisions(occurrences);
assert.strictEqual(exactIssues.length, 0, 'Found ' + exactIssues.length + ' cross-card exact-match collisions:\n' + exactIssues.join('\n'));
console.log('No cross-card exact-match collisions');

const nearVerbatimIssues = [];
const lcsCmp = function (s1, s2) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
for (let i = 0; i < deck.length; i++) {
  for (let j = i + 1; j < deck.length; j++) {
    const c1 = deck[i], c2 = deck[j];
    ['upright', 'reversed'].forEach(function (dir) {
      ['a', 'b'].forEach(function (slot) {
        nearVerbatimIssues.push.apply(nearVerbatimIssues, checkCrossPoolCollisions(
          [{ labelA: c1.name + ' ' + dir + '.' + slot, valuesA: c1[dir][slot], labelB: c2.name + ' ' + dir + '.' + slot, valuesB: c2[dir][slot] }],
          lcsCmp, function (x, y) { return x === 0 && y === 0; }
        ));
      });
    });
  }
}
assert.strictEqual(nearVerbatimIssues.length, 0, 'Found ' + nearVerbatimIssues.length + ' cross-card near-verbatim collisions:\n' + nearVerbatimIssues.join('\n'));
console.log('No cross-card near-verbatim collisions');

// axis 6: 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (완드2 역방향에서 실제 발견된 결함,
// 2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  { cardId: 'wands_2', dir: 'reversed', slot: 'a' }
  // "계획이 충분히 다져지지 않았거나,"(잠긴 a[0]) — 형제 b[1]/b[2]가 이 절과 자연스럽게
  // 이어지도록 재작성됨. 2026-09-08 최종 리뷰 fix wave에서 9개 조합 전부 수동 검증됨(커밋 388f756).
];
const danglingExceptionKey = function (e) { return e.cardId + '|' + e.dir + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));
const danglingEntries = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        danglingEntries.push({
          label: card.name + ' ' + dir + '.' + slot + '[' + idx + ']', value: s, idx: idx,
          exceptionKey: danglingExceptionKey({ cardId: card.cardId, dir: dir, slot: slot })
        });
      });
    });
  });
});
const danglingResult = checkDanglingClausePool(danglingEntries, endsWithTerminalPunctuation, danglingExceptionKeySet);
assert.strictEqual(danglingResult.issues.length, 0,
  'Found ' + danglingResult.issues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingResult.issues.join('\n'));
console.log('No dangling-clause pool entries (all upright/reversed a[0..2]/b[0..2] end with terminal punctuation, aside from the known wands_2 reversed exception)');
const staleDanglingClauseExceptions = KNOWN_DANGLING_CLAUSE_LOCKED.filter(function (e) { return !danglingResult.usedExceptionKeys.has(danglingExceptionKey(e)); });
assert.strictEqual(staleDanglingClauseExceptions.length, 0,
  'Found ' + staleDanglingClauseExceptions.length + ' stale dangling-clause exception(s) that no longer suppress any violation (safe to remove): ' + JSON.stringify(staleDanglingClauseExceptions));

console.log('All tarot-data tests passed');
