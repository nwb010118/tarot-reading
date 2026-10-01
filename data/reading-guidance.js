// 기간은 예측 시점이 아니라 리딩을 생활에 적용하고 돌아보는 기간이다.
const PRACTICE_SCHEDULES = {
  today: { label: '오늘', schedule: '오늘 안에 10분 정도로 할 수 있는 행동 하나를 고르세요. 저녁에 해본 일과 느낀 점을 한 줄씩 기록합니다.' },
  week: { label: '이번 주', schedule: '실천할 요일 두 번을 정하고 작게 시도하세요. 주말에는 도움이 된 점과 어려웠던 점을 비교해 다음 주에 유지할 것을 고릅니다.' },
  month: { label: '이번 달', schedule: '이번 달의 작은 목표 하나를 정하고 매주 한 번 진행을 기록하세요. 월말에는 결과보다 지속할 수 있었던 조건을 돌아봅니다.' },
  month3: { label: '3개월', schedule: '첫 달에는 작게 시험하고, 둘째 달에는 맞는 방법을 반복하며, 셋째 달에는 계속할지 평가하세요. 매달 말 계획을 조정할 시간을 남깁니다.' },
  month6: { label: '6개월', schedule: '매달 한 번 진행과 부담을 기록하세요. 3개월째에는 방향을 다시 확인하고, 6개월째에는 유지·축소·중단 중 다음 선택을 정합니다.' },
  year: { label: '1년', schedule: '한 해의 방향을 한 문장으로 정하고 분기마다 상황이 달라졌는지 확인하세요. 연말에는 목표 달성 여부와 함께 우선순위가 어떻게 바뀌었는지도 기록합니다.' }
};

const PRACTICE_FOCUS = {
  love: '내가 원하는 관계의 모습과 상대에게 직접 확인할 내용을 하나씩 적어보세요.',
  money: '최근 수입·지출 기록에서 확인할 항목 하나를 고르세요. 실제 금액과 계약 조건을 바탕으로 판단합니다.',
  career: '지원 요건과 내 경험을 비교해 보완할 항목 하나를 고르세요. 작은 준비 결과물을 남깁니다.',
  workplace: '업무에서 바꿔볼 소통 방식 하나를 고르고 상대의 피드백을 확인하세요.',
  business: '고객에게 확인할 가정 하나를 정하세요. 기대와 실제 반응을 구분해 기록합니다.',
  study: '설명하거나 풀어볼 수 있는 학습 목표 하나를 정하고 이전 결과와 비교하세요.',
  health: '생활 속 불편을 사실대로 기록하세요. 카드로 건강을 판단하지 말고 지속되는 증상은 적절한 전문 도움을 통해 확인합니다.',
  relationships: '연락하거나 대화하고 싶은 사람을 떠올리고 상대가 편한 방식을 확인하세요.',
  honor: '다른 사람의 평가보다 내가 지킬 약속 한 가지를 정하고 행동으로 확인하세요.',
  moving: '이동에 필요한 비용·동선·계약 조건 중 확인하지 못한 항목 하나를 조사하세요.',
  children: '아이에게 직접 물어볼 질문 하나를 정하고 답을 판단하기 전에 충분히 들어보세요.'
};

function getPracticePlan(period, category) {
  const schedule = PRACTICE_SCHEDULES[period] || PRACTICE_SCHEDULES.today;
  return { label: schedule.label, schedule: schedule.schedule, focus: PRACTICE_FOCUS[category] || '리딩에서 마음에 남은 문장 하나를 고르고 내 상황에 맞는 작은 행동으로 바꿔보세요.' };
}

