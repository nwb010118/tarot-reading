# 띠운세 리딩 풍부화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 띠운세 카테고리 해설을 1문장→2~3문장으로 확장하고, 띠당 키워드/조언 부가정보를 추가하고, 8개 카테고리에 하위 세분화를 도입한다. 동시에 `js/app.js`에서 타로·사주·별자리가 각자 반복 구현 중인 카테고리 해석·키워드/조언 렌더링 로직을 공통 헬퍼로 추출해, 4번째 모드인 띠운세가 그 헬퍼를 재사용하도록 만든다.

**Architecture:** `data/ddi-data.js`의 `DDI_DATA` 12개 항목 각각에 `keywords`(3개 배열), `advice`(1문장)를 추가하고, 8개 카테고리를 세분화 객체로 변경한다(사주·별자리와 동일한 2단 중첩, 방향성 없음). `js/app.js`에는 `resolveSubchoiceValue()`/`resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()` 3개 헬퍼를 신설하고, 기존 `showSummary()`(타로)/`showSajuSummary()`/`showZodiacSummary()`를 이 헬퍼를 쓰도록 리팩토링(동작 불변)한 뒤, 신규 `showDdiSummary()`도 같은 헬퍼로 작성한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 기존 프로젝트와 동일. Node `assert` 기반 테스트.

## Global Constraints

- 띠의 `trait`(2문장 소개 텍스트)는 절대 변경하지 않는다.
- 세분화 카테고리는 정확히 이 8개와 하위 키다(타로·사주·별자리와 완전히 동일): `love`(solo/couple), `money`(consumption/invest), `career`(jobseek/switch), `business`(startup/running), `study`(exam/path), `health`(body/mind), `relationships`(new/existing), `workplace`(team/personal).
- 단일 유지 카테고리는 정확히 이 3개다: `honor`, `moving`, `children` — 문장만 2~3문장으로 확장.
- 카테고리 해설 문장은 2~3문장, 띠당 조언(`advice`)은 1문장, 키워드(`keywords`)는 정확히 3개 배열. 방향성 없음(띠마다 하나씩만).
- `data/ddi-data.js`는 기존에 큰따옴표(`"..."`) 스타일을 쓴다 — 그대로 따른다.
- "원숭이띠"(`key: "monkey"`)는 이 작업에서 가장 먼저 정확한 목표 패턴으로 작성하는 참조 예시다 — Task 1 Step 1에서 작성한 이후 **절대 수정하지 않는다**.
- 같은 띠 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 절대 오프닝 문장이나 문장 뼈대를 공유하면 안 된다(4개 서브키 조합 전부). 금지쌍이 아니더라도 같은 띠 안에서 특정 문형을 여러 필드에 mad-libs식으로 반복해서 쓰지 않는다.
- 같은 필드 안에서 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하는 재진술 패딩 금지.
- **중복검사는 별자리 프로젝트 최종 리뷰에서 확정한 3단 결합 방식을 처음부터 사용한다** — 필드 전체 단위 도구는 만들지 않는다: (1) 모든 문장 쌍 word-Jaccard ≥0.3 스윕, (2) 오프닝 문장끼리 word-Jaccard≥0.20 AND 트라이그램 Jaccard≥0.15 결합 스윕, (3) 오프닝 문장끼리 (종결 상투구·자기 자신의 keywords 제거 후) 최장공통부분문자열≥5 OR 공유 어근 개수≥2 OR 문자 bigram-Jaccard≥0.185 OR결합 스윕. 세 스윕 모두 Task 1의 스윕 스크립트와 Task 2의 회귀 테스트에 처음부터 포함한다.
- **리팩토링(Task 3)은 동작을 바꾸지 않는다** — 타로·사주·별자리 3개 모드의 리딩 결과가 리팩토링 전후로 완전히 동일해야 한다. 새 헬퍼 함수의 시그니처는 `resolveSubchoiceValue(category, value, selectedSubChoice)`, `resolveCategoryMeaning(entity, category, period, selectedSubChoice)`, `renderKeywordsAdviceHtml(keywordsList, adviceText)`로 고정한다(이후 태스크가 이 이름과 파라미터 순서를 그대로 사용).
- 하위 선택 UI 허용목록(`SUBCHOICE_ENABLED_MODES`)에 `'ddi'`를 추가하는 것 외에 새 HTML 마크업은 만들지 않는다.

