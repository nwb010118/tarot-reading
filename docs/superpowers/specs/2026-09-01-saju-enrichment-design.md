# 사주 리딩 풍부화 설계 문서

날짜: 2026-09-01

## 목적

5개 모드(타로→사주→별자리→띠운세→궁합) 리딩 풍부화 계획 중 **두 번째 서브프로젝트(사주)**다. 타로 서브프로젝트(`docs/superpowers/specs/2026-08-24-tarot-enrichment-design.md`)에서 확정한 "풍부함의 패턴"(문장 길이, 부가정보, 카테고리 세분화)을 사주에도 동일하게 적용하되, 사주 고유의 데이터 구조(카드가 아닌 10개 일간 기준, 정/역방향 없음)에 맞게 조정한다.

타로 프로젝트 최종 리뷰에서 반복적으로 드러난 가장 큰 실수 — **중복검사 도구가 필드 전체 단위로만 비교해서 "문장1은 같고 문장2만 다른" 경우를 놓친 것** — 를 이번엔 처음부터 피한다. 자세한 내용은 아래 "콘텐츠 작성 규칙" 참고.

## 범위

- 카테고리 해설 문장을 1문장 → 2~3문장으로 확장 (10개 일간 × 11개 카테고리)
- 일간당 부가정보 추가: 키워드 3개 + 조언 1문장 (일간 단위 — 타로의 "카드" 단위와 동일한 역할. 카테고리와 무관하게 항상 표시)
- 11개 카테고리 중 8개를 하위 2가지로 세분화(타로와 동일한 카테고리·서브키), 나머지 3개(명예/이사/자식)는 세분화 없이 문장만 확장
- 기존 하위 선택 버튼 UI(`#subchoice-select`, `CATEGORY_SUBCHOICES`)를 사주 모드에서도 동작하도록 일반화

범위 밖: 다른 모드(별자리/띠운세/궁합)의 확장(각각 별도 서브프로젝트), `trait`(일간 소개, 이미 2문장)와 `ELEMENT_BALANCE_TEXT`(오행 균형 문장)의 변경, 새 카테고리 추가, 사주 계산 로직(`js/saju-calc.js`) 변경, 새 HTML 마크업(기존 `#subchoice-select` 재사용).

## 데이터 구조 변경 (`data/saju-data.js`)

### 일간당 부가정보 (신규)

```js
keywords: ["곧은 신념", "타고난 리더십", "정직함"],
advice: "융통성을 조금 더하면 관계가 한결 부드러워질 거예요."
```
타로와 달리 방향성이 없으므로 `upright`/`reversed` 구분 없이 일간마다 하나씩만 존재한다.

### 카테고리 해설 — 세분화 8개

기존:
```js
love: '직진하는 매력으로 마음을 사로잡는 시기입니다.'
```
변경 후:
```js
love: { solo: '2~3문장', couple: '2~3문장' }
```

세분화 카테고리와 하위 키는 타로 프로젝트와 완전히 동일하다:

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

### 방향성 없음에 따른 구조 차이

타로는 `categories[cat][orientation][subkey]`(3단 중첩)이지만 사주는 `categories[cat][subkey]`(2단 중첩)로 한 단계 얕다. 전체 필드 수도 10개 일간 × (8개 세분화×2서브키 + 3개 단일) = 190개로, 타로(78장×2방향×19필드 ≈ 2,964개)보다 훨씬 적다. 파일 크기도 203줄 → 예상 600~800줄 수준이라 **타로처럼 여러 파일로 분리할 필요는 없다** — `data/saju-data.js` 하나로 유지한다.

## UI/JS 통합

- `js/app.js`의 `CATEGORY_SUBCHOICES` 맵과 `renderSubChoices()`는 그대로 재사용한다(카테고리·서브키 셋이 타로와 동일하므로 중복 정의 불필요).
- 타로 최종 fix wave에서 하드코딩됐던 `selectedMode !== 'tarot'` 조건(모드 전환 시 + 카테고리 클릭 시, 두 진입 경로 모두)을 사주도 포함하도록 일반화한다. 예: 허용 모드 집합 `SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju'])`를 두고 `!SUBCHOICE_ENABLED_MODES.has(selectedMode)`로 판정 — 이후 별자리/띠운세/궁합 서브프로젝트에서 필요해지면 이 집합에 한 줄만 추가하면 되도록 미리 대비한다.
- `showSajuSummary()`의 카테고리 텍스트 조회 로직을 세분화 대응하도록 분기한다: 세분화 대상 카테고리면 `ilgan.categories[category][selectedSubChoice]`, 단일 유지 카테고리(또는 카테고리 미선택 "오늘의운")면 기존처럼 `ilgan.categories[category]` 또는 `ilgan.trait`.
- 결과 화면에 타로의 "키워드 · 조언" 박스와 동일한 패턴으로 일간의 keywords/advice를 표시한다(기존 CSS 클래스 재사용 예상 — 실제 브라우저 확인 단계에서 검증).
- `#subchoice-select`는 이미 카테고리/기간 섹션 사이의 범용 위치에 있어 새 마크업이 필요 없다.

## 히스토리 저장 영향

