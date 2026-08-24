# 궁합(相性) 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "점집" 앱에 5번째 모드 "궁합"을 추가한다. 별자리 궁합 / 띠 궁합 / 사주 궁합 세 서브타입으로 두 사람의 정보를 입력받아 궁합 퍼센트+관계 유형+해설을 보여준다.

**Architecture:** 기존 4모드(타로/별자리/띠운세/사주)와 동일한 패턴 — `data/*.js`(정적 콘텐츠) → `js/*-calc.js`(순수 계산 로직) → `js/app.js`(DOM 바인딩/상태/조합)의 3계층 구조를 그대로 따른다. 관계 판정(삼합/육합/충, 4원소, 오행 상생상극)은 `js/compatibility-calc.js`에, 점수+해설 템플릿은 `data/compatibility-data.js`에 둔다. 새 계산 로직은 기존 `getDdiByYear`(`data/ddi-data.js`), `calculateSaju`/`getIlganByIndex`(각각 `js/saju-calc.js`, `data/saju-data.js`)를 그대로 재사용한다.

**Tech Stack:** 순수 HTML/CSS/JS(빌드 도구 없음), 브라우저 전역 스코프 공유 방식으로 스크립트 간 함수 공유, Node.js `assert` 기반 테스트(`tests/*.test.js`, 프레임워크 없이 `node tests/x.test.js`로 직접 실행).

## Global Constraints

- 빌드 도구 없이 순수 정적 파일로 동작해야 한다(GitHub Pages 배포 대상).
- 모든 신규 UI 텍스트는 한국어.
- 신규 로직 파일은 기존 파일들과 동일하게 파일 하단에 `if (typeof module !== 'undefined' && module.exports) { module.exports = {...}; }` 가드를 두어 Node 테스트에서 `require` 가능해야 한다.
- 크로스 파일 의존성(예: `compatibility-calc.js`가 `calculateSaju`, `getIlganByIndex`, `getDdiByYear`, `getStemElement`를 참조)은 브라우저에서는 `<script>` 로드 순서로 해결되는 전역 스코프 공유에 의존하고, Node 테스트에서는 테스트 파일이 `global.X = require(...).X` 형태로 먼저 주입한다 — `tests/lunar-convert.test.js`의 기존 패턴(`global.LUNAR_TABLE_DATA = require(...)`)을 그대로 따른다.
- 사주 궁합은 시간·성별을 입력받지 않는다(일간은 날짜만으로 정해짐).
- 궁합 모드에서는 `#category-select`/`#period-select`(카테고리·기간 선택)를 숨긴다.
- 띠 데이터의 키는 정확히 `monkey, rooster, dog, pig, rat, ox, tiger, rabbit, dragon, snake, horse, goat`이다(`data/ddi-data.js`에 이미 정의됨, "양"은 `goat`).
- 별자리 데이터의 키는 정확히 `aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces`이다(`data/zodiac-data.js`에 이미 정의됨).

---

## Task 1: 판정 로직 + 데이터 (`js/compatibility-calc.js`, `data/compatibility-data.js`)

**Files:**
- Modify: `js/saju-calc.js` (일간 오행 조회 헬퍼 `getStemElement` 추가 + export)
- Modify: `tests/saju-calc.test.js` (위 헬퍼 테스트 추가)
- Create: `js/compatibility-calc.js`
- Create: `data/compatibility-data.js`
- Create: `tests/compatibility-calc.test.js`

**Interfaces:**
- Consumes: `calculateSaju(input)` (`js/saju-calc.js`, 이미 존재) — `{ year, month, day, timeUnknown: true }`를 받아 `{ year, month, day, hour: null, sajuYear, monthOffset, instant }` 반환, 각 pillar는 `{ stemIdx, branchIdx }`. `getDdiByYear(year)` (`data/ddi-data.js`, 이미 존재) — `{ key, name_kr, trait, categories }` 반환. `getIlganByIndex(stemIdx)` (`data/saju-data.js`, 이미 존재) — `{ key, name_kr, element, trait, categories }` 반환.
- Produces:
  - `getZodiacCompatibility(zodiacKey1, zodiacKey2)` → tier 문자열, `'same_element' | 'complement' | 'other'` 중 하나
  - `getDdiCompatibility(year1, year2)` → tier 문자열, `'samhap' | 'yukhap' | 'chung' | 'same' | 'none'` 중 하나
  - `getSajuCompatibility(date1, date2)` (각 date는 `{ year, month, day }`) → `{ tier: 'sangsaeng' | 'bihwa' | 'sanggeuk', ilganName1, ilganName2 }` (ilganName은 `getIlganByIndex(...).name_kr`, 예: `'갑목'`)
  - `getCompatTierInfo(tier, labelA, labelB)` (`data/compatibility-data.js`) → `{ score, tierLabel, text }` — 위 세 함수가 반환하는 tier 문자열은 전부 유일하므로(총 11개, 서로 겹치지 않음) subtype 구분 없이 tier 하나로 바로 조회 가능
  - `getStemElement(stemIdx)` (`js/saju-calc.js`) → 오행 문자열(`'목'|'화'|'토'|'금'|'수'`)

- [ ] **Step 1: `js/saju-calc.js`에 `getStemElement` 추가**

`js/saju-calc.js`의 `getElementCounts` 함수 바로 위(146번째 줄, `const CHEONGAN_ELEMENT = ...` 다음 줄)에 추가:

```javascript
function getStemElement(stemIdx) {
  return CHEONGAN_ELEMENT[stemIdx];
}
```

그리고 파일 맨 아래 `module.exports = { ... }` 목록에 `getStemElement`를 추가(`getDaeunList` 뒤에 이어서):

```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay, CHEONGAN, JIJI, getYearPillar, getMonthOffset, getMonthPillar, findIpchun, toJDN, getDayPillarIndex, getHourBranchIndex, getHourStemIndex, kstDateToInstant, getSajuYear, calculateSaju, getElementCounts, classifyElementBalance, getDaeunDirection, getDaeunStartAge, getDaeunList, getStemElement };
}
```

- [ ] **Step 2: `tests/saju-calc.test.js`에 `getStemElement` 테스트 추가**

파일 상단 `require` 구조분해에 `getStemElement` 추가:

```javascript
const {
  solarLongitude,
  findSolarTermMoment,
  normalizeMod,
  CHEONGAN,
  JIJI,
  getYearPillar,
  getMonthOffset,
  getMonthPillar,
  findIpchun,
  toJDN,
  getDayPillarIndex,
  getHourBranchIndex,
  getHourStemIndex,
  kstDateToInstant,
  getSajuYear,
  calculateSaju,
  getElementCounts,
  classifyElementBalance,
  getDaeunDirection,
  getDaeunStartAge,
  getDaeunList,
  getStemElement
} = require('../js/saju-calc.js');
```

파일 끝에 추가:

```javascript
// getStemElement: 천간 인덱스 -> 오행
assert.strictEqual(getStemElement(0), '목'); // 갑
assert.strictEqual(getStemElement(2), '화'); // 병
assert.strictEqual(getStemElement(4), '토'); // 무
assert.strictEqual(getStemElement(6), '금'); // 경
assert.strictEqual(getStemElement(8), '수'); // 임

console.log('All getStemElement tests passed');
```

- [ ] **Step 3: 회귀 확인 — `saju-calc.test.js`가 여전히 통과하는지 실행**

Run: `node tests/saju-calc.test.js`
Expected: 에러 없이 여러 `console.log('...passed')` 출력, 종료 코드 0

- [ ] **Step 4: `data/compatibility-data.js` 작성 (점수+해설 템플릿, 아직 로직 없음)**

```javascript
const COMPAT_TIER_DATA = {
  same_element: {
    score: 90,
    label: '동일원소 — 최고의 궁합',
    text: '{a}와(과) {b}는 같은 원소라 마음이 잘 통하는 궁합이에요. 비슷한 방식으로 세상을 바라보니 대화가 잘 통합니다.'
  },
  complement: {
    score: 82,
    label: '보완원소 — 좋은 궁합',
    text: '{a}와(과) {b}는 서로 다른 매력으로 보완하는 궁합이에요. 부족한 부분을 채워주며 좋은 시너지를 냅니다.'
  },
  other: {
    score: 60,
    label: '그 외 조합 — 무난한 궁합',
    text: '{a}와(과) {b}는 서로 다른 속도로 움직이는 편이라 이해하려는 노력이 필요한 궁합이에요.'
  },
  samhap: {
    score: 96,
    label: '삼합 — 최고의 궁합',
    text: '{a}와(과) {b}는 삼합으로 묶이는 환상의 궁합이에요. 서로를 자연스럽게 이끌어주는 사이입니다.'
  },
  yukhap: {
    score: 86,
    label: '육합 — 좋은 궁합',
    text: '{a}와(과) {b}는 육합으로 묶이는 좋은 궁합이에요. 함께 있으면 편안하고 안정적인 관계를 만듭니다.'
  },
  same: {
    score: 74,
    label: '동일 띠 — 친근한 궁합',
    text: '{a}와(과) {b}는 같은 띠라 서로를 잘 이해하는 친근한 궁합이에요. 다만 비슷한 단점도 함께 보일 수 있습니다.'
  },
  none: {
    score: 62,
    label: '무관계 — 무난한 궁합',
    text: '{a}와(과) {b}는 특별한 상충 관계가 없는 무난한 궁합이에요. 서로 노력하는 만큼 좋은 관계로 발전할 수 있습니다.'
  },
  chung: {
    score: 35,
    label: '충 — 주의가 필요한 궁합',
    text: '{a}와(과) {b}는 충 관계라 서로 부딪히기 쉬운 궁합이에요. 배려와 양보가 관계의 열쇠가 됩니다.'
  },
  sangsaeng: {
    score: 85,
    label: '상생 — 좋은 궁합',
    text: '{a}와(과) {b}는 오행이 상생하는 좋은 궁합이에요. 서로에게 힘이 되어주는 관계입니다.'
  },
  bihwa: {
    score: 70,
    label: '비화 — 무난한 궁합',
    text: '{a}와(과) {b}는 같은 오행이라 닮은 점이 많은 궁합이에요. 편안하지만 가끔은 자극이 필요할 수 있습니다.'
  },
  sanggeuk: {
    score: 45,
    label: '상극 — 주의가 필요한 궁합',
    text: '{a}와(과) {b}는 오행이 상극이라 부딪히기 쉬운 궁합이에요. 서로 다른 방식을 이해하려는 노력이 필요합니다.'
  }
};

function getCompatTierInfo(tier, labelA, labelB) {
  const data = COMPAT_TIER_DATA[tier];
  return {
    score: data.score,
    tierLabel: data.label,
    text: data.text.replace('{a}', labelA).replace('{b}', labelB)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COMPAT_TIER_DATA, getCompatTierInfo };
}
```

- [ ] **Step 5: `tests/compatibility-calc.test.js` 작성 (실패하는 테스트 먼저)**

아직 `js/compatibility-calc.js`가 없으므로 이 테스트는 지금 실행하면 `require` 단계에서 실패한다.

