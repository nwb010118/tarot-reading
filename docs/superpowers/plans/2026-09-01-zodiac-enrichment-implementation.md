# 별자리 리딩 풍부화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 별자리 카테고리 해설을 1문장→2~3문장으로 확장하고, 별자리당 키워드/조언 부가정보를 추가하고, 8개 카테고리에 하위 세분화(예: 연애운→솔로/커플)를 도입한다. 타로·사주 서브프로젝트(`docs/superpowers/plans/2026-08-24-tarot-enrichment-implementation.md`, `docs/superpowers/plans/2026-09-01-saju-enrichment-implementation.md`)와 동일한 풍부함 패턴을 별자리 데이터 구조(12개 별자리, 방향성 없음)에 맞게 적용한다.

**Architecture:** `data/zodiac-data.js`의 `ZODIAC_DATA` 12개 항목 각각에 `keywords`(3개 배열), `advice`(1문장)를 추가하고, 8개 카테고리를 세분화 객체로 변경한다. 사주와 동일하게 방향성이 없으므로 2단 중첩 구조이고, 파일 분리는 하지 않는다. `js/app.js`는 `SUBCHOICE_ENABLED_MODES`가 이미 `CATEGORY_SUBCHOICES`/`renderSubChoices()`/모드 전환 핸들러에서 일반화되어 있으므로, 이번 작업은 그 집합에 `'zodiac'`을 추가하고 `showZodiacSummary()`/`saveZodiacReading()`만 손보면 된다(사주 때 필요했던 핸들러 일반화 작업은 이미 끝나 있음).

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 기존 프로젝트와 동일. Node `assert` 기반 테스트.

## Global Constraints

- 별자리의 `trait`(2문장 소개 텍스트)는 절대 변경하지 않는다 — 이미 충분히 풍부하다는 기존 설계 전제.
- 세분화 카테고리는 정확히 이 8개와 하위 키다(타로·사주와 완전히 동일): `love`(solo/couple), `money`(consumption/invest), `career`(jobseek/switch), `business`(startup/running), `study`(exam/path), `health`(body/mind), `relationships`(new/existing), `workplace`(team/personal).
- 단일 유지 카테고리는 정확히 이 3개다: `honor`, `moving`, `children` — 세분화 없이 문자열 형태를 유지하되 문장만 2~3문장으로 확장.
- 카테고리 해설 문장은 2~3문장, 별자리당 조언(`advice`)은 1문장, 키워드(`keywords`)는 정확히 3개 배열이다. 방향성이 없으므로 별자리마다 하나씩만 존재한다(타로처럼 upright/reversed로 나누지 않는다).
- 기존 `data/zodiac-data.js`는 문자열에 큰따옴표(`"..."`)를 사용한다 — 이 파일의 기존 스타일을 그대로 따른다(사주 파일의 작은따옴표 스타일과는 다름).
- "양자리"(`key: "aries"`)는 이 작업에서 가장 먼저 정확한 목표 패턴으로 작성하는 참조 예시다 — Task 1 Step 1에서 작성한 이후에는 **절대 수정하지 않는다**. 이후 11개 별자리 작성의 기준이 된다.
- 같은 별자리 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 절대 오프닝 문장이나 문장 뼈대를 공유하면 안 된다. 각 쌍마다 4개 서브키 조합(예: love.solo×relationships.new, love.solo×relationships.existing, love.couple×relationships.new, love.couple×relationships.existing) 전부를 확인해야 한다.
- 같은 필드 안에서 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하는 "재진술 패딩"은 금지 — 반드시 조언, 구체적 뉘앙스, 다음 행동 등 새로운 내용을 담아야 한다.
- **중복검사는 사주 프로젝트에서 확정한 최종 방식을 처음부터 사용한다 — 필드 전체 단위 도구는 만들지 않는다.** 구체적으로 두 가지 체크를 함께 쓴다: (1) 모든 문장 쌍에 대한 word-Jaccard ≥ 0.3 스윕(광범위), (2) 각 필드의 **오프닝 문장(첫 문장)**끼리만 비교하는 word-Jaccard ≥ 0.20 AND 문자 트라이그램 Jaccard ≥ 0.15 결합 스윕(한국어 교착어 특성상 조사/어미가 달라 단어 단위로는 안 걸리는 뼈대 공유를 잡기 위함). 두 체크 모두 Task 1 Step 3의 스윕 스크립트와 Task 2의 회귀 테스트에 포함한다.
- 같은 별자리 안에서 특정 문형을 여러 필드에 mad-libs식으로 반복해서 쓰지 않는다.
- 하위 선택 UI 허용목록(`SUBCHOICE_ENABLED_MODES`)에 `'zodiac'`을 추가하는 것 외에 새 HTML 마크업은 만들지 않는다 — 기존 `#subchoice-select`를 재사용한다.

