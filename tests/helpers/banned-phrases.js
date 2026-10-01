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

module.exports = { BANNED_PHRASES, findBannedPhrases };
