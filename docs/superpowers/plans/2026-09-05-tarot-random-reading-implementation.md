# 타로(tarot) 리딩 랜덤화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 78장(정/역방향)의 상단 기본 해설(`upright`/`reversed`)·키워드·조언을 슬롯 재조합 풀 구조로 바꿔, 같은 카드가 반복해서 뽑혀도 리딩 문구가 매번 랜덤하게 달라지게 한다.

**Architecture:** 카드당 6개 필드(`upright`, `reversed`, `keywords.upright`, `keywords.reversed`, `advice.upright`, `advice.reversed`)를 문자열/3개 배열 → `{a:[3],b:[3]}`/6개 배열/3개 배열 풀로 확장한다. 인덱스 0(과 keywords의 0~2, advice의 0)은 기존 프로덕션 문구 그대로 잠가두고, 새 변형만 추가한다. `js/app.js`에 이미 존재하는 `resolveMeaningText`/`pickKeywords`/`pickAdvice` 헬퍼가 문자열/풀 타입을 자동 감지하므로 `showSummary()` 단 1줄만 수정한다. `categories`(카테고리별 세부 텍스트, 카드당 19개)는 이번 범위에서 완전히 고정 유지한다.

**Tech Stack:** Vanilla JS, Node.js 내장 `assert` 기반 테스트(`scripts/run-tests.js`), `tests/helpers/dedup.js`의 기존 dedup 유틸리티.

## Global Constraints

- **범위**: `card.upright`, `card.reversed`, `card.keywords.upright`, `card.keywords.reversed`, `card.advice.upright`, `card.advice.reversed`만 대상. `card.categories`는 이번 플랜의 어떤 태스크에서도 수정하지 않는다.
- **인덱스 0 잠금 규칙**: `upright.a[0]`/`upright.b[0]`/`reversed.a[0]`/`reversed.b[0]`은 기존 문자열을 그대로 둘로 나눈 값, `keywords.upright[0,1,2]`/`keywords.reversed[0,1,2]`는 기존 3개 그대로, `advice.upright[0]`/`advice.reversed[0]`는 기존 문자열 그대로. 이 값들은 어떤 태스크에서도 절대 수정하지 않는다. 새 변형은 `a[1,2]`/`b[1,2]`(신규 2개씩), `keywords.*[3,4,5]`(신규 3개), `advice.*[1,2]`(신규 2개)에만 추가한다.
- **잠긴-잠긴 스킵 규칙**: 아래 dedup 검증 스크립트에서 인덱스 0(또는 `categories`의 모든 값, 이번 범위에서 전부 고정이므로 전부 잠김 취급)끼리의 충돌은 스킵한다. 신규 콘텐츠(인덱스 1/2, keywords 3~5, advice 1/2)가 관련된 충돌만 실제 결함으로 취급해 수정한다.
- **데이터 shape**: `upright`/`reversed`: `string` → `{a: [string,string,string], b: [string,string,string]}`. `keywords.upright`/`keywords.reversed`: `[string,string,string]` → `[string×6]`. `advice.upright`/`advice.reversed`: `string` → `[string,string,string]`.
- **코드 변경 범위**: `js/app.js`의 `showSummary()` 함수(현재 795~796행) 단 1줄만 수정한다. 이 플랜의 어떤 태스크도 `js/compatibility-calc.js`, `js/app.js`의 다른 부분, `data/tarot-data.js`(인덱스 파일)를 수정하지 않는다.
- **테스트 헬퍼**: `tests/helpers/dedup.js`의 기존 export(`wordJaccard`, `trigramJaccard`, `stripOwnKeywords`, `longestCommonSubstring`, `bigramJaccard`, `makeStripBoilerplateSuffix`, `makeStem`, `makeSignificantStems`)만 사용한다. 새 헬퍼 함수를 만들지 않는다. 공유 dedup 헬퍼 추출(`tests/helpers/dedup-axes.js`)은 이번 플랜의 범위가 아니다 — 다른 4개 모드처럼 `tests/tarot-data.test.js`에 축 로직을 직접 작성한다.
- **표준 임계값**: `WORD_TH=0.3`, `OPEN_WORD_TH=0.20`, `OPEN_TRI_TH=0.15`, `LCS_TH=5`, `STEM_TH=2`, `BIGRAM_TH=0.185`, `ECHO_BIGRAM_TH=0.30`, `ECHO_LCS_TH=10`, `NEARVERBATIM_LCS_TH=20`.
- **표준 문자열 처리 상수**: `BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요']`, `PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로']`, `STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다']`.
- **검증 스크립트 위치**: 임시 dedup 검증 스크립트는 `.superpowers/scratch-verify-tarot.js`에 저장한다(이미 `.gitignore`에 등록된 `.superpowers/` 안이라 실수로 커밋될 위험이 없다). 데이터 파일만 `git add`하고 커밋한다.
- **커밋 전 필수 확인**: 매 콘텐츠 태스크는 커밋 전에 검증 스크립트가 `0 issues`를 출력하는 것을 확인해야 한다. 발견된 충돌은 항상 신규(잠기지 않은) 쪽 콘텐츠를 다시 써서 해결한다 — 절대 인덱스 0이나 `categories`를 수정하지 않는다.

---

## 재사용 dedup 검증 스크립트 (Task 1~6 공통, 매 태스크 `EXPECTED_COUNT`만 다름)