---

## Task 1: `data/zodiac-data.js` 콘텐츠 확장 (전체 12개 별자리)

**Files:**
- Modify: `data/zodiac-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `ZODIAC_DATA` 각 항목에 `keywords`(string[3]), `advice`(string) 추가, `categories`의 8개 필드를 세분화 객체로 변경. `getZodiacList()`/`getZodiacByKey()`는 시그니처 변경 없음 — Task 2(테스트)와 Task 3(JS 통합)이 이 새 구조를 직접 사용한다.

- [ ] **Step 1: "양자리" 항목에 아래 정확한 내용 적용 — 이후 11개 별자리 작성의 패턴 기준**

`data/zodiac-data.js`의 첫 번째 `ZODIAC_DATA` 항목(`key: "aries"`)을 다음으로 교체한다(`trait`는 절대 변경하지 않음):

```js
  {
    key: "aries", name_kr: "양자리", name_en: "Aries", dateRange: "3/21 ~ 4/19",
    trait: "열정적이고 리더십이 강한 양자리는 망설임 없이 도전하는 힘을 가졌습니다. 다만 성급함을 조심하면 더 큰 성과를 얻을 수 있어요.",
    keywords: ["열정", "리더십", "추진력"],
    advice: "성급함만 조심하면 원하는 결과를 빠르게 손에 넣을 수 있어요.",
    categories: {
      love: {
        solo: "먼저 다가가는 적극적인 매력이 상대의 마음을 사로잡는 시기입니다. 고백을 망설이기보다 감정을 솔직하게 드러내는 편이 유리합니다.",
        couple: "함께하는 시간에 활기를 불어넣는 열정이 관계를 뜨겁게 만드는 시기입니다. 그만큼 연인의 속도도 배려하는 여유를 가져보세요."
      },
      money: {
        consumption: "마음에 드는 것에는 망설임 없이 지갑을 여는 시기입니다. 즉흥적인 소비가 이어지지 않도록 미리 한도를 정해두는 것이 좋습니다.",
        invest: "좋은 기회다 싶으면 과감히 뛰어드는 결단력이 재정에 도움이 되는 시기입니다. 다만 뛰어들기 전에 최소한의 정보는 확인하고 움직이세요."
      },
      career: {
        jobseek: "새로운 도전을 두려워하지 않는 추진력으로 원하는 자리를 향해 나아가는 시기입니다. 면접에서 보여주는 당당한 태도가 강한 인상을 남길 수 있어요.",
        switch: "지금과 다른 길을 향한 결단이 빠르게 이루어지는 시기입니다. 감정에 휩쓸린 선택은 아닌지 잠시 되짚어보는 것이 좋습니다."
      },
      workplace: {
        team: "주도적으로 나서서 팀 분위기를 이끄는 리더십이 돋보이는 시기입니다. 팀원들의 의견에도 귀 기울이면 협업이 한결 매끄러워집니다.",
        personal: "맡은 업무를 거침없이 처리해나가는 추진력이 성과로 이어지는 시기입니다. 속도만큼 꼼꼼함도 함께 챙기면 완성도가 높아집니다."
      },
      business: {
        startup: "새로운 사업을 향한 열정이 첫걸음에 큰 추진력이 되는 시기입니다. 의욕만큼 꼼꼼한 준비도 함께 갖추면 실패 확률을 줄일 수 있어요.",
        running: "활발한 에너지로 사업에 새로운 활력을 불어넣는 시기입니다. 성급한 확장보다 지금의 기반을 다지는 데 집중하는 편이 안전합니다."
      },
      study: {
        exam: "목표를 정하면 빠르게 몰입해 단기간에 성과를 내는 시기입니다. 벼락치기에 의존하기보다 꾸준한 페이스를 유지하면 더 좋습니다.",
        path: "새로운 진로에 거침없이 도전하려는 의욕이 넘치는 시기입니다. 성급하게 결정하기 전에 여러 선택지를 비교해보는 것이 좋습니다."
      },
      health: {
        body: "활동적인 에너지가 넘치는 시기이니 몸을 움직이는 활동이 잘 맞습니다. 다만 무리한 운동으로 몸에 부담을 주지 않도록 조심하세요.",
        mind: "넘치는 의욕이 때로 조급함으로 이어질 수 있는 시기입니다. 잠시 숨을 고르는 여유가 마음의 균형을 지켜줍니다."
      },
      relationships: {
        new: "거침없이 다가가는 당당함이 새로운 사람들과의 만남에서 빛을 발하는 시기입니다. 낯선 자리에서도 먼저 말을 거는 용기가 좋은 인연을 만들어줍니다.",
        existing: "주도적인 태도로 모임이나 인맥 안에서 존재감을 드러내는 시기입니다. 목소리를 낮추고 상대 이야기에 귀 기울이는 순간도 필요합니다."
      },
      honor: "당당한 행보 하나하나가 주변의 시선을 끌며 좋은 평판으로 이어지는 시기입니다. 지나친 자기주장은 오히려 인정을 늦출 수 있으니 균형을 잡아보세요.",
      moving: "새로운 곳을 향한 이동을 거침없이 결정하고 실행에 옮기는 시기입니다. 성급하게 서두르다 중요한 조건을 놓치지 않도록 한 번 더 확인해보세요.",
      children: "아이와 몸을 부대끼며 활동적으로 시간을 보내는 것이 잘 맞는 시기입니다. 넘치는 에너지를 아이의 속도에 맞춰 조절하면 더욱 즐거운 시간이 됩니다."
    }
  },
