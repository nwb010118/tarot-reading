# 궁합 리딩 풍부화 설계 문서

날짜: 2026-09-03

## 목적

5개 모드(타로→사주→별자리→띠운세→**궁합**) 리딩 풍부화 계획 중 **다섯 번째이자 마지막 서브프로젝트(궁합)**다. 타로·사주·별자리·띠운세에서 확정한 "풍부함의 패턴"(문장 확장 + 키워드/조언 추가)을 궁합에도 적용하되, 궁합은 데이터 구조가 근본적으로 다르므로 그에 맞게 조정한다.

**구조적 차이**: 다른 4개 모드는 "개체(카드/일간/별자리/띠) × 11개 카테고리"의 2차원 구조이고 사용자가 카테고리를 직접 선택한다. 궁합은 **"11개 궁합 등급(same_element/complement/other/samhap/yukhap/same/none/chung/sangsaeng/bihwa/sanggeuk)" 1차원 구조**이며, 각 등급은 `{a}`/`{b}` 치환 템플릿 문장 하나만 가진 채 세 가지 하위타입(별자리 궁합 3등급, 띠 궁합 5등급, 사주 궁합 3등급 — 총 11개 고유 키)에 걸쳐 재사용된다. 카테고리 선택 UI 자체가 없다.

## 범위

- 11개 궁합 등급 각각의 `text`를 1문장 → 2~3문장으로 확장
- 등급당 `keywords`(3개) + `advice`(1문장) 추가
- 결과 화면에 기존 `renderKeywordsAdviceHtml()` 헬퍼(띠운세 서브프로젝트에서 `js/app.js`에 만든 공용 헬퍼)를 그대로 재사용해 키워드/조언 박스 표시

범위 밖: `score`/`label` 변경(다른 모드의 `trait`처럼 고정값 취급), 카테고리/하위선택 UI 추가(사용자 확인 완료 — 궁합 점수 자체를 카테고리별로 나누는 것은 이번 서브프로젝트 범위가 아님), `js/compatibility-calc.js`의 등급 산출 로직 변경, 새 HTML 마크업(기존 결과 패널 재사용).

## 데이터 구조 변경 (`data/compatibility-data.js`)

```js
same_element: {
  score: 90,
  label: '동일원소 — 최고의 궁합',
  text: '2~3문장으로 확장된 궁합 설명 ({a}/{b} 치환 유지)',
  keywords: ["...", "...", "..."],
  advice: "1문장"
}
```

`{a}`/`{b}` 치환은 `text` 필드에서 기존과 동일하게 유지한다(`getCompatTierInfo()`가 `.replace('{a}', labelA).replace('{b}', labelB)`로 처리). `keywords`/`advice`는 두 사람의 이름과 무관한 등급 자체의 성격을 설명하므로 치환 플레이스홀더가 필요 없다.

## 콘텐츠 작성 규칙 & 중복 방지 (이번 모드에 맞게 조정)

- **금지쌍 개념 없음**: 다른 모드는 "연애운↔대인관계운"처럼 반대되는 카테고리 쌍만 비교했지만, 궁합은 카테고리가 없으므로 **11개 등급 전체를 서로** 비교한다(C(11,2)=55쌍). 어떤 두 등급도 문장 뼈대를 공유하면 안 된다.
- **잠긴 참조 예시**: `same_element`(객체의 첫 키) — 가장 먼저 정확히 작성해 이후 10개 등급 작성의 기준으로 삼는다. 이후 절대 수정하지 않는다.
- **띠운세 서브프로젝트 최종 리뷰의 교훈을 처음부터 반영** ([[feedback-dedup-blind-spot-below-threshold]] 참고):
  1. 오프닝 문장뿐 아니라 **모든 문장 위치끼리** 비교한다(오프닝-오프닝, 오프닝-두번째, 두번째-두번째 전부).
  2. `advice`가 **같은 화면에 함께 렌더되는 자기 자신의 `text`**와 겹치지 않는지 등급마다 확인한다(다른 등급의 `advice`끼리 비교하는 것과는 별개 축).
  3. 같은 필드(등급) 내에서 두 번째 문장이 첫 번째 문장을 다른 단어로 반복하는 재진술 패딩 금지.
