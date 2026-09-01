const TAROT_DATA = {
  major_arcana: TAROT_MAJOR_ARCANA,
  minor_arcana: {
    wands: TAROT_WANDS,
    cups: TAROT_CUPS,
    swords: TAROT_SWORDS,
    pentacles: TAROT_PENTACLES
  }
};

const MINOR_RANK_NUMBER = {
  Ace: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  Page: 11, Knight: 12, Queen: 13, King: 14
};

const SUIT_LABEL = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles' };

function getMajorImageFilename(card) {
  const slug = card.name_en.replace(/^The\s+/, '').replace(/\s+/g, '_');
  return 'RWS_Tarot_' + String(card.id).padStart(2, '0') + '_' + slug + '.jpg';
}

function getMinorImageFilename(suitKey, card) {
  const num = MINOR_RANK_NUMBER[card.rank];
  return SUIT_LABEL[suitKey] + String(num).padStart(2, '0') + '.jpg';
}

function getFullDeck() {
  const deck = [];

  TAROT_DATA.major_arcana.forEach(function (card) {
    deck.push({
      cardId: 'major_' + card.id,
      type: 'major',
      name: card.name_kr,
      nameEn: card.name_en,
      upright: card.upright,
      reversed: card.reversed,
      keywords: card.keywords,
      advice: card.advice,
      categories: card.categories,
      image: 'images/' + getMajorImageFilename(card)
    });
  });

  Object.keys(TAROT_DATA.minor_arcana).forEach(function (suitKey) {
    TAROT_DATA.minor_arcana[suitKey].forEach(function (card) {
      deck.push({
        cardId: suitKey + '_' + card.rank,
        type: 'minor',
        name: card.name_kr,
        nameEn: SUIT_LABEL[suitKey] + ' ' + card.rank,
        upright: card.upright,
        reversed: card.reversed,
        keywords: card.keywords,
        advice: card.advice,
        categories: card.categories,
        image: 'images/' + getMinorImageFilename(suitKey, card)
      });
    });
  });

  return deck;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAROT_DATA, getFullDeck, getMajorImageFilename, getMinorImageFilename };
}