```

- [ ] **Step 2: 나머지 11개 별자리(황소자리, 쌍둥이자리, 게자리, 사자자리, 처녀자리, 천칭자리, 전갈자리, 사수자리, 염소자리, 물병자리, 물고기자리)에 같은 패턴 적용**

각 별자리에 대해:
1. `trait`는 절대 변경하지 않는다.
2. `keywords`(3개)와 `advice`(1문장)를 그 별자리의 `trait`와 기존 1문장 카테고리 텍스트들이 담고 있는 성격/기운을 반영해 작성한다.
3. 8개 세분화 카테고리는 각 서브키가 실질적으로 다른 시나리오를 다루도록 2문장(또는 자연스러우면 3문장)으로 작성한다. 첫 문장은 상황 묘사, 두 번째(세 번째) 문장은 그 서브키에 실제로 맞는 구체적 조언·뉘앙스·다음 행동을 담는다 — 재진술 금지.
4. 3개 단일 카테고리(honor, moving, children)도 2~3문장으로 확장한다.
5. **한 별자리를 다 쓸 때마다** 그 별자리 안에서 `love`↔`relationships`(4개 서브키 조합), `career`↔`workplace`(4개 조합), `money`↔`business`(4개 조합)가 오프닝 문장이나 뼈대를 공유하지 않는지 직접 대조한다. 다음 별자리로 넘어가기 전에 이 자가 점검을 마친다.
6. 같은 별자리 안에서 특정 문형("~하지 않도록 주의하세요" 등)을 여러 필드에 mad-libs식으로 반복해서 쓰지 않는다.
7. 문자열은 기존 파일 스타일대로 큰따옴표(`"..."`)를 사용한다.

- [ ] **Step 3: 문장 단위 중복 스윕 스크립트 작성 및 실행**

`data/zodiac-data.js`가 있는 프로젝트 루트에서 다음 스크립트를 임시 파일(예: `scratch-dedup-check.js`, 작업 완료 후 삭제)로 저장하고 `node scratch-dedup-check.js`로 실행해 양자리를 제외한 11개 별자리 전체에서 금지쌍 충돌이 있는지 확인한다. 사주 프로젝트 최종 리뷰에서 확정한 두 가지 체크(광범위 문장 단위 word-Jaccard + 오프닝 문장 전용 word+trigram 결합)를 처음부터 함께 사용한다:

```javascript
const { ZODIAC_DATA } = require('./data/zodiac-data.js');

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

