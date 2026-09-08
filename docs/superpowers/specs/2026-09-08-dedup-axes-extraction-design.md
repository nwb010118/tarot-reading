# 공유 dedup axis 헬퍼 추출 — 설계

## 목표

`tests/{ddi,zodiac,saju,compatibility,tarot}-data.test.js` 5개 파일에 근접 중복된 "비교 루프 + 메시지 포맷 + push" 패턴을 `tests/helpers/dedup-axes.js`(신규)로 추출한다. **순수 리팩터링** — 어떤 축의 통과/실패 판정도, 임계값도, locked-skip 규칙도 바꾸지 않는다. 새 검사는 추가하지 않는다([[project-ddi-random-reading]] 후속과제 1번).

## 배경

5개 파일 총 1,697줄 중 상당 부분이 "배열 안에서/배열 간에 문장을 비교하고 임계값을 넘으면 메시지를 만들어 push한다"는 동일한 뼈대를 반복한다. 단, 파일마다 미묘한 차이가 존재한다 — 예: ddi/zodiac의 금지쌍 교차는 locked-locked(index 0 vs 0) 스킵이 없지만 saju는 있다. 이 차이들은 실수가 아니라 각 콘텐츠 서브프로젝트 진행 중 발견된 실제 결함에 대한 대응이므로, 리팩터링 중 실수로 통일되면 회귀가 재발할 수 있다. 이 설계의 핵심 제약은 **모든 기존 차이를 파라미터로 명시적으로 표현해서 보존**하는 것이다.

## 아키텍처

### 새 파일: `tests/helpers/dedup-axes.js`

각 함수는 "이미 평탄화된 배열/페어 목록"을 받아 비교 루프를 실행하고 이슈 문자열(또는 구조화된 매치) 배열을 반환하는 **순수 함수**다. 엔티티 순회(`allFieldsOf()`, `deck.forEach`, `EXPECTED_TIERS.forEach`)와 "어떤 필드가 어떤 파트너와 비교되는가"(금지쌍 정의 등)는 각 파일에 그대로 남는다 — 이 부분은 파일마다 엔티티 형태가 근본적으로 달라 억지로 공유하면 오히려 복잡도가 늘어난다(브레인스토밍에서 "알고리즘만 공유" 승인됨).

### `tests/helpers/dedup.js`에 추가: `makeFullCombinedIssues`

5개 파일의 `fullCombinedIssues(s1, s2, keywords)`는 클로저 변수(`stripBoilerplateSuffix`, `significantStems`)만 다르고 본문은 byte-for-byte 동일하며, 내부 임계값(`WORD_TH=0.3, OPEN_WORD_TH=0.20, OPEN_TRI_TH=0.15, LCS_TH=5, STEM_TH=2, BIGRAM_TH=0.185`)도 5개 파일 전부 동일하다. 기존 `makeStripBoilerplateSuffix`/`makeStem`/`makeSignificantStems` 팩토리 패턴을 그대로 따라 추가한다.

```js
function makeFullCombinedIssues(stripBoilerplateSuffix, significantStems) {
  const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
  const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
  return function fullCombinedIssues(s1, s2, keywords) {
    // 기존 5개 파일의 본문과 완전히 동일 (wordJaccard/trigramJaccard/stripOwnKeywords/
    // longestCommonSubstring/bigramJaccard/significantStems는 이미 같은 모듈 스코프)
    ...
  };
}
module.exports.makeFullCombinedIssues = makeFullCombinedIssues;
```

각 파일은 기존처럼 `stripBoilerplateSuffix`/`significantStems`를 자기 상수(BOILERPLATE_SUFFIXES 등)로 만든 뒤 `const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);`로 교체한다.

## 공유 함수 6종 (`tests/helpers/dedup-axes.js`)

### 1. `checkPoolSelfCollisions(entries, comparatorFn)`

배열 **내부** pairwise(i<j) 자기중복. `entries: [{ label, values }]`. `comparatorFn(s1, s2)`는 이슈 문자열 배열(빈 배열이면 무이슈)을 반환 — enhanced(`fullCombinedIssues`) 또는 simple(word-Jaccard만) 둘 다 이 형태로 감싸 재사용.

```js
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
```

**용도**: within-field 자기중복(5파일 전부) + advice 자기중복(5파일 전부) = 10개 호출부.

### 2. `simpleWordCollision(wordJaccardFn, threshold)`

