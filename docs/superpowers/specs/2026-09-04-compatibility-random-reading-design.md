# 리딩 랜덤화 — 궁합 단계 설계 문서

날짜: 2026-09-04

## 목적

띠운세·별자리·사주에서 검증한 "슬롯 재조합(slot recomposition) + 풀 샘플링(pool sampling)" 방식을 네 번째 모드인 궁합(`data/compatibility-data.js`)에 적용한다. 궁합은 다른 3개 모드와 데이터 구조가 근본적으로 다르다 — 12궁/10일간/12띠처럼 "엔티티 × 카테고리(19개)" 구조가 아니라, **11개 궁합 티어(tier) × 필드 1개(`text`)** 구조다. 카테고리 개념 자체가 없으므로 범위와 dedup 방법론을 이 구조에 맞게 단순화한다.

사주 최종 브랜치 리뷰의 권고 두 가지를 이번 단계부터 반영한다: (1) "잠긴-잠긴 비교는 스킵" 규칙을 axis 설계 시점부터 모든 축에 표준으로 적용(이전엔 실행 중에야 발견해서 땜질했음), (2) 엔티티(이 프로젝트에선 "티어") 간 완전동일·근접축자 검사를 처음부터 포함. 착수 전 확인차 사주에서 쓴 이 검사를 이미 배포된 `data/ddi-data.js`/`data/zodiac-data.js`에 돌려본 결과 별자리는 깨끗했고 띠운세에서 근접 중복 2건이 발견되어 별도 백그라운드 작업으로 분리했다(이번 궁합 작업 범위 밖).

## 범위

### A. 대상 필드 (`data/compatibility-data.js`, `COMPAT_TIER_DATA` 11개 티어)

- `text`: 티어당 1개(카테고리 세분화 없음) → `{a:[3], b:[3]}` 풀. 기존 문장은 항상 두 문장으로 쓰여 있고 **첫 문장에만 `{a}`/`{b}` 이름 자리표시자가 등장, 둘째 문장엔 등장하지 않는다** — 이 관례를 신규 변형에도 그대로 따른다(신규 `a[1]`/`a[2]`는 `{a}`/`{b}`를 정확히 1회씩 포함, 신규 `b[1]`/`b[2]`는 포함하지 않음).
- `keywords`: 티어당 3개 → 6개 풀.
- `advice`: 티어당 1개 → 3개 풀.

### B. 대상 밖

- 타로 콘텐츠 확장(다음 단계, 별도 spec — 사용자 확인 완료로 궁합 다음 바로 진행).
- `score`(숫자, 티어별 고정), `label`/`tierLabel`(짧은 고정 라벨, 예: "동일원소 — 최고의 궁합") — 실제 계산된 결과·고정 명칭이라 랜덤화 대상 아님(사주의 `ELEMENT_BALANCE_TEXT`와 같은 성격).
- `js/app.js` 코드 변경 — 이 파일은 전혀 건드리지 않는다. `renderKeywordsAdviceHtml()`이 이미 문자열/풀 배열을 모두 처리하므로 `keywords`/`advice`는 그대로 재사용된다.
- 공유 dedup 테스트 헬퍼 추출 — 이번에도 미룬다(사용자 확인 완료). 최종 리뷰어가 "타로 단계 전"이라고 명시했고, 궁합은 카테고리가 없는 구조라 지금 무리하게 공유화하면 추상화가 어색해진다.
- 이미 배포된 `data/ddi-data.js`의 근접 중복 2건 수정 — 별도 백그라운드 작업으로 분리됨(이 spec 범위 아님).

## 데이터 구조 변경 (`data/compatibility-data.js`)

```js
// 변경 전
same_element: {
  score: 90,
  label: '동일원소 — 최고의 궁합',
  text: '{a}와(과) {b}은(는) 같은 원소라 마음이 잘 통하는 궁합이에요. 비슷한 방식으로 세상을 바라보니 대화가 잘 통합니다.',
  keywords: ["공감", "편안함", "동질감"],
  advice: "닮은 점이 많은 만큼, 가끔은 서로의 다른 부분에도 관심을 기울이면 관계가 더 풍성해질 거예요."
}

// 변경 후
same_element: {
  score: 90,
  label: '동일원소 — 최고의 궁합',
  text: {
    a: [
      '{a}와(과) {b}은(는) 같은 원소라 마음이 잘 통하는 궁합이에요.',
      '<신규 변형 1 — {a}/{b} 각 1회 포함>',
      '<신규 변형 2 — {a}/{b} 각 1회 포함>'
    ],
    b: [
      '비슷한 방식으로 세상을 바라보니 대화가 잘 통합니다.',
      '<신규 변형 1 — 이름 자리표시자 없음>',
      '<신규 변형 2 — 이름 자리표시자 없음>'
    ]
  },
  keywords: ["공감", "편안함", "동질감", "<신규1>", "<신규2>", "<신규3>"],
  advice: ["닮은 점이 많은 만큼, 가끔은 서로의 다른 부분에도 관심을 기울이면 관계가 더 풍성해질 거예요.", "<신규1>", "<신규2>"]
}
```