const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

let found = 0;
ZODIAC_DATA.forEach(zodiac => {
  if (zodiac.key === 'aries') return; // 잠긴 참조 예시는 이미 검증됨, 재작성하지 않음
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => {
      subsB.forEach(subB => {
        const textA = zodiac.categories[catA][subA];
        const textB = zodiac.categories[catB][subB];

        // 체크 1: 모든 문장 쌍, word-Jaccard >= 0.3
        splitSentences(textA).forEach(sentA => {
          splitSentences(textB).forEach(sentB => {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              found++;
              console.log(`[문장 word=${(sim * 100).toFixed(0)}%] ${zodiac.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
              console.log('  A:', sentA);
              console.log('  B:', sentB);
            }
          });
        });

        // 체크 2: 오프닝 문장끼리만, word AND trigram 결합
        const openingA = splitSentences(textA)[0];
        const openingB = splitSentences(textB)[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          found++;
          console.log(`[오프닝 word=${wj.toFixed(2)}, trigram=${tj.toFixed(2)}] ${zodiac.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
          console.log('  A:', openingA);
          console.log('  B:', openingB);
        }
      });
    });
  });
});
console.log(`Found ${found} collisions`);
```

`Found 0 collisions`가 나올 때까지 충돌이 발견된 필드를 수정하고 재실행한다. 수정할 때는 두 필드 중 하나만 다시 쓰되, 그 결과가 같은 별자리의 다른 필드와 새로 겹치지 않는지 재확인한다. 통과 후 `scratch-dedup-check.js`는 삭제한다(커밋하지 않음).

- [ ] **Step 4: 구조 확인**

12개 별자리 전체를 Read 도구로 다시 읽어 다음을 육안으로 확인한다: 모든 별자리에 `keywords`(3개), `advice`(1문장)가 있는지, 8개 세분화 카테고리가 두 서브키 모두 존재하고 서로 다른지, 3개 단일 카테고리가 존재하는지, `trait`가 원본과 동일한지(양자리는 Step 1의 원문과, 나머지는 파일 상단의 기존 원문과 정확히 일치해야 함 — 이번 작업에서 변경하지 않았으므로).

- [ ] **Step 5: 커밋**

```bash
git add data/zodiac-data.js
git commit -m "content(zodiac): expand category sentences, add keywords/advice, subdivide 8 categories"
```

---

## Task 2: 영구 회귀 테스트 신규 생성 (`tests/zodiac-data.test.js`)

**Files:**
- Create: `tests/zodiac-data.test.js`

**Interfaces:**
- Consumes: Task 1이 만든 `ZODIAC_DATA`의 새 구조(`keywords`, `advice`, 세분화된 `categories`)
- Produces: 없음(테스트 파일)

- [ ] **Step 1: 기본 구조 검증 + keywords/advice/세분화 카테고리 검증 테스트 작성**

```javascript
const assert = require('assert');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

assert.strictEqual(ZODIAC_DATA.length, 12, '별자리는 12개여야 함');
assert.deepStrictEqual(ZODIAC_DATA.map(d => d.key), EXPECTED_KEYS, '양자리~물고기자리 순서와 key가 일치해야 함');

ZODIAC_DATA.forEach(function (entry) {
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

ZODIAC_DATA.forEach(function (zodiac) {
  assert.ok(Array.isArray(zodiac.keywords) && zodiac.keywords.length === 3,
    zodiac.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof zodiac.advice === 'string' && zodiac.advice.length > 0,
    zodiac.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = zodiac.categories[cat];
    assert.ok(entry && typeof entry === 'object', zodiac.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, zodiac.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, zodiac.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], zodiac.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof zodiac.categories[cat] === 'string' && zodiac.categories[cat].length > 0,
      zodiac.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 12 zodiac signs have valid keywords/advice/subdivided-category structure');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/zodiac-data.test.js`
Expected: `All 12 zodiac signs have valid keywords/advice/subdivided-category structure`를 포함해 통과. Task 1이 제대로 됐다면 이 시점에 이미 통과해야 한다(이 테스트는 새 기능이 아니라 Task 1 결과의 회귀 가드).

- [ ] **Step 3: 문장수 검증 테스트 추가**

같은 파일 끝에 이어서 추가:

```javascript
// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트 (타로·사주 프로젝트의 교훈: 필드 전체 단위 비교는
// "공유된 문장1 + 다른 문장2" 충돌을 놓친다. 별자리는 처음부터 문장 단위로 검증한다.
// ---------------------------------------------------------------------------

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

// 한국어는 교착어라 조사/어미가 붙으면 공백 토큰 단위 비교(wordJaccard)가
// 같은 문장 뼈대를 놓친다. 이를 보완하기 위해 3글자 슬라이딩 윈도우
// (character trigram) 기반 유사도를 추가한다.
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

// 모든 카테고리 필드는 정확히 2~3문장이어야 한다 (양자리 포함 — Task 1에서
// 양자리도 2문장으로 작성했으므로 양자리를 이 검증에서 제외할 이유가 없다).
ZODIAC_DATA.forEach(function (zodiac) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = zodiac.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        zodiac.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = zodiac.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      zodiac.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All zodiac signs have 2-3 sentence category fields');
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `node tests/zodiac-data.test.js`
Expected: `All zodiac signs have 2-3 sentence category fields` 포함해 통과.

- [ ] **Step 5: 금지쌍 문장 단위 스윕 테스트 추가 (광범위 word-Jaccard + 오프닝 문장 word+trigram 결합)**

같은 파일 끝에 이어서 추가:

```javascript
// 같은 별자리 내에서 love/relationships, career/workplace, money/business가
// 4개 서브키 조합 어디에서도 문장 뼈대를 공유하면 안 된다.
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
ZODIAC_DATA.forEach(function (zodiac) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = zodiac.categories[catA][subA];
        const textB = zodiac.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(zodiac.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
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

// 오프닝 문장(각 필드의 첫 문장) 전용 보조 스윕: 한국어 교착어 특성상 조사/어미가
// 달라 word-Jaccard로는 안 걸리는 뼈대 공유를 잡기 위해, word-Jaccard와
// character-trigram Jaccard를 "동시에" 만족하는 경우만 충돌로 본다(AND 결합).
// 사주 프로젝트 최종 리뷰에서 이 조합(0.20 AND 0.15)이 잠긴 참조 예시를 오탐하지
// 않으면서 실제 충돌만 잡아낸다는 것을 확인했다.
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

const openingCollisions = [];
ZODIAC_DATA.forEach(function (zodiac) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(zodiac.categories[catA][subA])[0];
        const openingB = splitSentences(zodiac.categories[catB][subB])[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          openingCollisions.push(zodiac.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
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

console.log('All zodiac-data tests passed');
```

- [ ] **Step 6: 전체 실행 및 커밋**

Run: `node tests/zodiac-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 만약 충돌이 발견되면 Task 1로 돌아가 해당 필드를 수정한 뒤 이 테스트를 다시 실행한다 — 이 테스트 파일 자체를 수정해서 우회하지 않는다.

```bash
git add tests/zodiac-data.test.js
git commit -m "test(zodiac): add permanent structure, sentence-count, and dedup regression tests"
```

---

## Task 3: `js/app.js` 통합 — 하위 선택 활성화 + 키워드/조언 렌더링

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1이 만든 `ZODIAC_DATA`의 `keywords`/`advice`/세분화된 `categories`
- Produces: 없음(UI 로직) — 기존 `CATEGORY_SUBCHOICES`, `renderSubChoices()`, `showZodiacSummary()`, `saveZodiacReading()` 함수 시그니처는 변경하지 않는다.

- [ ] **Step 1: `SUBCHOICE_ENABLED_MODES`에 `'zodiac'` 추가**

`js/app.js` 35번째 줄 부근의 다음 줄:

```javascript
  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju']);
```

를 다음으로 교체:

```javascript
  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju', 'zodiac']);
```

(모드 전환 핸들러와 `renderSubChoices()`는 이미 이 집합을 참조하도록 일반화되어 있으므로 — 사주 서브프로젝트에서 끝낸 작업 — 이 한 줄 외에 추가 변경이 필요 없다.)

- [ ] **Step 2: `showZodiacSummary()`의 카테고리 텍스트 조회에 세분화 분기 추가 + 키워드/조언 박스 렌더링**

`js/app.js`의 다음 함수 전체(현재 389~403번째 줄 부근):

```javascript
  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = category && zodiac.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + zodiac.categories[category]
      : zodiac.trait;

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

를 다음으로 교체:

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

- [ ] **Step 3: `saveZodiacReading()`에 `subChoice` 필드 추가**

`js/app.js`의 다음 함수(현재 405~416번째 줄 부근):

```javascript
  function saveZodiacReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'zodiac',
      zodiac: selectedZodiac,
      category: selectedCategory,
      period: selectedPeriod,
      cards: []
    };
    saveReading(storage, entry);
  }
```

를 다음으로 교체(`category`와 `period` 사이 관례를 따르되 `period` 다음에 `subChoice` 추가, 타로·사주의 필드 순서와 동일):

```javascript
  function saveZodiacReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'zodiac',
      zodiac: selectedZodiac,
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

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js`
Expected: 전부 통과(타로·사주 관련 테스트가 이 변경으로 깨지지 않아야 함 — `SUBCHOICE_ENABLED_MODES`에 기존 `'tarot'`, `'saju'`도 그대로 포함되어 있으므로 기존 동작은 유지되어야 한다).

- [ ] **Step 6: 커밋**

```bash
git add js/app.js
git commit -m "feat(zodiac): wire subchoice selection and keyword/advice rendering into zodiac flow"
```

---

## Task 4: 브라우저 확인 + 전체 회귀

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~3의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js && node tests/zodiac-data.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. 별자리 모드로 전환 → 별자리 선택(예: 양자리) → "연애운" 카테고리 선택 → "솔로"/"커플" 하위 버튼이 나타나는지 확인
2. "명예운" 선택 → 하위 버튼이 사라지는지 확인 (단일 유지 카테고리)
3. "오늘의운"(카테고리 미선택) 상태 → 하위 버튼이 보이지 않는지 확인
4. "연애운" + "커플" 선택 후 리딩 실행 → 결과 화면에 2~3문장 해설 + "키워드: OO · OO · OO" + "조언: ..." 박스가 함께 보이는지 확인
5. 사주 모드로 전환 → 별자리에서 선택했던 하위 버튼이 남아있지 않고 정상적으로 초기화되는지 확인 (모드 전환 회귀 없음)
6. 타로 모드로 전환 후 다시 별자리 모드로 전환 → 하위 버튼이 정상적으로 다시 나타나는지 확인
7. 띠운세/궁합 모드로 전환 → 하위 버튼이 보이지 않는지 확인 (아직 허용목록에 없는 모드)
8. "지난 기록" 열어서 방금 별자리 리딩이 정상적으로 표시되는지 확인(기존 형식 그대로)
9. 콘솔에 에러가 없는지 확인

Expected: 위 9가지 모두 기대한 대로 동작, 콘솔 에러 없음

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(zodiac): ...` 커밋 추가).
