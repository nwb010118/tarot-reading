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