아래 스크립트는 `getFullDeck()`이 반환하는 78장 중 이미 풀 구조로 변환된 카드(`typeof card.upright === 'object'`)만 걸러내 5개 축을 검사한다. 아직 변환되지 않은 카드는 자동으로 제외되므로, 태스크가 진행될수록(Task 1→6) 검사 대상이 자연스럽게 늘어난다. 각 태스크의 Step에서 이 스크립트를 `.superpowers/scratch-verify-tarot.js`에 그대로 저장하고 파일 맨 아래 `EXPECTED_COUNT` 값만 해당 태스크 값으로 바꿔서 실행한다.

```javascript
const assert = require('assert');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./tests/helpers/dedup.js');

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15, LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10, NEARVERBATIM_LCS_TH = 20;

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }

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

function collectCategoryTexts(card, orientation) {
  const texts = [];
  Object.keys(card.categories).forEach(function (cat) {
    const v = card.categories[cat][orientation];
    if (typeof v === 'string') texts.push(v);
    else Object.keys(v).forEach(function (k) { texts.push(v[k]); });
  });
  return texts;
}

function checkCard(card, issues) {
  ['upright', 'reversed'].forEach(function (dir) {
    const keywords = card.keywords[dir];
    ['a', 'b'].forEach(function (slot) {
      const pool = card[dir][slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const found = fullCombinedIssues(pool[i], pool[j], keywords);
          if (found.length) issues.push(card.name + ' ' + dir + '.' + slot + '[' + i + ',' + j + '] (' + found.join('|') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
        }
      }
    });
    const advicePool = card.advice[dir];
    for (let i = 0; i < advicePool.length; i++) {
      for (let j = i + 1; j < advicePool.length; j++) {
        const wj = wordJaccard(advicePool[i], advicePool[j]);
        if (wj >= WORD_TH) issues.push(card.name + ' advice.' + dir + '[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + advicePool[i] + '\n  ' + advicePool[j]);
      }
    }
    function echoIssue(s1, s2) {
      const wj = wordJaccard(s1, s2);
      const t1 = stripBoilerplateSuffix(normalizeForEcho(s1));
      const t2 = stripBoilerplateSuffix(normalizeForEcho(s2));
      const bj = bigramJaccard(t1, t2), lcs = longestCommonSubstring(t1, t2);
      if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
      return null;
    }
    const catTexts = collectCategoryTexts(card, dir);
    advicePool.forEach(function (adv, i) {
      card[dir].b.forEach(function (b, j) {
        const found = echoIssue(adv, b);
        if (found) issues.push(card.name + ' advice.' + dir + '[' + i + '] vs ' + dir + '.b[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + b);
      });
      catTexts.forEach(function (c, j) {
        const found = echoIssue(adv, c);
        if (found) issues.push(card.name + ' advice.' + dir + '[' + i + '] vs category-text[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + c);
      });
    });
    const ownTexts = [
      { s: card[dir].a[0], locked: true }, { s: card[dir].a[1], locked: false }, { s: card[dir].a[2], locked: false },
      { s: card[dir].b[0], locked: true }, { s: card[dir].b[1], locked: false }, { s: card[dir].b[2], locked: false },
      { s: advicePool[0], locked: true }, { s: advicePool[1], locked: false }, { s: advicePool[2], locked: false }
    ].concat(catTexts.map(function (s) { return { s: s, locked: true }; }));
    keywords.forEach(function (kw, ki) {
      const nk = normalizeForEcho(kw);
      const kwLocked = ki < 3;
      ownTexts.forEach(function (t) {
        if (kwLocked && t.locked) return;
        if (normalizeForEcho(t.s).indexOf(nk) !== -1) issues.push(card.name + ' ' + dir + ': keyword "' + kw + '" appears in its own pool (locked=' + t.locked + '): ' + t.s);
      });
    });
  });
}

function checkCrossCard(allCards, issues) {
  const seen = new Map();
  allCards.forEach(function (card) {
    ['upright', 'reversed'].forEach(function (dir) {
      ['a', 'b'].forEach(function (slot) {
        card[dir][slot].forEach(function (s, idx) {
          const where = card.name + ' ' + dir + '.' + slot + '[' + idx + ']';
          if (!seen.has(s)) seen.set(s, []);
          seen.get(s).push({ where: where, locked: idx === 0 });
        });
      });
    });
  });
  seen.forEach(function (occ, text) {
    if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
      issues.push('EXACT-MATCH "' + text + '" in: ' + occ.map(function (o) { return o.where; }).join(' | '));
    }
  });
  for (let i = 0; i < allCards.length; i++) {
    for (let j = i + 1; j < allCards.length; j++) {
      const c1 = allCards[i], c2 = allCards[j];
      ['upright', 'reversed'].forEach(function (dir) {
        ['a', 'b'].forEach(function (slot) {
          c1[dir][slot].forEach(function (s1, x) {
            c2[dir][slot].forEach(function (s2, y) {
              if (x === 0 && y === 0) return;
              const lcs = longestCommonSubstring(stripBoilerplateSuffix(normalizeForEcho(s1)), stripBoilerplateSuffix(normalizeForEcho(s2)));
              if (lcs >= NEARVERBATIM_LCS_TH) {
                issues.push('NEAR-VERBATIM(lcs=' + lcs + ') ' + c1.name + ' ' + dir + '.' + slot + x + ' <-> ' + c2.name + ' ' + dir + '.' + slot + y + '\n  ' + s1 + '\n  ' + s2);
              }
            });
          });
        });
      });
    }
  }
}

global.TAROT_MAJOR_ARCANA = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('./data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('./data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('./data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('./data/tarot-data.js');
const deck = getFullDeck();
const convertedCards = deck.filter(function (c) { return typeof c.upright === 'object'; });

const EXPECTED_COUNT = 11; // <-- 태스크마다 이 값만 바꾼다: Task1=11, Task2=22, Task3=36, Task4=50, Task5=64, Task6=78
assert.strictEqual(convertedCards.length, EXPECTED_COUNT, 'Expected ' + EXPECTED_COUNT + ' converted cards, got ' + convertedCards.length + ' -- did you convert every card in your list?');

const issues = [];
convertedCards.forEach(function (card) { checkCard(card, issues); });
checkCrossCard(convertedCards, issues);
if (issues.length) { console.log(issues.join('\n\n')); throw new Error('Found ' + issues.length + ' dedup issues'); }
console.log('0 issues found among ' + convertedCards.length + ' converted card(s)');
```

