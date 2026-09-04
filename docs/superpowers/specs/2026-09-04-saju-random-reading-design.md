# 리딩 랜덤화 — 사주 단계 설계 문서

날짜: 2026-09-04

## 목적

[띠운세 파일럿](2026-09-03-ddi-random-reading-design.md)과 [별자리 단계](2026-09-03-zodiac-random-reading-design.md)에서 검증한 "슬롯 재조합(slot recomposition) + 풀 샘플링(pool sampling)" 방식을 세 번째 모드인 사주(`data/saju-data.js`)에 적용한다. 이 파일의 `ILGAN_DATA`(10개 일간)는 12궁·12띠와 완전히 동일한 `categories[cat][subkey]` 2단 중첩 구조를 쓰므로, 검증된 패턴을 그대로 이식한다. `js/app.js`는 별자리 단계에 이어 이번에도 전혀 변경하지 않는다 — 기존 `resolveCategoryMeaning()`/`renderKeywordsAdviceHtml()`가 이미 문자열/`{a,b}` 객체, 고정 배열/풀 배열 양쪽을 모두 처리한다.

별자리 최종 브랜치 리뷰에서 나온 세 가지 저비용 dedup 개선을 **이번 단계부터 채택**한다(사용자 확인 완료): (1) 함께 렌더되는 문장 echo 검사의 지표를 word-Jaccard 단독에서 bigram/LCS 결합으로 보강, (2) 엔티티 간 완전동일 문자열 검사를 저비용으로 추가, (3) 같은 엔티티 내 비금지쌍 카테고리 교차에도 near-verbatim 전용(LCS≥20) 검사를 추가.

사주만의 새 요소: `ELEMENT_BALANCE_TEXT`(오행 과다/부족/균형 고정 문구 13개)가 카테고리 해설 뒤에 항상 이어져 같은 화면에 렌더된다(`js/app.js:680`, `resolveCategoryMeaning(...) + ' ' + balanceText`). 이 문구는 사용자의 실제 사주 계산값이라 **랜덤화 대상이 아니지만**, advice/b풀과 같은 화면에 함께 뜨므로 echo 검사 비교 대상에는 포함한다(사용자 확인 완료).

## 범위

### A. 대상 필드 (`data/saju-data.js`, `ILGAN_DATA` 10개 일간)

- 카테고리 본문: 세분화 8개(`love/money/career/business/study/health/relationships/workplace` × 2서브키) + 단일 3개(`honor/moving/children`) = 일간당 19개
- `trait`(오늘의운 폴백) — 일간당 1개
- `keywords`(일간당 3개 → 6개 풀)
- `advice`(일간당 1개 → 3개 풀)

`ELEMENT_BALANCE_TEXT`(13개 고정 문구), `key`/`name_kr`/`element` 등 랜덤화와 무관한 필드는 변경하지 않는다.

### B. 대상 밖

- 타로/궁합 콘텐츠 확장 (다음 단계로 미룸)
- `js/app.js` 코드 변경 — 기존 헬퍼를 그대로 재사용한다.
- `tests/zodiac-data.test.js`/`tests/ddi-data.test.js`와의 공유 dedup 헬퍼 추출 — 사용자 확인 하에 이번 단계는 기존처럼 테스트 파일에 로직을 복사해서 쓰고, 리팩토링은 별도로 미룬다.
- `js/compatibility-calc.js`(`getSajuCompatibility`가 `ILGAN_DATA.categories`/`trait`을 참조하지 않는 독립 로직 — 확인 완료)

## 데이터 구조 변경 (`data/saju-data.js`)

띠운세·별자리와 완전히 동일한 스키마(`{a:[...], b:[...]}` 풀, `keywords` 6개, `advice` 3개). `ELEMENT_BALANCE_TEXT` 객체는 그대로 유지.

## Dedup 방법론 — 6개 축

앞선 두 단계에서 확정한 4개 축에 이번 단계부터 2개 축을 추가한다:

1. **필드 내부 자기중복**: 같은 필드의 `a`풀 3개끼리, `b`풀 3개끼리 각각 3단 결합(word-Jaccard≥0.3 전체 스윕 + word≥0.20∧trigram≥0.15 결합 + LCS≥5∨어근중복≥2∨bigram≥0.185 결합).
2. **advice 풀 자기중복**: 일간당 advice 3개끼리 word-Jaccard≥0.3 단순 스윕.
3. **(강화) advice↔b풀·오행문구 echo**: 모든 `advice[i]`를 그 일간의 모든 필드 `b[j]`(19개 카테고리 `b`풀 + `trait.b`) **및 `ELEMENT_BALANCE_TEXT`의 13개 문구 전체**와 비교. 판정 기준을 `word-Jaccard≥0.3 OR bigram≥0.30 OR LCS≥10`으로 강화(기존엔 word-Jaccard 단독이라 별자리 최종 리뷰에서 실제 충돌 하나를 지표 부족으로 놓쳤음). `ELEMENT_BALANCE_TEXT`는 어느 일간의 리딩에도(오행 밸런스는 사주 전체 기둥에서 계산되므로 일간의 오행과 무관하게 5원소 아무거나 나올 수 있음) 등장할 수 있으므로, 일간별로 스코핑하지 않고 13개 전체와 비교한다.
4. **금지쌍(cross-category) 교차**: 같은 일간 안에서 `love`(solo/couple)↔`relationships`(new/existing), `career`(jobseek/switch)↔`workplace`(team/personal), `money`(consumption/invest)↔`business`(startup/running). `a`풀은 3단 결합 전체(3×3 전수), `b`풀은 word-Jaccard≥0.3 단순 스윕만(이유: `b[0]`끼리는 이전 프로젝트에서 이미 잠긴 문장이라 3단 결합 적용 시 수정 불가능한 충돌이 발생할 수 있음 — 띠운세에서 실제로 확인됨).
5. **(신규) 일간 간 완전동일 검사**: 전체 코퍼스(10개 일간 × 20필드 × a/b 각 3개 = 총 1,200개 문장)를 하나의 리스트로 모아 바이트 단위 완전 동일 문자열이 2개 이상 나오면 플래그(단순 카운트 맵, 3단 결합 불필요 — 별자리에서 처녀자리/염소자리가 완전히 같은 문장을 가졌던 사례를 저비용으로 잡기 위함).
6. **(신규) 같은 일간 내 비금지쌍 근접축자 검사**: 같은 일간의 20개 필드(trait+19) 전체 쌍에 대해 `a`풀-`a`풀, `b`풀-`b`풀 조합에 **LCS≥20만** 적용(3단 결합 전체를 적용하면 오탐이 폭발하므로 이 축은 LCS 단일 지표로 한정). 금지쌍(축 4에서 이미 3단 결합으로 커버됨)과 중복되지 않도록, 이 축은 금지쌍이 아닌 필드 조합에만 적용한다.

## 잠긴 참조

**갑목**(`key: 'gap'`)을 가장 먼저 정확히 작성해 나머지 9개 일간의 기준으로 삼는다. 잠그기 전 실제 dedup 스윕 스크립트(위 6개 축 전부)를 돌려 0건을 확인한다([[feedback-verify-locked-reference-before-finalizing]]).

## 테스트 방식

`tests/saju-data.test.js`를 새 구조 기준으로 재작성한다:

- 구조 검증: 10개 일간 전체 `trait`+19개 카테고리 필드가 `a`/`b` 각 3개, `keywords` 6개(distinct), `advice` 3개, 서브키 두 값이 서로 다른지(별자리 최종 리뷰에서 복원한 검증 포함)
- 위 6개 축 전부 구현
- `getIlganByIndex()`/`getElementBalanceText()` 회귀 확인(별자리 최종 리뷰에서 빠졌던 조회 함수 회귀 검증을 이번엔 처음부터 포함)

`tests/helpers/dedup.js`의 기존 export를 그대로 재사용. 이번 단계는 `tests/zodiac-data.test.js`와 로직이 상당 부분 겹치겠지만(사용자 확인 하에) 공유 헬퍼로 추출하지 않고 복사해서 쓴다.

## 브라우저 검증

구현 완료 후 5개 모드 전부를 브라우저에서 확인한다:

- 사주: 같은 선택을 반복해 본문/키워드/조언이 매번 달라지는지, 오행 균형 문장과 함께 봤을 때도 자연스러운지(신규 echo 검사가 실제로 방지하는 지점) 확인
- 타로/띠운세/별자리/궁합: 기존과 동일한 결과(회귀 없음) 확인 — 특히 이미 랜덤화된 띠운세·별자리가 사주 작업 중 영향받지 않았는지

## 기존 코드와의 통합 지점

- `data/saju-data.js`: 카테고리 본문 19개 + `trait` 1개를 `{a:[...], b:[...]}` 구조로 변경, `keywords` 3→6개, `advice` 1→3개 (10개 일간 전체). `ELEMENT_BALANCE_TEXT`는 변경 없음.
- `tests/saju-data.test.js`: 구조 검증 대상 변경, dedup 검사 6개 축으로 재작성
- `js/app.js`: 변경 없음
- `js/compatibility-calc.js`: 변경 없음(확인 완료, 독립적)

## 롤아웃 계획

이 단계 완료 후 궁합 → 타로(별도 spec, 가장 큼) 순으로 계속. 궁합 단계 spec에서 공유 dedup 테스트 헬퍼 추출 여부를 다시 결정한다(세 번째 미룬 시점이라 이번엔 실제로 진행할 가능성이 높음).
