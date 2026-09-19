# 타로 categories 랜덤화 — 메이저 아르카나(Major Arcana) 콘텐츠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/tarot-data-major.js`의 메이저 아르카나 22장(바보~세계) 전체 `categories`(카드당 19개 필드 × 2방향)를 `{a:[3],b:[3]}` 랜덤화 풀로 변환한다. [[project-tarot-categories-randomization]]의 콘텐츠 2단계, **마지막 서브프로젝트**(완드/컵/소드/펜타클 56장은 이미 완료·master 병합됨).

**Architecture:** 이전 4개 서브프로젝트와 완전히 동일한 아키텍처를 재사용한다. 각 카테고리 필드는 이미 정확히 2문장(관찰 1문장 + 조언 1문장)이다. 문장1→`a[0]`(잠김), 문장2→`b[0]`(잠김)으로 기계적으로 나누고, `a[1,2]`/`b[1,2]`에 원본과 어휘·구조가 다른 새 문장을 창작해 추가한다. 1단계 인프라(커밋 `ca1655e`+`f9fa409`)에서 `tests/tarot-data.test.js`가 이미 문자열/풀 자동 감지 + 카테고리 풀 전용 dedup 축을 전부 갖췄으므로, **별도 검증 스크립트 없이 `node scripts/run-tests.js` 하나로 완전한 검증이 된다**.

**Tech Stack:** 순수 데이터 파일 편집(JS 객체 리터럴), Node.js 내장 `assert` 기반 회귀 테스트.

**카드 식별자 차이 주의**: 완드/컵/소드/펜타클은 `rank`(`"Ace"`, `"2"`, ... `"King"`) 필드로 카드를 구분했지만, `data/tarot-data-major.js`의 `TAROT_MAJOR_ARCANA` 배열은 **`id`(0~21, 숫자) + `name_en`/`name_kr`**로 카드를 구분한다(`rank` 필드 없음). 아래 태스크의 카드 지정은 전부 `id` 기준이다.

## Global Constraints

