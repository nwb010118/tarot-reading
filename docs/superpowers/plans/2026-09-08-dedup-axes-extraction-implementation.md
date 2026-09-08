# 공유 dedup-axes 헬퍼 추출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tests/{ddi,zodiac,saju,compatibility,tarot}-data.test.js` 5개 파일에 근접 중복된 dedup 비교 로직을 `tests/helpers/dedup-axes.js`(신규)와 `tests/helpers/dedup.js`의 새 팩토리 함수로 추출한다. **순수 리팩터링** — 통과/실패 판정, 임계값, locked-skip 규칙을 바꾸지 않는다.

**Architecture:** `dedup.js`에 `makeFullCombinedIssues`/`makeEchoIssue` 팩토리 2개를 추가하고, 신규 `dedup-axes.js`에 순수 루프 실행 함수 6개(`checkPoolSelfCollisions`, `simpleWordCollision`, `checkCrossPoolCollisions`, `checkExactMatchCollisions`, `checkKeywordSelfEcho`, `checkDanglingClausePool`)를 만든다. 5개 테스트 파일은 엔티티 순회(`allFieldsOf` 등)는 그대로 두고 비교 루프만 공유 함수 호출로 교체한다.

**Tech Stack:** Node.js 내장 `assert`만 사용, `node scripts/run-tests.js`로 전체 실행.

## Global Constraints

- 새 검사 축 추가 없음 — 순수 추출(설계 문서 §목표).
- 통과/실패 판정, 임계값, locked-skip 규칙은 파일마다 기존 그대로 보존한다(설계 문서 §파일별 상세 매핑 표를 정확히 따를 것).
- 허용되는 메시지 포맷 정규화 4건만 예외(설계 문서 §알려진 사소한 정규화): (1) `checkPoolSelfCollisions`의 join 구분자는 항상 `' | '`, (2) `fullCombinedIssues`의 lcs 분기 메시지는 항상 `bigram=` 포함, (3) `checkCrossPoolCollisions`는 항상 `label[i]` 대괄호 표기, (4) `checkCrossPoolCollisions`의 구분자는 항상 `' <-> '`.
- `node scripts/run-tests.js` 10/10 통과를 각 태스크마다 유지해야 한다.
- 각 파일 리팩터링 후 해당 파일의 `console.log` 출력 줄(순서 포함)이 리팩터링 전과 완전히 동일해야 한다 — 이 플랜의 각 태스크는 사전에 캡처한 baseline 파일과 비교하는 단계를 포함한다.
- 궁합의 label 자기echo(axis6), 타로의 category-text 문장수/이미지/구조 검증, 사주의 `ELEMENT_BALANCE_TEXT` 구조 검증은 건드리지 않는다(단일 파일 전용 로직, 설계 문서 §비범위).
- 엔티티/필드 순회 로직(`allFieldsOf`, `deck.forEach`, `EXPECTED_TIERS.forEach`, `getField`, `assertPool`)은 그대로 각 파일에 남긴다.

**Baseline 출력**: 리팩터링 전 5개 파일의 실제 stdout이 이미 캡처되어 있다 — `C:\Users\A\AppData\Local\Temp\claude\C--Users-A-OneDrive----------------\e278b07a-ea60-4198-90bb-26b171139118\scratchpad\dedup-axes-baseline\{ddi,zodiac,saju,compatibility,tarot}.before.txt`. 각 파일 태스크에서 이 baseline과 diff 비교한다. **주의**: 이 경로는 세션별 임시 디렉터리이므로 다른 세션/워크트리에서 이 플랜을 실행할 경우 이 파일이 없을 수 있다 — 그런 경우 태스크를 시작하기 전에 (현재 저장소의, 리팩터링 전) `node tests/X-data.test.js`를 먼저 실행해 baseline을 새로 캡처할 것.

---

## Task 1: `dedup.js` 팩토리 2개 + 신규 `dedup-axes.js` 6개 함수

**Files:**
- Modify: `tests/helpers/dedup.js`
- Create: `tests/helpers/dedup-axes.js`

