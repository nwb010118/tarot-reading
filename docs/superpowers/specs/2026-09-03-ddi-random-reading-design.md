# 리딩 랜덤화 — 띠운세 파일럿 설계 문서

날짜: 2026-09-03

## 목적

현재는 (엔티티+카테고리+서브초이스)가 같으면 리딩 결과가 100% 고정 문구로 나온다(타로만 카드가 뽑히는 과정은 랜덤이고, 뽑힌 뒤 문구는 고정). 이번 서브프로젝트는 "같은 선택을 반복해도 리딩이 매번 랜덤하게 달라지는" 기능을, 5개 모드(타로/사주/별자리/띠운세/궁합) 전체가 아니라 **띠운세 하나에 먼저 적용해 방법론을 검증하는 파일럿**이다.

방식은 **슬롯 재조합(slot recomposition) + 풀 샘플링(pool sampling)** — 완전히 새로 쓴 문단 여러 개를 준비하는 대신, 기존 문장을 절 단위로 쪼개 변형을 추가하고 렌더링 시점에 랜덤 조합한다. 파일럿이 통과하면 별자리 → 사주 → 궁합 → 타로 순으로 동일 기법을 확장한다(타로는 정/역방향 구조가 달라 별도 분석 필요).

범위 결정 배경: 사용자는 "본문(카테고리 텍스트)까지 랜덤"을 선택했다(주변 요소만 랜덤화하는 옵션 대비 체감 효과가 크지만 작업량도 큼). 완전변형 방식(Approach A)은 5개 서브프로젝트 전체보다 큰 작업량이 되어 채택하지 않았다.

## 범위

### A. 대상 필드 (`data/ddi-data.js`, 12개 띠)

- 카테고리 본문: 세분화 8개(`love/money/career/business/study/health/relationships/workplace` × 2서브키) + 단일 3개(`honor/moving/children`) = 띠당 19개
- `trait`(오늘의운, 카테고리 미선택 시 폴백) — 띠당 1개
- `keywords`(띠당 3개 → 6개 풀로 확장)
- `advice`(띠당 1개 → 3개 풀로 확장)

### B. 대상 밖

- 타로/사주/별자리/궁합 콘텐츠 확장 (다음 단계로 미룸)
- 새 UI 요소(점수/행운의 아이템·색깔 등) — 실제 코드 확인 결과 궁합의 % 점수(tier 고정값) 외에는 이런 필드가 앱에 존재하지 않음. 없는 기능을 새로 만드는 건 스코프 밖.
- 재추첨(같은 조합이 연속으로 나오는 것을 막는 로직) — 사용자 확인 결과 **순수 랜덤으로 진행**(직전 결과 기억 없음). 같은 필드 기준 조합 수가 충분히 많아(아래 참고) 연속 중복 체감은 낮다.
- `js/deck-logic.js`의 카드 뽑기 로직(이미 `Math.random()` 기반으로 랜덤) — 변경 없음.

## 데이터 구조 변경 (`data/ddi-data.js`)

### 카테고리 본문 / trait — 절 단위 슬롯화

기존 값(문자열)을 슬롯 객체로 바꾼다. 기존 문장이 관찰절(A, "~시기입니다")과 조언절(B, "~보세요")로 이미 자연스럽게 나뉘어 있으므로 그 경계를 그대로 쓴다.

```js
// 변경 전
love: {
  solo: "가벼운 농담 한마디로 상대의 마음을 순식간에 사로잡는 시기입니다. 고백을 서두르기보다는 편안한 분위기를 먼저 만들어보세요."
}

// 변경 후
love: {
  solo: {
    a: [
      "가벼운 농담 한마디로 상대의 마음을 순식간에 사로잡는 시기입니다.",
      "<신규 변형 1>",
      "<신규 변형 2>"
    ],
    b: [
      "고백을 서두르기보다는 편안한 분위기를 먼저 만들어보세요.",
      "<신규 변형 1>",
      "<신규 변형 2>"
    ]
  }
}
```

`trait`도 동일하게 `{ a: [...], b: [...] }`로 바꾼다(기존 두 문장을 A/B로 분리).

필드당 A/B 각 3개(9가지 조합). 대상 필드 20개(19 카테고리 + trait) × 12띠 = 240필드 → 신규 문장 약 960개(필드당 A 2개 + B 2개).

