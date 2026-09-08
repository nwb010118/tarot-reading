const assert = require('assert');
const { COMPAT_TIER_DATA, getCompatTierInfo } = require('../data/compatibility-data.js');
const {
  wordJaccard, trigramJaccard, stripOwnKeywords, longestCommonSubstring,
  bigramJaccard, makeStripBoilerplateSuffix, makeStem, makeSignificantStems,
  endsWithTerminalPunctuation, makeFullCombinedIssues, makeEchoIssue
} = require('./helpers/dedup.js');
const {
  checkPoolSelfCollisions, simpleWordCollision, checkCrossPoolCollisions,
  checkExactMatchCollisions, checkKeywordSelfEcho, checkDanglingClausePool
} = require('./helpers/dedup-axes.js');

const EXPECTED_TIERS = ['same_element', 'complement', 'other', 'samhap', 'yukhap', 'same', 'none', 'chung', 'sangsaeng', 'bihwa', 'sanggeuk'];

assert.strictEqual(Object.keys(COMPAT_TIER_DATA).length, 11, '궁합 등급은 11개여야 함');
assert.deepStrictEqual(Object.keys(COMPAT_TIER_DATA), EXPECTED_TIERS, '기존 등급 순서가 유지되어야 함');

const TEMPLATE_PREFIX = '{a}와(과) {b}은(는) ';
function stripTemplatePrefix(s) {
  return s.startsWith(TEMPLATE_PREFIX) ? s.slice(TEMPLATE_PREFIX.length) : s;
}
function assertPool(field, label) {
  assert.ok(field && typeof field === 'object' && !Array.isArray(field), label + ' must be an {a,b} object');
  ['a', 'b'].forEach(function (slot) {
    assert.ok(Array.isArray(field[slot]) && field[slot].length === 3, label + '.' + slot + ' must be an array of exactly 3 strings');
    field[slot].forEach(function (s, i) {
      assert.ok(typeof s === 'string' && s.length > 0, label + '.' + slot + '[' + i + '] must be a non-empty string');
    });
  });
}

// ---------------------------------------------------------------------------
// 구조 검증
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
  const data = COMPAT_TIER_DATA[tier];
  const locked = LOCKED_SCORE_LABELS[tier];
  assert.strictEqual(data.score, locked.score, tier + '.score가 잠긴 값에서 변경됨');
  assert.strictEqual(data.label, locked.label, tier + '.label이 잠긴 값에서 변경됨');

  assertPool(data.text, tier + '.text');
  data.text.a.forEach(function (s, i) {
    assert.ok(s.indexOf('{a}') !== -1 && s.indexOf('{b}') !== -1, tier + '.text.a[' + i + ']에 {a}/{b}가 각각 있어야 함');
  });
  data.text.b.forEach(function (s, i) {
    assert.ok(s.indexOf('{a}') === -1 && s.indexOf('{b}') === -1, tier + '.text.b[' + i + ']에는 {a}/{b}가 없어야 함');
  });

  assert.ok(Array.isArray(data.keywords) && data.keywords.length === 6, tier + ' keywords must be an array of exactly 6 items');
  assert.strictEqual(new Set(data.keywords).size, 6, tier + ' keywords must all be distinct');
  assert.ok(Array.isArray(data.advice) && data.advice.length === 3, tier + ' advice must be an array of exactly 3 items');
});

console.log('All 11 tiers match locked score/label, have valid a/b pool structure, correct {a}/{b} placeholder placement, 6 keywords, 3 advice variants');

// ---------------------------------------------------------------------------
// 중복 검사 — 공유 dedup-axes 헬퍼로 구현 (2026-09-08 dedup-axes 추출 설계 참고)
// ---------------------------------------------------------------------------

const BOILERPLATE_SUFFIXES = ['궁합이에요', '궁합입니다', '시기입니다', '것입니다', '합니다', '해보세요', '주세요', '두세요', '하세요', '보세요', '세요'];
const stripBoilerplateSuffix = makeStripBoilerplateSuffix(BOILERPLATE_SUFFIXES);
const PARTICLES = ['에게는', '에서', '으로', '에게', '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '도', '만', '로'];
const stem = makeStem(PARTICLES);
const STEM_STOPWORDS = ['시기입니다', '궁합이에요', '궁합입니다', '것입니다', '서로', '관계', '사이', '함께', '다른', '같은'];
const significantStems = makeSignificantStems(stem, STEM_STOPWORDS);
const fullCombinedIssues = makeFullCombinedIssues(stripBoilerplateSuffix, significantStems);

const WORD_TH = 0.3;
const NEARVERBATIM_LCS_TH = 20;
const LABEL_ECHO_WHITELIST = ['삼합', '육합', '상생', '상극', '비화', '충', '원소', '동일', '궁합', '최고의', '좋은', '무난한'];

function normalizeForEcho(s) { return s.replace(/\s+/g, '').replace(/[.,!?]/g, ''); }
function stripWl(s) { let out = s; LABEL_ECHO_WHITELIST.forEach(function (w) { out = out.split(w).join(''); }); return out; }
function stripForEcho(s) { return stripBoilerplateSuffix(normalizeForEcho(s)); }
const echoIssue = makeEchoIssue(stripForEcho);
const simpleWord = simpleWordCollision(wordJaccard, WORD_TH);

// axis 1: 필드 내부 자기중복
const withinFieldCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const cmp = function (s1, s2) { return fullCombinedIssues(s1, s2, data.keywords); };
  withinFieldCollisions.push.apply(withinFieldCollisions, checkPoolSelfCollisions([
    { label: tier + ' text.a', values: data.text.a.map(stripTemplatePrefix) },
    { label: tier + ' text.b', values: data.text.b }
  ], cmp));
});
assert.strictEqual(withinFieldCollisions.length, 0,
  'Found ' + withinFieldCollisions.length + ' within-field pool self-collisions:\n' + withinFieldCollisions.join('\n'));