- **중복검사 도구**: 별자리·띠운세 프로젝트에서 확정한 최종 3단 결합 방식을 처음부터 사용한다 — (1) 모든 문장 쌍 word-Jaccard≥0.3 전체 스윕, (2) 오프닝 문장끼리 word-Jaccard≥0.20 AND 트라이그램 Jaccard≥0.15 결합 스윕, (3) 오프닝 문장끼리 (종결 상투구·자기 keywords 제거 후) LCS≥5 OR 공유어근≥2 OR bigram-Jaccard≥0.185 결합 스윕. 단, 비교 대상은 "금지쌍"이 아니라 **11개 등급 전체 조합**이다.
- **자동 도구는 보조 수단**: 11개 등급 전체를 사람이 나란히 읽고 대조하는 단계를 반드시 거친다(등급 수가 적어 다른 모드보다 수월함).

## UI/JS 통합

- `getCompatTierInfo(tier, labelA, labelB)`가 기존 `score`/`tierLabel`/`text`에 더해 `keywords`/`advice`도 반환하도록 반환 객체를 확장한다.
- `showCompatibilitySummary(label1, label2, tierInfo)`에서 `renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice)`를 호출해 기존 `<div class="reading-detail">` 다음에 이어붙인다(다른 4개 모드와 동일한 위치·클래스).
- `saveCompatibilityReading()`은 변경하지 않는다 — 다른 모드도 keywords/advice를 히스토리 엔트리에 저장하지 않으므로 일관성 유지.
- 이 서브프로젝트는 하위선택(subchoice) 개념이 없으므로 `SUBCHOICE_ENABLED_MODES`는 건드리지 않는다. `js/app.js`의 공용 헬퍼(`resolveSubchoiceValue`/`resolveCategoryMeaning`/`renderKeywordsAdviceHtml`, 띠운세 서브프로젝트에서 신설)는 `renderKeywordsAdviceHtml()`만 재사용하고 나머지 둘은 이 모드와 무관하다(카테고리 개념이 없으므로).

## 히스토리 저장 영향

없음 — `saveCompatibilityReading()`이 저장하는 필드(`subtype`, `person1Label`, `person2Label`, `tierLabel`, `score`)는 변경하지 않는다.

## 에러 처리

데이터 누락(11개 등급 중 일부에 새 필드가 빠짐) 방지를 위해 테스트에서 전수 검증한다.

## 테스트 방식

`tests/compatibility-data.test.js`를 신규 생성하고 다음을 작업 시작 시점부터 추가한다:

- **구조 검증**: `COMPAT_TIER_DATA`의 11개 키 전체에 `keywords`(3개 배열), `advice`(비어있지 않은 문자열), `score`/`label`(기존값 불변) 존재 확인
- **문장수 검증**: `text` 필드가 정확히 2~3문장인지(치환 전 원본 템플릿 기준)
- **전수 중복 스윕(등급 간)**: 11개 등급 중 어떤 두 등급도 문장 단위 word-Jaccard≥0.3(모든 문장 위치 조합)로 겹치지 않는지, 오프닝 문장끼리 word+trigram AND결합 및 LCS/어근/bigram OR결합 기준으로도 겹치지 않는지 — 55쌍 전체 검사
- **자기중복 검사**: 각 등급의 `advice`가 같은 등급의 `text`와 겹치지 않는지(같은 화면에 함께 렌더되므로)
- 기존 `getCompatTierInfo()`가 여전히 정상 동작하는지(치환 로직 회귀 확인)

## 기존 코드와의 통합 지점

- `data/compatibility-data.js`: `COMPAT_TIER_DATA`의 11개 항목에 `keywords`/`advice` 추가, `text` 필드 문장 확장
- `js/app.js`: `getCompatTierInfo()` 반환 객체에 `keywords`/`advice` 추가, `showCompatibilitySummary()`에 키워드/조언 박스 렌더링 추가(기존 `renderKeywordsAdviceHtml()` 재사용, 새 헬퍼 불필요)
- `tests/compatibility-data.test.js`: 신규 생성(구조/문장수/등급 간 전수 중복 스윕/자기중복 검사)
- `css/style.css`: 기존 `.card-extra`/`.card-keywords`/`.card-advice` 스타일 재사용 예상 — 변경 불필요
