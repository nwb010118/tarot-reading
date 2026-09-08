const assert = require('assert');
const { ILGAN_DATA, ELEMENT_BALANCE_TEXT, getIlganByIndex, getElementBalanceText } = require('../data/saju-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');

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
// 중복 검사 — 6개 축
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10;
const NEARVERBATIM_LCS_TH = 20;

function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}

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
    issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  }
  return issues;
}

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      var pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          var issues = fullCombinedIssues(pool[i], pool[j], ilgan.keywords);
          if (issues.length) {
            withinFieldCollisions.push(ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
          }
        }
      }
    });
  });
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  for (let i = 0; i < ilgan.advice.length; i++) {
    for (let j = i + 1; j < ilgan.advice.length; j++) {
      var wj = wordJaccard(ilgan.advice[i], ilgan.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(ilgan.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + ilgan.advice[i] + '\n  ' + ilgan.advice[j]);
      }
    }
  }
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 모든 b풀 + ELEMENT_BALANCE_TEXT echo (강화 지표, 잠긴-잠긴 스킵)
function echoIssue(s1, s2) {
  var wj = wordJaccard(s1, s2);
  var t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  var bj = bigramJaccard(t1, t2);
  var lcs = longestCommonSubstring(t1, t2);
  if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) {
    return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
  }
  return null;
}

const BALANCE_TEXTS = Object.values(ELEMENT_BALANCE_TEXT.excess)
  .concat(Object.values(ELEMENT_BALANCE_TEXT.deficient))
  .concat([ELEMENT_BALANCE_TEXT.balanced]);

const echoCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach(function (sB, j) {
      ilgan.advice.forEach(function (adv, i) {
        if (i === 0 && j === 0) return;
        var issue = echoIssue(adv, sB);
        if (issue) echoCollisions.push(ilgan.name_kr + ' advice[' + i + '] <-> ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] (' + issue + ')\n  ' + adv + '\n  ' + sB);
      });
    });
  });
  ilgan.advice.forEach(function (adv, i) {
    if (i === 0) return;
    BALANCE_TEXTS.forEach(function (bt, k) {
      var issue = echoIssue(adv, bt);
      if (issue) echoCollisions.push(ilgan.name_kr + ' advice[' + i + '] <-> balance[' + k + '] (' + issue + ')\n  ' + adv + '\n  ' + bt);
    });
  });
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    field.b.forEach(function (sB, j) {
      if (j === 0) return;
      BALANCE_TEXTS.forEach(function (bt, k) {
        var issue = echoIssue(sB, bt);
        if (issue) echoCollisions.push(ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] <-> balance[' + k + '] (' + issue + ')\n  ' + sB + '\n  ' + bt);
      });
    });
  });
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->b-pool/balance-text render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->b-pool/balance-text render-together echo collisions');

// axis 4: 금지쌍 (a는 3단 결합, 잠긴-잠긴 스킵 / b는 단순)
const forbiddenACollisions = [];
const forbiddenBCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    var catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        var fA = getField(ilgan, catA, subA), fB = getField(ilgan, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            if (i === 0 && j === 0) return;
            var issues = fullCombinedIssues(sA, sB, ilgan.keywords);
            if (issues.length) {
              forbiddenACollisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            var wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
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
function isKnownDanglingClauseLocked(entityKey, fieldLabel, slot) {
  return KNOWN_DANGLING_CLAUSE_LOCKED.some(function (e) {
    return e.key === entityKey && e.field === fieldLabel && e.slot === slot;
  });
}
const danglingClauseIssues = [];
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    var fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        if (endsWithTerminalPunctuation(s)) return;
        if (idx === 0 && isKnownDanglingClauseLocked(ilgan.key, fieldLabel, slot)) return;
        danglingClauseIssues.push(ilgan.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + '] (locked=' + (idx === 0) + ') does not end with terminal punctuation: ' + s);
      });
    });
  });
});
assert.strictEqual(danglingClauseIssues.length, 0,
  'Found ' + danglingClauseIssues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingClauseIssues.join('\n'));
console.log('No dangling-clause pool entries (all a[0..2]/b[0..2] end with terminal punctuation, aside from known exceptions)');

// axis 5: 일간 간 완전동일 검사 (모든 발생 위치가 인덱스 0인 경우는 스킵 --
// 이미 배포된 두 문장이 우연히 같은 사례는 수정 불가능하므로)
const exactMatchMap = new Map();
ILGAN_DATA.forEach(function (ilgan) {
  allFieldsOf().forEach(function (pair) {
    var cat = pair[0], sub = pair[1];
    var field = cat === 'trait' ? ilgan.trait : getField(ilgan, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        var where = ilgan.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + idx + ']';
        if (!exactMatchMap.has(s)) exactMatchMap.set(s, []);
        exactMatchMap.get(s).push({ where: where, locked: idx === 0 });
      });
    });
  });
});
const exactMatchCollisions = [];
exactMatchMap.forEach(function (occurrences, text) {
  if (occurrences.length > 1 && occurrences.some(function (o) { return !o.locked; })) {
    exactMatchCollisions.push('"' + text + '" appears in: ' + occurrences.map(function (o) { return o.where; }).join(' | '));
  }
});
assert.strictEqual(exactMatchCollisions.length, 0,
  'Found ' + exactMatchCollisions.length + ' cross-entity exact-match collisions:\n' + exactMatchCollisions.join('\n'));
console.log('No cross-entity exact-match collisions');

// axis 6: 같은 일간 내 비금지쌍 근접축자 (LCS>=20, 잠긴-잠긴 스킵)
const nearVerbatimCollisions = [];
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
        F1[slot].forEach(function (s1, x) {
          F2[slot].forEach(function (s2, y) {
            if (x === 0 && y === 0) return;
            var t1 = stripForEcho(s1), t2 = stripForEcho(s2);
            var lcs = longestCommonSubstring(t1, t2);
            if (lcs >= NEARVERBATIM_LCS_TH) {
              nearVerbatimCollisions.push(ilgan.name_kr + ' ' + f1name + '.' + slot + x + ' <-> ' + f2name + '.' + slot + y + ' (lcs=' + lcs + ')\n  ' + s1 + '\n  ' + s2);
            }
          });
        });
      });
    }
  }
});
assert.strictEqual(nearVerbatimCollisions.length, 0,
  'Found ' + nearVerbatimCollisions.length + ' same-entity non-forbidden-pair near-verbatim collisions:\n' + nearVerbatimCollisions.join('\n'));
console.log('No same-entity non-forbidden-pair near-verbatim collisions');

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
