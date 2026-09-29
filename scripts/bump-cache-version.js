const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

// href="path.css" 또는 src="path.js" 형태를 찾는다. 기존 ?v=... 쿼리가 있든 없든
// 확장자 앞부분(기본 경로)만 캡처하고, 있다면 쿼리스트링은 버린다.
const ASSET_ATTR_RE = /(href|src)="([^"?]+\.(?:css|js))(?:\?[^"]*)?"/g;

function isExternal(assetPath) {
  return /^(?:[a-z]+:)?\/\//i.test(assetPath);
}

// htmlPath(기본 index.html) 안의 로컬 CSS/JS 링크에 파일 내용 해시 기반 ?v= 쿼리를 붙인다.
// 외부 URL(예: 구글 애드센스 스크립트)은 절대 건드리지 않는다.
function bumpCacheVersion(options) {
  const opts = options || {};
  const htmlPath = opts.htmlPath || path.join(ROOT, 'index.html');
  const baseDir = path.dirname(htmlPath);
  const html = fs.readFileSync(htmlPath, 'utf8');

  const updated = html.replace(ASSET_ATTR_RE, function (match, attr, assetPath) {
    if (isExternal(assetPath)) return match;
    const filePath = path.join(baseDir, assetPath);
    const content = fs.readFileSync(filePath);
    const version = crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
    return attr + '="' + assetPath + '?v=' + version + '"';
  });

  fs.writeFileSync(htmlPath, updated);
  return updated;
}

if (require.main === module) {
  bumpCacheVersion();
  console.log('Updated cache-busting versions in index.html');
}

module.exports = { bumpCacheVersion };
