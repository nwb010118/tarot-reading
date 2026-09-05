# 타로(tarot) 리딩 랜덤화 — 설계 스펙

## 배경

"같은 선택을 반복해도 리딩이 매번 랜덤하게 달라지는" 기능(리딩 랜덤화 프로젝트)을 5개 운세 모드에 순차 적용 중이다. 띠운세 → 별자리 → 사주 → 궁합까지 완료·master 병합됐고, 이번이 마지막 단계인 타로다.

핵심 설계(슬롯 재조합 + 풀 샘플링)는 4개 모드 공통:
- 고정 문자열 필드를 `{a: [3개 변형], b: [3개 변형]}` 풀로 바꾸고, 렌더링 시 `a`에서 하나·`b`에서 하나를 랜덤으로 뽑아 이어붙인다. 인덱스 0은 항상 기존(원본) 문구이며 **잠김(수정 불가)**, 신규 변형은 인덱스 1/2에만 추가한다.
- `keywords`: 고정 3개 → 6개 풀로 확장, 렌더링 시 Fisher-Yates로 3개 샘플링.
- `advice`: 고정 1개 문자열 → 3개 풀로 확장, 렌더링 시 1개 랜덤 선택.
- `js/app.js`에 이미 존재하는 범용 헬퍼(`pickRandom`, `resolveMeaningText`, `pickKeywords`, `pickAdvice`)가 문자열/배열/객체 타입을 감지해 신구 데이터를 모두 처리한다 — 별자리·사주·궁합 단계에서 이 헬퍼들을 전혀 건드리지 않고도 그대로 재사용했다.

## 타로의 구조적 차이와 범위 결정

타로는 카드 78장 × 정방향/역방향 × 카테고리(11개, 그중 8개는 하위선택 2종류씩)라는 3중 구조를 갖고, 카테고리별 세부 텍스트만 **2,964개** 리프 필드가 존재한다(상단 정/역방향 요약 156개, 키워드 배열 156개, 조언 156개는 별도). 이는 지금까지 가장 컸던 사주/별자리/띠운세(각 약 300개 안팎)의 약 10배 규모다.

**결정(사용자 승인): 범위를 축소한다.** 이번 단계에서는 카드의 **상단 정/역방향 기본 해설(`card.upright`/`card.reversed`) + 키워드(`keywords.upright/reversed`) + 조언(`advice.upright/reversed`)만** 랜덤화 대상으로 하고, 카테고리별 세부 텍스트(2,964개)는 이번엔 손대지 않고 고정 유지한다.

이 축소로 대상 필드는 총 **468개**(78장 × [정방향 본문 + 역방향 본문 + 키워드upright + 키워드reversed + 조언upright + 조언reversed] = 78 × 6)로, 기존에 완료한 모드 1개 분량의 1.5~2배 수준이다.

**영향 범위:**
- 카테고리를 선택하지 않은 "오늘의운" 기본 리딩(가장 많이 쓰이는 화면)은 완전히 랜덤화된다.
- 카테고리를 선택한 리딩은 본문 해설은 지금처럼 고정이지만, 함께 표시되는 키워드/조언은 랜덤화된다.
- 이후 별도 단계에서 카테고리별 텍스트까지 확장할 수 있으나, 이번 스펙의 범위는 아니다.

## 데이터 변경 (`data/tarot-data-{major,wands,cups,swords,pentacles}.js`)

카드별로 다음 5개 필드를 아래와 같이 변환한다 (변경 대상 파일은 5개로 나뉘어 있음: `tarot-data-major.js`(22장), `tarot-data-wands.js`/`-cups.js`/`-swords.js`/`-pentacles.js`(각 14장)):

- `upright`(문자열) → `{a: [3], b: [3]}`. 원본 문장(보통 3~4개 문장)을 자연스러운 지점에서 둘로 나눠 전반부를 `a[0]`, 후반부를 `b[0]`으로 삼는다(둘 다 잠김). `a[1,2]`/`b[1,2]`에 신규 변형을 추가한다.
- `reversed`(문자열) → `{a: [3], b: [3]}`. 위와 동일한 방식.
- `keywords.upright`(3개 배열) → 6개 배열. 기존 3개는 `[0,1,2]`(잠김), 신규 3개를 `[3,4,5]`로 추가.
- `keywords.reversed`(3개 배열) → 6개 배열. 위와 동일.
- `advice.upright`(문자열) → `[3]` 배열. 기존 문구를 `[0]`(잠김)으로, 신규 2개를 `[1,2]`로 추가.
- `advice.reversed`(문자열) → `[3]` 배열. 위와 동일.
- `categories` 필드는 전혀 건드리지 않는다.

## 코드 변경 (`js/app.js`, 1줄만 변경)

`showSummary()`(현재 795~796행)의 카테고리 미선택 분기:

```javascript
// 변경 전
const baseMeaning = categoryReading
  ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
  : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);

// 변경 후
const baseMeaning = categoryReading
  ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
  : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
```

`categoryReading`이 있을 때(카테고리 선택 시)는 `categoryReading[item.orientation]`이 여전히 평범한 문자열(또는 하위선택 객체)이므로 `resolveSubchoiceValue`의 동작은 변하지 않는다 — 카테고리 텍스트는 이번 스펙에서 손대지 않기 때문이다.

