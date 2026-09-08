const assert = require('assert');
const { ILGAN_DATA, ELEMENT_BALANCE_TEXT, getIlganByIndex, getElementBalanceText } = require('../data/saju-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

const EXPECTED_KEYS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
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

function getField(ilgan, cat, sub) {
  return sub ? ilgan.categories[cat][sub] : ilgan.categories[cat];
}

function allFieldsOf() {
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

assert.strictEqual(ILGAN_DATA.length, 10, '일간은 10개여야 함');
assert.deepStrictEqual(ILGAN_DATA.map(d => d.key), EXPECTED_KEYS, '갑을병정무기경신임계 순서와 key가 일치해야 함');

ILGAN_DATA.forEach(function (ilgan) {
  assertPool(ilgan.trait, ilgan.key + '.trait');

  assert.ok(Array.isArray(ilgan.keywords) && ilgan.keywords.length === 6,
    ilgan.key + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(ilgan.keywords).size, 6, ilgan.key + ' keywords must all be distinct');

  assert.ok(Array.isArray(ilgan.advice) && ilgan.advice.length === 3,
    ilgan.key + ' advice must be an array of exactly 3 items');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    var keys = SUBDIVIDED_CATEGORIES[cat];
    assertPool(getField(ilgan, cat, keys[0]), ilgan.key + '.categories.' + cat + '.' + keys[0]);
    assertPool(getField(ilgan, cat, keys[1]), ilgan.key + '.categories.' + cat + '.' + keys[1]);
    assert.notStrictEqual(
      JSON.stringify(getField(ilgan, cat, keys[0])),
      JSON.stringify(getField(ilgan, cat, keys[1])),
      ilgan.key + ' categories.' + cat + ' sub-choices must not be identical'
    );
  });
  SINGLE_CATEGORIES.forEach(function (cat) {
    assertPool(getField(ilgan, cat, null), ilgan.key + '.categories.' + cat);
  });
});

console.log('All 10 ilgan have valid a/b pool structure (trait + 19 category fields), 6 keywords, 3 advice variants');

// ELEMENT_BALANCE_TEXT는 이번 랜덤화 대상이 아니므로 존재/개수만 회귀 확인한다
assert.strictEqual(Object.keys(ELEMENT_BALANCE_TEXT.excess).length, 5, 'ELEMENT_BALANCE_TEXT.excess must have 5 elements');
assert.strictEqual(Object.keys(ELEMENT_BALANCE_TEXT.deficient).length, 5, 'ELEMENT_BALANCE_TEXT.deficient must have 5 elements');
assert.ok(typeof ELEMENT_BALANCE_TEXT.balanced === 'string' && ELEMENT_BALANCE_TEXT.balanced.length > 0, 'ELEMENT_BALANCE_TEXT.balanced must be a non-empty string');

console.log('ELEMENT_BALANCE_TEXT structure unchanged (13 fixed strings)');

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
const NEARVERBATIM_LCS_TH = 20;
function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}
const echoIssue = makeEchoIssue(stripForEcho);
const simpleWord = simpleWordCollision(wordJaccard, WORD_TH);

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  var cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, ilgan.keywords); };
  var entries = [];
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      entries.push({ label: ilgan.name_kr + ' ' + fieldLabel + '.' + slot, values: field[slot] });
    });
  });
  withinFieldCollisions.push.apply(withinFieldCollisions, checkPoolSelfCollisions(entries, cmp));
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  adviceCollisions.push.apply(adviceCollisions, checkPoolSelfCollisions(
    [{ label: ilgan.name_kr + ' advice', values: ilgan.advice }], simpleWord
  ));
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 모든 b풀 + ELEMENT_BALANCE_TEXT echo (강화 지표, 잠긴-잠긴 스킵)
const BALANCE_TEXTS = Object.values(ELEMENT_BALANCE_TEXT.excess)
  .concat(Object.values(ELEMENT_BALANCE_TEXT.deficient))
  .concat([ELEMENT_BALANCE_TEXT.balanced]);

const echoCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  var advBPairs = [];
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    advBPairs.push({ labelA: ilgan.name_kr + ' advice', valuesA: ilgan.advice, labelB: fieldLabel + '.b', valuesB: field.b });
  });
  echoCollisions.push.apply(echoCollisions, checkCrossPoolCollisions(advBPairs, echoIssue, function (i, j) { return i === 0 && j === 0; }));

  echoCollisions.push.apply(echoCollisions, checkCrossPoolCollisions(
    [{ labelA: ilgan.name_kr + ' advice', valuesA: ilgan.advice, labelB: 'balance', valuesB: BALANCE_TEXTS }],
    echoIssue, function (i, j) { return i === 0; }
  ));

  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    echoCollisions.push.apply(echoCollisions, checkCrossPoolCollisions(
      [{ labelA: ilgan.name_kr + ' ' + fieldLabel + '.b', valuesA: field.b, labelB: 'balance', valuesB: BALANCE_TEXTS }],
      echoIssue, function (i, j) { return i === 0; }
    ));
  });
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->b-pool/balance-text render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->b-pool/balance-text render-together echo collisions');

// axis 4: 금지쌍 (a는 3단 결합, 잠긴-잠긴 스킵 / b는 단순)
const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  var cmp = function (s1, s2) {
    var found = fullCombinedIssues(s1, s2, ilgan.keywords);
    return found.length ? found.join(' | ') : null;
  };
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    var catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        var fA = getField(ilgan, catA, subA), fB = getField(ilgan, catB, subB);
        forbiddenACollisions.push.apply(forbiddenACollisions, checkCrossPoolCollisions(
          [{ labelA: ilgan.name_kr + ' ' + catA + '.' + subA + '.a', valuesA: fA.a, labelB: catB + '.' + subB + '.a', valuesB: fB.a }],
          cmp, function (i, j) { return i === 0 && j === 0; }
        ));
        forbiddenBCollisions.push.apply(forbiddenBCollisions, checkCrossPoolCollisions(
          [{ labelA: ilgan.name_kr + ' ' + catA + '.' + subA + '.b', valuesA: fA.b, labelB: catB + '.' + subB + '.b', valuesB: fB.b }],
          function (s1, s2) { var wj = wordJaccard(s1, s2); return wj >= WORD_TH ? 'word=' + wj.toFixed(2) : null; }, null
        ));
      });
    });
  });
});
assert.strictEqual(forbiddenACollisions.length, 0,
  'Found ' + forbiddenACollisions.length + ' forbidden-pair a-pool collisions:\n' + forbiddenACollisions.join('\n'));
console.log('No forbidden-pair a-pool collisions');
assert.strictEqual(forbiddenBCollisions.length, 0,
  'Found ' + forbiddenBCollisions.length + ' forbidden-pair b-pool collisions:\n' + forbiddenBCollisions.join('\n'));
console.log('No forbidden-pair b-pool collisions');

// axis 7: 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];
const danglingExceptionKey = function (e) { return e.key + '|' + e.field + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));
const danglingEntries = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        danglingEntries.push({
          label: ilgan.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']',
          value: s, idx: idx,
          exceptionKey: danglingExceptionKey({ key: ilgan.key, field: fieldLabel, slot: slot })
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

// axis 5: 일간 간 완전동일 검사 (모든 발생 위치가 인덱스 0인 경우는 스킵 --
// 이미 배포된 두 문장이 우연히 같은 사례는 수정 불가능하므로)
const occurrences = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        occurrences.push({ value: s, where: ilgan.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']', locked: idx === 0 });
      });
    });
  });
});
const exactMatchCollisions = checkExactMatchCollisions(occurrences);
assert.strictEqual(exactMatchCollisions.length, 0,
  'Found ' + exactMatchCollisions.length + ' cross-entity exact-match collisions:\n' + exactMatchCollisions.join('\n'));
console.log('No cross-entity exact-match collisions');

