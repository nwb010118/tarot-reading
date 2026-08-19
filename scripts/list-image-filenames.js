const { getFullDeck } = require('../data/tarot-data.js');

const deck = getFullDeck();

deck.forEach(function (card) {
  console.log(card.image.replace('images/', ''));
});
