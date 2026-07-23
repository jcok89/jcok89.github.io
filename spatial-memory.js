(function (root) {
  'use strict';

  const STORAGE_KEY = 'jakeSpatialMemoryV1';

  const LAYOUTS = {
    'grid-2x2': { columns: 2, rows: 2, positions: [0, 1, 2, 3] },
    'top3-bottom2': { columns: 3, rows: 2, positions: [0, 1, 2, 3, 5] },
    'two-pairs-center': { columns: 3, rows: 3, positions: [0, 2, 3, 5, 7] },
    'cross-5': { columns: 3, rows: 3, positions: [1, 3, 4, 5, 7] },
    'grid-2x3': { columns: 3, rows: 2, positions: [0, 1, 2, 3, 4, 5] },
    'partial-3x3-6': { columns: 3, rows: 3, positions: [0, 2, 3, 4, 5, 7] },
    'irregular-7': { columns: 3, rows: 3, positions: [0, 1, 3, 4, 5, 6, 8] },
    'irregular-7b': { columns: 3, rows: 3, positions: [0, 2, 3, 4, 5, 7, 8] },
    'irregular-8': { columns: 3, rows: 3, positions: [0, 1, 2, 3, 5, 6, 7, 8] }
  };

  // 난이도 조정은 이 배열에서만 관리해 게임 함수에 값이 흩어지지 않게 한다.
  const LEVEL_CONFIG = [
    { level: 1, itemCount: 4, memorizeSeconds: 8, recallSeconds: null, layoutTypes: ['grid-2x2'], similarItems: false },
    { level: 2, itemCount: 4, memorizeSeconds: 8, recallSeconds: null, layoutTypes: ['grid-2x2'], similarItems: false },
    { level: 3, itemCount: 4, memorizeSeconds: 7, recallSeconds: null, layoutTypes: ['grid-2x2'], similarItems: false },
    { level: 4, itemCount: 4, memorizeSeconds: 7, recallSeconds: null, layoutTypes: ['grid-2x2'], similarItems: false },
    { level: 5, itemCount: 5, memorizeSeconds: 6, recallSeconds: 30, layoutTypes: ['top3-bottom2', 'cross-5'], similarItems: false },
    { level: 6, itemCount: 5, memorizeSeconds: 6, recallSeconds: 30, layoutTypes: ['top3-bottom2', 'two-pairs-center'], similarItems: false },
    { level: 7, itemCount: 5, memorizeSeconds: 5, recallSeconds: 28, layoutTypes: ['cross-5', 'two-pairs-center'], similarItems: false },
    { level: 8, itemCount: 5, memorizeSeconds: 5, recallSeconds: 26, layoutTypes: ['top3-bottom2', 'cross-5', 'two-pairs-center'], similarItems: false },
    { level: 9, itemCount: 6, memorizeSeconds: 6, recallSeconds: 30, layoutTypes: ['grid-2x3'], similarItems: false },
    { level: 10, itemCount: 6, memorizeSeconds: 5, recallSeconds: 27, layoutTypes: ['grid-2x3', 'partial-3x3-6'], similarItems: false },
    { level: 11, itemCount: 6, memorizeSeconds: 5, recallSeconds: 25, layoutTypes: ['partial-3x3-6'], similarItems: true },
    { level: 12, itemCount: 6, memorizeSeconds: 5, recallSeconds: 23, layoutTypes: ['grid-2x3', 'partial-3x3-6'], similarItems: true },
    { level: 13, itemCount: 7, memorizeSeconds: 4, recallSeconds: 20, layoutTypes: ['irregular-7'], similarItems: true },
    { level: 14, itemCount: 7, memorizeSeconds: 4, recallSeconds: 20, layoutTypes: ['irregular-7', 'irregular-7b'], similarItems: true },
    { level: 15, itemCount: 7, memorizeSeconds: 4, recallSeconds: 18, layoutTypes: ['irregular-7b', 'irregular-7'], similarItems: true },
    { level: 16, itemCount: 8, memorizeSeconds: 4, recallSeconds: 20, layoutTypes: ['irregular-8'], similarItems: true },
    { level: 17, itemCount: 8, memorizeSeconds: 3, recallSeconds: 18, layoutTypes: ['irregular-8'], similarItems: true },
    { level: 18, itemCount: 8, memorizeSeconds: 3, recallSeconds: 15, layoutTypes: ['irregular-8'], similarItems: true }
  ];

  const DIFFICULTY_START_LEVEL = { easy: 1, normal: 5, hard: 13 };
  const VALID_MODES = ['icon', 'word', 'mixed'];
  const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];

  const ICON_ITEMS = [
    { id: 'i-sofa', kind: 'icon', glyph: '🛋️', name: '소파', group: 'furniture' },
    { id: 'i-chair', kind: 'icon', glyph: '🪑', name: '의자', group: 'furniture' },
    { id: 'i-bed', kind: 'icon', glyph: '🛏️', name: '침대', group: 'furniture' },
    { id: 'i-cap', kind: 'icon', glyph: '🎓', name: '학사모', group: null },
    { id: 'i-ball', kind: 'icon', glyph: '⚽', name: '축구공', group: 'sports-ball' },
    { id: 'i-basketball', kind: 'icon', glyph: '🏀', name: '농구공', group: 'sports-ball' },
    { id: 'i-tennis', kind: 'icon', glyph: '🎾', name: '테니스공', group: 'sports-ball' },
    { id: 'i-pineapple', kind: 'icon', glyph: '🍍', name: '파인애플', group: 'fruit' },
    { id: 'i-apple', kind: 'icon', glyph: '🍎', name: '사과', group: 'fruit' },
    { id: 'i-orange', kind: 'icon', glyph: '🍊', name: '귤', group: 'fruit' },
    { id: 'i-grape', kind: 'icon', glyph: '🍇', name: '포도', group: 'fruit' },
    { id: 'i-planet', kind: 'icon', glyph: '🪐', name: '행성', group: 'sky' },
    { id: 'i-star', kind: 'icon', glyph: '⭐', name: '별', group: 'sky' },
    { id: 'i-moon', kind: 'icon', glyph: '🌙', name: '달', group: 'sky' },
    { id: 'i-sun', kind: 'icon', glyph: '☀️', name: '해', group: 'sky' },
    { id: 'i-car', kind: 'icon', glyph: '🚗', name: '자동차', group: 'vehicle' },
    { id: 'i-taxi', kind: 'icon', glyph: '🚕', name: '택시', group: 'vehicle' },
    { id: 'i-bus', kind: 'icon', glyph: '🚌', name: '버스', group: 'vehicle' },
    { id: 'i-truck', kind: 'icon', glyph: '🚚', name: '트럭', group: 'vehicle' },
    { id: 'i-bike', kind: 'icon', glyph: '🚲', name: '자전거', group: 'vehicle' },
    { id: 'i-plane', kind: 'icon', glyph: '✈️', name: '비행기', group: 'vehicle' },
    { id: 'i-key', kind: 'icon', glyph: '🔑', name: '열쇠', group: null },
    { id: 'i-clock', kind: 'icon', glyph: '⏰', name: '시계', group: null },
    { id: 'i-umbrella', kind: 'icon', glyph: '☂️', name: '우산', group: null },
    { id: 'i-camera', kind: 'icon', glyph: '📷', name: '카메라', group: 'device' },
    { id: 'i-phone', kind: 'icon', glyph: '📱', name: '전화기', group: 'device' },
    { id: 'i-laptop', kind: 'icon', glyph: '💻', name: '노트북', group: 'device' },
    { id: 'i-book', kind: 'icon', glyph: '📘', name: '책', group: null },
    { id: 'i-cup', kind: 'icon', glyph: '☕', name: '커피잔', group: null },
    { id: 'i-tree', kind: 'icon', glyph: '🌳', name: '나무', group: 'nature' },
    { id: 'i-flower', kind: 'icon', glyph: '🌻', name: '꽃', group: 'nature' },
    { id: 'i-mountain', kind: 'icon', glyph: '⛰️', name: '산', group: 'nature' },
    { id: 'i-house', kind: 'icon', glyph: '🏠', name: '집', group: 'building' },
    { id: 'i-school', kind: 'icon', glyph: '🏫', name: '학교', group: 'building' },
    { id: 'i-hospital', kind: 'icon', glyph: '🏥', name: '병원', group: 'building' },
    { id: 'i-gift', kind: 'icon', glyph: '🎁', name: '선물', group: null },
    { id: 'i-bell', kind: 'icon', glyph: '🔔', name: '종', group: null },
    { id: 'i-magnifier', kind: 'icon', glyph: '🔍', name: '돋보기', group: null },
    { id: 'i-lock', kind: 'icon', glyph: '🔒', name: '자물쇠', group: null },
    { id: 'i-light', kind: 'icon', glyph: '💡', name: '전구', group: null },
    { id: 'i-rocket', kind: 'icon', glyph: '🚀', name: '로켓', group: null },
    { id: 'i-boat', kind: 'icon', glyph: '⛵', name: '돛단배', group: 'vehicle' },
    { id: 'i-dog', kind: 'icon', glyph: '🐶', name: '강아지', group: 'animal' },
    { id: 'i-cat', kind: 'icon', glyph: '🐱', name: '고양이', group: 'animal' },
    { id: 'i-rabbit', kind: 'icon', glyph: '🐰', name: '토끼', group: 'animal' },
    { id: 'i-bird', kind: 'icon', glyph: '🐦', name: '새', group: 'animal' },
    { id: 'i-fish', kind: 'icon', glyph: '🐟', name: '물고기', group: 'animal' },
    { id: 'i-crown', kind: 'icon', glyph: '👑', name: '왕관', group: null }
  ];

  const WORD_ITEMS = [
    { id: 'w-bicycle', kind: 'word', name: '자전거', group: null },
    { id: 'w-library', kind: 'word', name: '도서관', group: null },
    { id: 'w-africa', kind: 'word', name: '아프리카', group: null },
    { id: 'w-airport', kind: 'word', name: '공항', group: null },
    { id: 'w-waterfall', kind: 'word', name: '폭포', group: null },
    { id: 'w-microscope', kind: 'word', name: '현미경', group: null },
    { id: 'w-postbox', kind: 'word', name: '우체통', group: null },
    { id: 'w-stair', kind: 'word', name: '계단', group: null },
    { id: 'w-calendar', kind: 'word', name: '달력', group: null },
    { id: 'w-cloud', kind: 'word', name: '구름', group: null },
    { id: 'w-fountain', kind: 'word', name: '분수대', group: null },
    { id: 'w-compass', kind: 'word', name: '나침반', group: null },
    { id: 'w-greenhouse', kind: 'word', name: '온실', group: null },
    { id: 'w-elevator', kind: 'word', name: '엘리베이터', group: null },
    { id: 'w-playground', kind: 'word', name: '놀이터', group: null },
    { id: 'w-sandwich', kind: 'word', name: '샌드위치', group: null },
    { id: 'w-telescope', kind: 'word', name: '망원경', group: null },
    { id: 'w-keyboard', kind: 'word', name: '키보드', group: null },
    { id: 'w-museum', kind: 'word', name: '박물관', group: null },
    { id: 'w-subway', kind: 'word', name: '지하철', group: null },
    { id: 'w-preserve', kind: 'word', name: '보존하다', group: 'keep' },
    { id: 'w-store', kind: 'word', name: '보관하다', group: 'keep' },
    { id: 'w-decide', kind: 'word', name: '결정하다', group: 'decide' },
    { id: 'w-resolve', kind: 'word', name: '결심하다', group: 'decide' },
    { id: 'w-economic', kind: 'word', name: '경제적', group: 'practical' },
    { id: 'w-practical', kind: 'word', name: '실용적', group: 'practical' },
    { id: 'w-discover', kind: 'word', name: '발견하다', group: 'find' },
    { id: 'w-search', kind: 'word', name: '탐색하다', group: 'find' },
    { id: 'w-promise', kind: 'word', name: '약속하다', group: null },
    { id: 'w-record', kind: 'word', name: '기록하다', group: null },
    { id: 'w-explain', kind: 'word', name: '설명하다', group: null },
    { id: 'w-compare', kind: 'word', name: '비교하다', group: null },
    { id: 'w-observe', kind: 'word', name: '관찰하다', group: null },
    { id: 'w-prepare', kind: 'word', name: '준비하다', group: null },
    { id: 'w-connect', kind: 'word', name: '연결하다', group: null },
    { id: 'w-repeat', kind: 'word', name: '반복하다', group: null },
    { id: 'w-organize', kind: 'word', name: '정리하다', group: null },
    { id: 'w-imagine', kind: 'word', name: '상상하다', group: null },
    { id: 'w-confirm', kind: 'word', name: '확인하다', group: null },
    { id: 'w-protect', kind: 'word', name: '보호하다', group: null },
    { id: 'w-warm', kind: 'word', name: '따뜻하다', group: 'temperature' },
    { id: 'w-cool', kind: 'word', name: '선선하다', group: 'temperature' },
    { id: 'w-cold', kind: 'word', name: '차가운', group: 'temperature' },
    { id: 'w-quiet', kind: 'word', name: '고요하다', group: 'mood' },
    { id: 'w-calm', kind: 'word', name: '차분하다', group: 'mood' },
    { id: 'w-vivid', kind: 'word', name: '선명하다', group: null },
    { id: 'w-flexible', kind: 'word', name: '유연하다', group: null },
    { id: 'w-precise', kind: 'word', name: '정확하다', group: null },
    { id: 'w-familiar', kind: 'word', name: '친숙하다', group: null },
    { id: 'w-strange', kind: 'word', name: '낯설다', group: null },
    { id: 'w-steady', kind: 'word', name: '꾸준하다', group: null },
    { id: 'w-spacious', kind: 'word', name: '넓다', group: null },
    { id: 'w-delicate', kind: 'word', name: '섬세하다', group: null },
    { id: 'w-convenient', kind: 'word', name: '편리하다', group: null },
    { id: 'w-interesting', kind: 'word', name: '흥미롭다', group: null },
    { id: 'w-brilliant', kind: 'word', name: '찬란하다', group: null },
    { id: 'w-honest', kind: 'word', name: '정직하다', group: null },
    { id: 'w-free', kind: 'word', name: '자유롭다', group: null },
    { id: 'w-memory', kind: 'word', name: '기억', group: null },
    { id: 'w-balance', kind: 'word', name: '균형', group: null },
    { id: 'w-courage', kind: 'word', name: '용기', group: null },
    { id: 'w-habit', kind: 'word', name: '습관', group: null },
    { id: 'w-possibility', kind: 'word', name: '가능성', group: null },
    { id: 'w-solution', kind: 'word', name: '해결책', group: null },
    { id: 'w-perspective', kind: 'word', name: '관점', group: null },
    { id: 'w-priority', kind: 'word', name: '우선순위', group: null },
    { id: 'w-experience', kind: 'word', name: '경험', group: null },
    { id: 'w-concentration', kind: 'word', name: '집중력', group: null },
    { id: 'w-creativity', kind: 'word', name: '창의성', group: null },
    { id: 'w-responsibility', kind: 'word', name: '책임감', group: null }
  ];

  const DEFAULT_RECORDS = {
    highestLevel: 1,
    highestScore: 0,
    bestStreak: 0,
    lastMode: 'icon',
    lastDifficulty: 'normal'
  };

  function fisherYates(items, randomFn) {
    const random = randomFn || Math.random;
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function arraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function getItemPool(mode) {
    if (mode === 'word') return WORD_ITEMS.slice();
    if (mode === 'mixed') return ICON_ITEMS.concat(WORD_ITEMS);
    return ICON_ITEMS.slice();
  }

  function selectItemsFromPool(pool, count, allowSimilar, randomFn) {
    const random = randomFn || Math.random;
    const chosen = [];
    const chosenIds = new Set();
    const usedGroups = new Set();

    // 고레벨에서는 같은 그룹의 항목 두 개를 의도적으로 섞어 결합 기억 난도를 높인다.
    if (allowSimilar) {
      const grouped = new Map();
      pool.forEach((item) => {
        if (!item.group) return;
        if (!grouped.has(item.group)) grouped.set(item.group, []);
        grouped.get(item.group).push(item);
      });
      const pairs = fisherYates(
        Array.from(grouped.values()).filter((group) => group.length >= 2),
        random
      );
      if (pairs.length) {
        fisherYates(pairs[0], random).slice(0, 2).forEach((item) => {
          chosen.push(item);
          chosenIds.add(item.id);
        });
      }
    }

    for (const item of fisherYates(pool, random)) {
      if (chosen.length >= count) break;
      if (chosenIds.has(item.id)) continue;
      if (!allowSimilar && item.group && usedGroups.has(item.group)) continue;
      chosen.push(item);
      chosenIds.add(item.id);
      if (item.group) usedGroups.add(item.group);
    }

    if (chosen.length < count) {
      for (const item of fisherYates(pool, random)) {
        if (chosen.length >= count) break;
        if (!chosenIds.has(item.id)) {
          chosen.push(item);
          chosenIds.add(item.id);
        }
      }
    }

    return fisherYates(chosen.slice(0, count), random);
  }

  function pickRoundItems(mode, count, allowSimilar, previousSignature, randomFn) {
    const pool = getItemPool(mode);
    let items = [];
    let signature = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      items = selectItemsFromPool(pool, count, allowSimilar, randomFn);
      signature = items.map((item) => item.id).sort().join('|');
      if (signature !== previousSignature) break;
    }
    return { items, signature };
  }

  function shuffledTrayOrder(correctPlacement, randomFn) {
    let tray = correctPlacement.slice();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      tray = fisherYates(correctPlacement, randomFn);
      if (!arraysEqual(tray, correctPlacement)) return tray;
    }
    if (tray.length > 1) [tray[0], tray[1]] = [tray[1], tray[0]];
    return tray;
  }

  function gradePlacement(correctPlacement, userPlacement) {
    const perSlot = correctPlacement.map((correctId, index) => {
      if (!userPlacement[index]) return 'unanswered';
      return userPlacement[index] === correctId ? 'correct' : 'wrong';
    });
    const correctCount = perSlot.filter((result) => result === 'correct').length;
    const total = correctPlacement.length;
    return {
      perSlot,
      correctCount,
      total,
      accuracy: total ? Math.round((correctCount / total) * 100) : 0
    };
  }

  function calculateRoundScore(correctCount, total, remainingSeconds, hasTimeLimit) {
    const positionScore = correctCount * 100;
    const perfectBonus = total > 0 && correctCount === total ? 200 : 0;
    const timeBonus = hasTimeLimit && correctCount > 0 ? Math.max(0, Math.min(90, remainingSeconds * 3)) : 0;
    return positionScore + perfectBonus + timeBonus;
  }

  function normalizeRecords(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_RECORDS };
    const numberOrDefault = (value, fallback, max) => (
      Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback
    );
    return {
      highestLevel: Math.max(1, numberOrDefault(raw.highestLevel, 1, 18)),
      highestScore: numberOrDefault(raw.highestScore, 0, 99999999),
      bestStreak: numberOrDefault(raw.bestStreak, 0, 99999),
      lastMode: VALID_MODES.includes(raw.lastMode) ? raw.lastMode : 'icon',
      lastDifficulty: VALID_DIFFICULTIES.includes(raw.lastDifficulty) ? raw.lastDifficulty : 'normal'
    };
  }

  function validateLevelConfig(config, layouts) {
    const errors = [];
    if (!Array.isArray(config) || config.length !== 18) errors.push('레벨은 18개여야 합니다.');
    (config || []).forEach((entry, index) => {
      if (entry.level !== index + 1) errors.push(`레벨 번호 오류: ${index + 1}`);
      if (entry.itemCount < 4 || entry.itemCount > 8) errors.push(`항목 수 오류: 레벨 ${entry.level}`);
      if (!(entry.memorizeSeconds > 0)) errors.push(`기억 시간 오류: 레벨 ${entry.level}`);
      if (!Array.isArray(entry.layoutTypes) || !entry.layoutTypes.length) errors.push(`배치 누락: 레벨 ${entry.level}`);
      (entry.layoutTypes || []).forEach((layoutName) => {
        const layout = layouts[layoutName];
        if (!layout) errors.push(`알 수 없는 배치: ${layoutName}`);
        else if (layout.positions.length !== entry.itemCount) errors.push(`배치 항목 수 불일치: 레벨 ${entry.level}`);
      });
    });
    return errors;
  }

  const SpatialMemoryCore = {
    STORAGE_KEY,
    LAYOUTS,
    LEVEL_CONFIG,
    ICON_ITEMS,
    WORD_ITEMS,
    fisherYates,
    pickRoundItems,
    shuffledTrayOrder,
    gradePlacement,
    calculateRoundScore,
    normalizeRecords,
    validateLevelConfig
  };

  root.SpatialMemoryCore = SpatialMemoryCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = SpatialMemoryCore;
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', initSpatialMemoryApp);

  function initSpatialMemoryApp() {
    const elements = {};
    [
      'setup-panel', 'game-panel', 'finished-panel', 'difficulty-note',
      'record-level', 'record-score', 'record-streak', 'start-button',
      'reset-records-button', 'hud-round', 'hud-level', 'hud-score', 'hud-time',
      'pause-button', 'resume-button', 'phase-banner', 'phase-badge', 'phase-title',
      'phase-description', 'paused-banner', 'memory-board', 'tray-panel', 'item-tray',
      'memorize-actions', 'recall-actions', 'remember-button', 'check-button',
      'restart-round-button', 'result-panel', 'result-message', 'result-correct',
      'result-accuracy', 'result-score', 'result-streak', 'result-best-streak',
      'result-guidance', 'next-round-button', 'review-round-button',
      'end-training-button', 'result-reset-button', 'finished-message',
      'finished-level', 'finished-score', 'finished-streak', 'new-training-button',
      'live-region'
    ].forEach((id) => { elements[id] = document.getElementById(id); });

    let records = loadRecords();
    let draggedItem = null;

    // DOM과 별도로 유지되는 단일 게임 상태. 화면은 이 상태를 기준으로 다시 그린다.
    const gameState = {
      mode: records.lastMode,
      difficulty: records.lastDifficulty,
      level: DIFFICULTY_START_LEVEL[records.lastDifficulty],
      round: 1,
      score: 0,
      streak: 0,
      bestStreak: 0,
      phase: 'ready',
      phaseBeforePause: null,
      items: [],
      correctPlacement: [],
      userPlacement: [],
      trayOrder: [],
      layoutType: 'grid-2x2',
      selectedItemId: null,
      hasScoredCurrentRound: false,
      reviewMode: false,
      lastItemSignature: '',
      memorizeRemaining: 0,
      recallRemaining: null,
      timerId: null,
      advanceAfterRound: false,
      lastResult: null,
      sessionStartLevel: 1
    };

    applySavedChoices();
    renderDifficultyNote();
    renderRecords();

    document.querySelectorAll('input[name="difficulty"]').forEach((input) => {
      input.addEventListener('change', renderDifficultyNote);
    });
    elements['start-button'].addEventListener('click', startTraining);
    elements['reset-records-button'].addEventListener('click', resetRecords);
    elements['result-reset-button'].addEventListener('click', resetRecords);
    elements['remember-button'].addEventListener('click', beginRecall);
    elements['check-button'].addEventListener('click', () => gradeCurrentRound(false));
    elements['restart-round-button'].addEventListener('click', restartCurrentRound);
    elements['pause-button'].addEventListener('click', togglePause);
    elements['resume-button'].addEventListener('click', togglePause);
    elements['next-round-button'].addEventListener('click', nextRound);
    elements['review-round-button'].addEventListener('click', reviewSameRound);
    elements['end-training-button'].addEventListener('click', () => finishTraining(false));
    elements['new-training-button'].addEventListener('click', returnToSetup);

    function loadRecords() {
      try {
        return normalizeRecords(JSON.parse(localStorage.getItem(STORAGE_KEY)));
      } catch (error) {
        return { ...DEFAULT_RECORDS };
      }
    }

    function saveRecords() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch (error) {
        announce('브라우저 저장 공간을 사용할 수 없어 기록을 저장하지 못했습니다.');
      }
    }

    function applySavedChoices() {
      const modeInput = document.querySelector(`input[name="mode"][value="${records.lastMode}"]`);
      const difficultyInput = document.querySelector(`input[name="difficulty"][value="${records.lastDifficulty}"]`);
      if (modeInput) modeInput.checked = true;
      if (difficultyInput) difficultyInput.checked = true;
    }

    function selectedValue(name) {
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : null;
    }

    function renderDifficultyNote() {
      const difficulty = selectedValue('difficulty') || 'normal';
      const notes = {
        easy: '쉬움 난이도는 레벨 1부터 시작합니다. 항목 수가 적고 기억 시간이 깁니다.',
        normal: '보통 난이도는 레벨 5부터 시작합니다. 기본 훈련 난이도입니다.',
        hard: '어려움 난이도는 레벨 13부터 시작합니다. 항목 수가 많고 기억 시간이 짧습니다.'
      };
      elements['difficulty-note'].textContent = notes[difficulty];
    }

    function renderRecords() {
      elements['record-level'].textContent = records.highestLevel;
      elements['record-score'].textContent = records.highestScore.toLocaleString('ko-KR');
      elements['record-streak'].textContent = records.bestStreak;
    }

    function startTraining() {
      if (gameState.phase !== 'ready' && gameState.phase !== 'finished') return;
      const mode = selectedValue('mode') || 'icon';
      const difficulty = selectedValue('difficulty') || 'normal';
      gameState.mode = mode;
      gameState.difficulty = difficulty;
      gameState.level = DIFFICULTY_START_LEVEL[difficulty];
      gameState.sessionStartLevel = gameState.level;
      gameState.round = 1;
      gameState.score = 0;
      gameState.streak = 0;
      gameState.bestStreak = 0;
      gameState.lastItemSignature = '';
      gameState.advanceAfterRound = false;
      records.lastMode = mode;
      records.lastDifficulty = difficulty;
      saveRecords();
      elements['setup-panel'].classList.add('hidden');
      elements['finished-panel'].classList.add('hidden');
      elements['game-panel'].classList.remove('hidden');
      startRound({ reuseItems: false, reviewMode: false });
    }

    function currentConfig() {
      return LEVEL_CONFIG[Math.max(0, Math.min(17, gameState.level - 1))];
    }

    function startRound(options) {
      clearGameTimer();
      const config = currentConfig();
      gameState.reviewMode = Boolean(options.reviewMode);
      gameState.hasScoredCurrentRound = Boolean(options.reviewMode);
      gameState.selectedItemId = null;
      gameState.userPlacement = Array(config.itemCount).fill(null);
      gameState.memorizeRemaining = config.memorizeSeconds;
      gameState.recallRemaining = config.recallSeconds;
      gameState.lastResult = null;

      if (!options.reuseItems) {
        const selection = pickRoundItems(
          gameState.mode,
          config.itemCount,
          config.similarItems,
          gameState.lastItemSignature
        );
        gameState.items = selection.items;
        gameState.lastItemSignature = selection.signature;
        gameState.correctPlacement = gameState.items.map((item) => item.id);
        gameState.layoutType = fisherYates(config.layoutTypes)[0];
        gameState.advanceAfterRound = false;
      }

      records.highestLevel = Math.max(records.highestLevel, gameState.level);
      saveRecords();
      renderRecords();
      setPhase('memorizing');
      announce(`${gameState.level}레벨 기억 단계가 시작되었습니다. 항목과 위치를 기억하세요.`);
      startPhaseTimer();
    }

    function setPhase(phase) {
      gameState.phase = phase;
      elements['game-panel'].classList.toggle('is-paused', phase === 'paused');
      elements['paused-banner'].classList.toggle('hidden', phase !== 'paused');
      elements['pause-button'].classList.toggle('hidden', phase === 'result');
      elements['pause-button'].textContent = '일시정지';
      elements['tray-panel'].classList.toggle('hidden', phase !== 'recalling');
      elements['memorize-actions'].classList.toggle('hidden', phase !== 'memorizing');
      elements['recall-actions'].classList.toggle('hidden', phase !== 'recalling');
      elements['result-panel'].classList.toggle('hidden', phase !== 'result');

      if (phase === 'memorizing') {
        updatePhaseBanner('memorize', '기억 단계', '항목과 위치를 기억하세요.', '시간이 끝나면 항목이 사라지고 복원 단계가 시작됩니다.');
      } else if (phase === 'recalling') {
        updatePhaseBanner('recall', '복원 단계', '원래 위치로 복원하세요.', '보관함의 항목을 누른 뒤 배치할 슬롯을 누르세요.');
      } else if (phase === 'result') {
        updatePhaseBanner('result', '결과 단계', '정답 위치를 확인하세요.', '초록색은 정답, 빨간색은 오답, 회색은 선택하지 않은 위치입니다.');
      }

      updateHud();
      renderBoard();
      renderTray();
      updateCheckButton();
    }

    function updatePhaseBanner(className, badge, title, description) {
      elements['phase-banner'].className = `phase-banner ${className}`;
      elements['phase-badge'].textContent = badge;
      elements['phase-title'].textContent = title;
      elements['phase-description'].textContent = description;
    }

    function updateHud() {
      elements['hud-round'].textContent = gameState.round;
      elements['hud-level'].textContent = `${gameState.level} / 18`;
      elements['hud-score'].textContent = gameState.score.toLocaleString('ko-KR');

      if (gameState.phase === 'paused') {
        elements['hud-time'].textContent = '일시정지';
      } else if (gameState.phase === 'memorizing') {
        elements['hud-time'].textContent = `${gameState.memorizeRemaining}초`;
      } else if (gameState.phase === 'recalling') {
        elements['hud-time'].textContent = gameState.recallRemaining === null ? '제한 없음' : `${gameState.recallRemaining}초`;
      } else {
        elements['hud-time'].textContent = '-';
      }
    }

    function startPhaseTimer() {
      // 단계가 바뀔 때마다 기존 타이머를 먼저 제거해 중복 interval을 막는다.
      clearGameTimer();
      const activePhase = gameState.phase;
      if (activePhase === 'recalling' && gameState.recallRemaining === null) return;
      if (activePhase !== 'memorizing' && activePhase !== 'recalling') return;

      gameState.timerId = window.setInterval(() => {
        if (gameState.phase !== activePhase) {
          clearGameTimer();
          return;
        }
        if (activePhase === 'memorizing') {
          gameState.memorizeRemaining = Math.max(0, gameState.memorizeRemaining - 1);
          updateHud();
          if (gameState.memorizeRemaining === 0) beginRecall();
        } else {
          gameState.recallRemaining = Math.max(0, gameState.recallRemaining - 1);
          updateHud();
          if (gameState.recallRemaining === 0) gradeCurrentRound(true);
        }
      }, 1000);
    }

    function clearGameTimer() {
      if (gameState.timerId !== null) {
        window.clearInterval(gameState.timerId);
        gameState.timerId = null;
      }
    }

    function beginRecall() {
      if (gameState.phase !== 'memorizing') return;
      clearGameTimer();
      gameState.trayOrder = shuffledTrayOrder(gameState.correctPlacement);
      gameState.selectedItemId = null;
      gameState.userPlacement = Array(gameState.correctPlacement.length).fill(null);
      setPhase('recalling');
      announce('복원 단계가 시작되었습니다. 항목을 선택한 뒤 원래 위치의 슬롯을 선택하세요.');
      startPhaseTimer();
    }

    function togglePause() {
      if (gameState.phase === 'paused') {
        const resumePhase = gameState.phaseBeforePause;
        gameState.phaseBeforePause = null;
        setPhase(resumePhase);
        announce('훈련을 계속합니다.');
        startPhaseTimer();
        return;
      }
      if (gameState.phase !== 'memorizing' && gameState.phase !== 'recalling') return;
      gameState.phaseBeforePause = gameState.phase;
      clearGameTimer();
      gameState.phase = 'paused';
      elements['game-panel'].classList.add('is-paused');
      elements['paused-banner'].classList.remove('hidden');
      elements['pause-button'].textContent = '계속';
      updateHud();
      announce('훈련이 일시정지되었습니다.');
      elements['resume-button'].focus();
    }

    function itemById(itemId) {
      return gameState.items.find((item) => item.id === itemId) || null;
    }

    function itemContent(item, includeCorrectAnswer) {
      const glyph = item && item.kind === 'icon' ? `<span class="item-glyph" aria-hidden="true">${item.glyph}</span>` : '';
      const name = item ? item.name : '선택 안 함';
      const answer = includeCorrectAnswer ? `<span class="correct-answer">정답: ${includeCorrectAnswer}</span>` : '';
      return `${glyph}<span class="item-name">${name}</span>${answer}`;
    }

    function renderBoard() {
      // 슬롯 번호는 화면 크기와 무관하며 layout.positions의 논리 순서를 따른다.
      const layout = LAYOUTS[gameState.layoutType];
      if (!layout) return;
      elements['memory-board'].style.setProperty('--board-cols', layout.columns);
      elements['memory-board'].style.setProperty('--board-rows', layout.rows);
      elements['memory-board'].innerHTML = '';
      const totalCells = layout.columns * layout.rows;
      const result = gameState.lastResult;

      for (let position = 0; position < totalCells; position += 1) {
        const slotIndex = layout.positions.indexOf(position);
        if (slotIndex === -1) {
          const spacer = document.createElement('div');
          spacer.className = 'slot-spacer';
          spacer.setAttribute('role', 'presentation');
          elements['memory-board'].appendChild(spacer);
          continue;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'memory-slot';
        button.dataset.slotIndex = String(slotIndex);
        button.setAttribute('role', 'gridcell');

        let itemId = null;
        if (gameState.phase === 'memorizing') itemId = gameState.correctPlacement[slotIndex];
        else itemId = gameState.userPlacement[slotIndex];
        const item = itemById(itemId);

        if (item) {
          button.classList.add('memory-item', 'occupied');
          if (item.kind === 'word') button.classList.add('word-item');
        } else {
          button.classList.add('empty');
        }

        if (gameState.phase === 'result' && result) {
          const status = result.perSlot[slotIndex];
          button.classList.add(status);
          const correctItem = itemById(gameState.correctPlacement[slotIndex]);
          const correctAnswer = status === 'correct' ? null : correctItem.name;
          button.innerHTML = itemContent(item, correctAnswer);
          button.disabled = true;
          button.setAttribute('aria-label', `${slotIndex + 1}번 위치, ${status === 'correct' ? '정답' : status === 'wrong' ? '오답' : '선택하지 않음'}, 정답 ${correctItem.name}`);
        } else if (gameState.phase === 'memorizing') {
          button.innerHTML = itemContent(item, null);
          button.disabled = true;
          button.setAttribute('aria-label', `${slotIndex + 1}번 위치, ${item.name}`);
        } else {
          if (item) button.innerHTML = itemContent(item, null);
          button.setAttribute('aria-label', item ? `${slotIndex + 1}번 위치, ${item.name}. 누르면 다시 선택합니다.` : `${slotIndex + 1}번 빈 위치`);
          button.addEventListener('click', () => handleSlotClick(slotIndex));
          button.addEventListener('dragover', (event) => {
            if (gameState.phase === 'recalling') event.preventDefault();
          });
          button.addEventListener('drop', (event) => {
            event.preventDefault();
            handleDrop(slotIndex);
          });
          if (item) {
            button.draggable = true;
            button.addEventListener('dragstart', () => {
              draggedItem = { itemId, sourceSlot: slotIndex };
            });
            button.addEventListener('dragend', () => { draggedItem = null; });
          }
        }

        elements['memory-board'].appendChild(button);
      }
    }

    function renderTray() {
      if (gameState.phase !== 'recalling') {
        elements['item-tray'].innerHTML = '';
        return;
      }
      const placed = new Set(gameState.userPlacement.filter(Boolean));
      const available = gameState.trayOrder.filter((itemId) => !placed.has(itemId));
      elements['item-tray'].innerHTML = '';
      if (!available.length) {
        const message = document.createElement('p');
        message.className = 'tray-empty';
        message.textContent = '모든 항목을 배치했습니다.';
        const listItem = document.createElement('li');
        listItem.className = 'tray-empty-row';
        listItem.appendChild(message);
        elements['item-tray'].appendChild(listItem);
        return;
      }

      available.forEach((itemId) => {
        const item = itemById(itemId);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `memory-item${item.kind === 'word' ? ' word-item' : ''}${gameState.selectedItemId === itemId ? ' selected' : ''}`;
        button.dataset.itemId = itemId;
        button.setAttribute('aria-pressed', gameState.selectedItemId === itemId ? 'true' : 'false');
        button.setAttribute('aria-label', `${item.name}${gameState.selectedItemId === itemId ? ', 선택됨' : ', 선택하기'}`);
        button.innerHTML = itemContent(item, null);
        button.addEventListener('click', () => selectTrayItem(itemId));
        button.draggable = true;
        button.addEventListener('dragstart', () => {
          draggedItem = { itemId, sourceSlot: null };
        });
        button.addEventListener('dragend', () => { draggedItem = null; });
        const listItem = document.createElement('li');
        listItem.appendChild(button);
        elements['item-tray'].appendChild(listItem);
      });
    }

    function selectTrayItem(itemId) {
      if (gameState.phase !== 'recalling') return;
      gameState.selectedItemId = gameState.selectedItemId === itemId ? null : itemId;
      const item = itemById(itemId);
      announce(gameState.selectedItemId ? `${item.name} 항목을 선택했습니다. 배치할 슬롯을 선택하세요.` : `${item.name} 항목 선택을 취소했습니다.`);
      renderTray();
      const selectedButton = elements['item-tray'].querySelector(`[data-item-id="${itemId}"]`);
      if (selectedButton) selectedButton.focus();
    }

    function handleSlotClick(slotIndex) {
      if (gameState.phase !== 'recalling') return;
      const currentItemId = gameState.userPlacement[slotIndex];

      if (gameState.selectedItemId) {
        const selectedId = gameState.selectedItemId;
        const previousSlot = gameState.userPlacement.indexOf(selectedId);
        if (previousSlot >= 0) gameState.userPlacement[previousSlot] = null;
        gameState.userPlacement[slotIndex] = selectedId;
        gameState.selectedItemId = null;
        announce(`${itemById(selectedId).name} 항목을 ${slotIndex + 1}번 위치에 배치했습니다.`);
        renderRecallState(slotIndex);
      } else if (currentItemId) {
        gameState.userPlacement[slotIndex] = null;
        gameState.selectedItemId = currentItemId;
        announce(`${itemById(currentItemId).name} 항목을 ${slotIndex + 1}번 위치에서 꺼냈습니다. 새 위치를 선택하세요.`);
        renderRecallState(null, currentItemId);
      }
    }

    function handleDrop(targetSlot) {
      if (gameState.phase !== 'recalling' || !draggedItem) return;
      const { itemId, sourceSlot } = draggedItem;
      if (sourceSlot !== null && sourceSlot !== targetSlot) gameState.userPlacement[sourceSlot] = null;
      gameState.userPlacement[targetSlot] = itemId;
      gameState.selectedItemId = null;
      draggedItem = null;
      announce(`${itemById(itemId).name} 항목을 ${targetSlot + 1}번 위치에 배치했습니다.`);
      renderRecallState(targetSlot);
    }

    function renderRecallState(focusSlot, focusItem) {
      renderBoard();
      renderTray();
      updateCheckButton();
      if (focusSlot !== null && focusSlot !== undefined) {
        const slot = elements['memory-board'].querySelector(`[data-slot-index="${focusSlot}"]`);
        if (slot) slot.focus();
      } else if (focusItem) {
        const item = elements['item-tray'].querySelector(`[data-item-id="${focusItem}"]`);
        if (item) item.focus();
      }
    }

    function updateCheckButton() {
      const complete = gameState.userPlacement.length > 0 && gameState.userPlacement.every(Boolean);
      elements['check-button'].disabled = gameState.phase !== 'recalling' || !complete;
    }

    function gradeCurrentRound(timedOut) {
      if (gameState.phase !== 'recalling') return;
      clearGameTimer();
      const result = gradePlacement(gameState.correctPlacement, gameState.userPlacement);
      let gainedScore = 0;

      // 최초 채점만 점수와 연속 성공 기록에 반영한다. 복습 채점은 항상 무득점이다.
      if (!gameState.hasScoredCurrentRound && !gameState.reviewMode) {
        gainedScore = calculateRoundScore(
          result.correctCount,
          result.total,
          gameState.recallRemaining || 0,
          gameState.recallRemaining !== null
        );
        gameState.score += gainedScore;
        if (result.accuracy >= 80) gameState.streak += 1;
        else gameState.streak = 0;
        gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);
        gameState.advanceAfterRound = result.accuracy >= 80;
        gameState.hasScoredCurrentRound = true;
        records.highestScore = Math.max(records.highestScore, gameState.score);
        records.bestStreak = Math.max(records.bestStreak, gameState.bestStreak);
        records.highestLevel = Math.max(records.highestLevel, gameState.level);
        saveRecords();
        renderRecords();
      }

      gameState.lastResult = { ...result, gainedScore, timedOut, reviewMode: gameState.reviewMode };
      setPhase('result');
      renderResult();
      announce(`${result.total}개 중 ${result.correctCount}개의 위치를 맞혔습니다. 정확도 ${result.accuracy}퍼센트입니다.`);
    }

    function renderResult() {
      const result = gameState.lastResult;
      if (!result) return;
      elements['result-message'].textContent = `${result.total}개 중 ${result.correctCount}개의 위치를 맞혔습니다. 정확도 ${result.accuracy}%`;
      elements['result-correct'].textContent = `${result.correctCount} / ${result.total}`;
      elements['result-accuracy'].textContent = `${result.accuracy}%`;
      elements['result-score'].textContent = result.reviewMode ? '복습' : `+${result.gainedScore.toLocaleString('ko-KR')}`;
      elements['result-streak'].textContent = gameState.streak;
      elements['result-best-streak'].textContent = Math.max(gameState.bestStreak, records.bestStreak);

      if (result.reviewMode) {
        elements['result-guidance'].textContent = '같은 문제 복습 결과는 점수와 연속 성공 횟수에 다시 반영되지 않습니다.';
      } else if (result.accuracy >= 80 && gameState.level === 18) {
        elements['result-guidance'].textContent = '레벨 18을 완료했습니다. 전체 훈련 결과를 확인할 수 있습니다.';
      } else if (result.accuracy >= 80) {
        elements['result-guidance'].textContent = '정확도 80% 이상으로 다음 레벨이 열렸습니다.';
      } else {
        elements['result-guidance'].textContent = '현재 레벨에서 새 문제로 다시 훈련합니다.';
      }

      elements['next-round-button'].textContent = gameState.advanceAfterRound && gameState.level === 18 ? '전체 결과 보기' : '다음 라운드';
    }

    function restartCurrentRound() {
      if (gameState.phase !== 'recalling') return;
      startRound({ reuseItems: true, reviewMode: false });
      announce('같은 문제를 처음부터 다시 시작합니다.');
    }

    function reviewSameRound() {
      if (gameState.phase !== 'result') return;
      startRound({ reuseItems: true, reviewMode: true });
      announce('같은 문제를 점수 없이 복습합니다.');
    }

    function nextRound() {
      if (gameState.phase !== 'result') return;
      if (gameState.advanceAfterRound && gameState.level === 18) {
        finishTraining(true);
        return;
      }
      if (gameState.advanceAfterRound) gameState.level += 1;
      gameState.round += 1;
      startRound({ reuseItems: false, reviewMode: false });
    }

    function finishTraining(completedAllLevels) {
      if (gameState.phase !== 'result' && gameState.phase !== 'finished') return;
      clearGameTimer();
      gameState.phase = 'finished';
      elements['game-panel'].classList.add('hidden');
      elements['finished-panel'].classList.remove('hidden');
      elements['finished-level'].textContent = gameState.level;
      elements['finished-score'].textContent = gameState.score.toLocaleString('ko-KR');
      elements['finished-streak'].textContent = gameState.bestStreak;
      elements['finished-message'].textContent = completedAllLevels
        ? `축하합니다. 18레벨을 완료했습니다. 총 ${gameState.round}라운드를 훈련했습니다.`
        : `${gameState.round}라운드 동안 레벨 ${gameState.level}까지 훈련했습니다.`;
      announce('훈련을 종료했습니다. 전체 결과를 확인하세요.');
    }

    function returnToSetup() {
      clearGameTimer();
      gameState.phase = 'ready';
      elements['game-panel'].classList.add('hidden');
      elements['finished-panel'].classList.add('hidden');
      elements['setup-panel'].classList.remove('hidden');
      applySavedChoices();
      renderDifficultyNote();
      renderRecords();
      elements['start-button'].focus();
    }

    function resetRecords() {
      if (!window.confirm('배치 기억의 저장된 최고 기록과 최근 설정을 초기화할까요?')) return;
      records = { ...DEFAULT_RECORDS };
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        announce('브라우저 저장 공간에서 기록을 지우지 못했습니다.');
      }
      renderRecords();
      if (gameState.phase === 'result') {
        elements['result-best-streak'].textContent = gameState.bestStreak;
      } else {
        applySavedChoices();
        renderDifficultyNote();
      }
      announce('저장된 기록을 초기화했습니다.');
    }

    function announce(message) {
      elements['live-region'].textContent = '';
      window.setTimeout(() => { elements['live-region'].textContent = message; }, 20);
    }

    window.addEventListener('pagehide', clearGameTimer);
  }
}(typeof window !== 'undefined' ? window : globalThis));