**Interfaces:**
- Produces: `makeFullCombinedIssues(stripBoilerplateSuffix, significantStems): (s1,s2,keywords)=>string[]`, `makeEchoIssue(stripForEcho): (s1,s2)=>string|null` — both exported from `tests/helpers/dedup.js`.
- Produces: `checkPoolSelfCollisions(entries: {label,values}[], comparatorFn: (s1,s2)=>string[]): string[]`, `simpleWordCollision(wordJaccardFn, threshold): (s1,s2)=>string[]`, `checkCrossPoolCollisions(pairs: {labelA,valuesA,labelB,valuesB}[], comparatorFn: (s1,s2)=>string|null, skipFn?: (i,j)=>boolean): string[]`, `checkExactMatchCollisions(occurrences: {value,where,locked}[]): string[]`, `checkKeywordSelfEcho(keywordEntries: {value,locked}[], textEntries: {value,locked}[], normalizeFn, skipFn?: (kw,t)=>boolean): {keyword,text}[]`, `checkDanglingClausePool(entries: {label,value,idx,exceptionKey}[], endsWithTerminalPunctuationFn, exceptionKeySet: Set<string>): {issues:string[], usedExceptionKeys:Set<string>}` — all exported from `tests/helpers/dedup-axes.js`.

- [ ] **Step 1: `tests/helpers/dedup.js`에 `makeFullCombinedIssues`/`makeEchoIssue` 추가**

`makeSignificantStems` 함수 정의(현재 파일 line 106-112) 바로 다음, `module.exports = {` 앞에 삽입:

```js
function makeFullCombinedIssues(stripBoilerplateSuffix, significantStems) {
  const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
  const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
  return function fullCombinedIssues(s1, s2, keywords) {
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
  };
}

function makeEchoIssue(stripForEcho) {
  const WORD_TH = 0.3, ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10;
  return function echoIssue(s1, s2) {
    const wj = wordJaccard(s1, s2);
    const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
    const bj = bigramJaccard(t1, t2);
    const lcs = longestCommonSubstring(t1, t2);
    if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) {
      return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
    }
    return null;
  };
}
```

`module.exports`에 `makeSignificantStems` 다음 줄로 추가:

```js
  makeFullCombinedIssues,
  makeEchoIssue
```

- [ ] **Step 2: 신규 `tests/helpers/dedup-axes.js` 작성**

```js
// 5개 데이터 테스트 파일(ddi/zodiac/saju/compatibility/tarot)에 근접 중복되던
// "배열 안/배열 간 비교 루프 + 메시지 포맷 + push" 패턴을 모아둔 공유 헬퍼.
// 엔티티 순회(allFieldsOf 등)와 파일별 skip 규칙은 각 파일에 그대로 남기고,
// 순수 비교 루프만 이곳에서 재사용한다. (2026-09-08 dedup-axes 추출 설계 참고)

function checkPoolSelfCollisions(entries, comparatorFn) {
  const issues = [];
  entries.forEach(function (entry) {
    const pool = entry.values;
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const found = comparatorFn(pool[i], pool[j]);
        if (found && found.length) {
          issues.push(entry.label + '[' + i + ',' + j + '] (' + found.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
        }
      }
    }
  });
  return issues;
}

function simpleWordCollision(wordJaccardFn, threshold) {
  return function (s1, s2) {
    const wj = wordJaccardFn(s1, s2);
    return wj >= threshold ? ['word=' + wj.toFixed(2)] : [];
  };
}

function checkCrossPoolCollisions(pairs, comparatorFn, skipFn) {
  const issues = [];
  pairs.forEach(function (pair) {
    pair.valuesA.forEach(function (sA, i) {
      pair.valuesB.forEach(function (sB, j) {
        if (skipFn && skipFn(i, j)) return;
        const found = comparatorFn(sA, sB);
        if (found) {
          issues.push(pair.labelA + '[' + i + ']' + ' <-> ' + pair.labelB + '[' + j + ']' + ' (' + found + ')\n  ' + sA + '\n  ' + sB);
        }
      });
    });
  });
  return issues;
}

function checkExactMatchCollisions(occurrences) {
  const map = new Map();
  occurrences.forEach(function (o) {
    if (!map.has(o.value)) map.set(o.value, []);
    map.get(o.value).push({ where: o.where, locked: o.locked });
  });
  const issues = [];
  map.forEach(function (occ, value) {
    if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
      issues.push('"' + value + '" appears in: ' + occ.map(function (o) { return o.where; }).join(' | '));
    }
  });
  return issues;
}

function checkKeywordSelfEcho(keywordEntries, textEntries, normalizeFn, skipFn) {
  const matches = [];
  keywordEntries.forEach(function (kw) {
    const nk = normalizeFn(kw.value);
    textEntries.forEach(function (t) {
      if (skipFn && skipFn(kw, t)) return;
      if (normalizeFn(t.value).indexOf(nk) !== -1) matches.push({ keyword: kw, text: t });
    });
  });
  return matches;
}

function checkDanglingClausePool(entries, endsWithTerminalPunctuation, exceptionKeySet) {
  const issues = [];
  const used = new Set();
  entries.forEach(function (e) {
    if (endsWithTerminalPunctuation(e.value)) return;
    if (e.idx === 0 && exceptionKeySet.has(e.exceptionKey)) { used.add(e.exceptionKey); return; }
    issues.push(e.label + ' (locked=' + (e.idx === 0) + ') does not end with terminal punctuation: ' + e.value);
  });
  return { issues: issues, usedExceptionKeys: used };
}

module.exports = {
  checkPoolSelfCollisions,
  simpleWordCollision,
  checkCrossPoolCollisions,
  checkExactMatchCollisions,
  checkKeywordSelfEcho,
  checkDanglingClausePool
};
```