- **대상은 오직 `categories`뿐이다.** `upright`/`reversed`/`keywords`/`advice`는 이미 이전 프로젝트에서 랜덤화 완료됐으므로 이번 플랜의 어떤 태스크도 건드리지 않는다. 편집은 항상 **특정 필드 단위의 targeted edit**로만 한다 — 파일 전역에 걸친 일괄 find-replace(bulk regex 등)는 절대 쓰지 않는다(컵 Task2에서 범위 밖 카드까지 건드린 스코프 누출 사고 실제 발생).
- **바보(id=0, `major_0`)의 예외 4개 필드는 변환하지 않는다** — 전부 1문장뿐이라 잠긴 카드 규칙상 영구히 문자열로 남는다: `reversed.career.jobseek`, `reversed.study.path`, `reversed.health.body`, `reversed.relationships.new`. 이 4개는 그대로 두고 나머지 바보 필드(정방향 19개 전부 + 역방향 15개, 총 34개)만 변환한다. **다른 21장(id 1~21)은 예외 없음 — 전부 38개 필드 변환.**
- **인덱스 0(문장1→`a[0]`, 문장2→`b[0]`)은 원본 문장을 한 글자도 바꾸지 않고 그대로 옮긴다.** 절대 재작성하지 않는다.
- **신규 변형(`a[1,2]`/`b[1,2]`)은 원본과 핵심 어휘·문장 구조를 공유하지 않는다** — 최소 2개 이상의 실질 단어가 겹치거나 문장 뼈대(연속 5자 이상 공통 부분열)가 같으면 dedup 검증에서 걸린다. 매 필드마다 `a[0]`/`b[0]`과 확실히 다른 핵심 이미지/각도를 고를 것 — 단순 동의어 치환은 이전 4개 서브프로젝트 전부에서 1순위 재작업 원인이었다.
- **금지쌍 주의**: `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 서로 다른 카테고리라도 내용/어휘가 겹치면 안 된다(단, 잠긴 문장끼리, 즉 각 카테고리의 `a[0]`/`b[0]`끼리는 이미 배포된 콘텐츠라 겹쳐도 검사에서 자동 제외된다). 각 카테고리에 뚜렷이 다른 소재를 의식적으로 배정할 것 — `love`=연애, `relationships`=일반 인간관계/가족/우정; `career`=개인 이직·구직, `workplace`=팀 역학·일상 업무; `money`=개인 재정, `business`=사업 운영.
- **advice/keywords와의 echo 주의**: 새로 쓰는 카테고리 문장이 같은 카드·같은 방향의 `advice` 3개 변형이나 `keywords` 6개와 겹치는 어휘/뼈대를 쓰면 안 된다(키워드가 더 긴 단어 속에 **부분 문자열**로 섞여 들어가는 경우도 포함). 태스크를 시작하기 전에 해당 카드의 `advice`/`keywords`를 먼저 확인해둘 것.
- **"흐름입니다" 종결 금지**: 새 문장을 `...흐름입니다.`로 끝내지 말 것. 이 어미는 `tests/tarot-data.test.js`의 `BOILERPLATE_SUFFIXES` 목록에 없어서, 이 어미로 끝나는 두 문장은 내용과 무관하게 LCS만으로 자동 충돌 처리된다. `...시기입니다.`/`...해보세요.`/`...도움이 됩니다.` 등 이미 안전한 어미만 사용할 것.
- **검증은 매 태스크 끝에 `node scripts/run-tests.js` 10/10 통과 하나로 충분하다.** 실패하면 출력된 각 항목에서 **신규(비잠금) 쪽만** 다시 써서 재실행 — 잠긴 인덱스0/기존 advice/keywords는 절대 수정하지 않는다.
- **재작성 시 전체 데이터셋 대비 사전 확인**: dedup 충돌을 고칠 때 "원래 충돌 상대만" 확인하고 재작성하면 제3의 카드와 새로 충돌하는 회귀가 날 수 있다([[feedback-fix-forward-and-global-reverify]]). 재작성한 문장은 같은 필드의 메이저 22장 전체(및 이미 변환된 완드·컵·소드·펜타클 56장) 대비로 확인 후에만 파일에 반영한다.
- 각 태스크는 배정된 카드들의 **`categories` 블록만** 수정한 `data/tarot-data-major.js` 커밋 하나로 끝난다.
- **크래시 복구 시**: 세션 rate limit으로 subagent가 중단되는 일이 매우 흔하다. 절대 폐기하지 말고 `git status`/`git diff --stat`/`node --check`(★ 반드시 테스트보다 먼저 — 크래시 직후 저장된 초안에 실제 구문 오류가 남아있을 수 있다)/`node scripts/run-tests.js` 순서로 실제 상태를 확인한 뒤 "기존 미완성 초안을 이어받아 fix-forward하라"고 새 subagent(또는 재개된 동일 subagent)에게 지시한다.
- **슈트 전체 완료 후 필수 단계**: 마지막 콘텐츠 태스크(Task 8) 완료 직후, `node scripts/run-tests.js` 10/10 통과와 별개로 메이저 22장 전체에 대한 all-pairs 강한 comparator 스윕을 수행한다(아래 Task 9). **이번 스윕 스크립트는 소드/펜타클 최종 리뷰에서 발견된 버그를 전부 수정한 버전이다** — 아래 Task 9의 스크립트를 그대로 사용할 것(직접 재구현하지 말 것). 특히 강신호 판정 시 `fullCombinedIssues`의 원시 발화 조건(느슨함)을 그대로 강신호로 오인하지 말고, 프로젝트가 정의한 진짜 강신호 기준(word-Jaccard≥0.3 또는 LCS≥10)만 강신호로 센다.

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
2. `a[1]`, `a[2]`에 `a[0]`과 같은 주제(그 카테고리·방향의 "상황 관찰")를 다른 어휘/문장구조로 표현한 새 문장을 쓴다.
3. `b[1]`, `b[2]`에 `b[0]`과 같은 주제("조언/제안")를 다른 어휘/문장구조로 표현한 새 문장을 쓴다.
4. 세분화 카테고리(`love/money/career/business/study/health/relationships/workplace`)는 `{a,b}`가 `upright.<subkey>`/`reversed.<subkey>` 안에 들어가고, 단일 카테고리(`honor/moving/children`)는 `{a,b}`가 `upright`/`reversed` 자리에 직접 들어간다(하위키 없음) — 기존 문자열이 있던 자리를 그대로 객체로 치환.
5. 카드 1장(19개 필드 × 2방향 = 최대 38개 필드) 전체를 이 패턴으로 변환한 뒤, 다음 카드로 넘어간다.

카드는 `TAROT_MAJOR_ARCANA` 배열에서 `id`로 찾는다(배열 순서 = id 순서 0~21, `rank` 필드는 없음).

---

### Task 1: 메이저 id 0(바보), 1(마법사), 2(여사제)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: 없음(이 플랜의 첫 태스크). 인프라(커밋 `ca1655e`, `f9fa409`)와 완드·컵·소드·펜타클 서브프로젝트가 이미 병합되어 있어야 함.
- Produces: id 0/1/2 3장의 `categories`가 전부(id 0은 4개 예외 필드 제외) 풀 shape으로 변환 완료.

- [ ] **Step 1: id=0(바보)의 `categories` 변환**

`data/tarot-data-major.js`에서 `id: 0`(파일 최상단 카드) 블록의 `categories`를 위 패턴대로 변환한다. **단, Global Constraints에 명시한 4개 예외 필드(`reversed.career.jobseek`, `reversed.study.path`, `reversed.health.body`, `reversed.relationships.new`)는 문자열 그대로 두고 절대 객체로 바꾸지 않는다.** 나머지 필드(정방향 19개 전부 + 역방향 15개, 총 34개)를 전부 변환한다.

- [ ] **Step 2: id=1(마법사)의 `categories` 변환**

`id: 1` 블록의 `categories` 19개 필드 × 2방향(예외 없음, 전부 변환) 총 38개 필드를 위 패턴대로 변환한다.

- [ ] **Step 3: id=2(여사제)의 `categories` 변환**

`id: 2` 블록의 `categories` 38개 필드 전부를 위 패턴대로 변환한다.

- [ ] **Step 4: 검증**

Run: `node scripts/run-tests.js`
Expected: `10 test files, 10 passed, 0 failed`. 실패 시 출력된 항목의 신규(비잠금) 문장만 다시 써서 재실행.

- [ ] **Step 5: 문법 검증**

Run: `node --check data/tarot-data-major.js`
Expected: 출력 없음(문법 오류 없음).

- [ ] **Step 6: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 0/1/2 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 메이저 id 3(여황제), 4(황제), 5(교황)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1이 변환한 id 0/1/2(cross-card 축의 비교 대상으로 이미 존재).
- Produces: id 3/4/5 3장 추가 변환 완료(누적 6/22장).

- [ ] **Step 1: id 3, 4, 5의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 3/4/5 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 메이저 id 6(연인), 7(전차), 8(힘)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~2가 변환한 6장.
- Produces: id 6/7/8 3장 추가 변환 완료(누적 9/22장).

- [ ] **Step 1: id 6, 7, 8의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 6/7/8 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 메이저 id 9(은둔자), 10(운명의 수레바퀴), 11(정의)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~3이 변환한 9장.
- Produces: id 9/10/11 3장 추가 변환 완료(누적 12/22장).

- [ ] **Step 1: id 9, 10, 11의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 9/10/11 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 메이저 id 12(매달린 사람), 13(죽음), 14(절제)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~4가 변환한 12장.
- Produces: id 12/13/14 3장 추가 변환 완료(누적 15/22장).

- [ ] **Step 1: id 12, 13, 14의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 12/13/14 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 메이저 id 15(악마), 16(탑), 17(별)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~5가 변환한 15장.
- Produces: id 15/16/17 3장 추가 변환 완료(누적 18/22장).

- [ ] **Step 1: id 15, 16, 17의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 15/16/17 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 메이저 id 18(달), 19(태양), 20(심판)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~6이 변환한 18장.
- Produces: id 18/19/20 3장 추가 변환 완료(누적 21/22장).

- [ ] **Step 1: id 18, 19, 20의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 18/19/20 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 메이저 id 21(세계)

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: Task 1~7이 변환한 21장.
- Produces: id 21 1장 추가 변환 완료(누적 22/22장 — **메이저 아르카나 콘텐츠 전체 완료**).

- [ ] **Step 1: id 21(세계)의 `categories` 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 메이저 아르카나 전체 변환 완료 확인**

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
const major = deck.filter(c => c.cardId.indexOf('major_') === 0);
let converted = 0, stringFields = 0;
const SUBDIVIDED = {love:['solo','couple'],money:['consumption','invest'],career:['jobseek','switch'],business:['startup','running'],study:['exam','path'],health:['body','mind'],relationships:['new','existing'],workplace:['team','personal']};
const SINGLE = ['honor','moving','children'];
major.forEach(function (card) {
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
console.log('major converted fields:', converted, '/ still-string fields:', stringFields, '(expect 4 -- the major_0 exceptions)');
"
```
Expected: `major converted fields: 832 / still-string fields: 4`(22장 × 38 - 4 = 832).

