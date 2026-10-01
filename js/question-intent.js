// 규칙 기반 질문 해석: 외부 AI 없이 키워드 점수로 주제·하위선택·실천 기간·질문 형태를 고른다.
const INTENT_CATEGORIES = {
  love: {
    words: ['연애', '사랑', '남자친구', '여자친구', '남친', '여친', '짝사랑', '썸', '고백', '이별', '헤어', '재회', '결혼', '소개팅', '애인', '전남친', '전여친', '좋아하는', '커플', '미팅', '인연'],
    sub: {
      solo: ['솔로', '짝사랑', '썸', '소개팅', '고백', '미팅', '인연'],
      couple: ['남자친구', '여자친구', '남친', '여친', '애인', '커플', '결혼', '이별', '헤어', '재회', '사귀']
    }
  },
  money: {
    words: ['돈', '재물', '월급', '저축', '투자', '주식', '코인', '비트코인', '부동산', '대출', '빚', '수입', '연봉', '소비', '지출', '쇼핑', '로또', '적금', '펀드', '부수입'],
    sub: {
      invest: ['투자', '주식', '코인', '비트코인', '부동산', '펀드', '로또'],
      consumption: ['소비', '지출', '쇼핑', '사도', '구매', '저축', '적금'],
      income: ['수입', '월급', '연봉', '부수입', '알바', '벌']
    }
  },
  career: {
    words: ['취업', '취직', '구직', '면접', '이력서', '자소서', '이직', '퇴사', '합격', '공채', '인턴', '입사'],
    sub: {
      jobseek: ['취업', '취직', '구직', '면접', '이력서', '자소서', '합격', '공채', '인턴', '입사'],
      switch: ['이직', '퇴사', '옮기', '옮길']
    }
  },
  workplace: {
    words: ['직장', '회사', '상사', '동료', '팀장', '승진', '업무', '야근', '부장', '팀원', '후배', '프로젝트', '평가'],
    sub: {
      team: ['팀', '동료', '상사', '팀장', '협업', '후배', '부장'],
      personal: ['승진', '성과', '평가', '업무', '야근']
    }
  },
  business: {
    words: ['사업', '창업', '가게', '장사', '매출', '자영업', '오픈', '점포', '쇼핑몰', '스타트업', '프랜차이즈', '운영'],
    sub: {
      startup: ['창업', '오픈', '차리', '준비', '스타트업'],
      running: ['운영', '매출', '장사', '자영업', '손님']
    }
  },
  study: {
    words: ['시험', '공부', '학업', '수능', '입시', '자격증', '성적', '대학', '편입', '고시', '진로', '전공', '대학원', '유학', '합격'],
    sub: {
      exam: ['시험', '수능', '자격증', '성적', '입시', '고시', '합격'],
      path: ['진로', '전공', '대학원', '유학', '편입', '적성']
    }
  },
  health: {
    words: ['건강', '아프', '병원', '다이어트', '운동', '수술', '불면', '우울', '스트레스', '불안', '멘탈', '체력', '번아웃', '몸이', '몸을'],
    sub: {
      body: ['건강', '아프', '병원', '다이어트', '운동', '수술', '체력', '몸'],
      mind: ['우울', '스트레스', '불안', '멘탈', '불면', '번아웃', '마음']
    }
  },
  relationships: {
    words: ['친구', '인간관계', '대인관계', '지인', '모임', '동창', '가족', '부모', '형제', '이웃', '절교'],
    sub: {
      new: ['새로운', '처음', '사귀', '새 친구'],
      existing: ['오래된', '친구', '가족', '부모', '형제', '갈등', '절교', '동창']
    }
  },
  honor: { words: ['명예', '평판', '인정', '소문', '수상', '인지도', '유명'], sub: {} },
  moving: { words: ['이사', '이주', '입주', '전세', '월세', '이전', '새집', '집을', '집이'], sub: {} },
  children: { words: ['아이', '자녀', '아들', '딸', '육아', '임신', '출산', '자식', '태교'], sub: {} }
};

