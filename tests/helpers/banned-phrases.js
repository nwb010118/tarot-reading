// 결과 문구에 쓰지 않는 상투어·단정 표현 목록. 새로 쓰는 문구(원카드 타로 등)에 적용한다.
// 사건을 예언하거나 막연한 기운 이야기로 분량을 채우는 표현을 막는 것이 목적이다.
const BANNED_PHRASES = [
  '운명', '우주의 기운', '우주가', '기운이 가득', '기운이 감도', '기운을 받', '대박', '행운이 따', '행운이 찾아',
  '귀인', '액운', '하늘이', '하늘의 뜻', '기적', '반드시', '틀림없이', '무조건', '확실히', '100%', '절대로',
  '모든 것이 잘', '모든 일이 잘', '잘 풀릴 것', '크게 성공', '큰 행운', '큰 변화가 찾아', '인생이 바뀌',
  '운이 트', '운이 좋아질', '복이 들어', '재물이 들어', '부자가 될', '결혼하게 될', '헤어지게 될'
];

// 다른 낱말의 일부로 쓰이는 경우(장기적, 정기적)는 걸리지 않도록 낱말 앞 글자를 확인하는 표현
const WORD_START_ONLY = ['기적', '귀인', '대박'];

function findBannedPhrases(text) {
  return BANNED_PHRASES.filter(function (phrase) {
    if (WORD_START_ONLY.indexOf(phrase) !== -1) return new RegExp('(^|[^가-힣])' + phrase).test(text);
    return text.indexOf(phrase) !== -1;
  });
}


// 기존 대형 데이터(타로·띠·별자리·사주·궁합 본문)용 검사. 새로 쓰는 문구는 위 findBannedPhrases로 전부 막고,
// 기존 데이터에서는 안내·부정 문장에 쓰인 단정 강조어(반드시·확실히·무조건)와 카드 이름 '운명의 수레바퀴'는 허용한다.
// 사건을 보장하거나 기운을 말하는 문장(결실로 돌아옵니다, 기운이 가득한 시기 등)은 허용하지 않는다.
const SOFT_INTENSIFIERS = ['반드시', '확실히', '무조건'];
const LEGACY_NAME_OK = ['운명의 수레바퀴', '운명적인 전환점', '운명적'];

function findLegacyViolations(text) {
  const out = [];
  findBannedPhrases(text).forEach(function (phrase) {
    if (phrase === '운명') {
      if (LEGACY_NAME_OK.indexOf(text) === -1 && text.indexOf('운명적 신호로 확정하지 않습니다') === -1) out.push(phrase);
      return;
    }
    if (SOFT_INTENSIFIERS.indexOf(phrase) === -1) {
      if (phrase === '대박' && text.indexOf('대박을 기대하기보다') !== -1) return;
      out.push(phrase);
      return;
    }
    text.split(/(?<=[.!?])\s+/).forEach(function (sentence) {
      if (sentence.indexOf(phrase) === -1) return;
      const advice = /(세요|십시오)[.!]?$/.test(sentence) || /(필요합니다|좋습니다|중요합니다|편합니다|질문입니다)[.!]?$/.test(sentence);
      const negated = /(않습니다|아닙니다|아니라는|보다|말고|보장|여기지)/.test(sentence);
      if (!advice && !negated) out.push(phrase);
    });
  });
  return out;
}

module.exports = { BANNED_PHRASES, findBannedPhrases, findLegacyViolations };
