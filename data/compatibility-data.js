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