이 스크립트는 저장소 루트에서 `node .superpowers/scratch-verify-tarot.js`로 실행한다(위 스크립트의 `require('./...')` 경로가 루트 기준이므로 반드시 루트에서 실행). 실행 결과가 `Found N dedup issues`로 실패하면, 출력된 각 항목에서 신규(잠기지 않은) 쪽 문장/키워드를 다시 써서 충돌을 없앤 뒤 재실행한다. `EXACT-MATCH`나 `NEAR-VERBATIM` 항목이 인덱스 0끼리(둘 다 `locked=true`로 표시된 occurrence만 있는 경우)만 걸린 경우는 이미 스크립트 자체가 `occ.some(function (o) { return !o.locked; })` 조건으로 걸러내므로 나타나지 않는다 — 즉, 이 스크립트가 뭔가를 출력했다면 그건 항상 신규 콘텐츠가 관여된 실제 결함이다.

---

## 카드 목록 (참고)

- **Major Arcana** (`data/tarot-data-major.js`, 22장, `id` 0~21): 0:바보, 1:마법사, 2:여사제, 3:여황제, 4:황제, 5:교황, 6:연인, 7:전차, 8:힘, 9:은둔자, 10:운명의 수레바퀴, 11:정의, 12:매달린 사람, 13:죽음, 14:절제, 15:악마, 16:탑, 17:별, 18:달, 19:태양, 20:심판, 21:세계.
- **Wands** (`data/tarot-data-wands.js`, 14장, `rank`): Ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, Page, Knight, Queen, King (완드 에이스/2/.../킹).
- **Cups** (`data/tarot-data-cups.js`, 14장): 위와 동일한 rank 구성(컵 에이스/2/.../킹).
- **Swords** (`data/tarot-data-swords.js`, 14장): 위와 동일(소드 에이스/2/.../킹).
- **Pentacles** (`data/tarot-data-pentacles.js`, 14장): 위와 동일(펜타클 에이스/2/.../킹).

각 카드는 `data/tarot-data-*.js` 안에서 `{ id/rank, name_kr, name_en, upright, reversed, keywords: {upright, reversed}, advice: {upright, reversed}, categories: {...} }` 형태의 객체다. `categories`는 11개 키(`love, money, career, business, study, health, relationships, workplace, honor, moving, children`)를 가지며, 앞의 8개는 `{upright: {하위선택1, 하위선택2}, reversed: {...}}`, 뒤의 3개(`honor, moving, children`)는 `{upright: "문자열", reversed: "문자열"}` 형태다. **`categories`는 절대 수정하지 않는다.**

---

## 콘텐츠 작성 패턴 (전 태스크 공통) — 완전히 검증된 예시: 바보(The Fool, id 0)

아래는 실제로 `tests/helpers/dedup.js`의 함수들로 0 issues를 확인한, 완전히 작성된 예시다. Task 1은 이 카드를 **그대로** 적용하면 된다(추가 작성 불필요). Task 2~6의 나머지 카드들은 이 패턴을 그대로 따라 새로 작성한다:

1. 기존 `upright` 문자열을 자연스러운 지점(보통 문장 2개씩)에서 둘로 나눠 `a[0]`(전반부)/`b[0]`(후반부)로 삼는다. `reversed`도 동일하게 나눈다.
2. `a[1]`, `a[2]`에 원본과 다른 어휘로 같은 주제를 표현하는 새 문장을 쓴다(`b[1]`, `b[2]`도 동일). 원본과 문장 구조·핵심 단어를 그대로 재사용하지 않는다 — 최소 2개 이상의 실질 단어가 겹치면 dedup 검증에서 걸릴 수 있다.
3. `keywords.upright[3,4,5]`, `keywords.reversed[3,4,5]`에 기존 3개와 겹치지 않는 새 키워드 3개씩을 추가한다. 새 키워드는 같은 카드의 어떤 텍스트(본문, 조언, 카테고리 텍스트 전부)에도 리터럴 부분 문자열로 등장해서는 안 된다.
4. `advice.upright[1,2]`, `advice.reversed[1,2]`에 새 조언 문장을 2개씩 추가한다.
5. 아래 검증 스크립트를 돌려 0 issues가 나올 때까지 신규 콘텐츠만 다시 쓴다.

