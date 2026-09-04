# 리딩 랜덤화 — 궁합 단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/compatibility-data.js`의 `COMPAT_TIER_DATA` 11개 티어의 `text` 필드를 "관찰절(A)+조언절(B)" 슬롯 배열(`{a:[...3], b:[...3]}`)로, `keywords`(3→6)/`advice`(1→3)를 풀로 확장해 궁합 리딩이 매번 랜덤하게 달라지도록 만든다. 이 모드는 카테고리 개념이 없어(티어당 필드 1개) 다른 3개 모드보다 범위가 훨씬 작고, `{a}`/`{b}` 이름 치환 로직 때문에 이번엔 `data/compatibility-data.js` 자체에 작은 코드 변경이 필요하다.

**Architecture:** 데이터 스키마는 이전 3개 모드와 동일한 `{a,b}` 풀 패턴을 쓰되 카테고리 중첩이 없다. `getCompatTierInfo(tier, labelA, labelB)`(`data/compatibility-data.js`에 정의, `js/compatibility-calc.js`가 아님)에 `pickRandom`/`resolveTierText` 헬퍼를 추가해 풀에서 무작위 조합을 뽑은 뒤 `{a}`/`{b}`를 실제 이름으로 치환한다. `keywords`/`advice`는 그대로 통과시켜 `js/app.js`의 기존 `renderKeywordsAdviceHtml()`(변경 없음)가 처리한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음). Node `assert` 기반 테스트, `tests/helpers/dedup.js`의 기존 공유 함수 재사용(신규 export 불필요).

## Global Constraints

- 대상은 `data/compatibility-data.js`(`COMPAT_TIER_DATA` 11개 티어) 하나뿐이다. `js/app.js`, `js/compatibility-calc.js`, 다른 모드의 데이터 파일은 전혀 수정하지 않는다.
- `score`/`label`은 **절대 변경하지 않는다** — 실제 궁합 판정 결과에 연결된 고정값이다(사주의 `ELEMENT_BALANCE_TEXT`와 같은 성격).
- 각 티어 `text`의 기존 값이 새 배열의 인덱스 0(`a[0]`/`b[0]`)이 되어야 하며, 절대 수정하지 않는다. 기존 `text`는 항상 정확히 두 문장이고 **첫 문장에만 `{a}`/`{b}` 자리표시자가 등장, 둘째 문장엔 등장하지 않는다** — `a[0]`이 첫 문장, `b[0]`이 둘째 문장이 된다.
- 신규 변형은 슬롯당 2개씩 추가해 풀 크기를 3으로 만든다(`a`/`b` 각 정확히 3개). **신규 `a[1]`/`a[2]`는 `{a}`와 `{b}`를 정확히 1회씩 포함해야 하고, 신규 `b[1]`/`b[2]`는 포함하면 안 된다** — 기존 관례를 따른다.
- `keywords`는 3개(기존, 순서 유지) + 3개(신규, 뒤에 추가) = 정확히 6개 배열(distinct). `advice`는 기존 문자열이 인덱스 0이 되고 신규 2개를 추가해 정확히 3개 배열.
- **잠긴 참조**: `same_element` 티어 — 아래 Task 1 Step 1에 실제 dedup 알고리즘(모든 축 + 기존 keyword/label 자기중복 검사)으로 검증(0건 확인됨)까지 마친 최종 콘텐츠가 그대로 제공되어 있다. **이 블록은 절대 수정하지 않는다.**
- 티어 순서·키는 완전히 동일: `same_element, complement, other, samhap, yukhap, same, none, chung, sangsaeng, bihwa, sanggeuk`(11개).
- **중복검사는 4개 축 + 기존에 이미 확립된 2개의 자기중복 검사(합쳐서 6개 체크)**:
  1. **필드 내부 자기중복**: 같은 티어의 `text.a` 3개끼리, `text.b` 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합, 상투구·자기 keywords 제거 후). **`text.a` 비교 전에는 반드시 공통 템플릿 프리픽스 `'{a}와(과) {b}은(는) '`를 제거한다** — 모든 티어의 `a`가 이 프리픽스를 공유하므로 제거하지 않으면 거짓 충돌이 대량 발생한다.
  2. **advice 풀 자기중복**: 티어당 advice 3개끼리 word-Jaccard≥0.3 단순 스윕.
  3. **advice↔자기 text.b풀 echo(강화)**: 모든 `advice[i]`를 그 티어의 `text.b[j]`와 비교. 판정: `word-Jaccard≥0.3 OR bigram≥0.30 OR LCS≥10`(비교 전 양쪽 상투구 제거 — `궁합이에요`/`궁합입니다`를 상투구 목록에 반드시 포함).
  4. **티어 간 완전동일 + 근접축자**: 11개 티어 전체의 `text.a`(템플릿 프리픽스 제거 후)/`text.b`/`advice` 풀을 모아 (a) 바이트 단위 완전 동일 문자열 검사, (b) 티어가 다른 같은 슬롯(`a`↔`a`, `b`↔`b`) 조합에 LCS≥20 검사(상투구 제거 후). **잠긴-잠긴(양쪽 다 인덱스 0) 비교는 스킵한다.**
  5. **keyword 자기중복**(기존 테스트에 이미 있던 검사, 새 풀 구조로 확장): 각 티어의 keywords 6개 전부가 그 티어의 `text.a`(템플릿 프리픽스 제거)/`text.b`/`advice` 풀 어디에도 부분 문자열로 등장하면 안 된다(공백·문장부호 제거 후 비교).
  6. **label 자기중복**(기존 테스트에 이미 있던 검사, 새 풀 구조로 확장): 각 티어의 `label`이 그 티어의 `text.a`/`text.b`/`advice` 풀, keywords와 공유 어근(LCS≥4, 메커니즘 용어 화이트리스트 `['삼합','육합','상생','상극','비화','충','원소','동일','궁합','최고의','좋은','무난한']` 제외 후) 또는 keyword가 label에 부분 문자열로 포함되면 안 된다.
