const assert = require('assert');
const { ILGAN_DATA } = require('../data/saju-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];

assert.strictEqual(ILGAN_DATA.length, 10, '일간은 10개여야 함');
assert.deepStrictEqual(ILGAN_DATA.map(d => d.key), EXPECTED_KEYS, '갑을병정무기경신임계 순서와 key가 일치해야 함');

ILGAN_DATA.forEach(function (entry) {
  assert.ok(entry.trait && entry.trait.length > 0, entry.key + ' trait 누락');
  CATEGORY_KEYS.forEach(function (cat) {
    assert.ok(entry.categories[cat], entry.key + '.' + cat + ' 누락');
  });
});

// ---------------------------------------------------------------------------
// keywords/advice 부가정보와 세분화 카테고리 구조 검증
// ---------------------------------------------------------------------------

const SUBDIVIDED_CATEGORIES = {
  love: ['solo', 'couple'], money: ['consumption', 'invest'], career: ['jobseek', 'switch'],
  business: ['startup', 'running'], study: ['exam', 'path'], health: ['body', 'mind'],
  relationships: ['new', 'existing'], workplace: ['team', 'personal']
};
const SINGLE_CATEGORIES = ['honor', 'moving', 'children'];

ILGAN_DATA.forEach(function (ilgan) {
  assert.ok(Array.isArray(ilgan.keywords) && ilgan.keywords.length === 3,
    ilgan.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof ilgan.advice === 'string' && ilgan.advice.length > 0,
    ilgan.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = ilgan.categories[cat];
    assert.ok(entry && typeof entry === 'object', ilgan.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, ilgan.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, ilgan.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], ilgan.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof ilgan.categories[cat] === 'string' && ilgan.categories[cat].length > 0,
      ilgan.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 10 ilgan have valid keywords/advice/subdivided-category structure');

// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트 (타로 프로젝트 최종 리뷰의 교훈: 필드 전체 단위 비교는
// "공유된 문장1 + 다른 문장2" 충돌을 놓친다. 사주는 처음부터 문장 단위로 검증한다.
// ---------------------------------------------------------------------------

function isLockedIlgan(ilgan) {
  return ilgan.key === 'gap';
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

// 한국어는 교착어라 조사/어미가 붙으면 공백 토큰 단위 비교(wordJaccard)가
// 같은 문장 뼈대를 놓친다 (예: "지출의" vs "시장의"는 절대 토큰 매치되지 않지만
// 그 주변 문장 구조 "[큰 X를 V-는 안목으로] ... [V-는 시기입니다]"는 동일할 수 있다).
// 이를 보완하기 위해 3글자 슬라이딩 윈도우(character trigram) 기반 유사도를
// 추가한다. 문자 단위 비교라 조사/어미가 달라도 공유된 어절("안목으로" 등)이
// 그대로 겹쳐 잡힌다.
function charTrigrams(text) {
  const norm = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  const grams = new Set();
  for (let i = 0; i < norm.length - 2; i++) {
    grams.add(norm.slice(i, i + 3));
  }
  return grams;
}

function trigramJaccard(a, b) {
  const setA = charTrigrams(a);
  const setB = charTrigrams(b);
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

// 모든 카테고리 필드는 정확히 2~3문장이어야 한다 (갑목 포함 — Task 1에서 갑목도
// 2문장으로 작성했으므로 갑목을 이 검증에서 제외할 이유가 없다).
ILGAN_DATA.forEach(function (ilgan) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = ilgan.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        ilgan.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = ilgan.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      ilgan.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All ilgan have 2-3 sentence category fields');

// 같은 일간 내에서 love/relationships, career/workplace, money/business가
// 4개 서브키 조합 어디에서도 오프닝 문장/뼈대를 공유하면 안 된다
// (문장 단위 word-Jaccard >= 0.3, 필드 전체 단위 임계값과 무관).
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = ilgan.categories[catA][subA];
        const textB = ilgan.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
                ' (' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
            }
          });
        });
      });
    });
  });
});

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' forbidden-pair sentence-level collisions:\n' + collisions.join('\n'));

console.log('No forbidden-pair sentence-level collisions (love/relationships, career/workplace, money/business)');

// ---------------------------------------------------------------------------
// 오프닝 문장(각 필드의 첫 문장) 전용 보조 스윕: word-Jaccard 0.30 임계값을
// 근소하게 밑도는 뼈대 공유를 잡아내기 위해, 오프닝 문장 쌍에 한해 더 낮은
// word-Jaccard 임계값과 charTrigram 임계값을 "동시에" 만족하는 경우만 충돌로
// 본다 (AND 결합). 두 조건을 모두 요구하는 이유:
//   - word-Jaccard만 낮추면 손금(gap, 잠금 대상)의
//     love.couple<->relationships.new 쌍이 0.231로 걸려버린다 (im의 실제
//     충돌과 정확히 같은 값이라 단일 임계값으로는 분리 불가).
//   - trigram만 쓰면 실제 충돌(트라이그램 0.09~0.18대)보다 무관한 조언
//     문장들("~하지 않도록", "~에게 잘 맞습니다" 같은 상투 어구, 0.17~0.24대)의
//     점수가 더 높게 나와 오탐이 발생한다.
// "오프닝 문장으로 범위 한정 + AND 결합"으로 전체 말뭉치를 스캔한 결과
// gap을 포함해 오탐 없이 실제 두 충돌(임수 money<->business, 무토
// love<->relationships)만 잡아낸다는 것을 확인했다 (task-5-report.md 참고).
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

const openingCollisions = [];
ILGAN_DATA.forEach(function (ilgan) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(ilgan.categories[catA][subA])[0];
        const openingB = splitSentences(ilgan.categories[catB][subB])[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          openingCollisions.push(ilgan.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (word=' + wj.toFixed(2) + ', trigram=' + tj.toFixed(2) + ')\n  ' + openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(openingCollisions.length, 0,
  'Found ' + openingCollisions.length + ' forbidden-pair opening-sentence skeleton collisions ' +
  '(word-Jaccard >= ' + OPENING_WORD_JACCARD_THRESHOLD + ' AND trigram-Jaccard >= ' + OPENING_TRIGRAM_JACCARD_THRESHOLD + '):\n' +
  openingCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence skeleton collisions (word+trigram combined check)');

console.log('All saju-data tests passed');
