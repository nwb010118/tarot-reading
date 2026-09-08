# 조합 문법 검증(dangling-clause) 축 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5개 운세 모드(띠운세/별자리/사주/궁합/타로)의 `{a,b}` 풀 구조 전체에 대해, 잠긴 원본 문장(`a[0]`/`b[0]`)이 종결부호 없이 끝나 무작위 조합 시 비문이 렌더링되는 결함을 잡는 영구 회귀 테스트 축을 추가한다.

**Architecture:** `tests/helpers/dedup.js`에 순수 판별 함수 `endsWithTerminalPunctuation(s)`를 추가하고, 5개 데이터 테스트 파일(`tests/{ddi,zodiac,saju,compatibility,tarot}-data.test.js`) 각각에 기존 `assertPool`/`allFieldsOf` 순회 패턴을 재사용하는 새 검사 축을 추가한다. 인덱스 1/2(신규 콘텐츠) 위반은 예외 없이 실패, 인덱스 0(잠긴 원본) 위반은 파일별 `KNOWN_DANGLING_CLAUSE_LOCKED` 예외 목록에 등록된 경우만 스킵한다.

**Tech Stack:** Node.js 내장 `assert` 모듈만 사용(외부 테스트 프레임워크 없음), `node scripts/run-tests.js`로 전체 실행.

## Global Constraints

- 새 판별 함수는 순수 함수 한 줄: `s.trim()`이 `.`/`!`/`?`로 끝나는지 boolean 반환. (설계 문서 §범위)
- 검사 대상은 각 테스트 파일이 이미 `assertPool`로 순회하는 것과 동일한 `{a,b}` 풀 전체(6개 원소: `a[0,1,2]`, `b[0,1,2]`). (설계 문서 §범위)
- 인덱스 1/2 위반 → 예외 없이 항상 실패. 인덱스 0 위반 → 파일 상단 예외 목록에 명시적으로 등록된 경우만 스킵, 등록 시 왜 안전한지 주석 필수. (설계 문서 §범위)
- 현재 유일한 예외: 타로 `wands_2`의 `reversed.a[0]` 한 건만 등록. 나머지 4개 파일은 빈 배열로 시작. (설계 문서 §범위)
- 공유 axis 헬퍼 추출(`tests/helpers/dedup-axes.js`)은 이번 작업 범위 아님 — 각 파일에 축을 하나씩 추가하는 기존 관례를 따른다. (설계 문서 §비범위)
- 새 콘텐츠 작성이나 데이터 수정 없음 — 순수 검증 로직 추가만 한다. (설계 문서 §비범위)
- `node scripts/run-tests.js` 10/10 통과를 항상 유지해야 한다. (설계 문서 §성공 기준)
- 별도 서브에이전트 dispatch 없이 단일 태스크로 직접 구현한다. (설계 문서 §작업 분량 및 진행 방식)

---

## Task 1: dangling-clause 판별 헬퍼 추가 + 5개 데이터 테스트 파일에 검사 축 추가

**Files:**
- Modify: `tests/helpers/dedup.js`
- Modify: `tests/ddi-data.test.js`
- Modify: `tests/zodiac-data.test.js`
- Modify: `tests/saju-data.test.js`
- Modify: `tests/compatibility-data.test.js`
- Modify: `tests/tarot-data.test.js`

**Interfaces:**
- Produces: `endsWithTerminalPunctuation(s: string): boolean` — exported from `tests/helpers/dedup.js`, consumed by all 5 test files via existing `require('./helpers/dedup.js')` destructure.
- Consumes (already present in each file, unchanged): `assertPool(field, label)`, `getField(entity, cat, sub)`; zodiac's `allFieldsOf(z)` and saju's `allFieldsOf()` (existing, reused as-is); ddi gets a new same-shape `allFieldsOf()` (see Step 3).

- [ ] **Step 1: `endsWithTerminalPunctuation` 헬퍼를 dedup.js에 추가**

`tests/helpers/dedup.js`에서 `bigramJaccard` 함수 정의 직후(line 70 `}` 다음), `makeStripBoilerplateSuffix` 정의 앞에 삽입:

```js
function endsWithTerminalPunctuation(s) {
  return /[.!?]$/.test(s.trim());
}
```

그리고 `module.exports`에 `bigramJaccard,` 바로 다음 줄에 추가:

```js
  endsWithTerminalPunctuation,
```

- [ ] **Step 2: 헬퍼 동작을 즉석 스크립트로 검증**

Run:
```bash
node -e "const {endsWithTerminalPunctuation}=require('./tests/helpers/dedup.js'); console.log(endsWithTerminalPunctuation('좋은 시기입니다.'), endsWithTerminalPunctuation('계획이 충분히 다져지지 않았거나,'), endsWithTerminalPunctuation('  괜찮아요!  '))"
```
Expected: `true false true` (앞뒤 공백은 trim으로 무시됨, 쉼표로 끝나는 절은 false).

- [ ] **Step 3: ddi-data.test.js — `allFieldsOf()` 헬퍼 추가 + import 확장**

`tests/ddi-data.test.js` 상단 import를 확장(파일 최상단 require 블록):

```js
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');
```

`getField` 함수 정의(line 21-23) 바로 다음, `assertPool` 함수 정의 앞에 추가:

```js
function allFieldsOf() {
  return [['trait', null]]
    .concat(Object.keys(SUBDIVIDED_CATEGORIES).reduce(function (acc, cat) {
      return acc.concat(SUBDIVIDED_CATEGORIES[cat].map(function (sub) { return [cat, sub]; }));
    }, []))
    .concat(SINGLE_CATEGORIES.map(function (cat) { return [cat, null]; }));
}
```

- [ ] **Step 4: ddi-data.test.js — dangling-clause 축 추가**

`'No forbidden-pair b-pool collisions (simple word-Jaccard sweep)'` 를 출력하는 `console.log` 줄(기존 파일 line 207) 바로 다음, `getDdiByYear() 회귀 확인` 주석 블록(기존 line 209) 앞에 삽입:

```js
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
```

- [ ] **Step 5: ddi-data.test.js 단독 실행으로 통과 확인**

Run: `node tests/ddi-data.test.js`
Expected: 마지막 줄이 `All ddi-data tests passed`이고, 그 앞에 `No dangling-clause pool entries...` 로그가 출력됨. exit code 0.

- [ ] **Step 6: 축이 실제로 결함을 잡아내는지 인메모리 재현으로 검증 (파일은 건드리지 않음)**

Run:
```bash
node -e "
const { DDI_DATA } = require('./data/ddi-data.js');
const { endsWithTerminalPunctuation } = require('./tests/helpers/dedup.js');
const clone = JSON.parse(JSON.stringify(DDI_DATA));
clone[0].trait.a[1] = clone[0].trait.a[1].replace(/[.!?]+\s*$/, '');
let found = 0;
clone.forEach(function (ddi) {
  ['a','b'].forEach(function (slot) {
    ddi.trait[slot].forEach(function (s, idx) {
      if (!endsWithTerminalPunctuation(s)) found++;
    });
  });
});
console.log('violations found:', found);
"
```
Expected: `violations found: 1` — 종결부호를 제거한 인덱스 1 문장 하나만 잡힘. 이는 실제 데이터 파일을 수정하지 않고 인메모리 클론에서만 위반을 주입해 검증하므로 안전하다. 이 결과로 dangling-clause 감지 로직 자체가 실제로 작동함을 확인했으므로, 나머지 4개 파일에는 동일 패턴을 적용하고 Step 12의 전체 스위트 통과로 최종 확인한다.

- [ ] **Step 7: zodiac-data.test.js — import 확장 + 축 추가**

`tests/zodiac-data.test.js` 상단 import 확장(zodiac은 이미 `allFieldsOf(z)`가 있으므로 재사용):

```js
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');
```

`'No forbidden-pair b-pool collisions (simple word-Jaccard sweep)'`를 출력하는 `console.log` 줄(기존 line 211) 바로 다음, `getZodiacByKey() 회귀 검사` 주석 블록(기존 line 213) 앞에 삽입:

```js
// ---------------------------------------------------------------------------
// 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
// ---------------------------------------------------------------------------

const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];

function isKnownDanglingClauseLocked(entityKey, fieldLabel, slot) {
  return KNOWN_DANGLING_CLAUSE_LOCKED.some(function (e) {
    return e.key === entityKey && e.field === fieldLabel && e.slot === slot;
  });
}

const danglingClauseIssues = [];
ZODIAC_DATA.forEach(function (z) {
  allFieldsOf(z).forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? z.trait : getField(z, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        if (endsWithTerminalPunctuation(s)) return;
        if (idx === 0 && isKnownDanglingClauseLocked(z.key, fieldLabel, slot)) return;
        danglingClauseIssues.push(z.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + '] (locked=' + (idx === 0) + ') does not end with terminal punctuation: ' + s);
      });
    });
  });
});

assert.strictEqual(danglingClauseIssues.length, 0,
  'Found ' + danglingClauseIssues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingClauseIssues.join('\n'));

console.log('No dangling-clause pool entries (all a[0..2]/b[0..2] end with terminal punctuation, aside from known exceptions)');
```

Run: `node tests/zodiac-data.test.js`
Expected: 마지막 줄 `All zodiac-data tests passed`, exit code 0.

- [ ] **Step 8: saju-data.test.js — import 확장 + 축 추가**

`tests/saju-data.test.js` 상단 import 확장(saju는 이미 `allFieldsOf()`가 있으므로 재사용):

```js
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');
```

`'No forbidden-pair b-pool collisions'`를 출력하는 `console.log` 줄(기존 line 260) 바로 다음, `// axis 5: 일간 간 완전동일 검사` 주석(기존 line 262) 앞에 삽입:

```js
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
```

Run: `node tests/saju-data.test.js`
Expected: 마지막 줄 `All saju-data tests passed`, exit code 0.

- [ ] **Step 9: compatibility-data.test.js — import 확장 + 축 추가**

`tests/compatibility-data.test.js` 상단 import 확장:

```js
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');
```

`'No tier label self-echoes its own text/advice/keywords (excluding whitelisted mechanism terms)'`를 출력하는 `console.log` 줄(기존 line 241) 바로 다음, `getCompatTierInfo() 회귀 확인` 주석 블록(기존 line 243) 앞에 삽입. compatibility는 `{a,b}` 풀이 `data.text.a`/`data.text.b` 하나뿐이라 `allFieldsOf`가 필요 없다. `text.a`는 `{a}와(과) {b}은(는) ` 접두사로 시작하지만 검사 대상은 끝부분이므로 접두사를 벗길 필요가 없다:

```js
// axis 7: 조합 문법 검증 — 잠긴 원본(text.a[0]/text.b[0])이 완결되지 않은 절로 끝나면,
// 렌더링 시 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];
function isKnownDanglingClauseLocked(tierKey, slot) {
  return KNOWN_DANGLING_CLAUSE_LOCKED.some(function (e) {
    return e.tier === tierKey && e.slot === slot;
  });
}
const danglingClauseIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      if (endsWithTerminalPunctuation(s)) return;
      if (idx === 0 && isKnownDanglingClauseLocked(tier, slot)) return;
      danglingClauseIssues.push(tier + ' text.' + slot + '[' + idx + '] (locked=' + (idx === 0) + ') does not end with terminal punctuation: ' + s);
    });
  });
});
assert.strictEqual(danglingClauseIssues.length, 0,
  'Found ' + danglingClauseIssues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingClauseIssues.join('\n'));
console.log('No dangling-clause pool entries (all text.a[0..2]/text.b[0..2] end with terminal punctuation, aside from known exceptions)');
```

Run: `node tests/compatibility-data.test.js`
Expected: 마지막 줄 `All compatibility-data tests passed`, exit code 0.

- [ ] **Step 10: tarot-data.test.js — import 확장 + 축 추가 (알려진 예외 1건 등록)**

`tests/tarot-data.test.js` 상단 import 확장:

```js
const {
  splitSentences, wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation
} = require('./helpers/dedup.js');
```