- [ ] **Step 3: 합성 데이터로 6개 함수 전부 동작 검증**

Run:
```bash
node -e "
const { wordJaccard, endsWithTerminalPunctuation } = require('./tests/helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./tests/helpers/dedup-axes.js');

// 1) checkPoolSelfCollisions + simpleWordCollision: 완전 동일 문장 2개는 잡히고 다른 문장은 안 잡힘
const cmp1 = simpleWordCollision(wordJaccard, 0.3);
const r1 = checkPoolSelfCollisions([{ label: 'x', values: ['같은 문장 반복 테스트 완전히 동일한 문장입니다.', '같은 문장 반복 테스트 완전히 동일한 문장입니다.', '전혀 다른 내용의 세 번째 문장 진짜로 다릅니다.'] }], cmp1);
console.log('test1 (expect 1):', r1.length);

// 2) checkCrossPoolCollisions: skipFn 있음/없음 차이 확인
const cmp2 = function (s1, s2) { return s1 === s2 ? 'exact' : null; };
const pairs2 = [{ labelA: 'A', valuesA: ['x', 'y'], labelB: 'B', valuesB: ['x', 'z'] }];
const r2a = checkCrossPoolCollisions(pairs2, cmp2, null);
const r2b = checkCrossPoolCollisions(pairs2, cmp2, function (i, j) { return i === 0 && j === 0; });
console.log('test2a (expect 1):', r2a.length, '| test2b (expect 0, skipped):', r2b.length);

// 3) checkExactMatchCollisions: 하나라도 비잠금이면 플래그, 전부 잠금이면 무시
const r3a = checkExactMatchCollisions([{ value: 'A', where: 'e1', locked: true }, { value: 'A', where: 'e2', locked: false }]);
const r3b = checkExactMatchCollisions([{ value: 'A', where: 'e1', locked: true }, { value: 'A', where: 'e2', locked: true }]);
console.log('test3a (expect 1):', r3a.length, '| test3b (expect 0, both locked):', r3b.length);

// 4) checkKeywordSelfEcho
const norm = function (s) { return s.replace(/\s+/g, ''); };
const r4 = checkKeywordSelfEcho([{ value: '사랑', locked: true }], [{ value: '사랑이 넘치는 하루입니다.', locked: false }], norm, null);
console.log('test4 (expect 1):', r4.length);

// 5) checkDanglingClausePool: 예외 등록 시 스킵 + usedExceptionKeys 기록, 예외 없으면 실패
const entries5 = [
  { label: 'x[0]', value: '완결되지 않은 절이고,', idx: 0, exceptionKey: 'k1' },
  { label: 'x[1]', value: '완결된 문장입니다.', idx: 1, exceptionKey: 'k1' }
];
const r5a = checkDanglingClausePool(entries5, endsWithTerminalPunctuation, new Set(['k1']));
const r5b = checkDanglingClausePool(entries5, endsWithTerminalPunctuation, new Set());
console.log('test5a (expect 0 issues, used has k1):', r5a.issues.length, r5a.usedExceptionKeys.has('k1'));
console.log('test5b (expect 1 issue, no exception registered):', r5b.issues.length);
"
```
Expected output:
```
test1 (expect 1): 1
test2a (expect 1): 1 | test2b (expect 0, skipped): 0
test3a (expect 1): 1 | test3b (expect 0, both locked): 0
test4 (expect 1): 1
test5a (expect 0 issues, used has k1): 0 true
test5b (expect 1 issue, no exception registered): 1
```
모든 숫자가 일치하지 않으면 해당 함수의 구현을 다시 확인할 것 — 아직 어떤 테스트 파일도 이 함수들을 쓰지 않으므로 안전하게 반복 수정 가능하다.