```javascript
// data/tarot-data-major.js 의 id:0 (바보) 카드 — 변경 후 최종 형태
{
  id: 0, name_kr: "바보", name_en: "The Fool",
  upright: {
    a: [
      "새로운 시작을 앞두고 있습니다. 두려움보다 호기심이 앞서는 순간이며, 정해진 계획이 없어도 발을 내딛는 용기가 필요합니다.",
      "익숙하지 않은 상황이라도 걱정보다 궁금함이 먼저 고개를 드는 시기이며, 아무것도 정해지지 않았어도 가볍게 움직여보는 태도가 도움이 됩니다.",
      "판을 다 그리지 못한 채로도 마음이 이끄는 쪽으로 움직이게 되는 때이며, 처음 접하는 일이라도 겁내지 않고 부딪혀볼 만합니다."
    ],
    b: [
      "실수를 두려워하기보다 경험 자체를 배움으로 받아들이세요. 지금은 완벽한 준비보다 첫걸음의 순수한 에너지가 더 중요한 시기입니다.",
      "어긋난 결과를 곱씹기보다 그 과정에서 무엇을 배웠는지를 챙겨보세요. 매끈한 각본보다 서투른 시도 하나가 더 오래 남습니다.",
      "틀려도 괜찮다는 마음으로 우선 겪어보는 편을 택해보세요. 촘촘한 계산보다 눈앞의 호기심을 따르는 쪽이 더 큰 배움을 줍니다."
    ]
  },
  reversed: {
    a: [
      "충동적으로 움직이려는 마음과 무모함이 강조됩니다. 계획 없이 뛰어들면 예상치 못한 위험에 부딪힐 수 있어요.",
      "앞뒤 재지 않고 밀어붙이려는 기세가 커지는 시기로, 준비 없는 도약은 낯선 곤란을 부르기 쉽습니다.",
      "들뜬 분위기에 휩쓸려 서두르게 되는 흐름이며, 그 조급함이 감당하기 힘든 뒷수습으로 이어질 수 있습니다."
    ],
    b: [
      "자유로움과 무책임함은 다르다는 것을 기억하고, 한 걸음 물러나 현실적인 점검을 해보는 것이 좋습니다.",
      "자유롭게 선택하는 태도와 책임을 회피하는 태도는 엄연히 다르므로, 잠시 멈춰 스스로의 판단을 다시 점검해보세요.",
      "속도를 늦추고 지금 놓치고 있는 요소는 없는지 차분히 되짚어보는 편이 안전합니다."
    ]
  },
  keywords: {
    upright: ["새로운 시작", "순수한 호기심", "즉흥적인 용기", "홀가분한 출발", "낯선 도약", "설레는 발견"],
    reversed: ["무모함", "충동적 선택", "준비 부족", "무리한 강행", "어수선한 판단", "안전불감"]
  },
  advice: {
    upright: [
      "완벽한 계획을 세우기보다 지금 이 순간의 호기심을 따라 첫걸음을 내딛어보세요.",
      "계획이 완벽해지길 기다리기보다 지금 느껴지는 끌림을 따라 움직여보세요.",
      "머뭇거리는 시간을 줄이고, 마음이 향하는 방향으로 가볍게 발을 내딛어보세요."
    ],
    reversed: [
      "뛰어들기 전에 잠시 멈춰서 놓치고 있는 위험은 없는지 점검해보세요.",
      "결정을 내리기 전에 숨 한 번 고르고, 서두르는 부분은 없는지 확인해보세요.",
      "마음이 앞서는 순간일수록 한 박자 늦춰서, 놓친 위험 요소가 없는지 다시 짚어보세요."
    ]
  },
  categories: { /* 기존 그대로, 수정하지 않음 */ }
}
```

---

### Task 1: Major Arcana Part A 콘텐츠 (id 0~10, 11장)

**Files:**
- Modify: `data/tarot-data-major.js` (카드 id 0~10만)

**Interfaces:**
- Consumes: 없음(첫 태스크)
- Produces: `TAROT_MAJOR_ARCANA`의 id 0~10이 위 "콘텐츠 작성 패턴"의 shape으로 변환됨. id 11~21은 이 태스크에서 손대지 않고 기존 문자열 shape 그대로 둔다(Task 2가 처리).

- [ ] **Step 1: id:0(바보) 카드를 위 "콘텐츠 작성 패턴" 섹션의 완성된 코드 그대로 교체한다.**

`data/tarot-data-major.js`에서 `id: 0`(바보) 객체를 찾아 `upright`/`reversed`/`keywords`/`advice` 필드를 위 코드 블록 내용으로 교체한다. `categories` 필드는 그대로 둔다.

- [ ] **Step 2: id 1~10(마법사, 여사제, 여황제, 황제, 교황, 연인, 전차, 힘, 은둔자, 운명의 수레바퀴) 각 카드에 동일 패턴을 적용한다.**

각 카드에 대해: 현재 파일에서 해당 카드의 `upright`/`reversed`/`keywords`/`advice` 원본 값을 읽고, 위 "콘텐츠 작성 패턴" 1~4단계를 그대로 적용해 새 콘텐츠를 작성한다. 원본 문장을 2문장씩 나눠 `a[0]`/`b[0]`으로 삼고, `a[1,2]`/`b[1,2]`에 새 문장을, `keywords.*[3,4,5]`에 새 키워드 3개씩을, `advice.*[1,2]`에 새 조언 2개씩을 추가한다.

