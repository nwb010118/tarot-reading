# 고정 결과 + 오늘의 한 장 + 근거 공개 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** 별자리·띠·사주·궁합 결과를 시드로 고정하고, 오늘의 한 장과 근거 공개 패널을 추가한다. 타로 리딩은 현행 무작위 유지.

**Architecture:** `js/seeded-random.js`가 시드 난수·날짜 키·기기 ID를 제공한다. `app.js`는 모듈 변수 `activeRng`를 두고 `pickRandom`/`pickKeywords`가 이를 쓴다. 각 리딩 시작 시 `activeRng`를 시드 난수로 설정하고, 타로 뽑기에서는 `Math.random`으로 되돌린다.

**Tech Stack:** 바닐라 JS(브라우저+Node UMD 패턴), node assert 테스트.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-10-02-deterministic-readings-design.md`
- `js/app.js`와 `index.html`은 CRLF. 줄바꿈을 보존한다.
- 전체 테스트: `node scripts/run-tests.js`. JS 변경 후 `npm run build:cache-version`.
- 작업 폴더에서 직접 수정·커밋한다(Codex 미커밋 변경은 현재 없음).

## Task 1: 시드 난수 모듈

**Files:** Create `js/seeded-random.js`, `tests/seeded-random.test.js`

**Produces:** `createRng(parts: any[]) => () => number`, `todayKey(now?: Date) => 'YYYY-MM-DD'`, `getDeviceId(storage|null) => string`

- [ ] 테스트 작성(같은 parts 같은 수열 / 다른 parts 다른 수열 / 범위 [0,1) / todayKey 형식 / getDeviceId 저장소 없이 동작·저장소 있으면 재사용) 후 실패 확인
- [ ] 구현 (mulberry32 + FNV-1a 해시)
- [ ] 통과 확인, 커밋

## Task 2: app.js를 시드 난수로 전환

**Files:** Modify `js/app.js`, `index.html`(스크립트 추가), `tests/reading-guidance-ui.test.js`

- [ ] `let activeRng = Math.random;` 추가, `pickRandom`·`pickKeywords`가 `activeRng()` 사용
- [ ] `showZodiacSummary`/`showDdiSummary`/`showSajuSummary`/`showCompatibilitySummary` 시작부에 시드 설정, 타로 `drawButton` 핸들러에서 `activeRng = Math.random`
- [ ] 시드 정책은 스펙 2절 표를 따른다
- [ ] 기존 `reading-guidance-ui.test.js` 컨텍스트에 `activeRng`, `createRng`, `todayKey` 추가, 같은 입력 두 번 렌더 시 동일 출력 단언 추가
- [ ] 전체 테스트, 커밋

## Task 3: 근거 공개 패널

**Files:** Modify `js/app.js`, `css/style.css`

- [ ] `renderEvidence(lines)` 추가: `<details class="evidence"><summary>이 풀이는 어떻게 나왔나요?</summary><ul>…</ul></details>`
- [ ] 타로·별자리·띠·사주·궁합 결과에 붙이고 `renderPracticePlan`의 "무작위로 선택됩니다" 문구를 정책 설명으로 교체
- [ ] `index.html:273` 별자리 안내의 "무작위로" 문구 수정
- [ ] 전체 테스트, 커밋

## Task 4: 오늘의 한 장

**Files:** Modify `index.html`, `js/app.js`, `css/salon.css`

- [ ] 홈 `#screen-start` 위 `<section id="daily-card">` 추가
- [ ] `renderDailyCard()`: 시드 `['daily', deviceId, todayKey()]`로 `drawCards(deck,1,rng)`, 이미지·이름·방향·키워드·조언·백과사전 링크 표시
- [ ] 전체 테스트

## Task 5: 검증과 배포

- [ ] `npm run build:cache-version`, 전체 테스트
- [ ] 브라우저에서 5개 모드 클릭, 같은 조건 재클릭 시 동일 결과, 오늘의 한 장 새로고침 시 동일, 콘솔 오류 없음 확인
- [ ] 커밋, push, 라이브 반영 확인
