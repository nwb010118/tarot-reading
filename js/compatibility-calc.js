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
  if (key1 === key2) return 'same';
  const inSamhap = DDI_SAMHAP_GROUPS.some(function (group) {
    return group.indexOf(key1) !== -1 && group.indexOf(key2) !== -1;
  });
  if (inSamhap) return 'samhap';
  if (isPairInList(key1, key2, DDI_YUKHAP_PAIRS)) return 'yukhap';
  if (isPairInList(key1, key2, DDI_CHUNG_PAIRS)) return 'chung';
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
