# 사주 리딩 풍부화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주 카테고리 해설을 1문장→2~3문장으로 확장하고, 일간당 키워드/조언 부가정보를 추가하고, 8개 카테고리에 하위 세분화(예: 연애운→솔로/커플)를 도입한다. 타로 서브프로젝트(`docs/superpowers/plans/2026-08-24-tarot-enrichment-implementation.md`)와 동일한 풍부함 패턴을 사주 데이터 구조(10개 일간, 방향성 없음)에 맞게 적용한다.

**Architecture:** `data/saju-data.js`의 `ILGAN_DATA` 10개 항목 각각에 `keywords`(3개 배열), `advice`(1문장)를 추가하고, 8개 카테고리를 세분화 객체로 변경한다. 방향성이 없으므로 타로보다 한 단계 얕은 중첩 구조이고 전체 필드 수도 적어 파일 분리는 하지 않는다. `js/app.js`의 기존 `CATEGORY_SUBCHOICES`/`renderSubChoices()`를 재사용하되, 하위 선택 UI를 타로 전용에서 타로+사주로 일반화한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 기존 프로젝트와 동일. Node `assert` 기반 테스트.

## Global Constraints

- 일간의 `trait`(2문장 소개 텍스트)는 절대 변경하지 않는다 — 이미 충분히 풍부하다는 기존 설계 전제.
- 세분화 카테고리는 정확히 이 8개와 하위 키다(타로와 완전히 동일): `love`(solo/couple), `money`(consumption/invest), `career`(jobseek/switch), `business`(startup/running), `study`(exam/path), `health`(body/mind), `relationships`(new/existing), `workplace`(team/personal).
- 단일 유지 카테고리는 정확히 이 3개다: `honor`, `moving`, `children` — 세분화 없이 문자열 형태를 유지하되 문장만 2~3문장으로 확장.
- 카테고리 해설 문장은 2~3문장, 일간당 조언(`advice`)은 1문장, 키워드(`keywords`)는 정확히 3개 배열이다. `keywords`/`advice`는 방향성이 없으므로 일간마다 하나씩만 존재한다(타로처럼 upright/reversed로 나누지 않는다).
- "갑목"(`key: 'gap'`)은 이 작업에서 가장 먼저 정확한 목표 패턴으로 작성하는 참조 예시다 — Task 1 Step 1에서 작성한 이후에는 **절대 수정하지 않는다**. 이후 9개 일간 작성의 기준이 된다.
- 같은 일간 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 절대 오프닝 문장이나 문장 뼈대를 공유하면 안 된다. 각 쌍마다 4개 서브키 조합(예: love.solo×relationships.new, love.solo×relationships.existing, love.couple×relationships.new, love.couple×relationships.existing) 전부를 확인해야 한다 — 하나만 확인하고 나머지를 놓치는 것이 타로 프로젝트에서 가장 자주 반복된 실수였다.
- 같은 필드 안에서 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하는 "재진술 패딩"은 금지 — 반드시 조언, 구체적 뉘앙스, 다음 행동 등 새로운 내용을 담아야 한다.
- **중복검사는 문장 단위(sentence-level)로만 한다 — 필드 전체 단위 도구는 만들지 않는다.** 타로 프로젝트는 필드 전체를 비교하는 도구가 "공유된 문장1 + 다른 문장2"를 놓쳐서 최종 리뷰에서야 발견된 전례가 있다. Task 1 Step 3의 스윕 스크립트와 Task 2의 회귀 테스트 모두 문장 단위 word-Jaccard로 비교한다.
- 이 하위 선택 UI 패턴은 이번 작업에서 타로+사주 두 모드에 적용한다(별자리/띠운세/궁합은 각각의 서브프로젝트에서 필요해지면 허용목록에 추가). 새 HTML 마크업은 만들지 않는다 — 기존 `#subchoice-select`를 재사용한다.

---

## Task 1: `data/saju-data.js` 콘텐츠 확장 (전체 10개 일간)

**Files:**
- Modify: `data/saju-data.js`

