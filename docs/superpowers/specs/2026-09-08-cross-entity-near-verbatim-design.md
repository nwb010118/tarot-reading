# 엔티티 간 완전동일/근접축자 소급 추가 — 설계

## 목표

`tests/ddi-data.test.js`와 `tests/zodiac-data.test.js`에 **엔티티 간(cross-entity) 완전동일 검사**와 **엔티티 간 근접축자(LCS≥20) 검사**를 신규로 추가하고, `tests/saju-data.test.js`에는 **엔티티 간 근접축자**만 신규로 추가한다(saju는 엔티티 간 완전동일이 이미 axis5로 존재). [[project-ddi-random-reading]] 후속과제 2번.

## 배경

2026-09-05 세션에서 사용자가 수작업으로 ddi 2건을 먼저 발견해 요청 → ddi/zodiac/saju 세 데이터 전체에 "엔티티 간 완전동일 + 엔티티 간 LCS≥20 근접축자 + 같은 엔티티 내 비금지쌍 LCS≥20"을 임시 스크립트로 스윕해 그 시점의 위반(ddi 1건, zodiac 1건, saju 4건)을 찾아 수정했다. 하지만 이 스윕은 **1회성 임시 스크립트**였고, 영구 회귀 테스트로는 남지 않았다. 그 결과:

- **ddi/zodiac**: 엔티티 간 완전동일 축도, 근접축자 축도 **영구 테스트 파일에 전혀 없음**(확인 완료 — 두 파일 다 within-field 자기중복/advice 자기중복/advice echo/금지쌍/조합 문법 검증까지만 있고 그 이상의 cross-entity 축이 없음).
- **saju**: 엔티티 간 완전동일은 axis5로 이미 존재하지만, axis6("같은 일간 내 비금지쌍 근접축자")는 이름 그대로 **같은 엔티티 내부**로 스코프가 한정돼 있어 엔티티 간 근접축자는 여전히 커버되지 않음.
- **궁합/타로**: 둘 다 이미 axis4(완전동일+근접축자, 티어 간/카드 간)를 영구 테스트로 갖고 있음 — 이번 추가가 재사용할 정확한 레퍼런스 패턴.

이번 프로젝트 직전에 완료된 [[project-dedup-axes-extraction]]에서 `checkExactMatchCollisions`/`checkCrossPoolCollisions` 공유 함수가 이미 만들어졌으므로, 이번 작업은 **새 알고리즘이 필요 없고** 기존 공유 함수를 궁합/타로와 동일한 방식으로 호출하는 코드만 ddi/zodiac/saju 세 파일에 추가하면 된다.

## 범위

### ddi, zodiac — 신규 축 2개

1. **엔티티 간 완전동일** (saju axis5와 동일한 모양): 모든 엔티티 × 모든 필드(trait + 19개 카테고리) × a/b 슬롯 × 인덱스(0~2)를 평탄화해 `{value, where, locked: idx===0}` occurrence로 만들고 `checkExactMatchCollisions(occurrences)`에 전달.
2. **엔티티 간 근접축자**(compat axis4b/타로 AXIS4b와 동일한 모양): 엔티티 쌍(i<j, ddi/zodiac은 12개 엔티티 → 66쌍) × 20개 필드 × a/b 슬롯마다, **같은 필드·같은 슬롯**끼리만(다른 필드 간 비교는 하지 않음) `checkCrossPoolCollisions`로 LCS≥20 비교, skip은 `(x,y)=>x===0&&y===0`(양쪽 다 잠긴 원본일 때만 스킵).

두 파일 모두 신규로 필요한 것:
- `checkExactMatchCollisions`를 `./helpers/dedup-axes.js` import에 추가.
- `NEARVERBATIM_LCS_TH = 20` 상수 추가.
- `stripForEcho(s)` 로컬 함수 추가(saju/compat/타로와 동일 형태: `stripBoilerplateSuffix(s.replace(/\s+/g, '').replace(/[.,!?]/g, ''))`) — 근접축자 비교 전 정규화용. 기존에 ddi/zodiac은 echo 축이 단순 word-Jaccard만 써서 이 함수가 없었음.

### saju — 신규 축 1개

**엔티티 간 근접축자**만 추가(위 ddi/zodiac의 2번과 동일한 모양, `ILGAN_DATA` 10개 → 45쌍). 기존 axis5(엔티티 간 완전동일)와 axis6(같은 엔티티 내 근접축자)는 **손대지 않고 그대로 유지** — 새 축은 axis6 바로 뒤에 추가한다(기존 콘솔 로그 순서를 그대로 보존하기 위해 기존 블록 사이에 끼워넣지 않고 뒤에 추가). `NEARVERBATIM_LCS_TH`/`stripForEcho`는 이미 존재하므로 재사용.

## 예상 코드 (ddi 기준, zodiac/saju는 엔티티 변수명과 `allFieldsOf` 시그니처만 다름)

