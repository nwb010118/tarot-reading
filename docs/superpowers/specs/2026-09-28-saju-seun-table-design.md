# 사주 세운(10년 연운표) 설계

## 배경 / 목표

[사주 명식 상세표(원국표) 설계](./2026-09-28-saju-myeongsik-detail-table-design.md)에서 명시적으로 다음 단계로 미뤘던 항목 중 하나. 현재 사주 리딩 결과 화면(`js/app.js`의 `showSajuSummary()`)은 대운표(9개, 각 10년 구간의 간지+나이)만 보여준다. 이번 작업은 그중 **현재 나이가 속한 대운 10년 구간**을 연도 단위로 쪼갠 "세운표"를 대운표 바로 아래에 추가한다.

## 현재 상태

- `js/saju-calc.js`: `getYearPillar(sajuYear)`(연도 → 간지, 공식: `stemIdx = (sajuYear-4) mod 10`, `branchIdx = (sajuYear-4) mod 12`), `getDaeunDirection`/`getDaeunStartAge`/`getDaeunList`(대운 9구간 계산)까지 존재. 연도별(세운) 계산 함수는 없음.
- `js/app.js` `showSajuSummary()`: `daeunHtml`은 `saju.hour`가 있을 때만(시간 앎) 계산되어, `getDaeunDirection` → `getDaeunStartAge` → `getDaeunList`로 9개 구간을 얻고, `today.getFullYear() - input.year + 1`로 세는나이를 구해 `isCurrent`로 활성 구간에 `.current` 클래스를 붙인다. 이 로직은 app.js의 719~733번째 줄 부근에 있다.
- `css/style.css`: `.daeun-table`(3열 그리드), `.daeun-col`(박스), `.daeun-col.current`(금색 강조), `.daeun-ganji`, `.daeun-age` 클래스 존재(style.css의 227~248번째 줄 부근).
- 대운표/명식표 모두 섹션 라벨(제목) 없이 바로 표만 렌더링됨.

## 새로 계산할 것 (`js/saju-calc.js`에 순수 함수로 추가)

### `getSeunList(startYear, count)`

```
for i in 0..count-1:
  year = startYear + i
  pillar = getYearPillar(year)   // 기존 함수 그대로 재사용
  결과에 { year, stemIdx: pillar.stemIdx, branchIdx: pillar.branchIdx } 추가
```

- "OOOO년 세운"은 관행상 그 해 입춘부터 다음 해 입춘 전까지를 가리키며, 이는 `getYearPillar(캘린더연도)` 공식과 정확히 일치한다(생년월일처럼 입춘 이전 보정이 필요한 것은 "출생 연도" 판정뿐이며, 미래 연도를 단순 나열하는 세운표에는 해당 사항 없음).
- 나이는 이 함수에 포함하지 않는다. 렌더링 단(`app.js`)에서 `year - input.year + 1`(세는나이)로 계산해 대운표와 동일한 방식을 따른다.
- `module.exports`에 `getSeunList` 추가.

## UI / 렌더링 (`js/app.js`)

`showSajuSummary()`의 기존 `if (saju.hour) { ... daeunHtml = ... }` 블록 내부를 확장한다:

1. 기존 로직대로 `daeunList`, `currentAge`를 계산한 뒤, `daeunList.find(d => currentAge >= d.startAge && currentAge <= d.endAge)`로 활성 대운 구간(`activeDaeun`)을 찾는다. 없으면(이론상 발생하지 않지만 방어적으로) 세운표는 생략한다.
2. `activeDaeun`이 있으면 `startYear = input.year + activeDaeun.startAge - 1`, `getSeunList(startYear, 10)`을 호출해 `seunList`를 얻는다.
3. `seunHtml`을 아래와 동일한 구조로 만든다(대운표와 같은 수준, 오행 색상 없음):

```html
<div class="seun-table">
  <div class="seun-col[ current]">
    <span class="seun-ganji">병오</span>
    <span class="seun-age">2026년 · 32세</span>
  </div>
  ... (10개)
</div>
```

- `isCurrent` 판정: `연도 === 올해 서기 연도`(`new Date().getFullYear()`).
- 간지 텍스트는 기존 `pillarText()` 헬퍼 재사용.
- CSS는 `.daeun-table`/`.daeun-col`/`.daeun-col.current`/`.daeun-ganji`/`.daeun-age`를 그대로 복제해 `.seun-table`/`.seun-col`/`.seun-col.current`/`.seun-ganji`/`.seun-age`로 추가한다(그리드 컬럼 수는 10개 박스에 맞게 조정 가능, 기존 3열 그리드를 그대로 써도 무방).

**섹션 라벨 추가(소급 적용)**: 대운표와 세운표가 나란히 있으면 구분이 안 되므로, 두 표 위에 각각 작은 라벨을 추가한다.

```html
<p class="table-label">대운</p>
<div class="daeun-table">...</div>
<p class="table-label">세운</p>
<div class="seun-table">...</div>
```

`.table-label`은 새 CSS 클래스(작은 글씨, 은은한 색상 — 기존 `.element-summary`류와 톤 맞춤).

`summaryEl.innerHTML` 조립부(`myeongsikHtml + elementHtml + daeunHtml + extraHtml`)에 `seunHtml`을 `daeunHtml` 뒤에 이어붙인다.

## 테스트 / 검증 계획

- `tests/saju-calc.test.js`에 `getSeunList` 단위 테스트 추가: 알려진 연도의 간지로 검증(예: 1984=갑자, 2024=갑진, 2026=병오), `count`만큼 배열 길이 반환, 연속된 연도인지 확인.
- `node scripts/run-tests.js` 전체 통과 확인.
- 브라우저에서 시간 앎 케이스로 실제 사주 리딩 제출 → 세운표가 대운표 바로 아래 렌더링되는지, 활성 대운 구간과 세운표 시작 연도가 일치하는지(예: 활성 대운이 30~39세면 세운표 첫 칸이 출생연도+29), 올해 칸에 `.current` 강조가 붙는지, 라벨("대운"/"세운")이 잘 보이는지 확인.
- 시간 모름 케이스: 대운표와 마찬가지로 세운표도 렌더링되지 않는지 확인(회귀 없음).

## 이번 스코프에서 제외

- 대운 박스를 클릭해 다른 구간의 세운표로 전환하는 인터랙션 — 이번엔 활성 구간만 자동 표시.
- 세운표에 십성/12운성/납음 등 추가 정보 — 대운표와 동일한 간지+나이 수준 유지.
- 월운(12개월표) — 별도 다음 단계.
- 궁합(사주 궁합) 모드에 적용 — 별도 다음 단계.
