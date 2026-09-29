# 재물운 "수입" 선택지 추가 — 타로편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타로 78장의 재물운(`money`) 카테고리에 "수입"(`income`) 선택지를 추가해, 소비/투자(돈이 나가는 쪽)뿐 아니라 수입(돈이 들어오는 쪽) 운세도 볼 수 있게 한다.

**Architecture:** 78장 전부의 `categories.money.{upright,reversed}`에 `income: {a:[3문장], b:[3문장]}` 필드를 먼저 채워 넣고(콘텐츠 태스크 5개, 아케인 그룹별), 마지막 태스크에서 `CATEGORY_SUBCHOICES`(UI 노출)와 `tests/tarot-data.test.js`의 하드코딩된 서브초이스 목록·구조검증 루프(테스트 검증)를 한 번에 연결한다. 콘텐츠 태스크 동안은 기존 테스트가 `income`의 존재를 모르므로 계속 그대로 통과하고, 마지막 태스크에서 처음으로 `income`이 전방위 검증을 받는다.

**Tech Stack:** 바닐라 JS 데이터 파일(`data/tarot-data-*.js`), 순수 `assert` 기반 테스트(`node scripts/run-tests.js`), 별도 빌드 도구 없음.

## Global Constraints

- **콘텐츠 먼저, 검증/노출은 마지막**: Task 1~5(콘텐츠)는 `data/category-labels.js`의 `CATEGORY_SUBCHOICES`와 `tests/tarot-data.test.js`의 `SUBDIVIDED_CATEGORIES`/`FORBIDDEN_PAIRS`를 건드리지 않는다. 이 두 곳은 Task 6에서만 수정한다.
- **push 금지**: Task 6이 끝나고 전체 테스트가 통과할 때까지 그 어떤 커밋도 `git push`하지 않는다(중간에 push하면 라이브 사이트에서 `income` 없는 카드가 나왔을 때 `resolveMeaningText`가 `undefined.a`를 읽어 화면이 깨진다). Task 6의 마지막 스텝에서만 push한다.
- 새로 쓰는 `income` 필드는 카드의 기존 `consumption`/`invest`가 문자열이든 `{a,b}` 풀이든 상관없이 항상 `{a:[정확히 3문장], b:[정확히 3문장]}` 형식으로 쓴다.
- 각 문장은 자연스러운 한국어 완결문으로 끝난다(다른 문장과 조합됐을 때 비문이 되는 미완결 절 금지 — 예: "~이거나," 로 끝나는 문장 금지).
- 기존 `consumption`/`invest` 필드(문자열/텍스트)는 이번 작업에서 **절대 수정하지 않는다**.
- 커밋 메시지 끝에는 정확히 다음 줄을 verbatim으로 포함한다(서브에이전트 자신의 모델명으로 바꾸지 말 것):
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## Task 1: 메이저 아르카나(22장) `income` 콘텐츠 작성

**Files:**
- Modify: `data/tarot-data-major.js`

**Interfaces:**
- Consumes: 없음
- Produces: 메이저 아르카나 22장의 `categories.money.upright.income`/`categories.money.reversed.income` 필드(각 `{a:[3],b:[3]}`). Task 6이 이 필드들을 테스트/UI에 연결한다.

- [ ] **Step 1: "바보"(The Fool) 카드에 `income` 필드 추가 — 이후 21장의 패턴 기준**

`data/tarot-data-major.js`에서 "바보" 카드(`id: 0`)의 `money` 블록:

```js
        money: {
          upright: { consumption: {"a":["가벼운 마음으로 하는 소비가 스트레스를 풀어주는 시기입니다.","부담 없이 쓰는 돈이 기분 전환에 도움이 되는 시기입니다.","여유 있게 즐기는 작은 사치가 하루의 활력이 되어주는 시기입니다."],"b":["다만 즉흥적인 지출이 쌓이지 않도록 적당한 선은 정해두세요.","다만 쓰는 만큼 미리 정해둔 예산 안에서 움직이는 습관을 들이세요.","다만 하루 동안 쓸 수 있는 한도를 스스로 정해두고 지켜보세요."]}, invest: {"a":["새로운 투자 기회에 호기심이 생기는 시기입니다.","잘 알려지지 않은 종목에 관심이 쏠리는 시기입니다.","평소 눈여겨보지 않던 자산에 손이 가는 시기입니다."],"b":["다만 충분히 알아보지 않은 상태에서 뛰어들기보다 기본적인 공부는 해두는 것이 좋습니다.","성급히 움직이기 전에 여러 곳의 의견을 직접 비교해보는 습관을 들이세요.","다만 관련 자료를 먼저 찾아보고 이해한 뒤에 결정하는 편이 안전합니다."]} },
          reversed: { consumption: {"a":["충동적인 지출이 늘어나며 예산 관리가 흐트러질 수 있는 시기입니다.","정해둔 예산을 자꾸 넘기면서 다음 달 생활비까지 끌어다 쓰게 됩니다.","특별한 이유 없이 결제가 잦아지며 씀씀이가 헐거워질 수 있는 시기입니다."],"b":["지갑을 열기 전 한 번 더 생각하는 습관이 필요합니다.","결제하기 전 잠시 멈춰 정말 필요한 물건인지 되짚어보세요.","쓰기 전에 하루 정도 시간을 두고 다시 고민해보는 것이 좋습니다."]}, invest: {"a":["무계획한 투자는 손실로 이어질 수 있으니 조심해야 하는 시기입니다.","뒤늦게 뛰어든 종목이 매수 시점보다 더 떨어질 수 있어요.","대출까지 받아 투자했다가 이자 부담만 늘어날 수 있는 시기입니다."],"b":["확신이 서지 않는다면 지금은 관망하는 편이 낫습니다.","판단이 서지 않을 때는 무리해서 결정 내리지 말고 기다려보세요.","괜히 서두르지 말고 시장 상황을 좀 더 지켜본 뒤 움직이세요."]} }
        },
```

