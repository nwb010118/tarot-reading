# 타로 categories 랜덤화 — 소드(Swords) 콘텐츠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/tarot-data-swords.js`의 소드 14장(Ace~King) 전체 `categories`(카드당 19개 필드 × 2방향)를 `{a:[3],b:[3]}` 랜덤화 풀로 변환한다. [[project-tarot-categories-randomization]]의 콘텐츠 2단계, 완드·컵에 이은 세 번째 서브프로젝트.

**Architecture:** 완드·컵 서브프로젝트와 완전히 동일한 아키텍처를 재사용한다. 각 카테고리 필드는 이미 정확히 2문장(관찰 1문장 + 조언 1문장)이다. 문장1→`a[0]`(잠김), 문장2→`b[0]`(잠김)으로 기계적으로 나누고, `a[1,2]`/`b[1,2]`에 원본과 어휘·구조가 다른 새 문장을 창작해 추가한다. 1단계 인프라(커밋 `ca1655e`+`f9fa409`)에서 `tests/tarot-data.test.js`가 이미 문자열/풀 자동 감지 + 카테고리 풀 전용 dedup 축을 전부 갖췄으므로, **별도 검증 스크립트 없이 `node scripts/run-tests.js` 하나로 완전한 검증이 된다**.

**Tech Stack:** 순수 데이터 파일 편집(JS 객체 리터럴), Node.js 내장 `assert` 기반 회귀 테스트.

## Global Constraints

