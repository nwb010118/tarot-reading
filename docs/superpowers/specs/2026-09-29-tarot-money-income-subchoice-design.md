# 재물운 "수입" 선택지 추가 — 타로편 설계

## 배경 / 목표

재물운(`money`) 카테고리의 세부선택지가 "소비"(`consumption`)/"투자"(`invest`) 둘뿐이라, 사용자가 돈이 **나가는** 쪽 운세만 볼 수 있고 돈이 **들어오는**(월급·부수입·예상치 못한 수입 등) 운세는 볼 수 없다는 피드백을 받았다. 이번 작업은 재물운에 "수입"(`income`) 선택지를 새로 추가한다.

전체 콘텐츠(타로/별자리/띠운세/사주)에 재물운이 존재하므로, 예전 enrichment 5개 서브프로젝트(타로→사주→별자리→띠운세→궁합)와 같은 방식으로 **타로부터** 진행하고, 나머지(별자리/띠운세/사주)는 다음 서브프로젝트로 넘긴다.

## 현재 상태

- `data/category-labels.js`: `CATEGORY_SUBCHOICES.money = [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }]`. UI는 이 배열을 그대로 순회해 버튼을 그리므로(`js/app.js`의 `renderSubChoices()`, 245~256번째 줄 부근) 배열에 항목을 추가하는 것만으로 버튼이 자동 생성된다 — `index.html`/`js/app.js`는 수정할 필요가 없다.
- `js/app.js`의 `resolveSubchoiceValue(category, value, selectedSubChoice)`(266~270번째 줄)와 `scripts/lib/tarot-page-data.js`의 `buildOrientationView`(43~61번째 줄, 정적 타로 카드 페이지 생성용)도 전부 `CATEGORY_SUBCHOICES[category]`를 그대로 순회하는 범용 코드라 2개든 3개든 그대로 동작한다.
- 타로 카드 데이터(`data/tarot-data-{major,wands,cups,swords,pentacles}.js`, 총 78장)의 `categories.money.{upright,reversed}.{consumption,invest}` 필드는 카드마다 **문자열 1개** 또는 **`{"a":[3문장],"b":[3문장]}` 풀** 둘 중 하나로 섞여 있다(점진적 변환 중인 레거시 상태, `tests/tarot-data.test.js`의 `assertStringOrPool`이 둘 다 허용). 예: `data/tarot-data-pentacles.js:35`의 펜타클 에이스는 `consumption`이 문자열, `invest`가 `{a,b}` 풀.
- **새로 쓰는 `income` 필드는 카드의 기존 상태와 무관하게 항상 `{"a":[3문장],"b":[3문장]}` 풀 형식으로 통일한다**(현재 콘텐츠의 최신 표준에 맞춤, 기존 문자열 필드를 풀로 바꾸는 작업은 이번 스코프 아님).
- `tests/tarot-data.test.js`에 **하드코딩된 곳 2군데**를 반드시 고쳐야 새 콘텐츠가 실제로 검증된다:
  1. **81번째 줄** `SUBDIVIDED_CATEGORIES.money: ['consumption', 'invest']` → `'income'` 추가 필요. 이 배열은 axis 1(자기중복)/axis 3(echo)/axis 4(카드간 완전동일·근접축자)/axis 6(조합문법)에 쓰이는 `allCategoryFieldsOf()`의 원천이라, 여기에 추가하기만 하면 저 축들은 전부 자동으로 `income`도 검사 대상에 포함시킨다(코드 수정 불필요, 범용 순회라서).
  2. **124~134번째 줄의 구조 검증 루프는 `keys[0]`/`keys[1]`로 하드코딩되어 있어 2개 초과 서브키를 지원하지 않는다** — `income`을 배열에 추가만 하고 이 루프를 안 고치면, `income` 필드는 구조 검증(`{a,b}` 풀 형식 확인)도 안 받고 소비/투자와 내용이 겹치는지 상호 비교도 안 받은 채 그냥 통과해버리는 조용한 구멍이 생긴다. `keys.forEach`로 전체를 검증하고, 모든 키 쌍(현재 2개 카테고리는 1쌍, money는 3쌍: 소비-투자/소비-수입/투자-수입)을 서로 다른지 비교하도록 이중 루프로 일반화해야 한다.
  3. **339번째 줄** `FORBIDDEN_PAIRS`의 `['money', ['consumption', 'invest'], 'business', [...]]`에도 `'income'` 추가 — 이 루프(343~368번째 줄)는 이미 `subsA.forEach`/`subsB.forEach`로 범용 순회라 배열에 추가만 하면 코드 수정 없이 `income` vs `business`(사업운) 교차중복도 자동으로 검사된다.
