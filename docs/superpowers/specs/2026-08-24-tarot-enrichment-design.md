# 타로 리딩 풍부화 설계 문서

날짜: 2026-08-24

## 목적

사용자가 카테고리(연애운/재물운 등)를 선택했을 때 나오는 타로 해설이 1문장으로 너무 짧다고 느낌. 이번 작업은 5개 모드(타로→사주→별자리→띠운세→궁합) 전체를 순차적으로 풍부하게 만드는 계획 중 **첫 번째 서브프로젝트(타로)**다. 여기서 확정한 "풍부함의 패턴"(문장 길이, 카드당 부가정보, 카테고리 세분화 방식)을 이후 모드에도 반복 적용한다.

## 범위

- 카테고리 해설 문장을 1문장 → 2~3문장으로 확장 (78장 전체)
- 카드당 부가정보 추가: 키워드 3개 + 조언 1줄 (정/역방향별로 다르게, 카테고리와 무관하게 항상 표시)
- 11개 카테고리 중 8개를 하위 2가지로 세분화(연애/재물/취업/사업/학업/건강/대인관계/직장), 나머지 3개(명예/이사/자식)는 세분화 없이 문장만 확장
- 세분화를 위한 화면 상 하위 선택 버튼 UI 추가
- 파일이 너무 커지므로 `data/tarot-data.js`를 아케인 그룹별 5개 파일로 분리

범위 밖: 다른 모드(사주/별자리/띠운세/궁합)의 확장(각각 별도 서브프로젝트), 기존 카드 기본 해설(upright/reversed, 이미 3~4문장)의 변경, 스프레드(1장/3장) 로직 변경, 신규 카테고리 추가.

## 데이터 구조 변경

### 카드당 부가정보 (신규)

```js
keywords: { upright: ["새로운 시작", "순수한 용기", "즉흥"], reversed: ["무모함", "충동", "미숙"] },
advice: { upright: "완벽한 계획보다 첫걸음의 순수한 에너지를 믿어보세요.", reversed: "한 걸음 물러나 현실적인 위험을 점검해보세요." }
```
모든 78장에 카드 레벨로 추가(카테고리와 무관, 정/역방향에 따라서만 달라짐).

### 카테고리 해설 — 세분화 8개

기존:
```js
love: { upright: "적극적인 매력으로 마음을 사로잡는 시기입니다.", reversed: "..." }
```
변경 후:
```js
love: {
  upright: { solo: "2~3문장", couple: "2~3문장" },
  reversed: { solo: "2~3문장", couple: "2~3문장" }
}
```

세분화 카테고리와 하위 키:
| 카테고리 | 하위 키(solo/couple 예시) | 라벨 |
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

`honor`(명예운), `moving`(이사운), `children`(자식운)은 기존과 같은 `{ upright: "...", reversed: "..." }` 형태를 유지하되 문장을 2~3문장으로 늘린다.

## 파일 분리 (`data/tarot-data.js` → 6개 파일)

현재 1,161줄인 파일이 이 확장 이후 5,000줄 이상이 될 것으로 예상되어, 아케인 그룹별로 나눈다. 기존 파일의 정확한 경계(major_arcana 22장 / wands·cups·swords·pentacles 각 14장 / 유틸리티 함수)를 그대로 활용한다.

- `data/tarot-data-major.js`: `const TAROT_MAJOR_ARCANA = [...]` (22장)
- `data/tarot-data-wands.js`: `const TAROT_WANDS = [...]` (14장)
- `data/tarot-data-cups.js`: `const TAROT_CUPS = [...]` (14장)
- `data/tarot-data-swords.js`: `const TAROT_SWORDS = [...]` (14장)
- `data/tarot-data-pentacles.js`: `const TAROT_PENTACLES = [...]` (14장)
- `data/tarot-data.js`: 위 5개 전역 상수를 조립해 기존과 동일한 `TAROT_DATA = { major_arcana, minor_arcana: { wands, cups, swords, pentacles } }`를 구성하고, 기존 `SUIT_LABEL`/`getMajorImageFilename`/`getMinorImageFilename`/`getFullDeck`/`module.exports`를 그대로 유지한다.

