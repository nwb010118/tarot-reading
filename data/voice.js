// 점집 주인의 목소리: 결과 화면의 도입·마무리 문구. 차분한 존댓말, 짧은 문장, 단정하지 않는 톤.
const VOICE = {
  tarot: [
    '카드를 펼쳐 봤어요.',
    '뽑힌 카드를 차분히 읽어 볼게요.',
    '이 카드들이 건네는 이야기를 들어 봐요.',
    '카드 앞에서 잠시 숨을 고르고 읽어 볼게요.'
  ],
  zodiac: [
    '오늘의 별자리 이야기를 꺼내 볼게요.',
    '별자리가 지닌 결을 함께 읽어 봐요.',
    '이 별자리의 기질부터 살펴볼게요.',
    '하늘의 이야기를 조용히 옮겨 볼게요.'
  ],
  ddi: [
    '이 띠가 지닌 결을 차분히 읽어 볼게요.',
    '이 띠에 깃든 기질을 펼쳐 볼게요.',
    '열두 띠 중 이 띠의 흐름을 살펴볼게요.',
    '타고난 기질부터 천천히 읽어 봐요.'
  ],
  saju: [
    '명식을 한 칸씩 짚어 볼게요.',
    '네 기둥이 그리는 모양을 읽어 볼게요.',
    '타고난 결을 천천히 살펴봐요.',
    '오행의 균형부터 함께 봐요.'
  ],
  compat: [
    '두 사람의 결을 나란히 놓아 볼게요.',
    '서로의 기질이 만나는 자리를 살펴봐요.',
    '두 사람 사이의 흐름을 읽어 볼게요.',
    '닮은 점과 다른 점을 차분히 짚어 볼게요.'
  ],
  daily: [
    '오늘 하루 곁에 둘 카드예요.',
    '오늘의 한 장을 건네 드려요.',
    '하루를 시작하며 이 카드를 떠올려 보세요.',
    '오늘 마음에 걸어 둘 한 장이에요.'
  ],
  outro: [
    '오늘은 이만큼만 가져가세요.',
    '마음에 남는 한 줄이면 충분해요.',
    '읽은 내용은 참고만 하고 선택은 직접 하세요.',
    '작게 한 걸음만 내딛어 보세요.',
    '다음에도 편하게 들러 주세요.'
  ],
  outroHealth: [
    '몸의 신호는 카드가 아니라 전문가와 확인해 주세요.',
    '오늘은 몸과 마음을 쉬게 하는 데 집중해 보세요.',
    '불편이 계속되면 혼자 견디지 말고 도움을 구하세요.'
  ],
  outroInvest: [
    '결정은 카드가 아니라 확인된 자료로 내려 주세요.',
    '감당할 수 있는 범위를 먼저 정해 두세요.',
    '기대와 사실을 나눠 적어 보고 판단하세요.'
  ]
};

function getVoiceLine(kind, rng) {
  const lines = VOICE[kind];
  return lines[Math.floor(rng() * lines.length)];
}

// 건강, 투자 주제는 reading-guidance.js의 getSensitiveReading과 같은 조건으로 전용 마무리를 쓴다.
function getOutroKind(category, subchoice) {
  if (category === 'health') return 'outroHealth';
  if (category === 'money' && subchoice === 'invest') return 'outroInvest';
  return 'outro';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VOICE, getVoiceLine, getOutroKind };
}
