# 엔티티 간 완전동일/근접축자 소급 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tests/ddi-data.test.js`와 `tests/zodiac-data.test.js`에 엔티티 간 완전동일 + 엔티티 간 근접축자(LCS≥20) 축을 신규 추가하고, `tests/saju-data.test.js`에는 엔티티 간 근접축자만 신규 추가한다(saju는 완전동일이 이미 axis5로 존재).

**Architecture:** 이미 존재하는 공유 함수 `checkExactMatchCollisions`/`checkCrossPoolCollisions`(둘 다 `tests/helpers/dedup-axes.js`)를 compat/타로의 axis4와 동일한 방식으로 호출하는 코드를 3개 파일 끝(회귀 확인 섹션 앞)에 추가한다. 새 알고리즘은 없다 — 순수 호출부 추가.

**Tech Stack:** Node.js 내장 `assert`만 사용, `node scripts/run-tests.js`로 전체 실행.

## Global Constraints

- 새 알고리즘/새 공유 함수 없음 — `checkExactMatchCollisions`/`checkCrossPoolCollisions`를 그대로 재사용한다(설계 문서 §목표).
- 근접축자는 **같은 필드·같은 슬롯**끼리만 비교한다(다른 필드 간 비교는 하지 않음) — compat axis4b/타로 AXIS4b와 동일한 스코프(설계 문서 §범위).
- 근접축자 skip은 `(x,y)=>x===0&&y===0`(양쪽 다 잠긴 원본일 때만) — 기존 saju axis6/compat axis4b/타로 AXIS4b와 동일한 규칙(설계 문서).
- saju의 기존 axis5(엔티티 간 완전동일)/axis6(같은 엔티티 내 근접축자)는 전혀 수정하지 않는다 — 새 축은 axis6 뒤에 추가만 한다(설계 문서 §범위).
- saju는 `NEARVERBATIM_LCS_TH`/`stripForEcho`가 이미 모듈 스코프에 있으므로 **재선언하지 말고 재사용**한다 — `const` 재선언은 SyntaxError.
- 사전 스캔(2026-09-08)에서 ddi 위반 2건을 발견해 이미 수정·커밋(`d0af807`) — zodiac/saju/수정된 ddi 전부 현재 0건임을 확인했으므로, 이 플랜의 각 태스크는 축 추가 직후 바로 통과해야 한다.
- `node scripts/run-tests.js` 10/10 통과를 각 태스크마다 유지해야 한다.
- 기존 axis들의 `console.log` 출력 줄은 순서를 포함해 그대로 유지되고, 새 줄은 정확히 지정된 위치(회귀 확인 섹션 직전)에 추가로만 나타나야 한다.

**Baseline 출력**: 3개 파일의 변경 전 실제 stdout이 이미 캡처되어 있다 — `C:\Users\A\AppData\Local\Temp\claude\C--Users-A-OneDrive----------------\e278b07a-ea60-4198-90bb-26b171139118\scratchpad\cross-entity-baseline\{ddi,zodiac,saju}.before.txt`. 이 경로는 세션별 임시 디렉터리이므로, 다른 세션/워크트리에서 이 플랜을 실행하는데 파일이 없다면 태스크 시작 전 `node tests/X-data.test.js > <경로>/X.before.txt 2>&1`로 새로 캡처할 것.

---

## Task 1: `tests/ddi-data.test.js` — 엔티티 간 완전동일 + 근접축자 추가

**Files:**
- Modify: `tests/ddi-data.test.js`

**Interfaces:**
- Consumes: `checkExactMatchCollisions`(신규 import), `checkCrossPoolCollisions`(기존 import)를 `./helpers/dedup-axes.js`에서. `longestCommonSubstring`(기존 import), `makeStripBoilerplateSuffix`로 이미 만들어진 `stripBoilerplateSuffix`(기존 로컬 상수)를 `./helpers/dedup.js`에서.

- [ ] **Step 1: import 블록에 `checkExactMatchCollisions` 추가**

파일 최상단의 `./helpers/dedup-axes.js` require(현재 line 8-10)를 다음으로 교체:

```js
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');
```

- [ ] **Step 2: 엔티티 간 완전동일 + 근접축자 축 추가**

`staleDanglingClauseExceptions` assert(기존 코드에서 dangling-clause 축의 마지막 줄, `JSON.stringify(staleDanglingClauseExceptions)`로 끝나는 assert) 바로 다음, `// getDdiByYear() 회귀 확인` 주석 블록 앞에 삽입:

