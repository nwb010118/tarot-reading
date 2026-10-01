// 이름이 바뀐 궁합 가이드의 옛 주소가 새 글로 연결되는 안내 페이지를 유지하는지, 그리고 사이트맵에는 넣지 않았는지 확인한다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const old = fs.readFileSync(path.join(root, 'guides', 'compatibility-score-guide.html'), 'utf8');
assert.ok(old.includes('url=compatibility-type-guide.html'), 'meta refresh to the new guide');
assert.ok(old.includes('href="compatibility-type-guide.html"'), 'plain link to the new guide');
assert.ok(old.includes('<link rel="canonical" href="https://nwb010118.github.io/tarot-reading/guides/compatibility-type-guide.html">'), 'canonical points to the new guide');
assert.ok(/<meta name="robots" content="noindex/.test(old), 'redirect page is not indexed');
assert.ok(fs.existsSync(path.join(root, 'guides', 'compatibility-type-guide.html')), 'new guide exists');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(!sitemap.includes('compatibility-score-guide'), 'old address is not in the sitemap');
console.log('old-guide-redirect ok');
