# 리딩 랜덤화 — 별자리 단계 설계 문서

날짜: 2026-09-03

## 목적

[띠운세 파일럿](2026-09-03-ddi-random-reading-design.md)에서 검증한 "슬롯 재조합(slot recomposition) + 풀 샘플링(pool sampling)" 방식을 두 번째 모드인 별자리(`data/zodiac-data.js`)에 그대로 적용한다. `data/zodiac-data.js`는 12궁·세분화 카테고리·서브키 구조가 띠운세와 완전히 동일하므로(양쪽 모두 방향성 없이 `categories[cat][subkey]` 2단 중첩), 접근 방식을 다시 고민할 필요 없이 검증된 패턴을 이식한다.

띠운세 최종 브랜치 리뷰에서 나온 교훈 중 **비용이 낮은 것 하나를 이번 단계부터 반영**한다: 같은 화면에 함께 렌더되는 필드(`trait`+`advice`, `showZodiacSummary()`의 "오늘의운" 경로)는 처음부터 echo 검사축에 포함한다. 반면 **비용이 큰 것(같은 엔티티 내 비금지쌍 카테고리 교차, 엔티티 간 같은 필드 교차)은 사용자 확인 하에 이번 단계에서도 보류**하고 이후 단계(사주)로 미룬다 — 띠운세에서 이미 이 축 없이도 실제 블로킹 결함이 없었음이 최종 리뷰로 검증되었고, 범위를 넓히면 콘텐츠 작성·스윕 반복 비용이 커지기 때문.

## 범위

### A. 대상 필드 (`data/zodiac-data.js`, 12궁)

- 카테고리 본문: 세분화 8개(`love/money/career/business/study/health/relationships/workplace` × 2서브키) + 단일 3개(`honor/moving/children`) = 궁당 19개
- `trait`(오늘의운 폴백) — 궁당 1개
- `keywords`(궁당 3개 → 6개 풀)
- `advice`(궁당 1개 → 3개 풀)

`name_en`/`dateRange` 등 랜덤화와 무관한 기존 필드는 변경하지 않는다.

### B. 대상 밖

- 타로/사주/궁합 콘텐츠 확장 (다음 단계로 미룸)
- 같은 엔티티 내 비금지쌍 카테고리 교차, 엔티티 간 같은 필드 교차 dedup — 사용자 확인 하에 이번 단계 보류(사주 단계 spec에서 다시 결정)
- 새 UI 요소, 새 HTML/CSS
- `js/compatibility-calc.js`(`getZodiacCompatibility`가 `ZODIAC_DATA.categories`/`trait`을 참조하지 않는 독립 로직 — 확인 완료)
- `js/app.js` 코드 변경 — **띠운세 단계에서 만든 `resolveMeaningText`/`pickRandom`/`pickKeywords`/`pickAdvice`, 그리고 `resolveCategoryMeaning`/`renderKeywordsAdviceHtml`의 타입 감지 로직을 그대로 재사용**한다. 이 헬퍼들은 이미 문자열/`{a,b}` 객체, 고정 배열/풀 배열을 모두 처리하도록 범용적으로 구현되어 있어 별자리 전용 코드 변경이 필요 없다.

## 데이터 구조 변경 (`data/zodiac-data.js`)

띠운세와 완전히 동일한 스키마:

```js
// 카테고리 본문 / trait
categories: {
  love: {
    solo: { a: ["기존 문장", "신규 변형1", "신규 변형2"], b: [...] },
    couple: { a: [...], b: [...] }
  },
  // ... 나머지 7개 세분화 카테고리
  honor: { a: [...], b: [...] },   // 단일 카테고리 3개
  moving: { a: [...], b: [...] },
  children: { a: [...], b: [...] }
},
trait: { a: [...], b: [...] },

// keywords / advice
keywords: ["기존1", "기존2", "기존3", "신규1", "신규2", "신규3"],
advice: ["기존 문장", "신규1", "신규2"]
```

기존 값이 항상 인덱스 0(`a[0]`/`b[0]`/`keywords[0..2]`/`advice[0]`)이 되며 절대 수정하지 않는다.

