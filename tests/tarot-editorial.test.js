const assert = require('assert');
global.TAROT_MAJOR_ARCANA = require('../data/tarot-data-major.js').TAROT_MAJOR_ARCANA;
global.TAROT_WANDS = require('../data/tarot-data-wands.js').TAROT_WANDS;
global.TAROT_CUPS = require('../data/tarot-data-cups.js').TAROT_CUPS;
global.TAROT_SWORDS = require('../data/tarot-data-swords.js').TAROT_SWORDS;
global.TAROT_PENTACLES = require('../data/tarot-data-pentacles.js').TAROT_PENTACLES;
const { getFullDeck } = require('../data/tarot-data.js');
const { buildCardViewModel } = require('../scripts/lib/tarot-page-data.js');
const { renderCardPage } = require('../scripts/lib/render-tarot-pages.js');
const scenes = new Set();
getFullDeck().forEach(card => {
  const vm = buildCardViewModel(card);
  assert.ok(vm.editorial, card.cardId + ': missing editorial content');
  ['scene', 'interpretation', 'reversed', 'practice'].forEach(key => {
    assert.ok(vm.editorial[key] && vm.editorial[key].length > 15, card.cardId + ': ' + key);
  });
  assert.ok(vm.editorial.question.endsWith('?'), card.cardId + ': usable example question');
  assert.ok(!scenes.has(vm.editorial.scene), 'card-specific scenes must not repeat');
  scenes.add(vm.editorial.scene);
  const html = renderCardPage(vm, { prevHref: 'index.html', prevLabel: '목록', nextHref: 'index.html', nextLabel: '목록', suitLinks: [] });
  assert.ok(html.includes(vm.editorial.scene));
  assert.ok(html.includes(vm.editorial.practice));
  assert.ok(html.includes('commons.wikimedia.org/wiki/File:'));
  assert.ok(html.indexOf('그림에서 읽는 상징') < html.indexOf('class="orientation-block"'));
  assert.ok(!/undefined|\[object Object\]/.test(html));
});
const pentacle = buildCardViewModel(getFullDeck().find(c => c.cardId === 'pentacles_Ace'));
assert.ok(pentacle.imageSourceUrl.endsWith('Pents01.jpg'), 'Commons uses Pents, not Pentacles');
console.log('tarot-editorial: all 78 cards have distinct rendered explanations and image attribution');
