const assert = require('assert');
const { DDI_DATA, getDdiByYear } = require('../data/ddi-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'];

assert.strictEqual(DDI_DATA.length, 12, '띠는 12개여야 함');
assert.deepStrictEqual(DDI_DATA.map(d => d.key), EXPECTED_KEYS, '기존 배열 순서와 key가 일치해야 함');

DDI_DATA.forEach(function (entry) {
  assert.ok(entry.trait && entry.trait.length > 0, entry.key + ' trait 누락');
  CATEGORY_KEYS.forEach(function (cat) {
    assert.ok(entry.categories[cat], entry.key + '.' + cat + ' 누락');
  });
});

// ---------------------------------------------------------------------------
// keywords/advice 부가정보와 세분화 카테고리 구조 검증
// ---------------------------------------------------------------------------

const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

DDI_DATA.forEach(function (ddi) {
  assert.ok(Array.isArray(ddi.keywords) && ddi.keywords.length === 3,
    ddi.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof ddi.advice === 'string' && ddi.advice.length > 0,
    ddi.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = ddi.categories[cat];
    assert.ok(entry && typeof entry === 'object', ddi.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, ddi.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, ddi.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], ddi.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof ddi.categories[cat] === 'string' && ddi.categories[cat].length > 0,
      ddi.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 12 ddi signs have valid keywords/advice/subdivided-category structure');

const {
  splitSentences, wordJaccard, charTrigrams, trigramJaccard,
  stripOwnKeywords, longestCommonSubstring, charBigramSet, bigramJaccard,
  makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

DDI_DATA.forEach(function (ddi) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = ddi.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        ddi.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = ddi.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      ddi.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All ddi signs have 2-3 sentence category fields');

const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = ddi.categories[catA][subA];
        const textB = ddi.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
            }
          });
        });
      });
    });
  });
});

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' forbidden-pair sentence-level collisions:\n' + collisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

const openingCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(ddi.categories[catA][subA])[0];
        const openingB = splitSentences(ddi.categories[catB][subB])[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          openingCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (word=' + wj.toFixed(2) + ', trigram=' + tj.toFixed(2) + ')\n  ' + openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(openingCollisions.length, 0,
  'Found ' + openingCollisions.length + ' forbidden-pair opening-sentence skeleton collisions ' +
  '(word-Jaccard >= ' + OPENING_WORD_JACCARD_THRESHOLD + ' AND trigram-Jaccard >= ' + OPENING_TRIGRAM_JACCARD_THRESHOLD + '):\n' +
  openingCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence skeleton collisions (word+trigram combined check)');

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);

const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);

const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

const bigramLcsCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(ddi.categories[catA][subA])[0];
        const openingB = splitSentences(ddi.categories[catB][subB])[0];

        const kwStrippedA = stripOwnKeywords(openingA, ddi.keywords);
        const kwStrippedB = stripOwnKeywords(openingB, ddi.keywords);
        const trimmedA = stripBoilerplateSuffix(kwStrippedA);
        const trimmedB = stripBoilerplateSuffix(kwStrippedB);
        const lcs = longestCommonSubstring(trimmedA, trimmedB);

        const stemsA = significantStems(openingA, ddi.keywords);
        const stemsB = significantStems(openingB, ddi.keywords);
        const sharedStems = [...new Set(stemsA.filter(function (s) { return stemsB.indexOf(s) !== -1; }))];

        const bj = bigramJaccard(kwStrippedA, kwStrippedB);

        if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
          bigramLcsCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (lcs=' + lcs + ', sharedStems=[' + sharedStems.join(',') + '], bigramJaccard=' + bj.toFixed(3) + ')\n  ' +
            openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(bigramLcsCollisions.length, 0,
  'Found ' + bigramLcsCollisions.length + ' forbidden-pair opening-sentence collisions via bigram/LCS/stem-overlap sweep:\n' +
  bigramLcsCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence collisions (bigram/LCS/stem-overlap sweep)');

// ---------------------------------------------------------------------------
// getDdiByYear() regression check
// ---------------------------------------------------------------------------

// year % 12 === 0 -> index 0 -> 'monkey' (the locked monkey sign)
assert.strictEqual(getDdiByYear(2004).key, 'monkey', 'getDdiByYear(2004) should resolve to monkey');
// arbitrary year: 1996 % 12 === 4 -> index 4 -> 'rat'
assert.strictEqual(getDdiByYear(1996).key, 'rat', 'getDdiByYear(1996) should resolve to rat');
// negative-modulo edge case: -4 % 12 === -4 in JS, normalized via ((x % 12) + 12) % 12 -> 8 -> 'dragon'
assert.strictEqual(getDdiByYear(-4).key, 'dragon', 'getDdiByYear(-4) should normalize negative modulo to dragon');

console.log('getDdiByYear() correctly resolves known years including the negative-modulo edge case');

console.log('All ddi-data tests passed');
