# 띠운세 리딩 풍부화 설계 문서

날짜: 2026-09-01

## 목적

5개 모드(타로→사주→별자리→**띠운세**→궁합) 리딩 풍부화 계획 중 **네 번째 서브프로젝트(띠운세)**다. 타로·사주·별자리에서 확정한 "풍부함의 패턴"을 띠운세에도 동일하게 적용한다. 띠운세 데이터 구조는 사주·별자리와 완전히 같다(12개 띠, 방향성 없음, `categories[cat][subkey]` 2단 중첩).

이번 서브프로젝트는 콘텐츠 확장 외에 **`js/app.js`의 공통 헬퍼 추출**도 함께 진행한다 — 별자리 최종 리뷰에서 "3번째 모드(zodiac)가 `SUBCHOICE_ENABLED_MODES`에 합류하면 `showSummary`/`showSajuSummary`/`showZodiacSummary`의 중복 로직을 리팩토링하라"는 권고가 있었고, 띠운세가 4번째 모드로 합류하는 지금이 그 시점이다.

## 범위

### A. 콘텐츠 확장 (`data/ddi-data.js`)

- 카테고리 해설 문장을 1문장 → 2~3문장으로 확장 (12개 띠 × 11개 카테고리)
- 띠당 부가정보 추가: 키워드 3개 + 조언 1문장 (방향성 없음 — 사주·별자리와 동일한 역할)
- 11개 카테고리 중 8개를 하위 2가지로 세분화(타로·사주·별자리와 동일한 카테고리·서브키), 나머지 3개(명예/이사/자식)는 문장만 확장
- `SUBCHOICE_ENABLED_MODES`에 `'ddi'` 추가

### B. `js/app.js` 공통 헬퍼 추출 (순수 리팩토링, 동작 불변)

현재 `showSajuSummary()`(607행 부근)와 `showZodiacSummary()`(389행 부근)가 아래 두 블록을 각각 독립적으로 구현하고 있고, 타로의 `showSummary()`(766행 부근)도 유사한 원자 로직을 카드별로 반복한다:

1. **세분화/단일 값 판별** — `(CATEGORY_SUBCHOICES[category] && typeof value === 'object') ? value[selectedSubChoice] : value` 패턴이 타로(카드당 1회, 반복문 안) + 사주 + 별자리, 총 3곳에 코드로 존재(타로는 반복문 안이라 호출 시점 기준으로는 여러 번 실행되지만 코드 위치로는 1곳). 이걸 `resolveSubchoiceValue(category, value, selectedSubChoice)`로 추출한다.
2. **카테고리 선택 시 세분화/단일 처리 후 기간 접두사 적용, 미선택 시 trait 폴백** — 사주·별자리 2곳에 동일 구조로 존재(사주는 이후 오행 균형 문장을 덧붙이는 차이만 있음). 이걸 `resolveCategoryMeaning(entity, category, period, selectedSubChoice)`로 추출해 `PERIOD_PREFIXES[period] + ' ' + resolveSubchoiceValue(...)` 또는 `entity.trait`를 반환하게 한다. 사주는 이 헬퍼의 반환값 뒤에 오행 균형 문장을 이어 붙이는 방식으로 그대로 사용.
3. **키워드·조언 박스 HTML** — `'<div class="card-extra">...'` 패턴이 타로(카드당)·사주·별자리 3곳에 동일하게 존재. `renderKeywordsAdviceHtml(keywordsList, adviceText)`로 추출한다.

타로의 `showSummary()`는 카드 배열을 순회하며 카드마다 정/역방향을 다시 판별하는 구조라 사주·별자리와 완전히 통합하지 않는다 — 위 두 원자 헬퍼(`resolveSubchoiceValue`, `renderKeywordsAdviceHtml`)만 재사용하도록 내부를 정리하고, 카드 반복문 구조 자체는 그대로 둔다.

이 리팩토링은 **동작을 바꾸지 않는다** — 기존 `tests/tarot-data.test.js`(78장 구조검증은 데이터 파일 테스트라 무관하지만 `node --check`와 전체 회귀 스위트가 이 리팩토링의 안전망), 그리고 무엇보다 Task 4의 브라우저 검증이 타로·사주·별자리 3개 모드 전부에서 리딩 결과가 리팩토링 전과 동일하게 나오는지 확인한다.

범위 밖: `trait` 변경, 다른 모드(궁합) 확장, 새 카테고리 추가, `js/compatibility-calc.js`(`getDdiCompatibility`가 `DDI_DATA.categories`/`trait`를 참조하지 않는 독립 로직 — 타로/사주/별자리 때와 동일하게 확인됨), 새 HTML 마크업.

## 데이터 구조 변경 (`data/ddi-data.js`)

### 띠당 부가정보 (신규)

```js
keywords: ["재치", "순발력", "다재다능"],
advice: "순간적인 재치만큼 꾸준함도 함께 갖추면 더 큰 성과로 이어질 거예요."
```

### 카테고리 해설 — 세분화 8개 / 단일 유지 3개

타로·사주·별자리와 완전히 동일한 카테고리·서브키:

| 카테고리 | 하위 키 |
|---|---|
| love | solo / couple |
| money | consumption / invest |
| career | jobseek / switch |
| business | startup / running |
| study | exam / path |
| health | body / mind |
| relationships | new / existing |
| workplace | team / personal |

단일 유지: `honor`, `moving`, `children`(문장만 2~3문장으로 확장).