- [ ] **Step 4: 커밋**

```bash
git add tests/helpers/dedup.js tests/helpers/dedup-axes.js
git commit -m "$(cat <<'EOF'
refactor(tests): add shared dedup-axes comparison-loop helpers

Adds makeFullCombinedIssues/makeEchoIssue factories to dedup.js and a
new dedup-axes.js with 6 pure loop-runner functions, extracted from the
near-duplicate comparison loops in the 5 fortune-mode data test files.
No test file consumes these yet (next 5 tasks migrate one file each).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `tests/ddi-data.test.js` 리팩터링

**Files:**
- Modify: `tests/ddi-data.test.js`

**Interfaces:**
- Consumes: Task 1의 `makeFullCombinedIssues`(from `./helpers/dedup.js`), `checkPoolSelfCollisions`/`simpleWordCollision`/`checkCrossPoolCollisions`/`checkDanglingClausePool`(from `./helpers/dedup-axes.js`).

- [ ] **Step 1: import 블록에 신규 함수 추가**

파일 최상단 require 블록(현재 line 1-7)을 다음으로 교체:

```js
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
```

- [ ] **Step 2: "중복 검사" 섹션 전체 교체**

`// ---... 중복 검사 — 두 축 ...---` 주석(현재 line 73)부터 `staleDanglingClauseExceptions` assert(현재 line 260)까지 — 즉 구조 검증 섹션 다음부터 `getDdiByYear() 회귀 확인` 주석(현재 line 262) 바로 앞까지 — 전체를 아래 코드로 교체:

```js
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
```

- [ ] **Step 3: 실행 및 baseline 대조**

Run:
```bash
node tests/ddi-data.test.js; echo "exit=$?"
diff "/c/Users/A/AppData/Local/Temp/claude/C--Users-A-OneDrive----------------/e278b07a-ea60-4198-90bb-26b171139118/scratchpad/dedup-axes-baseline/ddi.before.txt" <(node tests/ddi-data.test.js 2>&1) && echo IDENTICAL
```
Expected: `exit=0` 그리고 `IDENTICAL` (diff 출력 없음). 다르면 어떤 줄이 달라졌는지 확인해 원인을 규명할 것(정규화 4건 외의 차이는 전부 버그).

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js`
Expected: `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 커밋**

```bash
git add tests/ddi-data.test.js
git commit -m "$(cat <<'EOF'
refactor(tests): migrate ddi-data.test.js to shared dedup-axes helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `tests/zodiac-data.test.js` 리팩터링

**Files:**
- Modify: `tests/zodiac-data.test.js`

**Interfaces:**
- Consumes: Task 1과 동일.

- [ ] **Step 1: import 블록 교체**

```js
const assert = require('assert');
const { ZODIAC_DATA, getZodiacByKey } = require('../data/zodiac-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');
```

- [ ] **Step 2: "중복 검사" 섹션 전체 교체**

`// ---... 중복 검사 — 네 축 ...---` 주석(현재 line 82)부터 `staleDanglingClauseExceptions` assert(현재 line 255)까지를 아래로 교체 (ddi와 거의 동일하되 `ZODIAC_DATA`/`z`/`allFieldsOf(z)` 사용, advice echo 없음 skip 없음은 동일):

