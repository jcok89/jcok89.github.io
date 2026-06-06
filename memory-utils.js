window.MemoryTrainer = (() => {
  const KEY = 'jakeMemoryTrainer:v1';
  const DAY = 24 * 60 * 60 * 1000;
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { wordStats: {}, sessions: [], reviews: [] }; }
    catch (e) { return { wordStats: {}, sessions: [], reviews: [] }; }
  };
  const save = data => localStorage.setItem(KEY, JSON.stringify(data));
  const norm = value => String(value || '').trim().replace(/\s+/g, '');
  const wordOf = item => norm(typeof item === 'string' ? item : item.word);
  const addDays = days => new Date(Date.now() + days * DAY).toISOString();

  function dueReviews(program) {
    const data = load();
    const now = Date.now();
    return data.reviews.filter(r => !r.done && (!program || r.program === program) && new Date(r.dueAt).getTime() <= now);
  }
  function reviewWords(program) { return [...new Set(dueReviews(program).map(r => r.word))]; }

  function weightedPool(items, program) {
    const data = load();
    const dueSet = new Set(reviewWords(program));
    const result = [];
    items.forEach(item => {
      const word = wordOf(item);
      const stat = data.wordStats[word] || {};
      let weight = 1 + Math.min(6, stat.missed || 0) + Math.min(4, stat.weight || 0);
      if (dueSet.has(word)) weight += 8;
      for (let i = 0; i < weight; i++) result.push(item);
    });
    return result.length ? result : items;
  }

  function recordSession(program, items, correctWords, extra = {}) {
    const data = load();
    const correctSet = new Set(correctWords.map(norm));
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const uniqueWords = [...new Set(items.map(wordOf).filter(Boolean))];
    const correct = uniqueWords.filter(w => correctSet.has(w));
    const missed = uniqueWords.filter(w => !correctSet.has(w));

    uniqueWords.forEach(word => {
      const stat = data.wordStats[word] || { seen: 0, correct: 0, missed: 0, weight: 0, lastSeen: null };
      stat.seen += 1;
      stat.lastSeen = now;
      if (correctSet.has(word)) {
        stat.correct += 1;
        stat.weight = Math.max(0, (stat.weight || 0) - 1);
        data.reviews.forEach(r => {
          if (r.word === word && r.program === program && !r.done && new Date(r.dueAt).getTime() <= nowMs) r.done = true;
        });
      } else {
        stat.missed += 1;
        stat.weight = Math.min(12, (stat.weight || 0) + 3);
        [1, 3, 7].forEach(days => data.reviews.push({ word, program, dueAt: addDays(days), days, done: false, createdAt: now }));
      }
      data.wordStats[word] = stat;
    });

    data.sessions.push({ program, date: now, total: uniqueWords.length, correct: correct.length, missed: missed.length, score: uniqueWords.length ? Math.round((correct.length / uniqueWords.length) * 100) : 0, words: uniqueWords, missedWords: missed, extra });
    data.sessions = data.sessions.slice(-300);
    data.reviews = data.reviews.slice(-1200);
    save(data);
    return { total: uniqueWords.length, correct: correct.length, missed, score: uniqueWords.length ? Math.round((correct.length / uniqueWords.length) * 100) : 0 };
  }

  function history(program, limit = 20) { return load().sessions.filter(s => !program || s.program === program).slice(-limit); }
  function drawChart(canvas, program) {
    const el = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    const rows = history(program, 12);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, el.width, el.height);
    ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(34, 10); ctx.lineTo(34, el.height - 28); ctx.lineTo(el.width - 10, el.height - 28); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '12px Malgun Gothic, sans-serif'; ctx.fillText('최근 점수', 10, 16);
    if (!rows.length) { ctx.fillText('아직 기록이 없습니다.', 48, 64); return; }
    const barW = Math.max(12, (el.width - 60) / rows.length - 6);
    rows.forEach((row, i) => {
      const x = 42 + i * (barW + 6), h = Math.max(2, (el.height - 48) * (row.score / 100)), y = el.height - 28 - h;
      ctx.fillStyle = '#10b981'; ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = '#334155'; ctx.fillText(String(row.score), x, y - 4);
    });
  }
  function summary(program) {
    const sessions = history(program, 9999);
    const last = sessions[sessions.length - 1];
    return { due: reviewWords(program).length, totalSessions: sessions.length, lastScore: last ? last.score : null };
  }
  return { load, save, norm, wordOf, weightedPool, reviewWords, dueReviews, recordSession, history, drawChart, summary };
})();
