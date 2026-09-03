// tests/*.test.js를 순서대로 실행하고 결과를 요약하는 러너.
// 각 테스트 파일은 외부 프레임워크 없이 node의 assert만 사용하므로,
// 여기서도 별도 의존성 없이 child_process로 하나씩 돌린다.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, '..', 'tests');
const files = fs.readdirSync(testsDir)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort();

let failed = 0;

files.forEach(function (file) {
  const fullPath = path.join(testsDir, file);
  const result = spawnSync(process.execPath, [fullPath], { encoding: 'utf8' });

  if (result.status === 0) {
    console.log('PASS  ' + file);
  } else {
    failed++;
    console.log('FAIL  ' + file);
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  }
});

console.log('');
console.log(files.length + ' test files, ' + (files.length - failed) + ' passed, ' + failed + ' failed');

if (failed > 0) {
  process.exit(1);
}
