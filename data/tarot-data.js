const TAROT_DATA = {
  major_arcana: [
    { id: 0, name_kr: "바보", name_en: "The Fool", upright: "새로운 시작, 순수한 도전, 자유로운 선택. 두려움 없이 첫걸음을 내딛을 때입니다.", reversed: "무모함, 준비 부족, 성급한 결정. 계획 없이 뛰어들면 위험할 수 있어요." },
    { id: 1, name_kr: "마법사", name_en: "The Magician", upright: "능력의 발현, 의지와 창조력. 가진 자원을 활용해 원하는 것을 이룰 힘이 있습니다.", reversed: "재능 낭비, 조작이나 속임수, 자신감 결여. 능력을 엉뚱한 곳에 쓰고 있진 않은지 돌아보세요." },
    { id: 2, name_kr: "여사제", name_en: "The High Priestess", upright: "직관, 내면의 지혜, 비밀. 논리보다 직감을 믿어야 할 때입니다.", reversed: "억눌린 직감, 비밀의 노출, 표면적 판단. 내면의 목소리를 무시하고 있진 않나요." },
    { id: 3, name_kr: "여황제", name_en: "The Empress", upright: "풍요, 창조, 모성. 결실을 맺고 돌봄이 필요한 것들이 자라나는 시기입니다.", reversed: "과잉보호, 창조력 정체, 의존. 지나친 통제가 성장을 막고 있을 수 있어요." },
    { id: 4, name_kr: "황제", name_en: "The Emperor", upright: "질서, 안정, 리더십. 체계를 세우고 책임감 있게 이끌어야 할 때입니다.", reversed: "경직된 통제, 권위주의, 융통성 부족. 지나치게 원칙만 고집하고 있진 않은지 확인하세요." },
    { id: 5, name_kr: "교황", name_en: "The Hierophant", upright: "전통, 가르침, 신념 체계. 검증된 방식과 조언을 따르는 것이 도움이 됩니다.", reversed: "관습에 대한 반발, 독자적 신념, 형식주의. 정해진 틀을 벗어나고 싶은 마음이 커지고 있어요." },
    { id: 6, name_kr: "연인", name_en: "The Lovers", upright: "사랑, 조화, 중요한 선택. 가치관이 맞는 관계나 결정이 눈앞에 있습니다.", reversed: "불균형, 잘못된 선택, 갈등. 관계나 결정에서 어긋남이 느껴질 수 있어요." },
    { id: 7, name_kr: "전차", name_en: "The Chariot", upright: "의지, 승리, 통제력. 상반된 힘을 다스려 목표를 향해 전진할 수 있습니다.", reversed: "방향 상실, 통제력 부족, 공격성. 힘만 앞세우면 오히려 역효과가 날 수 있어요." },
    { id: 8, name_kr: "힘", name_en: "Strength", upright: "내면의 용기, 인내, 부드러운 통제. 강압이 아닌 이해와 인내로 극복할 때입니다.", reversed: "자기 의심, 나약함, 감정 통제 실패. 스스로에 대한 믿음이 흔들리고 있을 수 있어요." },
    { id: 9, name_kr: "은둔자", name_en: "The Hermit", upright: "성찰, 내적 탐구, 고독. 잠시 멈춰 스스로를 돌아볼 시간이 필요합니다.", reversed: "고립, 회피, 지나친 은둔. 혼자만의 시간이 오히려 단절로 이어지고 있진 않나요." },
    { id: 10, name_kr: "운명의 수레바퀴", name_en: "Wheel of Fortune", upright: "전환점, 운명의 변화, 순환. 흐름이 바뀌는 시기이니 변화를 받아들이세요.", reversed: "불운, 통제 밖의 변화, 정체. 예상치 못한 방향으로 흘러갈 수 있어요." },
    { id: 11, name_kr: "정의", name_en: "Justice", upright: "공정함, 균형, 인과응보. 그동안의 행동에 대한 정당한 결과가 따릅니다.", reversed: "불공정, 편견, 책임 회피. 균형이 깨진 판단을 하고 있진 않은지 살펴보세요." },
    { id: 12, name_kr: "매달린 사람", name_en: "The Hanged Man", upright: "관점의 전환, 기다림, 희생. 지금은 애써 움직이기보다 다르게 바라볼 때입니다.", reversed: "정체, 무의미한 희생, 저항. 기다림이 길어지며 지치고 있을 수 있어요." },
    { id: 13, name_kr: "죽음", name_en: "Death", upright: "끝과 시작, 변화, 전환. 하나가 끝나야 새로운 것이 시작될 수 있습니다.", reversed: "변화에 대한 저항, 정체, 두려움. 끝내야 할 것을 붙잡고 있진 않나요." },
    { id: 14, name_kr: "절제", name_en: "Temperance", upright: "균형, 조화, 인내심. 서두르지 않고 알맞게 조율하면 좋은 결과가 옵니다.", reversed: "불균형, 과도함, 조급함. 극단으로 치우치고 있진 않은지 돌아보세요." },
    { id: 15, name_kr: "악마", name_en: "The Devil", upright: "속박, 집착, 유혹. 스스로를 얽매는 습관이나 관계를 직시해야 합니다.", reversed: "속박에서의 해방, 자각, 극복. 벗어날 준비가 되어가고 있어요." },
    { id: 16, name_kr: "탑", name_en: "The Tower", upright: "급작스런 붕괴, 충격적 진실, 전복. 쌓아온 것이 무너지며 진실이 드러납니다.", reversed: "재난 회피, 지연된 붕괴, 내적 변화. 충격이 서서히, 내부적으로 일어나고 있어요." },
    { id: 17, name_kr: "별", name_en: "The Star", upright: "희망, 영감, 치유. 어려움 뒤에 찾아오는 회복과 밝은 전망입니다.", reversed: "절망, 자신감 상실, 단절된 희망. 희망을 놓아버리고 싶은 마음이 클 수 있어요." },
    { id: 18, name_kr: "달", name_en: "The Moon", upright: "불확실함, 두려움, 무의식. 명확하지 않은 상황 속 불안이 커지는 시기입니다.", reversed: "혼란 해소, 두려움 극복, 진실 드러남. 안개가 서서히 걷히고 있어요." },
    { id: 19, name_kr: "태양", name_en: "The Sun", upright: "성공, 활력, 기쁨. 밝고 긍정적인 결과가 뚜렷하게 드러납니다.", reversed: "일시적 좌절, 과도한 낙관, 지연된 성공. 기쁨이 잠시 가려져 있을 뿐입니다." },
    { id: 20, name_kr: "심판", name_en: "Judgement", upright: "각성, 부활, 중요한 결단. 과거를 정리하고 새로운 국면으로 나아갈 때입니다.", reversed: "자기 의심, 후회, 결단 미룸. 스스로를 용서하지 못하고 있진 않나요." },
    { id: 21, name_kr: "세계", name_en: "The World", upright: "완성, 성취, 통합. 하나의 여정이 만족스럽게 마무리됩니다.", reversed: "미완성, 지연, 마무리 부족. 조금만 더 가면 완성인데 멈춰 있을 수 있어요." }
  ],
  minor_arcana: {
    wands: [
      { rank: "Ace", name_kr: "완드 에이스", upright: "새로운 열정, 창조적 시작, 영감", reversed: "지연된 시작, 동기 부족, 방향성 상실" },
      { rank: "2", name_kr: "완드 2", upright: "계획, 미래 설계, 확장에 대한 고민", reversed: "계획 미비, 두려움으로 인한 정체" },
      { rank: "3", name_kr: "완드 3", upright: "확장, 예측, 기회의 확인", reversed: "지연, 장애물, 근시안적 시야" },
      { rank: "4", name_kr: "완드 4", upright: "축하, 안정, 결실을 맺은 성취", reversed: "불안정한 기반, 조화 부족" },
      { rank: "5", name_kr: "완드 5", upright: "경쟁, 갈등, 의견 충돌", reversed: "갈등 회피, 억눌린 긴장" },
      { rank: "6", name_kr: "완드 6", upright: "승리, 인정, 성공적인 결과", reversed: "지연된 인정, 자만심, 좌절된 성공" },
      { rank: "7", name_kr: "완드 7", upright: "방어, 도전에 맞섬, 신념 고수", reversed: "압도됨, 자신감 상실, 포기하고 싶은 마음" },
      { rank: "8", name_kr: "완드 8", upright: "빠른 진전, 신속한 움직임, 좋은 소식", reversed: "지연, 혼란, 성급함으로 인한 실수" },
      { rank: "9", name_kr: "완드 9", upright: "인내, 경계심, 마지막 한 걸음", reversed: "지침, 방어적 태도, 포기 직전" },
      { rank: "10", name_kr: "완드 10", upright: "부담, 책임의 무게, 과로", reversed: "짐 내려놓기, 위임, 한계 인정" },
      { rank: "Page", name_kr: "완드 시종", upright: "호기심, 새로운 아이디어, 열정적 탐구", reversed: "미숙한 계획, 성급한 열정" },
      { rank: "Knight", name_kr: "완드 기사", upright: "모험, 행동력, 열정적 추진", reversed: "무모함, 성급한 행동, 인내심 부족" },
      { rank: "Queen", name_kr: "완드 퀸", upright: "자신감, 독립심, 따뜻한 카리스마", reversed: "요구가 많음, 질투, 자기중심적 태도" },
      { rank: "King", name_kr: "완드 킹", upright: "비전, 리더십, 대담한 결단력", reversed: "독단적 태도, 성급한 결정, 강압" }
    ],
    cups: [
      { rank: "Ace", name_kr: "컵 에이스", upright: "새로운 감정, 사랑의 시작, 정서적 충만", reversed: "감정 억압, 실망, 정서적 공허함" },
      { rank: "2", name_kr: "컵 2", upright: "유대, 파트너십, 상호 이해", reversed: "관계의 불균형, 소통 단절" },
      { rank: "3", name_kr: "컵 3", upright: "우정, 축하, 함께하는 기쁨", reversed: "고립, 과도한 유흥, 관계의 소원함" },
      { rank: "4", name_kr: "컵 4", upright: "무관심, 권태, 기회를 놓침", reversed: "새로운 관심의 시작, 자각" },
      { rank: "5", name_kr: "컵 5", upright: "상실, 후회, 슬픔에 머무름", reversed: "회복, 수용, 앞으로 나아감" },
      { rank: "6", name_kr: "컵 6", upright: "추억, 순수함, 과거로부터의 위안", reversed: "과거에 대한 집착, 현실 도피" },
      { rank: "7", name_kr: "컵 7", upright: "선택의 혼란, 환상, 많은 가능성", reversed: "명확해진 선택, 환상에서 깨어남" },
      { rank: "8", name_kr: "컵 8", upright: "떠남, 더 깊은 의미 추구, 포기", reversed: "떠나기를 주저함, 정체된 미련" },
      { rank: "9", name_kr: "컵 9", upright: "만족, 소망 성취, 정서적 충족", reversed: "표면적 만족, 과도한 자기만족" },
      { rank: "10", name_kr: "컵 10", upright: "행복, 화목, 정서적 완성", reversed: "불화, 깨진 화합, 이상과 현실의 괴리" },
      { rank: "Page", name_kr: "컵 시종", upright: "감성적 메시지, 창의적 영감, 순수한 감정", reversed: "감정 기복, 미성숙한 반응" },
      { rank: "Knight", name_kr: "컵 기사", upright: "로맨스, 매력적 제안, 이상 추구", reversed: "감정적 변덕, 비현실적 기대" },
      { rank: "Queen", name_kr: "컵 퀸", upright: "공감, 직관, 정서적 성숙", reversed: "감정 과잉, 경계 부족" },
      { rank: "King", name_kr: "컵 킹", upright: "정서적 균형, 관대함, 안정적 리더십", reversed: "감정 억제, 조작적 태도" }
    ],
    swords: [
      { rank: "Ace", name_kr: "소드 에이스", upright: "명료함, 새로운 통찰, 진실의 발견", reversed: "혼란, 왜곡된 판단, 잘못된 정보" },
      { rank: "2", name_kr: "소드 2", upright: "교착 상태, 어려운 결정, 균형 잡기", reversed: "결정 회피, 혼란 가중" },
      { rank: "3", name_kr: "소드 3", upright: "상심, 배신, 고통스러운 진실", reversed: "치유의 시작, 용서, 회복" },
      { rank: "4", name_kr: "소드 4", upright: "휴식, 회복, 재충전의 시간", reversed: "휴식 부족, 강제된 정체" },
      { rank: "5", name_kr: "소드 5", upright: "갈등, 소모적인 승리, 긴장", reversed: "화해, 갈등의 해소" },
      { rank: "6", name_kr: "소드 6", upright: "전환, 회복을 향한 이동, 순조로운 변화", reversed: "변화에 대한 저항, 미련" },
      { rank: "7", name_kr: "소드 7", upright: "전략, 은밀한 행동, 회피", reversed: "발각, 자백, 전략의 실패" },
      { rank: "8", name_kr: "소드 8", upright: "속박감, 제한된 선택, 무력감", reversed: "속박에서 벗어남, 자각을 통한 해방" },
      { rank: "9", name_kr: "소드 9", upright: "불안, 걱정, 악몽 같은 생각", reversed: "불안의 완화, 걱정에서 벗어남" },
      { rank: "10", name_kr: "소드 10", upright: "끝, 바닥을 침, 고통의 종결", reversed: "회복의 시작, 최악을 지남" },
      { rank: "Page", name_kr: "소드 시종", upright: "호기심, 새로운 생각, 경계심", reversed: "성급한 판단, 소문에 휘둘림" },
      { rank: "Knight", name_kr: "소드 기사", upright: "단호함, 신속한 행동, 목표 지향", reversed: "성급함, 무모한 공격성" },
      { rank: "Queen", name_kr: "소드 퀸", upright: "명료한 사고, 독립성, 솔직함", reversed: "냉정함, 지나친 비판" },
      { rank: "King", name_kr: "소드 킹", upright: "논리적 권위, 공정한 판단, 명확한 소통", reversed: "냉혹함, 권력 남용" }
    ],
    pentacles: [
      { rank: "Ace", name_kr: "펜타클 에이스", upright: "새로운 기회, 물질적 시작, 안정의 씨앗", reversed: "놓친 기회, 계획의 지연" },
      { rank: "2", name_kr: "펜타클 2", upright: "균형 잡기, 우선순위 조율, 적응력", reversed: "과부하, 균형 상실" },
      { rank: "3", name_kr: "펜타클 3", upright: "협업, 숙련된 작업, 팀워크", reversed: "불협화음, 낮은 완성도" },
      { rank: "4", name_kr: "펜타클 4", upright: "안정, 저축, 통제욕", reversed: "집착, 손실에 대한 두려움" },
      { rank: "5", name_kr: "펜타클 5", upright: "결핍, 어려움, 소외감", reversed: "회복, 도움의 발견" },
      { rank: "6", name_kr: "펜타클 6", upright: "나눔, 관대함, 균형 잡힌 주고받음", reversed: "불공정한 거래, 일방적 의존" },
      { rank: "7", name_kr: "펜타클 7", upright: "인내, 장기적 투자, 결실을 기다림", reversed: "조급함, 성과 부진에 대한 초조함" },
      { rank: "8", name_kr: "펜타클 8", upright: "숙련, 성실한 노력, 전문성 개발", reversed: "성의 없는 작업, 완벽주의로 인한 지연" },
      { rank: "9", name_kr: "펜타클 9", upright: "풍요, 독립, 노력의 결실", reversed: "과시, 재정적 불안" },
      { rank: "10", name_kr: "펜타클 10", upright: "유산, 장기적 안정, 가족의 풍요", reversed: "재정적 갈등, 불안정한 기반" },
      { rank: "Page", name_kr: "펜타클 시종", upright: "학습 의지, 새로운 기회 탐색, 실용적 목표", reversed: "계획 부족, 나태함" },
      { rank: "Knight", name_kr: "펜타클 기사", upright: "근면함, 신뢰성, 꾸준한 노력", reversed: "정체, 지루함, 융통성 부족" },
      { rank: "Queen", name_kr: "펜타클 퀸", upright: "실용적 배려, 안정감, 현실적 감각", reversed: "일과 삶의 불균형, 과도한 걱정" },
      { rank: "King", name_kr: "펜타클 킹", upright: "재정적 성공, 안정적 리더십, 신뢰", reversed: "물질만능주의, 완고함" }
    ]
  }
};

