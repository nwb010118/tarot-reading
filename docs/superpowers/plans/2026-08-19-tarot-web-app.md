# 타로 웹 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 78장 전체 타로 덱(메이저 22 + 마이너 56)으로 1장/3장 리딩을 할 수 있는, 서버 없이 브라우저에서 바로 여는 정적 웹 앱을 만든다.

**Architecture:** 순수 HTML/CSS/JS. 데이터·로직 모듈(`data/tarot-data.js`, `js/deck-logic.js`, `js/history-store.js`)은 브라우저 전역 스크립트이면서 동시에 Node의 `require()`로도 로드되도록 `module.exports` 가드를 넣어, npm 설치 없이 Node 내장 `assert`로 단위 테스트한다. `js/app.js`가 DOM과 위 모듈들을 연결한다. 카드 이미지는 퍼블릭 도메인인 라이더-웨이트-스미스(1909) 원본을 Wikimedia Commons에서 내려받아 `images/`에 저장한다.

**Tech Stack:** HTML5, CSS3(3D transform), 바닐라 JavaScript(ES2017), Node.js(테스트 실행 및 이미지 다운로드 스크립트용, 런타임 앱 자체에는 불필요), curl(이미지 다운로드).

## Global Constraints

- 빌드 도구/프레임워크/외부 JS 라이브러리 없음 — 순수 HTML/CSS/JS만 사용 (스펙: 기술 스택)
- `index.html`을 더블클릭해서 바로 열어도 동작해야 함 — `fetch()`로 데이터를 비동기 로드하지 않고 `<script>` 태그로 직접 임베드 (스펙: 구조)
- 한국어 전용 UI, 서버/DB/회원 기능 없음 (스펙: 범위)
- 색상 톤: 어두운 보라/네이비 배경 + 금색(`#d4af37` 계열) 포인트 (스펙: 디자인 톤)
- 카드 이미지는 라이더-웨이트-스미스 1909년 원본(퍼블릭 도메인) 스캔만 사용 — Wikimedia Commons 출처 (스펙: 이미지 조달)
- 이미지 로드 실패 시에도 카드명 텍스트로 리딩이 정상 동작해야 함 (스펙: 에러 처리)
- localStorage 사용 불가 환경에서도 나머지 기능은 정상 동작해야 함 (스펙: 에러 처리)

---

## Task 1: 프로젝트 뼈대 + 타로 카드 데이터 모듈

**Files:**
- Create: `data/tarot-data.js`
- Test: `tests/tarot-data.test.js`

**Interfaces:**
- Produces: `TAROT_DATA` (원본 JSON 구조 그대로), `getFullDeck()` — 78장을 평면 배열로 반환. 각 원소: `{ cardId: string, type: 'major'|'minor', name: string, nameEn: string, upright: string, reversed: string, image: string }`. 이후 모든 Task가 이 78장 배열과 필드명을 그대로 사용한다.

- [ ] **Step 1: 프로젝트 폴더 구조와 git 저장소 초기화**

```bash
mkdir -p data js css images tests scripts
git init
```

- [ ] **Step 2: `data/tarot-data.js` 작성**

```javascript
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
  const slug = card.name_en.replace(/\s+/g, '_');
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
```

- [ ] **Step 3: 실패하는 테스트 작성 — `tests/tarot-data.test.js`**

```javascript
const assert = require('assert');
const { getFullDeck } = require('../data/tarot-data.js');

const deck = getFullDeck();

assert.strictEqual(deck.length, 78, 'Expected 78 cards, got ' + deck.length);

const ids = new Set(deck.map(function (c) { return c.cardId; }));
assert.strictEqual(ids.size, 78, 'Card IDs must be unique');

deck.forEach(function (card) {
  assert.ok(card.name, 'Card ' + card.cardId + ' missing name');
  assert.ok(card.upright, 'Card ' + card.cardId + ' missing upright text');
  assert.ok(card.reversed, 'Card ' + card.cardId + ' missing reversed text');
  assert.ok(card.image.indexOf('images/') === 0, 'Card ' + card.cardId + ' has bad image path: ' + card.image);
});

console.log('All tarot-data tests passed (' + deck.length + ' cards)');
```

