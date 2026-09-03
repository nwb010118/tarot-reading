const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');
const {
  splitSentences, wordJaccard, charTrigrams, trigramJaccard,
  stripOwnKeywords, longestCommonSubstring, charBigramSet, bigramJaccard,
  makeStripBoilerplateSuffix, makeStem, makeSignificantStems
} = require('./helpers/dedup.js');

const EXPECTED_TIERS = ['same_element', 'complement', 'other', 'samhap', 'yukhap', 'same', 'none', 'chung', 'sangsaeng', 'bihwa', 'sanggeuk'];

assert.strictEqual(Object.keys(COMPAT_TIER_DATA).length, 11, '궁합 등급은 11개여야 함');
assert.deepStrictEqual(Object.keys(COMPAT_TIER_DATA), EXPECTED_TIERS, '기존 등급 순서가 유지되어야 함');

EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  assert.ok(typeof data.score === 'number', tier + '.score 누락');
  assert.ok(typeof data.label === 'string' && data.label.length > 0, tier + '.label 누락');
  assert.ok(typeof data.text === 'string' && data.text.includes('{a}') && data.text.includes('{b}'), tier + '.text에 {a}/{b} 플레이스홀더가 있어야 함');
  assert.ok(Array.isArray(data.keywords) && data.keywords.length === 3, tier + ' keywords must be an array of exactly 3 items');
  assert.ok(typeof data.advice === 'string' && data.advice.length > 0, tier + ' advice must be a non-empty string');

  const sentCount = splitSentences(data.text).length;
  assert.ok(sentCount === 2 || sentCount === 3, tier + '.text must have 2 or 3 sentences, got ' + sentCount);
});

console.log('All 11 compatibility tiers have valid structure (score/label/text placeholders/keywords/advice/sentence-count)');

// ---------------------------------------------------------------------------
// keyword 자기중복 회귀 테스트 (Task 1 fix round 2에서 발견된 결함 유형:
// 한 등급의 keyword 단어가 자기 자신의 text/advice에 그대로 다시 등장하는 경우)
// ---------------------------------------------------------------------------
function normalizeForEcho(s) {
  return s.replace(/\s+/g, '').replace(/[.,!?]/g, '');
}

const keywordSelfEchoes = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const normText = normalizeForEcho(data.text);
  const normAdvice = normalizeForEcho(data.advice);
  data.keywords.forEach(function (kw) {
    const normKw = normalizeForEcho(kw);
    if (normText.includes(normKw)) {
      keywordSelfEchoes.push(tier + ': keyword "' + kw + '" appears in its own text');
    }
    if (normAdvice.includes(normKw)) {
      keywordSelfEchoes.push(tier + ': keyword "' + kw + '" appears in its own advice');
    }
  });
});

assert.strictEqual(keywordSelfEchoes.length, 0,
  'Found ' + keywordSelfEchoes.length + ' keyword self-echoes:\n' + keywordSelfEchoes.join('\n'));

console.log('No tier keyword self-echoes its own text or advice (whitespace/punctuation-normalized)');

// ---------------------------------------------------------------------------
// label 자기중복 회귀 테스트 (final review Finding 2 유형: 한 등급의 keyword가
// 자기 자신의 label에 그대로 등장하는 경우, 예: complement의 keyword "보완"이
// label "보완원소 — 좋은 궁합"의 부분 문자열인 경우). label은 text/advice와도
// 비교한다. 단, 기법명 등 label과 text/advice에 원래 함께 등장해야 하는
// 용어(삼합/육합/상생/상극/비화/충/원소/동일/궁합/최고의/좋은/무난한)는
// 화이트리스트로 제외한 뒤 비교한다.
// ---------------------------------------------------------------------------
const LABEL_ECHO_WHITELIST = ['삼합', '육합', '상생', '상극', '비화', '충', '원소', '동일', '궁합', '최고의', '좋은', '무난한'];
function stripLabelEchoWhitelist(s) {
  let out = s;
  LABEL_ECHO_WHITELIST.forEach(function (w) {
    out = out.split(w).join('');
  });
  return out;
}

const labelEchoIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const strippedLabel = stripLabelEchoWhitelist(normalizeForEcho(data.label));
  const fieldsToCheck = [
    { name: 'text', value: data.text, isKeyword: false },
    { name: 'advice', value: data.advice, isKeyword: false }
  ].concat(data.keywords.map(function (kw) { return { name: 'keyword "' + kw + '"', value: kw, isKeyword: true }; }));

  fieldsToCheck.forEach(function (field) {
    const strippedField = stripLabelEchoWhitelist(normalizeForEcho(field.value));
    if (field.isKeyword) {
      // keyword는 원자적 단위라 라벨에 그대로 포함되는지(부분 문자열)를 직접 검사한다 —
      // LCS>=4는 4자 미만 키워드(이 데이터셋 대부분이 2~3자)를 구조적으로 못 잡는다.
      // 실제로 complement의 "보완"(2자)이 자기 label에 포함됐던 원래 결함이
      // 이 임계값 방식으로는 재현 시 걸리지 않았다.
      if (strippedField.length > 0 && strippedLabel.includes(strippedField)) {
        labelEchoIssues.push(tier + ': label "' + data.label + '" contains its own ' + field.name + ' verbatim');
      }
    } else {
      const lcs = longestCommonSubstring(strippedLabel, strippedField);
      if (lcs >= 4) {
        labelEchoIssues.push(tier + ': label "' + data.label + '" shares a ' + lcs + '+ char substring with its own ' + field.name);
      }
    }
  });
});

assert.strictEqual(labelEchoIssues.length, 0,
  'Found ' + labelEchoIssues.length + ' label self-echo issues:\n' + labelEchoIssues.join('\n'));

console.log('No tier label self-echoes its own text/advice/keywords (excluding whitelisted mechanism terms)');

// ---------------------------------------------------------------------------
// 문장 단위 회귀 테스트: 11개 등급 전체가 서로 문장 뼈대를 공유하지 않는지,
// advice가 자기 자신의 text와 겹치지 않는지 검증한다.
// 이 모드는 "금지쌍" 개념이 없으므로 11개 등급 전체(C(11,2)=55쌍)를 비교한다.
// 모든 등급의 text 첫 문장이 "{a}와(과) {b}은(는) ... 궁합이에요" 템플릿을
// 공유하므로, 비교 전 이 프리픽스를 반드시 제거한다(그렇지 않으면 55쌍 전부가
// 거짓 충돌로 잡힌다).
// ---------------------------------------------------------------------------

const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
}

function splitSentencesForDedup(text) {
  return splitSentences(text).map(stripTemplatePrefix);
}

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);

const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);

const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);

const SENTENCE_SIMILARITY_THRESHOLD = 0.3;
const OPENING_WORD_JACCARD_THRESHOLD = 0.20;
const OPENING_TRIGRAM_JACCARD_THRESHOLD = 0.15;
const LCS_THRESHOLD = 5;
const STEM_OVERLAP_THRESHOLD = 2;
const BIGRAM_JACCARD_THRESHOLD = 0.185;

const collisions = [];
for (let i = 0; i < EXPECTED_TIERS.length; i++) {
  for (let j = i + 1; j < EXPECTED_TIERS.length; j++) {
    const tierA = EXPECTED_TIERS[i], tierB = EXPECTED_TIERS[j];
    const dataA = COMPAT_TIER_DATA[tierA], dataB = COMPAT_TIER_DATA[tierB];
    const sentsA = splitSentencesForDedup(dataA.text);
    const sentsB = splitSentencesForDedup(dataB.text);

    sentsA.forEach(function (sentA) {
      sentsB.forEach(function (sentB) {
        const sim = wordJaccard(sentA, sentB);
        if (sim >= SENTENCE_SIMILARITY_THRESHOLD) {
          collisions.push(tierA + ' <-> ' + tierB + ' (word=' + sim.toFixed(2) + ')\n  ' + sentA + '\n  ' + sentB);
        }
      });
    });

    const openingA = sentsA[0], openingB = sentsB[0];
    const wj = wordJaccard(openingA, openingB);
    const tj = trigramJaccard(openingA, openingB);
    if (wj >= OPENING_WORD_JACCARD_THRESHOLD && tj >= OPENING_TRIGRAM_JACCARD_THRESHOLD) {
      collisions.push(tierA + ' <-> ' + tierB + ' opening (word=' + wj.toFixed(2) + ', trigram=' + tj.toFixed(2) + ')\n  ' + openingA + '\n  ' + openingB);
    }

    const kwStrippedA = stripOwnKeywords(openingA, dataA.keywords);
    const kwStrippedB = stripOwnKeywords(openingB, dataB.keywords);
    const trimmedA = stripBoilerplateSuffix(kwStrippedA);
    const trimmedB = stripBoilerplateSuffix(kwStrippedB);
    const lcs = longestCommonSubstring(trimmedA, trimmedB);
    const stemsA = significantStems(openingA, dataA.keywords);
    const stemsB = significantStems(openingB, dataB.keywords);
    const sharedStems = [...new Set(stemsA.filter(function (s) { return stemsB.indexOf(s) !== -1; }))];
    const bj = bigramJaccard(kwStrippedA, kwStrippedB);
    if (lcs >= LCS_THRESHOLD || sharedStems.length >= STEM_OVERLAP_THRESHOLD || bj >= BIGRAM_JACCARD_THRESHOLD) {
      collisions.push(tierA + ' <-> ' + tierB + ' opening-aux (lcs=' + lcs + ', stems=[' + sharedStems.join(',') + '], bigram=' + bj.toFixed(3) + ')\n  ' + openingA + '\n  ' + openingB);
    }
  }
}