`dedup-axes.js`에 함께 둘 작은 팩토리 — "word-Jaccard만으로 비교" 콤포지터를 한 줄 반복 대신 재사용.

```js
function simpleWordCollision(wordJaccardFn, threshold) {
  return function (s1, s2) {
    const wj = wordJaccardFn(s1, s2);
    return wj >= threshold ? ['word=' + wj.toFixed(2)] : [];
  };
}
```

### 3. `checkCrossPoolCollisions(pairs, comparatorFn, skipFn)`

서로 다른 두 배열 **간** 교차 비교(i,j 전부). `pairs: [{ labelA, valuesA, labelB, valuesB }]`. `comparatorFn(sA, sB)`는 이슈 설명 문자열 또는 falsy(무이슈)를 반환(enhanced/simple/echo 전부 이 계약으로 통일). `skipFn(i, j)`는 optional — true면 그 조합을 건너뜀. **이 콜백 하나로 파일마다 다른 locked-skip 규칙을 전부 표현**한다(아래 매핑 표 참고).

```js
function checkCrossPoolCollisions(pairs, comparatorFn, skipFn) {
  const issues = [];
  pairs.forEach(function (pair) {
    pair.valuesA.forEach(function (sA, i) {
      pair.valuesB.forEach(function (sB, j) {
        if (skipFn && skipFn(i, j)) return;
        const found = comparatorFn(sA, sB);
        if (found) {
          issues.push(pair.labelA + i + ' <-> ' + pair.labelB + j + ' (' + found + ')\n  ' + sA + '\n  ' + sB);
        }
      });
    });
  });
  return issues;
}
```

**용도**: 금지쌍 a/b 교차(ddi/zodiac/saju), advice↔b풀 echo(ddi/zodiac/saju/compat), advice/b↔ELEMENT_BALANCE_TEXT echo(saju), advice↔category-text echo(tarot), 근접축자(saju axis6, compat/tarot axis4b) = 15개 이상 호출부.

### 4. `checkExactMatchCollisions(occurrences)`

값 → 발생위치 Map을 만들어 "2회 이상 등장 AND 그 중 하나 이상이 비잠금(locked=false)"이면 플래그. `occurrences: [{ value, where, locked }]`.

```js
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
```

**용도**: saju axis5(엔티티 간 완전동일), compat axis4(티어 간 완전동일), tarot axis4(카드 간 완전동일).

### 5. `checkKeywordSelfEcho(keywordEntries, textEntries, normalizeFn, skipFn)`

키워드가 자기 풀 텍스트에 substring으로 등장하는지 검사. 매치를 구조화된 객체로 반환하고, 메시지 포맷은 파일마다 다르므로(궁합은 tier명, 타로는 카드명+방향) 호출부가 직접 포맷한다.

```js
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
```

**용도**: compat axis5, tarot AXIS5.

### 6. `checkDanglingClausePool(entries, endsWithTerminalPunctuation, exceptionKeySet)`

이번 프로젝트 직전에 5개 파일에 100% 동일하게 추가한 dangling-clause 축. 예외 객체 모양이 파일마다 달라(`{key,field,slot}`/`{tier,slot}`/`{cardId,dir,slot}`) 공유 함수는 문자열로 직렬화된 예외 키만 다룬다 — 모양을 몰라도 됨.

```js
function checkDanglingClausePool(entries, endsWithTerminalPunctuation, exceptionKeySet) {
  // entries: [{ label, value, idx, exceptionKey }]
  const issues = [];
  const used = new Set();
  entries.forEach(function (e) {
    if (endsWithTerminalPunctuation(e.value)) return;
    if (e.idx === 0 && exceptionKeySet.has(e.exceptionKey)) { used.add(e.exceptionKey); return; }
    issues.push(e.label + ' (locked=' + (e.idx === 0) + ') does not end with terminal punctuation: ' + e.value);
  });
  return { issues: issues, usedExceptionKeys: used };
}
```

각 파일은 `KNOWN_DANGLING_CLAUSE_LOCKED`(기존 객체 배열, 주석 포함, 그대로 유지)를 문자열 키 Set으로 변환해 넘기고, 반환된 `usedExceptionKeys`로 기존 stale-exception assert를 그대로 재구성한다.

**용도**: 5개 파일 전부(6번째로 재사용도가 가장 높음 — 이미 100% 동일 로직).

## 파일별 상세 매핑

