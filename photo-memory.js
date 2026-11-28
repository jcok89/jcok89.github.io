(() => {
'use strict';
const names = ['사과','고무 오리','머그컵','우산','바나나','카메라','열쇠','농구공','가위','곰 인형','운동화','축구공','책','배','기타','선글라스'];
const ids = names.map((_, i) => i);
const LEVELS = Object.freeze([
  {count:4,seconds:10}, {count:6,seconds:15}, {count:6,seconds:10}, {count:9,seconds:15},
  {count:9,seconds:10}, {count:12,seconds:15}, {count:12,seconds:10}, {count:12,seconds:5}
]);
const WINDOW = 3;
const sizes = [4, 6, 9, 12], times = [0, 5, 10, 15, 20, 30];
const storageKey = 'jake-photo-memory:v1';
const $ = id => document.getElementById(id);
const shuffle = values => {
  const a = Array.from(values);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pct = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';
const cols = n => n === 4 ? 2 : 3;
const maxLevel = LEVELS.length - 1;
const baseRank = () => ({level:0, rounds:[], mastered:false});
const recentAvg = (rank, level = rank.level) => {
  const total = rank.rounds.reduce((sum, x) => sum + x, 0);
  return rank.rounds.length ? pct(total, LEVELS[level].count * rank.rounds.length) : '—';
};
function readRank(x) {
  if (!Number.isInteger(x?.level) || x.level < 0 || x.level > maxLevel) return baseRank();
  const count = LEVELS[x.level].count;
  const rounds = Array.isArray(x.rounds) ? x.rounds.filter(n => Number.isInteger(n) && n >= 0 && n <= count).slice(-WINDOW) : [];
  return {level:x.level, rounds, mastered:x.level === maxLevel && x.mastered === true};
}
function recordRank(rank, exact) {
  const level = rank.level, count = LEVELS[level].count;
  const rounds = [...rank.rounds, exact].slice(-WINDOW);
  const total = rounds.reduce((sum, x) => sum + x, 0);
  const qualified = rounds.length === WINDOW && total * 10 >= 9 * count * WINDOW && rounds.every(x => x * 4 >= count * 3);
  const from = {level, rounds, mastered:rank.mastered};
  const promoted = qualified && level < maxLevel;
  const mastered = rank.mastered || (qualified && level === maxLevel);
  const next = promoted ? {level:level + 1,rounds:[],mastered:false} : {level,rounds,mastered};
  return {from,next,promoted,newMastery:mastered && !rank.mastered};
}
const validScene = a => Array.isArray(a) && sizes.includes(a.length) && a.every(i => ids.includes(i)) && new Set(a).size === a.length;
const el = (tag, cls, value) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (value !== undefined) e.textContent = value;
  return e;
};
function readLog() {
  try {
    const d = JSON.parse(localStorage.getItem(storageKey));
    return {
      rank: readRank(d?.rank),
      trainingMode: d?.trainingMode === 'manual' ? 'manual' : 'auto',
      recent: Array.isArray(d?.recent) ? d.recent.filter(validScene).slice(0, 12) : [],
      saved: Array.isArray(d?.saved) ? d.saved.filter(x => x && validScene(x.scene) && times.includes(x.seconds) && Number.isFinite(x.at)).slice(0, 5) : [],
      fresh: Array.isArray(d?.fresh) ? d.fresh.filter(x => x && sizes.includes(x.count) && times.includes(x.seconds) && Number.isInteger(x.exact) && x.exact >= 0 && x.exact <= x.count).slice(0, 40) : []
    };
  } catch { return {rank:baseRank(), trainingMode:'auto', recent:[], saved: [], fresh: []}; }
}
const log = readLog();
let s, interval, running = false;
const dateLabel = new Intl.DateTimeFormat('ko-KR', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
const save = () => { try {localStorage.setItem(storageKey, JSON.stringify(log));} catch { /* practice still works */ } };
const sameScene = (a, b) => a.every((x, i) => x === b[i]) && a.length === b.length;
function section(show, heading, focus = true) {
  ['setup','play','result'].forEach(id => { $(id).hidden = id !== show; });
  if (focus) {
    window.scrollTo(0, 0);
    $(heading).focus({preventScroll:true});
  }
}
function makeSprite(id) {
  const sprite = el('span','photo-sprite');
  sprite.setAttribute('aria-hidden','true');
  sprite.style.setProperty('--x', (id % 4) * 100 / 3 + '%');
  sprite.style.setProperty('--y', Math.floor(id / 4) * 100 / 3 + '%');
  return sprite;
}
function grid(node) {
  const c = cols(s.scene.length);
  node.dataset.cols = c;
  node.dataset.count = s.scene.length;
  node.style.setProperty('--cols', c);
}
const place = (i,n) => {
  const c = cols(n), row = Math.floor(i/c), col = i%c, height = n/c;
  if (n === 4) return (row ? '왼쪽 아래|오른쪽 아래' : '왼쪽 위|오른쪽 위').split('|')[col];
  const vertical = row === 0 ? '맨 위' : row === height-1 ? '맨 아래' : (row+1) + '번째 줄';
  return vertical + ' ' + ['왼쪽','가운데','오른쪽'][col];
};
function stopTimer() {
  window.clearInterval(interval);
  interval = null;
  $('timer').hidden = true;
}
function showSetup(initial = false) {
  stopTimer();
  const list = $('saved-list');
  list.replaceChildren();
  for (const item of log.saved) {
    const b = el('button','secondary',item.scene.length + '개 · ' + dateLabel.format(item.at));
    b.type = 'button';
    b.addEventListener('click', () => start(item.scene, item.seconds, 'saved', true));
    list.append(b);
  }
  $('saved').hidden = !list.childElementCount;
  showTraining();
  section('setup','setup-title', !initial);
}
const isAuto = () => log.trainingMode === 'auto';
const configLabel = level => LEVELS[level].count + '장 · ' + LEVELS[level].seconds + '초';
const startLabel = () => isAuto() ? '레벨 ' + (log.rank.level + 1) + ' 시작' : '새 사진 시작';
function showTraining() {
  const rank = log.rank, auto = isAuto();
  $('training-mode').value = log.trainingMode;
  $('auto-panel').hidden = !auto;
  $('manual-settings').hidden = auto;
  $('start').textContent = startLabel();
  $('level-title').textContent = 'Lv. ' + (rank.level + 1) + ' / ' + LEVELS.length + (rank.mastered ? ' · 최고 레벨 달성' : '');
  $('level-config').textContent = configLabel(rank.level);
  $('level-progress').value = rank.rounds.length;
  $('level-progress-label').textContent = '현재 레벨 측정 ' + rank.rounds.length + '/' + WINDOW + '회';
  $('level-detail').textContent = rank.rounds.length
    ? '최근 평균 완전 일치 ' + recentAvg(rank) + ' · ' + (rank.mastered ? '최고 레벨 유지 연습' : '승급 기준: 평균 90% 이상, 매회 75% 이상')
    : '새 사진의 첫 회상으로 측정해요. 목표: 3회 평균 90% 이상, 매회 75% 이상.';
  showBest();
}
function showBest() {
  const size = Number($('size').value), time = Number($('seconds').value);
  const latest = log.fresh.find(x => x.count === size && x.seconds === time);
  $('best').hidden = isAuto() || !latest;
  if (latest) $('best').textContent = '이 설정에서 최근 새 사진의 첫 회상: ' + latest.exact + '/' + size;
}
function start(scene, seconds, mode, hidden = false, rankedLevel = null) {
  if (!running) return;
  stopTimer();
  const extras = shuffle(ids.filter(id => !scene.includes(id))).slice(0, 4);
  s = {scene: [...scene], seconds, mode, options: shuffle([...scene, ...extras]), targets: scene.map((_, i) => i), answers: Array(scene.length).fill(null), active: 0, last: null, rankedLevel, interrupted:false, phase:null};
  if (hidden) recall(); else observe();
}
function newPhoto() {
  if (!running) return;
  const rank = isAuto() ? log.rank.level : null;
  const {count:n, seconds} = rank !== null ? LEVELS[rank] : {count:Number($('size').value), seconds:Number($('seconds').value)};
  const recent = [...log.recent, ...(s ? [s.scene] : [])];
  let scene = shuffle(ids).slice(0, n);
  for (let attempt=0; attempt<20 && recent.some(previous => sameScene(scene,previous)); attempt++) {
    scene = shuffle(ids).slice(0,n);
  }
  // Rotating through the 16 items gives more unique layouts than the recent list holds.
  if (recent.some(previous => sameScene(scene,previous))) {
    const all = scene.concat(ids.filter(id => !scene.includes(id)));
    for(let shift=1;shift<all.length;shift++){
      const alternate = all.slice(shift).concat(all.slice(0,shift)).slice(0,n);
      if (!recent.some(previous => sameScene(alternate,previous))) {scene = alternate;break;}
    }
  }
  log.recent = [scene,...log.recent].slice(0,12);
  save();
  start(scene, seconds, 'fresh', false, rank);
}
function drawBoard(observing, restore = false) {
  const node = $('board');
  grid(node);
  node.replaceChildren();
  s.scene.forEach((id,i) => {
    const included = s.targets.includes(i);
    const selected = !observing && included && i === s.active;
    const shown = observing && included ? id : null;
    const placed = s.answers[i];
    const cell = el(!observing && included ? 'button' : 'div','photo-cell' + (selected ? ' active' : '') + (!included ? ' locked' : ''));
    const title = (i+1) + '번 · ' + place(i, s.scene.length);
    cell.dataset.slot = i;
    if (cell.tagName === 'BUTTON') {
      cell.type = 'button';
      cell.setAttribute('aria-pressed', String(selected));
      cell.addEventListener('click', () => { s.active = i; syncRecall(true); });
    } else cell.setAttribute('role','img');
    cell.setAttribute('aria-label', title + (shown !== null ? ': ' + names[shown] : placed !== null ? ': ' + names[placed] : included ? ' 빈칸' : ' 맞힌 자리'));
    cell.append(el('span','photo-index', i+1));
    if (shown !== null) cell.append(makeSprite(shown));
    else if (placed !== null) cell.append(makeSprite(placed));
    else cell.append(el('span','', included ? '?' : '✓'));
    node.append(cell);
  });
  if (restore) node.querySelector('[data-slot="' + s.active + '"]')?.focus({preventScroll:true});
}
function observe() {
  stopTimer();
  s.phase = 'observe';
  $('phase').textContent = s.mode === 'missed' ? '오답 사진 관찰' : '사진 관찰';
  $('hint').textContent = s.mode === 'missed' ? '틀렸던 자리에 어떤 물건이 있었는지 다시 보세요.' : '물건 하나와 그 자리를 한 장면으로 묶어 보세요.';
  $('hide').hidden = false;
  $('grade').hidden = $('picker').hidden = true;
  drawBoard(true);
  section('play','phase');
  if (!s.seconds) return;
  const deadline = performance.now() + s.seconds * 1000;
  const tick = () => {
    const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    if (!left) recall();
    else $('timer').textContent = '남은 시간 ' + left + '초';
  };
  $('timer').hidden = false;
  tick();
  interval = window.setInterval(tick, 125);
}
function recall() {
  if (!s || (s.phase !== 'observe' && !(s.phase === null && s.mode === 'saved'))) return;
  stopTimer();
  s.phase = 'recall';
  $('phase').textContent = s.mode === 'saved' ? '지난 사진 복습' : '가린 사진 떠올리기';
  $('hint').textContent = '빈칸을 누르고 그 자리에 있던 물건을 고르세요. 모르겠으면 비워 두어도 돼요.';
  $('picker-feedback').textContent = '';
  $('hide').hidden = true;
  $('grade').hidden = $('picker').hidden = false;
  const options = $('choices');
  options.replaceChildren();
  for (const id of s.options) {
    const b = el('button','photo-choice');
    b.type = 'button';
    b.dataset.id = id;
    b.append(makeSprite(id), el('span','',names[id]));
    b.addEventListener('click', () => pick(id));
    options.append(b);
  }
  syncRecall();
  section('play','phase');
}
function syncRecall(restore = false) {
  drawBoard(false, restore);
  const current = s.answers[s.active];
  $('target').textContent = (s.active + 1) + '번 · ' + place(s.active,s.scene.length) + ' 물건 고르기';
  for (const b of $('choices').children) {
    const id = Number(b.dataset.id);
    const at = s.answers.indexOf(id);
    b.disabled = at !== -1 && !s.targets.includes(at);
    b.classList.toggle('in-use', at !== -1);
    b.setAttribute('aria-pressed', String(current === id));
    b.setAttribute('aria-label',names[id] + (at === -1 ? '' : ', ' + (at+1) + '번에 선택됨'));
  }
  $('clear').disabled = current === null;
  const answered = s.targets.filter(i => s.answers[i] !== null).length;
  $('grade').textContent = '채점하기 (' + answered + '/' + s.targets.length + ')';
}
function pick(id) {
  const i = s.active;
  const prior = s.answers.indexOf(id);
  if (prior !== -1 && !s.targets.includes(prior)) return;
  if (prior !== -1 && prior !== i) s.answers[prior] = s.answers[i];
  s.answers[i] = id;
  const next = [...s.targets.filter(x => x > i), ...s.targets.filter(x => x < i)].find(x => s.answers[x] === null);
  if (next !== undefined) s.active = next;
  $('picker-feedback').textContent = (i+1) + '번에 ' + names[id] + ' 선택.' + (next !== undefined ? ' 다음 빈칸: ' + (next+1) + '번.' : '');
  syncRecall();
}
function score(scene, answers, targets) {
  const expected = new Set(targets.map(i => scene[i]));
  const remembered = new Set(targets.map(i => answers[i]).filter(id => expected.has(id))).size;
  const misses = targets.filter(i => answers[i] !== scene[i]);
  return {remembered, misses, exact: targets.length - misses.length};
}
function grade() {
  if (s?.phase !== 'recall') return;
  s.phase = 'result';
  let evaluation = null;
  const scorecard = score(s.scene, s.answers, s.targets);
  s.last = scorecard;
  if (s.mode === 'fresh') {
    if (s.rankedLevel !== null && !s.interrupted && s.rankedLevel === log.rank.level) {
      evaluation = recordRank(log.rank, scorecard.exact);
      log.rank = evaluation.next;
    }
    log.fresh = [{count:s.scene.length,seconds:s.seconds,exact:scorecard.exact},...log.fresh].slice(0,40);
    if (scorecard.misses.length) {
      log.saved = [{scene:[...s.scene],seconds:s.seconds,at:Date.now()},...log.saved.filter(x => !sameScene(x.scene,s.scene))].slice(0,5);
    }
    save();
  } else if (s.mode === 'saved' && !scorecard.misses.length) {
    log.saved = log.saved.filter(x => !sameScene(x.scene,s.scene));
    save();
  }
  const n = s.targets.length;
  const cards = [
    ['물건 기억',scorecard.remembered + '/' + n + ' · ' + pct(scorecard.remembered,n)],
    ['자리 기억',pct(scorecard.exact,scorecard.remembered)],
    ['완전 일치',scorecard.exact + '/' + n + ' · ' + pct(scorecard.exact,n)]
  ];
  $('scores').replaceChildren(...cards.map(([label,value]) => {
    const box = el('div','photo-score');
    box.append(el('span','',label),el('strong','',value));
    return box;
  }));
  const modeName = {fresh:'새 사진 첫 회상',saved:'지난 사진 복습',same:'같은 사진 복습',missed:'오답 자리 복습'};
  $('result-title').textContent = modeName[s.mode] + ' 결과';
  const levelResult = $('level-result');
  levelResult.hidden = false;
  levelResult.classList.toggle('promoted', Boolean(evaluation?.promoted || evaluation?.newMastery));
  if (evaluation?.promoted) {
    levelResult.textContent = '레벨 업! Lv. ' + (log.rank.level + 1) + ' · 다음 판 ' + configLabel(log.rank.level) + '. 최근 3회 평균 완전 일치 ' + recentAvg(evaluation.from) + '.';
  } else if (evaluation?.newMastery) {
    levelResult.textContent = '최고 레벨 달성! Lv. ' + (log.rank.level + 1) + '에서 최근 3회 평균 완전 일치 ' + recentAvg(evaluation.from) + '를 기록했어요.';
  } else if (evaluation) {
    levelResult.textContent = 'Lv. ' + (log.rank.level + 1) + ' · 최근 ' + evaluation.from.rounds.length + '/' + WINDOW + '회 평균 완전 일치 ' + recentAvg(evaluation.from) + '.'
      + (log.rank.mastered ? ' 최고 레벨 유지 연습입니다.' : evaluation.from.rounds.length === WINDOW ? ' 같은 레벨에서 최근 3회 성적을 계속 갱신해요.' : '');
  } else if (s.rankedLevel !== null && s.interrupted) {
    levelResult.textContent = '관찰 중 다른 화면으로 이동한 판은 레벨 측정에 넣지 않았어요.';
  } else {
    levelResult.textContent = '연습 점수만 표시해요. 자동 레벨에는 반영하지 않았어요.';
  }
  $('next').textContent = startLabel();
  $('result-note').textContent = '물건 기억은 자리와 무관하게, 자리 기억은 맞힌 물건 중 제자리에 둔 비율로 계산해요.';
  const comp = $('comparison');
  grid(comp);
  comp.replaceChildren(...s.scene.map((id,i) => {
    const answer = s.answers[i], included = s.targets.includes(i), ok = answer === id;
    const tile = el('div','photo-review' + (!ok && included ? ' missed' : ''));
    tile.append(el('strong','', (i+1) + '번 · ' + (included ? (ok ? '정답' : '오답') : '이전 정답')));
    tile.append(makeSprite(id),el('p','', '정답: ' + names[id]));
    if (!ok && included) tile.append(el('p','', '내 답: ' + (answer === null ? '미응답' : names[answer])));
    return tile;
  }));
  $('retry').hidden = !scorecard.misses.length;
  section('result','result-title');
}
function retry() {
  if (!s.last?.misses.length) return;
  s.mode = 'missed';
  s.targets = s.last.misses;
  const included = new Set(s.targets);
  s.answers = s.scene.map((id,i) => included.has(i) ? null : id);
  s.active = s.targets[0];
  s.last = null;
  observe();
}
$('start').addEventListener('click', newPhoto);
$('next').addEventListener('click', newPhoto);
$('hide').addEventListener('click', recall);
$('grade').addEventListener('click', grade);
$('clear').addEventListener('click', () => {
  s.answers[s.active] = null;
  syncRecall();
  $('choices').firstElementChild?.focus({preventScroll:true});
});
$('exit').addEventListener('click', () => showSetup());
$('home').addEventListener('click', () => showSetup());
$('retry').addEventListener('click', retry);
$('same').addEventListener('click', () => start(s.scene,s.seconds,'same'));
$('training-mode').addEventListener('change', () => {
  log.trainingMode = $('training-mode').value === 'manual' ? 'manual' : 'auto';
  save();
  showTraining();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && s?.phase === 'observe' && s.rankedLevel !== null && !$('play').hidden) s.interrupted = true;
});
$('size').addEventListener('change', showBest);
$('seconds').addEventListener('change', showBest);
showSetup(true);
const asset = new Image();
asset.onload = () => {
  running = true;
  $('start').disabled = false;
  $('loading').hidden = true;
};
asset.onerror = () => { $('loading').textContent = '사진을 불러오지 못했습니다. 새로고침해 주세요.'; };
asset.src = 'photo-objects.webp';
})();