```js
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
```

- [ ] **Step 3: 실행 및 baseline 대조**

Run:
```bash
node tests/zodiac-data.test.js; echo "exit=$?"
diff "/c/Users/A/AppData/Local/Temp/claude/C--Users-A-OneDrive----------------/e278b07a-ea60-4198-90bb-26b171139118/scratchpad/dedup-axes-baseline/zodiac.before.txt" <(node tests/zodiac-data.test.js 2>&1) && echo IDENTICAL
```
Expected: `exit=0`, `IDENTICAL`.

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 커밋**

```bash
git add tests/zodiac-data.test.js
git commit -m "$(cat <<'EOF'
refactor(tests): migrate zodiac-data.test.js to shared dedup-axes helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `tests/saju-data.test.js` 리팩터링

**Files:**
- Modify: `tests/saju-data.test.js`

**Interfaces:**
- Consumes: Task 1의 6개 함수 전부(within-field, advice 자기중복, 3중 echo, 금지쌍, 완전동일, 근접축자, dangling-clause).

- [ ] **Step 1: import 블록 교체**

```js
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
```

- [ ] **Step 2: "중복 검사 — 6개 축" 섹션 전체 교체**

`// ---... 중복 검사 — 6개 축 ...---` 주석(현재 line 97)부터 `nearVerbatimCollisions` assert+console.log(현재 line 351-353, axis6 끝)까지 — 즉 `ELEMENT_BALANCE_TEXT` 구조 검증(그대로 유지, line 90-95) 다음부터 `조회 함수 회귀 확인` 주석(현재 line 355) 바로 앞까지 — 전체를 아래로 교체. **dangling-clause 축은 원본과 동일하게 axis4(금지쌍)와 axis5(완전동일) 사이 위치를 유지한다** — 순서를 바꾸면 콘솔 로그 순서가 달라져 baseline diff가 깨진다.

```js
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
```

**주의**: `FORBIDDEN_FIELD_SET`은 원본 파일에서 최상단(구조 검증 이전, `getField` 정의 직후)에 있었다. 이 플랜에서는 axis6 바로 위로 옮겼다 — `FORBIDDEN_PAIRS`가 이미 파일 최상단에 정의돼 있으므로 이동해도 동작에 영향 없음(단, 파일 상단에 원래 있던 `FORBIDDEN_FIELD_SET` 선언은 삭제해서 중복 선언(`already declared`) 에러가 나지 않게 할 것).

- [ ] **Step 3: 실행 및 baseline 대조**

Run:
```bash
node tests/saju-data.test.js; echo "exit=$?"
diff "/c/Users/A/AppData/Local/Temp/claude/C--Users-A-OneDrive----------------/e278b07a-ea60-4198-90bb-26b171139118/scratchpad/dedup-axes-baseline/saju.before.txt" <(node tests/saju-data.test.js 2>&1) && echo IDENTICAL
```
Expected: `exit=0`, `IDENTICAL`.

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 커밋**

```bash
git add tests/saju-data.test.js
git commit -m "$(cat <<'EOF'
refactor(tests): migrate saju-data.test.js to shared dedup-axes helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `tests/compatibility-data.test.js` 리팩터링

**Files:**
- Modify: `tests/compatibility-data.test.js`

**Interfaces:**
- Consumes: Task 1의 `checkPoolSelfCollisions`/`simpleWordCollision`/`checkCrossPoolCollisions`/`checkExactMatchCollisions`/`checkKeywordSelfEcho`/`checkDanglingClausePool`.

- [ ] **Step 1: import 블록 교체**

```js
const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');
```

- [ ] **Step 2: "중복 검사" 섹션의 axis1~5, axis7(dangling-clause) 교체 — axis6(label 자기echo)은 그대로 둠**

`// ---... 중복 검사 ...---` 주석(현재 line 67)부터 `axis 6: label 자기중복` 블록(현재 line 225-242) **바로 앞까지**를 아래로 교체(즉 axis1~5만 교체, axis6은 원본 그대로 파일에 남긴다):

