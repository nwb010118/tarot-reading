# 궁합 리딩 풍부화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 궁합 결과 텍스트를 다듬어 모든 등급이 2~3문장을 갖추게 하고, 등급당 키워드 3개 + 조언 1문장을 추가해 다른 4개 모드와 동일한 "키워드·조언 박스"를 궁합 결과 화면에도 보여준다.

**Architecture:** `data/compatibility-data.js`의 `COMPAT_TIER_DATA` 11개 등급 각각에 `keywords`(3개 배열), `advice`(1문장)를 추가하고, `text`가 2~3문장이 아닌 등급(`other`, 현재 1문장)은 2문장으로 확장한다. `js/app.js`의 `getCompatTierInfo()`가 `keywords`/`advice`를 반환하도록 확장하고, `showCompatibilitySummary()`가 기존 `renderKeywordsAdviceHtml()` 헬퍼(띠운세 서브프로젝트에서 신설, 이미 `js/app.js`에 존재)를 호출해 박스를 렌더링한다. 카테고리·하위선택 개념이 없는 모드라 새 UI나 새 헬퍼는 만들지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 기존 프로젝트와 동일. Node `assert` 기반 테스트.

## Global Constraints

- `score`/`label`은 절대 변경하지 않는다(다른 모드의 `trait`처럼 고정값 취급).
- `text` 필드는 정확히 2~3문장이어야 한다. `keywords`는 정확히 3개 배열, `advice`는 정확히 1문장.
- `text`의 `{a}`/`{b}` 치환 플레이스홀더는 그대로 유지한다(`getCompatTierInfo()`가 실행 시 실제 이름으로 치환).
- **"금지쌍" 개념이 없다** — 11개 등급(`same_element`, `complement`, `other`, `samhap`, `yukhap`, `same`, `none`, `chung`, `sangsaeng`, `bihwa`, `sanggeuk`) **전체가 서로** 문장 뼈대를 공유하면 안 된다(C(11,2)=55쌍 전수 비교).
- **잠긴 참조 예시**: `same_element`(객체의 첫 키) — Task 1 Step 1에서 작성한 이후 절대 수정하지 않는다.
- **중요한 데이터 특성**: 11개 등급의 `text` 첫 문장은 전부 `"{a}와(과) {b}은(는) ... 궁합이에요."` 템플릿을 공유한다(치환 전 리터럴 `{a}`/`{b}` 토큰 포함, 끝은 "궁합이에요"). 이 프리픽스·서픽스는 진짜 내용이 아니라 순수 템플릿이므로, **모든 중복검사 전에 반드시 제거**해야 한다 — 제거하지 않으면 55쌍 전부가 이 공유 템플릿 때문에 거짓 충돌로 잡힌다.
- **도메인 특성상 흔한 관계 어휘**("서로", "다른", "같은", "관계", "사이", "함께" 등)가 여러 등급에 자연스럽게 반복될 수 있다 — 어근 중복 검사(체크3)의 불용어 목록에 이런 범용어를 포함시켜 오탐을 줄인다(정확한 목록은 Task 1 Step 3의 스윕 스크립트에 포함되어 있음).
- 같은 등급 안에서 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하는 재진술 패딩 금지.
- **`advice`는 같은 화면에 함께 렌더되는 자기 자신의 `text`와도 겹치면 안 된다** — 이건 다른 등급과의 비교가 아니라 등급별 자기 자신에 대한 별도 축이다.
- 새 헬퍼 함수는 만들지 않는다 — 키워드/조언 박스는 `js/app.js`에 이미 있는 `renderKeywordsAdviceHtml(keywordsList, adviceText)`를 그대로 재사용한다.
- 카테고리/하위선택(subchoice) UI는 이 서브프로젝트 범위 밖이다. `SUBCHOICE_ENABLED_MODES`는 건드리지 않는다.

---

## Task 1: `data/compatibility-data.js` 콘텐츠 확장 (전체 11개 등급)

