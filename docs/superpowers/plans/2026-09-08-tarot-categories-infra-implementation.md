# 타로 categories 랜덤화 — 인프라 태스크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [[project-tarot-categories-randomization]] 설계 문서(`docs/superpowers/specs/2026-09-08-tarot-categories-randomization-design.md`)가 정한 아키텍처를, 콘텐츠를 단 1개도 변환하기 전에 먼저 코드/테스트 인프라로 반영한다. 이 태스크가 끝나면 `card.categories`의 어떤 필드가 문자열이든 `{a,b}` 풀이든 앱과 테스트가 항상 올바르게 동작하고, 이후 카드별 콘텐츠 변환 태스크들은 순수하게 데이터 파일만 고치면 된다.

**Architecture:** `js/app.js`의 `showSummary()` 카테고리 분기 1줄을 `resolveMeaningText()`로 감싼다. `tests/tarot-data.test.js`의 categories 구조 검증을 "문자열 또는 `{a,b}` 풀 모두 허용"으로 바꾸고, 카테고리가 고정 문자열이던 시절 임시방편이었던 문장 단위 검사 2개(sentence-count, forbidden-pair-sentence-level)를 폐기한 뒤, [[project-dedup-axes-extraction]]의 공유 함수(`checkPoolSelfCollisions`/`checkCrossPoolCollisions`/`checkExactMatchCollisions`/`checkKeywordSelfEcho`/`checkDanglingClausePool`)를 써서 기존 upright/reversed 축들을 카테고리 풀까지 포괄하도록 확장하고, 풀 레벨 금지쌍 축을 신규 추가한다. 모든 신규/확장 로직은 **아직 변환되지 않은(문자열 타입) 카테고리 필드는 자동으로 건너뛰므로**, 이 태스크 완료 시점(변환된 카드 0장)에도 전체 스위트가 그대로 통과해야 한다.

**Tech Stack:** Vanilla JS, Node.js 내장 `assert`, `tests/helpers/dedup.js`/`tests/helpers/dedup-axes.js`의 기존 공유 함수만 사용(신규 공유 함수 없음).

## Global Constraints

- **데이터 파일(`data/tarot-data-*.js`)은 이 태스크에서 전혀 수정하지 않는다** — 이번엔 순수 코드/테스트 변경만.
- `js/app.js`는 정확히 1줄만 변경한다(아래 Step 1). 다른 어떤 부분도 건드리지 않는다.
- 새 dedup 알고리즘을 만들지 않는다 — `checkPoolSelfCollisions`/`checkCrossPoolCollisions`/`checkExactMatchCollisions`/`checkKeywordSelfEcho`/`checkDanglingClausePool`만 재사용.
- 금지쌍(love↔relationships, career↔workplace, money↔business) 축은 **잠긴-잠긴(index0 vs index0) 스킵을 반드시 포함**한다 — 설계 문서의 사전 검증에서 스킵 없이는 이미 배포된 콘텐츠 518건이 즉시 실패로 뜨는 것을 확인했다.
- advice↔카테고리 echo, 카드 간 근접축자, 금지쌍 축은 **양쪽 필드가 모두 `{a,b}` 풀(object)로 변환된 경우에만** 비교한다 — 한쪽이라도 아직 문자열이면 그 조합은 건너뛴다.
- `isLockedCard`(5장 잠긴 카드) 개념은 이번 태스크의 어떤 새 로직에도 필요 없다 — 대신 "40개 1문장 필드는 영원히 문자열로 남는다"는 사실 자체가 타입 자동 감지로 자연히 처리된다.
- 이 태스크 완료 시점에 카드 콘텐츠는 0장 변환 상태이므로, 새로 추가/확장한 모든 축은 실제로는 발동하지 않고 통과해야 한다 — Step 5에서 인메모리 합성 검증으로 로직 자체가 살아있는지 별도로 증명한다.

---