```javascript
global.getDdiByYear = require('../data/ddi-data.js').getDdiByYear;
const sajuCalc = require('../js/saju-calc.js');
global.calculateSaju = sajuCalc.calculateSaju;
global.getStemElement = sajuCalc.getStemElement;
global.getIlganByIndex = require('../data/saju-data.js').getIlganByIndex;

const assert = require('assert');
const { getZodiacCompatibility, getDdiCompatibility, getSajuCompatibility } = require('../js/compatibility-calc.js');

// --- 별자리 궁합: 4원소 그룹 스팟 체크 ---
assert.strictEqual(getZodiacCompatibility('aries', 'leo'), 'same_element'); // 불-불
assert.strictEqual(getZodiacCompatibility('taurus', 'virgo'), 'same_element'); // 땅-땅
assert.strictEqual(getZodiacCompatibility('aries', 'gemini'), 'complement'); // 불-공기
assert.strictEqual(getZodiacCompatibility('taurus', 'cancer'), 'complement'); // 땅-물
assert.strictEqual(getZodiacCompatibility('aries', 'taurus'), 'other'); // 불-땅
assert.strictEqual(getZodiacCompatibility('gemini', 'scorpio'), 'other'); // 공기-물

// --- 별자리 궁합: 12x12 전체 조합이 세 tier 중 하나로 빠짐없이 분류되는지 ---
const ZODIAC_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const VALID_ZODIAC_TIERS = ['same_element', 'complement', 'other'];
ZODIAC_KEYS.forEach(function (k1) {
  ZODIAC_KEYS.forEach(function (k2) {
    const tier = getZodiacCompatibility(k1, k2);
    assert.ok(VALID_ZODIAC_TIERS.indexOf(tier) !== -1, k1 + '-' + k2 + ' got invalid tier: ' + tier);
  });
});

console.log('All zodiac compatibility tests passed');

// --- 띠 궁합: 삼합/육합/충/동일/무관계 스팟 체크 ---
assert.strictEqual(getDdiCompatibility(1998, 2002), 'samhap'); // 1998=호랑이(2), 2002=말(6) -> 인오술 삼합
assert.strictEqual(getDdiCompatibility(1996, 1997), 'yukhap'); // 1996=쥐(4), 1997=소(5) -> 자축 육합
assert.strictEqual(getDdiCompatibility(1996, 2002), 'chung'); // 1996=쥐(4), 2002=말(6) -> 자오 충
assert.strictEqual(getDdiCompatibility(1996, 2008), 'same'); // 둘 다 쥐띠
assert.strictEqual(getDdiCompatibility(1996, 1999), 'none'); // 쥐-토끼, 위 관계 어디에도 해당 없음

// --- 띠 궁합: 12x12 전체 조합이 다섯 tier 중 하나로 빠짐없이 분류되는지 ---
const DDI_YEARS = [1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007]; // 쥐~돼지 순서(연속 12년)
const VALID_DDI_TIERS = ['samhap', 'yukhap', 'chung', 'same', 'none'];
DDI_YEARS.forEach(function (y1) {
  DDI_YEARS.forEach(function (y2) {
    const tier = getDdiCompatibility(y1, y2);
    assert.ok(VALID_DDI_TIERS.indexOf(tier) !== -1, y1 + '-' + y2 + ' got invalid tier: ' + tier);
  });
});

console.log('All ddi compatibility tests passed');

// --- 사주 궁합: 연속된 날짜의 일간 오행 관계로 상생/비화/상극 검증 ---
// 2026-08-20의 일간은 병(화, stemIdx=2, 짝수) — 브라우저 실사용 검증 및 saju-calc.test.js에서 이미 확인됨.
// 60갑자는 하루에 1씩 순환하므로 연속된 날짜의 일간 stemIdx도 1씩 증가한다.
const day20 = { year: 2026, month: 8, day: 20 }; // 병(화)
const day21 = { year: 2026, month: 8, day: 21 }; // 정(화) - day20과 같은 원소
const day22 = { year: 2026, month: 8, day: 22 }; // 무(토) - day21과 상생(화생토)
const day24 = { year: 2026, month: 8, day: 24 }; // 경(금) - day20과 상극(화극금)

assert.strictEqual(getSajuCompatibility(day20, day21).tier, 'bihwa');
assert.strictEqual(getSajuCompatibility(day21, day22).tier, 'sangsaeng');
assert.strictEqual(getSajuCompatibility(day20, day24).tier, 'sanggeuk');

const day20Result = getSajuCompatibility(day20, day21);
assert.strictEqual(day20Result.ilganName1, '병화');
assert.strictEqual(day20Result.ilganName2, '정화');

console.log('All saju compatibility tests passed');
```

- [ ] **Step 6: 테스트가 실패하는지 확인**

Run: `node tests/compatibility-calc.test.js`
Expected: `Cannot find module '../js/compatibility-calc.js'` 에러로 FAIL

- [ ] **Step 7: `js/compatibility-calc.js` 구현**