아래로 교체(각 `upright`/`reversed`에 `income:` 필드 추가, 기존 `consumption`/`invest`는 완전히 그대로):

```js
        money: {
          upright: { consumption: {"a":["가벼운 마음으로 하는 소비가 스트레스를 풀어주는 시기입니다.","부담 없이 쓰는 돈이 기분 전환에 도움이 되는 시기입니다.","여유 있게 즐기는 작은 사치가 하루의 활력이 되어주는 시기입니다."],"b":["다만 즉흥적인 지출이 쌓이지 않도록 적당한 선은 정해두세요.","다만 쓰는 만큼 미리 정해둔 예산 안에서 움직이는 습관을 들이세요.","다만 하루 동안 쓸 수 있는 한도를 스스로 정해두고 지켜보세요."]}, invest: {"a":["새로운 투자 기회에 호기심이 생기는 시기입니다.","잘 알려지지 않은 종목에 관심이 쏠리는 시기입니다.","평소 눈여겨보지 않던 자산에 손이 가는 시기입니다."],"b":["다만 충분히 알아보지 않은 상태에서 뛰어들기보다 기본적인 공부는 해두는 것이 좋습니다.","성급히 움직이기 전에 여러 곳의 의견을 직접 비교해보는 습관을 들이세요.","다만 관련 자료를 먼저 찾아보고 이해한 뒤에 결정하는 편이 안전합니다."]}, income: {"a":["생각지 못한 곳에서 작은 수입이 들어올 수 있는 시기입니다.","새로운 일거리나 제안이 뜻밖의 소득으로 이어질 수 있습니다.","낯선 기회에서 시작한 일이 예상 밖의 벌이로 연결될 수 있는 시기입니다."],"b":["형식에 얽매이지 말고 가벼운 마음으로 기회를 받아들여보세요.","작은 제안이라도 일단 시도해보면 새로운 수입원이 될 수 있어요.","낯선 일이라도 열린 마음으로 나서보면 뜻밖의 벌이로 이어질 수 있습니다."]} },
          reversed: { consumption: {"a":["충동적인 지출이 늘어나며 예산 관리가 흐트러질 수 있는 시기입니다.","정해둔 예산을 자꾸 넘기면서 다음 달 생활비까지 끌어다 쓰게 됩니다.","특별한 이유 없이 결제가 잦아지며 씀씀이가 헐거워질 수 있는 시기입니다."],"b":["지갑을 열기 전 한 번 더 생각하는 습관이 필요합니다.","결제하기 전 잠시 멈춰 정말 필요한 물건인지 되짚어보세요.","쓰기 전에 하루 정도 시간을 두고 다시 고민해보는 것이 좋습니다."]}, invest: {"a":["무계획한 투자는 손실로 이어질 수 있으니 조심해야 하는 시기입니다.","뒤늦게 뛰어든 종목이 매수 시점보다 더 떨어질 수 있어요.","대출까지 받아 투자했다가 이자 부담만 늘어날 수 있는 시기입니다."],"b":["확신이 서지 않는다면 지금은 관망하는 편이 낫습니다.","판단이 서지 않을 때는 무리해서 결정 내리지 말고 기다려보세요.","괜히 서두르지 말고 시장 상황을 좀 더 지켜본 뒤 움직이세요."]}, income: {"a":["계획 없이 벌인 일이 기대만큼의 수입으로 이어지지 않을 수 있는 시기입니다.","즉흥적으로 맡은 일이 생각보다 적은 보수로 끝날 수 있습니다.","준비 없이 뛰어든 기회가 수입으로 연결되지 않고 흐지부지될 수 있는 시기입니다."],"b":["수입원을 정하기 전에 조건을 꼼꼼히 확인해보세요.","즉흥적인 제안일수록 보수와 조건을 미리 따져보는 것이 좋습니다.","성급하게 뛰어들기보다 실제 수익이 되는지 먼저 점검해보세요."]} }
        },
```

- [ ] **Step 2: 나머지 21장(마법사~세계)에 같은 패턴 적용**

각 카드의 `categories.money.upright`/`categories.money.reversed` 객체 안, 기존 `invest` 필드 뒤에 `income: {"a":[...3문장],"b":[...3문장]}`를 추가한다(쉼표로 구분, `consumption`/`invest`는 손대지 않음). 카드마다:
- 그 카드의 상징(예: 마법사=능숙함/의지력, 여사제=직관, 황제=권위/체계, 운명의 수레바퀴=변화, 별=희망, 태양=풍요 등)에 맞춰 "수입이 들어오는/들어오지 않는 상황"(a)과 "수입에 대한 조언"(b)을 쓴다.
- Step 1의 분량·톤(한 문장은 완결된 평서문, "~시기입니다"/"~세요" 계열 종결)을 유지한다.
- 기존 `consumption`/`invest` 필드의 어휘를 그대로 재사용하지 않는다(예: "소비", "투자", "지출", "종목" 같은 단어 대신 "수입", "소득", "벌이", "보수" 계열 어휘 사용).

