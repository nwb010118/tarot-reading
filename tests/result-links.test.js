// 결과 맨 아래 "더 알아보기"가 가리키는 가이드 페이지와 FAQ 페이지가 실제로 존재하는지 확인한다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const start = source.indexOf('const RESULT_GUIDE_LINKS = {');
const end = source.indexOf('};', start);
assert.ok(start >= 0 && end > start, 'RESULT_GUIDE_LINKS block');
const slugs = Array.from(source.slice(start, end).matchAll(/\['([a-z0-9-]+)', '/g), function (m) { return m[1]; });
assert.ok(slugs.length >= 10, 'guide links found: ' + slugs.length);
slugs.forEach(function (slug) {
  assert.ok(fs.existsSync(path.join(root, 'guides', slug + '.html')), 'guide page exists: ' + slug);
});
assert.ok(fs.existsSync(path.join(root, 'faq.html')), 'faq page exists');
console.log('result-links ok: ' + slugs.length + ' guide links + faq');