**Interfaces:**
- Consumes: 없음
- Produces: `ILGAN_DATA` 각 항목에 `keywords`(string[3]), `advice`(string) 추가, `categories`의 8개 필드를 세분화 객체로 변경. `getIlganByIndex()`/`getElementBalanceText()`/`ELEMENT_BALANCE_TEXT`는 시그니처 변경 없음 — Task 2(테스트)와 Task 3(JS 통합)이 이 새 구조를 직접 사용한다.

- [ ] **Step 1: "갑목" 항목에 아래 정확한 내용 적용 — 이후 9개 일간 작성의 패턴 기준**

`data/saju-data.js`의 첫 번째 `ILGAN_DATA` 항목(`key: 'gap'`)을 다음으로 교체한다(`trait`는 절대 변경하지 않음):

```js
  {
    key: 'gap', name_kr: '갑목', element: '목',
    trait: '큰 나무처럼 곧고 정직한 갑목은 타고난 리더십으로 주변을 이끕니다. 다만 융통성을 조금 더하면 관계가 한결 부드러워집니다.',
    keywords: ['곧은 신념', '타고난 리더십', '정직한 추진력'],
    advice: '확신이 설수록 주변의 다른 의견에도 한 번 더 귀 기울여보세요.',
    categories: {
      love: {
        solo: '직진하는 매력으로 상대의 마음을 단숨에 사로잡는 시기입니다. 돌려 말하지 않는 솔직한 고백이 오히려 좋은 인상을 남길 수 있어요.',
        couple: '곧은 마음으로 연인에게 흔들림 없는 믿음을 주는 시기입니다. 때로는 상대의 속도에 맞춰 한 박자 늦추는 여유가 관계를 더 단단하게 만들어줍니다.'
      },
      money: {
        consumption: '정직하고 계획적인 소비 습관이 재정에 안정을 더하는 시기입니다. 충동구매보다 원칙을 세워두고 지키는 편이 훨씬 잘 맞습니다.',
        invest: '확신이 선 곳에는 과감하게 움직이는 결단력이 좋은 결과로 이어지는 시기입니다. 결단을 내리기 전 충분한 정보부터 확인해두면 더 큰 확신으로 이어집니다.'
      },
      career: {
        jobseek: '곧은 신념으로 원하는 자리를 향해 흔들림 없이 나아가는 시기입니다. 면접에서도 솔직하고 명확한 태도가 오히려 좋은 인상을 남길 수 있어요.',
        switch: '지금의 방향에 확신이 서면 과감하게 결단을 내리는 시기입니다. 다만 감정에 휩쓸린 결정은 아닌지 한 번 더 점검해보는 것이 좋습니다.'
      },
      workplace: {
        team: '책임감 있는 태도로 팀 안에서 신뢰를 얻는 시기입니다. 자신의 방식을 밀어붙이기 전에 팀원들의 의견부터 들어보면 더 좋은 결과로 이어집니다.',
        personal: '맡은 일을 끝까지 밀고 나가는 뚝심으로 성과를 인정받는 시기입니다. 완벽을 추구하다 지치지 않도록 스스로 속도를 조절하는 지혜도 필요합니다.'
      },
      business: {
        startup: '확고한 원칙이 사업의 기반을 단단히 다지는 시기입니다. 혼자 모든 걸 결정하기보다 신뢰할 수 있는 조언자를 곁에 두면 훨씬 든든합니다.',
        running: '흔들림 없는 뚝심으로 사업을 안정적으로 이끌어가는 시기입니다. 다만 시장의 변화 앞에서는 조금 더 유연하게 대응해보세요.'
      },
      study: {
        exam: '목표를 세우면 흔들림 없이 밀고 나가는 집중력이 좋은 결과로 이어지는 시기입니다. 계획한 진도를 꾸준히 지켜나가는 것이 무엇보다 중요합니다.',
        path: '한번 정한 방향은 곧게 밀고 나가는 결단력이 빛을 발하는 시기입니다. 그만큼 다른 가능성도 가끔은 열어두면 더 좋은 선택으로 이어질 수 있어요.'
      },
      health: {
        body: '넘치는 활력으로 활기차게 지낼 수 있는 시기입니다. 몸이 보내는 신호를 놓치지 않아야 과로로 이어지지 않습니다.',
        mind: '확고한 마음가짐이 웬만한 스트레스에도 잘 버티게 해주는 시기입니다. 가끔은 고집을 내려놓고 마음을 풀어주는 시간도 필요합니다.'
      },
      relationships: {
        new: '솔직하고 곧은 태도로 새로운 인연에게 신뢰를 주는 시기입니다. 꾸미지 않은 모습 그대로 다가가는 것이 오히려 매력으로 다가갈 수 있어요.',
        existing: '한결같은 믿음으로 관계를 든든하게 지켜가는 시기입니다. 자신의 기준만 고집하지 않고 상대의 입장도 헤아려보면 관계가 한결 편안해집니다.'
      },
      honor: '곧은 행보로 주변의 인정을 받는 시기입니다. 원칙을 지키는 모습이 시간이 지날수록 더 큰 신뢰로 돌아옵니다.',
      moving: '확신이 서면 망설임 없이 움직이는 결단력이 빛을 발하는 시기입니다. 성급하게 결정하기 전에 조건을 한 번 더 확인해보면 후회를 줄일 수 있습니다.',
      children: '든든한 울타리가 되어 아이를 지지해주는 시기입니다. 지나치게 엄격한 기준을 강요하지 않도록 유의하는 것이 좋습니다.'
    }
  },
```