console.log('No within-field a/b pool self-collisions');

// axis 2: advice 풀 자기중복
const adviceCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  adviceCollisions.push.apply(adviceCollisions, checkPoolSelfCollisions(
    [{ label: tier + ' advice', values: data.advice }], simpleWord
  ));
});
assert.strictEqual(adviceCollisions.length, 0,
  'Found ' + adviceCollisions.length + ' advice-pool self-collisions:\n' + adviceCollisions.join('\n'));
console.log('No advice-pool self-collisions');

// axis 3: advice <-> 자기 text.b풀 echo
const echoCollisions = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  echoCollisions.push.apply(echoCollisions, checkCrossPoolCollisions(
    [{ labelA: tier + ' advice', valuesA: data.advice, labelB: 'text.b', valuesB: data.text.b }],
    echoIssue, null
  ));
});
assert.strictEqual(echoCollisions.length, 0,
  'Found ' + echoCollisions.length + ' advice<->text.b render-together echo collisions:\n' + echoCollisions.join('\n'));
console.log('No advice<->text.b render-together echo collisions');

// axis 4: 티어 간 완전동일 + 근접축자
const occurrences = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      const key = slot === 'a' ? stripTemplatePrefix(s) : s;
      occurrences.push({ value: key, where: tier + '.text.' + slot + '[' + idx + ']', locked: idx === 0 });
    });
  });
});
const exactCollisions = checkExactMatchCollisions(occurrences);
assert.strictEqual(exactCollisions.length, 0,
  'Found ' + exactCollisions.length + ' cross-tier exact-match collisions:\n' + exactCollisions.join('\n'));
console.log('No cross-tier exact-match collisions');

const nearVerbatimCollisions = [];
const lcsCmp = function (s1, s2) {
  const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
  const lcs = longestCommonSubstring(t1, t2);
  return lcs >= NEARVERBATIM_LCS_TH ? 'lcs=' + lcs : null;
};
for (let i = 0; i < EXPECTED_TIERS.length; i++) {
  for (let j = i + 1; j < EXPECTED_TIERS.length; j++) {
    const d1 = COMPAT_TIER_DATA[EXPECTED_TIERS[i]], d2 = COMPAT_TIER_DATA[EXPECTED_TIERS[j]];
    ['a', 'b'].forEach(function (slot) {
      const pool1 = slot === 'a' ? d1.text.a.map(stripTemplatePrefix) : d1.text.b;
      const pool2 = slot === 'a' ? d2.text.a.map(stripTemplatePrefix) : d2.text.b;
      nearVerbatimCollisions.push.apply(nearVerbatimCollisions, checkCrossPoolCollisions(
        [{ labelA: EXPECTED_TIERS[i] + '.' + slot, valuesA: pool1, labelB: EXPECTED_TIERS[j] + '.' + slot, valuesB: pool2 }],
        lcsCmp, function (x, y) { return x === 0 && y === 0; }
      ));
    });
  }
}
assert.strictEqual(nearVerbatimCollisions.length, 0,
  'Found ' + nearVerbatimCollisions.length + ' cross-tier near-verbatim collisions:\n' + nearVerbatimCollisions.join('\n'));
console.log('No cross-tier near-verbatim collisions');

// axis 5: keyword 자기중복
const keywordSelfEchoes = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const ownPool = data.text.a.map(stripTemplatePrefix).concat(data.text.b).concat(data.advice);
  const keywordEntries = data.keywords.map(function (kw) { return { value: kw, locked: false }; });
  const textEntries = ownPool.map(function (s, idx) { return { value: s, locked: false, idx: idx }; });
  const matches = checkKeywordSelfEcho(keywordEntries, textEntries, normalizeForEcho, null);
  matches.forEach(function (m) {
    keywordSelfEchoes.push(tier + ': keyword "' + m.keyword.value + '" appears in its own pool[' + m.text.idx + ']: ' + m.text.value);
  });
});
assert.strictEqual(keywordSelfEchoes.length, 0,
  'Found ' + keywordSelfEchoes.length + ' keyword self-echoes:\n' + keywordSelfEchoes.join('\n'));