const INTENT_PERIODS = [
  { key: 'year', words: ['올해', '내년', '1년', '일년', '연말', '한 해'] },
  { key: 'month6', words: ['6개월', '여섯 달', '반년', '상반기', '하반기'] },
  { key: 'month3', words: ['3개월', '세 달', '석 달', '분기'] },
  { key: 'month', words: ['이번 달', '이번달', '다음 달', '다음달', '한 달'] },
  { key: 'week', words: ['이번 주', '이번주', '다음 주', '다음주', '주말', '일주일'] },
  { key: 'today', words: ['오늘', '내일', '지금'] }
];

const INTENT_SAFETY_WORDS = ['자살', '죽고싶', '죽어버리', '죽을까', '극단적선택', '극단적인선택', '목숨을끊', '스스로목숨', '자해', '사라지고싶', '살기싫', '살고싶지않'];
const INTENT_THIRD_PARTY = ['그사람', '그가', '그녀', '걔', '쟤', '상대', '남자친구', '여자친구', '남친', '여친', '애인', '썸', '짝사랑', '그분', '전남친', '전여친'];
const INTENT_HEART_PATTERNS = ['속마음', '나를좋아', '날좋아', '나를생각', '날생각', '나를어떻게', '날어떻게', '나한테마음', '나한테관심', '내게마음', '내게관심', '마음이', '마음은'];

const QUESTION_FRAME_LINES = {
  decision: '예와 아니오로 답하기보다, 카드가 비추는 조건을 함께 읽어 볼게요.',
  timing: '언제인지 맞히기보다, 지금 준비할 수 있는 일을 읽어 볼게요.',
  heart: '다른 사람의 속마음은 카드로 단정할 수 없어요. 내가 할 수 있는 태도를 중심으로 읽어 볼게요.',
  general: '적어 주신 질문을 곁에 두고 카드를 읽어 볼게요.'
};

const QUESTION_SAFETY_MESSAGE = '많이 힘드셨군요. 지금은 카드를 뽑기보다 마음을 들어줄 사람과 먼저 이야기해 보세요. 자살예방 상담전화 109(24시간)에서 언제든 이야기를 나눌 수 있어요. 위급하다면 112나 119에 바로 연락해 주세요.';

function compactText(text) {
  return String(text).replace(/\s+/g, '');
}

function countHits(compact, words) {
  return words.reduce(function (sum, word) {
    return compact.indexOf(compactText(word)) !== -1 ? sum + 1 : sum;
  }, 0);
}

function pickTop(scores) {
  const keys = Object.keys(scores).filter(function (k) { return scores[k] > 0; });
  if (!keys.length) return null;
  keys.sort(function (a, b) { return scores[b] - scores[a]; });
  if (keys.length > 1 && scores[keys[0]] === scores[keys[1]]) return null;
  return keys[0];
}

function classifyQuestion(text) {
  const raw = String(text || '').trim();
  const compact = compactText(raw);
  const result = { category: null, subchoice: null, period: null, form: 'general', safety: false };
  if (!compact) return result;

  result.safety = INTENT_SAFETY_WORDS.some(function (w) { return compact.indexOf(w) !== -1; });

  const catScores = {};
  Object.keys(INTENT_CATEGORIES).forEach(function (key) {
    catScores[key] = countHits(compact, INTENT_CATEGORIES[key].words);
  });
  result.category = pickTop(catScores);

  if (result.category) {
    const subs = INTENT_CATEGORIES[result.category].sub;
    const subScores = {};
    Object.keys(subs).forEach(function (key) { subScores[key] = countHits(compact, subs[key]); });
    result.subchoice = pickTop(subScores);
  }

  for (let i = 0; i < INTENT_PERIODS.length; i += 1) {
    if (countHits(compact, INTENT_PERIODS[i].words) > 0) {
      result.period = INTENT_PERIODS[i].key;
      break;
    }
  }

  const aboutThem = countHits(compact, INTENT_THIRD_PARTY) > 0 && countHits(compact, INTENT_HEART_PATTERNS) > 0;
  if (aboutThem) result.form = 'heart';
  else if (/언제|몇월|시기|때가/.test(compact)) result.form = 'timing';
  else if (/할까|될까|갈까|말까|해야|좋을까|괜찮을까|맞을까|아니면|vs/.test(compact)) result.form = 'decision';
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { classifyQuestion, QUESTION_FRAME_LINES, QUESTION_SAFETY_MESSAGE, INTENT_CATEGORIES };
}