`saveSajuReading()`이 만드는 엔트리에 `subChoice` 필드를 타로와 같은 방식으로 추가한다(`entry.subChoice = selectedSubChoice`). 히스토리 목록 표시 자체는 변경하지 않는다.

## 에러 처리

- 세분화 카테고리인데 `selectedSubChoice`가 설정되지 않은 상태로 조회되는 경우는 발생하지 않는다 — 타로와 동일하게, 카테고리 변경 시 항상 해당 카테고리의 첫 번째 하위 키로 즉시 리셋되기 때문(`renderSubChoices()` 로직 재사용).
- 데이터 누락(10개 일간 중 일부에 새 필드가 빠짐) 방지를 위해 테스트에서 전수 검증한다(아래 테스트 방식 참고).

## 콘텐츠 작성 규칙 & 중복 방지

- **잠긴 참조 예시**: 갑목(`key: 'gap'`)을 가장 먼저 정확한 목표 패턴으로 작성해 이후 9개 일간의 기준으로 삼는다(타로의 바보/에이스 카드와 동일한 역할). 갑목의 `trait`는 이번 작업에서 절대 수정하지 않는다.
- **중복 금지 규칙**: 같은 일간 내에서 `love`↔`relationships`, `career`↔`workplace`, `money`↔`business`가 오프닝 문장이나 문장 뼈대를 공유하면 안 된다 — 타로와 동일한 규칙을 "카드" 대신 "일간" 단위로 적용한다. 세분화 카테고리는 4개 서브키 조합(예: love.solo×relationships.new, love.solo×relationships.existing, love.couple×relationships.new, love.couple×relationships.existing) 전부를 확인해야 한다 — 하나만 확인하고 나머지를 놓치는 것이 타로 프로젝트에서 가장 자주 반복된 실수였다.
- **같은 필드 내 재진술 패딩 금지**: 두 번째(또는 세 번째) 문장이 첫 번째 문장을 다른 단어로 반복하면 안 된다. 반드시 조언, 구체적 뉘앙스, 다음 행동 등 새 내용을 담아야 한다.
- **핵심 교훈 — 문장 단위 중복검사 도구를 처음부터 사용**: 타로 프로젝트는 문장이 2개 이상이 되면 필드 전체를 비교하는 도구(character-trigram Jaccard 등)가 "공유된 문장1 + 다른 문장2"를 놓친다는 걸 최종 리뷰 단계에서야 발견했고, 이 때문에 메이저 아르카나와 컵 수트가 두 번의 전체 리뷰를 통과한 뒤에도 여전히 money/business 카테고리 쌍 중복을 갖고 있었다. 이번 사주 작업은 **처음부터 문장 단위(sentence-level word-Jaccard) 스윕 도구를 만들어 매 라운드 사용**한다 — 필드 전체 단위 도구는 아예 만들지 않는다.
- **자동 도구는 보조 수단**: 동의어 수준 재작성(같은 문장 뼈대, 다른 단어)은 자동 도구가 못 잡을 수 있으므로, 도구 결과와 별개로 사람이 직접 일간별로 8개 세분화 카테고리 필드를 나란히 읽고 대조하는 단계를 반드시 거친다.

## 테스트 방식

`tests/saju-data.test.js`에 다음을 **작업 시작 시점부터**(타로처럼 나중에 추가하는 게 아니라) 추가한다:

- **구조 검증**: 10개 일간 전체에 `keywords`가 정확히 3개 배열인지, `advice`가 비어있지 않은 문자열인지, 세분화 대상 8개 카테고리가 `{서브키1, 서브키2}` 형태이고 두 값이 실제로 다른 문자열인지(복사-붙여넣기 방지), 단일 유지 3개 카테고리가 존재하는지
- **문장수 검증**: 세분화·단일 카테고리 전체 필드가 정확히 2~3문장인지(1문장이나 4문장 이상이면 실패)
- **문장 단위 금지쌍 스윕**: 같은 일간 내에서 love↔relationships(4개 서브키 조합), career↔workplace(4개 조합), money↔business(4개 조합)가 문장 단위 word-Jaccard ≥0.3로 겹치는 게 없는지
- 기존 `getIlganByIndex()`/`getElementBalanceText()`가 여전히 정상 동작하는지(회귀)

## 기존 코드와의 통합 지점

- `data/saju-data.js`: `ILGAN_DATA` 각 항목에 `keywords`/`advice` 추가, `categories`의 8개 필드를 세분화 객체로 변경, 11개 필드 전부 문장 확장
- `js/app.js`: `SUBCHOICE_ENABLED_MODES` 허용목록 추가(또는 기존 조건에 `|| selectedMode === 'saju'` 추가), `showSajuSummary()`의 카테고리 텍스트 조회 분기, 키워드/조언 박스 렌더링, `saveSajuReading()`에 `subChoice` 필드 추가
- `tests/saju-data.test.js`: 구조/문장수/중복 스윕 테스트 추가
- `css/style.css`: 기존 타로용 스타일(`.subchoice-btn`, 키워드/조언 박스) 재사용 예상 — 실제로 안 맞는 부분이 있으면 최소 수정
