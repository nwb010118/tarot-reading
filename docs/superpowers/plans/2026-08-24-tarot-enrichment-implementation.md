# 타로 리딩 풍부화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 카테고리 해설을 1문장→2~3문장으로 확장하고, 카드당 키워드/조언 부가정보를 추가하고, 8개 카테고리에 하위 세분화(예: 연애운→솔로/커플)를 도입한다.

**Architecture:** `data/tarot-data.js`(현재 1,161줄, 78장)를 아케인 그룹별 5개 파일로 분리한 뒤, 각 파일에 새 필드(`keywords`, `advice`)와 세분화된 카테고리 구조를 채워 넣는다. UI에는 카테고리 선택 시 나타나는 하위 선택 버튼과, 카드 결과에 항상 표시되는 키워드/조언 박스를 추가한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 기존 프로젝트와 동일. Node `assert` 기반 테스트.

## Global Constraints

- 기존 카드 기본 해설(`upright`/`reversed`, 카드 레벨의 3~4문장 텍스트)은 절대 변경하지 않는다 — 이미 충분히 풍부하다는 것이 기존 설계의 전제.
- 세분화 카테고리는 정확히 이 8개와 하위 키다: `love`(solo/couple), `money`(consumption/invest), `career`(jobseek/switch), `business`(startup/running), `study`(exam/path), `health`(body/mind), `relationships`(new/existing), `workplace`(team/personal).
- 단일 유지 카테고리는 정확히 이 3개다: `honor`, `moving`, `children` — 세분화 없이 기존과 같은 `{upright: string, reversed: string}` 형태를 유지하되 문장만 2~3문장으로 확장.
- 카테고리 해설 문장은 2~3문장, 카드당 조언(`advice`)은 1문장, 키워드(`keywords`)는 정확히 3개 배열이다.
- 신규 데이터 파일은 기존 파일들과 동일하게 `if (typeof module !== 'undefined' && module.exports) { module.exports = {...}; }` 가드를 파일 하단에 둔다.
- 브라우저에서는 `<script>` 로드 순서로 전역 스코프를 공유하고, Node 테스트에서는 테스트/조립 파일이 `global.X = require(...).X`로 먼저 주입한다(`tests/lunar-convert.test.js`의 기존 패턴).
- 이 하위 선택 UI 패턴은 이번 작업에서 타로에만 적용한다. 다른 모드로 일반화하지 않는다(YAGNI).

---

## Task 1: `tarot-data.js`를 아케인 그룹별 5개 파일로 분리 (내용 변경 없음, 순수 리팩터)

**Files:**
- Create: `data/tarot-data-major.js`
- Create: `data/tarot-data-wands.js`
- Create: `data/tarot-data-cups.js`
- Create: `data/tarot-data-swords.js`
- Create: `data/tarot-data-pentacles.js`
- Modify: `data/tarot-data.js` (기존 카드 배열 5개를 제거하고 위 파일들을 조립하는 코드로 교체, 유틸 함수는 그대로 유지)
- Modify: `tests/tarot-data.test.js` (분리된 전역 상수 주입 추가)
- Modify: `index.html` (5개 신규 스크립트 태그 추가)

**Interfaces:**
- Consumes: 없음(순수 리팩터)
- Produces: `TAROT_MAJOR_ARCANA`(22장 배열), `TAROT_WANDS`/`TAROT_CUPS`/`TAROT_SWORDS`/`TAROT_PENTACLES`(각 14장 배열) — Task 2~6이 이 전역 상수들을 직접 수정한다. `data/tarot-data.js`는 기존과 동일한 `TAROT_DATA`, `getFullDeck()`, `getMajorImageFilename()`, `getMinorImageFilename()`을 그대로 export한다(시그니처 변경 없음).

- [ ] **Step 1: 현재 `data/tarot-data.js`의 정확한 경계 확인**

`data/tarot-data.js`는 정확히 다음과 같은 구조다(이번 세션에서 grep으로 확인됨, 이 경계는 정확하다):
- 1번째 줄: `const TAROT_DATA = {`
- 2번째 줄: `  major_arcana: [`
- 3~310번째 줄: 메이저 아르카나 22장 카드 객체
- 311번째 줄: `  ],`
- 312번째 줄: `  minor_arcana: {`
- 313번째 줄: `    wands: [`
- 314~509번째 줄: 완드 14장 카드 객체
- 510번째 줄: `    ],`
- 511번째 줄: `    cups: [`
- 512~707번째 줄: 컵 14장 카드 객체
- 708번째 줄: `    ],`
- 709번째 줄: `    swords: [`
- 710~905번째 줄: 소드 14장 카드 객체
- 906번째 줄: `    ],`
- 907번째 줄: `    pentacles: [`
- 908~1103번째 줄: 펜타클 14장 카드 객체
- 1104번째 줄: `    ]`
- 1105번째 줄: `  }`
- 1106번째 줄: `};`
- 1107번째 줄부터: `MINOR_RANK_NUMBER`, `SUIT_LABEL`, `getMajorImageFilename`, `getMinorImageFilename`, `getFullDeck`, `module.exports` (이 부분은 변경하지 않음)

Read 도구로 `data/tarot-data.js`의 1~1106번째 줄을 읽어 위 경계와 실제 파일이 일치하는지 확인한다.

- [ ] **Step 2: `data/tarot-data-major.js` 생성**

1~311번째 줄의 메이저 아르카나 내용을 그대로 옮기되, 변수명만 바꾼다:

```javascript
const TAROT_MAJOR_ARCANA = [
  // ... 2~310번째 줄의 22장 카드 객체를 여기에 그대로 붙여넣기(문구 변경 없음) ...
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAROT_MAJOR_ARCANA };
}
```

- [ ] **Step 3: `data/tarot-data-wands.js` 생성**

314~509번째 줄의 완드 14장 카드 객체를 그대로 옮긴다:

```javascript
const TAROT_WANDS = [
  // ... 314~509번째 줄의 14장 카드 객체를 여기에 그대로 붙여넣기(문구 변경 없음) ...
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAROT_WANDS };
}
```

- [ ] **Step 4: `data/tarot-data-cups.js`, `data/tarot-data-swords.js`, `data/tarot-data-pentacles.js` 생성**

같은 방식으로 각각 512~707번째 줄(컵), 710~905번째 줄(소드), 908~1103번째 줄(펜타클)을 그대로 옮긴다. 변수명은 각각 `TAROT_CUPS`, `TAROT_SWORDS`, `TAROT_PENTACLES`이고, 각 파일 끝에 동일한 패턴의 `module.exports` 가드를 둔다.

- [ ] **Step 5: `data/tarot-data.js`를 조립 파일로 교체**

전체 파일을 다음으로 교체(카드 데이터는 제거하고 5개 전역 상수를 조립, 유틸 함수는 그대로 유지):

```javascript
const TAROT_DATA = {
  major_arcana: TAROT_MAJOR_ARCANA,
  minor_arcana: {
    wands: TAROT_WANDS,
    cups: TAROT_CUPS,
    swords: TAROT_SWORDS,
    pentacles: TAROT_PENTACLES
  }
};

const MINOR_RANK_NUMBER = {
  Ace: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  Page: 11, Knight: 12, Queen: 13, King: 14
};

const SUIT_LABEL = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles' };

function getMajorImageFilename(card) {
  const slug = card.name_en.replace(/^The\s+/, '').replace(/\s+/g, '_');
  return 'RWS_Tarot_' + String(card.id).padStart(2, '0') + '_' + slug + '.jpg';
}

function getMinorImageFilename(suitKey, card) {
  const num = MINOR_RANK_NUMBER[card.rank];
  return SUIT_LABEL[suitKey] + String(num).padStart(2, '0') + '.jpg';
}

function getFullDeck() {
  const deck = [];

  TAROT_DATA.major_arcana.forEach(function (card) {
    deck.push({
      cardId: 'major_' + card.id,
      type: 'major',
      name: card.name_kr,
      nameEn: card.name_en,
      upright: card.upright,
      reversed: card.reversed,
      keywords: card.keywords,
      advice: card.advice,
      categories: card.categories,
      image: 'images/' + getMajorImageFilename(card)
    });
  });

  Object.keys(TAROT_DATA.minor_arcana).forEach(function (suitKey) {
    TAROT_DATA.minor_arcana[suitKey].forEach(function (card) {
      deck.push({
        cardId: suitKey + '_' + card.rank,
        type: 'minor',
        name: card.name_kr,
        nameEn: SUIT_LABEL[suitKey] + ' ' + card.rank,
        upright: card.upright,
        reversed: card.reversed,
        keywords: card.keywords,
        advice: card.advice,
        categories: card.categories,
        image: 'images/' + getMinorImageFilename(suitKey, card)
      });
    });
  });

  return deck;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAROT_DATA, getFullDeck, getMajorImageFilename, getMinorImageFilename };
}
```