- `data/compatibility-data.js`는 작은따옴표(`'...'`) 스타일을 쓴다.
- 공유 dedup 테스트 헬퍼 추출은 이번 단계에서 하지 않는다(사용자 확인 완료, 타로 단계에서 재검토).

---

## Task 1: `data/compatibility-data.js` 콘텐츠 변환 (11개 티어 전체)

**Files:**
- Modify: `data/compatibility-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `COMPAT_TIER_DATA`의 11개 티어 전부 `text`가 `{a:[...3], b:[...3]}` 구조로, `keywords`가 6개 배열로, `advice`가 3개 배열로 변경됨. `score`/`label`은 원본 그대로 유지. Task 2(코드 변경)와 Task 3(테스트)가 이 새 구조를 전제로 동작한다.

- [ ] **Step 1: "same_element" 티어를 아래 잠긴 참조 콘텐츠로 정확히 교체**

`data/compatibility-data.js`의 `COMPAT_TIER_DATA.same_element`(현재 파일 2~8행)를 다음으로 통째로 교체한다. **이 콘텐츠는 이미 실제 dedup 알고리즘(위 6개 체크 전부)으로 검증되어 충돌 0건임이 확인되었다 — 한 글자도 수정하지 않는다.**

```js
  same_element: {
    score: 90,
    label: '동일원소 — 최고의 궁합',
    text: {
      a: [
        '{a}와(과) {b}은(는) 같은 원소라 마음이 잘 통하는 궁합이에요.',
        '{a}와(과) {b}은(는) 같은 기운을 타고나 처음부터 편안하게 어울리는 궁합이에요.',
        '{a}와(과) {b}은(는) 결이 닮아 있어 저절로 마음이 맞는 궁합이에요.'
      ],
      b: [
        '비슷한 방식으로 세상을 바라보니 대화가 잘 통합니다.',
        '취향과 리듬이 비슷해 함께 있는 시간이 자연스럽게 편안해집니다.',
        '굳이 설명하지 않아도 서로를 이해하는 순간이 많습니다.'
      ]
    },
    keywords: ["공감", "편안함", "동질감", "안정감", "동조", "찰떡"],
    advice: [
      "닮은 점이 많은 만큼, 가끔은 서로의 다른 부분에도 관심을 기울이면 관계가 더 풍성해질 거예요.",
      "잘 맞는 사이일수록 상대의 새로운 모습에도 관심을 유지해보세요.",
      "익숙함에 기대는 것도 좋지만 가끔은 새로운 자극도 함께 나눠보세요."
    ]
  },
