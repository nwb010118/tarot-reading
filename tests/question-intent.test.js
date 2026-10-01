const assert = require('assert');
const { classifyQuestion, QUESTION_FRAME_LINES, QUESTION_SAFETY_MESSAGE } = require('../js/question-intent.js');
const { CATEGORY_SUBCHOICES, CATEGORY_LABELS } = require('../data/category-labels.js');

// 주제별 예문 (최소 5개). 하위선택은 지정한 경우만 확인한다.
const CASES = {
  love: [
    ['짝사랑하는 사람에게 고백해도 될까요?', 'solo'], ['소개팅에서 좋은 인연을 만날 수 있을까요?', 'solo'],
    ['남자친구와 결혼해도 될까요?', 'couple'], ['헤어진 여자친구와 재회할 수 있을까요?', 'couple'], ['요즘 연애운이 궁금해요', null]
  ],
  money: [
    ['주식 투자를 시작해도 될까요?', 'invest'], ['이번 달 소비를 줄일 수 있을까요?', 'consumption'],
    ['월급 말고 부수입이 생길까요?', 'income'], ['올해 재물운이 어떨까요?', null], ['대출 갚을 수 있을까요?', null]
  ],
  career: [
    ['면접에 합격할 수 있을까요?', 'jobseek'], ['취업 준비가 잘 되고 있을까요?', 'jobseek'],
    ['이직해도 될까요?', 'switch'], ['퇴사하고 싶은데 괜찮을까요?', 'switch'], ['자소서를 다시 써야 할까요?', 'jobseek']
  ],
  workplace: [
    ['상사와의 관계가 풀릴까요?', null], ['팀장님과 갈등이 있는데 어떻게 해야 할까요?', null],
    ['이번에 승진할 수 있을까요?', 'personal'], ['회사 동료들과 협업이 잘 될까요?', 'team'], ['야근이 계속될까요?', 'personal']
  ],
  business: [
    ['카페 창업을 준비해도 될까요?', 'startup'], ['가게 매출이 오를까요?', 'running'],
    ['자영업을 시작하는 게 맞을까요?', null], ['스타트업을 차려도 될까요?', 'startup'], ['쇼핑몰 운영이 잘 될까요?', 'running']
  ],
  study: [
    ['수능 성적이 잘 나올까요?', 'exam'], ['자격증 시험에 붙을까요?', 'exam'],
    ['진로를 바꿔도 될까요?', 'path'], ['대학원에 가는 게 좋을까요?', 'path'], ['공부 방법을 바꿔야 할까요?', null]
  ],
  health: [
    ['다이어트를 이어갈 수 있을까요?', 'body'], ['요즘 스트레스가 심한데 괜찮아질까요?', 'mind'],
    ['불안한 마음이 가라앉을까요?', 'mind'], ['수술을 앞두고 있어요', 'body'], ['번아웃에서 벗어날 수 있을까요?', 'mind']
  ],
  relationships: [
    ['오랜 친구와 사이가 멀어졌어요', null], ['가족과의 갈등이 풀릴까요?', 'existing'],
    ['부모님과 대화가 잘 될까요?', 'existing'], ['새로운 모임에서 사람을 사귈 수 있을까요?', 'new'], ['인간관계가 힘들어요', null]
  ],
  honor: [
    ['제 평판이 좋아질까요?', null], ['소문 때문에 걱정돼요', null], ['수상할 수 있을까요?', null],
    ['인정받을 수 있을까요?', null], ['명예를 지키고 싶어요', null]
  ],
  moving: [
    ['이사를 가도 될까요?', null], ['전세 계약을 해도 될까요?', null], ['새집으로 이주하면 좋을까요?', null],
    ['월세 집을 옮겨야 할까요?', null], ['입주 시기가 괜찮을까요?', null]
  ],
  children: [
    ['아이가 학교에 잘 적응할까요?', null], ['임신 소식이 있을까요?', null], ['육아가 너무 힘들어요', null],
    ['아들과의 관계가 걱정돼요', null], ['딸이 잘 자라고 있을까요?', null]
  ]
};

