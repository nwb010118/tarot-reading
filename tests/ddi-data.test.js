const assert = require('assert');
const { DDI_DATA, getDdiByYear } = require('../data/ddi-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');

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
// 중복 검사 — 두 축: (1) 필드 내부 자기중복(a/b 모두 3단 결합), (2) 금지쌍(a만 3단 결합, b는 단순 word-Jaccard)
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
DDI_DATA.forEach(function (ddi) {
  const allFields = [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));

  allFields.forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    ['a', 'b'].forEach(function (slot) {
      const pool = field[slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const issues = fullCombinedIssues(pool[i], pool[j], ddi.keywords);
          if (issues.length) {
            withinFieldCollisions.push(ddi.name_kr + ' ' + cat + (sub ? '.' + sub : '') + '.' + slot + '[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
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
DDI_DATA.forEach(function (ddi) {
  for (let i = 0; i < ddi.advice.length; i++) {
    for (let j = i + 1; j < ddi.advice.length; j++) {
      const wj = wordJaccard(ddi.advice[i], ddi.advice[j]);
      if (wj >= WORD_TH) {
        adviceCollisions.push(ddi.name_kr + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + ddi.advice[i] + '\n  ' + ddi.advice[j]);
      }
    }
  }
});

assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));

console.log('No advice-pool self-collisions (each sign\'s 3 advice variants are sufficiently distinct)');

// advice가 trait/카테고리와 같은 화면에 함께 렌더되므로(showDdiSummary 등),
// advice 각 항목이 모든 필드의 b-pool과 skeleton을 공유해 echo되지 않는지 확인
const adviceBPoolCollisions = [];
DDI_DATA.forEach(function (ddi) {
  const bFields = [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));

  ddi.advice.forEach(function (adv, i) {
    bFields.forEach(function (pair) {
      const cat = pair[0], sub = pair[1];
      const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
      field.b.forEach(function (sB, j) {
        const wj = wordJaccard(adv, sB);
        if (wj >= WORD_TH) {
          adviceBPoolCollisions.push(ddi.name_kr + ' advice[' + i + '] <-> ' + cat + (sub ? '.' + sub : '') + '.b[' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + adv + '\n  ' + sB);
        }
      });
    });
  });
});

assert.strictEqual(adviceBPoolCollisions.length, 0,
  'Found ' + adviceBPoolCollisions.length + ' advice-pool vs b-pool echo collisions:\n' + adviceBPoolCollisions.join('\n'));

console.log('No advice-pool vs b-pool echo collisions (advice never shares a skeleton with a rendered-together b-pool sentence)');

const forbiddenACollisions = [];
const forbiddenBCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pairDef) {
    const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const fA = getField(ddi, catA, subA), fB = getField(ddi, catB, subB);
        fA.a.forEach(function (sA, i) {
          fB.a.forEach(function (sB, j) {
            const issues = fullCombinedIssues(sA, sB, ddi.keywords);
            if (issues.length) {
              forbiddenACollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + '.a' + i + ' <-> ' + catB + '.' + subB + '.a' + j + ' (' + issues.join(' | ') + ')\n  ' + sA + '\n  ' + sB);
            }
          });
        });
        fA.b.forEach(function (sA, i) {
          fB.b.forEach(function (sB, j) {
            const wj = wordJaccard(sA, sB);
            if (wj >= WORD_TH) {
              forbiddenBCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + '.b' + i + ' <-> ' + catB + '.' + subB + '.b' + j + ' (word=' + wj.toFixed(2) + ')\n  ' + sA + '\n  ' + sB);
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

// ---------------------------------------------------------------------------
// 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
// ---------------------------------------------------------------------------

const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음 — 위반이 발견되면 { key: '<ddi.key>', field: 'love.solo', slot: 'a' } 형태로
  // 등록하고, 형제 문장이 이 절과 자연스럽게 이어지도록 재작성됐는지 등 왜 안전한지 주석을 남길 것.
];

function isKnownDanglingClauseLocked(entityKey, fieldLabel, slot) {
  return KNOWN_DANGLING_CLAUSE_LOCKED.some(function (e) {
    return e.key === entityKey && e.field === fieldLabel && e.slot === slot;
  });
}

const danglingClauseIssues = [];
DDI_DATA.forEach(function (ddi) {
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        if (endsWithTerminalPunctuation(s)) return;
        if (idx === 0 && isKnownDanglingClauseLocked(ddi.key, fieldLabel, slot)) return;
        danglingClauseIssues.push(ddi.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + '] (locked=' + (idx === 0) + ') does not end with terminal punctuation: ' + s);
      });
    });
  });
});

assert.strictEqual(danglingClauseIssues.length, 0,
  'Found ' + danglingClauseIssues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingClauseIssues.join('\n'));

console.log('No dangling-clause pool entries (all a[0..2]/b[0..2] end with terminal punctuation, aside from known exceptions)');

// ---------------------------------------------------------------------------
// getDdiByYear() 회귀 확인
// ---------------------------------------------------------------------------

assert.strictEqual(getDdiByYear(2004).key, 'monkey', 'getDdiByYear(2004) should resolve to monkey');
assert.strictEqual(getDdiByYear(1996).key, 'rat', 'getDdiByYear(1996) should resolve to rat');
assert.strictEqual(getDdiByYear(-4).key, 'dragon', 'getDdiByYear(-4) should normalize negative modulo to dragon');

console.log('getDdiByYear() correctly resolves known years including the negative-modulo edge case');

console.log('All ddi-data tests passed');
