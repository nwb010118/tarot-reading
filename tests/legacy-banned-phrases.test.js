// 기존 대형 데이터(타로·띠·별자리·사주·궁합 본문)에도 상투어·단정 표현 금지 목록을 적용한다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { findLegacyViolations } = require('./helpers/banned-phrases.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
// 가이드 글, 달력 표, 파일명·라벨 모음은 본문이 아니다. 합본 파일은 개별 파일에서 이미 검사한다.
const SKIP = /^(lunar-table|tarot-slugs|category-labels|guides-|tarot-data\.js$|tarot-onecard\.js$)/;
const files = fs.readdirSync(DATA_DIR).filter(function (f) { return /\.js$/.test(f) && !SKIP.test(f); });
assert.ok(files.length >= 20, 'data files found: ' + files.length);

const problems = [];
let checked = 0;
function walk(value, file, trail) {
  if (typeof value === 'string') {
    checked += 1;
    findLegacyViolations(value).forEach(function (p) { problems.push(file + trail + ' [' + p + '] ' + value); });
  } else if (Array.isArray(value)) {
    value.forEach(function (v, i) { walk(v, file, trail + '[' + i + ']'); });
  } else if (value && typeof value === 'object') {
    Object.keys(value).forEach(function (k) { walk(value[k], file, trail + '.' + k); });
  }
}
files.forEach(function (f) { walk(require(path.join(DATA_DIR, f)), f, ''); });

assert.ok(checked > 20000, 'scanned strings: ' + checked);
if (problems.length) {
  console.error(problems.length + ' banned phrases in existing data:\n' + problems.slice(0, 40).join('\n'));
  process.exit(1);
}
console.log('OK legacy-banned-phrases: ' + checked + ' strings in ' + files.length + ' files');