// axis 6: 같은 일간 내 비금지쌍 근접축자 (LCS>=20, 잠긴-잠긴 스킵)
const FORBIDDEN_FIELD_SET = new Set();
FORBIDDEN_PAIRS.forEach(function (pairDef) {
  var catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
  subsA.forEach(function (subA) {
    subsB.forEach(function (subB) {
      var f1 = catA + (subA ? '.' + subA : ''), f2 = catB + (subB ? '.' + subB : '');
      FORBIDDEN_FIELD_SET.add(f1 + '|' + f2);
      FORBIDDEN_FIELD_SET.add(f2 + '|' + f1);
    });
  });
});
const nearVerbatimCollisions = [];
const lcsCmp = function (s1, s2) {
  var t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  var lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
ILGAN_DATA.forEach(function (ilgan) {
  var fields = allFieldsOf();
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      var cat1 = fields[i][0], sub1 = fields[i][1], cat2 = fields[j][0], sub2 = fields[j][1];
      var f1name = cat1 + (sub1 ? '.' + sub1 : ''), f2name = cat2 + (sub2 ? '.' + sub2 : '');
      if (FORBIDDEN_FIELD_SET.has(f1name + '|' + f2name)) continue;
      var F1 = cat1 === 'trait' ? ilgan.trait : getField(ilgan, cat1, sub1);
      var F2 = cat2 === 'trait' ? ilgan.trait : getField(ilgan, cat2, sub2);
      ['a', 'b'].forEach(function (slot) {
        nearVerbatimCollisions.push.apply(nearVerbatimCollisions, checkCrossPoolCollisions(
          [{ labelA: ilgan.name_kr + ' ' + f1name + '.' + slot, valuesA: F1[slot], labelB: f2name + '.' + slot, valuesB: F2[slot] }],
          lcsCmp, function (x, y) { return x === 0 && y === 0; }
        ));
      });
    }
  }
});
assert.strictEqual(nearVerbatimCollisions.length, 0,
  'Found ' + nearVerbatimCollisions.length + ' same-entity non-forbidden-pair near-verbatim collisions:\n' + nearVerbatimCollisions.join('\n'));
console.log('No same-entity non-forbidden-pair near-verbatim collisions');

// axis 9: 일간 간 근접축자 (같은 필드·같은 슬롯끼리만, LCS>=20, 잠긴-잠긴 스킵)
const crossEntityNearVerbatim = [];
for (let i = 0; i < ILGAN_DATA.length; i++) {
  for (let j = i + 1; j < ILGAN_DATA.length; j++) {
    const e1 = ILGAN_DATA[i], e2 = ILGAN_DATA[j];
    allFieldsOf().forEach(function (pair) {
      var cat = pair[0], sub = pair[1];
      var field1 = cat === 'trait' ? e1.trait : getField(e1, cat, sub);
      var field2 = cat === 'trait' ? e2.trait : getField(e2, cat, sub);
      var fieldLabel = cat + (sub ? '.' + sub : '');
      ['a', 'b'].forEach(function (slot) {
        crossEntityNearVerbatim.push.apply(crossEntityNearVerbatim, checkCrossPoolCollisions(
          [{ labelA: e1.name_kr + ' ' + fieldLabel + '.' + slot, valuesA: field1[slot], labelB: e2.name_kr + ' ' + fieldLabel + '.' + slot, valuesB: field2[slot] }],
          lcsCmp, function (x, y) { return x === 0 && y === 0; }
        ));
      });
    });
  }
}
assert.strictEqual(crossEntityNearVerbatim.length, 0,
  'Found ' + crossEntityNearVerbatim.length + ' cross-entity near-verbatim collisions:\n' + crossEntityNearVerbatim.join('\n'));
console.log('No cross-entity near-verbatim collisions');

// ---------------------------------------------------------------------------
// 조회 함수 회귀 확인
// ---------------------------------------------------------------------------

assert.strictEqual(getIlganByIndex(0).key, 'gap', 'getIlganByIndex(0) should resolve to gap');
assert.strictEqual(getIlganByIndex(9).key, 'gye', 'getIlganByIndex(9) should resolve to gye');
assert.strictEqual(
  getElementBalanceText({ state: 'excess', element: '목' }),
  ELEMENT_BALANCE_TEXT.excess.목,
  'getElementBalanceText should resolve excess/목 correctly'
);
assert.strictEqual(
  getElementBalanceText({ state: 'balanced' }),
  ELEMENT_BALANCE_TEXT.balanced,
  'getElementBalanceText should resolve balanced correctly'
);

console.log('getIlganByIndex()/getElementBalanceText() correctly resolve known inputs');

console.log('All saju-data tests passed');