```js
// ---------------------------------------------------------------------------
// 중복 검사 — 공유 dedup-axes 헬퍼로 구현 (2026-09-08 dedup-axes 추출 설계 참고)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);

const WORD_TH = 0.3;
const NEARVERBATIM_LCS_TH = 20;
const LABEL_ECHO_WHITELIST = ['삼합', '육합', '상생', '상극', '비화', '충', '원소', '동일', '궁합', '최고의', '좋은', '무난한'];

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }
function stripWl(s) { let out = s; LABEL_ECHO_WHITELIST.forEach(function (w) { out = out.split(w).join(''); }); return out; }
function stripForEcho(s) { return stripBoilerplateSuffix(normalizeForEcho(s)); }
const echoIssue = makeEchoIssue(stripForEcho);
const simpleWord = simpleWordCollision(wordJaccard, WORD_TH);

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, data.keywords); };
  withinFieldCollisions.push.apply(withinFieldCollisions, checkPoolSelfCollisions([
    { label: tier + ' text.a', values: data.text.a.map(stripTemplatePrefix) },
    { label: tier + ' text.b', values: data.text.b }
  ], cmp));
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  adviceCollisions.push.apply(adviceCollisions, checkPoolSelfCollisions(
    [{ label: tier + ' advice', values: data.advice }], simpleWord
  ));
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 자기 text.b풀 echo
const echoCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  echoCollisions.push.apply(echoCollisions, checkCrossPoolCollisions(
    [{ labelA: tier + ' advice', valuesA: data.advice, labelB: 'text.b', valuesB: data.text.b }],
    echoIssue, null
  ));
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->text.b render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->text.b render-together echo collisions');

// axis 4: 티어 간 완전동일 + 근접축자
const occurrences = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      const key = slot === 'a' ? stripTemplatePrefix(s) : s;
      occurrences.push({ value: key, where: tier + '.text.' + slot + '[' + idx + ']', locked: idx === 0 });
    });
  });
});
const exactCollisions = checkExactMatchCollisions(occurrences);
assert.strictEqual(exactCollisions.length, 0,
  'Found ' + exactCollisions.length + ' cross-tier exact-match collisions:\n' + exactCollisions.join('\n'));
console.log('No cross-tier exact-match collisions');

const nearVerbatimCollisions = [];
const lcsCmp = function (s1, s2) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
for (let i = 0; i < EXPECTED_TIERS.length; i++) {
  for (let j = i + 1; j < EXPECTED_TIERS.length; j++) {
    const d1 = COMPAT_TIER_DATA[EXPECTED_TIERS[i]], d2 = COMPAT_TIER_DATA[EXPECTED_TIERS[j]];
    ['a', 'b'].forEach(function (slot) {
      const pool1 = slot === 'a' ? d1.text.a.map(stripTemplatePrefix) : d1.text.b;
      const pool2 = slot === 'a' ? d2.text.a.map(stripTemplatePrefix) : d2.text.b;
      nearVerbatimCollisions.push.apply(nearVerbatimCollisions, checkCrossPoolCollisions(
        [{ labelA: EXPECTED_TIERS[i] + '.' + slot, valuesA: pool1, labelB: EXPECTED_TIERS[j] + '.' + slot, valuesB: pool2 }],
        lcsCmp, function (x, y) { return x === 0 && y === 0; }
      ));
    });
  }
}
assert.strictEqual(nearVerbatimCollisions.length, 0,
  'Found ' + nearVerbatimCollisions.length + ' cross-tier near-verbatim collisions:\n' + nearVerbatimCollisions.join('\n'));
console.log('No cross-tier near-verbatim collisions');

// axis 5: keyword 자기중복
const keywordSelfEchoes = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const ownPool = data.text.a.map(stripTemplatePrefix).concat(data.text.b).concat(data.advice);
  const keywordEntries = data.keywords.map(function (kw) { return { value: kw, locked: false }; });
  const textEntries = ownPool.map(function (s, idx) { return { value: s, locked: false, idx: idx }; });
  const matches = checkKeywordSelfEcho(keywordEntries, textEntries, normalizeForEcho, null);
  matches.forEach(function (m) {
    keywordSelfEchoes.push(tier + ': keyword "' + m.keyword.value + '" appears in its own pool[' + m.text.idx + ']: ' + m.text.value);
  });
});
assert.strictEqual(keywordSelfEchoes.length, 0,
  'Found ' + keywordSelfEchoes.length + ' keyword self-echoes:\n' + keywordSelfEchoes.join('\n'));
console.log('No tier keyword self-echoes its own text/advice pool');

```

