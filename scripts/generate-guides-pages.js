const fs = require('fs');
const path = require('path');

const { GUIDES } = require('../data/guides-data.js');
const { renderGuidePage, renderGuidesIndexPage } = require('./lib/render-guides-pages.js');

const ROOT = path.join(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'guides');

function generate(options) {
  const opts = options || {};
  const guidesDir = opts.guidesDir || GUIDES_DIR;

  if (!fs.existsSync(guidesDir)) fs.mkdirSync(guidesDir, { recursive: true });

  GUIDES.forEach(function (guide) {
    const categoryGuides = GUIDES.filter(function (g) { return g.category === guide.category; });
    const html = renderGuidePage(guide, categoryGuides);
    fs.writeFileSync(path.join(guidesDir, guide.slug + '.html'), html, 'utf8');
  });

  const indexHtml = renderGuidesIndexPage(GUIDES);
  fs.writeFileSync(path.join(guidesDir, 'index.html'), indexHtml, 'utf8');
}

if (require.main === module) {
  generate();
  console.log('Generated ' + GUIDES.length + ' guide pages + 1 index page');
}

module.exports = { generate };