```javascript
const ZODIAC_ELEMENT_GROUPS = {
  fire: ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  air: ['gemini', 'libra', 'aquarius'],
  water: ['cancer', 'scorpio', 'pisces']
};
const ZODIAC_COMPLEMENT_PAIRS = [['fire', 'air'], ['earth', 'water']];

function getZodiacElementGroup(zodiacKey) {
  return Object.keys(ZODIAC_ELEMENT_GROUPS).find(function (group) {
    return ZODIAC_ELEMENT_GROUPS[group].indexOf(zodiacKey) !== -1;
  });
}

function getZodiacCompatibility(zodiacKey1, zodiacKey2) {
  const g1 = getZodiacElementGroup(zodiacKey1);
  const g2 = getZodiacElementGroup(zodiacKey2);
  if (g1 === g2) return 'same_element';
  const isComplement = ZODIAC_COMPLEMENT_PAIRS.some(function (pair) {
    return (pair[0] === g1 && pair[1] === g2) || (pair[0] === g2 && pair[1] === g1);
  });
  return isComplement ? 'complement' : 'other';
}

const DDI_SAMHAP_GROUPS = [
  ['tiger', 'horse', 'dog'],
  ['monkey', 'rat', 'dragon'],
  ['snake', 'rooster', 'ox'],
  ['pig', 'rabbit', 'goat']
];
const DDI_YUKHAP_PAIRS = [
  ['rat', 'ox'], ['tiger', 'pig'], ['rabbit', 'dog'], ['dragon', 'rooster'], ['snake', 'monkey'], ['horse', 'goat']
];
const DDI_CHUNG_PAIRS = [
  ['rat', 'horse'], ['ox', 'goat'], ['tiger', 'monkey'], ['rabbit', 'rooster'], ['dragon', 'dog'], ['snake', 'pig']
];

function isPairInList(key1, key2, pairs) {
  return pairs.some(function (pair) {
    return (pair[0] === key1 && pair[1] === key2) || (pair[0] === key2 && pair[1] === key1);
  });
}

function getDdiCompatibility(year1, year2) {
  const key1 = getDdiByYear(year1).key;
  const key2 = getDdiByYear(year2).key;
  const inSamhap = DDI_SAMHAP_GROUPS.some(function (group) {
    return group.indexOf(key1) !== -1 && group.indexOf(key2) !== -1;
  });
  if (inSamhap) return 'samhap';
  if (isPairInList(key1, key2, DDI_YUKHAP_PAIRS)) return 'yukhap';
  if (isPairInList(key1, key2, DDI_CHUNG_PAIRS)) return 'chung';
  if (key1 === key2) return 'same';
  return 'none';
}

const OHAENG_CYCLE = ['목', '화', '토', '금', '수'];

function getSajuElementTier(element1, element2) {
  if (element1 === element2) return 'bihwa';
  const idx1 = OHAENG_CYCLE.indexOf(element1);
  const idx2 = OHAENG_CYCLE.indexOf(element2);
  const isAdjacent = idx2 === (idx1 + 1) % 5 || idx1 === (idx2 + 1) % 5;
  return isAdjacent ? 'sangsaeng' : 'sanggeuk';
}

function getSajuCompatibility(date1, date2) {
  const saju1 = calculateSaju({ year: date1.year, month: date1.month, day: date1.day, timeUnknown: true });
  const saju2 = calculateSaju({ year: date2.year, month: date2.month, day: date2.day, timeUnknown: true });
  const element1 = getStemElement(saju1.day.stemIdx);
  const element2 = getStemElement(saju2.day.stemIdx);
  return {
    tier: getSajuElementTier(element1, element2),
    ilganName1: getIlganByIndex(saju1.day.stemIdx).name_kr,
    ilganName2: getIlganByIndex(saju2.day.stemIdx).name_kr
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getZodiacCompatibility, getDdiCompatibility, getSajuCompatibility };
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `node tests/compatibility-calc.test.js`
Expected: `All zodiac compatibility tests passed`, `All ddi compatibility tests passed`, `All saju compatibility tests passed` 모두 출력, 에러 없이 종료

- [ ] **Step 9: 전체 회귀 테스트 실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 모두 통과, 에러 없음

- [ ] **Step 10: Commit**

```bash
git add js/saju-calc.js tests/saju-calc.test.js js/compatibility-calc.js data/compatibility-data.js tests/compatibility-calc.test.js
git commit -m "feat(compatibility): add compatibility judgment engine and content data"
```

---

## Task 2: UI 마크업 (`index.html`)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1의 `js/compatibility-calc.js`, `data/compatibility-data.js` (스크립트 태그로 로드만 함, 이 태스크에서는 아직 사용하지 않음)
- Produces: 이 태스크가 만드는 모든 DOM id/class는 Task 3(`app.js`)이 그대로 참조한다 —
  - 모드 버튼: `[data-mode="compatibility"]`
  - 컨테이너: `#compatibility-select`, `#compat-error`
  - 서브타입: `#compat-subtype-select .compat-subtype-btn`(각 `data-compat-subtype="zodiac"|"ddi"|"saju"`)
  - 별자리: `#compat-zodiac-group`, `.compat-zodiac1-btn`/`.compat-zodiac2-btn`(각 `data-zodiac="..."`)
  - 띠: `#compat-ddi-group`, `#compat-ddi-year1-input`, `#compat-ddi-year2-input`
  - 사주: `#compat-saju-group`, `#compat-calendar-type-select .compat-calendar-type-btn`(각 `data-calendar-type="solar"|"lunar"`), `#compat-saju-date1-solar-group`/`#compat-saju-date1-lunar-group`/`#compat-saju-date2-solar-group`/`#compat-saju-date2-lunar-group`, `#compat-saju-date1-input`/`#compat-saju-lunar-date1-input`/`#compat-saju-date2-input`/`#compat-saju-lunar-date2-input`, `#compat-intercalation1-checkbox`/`#compat-intercalation2-checkbox`
  - 카테고리/기간 래퍼: `#category-section`, `#period-section`(기존 `#category-select`/`#period-select`를 감싸는 새 div)

- [ ] **Step 1: 모드 버튼에 "궁합" 추가**

`index.html`의 `#mode-select` 블록(17~20번째 줄)을 찾아서:

```html
    <div id="mode-select">
      <button type="button" class="category-btn mode-btn selected" data-mode="tarot">타로</button>
      <button type="button" class="category-btn mode-btn" data-mode="zodiac">별자리</button>
      <button type="button" class="category-btn mode-btn" data-mode="ddi">띠운세</button>
      <button type="button" class="category-btn mode-btn" data-mode="saju">사주</button>
    </div>
```

다음으로 교체:

```html
    <div id="mode-select">
      <button type="button" class="category-btn mode-btn selected" data-mode="tarot">타로</button>
      <button type="button" class="category-btn mode-btn" data-mode="zodiac">별자리</button>
      <button type="button" class="category-btn mode-btn" data-mode="ddi">띠운세</button>
      <button type="button" class="category-btn mode-btn" data-mode="saju">사주</button>
      <button type="button" class="category-btn mode-btn" data-mode="compatibility">궁합</button>
    </div>
```

- [ ] **Step 2: `#saju-select` 블록 뒤에 `#compatibility-select` 블록 추가**

`#saju-select` 블록을 닫는 `</div>`(78번째 줄, `<p id="saju-error" class="hidden"></p>` 다음의 `</div>`) 바로 뒤, `<label>어떤 운이 궁금하신가요?</label>` 앞에 다음 블록을 삽입:

```html
    <div id="compatibility-select" class="hidden">
      <label>궁합 종류를 선택하세요</label>
      <div id="compat-subtype-select" class="button-grid">
        <button type="button" class="category-btn compat-subtype-btn selected" data-compat-subtype="zodiac">별자리 궁합</button>
        <button type="button" class="category-btn compat-subtype-btn" data-compat-subtype="ddi">띠 궁합</button>
        <button type="button" class="category-btn compat-subtype-btn" data-compat-subtype="saju">사주 궁합</button>
      </div>

      <div id="compat-zodiac-group" class="compat-person-group">
        <div class="compat-person-col">
          <label>사람 1 별자리</label>
          <div class="button-grid">
            <button type="button" class="category-btn compat-zodiac1-btn selected" data-zodiac="aries">양자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="taurus">황소자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="gemini">쌍둥이자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="cancer">게자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="leo">사자자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="virgo">처녀자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="libra">천칭자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="scorpio">전갈자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="sagittarius">사수자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="capricorn">염소자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="aquarius">물병자리</button>
            <button type="button" class="category-btn compat-zodiac1-btn" data-zodiac="pisces">물고기자리</button>
          </div>
        </div>
        <div class="compat-person-col">
          <label>사람 2 별자리</label>
          <div class="button-grid">
            <button type="button" class="category-btn compat-zodiac2-btn selected" data-zodiac="aries">양자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="taurus">황소자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="gemini">쌍둥이자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="cancer">게자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="leo">사자자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="virgo">처녀자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="libra">천칭자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="scorpio">전갈자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="sagittarius">사수자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="capricorn">염소자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="aquarius">물병자리</button>
            <button type="button" class="category-btn compat-zodiac2-btn" data-zodiac="pisces">물고기자리</button>
          </div>
        </div>
      </div>

      <div id="compat-ddi-group" class="compat-person-group hidden">
        <div class="compat-person-col">
          <label for="compat-ddi-year1-input">사람 1 태어난 연도</label>
          <input type="number" id="compat-ddi-year1-input" placeholder="예: 1995" min="1900" max="2100">
        </div>
        <div class="compat-person-col">
          <label for="compat-ddi-year2-input">사람 2 태어난 연도</label>
          <input type="number" id="compat-ddi-year2-input" placeholder="예: 1997" min="1900" max="2100">
        </div>
      </div>

      <div id="compat-saju-group" class="compat-person-group hidden">
        <div class="compat-saju-common">
          <label>양력/음력을 선택하세요</label>
          <div id="compat-calendar-type-select" class="button-grid">
            <button type="button" class="category-btn compat-calendar-type-btn selected" data-calendar-type="solar">양력</button>
            <button type="button" class="category-btn compat-calendar-type-btn" data-calendar-type="lunar">음력</button>
          </div>
        </div>
        <div class="compat-person-col">
          <label>사람 1 생년월일</label>
          <div id="compat-saju-date1-solar-group">
            <input type="date" id="compat-saju-date1-input" min="1900-01-01" max="2050-12-31">
          </div>
          <div id="compat-saju-date1-lunar-group" class="hidden">
            <input type="text" id="compat-saju-lunar-date1-input" inputmode="numeric" placeholder="예: 1990-02-30">
            <label><input type="checkbox" id="compat-intercalation1-checkbox"> 윤달이에요</label>
          </div>
        </div>
        <div class="compat-person-col">
          <label>사람 2 생년월일</label>
          <div id="compat-saju-date2-solar-group">
            <input type="date" id="compat-saju-date2-input" min="1900-01-01" max="2050-12-31">
          </div>
          <div id="compat-saju-date2-lunar-group" class="hidden">
            <input type="text" id="compat-saju-lunar-date2-input" inputmode="numeric" placeholder="예: 1992-08-15">
            <label><input type="checkbox" id="compat-intercalation2-checkbox"> 윤달이에요</label>
          </div>
        </div>
      </div>

      <p id="compat-error" class="hidden"></p>
    </div>

```

- [ ] **Step 3: `#category-select`/`#period-select`를 감싸는 래퍼 div 추가**

기존:

```html
    <label>어떤 운이 궁금하신가요?</label>
    <div id="category-select">
      <button type="button" class="category-btn selected" data-category="">오늘의운</button>
      <button type="button" class="category-btn" data-category="love">연애운</button>
      <button type="button" class="category-btn" data-category="money">재물운</button>
      <button type="button" class="category-btn" data-category="career">취업운</button>
      <button type="button" class="category-btn" data-category="workplace">직장운</button>
      <button type="button" class="category-btn" data-category="business">사업운</button>
      <button type="button" class="category-btn" data-category="study">학업운</button>
      <button type="button" class="category-btn" data-category="health">건강운</button>
      <button type="button" class="category-btn" data-category="relationships">대인관계운</button>
      <button type="button" class="category-btn" data-category="honor">명예운</button>
      <button type="button" class="category-btn" data-category="moving">이사운</button>
      <button type="button" class="category-btn" data-category="children">자식운</button>
    </div>

    <label>어느 기간이 궁금하신가요?</label>
    <div id="period-select">
      <button type="button" class="category-btn selected" data-period="today">오늘</button>
      <button type="button" class="category-btn" data-period="week">이번주</button>
      <button type="button" class="category-btn" data-period="month">이번달</button>
      <button type="button" class="category-btn" data-period="month3">3개월</button>
      <button type="button" class="category-btn" data-period="month6">6개월</button>
      <button type="button" class="category-btn" data-period="year">1년</button>
    </div>
```

다음으로 교체(내용은 그대로, 래퍼 div만 추가):

```html
    <div id="category-section">
      <label>어떤 운이 궁금하신가요?</label>
      <div id="category-select">
        <button type="button" class="category-btn selected" data-category="">오늘의운</button>
        <button type="button" class="category-btn" data-category="love">연애운</button>
        <button type="button" class="category-btn" data-category="money">재물운</button>
        <button type="button" class="category-btn" data-category="career">취업운</button>
        <button type="button" class="category-btn" data-category="workplace">직장운</button>
        <button type="button" class="category-btn" data-category="business">사업운</button>
        <button type="button" class="category-btn" data-category="study">학업운</button>
        <button type="button" class="category-btn" data-category="health">건강운</button>
        <button type="button" class="category-btn" data-category="relationships">대인관계운</button>
        <button type="button" class="category-btn" data-category="honor">명예운</button>
        <button type="button" class="category-btn" data-category="moving">이사운</button>
        <button type="button" class="category-btn" data-category="children">자식운</button>
      </div>
    </div>

    <div id="period-section">
      <label>어느 기간이 궁금하신가요?</label>
      <div id="period-select">
        <button type="button" class="category-btn selected" data-period="today">오늘</button>
        <button type="button" class="category-btn" data-period="week">이번주</button>
        <button type="button" class="category-btn" data-period="month">이번달</button>
        <button type="button" class="category-btn" data-period="month3">3개월</button>
        <button type="button" class="category-btn" data-period="month6">6개월</button>
        <button type="button" class="category-btn" data-period="year">1년</button>
      </div>
    </div>
```

- [ ] **Step 4: 스크립트 태그 추가**

기존:

```html
<script src="data/tarot-data.js"></script>
<script src="data/zodiac-data.js"></script>
<script src="data/ddi-data.js"></script>
<script src="data/lunar-table.js"></script>
<script src="data/saju-data.js"></script>
<script src="js/deck-logic.js"></script>
<script src="js/history-store.js"></script>
<script src="js/lunar-convert.js"></script>
<script src="js/saju-calc.js"></script>
<script src="js/app.js"></script>
```

다음으로 교체:

