# 타로 categories 랜덤화 — 설계 스펙

## 배경

[[project-ddi-random-reading]]에서 의도적으로 범위 제외됐던 마지막 후속과제. 타로 78장의 `card.upright`/`card.reversed`/`keywords`/`advice`는 이미 랜덤화됐지만, 카테고리별 세부 텍스트(`categories.<cat>.<upright|reversed>.<subkey>`, 카드당 19개)는 규모(2,964개 필드, 당시 468개의 약 6.3배) 때문에 손대지 않았다. 이 스펙은 그 남은 범위를 다룬다.

## 범위 확정 — 사전 조사 결과

전체 2,964개 카테고리 필드를 스캔한 결과:

- **2,924개 필드는 정확히 2문장**이다(관찰 1문장 + 조언 1문장 형태로 이미 자연스럽게 나뉨).
- **40개 필드는 1문장뿐**이며, 전부 "잠긴 카드" 5장(`major_0`=바보, `wands_Ace`/`cups_Ace`/`swords_Ace`/`pentacles_Ace`)에 속한다. 이 5장은 2026-09-01 타로 enrichment 최종 리뷰(커밋 `65db4b8`)에서 의도적으로 손대지 않고 남겨진 카드들이고, 그 커밋이 추가한 기존 회귀 테스트(`isLockedCard` 기반 문장수/금지쌍 검사)도 이 5장을 건너뛴다 — 이번에도 같은 관례를 따른다.

**결정**: 2,924개 필드만 `{a:[3], b:[3]}` 풀로 변환한다. 40개 1문장 필드는 **그대로 고정 문자열로 남긴다** — `resolveMeaningText()`가 이미 문자열/풀 타입을 자동 감지하므로 렌더링에 문제가 없고, 이 40개를 억지로 2문장으로 늘려 쓰는 콘텐츠 작업을 이번 스펙에 추가하지 않는다(범위 밖).

**규모(사용자 확인 완료, 2026-09-08)**: 2,924개 필드 × 4개 신규 문장(a에 2개, b에 2개) = **약 11,700개의 신규 한국어 문장**. 3개 변형 풀(`{a:[3],b:[3]}`)이라는 앱 전체의 일관된 관례를 그대로 유지한다(2개로 줄이지 않음).

## 데이터 변경

변환 대상: `card.categories[cat][orientation][subkey]`(세분화 카테고리 8개×서브키 2개) 및 `card.categories[cat][orientation]`(단일 카테고리 3개) — 카드당 19개 필드 × 2방향 = 38개, 78장 전체 2,964개 중 2,924개(40개 예외 제외).

각 필드: 기존 2문장 문자열 → `{a:[3], b:[3]}`. **문장1 → `a[0]`(잠김), 문장2 → `b[0]`(잠김)** — upright/reversed 변환 때 확립된 "기존 문구를 자연스러운 지점에서 둘로 나눠 잠근다" 관례를 그대로 재사용한다. `a[0]`/`b[0]`은 어떤 태스크에서도 절대 수정하지 않는다. 신규 변형은 `a[1,2]`/`b[1,2]`에만 추가한다.

파일: `data/tarot-data-{major,wands,cups,swords,pentacles}.js`(기존과 동일하게 5개 파일에 나뉨).

## 코드 변경 (`js/app.js`, 1줄)

`showSummary()`(카테고리 선택 시 분기, 현재 795행 부근):

```js
// 변경 전
const baseMeaning = categoryReading
  ? resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice)
  : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);

// 변경 후
const baseMeaning = categoryReading
  ? resolveMeaningText(resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice))
  : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
```

