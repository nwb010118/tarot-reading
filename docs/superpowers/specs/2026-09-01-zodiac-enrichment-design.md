# 별자리 리딩 풍부화 설계 문서

날짜: 2026-09-01

## 목적

5개 모드(타로→사주→별자리→띠운세→궁합) 리딩 풍부화 계획 중 **세 번째 서브프로젝트(별자리)**다. 타로(`docs/superpowers/specs/2026-08-24-tarot-enrichment-design.md`)와 사주(`docs/superpowers/specs/2026-09-01-saju-enrichment-design.md`) 서브프로젝트에서 확정한 "풍부함의 패턴"을 별자리에도 동일하게 적용한다. 별자리 데이터 구조는 사주와 거의 동일하다(카드가 아닌 12개 별자리 기준, 정/역방향 없음, 카테고리 구조가 사주와 완전히 같은 2단 중첩).

## 범위

- 카테고리 해설 문장을 1문장 → 2~3문장으로 확장 (12개 별자리 × 11개 카테고리)
- 별자리당 부가정보 추가: 키워드 3개 + 조언 1문장 (별자리 단위 — 사주의 "일간" 단위와 동일한 역할. 카테고리와 무관하게 항상 표시, 방향성 없음)
- 11개 카테고리 중 8개를 하위 2가지로 세분화(타로·사주와 동일한 카테고리·서브키), 나머지 3개(명예/이사/자식)는 세분화 없이 문장만 확장
- 기존 하위 선택 버튼 UI(`#subchoice-select`, `CATEGORY_SUBCHOICES`, `renderSubChoices()`)를 별자리 모드에서도 동작하도록 `SUBCHOICE_ENABLED_MODES`에 추가

범위 밖: 다른 모드(띠운세/궁합)의 확장(각각 별도 서브프로젝트), `trait`(별자리 소개, 이미 2문장)의 변경, 새 카테고리 추가, `js/compatibility-calc.js`의 `getZodiacCompatibility`(확인 결과 `ZODIAC_DATA`의 `categories`/`trait`를 참조하지 않는 독립 로직 — 영향 없음), 새 HTML 마크업(기존 `#subchoice-select` 재사용).

## 데이터 구조 변경 (`data/zodiac-data.js`)

### 별자리당 부가정보 (신규)

```js
keywords: ["열정", "리더십", "추진력"],
advice: "성급함만 조심하면 원하는 결과를 빠르게 손에 넣을 수 있어요."
```
사주와 마찬가지로 방향성이 없으므로 별자리마다 하나씩만 존재한다.

### 카테고리 해설 — 세분화 8개

기존:
```js
love: "적극적인 매력으로 마음을 사로잡는 시기입니다."
```
변경 후:
```js
love: { solo: "2~3문장", couple: "2~3문장" }
```

세분화 카테고리와 하위 키는 타로·사주 프로젝트와 완전히 동일하다:

| 카테고리 | 하위 키 | 라벨 |
|---|---|---|
| love(연애운) | solo / couple | 솔로 / 커플 |
| money(재물운) | consumption / invest | 소비 / 투자 |
| career(취업운) | jobseek / switch | 구직 / 이직 |
| business(사업운) | startup / running | 창업준비 / 운영중 |
| study(학업운) | exam / path | 시험준비 / 진로고민 |
| health(건강운) | body / mind | 신체 / 정신 |
| relationships(대인관계운) | new / existing | 새로운 인연 / 기존 관계 |
| workplace(직장운) | team / personal | 팀워크 / 개인성과 |

### 카테고리 해설 — 단일 유지 3개

`honor`(명예운), `moving`(이사운), `children`(자식운)은 기존과 같은 평문 문자열 형태를 유지하되 문장을 2~3문장으로 늘린다.

### 규모

12개 별자리 × (8개 세분화×2서브키 + 3개 단일) = 228개 필드. 사주(190개)와 비슷한 규모다. 파일 크기도 218줄 → 예상 550~600줄 수준이라 **타로처럼 여러 파일로 분리할 필요는 없다** — `data/zodiac-data.js` 하나로 유지한다.

## UI/JS 통합

- `js/app.js`의 `SUBCHOICE_ENABLED_MODES`에 `'zodiac'`을 추가한다(`CATEGORY_SUBCHOICES`/`renderSubChoices()`는 카테고리·서브키 셋이 동일하므로 그대로 재사용).
- `showZodiacSummary()`의 카테고리 텍스트 조회 로직을 세분화 대응하도록 분기한다: 세분화 대상 카테고리면 `zodiac.categories[category][selectedSubChoice]`, 단일 유지 카테고리(또는 카테고리 미선택 "오늘의운")면 기존처럼 `zodiac.categories[category]` 또는 `zodiac.trait`.
- 결과 화면에 타로·사주의 "키워드 · 조언" 박스와 동일한 패턴으로 별자리의 keywords/advice를 표시한다(기존 CSS 클래스 재사용 예상 — 실제 브라우저 확인 단계에서 검증).
- `#subchoice-select`는 이미 카테고리/기간 섹션 사이의 범용 위치에 있어 새 마크업이 필요 없다.