**Files:**
- Modify: `data/compatibility-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `COMPAT_TIER_DATA`의 11개 항목 각각에 `keywords`(string[3]), `advice`(string) 추가, `other` 등급의 `text`를 2문장으로 확장. `getCompatTierInfo()`는 이 태스크에서 시그니처를 바꾸지 않는다 — Task 3이 반환값 확장을 담당한다.

- [ ] **Step 1: `same_element` 항목에 아래 정확한 내용 적용 — 이후 10개 등급 작성의 패턴 기준**

`data/compatibility-data.js`의 `same_element` 항목을 다음으로 교체한다(`score`/`label`은 절대 변경하지 않음, `text`는 기존 그대로 — 이미 2문장이라 확장 불필요):

```js
  same_element: {
    score: 90,
    label: '동일원소 — 최고의 궁합',
    text: '{a}와(과) {b}은(는) 같은 원소라 마음이 잘 통하는 궁합이에요. 비슷한 방식으로 세상을 바라보니 대화가 잘 통합니다.',
    keywords: ["공감", "편안함", "동질감"],
    advice: "닮은 점이 많은 만큼, 가끔은 서로의 다른 부분에도 관심을 기울이면 관계가 더 풍성해질 거예요."
  },
```

- [ ] **Step 2: 나머지 10개 등급(complement, other, samhap, yukhap, same, none, chung, sangsaeng, bihwa, sanggeuk)에 같은 패턴 적용**

각 등급에 대해:
1. `score`/`label`은 절대 변경하지 않는다.
2. `text`: 기존 문장은 대부분 이미 2문장이므로 그대로 유지해도 되지만, Step 3의 스윕에서 다른 등급과 충돌이 발견되면 해당 등급의 `text`를 다시 쓴다. **`other` 등급만은 현재 1문장이므로 반드시 2문장으로 확장한다**(예: 첫 문장은 현재 문장 유지, 두 번째 문장에 구체적 조언 추가).
3. `keywords`(3개)와 `advice`(1문장)를 그 등급의 성격(다른 등급과 구별되는 관계 역학)을 반영해 작성한다. `advice`는 두 사람의 관계를 향한 조언으로, `text`와 다른 표현·다른 각도를 담아야 한다(자기 자신의 `text`와 겹치면 안 됨).
4. `{a}`/`{b}` 플레이스홀더는 `text`에서만 사용하고 `keywords`/`advice`에는 넣지 않는다(등급 자체의 성격 설명이라 특정 두 사람과 무관).
5. **한 등급을 다 쓸 때마다** 지금까지 작성한 다른 등급들과 오프닝 문장·전체 문장이 겹치지 않는지 직접 대조한다(11개 등급 전체이므로 마지막 등급을 쓸 때는 10개 전부와 대조).

- [ ] **Step 3: 전수 중복 스윕 스크립트 작성 및 실행**

`data/compatibility-data.js`가 있는 프로젝트 루트에서 다음 스크립트를 임시 파일(예: `scratch-dedup-check.js`, 작업 완료 후 삭제)로 저장하고 `node scratch-dedup-check.js`로 실행해 11개 등급 전체(잠긴 `same_element` 포함 — 이번 모드는 "다른 등급과 비교"가 스펙 자체이므로 별자리·띠운세와 달리 잠긴 등급도 비교 대상에서 제외하지 않는다)에서 충돌이 있는지 확인한다:

```javascript
const { COMPAT_TIER_DATA } = require('./data/compatibility-data.js');

// 모든 등급의 text 첫 문장이 공유하는 순수 템플릿 — 진짜 내용이 아니므로 비교 전 반드시 제거한다.
const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).map(stripTemplatePrefix);
}

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

function charTrigrams(text) {
  const norm = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  const grams = new Set();
  for (let i = 0; i < norm.length - 2; i++) grams.add(norm.slice(i, i + 3));
  return grams;
}

function trigramJaccard(a, b) {
  const setA = charTrigrams(a);
  const setB = charTrigrams(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다'];
function stripBoilerplateSuffix(s) {
  const sorted = BOILERPLATE_SUFFIXES.slice().sort((a, b) => b.length - a.length);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of sorted) {
      if (s.endsWith(suf)) { s = s.slice(0, -suf.length); changed = true; }
    }
  }
  return s;
}