## Dedup 방법론

띠운세 파일럿에서 확정한 방식을 그대로 쓰되, 한 축을 추가한다:

1. **필드 내부 자기중복**: 같은 필드의 `a`풀 3개끼리, `b`풀 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합, 상투구·자기 keywords 제거 후) — `a`/`b` 둘 다 적용.
2. **금지쌍(cross-category) 교차**: 같은 궁 안에서 `love`(solo/couple)↔`relationships`(new/existing), `career`(jobseek/switch)↔`workplace`(team/personal), `money`(consumption/invest)↔`business`(startup/running). `a`풀은 3단 결합 전체(3×3 전수), `b`풀은 word-Jaccard≥0.3 단순 스윕만(이유: `b[0]`끼리는 이미 잠긴 기존 문장이라 3단 결합 적용 시 수정 불가능한 충돌이 발생할 수 있음 — 띠운세에서 실제로 발견됨).
3. **advice 풀 자기중복**: 궁당 advice 3개끼리 단순 word-Jaccard≥0.3.
4. **(신규) 렌더링 동반 echo 검사**: 모든 `advice[i]`를 모든 필드의 `b[j]`(19개 카테고리 `b`풀 + `trait.b`)와 비교, 단순 word-Jaccard≥0.3 — `showZodiacSummary()`가 카테고리 미선택 시 `trait`(a+b)와 `advice`를 같은 화면에 나란히 렌더하기 때문(띠운세 최종 리뷰에서 뱀띠 `trait.b[1]`/`advice[1]` 충돌이 이 축 없이 처음엔 통과됐다가 뒤늦게 발견된 전례가 있음).

## 잠긴 참조

**양자리**(`key: "aries"`)를 가장 먼저 정확히 작성해 나머지 11궁의 기준으로 삼는다. 잠그기 전 실제 dedup 스윕 스크립트(위 4개 축)를 돌려 0건을 확인한다([[feedback-verify-locked-reference-before-finalizing]]).

## 테스트 방식

`tests/zodiac-data.test.js`를 새 구조 기준으로 재작성한다:

- 구조 검증: 12궁 전체 `trait`+19개 카테고리 필드가 `a`/`b` 각 3개, `keywords` 6개(distinct), `advice` 3개
- 필드 내부 자기중복(축 1), 금지쌍 교차(축 2), advice 자기중복(축 3), advice↔b풀 echo(축 4)
- `getZodiacByKey()` 등 기존 조회 함수 회귀 확인

`tests/helpers/dedup.js`의 기존 export를 그대로 재사용(신규 함수 불필요) — 띠운세의 최종 형태(advice↔b풀 echo 포함)를 그대로 이식.

## 브라우저 검증

`resolveCategoryMeaning`/`renderKeywordsAdviceHtml`는 이미 검증된 공유 헬퍼이므로 이번 단계의 회귀 리스크는 낮지만, 구현 완료 후 5개 모드 전부를 브라우저에서 확인한다:

- 별자리: 같은 선택을 반복해 본문/키워드/조언이 매번 달라지는지, 자연스러운지 확인
- 타로/사주/띠운세/궁합: 기존과 동일한 결과(회귀 없음) 확인 — 특히 띠운세가 별자리 데이터 작업 중 실수로 영향받지 않았는지

## 기존 코드와의 통합 지점

- `data/zodiac-data.js`: 카테고리 본문 19개 + `trait` 1개를 `{a:[...], b:[...]}` 구조로 변경, `keywords` 3→6개, `advice` 1→3개 (12궁 전체)
- `tests/zodiac-data.test.js`: 구조 검증 대상 변경, dedup 검사 4개 축으로 재작성
- `js/app.js`: **변경 없음**(기존 헬퍼 재사용)
- `js/compatibility-calc.js`: 변경 없음(확인 완료, 독립적)

## 롤아웃 계획

이 단계 완료 후 사주 → 궁합 → 타로(별도 spec) 순으로 계속. 사주 단계 spec에서 "같은 엔티티 내 비금지쌍 교차 + 엔티티 간 같은 필드 교차" dedup 축을 추가할지 다시 결정한다.