### 규모

12개 띠 × (8×2 + 3) = 228개 필드 — 별자리(228개)와 동일 규모. 파일 크기도 217줄 → 예상 550~600줄, 단일 파일 유지.

## UI/JS 통합

- `SUBCHOICE_ENABLED_MODES`에 `'ddi'` 추가(한 줄) — 모드 전환 핸들러/`renderSubChoices()`는 이미 일반화되어 있어 추가 변경 불필요.
- 위 "B. 공통 헬퍼 추출"에서 만든 `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()`를 사용해 `showDdiSummary()`를 새로 작성(사주·별자리의 축소판 — 오행 균형 문장이나 명식 표가 없는 가장 단순한 형태).
- `saveDdiReading()`에 `subChoice: selectedSubChoice` 필드 추가.

## 히스토리 저장 영향

`saveDdiReading()`의 엔트리에 `subChoice` 필드 추가(타로·사주·별자리와 동일한 방식). 히스토리 목록 표시 자체는 변경하지 않는다.

## 에러 처리

- 세분화 카테고리인데 `selectedSubChoice`가 미설정인 채로 조회되는 경우는 발생하지 않는다(기존과 동일하게 `renderSubChoices()`가 카테고리 변경 시 항상 첫 서브키로 리셋).
- 데이터 누락 방지를 위해 테스트에서 전수 검증한다.
- 리팩토링으로 인한 회귀 방지를 위해 헬퍼 추출 태스크 직후 타로·사주·별자리 3개 모드 전부의 회귀 테스트 + 브라우저 확인을 거친다.

## 콘텐츠 작성 규칙 & 중복 방지

별자리 서브프로젝트에서 확정한 최종 방식을 **처음부터** 사용한다(필드 전체 단위 도구는 만들지 않음):

- **잠긴 참조 예시**: 원숭이띠(`key: "monkey"`) — 가장 먼저 정확히 작성해 이후 11개 띠의 기준으로 삼음, 이후 절대 수정 안 함.
- **금지쌍**: 같은 띠 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`가 문장 뼈대를 공유하면 안 된다(4개 서브키 조합 전부).
- **같은 필드 내 재진술 패딩 금지**, **같은 띠 내 mad-libs 문형 반복 금지**(별자리 최종 리뷰에서 발견된 I-3 유형).
- **중복검사 3단 결합**(별자리 프로젝트에서 확정한 최종 형태, [[feedback-dedup-blind-spot-below-threshold]] 참고):
  1. 모든 문장 쌍 word-Jaccard ≥ 0.3 스윕
  2. 오프닝 문장끼리 word-Jaccard ≥ 0.20 AND 트라이그램 Jaccard ≥ 0.15 결합 스윕
  3. 오프닝 문장끼리 (종결 상투구 제거 후) 최장공통부분문자열 ≥ 5자 OR 문자 bigram-Jaccard OR 공유 어근 개수 기반 보조 스윕(각 띠 자신의 `keywords`는 비교 전 제외해 trait 반복을 오탐하지 않도록 함)
  이 세 가지를 **Task 1(콘텐츠 작성)과 Task 2(테스트) 시작 시점부터** 함께 사용한다 — 별자리처럼 최종 리뷰에서야 3번째 체크를 추가하는 일이 없도록 한다.
- **자동 도구는 보조 수단** — 사람이 직접 8개 세분화 카테고리 필드를 나란히 읽고 대조하는 단계를 반드시 거친다.

## 테스트 방식

`tests/ddi-data.test.js`를 신규 생성하고 다음을 작업 시작 시점부터 추가한다:

- **구조 검증**: 12개 띠 전체 keywords(3개)/advice(비어있지 않음)/세분화 8개(서로 다른 두 서브키)/단일 3개 존재
- **문장수 검증**: 전체 필드 2~3문장
- **문장 단위 금지쌍 스윕**: word-Jaccard ≥0.3 전체 스윕
- **오프닝 문장 결합 스윕**: word≥0.20 AND trigram≥0.15
- **오프닝 문장 보조 스윕**: bigram/LCS/어근중복 기반(별자리에서 검증된 최종 형태를 그대로 이식)
- 기존 `getDdiByYear()` 회귀 확인

`js/app.js` 리팩토링(공통 헬퍼 추출) 자체에 대한 새 테스트는 만들지 않는다 — 기존 타로/사주/별자리/(신규)띠운세 각 데이터 테스트 + 전체 회귀 테스트 스위트 + Task 4의 브라우저 검증(4개 모드 전부에서 리딩 결과 확인)이 안전망 역할을 한다.

## 기존 코드와의 통합 지점

- `data/ddi-data.js`: `DDI_DATA` 각 항목에 `keywords`/`advice` 추가, `categories`의 8개 필드 세분화, 11개 필드 문장 확장
- `js/app.js`: 신규 헬퍼 `resolveSubchoiceValue()`/`resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()` 추가 후 `showSummary()`(타로)/`showSajuSummary()`/`showZodiacSummary()`가 이를 재사용하도록 리팩토링, `showDdiSummary()`를 신규 헬퍼로 작성, `SUBCHOICE_ENABLED_MODES`에 `'ddi'` 추가, `saveDdiReading()`에 `subChoice` 필드 추가
- `tests/ddi-data.test.js`: 신규 생성
- `css/style.css`: 기존 스타일(`.subchoice-btn`, 키워드/조언 박스) 재사용 예상 — 변경 불필요