주의: `getFullDeck()`에 `keywords: card.keywords, advice: card.advice`가 추가되었다(Task 2~6에서 카드에 이 필드들이 채워짐). 이 필드가 아직 없는 카드는 `undefined`가 들어가도 정상 동작한다(Task 9에서 `item.card.keywords &&` 형태로 방어적으로 다룸).

- [ ] **Step 6: `tests/tarot-data.test.js` 상단에 전역 주입 추가**

파일의 첫 줄(`const assert = require('assert');`) 앞에 추가:

```javascript
global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

```

- [ ] **Step 7: `index.html`에 5개 스크립트 태그 추가**

기존:
```html
<script src="data/tarot-data.js"></script>
```
다음으로 교체:
```html
<script src="data/tarot-data-major.js"></script>
<script src="data/tarot-data-wands.js"></script>
<script src="data/tarot-data-cups.js"></script>
<script src="data/tarot-data-swords.js"></script>
<script src="data/tarot-data-pentacles.js"></script>
<script src="data/tarot-data.js"></script>
```

- [ ] **Step 8: 기존 테스트가 그대로 통과하는지 확인 (내용 변경이 없으므로 회귀 없어야 함)**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)` — 기존과 동일하게 통과(78장, 고유 ID, 이미지 경로 등)

Run: `node tests/deck-logic.test.js`
Expected: 통과 (deck-logic.js가 `getFullDeck()`을 사용하므로 회귀 확인 차원)

- [ ] **Step 9: Commit**

```bash
git add data/tarot-data.js data/tarot-data-major.js data/tarot-data-wands.js data/tarot-data-cups.js data/tarot-data-swords.js data/tarot-data-pentacles.js tests/tarot-data.test.js index.html
git commit -m "refactor(tarot): split tarot-data.js into per-suit files"
```

---

## Task 2: 메이저 아르카나(22장) 풍부화

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: 없음
- Produces: 22장 각각에 `keywords: { upright: [3개], reversed: [3개] }`, `advice: { upright: string, reversed: string }` 필드 추가. `categories.love/money/career/business/study/health/relationships/workplace`는 `{ upright: {키1, 키2}, reversed: {키1, 키2} }` 형태로 변경. `categories.honor/moving/children`은 `{ upright: string, reversed: string }` 형태 유지(문장만 확장).

- [ ] **Step 1: "바보"(The Fool) 카드에 아래 정확한 내용 적용 — 이후 21장의 패턴 기준**

기존 "바보" 카드 객체(`id: 0`)를 다음으로 교체한다(기본 `upright`/`reversed` 텍스트는 절대 변경하지 않음):

```javascript
    { id: 0, name_kr: "바보", name_en: "The Fool", upright: "새로운 시작을 앞두고 있습니다. 두려움보다 호기심이 앞서는 순간이며, 정해진 계획이 없어도 발을 내딛는 용기가 필요합니다. 실수를 두려워하기보다 경험 자체를 배움으로 받아들이세요. 지금은 완벽한 준비보다 첫걸음의 순수한 에너지가 더 중요한 시기입니다.", reversed: "충동적으로 움직이려는 마음과 무모함이 강조됩니다. 계획 없이 뛰어들면 예상치 못한 위험에 부딪힐 수 있어요. 자유로움과 무책임함은 다르다는 것을 기억하고, 한 걸음 물러나 현실적인 점검을 해보는 것이 좋습니다.",
      keywords: { upright: ["새로운 시작", "순수한 호기심", "즉흥적인 용기"], reversed: ["무모함", "충동적 선택", "준비 부족"] },
      advice: { upright: "완벽한 계획을 세우기보다 지금 이 순간의 호기심을 따라 첫걸음을 내딛어보세요.", reversed: "뛰어들기 전에 잠시 멈춰서 놓치고 있는 위험은 없는지 점검해보세요." },
      categories: {
        love: {
          upright: { solo: "새로운 사람과의 즉흥적인 만남이나 설레는 시작이 찾아올 수 있는 시기입니다. 조건을 따지기보다 마음이 이끄는 대로 다가가 보면 뜻밖의 인연이 생길 수 있어요.", couple: "관계에 신선한 활력을 불어넣을 즉흥적인 이벤트나 여행이 좋은 계기가 되는 시기입니다. 익숙한 패턴에서 벗어나 새로운 데이트를 시도해보세요." },
          reversed: { solo: "준비 없이 관계에 뛰어들다 상처받을 수 있으니 신중해지는 것이 좋습니다. 설렘만 앞세우기보다 상대를 조금 더 알아가는 시간을 가져보세요.", couple: "즉흥적인 결정이 관계에 예상치 못한 갈등을 부를 수 있습니다. 중요한 결정일수록 충분히 상의한 뒤 움직이는 것이 안전합니다." }
        },
        money: {
          upright: { consumption: "가벼운 마음으로 하는 소비가 스트레스를 풀어주는 시기입니다. 다만 즉흥적인 지출이 쌓이지 않도록 적당한 선은 정해두세요.", invest: "새로운 투자 기회에 호기심이 생기는 시기입니다. 다만 충분히 알아보지 않은 상태에서 뛰어들기보다 기본적인 공부는 해두는 것이 좋습니다." },
          reversed: { consumption: "충동적인 지출이 늘어나며 예산 관리가 흐트러질 수 있는 시기입니다. 지갑을 열기 전 한 번 더 생각하는 습관이 필요합니다.", invest: "무계획한 투자는 손실로 이어질 수 있으니 조심해야 하는 시기입니다. 확신이 서지 않는다면 지금은 관망하는 편이 낫습니다." }
        },
        career: {
          upright: { jobseek: "새로운 분야나 직무에 과감히 도전해볼 만한 시기입니다. 경력이 부족해도 배우려는 태도만 있다면 기회를 잡을 수 있어요.", switch: "낯선 역할이나 새로운 회사로의 이동이 신선한 활력을 줄 수 있는 시기입니다. 완벽한 확신이 없어도 일단 시도해보는 것이 좋습니다." },
          reversed: { jobseek: "준비가 부족한 상태로 지원했다가 낭패를 볼 수 있으니 이력서와 면접 준비를 다시 점검해보세요.", switch: "충동적인 이직 결정이 후회로 이어질 수 있는 시기입니다. 새로운 자리의 조건을 꼼꼼히 따져본 뒤 움직이세요." }
        },
        business: {
          upright: { startup: "새로운 사업 아이디어에 도전해볼 좋은 시기입니다. 작게 시작해서 시장의 반응을 보며 키워나가는 방식이 잘 맞습니다.", running: "기존 사업에 신선한 아이디어를 더해볼 만한 시기입니다. 낡은 방식을 과감히 바꿔보는 시도가 좋은 반응을 얻을 수 있어요." },
          reversed: { startup: "충분한 검토 없이 사업을 시작하면 위험할 수 있는 시기입니다. 사업계획을 다시 한번 꼼꼼히 점검해보세요.", running: "충동적인 사업 확장이 자금 압박으로 이어질 수 있습니다. 무리한 투자는 잠시 미뤄두는 것이 좋습니다." }
        },
        study: {
          upright: { exam: "새로운 학습 방법에 대한 호기심이 시험 준비의 원동력이 되는 시기입니다. 낯선 방식이라도 일단 시도해보면 의외로 잘 맞을 수 있어요.", path: "새로운 분야에 대한 호기심이 진로 탐색의 좋은 실마리가 되는 시기입니다. 다양한 가능성을 열어두고 자유롭게 알아보세요." },
          reversed: { exam: "계획 없이 공부하면 집중력이 흐트러질 수 있는 시기입니다. 즉흥적인 학습보다 정해진 계획을 지키는 것이 중요합니다.", path: "충분한 고민 없이 진로를 정했다가 방황할 수 있으니, 성급한 결정은 잠시 미뤄두는 것이 좋습니다." }
        },
        health: {
          upright: { body: "활동적으로 몸을 움직이기 좋은, 가벼운 컨디션의 시기입니다. 새로운 운동을 시도해보는 것도 좋은 자극이 됩니다.", mind: "새로운 경험이 마음에 신선한 활력을 주는 시기입니다. 익숙한 틀에서 벗어나보면 기분 전환에 큰 도움이 됩니다." },
          reversed: { body: "무리한 도전이나 부주의로 다치기 쉬운 시기이니 몸을 움직일 때 평소보다 조심하세요.", mind: "충동적인 결정들이 쌓이며 마음이 산만해질 수 있는 시기입니다. 잠시 속도를 늦추고 마음을 가라앉혀보세요." }
        },
        relationships: {
          upright: { new: "새로운 사람들과 스스럼없이 어울리게 되는 시기입니다. 열린 마음으로 다가가면 뜻밖의 좋은 인연을 만날 수 있어요.", existing: "익숙한 관계에 새로운 활력을 더해볼 좋은 시기입니다. 함께 낯선 경험을 해보는 것이 관계를 더 즐겁게 만들어줍니다." },
          reversed: { new: "낯선 관계에서 경계심을 늦추다 곤란해질 수 있으니 적당한 거리를 유지하는 것이 좋습니다.", existing: "즉흥적인 언행이 오래된 관계에 오해를 불러올 수 있는 시기입니다. 말과 행동에 조금 더 신중해지세요." }
        },
        workplace: {
          upright: { team: "새로운 팀원이나 협업 방식에 스스럼없이 적응하게 되는 시기입니다. 낯선 방식이라도 열린 마음으로 받아들여보세요.", personal: "낯선 업무나 역할에 부담 없이 도전해보기 좋은 시기입니다. 새로운 시도가 좋은 경험으로 남을 수 있어요." },
          reversed: { team: "새로운 협업 방식에 적응하지 못해 실수가 생길 수 있는 시기입니다. 팀에 미리 상황을 공유해두세요.", personal: "준비 없이 업무에 뛰어들다 실수가 생길 수 있는 시기입니다. 시작 전에 한 번 더 점검하세요." }
        },
        honor: { upright: "신선한 시도와 참신한 아이디어로 주목받을 수 있는 시기입니다. 남들과 다른 방식으로 접근한 것이 오히려 좋은 평가로 이어질 수 있어요.", reversed: "경솔한 언행으로 평판에 흠이 갈 수 있는 시기입니다. 즉흥적으로 내뱉은 말이 생각보다 오래 남을 수 있으니 신중하게 행동하세요." },
        moving: { upright: "즉흥적인 이사나 이동이 새로운 활력을 줄 수 있는 시기입니다. 계획에 없던 곳이라도 막상 가보면 의외로 잘 맞을 수 있어요.", reversed: "충분한 계획 없이 이동했다가 불편을 겪을 수 있는 시기입니다. 성급하게 결정하기보다 조건을 한 번 더 확인해보세요." },
        children: { upright: "아이와 함께 새로운 것을 시도하기 좋은 시기입니다. 낯선 활동이라도 아이와 함께라면 즐거운 추억이 될 수 있어요.", reversed: "아이에 대한 준비 부족으로 어려움을 겪을 수 있는 시기입니다. 즉흥적인 결정보다 아이의 상황을 한 번 더 살펴보세요." }
      } },