```html
<script src="data/tarot-data.js"></script>
<script src="data/zodiac-data.js"></script>
<script src="data/ddi-data.js"></script>
<script src="data/lunar-table.js"></script>
<script src="data/saju-data.js"></script>
<script src="data/compatibility-data.js"></script>
<script src="js/deck-logic.js"></script>
<script src="js/history-store.js"></script>
<script src="js/lunar-convert.js"></script>
<script src="js/saju-calc.js"></script>
<script src="js/compatibility-calc.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 5: 브라우저 콘솔에서 문법 오류 없는지 확인**

Run: `node -e "require('fs').readFileSync('index.html','utf8')" ` (파일이 정상적으로 읽히는지만 확인하는 최소 체크) 및 `node --check js/compatibility-calc.js`(Task1에서 이미 존재), `node --check data/compatibility-data.js`
Expected: 에러 없음. (index.html 자체의 완전한 검증은 Task 5의 브라우저 확인에서 수행)

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(compatibility): add compatibility mode UI markup"
```

---

## Task 3: `js/app.js` 통합

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1의 `getZodiacCompatibility`, `getDdiCompatibility`, `getSajuCompatibility`, `getCompatTierInfo`; Task 2의 모든 DOM id/class; 기존 `getZodiacByKey`, `getDdiByYear`, `lunarToSolar`, `escapeHtml`, `saveReading`, `getHistory`
- Produces: 없음(최상위 통합 레이어)

- [ ] **Step 1: 라벨 맵과 상태 변수 추가**

`js/app.js`의 `const MODE_BUTTON_LABELS = ...`(40번째 줄) 바로 뒤에 추가:

```javascript
  const COMPAT_SUBTYPE_LABELS = { zodiac: '별자리 궁합', ddi: '띠 궁합', saju: '사주 궁합' };
```

`MODE_BUTTON_LABELS` 정의를 다음으로 교체:

```javascript
  const MODE_BUTTON_LABELS = { tarot: '카드 뽑기', zodiac: '운세 보기', ddi: '운세 보기', saju: '운세 보기', compatibility: '궁합 보기' };
```

`let selectedTimeUnknown = false;`(55번째 줄) 바로 뒤에 상태 변수 추가:

```javascript
  let selectedCompatSubtype = 'zodiac';
  let selectedCompatZodiac1 = 'aries';
  let selectedCompatZodiac2 = 'aries';
  let selectedCompatCalendarType = 'solar';
```

- [ ] **Step 2: DOM 참조 추가**

`const sajuErrorEl = document.getElementById('saju-error');`(77번째 줄) 바로 뒤에 추가:

```javascript
  const compatibilitySelect = document.getElementById('compatibility-select');
  const categorySection = document.getElementById('category-section');
  const periodSection = document.getElementById('period-section');
  const compatSubtypeButtons = document.querySelectorAll('#compat-subtype-select .compat-subtype-btn');
  const compatZodiacGroup = document.getElementById('compat-zodiac-group');
  const compatZodiac1Buttons = document.querySelectorAll('.compat-zodiac1-btn');
  const compatZodiac2Buttons = document.querySelectorAll('.compat-zodiac2-btn');
  const compatDdiGroup = document.getElementById('compat-ddi-group');
  const compatDdiYear1Input = document.getElementById('compat-ddi-year1-input');
  const compatDdiYear2Input = document.getElementById('compat-ddi-year2-input');
  const compatSajuGroup = document.getElementById('compat-saju-group');
  const compatCalendarTypeButtons = document.querySelectorAll('#compat-calendar-type-select .compat-calendar-type-btn');
  const compatSajuDate1SolarGroup = document.getElementById('compat-saju-date1-solar-group');
  const compatSajuDate1LunarGroup = document.getElementById('compat-saju-date1-lunar-group');
  const compatSajuDate2SolarGroup = document.getElementById('compat-saju-date2-solar-group');
  const compatSajuDate2LunarGroup = document.getElementById('compat-saju-date2-lunar-group');
  const compatSajuDate1Input = document.getElementById('compat-saju-date1-input');
  const compatSajuLunarDate1Input = document.getElementById('compat-saju-lunar-date1-input');
  const compatSajuDate2Input = document.getElementById('compat-saju-date2-input');
  const compatSajuLunarDate2Input = document.getElementById('compat-saju-lunar-date2-input');
  const compatIntercalation1Checkbox = document.getElementById('compat-intercalation1-checkbox');
  const compatIntercalation2Checkbox = document.getElementById('compat-intercalation2-checkbox');
  const compatErrorEl = document.getElementById('compat-error');
```

- [ ] **Step 3: 모드 전환 핸들러 확장**

`modeButtons.forEach(...)` 블록(92~103번째 줄)을:

```javascript
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedMode = btn.dataset.mode;
      zodiacSelect.classList.toggle('hidden', selectedMode !== 'zodiac');
      ddiSelect.classList.toggle('hidden', selectedMode !== 'ddi');
      sajuSelect.classList.toggle('hidden', selectedMode !== 'saju');
      spreadSelect.classList.toggle('hidden', selectedMode !== 'tarot');
      drawButton.textContent = MODE_BUTTON_LABELS[selectedMode];
    });
  });
```

다음으로 교체:

```javascript
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedMode = btn.dataset.mode;
      zodiacSelect.classList.toggle('hidden', selectedMode !== 'zodiac');
      ddiSelect.classList.toggle('hidden', selectedMode !== 'ddi');
      sajuSelect.classList.toggle('hidden', selectedMode !== 'saju');
      compatibilitySelect.classList.toggle('hidden', selectedMode !== 'compatibility');
      spreadSelect.classList.toggle('hidden', selectedMode !== 'tarot');
      categorySection.classList.toggle('hidden', selectedMode === 'compatibility');
      periodSection.classList.toggle('hidden', selectedMode === 'compatibility');
      drawButton.textContent = MODE_BUTTON_LABELS[selectedMode];
    });
  });
```

- [ ] **Step 4: 궁합 서브타입/입력 핸들러 추가**

`genderButtons.forEach(...)` 블록(154~160번째 줄) 바로 뒤에 추가:

```javascript
  compatSubtypeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatSubtypeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatSubtype = btn.dataset.compatSubtype;
      compatZodiacGroup.classList.toggle('hidden', selectedCompatSubtype !== 'zodiac');
      compatDdiGroup.classList.toggle('hidden', selectedCompatSubtype !== 'ddi');
      compatSajuGroup.classList.toggle('hidden', selectedCompatSubtype !== 'saju');
      compatErrorEl.classList.add('hidden');
    });
  });

  compatZodiac1Buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatZodiac1Buttons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatZodiac1 = btn.dataset.zodiac;
    });
  });

  compatZodiac2Buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatZodiac2Buttons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatZodiac2 = btn.dataset.zodiac;
    });
  });

  compatCalendarTypeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatCalendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatCalendarType = btn.dataset.calendarType;
      compatSajuDate1SolarGroup.classList.toggle('hidden', selectedCompatCalendarType === 'lunar');
      compatSajuDate1LunarGroup.classList.toggle('hidden', selectedCompatCalendarType !== 'lunar');
      compatSajuDate2SolarGroup.classList.toggle('hidden', selectedCompatCalendarType === 'lunar');
      compatSajuDate2LunarGroup.classList.toggle('hidden', selectedCompatCalendarType !== 'lunar');
    });
  });
```