- [ ] **Step 2: 나머지 9개 일간(을목, 병화, 정화, 무토, 기토, 경금, 신금, 임수, 계수)에 같은 패턴 적용**

각 일간에 대해:
1. `trait`는 절대 변경하지 않는다.
2. `keywords`(3개)와 `advice`(1문장)를 그 일간의 `trait`와 기존 1문장 카테고리 텍스트들이 담고 있는 성격/기운을 반영해 작성한다.
3. 8개 세분화 카테고리는 각 서브키가 실질적으로 다른 시나리오를 다루도록 2문장(또는 자연스러우면 3문장)으로 작성한다. 첫 문장은 상황 묘사, 두 번째(세 번째) 문장은 그 서브키에 실제로 맞는 구체적 조언·뉘앙스·다음 행동을 담는다 — 재진술 금지.
4. 3개 단일 카테고리(honor, moving, children)도 2~3문장으로 확장한다.
5. **한 일간을 다 쓸 때마다** 그 일간 안에서 `love`↔`relationships`(4개 서브키 조합), `career`↔`workplace`(4개 조합), `money`↔`business`(4개 조합)가 오프닝 문장이나 뼈대를 공유하지 않는지 직접 대조한다. 다음 일간으로 넘어가기 전에 이 자가 점검을 마친다.
6. 같은 일간 안에서 특정 문형("~하지 않도록 주의하세요" 등)을 여러 필드에 mad-libs식으로 반복해서 쓰지 않는다 — 타로 프로젝트에서 한 카드 안에 같은 템플릿이 수십 곳에 재사용돼 전면 재작성이 필요했던 전례가 있다.

- [ ] **Step 3: 문장 단위 중복 스윕 스크립트 작성 및 실행**

`data/saju-data.js`와 같은 디렉토리 밖(예: 임시 스크립트 파일 또는 `node -e`)에서 다음 스크립트를 실행해 갑목을 제외한 9개 일간 전체에서 금지쌍 충돌이 있는지 확인한다:

```javascript
const { ILGAN_DATA } = require('./data/saju-data.js');

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];

let found = 0;
ILGAN_DATA.forEach(ilgan => {
  if (ilgan.key === 'gap') return; // 잠긴 참조 예시는 이미 검증됨, 재작성하지 않음
  FORBIDDEN_PAIRS.forEach(([catA, subsA, catB, subsB]) => {
    subsA.forEach(subA => {
      subsB.forEach(subB => {
        const textA = ilgan.categories[catA][subA];
        const textB = ilgan.categories[catB][subB];
        splitSentences(textA).forEach(sentA => {
          splitSentences(textB).forEach(sentB => {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= 0.3) {
              found++;
              console.log(`[${(sim * 100).toFixed(0)}%] ${ilgan.name_kr}: ${catA}.${subA} <-> ${catB}.${subB}`);
              console.log('  A:', sentA);
              console.log('  B:', sentB);
            }
          });
        });
      });
    });
  });
});
console.log(`Found ${found} sentence-level collisions`);
```

