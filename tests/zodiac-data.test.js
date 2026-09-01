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

// ---------------------------------------------------------------------------
// 세 번째 보조 스윕: character-bigram Jaccard + 유의미 어간(stem) 중복 개수 +
// LCS(최장 공통 부분문자열)를 OR로 결합한 검사.
//
// 최종 전수 리뷰에서 word+trigram 조합 스윕(0.20 AND 0.15)조차 놓친 4건의
// 오프닝 문장 뼈대 충돌이 보고됐다(예: "세심하게 챙기" 같은 6글자 연속 어근
// 공유, "기존...새로운...하는 시기입니다" 같은 산발적 두 단어 스켈레톤,
// "상대/한번/깊은" 같은 약한 신호가 겹겹이 쌓이는 경우). 이런 경우들은
// AND 결합 방식으로는 두 지표 중 하나가 문턱값에 못 미쳐 빠져나간다.
// 그래서 이번에는 세 지표를 OR로 묶어 하나라도 강하게 반응하면 충돌로 본다:
//   (a) LCS >= 5  : 어미/조사만 다르고 나머지가 그대로 이어지는 긴 어근 공유
//   (b) 공유 유의어간 개수 >= 2 : 서로 다른 위치에 흩어진 두 개 이상의 실질
//       내용어(명사/부사 등)가 동시에 겹치는 "스켈레톤 템플릿" 공유
//   (c) 문자 bigram Jaccard >= 0.185 : 위 두 지표가 개별적으로는 문턱을
//       못 넘지만 전체적으로 표현이 크게 겹치는 경우의 보완 신호
//
// 양자리는 잠긴 참조본이라 그대로 두되, 자기 자신의 keywords(예: 양자리의
// "추진력")가 career.jobseek/workplace.personal처럼 여러 필드에 의도적으로
// 반복되는 것은 실제 "우연한 뼈대 충돌"이 아니라 그 별자리의 정체성을 드러
// 내려는 의도된 트레잇 echo다. 그래서 비교 전에 각 별자리 자신의 keywords
// 문자열을 두 문장에서 제거한 뒤 세 지표를 계산해, 의도된 키워드 반복을
// 오탐으로 잡지 않도록 한다.
//
// 아래 상수로 실행하면(스크래치패드에서 수동 검증한 결과):
//   - 수정 전 데이터에 대해 실행 시 I-1의 4건(처녀자리 love.couple/love.solo
//     <-> relationships.existing, 전갈자리 love.solo <-> relationships.new,
//     물병자리 career.switch <-> workplace.team)을 모두 잡아낸다.
//   - 양자리(잠긴 참조본)는 keywords 제외 처리 덕분에 오탐 0건.
//   - 수정 후 데이터에 대해서는 전체 0건.
const BOILERPLATE_SUFFIXES = ['시기입니다', '것입니다', '합니다'];
function stripBoilerplateSuffix(s) {
  const sorted = BOILERPLATE_SUFFIXES.slice().sort(function (a, b) { return b.length - a.length; });
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < sorted.length; i++) {
      if (s.endsWith(sorted[i])) { s = s.slice(0, -sorted[i].length); changed = true; }
    }
  }
  return s;
}

function stripOwnKeywords(text, keywords) {
  let s = text.replace(/\s+/g, '').replace(/[.,!?]/g, '');
  keywords.forEach(function (kw) { s = s.split(kw).join(''); });
  return s;
}

function longestCommonSubstring(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = new Array(b.length + 1).fill(0);
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > max) max = cur[j];
      }
    }
    prev = cur;
  }
  return max;
}

// 조사/약한 어미를 벗겨 "상대를"/"상대의" 같은 교착어 변이를 같은 어간으로
// 수렴시키는 아주 단순한 stemmer. 완전한 형태소 분석기는 아니지만, 명사에
// 흔히 붙는 조사 목록만 반복적으로 제거해도 이번 리뷰가 지적한 사례들을
// 잡아내기에는 충분하다.
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const PARTICLES_SORTED = PARTICLES.slice().sort(function (a, b) { return b.length - a.length; });
function stem(word) {
  let w = word;
  let changed = true;
  while (changed && w.length > 2) {
    changed = false;
    for (let i = 0; i < PARTICLES_SORTED.length; i++) {
      const p = PARTICLES_SORTED[i];
      if (w.endsWith(p) && w.length - p.length >= 2) { w = w.slice(0, -p.length); changed = true; break; }
    }
  }
  return w;
}

const STEM_STOPWORDS = ['시기입니다', '시기입니다.', '것입니다'];
function significantStems(text, keywords) {
  return text.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean)
    .map(function (w) { return stem(w); })
    .filter(function (w) { return w.length >= 2 && STEM_STOPWORDS.indexOf(w) === -1 && keywords.indexOf(w) === -1; });
}

function charBigramSet(s) {
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  return grams;
}

function bigramJaccard(a, b) {
  const setA = charBigramSet(a), setB = charBigramSet(b);
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

const bigramLcsCollisions = [];
ZODIAC_DATA.forEach(function (zodiac) {
  FORBIDDEN_PAIRS.forEach(function (pair) {
    const catA = pair[0], subsA = pair[1], catB = pair[2], subsB = pair[3];
    subsA.forEach(function (subA) {
      subsB.forEach(function (subB) {
        const openingA = splitSentences(zodiac.categories[catA][subA])[0];
        const openingB = splitSentences(zodiac.categories[catB][subB])[0];

        const kwStrippedA = stripOwnKeywords(openingA, zodiac.keywords);
        const kwStrippedB = stripOwnKeywords(openingB, zodiac.keywords);
        const trimmedA = stripBoilerplateSuffix(kwStrippedA);
        const trimmedB = stripBoilerplateSuffix(kwStrippedB);
        const lcs = longestCommonSubstring(trimmedA, trimmedB);

        const stemsA = significantStems(openingA, zodiac.keywords);
        const stemsB = significantStems(openingB, zodiac.keywords);
        const sharedStems = [...new Set(stemsA.filter(function (s) { return stemsB.indexOf(s) !== -1; }))];

        const bj = bigramJaccard(kwStrippedA, kwStrippedB);

        if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
          bigramLcsCollisions.push(zodiac.name_kr + ' ' + catA + '.' + subA + ' <-> ' + catB + '.' + subB +
            ' (lcs=' + lcs + ', sharedStems=[' + sharedStems.join(',') + '], bigramJaccard=' + bj.toFixed(3) + ')\n  ' +
            openingA + '\n  ' + openingB);
        }
      });
    });
  });
});

assert.strictEqual(bigramLcsCollisions.length, 0,
  'Found ' + bigramLcsCollisions.length + ' forbidden-pair opening-sentence collisions via bigram/LCS/stem-overlap sweep:\n' +
  bigramLcsCollisions.join('\n'));

console.log('No forbidden-pair opening-sentence collisions (bigram/LCS/stem-overlap sweep)');

console.log('All zodiac-data tests passed');