function stripOwnKeywords(text, keywords) {
  let s = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  keywords.forEach(kw => { s = s.split(kw).join(''); });
  return s;
}

function longestCommonSubstring(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = new Array(b.length + 1).fill(0);
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > max) max = cur[j]; }
    }
    prev = cur;
  }
  return max;
}

const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const PARTICLES_SORTED = PARTICLES.slice().sort((a, b) => b.length - a.length);
function stem(word) {
  let w = word;
  let changed = true;
  while (changed && w.length > 2) {
    changed = false;
    for (const p of PARTICLES_SORTED) {
      if (w.endsWith(p) && w.length - p.length >= 2) { w = w.slice(0, -p.length); changed = true; break; }
    }
  }
  return w;
}

// 이 모드는 "두 사람의 관계"를 다루는 도메인이라 서로/다른/같은/관계/사이/함께 같은
// 범용 관계 어휘가 여러 등급에 자연스럽게 반복된다 — 어근 중복 오탐을 막기 위해 불용어 처리한다.
const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
function significantStems(text, keywords) {
  return text.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean)
    .map(w => stem(w))
    .filter(w => w.length >= 2 && !STEM_STOPWORDS.includes(w) && !keywords.includes(w));
}

function charBigramSet(s) {
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  return grams;
}

function bigramJaccard(a, b) {
  const setA = charBigramSet(a), setB = charBigramSet(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const ALL_TIERS = Object.keys(COMPAT_TIER_DATA);
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;
const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

let found = 0;

// 체크 1~3: 11개 등급 전체 C(11,2)=55쌍
for (let i = 0; i < ALL_TIERS.length; i++) {
  for (let j = i + 1; j < ALL_TIERS.length; j++) {
    const tierA = ALL_TIERS[i], tierB = ALL_TIERS[j];
    const dataA = COMPAT_TIER_DATA[tierA], dataB = COMPAT_TIER_DATA[tierB];
    const sentsA = splitSentences(dataA.text);
    const sentsB = splitSentences(dataB.text);

    // 체크 1: 모든 문장 쌍(문장 위치 무관), word-Jaccard >= 0.3
    sentsA.forEach(sentA => {
      sentsB.forEach(sentB => {
        const sim = wordJaccard(sentA, sentB);
        if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
          found++;
          console.log(`[문장 word=${(sim * 100).toFixed(0)}%] ${tierA} <-> ${tierB}`);
          console.log('  A:', sentA);
          console.log('  B:', sentB);
        }
      });
    });

    // 체크 2: 오프닝 문장, word AND trigram
    const openingA = sentsA[0], openingB = sentsB[0];
    const wj = wordJaccard(openingA, openingB);
    const tj = trigramJaccard(openingA, openingB);
    if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
      found++;
      console.log(`[오프닝 word=${wj.toFixed(2)}, trigram=${tj.toFixed(2)}] ${tierA} <-> ${tierB}`);
      console.log('  A:', openingA);
      console.log('  B:', openingB);
    }

    // 체크 3: 오프닝 문장, bigram/LCS/어근중복 OR결합 (keywords·상투구 제거 후)
    const kwStrippedA = stripOwnKeywords(openingA, dataA.keywords);
    const kwStrippedB = stripOwnKeywords(openingB, dataB.keywords);
    const trimmedA = stripBoilerplateSuffix(kwStrippedA);
    const trimmedB = stripBoilerplateSuffix(kwStrippedB);
    const lcs = longestCommonSubstring(trimmedA, trimmedB);
    const stemsA = significantStems(openingA, dataA.keywords);
    const stemsB = significantStems(openingB, dataB.keywords);
    const sharedStems = [...new Set(stemsA.filter(s => stemsB.includes(s)))];
    const bj = bigramJaccard(kwStrippedA, kwStrippedB);
    if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
      found++;
      console.log(`[보조 lcs=${lcs}, stems=${sharedStems.join(',')}, bigram=${bj.toFixed(3)}] ${tierA} <-> ${tierB}`);
      console.log('  A:', openingA);
      console.log('  B:', openingB);
    }
  }
}

