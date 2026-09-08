// 타로/사주/별자리/띠운세/궁합 5개 데이터 테스트 파일에서 중복 정의되던
// 문장 단위 dedup 비교 함수들을 모아둔 공유 헬퍼. 순수 함수는 그대로
// export하고, 파일마다 값이 다른 상수(BOILERPLATE_SUFFIXES/PARTICLES/
// STEM_STOPWORDS)에 의존하는 함수는 factory로 감싸 호출부 동작을 그대로
// 보존한다.

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

function endsWithTerminalPunctuation(s) {
  return /[.!?]$/.test(s.trim());
}

function makeStripBoilerplateSuffix(suffixes) {
  const sorted = suffixes.slice().sort(function (a, b) { return b.length - a.length; });
  return function stripBoilerplateSuffix(s) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < sorted.length; i++) {
        if (s.endsWith(sorted[i])) { s = s.slice(0, -sorted[i].length); changed = true; }
      }
    }
    return s;
  };
}

function makeStem(particles) {
  const sorted = particles.slice().sort(function (a, b) { return b.length - a.length; });
  return function stem(word) {
    let w = word;
    let changed = true;
    while (changed && w.length > 2) {
      changed = false;
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (w.endsWith(p) && w.length - p.length >= 2) { w = w.slice(0, -p.length); changed = true; break; }
      }
    }
    return w;
  };
}

function makeSignificantStems(stemFn, stopwords) {
  return function significantStems(text, keywords) {
    return text.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean)
      .map(function (w) { return stemFn(w); })
      .filter(function (w) { return w.length >= 2 && stopwords.indexOf(w) === -1 && keywords.indexOf(w) === -1; });
  };
}

function makeFullCombinedIssues(stripBoilerplateSuffix, significantStems) {
  const WORD_TH = 0.3, OPEN_WORD_TH = 0.20, OPEN_TRI_TH = 0.15;
  const LCS_TH = 5, STEM_TH = 2, BIGRAM_TH = 0.185;
  return function fullCombinedIssues(s1, s2, keywords) {
    const issues = [];
    const wj = wordJaccard(s1, s2);
    if (wj >= WORD_TH) issues.push('word=' + wj.toFixed(2));
    const tj = trigramJaccard(s1, s2);
    if (wj >= OPEN_WORD_TH && tj >= OPEN_TRI_TH) issues.push('word+tri=' + wj.toFixed(2) + '/' + tj.toFixed(2));
    const kw1 = stripOwnKeywords(s1, keywords), kw2 = stripOwnKeywords(s2, keywords);
    const t1 = stripBoilerplateSuffix(kw1), t2 = stripBoilerplateSuffix(kw2);
    const lcs = longestCommonSubstring(t1, t2);
    const bj = bigramJaccard(t1, t2);
    const st1 = significantStems(s1, keywords), st2 = significantStems(s2, keywords);
    const shared = [...new Set(st1.filter(function (x) { return st2.indexOf(x) !== -1; }))];
    if (lcs >= LCS_TH || shared.length >= STEM_TH || bj >= BIGRAM_TH) {
      issues.push('lcs=' + lcs + ' stems=' + shared.join(',') + ' bigram=' + bj.toFixed(3));
    }
    return issues;
  };
}

function makeEchoIssue(stripForEcho) {
  const WORD_TH = 0.3, ECHO_BIGRAM_TH = 0.30, ECHO_LCS_TH = 10;
  return function echoIssue(s1, s2) {
    const wj = wordJaccard(s1, s2);
    const t1 = stripForEcho(s1), t2 = stripForEcho(s2);
    const bj = bigramJaccard(t1, t2);
    const lcs = longestCommonSubstring(t1, t2);
    if (wj >= WORD_TH || bj >= ECHO_BIGRAM_TH || lcs >= ECHO_LCS_TH) {
      return 'word=' + wj.toFixed(2) + ' bigram=' + bj.toFixed(2) + ' lcs=' + lcs;
    }
    return null;
  };
}

module.exports = {
  splitSentences,
  wordJaccard,
  charTrigrams,
  trigramJaccard,
  stripOwnKeywords,
  longestCommonSubstring,
  charBigramSet,
  bigramJaccard,
  endsWithTerminalPunctuation,
  makeStripBoilerplateSuffix,
  makeStem,
  makeSignificantStems,
  makeFullCombinedIssues,
  makeEchoIssue
};