---

## Task 1: `data/ddi-data.js` 콘텐츠 확장 (전체 12개 띠)

**Files:**
- Modify: `data/ddi-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `DDI_DATA` 각 항목에 `keywords`(string[3]), `advice`(string) 추가, `categories`의 8개 필드를 세분화 객체로 변경. `getDdiByYear()`는 시그니처 변경 없음 — Task 2(테스트)와 Task 4(JS 통합)가 이 새 구조를 직접 사용한다.

- [ ] **Step 1: "원숭이띠" 항목에 아래 정확한 내용 적용 — 이후 11개 띠 작성의 패턴 기준**

`data/ddi-data.js`의 첫 번째 `DDI_DATA` 항목(`key: "monkey"`)을 다음으로 교체한다(`trait`는 절대 변경하지 않음):

```js
  {
    key: "monkey", name_kr: "원숭이띠",
    trait: "영리하고 재치 있는 원숭이띠는 순발력 있게 상황에 대처합니다. 다재다능함이 큰 무기입니다.",
    keywords: ["재치", "순발력", "다재다능"],
    advice: "임기응변만큼 꾸준한 마무리를 챙기면 성과가 더 오래갑니다.",
    categories: {
      love: {
        solo: "가벼운 농담 한마디로 상대의 마음을 순식간에 사로잡는 시기입니다. 고백을 서두르기보다는 편안한 분위기를 먼저 만들어보세요.",
        couple: "위트 넘치는 대화로 연인과의 시간을 즐겁게 채우는 시기입니다. 재미만 좇다 진지한 대화를 놓치지 않도록 균형을 잡아보세요."
      },
      money: {
        consumption: "재미있어 보이는 것에 홀려 지갑을 쉽게 여는 시기입니다. 충동적인 선택 전에 잠깐 멈춰 생각하는 습관이 도움이 됩니다.",
        invest: "발 빠른 정보력으로 남들보다 먼저 기회를 알아채는 시기입니다. 다만 확인 없이 뛰어들면 손해로 이어질 수 있으니 조심하세요."
      },
      career: {
        jobseek: "임기응변에 강한 면모가 면접에서 좋은 인상을 남기는 시기입니다. 순발력만 믿지 말고 기본기도 꼼꼼히 준비해두세요.",
        switch: "지금 자리에 남을지 새 도전에 나설지 고민이 깊어지는 시기입니다. 재빠른 결정보다 충분한 정보 수집이 먼저입니다."
      },
      workplace: {
        team: "위트 있는 발언으로 회의 분위기를 밝게 만드는 시기입니다. 아이디어를 실행으로 옮기는 끈기도 함께 보여주면 신뢰가 쌓입니다.",
        personal: "여러 업무를 동시에 처리하는 순발력이 돋보이는 시기입니다. 속도에 취해 마무리를 소홀히 하지 않도록 점검하세요."
      },
      business: {
        startup: "아무도 눈여겨보지 않던 틈새를 재빠르게 캐치해 사업 아이디어로 연결하는 시기입니다. 아이디어만큼 꾸준한 실행력을 갖추는 게 관건입니다.",
        running: "예리한 눈치로 위기의 순간마다 판을 뒤집는 시기입니다. 임기응변에만 의존하지 말고 장기 전략도 함께 세워보세요."
      },
      study: {
        exam: "핵심만 콕 집어 효율적으로 공부하는 요령이 빛을 발하는 시기입니다. 요령에만 기대지 말고 기초를 다지는 시간도 확보하세요.",
        path: "여러 분야에 대한 호기심이 새로운 진로 아이디어로 이어지는 시기입니다. 흥미를 좇다 한 우물을 파는 끈기도 잊지 마세요."
      },
      health: {
        body: "재빠른 몸놀림으로 활동적인 하루를 보내는 시기입니다. 이것저것 손대다 정작 휴식을 놓치지 않도록 하세요.",
        mind: "머릿속이 여러 생각으로 분주해 산만해지기 쉬운 시기입니다. 하나씩 정리하는 시간을 가지면 마음이 한결 가벼워집니다."
      },
      relationships: {
        new: "재치 있는 첫인상으로 새로운 사람들의 호감을 얻는 시기입니다. 인맥을 넓히는 재미에 깊이를 놓치지 않도록 신경 쓰세요.",
        existing: "가벼운 장난기로 오래된 친구들과의 만남에 활기를 더하는 시기입니다. 웃음 뒤에 진심 어린 말 한마디를 더하면 사이가 더 돈독해집니다."
      },
      honor: "순발력 있는 처신으로 주변의 호감을 사는 시기입니다. 가벼운 이미지를 벗고 싶다면 꾸준한 성실함도 함께 보여주세요.",
      moving: "괜찮은 자리가 나왔다는 소식을 재빠르게 알아채는 시기입니다. 조급한 마음에 계약 조건을 대충 넘기지 않도록 꼼꼼히 살펴보세요.",
      children: "아이와 재미있는 놀이를 함께 만들어가며 웃음이 끊이지 않는 시기입니다. 놀이 뒤에는 차분히 마무리하는 습관도 함께 알려주세요."
    }
  },