```js
// ---------------------------------------------------------------------------
// 엔티티 간 완전동일 + 근접축자 (2026-09-08 후속과제 2번 설계 참고)
// ---------------------------------------------------------------------------

const NEARVERBATIM_LCS_TH = 20;
function stripForEcho(s) {
  return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
}

const crossEntityOccurrences = [];
DDI_DATA.forEach(function (ddi) {
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        crossEntityOccurrences.push({ value: s, where: ddi.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']', locked: idx === 0 });
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
for (let i = 0; i < DDI_DATA.length; i++) {
  for (let j = i + 1; j < DDI_DATA.length; j++) {
    const e1 = DDI_DATA[i], e2 = DDI_DATA[j];
    allFieldsOf().forEach(function (pair) {
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
```

- [ ] **Step 3: 실행 확인**

Run: `node tests/ddi-data.test.js`
Expected: exit 0. 출력에서 `No dangling-clause pool entries...` 줄 다음, `getDdiByYear() correctly resolves...` 줄 앞에 정확히 두 줄이 새로 추가되어 있어야 한다: `No cross-entity exact-match collisions`와 `No cross-entity near-verbatim collisions`. 그 외 모든 줄(구조 검증부터 dangling-clause까지, 그리고 getDdiByYear 이후)은 baseline(`.../cross-entity-baseline/ddi.before.txt`)과 순서·내용이 완전히 동일해야 한다.

- [ ] **Step 4: 합성 위반 주입으로 두 축이 실제로 작동하는지 검증 (실제 데이터 파일은 건드리지 않음)**

Run:
```bash
node -e "
const { DDI_DATA } = require('./data/ddi-data.js');
const { checkExactMatchCollisions, checkCrossPoolCollisions } = require('./tests/helpers/dedup-axes.js');
const { longestCommonSubstring, makeStripBoilerplateSuffix } = require('./tests/helpers/dedup.js');
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(['시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요']);
function stripForEcho(s) { return stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, '')); }

// exact-match: monkey(index0)의 trait.a[1]을 rat(index4)의 trait.a[1]과 완전히 동일하게 주입
const cloneExact = JSON.parse(JSON.stringify(DDI_DATA));
cloneExact[0].trait.a[1] = cloneExact[4].trait.a[1];
const occ = [];
cloneExact.forEach(function (ddi) {
  ['a','b'].forEach(function (slot) {
    ddi.trait[slot].forEach(function (s, idx) { occ.push({ value: s, where: ddi.key+'.trait.'+slot+'['+idx+']', locked: idx===0 }); });
  });
});
console.log('exact-match violations after injection (expect >=1):', checkExactMatchCollisions(occ).length);

// near-verbatim: monkey(index0)의 trait.a[1]에 rat(index4)의 trait.a[1]과 20자 이상 겹치되 완전히 동일하지는 않은 문자열 주입
const cloneNear = JSON.parse(JSON.stringify(DDI_DATA));
cloneNear[0].trait.a[1] = cloneNear[4].trait.a[1].slice(0, -1) + '!';
const lcsCmp = function (s1, s2) { const t1=stripForEcho(s1), t2=stripForEcho(s2); const lcs=longestCommonSubstring(t1,t2); return lcs>=20 ? 'lcs='+lcs : null; };
const nearIssues = checkCrossPoolCollisions(
  [{ labelA: 'monkey.trait.a', valuesA: cloneNear[0].trait.a, labelB: 'rat.trait.a', valuesB: cloneNear[4].trait.a }],
  lcsCmp, function (x, y) { return x === 0 && y === 0; }
);
console.log('near-verbatim violations after injection (expect >=1):', nearIssues.length);
"
```
Expected: 두 줄 다 1 이상. 0이 나오면 해당 축의 comparator/threshold를 다시 확인할 것.

- [ ] **Step 5: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 6: 커밋**

