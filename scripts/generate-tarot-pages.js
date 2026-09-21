const fs = require('fs');
const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
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
  const sitemapPath = opts.sitemapPath || path.join(ROOT, 'sitemap.xml');
  const today = opts.today || new Date().toISOString().slice(0, 10);

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

  writeSitemap(viewModels, sitemapPath, today);
}

function writeSitemap(viewModels, sitemapPath, today) {
  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' }
  ];
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });

  const urlsXml = staticUrls.concat(cardUrls).map(function (u) {
    return '  <url>\n' +
      '    <loc>' + u.loc + '</loc>\n' +
      '    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>' + u.changefreq + '</changefreq>\n' +
      '    <priority>' + u.priority + '</priority>\n' +
      '  </url>';
  }).join('\n');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urlsXml + '\n' +
    '</urlset>\n';

  fs.writeFileSync(sitemapPath, xml, 'utf8');
}

if (require.main === module) {
  generate();
  console.log('Generated 78 tarot card pages + 1 hub page + sitemap.xml');
}

module.exports = { generate };