`score`/`label`은 그대로 둔다.

## `data/compatibility-data.js`의 `getCompatTierInfo()` 코드 변경

이 프로젝트에서 유일하게(데이터 외에) 코드 변경이 필요한 단계다(띠운세 파일럿 이후 다른 두 단계는 코드 변경 0건이었음) — 이유는 `{a}`/`{b}` 이름 치환 로직이 `getCompatTierInfo()`(`js/compatibility-calc.js`가 아니라 **`data/compatibility-data.js` 자신에 정의되어 있다** — `module.exports`에서도 `COMPAT_TIER_DATA`와 함께 export됨) 안에 있어서, `js/app.js`의 IIFE 안에 갇힌 `resolveMeaningText` 같은 기존 헬퍼를 재사용할 수 없기 때문이다. `js/compatibility-calc.js`는 이번 변경과 무관하다(궁합 등급을 "판정"하는 로직만 있고, 등급의 문구를 "조회/치환"하는 `getCompatTierInfo`는 없음).

```js
// 신규 헬퍼 2개 추가
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function resolveTierText(data) {
  return typeof data.text === 'string' ? data.text : (pickRandom(data.text.a) + ' ' + pickRandom(data.text.b));
}

// getCompatTierInfo 수정 — text 줄만 변경, keywords/advice는 그대로 통과(app.js가 처리)
function getCompatTierInfo(tier, labelA, labelB) {
  const data = COMPAT_TIER_DATA[tier];
  return {
    score: data.score,
    tierLabel: data.label,
    text: resolveTierText(data).replace('{a}', labelA).replace('{b}', labelB),
    keywords: data.keywords,
    advice: data.advice
  };
}
```

`keywords: data.keywords`/`advice: data.advice` 줄은 **한 글자도 바꾸지 않는다** — 6개/3개 풀을 그대로 `tierInfo`에 실어 보내면 `js/app.js`의 `renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice)`(변경 없음)가 알아서 랜덤 샘플링한다. `resolveTierText`는 `typeof data.text === 'string'`이면 그대로 반환하므로, 혹시 마이그레이션이 부분적으로 진행 중이어도(이 프로젝트에선 11개 전부 한 번에 바꾸지만) 안전하다.

## Dedup 방법론 — 4개 축

카테고리·서브키·금지쌍 개념이 아예 없으므로 앞선 3개 모드보다 축이 단순하다:

1. **필드 내부 자기중복**: 같은 티어의 `text.a` 3개끼리, `text.b` 3개끼리 각각 3단 결합(word-Jaccard≥0.3 + word≥0.20∧trigram≥0.15 + LCS≥5∨어근중복≥2∨bigram≥0.185, 상투구·자기 keywords 제거 후).
2. **advice 풀 자기중복**: 티어당 advice 3개끼리 word-Jaccard≥0.3 단순 스윕.
3. **advice↔자기 text.b풀 echo**: `showCompatibilitySummary()`가 `text`와 `renderKeywordsAdviceHtml`의 advice를 같은 화면에 나란히 렌더하므로, 모든 `advice[i]`를 그 티어의 `text.b[j]`와 비교. 판정: `word-Jaccard≥0.3 OR bigram≥0.30 OR LCS≥10`(사주에서 확정한 강화 지표를 그대로 이식). 비교 전 양쪽 상투구 제거.
4. **티어 간 완전동일 + 근접축자**: 11개 티어 전체의 `text.a`/`text.b`/`advice` 풀을 모아 (a) 바이트 단위 완전 동일 문자열 검사, (b) 티어가 다른 `text.a`↔`text.a`, `text.b`↔`text.b` 조합에 LCS≥20 검사(상투구 제거 후). **`{a}`/`{b}` 자리표시자는 비교 전에 제거하지 않는다** — 자리표시자 자체가 텍스트에 포함된 채로 비교해도 다른 티어의 실제 문장 내용과의 유사도 판정에는 영향이 없다(자리표시자는 모든 `text.a` 변형에 공통으로 들어가는 짧은 상수 문자열이라 LCS 계산에 미미한 영향만 준다 — 실제로 유의미한 LCS 20자 이상 겹침은 자리표시자 부분이 아니라 그 뒤의 실제 서술 내용에서 발생한다).
   - **모든 축에 "잠긴-잠긴 비교는 스킵" 규칙 적용**: 인덱스 0(잠긴 참조 티어를 포함해 모든 티어의 기존 문장)끼리 비교했을 때 충돌이 나오면 스킵한다(수정 불가능하므로).