- [ ] **Step 4: 문법 검증**

Run: `node --check data/tarot-data-major.js`

- [ ] **Step 5: 커밋**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
content(tarot): convert major 21 categories to a/b pool structure

Completes the major arcana content (22/22 cards) for the categories
randomization project's content phase -- the final suite. All 832
convertible category fields (22 cards x 38 fields - 4 major_0
single-sentence exceptions) are now {a,b} pools; the 4 exceptions
remain locked strings per design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 메이저 아르카나 전체 all-pairs 강한 comparator 스윕 (최종 리뷰)

완드·컵·소드·펜타클 서브프로젝트의 최종 리뷰에서, 자동 CI의 cross-card 축(LCS≥20)이 구조적으로 느슨해 실제 근접중복을 놓치는 것이 반복적으로 드러났다([[project-tarot-categories-randomization]] 참고). 같은 문제를 메이저에서도 사전에 잡기 위해, 병합 전에 메이저 22장 전체(+이미 변환된 완드·컵·소드·펜타클 56장과의 교차 비교 포함)에 대해 강한 comparator 전수 비교 스크립트를 돌린다.

**이 스크립트는 이전 서브프로젝트 최종 리뷰에서 발견된 모든 버그를 수정한 버전이다 — 반드시 그대로 사용할 것(재구현하지 말 것):**
1. 이중 루프에서 `match.v.a[y]`를 정확히 사용(컵 Task6 스크립트의 실수로 `[x]`를 두 번 써서 잠금-잠금 스킵 가드가 무력화된 적이 있었다).
2. `keywords` 인자를 항상 전달(없으면 `fullCombinedIssues`가 크래시함).
3. b-pool도 word-Jaccard뿐 아니라 LCS≥10 기준을 포함.
4. 대상 슈트(메이저)뿐 아니라 이미 변환된 전 슈트(완드+컵+소드+펜타클)까지 교차 비교.
5. **강신호(strong-signal) 판정을 정확히 한다** — 펜타클 최종 리뷰에서, 원시 `fullCombinedIssues` 발화 조건(LCS≥5 OR 공유 어간≥2 OR bigram≥0.185, 매우 민감)을 그대로 "강신호"로 잘못 세는 죽은 변수(`isActionable`) 버그가 실제로 있었다. 진짜 강신호 기준은 **word-Jaccard≥0.3 또는 LCS≥10뿐**이며, 아래 스크립트는 원시 진단(raw diagnostics)과 강신호(strong)를 명확히 분리해서 출력한다.
6. **actionable(수정 가능) 판정**: 메이저 내부(메이저×메이저) 비교에서 최소 한쪽이 비잠금(index≠0)일 때만 actionable로 분류한다. 메이저×기존 슈트(완드/컵/소드/펜타클) 비교는 상대 슈트가 이미 배포·병합된 콘텐츠이므로 **항상 immutable**(이전 서브프로젝트들의 확립된 관례 — 회귀가 아니며 수정 대상이 아님).