- **대상은 오직 `categories`뿐이다.** `upright`/`reversed`/`keywords`/`advice`는 이미 이전 프로젝트에서 랜덤화 완료됐으므로 이번 플랜의 어떤 태스크도 건드리지 않는다. 편집은 항상 **특정 필드 단위의 targeted edit**로만 한다 — 파일 전역에 걸친 일괄 find-replace(bulk regex 등)는 절대 쓰지 않는다. 컵 슈트 Task 2에서 "흐름입니다" 어미를 일괄 치환하려다 범위 밖 카드(컵7)의 기존 `upright`/`reversed`까지 건드린 스코프 누출 사고가 실제로 발생했다.
- **소드 에이스(Ace)의 예외 8개 필드는 변환하지 않는다** — 전부 1문장뿐이라 잠긴 카드 규칙상 영구히 문자열로 남는다: `upright.money.consumption`, `upright.career.switch`, `upright.business.startup`, `upright.workplace.team`, `upright.workplace.personal`, `reversed.career.switch`, `reversed.study.path`, `reversed.workplace.personal`. 이 8개는 그대로 두고 나머지 소드 에이스 필드(정방향 14개 + 역방향 16개, 총 30개)만 변환한다.
- **인덱스 0(문장1→`a[0]`, 문장2→`b[0]`)은 원본 문장을 한 글자도 바꾸지 않고 그대로 옮긴다.** 절대 재작성하지 않는다.
- **신규 변형(`a[1,2]`/`b[1,2]`)은 원본과 핵심 어휘·문장 구조를 공유하지 않는다** — 최소 2개 이상의 실질 단어가 겹치거나 문장 뼈대(연속 5자 이상 공통 부분열)가 같으면 dedup 검증에서 걸린다. 매 필드마다 `a[0]`/`b[0]`과 확실히 다른 핵심 이미지/각도를 고를 것 — 단순 동의어 치환은 거의 항상 자기충돌로 걸린다(완드·컵 전 태스크에서 반복된 1순위 재작업 원인).
- **금지쌍 주의**: `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`는 서로 다른 카테고리라도 내용/어휘가 겹치면 안 된다(단, 잠긴 문장끼리, 즉 각 카테고리의 `a[0]`/`b[0]`끼리는 이미 배포된 콘텐츠라 겹쳐도 검사에서 자동 제외된다). 각 카테고리에 뚜렷이 다른 소재를 의식적으로 배정할 것 — `love`=연애, `relationships`=일반 인간관계/가족/우정; `career`=개인 이직·구직, `workplace`=팀 역학·일상 업무; `money`=개인 재정, `business`=사업 운영.
- **advice/keywords와의 echo 주의**: 새로 쓰는 카테고리 문장이 같은 카드·같은 방향의 `advice` 3개 변형이나 `keywords` 6개와 겹치는 어휘/뼈대를 쓰면 안 된다(키워드가 더 긴 단어 속에 **부분 문자열**로 섞여 들어가는 경우도 포함 — 컵 슈트에서 "미련"이 여러 신규 문장에 부분 문자열로 끼어들어 있던 사례가 실제로 있었다). 태스크를 시작하기 전에 해당 카드의 `advice`/`keywords`를 먼저 확인해둘 것.
- **"흐름입니다" 종결 금지**: 새 문장을 `...흐름입니다.`로 끝내지 말 것. 이 어미는 `tests/tarot-data.test.js`의 `BOILERPLATE_SUFFIXES` 목록에 없어서, 이 어미로 끝나는 두 문장은 내용과 무관하게 LCS만으로 자동 충돌 처리된다(컵 슈트에서 실제로 여러 번 재작업을 유발함). `...시기입니다.`/`...해보세요.`/`...도움이 됩니다.` 등 `BOILERPLATE_SUFFIXES`에 이미 있는 안전한 어미만 사용할 것.
- **검증은 매 태스크 끝에 `node scripts/run-tests.js` 10/10 통과 하나로 충분하다.** 실패하면 출력된 각 항목에서 **신규(비잠금) 쪽만** 다시 써서 재실행 — 잠긴 인덱스0/기존 advice/keywords는 절대 수정하지 않는다.
- **재작성 시 전체 데이터셋 대비 사전 확인**: dedup 충돌을 고칠 때 "원래 충돌 상대만" 확인하고 재작성하면 제3의 카드와 새로 충돌하는 회귀가 날 수 있다([[feedback-fix-forward-and-global-reverify]]). 재작성한 문장은 같은 필드의 전체 14장(및 이미 변환된 완드·컵 28장) 대비로 확인 후에만 파일에 반영한다.
- 각 태스크는 배정된 카드들의 **`categories` 블록만** 수정한 `data/tarot-data-swords.js` 커밋 하나로 끝난다.
- **크래시 복구 시**: 세션 rate limit으로 subagent가 중단되는 일이 매우 흔하다(완드 5개 태스크 중 3개, 컵 6개 태스크 중 5개가 최소 1회 크래시). 절대 폐기하지 말고 `git status`/`git diff --stat`/`node --check`/`node scripts/run-tests.js` 순서로 실제 상태를 확인한 뒤(★ `node --check`를 테스트보다 먼저 — 컵 태스크4에서 크래시 직후 저장된 초안에 실제 구문 오류(`reversed_placeholder_do_not_use: {}` 같은 잔여 fragment)가 남아있었던 적이 있다) "기존 미완성 초안을 이어받아 fix-forward하라"고 새 subagent(또는 재개된 동일 subagent)에게 지시한다.
- **슈트 전체 완료 후 필수 단계**: 마지막 콘텐츠 태스크(Task 5) 완료 직후, `node scripts/run-tests.js` 10/10 통과와 별개로 소드 14장 전체에 대한 all-pairs 강한 comparator 스윕을 수행한다(아래 Task 6). **이번 스윕 스크립트는 컵 슈트에서 발견된 버그를 전부 수정한 버전이다** — 아래 Task 6의 스크립트를 그대로 사용할 것(직접 재구현하지 말 것).

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

---

### Task 1: 소드 Ace, 2, 3

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: 없음(이 플랜의 첫 태스크). 인프라(커밋 `ca1655e`, `f9fa409`)와 완드·컵 서브프로젝트가 이미 병합되어 있어야 함.
- Produces: 소드 Ace/2/3 3장의 `categories`가 전부(Ace는 8개 예외 필드 제외) 풀 shape으로 변환 완료.

- [ ] **Step 1: 소드 Ace의 `categories` 변환**