**이어서 원본 axis6(label 자기중복) 블록은 그대로 파일에 남긴다** (아래 코드를 그대로 유지, 손대지 않음):

```js
// axis 6: label 자기중복
const labelEchoIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const strippedLabel = stripWl(normalizeForEcho(data.label));
  const ownPool = data.text.a.map(stripTemplatePrefix).concat(data.text.b).concat(data.advice);
  ownPool.forEach(function (s, idx) {
    const lcs = longestCommonSubstring(strippedLabel, stripWl(normalizeForEcho(s)));
    if (lcs >= 4) labelEchoIssues.push(tier + ': label "' + data.label + '" shares a ' + lcs + '+ char substring with pool[' + idx + ']: ' + s);
  });
  data.keywords.forEach(function (kw) {
    const strippedKw = stripWl(normalizeForEcho(kw));
    if (strippedKw.length > 0 && strippedLabel.indexOf(strippedKw) !== -1) labelEchoIssues.push(tier + ': label "' + data.label + '" contains its own keyword "' + kw + '" verbatim');
  });
});
assert.strictEqual(labelEchoIssues.length, 0,
  'Found ' + labelEchoIssues.length + ' label self-echo issues:\n' + labelEchoIssues.join('\n'));
console.log('No tier label self-echoes its own text/advice/keywords (excluding whitelisted mechanism terms)');
```

**그다음 axis7(dangling-clause, 현재 line 244-274)을 아래로 교체**:

```js
// axis 7: 조합 문법 검증 — 잠긴 원본(text.a[0]/text.b[0])이 완결되지 않은 절로 끝나면,
// 렌더링 시 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];
const danglingExceptionKey = function (e) { return e.tier + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));
const danglingEntries = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      danglingEntries.push({
        label: tier + ' text.' + slot + '[' + idx + ']', value: s, idx: idx,
        exceptionKey: danglingExceptionKey({ tier: tier, slot: slot })
      });
    });
  });
});
const danglingResult = checkDanglingClausePool(danglingEntries, endsWithTerminalPunctuation, danglingExceptionKeySet);
assert.strictEqual(danglingResult.issues.length, 0,
  'Found ' + danglingResult.issues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingResult.issues.join('\n'));
console.log('No dangling-clause pool entries (all text.a[0..2]/text.b[0..2] end with terminal punctuation, aside from known exceptions)');
const staleDanglingClauseExceptions = KNOWN_DANGLING_CLAUSE_LOCKED.filter(function (e) { return !danglingResult.usedExceptionKeys.has(danglingExceptionKey(e)); });
assert.strictEqual(staleDanglingClauseExceptions.length, 0,
  'Found ' + staleDanglingClauseExceptions.length + ' stale dangling-clause exception(s) that no longer suppress any violation (safe to remove): ' + JSON.stringify(staleDanglingClauseExceptions));
```

- [ ] **Step 3: 실행 및 baseline 대조**

Run:
```bash
node tests/compatibility-data.test.js; echo "exit=$?"
diff "/c/Users/A/AppData/Local/Temp/claude/C--Users-A-OneDrive----------------/e278b07a-ea60-4198-90bb-26b171139118/scratchpad/dedup-axes-baseline/compatibility.before.txt" <(node tests/compatibility-data.test.js 2>&1) && echo IDENTICAL
```
Expected: `exit=0`, `IDENTICAL`.

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 커밋**