## Task 1: `js/app.js` 1줄 변경 + `tests/tarot-data.test.js` 전면 재설계

**Files:**
- Modify: `js/app.js`
- Modify: `tests/tarot-data.test.js`

**Interfaces:**
- Consumes: `resolveMeaningText`, `resolveSubchoiceValue`(둘 다 `js/app.js` 기존 함수, 시그니처 변경 없음). `checkPoolSelfCollisions`, `simpleWordCollision`, `checkCrossPoolCollisions`, `checkExactMatchCollisions`, `checkKeywordSelfEcho`, `checkDanglingClausePool`(전부 기존 `tests/helpers/dedup-axes.js` export, 시그니처 변경 없음). `makeFullCombinedIssues`, `makeEchoIssue`, `endsWithTerminalPunctuation`(기존 `tests/helpers/dedup.js` export).

- [ ] **Step 1: `js/app.js` 1줄 변경**

`showSummary()` 함수 안, 카테고리 선택 시 분기(현재 795행 부근, `const baseMeaning = categoryReading ? ... : ...`)를 찾아 다음으로 교체:

```js
      const baseMeaning = categoryReading
        ? resolveMeaningText(resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice))
        : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
```

(변경 지점은 정확히 `resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)`를 `resolveMeaningText(...)`로 한 번 더 감싸는 것뿐 — 그 앞의 `categoryReading ? ` 조건과 `:` 뒤의 else 분기는 그대로 둔다.)

- [ ] **Step 2: `tests/tarot-data.test.js` 전체를 아래 내용으로 교체**

파일 전체를 다음 내용으로 완전히 교체한다:

```js
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
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

const deck = getFullDeck();

// ---------------------------------------------------------------------------
// 구조 검증 (기존 검사 유지 + categories는 문자열/{a,b}풀 둘 다 허용하도록 갱신,
// 2026-09-08 categories 랜덤화 설계 참고)
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

function assertStringOrPool(value, label) {
  if (typeof value === 'string') {
    assert.ok(value.length > 0, label + ' must be a non-empty string');
  } else {
    assertPool(value, label);
  }
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

// 카드당 부가정보(keywords/advice)와 세분화 카테고리 구조 검증
// (categories의 각 서브키/단일 필드는 문자열 또는 {a,b}풀 둘 다 허용 — 점진적 변환 지원)
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

function allCategoryFieldsOf() {
  return Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
    return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
  }, []).concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
}
function getCategoryField(card, o, cat, sub) {
  return sub ? card.categories[cat][o][sub] : card.categories[cat][o];
}
function categoryFieldLabel(pair) {
  return pair[0] + (pair[1] ? '.' + pair[1] : '');
}
function convertedCategoryPools(card, dir) {
  const result = [];
  allCategoryFieldsOf().forEach(function (pair) {
    const v = getCategoryField(card, dir, pair[0], pair[1]);
    if (v && typeof v === 'object') result.push({ label: categoryFieldLabel(pair), field: v });
  });
  return result;
}
function collectStringCategoryTexts(card, dir) {
  const texts = [];
  allCategoryFieldsOf().forEach(function (pair) {
    const v = getCategoryField(card, dir, pair[0], pair[1]);
    if (typeof v === 'string') texts.push(v);
  });
  return texts;
}

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
      assertStringOrPool(entry[keys[0]], card.name + ' categories.' + cat + '.' + o + '.' + keys[0]);
      assertStringOrPool(entry[keys[1]], card.name + ' categories.' + cat + '.' + o + '.' + keys[1]);
      assert.notStrictEqual(JSON.stringify(entry[keys[0]]), JSON.stringify(entry[keys[1]]),
        card.name + ' categories.' + cat + '.' + o + ' sub-choices must not be identical');
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      assertStringOrPool(card.categories[cat][o], card.name + ' categories.' + cat + '.' + o);
    });
  });
});

console.log('All 78 cards have valid a/b pool structure for upright/reversed, 6 keywords, 3 advice variants per orientation, valid images, and category fields that are either a non-empty string or a valid {a,b} pool');

// ---------------------------------------------------------------------------
// 중복 검사 (upright/reversed/keywords/advice pool + 변환된 categories pool 대상.
// 아직 문자열인 categories 필드는 각 축에서 자동으로 건너뛴다 —
// 2026-09-08 categories 랜덤화 설계 참고)
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
const simpleWordEcho = function (s1, s2) { const wj = wordJaccard(s1, s2); return wj >= WORD_TH ? 'word=' + wj.toFixed(2) : null; };

// axis 1: 필드 내부 자기중복(upright/reversed + 변환된 categories 풀), axis 2: advice 자기중복,
// axis 3: echo(advice<->upright/reversed.b, advice<->카테고리.a/b, 둘 다 잠긴-잠긴 스킵),
// axis 5: keyword 자기 echo(카테고리 미변환 필드는 항상 잠긴 취급)
const withinCardIssues = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    const keywords = card.keywords[dir];
    const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, keywords); };
    const catPools = convertedCategoryPools(card, dir);

    const selfEntries = [
      { label: 'AXIS1 ' + card.name + ' ' + dir + '.a', values: card[dir].a },
      { label: 'AXIS1 ' + card.name + ' ' + dir + '.b', values: card[dir].b }
    ];
    catPools.forEach(function (cp) {
      selfEntries.push({ label: 'AXIS1 ' + card.name + ' ' + dir + ' ' + cp.label + '.a', values: cp.field.a });
      selfEntries.push({ label: 'AXIS1 ' + card.name + ' ' + dir + ' ' + cp.label + '.b', values: cp.field.b });
    });
    withinCardIssues.push.apply(withinCardIssues, checkPoolSelfCollisions(selfEntries, cmp));

    const advicePool = card.advice[dir];
    withinCardIssues.push.apply(withinCardIssues, checkPoolSelfCollisions(
      [{ label: 'AXIS2 ' + card.name + ' advice.' + dir, values: advicePool }], simpleWord
    ));

    withinCardIssues.push.apply(withinCardIssues, checkCrossPoolCollisions(
      [{ labelA: 'AXIS3 ' + card.name + ' advice.' + dir, valuesA: advicePool, labelB: dir + '.b', valuesB: card[dir].b }],
      echoIssue, function (i, j) { return i === 0 && j === 0; }
    ));
    catPools.forEach(function (cp) {
      withinCardIssues.push.apply(withinCardIssues, checkCrossPoolCollisions(
        [{ labelA: 'AXIS3 ' + card.name + ' advice.' + dir, valuesA: advicePool, labelB: cp.label + '.a', valuesB: cp.field.a }],
        echoIssue, function (i, j) { return i === 0 && j === 0; }
      ));
      withinCardIssues.push.apply(withinCardIssues, checkCrossPoolCollisions(
        [{ labelA: 'AXIS3 ' + card.name + ' advice.' + dir, valuesA: advicePool, labelB: cp.label + '.b', valuesB: cp.field.b }],
        echoIssue, function (i, j) { return i === 0 && j === 0; }
      ));
    });

    const catPoolTexts = [];
    catPools.forEach(function (cp) {
      catPoolTexts.push({ s: cp.field.a[0], locked: true }, { s: cp.field.a[1], locked: false }, { s: cp.field.a[2], locked: false });
      catPoolTexts.push({ s: cp.field.b[0], locked: true }, { s: cp.field.b[1], locked: false }, { s: cp.field.b[2], locked: false });
    });
    const ownTexts = [
      { s: card[dir].a[0], locked: true }, { s: card[dir].a[1], locked: false }, { s: card[dir].a[2], locked: false },
      { s: card[dir].b[0], locked: true }, { s: card[dir].b[1], locked: false }, { s: card[dir].b[2], locked: false },
      { s: advicePool[0], locked: true }, { s: advicePool[1], locked: false }, { s: advicePool[2], locked: false }
    ].concat(catPoolTexts).concat(collectStringCategoryTexts(card, dir).map(function (s) { return { s: s, locked: true }; }));
    const keywordEntries = keywords.map(function (kw, ki) { return { value: kw, locked: ki < 3 }; });
    const textEntries = ownTexts.map(function (t) { return { value: t.s, locked: t.locked }; });
    const echoMatches = checkKeywordSelfEcho(keywordEntries, textEntries, normalizeForEcho, function (kw, t) { return kw.locked && t.locked; });
    echoMatches.forEach(function (m) {
      withinCardIssues.push('AXIS5 ' + card.name + ' ' + dir + ': keyword "' + m.keyword.value + '" appears in its own pool (locked=' + m.text.locked + '): ' + m.text.value);
    });
  });
});
assert.strictEqual(withinCardIssues.length, 0, 'Found ' + withinCardIssues.length + ' within-card issues:\n' + withinCardIssues.join('\n\n'));
console.log('No within-card self-collisions (axis 1, incl. converted category pools), advice self-collisions (axis 2), advice<->b/category echo (axis 3), or keyword self-echo (axis 5)');

// axis 4: 카드 간 완전동일 + 근접축자 (upright/reversed + 변환된 categories 풀, 같은 라벨끼리만)
const occurrences = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        occurrences.push({ value: s, where: card.name + ' ' + dir + '.' + slot + '[' + idx + ']', locked: idx === 0 });
      });
    });
    convertedCategoryPools(card, dir).forEach(function (cp) {
      ['a', 'b'].forEach(function (slot) {
        cp.field[slot].forEach(function (s, idx) {
          occurrences.push({ value: s, where: card.name + ' ' + dir + ' ' + cp.label + '.' + slot + '[' + idx + ']', locked: idx === 0 });
        });
      });
    });
  });
});
const exactIssues = checkExactMatchCollisions(occurrences);
assert.strictEqual(exactIssues.length, 0, 'Found ' + exactIssues.length + ' cross-card exact-match collisions:\n' + exactIssues.join('\n'));
console.log('No cross-card exact-match collisions (incl. converted category pools)');

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
      allCategoryFieldsOf().forEach(function (pair) {
        const f1 = getCategoryField(c1, dir, pair[0], pair[1]), f2 = getCategoryField(c2, dir, pair[0], pair[1]);
        if (typeof f1 !== 'object' || typeof f2 !== 'object') return;
        const label = categoryFieldLabel(pair);
        ['a', 'b'].forEach(function (slot) {
          nearVerbatimIssues.push.apply(nearVerbatimIssues, checkCrossPoolCollisions(
            [{ labelA: c1.name + ' ' + dir + ' ' + label + '.' + slot, valuesA: f1[slot], labelB: c2.name + ' ' + dir + ' ' + label + '.' + slot, valuesB: f2[slot] }],
            lcsCmp, function (x, y) { return x === 0 && y === 0; }
          ));
        });
      });
    });
  }
}
assert.strictEqual(nearVerbatimIssues.length, 0, 'Found ' + nearVerbatimIssues.length + ' cross-card near-verbatim collisions:\n' + nearVerbatimIssues.join('\n'));
console.log('No cross-card near-verbatim collisions (incl. converted category pools, same label only)');

// axis 6: 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (완드2 역방향에서 실제 발견된 결함,
// 2026-09-08 설계 참고). 카테고리 풀(변환된 것만)도 포함.
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
    convertedCategoryPools(card, dir).forEach(function (cp) {
      ['a', 'b'].forEach(function (slot) {
        cp.field[slot].forEach(function (s, idx) {
          danglingEntries.push({
            label: card.name + ' ' + dir + ' ' + cp.label + '.' + slot + '[' + idx + ']', value: s, idx: idx,
            exceptionKey: danglingExceptionKey({ cardId: card.cardId, dir: dir, slot: cp.label + '.' + slot })
          });
        });
      });
    });
  });
});
const danglingResult = checkDanglingClausePool(danglingEntries, endsWithTerminalPunctuation, danglingExceptionKeySet);
assert.strictEqual(danglingResult.issues.length, 0,
  'Found ' + danglingResult.issues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingResult.issues.join('\n'));
console.log('No dangling-clause pool entries (incl. converted category pools, aside from the known wands_2 reversed exception)');
const staleDanglingClauseExceptions = KNOWN_DANGLING_CLAUSE_LOCKED.filter(function (e) { return !danglingResult.usedExceptionKeys.has(danglingExceptionKey(e)); });
assert.strictEqual(staleDanglingClauseExceptions.length, 0,
  'Found ' + staleDanglingClauseExceptions.length + ' stale dangling-clause exception(s) that no longer suppress any violation (safe to remove): ' + JSON.stringify(staleDanglingClauseExceptions));

// axis 7: 카테고리 금지쌍(love<->relationships, career<->workplace, money<->business) —
// 풀 레벨, 잠긴-잠긴(index0 vs index0) 스킵 필수(설계 문서 사전 검증에서 확인됨).
// 양쪽 필드가 모두 변환된 경우에만 비교.
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const forbiddenACollisions = [];
const forbiddenBCollisions = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    const keywords = card.keywords[dir];
    const cmp = function (s1, s2) {
      const found = fullCombinedIssues(s1, s2, keywords);
      return found.length ? found.join(' | ') : null;
    };
    FORBIDDEN_PAIRS.forEach(function (pairDef) {
      const catA = pairDef[0], subsA = pairDef[1], catB = pairDef[2], subsB = pairDef[3];
      subsA.forEach(function (subA) {
        subsB.forEach(function (subB) {
          const fA = getCategoryField(card, dir, catA, subA), fB = getCategoryField(card, dir, catB, subB);
          if (typeof fA !== 'object' || typeof fB !== 'object') return;
          forbiddenACollisions.push.apply(forbiddenACollisions, checkCrossPoolCollisions(
            [{ labelA: card.name + ' ' + dir + ' ' + catA + '.' + subA + '.a', valuesA: fA.a, labelB: catB + '.' + subB + '.a', valuesB: fB.a }],
            cmp, function (i, j) { return i === 0 && j === 0; }
          ));
          forbiddenBCollisions.push.apply(forbiddenBCollisions, checkCrossPoolCollisions(
            [{ labelA: card.name + ' ' + dir + ' ' + catA + '.' + subA + '.b', valuesA: fA.b, labelB: catB + '.' + subB + '.b', valuesB: fB.b }],
            simpleWordEcho, function (i, j) { return i === 0 && j === 0; }
          ));
        });
      });
    });
  });
});
assert.strictEqual(forbiddenACollisions.length, 0,
  'Found ' + forbiddenACollisions.length + ' forbidden-pair category a-pool collisions:\n' + forbiddenACollisions.join('\n'));
console.log('No forbidden-pair category a-pool collisions (love/relationships, career/workplace, money/business)');
assert.strictEqual(forbiddenBCollisions.length, 0,
  'Found ' + forbiddenBCollisions.length + ' forbidden-pair category b-pool collisions:\n' + forbiddenBCollisions.join('\n'));
console.log('No forbidden-pair category b-pool collisions (simple word-Jaccard sweep)');

console.log('All tarot-data tests passed');
```