```

- [ ] **Step 2: 나머지 21장(마법사~세계)에 같은 패턴 적용**

`data/tarot-data-major.js`의 나머지 21장 각각에 대해, Step 1과 완전히 같은 구조(`keywords`, `advice`, 8개 세분화 카테고리, 3개 단일 카테고리)를 적용한다. 각 카드의 기존 `upright`/`reversed` 기본 텍스트와 기존 카테고리 문장(참고용 소스)은 파일에서 직접 확인한다. 문장 톤과 분량은 Step 1의 "바보" 예시와 동일한 수준(카테고리 문장 2~3문장, 조언 1문장, 키워드 3개)을 유지한다.

- [ ] **Step 3: 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
const subdivided = { love:['solo','couple'], money:['consumption','invest'], career:['jobseek','switch'], business:['startup','running'], study:['exam','path'], health:['body','mind'], relationships:['new','existing'], workplace:['team','personal'] };
const single = ['honor','moving','children'];
let errors = [];
if (data.length !== 22) errors.push('expected 22 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    if (!card.keywords || !Array.isArray(card.keywords[o]) || card.keywords[o].length !== 3) errors.push(card.name_kr + ' keywords.' + o);
    if (!card.advice || typeof card.advice[o] !== 'string' || !card.advice[o]) errors.push(card.name_kr + ' advice.' + o);
  });
  Object.keys(subdivided).forEach(function (cat) {
    const keys = subdivided[cat];
    ['upright','reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      if (!entry || typeof entry[keys[0]] !== 'string' || typeof entry[keys[1]] !== 'string' || entry[keys[0]] === entry[keys[1]]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
  single.forEach(function (cat) {
    ['upright','reversed'].forEach(function (o) {
      if (typeof card.categories[cat][o] !== 'string' || !card.categories[cat][o]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All ' + data.length + ' major arcana cards valid'); }
"
```
Expected: `All 22 major arcana cards valid`