```

> **정정 이력 (2026-09-01):** 위 잠긴 원숭이띠 블록의 `business.running`과 `relationships.existing`은 최초 작성 원문에서 각각 `money.invest`/`love.couple`와 브리핑의 3단 결합 스윕 기준으로 실제 충돌(`money.invest`↔`business.running` 공유 어근 "빠른"/"기회" 2개, `love.couple`↔`relationships.existing` bigram-Jaccard 0.209)이 있었음이 Task 2 테스트 작성 중 발견되어, 위 두 필드를 현재 버전으로 교체했다. 이 교체 이후의 버전이 최종 잠긴 참조이며, `data/ddi-data.js`도 이 버전과 바이트 단위로 일치해야 한다.

- [ ] **Step 2: 나머지 11개 띠(닭띠, 개띠, 돼지띠, 쥐띠, 소띠, 호랑이띠, 토끼띠, 용띠, 뱀띠, 말띠, 양띠)에 같은 패턴 적용**

각 띠에 대해:
1. `trait`는 절대 변경하지 않는다.
2. `keywords`(3개)와 `advice`(1문장)를 그 띠의 `trait`와 기존 1문장 카테고리 텍스트가 담고 있는 성격/기운을 반영해 작성한다.
3. 8개 세분화 카테고리는 각 서브키가 실질적으로 다른 시나리오를 다루도록 2문장(또는 자연스러우면 3문장)으로 작성한다. 첫 문장은 상황 묘사, 두 번째(세 번째) 문장은 그 서브키에 실제로 맞는 구체적 조언·뉘앙스·다음 행동을 담는다 — 재진술 금지.
4. 3개 단일 카테고리(honor, moving, children)도 2~3문장으로 확장한다.
5. **한 띠를 다 쓸 때마다** 그 띠 안에서 `love`↔`relationships`(4개 서브키 조합), `career`↔`workplace`(4개 조합), `money`↔`business`(4개 조합)가 오프닝 문장이나 뼈대를 공유하지 않는지 직접 대조한다. 아울러 금지쌍이 아니더라도 같은 띠의 다른 필드들과 5글자 이상 연속으로 겹치는 구절이 없는지(특히 물건/장소/사람을 가리키는 명사+동사 조합) 훑어본다 — 별자리 프로젝트 최종 리뷰에서 "money.invest"와 "moving"처럼 금지쌍이 아닌 두 필드가 우연히 거의 같은 문장을 쓴 사례(I-3 유형)가 발견된 바 있다.
6. 문자열은 기존 파일 스타일대로 큰따옴표(`"..."`)를 사용한다.

- [ ] **Step 3: 3단 결합 중복 스윕 스크립트 작성 및 실행**

`data/ddi-data.js`가 있는 프로젝트 루트에서 다음 스크립트를 임시 파일(예: `scratch-dedup-check.js`, 작업 완료 후 삭제)로 저장하고 `node scratch-dedup-check.js`로 실행해 원숭이띠를 제외한 11개 띠 전체에서 금지쌍 충돌이 있는지 확인한다. 별자리 프로젝트 최종 리뷰에서 확정한 3단 체크(광범위 문장 단위 word-Jaccard + 오프닝 문장 word+trigram AND결합 + 오프닝 문장 bigram/LCS/어근중복 OR결합)를 처음부터 함께 사용한다:

```javascript
const { DDI_DATA } = require('./data/ddi-data.js');

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
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

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다'];
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