```

주의: 이 데이터셋은 keywords/advice를 큰따옴표로, 나머지(`text`/`label`)는 작은따옴표로 쓰는 기존 파일의 **혼합 스타일**을 그대로 따른다(원본 파일을 참고 — `score`/`label`/`text`는 작은따옴표, `keywords`/`advice`는 큰따옴표).

- [ ] **Step 2: 나머지 10개 티어(complement, other, samhap, yukhap, same, none, chung, sangsaeng, bihwa, sanggeuk)에 같은 패턴 적용**

각 티어에 대해:

1. 기존 `text`(정확히 두 문장)를 `{ a: [문장1], b: [문장2] }`로 나눈다. `score`/`label`은 절대 변경하지 않는다.
2. `a[1]`/`a[2]`(관찰절 변형 2개, 각각 `{a}`/`{b}` 정확히 1회 포함)와 `b[1]`/`b[2]`(조언절 변형 2개, 이름 자리표시자 없음)를 새로 쓴다. **주어/문장 구조 자체를 바꿔서 변형하라** — 같은 필드의 3개 변형이 뼈대만 같고 단어만 바뀐 mad-libs가 되지 않도록 주의한다(같은 티어 프로젝트에서 실제로 발견됐던 패턴).
3. `keywords`에 그 티어의 성격을 반영한 신규 3개를 기존 3개 뒤에 추가한다(총 6개, 기존과 겹치지 않게). **신규 키워드가 그 티어 자신의 `text`/`advice` 풀 어디에도 부분 문자열로 등장하지 않는지 확인한다**(공백/문장부호 제거 후 비교) — 이 프로젝트의 원조 궁합 콘텐츠 확장 단계에서 실제로 발견됐던 결함 유형이다.
4. `advice`에 신규 2개를 기존 1개(이제 인덱스 0) 뒤에 추가한다(총 3개). **advice는 자기 자신의 `text.b`풀과 같은 화면에 나란히 렌더되므로, 새 advice 변형이 그 티어의 `text.b` 어떤 변형과도 문장 뼈대를 공유하지 않는지 특히 신경 써서 작성한다.**
5. 각 티어의 `label`과 새로 쓴 `text`/`advice`/`keywords`가 겹치지 않는지 확인한다(메커니즘 용어 — 삼합/육합/상생/상극/비화/충/원소/동일/궁합/최고의/좋은/무난한 — 는 원래 겹쳐도 됨).
6. `text`/`label`은 작은따옴표, `keywords`/`advice`는 큰따옴표(기존 파일의 혼합 스타일)를 유지한다.

- [ ] **Step 3: 스윕 스크립트 작성**

프로젝트 루트에 임시 파일 `scratch-dedup-check.js`(작업 완료 후 삭제, 커밋하지 않음)로 저장하고 `node scratch-dedup-check.js`로 실행한다. Global Constraints의 6개 체크를 그대로 구현한다:

```javascript
const { COMPAT_TIER_DATA } = require('./data/compatibility-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./tests/helpers/dedup.js');

const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
}

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15, LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10, NEARVERBATIM_LCS_TH = 20;
const LABEL_ECHO_WHITELIST = ['삼합', '육합', '상생', '상극', '비화', '충', '원소', '동일', '궁합', '최고의', '좋은', '무난한'];

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }
function stripWl(s) { let out = s; LABEL_ECHO_WHITELIST.forEach(w => { out = out.split(w).join(''); }); return out; }