- [ ] **Step 3: 위 "재사용 dedup 검증 스크립트"를 `.superpowers/scratch-verify-tarot.js`에 저장하고, `EXPECTED_COUNT = 11`로 설정한 뒤 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js` (저장소 루트에서 실행)
Expected: `0 issues found among 11 converted card(s)` 출력.

충돌이 발견되면 출력된 항목의 신규 콘텐츠(인덱스 1/2, keywords 3~5, advice 1/2)만 다시 써서 해결하고 재실행한다. 인덱스 0이나 `categories`는 절대 수정하지 않는다.

- [ ] **Step 4: 문법 검증**

Run: `node --check data/tarot-data-major.js`
Expected: 에러 없이 종료.

- [ ] **Step 5: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "content(tarot): convert major arcana part A (cards 0-10) to a/b pool structure"
```

---

### Task 2: Major Arcana Part B 콘텐츠 (id 11~21, 11장)

**Files:**
- Modify: `data/tarot-data-major.js` (카드 id 11~21만)

**Interfaces:**
- Consumes: Task 1이 완료한 id 0~10(같은 파일 안에 이미 존재, 검증 스크립트의 cross-card 축 대상에 자동 포함됨)
- Produces: `TAROT_MAJOR_ARCANA` 전체(22장)가 위 shape으로 변환 완료.

- [ ] **Step 1: id 11~21(정의, 매달린 사람, 죽음, 절제, 악마, 탑, 별, 달, 태양, 심판, 세계) 각 카드에 "콘텐츠 작성 패턴" 1~4단계를 적용한다.**

Task 1과 동일한 방식: 각 카드의 원본 `upright`/`reversed`/`keywords`/`advice`를 읽고 패턴대로 새 콘텐츠를 작성한다.

- [ ] **Step 2: 검증 스크립트의 `EXPECTED_COUNT`를 22로 바꿔서 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js`
Expected: `0 issues found among 22 converted card(s)`. (id 0~10도 함께 검사되므로, Task 1 콘텐츠와의 카드 간 완전동일/근접축자 충돌도 여기서 잡힌다.)

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "content(tarot): convert major arcana part B (cards 11-21) to a/b pool structure"
```

---

### Task 3: Wands(완드) 콘텐츠 (14장)

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: Task 1~2가 완료한 Major Arcana 22장(검증 스크립트의 cross-card 축 대상)
- Produces: `TAROT_WANDS` 전체(14장)가 pool shape으로 변환 완료.

- [ ] **Step 1: 완드 에이스, 2, 3, 4, 5, 6, 7, 8, 9, 10, 시종(Page), 기사(Knight), 퀸(Queen), 킹(King) 14장 전부에 "콘텐츠 작성 패턴" 1~4단계를 적용한다.**

- [ ] **Step 2: 검증 스크립트의 `EXPECTED_COUNT`를 36으로 바꿔서 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js`
Expected: `0 issues found among 36 converted card(s)`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-wands.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "content(tarot): convert wands suit (14 cards) to a/b pool structure"
```

---

### Task 4: Cups(컵) 콘텐츠 (14장)

**Files:**
- Modify: `data/tarot-data-cups.js`

**Interfaces:**
- Consumes: Task 1~3이 완료한 Major Arcana + Wands 36장
- Produces: `TAROT_CUPS` 전체(14장)가 pool shape으로 변환 완료.

- [ ] **Step 1: 컵 에이스, 2, 3, 4, 5, 6, 7, 8, 9, 10, 시종, 기사, 퀸, 킹 14장 전부에 "콘텐츠 작성 패턴" 1~4단계를 적용한다.**

- [ ] **Step 2: 검증 스크립트의 `EXPECTED_COUNT`를 50으로 바꿔서 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js`
Expected: `0 issues found among 50 converted card(s)`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-cups.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-cups.js
git commit -m "content(tarot): convert cups suit (14 cards) to a/b pool structure"
```

---

### Task 5: Swords(소드) 콘텐츠 (14장)

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: Task 1~4가 완료한 Major Arcana + Wands + Cups 50장
- Produces: `TAROT_SWORDS` 전체(14장)가 pool shape으로 변환 완료.

- [ ] **Step 1: 소드 에이스, 2, 3, 4, 5, 6, 7, 8, 9, 10, 시종, 기사, 퀸, 킹 14장 전부에 "콘텐츠 작성 패턴" 1~4단계를 적용한다.**

- [ ] **Step 2: 검증 스크립트의 `EXPECTED_COUNT`를 64로 바꿔서 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js`
Expected: `0 issues found among 64 converted card(s)`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-swords.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "content(tarot): convert swords suit (14 cards) to a/b pool structure"
```

---

### Task 6: Pentacles(펜타클) 콘텐츠 (14장)

**Files:**
- Modify: `data/tarot-data-pentacles.js`

**Interfaces:**
- Consumes: Task 1~5가 완료한 Major Arcana + Wands + Cups + Swords 64장
- Produces: `TAROT_PENTACLES` 전체(14장)가 pool shape으로 변환 완료. 이 태스크가 끝나면 78장 전부가 변환 완료된다.

