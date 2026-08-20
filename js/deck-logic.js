function drawCards(deck, count, rng) {
  if (count > deck.length) {
    throw new Error('Cannot draw ' + count + ' cards from a deck of ' + deck.length);
  }

  const random = rng || Math.random;
  const pool = deck.slice();
  const drawn = [];

  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * pool.length);
    const card = pool.splice(index, 1)[0];
    const orientation = random() < 0.5 ? 'upright' : 'reversed';
    drawn.push({ card: card, orientation: orientation });
  }

  return drawn;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { drawCards };
}