// 체크 4: advice 자기중복 — 등급별로 advice가 같은 등급의 text 문장과 겹치지 않는지
ALL_TIERS.forEach(tier => {
  const data = COMPAT_TIER_DATA[tier];
  const textSents = splitSentences(data.text);
  const advice = data.advice;
  textSents.forEach(sent => {
    const wj2 = wordJaccard(advice, sent);
    const kwStrippedAdv = stripOwnKeywords(advice, data.keywords);
    const kwStrippedSent = stripOwnKeywords(sent, data.keywords);
    const bj2 = bigramJaccard(kwStrippedAdv, kwStrippedSent);
    const lcs2 = longestCommonSubstring(stripBoilerplateSuffix(kwStrippedAdv), stripBoilerplateSuffix(kwStrippedSent));
    if (wj2 >= SENTENCE_SIMILARITY_THRESHOLD || bj2 >= BIGRAM_JACCARD_THRESHOLD || lcs2 >= LCS_THRESHOLD) {
      found++;
      console.log(`[advice 자기중복 wj=${wj2.toFixed(2)}, bigram=${bj2.toFixed(3)}, lcs=${lcs2}] ${tier}`);
      console.log('  text:', sent);
      console.log('  advice:', advice);
    }
  });
});

console.log(`Found ${found} collisions`);
```

`Found 0 collisions`가 나올 때까지 충돌이 발견된 필드를 수정하고 재실행한다. 잠긴 `same_element`는 다른 등급 쪽을 수정해서 해결한다(이 등급 자체는 수정하지 않음). 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

11개 등급 전체를 Read 도구로 다시 읽어 다음을 육안으로 확인한다: 모든 등급에 `keywords`(3개), `advice`(1문장)가 있는지, `text`가 2~3문장인지(`other` 포함), `score`/`label`이 원본과 동일한지(`same_element`는 Step 1의 원문과, 나머지는 파일 상단의 기존 원문과 정확히 일치해야 함).

- [ ] **Step 5: 커밋**

```bash
git add data/compatibility-data.js
git commit -m "content(compat): expand tier text sentences, add keywords/advice per tier"
```

---

## Task 2: 영구 회귀 테스트 신규 생성 (`tests/compatibility-data.test.js`)

**Files:**
- Create: `tests/compatibility-data.test.js`

**Interfaces:**
- Consumes: Task 1이 만든 `COMPAT_TIER_DATA`의 새 구조(`keywords`, `advice`, 확장된 `text`)
- Produces: 없음(테스트 파일)

- [ ] **Step 1: 기본 구조 검증 + keywords/advice/문장수 검증 테스트 작성**

```javascript
const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');

const EXPECTED_TIERS = ['same_element', 'complement', 'other', 'samhap', 'yukhap', 'same', 'none', 'chung', 'sangsaeng', 'bihwa', 'sanggeuk'];

assert.strictEqual(Object.keys(COMPAT_TIER_DATA).length, 11, '궁합 등급은 11개여야 함');
assert.deepStrictEqual(Object.keys(COMPAT_TIER_DATA), EXPECTED_TIERS, '기존 등급 순서가 유지되어야 함');

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  assert.ok(typeof data.score === 'number', tier + '.score 누락');
  assert.ok(typeof data.label === 'string' && data.label.length > 0, tier + '.label 누락');
  assert.ok(typeof data.text === 'string' && data.text.includes('{a}') && data.text.includes('{b}'), tier + '.text에 {a}/{b} 플레이스홀더가 있어야 함');
  assert.ok(Array.isArray(data.keywords) && data.keywords.length === 3, tier + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof data.advice === 'string' && data.advice.length > 0, tier + ' advice must be a non-empty string');

  const sentCount = splitSentences(data.text).length;
  assert.ok(sentCount === 2 || sentCount === 3, tier + '.text must have 2 or 3 sentences, got ' + sentCount);
});

