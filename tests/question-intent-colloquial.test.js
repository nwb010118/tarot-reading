// 구어체·돌려 말한 질문 모음. 사전을 만든 뒤에 따로 쓴 예문이라 실제 정확도에 더 가깝다.
// 분류 못 한 질문은 후보(candidates) 또는 직접 선택으로 이어져야 하므로, 틀린 주제로 확정하는 오분류를 따로 센다.
const assert = require('assert');
const { classifyQuestion } = require('../js/question-intent.js');

const CASES = [
  ['love', '썸 타는 사람이 있는데 고백 타이밍 잡아도 돼?'], ['love', '남친이랑 요즘 권태기 같아요'], ['love', '첫사랑이 다시 연락하면 어떡하죠'],
  ['love', '결혼 프로포즈 받을 수 있을까요'], ['love', '소개팅 나갔는데 애프터 올까요?'], ['love', '전남친 생각이 자꾸 나요'],
  ['money', '카드값 때문에 적자인데 괜찮을까요?'], ['money', '부업 시작하면 돈이 좀 모일까요?'], ['money', '성과급 나올까요'],
  ['money', '비트코인 지금 들어가도 되나요'], ['money', '이번 달 지출 줄일 수 있을까요'], ['money', '로또 사볼까요'],
  ['career', '이번 공고에 서류 합격할 수 있을까요?'], ['career', '최종면접 결과가 걱정돼요'], ['career', '정규직 전환될까요?'],
  ['career', '사표 낼까 말까 고민이에요'], ['career', '포트폴리오 보내도 될까요?'], ['career', '이직 오퍼를 받았는데 가야 할까요'],
  ['workplace', '팀장님이 자꾸 저만 시켜요'], ['workplace', '인사평가 잘 받을 수 있을까요'], ['workplace', '회식 자리에서 사장님이 부담스러워요'],
  ['workplace', '사수랑 맞지 않아서 출근이 싫어요'], ['workplace', '부서 이동 신청해볼까요'], ['workplace', '승급 심사가 곧이에요'],
  ['business', '매장 오픈 준비 중인데 괜찮을까요'], ['business', '스마트스토어 매출이 안 나와요'], ['business', '거래처가 자꾸 바뀌어서 걱정이에요'],
  ['business', '폐업을 고민하고 있어요'], ['business', '개업 날짜 잡아도 될까요'], ['business', '고객이 줄어드는데 어떻게 하죠'],
  ['study', '토익 점수 올릴 수 있을까요'], ['study', '공무원 시험 준비 중인데 불안해요'], ['study', '휴학하고 쉴까요'],
  ['study', '논문 마감 맞출 수 있을까요'], ['study', '기말고사 잘 볼까요'], ['study', '졸업하고 대학원 갈지 고민이에요'],
  ['health', '요즘 두통이 자주 와요'], ['health', '무기력해서 아무것도 하기 싫어요'], ['health', '검진 결과가 걱정돼요'],
  ['health', '수면 패턴을 되돌릴 수 있을까요'], ['health', '공황 증상이 있어요'], ['health', '컨디션이 계속 안 좋아요'],
  ['relationships', '친구랑 오해가 생겨서 손절할까 고민이에요'], ['relationships', '단톡방 분위기가 불편해요'], ['relationships', '선배한테 화해하자고 말해볼까요'],
  ['moving', '자취 시작하려는데 어디가 좋을까요'], ['moving', '집값이 내리면 매매할까요'], ['moving', '원룸 계약해도 될까요'],
  ['children', '사춘기 아들과 대화가 안 돼요'], ['children', '아기가 밤에 자주 깨요'], ['children', '중학생 딸 학원을 바꿀까요'],
  ['honor', '칭찬받고 싶은데 방법이 있을까요'], ['honor', '체면이 구겨져서 속상해요']
];

let correct = 0;
let wrong = 0;
let unknown = 0;
const misses = [];
CASES.forEach(function (pair) {
  const r = classifyQuestion(pair[1]);
  if (r.category === pair[0]) correct += 1;
  else if (r.category) { wrong += 1; misses.push('WRONG ' + pair[0] + ' -> ' + r.category + ': ' + pair[1]); }
  else {
    unknown += 1;
    misses.push('UNKNOWN(' + pair[0] + ', candidates=' + r.candidates.join(',') + '): ' + pair[1]);
  }
});
misses.forEach(function (m) { console.log(m); });
console.log('colloquial: correct ' + correct + ', wrong ' + wrong + ', unknown ' + unknown + ' / ' + CASES.length);

// 틀린 주제로 확정하는 일은 드물어야 하고, 대부분은 맞히거나 모른다고 해야 한다
assert.ok(wrong / CASES.length <= 0.06, 'misclassification rate ' + wrong + '/' + CASES.length);
assert.ok(correct / CASES.length >= 0.8, 'accuracy ' + correct + '/' + CASES.length);

// 키워드가 전혀 없는 돌려 말한 질문: 맞히지 못해도 괜찮지만 틀린 주제로 확정하면 안 된다
const INDIRECT = [
  '요즘 아무것도 손에 안 잡혀요', '그냥 다 막막한 기분이에요', '이 길이 맞는지 모르겠어요', '새로운 시작을 해도 괜찮을까요',
  '오늘 하루 조심할 게 있을까요', '마음이 자꾸 흔들려요', '지금 놓치고 있는 게 있을까요', '앞으로 어떻게 될까요',
  '제가 잘하고 있는 걸까요', '변화가 필요한 시기일까요', '용기를 내도 될까요', '기다리는 게 맞을까요',
  '좋은 소식이 올까요', '왜 이렇게 일이 안 풀리죠', '쉬어가도 되는 걸까요'
];
let indirectWrong = 0;
INDIRECT.forEach(function (text) {
  const r = classifyQuestion(text);
  if (r.category) { indirectWrong += 1; console.log('INDIRECT confidently labeled ' + r.category + ': ' + text); }
});
console.log('indirect: confidently labeled ' + indirectWrong + ' / ' + INDIRECT.length);
assert.ok(indirectWrong <= 2, 'indirect questions must not be confidently mislabeled');

// 후보: 동점이면 후보를 돌려주고, 아무 단서도 없으면 비어 있다
const tie = classifyQuestion('연애와 돈 둘 다 궁금해요');
assert.strictEqual(tie.category, null);
assert.deepStrictEqual(tie.candidates.slice().sort(), ['love', 'money']);
assert.deepStrictEqual(classifyQuestion('오늘 하루는 어떨까요?').candidates, []);
assert.deepStrictEqual(classifyQuestion('이직해도 될까요?').candidates, [], 'confident result has no candidates');
console.log('question-intent-colloquial ok');
