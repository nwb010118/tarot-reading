const assert = require('assert');
const { ZODIAC_DATA, getZodiacByKey } = require('../data/zodiac-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

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

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    assert.notStrictEqual(
      JSON.stringify(z.categories[cat][keys[0]]),
      JSON.stringify(z.categories[cat][keys[1]]),
      z.key + ' categories.' + cat + ' sub-choices must not be identical'
    );
  });
});

console.log('All 12 zodiac signs have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사 — 공유 dedup-axes 헬퍼로 구현 (2026-09-08 dedup-axes 추출 설계 참고)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);
const WORD_TH = 0.3;
const simpleWord = simpleWordCollision(wordJaccard, WORD_TH);
const simpleWordEcho = function (s1, s2) {
  const wj = wordJaccard(s1, s2);
  return wj >= WORD_TH ? 'word=' + wj.toFixed(2) : null;
};

const withinFieldCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, z.keywords); };
  const entries = [];
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      entries.push({ label: z.name_kr + ' ' + fieldLabel + '.' + slot, values: field[slot] });
    });
  });
  withinFieldCollisions.push.apply(withinFieldCollisions, checkPoolSelfCollisions(entries, cmp));
});

assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));

console.log('No within-field a/b pool self-collisions (each field\'s own 3 variants are sufficiently distinct)');

const adviceCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  adviceCollisions.push.apply(adviceCollisions, checkPoolSelfCollisions(
    [{ label: z.name_kr + ' advice', values: z.advice }], simpleWord
  ));
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

const adviceEchoCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  const pairs = [];
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    pairs.push({ labelA: z.name_kr + ' advice', valuesA: z.advice, labelB: fieldLabel + '.b', valuesB: field.b });
  });
  adviceEchoCollisions.push.apply(adviceEchoCollisions, checkCrossPoolCollisions(pairs, simpleWordEcho, null));
});

assert.strictEqual(adviceEchoCollisions.length, 0,
  'Found ' + adviceEchoCollisions.length + ' advice<->b-pool render-together echo collisions:\n' + adviceEchoCollisions.join('\n'));

console.log('No advice<->b-pool render-together echo collisions (advice and trait/category b-pools never share a skeleton)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ZODIAC_DATA.forEach(function (z) {
  const cmp = function (s1, s2) {
    const found = fullCombinedIssues(s1, s2, z.keywords);
    return found.length ? found.join(' | ') : null;
  };
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(z, catA, subA), fB = getField(z, catB, subB);
        forbiddenACollisions.push.apply(forbiddenACollisions, checkCrossPoolCollisions(
          [{ labelA: z.name_kr + ' ' + catA + '.' + subA + '.a', valuesA: fA.a, labelB: catB + '.' + subB + '.a', valuesB: fB.a }],
          cmp, null
        ));
        forbiddenBCollisions.push.apply(forbiddenBCollisions, checkCrossPoolCollisions(
          [{ labelA: z.name_kr + ' ' + catA + '.' + subA + '.b', valuesA: fA.b, labelB: catB + '.' + subB + '.b', valuesB: fB.b }],
          simpleWordEcho, null
        ));
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

// ---------------------------------------------------------------------------
// 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
// ---------------------------------------------------------------------------

const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];
const danglingExceptionKey = function (e) { return e.key + '|' + e.field + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));

const danglingEntries = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        danglingEntries.push({
          label: z.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']',
          value: s, idx: idx,
          exceptionKey: danglingExceptionKey({ key: z.key, field: fieldLabel, slot: slot })
        });
      });
    });
  });
});
const danglingResult = checkDanglingClausePool(danglingEntries, endsWithTerminalPunctuation, danglingExceptionKeySet);

assert.strictEqual(danglingResult.issues.length, 0,
  'Found ' + danglingResult.issues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingResult.issues.join('\n'));

console.log('No dangling-clause pool entries (all a[0..2]/b[0..2] end with terminal punctuation, aside from known exceptions)');

const staleDanglingClauseExceptions = KNOWN_DANGLING_CLAUSE_LOCKED.filter(function (e) { return !danglingResult.usedExceptionKeys.has(danglingExceptionKey(e)); });
assert.strictEqual(staleDanglingClauseExceptions.length, 0,
  'Found ' + staleDanglingClauseExceptions.length + ' stale dangling-clause exception(s) that no longer suppress any violation (safe to remove): ' + JSON.stringify(staleDanglingClauseExceptions));

// ---------------------------------------------------------------------------
// 엔티티 간 완전동일 + 근접축자 (2026-09-08 후속과제 2번 설계 참고)
// ---------------------------------------------------------------------------

const NEARVERBATIM_LCS_TH = 20;
function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}

const crossEntityOccurrences = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        crossEntityOccurrences.push({ value: s, where: z.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']', locked: idx === 0 });
      });
    });
  });
});
const crossEntityExactCollisions = checkExactMatchCollisions(crossEntityOccurrences);
assert.strictEqual(crossEntityExactCollisions.length, 0,
  'Found ' + crossEntityExactCollisions.length + ' cross-entity exact-match collisions:\n' + crossEntityExactCollisions.join('\n'));
console.log('No cross-entity exact-match collisions');

const crossEntityNearVerbatim = [];
const nearVerbatimCmp = function (s1, s2) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
for (let i = 0; i < ZODIAC_DATA.length; i++) {
  for (let j = i + 1; j < ZODIAC_DATA.length; j++) {
    const e1 = ZODIAC_DATA[i], e2 = ZODIAC_DATA[j];
    allFieldsOf(e1).forEach(function (pair) {
      const cat = pair[0], sub = pair[1];
      const field1 = cat === 'trait' ? e1.trait : getField(e1, cat, sub);
      const field2 = cat === 'trait' ? e2.trait : getField(e2, cat, sub);
      const fieldLabel = cat + (sub ? '.' + sub : '');
      ['a', 'b'].forEach(function (slot) {
        crossEntityNearVerbatim.push.apply(crossEntityNearVerbatim, checkCrossPoolCollisions(
          [{ labelA: e1.name_kr + ' ' + fieldLabel + '.' + slot, valuesA: field1[slot], labelB: e2.name_kr + ' ' + fieldLabel + '.' + slot, valuesB: field2[slot] }],
          nearVerbatimCmp, function (x, y) { return x === 0 && y === 0; }
        ));
      });
    });
  }
}
assert.strictEqual(crossEntityNearVerbatim.length, 0,
  'Found ' + crossEntityNearVerbatim.length + ' cross-entity near-verbatim collisions:\n' + crossEntityNearVerbatim.join('\n'));
console.log('No cross-entity near-verbatim collisions');

// ---------------------------------------------------------------------------
// getZodiacByKey() 회귀 검사
// ---------------------------------------------------------------------------

assert.strictEqual(getZodiacByKey('aries').key, 'aries', 'getZodiacByKey(\'aries\') should resolve to aries');
assert.strictEqual(getZodiacByKey('pisces').key, 'pisces', 'getZodiacByKey(\'pisces\') should resolve to pisces');
assert.strictEqual(getZodiacByKey('nonexistent'), undefined, 'getZodiacByKey should return undefined for an unknown key');

console.log('getZodiacByKey() correctly resolves known keys');

console.log('All zodiac-data tests passed');