console.log('All 11 compatibility tiers have valid structure (score/label/text placeholders/keywords/advice/sentence-count)');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/compatibility-data.test.js`
Expected: 통과 메시지 출력. Task 1이 제대로 됐다면 이 시점에 이미 통과해야 한다(이 테스트는 새 기능이 아니라 Task 1 결과의 회귀 가드).

- [ ] **Step 3: 등급 간 전수 중복 스윕 + advice 자기중복 검사 테스트 추가**

같은 파일 끝에 이어서 추가(Task 1 Step 3의 스크립트를 영구 테스트로 이식):

```javascript
// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트: 11개 등급 전체가 서로 문장 뼈대를 공유하지 않는지,
// advice가 자기 자신의 text와 겹치지 않는지 검증한다.
// 이 모드는 "금지쌍" 개념이 없으므로 11개 등급 전체(C(11,2)=55쌍)를 비교한다.
// 모든 등급의 text 첫 문장이 "{a}와(과) {b}은(는) ... 궁합이에요" 템플릿을
// 공유하므로, 비교 전 이 프리픽스를 반드시 제거한다(그렇지 않으면 55쌍 전부가
// 거짓 충돌로 잡힌다).
// ---------------------------------------------------------------------------

const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
}

function splitSentencesForDedup(text) {
  return splitSentences(text).map(stripTemplatePrefix);
}

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

function charTrigrams(text) {
  const norm = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  const grams = new Set();
  for (let i = 0; i < norm.length - 2; i++) {
    grams.add(norm.slice(i, i + 3));
  }
  return grams;
}

function trigramJaccard(a, b) {
  const setA = charTrigrams(a);
  const setB = charTrigrams(b);
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다'];
function stripBoilerplateSuffix(s) {
  const sorted = BOILERPLATE_SUFFIXES.slice().sort(function (a, b) { return b.length - a.length; });
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < sorted.length; i++) {
      if (s.endsWith(sorted[i])) { s = s.slice(0, -sorted[i].length); changed = true; }
    }
  }
  return s;
}

function stripOwnKeywords(text, keywords) {
  let s = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  keywords.forEach(function (kw) { s = s.split(kw).join(''); });
  return s;
}

function longestCommonSubstring(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = new Array(b.length + 1).fill(0);
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > max) max = cur[j];
      }
    }
    prev = cur;
  }
  return max;
}

const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const PARTICLES_SORTED = PARTICLES.slice().sort(function (a, b) { return b.length - a.length; });
function stem(word) {
  let w = word;
  let changed = true;
  while (changed && w.length > 2) {
    changed = false;
    for (let i = 0; i < PARTICLES_SORTED.length; i++) {
      const p = PARTICLES_SORTED[i];
      if (w.endsWith(p) && w.length - p.length >= 2) { w = w.slice(0, -p.length); changed = true; break; }
    }
  }
  return w;
}

const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
function significantStems(text, keywords) {
  return text.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean)
    .map(function (w) { return stem(w); })
    .filter(function (w) { return w.length >= 2 && STEM_STOPWORDS.indexOf(w) === -1 && keywords.indexOf(w) === -1; });
}

function charBigramSet(s) {
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  return grams;
}

