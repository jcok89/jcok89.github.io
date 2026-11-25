(() => {
'use strict';
const names = ['사과','고무 오리','머그컵','우산','바나나','카메라','열쇠','농구공','가위','곰 인형','운동화','축구공','책','배','기타','선글라스'];
const ids = names.map((_, i) => i);
const sizes = [4, 9, 12], times = [0, 5, 10, 20, 30];
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
      saved: Array.isArray(d?.saved) ? d.saved.filter(x => x && validScene(x.scene) && times.includes(x.seconds) && Number.isFinite(x.at)).slice(0, 5) : [],
      fresh: Array.isArray(d?.fresh) ? d.fresh.filter(x => x && sizes.includes(x.count) && times.includes(x.seconds) && Number.isInteger(x.exact) && x.exact >= 0 && x.exact <= x.count).slice(0, 40) : []
    };
  } catch { return {saved: [], fresh: []}; }
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
  showBest();
  section('setup','setup-title', !initial);
}
function showBest() {
  const size = Number($('size').value), time = Number($('seconds').value);
  const latest = log.fresh.find(x => x.count === size && x.seconds === time);
  $('best').hidden = !latest;
  if (latest) $('best').textContent = '이 설정에서 최근 새 사진의 첫 회상: ' + latest.exact + '/' + size;
}
function start(scene, seconds, mode, hidden = false) {
  if (!running) return;
  stopTimer();
  const extras = shuffle(ids.filter(id => !scene.includes(id))).slice(0, 4);
  s = {scene: [...scene], seconds, mode, options: shuffle([...scene, ...extras]), targets: scene.map((_, i) => i), answers: Array(scene.length).fill(null), active: 0, last: null};
  if (hidden) recall(); else observe();
}
function newPhoto() {
  if (!running) return;
  const n = Number($('size').value), seconds = Number($('seconds').value);
  let scene = shuffle(ids).slice(0, n);
  if (s && sameScene(scene, s.scene)) scene = [...scene.slice(1), scene[0]];
  start(scene, seconds, 'fresh');
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
  stopTimer();
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
  const scorecard = score(s.scene, s.answers, s.targets);
  s.last = scorecard;
  if (s.mode === 'fresh') {
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
