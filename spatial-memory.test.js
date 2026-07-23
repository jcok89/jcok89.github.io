'use strict';

const assert = require('node:assert/strict');
const core = require('./spatial-memory.js');

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

assert.equal(core.ICON_ITEMS.length >= 40, true, '아이콘 데이터는 40개 이상이어야 합니다.');
assert.equal(core.WORD_ITEMS.length >= 60, true, '단어 데이터는 60개 이상이어야 합니다.');
assert.deepEqual(core.validateLevelConfig(core.LEVEL_CONFIG, core.LAYOUTS), []);

for (const [modeIndex, mode] of ['icon', 'word', 'mixed'].entries()) {
  const random = seededRandom(20260723 + modeIndex);
  let previousSignature = '';
  for (const level of core.LEVEL_CONFIG) {
    const round = core.pickRoundItems(
      mode,
      level.itemCount,
      level.similarItems,
      previousSignature,
      random
    );
    const itemIds = round.items.map((item) => item.id);
    assert.equal(round.items.length, level.itemCount);
    assert.equal(new Set(itemIds).size, level.itemCount, `${mode} 레벨 ${level.level}: 항목 중복 방지`);
    assert.notEqual(round.signature, previousSignature, `${mode} 레벨 ${level.level}: 직전 조합 반복 방지`);

    const trayOrder = core.shuffledTrayOrder(itemIds, random);
    assert.equal(new Set(trayOrder).size, level.itemCount);
    assert.notDeepEqual(trayOrder, itemIds, `${mode} 레벨 ${level.level}: 보관함 순서 섞기`);
    previousSignature = round.signature;
  }
}

const result = core.gradePlacement(
  ['a', 'b', 'c', 'd', 'e'],
  ['a', 'x', null, 'd', 'z']
);
assert.deepEqual(result.perSlot, ['correct', 'wrong', 'unanswered', 'correct', 'wrong']);
assert.equal(result.correctCount, 2);
assert.equal(result.accuracy, 40);

assert.equal(core.calculateRoundScore(4, 5, 10, true), 430);
assert.equal(core.calculateRoundScore(5, 5, 10, true), 730);
assert.equal(core.calculateRoundScore(4, 4, 0, false), 600);
assert.equal(core.calculateRoundScore(0, 5, 30, true), 0);

assert.deepEqual(core.normalizeRecords(null), {
  highestLevel: 1,
  highestScore: 0,
  bestStreak: 0,
  lastMode: 'icon',
  lastDifficulty: 'normal'
});
assert.deepEqual(
  core.normalizeRecords({
    highestLevel: 99,
    highestScore: -2,
    bestStreak: '손상',
    lastMode: 'unknown',
    lastDifficulty: 'unknown'
  }),
  {
    highestLevel: 18,
    highestScore: 0,
    bestStreak: 0,
    lastMode: 'icon',
    lastDifficulty: 'normal'
  }
);

console.log('Spatial memory logic tests passed.');