```bash
git add tests/ddi-data.test.js
git commit -m "$(cat <<'EOF'
test(ddi): add cross-entity exact-match and near-verbatim regression axes

Backfills the permanent-test gap identified in the 2026-09-05 one-time
sweep (project-ddi-random-reading follow-up #2) — ddi had no permanent
test catching two signs' fields echoing each other near-verbatim or
exactly. Reuses checkExactMatchCollisions/checkCrossPoolCollisions from
the dedup-axes extraction, same shape as compatibility/tarot's existing
axis4. Pre-check sweep (see 2026-09-08-cross-entity-near-verbatim design
spec) found and fixed 2 real violations in a separate prior commit
(d0af807); this commit only adds the regression test.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `tests/zodiac-data.test.js` — 엔티티 간 완전동일 + 근접축자 추가

**Files:**
- Modify: `tests/zodiac-data.test.js`

**Interfaces:**
- Consumes: Task 1과 동일한 공유 함수. `allFieldsOf(z)`는 zodiac 고유 시그니처(인자를 받지만 내부에서 안 씀) — 기존 관례대로 인자를 넘겨 호출한다.

- [ ] **Step 1: import 블록에 `checkExactMatchCollisions` 추가**

파일 최상단의 `./helpers/dedup-axes.js` require(현재 line 8-10)를 다음으로 교체:

```js
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');
```

- [ ] **Step 2: 엔티티 간 완전동일 + 근접축자 축 추가**

`staleDanglingClauseExceptions` assert 다음, `// getZodiacByKey() 회귀 검사` 주석 블록 앞에 삽입:

```js
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
```

- [ ] **Step 3: 실행 확인**

Run: `node tests/zodiac-data.test.js`
Expected: exit 0. `No dangling-clause pool entries...` 다음, `getZodiacByKey() correctly resolves...` 앞에 `No cross-entity exact-match collisions` / `No cross-entity near-verbatim collisions` 두 줄만 새로 추가. 나머지는 baseline(`.../cross-entity-baseline/zodiac.before.txt`)과 완전히 동일.

- [ ] **Step 4: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

(Task 1에서 이미 합성 위반 주입 검증을 완료했으므로 — 두 파일이 정확히 같은 공유 함수를 같은 방식으로 호출하므로 — zodiac에서 별도로 반복하지 않는다. 로직이 정상 동작함은 이미 증명됨.)

- [ ] **Step 5: 커밋**

```bash
git add tests/zodiac-data.test.js
git commit -m "$(cat <<'EOF'
test(zodiac): add cross-entity exact-match and near-verbatim regression axes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `tests/saju-data.test.js` — 엔티티 간 근접축자 추가

**Files:**
- Modify: `tests/saju-data.test.js`

**Interfaces:**
- Consumes: `checkCrossPoolCollisions`(이미 import돼 있음, 추가 import 불필요). `NEARVERBATIM_LCS_TH`/`stripForEcho`/`longestCommonSubstring`도 이미 모듈 스코프에 있으므로 **재선언하지 않고 재사용**한다.

- [ ] **Step 1: 엔티티 간 근접축자 축 추가 (완전동일은 이미 axis5로 존재하므로 추가하지 않음)**

`console.log('No same-entity non-forbidden-pair near-verbatim collisions');`(axis6의 마지막 줄) 바로 다음, `// 조회 함수 회귀 확인` 주석 블록 앞에 삽입:

```js
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
```

이 코드는 axis6에서 이미 정의된 `lcsCmp`(`stripForEcho`+`longestCommonSubstring`+`NEARVERBATIM_LCS_TH` 사용)를 그대로 재사용한다 — 새로 만들지 말 것. `var`를 쓴 것은 파일의 기존 스타일(`var cat`, `var field` 등)과 맞춘 것이다.

- [ ] **Step 2: 실행 확인**

Run: `node tests/saju-data.test.js`
Expected: exit 0. `No same-entity non-forbidden-pair near-verbatim collisions` 다음, `getIlganByIndex()/getElementBalanceText() correctly resolve...` 앞에 `No cross-entity near-verbatim collisions` 한 줄만 새로 추가. 나머지는 baseline(`.../cross-entity-baseline/saju.before.txt`)과 완전히 동일.

- [ ] **Step 3: 전체 스위트 확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 4: 커밋**

```bash
git add tests/saju-data.test.js
git commit -m "$(cat <<'EOF'
test(saju): add cross-entity near-verbatim regression axis

saju already had cross-entity exact-match (axis5) and same-entity
near-verbatim (axis6, non-forbidden-pair) — this closes the one
remaining gap (cross-entity near-verbatim) using the same
checkCrossPoolCollisions call shape as ddi/zodiac (this plan's Tasks
1-2) and compatibility/tarot's existing axis4b. Reuses axis6's existing
lcsCmp/NEARVERBATIM_LCS_TH/stripForEcho rather than redeclaring them.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