assert.strictEqual(collisions.length, 0,
  'Found ' + collisions.length + ' cross-tier collisions:\n' + collisions.join('\n'));

console.log('No cross-tier sentence/opening collisions among the 11 compatibility tiers');

const selfEchoIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const textSents = splitSentencesForDedup(data.text);
  const advice = data.advice;
  textSents.forEach(function (sent) {
    const wj2 = wordJaccard(advice, sent);
    const kwStrippedAdv = stripOwnKeywords(advice, data.keywords);
    const kwStrippedSent = stripOwnKeywords(sent, data.keywords);
    const bj2 = bigramJaccard(kwStrippedAdv, kwStrippedSent);
    const lcs2 = longestCommonSubstring(stripBoilerplateSuffix(kwStrippedAdv), stripBoilerplateSuffix(kwStrippedSent));
    if (wj2 >= SENTENCE_SIMILARITY_THRESHOLD || bj2 >= BIGRAM_JACCARD_THRESHOLD || lcs2 >= LCS_THRESHOLD) {
      selfEchoIssues.push(tier + ' advice<->text (wj=' + wj2.toFixed(2) + ', bigram=' + bj2.toFixed(3) + ', lcs=' + lcs2 + ')\n  text: ' + sent + '\n  advice: ' + advice);
    }
  });
});

assert.strictEqual(selfEchoIssues.length, 0,
  'Found ' + selfEchoIssues.length + ' advice/text self-echo issues:\n' + selfEchoIssues.join('\n'));

console.log('No tier advice self-echoes its own text');

console.log('All compatibility-data tests passed');

// ---------------------------------------------------------------------------
// score/label 고정값 회귀 테스트 (플랜 Global Constraint #1: "score/label은
// 절대 변경하지 않는다"). same_element만 getCompatTierInfo()를 통해 개별
// 검증되고 있었으므로, 11개 등급 전체의 score/label을 리터럴 테이블로 고정
// 해서 향후 실수로 값이 바뀌면 즉시 실패하도록 한다.
// ---------------------------------------------------------------------------
const LOCKED_SCORE_LABELS = {
  same_element: { score: 90, label: '동일원소 — 최고의 궁합' },
  complement: { score: 82, label: '보완원소 — 좋은 궁합' },
  other: { score: 60, label: '그 외 조합 — 무난한 궁합' },
  samhap: { score: 96, label: '삼합 — 최고의 궁합' },
  yukhap: { score: 86, label: '육합 — 좋은 궁합' },
  same: { score: 74, label: '동일 띠 — 친근한 궁합' },
  none: { score: 62, label: '무관계 — 무난한 궁합' },
  chung: { score: 35, label: '충 — 주의가 필요한 궁합' },
  sangsaeng: { score: 85, label: '상생 — 좋은 궁합' },
  bihwa: { score: 70, label: '비화 — 무난한 궁합' },
  sanggeuk: { score: 45, label: '상극 — 주의가 필요한 궁합' }
};

EXPECTED_TIERS.forEach(function (tier) {
  const expected = LOCKED_SCORE_LABELS[tier];
  const data = COMPAT_TIER_DATA[tier];
  assert.strictEqual(data.score, expected.score, tier + '.score가 잠긴 값에서 변경됨');
  assert.strictEqual(data.label, expected.label, tier + '.label이 잠긴 값에서 변경됨');
});

console.log('All 11 tiers match their locked score/label values');

const info = getCompatTierInfo('same_element', '갑목', '을목');
assert.strictEqual(info.score, 90, 'getCompatTierInfo score 회귀');
assert.strictEqual(info.tierLabel, '동일원소 — 최고의 궁합', 'getCompatTierInfo tierLabel 회귀');
assert.ok(info.text.indexOf('{a}') === -1 && info.text.indexOf('{b}') === -1, 'getCompatTierInfo text는 치환이 끝난 상태여야 함');
assert.ok(info.text.indexOf('갑목') !== -1 && info.text.indexOf('을목') !== -1, 'getCompatTierInfo text에 실제 이름이 들어가야 함');

console.log('getCompatTierInfo() correctly substitutes names and returns unchanged score/tierLabel');
