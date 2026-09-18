# 타로 categories 랜덤화 — 펜타클(Pentacles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. The user already chose this execution method; do not ask again between tasks.

**Goal:** 펜타클 14장의 532개 categories 필드 중 516개를 `{a:[3],b:[3]}`로 전환한다. 에이스 1문장 예외 16개는 문자열로 보존한다. 신규 문장은 총 2,064개다.

**Architecture:** 기존 렌더러와 검증 인프라를 재사용한다. 원본 2문장을 a[0]/b[0]으로 정확히 보존하고, 같은 주제의 관찰 a[1,2]와 조언 b[1,2]를 개별 작성한다. 이전 완드·컵·소드 42장과도 교차 검증한다.

**Tech Stack:** 순수 JavaScript 데이터, Node.js assert 기반 기존 테스트, gitignored scratch 검증 도구.

**Spec:** `docs/superpowers/specs/2026-09-08-tarot-categories-randomization-design.md`

**Baseline:** `4383f08d0970573c03daa74b921b2c2ab49fb308`. Branch `codex/tarot-pentacles-categories`, worktree `.claude/worktrees/tarot-pentacles-categories`. 메인의 미커밋 UI 작업과 다른 워크트리는 수정하지 않는다. 원격 pull/push는 수행하지 않는다.

## Global Constraints

- 콘텐츠 변경 대상은 `data/tarot-data-pentacles.js`의 `categories`뿐이다. 기존 최상위 upright/reversed/keywords/advice, 다른 슈트, 렌더러, 공식 테스트·dedup 헬퍼는 변경하지 않는다.
- **문장1 → a[0], 문장2 → b[0]은 원본 한 글자도 바꾸지 않는다.** `a[0] + " " + b[0]`이 기준 커밋의 원문을 정확히 복원해야 한다. 원본 1문장 필드는 늘리거나 풀로 바꾸지 않는다.
- 세분화 8개 카테고리는 `categories.<cat>.<direction>.<subkey>` 위치에 풀을 둔다. 단일 honor/moving/children은 `categories.<cat>.<direction>`에 직접 풀을 둔다. a와 b는 각각 정확히 3개 문장이다.
- 신규 4문장은 각각 독립적으로 자연스러운 한국어 완결문을 작성한다. a는 상황 관찰, b는 조언이며 카드·방향·세부 항목의 원문 의미를 유지한다. 조사만 바꾸거나 카테고리 명사를 문장 틀에 끼우는 자동 생성은 금지한다. 명시적 필드→완성 문장 매핑을 쓰는 편집 도구는 허용한다.
- 특정 카드의 특정 categories 필드만 targeted edit한다. 데이터 파일 전역 regex/문구 치환은 금지한다.
- love↔relationships, career↔workplace, money↔business는 소재와 표현을 구별한다. relationships.new와 existing을 혼동하지 않는다. 같은 카드·방향의 advice/keywords(부분 문자열 포함)와 echo를 피한다. 작성 전 해당 원문·advice·keywords를 읽는다.
- 신규 문장의 `흐름입니다.` 종결을 금지한다. 단순 동의어 치환 대신 상황·이미지·문장 구조를 달리한다. 검사를 피하기 위해 비문이나 무의미한 접두어를 만들지 않는다.
- 에이스 16개 예외 경로(모두 categories 아래): money.upright.consumption, money.reversed.consumption, career.upright.switch, business.upright.running, business.reversed.running, study.upright.exam, study.reversed.exam, study.reversed.path, health.upright.mind, health.reversed.mind, relationships.upright.existing, relationships.reversed.new, relationships.reversed.existing, workplace.upright.team, workplace.reversed.team, workplace.reversed.personal.
- 작업 순서는 Ace/2/3 → 4/5/6 → 7/8/9 → 10/Page/Knight → Queen/King → 전체 스윕이다. 동시 구현 금지. 매 태스크 구현→독립 사양·품질 리뷰→수정/재리뷰 이후 다음 태스크로 넘어간다.
- 문법·공식 10/10·원본/범위 검증이 필요하다. 공식 테스트는 첫 assert에서 멈추므로 AXIS1을 고친 뒤 AXIS7 등 다음 실패를 확인한다. 테스트나 기준을 완화하지 않는다.
- 강신호 기준은 word-Jaccard >= 0.3 또는 LCS >= 10. 계획 방식(a fullCombinedIssues, b raw LCS)과 정규화 LCS 방식 모두 사용한다. 잠금-잠금(0,0)은 제외한다. 약신호 전부를 수정하지 않는다.
- 비교는 같은 필드·방향·슬롯의 펜타클 내부 및 펜타클↔완드/컵/소드이다. 재작성 후 원래 상대만 아니라 전체 비교 대상을 다시 확인한다. 아직 문자열인 후속 카드가 풀로 전환될 때 이전 신규 문장과 충돌하면 Task6 이월로 명확히 기록한다.
- 펜타클 원문 index0 ↔ 기존 다른 슈트 변형은 두 끝점 모두 이번 범위에서 불변이므로 별도 기록한다. **수정 가능한 강신호 0건**이 목표이며, 전체 강신호 0건으로 과장하지 않는다. 두 스윕의 immutable 건수는 중복되므로 합산하지 않는다. 이전 펜타클 신규 문장과 후속 잠금 원문의 충돌은 Task6에서 수정 가능하므로 immutable로 분류하지 않는다.
- 각 콘텐츠 태스크는 배정 카드만 수정한 데이터 파일 커밋으로 마무리한다. per-command `Codex <noreply@openai.com>` 작성자/커미터를 사용하고 Claude 공저자 표기를 복사하지 않는다. 전역 git 설정을 바꾸지 않는다.
- 중단/한도 오류 뒤에는 git status/log/diff→문법→공식 테스트→보고서를 확인해 저장된 작업을 이어받는다. 이미 완료된 커밋이나 초안을 폐기/reset하지 않는다. scratch 저작 도구가 최신 수정본을 덮어쓰지 않도록 주의한다.