function fullCheck(s1, s2, keywords, label) {
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
  const shared = [...new Set(st1.filter(x => st2.includes(x)))];
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  if (issues.length) { console.log('[' + label + '] ' + issues.join('|') + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}
function simpleCheck(s1, s2, label) {
  const wj = wordJaccard(s1, s2);
  if (wj >= WORD_TH) { console.log('[' + label + '] word=' + wj.toFixed(2) + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}
function echoCheck(s1, s2, label) {
  const wj = wordJaccard(s1, s2);
  const t1 = stripBoilerplateSuffix(s1.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const t2 = stripBoilerplateSuffix(s2.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const bj = bigramJaccard(t1, t2), lcs = longestCommonSubstring(t1, t2);
  if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) { console.log('[' + label + '] word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}
function nearVerbatimCheck(s1, s2, label) {
  const t1 = stripBoilerplateSuffix(s1.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const t2 = stripBoilerplateSuffix(s2.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const lcs = longestCommonSubstring(t1, t2);
  if (lcs >= NEARVERBATIM_LCS_TH) { console.log('[' + label + '] lcs=' + lcs + '\n  ' + s1 + '\n  ' + s2); return true; }
  return false;
}

const TIERS = Object.keys(COMPAT_TIER_DATA).filter(t => typeof COMPAT_TIER_DATA[t].text === 'object');
let found = 0;

TIERS.forEach(tier => {
  const data = COMPAT_TIER_DATA[tier];
  // 1) 필드 내부 자기중복
  for (let i = 0; i < data.text.a.length; i++) for (let j = i + 1; j < data.text.a.length; j++)
    if (fullCheck(stripTemplatePrefix(data.text.a[i]), stripTemplatePrefix(data.text.a[j]), data.keywords, tier + ' AXIS1-A[' + i + ',' + j + ']')) found++;
  for (let i = 0; i < data.text.b.length; i++) for (let j = i + 1; j < data.text.b.length; j++)
    if (fullCheck(data.text.b[i], data.text.b[j], data.keywords, tier + ' AXIS1-B[' + i + ',' + j + ']')) found++;
  // 2) advice 자기중복
  for (let i = 0; i < data.advice.length; i++) for (let j = i + 1; j < data.advice.length; j++)
    if (simpleCheck(data.advice[i], data.advice[j], tier + ' AXIS2[' + i + ',' + j + ']')) found++;
  // 3) advice <-> 자기 b풀 echo
  data.text.b.forEach((b, j) => data.advice.forEach((adv, i) => { if (echoCheck(adv, b, tier + ' AXIS3 advice[' + i + '] vs b[' + j + ']')) found++; }));
  // 5) keyword 자기중복
  const ownPool = data.text.a.map(stripTemplatePrefix).concat(data.text.b).concat(data.advice);
  data.keywords.forEach(kw => {
    const normKw = normalizeForEcho(kw);
    ownPool.forEach((s, idx) => { if (normalizeForEcho(s).includes(normKw)) { found++; console.log('[' + tier + ' KEYWORD-SELF-ECHO] "' + kw + '" in pool[' + idx + ']: ' + s); } });
  });
  // 6) label 자기중복
  const strippedLabel = stripWl(normalizeForEcho(data.label));
  ownPool.forEach((s, idx) => {
    const lcs = longestCommonSubstring(strippedLabel, stripWl(normalizeForEcho(s)));
    if (lcs >= 4) { found++; console.log('[' + tier + ' LABEL-ECHO] lcs=' + lcs + ' pool[' + idx + ']: ' + s); }
  });
  data.keywords.forEach(kw => {
    const strippedKw = stripWl(normalizeForEcho(kw));
    if (strippedKw.length > 0 && strippedLabel.includes(strippedKw)) { found++; console.log('[' + tier + ' LABEL-ECHO-KW] "' + kw + '" in label'); }
  });
});

// 4) 티어 간 완전동일 + 근접축자
const seen = new Map();
TIERS.forEach(tier => {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(slot => {
    data.text[slot].forEach((s, idx) => {
      const key = slot === 'a' ? stripTemplatePrefix(s) : s;
      const where = tier + '.text.' + slot + '[' + idx + ']';
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push({ where, locked: idx === 0 });
    });
  });
});
seen.forEach((occ, text) => {
  if (occ.length > 1 && occ.some(o => !o.locked)) { found++; console.log('[AXIS4-EXACT] "' + text + '" in: ' + occ.map(o => o.where).join(' | ')); }
});
for (let i = 0; i < TIERS.length; i++) {
  for (let j = i + 1; j < TIERS.length; j++) {
    const d1 = COMPAT_TIER_DATA[TIERS[i]], d2 = COMPAT_TIER_DATA[TIERS[j]];
    ['a', 'b'].forEach(slot => {
      const pool1 = slot === 'a' ? d1.text.a.map(stripTemplatePrefix) : d1.text.b;
      const pool2 = slot === 'a' ? d2.text.a.map(stripTemplatePrefix) : d2.text.b;
      pool1.forEach((s1, x) => pool2.forEach((s2, y) => {
        if (x === 0 && y === 0) return;
        if (nearVerbatimCheck(s1, s2, 'AXIS4-NEAR ' + TIERS[i] + '.' + slot + x + ' vs ' + TIERS[j] + '.' + slot + y)) found++;
      }));
    });
  }
}

console.log('Found ' + found + ' issues');
```

`Found 0 issues`가 나올 때까지 충돌이 발견된 새 변형(인덱스 1·2, 신규 keywords/advice)을 수정하고 재실행한다. **인덱스 0(기존 문장), `score`, `label`은 절대 수정하지 않는다.** `same_element`는 이미 검증되었으므로 관련 항목은 0건이어야 한다. 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

Read 도구로 11개 티어 전체를 다시 읽어 다음을 육안으로 확인한다: `text.a`/`text.b`가 각 3개 배열인지, `keywords`가 6개인지, `advice`가 3개인지, `score`/`label`이 원본과 동일한지, 기존 인덱스 0 문장이 원본과 바이트 단위로 동일한지, 신규 `a[1]`/`a[2]`는 `{a}`/`{b}`를 각 1회 포함하고 신규 `b[1]`/`b[2]`는 포함하지 않는지.

- [ ] **Step 5: 커밋**

```bash
git add data/compatibility-data.js
git commit -m "content(compatibility): convert all 11 tiers to a/b pool structure for random readings"
```

---

## Task 2: `getCompatTierInfo()` 랜덤 조합 렌더링 코드 변경

**Files:**
- Modify: `data/compatibility-data.js`

**Interfaces:**
- Consumes: Task 1이 만든 `COMPAT_TIER_DATA`의 `{a,b}` 풀 구조
- Produces: 신규 헬퍼 `pickRandom(arr)`, `resolveTierText(data)`. `getCompatTierInfo(tier, labelA, labelB)`는 시그니처 불변, 반환값 형태(`{score, tierLabel, text, keywords, advice}`)도 불변 — `text`만 매번 다른 조합으로 치환된 문자열이 된다.

- [ ] **Step 1: `pickRandom`/`resolveTierText` 헬퍼 추가**

`data/compatibility-data.js`에서 `getCompatTierInfo` 함수 정의 바로 앞에 추가:

```javascript
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveTierText(data) {
  return typeof data.text === 'string' ? data.text : (pickRandom(data.text.a) + ' ' + pickRandom(data.text.b));
}
```

- [ ] **Step 2: `getCompatTierInfo()`의 `text:` 반환 줄 수정**

현재 코드:

```javascript
function getCompatTierInfo(tier, labelA, labelB) {
  const data = COMPAT_TIER_DATA[tier];
  return {
    score: data.score,
    tierLabel: data.label,
    text: data.text.replace('{a}', labelA).replace('{b}', labelB),
    keywords: data.keywords,
    advice: data.advice
  };
}
```

다음으로 교체(`text:` 줄만 변경, `keywords`/`advice` 줄은 한 글자도 바꾸지 않는다 — 그대로 풀을 통과시켜 `js/app.js`의 `renderKeywordsAdviceHtml`가 처리하게 둔다):

```javascript
function getCompatTierInfo(tier, labelA, labelB) {
  const data = COMPAT_TIER_DATA[tier];
  return {
    score: data.score,
    tierLabel: data.label,
    text: resolveTierText(data).replace('{a}', labelA).replace('{b}', labelB),
    keywords: data.keywords,
    advice: data.advice
  };
}
```

- [ ] **Step 3: 문법 검증**

Run: `node --check data/compatibility-data.js`
Expected: 에러 없이 종료.

- [ ] **Step 4: 수동 스모크 테스트**

Run:
```bash
node -e "
const { getCompatTierInfo } = require('./data/compatibility-data.js');
for (let i = 0; i < 5; i++) {
  const info = getCompatTierInfo('same_element', '갑목', '을목');
  console.log(info.text);
}
"
```
Expected: 5줄 출력, 매번(또는 대부분) 다른 조합의 문장이 나오고, 전부 `{a}`/`{b}`가 아닌 "갑목"/"을목"으로 치환되어 있어야 한다.

- [ ] **Step 5: 커밋**

```bash
git add data/compatibility-data.js
git commit -m "feat(compatibility): resolve a/b-pool tier text and substitute names at render time"
```

---

## Task 3: 영구 회귀 테스트 재작성 (`tests/compatibility-data.test.js`)

**Files:**
- Modify: `tests/compatibility-data.test.js`

**Interfaces:**
- Consumes: Task 1+2가 완성한 `COMPAT_TIER_DATA`의 `{a,b}`/풀 구조, `getCompatTierInfo()`의 수정된 동작, `tests/helpers/dedup.js`의 기존 export
- Produces: 없음(테스트 파일)

기존 `tests/compatibility-data.test.js`는 `text`가 문자열이던 시절의 구조 검증·keyword/label 자기중복 검사·`getCompatTierInfo` 회귀를 이미 갖추고 있다(원조 궁합 콘텐츠 확장 프로젝트에서 작성됨). 이번엔 이 검사들을 새 풀 구조에 맞게 다시 쓰고, Task 1의 4개 신규 축(필드 내부 자기중복, advice 자기중복, echo, 티어 간 완전동일/근접축자)을 추가한다.

- [ ] **Step 1: 파일 전체를 다음으로 교체**

```javascript
const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_TIERS = ['same_element', 'complement', 'other', 'samhap', 'yukhap', 'same', 'none', 'chung', 'sangsaeng', 'bihwa', 'sanggeuk'];

assert.strictEqual(Object.keys(COMPAT_TIER_DATA).length, 11, '궁합 등급은 11개여야 함');
assert.deepStrictEqual(Object.keys(COMPAT_TIER_DATA), EXPECTED_TIERS, '기존 등급 순서가 유지되어야 함');

const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
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

const LOCKED_SCORE_LABELS = {
  same_element: { score: 90, label: '동일원소 — 최고의 궁합' },
  complement: { score: 82, label: '보완원소 — 좋은 궁합' },
  other: { score: 60, label: '그 외 조합 — 무난한 궁합' },
  samhap: { score: 96, label: '삼합 — 최고의 궁합' },
  yukhap: { score: 86, label: '육합 — 좋은 궁합' },
  same: { score: 74, label: '동일 띠 — 친근한 궁합' },
  none: { score: 62, label: '무관계 — 무난한 궁합' },
  chung: { score: 35, label: '충 — 주의가 필요한 궁합' },
  sangsaeng: { score: 85, label: '상생 — 좋은 궁합' },
  bihwa: { score: 70, label: '비화 — 무난한 궁합' },
  sanggeuk: { score: 45, label: '상극 — 주의가 필요한 궁합' }
};

EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const locked = LOCKED_SCORE_LABELS[tier];
  assert.strictEqual(data.score, locked.score, tier + '.score가 잠긴 값에서 변경됨');
  assert.strictEqual(data.label, locked.label, tier + '.label이 잠긴 값에서 변경됨');

  assertPool(data.text, tier + '.text');
  data.text.a.forEach(function (s, i) {
    assert.ok(s.indexOf('{a}') !== -1 && s.indexOf('{b}') !== -1, tier + '.text.a[' + i + ']에 {a}/{b}가 각각 있어야 함');
  });
  data.text.b.forEach(function (s, i) {
    assert.ok(s.indexOf('{a}') === -1 && s.indexOf('{b}') === -1, tier + '.text.b[' + i + ']에는 {a}/{b}가 없어야 함');
  });

  assert.ok(Array.isArray(data.keywords) && data.keywords.length === 6, tier + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(data.keywords).size, 6, tier + ' keywords must all be distinct');
  assert.ok(Array.isArray(data.advice) && data.advice.length === 3, tier + ' advice must be an array of exactly 3 items');
});

console.log('All 11 tiers match locked score/label, have valid a/b pool structure, correct {a}/{b} placeholder placement, 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15, LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10, NEARVERBATIM_LCS_TH = 20;
const LABEL_ECHO_WHITELIST = ['삼합', '육합', '상생', '상극', '비화', '충', '원소', '동일', '궁합', '최고의', '좋은', '무난한'];

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }
function stripWl(s) { let out = s; LABEL_ECHO_WHITELIST.forEach(function (w) { out = out.split(w).join(''); }); return out; }

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
  if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) issues.push('lcs=' + lcs + ' stems=' + shared.join(','));
  return issues;
}

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const poolA = data.text.a.map(stripTemplatePrefix);
  for (let i = 0; i < poolA.length; i++) {
    for (let j = i + 1; j < poolA.length; j++) {
      const issues = fullCombinedIssues(poolA[i], poolA[j], data.keywords);
      if (issues.length) withinFieldCollisions.push(tier + ' text.a[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + poolA[i] + '\n  ' + poolA[j]);
    }
  }
  for (let i = 0; i < data.text.b.length; i++) {
    for (let j = i + 1; j < data.text.b.length; j++) {
      const issues = fullCombinedIssues(data.text.b[i], data.text.b[j], data.keywords);
      if (issues.length) withinFieldCollisions.push(tier + ' text.b[' + i + ',' + j + '] (' + issues.join(' | ') + ')\n  ' + data.text.b[i] + '\n  ' + data.text.b[j]);
    }
  }
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  for (let i = 0; i < data.advice.length; i++) {
    for (let j = i + 1; j < data.advice.length; j++) {
      const wj = wordJaccard(data.advice[i], data.advice[j]);
      if (wj >= WORD_TH) adviceCollisions.push(tier + ' advice[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + data.advice[i] + '\n  ' + data.advice[j]);
    }
  }
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 자기 text.b풀 echo
function echoIssue(s1, s2) {
  const wj = wordJaccard(s1, s2);
  const t1 = stripBoilerplateSuffix(s1.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const t2 = stripBoilerplateSuffix(s2.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
  const bj = bigramJaccard(t1, t2), lcs = longestCommonSubstring(t1, t2);
  if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
  return null;
}
const echoCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  data.text.b.forEach(function (b, j) {
    data.advice.forEach(function (adv, i) {
      const issue = echoIssue(adv, b);
      if (issue) echoCollisions.push(tier + ' advice[' + i + '] <-> text.b[' + j + '] (' + issue + ')\n  ' + adv + '\n  ' + b);
    });
  });
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->text.b render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->text.b render-together echo collisions');

// axis 4: 티어 간 완전동일 + 근접축자
const exactMatchMap = new Map();
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      const key = slot === 'a' ? stripTemplatePrefix(s) : s;
      const where = tier + '.text.' + slot + '[' + idx + ']';
      if (!exactMatchMap.has(key)) exactMatchMap.set(key, []);
      exactMatchMap.get(key).push({ where: where, locked: idx === 0 });
    });
  });
});
const exactCollisions = [];
exactMatchMap.forEach(function (occ, text) {
  if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
    exactCollisions.push('"' + text + '" appears in: ' + occ.map(function (o) { return o.where; }).join(' | '));
  }
});
assert.strictEqual(exactCollisions.length, 0,
  'Found ' + exactCollisions.length + ' cross-tier exact-match collisions:\n' + exactCollisions.join('\n'));
console.log('No cross-tier exact-match collisions');

const nearVerbatimCollisions = [];
for (let i = 0; i < EXPECTED_TIERS.length; i++) {
  for (let j = i + 1; j < EXPECTED_TIERS.length; j++) {
    const d1 = COMPAT_TIER_DATA[EXPECTED_TIERS[i]], d2 = COMPAT_TIER_DATA[EXPECTED_TIERS[j]];
    ['a', 'b'].forEach(function (slot) {
      const pool1 = slot === 'a' ? d1.text.a.map(stripTemplatePrefix) : d1.text.b;
      const pool2 = slot === 'a' ? d2.text.a.map(stripTemplatePrefix) : d2.text.b;
      pool1.forEach(function (s1, x) {
        pool2.forEach(function (s2, y) {
          if (x === 0 && y === 0) return;
          const t1 = stripBoilerplateSuffix(s1.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
          const t2 = stripBoilerplateSuffix(s2.replace(/\s+/g, '').replace(/[.,!?]/g, ''));
          const lcs = longestCommonSubstring(t1, t2);
          if (lcs >= NEARVERBATIM_LCS_TH) {
            nearVerbatimCollisions.push(EXPECTED_TIERS[i] + '.' + slot + x + ' <-> ' + EXPECTED_TIERS[j] + '.' + slot + y + ' (lcs=' + lcs + ')\n  ' + s1 + '\n  ' + s2);
          }
        });
      });
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
  data.keywords.forEach(function (kw) {
    const normKw = normalizeForEcho(kw);
    ownPool.forEach(function (s, idx) {
      if (normalizeForEcho(s).indexOf(normKw) !== -1) keywordSelfEchoes.push(tier + ': keyword "' + kw + '" appears in its own pool[' + idx + ']: ' + s);
    });
  });
});
assert.strictEqual(keywordSelfEchoes.length, 0,
  'Found ' + keywordSelfEchoes.length + ' keyword self-echoes:\n' + keywordSelfEchoes.join('\n'));
console.log('No tier keyword self-echoes its own text/advice pool');

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

// ---------------------------------------------------------------------------
// getCompatTierInfo() 회귀 확인
// ---------------------------------------------------------------------------

const info = getCompatTierInfo('same_element', '갑목', '을목');
assert.strictEqual(info.score, 90, 'getCompatTierInfo score 회귀');
assert.strictEqual(info.tierLabel, '동일원소 — 최고의 궁합', 'getCompatTierInfo tierLabel 회귀');
assert.ok(info.text.indexOf('{a}') === -1 && info.text.indexOf('{b}') === -1, 'getCompatTierInfo text는 치환이 끝난 상태여야 함');
assert.ok(info.text.indexOf('갑목') !== -1 && info.text.indexOf('을목') !== -1, 'getCompatTierInfo text에 실제 이름이 들어가야 함');
assert.ok(Array.isArray(info.keywords) && info.keywords.length === 6, 'getCompatTierInfo keywords는 6개 풀 그대로 전달돼야 함');
assert.ok(Array.isArray(info.advice) && info.advice.length === 3, 'getCompatTierInfo advice는 3개 풀 그대로 전달돼야 함');

console.log('getCompatTierInfo() correctly substitutes names, returns unchanged score/tierLabel, and passes keywords/advice pools through unresolved');

console.log('All compatibility-data tests passed');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/compatibility-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 실패하면 Task 1로 돌아가 해당 필드(항상 인덱스 1 또는 2, 또는 신규 keywords/advice)를 수정한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add tests/compatibility-data.test.js
git commit -m "test(compatibility): rewrite structure and dedup regression tests for a/b pool structure"
```

---

## Task 4: 브라우저 확인 (5개 모드 전부)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~3의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node scripts/run-tests.js`
Expected: 10개 테스트 파일 전부 통과.

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. **궁합(신규 랜덤화) — 같은 두 대상 반복**: 궁합 모드 → 같은 두 별자리(또는 띠/일간) 조합 선택 → 리딩 실행. 결과 화면(점수·등급 라벨·해설 문장·키워드·조언)을 기록해둔다.
2. "새로운 리딩" 버튼으로 돌아가 **정확히 같은 두 대상**으로 5~6회 반복 실행한다. `score`/`tierLabel`은 매번 완전히 동일하게 나오고(고정값), 해설 문장·키워드 조합·조언 중 최소 하나는 이전과 달라지는지 확인한다. 문장 안의 이름(`{a}`/`{b}`가 치환된 자리)이 매번 올바르게 표시되는지 확인한다.
3. advice와 해설 문장을 함께 봤을 때 어색한 반복이 없는지 확인한다(신규 echo 검사가 방지하려는 지점).
4. 서로 다른 조합(예: 동일원소 vs 삼합)으로 각각 1~2회 실행해 등급별로 문장이 정상적으로 나오는지 확인한다.
5. **회귀 — 타로**: 타로 모드로 카드 뽑기 → 정/역방향 해설과 키워드/조언이 기존과 동일하게(고정 문구) 나오는지 확인.
6. **회귀 — 띠운세**: 띠운세 모드로 리딩 실행 → 반복 시 결과가 계속 달라지는지 확인(궁합 작업에 영향받지 않았는지).
7. **회귀 — 별자리**: 별자리 모드로 리딩 실행 → 반복 시 결과가 계속 달라지는지 확인.
8. **회귀 — 사주**: 사주 모드로 리딩 실행 → 반복 시 카테고리 해설/키워드/조언이 달라지고 명식표·오행 균형 문장은 고정인지 확인.
9. "지난 기록"을 열어 방금 만든 궁합 리딩들이 정상적으로 표시되는지 확인.
10. 콘솔에 에러가 없는지 확인.

Expected: 궁합(1~4)은 점수·라벨은 고정, 문장/키워드/조언은 반복 시 달라지고 이름 치환이 항상 올바름. 타로(5)는 고정 문구 그대로. 띠운세/별자리/사주(6~8)는 계속 랜덤화 정상 동작. 9~10 정상.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인**

이 태스크는 검증 전용이라 기본적으로 커밋이 없다. Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(compatibility): ...` 커밋을 추가한다.
