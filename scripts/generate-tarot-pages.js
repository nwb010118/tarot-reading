const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE, slugify } = require('./lib/tarot-page-data.js');
const { renderCardPage, renderHubPage } = require('./lib/render-tarot-pages.js');

const ROOT = path.join(__dirname, '..');
const TAROT_DIR = path.join(ROOT, 'tarot');

function buildNavFor(index, viewModels) {
  const total = viewModels.length;
  const prev = viewModels[(index - 1 + total) % total];
  const next = viewModels[(index + 1) % total];
  const current = viewModels[index];
  const suitLinks = viewModels
    .filter(function (vm) { return vm.suitKey === current.suitKey; })
    .map(function (vm) {
      return { href: vm.slug + '.html', label: vm.name, isCurrent: vm.slug === current.slug };
    });

  return {
    prevHref: prev.slug + '.html', prevLabel: prev.name,
    nextHref: next.slug + '.html', nextLabel: next.name,
    suitLinks: suitLinks
  };
}

function generate(options) {
  const opts = options || {};
  const tarotDir = opts.tarotDir || TAROT_DIR;

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);

  if (!fs.existsSync(tarotDir)) fs.mkdirSync(tarotDir, { recursive: true });

  viewModels.forEach(function (vm, index) {
    const nav = buildNavFor(index, viewModels);
    const html = renderCardPage(vm, nav);
    fs.writeFileSync(path.join(tarotDir, vm.slug + '.html'), html, 'utf8');
  });

  const hubHtml = renderHubPage(viewModels, SITE_BASE + 'tarot/index.html');
  fs.writeFileSync(path.join(tarotDir, 'index.html'), hubHtml, 'utf8');

  writeSlugMap(deck, opts.slugMapPath || path.join(ROOT, 'data', 'tarot-slugs.js'));
}

function writeSlugMap(deck, slugMapPath) {
  const entries = deck.map(function (card) {
    return '  ' + JSON.stringify(card.cardId) + ': ' + JSON.stringify(slugify(card));
  });
  const js = '// 이 파일은 scripts/generate-tarot-pages.js가 자동 생성합니다. 직접 수정하지 마세요.\n' +
    'const TAROT_SLUGS = {\n' + entries.join(',\n') + '\n};\n\n' +
    'if (typeof module !== \'undefined\' && module.exports) {\n' +
    '  module.exports = { TAROT_SLUGS };\n' +
    '}\n';
  fs.writeFileSync(slugMapPath, js, 'utf8');
}

if (require.main === module) {
  generate();
  console.log('Generated 78 tarot card pages + 1 hub page');
}

module.exports = { generate };
