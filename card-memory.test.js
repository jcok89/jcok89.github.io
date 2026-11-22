'use strict';
const assert = require('node:assert/strict');
const { deck, shuffle, evaluate, compare, bestHand } = require('./card-memory.js');
const cards = (...ids) => ids.map(id => deck.find(card => card.rank + card.suit.symbol === id));
const score = (...ids) => evaluate(cards(...ids));

const examples = [
    ['A♠', 'J♣', '9♥', '5♣', '2♠'],
    ['A♠', 'A♣', '9♥', '5♣', '2♠'],
    ['A♠', 'A♣', '9♥', '9♣', '2♠'],
    ['A♠', 'A♣', 'A♥', '9♣', '2♠'],
    ['A♠', '2♣', '3♥', '4♣', '5♠'],
    ['A♠', 'J♠', '9♠', '5♠', '2♠'],
    ['A♠', 'A♣', 'A♥', '9♣', '9♠'],
    ['A♠', 'A♣', 'A♥', 'A♦', '9♠'],
    ['A♠', 'K♠', 'Q♠', 'J♠', '10♠']
];
examples.forEach((ids, i) => assert.equal(score(...ids)[0], i));
assert.deepEqual(score(...examples[4]), [4, 5]);
assert.deepEqual(score(...examples[8]), [8, 14]);
assert.equal(compare(score('6♥','2♣','3♥','4♣','5♠'),score(...examples[4])), 1);
assert.equal(compare(score('A♠','A♥','K♣','5♥','2♣'),score('A♣','A♦','Q♣','5♠','2♥')), 1);
assert.equal(compare(score('K♠','K♣','7♥','7♣','A♠'),score('A♠','A♣','2♥','2♣','3♠')), -1);
assert.equal(compare(score('A♠','A♥','K♣','5♥','2♣'),score('A♣','A♦','K♥','5♠','2♥')), 0);
assert.deepEqual(bestHand(cards('2♣','Q♥','J♣','7♦','J♥'),cards('A♥','K♥','10♥')),
    { indices: [1, 4], rating: [8, 14] });

for (let trial = 0; trial < 20; trial++) {
    const deal = shuffle(deck);
    assert.equal(new Set(deal.map(card => card.id)).size, 52);
    assert.equal(deck[0].id, 0);
}
console.log('Pass: all 9 hand ranks, ties, kickers, optimal pair, unique cards.');