이 시점에는 `data/tarot-data.js`가 아직 없으므로 실패한다(파일 없음 에러). 파일이 이미 Step 2에서 생성됐다면, 먼저 Step 2 코드를 지우고 이 순서로 진행하거나, 실제로는 Step 2와 Step 3을 함께 커밋해도 무방하다 — 핵심은 Step 4에서 테스트가 반드시 통과함을 직접 확인하는 것이다.

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `node tests/tarot-data.test.js`
Expected: `All tarot-data tests passed (78 cards)` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add data/tarot-data.js tests/tarot-data.test.js
git commit -m "feat: add tarot card data and full-deck flattening"
```

---

## Task 2: 카드 뽑기 로직

**Files:**
- Create: `js/deck-logic.js`
- Test: `tests/deck-logic.test.js`

**Interfaces:**
- Consumes: `getFullDeck()`의 반환 형식(`{ cardId, name, upright, reversed, image, ... }` 배열) — 단, `drawCards`는 카드의 내부 필드에 의존하지 않고 임의의 객체 배열에 대해 동작한다.
- Produces: `drawCards(deck, count, rng)` — `deck`에서 중복 없이 `count`장을 뽑아 `[{ card, orientation: 'upright'|'reversed' }, ...]`를 반환. `rng`는 `Math.random`과 같은 시그니처의 함수(기본값 `Math.random`). Task 5(`js/app.js`)가 이 함수를 그대로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/deck-logic.test.js`**

```javascript
const assert = require('assert');
const { drawCards } = require('../js/deck-logic.js');

function makeFakeRng(values) {
  let i = 0;
  return function () {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

const deck = [{ cardId: 'a' }, { cardId: 'b' }, { cardId: 'c' }];

// pool=[a,b,c]; pick index=floor(0.9*3)=2 -> 'c'; orientation rng=0.1 -> upright
// pool=[a,b];   pick index=floor(0.9*2)=1 -> 'b'; orientation rng=0.9 -> reversed
const rng = makeFakeRng([0.9, 0.1, 0.9, 0.9]);
const result = drawCards(deck, 2, rng);

assert.strictEqual(result.length, 2);
assert.strictEqual(result[0].card.cardId, 'c');
assert.strictEqual(result[0].orientation, 'upright');
assert.strictEqual(result[1].card.cardId, 'b');
assert.strictEqual(result[1].orientation, 'reversed');

const drawnIds = result.map(function (r) { return r.card.cardId; });
assert.strictEqual(new Set(drawnIds).size, drawnIds.length, 'No duplicate cards in a single draw');

console.log('All deck-logic tests passed');
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `node tests/deck-logic.test.js`
Expected: FAIL — `Cannot find module '../js/deck-logic.js'`

- [ ] **Step 3: 최소 구현 — `js/deck-logic.js`**

```javascript
function drawCards(deck, count, rng) {
  const random = rng || Math.random;
  const pool = deck.slice();
  const drawn = [];

  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * pool.length);
    const card = pool.splice(index, 1)[0];
    const orientation = random() < 0.5 ? 'upright' : 'reversed';
    drawn.push({ card: card, orientation: orientation });
  }

  return drawn;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { drawCards };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `node tests/deck-logic.test.js`
Expected: `All deck-logic tests passed` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/deck-logic.js tests/deck-logic.test.js
git commit -m "feat: add card draw logic with orientation and no duplicates"
```

---

## Task 3: 리딩 기록 저장소 (localStorage)

**Files:**
- Create: `js/history-store.js`
- Test: `tests/history-store.test.js`

**Interfaces:**
- Produces: `getHistory(storage)`, `saveReading(storage, entry)`, `deleteReading(storage, index)`, `clearHistory(storage)`, `HISTORY_KEY`. `storage`는 `getItem`/`setItem`을 가진 객체(브라우저의 `localStorage` 또는 테스트용 mock)를 받는다. `entry` 형식: `{ date: ISOString, question: string, spreadType: '1'|'3', cards: [{ name, orientation }] }`. Task 5가 브라우저의 실제 `localStorage`를 이 함수들에 주입해서 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/history-store.test.js`**