function bigramJaccard(a, b) {
  const setA = charBigramSet(a), setB = charBigramSet(b);
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const SENTENCE_SIMILARITY_THRESHOLD = 0.3;
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;
const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

const collisions = [];
for (let i = 0; i < EXPECTED_TIERS.length; i++) {
  for (let j = i + 1; j < EXPECTED_TIERS.length; j++) {
    const tierA = EXPECTED_TIERS[i], tierB = EXPECTED_TIERS[j];
    const dataA = COMPAT_TIER_DATA[tierA], dataB = COMPAT_TIER_DATA[tierB];
    const sentsA = splitSentencesForDedup(dataA.text);
    const sentsB = splitSentencesForDedup(dataB.text);

    sentsA.forEach(function (sentA) {
      sentsB.forEach(function (sentB) {
        const sim = wordJaccard(sentA, sentB);
        if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
          collisions.push(tierA + ' <-> ' + tierB + ' (word=' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
        }
      });
    });

    const openingA = sentsA[0], openingB = sentsB[0];
    const wj = wordJaccard(openingA, openingB);
    const tj = trigramJaccard(openingA, openingB);
    if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
      collisions.push(tierA + ' <-> ' + tierB + ' opening (word=' + wj.toFixed(2) + ', trigram=' + tj.toFixed(2) + ')\n  ' + openingA + '\n  ' + openingB);
    }

    const kwStrippedA = stripOwnKeywords(openingA, dataA.keywords);
    const kwStrippedB = stripOwnKeywords(openingB, dataB.keywords);
    const trimmedA = stripBoilerplateSuffix(kwStrippedA);
    const trimmedB = stripBoilerplateSuffix(kwStrippedB);
    const lcs = longestCommonSubstring(trimmedA, trimmedB);
    const stemsA = significantStems(openingA, dataA.keywords);
    const stemsB = significantStems(openingB, dataB.keywords);
    const sharedStems = [...new Set(stemsA.filter(function (s) { return stemsB.indexOf(s) !== -1; }))];
    const bj = bigramJaccard(kwStrippedA, kwStrippedB);
    if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
      collisions.push(tierA + ' <-> ' + tierB + ' opening-aux (lcs=' + lcs + ', stems=[' + sharedStems.join(',') + '], bigram=' + bj.toFixed(3) + ')\n  ' + openingA + '\n  ' + openingB);
    }
  }
}

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' cross-tier collisions:\n' + collisions.join('\n'));

console.log('No cross-tier sentence/opening collisions among the 11 compatibility tiers');

const selfEchoIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const textSents = splitSentencesForDedup(data.text);
  const advice = data.advice;
  textSents.forEach(function (sent) {
    const wj2 = wordJaccard(advice, sent);
    const kwStrippedAdv = stripOwnKeywords(advice, data.keywords);
    const kwStrippedSent = stripOwnKeywords(sent, data.keywords);
    const bj2 = bigramJaccard(kwStrippedAdv, kwStrippedSent);
    const lcs2 = longestCommonSubstring(stripBoilerplateSuffix(kwStrippedAdv), stripBoilerplateSuffix(kwStrippedSent));
    if (wj2 >= SENTENCE_SIMILARITY_THRESHOLD || bj2 >= BIGRAM_JACCARD_THRESHOLD || lcs2 >= LCS_THRESHOLD) {
      selfEchoIssues.push(tier + ' advice<->text (wj=' + wj2.toFixed(2) + ', bigram=' + bj2.toFixed(3) + ', lcs=' + lcs2 + ')\n  text: ' + sent + '\n  advice: ' + advice);
    }
  });
});

assert.strictEqual(selfEchoIssues.length, 0,
  'Found ' + selfEchoIssues.length + ' advice/text self-echo issues:\n' + selfEchoIssues.join('\n'));

console.log('No tier advice self-echoes its own text');

console.log('All compatibility-data tests passed');
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `node tests/compatibility-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 충돌 발견 시 Task 1로 돌아가 해당 등급의 `text`/`advice`를 수정한 뒤 이 테스트를 다시 실행한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

- [ ] **Step 5: `getCompatTierInfo()` 회귀 확인 테스트 추가**

같은 파일 끝에 이어서 추가:

```javascript
const info = getCompatTierInfo('same_element', '갑목', '을목');
assert.strictEqual(info.score, 90, 'getCompatTierInfo score 회귀');
assert.strictEqual(info.tierLabel, '동일원소 — 최고의 궁합', 'getCompatTierInfo tierLabel 회귀');
assert.ok(info.text.indexOf('{a}') === -1 && info.text.indexOf('{b}') === -1, 'getCompatTierInfo text는 치환이 끝난 상태여야 함');
assert.ok(info.text.indexOf('갑목') !== -1 && info.text.indexOf('을목') !== -1, 'getCompatTierInfo text에 실제 이름이 들어가야 함');