**Files:**
- Create (scratch, 커밋하지 않음): `.superpowers/scratch-verify-major-sweep.js` (이미 `.gitignore`의 `.superpowers/`에 걸림)

**Interfaces:**
- Consumes: Task 1~8이 완성한 메이저 22장 전체 `categories`, 이미 병합된 완드 14장·컵 14장·소드 14장·펜타클 14장.
- Produces: 강신호(strong-signal) actionable 근접중복 0건이 확인된 최종 상태, 위반 발견 시 `data/tarot-data-major.js`에 대한 fix 커밋(다른 4개 슈트의 기존 콘텐츠는 이 태스크에서 수정 대상이 아니다 — 메이저 쪽 문장만 재작성).

- [ ] **Step 1: 전수 비교 스크립트 작성 및 실행**

```js
// .superpowers/scratch-verify-major-sweep.js
const {
  wordJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems, makeFullCombinedIssues
} = require('../tests/helpers/dedup.js');

const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);

function longestCommonSubstringLen(a, b) {
  const dp = Array(a.length + 1).fill(null).map(function () { return new Array(b.length + 1).fill(0); });
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; if (dp[i][j] > max) max = dp[i][j]; }
    }
  }
  return max;
}

// The real strong-signal bar this project uses (NOT fullCombinedIssues' own raw trigger,
// which fires on LCS>=5 OR shared-stems>=2 OR bigram>=0.185 -- much more sensitive and NOT
// the same thing as "strong". Conflating the two produced a mislabeled count in a prior suite's review.)
function isStrongA(s1, s2, keywords) {
  const wj = wordJaccard(s1, s2);
  if (wj >= 0.3) return true;
  // fullCombinedIssues already computes an internal LCS on boilerplate-stripped, keyword-stripped text;
  // recompute the same LCS>=10 check directly here for a self-contained strong-signal bar.
  const lcs = longestCommonSubstringLen(stripBoilerplateSuffix(s1), stripBoilerplateSuffix(s2));
  return lcs >= 10;
}

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('../data/tarot-data.js');
const deck = getFullDeck();
const major = deck.filter(function (c) { return c.cardId.indexOf('major_') === 0; });
const priorConverted = deck.filter(function (c) {
  return c.cardId.indexOf('wands_') === 0 || c.cardId.indexOf('cups_') === 0 ||
         c.cardId.indexOf('swords_') === 0 || c.cardId.indexOf('pentacles_') === 0;
});
const compareTargets = major.concat(priorConverted);

const SUBDIVIDED = {love:['solo','couple'],money:['consumption','invest'],career:['jobseek','switch'],business:['startup','running'],study:['exam','path'],health:['body','mind'],relationships:['new','existing'],workplace:['team','personal']};
const SINGLE = ['honor','moving','children'];

function fields(card) {
  const out = [];
  ['upright', 'reversed'].forEach(function (o) {
    Object.keys(SUBDIVIDED).forEach(function (cat) {
      SUBDIVIDED[cat].forEach(function (sub) {
        const v = card.categories[cat][o][sub];
        if (typeof v === 'object') out.push({ key: cat + '.' + sub, o: o, v: v });
      });
    });
    SINGLE.forEach(function (cat) {
      const v = card.categories[cat][o];
      if (typeof v === 'object') out.push({ key: cat, o: o, v: v });
    });
  });
  return out;
}

let strongCount = 0;
let actionableCount = 0;
for (let i = 0; i < major.length; i++) {
  for (let j = 0; j < compareTargets.length; j++) {
    const cardB = compareTargets[j];
    if (cardB.cardId === major[i].cardId) continue;
    if (major.indexOf(cardB) !== -1 && major.indexOf(cardB) <= i) continue; // avoid double-reporting major-internal pairs
    const isCrossSuite = major.indexOf(cardB) === -1;
    const fa = fields(major[i]);
    const fb = fields(cardB);
    fa.forEach(function (fieldA) {
      const match = fb.find(function (fieldB) { return fieldB.key === fieldA.key && fieldB.o === fieldA.o; });
      if (!match) return;
      const keywords = (major[i].keywords[fieldA.o] || []).concat(cardB.keywords[fieldA.o] || []);
      for (let x = 0; x < fieldA.v.a.length; x++) {
        for (let y = 0; y < match.v.a.length; y++) {
          if (x === 0 && y === 0) continue; // locked-locked skip
          if (!isStrongA(fieldA.v.a[x], match.v.a[y], keywords)) continue;
          const editable = !isCrossSuite && (x !== 0 || y !== 0);
          console.log(JSON.stringify(['A-POOL', major[i].name_kr, cardB.name_kr, fieldA.key, fieldA.o, x, y, isCrossSuite ? 'CROSS-SUITE(immutable)' : (editable ? 'MAJOR-INTERNAL(actionable)' : 'BOTH-LOCKED(immutable)'), fieldA.v.a[x], match.v.a[y]]));
          strongCount++;
          if (editable) actionableCount++;
        }
      }
      for (let x = 0; x < fieldA.v.b.length; x++) {
        for (let y = 0; y < match.v.b.length; y++) {
          if (x === 0 && y === 0) continue;
          const jac = wordJaccard(fieldA.v.b[x], match.v.b[y]);
          const lcs = longestCommonSubstringLen(fieldA.v.b[x], match.v.b[y]);
          if (jac < 0.3 && lcs < 10) continue;
          const editable = !isCrossSuite && (x !== 0 || y !== 0);
          console.log(JSON.stringify(['B-POOL', major[i].name_kr, cardB.name_kr, fieldA.key, fieldA.o, x, y, isCrossSuite ? 'CROSS-SUITE(immutable)' : (editable ? 'MAJOR-INTERNAL(actionable)' : 'BOTH-LOCKED(immutable)'), { jac: jac, lcs: lcs }, fieldA.v.b[x], match.v.b[y]]));
          strongCount++;
          if (editable) actionableCount++;
        }
      }
    });
  }
}
console.log('total strong issues:', strongCount, '| actionable (major-internal, editable):', actionableCount);
```