```javascript
const assert = require('assert');
const { getHistory, saveReading, deleteReading, clearHistory } = require('../js/history-store.js');

function makeFakeStorage() {
  const store = {};
  return {
    getItem: function (key) { return key in store ? store[key] : null; },
    setItem: function (key, value) { store[key] = value; }
  };
}

const storage = makeFakeStorage();

assert.deepStrictEqual(getHistory(storage), [], 'Empty history should be an empty array');

const entry1 = { date: '2026-08-19T10:00:00.000Z', question: 'Q1', spreadType: '1', cards: [{ name: '바보', orientation: 'upright' }] };
saveReading(storage, entry1);
let history = getHistory(storage);
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].question, 'Q1');

const entry2 = { date: '2026-08-19T11:00:00.000Z', question: 'Q2', spreadType: '3', cards: [] };
saveReading(storage, entry2);
history = getHistory(storage);
assert.strictEqual(history.length, 2);
assert.strictEqual(history[0].question, 'Q2', 'Newest reading should be first');

deleteReading(storage, 1);
history = getHistory(storage);
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].question, 'Q2');

clearHistory(storage);
assert.deepStrictEqual(getHistory(storage), []);

console.log('All history-store tests passed');
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `node tests/history-store.test.js`
Expected: FAIL — `Cannot find module '../js/history-store.js'`

- [ ] **Step 3: 최소 구현 — `js/history-store.js`**

```javascript
const HISTORY_KEY = 'tarot_history';