- [ ] **Step 1: 펜타클 에이스, 2, 3, 4, 5, 6, 7, 8, 9, 10, 시종, 기사, 퀸, 킹 14장 전부에 "콘텐츠 작성 패턴" 1~4단계를 적용한다.**

- [ ] **Step 2: 검증 스크립트의 `EXPECTED_COUNT`를 78로 바꿔서 실행한다.**

Run: `node .superpowers/scratch-verify-tarot.js`
Expected: `0 issues found among 78 converted card(s)`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-pentacles.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-pentacles.js
git commit -m "content(tarot): convert pentacles suit (14 cards) to a/b pool structure"
```

---

### Task 7: `showSummary()` 랜덤 조합 렌더링 코드 변경

**Files:**
- Modify: `js/app.js:795-796`

**Interfaces:**
- Consumes: Task 1~6이 완료한 78장 전체의 pool shape. `js/app.js`에 이미 존재하는 `resolveMeaningText(value)`(`typeof value === 'string' ? value : pickRandom(value.a) + ' ' + pickRandom(value.b)`, 별도 파일 어딘가에 정의됨 — 이 태스크에서 정의하지 않고 기존 것을 그대로 호출만 한다), `renderKeywordsAdviceHtml(keywordsList, adviceText)`(이미 배열/문자열 모두 처리, 수정하지 않음).
- Produces: 카테고리 미선택 시 `showSummary()`가 매번 랜덤하게 조합된 문장을 렌더링.

- [ ] **Step 1: `js/app.js`의 `showSummary()` 함수에서 `baseMeaning` 계산 줄을 수정한다.**

현재 코드(795~796행 부근):

```javascript
const baseMeaning = categoryReading
  ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
  : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);
```

다음으로 교체(두 번째 줄만 변경, `categoryReading` 분기는 그대로 둔다 — 카테고리 텍스트는 이번 범위 밖이라 여전히 평범한 문자열이기 때문이다):

```javascript
const baseMeaning = categoryReading
  ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
  : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
```

- [ ] **Step 2: 문법 검증**

Run: `node --check js/app.js`
Expected: 에러 없이 종료.

- [ ] **Step 3: 수동 스모크 테스트**

Run:
```bash
node -e "
global.TAROT_MAJOR_ARCANA = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('./data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('./data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('./data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('./data/tarot-data.js');
const fool = getFullDeck()[0];
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function resolveMeaningText(value) { return (typeof value === 'string') ? value : (pickRandom(value.a) + ' ' + pickRandom(value.b)); }
for (let i = 0; i < 8; i++) console.log(resolveMeaningText(fool.upright));
"
```
Expected: 8줄 출력, `card.upright.a`/`.b`에서 뽑은 조합이 매번(또는 대부분) 다르게 나온다. `js/app.js` 자체는 브라우저 전역에서 동작하므로 이 스모크 테스트는 `resolveMeaningText`의 동작만 별도로 재현해 확인하는 것이다(Task 9에서 실제 브라우저로 최종 확인).

- [ ] **Step 4: 커밋**

```bash
git add js/app.js
git commit -m "feat(tarot): resolve a/b-pool card readings at render time when no category selected"
```

---

### Task 8: 영구 회귀 테스트 재작성 (`tests/tarot-data.test.js`)

**Files:**
- Modify: `tests/tarot-data.test.js`

**Interfaces:**
- Consumes: Task 1~6이 완료한 78장 전체(pool shape), Task 7이 변경한 `showSummary()`의 동작, `tests/helpers/dedup.js`의 기존 export.
- Produces: 없음(테스트 파일).

**중요**: 현재 `tests/tarot-data.test.js`에는 이번 프로젝트와 무관한, 더 이전의 타로 콘텐츠 확장 프로젝트가 만들어둔 기존 회귀 검사가 이미 들어있다 — 이미지 경로/파일명 검사, `categories`의 하위선택 구조 검사, 카테고리 필드 문장 수(2~3개) 검사, 금지쌍(`love`/`relationships`, `career`/`workplace`, `money`/`business`) 문장 단위 충돌 검사. 이 검사들은 전부 `categories`에 관한 것이고 `categories`는 이번 플랜에서 손대지 않으므로, **하나도 삭제하지 말고 전부 유지**한 채로 `upright`/`reversed`/`keywords`/`advice`의 새 pool 구조 검증과 dedup 축만 추가한다. `keywords`(3→6개)·`advice`(문자열→3개 배열) 구조 검사 부분만 새 shape에 맞게 값을 바꾼다.

- [ ] **Step 1: 파일 전체를 다음으로 교체**

```javascript
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
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const deck = getFullDeck();

// ---------------------------------------------------------------------------
// 구조 검증 (기존 검사 유지 + upright/reversed/keywords/advice만 새 shape로 갱신)
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

// 카드당 부가정보(keywords/advice, 새 pool shape)와 세분화 카테고리 구조 검증(기존 검사 유지)
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

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
      assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[0] + ' must be a non-empty string');
      assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, card.name + ' categories.' + cat + '.' + o + '.' + keys[1] + ' must be a non-empty string');
      assert.notStrictEqual(entry[keys[0]], entry[keys[1]], card.name + ' categories.' + cat + '.' + o + ' sub-choices must not be identical');
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      assert.ok(typeof card.categories[cat][o] === 'string' && card.categories[cat][o].length > 0,
        card.name + ' categories.' + cat + '.' + o + ' must be a non-empty string');
    });
  });
});

