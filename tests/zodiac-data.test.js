const assert = require('assert');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];

function getField(z, cat, sub) {
  return sub ? z.categories[cat][sub] : z.categories[cat];
}

function allFieldsOf(z) {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
}

function assertPool(field, label) {
  assert.ok(field && typeof field === 'object' && !Array.isArray(field), label + ' must be an {a,b} object');
  ['a', 'b'].forEach(function (slot) {
    assert.ok(Array.isArray(field[slot]) && field[slot].length === 3, label + '.' + slot + ' must be an array of exactly 3 strings');
    field[slot].forEach(function (s, i) {
      assert.ok(typeof s === 'string' && s.length > 0, label + '.' + slot + '[' + i + '] must be a non-empty string');
    });
  });
}

// ---------------------------------------------------------------------------
// 구조 검증
// ---------------------------------------------------------------------------

assert.strictEqual(ZODIAC_DATA.length, 12, '별자리는 12개여야 함');
assert.deepStrictEqual(ZODIAC_DATA.map(d => d.key), EXPECTED_KEYS, '양자리~물고기자리 순서와 key가 일치해야 함');

ZODIAC_DATA.forEach(function (z) {
  assertPool(z.trait, z.key + '.trait');

  assert.ok(Array.isArray(z.keywords) && z.keywords.length === 6,
    z.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(z.keywords).size, 6, z.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(z.advice) && z.advice.length === 3,
    z.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (sub) {
      assertPool(getField(z, cat, sub), z.key + '.categories.' + cat + '.' + sub);
    });
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(z, cat, null), z.key + '.categories.' + cat);
  });
});

console.log('All 12 zodiac signs have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사 — 네 축: (1) 필드 내부 자기중복, (2) advice 풀 자기중복,
// (3) advice ↔ 모든 b풀 echo(신규), (4) 금지쌍(a는 3단 결합, b는 단순)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;

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
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) {
    issues.push('lcs=' + lcs + ' stems=' + shared.join(',') + ' bigram=' + bj.toFixed(3));
  }
  return issues;
}

const withinFieldCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const issues = fullCombinedIssues(pool[i], pool[j], z.keywords);
          if (issues.length) {
            withinFieldCollisions.push(z.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
          }
        }
      }
    });
  });
});

assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));

console.log('No within-field a/b pool self-collisions (each field\'s own 3 variants are sufficiently distinct)');

const adviceCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  for (let i = 0; i < z.advice.length; i++) {
    for (let j = i + 1; j < z.advice.length; j++) {
      const wj = wordJaccard(z.advice[i], z.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(z.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + z.advice[i] + '\n  ' + z.advice[j]);
      }
    }
  }
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

const adviceEchoCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    field.b.forEach(function (sB, j) {
      z.advice.forEach(function (adv, i) {
        const wj = wordJaccard(adv, sB);
        if (wj >= WORD_TH) {
          adviceEchoCollisions.push(z.name_kr + ' advice[' + i + '] <-> ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + adv + '\n  ' + sB);
        }
      });
    });
  });
});

assert.strictEqual(adviceEchoCollisions.length, 0,
  'Found ' + adviceEchoCollisions.length + ' advice<->b-pool render-together echo collisions:\n' + adviceEchoCollisions.join('\n'));

console.log('No advice<->b-pool render-together echo collisions (advice and trait/category b-pools never share a skeleton)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(z, catA, subA), fB = getField(z, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            const issues = fullCombinedIssues(sA, sB, z.keywords);
            if (issues.length) {
              forbiddenACollisions.push(z.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            const wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(z.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
      });
    });
  });
});

assert.strictEqual(forbiddenACollisions.length, 0,
  'Found ' + forbiddenACollisions.length + ' forbidden-pair a-pool collisions:\n' + forbiddenACollisions.join('\n'));
console.log('No forbidden-pair a-pool collisions (love/relationships, career/workplace, money/business)');

assert.strictEqual(forbiddenBCollisions.length, 0,
  'Found ' + forbiddenBCollisions.length + ' forbidden-pair b-pool collisions:\n' + forbiddenBCollisions.join('\n'));
console.log('No forbidden-pair b-pool collisions (simple word-Jaccard sweep)');

console.log('All zodiac-data tests passed');
