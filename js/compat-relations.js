// 궁합 관계 요소: 별자리 간격, 띠의 원진·육해, 사주의 일간 천간합과 일지 관계를 찾는다. 점수는 계산하지 않는다.
// 결과 문장을 고르는 근거와 근거 패널 설명으로만 쓴다. DOM·전역에 의존하지 않는다.
const ZODIAC_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const ZODIAC_GAP_LABELS = {
  0: '같은 별자리',
  1: '별자리 간격 1칸 (서로 낯선 사이)',
  2: '별자리 간격 2칸 (서로 돕는 사이)',
  3: '별자리 간격 3칸 (부딪히기 쉬운 사이)',
  4: '별자리 간격 4칸 (결이 통하는 사이)',
  5: '별자리 간격 5칸 (맞추는 노력이 필요한 사이)',
  6: '별자리 간격 6칸 (정반대라 끌리고 부딪히는 사이)'
};

const DDI_HAE_PAIRS = [['rat', 'goat'], ['ox', 'horse'], ['tiger', 'snake'], ['rabbit', 'dragon'], ['monkey', 'pig'], ['rooster', 'dog']];
const DDI_WONJIN_PAIRS = [['rat', 'goat'], ['ox', 'horse'], ['tiger', 'rooster'], ['rabbit', 'monkey'], ['dragon', 'pig'], ['snake', 'dog']];

const STEM_NAMES = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCH_NAMES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

function inPairs(a, b, pairs) {
  return pairs.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); });
}

function zodiacFactors(key1, key2) {
  const diff = Math.abs(ZODIAC_ORDER.indexOf(key1) - ZODIAC_ORDER.indexOf(key2));
  const gap = Math.min(diff, 12 - diff);
  return [{ key: 'zodiac_gap_' + gap, label: ZODIAC_GAP_LABELS[gap] }];
}

function ddiFactors(key1, key2) {
  if (inPairs(key1, key2, DDI_WONJIN_PAIRS)) return [{ key: 'ddi_wonjin', label: '원진 관계 (이유 없이 서로 서운해지기 쉬움)' }];
  if (inPairs(key1, key2, DDI_HAE_PAIRS)) return [{ key: 'ddi_hae', label: '육해 관계 (오해가 쌓이기 쉬움)' }];
  return [{ key: 'ddi_none', label: '띠의 특별한 관계 표식 없음' }];
}

// 천간합: 갑기, 을경, 병신, 정임, 무계. 지지: 육합(합 1), 삼합(같은 묶음), 충(6칸 차이), 해(합 7).
// 첫 요소는 항상 일지 관계(없으면 saju_branch_none)이고, 일간 천간합이 있으면 뒤에 붙는다.
function sajuFactors(saju1, saju2) {
  const factors = [];
  const b1 = saju1.day.branchIdx;
  const b2 = saju2.day.branchIdx;
  const name = BRANCH_NAMES[b1] + '·' + BRANCH_NAMES[b2];
  if ((b1 + b2) % 12 === 1) factors.push({ key: 'saju_branch_yukhap', label: '일지 육합 (' + name + ')' });
  else if (b1 !== b2 && (b1 - b2 + 12) % 4 === 0) factors.push({ key: 'saju_branch_samhap', label: '일지 삼합 (' + name + ')' });
  else if (Math.abs(b1 - b2) === 6) factors.push({ key: 'saju_branch_chung', label: '일지 충 (' + name + ')' });
  else if ((b1 + b2) % 12 === 7) factors.push({ key: 'saju_branch_hae', label: '일지 해 (' + name + ')' });
  else factors.push({ key: 'saju_branch_none', label: '일지 사이의 특별한 관계 없음 (' + name + ')' });
  const s1 = saju1.day.stemIdx;
  const s2 = saju2.day.stemIdx;
  if (Math.abs(s1 - s2) === 5) {
    factors.push({ key: 'saju_stem_he', label: '일간 천간합 (' + STEM_NAMES[Math.min(s1, s2)] + '↔' + STEM_NAMES[Math.max(s1, s2)] + ')' });
  }
  return factors;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { zodiacFactors, ddiFactors, sajuFactors, ZODIAC_ORDER };
}