### keywords / advice — 풀 확장

```js
// 변경 전
keywords: ["재치", "순발력", "다재다능"],
advice: "임기응변만큼 꾸준한 마무리를 챙기면 성과가 더 오래갑니다."

// 변경 후
keywords: ["재치", "순발력", "다재다능", "<신규1>", "<신규2>", "<신규3>"],
advice: ["임기응변만큼 꾸준한 마무리를 챙기면 성과가 더 오래갑니다.", "<신규1>", "<신규2>"]
```

keywords는 렌더링 시 6개 중 3개를 무작위 샘플링(20가지 조합), advice는 3개 중 1개 무작위 선택.

### A/B 슬롯 조합의 일관성

A/B는 항상 같은 필드(같은 띠+카테고리+서브초이스) 안에서만 섞이며, 다른 필드의 절과는 섞이지 않는다. 즉 "솔로 문맥 A + 커플 문맥 B" 같은 오조합은 구조적으로 불가능하다 — 별도의 조합-일관성 검증 도구는 만들지 않는다.

## 렌더링 로직 변경 (`js/app.js`)

### 신규 헬퍼

```js
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveMeaningText(value) {
  return (typeof value === 'string') ? value : (pickRandom(value.a) + ' ' + pickRandom(value.b));
}

function pickKeywords(keywordsPool, count) {
  count = count || 3;
  if (!keywordsPool || keywordsPool.length <= count) return keywordsPool;
  const shuffled = keywordsPool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, count);
}

function pickAdvice(advicePool) {
  return Array.isArray(advicePool) ? pickRandom(advicePool) : advicePool;
}
```

### 기존 함수 수정 — 문자열/객체 둘 다 지원(하위 호환)

```js
function resolveCategoryMeaning(entity, category, period, selectedSubChoice) {
  if (category && entity.categories[category]) {
    const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
    return PERIOD_PREFIXES[period] + ' ' + resolveMeaningText(readingText);
  }
  return resolveMeaningText(entity.trait);
}

function renderKeywordsAdviceHtml(keywordsList, adviceText) {
  const resolvedKeywords = pickKeywords(keywordsList);
  const resolvedAdvice = pickAdvice(adviceText);
  return (resolvedKeywords && resolvedAdvice)
    ? '<div class="card-extra"><p class="card-keywords">키워드: ' + resolvedKeywords.join(' · ') + '</p><p class="card-advice">조언: ' + resolvedAdvice + '</p></div>'
    : '';
}
```

`resolveCategoryMeaning`은 값이 문자열이면 그대로, 객체(`{a,b}`)면 랜덤 조합을 반환한다 — **사주/별자리/궁합 등 아직 마이그레이션하지 않은 모드는 전부 문자열이라 동작이 전혀 바뀌지 않는다.**

`renderKeywordsAdviceHtml`은 5개 모드 호출부(`showZodiacSummary`, `showDdiSummary`, `showSajuSummary`, `showCompatibilitySummary`, 타로 `showSummary`)가 공유하는 함수다. `pickKeywords`/`pickAdvice`를 이 함수 내부에서 호출하도록 바꾸면 **호출부 코드는 한 줄도 안 바꿔도 된다** — keywords/advice가 배열/풀이 아니면(띠운세를 제외한 나머지 4개 모드) 그대로 통과, 띠운세만 풀에서 랜덤 선택된다.

### 타로는 별도 경로 — 이번 범위 아님

타로 `showSummary()`(app.js:761-787)는 `resolveCategoryMeaning`을 쓰지 않고 `resolveSubchoiceValue`를 직접 호출하는 독립된 로직이다. `renderKeywordsAdviceHtml` 변경은 타로에도 자동 적용되지만(keywords/advice가 배열이 아니므로 현재는 무영향), 카테고리 본문 슬롯화는 타로 자체 마이그레이션 시 별도로 설계한다.

## 콘텐츠 작성 규칙 & 중복 방지