## Validation contract

작업별 보고서에는 실제 명령·결과·커밋·변경 경로·의미 자체검토 및 이월 항목을 기록한다. 저장 위치는 `.superpowers/sdd/2026-09-18-tarot-categories-pentacles-implementation/task-N-report.md`이다.

```powershell
node --check data/tarot-data-pentacles.js
node scripts/run-tests.js
node .superpowers/verify-pentacles-locks.cjs
node .superpowers/verify-pentacles-normalized.cjs
node .superpowers/verify-pentacles-plan-strong.cjs
git diff --check
```

예상: 문법 exit0, 공식10/10, 원본·noncategories 불변 PASS. 각 태스크 신규 문장의 수정 가능한 강신호는 0. 보호된 이전 펜타클 신규 문장과 새 원본의 충돌은 Task6으로 명시 이월 가능하다. 최종은 두 스윕 모두 전체 editable0, pools516/strings16이다.

검증 도구는 `.superpowers/completed/tarot-swords-4383f08/`에 보존된 소드 도구에서 펜타클 타깃·기준 커밋·기존 42장 비교 대상으로만 조정했다. 공식 테스트는 변경하지 않았다. `scratch-verify-pentacles-sweep.js`는 계획 comparator 본체, `verify-pentacles-plan-strong.cjs`는 강신호 필터/immutable 분류, `verify-pentacles-normalized.cjs`는 두 슬롯 정규화 비교, `verify-pentacles-locks.cjs`는 기준4383f08 원문 복원·풀 구조·비카테고리 불변과 1문장 예외 미변환 검사다. 이 도구들은 gitignored이며 워크트리 정리 전 보고서와 함께 보존한다.

## 콘텐츠 작성 절차

1. 배정 카드의 원문, 방향별 advice와 keywords를 읽는다.
2. 각 2문장 필드를 원문의 정확한 경계에서 나누고 a[0]/b[0]을 보존한다.
3. 각 필드에 대해 새로운 관찰 2개·조언 2개를 완성 문장으로 개별 작성한다. 명사 조합 자동 템플릿은 쓰지 않는다.
4. 3×3 조합이 모두 자연스럽고 원문 주제에 맞는지 재독한다. 새 문장의 의미를 희생하면서 dedup을 통과시키지 않는다.
5. validation contract 실행, 신규 쪽만 수정, 통과 후 data 파일만 커밋한다.

### Task 1: 펜타클 Ace / 2 / 3

**Files:** Modify `data/tarot-data-pentacles.js`, existing tests `tests/tarot-data.test.js` (run only).
**Interfaces:** Consumes baseline4383f08 and completed Wands/Cups/Swords; produces98pools (Ace22 + 2/3 각38),434strings.
- [ ] 위 콘텐츠 작성 절차로 Ace22필드(예외16보존), rank2/3 각38필드를 변환한다. 총98필드·신규392문장.
- [ ] validation contract와 BASE 대비 배정 카드 이외 불변 검사를 실행하고 모든392문장을 자체 재독한다.
- [ ] 데이터만 커밋: `content(tarot): convert pentacles Ace/2/3 category pools`.
- [ ] task-1-report.md 기록 후 독립 리뷰와 필요한 수정·재리뷰를 완료한다.

