// 궁합 최종 점수: 유형별 기본 점수에 추가 관계의 가감점을 더한다. DOM·전역에 의존하지 않는다.
const ZODIAC_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const ZODIAC_GAP_RULES = {
  0: { delta: 0, label: '같은 별자리' },
  1: { delta: -8, label: '별자리 간격 1칸 (서로 낯선 사이)' },
  2: { delta: 3, label: '별자리 간격 2칸 (서로 돕는 사이)' },
  3: { delta: -6, label: '별자리 간격 3칸 (부딪히기 쉬운 사이)' },
  4: { delta: 4, label: '별자리 간격 4칸 (결이 통하는 사이)' },
  5: { delta: -6, label: '별자리 간격 5칸 (맞추는 노력이 필요한 사이)' },
  6: { delta: 0, label: '별자리 간격 6칸 (정반대라 끌리고 부딪히는 사이)' }
};

const DDI_HAE_PAIRS = [['rat', 'goat'], ['ox', 'horse'], ['tiger', 'snake'], ['rabbit', 'dragon'], ['monkey', 'pig'], ['rooster', 'dog']];
const DDI_WONJIN_PAIRS = [['rat', 'goat'], ['ox', 'horse'], ['tiger', 'rooster'], ['rabbit', 'monkey'], ['dragon', 'pig'], ['snake', 'dog']];

const STEM_NAMES = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCH_NAMES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const SCORE_MIN = 20;
const SCORE_MAX = 99;

function inPairs(a, b, pairs) {
  return pairs.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); });
}

function finishScore(base, factors) {
  const total = factors.reduce(function (sum, f) { return sum + f.delta; }, base);
  return { base: base, factors: factors, score: Math.max(SCORE_MIN, Math.min(SCORE_MAX, total)) };
}

function scoreZodiac(key1, key2, base) {
  const diff = Math.abs(ZODIAC_ORDER.indexOf(key1) - ZODIAC_ORDER.indexOf(key2));
  const gap = Math.min(diff, 12 - diff);
  const rule = ZODIAC_GAP_RULES[gap];
  return finishScore(base, rule.delta ? [{ label: rule.label, delta: rule.delta }] : []);
}

function scoreDdi(key1, key2, base) {
  const factors = [];
  if (inPairs(key1, key2, DDI_WONJIN_PAIRS)) factors.push({ label: '원진 관계 (이유 없이 서로 서운해지기 쉬움)', delta: -8 });
  else if (inPairs(key1, key2, DDI_HAE_PAIRS)) factors.push({ label: '육해 관계 (오해가 쌓이기 쉬움)', delta: -6 });
  return finishScore(base, factors);
}

// 천간합: 갑기, 을경, 병신, 정임, 무계. 지지: 육합(합 1), 삼합(같은 묶음), 충(6칸 차이), 해(합 7).
function scoreSaju(saju1, saju2, base) {
  const factors = [];
  const s1 = saju1.day.stemIdx;
  const s2 = saju2.day.stemIdx;
  if (Math.abs(s1 - s2) === 5) {
    factors.push({ label: '일간 천간합 (' + STEM_NAMES[Math.min(s1, s2)] + '↔' + STEM_NAMES[Math.max(s1, s2)] + ')', delta: 10 });
  }
  const b1 = saju1.day.branchIdx;
  const b2 = saju2.day.branchIdx;
  const name = BRANCH_NAMES[b1] + '·' + BRANCH_NAMES[b2];
  if ((b1 + b2) % 12 === 1) factors.push({ label: '일지 육합 (' + name + ')', delta: 8 });
  else if (b1 !== b2 && (b1 - b2 + 12) % 4 === 0) factors.push({ label: '일지 삼합 (' + name + ')', delta: 5 });
  else if (Math.abs(b1 - b2) === 6) factors.push({ label: '일지 충 (' + name + ')', delta: -10 });
  else if ((b1 + b2) % 12 === 7) factors.push({ label: '일지 해 (' + name + ')', delta: -5 });
  return finishScore(base, factors);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreZodiac, scoreDdi, scoreSaju, ZODIAC_ORDER, SCORE_MIN, SCORE_MAX };
}