function getHistory(storage) {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveReading(storage, entry) {
  const history = getHistory(storage);
  history.unshift(entry);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function deleteReading(storage, index) {
  const history = getHistory(storage);
  history.splice(index, 1);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function clearHistory(storage) {
  storage.setItem(HISTORY_KEY, JSON.stringify([]));
  return [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getHistory, saveReading, deleteReading, clearHistory, HISTORY_KEY };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `node tests/history-store.test.js`
Expected: `All history-store tests passed` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/history-store.js tests/history-store.test.js
git commit -m "feat: add localStorage-backed reading history store"
```

---

## Task 4: 화면 구조(HTML)와 스타일(CSS)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Consumes: 없음 (Task 1~3의 `<script>` 파일을 로드는 하지만, 이 Task 자체는 마크업/스타일만 다룬다)
- Produces: 아래 정확한 DOM id/class 목록. Task 5(`js/app.js`)가 이 id들을 그대로 참조하므로 이름을 바꾸지 말 것.
  - `#screen-start`, `#question-input`, `.spread-btn`(각 `data-spread="1"|"3"`), `#draw-button`, `#history-open-button`
  - `#screen-reading`, `#cards-container`, `#summary`, `#new-reading-button`
  - `#history-modal`, `#history-list`, `#history-close-button`, `#clear-history-button`
  - 공용 표시/숨김 클래스: `.hidden`

- [ ] **Step 1: `index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>타로 리딩</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="app">
  <header>
    <h1>타로 리딩</h1>
  </header>

  <section id="screen-start">
    <label for="question-input">무엇이 궁금하신가요? (선택)</label>
    <input type="text" id="question-input" placeholder="예: 이번 달 연애운은?">

    <div id="spread-select">
      <button type="button" class="spread-btn selected" data-spread="1">오늘의 카드 1장</button>
      <button type="button" class="spread-btn" data-spread="3">3장 스프레드</button>
    </div>

    <button type="button" id="draw-button">카드 뽑기</button>
    <button type="button" id="history-open-button">지난 기록</button>
  </section>

  <section id="screen-reading" class="hidden">
    <div id="cards-container"></div>
    <div id="summary" class="hidden"></div>
    <button type="button" id="new-reading-button" class="hidden">새 리딩 시작</button>
  </section>

  <div id="history-modal" class="hidden">
    <div class="modal-content">
      <h2>지난 기록</h2>
      <div id="history-list"></div>
      <div class="modal-actions">
        <button type="button" id="clear-history-button">전체 삭제</button>
        <button type="button" id="history-close-button">닫기</button>
      </div>
    </div>
  </div>
</div>

<script src="data/tarot-data.js"></script>
<script src="js/deck-logic.js"></script>
<script src="js/history-store.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `css/style.css` 작성**

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(160deg, #120c22, #241833 60%, #16233f);
  color: #f0e6c8;
  font-family: -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
  padding: 24px 16px 64px;
}

#app { max-width: 720px; margin: 0 auto; }

header h1 { text-align: center; letter-spacing: 2px; color: #d4af37; }

.hidden { display: none !important; }

label { display: block; margin-bottom: 8px; color: #c9bde0; }

#question-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #4a3a68;
  background: #1a1330;
  color: #f0e6c8;
  margin-bottom: 16px;
  font-size: 15px;
}

#spread-select { display: flex; gap: 12px; margin-bottom: 20px; }

.spread-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #4a3a68;
  background: #1a1330;
  color: #f0e6c8;
  cursor: pointer;
}

.spread-btn.selected { border-color: #d4af37; background: #2a1f42; }

#draw-button, #history-open-button, #new-reading-button,
#clear-history-button, #history-close-button {
  display: block;
  width: 100%;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid #d4af37;
  background: transparent;
  color: #d4af37;
  font-size: 15px;
  cursor: pointer;
}

#draw-button:hover, #history-open-button:hover, #new-reading-button:hover {
  background: rgba(212, 175, 55, 0.12);
}

#cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  margin: 24px 0;
}

.card { width: 140px; height: 245px; perspective: 1000px; cursor: pointer; }

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card.flipped .card-inner { transform: rotateY(180deg); }

.card-back, .card-front {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #d4af37;
}

.card-back {
  background:
    repeating-linear-gradient(45deg, #2a1f42, #2a1f42 8px, #34294f 8px, #34294f 16px);
}

.card-front {
  transform: rotateY(180deg);
  background: #1a1330;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  text-align: center;
}

.card-front img { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; }
.card-front img.reversed { transform: rotate(180deg); }

.card-fallback {
  display: none;
  width: 100%;
  height: 140px;
  border-radius: 6px;
  background: #2a1f42;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.card-name { margin: 8px 0 2px; font-weight: bold; font-size: 13px; }
.card-meaning { margin: 0; font-size: 11px; color: #c9bde0; overflow-y: auto; max-height: 60px; }

#summary { text-align: center; margin: 20px 0; }

#history-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: #1a1330;
  border: 1px solid #d4af37;
  border-radius: 12px;
  padding: 20px;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.history-item {
  border-bottom: 1px solid #4a3a68;
  padding: 10px 0;
}

.history-date { font-size: 12px; color: #c9bde0; margin: 0; }
.history-question { margin: 4px 0; font-weight: bold; }
.history-cards { margin: 0; font-size: 13px; }

.history-delete-button {
  margin-top: 6px;
  background: transparent;
  border: 1px solid #4a3a68;
  color: #f0e6c8;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}

@media (max-width: 480px) {
  .card { width: 44vw; height: 77vw; max-width: 160px; max-height: 280px; }
}
```

- [ ] **Step 3: 브라우저에서 열어 레이아웃 확인**

`index.html`을 브라우저로 연다 (더블클릭 또는 `open index.html` / `start index.html`). 콘솔 에러는 나올 수 있다(`app.js`가 아직 없으므로) — 지금 단계에서는 시작 화면(질문 입력란, 스프레드 선택 버튼 2개, 카드 뽑기 버튼, 지난 기록 버튼)이 어두운 보라/금색 톤으로 정상 표시되는지만 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add index.html css/style.css
git commit -m "feat: add page structure and dark/gold styling"
```

---

## Task 5: 화면 동작 연결 (js/app.js)

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `getFullDeck()` (Task 1), `drawCards(deck, count, rng)` (Task 2), `getHistory/saveReading/deleteReading/clearHistory(storage, ...)` (Task 3), Task 4의 DOM id들
- Produces: 없음 (최종 사용자 흐름을 완성하는 마지막 조립 레이어)

- [ ] **Step 1: `js/app.js` 작성**

```javascript
(function () {
  const deck = getFullDeck();
  let selectedSpread = 1;
  let flippedCount = 0;
  let historySaved = false;

  const screenStart = document.getElementById('screen-start');
  const screenReading = document.getElementById('screen-reading');
  const questionInput = document.getElementById('question-input');
  const spreadButtons = document.querySelectorAll('.spread-btn');
  const drawButton = document.getElementById('draw-button');
  const cardsContainer = document.getElementById('cards-container');
  const summaryEl = document.getElementById('summary');
  const newReadingButton = document.getElementById('new-reading-button');
  const historyOpenButton = document.getElementById('history-open-button');
  const historyModal = document.getElementById('history-modal');
  const historyList = document.getElementById('history-list');
  const historyCloseButton = document.getElementById('history-close-button');
  const clearHistoryButton = document.getElementById('clear-history-button');

  spreadButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spreadButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedSpread = Number(btn.dataset.spread);
    });
  });

  drawButton.addEventListener('click', function () {
    const currentDraw = drawCards(deck, selectedSpread);
    flippedCount = 0;
    historySaved = false;

    renderCards(currentDraw);

    screenStart.classList.add('hidden');
    screenReading.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    newReadingButton.classList.add('hidden');
  });

  function renderCards(draw) {
    cardsContainer.innerHTML = '';

    draw.forEach(function (item) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';

      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const meaning = item.orientation === 'upright' ? item.card.upright : item.card.reversed;
      const imgClass = item.orientation === 'reversed' ? 'reversed' : '';

      cardEl.innerHTML =
        '<div class="card-inner">' +
          '<div class="card-back"></div>' +
          '<div class="card-front">' +
            '<img class="' + imgClass + '" src="' + item.card.image + '" alt="' + item.card.name + '" ' +
              'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
            '<div class="card-fallback">' + item.card.name + '</div>' +
            '<p class="card-name">' + item.card.name + ' (' + orientationLabel + ')</p>' +
            '<p class="card-meaning">' + meaning + '</p>' +
          '</div>' +
        '</div>';

      cardEl.addEventListener('click', function () {
        if (cardEl.classList.contains('flipped')) return;
        cardEl.classList.add('flipped');
        flippedCount += 1;

        if (flippedCount === draw.length && !historySaved) {
          showSummary(draw);
          saveCurrentReading(draw);
          historySaved = true;
        }
      });

      cardsContainer.appendChild(cardEl);
    });
  }

  function showSummary(draw) {
    const lines = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      return item.card.name + ' - ' + orientationLabel;
    });
    summaryEl.innerHTML = '<h3>오늘의 리딩 요약</h3><p>' + lines.join(' / ') + '</p>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }

  function saveCurrentReading(draw) {
    if (typeof localStorage === 'undefined') return;
    const entry = {
      date: new Date().toISOString(),
      question: questionInput.value.trim(),
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    saveReading(localStorage, entry);
  }

  newReadingButton.addEventListener('click', function () {
    screenReading.classList.add('hidden');
    screenStart.classList.remove('hidden');
    questionInput.value = '';
  });

  historyOpenButton.addEventListener('click', function () {
    renderHistory();
    historyModal.classList.remove('hidden');
  });

  historyCloseButton.addEventListener('click', function () {
    historyModal.classList.add('hidden');
  });

  clearHistoryButton.addEventListener('click', function () {
    if (typeof localStorage === 'undefined') return;
    clearHistory(localStorage);
    renderHistory();
  });

  function renderHistory() {
    if (typeof localStorage === 'undefined') {
      historyList.innerHTML = '<p>이 브라우저에서는 기록 저장을 사용할 수 없습니다.</p>';
      return;
    }

    const history = getHistory(localStorage);

    if (history.length === 0) {
      historyList.innerHTML = '<p>저장된 기록이 없습니다.</p>';
      return;
    }

    historyList.innerHTML = history.map(function (entry, index) {
      const cardsText = entry.cards.map(function (c) {
        return c.name + '(' + (c.orientation === 'upright' ? '정' : '역') + ')';
      }).join(', ');
      const dateText = new Date(entry.date).toLocaleString('ko-KR');
      const questionText = entry.question ? entry.question : '(질문 없음)';

      return '<div class="history-item">' +
        '<p class="history-date">' + dateText + '</p>' +
        '<p class="history-question">' + questionText + '</p>' +
        '<p class="history-cards">' + cardsText + '</p>' +
        '<button type="button" class="history-delete-button" data-index="' + index + '">삭제</button>' +
        '</div>';
    }).join('');

    historyList.querySelectorAll('.history-delete-button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteReading(localStorage, Number(btn.dataset.index));
        renderHistory();
      });
    });
  }
})();
```

- [ ] **Step 2: 브라우저에서 전체 흐름 수동 확인**

`index.html`을 새로고침한다.
1. "오늘의 카드 1장" 선택 상태에서 "카드 뽑기" 클릭 → 카드 뒷면 1장 표시 확인
2. 카드 클릭 → 뒤집기 애니메이션 후 카드명/방향/해석 텍스트 표시 확인 (이미지는 아직 없으므로 깨진 이미지 아이콘 대신 "card-fallback" 텍스트가 보이면 `onerror`가 정상 동작하는 것 — 안 보이면 Step 3로 진행)
3. "3장 스프레드" 선택 → "카드 뽑기" → 카드 3장이 각각 독립적으로 뒤집히고, 3장 다 뒤집으면 요약이 나타나는지 확인
4. "새 리딩 시작" → 시작 화면으로 돌아가는지 확인
5. "지난 기록" 클릭 → 방금 진행한 리딩이 목록에 나타나는지, "삭제"와 "전체 삭제"가 동작하는지 확인
6. 브라우저 개발자 도구 콘솔에 에러가 없는지 확인

- [ ] **Step 3: 커밋**

```bash
git add js/app.js
git commit -m "feat: wire UI to deck-logic and history-store modules"
```

---

## Task 6: 라이더-웨이트-스미스 카드 이미지 조달

**Files:**
- Create: `scripts/list-image-filenames.js`
- Create: `scripts/download-images.sh`
- Create: `images/*.jpg` (78개, 스크립트 실행 결과물)

**Interfaces:**
- Consumes: `getFullDeck()` (Task 1) — 각 카드의 `image` 필드에서 파일명을 뽑아 다운로드 목록을 만든다.
- Produces: `images/` 폴더에 Task 1이 계산한 파일명과 정확히 일치하는 78개의 이미지 파일. Task 4/5의 `<img src="images/...">`가 이 파일들을 그대로 참조한다.

- [ ] **Step 1: 파일명 목록 스크립트 작성 — `scripts/list-image-filenames.js`**

```javascript
const { getFullDeck } = require('../data/tarot-data.js');

const deck = getFullDeck();

deck.forEach(function (card) {
  console.log(card.image.replace('images/', ''));
});
```

- [ ] **Step 2: 목록 스크립트 실행 확인**

Run: `node scripts/list-image-filenames.js | wc -l`
Expected: `78`

Run: `node scripts/list-image-filenames.js | head -5`
Expected 예시:
```
RWS_Tarot_00_The_Fool.jpg
RWS_Tarot_01_The_Magician.jpg
RWS_Tarot_02_The_High_Priestess.jpg
RWS_Tarot_03_The_Empress.jpg
RWS_Tarot_04_The_Emperor.jpg
```

- [ ] **Step 3: 다운로드 스크립트 작성 — `scripts/download-images.sh`**

```bash
#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."
mkdir -p images

node scripts/list-image-filenames.js > /tmp/tarot-image-filenames.txt

FAILED=0
OK=0

while IFS= read -r filename; do
  if [ -f "images/$filename" ] && [ -s "images/$filename" ]; then
    OK=$((OK+1))
    continue
  fi

  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$filename")
  url="https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}"

  if curl -fsSL "$url" -o "images/$filename"; then
    echo "OK: $filename"
    OK=$((OK+1))
  else
    echo "FAILED: $filename"
    rm -f "images/$filename"
    FAILED=$((FAILED+1))
  fi
done < /tmp/tarot-image-filenames.txt

echo "---"
echo "성공: $OK, 실패: $FAILED"
```

- [ ] **Step 4: 다운로드 스크립트 실행**

```bash
chmod +x scripts/download-images.sh
./scripts/download-images.sh
```

이 단계는 외부 네트워크 접근이 필요하며, 현재 작업 환경에서 차단되어 있을 수 있다.

- 전부(또는 대부분) `OK`로 끝나면 Step 5로 진행한다.
- 상당수가 `FAILED`로 끝나거나 스크립트 자체가 네트워크 에러로 즉시 실패하면, **여기서 멈추고 사용자에게 보고한다** — 78장을 수동으로 구해서 `images/` 폴더에 위 파일명 규칙대로 넣어달라고 요청하거나, 브레인스토밍 때 만든 CSS/SVG 일러스트 카드로 대체할지 사용자에게 다시 확인한다. 임의로 다른 이미지 소스로 대체하지 않는다.

- [ ] **Step 5: 결과 검증**

Run: `ls images | wc -l`
Expected: `78`

브라우저에서 `index.html`을 열고 카드를 몇 장 뽑아 뒤집어, 실제 타로 카드 그림이 정상적으로 나오는지 육안으로 확인한다. 정방향 카드는 그대로, 역방향 카드는 이미지가 180도 회전해서 보이는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add scripts/list-image-filenames.js scripts/download-images.sh images/
git commit -m "feat: add Rider-Waite-Smith card images (public domain, 1909)"
```

---

## Task 7: 전체 수동 QA

**Files:**
- Modify: 없음 (검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~6에서 완성된 앱 전체
- Produces: 없음

- [ ] **Step 1: 자동화 테스트 전체 재실행**

```bash
node tests/tarot-data.test.js
node tests/deck-logic.test.js
node tests/history-store.test.js
```

Expected: 세 스크립트 모두 통과 메시지 출력, 에러 없음

- [ ] **Step 2: 1장 리딩 흐름 확인**

`index.html`을 새로고침 → 질문 입력 → "오늘의 카드 1장" 선택(기본 선택) → "카드 뽑기" → 카드 클릭해서 뒤집기 → 카드 이미지/이름/방향/해석이 모두 보이는지, 요약이 뜨는지 확인

- [ ] **Step 3: 3장 리딩 흐름 확인**

"새 리딩 시작" → "3장 스프레드" 선택 → "카드 뽑기" → 카드 3장이 서로 다른 카드인지(중복 없는지) 확인 → 하나씩 클릭해 순서 상관없이 뒤집히는지, 마지막 카드를 뒤집을 때만 요약이 뜨는지 확인

- [ ] **Step 4: 정방향/역방향 무작위성 확인**

리딩을 8~10회 반복해, 역방향 카드가 최소 한 번 이상 나오고 이미지가 180도 회전해서 표시되는지 확인 (통계적 확인이므로 정확히 50%일 필요는 없음)

- [ ] **Step 5: 기록 저장/조회/삭제 확인**

"지난 기록" 클릭 → 지금까지의 리딩이 최신순으로 나열되는지 → 항목 하나 "삭제" → 목록에서 사라지는지 → "전체 삭제" → 목록이 비는지 확인. 브라우저를 새로고침한 뒤에도(삭제하지 않은 상태라면) 기록이 남아있는지 확인해 localStorage 영속성을 검증

- [ ] **Step 6: 이미지 실패 대체 텍스트 확인**

`js/app.js`의 `renderCards` 함수 안 `item.card.image` 값을 브라우저 개발자 도구에서 임시로 존재하지 않는 경로로 바꿔보거나(예: 콘솔에서 `document.querySelector('.card-front img').src = 'images/none.jpg'`), 카드를 다시 뽑아 이미지가 없어도 카드명 텍스트(`card-fallback`)로 정상 표시되는지 확인

- [ ] **Step 7: 모바일 크기 레이아웃 확인**

브라우저 개발자 도구에서 화면 너비를 375px 정도로 좁혀, 카드가 잘리지 않고 자연스럽게 줄바꿈되는지, 버튼/입력란이 화면을 벗어나지 않는지 확인

- [ ] **Step 8: 최종 커밋**

앞선 QA 과정에서 코드를 수정했다면:

```bash
git add -A
git commit -m "fix: address issues found during manual QA"
```

수정 사항이 없다면 이 단계는 건너뛴다.