아래 표는 구현자가 각 호출부에서 **정확히 어떤 comparator/skipFn을 써야 기존 동작이 보존되는지** 규정한다. `없음`은 `skipFn`을 아예 넘기지 않음(모든 조합 검사)을 뜻한다.

| 파일 | 축 | 함수 | comparator | skipFn |
|---|---|---|---|---|
| ddi/zodiac/saju | within-field 자기중복 | `checkPoolSelfCollisions` | enhanced(자기 keywords) | — |
| ddi/zodiac/saju | advice 자기중복 | `checkPoolSelfCollisions` | simple(WORD_TH=0.3) | — |
| compat | axis1 (text.a/b 자기중복) | `checkPoolSelfCollisions` | enhanced | — |
| compat | axis2 (advice 자기중복) | `checkPoolSelfCollisions` | simple | — |
| tarot | AXIS1 (upright/reversed a/b 자기중복) | `checkPoolSelfCollisions` | enhanced(card.keywords[dir]) | — |
| tarot | AXIS2 (advice 자기중복) | `checkPoolSelfCollisions` | simple | — |
| ddi/zodiac | 금지쌍 a-pool 교차 | `checkCrossPoolCollisions` | enhanced | 없음 |
| ddi/zodiac | 금지쌍 b-pool 교차 | `checkCrossPoolCollisions` | simple | 없음 |
| saju | 금지쌍 a-pool 교차 (axis4) | `checkCrossPoolCollisions` | enhanced | `(i,j)=>i===0&&j===0` |
| saju | 금지쌍 b-pool 교차 (axis4) | `checkCrossPoolCollisions` | simple | 없음 |
| ddi/zodiac | advice↔b풀 echo | `checkCrossPoolCollisions` | simple | 없음 |
| saju | advice↔b풀 echo (axis3) | `checkCrossPoolCollisions` | enhanced echo(word/bigram/lcs) | `(i,j)=>i===0&&j===0` |
| saju | advice↔BALANCE_TEXTS (axis3) | `checkCrossPoolCollisions` | enhanced echo | `(i,j)=>i===0` |
| saju | b풀↔BALANCE_TEXTS (axis3) | `checkCrossPoolCollisions` | enhanced echo | `(i,j)=>j===0` |
| compat | advice↔text.b echo (axis3) | `checkCrossPoolCollisions` | enhanced echo | 없음 |
| tarot | advice↔b풀 echo (AXIS3) | `checkCrossPoolCollisions` | enhanced echo | `(i,j)=>i===0&&j===0` |
| tarot | advice↔category-text echo (AXIS3) | `checkCrossPoolCollisions` | enhanced echo | `(i,j)=>i===0` |
| saju | 같은 엔티티 내 비금지쌍 근접축자 (axis6) | `checkCrossPoolCollisions` | `(s1,s2)=>{lcs>=20 ? 'lcs='+lcs : null}` | `(i,j)=>i===0&&j===0` |
| compat | 티어 간 근접축자 (axis4b) | `checkCrossPoolCollisions` | 위와 동일 | `(i,j)=>i===0&&j===0` |
| tarot | 카드 간 근접축자 (axis4b) | `checkCrossPoolCollisions` | 위와 동일 | `(i,j)=>i===0&&j===0` |
| saju | 엔티티 간 완전동일 (axis5) | `checkExactMatchCollisions` | — | — |
| compat | 티어 간 완전동일 (axis4a) | `checkExactMatchCollisions` | — | — |
| tarot | 카드 간 완전동일 (axis4a) | `checkExactMatchCollisions` | — | — |
| compat | axis5 (keyword 자기 echo) | `checkKeywordSelfEcho` | — | 없음(모든 조합 검사) |
| tarot | AXIS5 (keyword 자기 echo) | `checkKeywordSelfEcho` | — | `(kw,t)=>kw.locked&&t.locked` |
| 5개 파일 전부 | dangling-clause 축 | `checkDanglingClausePool` | — | (내장) |

**교차 검증 방법(구현자용)**: 각 호출부를 옮긴 뒤 그 축의 `assert.strictEqual(..., 0, ...)` 메시지가 여전히 0건을 반환하는지, 그리고 리팩터링 전 코드를 그대로 실행했을 때와 **완전히 동일한 콘솔 로그 문구**가 나오는지 확인한다. 하나라도 다르면 (a) skipFn/comparator가 잘못 옮겨졌거나 (b) 원본 자체에 버그가 있었던 것이므로 즉시 원인을 규명한다.

## 구현 시 유의사항 (모호함 방지)

