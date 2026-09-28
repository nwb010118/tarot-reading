# 사주 월운(12개월표) 설계

## 배경 / 목표

[사주 세운(10년 연운표) 설계](./2026-09-28-saju-seun-table-design.md)에서 다음 단계로 명시적으로 미뤘던 항목. 현재 사주 리딩 결과 화면(`js/app.js`의 `showSajuSummary()`)은 대운표(9구간) 아래에 그중 활성 구간의 세운표(10년)를 보여준다. 이번 작업은 그 세운표에서 **현재 연도(올해로 강조된 칸)**의 12개월을 펼친 "월운표"를 세운표 바로 아래에 추가한다.

## 현재 상태

- `js/saju-calc.js`: `getMonthOffset(longitude)`(태양황경 → 0~11 월 오프셋, 315도=입춘을 인월 시작으로 삼음), `MONTH_STEM_START`(오호둔 매핑), `getMonthPillar(yearStemIdx, monthOffset)`(연간 인덱스 + 월 오프셋 → 그 달의 간지) — 전부 이미 존재하고 순수함수([saju-calc.js:55-67](../../../js/saju-calc.js#L55-L67)). `getMonthPillar`는 태어난 달의 월주를 구할 때만 쓰이고 있고, 한 해 전체 12개월을 나열하는 함수는 없음.
- `js/saju-calc.js`의 `getSeunList(startYear, count)`([saju-calc.js:271-281](../../../js/saju-calc.js#L271-L281))가 가장 가까운 선례: `getYearPillar`를 단순 반복 호출해 목록을 만드는 패턴.
- `js/app.js` `showSajuSummary()`: `if (saju.hour) { ... if (activeDaeun) { seunHtml = ... } }` 구조([app.js:731-757](../../../js/app.js#L731-L757))로, 활성 대운 구간을 찾은 뒤 그 구간에 해당하는 10년 세운표(`seunList`)를 만들고 올해(`s.year === thisYear`)에 `.current` 클래스를 붙인다.
- `css/style.css`: `.seun-table`/`.seun-col`/`.seun-col.current`/`.seun-ganji`/`.seun-age`([style.css:255-273](../../../css/style.css#L255-L273) 부근)가 대운표 스타일을 그대로 복제한 것 — 월운표도 같은 패턴을 또 복제하면 된다.

## 새로 계산할 것 (`js/saju-calc.js`에 순수 함수로 추가)

### `getWolunList(yearStemIdx)`

```
for monthOffset in 0..11:
  pillar = getMonthPillar(yearStemIdx, monthOffset)   // 기존 함수 그대로 재사용
  결과에 { monthOffset, stemIdx: pillar.stemIdx, branchIdx: pillar.branchIdx } 추가
```

- 인월(monthOffset 0, 지지=인)부터 축월(monthOffset 11, 지지=축)까지 정확히 12개 항목을 순서대로 반환한다.
- 월지 이름("인월", "묘월" 등)은 이 함수가 만들지 않는다 — 렌더링 단(`app.js`)에서 `JIJI[branchIdx] + '월'`으로 표시한다(추가 매핑 테이블 불필요, `JIJI` 배열이 이미 자/축/인/묘/... 순서라 `branchIdx`로 바로 글자를 뽑을 수 있음).
- `module.exports`에 `getWolunList` 추가.

## UI / 렌더링 (`js/app.js`)

`showSajuSummary()`의 `if (activeDaeun) { ... seunHtml = ... }` 블록을 확장한다:

1. 세운표를 만드는 기존 로직 뒤에 이어서, `getYearPillar(thisYear).stemIdx`로 올해의 연간 인덱스를 구하고 `getWolunList(연간인덱스)`를 호출해 `wolunList`(12개)를 얻는다.
2. "이번 달" 판정은 `getMonthOffset(solarLongitude(new Date()))`(둘 다 기존 함수 재사용)로 오늘의 실제 월 오프셋을 구해 `wolunList`의 `monthOffset`과 비교한다.
3. `wolunHtml`을 세운표와 동일한 구조로 만든다(대운/세운과 같은 수준, 오행 색상 없음):

```html
<p class="table-label">월운</p>
<div class="wolun-table">
  <div class="wolun-col[ current]">
    <span class="wolun-ganji">병인</span>
    <span class="wolun-month">인월</span>
  </div>
  ... (12개)
</div>
```

- 간지 텍스트는 기존 `pillarText()` 헬퍼 재사용.
- CSS는 `.seun-table`/`.seun-col`/`.seun-col.current`/`.seun-ganji`/`.seun-age`를 그대로 복제해 `.wolun-table`/`.wolun-col`/`.wolun-col.current`/`.wolun-ganji`/`.wolun-month`로 추가한다.

`summaryEl.innerHTML` 조립부(`myeongsikHtml + elementHtml + daeunHtml + seunHtml + extraHtml`)에 `wolunHtml`을 `seunHtml` 바로 뒤에 이어붙인다.

## 테스트 / 검증 계획

- `tests/saju-calc.test.js`에 `getWolunList` 단위 테스트 추가: 알려진 연간 인덱스로 12개 항목이 정확한 순서(인묘진사오미신유술해자축)로 나오는지, 오호둔 공식이 맞는지(예: 갑기년 → 인월=병인) 검증.
- `node scripts/run-tests.js` 전체 통과 확인.
- 브라우저에서 시간 앎 케이스로 실제 사주 리딩 제출 → 월운표가 세운표 바로 아래 렌더링되는지, 이번 달에 해당하는 칸에 강조가 붙는지, 라벨("월운")이 잘 보이는지 확인.
- 시간 모름 케이스: 대운/세운표와 마찬가지로 월운표도 렌더링되지 않는지 확인(회귀 없음).

## 이번 스코프에서 제외

- 정확한 절기 경계 날짜 표시(예: "인월 2/4~3/5") — 월건명만 표시(사용자와 합의됨).
- 세운표의 다른 연도를 클릭해 그 해의 월운표로 전환하는 인터랙션 — 이번엔 올해(활성 세운 연도)만 자동 표시.
- 궁합(사주 궁합) 모드에 적용 — 별도 다음 단계.