다른 4개 모드가 쓰는 `resolveCategoryMeaning()`(280-315행)은 이미 `resolveSubchoiceValue`의 결과를 `resolveMeaningText`로 감싸고 있으므로(그 모드들은 카테고리가 이미 오래전에 풀로 바뀌었기 때문) 수정이 필요 없다 — 타로의 `showSummary()`만 자체 인라인 로직을 갖고 있어서 이 1줄만 고치면 된다. `resolveMeaningText(value)`는 `typeof value === 'string'`이면 그대로 반환, 아니면 `pickRandom(value.a) + ' ' + pickRandom(value.b)`를 반환하므로 — 아직 변환 안 된 40개 고정 문자열 필드와 변환된 2,924개 풀 필드가 **공존하는 동안에도** 코드는 항상 올바르게 동작한다. 이는 콘텐츠 변환을 여러 태스크로 나눠 점진적으로 진행할 수 있게 해주는 핵심 성질이다.

## 테스트 재설계 (`tests/tarot-data.test.js`)

기존 구조 검증·이미지 경로 검증(20-105행 부근)은 그대로 두되, `categories` 구조 검증 부분만 "문자열 또는 `{a,b}` 풀"을 모두 허용하도록 수정한다(각 서브키 값에 대해 `typeof v === 'string' ? assertNonEmpty(v) : assertPool(v)`). 이 검증은 **몇 개 카드가 변환됐는지와 무관하게 항상 통과**해야 한다 — upright/reversed 변환 때 썼던 "타입 자동 감지로 점진적 변환을 지원" 패턴을 그대로 재사용.

**기존 sentence-count 검사(2-3문장)와 forbidden-pair 문장 단위 검사는 폐기한다.** 이 두 검사는 카테고리가 고정 문자열이던 시절, 문장 단위로 쪼개 비교하는 방식으로만 가능했던 임시방편이었다(2026-09-01 커밋 `65db4b8`의 blind-spot 픽스). 카테고리가 `{a,b}` 풀이 되면 이미 확립된 **풀 레벨** dedup 축(아래)이 문장 단위보다 더 정밀하게 같은 문제를 잡아내므로 더 이상 필요 없다. 단, 아직 변환되지 않은 40개 고정 문자열 필드에 대한 최소한의 구조 검증(비어있지 않은 문자열)은 유지한다.

**신규/확장 dedup 축**: [[project-dedup-axes-extraction]]에서 만든 공유 함수(`checkPoolSelfCollisions`/`checkCrossPoolCollisions`/`checkExactMatchCollisions`/`checkKeywordSelfEcho`/`checkDanglingClausePool`)를 처음부터 사용한다(예전처럼 "먼저 인라인으로, 나중에 추출"하지 않음). 모든 축은 **아직 변환되지 않은 필드(문자열 타입)는 자동으로 건너뛴다** — 즉 몇 개 카드가 변환됐든 항상 통과해야 한다.

