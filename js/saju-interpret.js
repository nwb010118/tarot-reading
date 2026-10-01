// 사주 해석 문구를 고르기 위한 계산: 오행 분포, 십성 묶음 분포, 태어난 달과 일간의 관계, 올해 세운과 일간의 관계.
// 계산은 여기서 하고 문장은 data/saju-sections.js에서 고른다. 브라우저에서는 saju-calc.js의 전역 함수를 쓴다.
const SAJU_ELEMENTS = ['목', '화', '토', '금', '수'];
// 일간 오행에서 대상 오행까지 오행 순환(목화토금수)으로 간 거리 0~4가 곧 십성 묶음이다.
const SAJU_GROUP_ORDER = ['bigeop', 'siksang', 'jaeseong', 'gwanseong', 'inseong'];
const SAJU_SIPSIN_GROUP = {
  비견: 'bigeop', 겁재: 'bigeop', 식신: 'siksang', 상관: 'siksang', 편재: 'jaeseong', 정재: 'jaeseong',
  편관: 'gwanseong', 정관: 'gwanseong', 편인: 'inseong', 정인: 'inseong'
};
const SAJU_STEM_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const SAJU_BRANCH_ELEMENT = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

function sajuElementDistanceGroup(dayElement, otherElement) {
  const diff = (SAJU_ELEMENTS.indexOf(otherElement) - SAJU_ELEMENTS.indexOf(dayElement) + 5) % 5;
  return SAJU_GROUP_ORDER[diff];
}

// saju: calculateSaju 결과(year, month, day, 선택적 hour 기둥). sipsinFn, jijangganFn, balanceFn은 saju-calc.js의 함수.
// yearStemIdx: 올해 세운의 천간 인덱스(없으면 올해 관계는 계산하지 않는다).
// currentBranchIdx: 오늘이 속한 달의 지지 인덱스(없으면 지금 계절은 계산하지 않는다).
function interpretSaju(saju, counts, helpers, yearStemIdx, currentBranchIdx) {
  const dayStem = saju.day.stemIdx;
  const dayElement = SAJU_STEM_ELEMENT[dayStem];

  const monthElement = SAJU_BRANCH_ELEMENT[saju.month.branchIdx];
  const seasonRelation = sajuElementDistanceGroup(dayElement, monthElement);

  // 십성 묶음 분포: 일간을 뺀 천간과 각 지지의 본기 지장간
  const groupCounts = { bigeop: 0, siksang: 0, jaeseong: 0, gwanseong: 0, inseong: 0 };
  const pillars = [saju.year, saju.month, saju.day].concat(saju.hour ? [saju.hour] : []);
  pillars.forEach(function (p) {
    if (p !== saju.day) groupCounts[SAJU_SIPSIN_GROUP[helpers.getSipsin(dayStem, p.stemIdx)]] += 1;
    groupCounts[SAJU_SIPSIN_GROUP[helpers.getSipsin(dayStem, helpers.getJijanggan(p.branchIdx))]] += 1;
  });
  let dominantGroup = SAJU_GROUP_ORDER[0];
  SAJU_GROUP_ORDER.forEach(function (g) { if (groupCounts[g] > groupCounts[dominantGroup]) dominantGroup = g; });

  // 가장 많은 오행(같으면 목화토금수 순서가 앞선 것)
  let strongElement = SAJU_ELEMENTS[0];
  SAJU_ELEMENTS.forEach(function (el) { if (counts[el] > counts[strongElement]) strongElement = el; });

  const balance = helpers.classifyElementBalance(counts);
  let remedyElement = null;
  let healthElement = dayElement;
  if (balance.state === 'deficient') {
    remedyElement = balance.element;
    healthElement = balance.element;
  } else if (balance.state === 'excess') {
    // 강한 오행이 쏟아 내는 다음 오행을 보태 흐름을 풀어 준다
    remedyElement = SAJU_ELEMENTS[(SAJU_ELEMENTS.indexOf(balance.element) + 1) % 5];
    healthElement = balance.element;
  }

  const yearGroup = (typeof yearStemIdx === 'number')
    ? SAJU_SIPSIN_GROUP[helpers.getSipsin(dayStem, yearStemIdx)]
    : null;

  return {
    dayElement: dayElement,
    monthElement: monthElement,
    seasonRelation: seasonRelation,
    groupCounts: groupCounts,
    dominantGroup: dominantGroup,
    balance: balance,
    remedyElement: remedyElement,
    healthElement: healthElement,
    strongElement: strongElement,
    currentMonthElement: (typeof currentBranchIdx === 'number') ? SAJU_BRANCH_ELEMENT[currentBranchIdx] : null,
    yearGroup: yearGroup
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { interpretSaju, sajuElementDistanceGroup, SAJU_ELEMENTS, SAJU_GROUP_ORDER, SAJU_SIPSIN_GROUP };
}