- [ ] **Step 3: 실행 확인 (변환된 카드 0장 상태)**

Run: `node tests/tarot-data.test.js`
Expected: exit 0. 순서대로 다음 메시지가 출력되어야 한다:
```
All 78 cards have valid a/b pool structure for upright/reversed, 6 keywords, 3 advice variants per orientation, valid images, and category fields that are either a non-empty string or a valid {a,b} pool
No within-card self-collisions (axis 1, incl. converted category pools), advice self-collisions (axis 2), advice<->b/category echo (axis 3), or keyword self-echo (axis 5)
No cross-card exact-match collisions (incl. converted category pools)
No cross-card near-verbatim collisions (incl. converted category pools, same label only)
No dangling-clause pool entries (incl. converted category pools, aside from the known wands_2 reversed exception)
No forbidden-pair category a-pool collisions (love/relationships, career/workplace, money/business)
No forbidden-pair category b-pool collisions (simple word-Jaccard sweep)
All tarot-data tests passed
```
(현재 `data/tarot-data-*.js`는 이 태스크에서 전혀 수정하지 않으므로 categories는 전부 여전히 문자열이다 — 위 축들이 전부 통과하는 건 "위반이 없어서"가 아니라 "비교 대상인 변환된 풀이 아직 하나도 없어서"다. Step 5에서 이 로직 자체가 살아있는지 별도로 증명한다.)

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 합성 카드 변환으로 신규/확장 로직이 실제로 작동하는지 검증 (실제 데이터 파일은 건드리지 않음)**