`Found 0 sentence-level collisions`가 나올 때까지 충돌이 발견된 필드를 수정하고 재실행한다. 수정할 때는 두 필드 중 하나만 다시 쓰되, 그 결과가 같은 일간의 다른 필드와 새로 겹치지 않는지 재확인한다.

- [ ] **Step 4: 구조 확인**

10개 일간 전체를 Read 도구로 다시 읽어 다음을 육안으로 확인한다: 모든 일간에 `keywords`(3개), `advice`(1문장)가 있는지, 8개 세분화 카테고리가 두 서브키 모두 존재하고 서로 다른지, 3개 단일 카테고리가 존재하는지, `trait`가 원본과 동일한지(갑목은 Step 1의 원문과, 나머지는 파일 상단의 기존 원문과 정확히 일치해야 함 — 이번 작업에서 변경하지 않았으므로).

- [ ] **Step 5: 커밋**

```bash
git add data/saju-data.js
git commit -m "content(saju): expand category sentences, add keywords/advice, subdivide 8 categories"
```

---

## Task 2: 영구 회귀 테스트 추가 (`tests/saju-data.test.js`)

**Files:**
- Modify: `tests/saju-data.test.js`

**Interfaces:**
- Consumes: Task 1이 만든 `ILGAN_DATA`의 새 구조(`keywords`, `advice`, 세분화된 `categories`)
- Produces: 없음(테스트 파일)

기존 파일 내용(10개 일간 존재, 순서, `trait`/`categories` 비어있지 않음 검증)은 그대로 유지하고, 그 뒤에 아래 블록을 추가한다:

- [ ] **Step 1: 구조 검증 테스트 추가**

```javascript
// ---------------------------------------------------------------------------
// keywords/advice 부가정보와 세분화 카테고리 구조 검증
// ---------------------------------------------------------------------------

const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

ILGAN_DATA.forEach(function (ilgan) {
  assert.ok(Array.isArray(ilgan.keywords) && ilgan.keywords.length === 3,
    ilgan.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof ilgan.advice === 'string' && ilgan.advice.length > 0,
    ilgan.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = ilgan.categories[cat];
    assert.ok(entry && typeof entry === 'object', ilgan.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, ilgan.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, ilgan.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], ilgan.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof ilgan.categories[cat] === 'string' && ilgan.categories[cat].length > 0,
      ilgan.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 10 ilgan have valid keywords/advice/subdivided-category structure');
```

- [ ] **Step 2: 실행해서 통과 확인**

Run: `node tests/saju-data.test.js`
Expected: `All 10 ilgan have valid keywords/advice/subdivided-category structure`를 포함해 통과. Task 1이 제대로 됐다면 이 시점에 이미 통과해야 한다(이 테스트는 새 기능이 아니라 Task 1 결과의 회귀 가드).

- [ ] **Step 3: 문장수 검증 테스트 추가**

```javascript
// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트 (타로 프로젝트 최종 리뷰의 교훈: 필드 전체 단위 비교는
// "공유된 문장1 + 다른 문장2" 충돌을 놓친다. 사주는 처음부터 문장 단위로 검증한다.
// ---------------------------------------------------------------------------

function isLockedIlgan(ilgan) {
  return ilgan.key === 'gap';
}

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

// 모든 카테고리 필드는 정확히 2~3문장이어야 한다 (갑목 포함 — Task 1에서 갑목도
// 2문장으로 작성했으므로 갑목을 이 검증에서 제외할 이유가 없다).
ILGAN_DATA.forEach(function (ilgan) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = ilgan.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        ilgan.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = ilgan.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      ilgan.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All ilgan have 2-3 sentence category fields');
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `node tests/saju-data.test.js`
Expected: `All ilgan have 2-3 sentence category fields` 포함해 통과.

- [ ] **Step 5: 금지쌍 문장 단위 스윕 테스트 추가**

```javascript
// 같은 일간 내에서 love/relationships, career/workplace, money/business가
// 4개 서브키 조합 어디에서도 오프닝 문장/뼈대를 공유하면 안 된다
// (문장 단위 word-Jaccard >= 0.3, 필드 전체 단위 임계값과 무관).
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = ilgan.categories[catA][subA];
        const textB = ilgan.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
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

