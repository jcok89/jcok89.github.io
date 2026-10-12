/* Shared session storage; card ratings keep their existing storage keys. */
(function () {
    'use strict';

    function read(key) {
        try { return localStorage.getItem(key); } catch (error) { return null; }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) { return false; }
    }

    function readProgress(key) {
        try {
            const data = JSON.parse(read(key));
            if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
            return Object.fromEntries(Object.entries(data).filter(([, entry]) =>
                entry && ['due', 'interval', 'ease', 'reviews', 'lapses'].every((field) =>
                    Number.isFinite(entry[field]) && entry[field] >= 0)));
        } catch (error) { return {}; }
    }

    function shuffle(items) {
        const result = items.slice();
        for (let index = result.length - 1; index > 0; index -= 1) {
            const other = Math.floor(Math.random() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }

    function create(deckName) {
        const prefix = 'jake-anki-' + deckName + '-session-v1:';
        const keyFor = (scope) => prefix + JSON.stringify(scope);

        function load(scope, deck) {
            try {
                const saved = JSON.parse(read(keyFor(scope)));
                const ids = deck.map((card) => card.id);
                if (!saved || saved.version !== 1 || !Array.isArray(saved.deckIds) || saved.deckIds.length !== ids.length ||
                    !ids.every((id, index) => saved.deckIds[index] === id) ||
                    !Array.isArray(saved.remainingIds) || !saved.remainingIds.length ||
                    new Set(saved.remainingIds).size !== saved.remainingIds.length ||
                    !saved.remainingIds.every((id) => ids.includes(id)) ||
                    !Number.isInteger(saved.total) || saved.total < saved.remainingIds.length ||
                    saved.total > ids.length || typeof saved.includeFuture !== 'boolean' ||
                    !['sequential', 'random'].includes(saved.order)) return null;
                const byId = new Map(deck.map((card) => [card.id, card]));
                return { ...saved, remaining: saved.remainingIds.map((id) => byId.get(id)) };
            } catch (error) { return null; }
        }

        function save(scope, deck, remaining, total, includeFuture, order) {
            if (!remaining.length) {
                try { localStorage.removeItem(keyFor(scope)); return true; } catch (error) { return false; }
            }
            return write(keyFor(scope), JSON.stringify({
                version: 1,
                deckIds: deck.map((card) => card.id),
                remainingIds: remaining.map((card) => card.id),
                total, includeFuture, order
            }));
        }

        function clear() {
            try {
                for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                    const key = localStorage.key(index);
                    if (key?.startsWith(prefix)) localStorage.removeItem(key);
                }
            } catch (error) { /* Review still works when storage is unavailable. */ }
        }

        return { load, save, clear };
    }

    window.AnkiSession = { read, write, readProgress, shuffle, create };
}());