## 잠긴 참조

**`same_element`** 티어를 가장 먼저 정확히 작성해 나머지 10개 티어의 기준으로 삼는다. 잠그기 전 실제 dedup 스윕 스크립트(위 4개 축 전부)를 돌려 0건을 확인한다.

## 테스트 방식

`tests/compatibility-data.test.js`를 새 구조 기준으로 재작성한다:

- 구조 검증: 11개 티어 전체 `text.a`/`text.b`가 각 3개, `keywords` 6개(distinct), `advice` 3개. `score`/`label`은 원본과 동일한지(값 변경 없음) 확인. `text.a`의 각 변형이 `{a}`와 `{b}`를 정확히 1회씩 포함하는지, `text.b`의 각 변형은 포함하지 않는지 검증(신규 규칙 위반을 자동으로 잡기 위함).
- 위 4개 축 전부 구현.
- `getCompatTierInfo(tier, labelA, labelB)` 회귀 확인: 알려진 티어에 대해 반환값의 `score`/`tierLabel`이 원본과 같은지, `text`에 `{a}`/`{b}` 자리표시자가 남아있지 않고 실제 이름으로 치환됐는지 확인.

`tests/helpers/dedup.js`의 기존 export를 재사용.

## 브라우저 검증

구현 완료 후 5개 모드 전부를 브라우저에서 확인한다:

- 궁합: 같은 두 대상으로 반복 실행해 해설 문장(이름 치환 포함)·키워드·조언이 매번 달라지는지, 이름이 항상 올바르게 치환되는지, advice와 함께 봤을 때 자연스러운지 확인.
- 타로/띠운세/별자리/사주: 기존과 동일한 동작(고정 또는 이미 검증된 랜덤화) 유지 확인 — `js/app.js`와 `js/compatibility-calc.js` 둘 다 이번에도 건드리지 않으므로(변경은 `data/compatibility-data.js`에만 한정) 회귀 리스크는 낮지만 재확인.

## 기존 코드와의 통합 지점

- `data/compatibility-data.js`: `text` 필드를 `{a:[...], b:[...]}` 구조로 변경(11개 티어), `keywords` 3→6개, `advice` 1→3개. 같은 파일의 `pickRandom`/`resolveTierText` 헬퍼 추가, `getCompatTierInfo()`의 `text:` 반환 줄 수정.
- `js/compatibility-calc.js`: 변경 없음.
- `tests/compatibility-data.test.js`: 구조 검증 대상 변경, dedup 검사 4개 축으로 재작성(기존에 이미 있던 keyword/label 자기중복 검사, `getCompatTierInfo()` 회귀 검사, 잠긴 score/label 검사는 새 구조에 맞게 유지·조정), `getCompatTierInfo()` 회귀 확인 갱신(치환 후 `{a}`/`{b}`가 남아있지 않은지 확인).
- `js/app.js`: 변경 없음.

## 롤아웃 계획

이 단계 완료 후 **타로**로 진행한다(사용자 확인 완료). 타로는 78장 × 정/역방향 구조라 다른 4개 모드와 또 다르므로 별도 spec에서 처음부터 설계한다 — 이번 궁합 단계에서 확정한 "잠긴-잠긴 스킵을 처음부터 표준으로", "엔티티 간 완전동일+근접축자 축을 처음부터 포함"이라는 두 원칙은 타로 단계에도 그대로 적용한다. 타로 단계 spec 작성 시 데이터 페이로드 전략(지연 로딩/파일 분할)도 함께 고려한다(`data/` 전체가 계속 커지고 있음).