`data/tarot-data-swords.js`에서 `rank: "Ace"`(파일 최상단 카드) 블록의 `categories`를 위 패턴대로 변환한다. **단, Global Constraints에 명시한 8개 예외 필드(`upright.money.consumption`, `upright.career.switch`, `upright.business.startup`, `upright.workplace.team`, `upright.workplace.personal`, `reversed.career.switch`, `reversed.study.path`, `reversed.workplace.personal`)는 문자열 그대로 두고 절대 객체로 바꾸지 않는다.** 나머지 필드(정방향 14개 + 역방향 16개, 총 30개)를 전부 변환한다.

- [ ] **Step 2: 소드 2의 `categories` 변환**

`rank: "2"` 블록의 `categories` 19개 필드 × 2방향(예외 없음, 전부 변환) 총 38개 필드를 위 패턴대로 변환한다.

- [ ] **Step 3: 소드 3의 `categories` 변환**

`rank: "3"` 블록의 `categories` 38개 필드 전부를 위 패턴대로 변환한다.

- [ ] **Step 4: 검증**

Run: `node scripts/run-tests.js`
Expected: `10 test files, 10 passed, 0 failed`. 실패 시 출력된 항목의 신규(비잠금) 문장만 다시 써서 재실행.

- [ ] **Step 5: 문법 검증**

Run: `node --check data/tarot-data-swords.js`
Expected: 출력 없음(문법 오류 없음).

- [ ] **Step 6: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
content(tarot): convert swords Ace/2/3 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 소드 4, 5, 6

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: Task 1이 변환한 Ace/2/3(cross-card 축의 비교 대상으로 이미 존재).
- Produces: 소드 4/5/6 3장 추가 변환 완료(누적 6/14장).

- [ ] **Step 1: 소드 4, 5, 6의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-swords.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
content(tarot): convert swords 4/5/6 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 소드 7, 8, 9

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: Task 1~2가 변환한 6장.
- Produces: 소드 7/8/9 3장 추가 변환 완료(누적 9/14장).

- [ ] **Step 1: 소드 7, 8, 9의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-swords.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
content(tarot): convert swords 7/8/9 categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 소드 10, 시종(Page), 기사(Knight)

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: Task 1~3이 변환한 9장.
- Produces: 소드 10/Page/Knight 3장 추가 변환 완료(누적 12/14장).

- [ ] **Step 1: 소드 10, Page(시종), Knight(기사)의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 문법 검증**

Run: `node --check data/tarot-data-swords.js`

- [ ] **Step 4: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
content(tarot): convert swords 10/page/knight categories to a/b pool structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 소드 퀸(Queen), 킹(King)

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: Task 1~4가 변환한 12장.
- Produces: 소드 Queen/King 2장 추가 변환 완료(누적 14/14장 — **소드 슈트 콘텐츠 전체 완료**).

- [ ] **Step 1: 소드 Queen(퀸), King(킹)의 `categories` 각 38개 필드(예외 없음)를 위 패턴대로 변환한다.**