- [ ] **Step 3: 범위 한정 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
let errors = [];
if (data.length !== 22) errors.push('expected 22 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    const income = card.categories.money[o].income;
    if (!income || !Array.isArray(income.a) || income.a.length !== 3 || !Array.isArray(income.b) || income.b.length !== 3) {
      errors.push(card.name_kr + ' money.' + o + '.income missing or malformed');
    } else {
      income.a.concat(income.b).forEach(function (s, i) {
        if (typeof s !== 'string' || s.length === 0) errors.push(card.name_kr + ' money.' + o + '.income[' + i + '] empty');
      });
    }
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All 22 major arcana cards have valid money.income'); }
"
```
Expected: `All 22 major arcana cards have valid money.income`

- [ ] **Step 4: 회귀 확인**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(이 태스크는 아직 `CATEGORY_SUBCHOICES`/`SUBDIVIDED_CATEGORIES`를 안 건드렸으므로 `income`은 기존 테스트에 안 걸림 — 기존 테스트가 그대로 통과해야 정상)

- [ ] **Step 5: 커밋(push는 하지 않음)**

```bash
git add data/tarot-data-major.js
git commit -m "content(tarot): add money.income to major arcana (22 cards)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 완드(Wands, 14장) `income` 콘텐츠 작성

**Files:**
- Modify: `data/tarot-data-wands.js`

**Interfaces:**
- Consumes: 없음
- Produces: 완드 14장의 `categories.money.upright.income`/`categories.money.reversed.income` 필드.

- [ ] **Step 1: "완드 에이스" 카드에 `income` 필드 추가 — 이후 13장의 패턴 기준**

`data/tarot-data-wands.js`에서 "완드 에이스" 카드의 `money` 블록(63~81번째 줄):

```js
          money: {
            upright: {
              consumption: {
                a: ["새로운 물건이나 경험에 지출하고 싶은 의욕이 생기는 시기입니다.", "갖고 싶었던 물건에 손이 가며 씀씀이가 커지려는 시기입니다.", "평소보다 지갑을 여는 데 거리낌이 없어지는 시기입니다."],
                b: ["다만 계획한 예산 안에서 즐기는 것이 좋습니다.", "미리 정해둔 한도를 지키면서 만족스러운 소비를 즐겨보세요.", "충동적으로 결제하기 전에 정말 필요한지 한 번 더 따져보세요."]
              },
              invest: {
                a: ["새로운 사업 아이디어나 투자처가 떠오르는 시기입니다.", "낯선 분야의 투자 기회에 관심이 쏠리는 시기입니다.", "자금을 어디에 굴려볼지 궁리하게 되는 시기입니다."],
                b: ["구체적인 실행 계획을 세워보면 좋은 기회로 이어질 수 있어요.", "관심 가는 종목이나 상품을 자세히 조사한 뒤 움직여보세요.", "소액으로 먼저 시도해보며 감을 익혀나가는 것이 안전합니다."]
              }
            },
            reversed: {
              consumption: "사고 싶은 마음은 있지만 선뜻 지출을 결정하지 못하고 미루고 있을 수 있습니다.",
              invest: {
                a: ["좋은 투자 아이디어가 있어도 실행으로 옮기지 못하고 있는 시기입니다.", "투자하고 싶은 마음은 있지만 확신이 서지 않아 망설이는 시기입니다.", "괜찮은 종목을 알아도 결단을 내리지 못하고 미루는 시기입니다."],
                b: ["작은 것부터 시작해보는 것이 도움이 됩니다.", "소액으로라도 먼저 발을 들여보는 것이 좋습니다.", "전문가의 조언을 구해 판단의 근거를 마련해보세요."]
              }
            }
          },
```

아래로 교체(`upright`/`reversed` 각각에 `income` 필드 추가, 기존 필드는 그대로):

```js
          money: {
            upright: {
              consumption: {
                a: ["새로운 물건이나 경험에 지출하고 싶은 의욕이 생기는 시기입니다.", "갖고 싶었던 물건에 손이 가며 씀씀이가 커지려는 시기입니다.", "평소보다 지갑을 여는 데 거리낌이 없어지는 시기입니다."],
                b: ["다만 계획한 예산 안에서 즐기는 것이 좋습니다.", "미리 정해둔 한도를 지키면서 만족스러운 소비를 즐겨보세요.", "충동적으로 결제하기 전에 정말 필요한지 한 번 더 따져보세요."]
              },
              invest: {
                a: ["새로운 사업 아이디어나 투자처가 떠오르는 시기입니다.", "낯선 분야의 투자 기회에 관심이 쏠리는 시기입니다.", "자금을 어디에 굴려볼지 궁리하게 되는 시기입니다."],
                b: ["구체적인 실행 계획을 세워보면 좋은 기회로 이어질 수 있어요.", "관심 가는 종목이나 상품을 자세히 조사한 뒤 움직여보세요.", "소액으로 먼저 시도해보며 감을 익혀나가는 것이 안전합니다."]
              },
              income: {
                a: ["새로운 프로젝트에서 예상보다 빠르게 수입이 생기는 시기입니다.", "열정을 쏟은 일이 곧바로 좋은 벌이로 이어지는 흐름입니다.", "의욕적으로 뛰어든 일이 생각보다 빠르게 수익을 내는 시기입니다."],
                b: ["타오르는 열정을 살려 적극적으로 기회를 잡아보세요.", "망설이지 말고 지금의 추진력으로 밀어붙여보세요.", "빠르게 움직인 만큼 성과도 빠르게 돌아올 수 있으니 속도를 늦추지 마세요."]
              }
            },
            reversed: {
              consumption: "사고 싶은 마음은 있지만 선뜻 지출을 결정하지 못하고 미루고 있을 수 있습니다.",
              invest: {
                a: ["좋은 투자 아이디어가 있어도 실행으로 옮기지 못하고 있는 시기입니다.", "투자하고 싶은 마음은 있지만 확신이 서지 않아 망설이는 시기입니다.", "괜찮은 종목을 알아도 결단을 내리지 못하고 미루는 시기입니다."],
                b: ["작은 것부터 시작해보는 것이 도움이 됩니다.", "소액으로라도 먼저 발을 들여보는 것이 좋습니다.", "전문가의 조언을 구해 판단의 근거를 마련해보세요."]
              },
              income: {
                a: ["의욕만 앞선 일이 실제 수입으로 이어지지 못할 수 있는 시기입니다.", "성급하게 시작한 일이 기대만큼의 벌이가 되지 않는 흐름입니다.", "열정을 쏟았지만 수익 구조가 제대로 잡히지 않은 시기입니다."],
                b: ["의욕을 잠시 가라앉히고 실질적인 수익 구조부터 점검해보세요.", "속도를 늦추고 이 일이 정말 돈이 되는지 다시 따져보세요.", "열정만으로는 부족하니 구체적인 계획을 먼저 세워보세요."]
              }
            }
          },
```

- [ ] **Step 2: 나머지 13장(완드 2~King)에 같은 패턴 적용**

Task 1 Step 2와 동일한 방식. 각 카드의 기존 `money` 필드를 파일에서 확인하며, 카드 고유의 상징(완드는 열정·행동·추진력 계열)에 맞춰 `income.upright`(수입이 빠르게/의욕적으로 생기는 흐름)과 `income.reversed`(의욕만 앞서 수입으로 이어지지 않는 흐름)를 작성한다. `consumption`/`invest`의 어휘를 재사용하지 않는다.

- [ ] **Step 3: 범위 한정 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-wands.js').TAROT_WANDS;
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    const income = card.categories.money[o].income;
    if (!income || !Array.isArray(income.a) || income.a.length !== 3 || !Array.isArray(income.b) || income.b.length !== 3) {
      errors.push(card.name_kr + ' money.' + o + '.income missing or malformed');
    } else {
      income.a.concat(income.b).forEach(function (s, i) {
        if (typeof s !== 'string' || s.length === 0) errors.push(card.name_kr + ' money.' + o + '.income[' + i + '] empty');
      });
    }
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All 14 wands cards have valid money.income'); }
"
```
Expected: `All 14 wands cards have valid money.income`

- [ ] **Step 4: 회귀 확인**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(기존 회귀 없음)

- [ ] **Step 5: 커밋(push는 하지 않음)**

```bash
git add data/tarot-data-wands.js
git commit -m "content(tarot): add money.income to wands suit (14 cards)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: 컵(Cups, 14장) `income` 콘텐츠 작성

**Files:**
- Modify: `data/tarot-data-cups.js`

**Interfaces:**
- Consumes: 없음
- Produces: 컵 14장의 `categories.money.upright.income`/`categories.money.reversed.income` 필드.

- [ ] **Step 1: "컵 에이스" 카드에 `income` 필드 추가 — 이후 13장의 패턴 기준**

`data/tarot-data-cups.js`에서 "컵 에이스" 카드의 `money` 블록(51~60번째 줄):

```js
          money: {
            upright: {
              consumption: { a: ["마음이 편안해지며 재정에 대한 불안도 가라앉는 시기입니다.", "마음의 여유가 생기며 돈 걱정도 한결 가벼워지는 시기입니다.", "편안해진 마음 덕분에 지갑을 여는 데도 부담이 줄어드는 시기입니다."], b: ["여유로운 마음으로 필요한 곳에 지출해도 괜찮습니다.", "필요한 곳이라면 부담 갖지 말고 편하게 써도 좋은 시기입니다.", "긴장을 풀고 필요한 소비는 망설임 없이 해보세요."] },
              invest: { a: ["직감적으로 끌리는 투자처가 좋은 감정을 주는 시기입니다.", "왠지 마음이 가는 투자 대상이 눈에 들어오는 시기입니다.", "느낌이 좋은 종목에 자연스레 눈길이 머무는 시기입니다."], b: ["다만 감정만으로 결정하지 말고 근거도 함께 살펴보세요.", "느낌만 믿기보다 관련 자료도 꼼꼼히 확인해보세요.", "끌리는 마음과 별개로 객관적인 정보도 챙겨보세요."] }
            },
            reversed: {
              consumption: { a: ["감정적인 소비로 재정에 영향을 줄 수 있는 시기입니다.", "속상한 날일수록 카드부터 꺼내게 되는 시기입니다.", "홧김에 결제 버튼부터 누르는 일이 잦아지는 흐름입니다."], b: ["기분을 달래기 위한 지출은 조금 자제하는 것이 좋습니다.", "스트레스성 소비는 하루 정도 미뤄두고 다시 생각해보세요.", "감정에 휩쓸린 결제는 잠시 멈추고 정말 필요한지 따져보세요."] },
              invest: { a: ["기대했던 투자 성과가 나오지 않아 실망할 수 있는 시기입니다.", "숫자로 확인된 결과가 못내 씁쓸하게 다가오는 흐름입니다.", "그래프가 좀처럼 우상향하지 못해 마음이 갑갑해지는 요즘입니다."], b: ["감정적으로 판단하기보다 냉정하게 다시 점검해보세요.", "속상한 마음은 잠시 접어두고 수치를 차분히 다시 살펴보세요.", "일희일비하지 말고 수치와 근거부터 차근차근 되짚어보세요."] }
            }
          },
```

아래로 교체(`upright`/`reversed` 각각에 `income` 필드 추가, 기존 필드는 그대로):

```js
          money: {
            upright: {
              consumption: { a: ["마음이 편안해지며 재정에 대한 불안도 가라앉는 시기입니다.", "마음의 여유가 생기며 돈 걱정도 한결 가벼워지는 시기입니다.", "편안해진 마음 덕분에 지갑을 여는 데도 부담이 줄어드는 시기입니다."], b: ["여유로운 마음으로 필요한 곳에 지출해도 괜찮습니다.", "필요한 곳이라면 부담 갖지 말고 편하게 써도 좋은 시기입니다.", "긴장을 풀고 필요한 소비는 망설임 없이 해보세요."] },
              invest: { a: ["직감적으로 끌리는 투자처가 좋은 감정을 주는 시기입니다.", "왠지 마음이 가는 투자 대상이 눈에 들어오는 시기입니다.", "느낌이 좋은 종목에 자연스레 눈길이 머무는 시기입니다."], b: ["다만 감정만으로 결정하지 말고 근거도 함께 살펴보세요.", "느낌만 믿기보다 관련 자료도 꼼꼼히 확인해보세요.", "끌리는 마음과 별개로 객관적인 정보도 챙겨보세요."] },
              income: { a: ["마음이 담긴 제안이 뜻밖의 수입 기회로 이어질 수 있는 시기입니다.", "좋은 인연을 통해 새로운 소득 기회를 소개받을 수 있는 시기입니다.", "따뜻한 마음으로 시작한 일이 뜻밖의 벌이로 돌아오는 흐름입니다."], b: ["마음이 가는 제안이라면 편안하게 받아들여보세요.", "따뜻하게 다가온 기회를 부담 없이 받아들여도 좋은 시기입니다.", "감사한 마음으로 제안을 받아들이면 좋은 결실로 이어질 수 있어요."] }
            },
            reversed: {
              consumption: { a: ["감정적인 소비로 재정에 영향을 줄 수 있는 시기입니다.", "속상한 날일수록 카드부터 꺼내게 되는 시기입니다.", "홧김에 결제 버튼부터 누르는 일이 잦아지는 흐름입니다."], b: ["기분을 달래기 위한 지출은 조금 자제하는 것이 좋습니다.", "스트레스성 소비는 하루 정도 미뤄두고 다시 생각해보세요.", "감정에 휩쓸린 결제는 잠시 멈추고 정말 필요한지 따져보세요."] },
              invest: { a: ["기대했던 투자 성과가 나오지 않아 실망할 수 있는 시기입니다.", "숫자로 확인된 결과가 못내 씁쓸하게 다가오는 흐름입니다.", "그래프가 좀처럼 우상향하지 못해 마음이 갑갑해지는 요즘입니다."], b: ["감정적으로 판단하기보다 냉정하게 다시 점검해보세요.", "속상한 마음은 잠시 접어두고 수치를 차분히 다시 살펴보세요.", "일희일비하지 말고 수치와 근거부터 차근차근 되짚어보세요."] },
              income: { a: ["감정에 휩쓸려 수입과 관련된 판단이 흐려질 수 있는 시기입니다.", "정에 이끌려 손해 보는 조건을 받아들이게 될 수 있는 시기입니다.", "마음만 앞서 조건을 제대로 따지지 못하고 넘어갈 수 있는 시기입니다."], b: ["감정과 별개로 조건은 냉정하게 따져보세요.", "정에 이끌리기 전에 실제 조건을 꼼꼼히 확인해보세요.", "마음이 앞서더라도 숫자만큼은 차분히 짚어보세요."] }
            }
          },
```

- [ ] **Step 2: 나머지 13장(컵 2~King)에 같은 패턴 적용**

Task 1 Step 2와 동일한 방식. 컵은 감정·직관·인간관계 계열이므로, `income.upright`(마음이 담긴 제안·좋은 인연을 통한 수입)와 `income.reversed`(감정에 휩쓸려 수입 판단이 흐려지는 흐름)로 작성한다. `consumption`/`invest`의 어휘를 재사용하지 않는다.

- [ ] **Step 3: 범위 한정 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-cups.js').TAROT_CUPS;
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    const income = card.categories.money[o].income;
    if (!income || !Array.isArray(income.a) || income.a.length !== 3 || !Array.isArray(income.b) || income.b.length !== 3) {
      errors.push(card.name_kr + ' money.' + o + '.income missing or malformed');
    } else {
      income.a.concat(income.b).forEach(function (s, i) {
        if (typeof s !== 'string' || s.length === 0) errors.push(card.name_kr + ' money.' + o + '.income[' + i + '] empty');
      });
    }
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All 14 cups cards have valid money.income'); }
"
```
Expected: `All 14 cups cards have valid money.income`

- [ ] **Step 4: 회귀 확인**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(기존 회귀 없음)

- [ ] **Step 5: 커밋(push는 하지 않음)**

```bash
git add data/tarot-data-cups.js
git commit -m "content(tarot): add money.income to cups suit (14 cards)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: 소드(Swords, 14장) `income` 콘텐츠 작성

**Files:**
- Modify: `data/tarot-data-swords.js`

**Interfaces:**
- Consumes: 없음
- Produces: 소드 14장의 `categories.money.upright.income`/`categories.money.reversed.income` 필드.

- [ ] **Step 1: "소드 에이스" 카드에 `income` 필드 추가 — 이후 13장의 패턴 기준**

`data/tarot-data-swords.js`에서 "소드 에이스" 카드의 `money` 블록(52~69번째 줄):

```js
          money: {
            upright: {
              consumption: "재정 상황을 명확하게 파악하며 불필요한 지출을 줄일 수 있는 시기입니다.",
              invest: {
                a: ["투자처에 대한 정보를 명확하게 파악하고 좋은 결정을 내리는 시기입니다.", "눈여겨보던 종목의 향방이 또렷하게 그려지고 있습니다.", "복잡하게 얽혀 있던 지표 사이에서 결정적인 단서 하나가 눈에 띄는 순간입니다."],
                b: ["분석한 만큼 확신을 갖고 움직여도 좋습니다.", "확보한 자료를 바탕으로 망설이지 말고 결단을 내려보세요.", "숫자로 확인한 근거가 있다면 주저 없이 움직여도 좋은 시점입니다."]
              }
            },
            reversed: {
              consumption: {
                a: ["잘못된 정보로 지출 판단이 흐려질 수 있는 시기입니다.", "그럴듯한 말에 혹해 충동적으로 결제하려는 마음이 드는 때입니다.", "광고나 후기에 휩쓸려 필요 이상으로 소비하게 됩니다."],
                b: ["충동적인 결정을 조심하세요.", "온라인 후기를 읽을 때 광고 표시와 반품 조건도 살펴보세요.", "구매 이유를 가격 할인과 실제 용도로 나누어 적어보세요."]
              },
              invest: {
                a: ["부정확한 정보로 투자 판단을 그르칠 수 있는 시기입니다.", "근거 없는 소문만 믿고 섣불리 움직이려 하고 있을 수 있는 시기입니다.", "여기저기서 들려오는 말에 자꾸만 마음이 쏠리는 때입니다."],
                b: ["출처를 다시 확인해보세요.", "공시 원문과 재무 수치를 대조한 뒤 투자 여부를 정해보세요.", "전달받은 수익 전망이 어떤 가정에 기대고 있는지 살펴보세요."]
              }
            }
          },
```

아래로 교체(`upright`/`reversed` 각각에 `income` 필드 추가, 기존 필드는 그대로):

```js
          money: {
            upright: {
              consumption: "재정 상황을 명확하게 파악하며 불필요한 지출을 줄일 수 있는 시기입니다.",
              invest: {
                a: ["투자처에 대한 정보를 명확하게 파악하고 좋은 결정을 내리는 시기입니다.", "눈여겨보던 종목의 향방이 또렷하게 그려지고 있습니다.", "복잡하게 얽혀 있던 지표 사이에서 결정적인 단서 하나가 눈에 띄는 순간입니다."],
                b: ["분석한 만큼 확신을 갖고 움직여도 좋습니다.", "확보한 자료를 바탕으로 망설이지 말고 결단을 내려보세요.", "숫자로 확인한 근거가 있다면 주저 없이 움직여도 좋은 시점입니다."]
              },
              income: {
                a: ["명확한 협상을 통해 정당한 보수를 얻어낼 수 있는 시기입니다.", "조건을 분명히 정리한 덕분에 제값을 받는 계약으로 이어지는 시기입니다.", "흐릿했던 대가가 명확한 숫자로 정리되는 시기입니다."],
                b: ["원하는 조건을 분명하게 요구해보세요.", "애매한 부분은 짚고 넘어가며 확실하게 매듭지어보세요.", "숫자로 명확히 정리한 뒤 자신 있게 제안해보세요."]
              }
            },
            reversed: {
              consumption: {
                a: ["잘못된 정보로 지출 판단이 흐려질 수 있는 시기입니다.", "그럴듯한 말에 혹해 충동적으로 결제하려는 마음이 드는 때입니다.", "광고나 후기에 휩쓸려 필요 이상으로 소비하게 됩니다."],
                b: ["충동적인 결정을 조심하세요.", "온라인 후기를 읽을 때 광고 표시와 반품 조건도 살펴보세요.", "구매 이유를 가격 할인과 실제 용도로 나누어 적어보세요."]
              },
              invest: {
                a: ["부정확한 정보로 투자 판단을 그르칠 수 있는 시기입니다.", "근거 없는 소문만 믿고 섣불리 움직이려 하고 있을 수 있는 시기입니다.", "여기저기서 들려오는 말에 자꾸만 마음이 쏠리는 때입니다."],
                b: ["출처를 다시 확인해보세요.", "공시 원문과 재무 수치를 대조한 뒤 투자 여부를 정해보세요.", "전달받은 수익 전망이 어떤 가정에 기대고 있는지 살펴보세요."]
              },
              income: {
                a: ["불명확한 조건 때문에 수입에 혼선이 생길 수 있는 시기입니다.", "잘못 전달된 정보로 예상한 보수를 받지 못할 수 있는 시기입니다.", "애매하게 넘어간 계약 조건이 나중에 발목을 잡을 수 있는 시기입니다."],
                b: ["계약이나 조건을 문서로 다시 한번 확인해보세요.", "애매한 부분은 넘어가지 말고 다시 짚고 확인해보세요.", "구두로 들은 조건도 서면으로 재차 확인해두세요."]
              }
            }
          },
```

- [ ] **Step 2: 나머지 13장(소드 2~King)에 같은 패턴 적용**

Task 1 Step 2와 동일한 방식. 소드는 사고·명료함·갈등 계열이므로, `income.upright`(명확한 협상·조건으로 정당한 보수를 얻는 흐름)와 `income.reversed`(불명확한 정보·조건으로 수입에 혼선이 생기는 흐름)로 작성한다. `consumption`/`invest`의 어휘를 재사용하지 않는다.

- [ ] **Step 3: 범위 한정 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-swords.js').TAROT_SWORDS;
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    const income = card.categories.money[o].income;
    if (!income || !Array.isArray(income.a) || income.a.length !== 3 || !Array.isArray(income.b) || income.b.length !== 3) {
      errors.push(card.name_kr + ' money.' + o + '.income missing or malformed');
    } else {
      income.a.concat(income.b).forEach(function (s, i) {
        if (typeof s !== 'string' || s.length === 0) errors.push(card.name_kr + ' money.' + o + '.income[' + i + '] empty');
      });
    }
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All 14 swords cards have valid money.income'); }
"
```
Expected: `All 14 swords cards have valid money.income`

- [ ] **Step 4: 회귀 확인**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(기존 회귀 없음)

- [ ] **Step 5: 커밋(push는 하지 않음)**

```bash
git add data/tarot-data-swords.js
git commit -m "content(tarot): add money.income to swords suit (14 cards)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: 펜타클(Pentacles, 14장) `income` 콘텐츠 작성

**Files:**
- Modify: `data/tarot-data-pentacles.js`

**Interfaces:**
- Consumes: 없음
- Produces: 펜타클 14장의 `categories.money.upright.income`/`categories.money.reversed.income` 필드.

- [ ] **Step 1: "펜타클 에이스" 카드에 `income` 필드 추가 — 이후 13장의 패턴 기준**

`data/tarot-data-pentacles.js`에서 "펜타클 에이스" 카드의 `money` 블록(34~37번째 줄):

```js
          money: {
            upright: { consumption: "필요한 곳에 안정적으로 지출할 수 있는 여유가 생기는 시기입니다.", invest: {"a":["새로운 재정적 기회가 시작되는 시기입니다.","앞으로 자산을 키울 출발점이 될 만한 제안을 접할 수 있습니다.","작은 돈을 오래 운용해볼 구체적인 선택지가 눈에 들어옵니다."],"b":["장기적인 안목으로 좋은 씨앗을 심어보세요.","얼마나 오래 유지할 수 있는지 따져 첫 운용 금액을 정해보세요.","당장의 수익보다 자산을 차곡차곡 늘릴 기반이 되는지 검토해보세요."]} },
            reversed: { consumption: "계획했던 지출이 지연되거나 예상보다 늘어날 수 있는 시기입니다.", invest: {"a":["좋은 투자 기회를 놓치거나 계획이 지연되고 있을 수 있는 시기입니다.","관심을 두던 상품을 검토하는 사이 참여할 시점이 지나갈 수 있습니다.","자금을 넣으려던 일정이 어긋나 운용 계획이 멈춰 있습니다."],"b":["준비를 더 철저히 해두세요.","참여 조건과 필요한 금액을 미리 정리해두세요.","검토가 늦어진 이유를 찾아 투자 판단에 필요한 자료를 보완해보세요."]} }
          },
```

아래로 교체(`upright`/`reversed` 각각에 `income` 필드 추가, 기존 필드는 그대로):

```js
          money: {
            upright: { consumption: "필요한 곳에 안정적으로 지출할 수 있는 여유가 생기는 시기입니다.", invest: {"a":["새로운 재정적 기회가 시작되는 시기입니다.","앞으로 자산을 키울 출발점이 될 만한 제안을 접할 수 있습니다.","작은 돈을 오래 운용해볼 구체적인 선택지가 눈에 들어옵니다."],"b":["장기적인 안목으로 좋은 씨앗을 심어보세요.","얼마나 오래 유지할 수 있는지 따져 첫 운용 금액을 정해보세요.","당장의 수익보다 자산을 차곡차곡 늘릴 기반이 되는지 검토해보세요."]}, income: {"a":["새로운 수입원의 씨앗이 될 기회가 눈앞에 나타나는 시기입니다.","구체적인 부업이나 제안이 들어와 소득을 늘릴 계기가 되는 시기입니다.","작게 시작한 일이 꾸준한 수입원으로 자리 잡을 조짐이 보이는 시기입니다."],"b":["눈앞의 기회를 놓치지 말고 구체적으로 발전시켜보세요.","작은 제안이라도 실질적인 계획으로 옮겨보세요.","지금 심은 씨앗이 꾸준한 수입으로 자랄 수 있으니 정성을 들여보세요."]} },
            reversed: { consumption: "계획했던 지출이 지연되거나 예상보다 늘어날 수 있는 시기입니다.", invest: {"a":["좋은 투자 기회를 놓치거나 계획이 지연되고 있을 수 있는 시기입니다.","관심을 두던 상품을 검토하는 사이 참여할 시점이 지나갈 수 있습니다.","자금을 넣으려던 일정이 어긋나 운용 계획이 멈춰 있습니다."],"b":["준비를 더 철저히 해두세요.","참여 조건과 필요한 금액을 미리 정리해두세요.","검토가 늦어진 이유를 찾아 투자 판단에 필요한 자료를 보완해보세요."]}, income: {"a":["기대했던 수입 기회가 불발되거나 자꾸 늦어질 수 있는 시기입니다.","확실해 보였던 제안이 조건 변경으로 흐지부지될 수 있는 시기입니다.","눈앞의 기회가 생각보다 더디게 현실이 되는 시기입니다."],"b":["조급해하지 말고 다른 기회도 함께 준비해두세요.","당장의 결과에 연연하기보다 다음 기회를 준비해보세요.","지연되는 이유를 파악하고 대안을 마련해두세요."]} }
          },
```

- [ ] **Step 2: 나머지 13장(펜타클 2~King)에 같은 패턴 적용**

Task 1 Step 2와 동일한 방식. 펜타클은 물질·실용·재정 계열이므로(재물운과 가장 직접적으로 맞닿는 슈트), `income.upright`(새로운 수입원의 씨앗·구체적인 부업/제안)와 `income.reversed`(기대했던 수입 기회의 지연·불발)로 작성한다. `consumption`/`invest`의 어휘를 재사용하지 않는다.

- [ ] **Step 3: 범위 한정 구조 검증**

Run:
```bash
node -e "
const data = require('./data/tarot-data-pentacles.js').TAROT_PENTACLES;
let errors = [];
if (data.length !== 14) errors.push('expected 14 cards, got ' + data.length);
data.forEach(function (card) {
  ['upright', 'reversed'].forEach(function (o) {
    const income = card.categories.money[o].income;
    if (!income || !Array.isArray(income.a) || income.a.length !== 3 || !Array.isArray(income.b) || income.b.length !== 3) {
      errors.push(card.name_kr + ' money.' + o + '.income missing or malformed');
    } else {
      income.a.concat(income.b).forEach(function (s, i) {
        if (typeof s !== 'string' || s.length === 0) errors.push(card.name_kr + ' money.' + o + '.income[' + i + '] empty');
      });
    }
  });
});
if (errors.length) { console.log('FAIL: ' + errors.join(', ')); process.exit(1); } else { console.log('All 14 pentacles cards have valid money.income'); }
"
```
Expected: `All 14 pentacles cards have valid money.income`

- [ ] **Step 4: 회귀 확인**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(기존 회귀 없음)

- [ ] **Step 5: 커밋(push는 하지 않음)**

```bash
git add data/tarot-data-pentacles.js
git commit -m "content(tarot): add money.income to pentacles suit (14 cards)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: UI 노출 + 테스트 하네스 연결 + 정적 페이지 재생성 + 전체 회귀 + push

**Files:**
- Modify: `data/category-labels.js`(UI 노출), `tests/tarot-data.test.js:81`(SUBDIVIDED_CATEGORIES), `tests/tarot-data.test.js:124-134`(구조 검증 루프 일반화), `tests/tarot-data.test.js:339`(FORBIDDEN_PAIRS)

**Interfaces:**
- Consumes: Task 1~5에서 78장 전부에 채워진 `categories.money.{upright,reversed}.income`.
- Produces: 없음(이 태스크가 실제로 기능을 켜는 마지막 지점).

- [ ] **Step 1: `CATEGORY_SUBCHOICES.money`에 "수입" 버튼 추가**

`data/category-labels.js`의 현재 내용:

```js
const CATEGORY_SUBCHOICES = {
  love: [{ key: 'solo', label: '솔로' }, { key: 'couple', label: '커플' }],
  money: [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }],
```

아래로 교체:

```js
const CATEGORY_SUBCHOICES = {
  love: [{ key: 'solo', label: '솔로' }, { key: 'couple', label: '커플' }],
  money: [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }, { key: 'income', label: '수입' }],
```

- [ ] **Step 2: `tests/tarot-data.test.js`의 `SUBDIVIDED_CATEGORIES.money`에 `'income'` 추가**

`tests/tarot-data.test.js`의 80~84번째 줄:

```js
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
```

아래로 교체:

```js
const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest', 'income'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
```

- [ ] **Step 3: 구조 검증 루프를 N개 서브키로 일반화**

`tests/tarot-data.test.js`의 124~134번째 줄:

```js
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      assert.ok(entry && typeof entry === 'object', card.name + ' categories.' + cat + '.' + o + ' must be an object');
      assertStringOrPool(entry[keys[0]], card.name + ' categories.' + cat + '.' + o + '.' + keys[0]);
      assertStringOrPool(entry[keys[1]], card.name + ' categories.' + cat + '.' + o + '.' + keys[1]);
      assert.notStrictEqual(JSON.stringify(entry[keys[0]]), JSON.stringify(entry[keys[1]]),
        card.name + ' categories.' + cat + '.' + o + ' sub-choices must not be identical');
    });
  });