const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
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

const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;
const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

let found = 0;
DDI_DATA.forEach(ddi => {
  if (ddi.key === 'monkey') return; // 잠긴 참조 예시는 이미 검증됨
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => {
      subsB.forEach(subB => {
        const textA = ddi.categories[catA][subA];
        const textB = ddi.categories[catB][subB];

        // 체크 1: 모든 문장 쌍, word-Jaccard >= 0.3
        splitSentences(textA).forEach(sentA => {
          splitSentences(textB).forEach(sentB => {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              found++;
              console.log(`[문장 word=${(sim * 100).toFixed(0)}%] ${ddi.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
              console.log('  A:', sentA);
              console.log('  B:', sentB);
            }
          });
        });

        const openingA = splitSentences(textA)[0];
        const openingB = splitSentences(textB)[0];

        // 체크 2: 오프닝 문장, word AND trigram
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          found++;
          console.log(`[오프닝 word=${wj.toFixed(2)}, trigram=${tj.toFixed(2)}] ${ddi.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
          console.log('  A:', openingA);
          console.log('  B:', openingB);
        }

        // 체크 3: 오프닝 문장, bigram/LCS/어근중복 OR결합 (keywords·상투구 제거 후)
        const kwStrippedA = stripOwnKeywords(openingA, ddi.keywords);
        const kwStrippedB = stripOwnKeywords(openingB, ddi.keywords);
        const trimmedA = stripBoilerplateSuffix(kwStrippedA);
        const trimmedB = stripBoilerplateSuffix(kwStrippedB);
        const lcs = longestCommonSubstring(trimmedA, trimmedB);
        const stemsA = significantStems(openingA, ddi.keywords);
        const stemsB = significantStems(openingB, ddi.keywords);
        const sharedStems = [...new Set(stemsA.filter(s => stemsB.includes(s)))];
        const bj = bigramJaccard(kwStrippedA, kwStrippedB);
        if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
          found++;
          console.log(`[보조 lcs=${lcs}, stems=${sharedStems.join(',')}, bigram=${bj.toFixed(3)}] ${ddi.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
          console.log('  A:', openingA);
          console.log('  B:', openingB);
        }
      });
    });
  });
});
console.log(`Found ${found} collisions`);
```

`Found 0 collisions`가 나올 때까지 충돌이 발견된 필드를 수정하고 재실행한다. 수정할 때는 두 필드 중 하나만 다시 쓰되, 그 결과가 같은 띠의 다른 필드와 새로 겹치지 않는지 재확인한다. 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

12개 띠 전체를 Read 도구로 다시 읽어 다음을 육안으로 확인한다: 모든 띠에 `keywords`(3개), `advice`(1문장)가 있는지, 8개 세분화 카테고리가 두 서브키 모두 존재하고 서로 다른지, 3개 단일 카테고리가 존재하는지, `trait`가 원본과 동일한지.

- [ ] **Step 5: 커밋**

```bash
git add data/ddi-data.js
git commit -m "content(ddi): expand category sentences, add keywords/advice, subdivide 8 categories"
```

---

## Task 2: 영구 회귀 테스트 신규 생성 (`tests/ddi-data.test.js`)

**Files:**
- Create: `tests/ddi-data.test.js`

**Interfaces:**
- Consumes: Task 1이 만든 `DDI_DATA`의 새 구조(`keywords`, `advice`, 세분화된 `categories`)
- Produces: 없음(테스트 파일)

- [ ] **Step 1: 기본 구조 검증 + keywords/advice/세분화 카테고리 검증 테스트 작성**

```javascript
const assert = require('assert');
const { DDI_DATA } = require('../data/ddi-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat'];

assert.strictEqual(DDI_DATA.length, 12, '띠는 12개여야 함');
assert.deepStrictEqual(DDI_DATA.map(d => d.key), EXPECTED_KEYS, '기존 배열 순서와 key가 일치해야 함');

DDI_DATA.forEach(function (entry) {
  assert.ok(entry.trait && entry.trait.length > 0, entry.key + ' trait 누락');
  CATEGORY_KEYS.forEach(function (cat) {
    assert.ok(entry.categories[cat], entry.key + '.' + cat + ' 누락');
  });
});

// ---------------------------------------------------------------------------
// keywords/advice 부가정보와 세분화 카테고리 구조 검증
// ---------------------------------------------------------------------------

const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

DDI_DATA.forEach(function (ddi) {
  assert.ok(Array.isArray(ddi.keywords) && ddi.keywords.length === 3,
    ddi.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof ddi.advice === 'string' && ddi.advice.length > 0,
    ddi.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = ddi.categories[cat];
    assert.ok(entry && typeof entry === 'object', ddi.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, ddi.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, ddi.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], ddi.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof ddi.categories[cat] === 'string' && ddi.categories[cat].length > 0,
      ddi.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 12 ddi signs have valid keywords/advice/subdivided-category structure');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/ddi-data.test.js`
Expected: `All 12 ddi signs have valid keywords/advice/subdivided-category structure`를 포함해 통과.

- [ ] **Step 3: 문장수 검증 테스트 추가**

같은 파일 끝에 이어서 추가:

```javascript
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
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

DDI_DATA.forEach(function (ddi) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = ddi.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        ddi.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = ddi.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      ddi.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All ddi signs have 2-3 sentence category fields');
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `node tests/ddi-data.test.js`
Expected: `All ddi signs have 2-3 sentence category fields` 포함해 통과.

- [ ] **Step 5: 3단 결합 금지쌍 스윕 테스트 추가**

같은 파일 끝에 이어서 추가:

```javascript
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = ddi.categories[catA][subA];
        const textB = ddi.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
            }
          });
        });
      });
    });
  });
});

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' forbidden-pair sentence-level collisions:\n' + collisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

const openingCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(ddi.categories[catA][subA])[0];
        const openingB = splitSentences(ddi.categories[catB][subB])[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          openingCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (word=' + wj.toFixed(2) + ', trigram=' + tj.toFixed(2) + ')\n  ' + openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(openingCollisions.length, 0,
  'Found ' + openingCollisions.length + ' forbidden-pair opening-sentence skeleton collisions ' +
  '(word-Jaccard >= ' + OPENING_WORD_JACCARD_THRESHOLD + ' AND trigram-Jaccard >= ' + OPENING_TRIGRAM_JACCARD_THRESHOLD + '):\n' +
  openingCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence skeleton collisions (word+trigram combined check)');

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다'];
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

const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
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

const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

const bigramLcsCollisions = [];
DDI_DATA.forEach(function (ddi) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(ddi.categories[catA][subA])[0];
        const openingB = splitSentences(ddi.categories[catB][subB])[0];

        const kwStrippedA = stripOwnKeywords(openingA, ddi.keywords);
        const kwStrippedB = stripOwnKeywords(openingB, ddi.keywords);
        const trimmedA = stripBoilerplateSuffix(kwStrippedA);
        const trimmedB = stripBoilerplateSuffix(kwStrippedB);
        const lcs = longestCommonSubstring(trimmedA, trimmedB);

        const stemsA = significantStems(openingA, ddi.keywords);
        const stemsB = significantStems(openingB, ddi.keywords);
        const sharedStems = [...new Set(stemsA.filter(function (s) { return stemsB.indexOf(s) !== -1; }))];

        const bj = bigramJaccard(kwStrippedA, kwStrippedB);

        if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
          bigramLcsCollisions.push(ddi.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (lcs=' + lcs + ', sharedStems=[' + sharedStems.join(',') + '], bigramJaccard=' + bj.toFixed(3) + ')\n  ' +
            openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(bigramLcsCollisions.length, 0,
  'Found ' + bigramLcsCollisions.length + ' forbidden-pair opening-sentence collisions via bigram/LCS/stem-overlap sweep:\n' +
  bigramLcsCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence collisions (bigram/LCS/stem-overlap sweep)');

console.log('All ddi-data tests passed');
```

- [ ] **Step 6: 전체 실행 및 커밋**

Run: `node tests/ddi-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 충돌 발견 시 Task 1로 돌아가 해당 필드를 수정한 뒤 이 테스트를 다시 실행한다 — 테스트 파일 자체를 수정해서 우회하지 않는다.

```bash
git add tests/ddi-data.test.js
git commit -m "test(ddi): add permanent structure, sentence-count, and 3-tier dedup regression tests"
```

---

## Task 3: `js/app.js` 공통 헬퍼 추출 (타로·사주·별자리 리팩토링, 동작 불변)

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: 없음(기존 `CATEGORY_SUBCHOICES`, `PERIOD_PREFIXES`, `selectedSubChoice`를 그대로 사용)
- Produces: 새 헬퍼 함수 3개 — `resolveSubchoiceValue(category, value, selectedSubChoice)`(세분화 객체면 서브키 값을, 아니면 값 그대로 반환), `resolveCategoryMeaning(entity, category, period, selectedSubChoice)`(카테고리 선택+`entity.categories[category]` 존재 시 접두사 붙인 문자열을, 아니면 `entity.trait`를 반환), `renderKeywordsAdviceHtml(keywordsList, adviceText)`(둘 다 있으면 HTML 박스 문자열을, 아니면 빈 문자열을 반환). Task 4가 이 3개 함수를 이름 그대로 사용한다.

**이 태스크는 순수 리팩토링이다 — 아래 각 교체는 로직을 한 글자도 바꾸지 않고 헬퍼 호출로 옮기는 것뿐이다. 리딩 결과 텍스트/HTML은 리팩토링 전후로 완전히 동일해야 한다.**

- [ ] **Step 1: 3개 헬퍼 함수 신설**

`js/app.js`에서 `renderSubChoices()` 함수 정의(현재 258~278행 부근) 바로 다음에 추가:

```javascript
  function resolveSubchoiceValue(category, value, selectedSubChoice) {
    return (CATEGORY_SUBCHOICES[category] && typeof value === 'object')
      ? value[selectedSubChoice]
      : value;
  }

  function resolveCategoryMeaning(entity, category, period, selectedSubChoice) {
    if (category && entity.categories[category]) {
      const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
      return PERIOD_PREFIXES[period] + ' ' + readingText;
    }
    return entity.trait;
  }

  function renderKeywordsAdviceHtml(keywordsList, adviceText) {
    return (keywordsList && adviceText)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
      : '';
  }
```

- [ ] **Step 2: `showZodiacSummary()`를 헬퍼 사용으로 교체**

현재 코드:

```javascript
  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    let meaning;
    if (category && zodiac.categories[category]) {
      const categoryValue = zodiac.categories[category];
      const readingText = (CATEGORY_SUBCHOICES[category] && typeof categoryValue === 'object')
        ? categoryValue[selectedSubChoice]
        : categoryValue;
      meaning = PERIOD_PREFIXES[period] + ' ' + readingText;
    } else {
      meaning = zodiac.trait;
    }

    const keywordsList = zodiac.keywords;
    const adviceText = zodiac.advice;
    const extraHtml = (keywordsList && adviceText)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
      : '';

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

다음으로 교체:

```javascript
  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(zodiac, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(zodiac.keywords, zodiac.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

- [ ] **Step 3: `showSajuSummary()`의 카테고리/키워드 블록을 헬퍼 사용으로 교체**

현재 코드(함수 뒷부분, `const balance = classifyElementBalance(counts);`부터 `extraHtml` 선언까지):

```javascript
    const balance = classifyElementBalance(counts);
    const balanceText = getElementBalanceText(balance);
    let categoryMeaning;
    if (category && ilgan.categories[category]) {
      const categoryValue = ilgan.categories[category];
      const readingText = (CATEGORY_SUBCHOICES[category] && typeof categoryValue === 'object')
        ? categoryValue[selectedSubChoice]
        : categoryValue;
      categoryMeaning = PERIOD_PREFIXES[period] + ' ' + readingText;
    } else {
      categoryMeaning = ilgan.trait;
    }
    const meaning = categoryMeaning + ' ' + balanceText;

    const keywordsList = ilgan.keywords;
    const adviceText = ilgan.advice;
    const extraHtml = (keywordsList && adviceText)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
      : '';
```

다음으로 교체:

```javascript
    const balance = classifyElementBalance(counts);
    const balanceText = getElementBalanceText(balance);
    const meaning = resolveCategoryMeaning(ilgan, category, period, selectedSubChoice) + ' ' + balanceText;

    const extraHtml = renderKeywordsAdviceHtml(ilgan.keywords, ilgan.advice);
```

함수의 나머지 부분(`summaryEl.innerHTML = ...` 이후)은 변경하지 않는다.

- [ ] **Step 4: 타로 `showSummary()`의 카드별 해석 블록을 헬퍼 사용으로 교체**

현재 코드(`const details = draw.map(function (item) {`부터 그 콜백 끝까지):

```javascript
    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      let baseMeaning;
      if (categoryReading) {
        const orientationValue = categoryReading[item.orientation];
        baseMeaning = (CATEGORY_SUBCHOICES[category] && typeof orientationValue === 'object')
          ? orientationValue[selectedSubChoice]
          : orientationValue;
      } else {
        baseMeaning = item.orientation === 'upright' ? item.card.upright : item.card.reversed;
      }
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;

      const keywordsList = item.card.keywords && item.card.keywords[item.orientation];
      const adviceText = item.card.advice && item.card.advice[item.orientation];
      const extraHtml = (keywordsList && adviceText)
        ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
        : '';

      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        '<p>' + meaning + '</p>' +
        extraHtml +
        '</div>';
    });
```

다음으로 교체:

```javascript
    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
        : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;

      const keywordsList = item.card.keywords && item.card.keywords[item.orientation];
      const adviceText = item.card.advice && item.card.advice[item.orientation];
      const extraHtml = renderKeywordsAdviceHtml(keywordsList, adviceText);

      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        '<p>' + meaning + '</p>' +
        extraHtml +
        '</div>';
    });
```

- [ ] **Step 5: 문법 검증**

Run: `node --check js/app.js`
Expected: 에러 없이 종료.

- [ ] **Step 6: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js`
Expected: 전부 통과(이 리팩토링은 데이터 파일을 건드리지 않으므로 모든 테스트가 리팩토링 전과 동일하게 통과해야 한다).

- [ ] **Step 7: 커밋**

```bash
git add js/app.js
git commit -m "refactor(app): extract shared category-resolution and keyword/advice-render helpers"
```

---

## Task 4: 띠운세를 새 헬퍼로 연결 + 하위 선택 활성화

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1이 만든 `DDI_DATA`의 `keywords`/`advice`/세분화된 `categories`, Task 3이 만든 `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()`
- Produces: 없음(UI 로직) — `showDdiSummary()`, `saveDdiReading()` 함수 시그니처는 변경하지 않는다(둘 다 인자 없이 호출됨, 기존과 동일).

- [ ] **Step 1: `SUBCHOICE_ENABLED_MODES`에 `'ddi'` 추가**

`js/app.js`의 다음 줄(35행 부근):

```javascript
  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju', 'zodiac']);
```

를 다음으로 교체:

```javascript
  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju', 'zodiac', 'ddi']);
```

(모드 전환 핸들러와 `renderSubChoices()`는 이미 이 집합을 참조하도록 일반화되어 있으므로 이 한 줄 외에 추가 변경이 필요 없다.)

- [ ] **Step 2: `showDdiSummary()`를 새 헬퍼 사용으로 교체**

현재 코드:

```javascript
  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = category && ddi.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + ddi.categories[category]
      : ddi.trait;

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

다음으로 교체:

```javascript
  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = resolveCategoryMeaning(ddi, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(ddi.keywords, ddi.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>' +
      extraHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

- [ ] **Step 3: `saveDdiReading()`에 `subChoice` 필드 추가**

현재 코드:

```javascript
  function saveDdiReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'ddi',
      birthYear: selectedBirthYear,
      category: selectedCategory,
      period: selectedPeriod,
      cards: []
    };
    saveReading(storage, entry);
  }
```

다음으로 교체(`period`와 `cards` 사이에 `subChoice` 추가, 타로·사주·별자리와 동일한 필드 순서):

```javascript
  function saveDdiReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'ddi',
      birthYear: selectedBirthYear,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      cards: []
    };
    saveReading(storage, entry);
  }
```

- [ ] **Step 4: 문법 검증**

Run: `node --check js/app.js`
Expected: 에러 없이 종료.

- [ ] **Step 5: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js && node tests/ddi-data.test.js`
Expected: 전부 통과.

- [ ] **Step 6: 커밋**

```bash
git add js/app.js
git commit -m "feat(ddi): wire subchoice selection and keyword/advice rendering into ddi flow"
```

---

## Task 5: 브라우저 확인 + 전체 회귀 (4개 모드 전부)

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~4의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js && node tests/ddi-data.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 4개 모드 확인**

1. **띠운세(신규)**: 띠운세 모드로 전환 → 출생연도 입력 → "연애운" 선택 → "솔로"/"커플" 하위 버튼이 나타나는지 확인
2. "명예운" 선택 → 하위 버튼이 사라지는지 확인 (단일 유지 카테고리)
3. "오늘의운"(카테고리 미선택) → 하위 버튼이 보이지 않는지 확인
4. "연애운" + "커플" 선택 후 리딩 실행 → 결과 화면에 2~3문장 해설 + "키워드: OO · OO · OO" + "조언: ..." 박스가 함께 보이는지 확인
5. **회귀 — 타로**: 타로 모드로 전환해 카드 뽑기 → 정/역방향 해설 + 키워드/조언 박스가 리팩토링 전과 동일하게 나오는지 확인(카테고리 선택 포함, 세분화 카테고리 하나 골라서)
6. **회귀 — 사주**: 사주 모드로 전환해 생년월일 입력 → 리딩 실행 → 명식표 + 오행 균형 문장 + 카테고리 해설 + 키워드/조언 박스가 리팩토링 전과 동일하게 나오는지 확인
7. **회귀 — 별자리**: 별자리 모드로 전환해 리딩 실행 → 해설 + 키워드/조언 박스가 리팩토링 전과 동일하게 나오는지 확인
8. 띠운세 → 궁합 모드 전환 → 하위 버튼이 보이지 않는지 확인 (아직 허용목록에 없는 모드)
9. "지난 기록" 열어서 방금 띠운세 리딩이 정상적으로 표시되는지 확인
10. 콘솔에 에러가 없는지 확인

Expected: 위 10가지 모두 기대한 대로 동작, 콘솔 에러 없음. 특히 5~7번(회귀)에서 리팩토링으로 인한 텍스트/HTML 차이가 전혀 없어야 한다.

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(ddi): ...` 또는 `fix(app): ...` 커밋 추가).