`'No cross-card near-verbatim collisions'`를 출력하는 `console.log` 줄(기존 line 328) 바로 다음, `console.log('All tarot-data tests passed')`(기존 line 330) 앞에 삽입. 여기서 완드2 역방향 예외를 등록한다:

```js
// axis 6: 조합 문법 검증 — 잠긴 원본(a[0]/b[0])이 완결되지 않은 절로 끝나면, 렌더링 시
// 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (완드2 역방향에서 실제 발견된 결함,
// 2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  { cardId: 'wands_2', dir: 'reversed', slot: 'a' }
  // "계획이 충분히 다져지지 않았거나,"(잠긴 a[0]) — 형제 b[1]/b[2]가 이 절과 자연스럽게
  // 이어지도록 재작성됨. 2026-09-08 최종 리뷰 fix wave에서 9개 조합 전부 수동 검증됨(커밋 388f756).
];
function isKnownDanglingClauseLocked(cardId, dir, slot) {
  return KNOWN_DANGLING_CLAUSE_LOCKED.some(function (e) {
    return e.cardId === cardId && e.dir === dir && e.slot === slot;
  });
}
const danglingClauseIssues = [];
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        if (endsWithTerminalPunctuation(s)) return;
        if (idx === 0 && isKnownDanglingClauseLocked(card.cardId, dir, slot)) return;
        danglingClauseIssues.push(card.name + ' ' + dir + '.' + slot + '[' + idx + '] (locked=' + (idx === 0) + ') does not end with terminal punctuation: ' + s);
      });
    });
  });
});
assert.strictEqual(danglingClauseIssues.length, 0,
  'Found ' + danglingClauseIssues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingClauseIssues.join('\n'));
console.log('No dangling-clause pool entries (all upright/reversed a[0..2]/b[0..2] end with terminal punctuation, aside from the known wands_2 reversed exception)');
```

Run: `node tests/tarot-data.test.js`
Expected: 마지막 줄 `All tarot-data tests passed`, exit code 0. 완드2 역방향 `a[0]`이 예외 목록 덕에 스킵되고 다른 77장 + 완드2 upright는 전부 통과해야 한다.

- [ ] **Step 11: 타로 예외가 실제로 스킵되는지 확인 (예외 제거 시 실패로 전환되는지 검증)**

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
const deck = getFullDeck();
let found = 0;
deck.forEach(function (card) {
  ['upright','reversed'].forEach(function (dir) {
    ['a','b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        if (!endsWithTerminalPunctuation(s)) found++;
      });
    });
  });
});
console.log('raw violations (no exception list applied):', found);
"
```
Expected: `raw violations (no exception list applied): 1` — 예외 목록을 적용하지 않은 원시 스캔에서는 완드2 역방향 `a[0]` 단 1건만 걸림. 이는 Step 10에서 추가한 축이 예외 목록 없이는 실제로 실패를 발생시킴을 증명하고(설계 문서 성공 기준 4번), 동시에 사전 조사에서 확인한 "정확히 1건, 노이즈 0건" 결과가 여전히 유효함을 재확인한다.

- [ ] **Step 12: 전체 테스트 스위트 실행**

Run: `node scripts/run-tests.js`
Expected: 모든 파일이 `PASS`로 출력되고 마지막 줄이 `10 test files, 10 passed, 0 failed`. exit code 0.

- [ ] **Step 13: 커밋**

```bash
git add tests/helpers/dedup.js tests/ddi-data.test.js tests/zodiac-data.test.js tests/saju-data.test.js tests/compatibility-data.test.js tests/tarot-data.test.js
git commit -m "$(cat <<'EOF'
test: add combo-grammar dangling-clause check axis across 5 fortune modes

Adds endsWithTerminalPunctuation() to tests/helpers/dedup.js and a new
regression axis to each of the 5 {a,b}-pool data test files, guarding
against locked reference sentences (a[0]/b[0]) that end mid-clause and
would render as broken Korean when randomly combined with a sibling
variant. Registers the one known pre-existing exception (tarot wands_2
reversed a[0], safe per the 2026-09-08 fix wave in commit 388f756).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