- [ ] **Step 4: 회귀 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)` (기존 필드는 그대로라 회귀 없어야 함)

- [ ] **Step 5: Commit**

```bash
git add data/tarot-data-major.js
git commit -m "content(tarot): enrich major arcana readings with subcategories and card extras"
```

---

## Task 3: 완드(Wands, 14장) 풍부화

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: 없음
- Produces: Task 2와 동일한 필드 구조를 완드 14장에 적용

- [ ] **Step 1: "완드 에이스" 카드에 아래 정확한 내용 적용 — 이후 13장의 패턴 기준**

기존 "완드 에이스" 카드 객체(`rank: "Ace"`)를 다음으로 교체한다(기본 `upright`/`reversed` 텍스트는 절대 변경하지 않음):

```javascript
      { rank: "Ace", name_kr: "완드 에이스", upright: "새로운 열정이 샘솟으며 창조적인 아이디어가 떠오르는 시작의 기운입니다. 영감이 떠올랐다면 망설이지 말고 첫발을 내딛어보세요.", reversed: "시작하고 싶은 마음은 있지만 동기가 부족하거나 방향을 못 잡아 지연되고 있습니다. 무엇이 시작을 가로막고 있는지 점검해볼 때입니다.",
        keywords: { upright: ["열정", "영감", "시작의 에너지"], reversed: ["지연", "동기 부족", "방향 상실"] },
        advice: { upright: "영감이 떠올랐다면 재지 말고 지금 바로 첫발을 내딛어보세요.", reversed: "무엇이 시작을 가로막고 있는지부터 솔직하게 점검해보세요." },
        categories: {
          love: {
            upright: { solo: "설렘 가득한 새로운 만남이나 연애의 시작이 다가올 수 있는 시기입니다. 마음이 끌리는 사람이 있다면 먼저 다가가 보는 용기가 좋은 결과로 이어질 수 있어요.", couple: "관계에 새로운 열정을 불어넣을 좋은 계기가 생기는 시기입니다. 함께 새로운 취미나 활동을 시작해보면 관계에 활력이 더해집니다." },
            reversed: { solo: "마음은 있지만 선뜻 다가가지 못하고 망설이고 있는 시기입니다. 완벽한 타이밍을 기다리기보다 작은 용기부터 내보세요.", couple: "관계를 발전시키고 싶은 마음은 있지만 계기를 못 찾아 제자리걸음일 수 있습니다. 먼저 작은 변화를 시도해보는 것이 좋습니다." }
          },
          money: {
            upright: { consumption: "새로운 물건이나 경험에 지출하고 싶은 의욕이 생기는 시기입니다. 다만 계획한 예산 안에서 즐기는 것이 좋습니다.", invest: "새로운 사업 아이디어나 투자처가 떠오르는 시기입니다. 구체적인 실행 계획을 세워보면 좋은 기회로 이어질 수 있어요." },
            reversed: { consumption: "사고 싶은 마음은 있지만 선뜻 지출을 결정하지 못하고 미루고 있을 수 있습니다.", invest: "좋은 투자 아이디어가 있어도 실행으로 옮기지 못하고 있는 시기입니다. 작은 것부터 시작해보는 것이 도움이 됩니다." }
          },
          career: {
            upright: { jobseek: "새로운 분야에 도전하고 싶은 의욕이 샘솟는 시기입니다. 지금의 열정을 살려 지원서를 준비해보면 좋은 결과가 있을 수 있어요.", switch: "새로운 역할이나 프로젝트에 대한 의욕이 커지는 시기입니다. 변화를 두려워하지 말고 기회를 잡아보세요." },
            reversed: { jobseek: "의욕은 있지만 어디서부터 시작해야 할지 갈피를 못 잡고 있을 수 있습니다. 작은 것부터 하나씩 실행에 옮겨보세요.", switch: "이직하고 싶은 마음은 있지만 계기를 못 찾아 망설이고 있는 시기입니다." }
          },
          business: {
            upright: { startup: "새로운 사업 아이디어가 떠오르는 시작의 기운이 가득한 시기입니다. 아이디어를 구체적인 계획으로 옮겨보세요.", running: "기존 사업에 새로운 활력을 더할 아이디어가 떠오르는 시기입니다. 열정을 살려 새로운 시도를 해보는 것이 좋습니다." },
            reversed: { startup: "좋은 아이디어가 있어도 실행으로 옮기지 못하고 있는 시기입니다. 완벽한 준비를 기다리기보다 작게 시작해보세요.", running: "새로운 시도에 대한 의욕은 있지만 실행이 자꾸 미뤄지고 있을 수 있습니다." }
          },
          study: {
            upright: { exam: "새로운 학습 방법에 대한 흥미가 생기는 시기입니다. 그 흥미를 살려 시험 준비에 활력을 더해보세요.", path: "새로운 분야에 대한 흥미가 진로 탐색의 좋은 실마리가 되는 시기입니다. 관심이 가는 방향을 적극적으로 알아보세요." },
            reversed: { exam: "공부를 시작하려는 마음이 자꾸 미뤄지고 있는 시기입니다. 작은 목표부터 세워 실천해보세요.", path: "새로운 진로에 대한 관심은 있지만 실행으로 옮기지 못하고 있을 수 있습니다." }
          },
          health: {
            upright: { body: "운동이나 새로운 활동을 시작하기 좋은 활력 있는 시기입니다. 몸을 움직이고 싶은 마음이 든다면 바로 시작해보세요.", mind: "새로운 자극이 마음에 활력을 더하는 시기입니다. 평소 관심 있던 것을 시도해보면 기분 전환에 좋습니다." },
            reversed: { body: "운동을 시작하려는 마음만 있고 실천이 안 되고 있는 시기입니다. 아주 작은 것부터 시작해보세요.", mind: "새로운 자극을 원하지만 무엇을 해야 할지 갈피를 못 잡고 있을 수 있습니다." }
          },
          relationships: {
            upright: { new: "새로운 인연에 대한 설렘과 열정이 샘솟는 시기입니다. 적극적으로 다가가면 좋은 인연으로 이어질 수 있어요.", existing: "기존 관계에 새로운 활력을 더하고 싶은 마음이 커지는 시기입니다. 함께 새로운 경험을 해보세요." },
            reversed: { new: "다가가고 싶은 마음이 있지만 망설이고 있는 시기입니다. 작은 용기가 관계의 시작이 될 수 있어요.", existing: "관계에 변화를 주고 싶지만 계기를 못 찾아 제자리걸음일 수 있습니다." }
          },
          workplace: {
            upright: { team: "새로운 프로젝트에 대한 팀 전체의 의욕이 샘솟는 시기입니다. 그 열기를 살려 협업을 주도해보세요.", personal: "새로운 역할에 대한 개인적인 의욕이 커지는 시기입니다. 열정을 살려 적극적으로 나서보세요." },
            reversed: { team: "팀의 의욕은 있지만 시작할 계기를 못 찾고 있을 수 있는 시기입니다.", personal: "의욕은 있지만 정작 실행으로 옮기지 못하고 있는 시기입니다. 작은 것부터 시작해보세요." }
          },
          honor: { upright: "새로운 시도로 주목받을 수 있는 시기입니다. 열정적인 태도가 좋은 인상으로 이어질 수 있어요.", reversed: "성급한 시작이 평판에 영향을 줄 수 있는 시기입니다. 열정만 앞세우기보다 신중함도 함께 갖추세요." },
          moving: { upright: "새로운 곳으로 이동하고 싶은 열망이 샘솟는 시기입니다. 그 열정을 살려 구체적인 계획을 세워보세요.", reversed: "이동에 대한 의욕만 있고 실행이 안 되고 있는 시기입니다. 첫 단계부터 하나씩 밟아나가 보세요." },
          children: { upright: "아이와 새로운 것을 시작하기 좋은 활기찬 시기입니다. 아이의 호기심을 자극할 새로운 활동을 함께 해보세요.", reversed: "계획 없이 시작한 일이 아이에게 혼란을 줄 수 있는 시기입니다. 시작하기 전에 아이와 충분히 이야기를 나눠보세요." }
        } },