- **잠긴 참조 예시**: 원숭이띠(`key: "monkey"`) — 가장 먼저 A/B 각 3개를 정확히 작성해 이후 11개 띠의 기준으로 삼는다. 잠그기 전 [[feedback-verify-locked-reference-before-finalizing]]에 따라 실제 dedup 스크립트로 검증한다.
- 같은 필드 안의 A풀 3개는 서로 유사문형(mad-libs) 반복 금지, B풀도 동일.
- 기존 5개 서브프로젝트에서 확정한 중복검사 3단 결합([[feedback-korean-dedup-metric]], [[feedback-dedup-blind-spot-below-threshold]])을 그대로 재사용하되, **검사 단위를 "완결된 필드 텍스트"에서 "A풀 문장(전체 띠·필드 가로질러 flatten)"과 "B풀 문장(동일하게 flatten)"으로 바꾼다**:
  1. 전체 문장 쌍 word-Jaccard ≥ 0.3 스윕 (A풀끼리, B풀끼리 각각)
  2. word-Jaccard ≥ 0.20 AND 트라이그램 Jaccard ≥ 0.15 결합 스윕
  3. (종결 상투구 제거 후) 최장공통부분문자열 ≥ 5자 OR 문자 bigram-Jaccard OR 공유 어근 개수 기반 보조 스윕
- keywords 풀(6개) 확장분도 기존 keywords dedup 검사에 포함.
- advice 풀(3개) 확장분도 기존 advice dedup 검사에 포함.
- 자동 도구는 보조 수단 — 사람이 A풀/B풀을 나란히 읽고 대조하는 단계를 반드시 거친다.

## 테스트 방식

`tests/ddi-data.test.js`를 수정한다(구조 검증 대상이 문자열 → `{a,b}` 객체로 바뀌므로 기존 테스트도 업데이트 필요):

- **구조 검증**: 12개 띠 전체 A/B 배열이 각 3개씩 존재, keywords 6개, advice 3개
- **A풀/B풀 dedup**: `tests/helpers/dedup.js`의 기존 판정 함수를 재사용해 flatten된 A풀·B풀에 3단 스윕 적용
- **keywords/advice 풀 dedup**: 기존 로직 그대로, 대상만 확장된 배열로
- **회귀**: `getDdiByYear()`, `resolveCategoryMeaning`/`renderKeywordsAdviceHtml`가 문자열 입력에서 기존과 동일한 결과를 반환하는지(사주/별자리/궁합/타로용 회귀 케이스) 확인 — 공유 함수 변경이라 다른 4개 모드도 함께 검증

## 브라우저 검증

`js/app.js`의 공유 헬퍼(`resolveCategoryMeaning`, `renderKeywordsAdviceHtml`)를 바꾸므로, 구현 완료 후 5개 모드 전부를 브라우저에서 확인한다:

- 띠운세: 같은 선택을 여러 번 반복해 카테고리 본문/키워드/조언이 매번 달라지는지, 그러면서도 문맥이 어색하지 않은지 확인
- 타로/사주/별자리/궁합: 기존과 동일한 고정 문구가 그대로 나오는지(회귀 없음) 확인

## 기존 코드와의 통합 지점

- `data/ddi-data.js`: 카테고리 본문 19개 + `trait` 1개를 `{a:[...], b:[...]}` 구조로 변경, `keywords` 3→6개, `advice` 1→3개 (12개 띠 전체)
- `js/app.js`: 신규 헬퍼 `pickRandom`/`resolveMeaningText`/`pickKeywords`/`pickAdvice` 추가, `resolveCategoryMeaning`/`renderKeywordsAdviceHtml` 수정(하위 호환 유지)
- `tests/ddi-data.test.js`: 구조 검증 대상 변경, dedup 검사 단위를 필드→A풀/B풀로 변경
- `tests/helpers/dedup.js`: 기존 판정 함수 재사용, 신규 헬퍼 불필요(flatten만 호출부에서 처리)

## 롤아웃 계획

파일럿(띠운세) 완료 후:

1. 별자리 — 띠운세와 구조 동일, 동일 기법 그대로 적용
2. 사주(`ilgan`) — `resolveCategoryMeaning` 뒤에 오행 균형 문장이 붙는 차이만 있음, 동일 기법 적용 가능
3. 궁합 — `tierInfo.text`/`keywords`/`advice` 구조 확인 후 적용
4. 타로 — 정/역방향 × 78장 구조가 달라 별도 설계 필요(가장 규모가 큼, 별도 spec 작성 예정)

각 단계는 이번 문서와 동일하게 독립된 spec → plan →구현 사이클을 거친다.
