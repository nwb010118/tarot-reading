# 타로 categories 랜덤화 — 완드(Wands) 콘텐츠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/tarot-data-wands.js`의 완드 14장(Ace~King) 전체 `categories`(카드당 19개 필드 × 2방향)를 `{a:[3],b:[3]}` 랜덤화 풀로 변환한다. [[project-tarot-categories-randomization]]의 콘텐츠 2단계, 첫 서브프로젝트.

**Architecture:** 각 카테고리 필드는 이미 정확히 2문장(관찰 1문장 + 조언 1문장)이다. 문장1→`a[0]`(잠김), 문장2→`b[0]`(잠김)으로 기계적으로 나누고, `a[1,2]`/`b[1,2]`에 원본과 어휘·구조가 다른 새 문장을 창작해 추가한다. 1단계 인프라([[project-tarot-categories-randomization]] 참고, 커밋 `ca1655e`+`f9fa409`)에서 `tests/tarot-data.test.js`가 이미 문자열/풀 자동 감지 + 카테고리 풀 전용 dedup 축(자기중복/echo/금지쌍/카드간 완전동일+근접축자/keyword echo/dangling-clause)을 전부 갖췄으므로, **별도 검증 스크립트 없이 `node scripts/run-tests.js` 하나로 완전한 검증이 된다** — 이전 upright/reversed 랜덤화 때 썼던 `.superpowers/scratch-verify-tarot.js` 패턴은 이번엔 불필요.

**Tech Stack:** 순수 데이터 파일 편집(JS 객체 리터럴), Node.js 내장 `assert` 기반 회귀 테스트.

## Global Constraints

- **대상은 오직 `categories`뿐이다.** `upright`/`reversed`/`keywords`/`advice`는 이미 이전 프로젝트에서 랜덤화 완료됐으므로 이번 플랜의 어떤 태스크도 건드리지 않는다.
- **완드 에이스(Ace)의 예외 7개 필드는 변환하지 않는다** — 전부 `reversed` 방향, 1문장뿐이라 잠긴 카드 규칙상 영구히 문자열로 남는다: `money.consumption`, `career.switch`, `business.running`, `study.path`, `health.mind`, `relationships.existing`, `workplace.team`. 이 7개는 그대로 두고 나머지 완드 에이스 필드(정방향 19개 전부 + 역방향 12개)만 변환한다.
- **인덱스 0(문장1→`a[0]`, 문장2→`b[0]`)은 원본 문장을 한 글자도 바꾸지 않고 그대로 옮긴다.** 절대 재작성하지 않는다.
- **신규 변형(`a[1,2]`/`b[1,2]`)은 원본과 핵심 어휘·문장 구조를 공유하지 않는다** — 최소 2개 이상의 실질 단어가 겹치거나 문장 뼈대(연속 5자 이상 공통 부분열)가 같으면 dedup 검증에서 걸린다.
- **금지쌍 주의**: `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 서로 다른 카테고리라도 내용이 겹치면 안 된다(단, 잠긴 문장끼리, 즉 각 카테고리의 `a[0]`/`b[0]`끼리는 이미 배포된 콘텐츠라 겹쳐도 검사에서 자동 제외된다 — 신규로 쓰는 `a[1,2]`/`b[1,2]`가 서로 다른 카테고리의 어떤 인덱스와도 겹치지 않게만 신경 쓰면 된다).
- **advice/keywords와의 echo 주의**: 새로 쓰는 카테고리 문장이 같은 카드·같은 방향의 `advice` 3개 변형이나 `keywords` 6개와 겹치는 어휘/뼈대를 쓰면 안 된다. 태스크를 시작하기 전에 해당 카드의 `advice`/`keywords`를 먼저 확인해둘 것.
- **검증은 매 태스크 끝에 `node scripts/run-tests.js` 10/10 통과 하나로 충분하다.** 실패하면 출력된 각 항목에서 **신규(비잠금) 쪽만** 다시 써서 재실행 — 잠긴 인덱스0/기존 advice/keywords는 절대 수정하지 않는다.
- 각 태스크는 배정된 카드들의 **`categories` 블록만** 수정한 `data/tarot-data-wands.js` 커밋 하나로 끝난다.

## 콘텐츠 작성 패턴 (전 태스크 공통)

카드 하나의 세분화 카테고리 필드 예시(`love.solo`, 상상 속 카드 기준, 변환 전 → 후):

```js
// 변환 전
love: { upright: { solo: "설렘 가득한 새로운 만남이나 연애의 시작이 다가올 수 있는 시기입니다. 마음이 끌리는 사람이 있다면 먼저 다가가 보는 용기가 좋은 결과로 이어질 수 있어요.", couple: "..." }, reversed: { ... } }

