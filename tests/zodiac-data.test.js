const assert = require('assert');
const { ZODIAC_DATA } = require('../data/zodiac-data.js');

const CATEGORY_KEYS = ['love', 'money', 'career', 'workplace', 'business', 'study', 'health', 'relationships', 'honor', 'moving', 'children'];
const EXPECTED_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

assert.strictEqual(ZODIAC_DATA.length, 12, '별자리는 12개여야 함');
assert.deepStrictEqual(ZODIAC_DATA.map(d => d.key), EXPECTED_KEYS, '양자리~물고기자리 순서와 key가 일치해야 함');

ZODIAC_DATA.forEach(function (entry) {
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

ZODIAC_DATA.forEach(function (zodiac) {
  assert.ok(Array.isArray(zodiac.keywords) && zodiac.keywords.length === 3,
    zodiac.key + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof zodiac.advice === 'string' && zodiac.advice.length > 0,
    zodiac.key + ' advice must be a non-empty string');

  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    const keys = SUBDIVIDED_CATEGORIES[cat];
    const entry = zodiac.categories[cat];
    assert.ok(entry && typeof entry === 'object', zodiac.key + ' categories.' + cat + ' must be an object');
    assert.ok(typeof entry[keys[0]] === 'string' && entry[keys[0]].length > 0, zodiac.key + ' categories.' + cat + '.' + keys[0] + ' must be a non-empty string');
    assert.ok(typeof entry[keys[1]] === 'string' && entry[keys[1]].length > 0, zodiac.key + ' categories.' + cat + '.' + keys[1] + ' must be a non-empty string');
    assert.notStrictEqual(entry[keys[0]], entry[keys[1]], zodiac.key + ' categories.' + cat + ' sub-choices must not be identical');
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    assert.ok(typeof zodiac.categories[cat] === 'string' && zodiac.categories[cat].length > 0,
      zodiac.key + ' categories.' + cat + ' must be a non-empty string');
  });
});

console.log('All 12 zodiac signs have valid keywords/advice/subdivided-category structure');

// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트 (타로·사주 프로젝트의 교훈: 필드 전체 단위 비교는
// "공유된 문장1 + 다른 문장2" 충돌을 놓친다. 별자리는 처음부터 문장 단위로 검증한다.
// ---------------------------------------------------------------------------

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
// 같은 문장 뼈대를 놓친다. 이를 보완하기 위해 3글자 슬라이딩 윈도우
// (character trigram) 기반 유사도를 추가한다.
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

// 모든 카테고리 필드는 정확히 2~3문장이어야 한다 (양자리 포함 — Task 1에서
// 양자리도 2문장으로 작성했으므로 양자리를 이 검증에서 제외할 이유가 없다).
ZODIAC_DATA.forEach(function (zodiac) {
  Object.keys(SUBDIVIDED_CATEGORIES).forEach(function (cat) {
    SUBDIVIDED_CATEGORIES[cat].forEach(function (key) {
      const text = zodiac.categories[cat][key];
      const count = splitSentences(text).length;
      assert.ok(count === 2 || count === 3,
        zodiac.key + ' categories.' + cat + '.' + key + ' must have 2 or 3 sentences, got ' + count);
    });
  });

  SINGLE_CATEGORIES.forEach(function (cat) {
    const text = zodiac.categories[cat];
    const count = splitSentences(text).length;
    assert.ok(count === 2 || count === 3,
      zodiac.key + ' categories.' + cat + ' must have 2 or 3 sentences, got ' + count);
  });
});

console.log('All zodiac signs have 2-3 sentence category fields');

// 같은 별자리 내에서 love/relationships, career/workplace, money/business가
// 4개 서브키 조합 어디에서도 문장 뼈대를 공유하면 안 된다.
const FORBIDDEN_PAIRS = [
  ['love', ['solo', 'couple'], 'relationships', ['new', 'existing']],
  ['career', ['jobseek', 'switch'], 'workplace', ['team', 'personal']],
  ['money', ['consumption', 'invest'], 'business', ['startup', 'running']]
];
const SENTENCE_SIMILARITY_THRESHOLD = 0.3;

const collisions = [];
ZODIAC_DATA.forEach(function (zodiac) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const textA = zodiac.categories[catA][subA];
        const textB = zodiac.categories[catB][subB];
        splitSentences(textA).forEach(function (sentA) {
          splitSentences(textB).forEach(function (sentB) {
            const sim = wordJaccard(sentA, sentB);
            if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
              collisions.push(zodiac.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
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

// 오프닝 문장(각 필드의 첫 문장) 전용 보조 스윕: 한국어 교착어 특성상 조사/어미가
// 달라 word-Jaccard로는 안 걸리는 뼈대 공유를 잡기 위해, word-Jaccard와
// character-trigram Jaccard를 "동시에" 만족하는 경우만 충돌로 본다(AND 결합).
// 사주 프로젝트 최종 리뷰에서 이 조합(0.20 AND 0.15)이 잠긴 참조 예시를 오탐하지
// 않으면서 실제 충돌만 잡아낸다는 것을 확인했다.
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;

const openingCollisions = [];
ZODIAC_DATA.forEach(function (zodiac) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(zodiac.categories[catA][subA])[0];
        const openingB = splitSentences(zodiac.categories[catB][subB])[0];
        const wj = wordJaccard(openingA, openingB);
        const tj = trigramJaccard(openingA, openingB);
        if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
          openingCollisions.push(zodiac.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
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

console.log('All zodiac-data tests passed');
