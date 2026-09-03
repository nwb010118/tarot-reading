const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');

const EXPECTED_TIERS = ['same_element', 'complement', 'other', 'samhap', 'yukhap', 'same', 'none', 'chung', 'sangsaeng', 'bihwa', 'sanggeuk'];

assert.strictEqual(Object.keys(COMPAT_TIER_DATA).length, 11, '궁합 등급은 11개여야 함');
assert.deepStrictEqual(Object.keys(COMPAT_TIER_DATA), EXPECTED_TIERS, '기존 등급 순서가 유지되어야 함');

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

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
const keywordSelfEchoes = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  data.keywords.forEach(function (kw) {
    if (data.text.includes(kw)) {
      keywordSelfEchoes.push(tier + ': keyword "' + kw + '" appears in its own text');
    }
    if (data.advice.includes(kw)) {
      keywordSelfEchoes.push(tier + ': keyword "' + kw + '" appears in its own advice');
    }
  });
});

assert.strictEqual(keywordSelfEchoes.length, 0,
  'Found ' + keywordSelfEchoes.length + ' keyword self-echoes:\n' + keywordSelfEchoes.join('\n'));

console.log('No tier keyword self-echoes its own text or advice');

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

function wordJaccard(a, b) {
  const setA = new Set(a.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const setB = new Set(b.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean));
  const inter = [...setA].filter(function (x) { return setB.has(x); }).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

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

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다'];
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

const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
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

const info = getCompatTierInfo('same_element', '갑목', '을목');
assert.strictEqual(info.score, 90, 'getCompatTierInfo score 회귀');
assert.strictEqual(info.tierLabel, '동일원소 — 최고의 궁합', 'getCompatTierInfo tierLabel 회귀');
assert.ok(info.text.indexOf('{a}') === -1 && info.text.indexOf('{b}') === -1, 'getCompatTierInfo text는 치환이 끝난 상태여야 함');
assert.ok(info.text.indexOf('갑목') !== -1 && info.text.indexOf('을목') !== -1, 'getCompatTierInfo text에 실제 이름이 들어가야 함');

console.log('getCompatTierInfo() correctly substitutes names and returns unchanged score/tierLabel');