### Task 2: 펜타클 4 / 5 / 6

**Files:** Modify `data/tarot-data-pentacles.js`, existing tests run only.
**Interfaces:** Consumes98pools; produces212pools/320strings. Ace/2/3는 보호된 비교 대상이다.
- [ ] 각38필드·총114필드·신규456문장을 콘텐츠 작성 절차로 개별 작성한다.
- [ ] validation contract, BASE 대비 이전/후속 카드 불변 검사, 모든456문장 자체 재독을 완료한다.
- [ ] 데이터만 커밋: `content(tarot): convert pentacles 4/5/6 category pools`.
- [ ] task-2-report.md 기록 후 독립 리뷰와 수정·재리뷰를 완료한다.

### Task 3: 펜타클 7 / 8 / 9

**Files:** Modify `data/tarot-data-pentacles.js`, existing tests run only.
**Interfaces:** Consumes212pools; produces326pools/206strings.
- [ ] 각38필드·총114필드·신규456문장을 콘텐츠 작성 절차로 개별 작성한다.
- [ ] validation contract, BASE 대비 이전/후속 카드 불변 검사, 모든456문장 자체 재독을 완료한다.
- [ ] 데이터만 커밋: `content(tarot): convert pentacles 7/8/9 category pools`.
- [ ] task-3-report.md 기록 후 독립 리뷰와 수정·재리뷰를 완료한다.

### Task 4: 펜타클 10 / Page / Knight

**Files:** Modify `data/tarot-data-pentacles.js`, existing tests run only.
**Interfaces:** Consumes326pools; produces440pools/92strings.
- [ ] 각38필드·총114필드·신규456문장을 콘텐츠 작성 절차로 개별 작성한다.
- [ ] validation contract, BASE 대비 이전/후속 카드 불변 검사, 모든456문장 자체 재독을 완료한다.
- [ ] 데이터만 커밋: `content(tarot): convert pentacles 10/page/knight category pools`.
- [ ] task-4-report.md 기록 후 독립 리뷰와 수정·재리뷰를 완료한다.

### Task 5: 펜타클 Queen / King

**Files:** Modify `data/tarot-data-pentacles.js`, existing tests run only.
**Interfaces:** Consumes440pools; produces516pools/16Ace-onlystrings, all14cards converted.
- [ ] 각38필드·총76필드·신규304문장을 콘텐츠 작성 절차로 개별 작성한다.
- [ ] validation contract, BASE 대비 이전 카드 불변 검사, 모든304문장 자체 재독을 완료한다. 에이스22풀, 나머지13장 각각38풀 및 지정된 예외16개를 확인한다.
- [ ] 데이터만 커밋: `content(tarot): convert pentacles queen/king category pools`.
- [ ] task-5-report.md 기록 후 독립 리뷰와 수정·재리뷰를 완료한다.

### Task 6: 전체 강신호 스윕 및 최종 검증

**Files:** Modify `data/tarot-data-pentacles.js` only if actionable findings; ignored report/sweep artifacts.
**Interfaces:** Consumes all516pools and all task-deferred conflicts; produces0editable strong findings under both comparators, full immutable inventory.
- [ ] 두 스윕을 실행해 같은 필드·방향·슬롯의 14장 내부와 기존42장 전체를 비교한다. `if (x === 0 && y === 0) continue`와 실제 상대 인덱스y를 유지한다.
- [ ] 수정 가능한 펜타클 indices1/2만 필드별 재작성한다. 태스크 이월 충돌도 해결한다. 양끝 불변 충돌과 약신호는 명확히 기록하고 원문·다른 슈트를 수정하지 않는다.
- [ ] 전체 대상 재검증에서 editable0이 될 때까지 신규 문장만 조정한다. validation contract로 공식10/10과 원본/예외 보존을 확인한다.
- [ ] 수정이 있으면 데이터만 커밋: `fix(tarot): resolve pentacles cross-suite category duplicates`; 없으면 검증 보고서만 기록한다.
- [ ] task-6-report.md 및 독립 리뷰 완료 후 전체 브랜치 리뷰를 시행한다. 이전 deferred minor도 전부 검토한다.
- [ ] 격리된 페이지에서 카테고리/기본 리딩 표시를 확인하고 실제 resolveMeaningText 함수의 전체516×9=4644조합 및16문자열 예외를 검증한다.
- [ ] 최신 검증·보고서·스윕 출력 보존 후 로컬 통합 선택을 확인한다. 원격 pull/push는 별도 지시 없이는 하지 않는다.