기존 스크립트 전역 공유 방식(브라우저: script 로드 순서 / Node 테스트: `global.X = require(...)` 주입)을 그대로 따른다 — `index.html`에서 5개 세부 파일을 `tarot-data.js`보다 먼저 로드해야 한다.

## UI 흐름 변경

- 카테고리 선택 후, 선택된 카테고리가 세분화 대상 8개 중 하나면 그 카테고리 전용 하위 선택 버튼 2개가 나타난다(예: 연애운 선택 시 "솔로"/"커플" 버튼). 기본값은 각 카테고리의 첫 번째 하위 키(예: 연애운→솔로)로, 카테고리를 바꿀 때마다 해당 카테고리의 첫 하위 키로 리셋된다.
- 세분화 대상이 아닌 카테고리(명예운/이사운/자식운) 또는 "오늘의운"(카테고리 미선택) 상태에서는 하위 선택 버튼이 숨겨진다.
- 카드를 뒤집으면 기존 해설 문단 아래에 작은 박스로 "키워드: OO · OO · OO"와 "조언: ..."이 항상 표시된다(카테고리 선택 여부와 무관).
- `js/app.js`에 세분화 카테고리 목록과 하위 키/라벨을 정의하는 매핑(`CATEGORY_SUBCHOICES`)을 두고, 카테고리 텍스트를 가져올 때 그 카테고리가 세분화 대상이면 `categories[category][orientation][subChoice]`, 아니면 기존처럼 `categories[category][orientation]`를 사용하도록 분기한다.
- 이 하위 선택 UI 패턴은 타로 전용으로 구현하며, 이후 다른 모드에 같은 패턴이 필요해지면 그때 일반화한다(지금 미리 범용 컴포넌트로 만들지 않는다 — YAGNI).

## 히스토리 저장 영향

현재 `entry.cards`에는 `{ name, orientation }`만 저장되고 카테고리/기간은 엔트리 최상위에 저장된다. 세분화 선택(`selectedSubChoice`)도 같은 방식으로 엔트리에 추가한다: `entry.subChoice`. 히스토리 목록 표시 자체는 변경하지 않는다(카드 이름+방향만 보여주는 기존 방식 유지, 세분화는 결과 화면에서만 의미가 있음).

## 에러 처리

- 세분화 카테고리인데 `selectedSubChoice`가 설정되지 않은 상태로 조회되는 경우는 발생하지 않는다 — 카테고리 변경 시 항상 기본 하위 키로 즉시 리셋되기 때문.
- 데이터 누락(78장 중 일부에 새 필드가 빠짐) 방지를 위해 테스트에서 전수 검증한다(아래 테스트 방식 참고).

## 테스트 방식

- 기존 `tests/tarot-data.test.js`에 다음을 추가:
  - 78장 전체에 `keywords.upright`/`keywords.reversed`가 각각 정확히 3개 배열인지
  - 78장 전체에 `advice.upright`/`advice.reversed`가 비어있지 않은 문자열인지
  - 78장 전체에서 세분화 대상 8개 카테고리는 `{upright:{키1,키2}, reversed:{키1,키2}}` 형태이고 두 하위 키 값이 실제로 다른 문자열인지(복사-붙여넣기 방지)
  - 78장 전체에서 단일 유지 3개 카테고리는 기존처럼 `{upright: string, reversed: string}` 형태인지
  - 파일 분리 후에도 `getFullDeck()`이 여전히 78장을 반환하고 카드 ID가 고유한지(기존 테스트 그대로 통과해야 함)

## 기존 코드와의 통합 지점

- `index.html`: `<script src="data/tarot-data-major.js">` 등 5개 스크립트를 `data/tarot-data.js` 앞에 추가, 하위 선택 버튼 그룹을 `#category-select`와 `#period-select` 사이에 추가
- `js/app.js`: `CATEGORY_SUBCHOICES` 매핑 추가, 하위 선택 버튼 클릭 핸들러, `showSummary`의 카테고리 텍스트 조회 로직에 분기 추가, 카드 뒤집을 때 키워드/조언 박스 렌더링 추가, `saveCurrentReading`에 `subChoice` 필드 추가
- `css/style.css`: 하위 선택 버튼 그룹 스타일(기존 `.category-btn` 재사용 가능), 키워드/조언 박스 스타일 추가