```js
// 엔티티 간 완전동일 (ddi/zodiac 신규)
const crossEntityOccurrences = [];
DDI_DATA.forEach(function (ddi) {
  allFieldsOf().forEach(function (pair) {
    const cat = pair[0], sub = pair[1];
    const field = cat === 'trait' ? ddi.trait : getField(ddi, cat, sub);
    const fieldLabel = cat + (sub ? '.' + sub : '');
    ['a', 'b'].forEach(function (slot) {
      field[slot].forEach(function (s, idx) {
        crossEntityOccurrences.push({ value: s, where: ddi.name_kr + ' ' + fieldLabel + '.' + slot + '[' + idx + ']', locked: idx === 0 });
      });
    });
  });
});
const crossEntityExactCollisions = checkExactMatchCollisions(crossEntityOccurrences);
assert.strictEqual(crossEntityExactCollisions.length, 0,
  'Found ' + crossEntityExactCollisions.length + ' cross-entity exact-match collisions:\n' + crossEntityExactCollisions.join('\n'));
console.log('No cross-entity exact-match collisions');

// 엔티티 간 근접축자 (ddi/zodiac/saju 신규)
const crossEntityNearVerbatim = [];
const nearVerbatimCmp = function (s1, s2) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
for (let i = 0; i < DDI_DATA.length; i++) {
  for (let j = i + 1; j < DDI_DATA.length; j++) {
    const e1 = DDI_DATA[i], e2 = DDI_DATA[j];
    allFieldsOf().forEach(function (pair) {
      const cat = pair[0], sub = pair[1];
      const field1 = cat === 'trait' ? e1.trait : getField(e1, cat, sub);
      const field2 = cat === 'trait' ? e2.trait : getField(e2, cat, sub);
      const fieldLabel = cat + (sub ? '.' + sub : '');
      ['a', 'b'].forEach(function (slot) {
        crossEntityNearVerbatim.push.apply(crossEntityNearVerbatim, checkCrossPoolCollisions(
          [{ labelA: e1.name_kr + ' ' + fieldLabel + '.' + slot, valuesA: field1[slot], labelB: e2.name_kr + ' ' + fieldLabel + '.' + slot, valuesB: field2[slot] }],
          nearVerbatimCmp, function (x, y) { return x === 0 && y === 0; }
        ));
      });
    });
  }
}
assert.strictEqual(crossEntityNearVerbatim.length, 0,
  'Found ' + crossEntityNearVerbatim.length + ' cross-entity near-verbatim collisions:\n' + crossEntityNearVerbatim.join('\n'));
console.log('No cross-entity near-verbatim collisions');
```

zodiac은 `ZODIAC_DATA`/`z`/`z.name_kr`/`allFieldsOf(z)`(인자 필요, 내부에서는 안 쓰지만 기존 관례상 넘김)로, saju는 `ILGAN_DATA`/`ilgan`/`ilgan.name_kr`/`allFieldsOf()`(인자 없음)로 치환.

## 배치 위치

- ddi/zodiac: 기존 마지막 축(조합 문법 검증, dangling-clause)의 stale-exception assert 다음, `getDdiByYear()`/`getZodiacByKey()` 회귀 확인 주석 앞에 두 축을 순서대로(완전동일 → 근접축자) 추가.
- saju: 기존 axis6(같은 엔티티 내 근접축자)의 `console.log` 다음, `조회 함수 회귀 확인` 주석 앞에 근접축자 축만 추가.

## 성공 기준

- `node scripts/run-tests.js` 10/10 통과 유지.
- ddi/zodiac/saju 3개 파일 모두 새 축의 `console.log` 성공 메시지가 출력된다.
- **사전 스캔 완료(2026-09-08, 설계 승인 직후)**: 위 예상 코드와 동일한 로직의 임시 스크립트로 ddi/zodiac/saju 전체를 스캔한 결과, zodiac/saju는 0건이었으나 **ddi에서 실제 위반 2건 발견**(원숭이띠 `relationships.new.a[1]` ↔ 쥐띠 `relationships.new.a[0]`, 원숭이띠 `relationships.existing.b[2]` ↔ 말띠 `relationships.existing.b[2]`, 둘 다 LCS=20). 사용자 확인 후 즉시 문장 재작성으로 해결(커밋 `d0af807`) — 재작성 후 재스캔 결과 3개 데이터셋 전부 0건, 기존 `node scripts/run-tests.js` 10/10도 그대로 유지됨을 확인. 따라서 이 플랜의 구현 단계는 이제 순수하게 테스트 축 추가만 하면 되며, 추가 직후 바로 통과해야 한다(사전 스캔에서 이미 0건임을 확인했으므로).
- 합성 위반(인메모리 클론 + 문자열 하나를 다른 엔티티의 문자열과 동일하게/거의 동일하게 바꾼 것)을 주입했을 때 새 축이 실제로 실패하는지 최소 1개 파일에서 검증(설계 문서 관례 — [[project-combo-grammar-check]], [[project-dedup-axes-extraction]]과 동일한 검증 방식).

## 비범위

- ddi/zodiac에 "같은 엔티티 내부, 비금지쌍" 근접축자 축(saju의 기존 axis6과 같은 것)을 추가하는 것은 이번 범위가 아니다 — 사용자에게 확인한 범위는 "엔티티 간"만이다.
- saju의 기존 axis5/axis6은 전혀 수정하지 않는다.
- 새 콘텐츠 작성이나 데이터 수정 없음 — 순수 검증 로직 추가이며, 사전 스캔에서 위반이 발견되면 그건 별도로 사용자에게 보고하고 데이터 수정 여부를 논의한다(이번 플랜의 코드 변경 범위에는 데이터 수정을 포함하지 않는다).
