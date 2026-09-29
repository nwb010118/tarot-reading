const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { bumpCacheVersion } = require('../scripts/bump-cache-version.js');

function hash(content) {
  return crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-version-test-'));
fs.mkdirSync(path.join(tmpDir, 'css'));
fs.mkdirSync(path.join(tmpDir, 'js'));

const cssContent = 'body { color: red; }';
const jsContent = 'console.log("hi");';
fs.writeFileSync(path.join(tmpDir, 'css', 'style.css'), cssContent);
fs.writeFileSync(path.join(tmpDir, 'js', 'app.js'), jsContent);

// 실제 index.html의 구글 애드센스 줄과 동일한 형태(여러 줄에 걸친 태그, 자체 쿼리스트링 보유,
// .js로 끝나서 로컬 파일 정규식과 우연히 매치될 수 있는 위험한 케이스).
const adsenseLine = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"\n     crossorigin="anonymous"></script>';

const htmlPath = path.join(tmpDir, 'index.html');
const originalHtml = '<!DOCTYPE html>\n<html><head>\n' +
  adsenseLine + '\n' +
  '<link rel="icon" href="images/moon-mark.svg">\n' +
  '<link rel="stylesheet" href="css/style.css?v=oldstale1">\n' +
  '</head><body>\n' +
  '<script src="js/app.js"></script>\n' +
  '</body></html>\n';
fs.writeFileSync(htmlPath, originalHtml);

const updated = bumpCacheVersion({ htmlPath: htmlPath });

// 로컬 파일에 정확한 해시가 붙음(기존 ?v=가 있든 없든)
assert.ok(updated.includes('href="css/style.css?v=' + hash(cssContent) + '"'), 'css must get content hash, replacing any stale version');
assert.ok(updated.includes('src="js/app.js?v=' + hash(jsContent) + '"'), 'js must get content hash');
assert.ok(!updated.includes('oldstale1'), 'stale version string must be gone');

// css/js가 아닌 로컬 링크(아이콘)는 건드리지 않음
assert.ok(updated.includes('<link rel="icon" href="images/moon-mark.svg">'), 'non-css/js local links must be untouched');

// 외부 스크립트(애드센스)는 완전히 그대로 보존 - 가장 중요한 회귀 검증
assert.ok(updated.includes(adsenseLine), 'external adsense script line must be byte-for-byte unchanged');

// 파일에 실제로 기록됨
const written = fs.readFileSync(htmlPath, 'utf8');
assert.strictEqual(written, updated, 'the file on disk must match the returned html');

// 파일 내용을 바꾸면 그 파일의 해시만 바뀌고 다른 파일은 그대로
fs.writeFileSync(path.join(tmpDir, 'js', 'app.js'), jsContent + '\nconsole.log("changed");');
const afterChange = bumpCacheVersion({ htmlPath: htmlPath });
assert.ok(afterChange.includes('href="css/style.css?v=' + hash(cssContent) + '"'), 'unrelated css hash must stay the same');
assert.ok(!afterChange.includes('src="js/app.js?v=' + hash(jsContent) + '"'), 'changed js must get a new hash');

// 멱등성: 파일이 안 바뀌었으면 다시 돌려도 결과가 완전히 같음
const rerun = bumpCacheVersion({ htmlPath: htmlPath });
assert.strictEqual(rerun, afterChange, 'running again with unchanged files must produce identical output');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('bump-cache-version.test.js: all assertions passed');