- [ ] **Step 2: 검증**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 3: 소드 슈트 전체 변환 완료 확인**

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
const swords = deck.filter(c => c.cardId.indexOf('swords_') === 0);
let converted = 0, stringFields = 0;
const SUBDIVIDED = {love:['solo','couple'],money:['consumption','invest'],career:['jobseek','switch'],business:['startup','running'],study:['exam','path'],health:['body','mind'],relationships:['new','existing'],workplace:['team','personal']};
const SINGLE = ['honor','moving','children'];
swords.forEach(function (card) {
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
console.log('swords converted fields:', converted, '/ still-string fields:', stringFields, '(expect 8 -- the swords_Ace exceptions)');
"
```
Expected: `swords converted fields: 524 / still-string fields: 8`(14장 × 38 - 8 = 524).

- [ ] **Step 4: 문법 검증**

Run: `node --check data/tarot-data-swords.js`

- [ ] **Step 5: 커밋**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
content(tarot): convert swords queen/king categories to a/b pool structure

Completes the swords suit content (14/14 cards) for the categories
randomization project's content phase. All 524 convertible category
fields (14 cards x 38 fields - 8 swords_Ace single-sentence exceptions)
are now {a,b} pools; the 8 exceptions remain locked strings per design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 소드 슈트 전체 all-pairs 강한 comparator 스윕 (최종 리뷰)

완드·컵 서브프로젝트의 최종 리뷰에서, 자동 CI의 cross-card 축(LCS≥20)이 구조적으로 느슨해 실제 근접중복을 놓치는 것이 반복적으로 드러났다([[project-tarot-categories-randomization]] 참고). 같은 문제를 소드에서도 사전에 잡기 위해, 병합 전에 소드 14장 전체(+이미 변환된 완드·컵 28장과의 교차 비교 포함)에 대해 강한 comparator 전수 비교 스크립트를 돌린다.

**컵 슈트 Task 6에서 발견된 스크립트 버그를 전부 수정한 버전을 아래에 제공한다 — 반드시 이 스크립트를 그대로 사용할 것(재구현하지 말 것).** 수정 사항: ① 이중 루프에서 `match.v.a[y]`를 정확히 사용(이전엔 실수로 `[x]`를 두 번 써서 잠금-잠금 스킵 가드가 무력화되고 원시 리포트의 76%가 이미 배포된 잠긴 콘텐츠끼리의 무의미한 비교였음), ② `keywords` 인자를 항상 전달(없으면 `fullCombinedIssues`가 크래시함), ③ b-pool도 word-Jaccard뿐 아니라 LCS≥10 기준을 포함(이전 버전은 LCS 기준이 아예 없어서 실제 강신호 위반 1건을 최종 리뷰 전까지 놓쳤음), ④ 대상 슈트(소드)뿐 아니라 이미 변환된 전 슈트(완드+컵)까지 교차 비교(이전엔 컵×컵만 봐서 컵×완드 축이 전혀 검증되지 않았고, 최종 리뷰에서 직접 돌려보니 강신호 99건이 나왔음).

**Files:**
- Create (scratch, 커밋하지 않음): `.superpowers/scratch-verify-swords-sweep.js` (이미 `.gitignore`의 `.superpowers/`에 걸림)

**Interfaces:**
- Consumes: Task 1~5가 완성한 소드 14장 전체 `categories`, 이미 병합된 완드 14장·컵 14장.
- Produces: 강신호(strong-signal) 근접중복 0건이 확인된 최종 상태, 위반 발견 시 `data/tarot-data-swords.js`에 대한 fix 커밋(완드/컵의 기존 콘텐츠는 이 태스크에서 수정 대상이 아니다 — 소드 쪽 문장만 재작성).

- [ ] **Step 1: 전수 비교 스크립트 작성 및 실행**

```js
// .superpowers/scratch-verify-swords-sweep.js
const {
  wordJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems, makeFullCombinedIssues
} = require('../tests/helpers/dedup.js');

// Same constants as tests/tarot-data.test.js, so this is the project's real fullCombinedIssues.
const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '있어요', '좋습니다', '됩니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은', '수', '있는', '있습니다'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);

// LCS>=10 check reused for the b-pool too (the cups-suite script only did word-Jaccard for b-pool, missing this).
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

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('../data/tarot-data.js');
const deck = getFullDeck();
const swords = deck.filter(function (c) { return c.cardId.indexOf('swords_') === 0; });
// Compare swords against itself AND against the already-converted wands+cups suites
// (the cups-suite sweep only checked cups x cups and missed a cups x wands axis entirely).
const priorConverted = deck.filter(function (c) {
  return c.cardId.indexOf('wands_') === 0 || c.cardId.indexOf('cups_') === 0;
});
const compareTargets = swords.concat(priorConverted);

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

let issues = 0;
for (let i = 0; i < swords.length; i++) {
  for (let j = 0; j < compareTargets.length; j++) {
    const cardB = compareTargets[j];
    if (cardB.cardId === swords[i].cardId) continue; // never compare a card to itself
    // Avoid double-reporting swords-vs-swords pairs in both directions.
    if (swords.indexOf(cardB) !== -1 && swords.indexOf(cardB) <= i) continue;
    const fa = fields(swords[i]);
    const fb = fields(cardB);
    fa.forEach(function (fieldA) {
      const match = fb.find(function (fieldB) { return fieldB.key === fieldA.key && fieldB.o === fieldA.o; });
      if (!match) return;
      const keywords = (swords[i].keywords[fieldA.o] || []).concat(cardB.keywords[fieldA.o] || []);
      for (let x = 0; x < fieldA.v.a.length; x++) {
        for (let y = 0; y < match.v.a.length; y++) {
          if (x === 0 && y === 0) continue; // locked-locked skip
          const combined = fullCombinedIssues(fieldA.v.a[x], match.v.a[y], keywords);
          if (combined && combined.length) {
            console.log(JSON.stringify(['A-POOL', swords[i].name, cardB.name, fieldA.key, fieldA.o, x, y, combined, fieldA.v.a[x], match.v.a[y]]));
            issues++;
          }
        }
      }
      for (let x = 0; x < fieldA.v.b.length; x++) {
        for (let y = 0; y < match.v.b.length; y++) {
          if (x === 0 && y === 0) continue;
          const jac = wordJaccard(fieldA.v.b[x], match.v.b[y]);
          const lcs = longestCommonSubstringLen(fieldA.v.b[x], match.v.b[y]);
          if (jac >= 0.3 || lcs >= 10) {
            console.log(JSON.stringify(['B-POOL', swords[i].name, cardB.name, fieldA.key, fieldA.o, x, y, { jac: jac, lcs: lcs }, fieldA.v.b[x], match.v.b[y]]));
            issues++;
          }
        }
      }
    });
  }
}
console.log('total issues:', issues);
```

Run: `node .superpowers/scratch-verify-swords-sweep.js`

Given the strong comparator's `STEM_TH=2` threshold is quite permissive at full-corpus scale (the cups-suite sweep found ~737 weak-signal matches that were mostly 2-shared-generic-word coincidences, e.g. two unrelated sentences both containing "몸에" and "신호"), **expect a nontrivial "total issues" count — this is normal, not a sign of bad content.** Only act on strong-signal issues:
- An `A-POOL` line is strong if it contains the literal substring `"word="` (word-Jaccard≥0.3 hit) OR has `lcs=N` with N≥10.
- A `B-POOL` line is strong if `jac >= 0.3` OR `lcs >= 10` (both are already gated by the script itself, so every B-POOL line printed is strong by construction this time — no separate filtering needed for B-POOL, unlike the cups-suite version of this script).

- [ ] **Step 2: 강신호(strong-signal)만 필터링, 위반 발견 시 수정**

A-POOL 라인 중 `word=`를 포함하거나 `lcs=N`(N≥10)인 것만 추출한다(예: `grep`이나 짧은 필터 스크립트 사용). B-POOL은 전부 강신호다. 위반이 있으면 **소드 쪽 문장만** 재작성한다(완드/컵의 기존 콘텐츠는 절대 수정하지 않는다 — 이미 배포·병합된 콘텐츠). 재작성한 문장은 반드시 같은 필드의 전체 14장 소드 + 완드 28장 대비로 스크립트를 재실행해 새로운 충돌이 없는지 확인한 뒤에만 반영한다([[feedback-fix-forward-and-global-reverify]]).

- [ ] **Step 3: 강신호 0건 확인될 때까지 Step 1~2 반복**

Expected: 강신호(위 기준) 0건. 약신호(강신호 기준에 못 미치는 나머지)는 남아있어도 무방하다 — 완드·컵에서도 동일한 판단을 따랐다.

- [ ] **Step 4: 회귀 테스트 재확인**

Run: `node scripts/run-tests.js` → `10 test files, 10 passed, 0 failed`.

- [ ] **Step 5: 수정이 있었다면 커밋 (없으면 이 태스크는 커밋 없이 종료)**

```bash
git add data/tarot-data-swords.js
git commit -m "$(cat <<'EOF'
fix(tarot): resolve swords cross-suite near-duplicate categories

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
