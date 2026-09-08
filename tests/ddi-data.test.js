const assert = require('assert');
const { DDI_DATA, getDdiByYear } = require('../data/ddi-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

const EXPECTED_KEYS = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'];
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

function getField(ddi, cat, sub) {
  return sub ? ddi.categories[cat][sub] : ddi.categories[cat];
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

function allFieldsOf() {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
}

// ---------------------------------------------------------------------------
// 구조 검증
// ---------------------------------------------------------------------------

assert.strictEqual(DDI_DATA.length, 12, '띠는 12개여야 함');
assert.deepStrictEqual(DDI_DATA.map(d => d.key), EXPECTED_KEYS, '기존 배열 순서와 key가 일치해야 함');

DDI_DATA.forEach(function (ddi) {
  assertPool(ddi.trait, ddi.key + '.trait');

  assert.ok(Array.isArray(ddi.keywords) && ddi.keywords.length === 6,
    ddi.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(ddi.keywords).size, 6, ddi.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(ddi.advice) && ddi.advice.length === 3,
    ddi.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (sub) {
      assertPool(getField(ddi, cat, sub), ddi.key + '.categories.' + cat + '.' + sub);
    });
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(ddi, cat, null), ddi.key + '.categories.' + cat);
  });
});

console.log('All 12 ddi signs have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

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
DDI_DATA.forEach(function (ddi) {
  const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, ddi.keywords); };
  const entries = [];
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      entries.push({ label: ddi.name_kr + ' ' + fieldLabel + '.' + slot, values: field[slot] });
    });
  });
  withinFieldCollisions.push.apply(withinFieldCollisions, checkPoolSelfCollisions(entries, cmp));
});

assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));

console.log('No within-field a/b pool self-collisions (each field\'s own 3 variants are sufficiently distinct)');

const adviceCollisions = [];
DDI_DATA.forEach(function (ddi) {
  adviceCollisions.push.apply(adviceCollisions, checkPoolSelfCollisions(
    [{ label: ddi.name_kr + ' advice', values: ddi.advice }], simpleWord
  ));
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

// advice가 trait/카테고리와 같은 화면에 함께 렌더되므로(showDdiSummary 등),
// advice 각 항목이 모든 필드의 b-pool과 skeleton을 공유해 echo되지 않는지 확인
const adviceBPoolCollisions = [];
DDI_DATA.forEach(function (ddi) {
  const pairs = [];
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    pairs.push({ labelA: ddi.name_kr + ' advice', valuesA: ddi.advice, labelB: fieldLabel + '.b', valuesB: field.b });
  });
  adviceBPoolCollisions.push.apply(adviceBPoolCollisions, checkCrossPoolCollisions(pairs, simpleWordEcho, null));
});

assert.strictEqual(adviceBPoolCollisions.length, 0,
  'Found ' + adviceBPoolCollisions.length + ' advice-pool vs b-pool echo collisions:\n' + adviceBPoolCollisions.join('\n'));

console.log('No advice-pool vs b-pool echo collisions (advice never shares a skeleton with a rendered-together b-pool sentence)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
DDI_DATA.forEach(function (ddi) {
  const cmp = function (s1, s2) {
    const found = fullCombinedIssues(s1, s2, ddi.keywords);
    return found.length ? found.join(' | ') : null;
  };
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(ddi, catA, subA), fB = getField(ddi, catB, subB);
        forbiddenACollisions.push.apply(forbiddenACollisions, checkCrossPoolCollisions(
          [{ labelA: ddi.name_kr + ' ' + catA + '.' + subA + '.a', valuesA: fA.a, labelB: catB + '.' + subB + '.a', valuesB: fB.a }],
          cmp, null
        ));
        forbiddenBCollisions.push.apply(forbiddenBCollisions, checkCrossPoolCollisions(
          [{ labelA: ddi.name_kr + ' ' + catA + '.' + subA + '.b', valuesA: fA.b, labelB: catB + '.' + subB + '.b', valuesB: fB.b }],
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
  // 현재 없음 — 위반이 발견되면 { key: '<ddi.key>', field: 'love.solo', slot: 'a' } 형태로
  // 등록하고, 형제 문장이 이 절과 자연스럽게 이어지도록 재작성됐는지 등 왜 안전한지 주석을 남길 것.
];
const danglingExceptionKey = function (e) { return e.key + '|' + e.field + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));

const danglingEntries = [];
DDI_DATA.forEach(function (ddi) {
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        danglingEntries.push({
          label: ddi.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']',
          value: s, idx: idx,
          exceptionKey: danglingExceptionKey({ key: ddi.key, field: fieldLabel, slot: slot })
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
// getDdiByYear() 회귀 확인
// ---------------------------------------------------------------------------

assert.strictEqual(getDdiByYear(2004).key, 'monkey', 'getDdiByYear(2004) should resolve to monkey');
assert.strictEqual(getDdiByYear(1996).key, 'rat', 'getDdiByYear(1996) should resolve to rat');
assert.strictEqual(getDdiByYear(-4).key, 'dragon', 'getDdiByYear(-4) should normalize negative modulo to dragon');

console.log('getDdiByYear() correctly resolves known years including the negative-modulo edge case');

console.log('All ddi-data tests passed');