- **`checkCrossPoolCollisions`용 enhanced comparator 예시**: `fullCombinedIssues`는 배열을 반환하므로, 문자열/falsy 계약에 맞게 감싼다.
  ```js
  const cmp = function (sA, sB) {
    const found = fullCombinedIssues(sA, sB, ddi.keywords); // keywords는 엔티티별 클로저로 바인딩
    return found.length ? found.join(' | ') : null;
  };
  ```
- **근접축자 comparator는 내부에서 정규화해야 한다**: 원본 코드는 `longestCommonSubstring` 비교 직전에 `stripBoilerplateSuffix(normalizeForEcho(s))`(또는 saju의 `stripForEcho(s)`)로 정규화하지만, 실패 메시지에는 **정규화 전 원본 문자열**을 그대로 출력한다. `checkCrossPoolCollisions`는 `pair.valuesA`/`valuesB`의 원본 값을 메시지에 쓰고 comparator에도 그대로 넘기므로, comparator 자신이 내부에서 정규화 후 비교해야 한다:
  ```js
  const nearVerbatimCmp = function (s1, s2) {
    const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
    const lcs = longestCommonSubstring(t1, t2);
    return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
  };
  ```
  절대 `pairs` 배열 자체에 미리 정규화된 문자열을 넣지 말 것 — 메시지가 원본과 달라진다.
- **엔티티별 컨텍스트(keywords, name_kr 등)는 공유 함수의 인자가 아니라 comparator/label을 만드는 클로저로 바인딩한다.** 공유 함수 시그니처 자체는 엔티티 형태를 몰라야 한다는 원칙을 지키기 위함.

## 알려진 사소한 정규화 (동작 변화 아님, 메시지 포맷 통일)

타로 AXIS1의 이슈 join 구분자가 `found.join('|')`(공백 없음)로 다른 4개 파일의 `found.join(' | ')`(공백 있음)과 달랐다. 이 추출 과정에서 `checkPoolSelfCollisions`가 항상 `' | '`를 쓰도록 통일한다. 이 문자열은 **해당 축이 실패할 때만** assert 메시지에 나타나며 현재 5개 파일 전부 통과 상태이므로, 실질적 동작(통과/실패 여부)에는 아무 영향이 없다.

## 비범위

- 새로운 검사 축 추가 없음(엄격히 순수 추출).
- 파일마다 1곳에서만 쓰이는 로직은 그대로 둔다: 궁합 axis6(label 자기echo — `label` 필드는 궁합에만 존재), 타로의 category-text 문장수 검사·이미지 경로 검증·카드 구조 검증, 사주의 `ELEMENT_BALANCE_TEXT` 구조 검증 자체.
- 엔티티/필드 순회 로직(`allFieldsOf`, `deck.forEach`, `EXPECTED_TIERS.forEach`, `getField`, `assertPool`)은 그대로 각 파일에 남는다.
- 임계값 상수(`WORD_TH` 등)를 바꾸거나 파일 간 통일하지 않는다 — 이미 전부 동일한 값이므로 통일할 필요도 없다(그래서 `makeFullCombinedIssues`에 내장 가능).
- 후속과제 2번(ddi/zodiac에 근접축자 소급 추가)은 이 프로젝트의 범위가 아니다 — 이 추출이 끝나면 그 축을 ddi/zodiac에 추가하는 다음 프로젝트가 `checkCrossPoolCollisions`를 재사용할 수 있게 되는 것이 부수 효과일 뿐이다.

## 성공 기준

- `node scripts/run-tests.js` 10/10 통과 유지.
- 5개 파일 각각의 콘솔 로그 문구가 리팩터링 전과 완전히 동일(타로 AXIS1의 join 구분자 정규화 제외).
- 5개 파일의 총 라인 수가 유의미하게 감소(현재 1,697줄 — 정확한 목표치는 두지 않되, 각 파일에서 비교 루프 보일러플레이트가 사라져야 함).
- 최소 하나의 공유 함수(`checkDanglingClausePool` 권장 — 이미 검증된 패턴)에 대해, 인메모리로 합성 위반을 주입해 공유 함수가 실제로 위반을 잡아내는지 재확인(리팩터링이 겉보기에만 통과하는 게 아님을 증명).
- 각 파일에서 제거된 inline 비교 함수(`fullCombinedIssues`, `echoIssue` 등)와 공유 함수 사용부가 정확히 위 매핑 표와 일치하는지 리뷰 시 표로 대조 가능해야 함.