function getSensitiveReading(category, subchoice, keywords) {
  const theme = keywords && keywords.length ? '자기성찰 키워드: ' + keywords.slice(0, 3).join(' · ') + '. ' : '';
  if (category === 'health') {
    return theme + '이 리딩은 건강 상태나 질환의 발생·회복을 예측하지 않습니다. ' +
      (subchoice === 'mind'
        ? '지금의 감정을 내 말로 표현할 수 있는지, 부담을 나눌 사람이 있는지 돌아보세요. 불편이 지속되면 적절한 전문 도움을 구하세요.'
        : '최근의 생활 기록에서 무리했던 부분과 쉬어갈 시간을 살펴보세요. 증상이나 치료 여부는 카드가 아니라 의료 전문가를 통해 확인하세요.');
  }
  if (category === 'money' && subchoice === 'invest') {
    return theme + '이 리딩은 수익·손실이나 매매 시점을 예측하지 않습니다. 기대와 확인된 사실을 나누고, 비용·계약 조건·감당할 수 있는 손실을 실제 자료로 검토하세요. 카드의 방향이나 키워드를 투자 결정의 근거로 사용하지 마세요.';
  }
  return null;
}

// 민감 주제(건강·투자)에서 고정 안전 문구 뒤에 덧붙이는 자기성찰 문장. 길이가 다른 문장을 두고 화면마다 규격에 맞는 것을 고른다.
// 상태나 결과를 예측하지 않고, 카드를 판단 근거가 아니라 생각을 정리하는 거울로만 쓴다.
const SENSITIVE_REFLECTIONS = {
  health: [
    '카드는 지금의 나를 비추는 거울로만 읽어 주세요.',
    '카드를 보며 떠오른 생각을 적어 두고, 그것이 몸이 보내는 신호인지 마음이 보내는 신호인지 구분해 보세요.',
    '카드에서 눈에 띈 장면이 요즘 내 하루와 어디서 겹치는지 떠올려 보세요. 겹치는 곳이 있다면 그 자리가 오늘 내가 돌볼 곳입니다.',
    '이 풀이는 오늘의 생각을 정리하는 도구일 뿐 상태를 판단하는 기준이 아닙니다. 잠, 식사, 쉬는 시간처럼 내가 직접 조절할 수 있는 것부터 하나만 정해 보면 충분합니다.',
    '카드가 건네는 말은 정답이 아니라 질문에 가깝습니다. 요즘 내가 가장 오래 참고 있는 것은 무엇인지, 그것을 줄이려면 오늘 무엇을 내려놓을 수 있는지 차분히 적어 보세요. 적어 둔 글은 나중에 전문가와 이야기할 때도 좋은 참고가 됩니다.'
  ],
  invest: [
    '카드는 돈의 방향이 아니라 내 마음의 온도를 비춥니다.',
    '결정을 내리기 전에 지금 내 마음에 불안과 욕심이 얼마나 섞여 있는지 한 줄로 적어 보세요.',
    '카드에서 눈에 띈 장면을 지금의 돈 이야기와 나란히 놓고, 내가 서두르고 있는지 망설이고 있는지 살펴보세요. 서두름도 망설임도 판단을 흐리는 마음의 신호일 수 있습니다.',
    '이 풀이는 결정을 대신하지 않고 결정 전의 마음을 정리하는 데만 쓰입니다. 오늘은 새로 무언가를 하기보다 지금 가진 자료와 내가 감당할 수 있는 범위를 다시 적어 보는 정도로 충분합니다.',
    '카드가 건네는 말은 정답이 아니라 질문에 가깝습니다. 이 선택이 틀렸을 때 내가 어디까지 감당할 수 있는지, 누구의 말에 마음이 흔들렸는지 차분히 적어 보세요. 적어 둔 기준은 나중에 실제 자료를 볼 때 흔들리지 않는 바탕이 됩니다.'
  ]
};

// 민감 주제가 아니면 null. 반환값은 문장 배열이다.
function getSensitiveReflections(category, subchoice) {
  if (category === 'health') return SENSITIVE_REFLECTIONS.health;
  if (category === 'money' && subchoice === 'invest') return SENSITIVE_REFLECTIONS.invest;
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPracticePlan, getSensitiveReading, getSensitiveReflections, SENSITIVE_REFLECTIONS };
}