console.log('All saju-data tests passed');
```

(참고: `isLockedIlgan`은 이번 테스트에서는 어떤 검증도 건너뛰는 데 쓰지 않는다 — 갑목도 다른 9개 일간과 동일한 규칙을 만족해야 하고 Task 1에서 이미 그렇게 작성했다. 함수 자체는 향후 갑목의 `trait`을 다른 검증에서 제외해야 할 때를 대비해 남겨둔다.)

- [ ] **Step 6: 전체 실행 및 커밋**

Run: `node tests/saju-data.test.js`
Expected: 모든 `console.log` 메시지가 출력되고 에러 없이 종료(exit code 0). 만약 충돌이 발견되면 Task 1로 돌아가 해당 필드를 수정한 뒤 이 테스트를 다시 실행한다 — 이 테스트 파일 자체를 수정해서 우회하지 않는다.

```bash
git add tests/saju-data.test.js
git commit -m "test(saju): add permanent structure, sentence-count, and dedup regression tests"
```

---

## Task 3: `js/app.js` 통합 — 하위 선택 로직 + 키워드/조언 렌더링

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1이 만든 `ILGAN_DATA`의 `keywords`/`advice`/세분화된 `categories`
- Produces: 없음(UI 로직) — 기존 `CATEGORY_SUBCHOICES`, `renderSubChoices()`, `showSajuSummary()`, `saveSajuReading()` 함수 시그니처는 변경하지 않는다.

- [ ] **Step 1: `SUBCHOICE_ENABLED_MODES` 상수 추가**

`js/app.js`에서 `CATEGORY_SUBCHOICES` 상수 선언(24번째 줄 부근, `const CATEGORY_SUBCHOICES = { ... };` 바로 다음) 뒤에 추가:

```javascript
  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju']);
```

- [ ] **Step 2: 모드 전환 핸들러에서 하위 선택 버튼 숨김 조건 일반화**

`modeButtons.forEach` 클릭 핸들러 안의 다음 줄(현재 `selectedMode !== 'tarot'`로 하드코딩되어 있음):

```javascript
      subchoiceSelect.classList.toggle('hidden', selectedMode !== 'tarot' || !CATEGORY_SUBCHOICES[selectedCategory]);
```

를 다음으로 교체:

```javascript
      subchoiceSelect.classList.toggle('hidden', !SUBCHOICE_ENABLED_MODES.has(selectedMode) || !CATEGORY_SUBCHOICES[selectedCategory]);
```

- [ ] **Step 3: `renderSubChoices()`에서도 같은 조건으로 일반화**

`renderSubChoices()` 함수 안의 다음 줄:

```javascript
    subchoiceSelect.classList.toggle('hidden', selectedMode !== 'tarot');
```

를 다음으로 교체:

```javascript
    subchoiceSelect.classList.toggle('hidden', !SUBCHOICE_ENABLED_MODES.has(selectedMode));
```

- [ ] **Step 4: `showSajuSummary()`의 카테고리 텍스트 조회에 세분화 분기 추가**

`showSajuSummary()` 함수 안의 다음 블록:

```javascript
    const balance = classifyElementBalance(counts);
    const balanceText = getElementBalanceText(balance);
    const baseMeaning = category && ilgan.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + ilgan.categories[category]
      : ilgan.trait;
    const meaning = baseMeaning + ' ' + balanceText;
```

를 다음으로 교체:

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
```

- [ ] **Step 5: 키워드/조언 박스 렌더링 추가**

같은 함수 안, `summaryEl.innerHTML = ...` 직전에 추가:

```javascript
    const keywordsList = ilgan.keywords;
    const adviceText = ilgan.advice;
    const extraHtml = (keywordsList && adviceText)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + keywordsList.join(' · ') + '</p><p class="card-advice">조언: ' + adviceText + '</p></div>'
      : '';

```