console.log('No tier keyword self-echoes its own text/advice pool');

// axis 6: label 자기중복
const labelEchoIssues = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  const strippedLabel = stripWl(normalizeForEcho(data.label));
  const ownPool = data.text.a.map(stripTemplatePrefix).concat(data.text.b).concat(data.advice);
  ownPool.forEach(function (s, idx) {
    const lcs = longestCommonSubstring(strippedLabel, stripWl(normalizeForEcho(s)));
    if (lcs >= 4) labelEchoIssues.push(tier + ': label "' + data.label + '" shares a ' + lcs + '+ char substring with pool[' + idx + ']: ' + s);
  });
  data.keywords.forEach(function (kw) {
    const strippedKw = stripWl(normalizeForEcho(kw));
    if (strippedKw.length > 0 && strippedLabel.indexOf(strippedKw) !== -1) labelEchoIssues.push(tier + ': label "' + data.label + '" contains its own keyword "' + kw + '" verbatim');
  });
});
assert.strictEqual(labelEchoIssues.length, 0,
  'Found ' + labelEchoIssues.length + ' label self-echo issues:\n' + labelEchoIssues.join('\n'));
console.log('No tier label self-echoes its own text/advice/keywords (excluding whitelisted mechanism terms)');

// axis 7: 조합 문법 검증 — 잠긴 원본(text.a[0]/text.b[0])이 완결되지 않은 절로 끝나면,
// 렌더링 시 무작위로 붙는 형제 문장과 조합했을 때 비문이 될 수 있다 (2026-09-08 설계 참고)
const KNOWN_DANGLING_CLAUSE_LOCKED = [
  // 현재 없음
];
const danglingExceptionKey = function (e) { return e.tier + '|' + e.slot; };
const danglingExceptionKeySet = new Set(KNOWN_DANGLING_CLAUSE_LOCKED.map(danglingExceptionKey));
const danglingEntries = [];
EXPECTED_TIERS.forEach(function (tier) {
  const data = COMPAT_TIER_DATA[tier];
  ['a', 'b'].forEach(function (slot) {
    data.text[slot].forEach(function (s, idx) {
      danglingEntries.push({
        label: tier + ' text.' + slot + '[' + idx + ']', value: s, idx: idx,
        exceptionKey: danglingExceptionKey({ tier: tier, slot: slot })
      });
    });
  });
});
const danglingResult = checkDanglingClausePool(danglingEntries, endsWithTerminalPunctuation, danglingExceptionKeySet);
assert.strictEqual(danglingResult.issues.length, 0,
  'Found ' + danglingResult.issues.length + ' dangling-clause pool entries (would render a broken sentence when combined with a sibling variant):\n' + danglingResult.issues.join('\n'));
console.log('No dangling-clause pool entries (all text.a[0..2]/text.b[0..2] end with terminal punctuation, aside from known exceptions)');
const staleDanglingClauseExceptions = KNOWN_DANGLING_CLAUSE_LOCKED.filter(function (e) { return !danglingResult.usedExceptionKeys.has(danglingExceptionKey(e)); });
assert.strictEqual(staleDanglingClauseExceptions.length, 0,
  'Found ' + staleDanglingClauseExceptions.length + ' stale dangling-clause exception(s) that no longer suppress any violation (safe to remove): ' + JSON.stringify(staleDanglingClauseExceptions));

// ---------------------------------------------------------------------------
// getCompatTierInfo() 회귀 확인
// ---------------------------------------------------------------------------

const info = getCompatTierInfo('same_element', '갑목', '을목');
assert.strictEqual(info.score, 90, 'getCompatTierInfo score 회귀');
assert.strictEqual(info.tierLabel, '동일원소 — 최고의 궁합', 'getCompatTierInfo tierLabel 회귀');
assert.ok(info.text.indexOf('{a}') === -1 && info.text.indexOf('{b}') === -1, 'getCompatTierInfo text는 치환이 끝난 상태여야 함');
assert.ok(info.text.indexOf('갑목') !== -1 && info.text.indexOf('을목') !== -1, 'getCompatTierInfo text에 실제 이름이 들어가야 함');
assert.ok(Array.isArray(info.keywords) && info.keywords.length === 6, 'getCompatTierInfo keywords는 6개 풀 그대로 전달돼야 함');
assert.ok(Array.isArray(info.advice) && info.advice.length === 3, 'getCompatTierInfo advice는 3개 풀 그대로 전달돼야 함');

console.log('getCompatTierInfo() correctly substitutes names, returns unchanged score/tierLabel, and passes keywords/advice pools through unresolved');

console.log('All compatibility-data tests passed');