let total = 0;
let correct = 0;
Object.keys(CASES).forEach(function (cat) {
  assert.ok(CATEGORY_LABELS[cat], 'known category ' + cat);
  assert.ok(CASES[cat].length >= 5, cat + ' has enough examples');
  CASES[cat].forEach(function (pair) {
    const r = classifyQuestion(pair[0]);
    total += 1;
    if (r.category === cat) correct += 1;
    else console.log('category miss:', pair[0], '->', r.category, 'expected', cat);
    if (pair[1] && r.category === cat) {
      assert.strictEqual(r.subchoice, pair[1], 'sub for: ' + pair[0]);
    }
    if (r.subchoice) {
      assert.ok(CATEGORY_SUBCHOICES[r.category].some(function (o) { return o.key === r.subchoice; }), 'valid subchoice for ' + pair[0]);
    }
  });
});
assert.ok(correct / total >= 0.9, 'category accuracy ' + correct + '/' + total);

// 미분류, 동점, 빈 입력
assert.strictEqual(classifyQuestion('').category, null);
assert.strictEqual(classifyQuestion('   ').category, null);
assert.strictEqual(classifyQuestion('오늘 하루는 어떨까요?').category, null);
assert.strictEqual(classifyQuestion('연애와 돈 둘 다 궁금해요').category, null, '동점이면 분류하지 않음');
assert.strictEqual(classifyQuestion(undefined).category, null);

// 실천 기간
assert.strictEqual(classifyQuestion('이번 주 연애운').period, 'week');
assert.strictEqual(classifyQuestion('올해 이직운').period, 'year');
assert.strictEqual(classifyQuestion('상반기 재물운').period, 'month6');
assert.strictEqual(classifyQuestion('다음 달 시험').period, 'month');
assert.strictEqual(classifyQuestion('내일 면접').period, 'today');
assert.strictEqual(classifyQuestion('연애운').period, null);

// 질문 형태
assert.strictEqual(classifyQuestion('이직해도 될까요?').form, 'decision');
assert.strictEqual(classifyQuestion('언제쯤 취업할 수 있을까요?').form, 'timing');
assert.strictEqual(classifyQuestion('그 사람이 나를 좋아할까요?').form, 'heart');
assert.strictEqual(classifyQuestion('남자친구의 속마음이 궁금해요').form, 'heart');
assert.strictEqual(classifyQuestion('요즘 마음이 복잡해요').form, 'general', '본인 마음은 상대 마음형이 아님');
assert.strictEqual(classifyQuestion('요즘 연애운이 궁금해요').form, 'general');

// 안전: 위기 표현은 safety, 일반 질문은 아님
['죽고 싶어요', '자살하고 싶다는 생각이 들어요', '극단적 선택을 할까 봐 무서워요', '다 사라지고 싶어요', '살기 싫어요'].forEach(function (t) {
  assert.strictEqual(classifyQuestion(t).safety, true, 'safety: ' + t);
});
['이직해도 될까요?', '죽도록 열심히 공부했어요', '연애가 어렵네요'].forEach(function (t) {
  assert.strictEqual(classifyQuestion(t).safety, false, 'not safety: ' + t);
});

// 문구 품질
assert.ok(QUESTION_SAFETY_MESSAGE.indexOf('109') !== -1);
Object.keys(QUESTION_FRAME_LINES).forEach(function (k) {
  const line = QUESTION_FRAME_LINES[k];
  assert.ok(/(요|다)\.$/.test(line), 'polite ending: ' + line);
  assert.ok(!/[぀-ヿ]/.test(line));
  ['반드시', '무조건', '확실', '예언'].forEach(function (w) { assert.ok(line.indexOf(w) === -1, line); });
});

console.log('question-intent ok (' + correct + '/' + total + ')');
