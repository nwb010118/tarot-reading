// 5개 데이터 테스트 파일(ddi/zodiac/saju/compatibility/tarot)에 근접 중복되던
// "배열 안/배열 간 비교 루프 + 메시지 포맷 + push" 패턴을 모아둔 공유 헬퍼.
// 엔티티 순회(allFieldsOf 등)와 파일별 skip 규칙은 각 파일에 그대로 남기고,
// 순수 비교 루프만 이곳에서 재사용한다. (2026-09-08 dedup-axes 추출 설계 참고)

function checkPoolSelfCollisions(entries, comparatorFn) {
  const issues = [];
  entries.forEach(function (entry) {
    const pool = entry.values;
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const found = comparatorFn(pool[i], pool[j]);
        if (found && found.length) {
          issues.push(entry.label + '[' + i + ',' + j + '] (' + found.join(' | ') + ')\n  ' + pool[i] + '\n  ' + pool[j]);
        }
      }
    }
  });
  return issues;
}

function simpleWordCollision(wordJaccardFn, threshold) {
  return function (s1, s2) {
    const wj = wordJaccardFn(s1, s2);
    return wj >= threshold ? ['word=' + wj.toFixed(2)] : [];
  };
}

function checkCrossPoolCollisions(pairs, comparatorFn, skipFn) {
  const issues = [];
  pairs.forEach(function (pair) {
    pair.valuesA.forEach(function (sA, i) {
      pair.valuesB.forEach(function (sB, j) {
        if (skipFn && skipFn(i, j)) return;
        const found = comparatorFn(sA, sB);
        if (found) {
          issues.push(pair.labelA + '[' + i + ']' + ' <-> ' + pair.labelB + '[' + j + ']' + ' (' + found + ')\n  ' + sA + '\n  ' + sB);
        }
      });
    });
  });
  return issues;
}

function checkExactMatchCollisions(occurrences) {
  const map = new Map();
  occurrences.forEach(function (o) {
    if (!map.has(o.value)) map.set(o.value, []);
    map.get(o.value).push({ where: o.where, locked: o.locked });
  });
  const issues = [];
  map.forEach(function (occ, value) {
    if (occ.length > 1 && occ.some(function (o) { return !o.locked; })) {
      issues.push('"' + value + '" appears in: ' + occ.map(function (o) { return o.where; }).join(' | '));
    }
  });
  return issues;
}

function checkKeywordSelfEcho(keywordEntries, textEntries, normalizeFn, skipFn) {
  const matches = [];
  keywordEntries.forEach(function (kw) {
    const nk = normalizeFn(kw.value);
    textEntries.forEach(function (t) {
      if (skipFn && skipFn(kw, t)) return;
      if (normalizeFn(t.value).indexOf(nk) !== -1) matches.push({ keyword: kw, text: t });
    });
  });
  return matches;
}

function checkDanglingClausePool(entries, endsWithTerminalPunctuation, exceptionKeySet) {
  const issues = [];
  const used = new Set();
  entries.forEach(function (e) {
    if (endsWithTerminalPunctuation(e.value)) return;
    if (e.idx === 0 && exceptionKeySet.has(e.exceptionKey)) { used.add(e.exceptionKey); return; }
    issues.push(e.label + ' (locked=' + (e.idx === 0) + ') does not end with terminal punctuation: ' + e.value);
  });
  return { issues: issues, usedExceptionKeys: used };
}

module.exports = {
  checkPoolSelfCollisions,
  simpleWordCollision,
  checkCrossPoolCollisions,
  checkExactMatchCollisions,
  checkKeywordSelfEcho,
  checkDanglingClausePool
};
