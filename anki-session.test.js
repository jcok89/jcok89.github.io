'use strict';

// Run with node anki-session.test.js; no build or dependencies required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'anki-session.js'), 'utf8');
const storage = {};
const localStorage = {
    get length() { return Object.keys(storage).length; },
    key: (index) => Object.keys(storage)[index] ?? null,
    getItem: (key) => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = value; },
    removeItem: (key) => { delete storage[key]; }
};
const context = vm.createContext({ window: {}, localStorage });
vm.runInContext(source, context);
const api = context.window.AnkiSession;
const session = api.create('books');
const deck = ['a', 'b', 'c'].map((id) => ({ id }));
const scope = ['title-to-author', 'all'];
const key = 'jake-anki-books-session-v1:' + JSON.stringify(scope);
const plain = (value) => JSON.parse(JSON.stringify(value));

session.save(scope, deck, [deck[2], deck[0]], 3, true, 'random');
const original = storage[key];
const saved = session.load(scope, deck);
assert.deepEqual(plain(saved.remaining), [deck[2], deck[0]]);
assert.equal(saved.includeFuture, true);
assert.equal(saved.order, 'random');
assert.equal(saved.total, 3);
assert.equal(session.load(['author-to-title', 'all'], deck), null);
assert.equal(session.load(['title-to-author', 'SF'], deck), null);
assert.equal(api.create('artworks').load(scope, deck), null);
assert.equal(session.load(scope, [...deck, { id: 'd' }]), null);
assert.equal(session.load(scope, deck.slice().reverse()), null);

for (const patch of [
    { version: 2 }, { remainingIds: ['a', 'a'] }, { remainingIds: ['removed'] },
    { total: 1 }, { total: 9 }, { total: 2.5 }, { order: 'bad' },
    { includeFuture: 'true' }, { deckIds: {} }, { remainingIds: null }
]) {
    storage[key] = JSON.stringify({ ...JSON.parse(original), ...patch });
    assert.equal(session.load(scope, deck), null);
}
for (const broken of ['{', 'null', '[]', '3']) {
    storage[key] = broken;
    assert.equal(session.load(scope, deck), null);
}

session.save(scope, deck, [], 3, true, 'random');
assert.equal(storage[key], undefined);
session.save(scope, deck, deck, 3, false, 'sequential');
session.save(['title-to-author', 'SF'], deck, deck, 3, false, 'random');
localStorage.setItem('unrelated', 'keep');
session.clear();
assert.equal(storage[key], undefined);
assert.equal(storage.unrelated, 'keep');

for (let run = 0; run < 200; run += 1) {
    const result = api.shuffle(deck);
    assert.equal(new Set(result.map((card) => card.id)).size, 3);
    assert.deepEqual(result.map((card) => card.id).sort(), ['a', 'b', 'c']);
    assert.deepEqual(deck.map((card) => card.id), ['a', 'b', 'c']);
}
assert.equal(api.shuffle([]).length, 0);
assert.equal(api.shuffle([deck[0]])[0], deck[0]);

const record = { due: 1, interval: 1, ease: 2.5, reviews: 3, lapses: 0 };
localStorage.setItem('progress', JSON.stringify({ a: record, b: {}, c: null }));
assert.deepEqual(plain(api.readProgress('progress')), { a: record });
for (const broken of ['{', 'null', '[]', '3']) {
    localStorage.setItem('progress', broken);
    assert.deepEqual(plain(api.readProgress('progress')), {});
}
localStorage.getItem = () => { throw new Error('blocked'); };
localStorage.setItem = () => { throw new Error('full'); };
localStorage.removeItem = () => { throw new Error('blocked'); };
assert.equal(api.read('progress'), null);
assert.equal(api.write('progress', '{}'), false);
assert.deepEqual(plain(api.readProgress('progress')), {});
assert.equal(session.load(scope, deck), null);
assert.equal(session.save(scope, deck, deck, 3, false, 'random'), false);
assert.equal(session.save(scope, deck, [], 3, false, 'random'), false);
assert.doesNotThrow(() => session.clear());
console.log('PASS: resume, scope isolation, invalid snapshots, shuffle, progress preservation, blocked storage');