1. **필드 내부 자기중복** (기존 AXIS1 확장): 이미 카드+방향 단위로 `upright`/`reversed`의 a/b를 검사하는 `checkPoolSelfCollisions` 호출에, 변환된 카테고리 풀 19개(세분화 16 + 단일 3)의 a/b도 엔트리로 추가한다. 카드 고유 키워드로 bound.
2. **advice ↔ 카테고리 echo** (기존 AXIS3 재설계): 지금은 advice를 카테고리의 **고정 전체 문자열**과 비교하지만, 카테고리가 a/b로 나뉘면 advice를 카테고리의 **a와 b 각각**과 비교해야 한다(렌더링 시 실제로 함께 보이는 건 무작위로 뽑힌 a+b 조합이므로). `checkCrossPoolCollisions`로 advice vs 카테고리.a, advice vs 카테고리.b 두 세트, 잠긴-잠긴 스킵.
3. **금지쌍(love↔relationships, career↔workplace, money↔business)** (문장 단위 → 풀 단위로 완전 재설계): a는 강화 비교(`fullCombinedIssues`), b는 단순 word-Jaccard, **잠긴-잠긴(index0 vs index0) 스킵 있음** — saju의 forbidden-pair-a 관례와 동일(ddi/zodiac은 스킵이 없지만, 아래 사전 검증에서 확인했듯 타로는 스킵이 반드시 필요함). `checkCrossPoolCollisions` 재사용.
4. **카드 간 완전동일 + 근접축자** (기존 AXIS4 확장): `checkExactMatchCollisions`/`checkCrossPoolCollisions` 호출에 카테고리 풀 19개의 a/b도 포함— 즉 다른 카드의 같은 카테고리·같은 슬롯끼리도 비교 대상이 된다(78장 규모라 [[project-cross-entity-near-verbatim]]과 유사한 스케일).
5. **keyword 자기 echo** (기존 AXIS5 확장): 카드 키워드가 카테고리 a/b 텍스트(변환된 것)에도 등장하지 않는지 검사 — 지금은 카테고리를 "고정" 텍스트로만 취급해 잠긴 쪽만 검사하는데, 변환 후엔 a[1,2]/b[1,2](비잠금)도 포함해야 한다.
6. **조합 문법 검증(dangling-clause)** (기존 AXIS6 확장): `checkDanglingClausePool`에 카테고리 풀도 포함 — 잠긴 a[0]/b[0]이 원래 완결 문장(관찰 1문장, 조언 1문장이 각각 통째로 하나의 완결 문장이었으므로 이론상 위반 없어야 하지만, 실제 검증 필요).

**사전 검증(완료, 2026-09-08)**: 위 6개 축과 동일한 로직의 임시 스크립트로 "카테고리를 전부 변환했다고 가정한" 인메모리 클론(a[0]=문장1, b[0]=문장2, 신규 변형 없음)을 미리 스캔했다([[feedback-verify-locked-reference-before-finalizing]]과 동일한 이유, [[project-cross-entity-near-verbatim]]에서 사전 스캔으로 ddi 실데이터 위반을 미리 잡아낸 것과 같은 패턴). 결과:

- **금지쌍 축에서 518건(a)+3건(b)** — 전부 index0-vs-index0(양쪽 다 잠긴 원본, 현재는 풀에 원소가 1개뿐이라 비교 대상이 그것뿐임)이었다. ddi/zodiac 관례(스킵 없음)를 그대로 적용하면 이미 배포된, 수정 불가능한 콘텐츠 518건이 즉시 실패로 뜨는 셈이라 — **saju 관례(잠긴-잠긴 스킵)로 설계를 수정**했다(위 3번 항목에 반영 완료). 스킵 적용 후 재실행 결과 0건.
- **advice↔카테고리 echo에서 9건** — 전부 category.b[0](잠김)과 advice[1]/[2](이전 랜덤화 단계에서 이미 배포된 비잠금 콘텐츠)의 충돌. 카테고리를 문장 단위가 아닌 a/b 세분화 레벨로 처음 검사하면서 드러난, 실제로 존재하던 결함이었다. advice 쪽 9개 문장을 재작성해 해결(커밋 `67f6a88`) — 여사제/교황/완드킹/컵4/컵기사/소드4/소드9/소드기사/펜타클3.
- 나머지 4개 축(필드 내부 자기중복은 원소가 1개뿐이라 이번 사전검증 범위 밖, keyword 자기echo/dangling-clause/카드 간 완전동일)은 0건. 카드 간 근접축자는 3건이지만 전부 서로 다른 카드의 잠긴 b[0]끼리 우연히 겹치는 경우라 실제 축의 `(x,y)=>x===0&&y===0` 스킵 규칙(이미 확립된 관례)으로 자동 제외된다 — 수정 불필요.
- 재검증 결과 `node scripts/run-tests.js` 10/10 통과 유지, 사전검증 스크립트도 0 issues(근접축자 3건은 스킵 대상이라 실제 축에서는 나타나지 않음).

## 작업 분량 및 태스크 분해 전략