- `scripts/generate-tarot-pages.js` / `npm run build:tarot-pages`로 정적 타로 카드 페이지(`tarot/*.html`, 78개)를 재생성하면 `income` 콘텐츠가 자동으로 반영된다(위 `tarot-page-data.js`가 범용이므로 별도 코드 수정 없이 재생성만 필요).

## 콘텐츠 방향

`income` 필드는 기존 `consumption`/`invest`와 같은 `{"a":[3],"b":[3]}` 구조(a=상황 3문장, b=조언 3문장)로, 78장 전부 정방향/역방향 작성한다.

- **정방향 a(상황)**: 월급 등 정기소득이 안정적이거나, 부수입·뜻밖의 수입(보너스, 사이드 프로젝트 수익 등)이 들어오는 좋은 흐름.
- **정방향 b(조언)**: 늘어난 수입을 어떻게 잘 관리·활용할지.
- **역방향 a(상황)**: 예상한 수입이 늦어지거나 줄어드는, 수입원이 불안정해지는 흐름.
- **역방향 b(조언)**: 수입 불안정에 대비하는 조언.

기존 `consumption`(소비 관리)·`invest`(투자 결정)와 겹치지 않도록 "돈을 버는/받는" 쪽에 집중한다(위 axis 7 검사가 `business`와도 겹치지 않는지 자동 확인해주지만, `money` 카테고리 내부의 `consumption`/`invest`와도 안 겹쳐야 하므로 — 이건 구조 검증 루프 수정(위 2번)이 자동으로 잡아준다).

카드별 톤은 기존 관행을 따른다: 메이저는 원형적/상징적, 완드는 열정·행동, 컵은 감정·직관, 소드는 사고·갈등, 펜타클은 물질·실용 — 각 카드 고유의 이미지에 맞춰 수입 상황을 표현한다(예: "펜타클 에이스"는 새로운 수입원의 씨앗, "컵 10"은 가족과 나누는 풍요로운 수입 등).

## 작업 분할과 순서 (중요 — 콘텐츠 먼저, 검증/노출은 마지막)

`SUBDIVIDED_CATEGORIES.money`(테스트) / `CATEGORY_SUBCHOICES.money`(UI)에 `'income'`을 추가하는 순간부터 각각 "78장 전부 `income` 구조 검증"과 "실제 화면에 수입 버튼 노출"이 즉시 활성화된다. 이 시점에 아직 `income` 데이터가 없는 카드가 하나라도 있으면: 테스트는 `entry['income']`이 `undefined`라 구조 검증에서 즉시 실패하고, 실제 앱에서는 그 카드가 나왔을 때 `resolveMeaningText(undefined)`가 `undefined.a`를 읽으려다 **런타임 에러로 화면이 깨진다**(둘 다 확인됨: `js/app.js`의 `resolveMeaningText`/`resolveSubchoiceValue`).

