const path = require('path');

global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;

const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel, SITE_BASE } = require('./lib/tarot-page-data.js');
const { GUIDES } = require('../data/guides-data.js');
const { writeSitemapXml } = require('./lib/sitemap.js');

const ROOT = path.join(__dirname, '..');

function generateSitemap(options) {
  const opts = options || {};
  const sitemapPath = opts.sitemapPath || path.join(ROOT, 'sitemap.xml');
  const today = opts.today || new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: SITE_BASE, changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_BASE + 'about.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'contact.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'faq.html', changefreq: 'monthly', priority: '0.5' },
    { loc: SITE_BASE + 'legal.html', changefreq: 'yearly', priority: '0.3' },
    { loc: SITE_BASE + 'tarot/index.html', changefreq: 'monthly', priority: '0.7' },
    { loc: SITE_BASE + 'guides/index.html', changefreq: 'monthly', priority: '0.6' }
  ];

  const deck = getFullDeck();
  const viewModels = deck.map(buildCardViewModel);
  const cardUrls = viewModels.map(function (vm) {
    return { loc: SITE_BASE + 'tarot/' + vm.slug + '.html', changefreq: 'monthly', priority: '0.6' };
  });

  const guideUrls = GUIDES.map(function (guide) {
    return { loc: SITE_BASE + 'guides/' + guide.slug + '.html', changefreq: 'monthly', priority: '0.5' };
  });

  writeSitemapXml(staticUrls.concat(cardUrls).concat(guideUrls), sitemapPath, today);
}

if (require.main === module) {
  generateSitemap();
  console.log('Generated sitemap.xml');
}

module.exports = { generateSitemap };