console.log('getCompatTierInfo() correctly substitutes names and returns unchanged score/tierLabel');
```

- [ ] **Step 6: 전체 실행 및 커밋**

Run: `node tests/compatibility-data.test.js`
Expected: 모든 메시지 출력, exit code 0.

```bash
git add tests/compatibility-data.test.js
git commit -m "test(compat): add permanent structure, cross-tier dedup, and self-echo regression tests"
```

---

## Task 3: `js/app.js` 통합 — 키워드/조언 박스 연결

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1이 만든 `COMPAT_TIER_DATA`의 `keywords`/`advice`, 기존 `renderKeywordsAdviceHtml(keywordsList, adviceText)` 헬퍼(이미 `js/app.js`에 존재, 띠운세 서브프로젝트에서 신설)
- Produces: 없음(UI 로직) — `getCompatTierInfo()`/`showCompatibilitySummary()` 함수 시그니처(인자 개수·순서)는 변경하지 않는다.

- [ ] **Step 1: `getCompatTierInfo()`가 keywords/advice도 반환하도록 확장**

`data/compatibility-data.js`의 다음 함수:

```javascript
function getCompatTierInfo(tier, labelA, labelB) {
  const data = COMPAT_TIER_DATA[tier];
  return {
    score: data.score,
    tierLabel: data.label,
    text: data.text.replace('{a}', labelA).replace('{b}', labelB)
  };
}
```

를 다음으로 교체:

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

(이 함수는 `data/compatibility-data.js`에 정의되어 있다 — `js/app.js`가 아니다. 파일을 착각하지 않도록 주의.)

- [ ] **Step 2: `showCompatibilitySummary()`에 키워드/조언 박스 렌더링 추가**

`js/app.js`의 다음 함수:

```javascript
  function showCompatibilitySummary(label1, label2, tierInfo) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail"><p>' + tierInfo.text + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

를 다음으로 교체:

```javascript
  function showCompatibilitySummary(label1, label2, tierInfo) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    const extraHtml = renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice);
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail"><p>' + tierInfo.text + '</p></div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

- [ ] **Step 3: 문법 검증**

Run: `node --check js/app.js` 그리고 `node --check data/compatibility-data.js`
Expected: 둘 다 에러 없이 종료.

- [ ] **Step 4: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js && node tests/ddi-data.test.js && node tests/compatibility-data.test.js`
Expected: 전부 통과.

- [ ] **Step 5: 커밋**

```bash
git add data/compatibility-data.js js/app.js
git commit -m "feat(compat): wire keyword/advice rendering into compatibility flow"
```

---

## Task 4: 브라우저 확인 + 전체 회귀 (5개 모드 전부)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~3의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js && node tests/ddi-data.test.js && node tests/compatibility-data.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 궁합 3개 서브타입 + 4개 다른 모드 회귀 확인**

1. **궁합 — 별자리 궁합**: 궁합 모드 → "별자리 궁합" 선택 → 사람1/사람2 별자리 선택(예: 양자리+양자리 → same_element 등급) → 궁합 보기 실행 → 결과 화면에 점수 + 등급 라벨 + 2~3문장 해설 + "키워드: OO · OO · OO" + "조언: ..." 박스가 함께 보이는지 확인
2. **궁합 — 띠 궁합**: "띠 궁합" 선택 → 두 사람의 출생연도 입력(예: 삼합 조합이 되도록) → 궁합 보기 → 키워드/조언 박스 포함 결과 확인
3. **궁합 — 사주 궁합**: "사주 궁합" 선택 → 두 사람의 생년월일 입력 → 궁합 보기 → 키워드/조언 박스 포함 결과 확인
4. **회귀 — 타로**: 타로 모드로 전환해 카드 뽑기 → 결과가 기존과 동일하게 나오는지 확인(이 서브프로젝트가 타로 코드를 건드리지 않았으므로 회귀가 있으면 안 됨)
5. **회귀 — 사주/별자리/띠운세**: 각각 리딩 실행 → 결과 화면(키워드/조언 박스 포함)이 정상 동작하는지 확인
6. "지난 기록" 열어서 방금 실행한 궁합 리딩 3건이 정상적으로 표시되는지 확인(기존 형식 그대로 — `subtype`/`person1Label`/`person2Label`/`tierLabel`/`score`)
7. 콘솔에 에러가 없는지 확인

Expected: 위 7가지 모두 기대한 대로 동작, 콘솔 에러 없음.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(compat): ...` 커밋 추가).