```

아래로 교체(2개든 3개든 모든 서브키를 검증하고, 모든 키 쌍이 서로 다른지 확인):

```js
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    ['upright', 'reversed'].forEach(function (o) {
      const entry = card.categories[cat] && card.categories[cat][o];
      assert.ok(entry && typeof entry === 'object', card.name + ' categories.' + cat + '.' + o + ' must be an object');
      keys.forEach(function (key) {
        assertStringOrPool(entry[key], card.name + ' categories.' + cat + '.' + o + '.' + key);
      });
      for (let i = 0; i < keys.length; i += 1) {
        for (let j = i + 1; j < keys.length; j += 1) {
          assert.notStrictEqual(JSON.stringify(entry[keys[i]]), JSON.stringify(entry[keys[j]]),
            card.name + ' categories.' + cat + '.' + o + ' sub-choices (' + keys[i] + ', ' + keys[j] + ') must not be identical');
        }
      }
    });
  });
```

- [ ] **Step 4: `FORBIDDEN_PAIRS`의 money 쪽에 `'income'` 추가**

`tests/tarot-data.test.js`의 336~340번째 줄:

```js
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
```

아래로 교체:

```js
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest', 'income'], 'business', ['startup', 'running']]
];
```

- [ ] **Step 5: 전체 테스트 스위트 실행 — `income`이 처음으로 전방위 검증을 받는 시점**

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS. **만약 `tarot-data.test.js`가 실패하면**(예: axis 4 카드간 근접축자, axis 7 money/business 교차중복, axis 6 조합문법 등) — 실패 메시지가 가리키는 카드/축을 확인해서 해당 카드의 `income` 문장을 다시 써서 고친다(이건 정상적인 흐름이다, 원래 tarot enrichment 때도 최종 검증 단계에서 발견된 중복을 후속 수정으로 처리했다). 고친 뒤 이 스텝을 다시 실행해서 PASS를 확인한다.

- [ ] **Step 6: 정적 타로 카드 페이지 재생성**

Run: `npm run build:tarot-pages`
Expected: 명령이 에러 없이 끝나고, `tarot/*.html` 78개 파일이 갱신된다.

Run: `node scripts/run-tests.js`
Expected: 모든 파일 PASS(재생성된 페이지 관련 테스트 `generate-tarot-pages.test.js`/`render-tarot-pages.test.js` 포함, 회귀 없음).

- [ ] **Step 7: 브라우저에서 확인**

Run: preview_start `{name: "static-preview"}`로 dev 서버 열기 → `http://localhost:8080/` 접속 → 타로 모드 선택 → 카테고리에서 "재물운" 선택.

Expected:
- 재물운 세부선택 버튼이 "소비"/"투자"/"수입" 3개로 뜬다.
- "수입" 버튼을 선택하고 카드를 뽑아 결과를 확인하면, 소비/투자와는 다른(수입/소득 관련) 문구가 나온다.
- 브라우저 콘솔에 JS 에러가 없다.

Run: `http://localhost:8080/tarot/major-0-fool.html`(또는 재생성된 타로 카드 페이지 아무거나)를 열어 "재물운" 섹션에 "수입" 항목이 소비/투자와 함께 보이는지 확인.

- [ ] **Step 8: 커밋 및 push**

```bash
git add data/category-labels.js tests/tarot-data.test.js tarot/
git commit -m "feat(tarot): wire up money.income subchoice (UI + test harness + static pages)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin master
```

(이 태스크 전체가 끝나고 전체 테스트가 통과한 뒤에만 push한다 — Global Constraints 참고.)