// 변환 후 (해당 필드만 발췌)
love: {
  upright: {
    solo: {
      a: [
        "설렘 가득한 새로운 만남이나 연애의 시작이 다가올 수 있는 시기입니다.",
        "예상치 못한 인연이 스치듯 다가오며 마음을 두근거리게 하는 시기입니다.",
        "새로운 사람에게 자연스레 관심이 향하며 기대감이 차오르는 시기입니다."
      ],
      b: [
        "마음이 끌리는 사람이 있다면 먼저 다가가 보는 용기가 좋은 결과로 이어질 수 있어요.",
        "호감이 느껴지는 상대에게 솔직한 태도로 다가가면 좋은 흐름이 이어질 수 있습니다.",
        "끌리는 마음을 숨기지 말고 자연스럽게 표현해보면 인연으로 이어질 수 있어요."
      ]
    },
    couple: { ... }
  },
  reversed: { ... }
}
```

절차:
1. 기존 2문장 문자열에서 문장1을 `a[0]`, 문장2를 `b[0]`으로 그대로 옮긴다(잠김).
2. `a[1]`, `a[2]`에 `a[0]`과 같은 주제(그 카테고리·방향의 "상황 관찰")를 다른 어휘/문장 구조로 표현한 새 문장을 쓴다.
3. `b[1]`, `b[2]`에 `b[0]`과 같은 주제("조언/제안")를 다른 어휘/문장 구조로 표현한 새 문장을 쓴다.
4. 세분화 카테고리(`love/money/career/business/study/health/relationships/workplace`)는 `{a,b}`가 `upright.<subkey>`/`reversed.<subkey>` 안에 들어가고, 단일 카테고리(`honor/moving/children`)는 `{a,b}`가 `upright`/`reversed` 자리에 직접 들어간다(하위키 없음) — 기존 문자열이 있던 자리를 그대로 객체로 치환.
5. 카드 1장(19개 필드 × 2방향 = 최대 38개 필드) 전체를 이 패턴으로 변환한 뒤, 다음 카드로 넘어간다.

---

### Task 1: 완드 Ace, 2, 3

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: 없음(이 플랜의 첫 태스크). 1단계 인프라(커밋 `ca1655e`, `f9fa409`)가 이미 병합되어 있어야 함 — `tests/tarot-data.test.js`가 문자열/풀 자동 감지를 지원하는 상태.
- Produces: 완드 Ace/2/3 3장의 `categories`가 전부(Ace는 7개 예외 필드 제외) 풀 shape으로 변환 완료.

- [ ] **Step 1: 완드 Ace의 `categories` 변환**

`data/tarot-data-wands.js`에서 `rank: "Ace"`(파일 최상단 카드) 블록의 `categories`를 위 패턴대로 변환한다. **단, Global Constraints에 명시한 7개 예외 필드(`reversed.money.consumption`, `reversed.career.switch`, `reversed.business.running`, `reversed.study.path`, `reversed.health.mind`, `reversed.relationships.existing`, `reversed.workplace.team`)는 문자열 그대로 두고 절대 객체로 바꾸지 않는다.** 나머지 필드(정방향 19개 전부 + 역방향 12개, 총 31개)를 전부 변환한다.

- [ ] **Step 2: 완드 2의 `categories` 변환**

`rank: "2"` 블록의 `categories` 19개 필드 × 2방향(예외 없음, 전부 변환) 총 38개 필드를 위 패턴대로 변환한다.

- [ ] **Step 3: 완드 3의 `categories` 변환**

`rank: "3"` 블록의 `categories` 38개 필드 전부를 위 패턴대로 변환한다.

- [ ] **Step 4: 검증**

Run: `node scripts/run-tests.js`
Expected: `10 test files, 10 passed, 0 failed`. 실패 시 출력된 항목의 신규(비잠금) 문장만 다시 써서 재실행.

- [ ] **Step 5: 문법 검증**

Run: `node --check data/tarot-data-wands.js`
Expected: 출력 없음(문법 오류 없음).

- [ ] **Step 6: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "$(cat <<'EOF'
content(tarot): convert wands Ace/2/3 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 완드 4, 5, 6

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: Task 1이 변환한 Ace/2/3(cross-card 축의 비교 대상으로 이미 존재).
- Produces: 완드 4/5/6 3장 추가 변환 완료(누적 6/14장).

- [ ] **Step 1: 완드 4, 5, 6의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-wands.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "$(cat <<'EOF'
content(tarot): convert wands 4/5/6 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 완드 7, 8, 9

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: Task 1~2가 변환한 6장.
- Produces: 완드 7/8/9 3장 추가 변환 완료(누적 9/14장).

- [ ] **Step 1: 완드 7, 8, 9의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-wands.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "$(cat <<'EOF'
content(tarot): convert wands 7/8/9 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 완드 10, 시종(Page), 기사(Knight)

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: Task 1~3이 변환한 9장.
- Produces: 완드 10/Page/Knight 3장 추가 변환 완료(누적 12/14장).

- [ ] **Step 1: 완드 10, Page(시종), Knight(기사)의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-wands.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "$(cat <<'EOF'
content(tarot): convert wands 10/page/knight categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 완드 퀸(Queen), 킹(King)

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: Task 1~4가 변환한 12장.
- Produces: 완드 Queen/King 2장 추가 변환 완료(누적 14/14장 — **완드 슈트 전체 완료**).

- [ ] **Step 1: 완드 Queen(퀸), King(킹)의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 완드 슈트 전체 변환 완료 확인**

Run:
```bash
node -e "
global.TAROT_MAJOR_ARCANA = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('./data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('./data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('./data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('./data/tarot-data.js');
const deck = getFullDeck();
const wands = deck.filter(c => c.cardId.indexOf('wands_') === 0);
let converted = 0, stringFields = 0;
const SUBDIVIDED = {love:['solo','couple'],money:['consumption','invest'],career:['jobseek','switch'],business:['startup','running'],study:['exam','path'],health:['body','mind'],relationships:['new','existing'],workplace:['team','personal']};
const SINGLE = ['honor','moving','children'];
wands.forEach(function (card) {
  ['upright','reversed'].forEach(function (o) {
    Object.keys(SUBDIVIDED).forEach(function (cat) {
      SUBDIVIDED[cat].forEach(function (sub) {
        const v = card.categories[cat][o][sub];
        if (typeof v === 'object') converted++; else stringFields++;
      });
    });
    SINGLE.forEach(function (cat) {
      const v = card.categories[cat][o];
      if (typeof v === 'object') converted++; else stringFields++;
    });
  });
});
console.log('wands converted fields:', converted, '/ still-string fields:', stringFields, '(expect 7 -- the wands_Ace exceptions)');
"
```
Expected: `wands converted fields: 525 / still-string fields: 7`(14장 × 38 - 7 = 525).

- [ ] **Step 4: 문법 검증**

Run: `node --check data/tarot-data-wands.js`

- [ ] **Step 5: 커밋**

```bash
git add data/tarot-data-wands.js
git commit -m "$(cat <<'EOF'
content(tarot): convert wands queen/king categories to a/b pool structure

Completes the wands suit (14/14 cards) for the categories
randomization project's content phase. All 525 convertible category
fields (14 cards x 38 fields - 7 wands_Ace single-sentence exceptions)
are now {a,b} pools; the 7 exceptions remain locked strings per design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