`renderKeywordsAdviceHtml(keywordsList, adviceText)`(799~801행)는 이미 배열/문자열을 모두 제네릭하게 처리하므로 수정이 필요 없다. `js/app.js`의 다른 어떤 부분도, `js/compatibility-calc.js`나 다른 파일도 변경하지 않는다 — 이번 프로젝트 전체를 통틀어 가장 작은 코드 변경(1줄)이다.

## 중복 검사 축 (`tests/tarot-data.test.js`)

사주·궁합 단계에서 확립된 "잠긴 문장끼리(또는 잠긴 문장-잠긴 문장) 비교는 스킵" 규칙을 스펙 작성 시점부터 모든 축에 표준으로 반영한다.

- **축 1 — 필드 내부 자기중복**: 카드마다 `upright.a`/`upright.b`/`reversed.a`/`reversed.b` 각각 내부에서 3개 변형이 서로 겹치지 않는지 검사(3-tier 조합: word-Jaccard≥0.3 단독 / word≥0.20∧trigram≥0.15 병합 / LCS≥5∨stem-overlap≥2∨bigram≥0.185 병합, 자기 키워드 stripping 포함).
- **축 2 — advice 자기중복**: 카드마다 `advice.upright`, `advice.reversed` 각 풀 내부 자기중복(word-Jaccard≥0.3).
- **축 3 — echo(같은 화면에 함께 렌더링되는 대상들)**: 카드+방향 단위로 다음을 모두 검사(word≥0.3 OR bigram≥0.30 OR LCS≥10, 잠김-잠김 스킵):
  - advice ↔ 같은 카드·같은 방향의 `upright.b`/`reversed.b`(본문 후반절과 항상 함께 렌더링됨)
  - advice ↔ 같은 카드·같은 방향의 카테고리 텍스트 11개(고정, 카테고리 선택 시 advice와 나란히 렌더링되므로) — 카드 범위로 한정, 전체 78장 전수 비교는 하지 않는다(애초에 다른 카드의 카테고리 텍스트와는 함께 렌더링될 일이 없기 때문).
- **축 4 — 카드 간 완전동일 + 근접축자**: `upright.a`/`upright.b`/`reversed.a`/`reversed.b` 전체(78장×2방향×2슬롯)를 대상으로 카드를 넘나드는 완전 동일 문자열, 그리고 LCS≥20 근접축자를 검사(잠김-잠김 스킵).
- **축 5 — keyword 자기 echo**: 카드+방향 단위로 키워드가 같은 카드·같은 방향의 `upright`/`reversed` 본문(a+b), advice 풀, 카테고리 텍스트(11개, 고정) 어디에도 리터럴 부분 문자열로 등장하지 않는지 검사.

## 검증

- `node scripts/run-tests.js`로 전체 10개 테스트 파일 통과 확인(신규 `tarot-data.test.js` 포함, 기존 `tarot-data.test.js`의 카드 78장/ID 유일성/orientation 존재 등 구조 검증은 유지하고 신규 축을 추가).
- 브라우저 검증: 카드 뽑기 → 카테고리 미선택 상태로 결과 확인 → "새 리딩 시작"으로 동일 카드가 나올 때까지(또는 동일 조건 반복 가능한 경로가 있다면 그 경로로) 반복해 본문/키워드/조언이 달라지는지 확인. 카테고리 선택 시 본문은 고정, 키워드/조언만 달라지는지 확인. 다른 4개 모드(띠운세/별자리/사주/궁합) 회귀 확인.

## 데이터 용량

이번 축소 범위(468개 필드)는 카테고리 텍스트(2,964개)를 건드리지 않으므로, `data/tarot-data-*.js` 5개 파일의 용량 증가폭은 기존에 완료한 모드 1개 분량의 1.5~2배 수준에 그친다. 이번 단계에서 lazy-loading 등 데이터 페이로드 전략은 불필요하다고 판단한다. 추후 카테고리별 텍스트까지 확장하는 별도 단계가 생긴다면 그때 `data/` 전체 용량과 로딩 전략을 다시 검토한다.

## 이번 스펙에서 다루지 않는 것 (다음 단계로 이연)

- 카테고리별 세부 텍스트(2,964개 필드)의 랜덤화.
- **공유 dedup 헬퍼 추출**(사용자 결정, 확정): `tests/tarot-data.test.js`도 기존 4개 모드(`tests/{ddi,zodiac,saju,compatibility}-data.test.js`)와 마찬가지로 `tests/helpers/dedup.js`의 공용 함수만 가져다 쓰고, 축 자체는 이 파일 안에 복붙해서 작성한다. `tests/helpers/dedup-axes.js`로의 리팩토링(엔티티 모양을 파라미터로 받는 공통 축 추출, 같은 필드 내 `a[i]` vs `b[j]` 교차 검사 신규 축, ddi/zodiac에 대한 근접축자 소급 적용, advice를 cross-entity exact-match 축에 포함, index-0 콘텐츠 영구 락)는 5개 모드가 모두 끝난 뒤 **별도의 후속 프로젝트**로 진행한다.