const MINOR_RANK_NUMBER = {
  Ace: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  Page: 11, Knight: 12, Queen: 13, King: 14
};

const SUIT_LABEL = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles' };

function getMajorImageFilename(card) {
  const slug = card.name_en.replace(/^The\s+/, '').replace(/\s+/g, '_');
  return 'RWS_Tarot_' + String(card.id).padStart(2, '0') + '_' + slug + '.jpg';
}

function getMinorImageFilename(suitKey, card) {
  const num = MINOR_RANK_NUMBER[card.rank];
  return SUIT_LABEL[suitKey] + String(num).padStart(2, '0') + '.jpg';
}

function getFullDeck() {
  const deck = [];

  TAROT_DATA.major_arcana.forEach(function (card) {
    deck.push({
      cardId: 'major_' + card.id,
      type: 'major',
      name: card.name_kr,
      nameEn: card.name_en,
      upright: card.upright,
      reversed: card.reversed,
      image: 'images/' + getMajorImageFilename(card)
    });
  });

  Object.keys(TAROT_DATA.minor_arcana).forEach(function (suitKey) {
    TAROT_DATA.minor_arcana[suitKey].forEach(function (card) {
      deck.push({
        cardId: suitKey + '_' + card.rank,
        type: 'minor',
        name: card.name_kr,
        nameEn: SUIT_LABEL[suitKey] + ' ' + card.rank,
        upright: card.upright,
        reversed: card.reversed,
        image: 'images/' + getMinorImageFilename(suitKey, card)
      });
    });
  });

  return deck;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAROT_DATA, getFullDeck, getMajorImageFilename, getMinorImageFilename };
}