아래 스크립트는 `DDI`가 아니라 타로 덱을 인메모리로 클론해 카드 1장(`major_1`, "마법사")의 `love.solo`/`love.couple`/`relationships.new` 3개 카테고리 필드만 `{a,b}` 풀로 임시 변환하고, 그 안에 일부러 위반을 심어 6개 축이 전부 실제로 발동하는지 확인한다:

```bash
node -e "
global.TAROT_MAJOR_ARCANA = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('./data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('./data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('./data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('./data/tarot-data.js');
const { wordJaccard, longestCommonSubstring, makeStripBoilerplateSuffix, endsWithTerminalPunctuation } = require('./tests/helpers/dedup.js');
const { checkPoolSelfCollisions, checkCrossPoolCollisions, checkExactMatchCollisions, checkDanglingClausePool } = require('./tests/helpers/dedup-axes.js');
const deck = getFullDeck();
const magician = deck.find(c => c.cardId === 'major_1');
const highPriestess = deck.find(c => c.cardId === 'major_2');

// 1) axis1(필드 내부 자기중복): love.solo.a에 완전 동일한 두 변형 주입
magician.categories.love.upright.solo = { a: ['같은 문장 테스트용 완전히 동일한 문장입니다.', '같은 문장 테스트용 완전히 동일한 문장입니다.', '전혀 다른 세 번째 문장 진짜입니다.'], b: ['그것과 무관한 조언 문장입니다.', '또 다른 무관한 조언입니다.', '세 번째 무관한 조언 문장입니다.'] };
const r1 = checkPoolSelfCollisions([{ label: 'x', values: magician.categories.love.upright.solo.a }], function (s1,s2) { const wj=wordJaccard(s1,s2); return wj>=0.3?['word']:[]; });
console.log('axis1 (expect >=1):', r1.length);

// 2) axis7(금지쌍, love<->relationships): love.couple을 relationships.new와 거의 동일하게 주입 (양쪽 다 인덱스1=비잠금)
magician.categories.love.upright.couple = { a: ['원본 a0 잠긴 문장입니다.', '두 번째 커플 변형 진짜 겹치는 문장 테스트용입니다.', '세 번째 커플 변형입니다.'], b: ['원본 b0 잠긴 문장입니다.', '두 번째 커플 조언 문장입니다.', '세 번째 커플 조언입니다.'] };
magician.categories.relationships.upright.new = { a: ['원본 rel a0 문장입니다.', '두 번째 신규 인연 변형 진짜 겹치는 문장 테스트용입니다.', '세 번째 신규 변형입니다.'], b: ['원본 rel b0 문장입니다.', '두 번째 신규 조언 문장입니다.', '세 번째 신규 조언입니다.'] };
const cmp = function (s1,s2) { const wj=wordJaccard(s1,s2); return wj>=0.3?'word':null; };
const r7 = checkCrossPoolCollisions([{ labelA:'a', valuesA: magician.categories.love.upright.couple.a, labelB:'b', valuesB: magician.categories.relationships.upright.new.a }], cmp, function(i,j){return i===0&&j===0;});
console.log('axis7 (expect >=1, index1-vs-index1 not skipped):', r7.length);

// 3) axis4(카드 간 근접축자): highPriestess의 love.solo를 magician의 love.solo와 거의 동일하게(인덱스1) 주입
highPriestess.categories.love.upright.solo = { a: ['원본 hp a0 문장입니다.', '같은 문장 테스트용 완전히 동일한 문장입니다', '세 번째 hp 변형입니다.'], b: ['원본 hp b0 문장입니다.', '두 번째 hp 조언입니다.', '세 번째 hp 조언입니다.'] };
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(['시기입니다','것입니다','합니다','해보세요','주세요','두세요','하세요','보세요','세요']);
function stripForEcho(s){ return stripBoilerplateSuffix(s.replace(/\s+/g,'').replace(/[.,!?]/g,'')); }
const lcsCmp = function(s1,s2){ const t1=stripForEcho(s1),t2=stripForEcho(s2); const lcs=longestCommonSubstring(t1,t2); return lcs>=20?'lcs='+lcs:null; };
const r4 = checkCrossPoolCollisions([{ labelA:'a', valuesA: magician.categories.love.upright.solo.a, labelB:'b', valuesB: highPriestess.categories.love.upright.solo.a }], lcsCmp, function(x,y){return x===0&&y===0;});
console.log('axis4 near-verbatim (expect >=1, index1-vs-index1 not skipped):', r4.length);

// 4) axis6(dangling-clause): 종결부호 없는 절 주입
const entries = [{ label: 'x[1]', value: '완결되지 않은 절이고,', idx: 1, exceptionKey: 'none' }];
const r6 = checkDanglingClausePool(entries, endsWithTerminalPunctuation, new Set());
console.log('axis6 dangling-clause (expect 1):', r6.issues.length);

// 5) axis4 exact-match: 완전 동일 문자열 두 곳(둘 다 비잠금)
const occ = [{ value: '완전히 동일한 값', where: 'p1', locked: false }, { value: '완전히 동일한 값', where: 'p2', locked: false }];
const r5 = checkExactMatchCollisions(occ);
console.log('exact-match (expect 1):', r5.length);
"
```
Expected: 5개 줄 전부 1 이상. 0이 나오는 항목이 있으면 해당 축의 comparator/skipFn을 다시 확인할 것. 이 스크립트는 인메모리 클론만 조작하며 실제 데이터 파일은 전혀 건드리지 않는다.

- [ ] **Step 6: 최종 회귀 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed` (Step 5의 합성 조작은 별도 프로세스의 인메모리 클론에서만 일어났으므로 이 실행에는 영향이 없다).

- [ ] **Step 7: 커밋**

```bash
git add js/app.js tests/tarot-data.test.js
git commit -m "$(cat <<'EOF'
feat(tarot): prepare categories randomization infra (no content changes)

Wraps showSummary()'s category-selected branch in resolveMeaningText()
so it can render either a plain string or an {a,b} pool (matching the
other 4 modes' resolveCategoryMeaning(), which already does this).
Redesigns tests/tarot-data.test.js: category-field structure checks now
accept either type; the old sentence-level sentence-count and
forbidden-pair checks (a stopgap from when categories were always flat
strings, commit 65db4b8) are replaced by pool-level axes reusing the
dedup-axes shared functions, extended to cover category pools once
converted, plus a new pool-level forbidden-pair axis (with a
locked-locked skip, per the design spec's pre-check finding). No card
content is converted in this commit — every axis correctly no-ops
against the current all-string categories and was independently proven
live via in-memory synthetic-violation injection.

See docs/superpowers/specs/2026-09-08-tarot-categories-randomization-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