## 히스토리 저장 영향

`saveZodiacReading()`이 만드는 엔트리에 `subChoice` 필드를 타로·사주와 같은 방식으로 추가한다(`entry.subChoice = selectedSubChoice`). 히스토리 목록 표시 자체는 변경하지 않는다.

## 에러 처리

- 세분화 카테고리인데 `selectedSubChoice`가 설정되지 않은 상태로 조회되는 경우는 발생하지 않는다 — 타로·사주와 동일하게, 카테고리 변경 시 항상 해당 카테고리의 첫 번째 하위 키로 즉시 리셋되기 때문(`renderSubChoices()` 로직 재사용).
- 데이터 누락(12개 별자리 중 일부에 새 필드가 빠짐) 방지를 위해 테스트에서 전수 검증한다(아래 테스트 방식 참고).

## 콘텐츠 작성 규칙 & 중복 방지

- **잠긴 참조 예시**: 양자리(`key: 'aries'`)를 가장 먼저 정확한 목표 패턴으로 작성해 이후 11개 별자리의 기준으로 삼는다(타로의 바보/에이스, 사주의 갑목과 동일한 역할). 양자리의 `trait`는 이번 작업에서 절대 수정하지 않는다.
- **중복 금지 규칙**: 같은 별자리 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`가 오프닝 문장이나 문장 뼈대를 공유하면 안 된다. 세분화 카테고리는 4개 서브키 조합(예: love.solo×relationships.new, love.solo×relationships.existing, love.couple×relationships.new, love.couple×relationships.existing) 전부를 확인해야 한다.
- **같은 필드 내 재진술 패딩 금지**: 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하면 안 된다. 반드시 조언, 구체적 뉘앙스, 다음 행동 등 새 내용을 담아야 한다.
- **처음부터 문장 단위 중복검사 도구 사용**: 사주 프로젝트에서 확정한 방식(문장 단위 word-Jaccard ≥0.20 AND 문자 트라이그램 Jaccard ≥0.15 결합)을 그대로 재사용한다. 필드 전체 단위 비교 도구는 만들지 않는다.
- **자동 도구는 보조 수단**: 동의어 수준 재작성은 자동 도구가 못 잡을 수 있으므로, 도구 결과와 별개로 사람이 직접 별자리별로 8개 세분화 카테고리 필드를 나란히 읽고 대조하는 단계를 반드시 거친다.

## 테스트 방식

`tests/zodiac-data.test.js`를 신규 생성하고 다음을 **작업 시작 시점부터** 추가한다:

- **구조 검증**: 12개 별자리 전체에 `keywords`가 정확히 3개 배열인지, `advice`가 비어있지 않은 문자열인지, 세분화 대상 8개 카테고리가 `{서브키1, 서브키2}` 형태이고 두 값이 실제로 다른 문자열인지(복사-붙여넣기 방지), 단일 유지 3개 카테고리가 존재하는지
- **문장수 검증**: 세분화·단일 카테고리 전체 필드가 정확히 2~3문장인지(1문장이나 4문장 이상이면 실패)
- **문장 단위 금지쌍 스윕**: 같은 별자리 내에서 love↔relationships(4개 서브키 조합), career↔workplace(4개 조합), money↔business(4개 조합)가 문장 단위로 word-Jaccard AND 트라이그램 Jaccard 결합 기준을 넘겨 겹치는 게 없는지
- 기존 `getZodiacList()`/`getZodiacByKey()`가 여전히 정상 동작하는지(회귀)

## 기존 코드와의 통합 지점

- `data/zodiac-data.js`: `ZODIAC_DATA` 각 항목에 `keywords`/`advice` 추가, `categories`의 8개 필드를 세분화 객체로 변경, 11개 필드 전부 문장 확장
- `js/app.js`: `SUBCHOICE_ENABLED_MODES`에 `'zodiac'` 추가, `showZodiacSummary()`의 카테고리 텍스트 조회 분기, 키워드/조언 박스 렌더링, `saveZodiacReading()`에 `subChoice` 필드 추가
- `tests/zodiac-data.test.js`: 신규 생성(구조/문장수/중복 스윕 테스트)
- `css/style.css`: 기존 타로·사주용 스타일(`.subchoice-btn`, 키워드/조언 박스) 재사용 예상 — 실제로 안 맞는 부분이 있으면 최소 수정