그래서 원래 tarot enrichment 때 실제로 썼던 순서를 그대로 따른다 — **콘텐츠(카드 데이터)를 78장 전부 다 쓴 다음에, 마지막에 한 번에 테스트 하네스와 UI를 연결한다**(원래 플랜의 Task 2~6가 카드 데이터만 채우고, Task 7 "영구 회귀 테스트 추가"가 맨 마지막이었던 것과 동일한 패턴). 이렇게 하면:
- 카드 데이터 작성 태스크(1~5) 동안은 `SUBDIVIDED_CATEGORIES`/`CATEGORY_SUBCHOICES`를 아직 안 건드렸으므로, `income` 필드가 있어도 기존 `node scripts/run-tests.js`는 이 필드의 존재 자체를 모른다 — 즉 **기존 테스트가 계속 그대로 통과한 채로** 각 태스크를 진행할 수 있다(회귀 없음, 중간에 깨진 상태가 없음).
- 각 카드 데이터 태스크는 자체 범위로 좁힌 임시 검증 스크립트(`node -e "..."`, 원래 Task 2 방식과 동일)로 구조(78장 중 자기 그룹 카드들이 `{a:[3],b:[3]}` 형식인지)와 카드 내부 자기중복(간단한 눈검토 + 같은 그룹 내 비교)만 확인한다. 카드 78장 전체를 아우르는 교차-카드 중복(axis 4)·카테고리 금지쌍(axis 7) 같은 전방위 검사는 아직 안 돌아가므로 못 잡을 수 있다 — 이건 마지막 태스크에서 한꺼번에 잡고, 걸리면 원래 프로젝트의 Task 12~15처럼 후속 수정 태스크로 처리한다(정상적인 흐름으로 계획에 명시).
- **마지막 태스크**에서: `CATEGORY_SUBCHOICES.money`에 수입 버튼 추가(UI 노출) + `SUBDIVIDED_CATEGORIES.money`/`FORBIDDEN_PAIRS`에 `'income'` 추가 + 124~134번째 줄 구조 검증 루프를 N개 서브키 일반화 → 이 시점 처음으로 `node scripts/run-tests.js`가 `income`을 전방위로 검사한다. 여기서 발견되는 중복/구조 문제는 이 태스크(또는 바로 다음 수정 태스크)에서 고친다.
- **push 시점 주의**: 이 세션은 매 태스크 완료 후에도 로컬 커밋은 쌓아가지만, "수입" 관련 커밋들은 **마지막 태스크(UI 노출)까지 전부 끝나기 전에는 절대 push하지 않는다** — 중간에 push하면 배포된 사이트에서 아직 `income`이 없는 카드가 나왔을 때 화면이 깨진다.

세부 태스크 순서:

1. 메이저 아르카나(22장) — `income` 데이터만 작성
2. 완드(14장)
3. 컵(14장)
4. 소드(14장)
5. 펜타클(14장)
6. UI 노출 + 테스트 하네스 연결(`CATEGORY_SUBCHOICES`/`SUBDIVIDED_CATEGORIES`/`FORBIDDEN_PAIRS`/루프 일반화) + 정적 페이지 재생성(`npm run build:tarot-pages`) + 브라우저 확인 + 전체 회귀 + push

## 테스트 / 검증 계획

- 카드 데이터 태스크(1~5) 각각: 그 그룹 카드들만 골라 구조(`{a:[3],b:[3]}`, 78장 중 아직 안 채운 카드는 검사 대상 아님)와 정/역방향 내용이 서로 다른지 확인하는 범위 한정 스크립트 + `node scripts/run-tests.js`로 기존 회귀 없음 확인(이 시점엔 `income`을 아직 안 봄, 그래서 그대로 통과해야 정상).
- 마지막 태스크에서 `tests/tarot-data.test.js`의 기존 7개 축(axis 1~7) 전부가 `income`을 포함해서 통과해야 한다.
- `npm run build:tarot-pages` 재생성 후 생성된 페이지 몇 개를 브라우저로 열어 "수입" 항목이 보이는지 확인.
- 브라우저에서 실제 앱(`index.html`)의 타로 모드 → 재물운 카테고리 선택 → 소비/투자/수입 3버튼이 뜨는지, 수입 선택 시 카드마다 다른 문구가 나오는지 확인.

## 이번 스코프에서 제외

- 별자리/띠운세/사주의 재물운 "수입" 선택지 — 타로 완료 후 다음 서브프로젝트로.
- 궁합 모드 — 애초에 궁합 데이터에는 `money` 카테고리가 없음(확인됨, `data/compatibility-data.js`에 `money:` 없음).
- 기존 `consumption`/`invest`의 문자열 필드를 `{a,b}` 풀로 변환하는 작업(레거시 정리) — 이번 스코프 아님.