```bash
git add tests/compatibility-data.test.js
git commit -m "$(cat <<'EOF'
refactor(tests): migrate compatibility-data.test.js to shared dedup-axes helpers

axis6 (label self-echo) is left untouched — single-consumer logic per
the 2026-09-08 dedup-axes extraction design's non-goals.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `tests/tarot-data.test.js` 리팩터링 + 최종 전체 검증

**Files:**
- Modify: `tests/tarot-data.test.js`

**Interfaces:**
- Consumes: Task 1의 6개 함수 전부.

- [ ] **Step 1: import 블록 교체**

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
  splitSentences, wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');
```

(구조 검증·이미지 경로·문장 수·`FORBIDDEN_PAIRS` 문장 단위 검사 섹션 — 현재 line 20-178 — 은 전혀 손대지 않는다.)

- [ ] **Step 2: "중복 검사 (이번 프로젝트 신규 축 — ...)" 섹션 전체 교체**

`const BOILERPLATE_SUFFIXES = ...`(현재 line 184)부터 파일 마지막 `staleDanglingClauseExceptions` assert(현재 line 363-365) 직전까지 — 즉 `console.log('All tarot-data tests passed')` 바로 앞까지 — 전체를 아래로 교체:

```js
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
```

- [ ] **Step 3: 실행 및 baseline 대조**

Run:
```bash
node tests/tarot-data.test.js; echo "exit=$?"
diff "/c/Users/A/AppData/Local/Temp/claude/C--Users-A-OneDrive----------------/e278b07a-ea60-4198-90bb-26b171139118/scratchpad/dedup-axes-baseline/tarot.before.txt" <(node tests/tarot-data.test.js 2>&1) && echo IDENTICAL
```
Expected: `exit=0`, `IDENTICAL`.

- [ ] **Step 4: 예외 목록이 실제로 작동하는지 최종 재확인 (완드2 케이스로 공유 함수 검증)**

Run:
```bash
node -e "
global.TAROT_MAJOR_ARCANA = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('./data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('./data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('./data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('./data/tarot-data.js');
const { endsWithTerminalPunctuation } = require('./tests/helpers/dedup.js');
const { checkDanglingClausePool } = require('./tests/helpers/dedup-axes.js');
const deck = getFullDeck();
const entries = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        entries.push({ label: card.name + ' ' + dir + '.' + slot + '[' + idx + ']', value: s, idx: idx, exceptionKey: card.cardId + '|' + dir + '|' + slot });
      });
    });
  });
});
const withException = checkDanglingClausePool(entries, endsWithTerminalPunctuation, new Set(['wands_2|reversed|a']));
const withoutException = checkDanglingClausePool(entries, endsWithTerminalPunctuation, new Set());
console.log('with exception (expect 0 issues, used=true):', withException.issues.length, withException.usedExceptionKeys.has('wands_2|reversed|a'));
console.log('without exception (expect 1 issue):', withoutException.issues.length);
"
```
Expected:
```
with exception (expect 0 issues, used=true): 0 true
without exception (expect 1 issue): 1
```
이는 공유 함수 `checkDanglingClausePool`이 실제 타로 데이터에 대해 정확히 이전과 동일하게 작동함을 증명한다(설계 문서 성공 기준).

- [ ] **Step 5: 전체 스위트 + 라인 수 감소 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

Run: `wc -l tests/ddi-data.test.js tests/zodiac-data.test.js tests/saju-data.test.js tests/compatibility-data.test.js tests/tarot-data.test.js tests/helpers/dedup.js tests/helpers/dedup-axes.js`
Expected: 5개 테스트 파일 합계가 리팩터링 전(1,697줄, dedup-axes.js/추가 팩토리 제외)보다 유의미하게 줄어듦.

- [ ] **Step 6: 커밋**

```bash
git add tests/tarot-data.test.js
git commit -m "$(cat <<'EOF'
refactor(tests): migrate tarot-data.test.js to shared dedup-axes helpers

Final file of the 2026-09-08 dedup-axes extraction — all 5 fortune-mode
data test files now share checkPoolSelfCollisions/checkCrossPoolCollisions/
checkExactMatchCollisions/checkKeywordSelfEcho/checkDanglingClausePool
plus the makeFullCombinedIssues/makeEchoIssue comparator factories. No
check's pass/fail behavior changed; verified via before/after console
output diffs on all 5 files plus a full 10/10 suite run.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