그리고 기존 `summaryEl.innerHTML = ...` 대입문:

```javascript
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      myeongsikHtml + elementHtml + daeunHtml +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
```

를 다음으로 교체:

```javascript
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      myeongsikHtml + elementHtml + daeunHtml +
      '<div class="reading-detail"><p>' + meaning + '</p></div>' +
      extraHtml;
```

- [ ] **Step 6: `saveSajuReading()`에 `subChoice` 필드 추가**

`saveSajuReading()` 함수 안, 기존 엔트리 객체:

```javascript
    const entry = {
      date: new Date().toISOString(),
      mode: 'saju',
      calendarType: selectedCalendarType,
      birthDate: input.year + '-' + String(input.month).padStart(2, '0') + '-' + String(input.day).padStart(2, '0'),
      birthTime: input.timeUnknown ? null : (String(input.hour).padStart(2, '0') + ':' + String(input.minute).padStart(2, '0')),
      timeUnknown: input.timeUnknown,
      gender: selectedGender,
      dayIlganName: getIlganByIndex(saju.day.stemIdx).name_kr,
      category: selectedCategory,
      period: selectedPeriod,
      cards: []
    };
```

를 다음으로 교체(`category`와 `period` 사이에 `subChoice` 추가, 타로의 `saveCurrentReading()`과 같은 필드 순서):

```javascript
    const entry = {
      date: new Date().toISOString(),
      mode: 'saju',
      calendarType: selectedCalendarType,
      birthDate: input.year + '-' + String(input.month).padStart(2, '0') + '-' + String(input.day).padStart(2, '0'),
      birthTime: input.timeUnknown ? null : (String(input.hour).padStart(2, '0') + ':' + String(input.minute).padStart(2, '0')),
      timeUnknown: input.timeUnknown,
      gender: selectedGender,
      dayIlganName: getIlganByIndex(saju.day.stemIdx).name_kr,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      cards: []
    };
```

- [ ] **Step 7: 문법 검증**

Run: `node --check js/app.js`
Expected: 에러 없이 종료.

- [ ] **Step 8: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 전부 통과(타로 관련 테스트가 이 변경으로 깨지지 않아야 함 — `SUBCHOICE_ENABLED_MODES`에 `'tarot'`도 포함되어 있으므로 기존 타로 동작은 그대로 유지되어야 한다).

- [ ] **Step 9: 커밋**

```bash
git add js/app.js
git commit -m "feat(saju): wire subchoice selection and keyword/advice rendering into saju flow"
```

---

## Task 4: 브라우저 확인 + 전체 회귀

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~3의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. 사주 모드로 전환 → 생년월일(양력) 입력 → "연애운" 카테고리 선택 → "솔로"/"커플" 하위 버튼이 나타나는지 확인
2. "명예운" 선택 → 하위 버튼이 사라지는지 확인 (단일 유지 카테고리)
3. "오늘의운"(카테고리 미선택) 상태 → 하위 버튼이 보이지 않는지 확인
4. "연애운" + "커플" 선택 후 사주 리딩 실행 → 결과 화면에 2~3문장 해설 + 오행 균형 문장 + "키워드: OO · OO · OO" + "조언: ..." 박스가 함께 보이는지 확인
5. 타로 모드로 전환 → 사주에서 선택했던 하위 버튼이 남아있지 않고 사라지는지 확인 (Task 3 이전에 있었던 I3 버그가 사주 추가로 재발하지 않았는지)
6. 타로 모드에서 "연애운" 선택 → 하위 버튼이 정상적으로 다시 나타나는지 확인 (타로 기존 기능 회귀 없음)
7. 별자리/띠운세 모드로 전환 → 하위 버튼이 보이지 않는지 확인 (아직 허용목록에 없는 모드)
8. "지난 기록" 열어서 방금 사주 리딩이 정상적으로 표시되는지 확인(기존 형식 그대로)
9. 콘솔에 에러가 없는지 확인

Expected: 위 9가지 모두 기대한 대로 동작, 콘솔 에러 없음

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(saju): ...` 커밋 추가).