**1단계(인프라 태스크, 콘텐츠 변환 0건 상태에서 먼저 완료)**:
- `js/app.js` 1줄 변경.
- `tests/tarot-data.test.js` 재설계(위 6개 축 + 구조 검증 타입 자동감지 + sentence-count/forbidden-pair-문장단위 검사 폐기).
- 사전 검증 스크립트로 "전부 변환했다고 가정" 시 실위반 없는지 확인.
- 이 시점엔 어떤 카드도 실제로 변환되지 않았으므로(`categories` 전부 여전히 문자열), 새 테스트는 구조 검증만 발동하고 나머지 5개 축은 전부 빈 배열(자동 스킵)로 통과해야 한다.

**2단계(콘텐츠 태스크, 아치아나 그룹별)**: 기존 enrichment/random-reading 프로젝트와 동일하게 메이저(22장, 필요 시 A/B 분할)/완드/컵/소드/펜타클(각 14장) 단위로 나누되, **카드당 신규 문장 개수가 이전 upright/reversed 단계(카드당 새 문장 18개: upright+reversed 각 4개=8, keywords 신규 3개×2=6, advice 신규 2개×2=4)보다 훨씬 많다** — 카드 하나의 19개 카테고리 필드 × 2방향 × 신규 4문장(a 2개+b 2개) = 카드당 평균 약 150개 신규 문장(잠긴 카드는 예외 필드만큼 더 적음). 이 때문에 각 태스크가 다루는 카드 수를 이전보다 대폭 줄여야 한다 — 정확한 배치 크기(예: 그룹당 2~3장씩)는 writing-plans 단계에서 결정한다. 각 태스크는: 배정된 카드들의 19개 필드를 전부 변환(문장1→a[0]/문장2→b[0] 고정 + a[1,2]/b[1,2] 신규 작성) → 임시 검증 스크립트로 0 issues 확인 → 커밋.

**총 태스크 수 예상**: 인프라 1개(이번 writing-plans의 범위, 아래 참고) + 콘텐츠 다수(정확한 수는 각 서브프로젝트의 writing-plans에서 확정) — 이전 phase가 6개 콘텐츠 태스크로 468개 필드(카드당 6개)를 처리했다면, 이번엔 2,924개 필드(카드당 평균 37.5개, 6.3배)이므로 태스크당 카드 수를 훨씬 줄여야 리뷰 라운드 위험을 감당할 수 있는 규모가 된다. **이 프로젝트는 아치아나 그룹(메이저/완드/컵/소드/펜타클) 단위로 별도의 spec/plan/implementation 사이클을 갖는 5개(+분할 시 그 이상) 서브프로젝트로 진행한다** — 이 설계 문서가 모든 서브프로젝트에 공통 적용되는 아키텍처(데이터 구조·코드 변경·dedup 축)를 확정하므로, 각 서브프로젝트는 별도 브레인스토밍 없이 바로 writing-plans로 진입할 수 있다.

## 검증

- `node scripts/run-tests.js` 10/10 통과를 매 태스크마다 유지.
- 각 콘텐츠 태스크 커밋 전 임시 dedup 검증 스크립트(`.superpowers/scratch-verify-tarot-categories.js`, `.gitignore`에 이미 걸린 `.superpowers/` 안)로 0 issues 확인.
- 전체 완료 후 브라우저 검증: 카테고리 선택 시 본문이 매번 랜덤하게 달라지는지, 카테고리 미선택(기존 랜덤화 범위)은 회귀 없는지 확인.

## 비범위

- 40개 1문장 locked-카드 필드를 2문장으로 늘려 쓰는 것 — 별도 필요성이 생기면 그때.
- `keywords`/`advice`/`upright`/`reversed`(이미 완료된 범위) 수정 없음.
- `js/app.js`의 `resolveSubchoiceValue`/`resolveMeaningText`/`renderKeywordsAdviceHtml` 등 기존 헬퍼 자체의 리팩터링 없음 — 호출부 1줄만 변경.