- [ ] **Step 5: 궁합 입력 검증 함수 추가**

`resolveSajuInput` 함수(307~371번째 줄) 바로 뒤에 추가:

```javascript
  function resolveCompatDdiInput() {
    compatErrorEl.classList.add('hidden');
    const year1 = Number(compatDdiYear1Input.value);
    const year2 = Number(compatDdiYear2Input.value);
    if (!compatDdiYear1Input.value || !year1 || year1 < 1900 || year1 > 2100) {
      compatErrorEl.textContent = '사람 1의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    if (!compatDdiYear2Input.value || !year2 || year2 < 1900 || year2 > 2100) {
      compatErrorEl.textContent = '사람 2의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    return { year1: year1, year2: year2 };
  }

  // 궁합 사주 날짜 한 사람분을 검증. 실패 시 null을 반환하고 compatErrorEl에 에러를 표시.
  function resolveCompatSajuDate(dateInput, lunarDateInput, intercalation, personLabel) {
    const activeInput = selectedCompatCalendarType === 'lunar' ? lunarDateInput : dateInput;

    if (!activeInput.value) {
      compatErrorEl.textContent = personLabel + '의 생년월일을 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCompatCalendarType === 'lunar' && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(activeInput.value.trim())) {
      compatErrorEl.textContent = personLabel + '의 음력 생년월일은 YYYY-MM-DD 형식으로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    const dateParts = activeInput.value.trim().split('-').map(Number);
    let year = dateParts[0];
    let month = dateParts[1];
    let day = dateParts[2];

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || year < 1900 || year > 2050) {
      compatErrorEl.textContent = personLabel + '은(는) 1900년~2050년 사이의 생년월일만 지원합니다.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCompatCalendarType === 'lunar') {
      const solar = lunarToSolar(year, month, day, intercalation);
      if (!solar) {
        compatErrorEl.textContent = personLabel + '의 음력 날짜를 양력으로 변환할 수 없습니다. 날짜를 다시 확인해주세요.';
        compatErrorEl.classList.remove('hidden');
        return null;
      }
      year = solar.year;
      month = solar.month;
      day = solar.day;

      if (year < 1900 || year > 2050) {
        compatErrorEl.textContent = personLabel + '은(는) 1900년~2050년 사이의 생년월일만 지원합니다.';
        compatErrorEl.classList.remove('hidden');
        return null;
      }
    }

    return { year: year, month: month, day: day };
  }

  function resolveCompatSajuInput() {
    compatErrorEl.classList.add('hidden');
    const date1 = resolveCompatSajuDate(compatSajuDate1Input, compatSajuLunarDate1Input, compatIntercalation1Checkbox.checked, '사람 1');
    if (!date1) return null;
    const date2 = resolveCompatSajuDate(compatSajuDate2Input, compatSajuLunarDate2Input, compatIntercalation2Checkbox.checked, '사람 2');
    if (!date2) return null;
    return { date1: date1, date2: date2 };
  }
```

- [ ] **Step 6: 결과 표시/저장 함수 추가**

`saveSajuReading` 함수(430~446번째 줄) 바로 뒤에 추가:

```javascript
  function showCompatibilitySummary(label1, label2, tierInfo) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail"><p>' + tierInfo.text + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }

  function saveCompatibilityReading(subtype, label1, label2, tierInfo) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'compatibility',
      subtype: subtype,
      person1Label: label1,
      person2Label: label2,
      tierLabel: tierInfo.tierLabel,
      score: tierInfo.score,
      cards: []
    };
    saveReading(storage, entry);
  }
```

- [ ] **Step 7: "궁합 보기" 클릭 분기 추가**

`drawButton.addEventListener('click', function () { ... })` 안에서 `if (selectedMode === 'saju') { ... return; }` 블록(223~233번째 줄) 바로 뒤에 추가:

```javascript
    if (selectedMode === 'compatibility') {
      let label1, label2, tier;
      if (selectedCompatSubtype === 'zodiac') {
        label1 = getZodiacByKey(selectedCompatZodiac1).name_kr;
        label2 = getZodiacByKey(selectedCompatZodiac2).name_kr;
        tier = getZodiacCompatibility(selectedCompatZodiac1, selectedCompatZodiac2);
      } else if (selectedCompatSubtype === 'ddi') {
        const input = resolveCompatDdiInput();
        if (!input) return;
        label1 = input.year1 + '년생 ' + getDdiByYear(input.year1).name_kr;
        label2 = input.year2 + '년생 ' + getDdiByYear(input.year2).name_kr;
        tier = getDdiCompatibility(input.year1, input.year2);
      } else {
        const input = resolveCompatSajuInput();
        if (!input) return;
        const sajuResult = getSajuCompatibility(input.date1, input.date2);
        label1 = sajuResult.ilganName1 + ' 일간';
        label2 = sajuResult.ilganName2 + ' 일간';
        tier = sajuResult.tier;
      }
      const tierInfo = getCompatTierInfo(tier, label1, label2);
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showCompatibilitySummary(label1, label2, tierInfo);
      saveCompatibilityReading(selectedCompatSubtype, label1, label2, tierInfo);
      return;
    }

```

- [ ] **Step 8: 히스토리 렌더링 분기 추가**

`renderHistory` 함수 안, `else if (entry.mode === 'saju')` 블록(613~614번째 줄) 바로 뒤에 추가:

```javascript
      } else if (entry.mode === 'compatibility') {
        cardsText = escapeHtml(entry.person1Label + ' × ' + entry.person2Label + ' · ' + entry.score + '%');
```

그리고 `const topicText = escapeHtml(periodLabel + ' ' + categoryLabel);`(623번째 줄)를:

```javascript
      const topicText = entry.mode === 'compatibility'
        ? escapeHtml(COMPAT_SUBTYPE_LABELS[entry.subtype] + ' · ' + entry.tierLabel)
        : escapeHtml(periodLabel + ' ' + categoryLabel);
```