```

- [ ] **Step 2: 나머지 13장(완드 2~King)에 같은 패턴 적용**

Task 2 Step 2와 동일한 방식. 각 카드의 기존 기본 텍스트/카테고리 문장을 파일에서 확인하며 같은 분량·구조로 확장한다.

- [ ] **Step 3: 구조 검증**

Run (Task 2 Step 3와 동일한 스크립트, 대상 파일만 교체):
```bash
node -e "
const data = require('./data/tarot-data-wands.js').TAROT_WANDS;
const subdivided = { love:['solo','couple'], money:['consumption','invest'], career:['jobseek','switch'], business:['startup','running'], study:['exam','path'], health:['body','mind'], relationships:['new','existing'], workplace:['team','personal'] };
const single = ['honor','moving','children'];
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    if (!card.keywords || !Array.isArray(card.keywords[o]) || card.keywords[o].length !== 3) errors.push(card.name_kr + ' keywords.' + o);
    if (!card.advice || typeof card.advice[o] !== 'string' || !card.advice[o]) errors.push(card.name_kr + ' advice.' + o);
  });
  Object.keys(subdivided).forEach(function (cat) {
    const keys = subdivided[cat];
    ['upright','reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      if (!entry || typeof entry[keys[0]] !== 'string' || typeof entry[keys[1]] !== 'string' || entry[keys[0]] === entry[keys[1]]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
  single.forEach(function (cat) {
    ['upright','reversed'].forEach(function (o) {
      if (typeof card.categories[cat][o] !== 'string' || !card.categories[cat][o]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All ' + data.length + ' wands cards valid'); }
"
```
Expected: `All 14 wands cards valid`

- [ ] **Step 4: 회귀 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)`

- [ ] **Step 5: Commit**

```bash
git add data/tarot-data-wands.js
git commit -m "content(tarot): enrich wands suit readings with subcategories and card extras"
```

---

## Task 4: 컵(Cups, 14장) 풍부화

**Files:**
- Modify: `data/tarot-data-cups.js`

**Interfaces:**
- Consumes: 없음
- Produces: Task 2와 동일한 필드 구조를 컵 14장에 적용

- [ ] **Step 1: "컵 에이스" 카드에 아래 정확한 내용 적용 — 이후 13장의 패턴 기준**

기존 "컵 에이스" 카드 객체(`rank: "Ace"`)를 다음으로 교체한다(기본 `upright`/`reversed` 텍스트는 절대 변경하지 않음):

```javascript
      { rank: "Ace", name_kr: "컵 에이스", upright: "새로운 감정과 사랑이 시작되며 마음이 충만해지는 시기입니다. 마음을 열고 이 감정을 받아들이세요.", reversed: "감정을 억누르거나 기대했던 것에 실망해 마음이 공허해질 수 있습니다. 억지로 괜찮은 척하기보다 그 감정을 있는 그대로 인정해주세요.",
        keywords: { upright: ["충만한 사랑", "새로운 감정", "마음 열기"], reversed: ["공허함", "억눌린 감정", "실망"] },
        advice: { upright: "마음이 이끄는 감정을 억누르지 말고 있는 그대로 받아들여보세요.", reversed: "괜찮은 척하기보다 지금 느끼는 감정을 스스로 인정해주는 것이 먼저입니다." },
        categories: {
          love: {
            upright: { solo: "설레는 새로운 사랑이나 감정이 시작되는 시기입니다. 마음이 향하는 대로 솔직하게 다가가면 좋은 인연으로 이어질 수 있어요.", couple: "서로에 대한 애정이 깊어지며 관계가 정서적으로 충만해지는 시기입니다. 사랑한다는 말을 아끼지 말고 자주 표현해보세요." },
            reversed: { solo: "마음을 억누르거나 기대했던 만남이 성사되지 않아 공허함을 느낄 수 있는 시기입니다. 조급해하지 말고 감정을 천천히 정리해보세요.", couple: "기대했던 만큼의 애정을 받지 못해 실망감이 쌓이고 있을 수 있습니다. 서운한 마음을 참기보다 솔직하게 대화해보세요." }
          },
          money: {
            upright: { consumption: "마음이 편안해지며 재정에 대한 불안도 가라앉는 시기입니다. 여유로운 마음으로 필요한 곳에 지출해도 괜찮습니다.", invest: "직감적으로 끌리는 투자처가 좋은 감정을 주는 시기입니다. 다만 감정만으로 결정하지 말고 근거도 함께 살펴보세요." },
            reversed: { consumption: "감정적인 소비로 재정에 영향을 줄 수 있는 시기입니다. 기분을 달래기 위한 지출은 조금 자제하는 것이 좋습니다.", invest: "기대했던 투자 성과가 나오지 않아 실망할 수 있는 시기입니다. 감정적으로 판단하기보다 냉정하게 다시 점검해보세요." }
          },
          career: {
            upright: { jobseek: "지원하는 과정에서 진심으로 만족감을 느끼는 분야를 발견할 수 있는 시기입니다. 마음이 끌리는 곳에 집중해보세요.", switch: "새로운 자리에서 일에 대한 애정과 만족감을 되찾을 수 있는 시기입니다. 마음이 향하는 방향을 믿어보세요." },
            reversed: { jobseek: "원하는 결과가 나오지 않아 공허함을 느낄 수 있는 시기입니다. 잠시 마음을 추스르고 다시 도전해보세요.", switch: "새로운 자리에 대한 기대가 실망으로 바뀔 수 있는 시기이니 신중하게 다시 살펴보세요." }
          },
          business: {
            upright: { startup: "진심으로 애정을 느끼는 아이템으로 사업을 시작하기 좋은 시기입니다. 그 마음이 좋은 원동력이 될 수 있어요.", running: "사업에 대한 애정과 만족감이 차오르며 팀 분위기도 따뜻해지는 시기입니다." },
            reversed: { startup: "기대했던 반응을 얻지 못해 사업에 대한 열의가 식을 수 있는 시기입니다. 초심을 다시 떠올려보세요.", running: "사업에 대한 열의가 식으며 공허함을 느낄 수 있는 시기입니다. 잠시 쉬어가며 마음을 재정비하세요." }
          },
          study: {
            upright: { exam: "배움에 대한 순수한 애정이 시험 준비의 좋은 동기가 되는 시기입니다. 좋아하는 과목부터 시작해보세요.", path: "진심으로 마음이 가는 분야를 발견하며 진로에 대한 확신이 생기는 시기입니다." },
            reversed: { exam: "학업에 대한 흥미를 잃고 공허함을 느낄 수 있는 시기입니다. 잠시 쉬며 마음을 다잡아보세요.", path: "원하던 방향이 아니라는 생각에 실망감이 들 수 있는 시기입니다. 다른 가능성도 열어두고 살펴보세요." }
          },
          health: {
            upright: { body: "정서적으로 충만해지며 몸도 함께 편안해지는 시기입니다. 마음이 편안하니 컨디션도 자연스럽게 좋아집니다.", mind: "마음이 충만해지며 정서적으로 안정감을 느끼는 시기입니다. 좋아하는 것들로 마음을 채워보세요." },
            reversed: { body: "감정적인 공허함이 컨디션 저하로 이어질 수 있는 시기입니다. 마음을 먼저 돌보는 것이 몸의 회복에도 도움이 됩니다.", mind: "실망감이나 서운함이 쌓이며 마음이 지칠 수 있는 시기입니다. 감정을 억누르지 말고 표현해보세요." }
          },
          relationships: {
            upright: { new: "새로운 인연이나 마음이 통하는 만남이 시작되는 시기입니다. 진심을 담아 다가가면 깊은 유대로 이어질 수 있어요.", existing: "기존 관계에서 정서적인 교감이 더 깊어지는 시기입니다. 서로의 마음을 나누는 대화를 늘려보세요." },
            reversed: { new: "마음을 열지 못하거나 실망으로 관계가 위축될 수 있는 시기입니다. 조급해하지 말고 천천히 마음을 열어보세요.", existing: "서운함이 쌓이며 관계에 거리감이 생길 수 있는 시기입니다. 솔직한 대화로 오해를 풀어보세요." }
          },
          workplace: {
            upright: { team: "동료들과 정서적으로 가까워지며 팀 분위기가 따뜻해지는 시기입니다.", personal: "일에서 만족감과 애정을 느끼는 시기입니다. 마음이 가는 업무에 더 집중해보세요." },
            reversed: { team: "팀에 대한 애정이 식으며 협업 의욕이 떨어질 수 있는 시기입니다.", personal: "일에 대한 애정이 식으며 의욕이 떨어질 수 있는 시기입니다. 잠시 쉬어가는 것도 필요합니다." }
          },
          honor: { upright: "따뜻한 인간미로 좋은 평판을 얻는 시기입니다. 진심 어린 태도가 사람들의 마음을 움직입니다.", reversed: "정서적으로 위축되며 자신감을 잃을 수 있는 시기입니다. 스스로를 다독이는 시간이 필요합니다." },
          moving: { upright: "새로운 곳에 대한 설렘으로 이동을 결심하는 시기입니다. 마음이 이끄는 곳으로 향해보세요.", reversed: "마음이 편치 않아 이동을 망설이고 있는 시기입니다. 감정이 정리될 때까지 조금 더 지켜봐도 좋습니다." },
          children: { upright: "아이와의 정서적 교감이 충만해지는 시기입니다. 함께하는 시간 속에서 깊은 유대감을 느낄 수 있어요.", reversed: "정서적으로 지쳐 아이에게 소홀해질 수 있는 시기입니다. 스스로를 먼저 돌보는 것도 필요합니다." }
        } },
```

- [ ] **Step 2: 나머지 13장(컵 2~King)에 같은 패턴 적용**

Task 2 Step 2와 동일한 방식.

- [ ] **Step 3: 구조 검증**

Run (대상 파일만 교체한 동일 스크립트):
```bash
node -e "
const data = require('./data/tarot-data-cups.js').TAROT_CUPS;
const subdivided = { love:['solo','couple'], money:['consumption','invest'], career:['jobseek','switch'], business:['startup','running'], study:['exam','path'], health:['body','mind'], relationships:['new','existing'], workplace:['team','personal'] };
const single = ['honor','moving','children'];
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    if (!card.keywords || !Array.isArray(card.keywords[o]) || card.keywords[o].length !== 3) errors.push(card.name_kr + ' keywords.' + o);
    if (!card.advice || typeof card.advice[o] !== 'string' || !card.advice[o]) errors.push(card.name_kr + ' advice.' + o);
  });
  Object.keys(subdivided).forEach(function (cat) {
    const keys = subdivided[cat];
    ['upright','reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      if (!entry || typeof entry[keys[0]] !== 'string' || typeof entry[keys[1]] !== 'string' || entry[keys[0]] === entry[keys[1]]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
  single.forEach(function (cat) {
    ['upright','reversed'].forEach(function (o) {
      if (typeof card.categories[cat][o] !== 'string' || !card.categories[cat][o]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All ' + data.length + ' cups cards valid'); }
"
```
Expected: `All 14 cups cards valid`

- [ ] **Step 4: 회귀 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)`

- [ ] **Step 5: Commit**

```bash
git add data/tarot-data-cups.js
git commit -m "content(tarot): enrich cups suit readings with subcategories and card extras"
```

---

## Task 5: 소드(Swords, 14장) 풍부화

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: 없음
- Produces: Task 2와 동일한 필드 구조를 소드 14장에 적용

- [ ] **Step 1: "소드 에이스" 카드에 아래 정확한 내용 적용 — 이후 13장의 패턴 기준**

기존 "소드 에이스" 카드 객체(`rank: "Ace"`)를 다음으로 교체한다(기본 `upright`/`reversed` 텍스트는 절대 변경하지 않음):

```javascript
      { rank: "Ace", name_kr: "소드 에이스", upright: "명료한 통찰과 함께 진실이 드러나는 시기입니다. 흐릿했던 것이 선명해지는 순간을 놓치지 마세요.", reversed: "혼란스러운 정보와 왜곡된 판단으로 갈피를 잡기 어려울 수 있습니다. 성급하게 결론짓지 말고 사실관계부터 다시 확인하세요.",
        keywords: { upright: ["명료한 통찰", "진실", "선명한 판단"], reversed: ["혼란", "왜곡된 정보", "성급한 결론"] },
        advice: { upright: "흐릿했던 것이 선명해지는 이 순간을 놓치지 말고 결정을 내려보세요.", reversed: "성급하게 결론짓기 전에 사실관계부터 차분히 다시 확인해보세요." },
        categories: {
          love: {
            upright: { solo: "관계에 대한 명확한 마음이 드러나는 시기입니다. 상대의 진심이든 자신의 마음이든, 흐릿했던 부분이 선명해질 수 있어요.", couple: "그동안 애매했던 관계의 문제가 명확하게 정리되는 시기입니다. 솔직한 대화로 오해를 풀어보세요." },
            reversed: { solo: "오해나 왜곡된 정보로 관계에 혼란이 생길 수 있는 시기입니다. 성급하게 판단하지 말고 직접 확인해보세요.", couple: "잘못된 소통으로 서로에 대한 오해가 쌓이고 있을 수 있습니다. 감정적으로 대응하기보다 사실을 먼저 짚어보세요." }
          },
          money: {
            upright: { consumption: "재정 상황을 명확하게 파악하며 불필요한 지출을 줄일 수 있는 시기입니다.", invest: "투자처에 대한 정보를 명확하게 파악하고 좋은 결정을 내리는 시기입니다. 분석한 만큼 확신을 갖고 움직여도 좋습니다." },
            reversed: { consumption: "잘못된 정보로 지출 판단이 흐려질 수 있는 시기입니다. 충동적인 결정을 조심하세요.", invest: "부정확한 정보로 투자 판단을 그르칠 수 있는 시기입니다. 출처를 다시 확인해보세요." }
          },
          career: {
            upright: { jobseek: "자신에게 맞는 방향이 명확해지는 시기입니다. 그 통찰을 믿고 지원할 곳을 좁혀보세요.", switch: "이직에 대한 마음이 명확해지며 중요한 결정을 내리는 시기입니다." },
            reversed: { jobseek: "혼란스러운 정보 속에서 판단이 흐려질 수 있는 시기입니다. 여러 의견에 휘둘리지 말고 스스로 정리해보세요.", switch: "잘못된 정보로 이직 결정을 그르칠 수 있으니 다시 한번 꼼꼼히 확인해보세요." }
          },
          business: {
            upright: { startup: "사업 아이템과 시장 상황을 명확하게 파악하고 좋은 결정을 내리는 시기입니다.", running: "그동안 애매했던 사업의 방향이 명확해지는 시기입니다. 통찰을 믿고 결단을 내려보세요." },
            reversed: { startup: "잘못된 시장 정보로 사업 판단이 흐려질 수 있는 시기입니다. 재검증이 필요합니다.", running: "혼란스러운 내부 정보로 의사결정이 흐려질 수 있는 시기입니다. 사실관계부터 명확히 하세요." }
          },
          study: {
            upright: { exam: "어려웠던 개념이 명확하게 이해되는 시기입니다. 막혔던 부분이 풀리며 학습에 속도가 붙을 수 있어요.", path: "진로에 대한 생각이 명확해지는 시기입니다. 흐릿했던 방향이 선명해지는 것을 느낄 수 있습니다." },
            reversed: { exam: "잘못된 정보나 오해로 혼란을 겪을 수 있는 시기입니다. 정확한 자료를 다시 확인해보세요.", path: "여러 의견에 휘둘려 진로에 대한 확신이 흔들릴 수 있는 시기입니다." }
          },
          health: {
            upright: { body: "몸 상태의 원인을 명확히 알게 되는 시기입니다. 정확한 진단이 문제 해결의 실마리가 됩니다.", mind: "머릿속이 명료해지며 판단력이 좋아지는 시기입니다. 복잡했던 생각이 정리되는 것을 느낄 수 있어요." },
            reversed: { body: "부정확한 정보로 잘못된 건강 판단을 할 수 있는 시기입니다. 전문가의 확인을 받아보세요.", mind: "혼란스러운 생각들로 머리가 복잡해질 수 있는 시기입니다. 잠시 정리할 시간이 필요합니다." }
          },
          relationships: {
            upright: { new: "관계에 대한 명확한 마음이나 진실이 드러나는 시기입니다. 솔직한 첫인상이 좋은 시작이 될 수 있어요.", existing: "그동안 애매했던 관계의 방향이 명확해지는 시기입니다. 솔직한 대화가 관계를 더 단단하게 만듭니다." },
            reversed: { new: "오해나 왜곡된 정보로 관계에 혼란이 생길 수 있는 시기입니다. 첫인상만으로 판단하지 마세요.", existing: "잘못된 소통으로 오해가 쌓이고 있을 수 있는 시기입니다. 직접 확인하는 대화가 필요합니다." }
          },
          workplace: {
            upright: { team: "업무에 대한 명확한 통찰로 팀의 중요한 결정을 이끄는 시기입니다.", personal: "업무에 대한 명확한 통찰로 중요한 결정을 내리는 시기입니다." },
            reversed: { team: "혼란스러운 정보 속에서 팀의 판단이 흐려질 수 있는 시기입니다. 사실관계를 공유하세요.", personal: "혼란스러운 정보 속에서 판단이 흐려질 수 있는 시기입니다." }
          },
          honor: { upright: "명확한 사실이 드러나며 평판이 바로잡히는 시기입니다. 진실이 밝혀지는 것이 유리하게 작용할 수 있어요.", reversed: "잘못된 소문으로 평판에 혼란이 생길 수 있는 시기입니다. 사실을 명확히 밝히는 것이 중요합니다." },
          moving: { upright: "이동에 대한 명확한 결정을 내리는 시기입니다. 흐릿했던 계획이 선명해지며 확신을 갖고 움직일 수 있어요.", reversed: "잘못된 정보로 이동 판단이 흐려질 수 있는 시기입니다. 조건을 다시 한번 정확히 확인해보세요." },
          children: { upright: "아이 문제의 원인을 명확히 알게 되는 시기입니다. 문제를 정확히 파악하면 해결의 실마리를 찾을 수 있어요.", reversed: "잘못된 정보로 아이에 대한 판단이 흐려질 수 있는 시기입니다. 성급한 결론보다 정확한 확인이 우선입니다." }
        } },
```

- [ ] **Step 2: 나머지 13장(소드 2~King)에 같은 패턴 적용**

Task 2 Step 2와 동일한 방식.

- [ ] **Step 3: 구조 검증**

Run (대상 파일만 교체한 동일 스크립트):
```bash
node -e "
const data = require('./data/tarot-data-swords.js').TAROT_SWORDS;
const subdivided = { love:['solo','couple'], money:['consumption','invest'], career:['jobseek','switch'], business:['startup','running'], study:['exam','path'], health:['body','mind'], relationships:['new','existing'], workplace:['team','personal'] };
const single = ['honor','moving','children'];
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    if (!card.keywords || !Array.isArray(card.keywords[o]) || card.keywords[o].length !== 3) errors.push(card.name_kr + ' keywords.' + o);
    if (!card.advice || typeof card.advice[o] !== 'string' || !card.advice[o]) errors.push(card.name_kr + ' advice.' + o);
  });
  Object.keys(subdivided).forEach(function (cat) {
    const keys = subdivided[cat];
    ['upright','reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      if (!entry || typeof entry[keys[0]] !== 'string' || typeof entry[keys[1]] !== 'string' || entry[keys[0]] === entry[keys[1]]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
  single.forEach(function (cat) {
    ['upright','reversed'].forEach(function (o) {
      if (typeof card.categories[cat][o] !== 'string' || !card.categories[cat][o]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All ' + data.length + ' swords cards valid'); }
"
```
Expected: `All 14 swords cards valid`

- [ ] **Step 4: 회귀 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)`

- [ ] **Step 5: Commit**

```bash
git add data/tarot-data-swords.js
git commit -m "content(tarot): enrich swords suit readings with subcategories and card extras"
```

---

## Task 6: 펜타클(Pentacles, 14장) 풍부화

**Files:**
- Modify: `data/tarot-data-pentacles.js`

**Interfaces:**
- Consumes: 없음
- Produces: Task 2와 동일한 필드 구조를 펜타클 14장에 적용

- [ ] **Step 1: "펜타클 에이스" 카드에 아래 정확한 내용 적용 — 이후 13장의 패턴 기준**

기존 "펜타클 에이스" 카드 객체(`rank: "Ace"`)를 다음으로 교체한다(기본 `upright`/`reversed` 텍스트는 절대 변경하지 않음):

```javascript
      { rank: "Ace", name_kr: "펜타클 에이스", upright: "새로운 기회와 함께 물질적 안정의 씨앗이 심어지는 시기입니다. 이 기회를 놓치지 말고 잡아보세요.", reversed: "좋은 기회를 놓치거나 계획이 지연되고 있을 수 있습니다. 다음 기회를 위해 지금 무엇을 준비할지 점검해보세요.",
        keywords: { upright: ["물질적 기회", "현실적 시작", "안정의 씨앗"], reversed: ["놓친 기회", "지연", "준비 부족"] },
        advice: { upright: "눈앞에 온 현실적인 기회를 놓치지 말고 지금 바로 잡아보세요.", reversed: "이번 기회를 놓쳤다면 다음을 위해 지금부터 무엇을 준비할지 점검해보세요." },
        categories: {
          love: {
            upright: { solo: "현실적이고 안정적인 만남이 시작될 수 있는 시기입니다. 화려함보다 진솔함이 느껴지는 사람에게 눈이 갈 수 있어요.", couple: "관계가 더 안정적인 단계로 발전하는 시기입니다. 함께하는 미래를 구체적으로 그려보기 좋은 때입니다." },
            reversed: { solo: "관계에서 좋은 기회를 놓치거나 시작이 지연될 수 있는 시기입니다. 너무 신중하기만 하면 기회를 놓칠 수 있어요.", couple: "관계 발전의 기회가 자꾸 미뤄지고 있을 수 있는 시기입니다. 먼저 한 걸음 다가가 보세요." }
          },
          money: {
            upright: { consumption: "필요한 곳에 안정적으로 지출할 수 있는 여유가 생기는 시기입니다.", invest: "새로운 재정적 기회가 시작되는 시기입니다. 장기적인 안목으로 좋은 씨앗을 심어보세요." },
            reversed: { consumption: "계획했던 지출이 지연되거나 예상보다 늘어날 수 있는 시기입니다.", invest: "좋은 투자 기회를 놓치거나 계획이 지연되고 있을 수 있는 시기입니다. 준비를 더 철저히 해두세요." }
          },
          career: {
            upright: { jobseek: "안정적인 일자리 기회가 찾아오는 시기입니다. 조건을 꼼꼼히 살펴보고 좋은 기회를 잡아보세요.", switch: "더 안정적인 자리로 이직할 기회가 시작되는 시기입니다." },
            reversed: { jobseek: "좋은 기회를 놓치거나 지원이 자꾸 미뤄질 수 있는 시기입니다. 서류 준비부터 다시 점검해보세요.", switch: "이직 기회가 지연되고 있을 수 있는 시기입니다. 조급해하지 말고 다음 기회를 준비하세요." }
          },
          business: {
            upright: { startup: "새로운 사업 기회의 씨앗이 심어지는 시기입니다. 작은 시작이 안정적인 성장으로 이어질 수 있어요.", running: "사업이 한 단계 안정되는 새로운 계기가 생기는 시기입니다." },
            reversed: { startup: "좋은 사업 기회를 놓치거나 계획이 지연되고 있는 시기입니다. 자금 준비를 다시 점검해보세요.", running: "예상했던 성장 기회가 미뤄지고 있을 수 있는 시기입니다." }
          },
          study: {
            upright: { exam: "실질적으로 도움이 되는 새로운 학습 방법이나 자료를 만나는 시기입니다.", path: "현실적으로 안정적인 진로의 실마리를 찾는 시기입니다. 눈앞의 기회를 잘 살펴보세요." },
            reversed: { exam: "좋은 학습 기회를 활용하지 못하고 놓칠 수 있는 시기입니다.", path: "현실적인 진로 결정이 자꾸 미뤄지고 있을 수 있는 시기입니다." }
          },
          health: {
            upright: { body: "건강 관리의 새로운 계기나 좋은 습관이 시작되는 시기입니다. 작은 습관이 큰 변화로 이어질 수 있어요.", mind: "현실적인 목표를 세우며 마음이 안정되는 시기입니다." },
            reversed: { body: "건강 관리를 시작할 기회를 계속 미루고 있을 수 있는 시기입니다. 오늘부터 작게라도 시작해보세요.", mind: "안정을 원하는 마음과 달리 상황이 자꾸 지연되며 답답함을 느낄 수 있습니다." }
          },
          relationships: {
            upright: { new: "현실적이고 안정적인 새로운 인연이 시작될 수 있는 시기입니다. 신뢰가 느껴지는 사람에게 마음이 열릴 수 있어요.", existing: "기존 관계가 더 단단하고 안정적으로 자리잡는 시기입니다." },
            reversed: { new: "관계에서 좋은 기회를 놓치거나 시작이 지연될 수 있는 시기입니다.", existing: "관계를 더 안정적으로 만들 기회가 자꾸 미뤄지고 있을 수 있습니다." }
          },
          workplace: {
            upright: { team: "팀 전체에 안정적인 새 프로젝트나 역할이 찾아오는 시기입니다.", personal: "새로운 일자리나 역할이 찾아오는 시기입니다. 조건을 꼼꼼히 살펴보세요." },
            reversed: { team: "팀에 좋은 기회가 왔지만 시작이 자꾸 미뤄지고 있을 수 있는 시기입니다.", personal: "좋은 기회를 놓치거나 시작이 자꾸 미뤄질 수 있는 시기입니다." }
          },
          honor: { upright: "실질적인 성과로 신뢰를 쌓기 시작하는 시기입니다. 꾸준함이 좋은 평판의 밑거름이 됩니다.", reversed: "평판을 쌓을 기회를 놓치고 있을 수 있는 시기입니다. 조급해하지 말고 차근차근 쌓아가세요." },
          moving: { upright: "안정적인 새 보금자리로 이동할 기회가 시작되는 시기입니다. 현실적인 조건을 잘 따져보고 결정하세요.", reversed: "좋은 이동 기회를 놓치거나 계획이 지연되고 있는 시기입니다. 준비를 조금 더 서둘러보세요." },
          children: { upright: "아이를 위한 새로운 기회가 시작되는 시기입니다. 현실적으로 도움이 될 지원을 찾아보세요.", reversed: "아이를 위한 좋은 기회를 놓치고 있을 수 있는 시기입니다. 정보를 더 꼼꼼히 살펴보세요." }
        } },
```

- [ ] **Step 2: 나머지 13장(펜타클 2~King)에 같은 패턴 적용**

Task 2 Step 2와 동일한 방식.

- [ ] **Step 3: 구조 검증**

Run (대상 파일만 교체한 동일 스크립트):
```bash
node -e "
const data = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const subdivided = { love:['solo','couple'], money:['consumption','invest'], career:['jobseek','switch'], business:['startup','running'], study:['exam','path'], health:['body','mind'], relationships:['new','existing'], workplace:['team','personal'] };
const single = ['honor','moving','children'];
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    if (!card.keywords || !Array.isArray(card.keywords[o]) || card.keywords[o].length !== 3) errors.push(card.name_kr + ' keywords.' + o);
    if (!card.advice || typeof card.advice[o] !== 'string' || !card.advice[o]) errors.push(card.name_kr + ' advice.' + o);
  });
  Object.keys(subdivided).forEach(function (cat) {
    const keys = subdivided[cat];
    ['upright','reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      if (!entry || typeof entry[keys[0]] !== 'string' || typeof entry[keys[1]] !== 'string' || entry[keys[0]] === entry[keys[1]]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
  single.forEach(function (cat) {
    ['upright','reversed'].forEach(function (o) {
      if (typeof card.categories[cat][o] !== 'string' || !card.categories[cat][o]) errors.push(card.name_kr + ' ' + cat + '.' + o);
    });
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All ' + data.length + ' pentacles cards valid'); }
"
```
Expected: `All 14 pentacles cards valid`

- [ ] **Step 4: 회귀 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)`

- [ ] **Step 5: Commit**

```bash
git add data/tarot-data-pentacles.js
git commit -m "content(tarot): enrich pentacles suit readings with subcategories and card extras"
```

---

## Task 7: 영구 회귀 테스트 추가 (전체 78장)

**Files:**
- Modify: `tests/tarot-data.test.js`

**Interfaces:**
- Consumes: `getFullDeck()` (Task 1에서 변경 없음), Task 2~6에서 채워진 78장 전체의 새 필드
- Produces: 없음(테스트만 추가)

- [ ] **Step 1: 78장 전체에 대한 구조 검증을 `tests/tarot-data.test.js` 끝에 추가**

파일의 마지막 줄(`console.log('All tarot-data tests passed (' + deck.length + ' cards)');`) 앞에 추가:

```javascript
// 카드당 부가정보(keywords/advice)와 세분화 카테고리 구조 검증
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

deck.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    assert.ok(card.keywords && Array.isArray(card.keywords[o]) && card.keywords[o].length === 3,
      card.name + ' keywords.' + o + ' must be an array of exactly 3 items');
    assert.ok(card.advice && typeof card.advice[o] === 'string' && card.advice[o].length > 0,
      card.name + ' advice.' + o + ' must be a non-empty string');
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

console.log('All 78 cards have valid keywords/advice/subdivided-category structure');
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)`와 `All 78 cards have valid keywords/advice/subdivided-category structure` 모두 출력, 에러 없음

- [ ] **Step 3: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 모두 통과, 에러 없음

- [ ] **Step 4: Commit**

```bash
git add tests/tarot-data.test.js
git commit -m "test(tarot): add comprehensive structural tests for enriched card data"
```

---

## Task 8: UI 마크업 — 하위 선택 버튼 (`index.html`)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: 없음
- Produces: `#subchoice-select` — Task 9(`app.js`)가 이 컨테이너에 버튼을 동적으로 렌더링한다.

- [ ] **Step 1: `#category-section`과 `#period-section` 사이에 컨테이너 추가**

기존:
```html
      </div>
    </div>

    <div id="period-section">
```
(위 `</div></div>`는 `#category-section`을 닫는 부분)

다음으로 교체:
```html
      </div>
    </div>

    <div id="subchoice-select" class="hidden"></div>

    <div id="period-section">
```

- [ ] **Step 2: 확인**

Run: `grep -c 'id="subchoice-select"' index.html`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(tarot): add subchoice button container markup"
```

---

## Task 9: `js/app.js` 통합 — 하위 선택 로직 + 키워드/조언 렌더링

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `#subchoice-select`(Task 8), 카드 데이터의 `keywords`/`advice`/세분화된 `categories`(Task 1~7)
- Produces: 없음(최종 통합 지점)

- [ ] **Step 1: 세분화 카테고리 매핑 추가**

`js/app.js`의 `const CATEGORY_LABELS = {...};` 선언 바로 뒤에 추가:

```javascript
  const CATEGORY_SUBCHOICES = {
    love: [{ key: 'solo', label: '솔로' }, { key: 'couple', label: '커플' }],
    money: [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }],
    career: [{ key: 'jobseek', label: '구직' }, { key: 'switch', label: '이직' }],
    business: [{ key: 'startup', label: '창업준비' }, { key: 'running', label: '운영중' }],
    study: [{ key: 'exam', label: '시험준비' }, { key: 'path', label: '진로고민' }],
    health: [{ key: 'body', label: '신체' }, { key: 'mind', label: '정신' }],
    relationships: [{ key: 'new', label: '새로운 인연' }, { key: 'existing', label: '기존 관계' }],
    workplace: [{ key: 'team', label: '팀워크' }, { key: 'personal', label: '개인성과' }]
  };
```

- [ ] **Step 2: 상태 변수와 DOM 참조 추가**

`let selectedMode = 'tarot';` 바로 뒤에 추가:

```javascript
  let selectedSubChoice = null;
```

`const spreadSelect = document.getElementById('spread-select');` 바로 뒤에 추가:

```javascript
  const subchoiceSelect = document.getElementById('subchoice-select');
```

- [ ] **Step 3: 하위 선택 렌더링 함수 추가**

`updatePeriodLock` 함수 정의 바로 앞에 추가:

```javascript
  function renderSubChoices() {
    const options = CATEGORY_SUBCHOICES[selectedCategory];
    if (!options) {
      subchoiceSelect.classList.add('hidden');
      subchoiceSelect.innerHTML = '';
      selectedSubChoice = null;
      return;
    }
    selectedSubChoice = options[0].key;
    subchoiceSelect.innerHTML = options.map(function (opt, idx) {
      return '<button type="button" class="category-btn subchoice-btn' + (idx === 0 ? ' selected' : '') + '" data-subchoice="' + opt.key + '">' + opt.label + '</button>';
    }).join('');
    subchoiceSelect.classList.remove('hidden');
    subchoiceSelect.querySelectorAll('.subchoice-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        subchoiceSelect.querySelectorAll('.subchoice-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedSubChoice = btn.dataset.subchoice;
      });
    });
  }

```

- [ ] **Step 4: 카테고리 클릭 핸들러에서 `renderSubChoices()` 호출**

기존:
```javascript
  categoryButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCategory = btn.dataset.category || null;
      updatePeriodLock();
    });
  });

  updatePeriodLock();
```

다음으로 교체:
```javascript
  categoryButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCategory = btn.dataset.category || null;
      renderSubChoices();
      updatePeriodLock();
    });
  });

  renderSubChoices();
  updatePeriodLock();
```

- [ ] **Step 5: `showSummary`에서 세분화된 카테고리 텍스트 조회 + 키워드/조언 박스 렌더링**

기존:
```javascript
  function showSummary(draw) {
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩 요약';

    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? categoryReading[item.orientation]
        : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;
      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        '<p>' + meaning + '</p>' +
        '</div>';
    });
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

다음으로 교체:
```javascript
  function showSummary(draw) {
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩 요약';

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
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }
```

- [ ] **Step 6: `saveCurrentReading`에 `subChoice` 필드 추가**

기존:
```javascript
  function saveCurrentReading(draw) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'tarot',
      category: selectedCategory,
      period: selectedPeriod,
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    saveReading(storage, entry);
  }
```

다음으로 교체:
```javascript
  function saveCurrentReading(draw) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'tarot',
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    saveReading(storage, entry);
  }
```

- [ ] **Step 7: "새 리딩 시작" 리셋 로직에 하위 선택 리셋 추가**

`newReadingButton.addEventListener('click', function () { ... })` 블록 안, 다음 기존 코드:
```javascript
    categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
    categoryButtons[0].classList.add('selected');
    selectedCategory = null;
    updatePeriodLock();
```

다음으로 교체:
```javascript
    categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
    categoryButtons[0].classList.add('selected');
    selectedCategory = null;
    renderSubChoices();
    updatePeriodLock();
```

- [ ] **Step 8: Node 문법 체크**

Run: `node --check js/app.js`
Expected: 에러 없음(0 exit code)

- [ ] **Step 9: Commit**

```bash
git add js/app.js
git commit -m "feat(tarot): wire subchoice selection and keyword/advice rendering into app.js"
```

---

## Task 10: 스타일링 (`css/style.css`)

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `#subchoice-select`, `.subchoice-btn`(Task 8~9가 만든 id/class — `.subchoice-btn`은 `.category-btn`도 함께 가지므로 기본 버튼 스타일은 이미 적용됨)
- Produces: 없음

- [ ] **Step 1: 파일 끝에 스타일 추가**

파일 맨 끝에 추가:

```css

#subchoice-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: -12px 0 20px;
}

.card-extra {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #4a3a68;
}

.card-keywords { margin: 0 0 4px; font-size: 12px; color: #d4af37; }
.card-advice { margin: 0; font-size: 13px; color: #c9bde0; }
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "style(tarot): style subchoice buttons and card extra info box"
```

---

## Task 11: 브라우저 확인 + 전체 회귀

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~10의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 확인**

1. 타로 모드에서 "연애운" 카테고리 선택 → "솔로"/"커플" 하위 버튼이 나타나는지 확인
2. "명예운" 선택 → 하위 버튼이 사라지는지 확인 (단일 유지 카테고리)
3. "오늘의운"(카테고리 미선택) 상태 → 하위 버튼이 보이지 않는지 확인
4. "연애운" + "커플" 선택 후 카드 1장 뽑기 → 카드 뒤집으면 2~3문장 해설 + "키워드: OO · OO · OO" + "조언: ..." 박스가 함께 보이는지 확인
5. "새 리딩 시작" 클릭 → 카테고리와 하위 선택이 초기화되는지 확인
6. "지난 기록" 열어서 방금 리딩이 정상적으로 표시되는지 확인(기존 형식 그대로)
7. 콘솔에 에러가 없는지 확인

Expected: 위 7가지 모두 기대한 대로 동작, 콘솔 에러 없음

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(tarot): ...` 커밋 추가).