Run: `node .superpowers/scratch-verify-major-sweep.js`

Given this comparator's `STEM_TH`-style sensitivity is not used here directly (only the true strong bar), expect a much smaller "total strong issues" count than the very first (buggy) sweep of prior suites. Only `actionable` (major-internal, non-cross-suite, at least one non-locked side) items require a fix — `CROSS-SUITE(immutable)` and `BOTH-LOCKED(immutable)` lines are informational only, matching established project precedent (not a regression; both endpoints already shipped/locked).

- [ ] **Step 2: actionable 위반 수정**

`MAJOR-INTERNAL(actionable)` 라벨이 붙은 라인만 처리한다. 두 쪽 모두 메이저 내부이고 최소 한쪽이 비잠금이므로, 그 비잠금 쪽 문장을 재작성한다(양쪽 다 비잠금이면 한쪽만 고쳐도 충분). 재작성한 문장은 반드시 메이저 22장 전체 + 이미 변환된 완드/컵/소드/펜타클 56장 대비로 스크립트를 재실행해 새로운 충돌이 없는지 확인한 뒤에만 반영한다([[feedback-fix-forward-and-global-reverify]]).

- [ ] **Step 3: actionable 0건 확인될 때까지 Step 1~2 반복**

Expected: `actionable (major-internal, editable): 0`. `CROSS-SUITE(immutable)`/`BOTH-LOCKED(immutable)` 건수는 남아있어도 무방하다 — 완드·컵·소드·펜타클에서도 동일한 판단을 따랐다.

- [ ] **Step 4: 회귀 테스트 재확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 수정이 있었다면 커밋 (없으면 이 태스크는 커밋 없이 종료)**

```bash
git add data/tarot-data-major.js
git commit -m "$(cat <<'EOF'
fix(tarot): resolve major-internal near-duplicate categories

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

이 태스크가 끝나면 **타로 categories 랜덤화 프로젝트 전체(5개 서브프로젝트, 78장, 총 2,924개 필드)가 완료**된다.