console.log('All 78 cards have valid a/b pool structure for upright/reversed, 6 keywords, 3 advice variants per orientation, valid images, and untouched category structure');

// ---------------------------------------------------------------------------
// Regression tests for the sentence-level "skeleton collision" blind spot
// (기존 검사 유지 그대로 — categories는 이번 플랜에서 변경하지 않으므로 영향 없음)
// ---------------------------------------------------------------------------

function isLockedCard(card) {
  return card.cardId === 'major_0' || /_Ace$/.test(card.cardId);
}

deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      keys.forEach(function (key) {
        const text = card.categories[cat][o][key];
        const count = splitSentences(text).length;
        assert.ok(count === 2 || count === 3,
          card.name + ' categories.' + cat + '.' + o + '.' + key + ' must have 2 or 3 sentences, got ' + count);
      });
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    ['upright', 'reversed'].forEach(function (o) {
      const text = card.categories[cat][o];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        card.name + ' categories.' + cat + '.' + o + ' must have 2 or 3 sentences, got ' + count);
    });
  });
});

console.log('All non-locked cards have 2-3 sentence category fields');

// Test: on any single card, love/relationships, career/workplace, and
// money/business must never share an opening sentence or skeleton
// (기존 검사 유지 그대로)
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const forbiddenPairCollisions = [];
deck.forEach(function (card) {
  if (isLockedCard(card)) return;

  ['upright', 'reversed'].forEach(function (o) {
    FORBIDDEN_PAIRS.forEach(function (pair) {
      const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
      subsA.forEach(function (subA) {
        subsB.forEach(function (subB) {
          const textA = card.categories[catA][o][subA];
          const textB = card.categories[catB][o][subB];
          splitSentences(textA).forEach(function (sentA) {
            splitSentences(textB).forEach(function (sentB) {
              const sim = wordJaccard(sentA, sentB);
              if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
                forbiddenPairCollisions.push(card.name + ' ' + o + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                  ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
              }
            });
          });
        });
      });
    });
  });
});

assert.strictEqual(forbiddenPairCollisions.length, 0,
  'Found ' + forbiddenPairCollisions.length + ' forbidden-pair sentence-level collisions:\n' + forbiddenPairCollisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

// ---------------------------------------------------------------------------
// 중복 검사 (이번 프로젝트 신규 축 — upright/reversed/keywords/advice pool 대상)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15, LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
const ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10, NEARVERBATIM_LCS_TH = 20;

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }

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

    ['a', 'b'].forEach(function (slot) {
      const pool = card[dir][slot];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const found = fullCombinedIssues(pool[i], pool[j], keywords);
          if (found.length) withinCardIssues.push('AXIS1 ' + card.name + ' ' + dir + '.' + slot + '[' + i + ',' + j + '] (' + found.join('|') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
        }
      }
    });

    const advicePool = card.advice[dir];
    for (let i = 0; i < advicePool.length; i++) {
      for (let j = i + 1; j < advicePool.length; j++) {
        const wj = wordJaccard(advicePool[i], advicePool[j]);
        if (wj >= WORD_TH) withinCardIssues.push('AXIS2 ' + card.name + ' advice.' + dir + '[' + i + ',' + j + '] (word=' + wj.toFixed(2) + ')\n  ' + advicePool[i] + '\n  ' + advicePool[j]);
      }
    }

    function echoIssue(s1, s2) {
      const wj = wordJaccard(s1, s2);
      const t1 = stripBoilerplateSuffix(normalizeForEcho(s1));
      const t2 = stripBoilerplateSuffix(normalizeForEcho(s2));
      const bj = bigramJaccard(t1, t2), lcs = longestCommonSubstring(t1, t2);
      if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
      return null;
    }
    const catTexts = collectCategoryTexts(card, dir);
    advicePool.forEach(function (adv, i) {
      card[dir].b.forEach(function (b, j) {
        const found = echoIssue(adv, b);
        if (found) withinCardIssues.push('AXIS3 ' + card.name + ' advice.' + dir + '[' + i + '] vs ' + dir + '.b[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + b);
      });
      catTexts.forEach(function (c, j) {
        const found = echoIssue(adv, c);
        if (found) withinCardIssues.push('AXIS3 ' + card.name + ' advice.' + dir + '[' + i + '] vs category-text[' + j + '] (' + found + ')\n  ' + adv + '\n  ' + c);
      });
    });

    const ownTexts = [
      { s: card[dir].a[0], locked: true }, { s: card[dir].a[1], locked: false }, { s: card[dir].a[2], locked: false },
      { s: card[dir].b[0], locked: true }, { s: card[dir].b[1], locked: false }, { s: card[dir].b[2], locked: false },
      { s: advicePool[0], locked: true }, { s: advicePool[1], locked: false }, { s: advicePool[2], locked: false }
    ].concat(catTexts.map(function (s) { return { s: s, locked: true }; }));
    keywords.forEach(function (kw, ki) {
      const nk = normalizeForEcho(kw);
      const kwLocked = ki < 3;
      ownTexts.forEach(function (t) {
        if (kwLocked && t.locked) return;
        if (normalizeForEcho(t.s).indexOf(nk) !== -1) withinCardIssues.push('AXIS5 ' + card.name + ' ' + dir + ': keyword "' + kw + '" appears in its own pool (locked=' + t.locked + '): ' + t.s);
      });
    });
  });
});
assert.strictEqual(withinCardIssues.length, 0, 'Found ' + withinCardIssues.length + ' within-card issues:\n' + withinCardIssues.join('\n\n'));
console.log('No within-card self-collisions (axis 1), advice self-collisions (axis 2), advice<->b/category echo (axis 3), or keyword self-echo (axis 5)');