로 교체.

- [ ] **Step 9: "새 리딩 시작" 리셋 로직에 궁합 필드 추가**

`newReadingButton.addEventListener('click', function () { ... })` 블록의 마지막 줄 `sajuErrorEl.classList.add('hidden');`(564번째 줄) 바로 뒤, 블록을 닫는 `});` 앞에 추가:

```javascript
    compatSubtypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    compatSubtypeButtons[0].classList.add('selected');
    selectedCompatSubtype = 'zodiac';
    compatZodiacGroup.classList.remove('hidden');
    compatDdiGroup.classList.add('hidden');
    compatSajuGroup.classList.add('hidden');
    compatZodiac1Buttons.forEach(function (b) { b.classList.remove('selected'); });
    compatZodiac1Buttons[0].classList.add('selected');
    selectedCompatZodiac1 = 'aries';
    compatZodiac2Buttons.forEach(function (b) { b.classList.remove('selected'); });
    compatZodiac2Buttons[0].classList.add('selected');
    selectedCompatZodiac2 = 'aries';
    compatDdiYear1Input.value = '';
    compatDdiYear2Input.value = '';
    compatCalendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    compatCalendarTypeButtons[0].classList.add('selected');
    selectedCompatCalendarType = 'solar';
    compatSajuDate1SolarGroup.classList.remove('hidden');
    compatSajuDate1LunarGroup.classList.add('hidden');
    compatSajuDate2SolarGroup.classList.remove('hidden');
    compatSajuDate2LunarGroup.classList.add('hidden');
    compatSajuDate1Input.value = '';
    compatSajuLunarDate1Input.value = '';
    compatSajuDate2Input.value = '';
    compatSajuLunarDate2Input.value = '';
    compatIntercalation1Checkbox.checked = false;
    compatIntercalation2Checkbox.checked = false;
    compatErrorEl.classList.add('hidden');
```

- [ ] **Step 10: Node 문법 체크**

Run: `node --check js/app.js`
Expected: 에러 없음(0 exit code)

- [ ] **Step 11: Commit**

```bash
git add js/app.js
git commit -m "feat(compatibility): wire compatibility mode into app.js"
```

---

## Task 4: 스타일링 (`css/style.css`)

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: Task 2가 만든 class/id (`.compat-person-group`, `.compat-person-col`, `.compat-saju-common`, `.compat-score`, `.compat-tier-label`, `#compat-error`, `#compat-ddi-year1-input` 등)
- Produces: 없음(순수 스타일)

- [ ] **Step 1: 버튼그리드 레이아웃 규칙에 궁합 서브타입/달력 토글 추가**

기존:

```css
#category-select, #period-select, #mode-select, #zodiac-select .button-grid {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
}
```

다음으로 교체:

```css
#category-select, #period-select, #mode-select, #zodiac-select .button-grid,
#compat-subtype-select, #compat-zodiac-group .button-grid, #compat-calendar-type-select {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
}
```

- [ ] **Step 2: 궁합 입력 필드/레이아웃/결과 스타일 추가**

파일 맨 끝(`.element-summary { ... }` 다음)에 추가:

```css
#compat-ddi-year1-input, #compat-ddi-year2-input,
#compat-saju-date1-input, #compat-saju-lunar-date1-input,
#compat-saju-date2-input, #compat-saju-lunar-date2-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #4a3a68;
  background: #1a1330;
  color: #f0e6c8;
  margin-bottom: 8px;
  font-size: 15px;
}

.compat-person-group { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.compat-person-col { flex: 1 1 240px; min-width: 0; }
.compat-saju-common { flex-basis: 100%; }

.compat-person-col label:has(input[type="checkbox"]) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

#compat-error { color: #e08080; font-size: 13px; margin: -4px 0 12px; }

.compat-score { text-align: center; font-size: 32px; font-weight: bold; color: #d4af37; margin: 12px 0 4px; }
.compat-tier-label { text-align: center; color: #c9bde0; font-size: 14px; margin: 0 0 12px; }

@media (max-width: 480px) {
  .compat-person-group { flex-direction: column; }
}
```

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style(compatibility): style compatibility person inputs and result card"
```

---

## Task 5: 브라우저 확인 + 전체 회귀

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~4의 전체 결과물
- Produces: 없음

- [ ] **Step 1: 전체 자동 테스트 재실행**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 전부 통과

- [ ] **Step 2: 로컬 서버로 브라우저에서 궁합 3서브타입 모두 클릭 확인**

`.claude/launch.json`의 `static-preview`(이미 존재, `python -m http.server 8080`) 로 프리뷰를 열고:
1. 상단 "궁합" 모드 클릭 → 하위 "별자리 궁합"이 기본 선택되어 있고 사람1/사람2 버튼그리드가 보이는지 확인
2. 사람1=양자리, 사람2=사자자리 선택 후 "궁합 보기" 클릭 → "양자리 × 사자자리 궁합", 90%, "동일원소 — 최고의 궁합" 문구가 뜨는지 확인
3. "새 리딩 시작" → "띠 궁합" 서브타입으로 전환 → 연도 1998/2002 입력 후 "궁합 보기" 클릭 → 96%, "삼합 — 최고의 궁합" 확인
4. "새 리딩 시작" → "사주 궁합" 서브타입으로 전환 → 사람1 2026-08-20, 사람2 2026-08-21(양력) 입력 후 "궁합 보기" 클릭 → "병화 일간 × 정화 일간 궁합", 70%, "비화 — 무난한 궁합" 확인
5. 카테고리/기간 선택 UI가 궁합 모드에서는 보이지 않는지 확인
6. "지난 기록" 열어서 방금 저장된 3개의 궁합 기록이 "OO × OO · N%" 형태로 표시되는지 확인
7. 콘솔에 에러가 없는지 확인 (`read_console_messages` 또는 브라우저 개발자도구)

Expected: 위 7가지 모두 기대한 대로 동작, 콘솔 에러 없음

- [ ] **Step 3: 문제 발견 시 수정 후 재확인, 문제 없으면 완료 보고**

이 태스크는 코드 변경이 없으므로 별도 커밋 없음(Step 2에서 버그를 발견해 수정한 경우에만 해당 파일을 수정하고 `fix(compatibility): ...` 커밋 추가).