// axis 4: 카드 간 완전동일 + 근접축자
const seen = new Map();
deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (dir) {
    ['a', 'b'].forEach(function (slot) {
      card[dir][slot].forEach(function (s, idx) {
        const where = card.name + ' ' + dir + '.' + slot + '[' + idx + ']';
        if (!seen.has(s)) seen.set(s, []);
        seen.get(s).push({ where: where, locked: idx === 0 });
      });
    });
  });
});
const exactIssues = [];
seen.forEach(function (occ, text) {
  if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
    exactIssues.push('"' + text + '" appears in: ' + occ.map(function (o) { return o.where; }).join(' | '));
  }
});
assert.strictEqual(exactIssues.length, 0, 'Found ' + exactIssues.length + ' cross-card exact-match collisions:\n' + exactIssues.join('\n'));
console.log('No cross-card exact-match collisions');

const nearVerbatimIssues = [];
for (let i = 0; i < deck.length; i++) {
  for (let j = i + 1; j < deck.length; j++) {
    const c1 = deck[i], c2 = deck[j];
    ['upright', 'reversed'].forEach(function (dir) {
      ['a', 'b'].forEach(function (slot) {
        c1[dir][slot].forEach(function (s1, x) {
          c2[dir][slot].forEach(function (s2, y) {
            if (x === 0 && y === 0) return;
            const lcs = longestCommonSubstring(stripBoilerplateSuffix(normalizeForEcho(s1)), stripBoilerplateSuffix(normalizeForEcho(s2)));
            if (lcs >= NEARVERBATIM_LCS_TH) {
              nearVerbatimIssues.push(c1.name + ' ' + dir + '.' + slot + x + ' <-> ' + c2.name + ' ' + dir + '.' + slot + y + ' (lcs=' + lcs + ')\n  ' + s1 + '\n  ' + s2);
            }
          });
        });
      });
    });
  }
}
assert.strictEqual(nearVerbatimIssues.length, 0, 'Found ' + nearVerbatimIssues.length + ' cross-card near-verbatim collisions:\n' + nearVerbatimIssues.join('\n'));
console.log('No cross-card near-verbatim collisions');

console.log('All tarot-data tests passed');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/tarot-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 실패하면 Task 1~6으로 돌아가 해당 카드의 신규 콘텐츠(인덱스 1/2, keywords 3~5, advice 1/2)를 수정한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add tests/tarot-data.test.js
git commit -m "test(tarot): rewrite structure and 5-axis dedup regression tests for a/b pool structure"
```

---

### Task 9: 브라우저 확인 (5개 모드 전부 회귀 확인)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~8의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node scripts/run-tests.js`
Expected: 10개 테스트 파일 전부 통과.

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. **타로(신규 랜덤화) — 카테고리 미선택**: 타로 모드 → 카테고리 선택 없이(오늘의운 기본 상태) "카드 뽑기" → 카드 1장 결과 확인, 해설 문장·키워드·조언을 기록해둔다.
2. "새 리딩 시작"으로 돌아가 같은 조건(카테고리 미선택)으로 5~6회 반복 뽑기를 한다. 같은 카드가 다시 나오면 그때의 해설 문장·키워드 조합·조언 중 최소 하나가 이전과 달라지는지 확인한다. (다른 카드가 나오면 그 카드도 정/역방향에 맞는 문장이 정상적으로 나오는지만 확인하고 계속 진행.)
3. **카테고리 선택 시**: 임의의 카테고리(예: 연애운)를 선택하고 카드를 뽑는다. 본문 해설 문장은 지금처럼 고정(항상 같은 카드/방향/하위선택이면 동일)이고, 키워드·조언만 반복 시 달라지는지 확인한다.
4. **정방향/역방향 둘 다 확인**: 카드가 여러 번 뽑히는 동안 정방향과 역방향이 각각 나왔을 때 모두 자연스러운 문장이 나오는지 확인한다.
5. **회귀 — 띠운세/별자리/사주**: 각 모드에서 리딩 실행 → 반복 시 결과가 계속 달라지는지 확인(타로 작업에 영향받지 않았는지).
6. **회귀 — 궁합**: 궁합 모드(별자리 궁합/띠 궁합/사주 궁합 중 하나) 실행 → 점수·등급은 고정, 문장/키워드/조언은 반복 시 달라지는지 확인.
7. "지난 기록"을 열어 방금 만든 타로 리딩들이 정상적으로 표시되는지 확인.
8. 콘솔에 에러가 없는지 확인.

Expected: 타로(1~4)는 카테고리 미선택 시 해설/키워드/조언이 반복해서 달라지고, 카테고리 선택 시 해설은 고정·키워드/조언만 달라짐. 띠운세/별자리/사주/궁합(5~6)은 계속 랜덤화 정상 동작. 7~8 정상.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인**

이 태스크는 검증 전용이라 기본적으로 커밋이 없다. Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(tarot): ...` 커밋을 추가한다.
