(() => {
    'use strict';

    const suits = [
        { symbol: '♠', name: '스페이드' }, { symbol: '♥', name: '하트', red: true },
        { symbol: '♦', name: '다이아몬드', red: true }, { symbol: '♣', name: '클로버' }
    ];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const handNames = ['하이 카드', '원 페어', '투 페어', '트리플', '스트레이트',
        '플러시', '풀하우스', '포카드', '스트레이트 플러시'];
    const deck = suits.flatMap((suit, s) => ranks.map((rank, r) => ({ id: s * 13 + r, suit, rank, value: r + 2 })));

    function shuffle(items) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    // Higher vectors win. Compare the category first, then the relevant ranks.
    function evaluate(cards) {
        const values = cards.map(card => card.value).sort((a, b) => b - a);
        const groups = [...new Set(values)].map(value => [values.filter(v => v === value).length, value])
            .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
        const [first, second] = groups;
        const distinct = groups.length === 5;
        const high = distinct && (values[0] - values[4] === 4 ? values[0] :
            values.join(',') === '14,5,4,3,2' ? 5 : 0);
        const flush = cards.every(card => card.suit === cards[0].suit);
        const ordered = groups.map(group => group[1]);
        if (flush && high) return [8, high];
        if (first[0] === 4) return [7, ...ordered];
        if (first[0] === 3 && second[0] === 2) return [6, ...ordered];
        if (flush) return [5, ...values];
        if (high) return [4, high];
        if (first[0] === 3) return [3, ...ordered];
        if (first[0] === 2) return [second[0] === 2 ? 2 : 1, ...ordered];
        return [0, ...values];
    }

    function compare(a, b) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const difference = (a[i] ?? 0) - (b[i] ?? 0);
            if (difference) return Math.sign(difference);
        }
        return 0;
    }

    function bestHand(board, community) {
        let best;
        for (let i = 0; i < board.length; i++) {
            for (let j = i + 1; j < board.length; j++) {
                const rating = evaluate([...community, board[i], board[j]]);
                if (!best || compare(rating, best.rating) > 0) best = { indices: [i, j], rating };
            }
        }
        return best;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { deck, shuffle, evaluate, compare, bestHand };
        return;
    }

    const $ = id => document.getElementById(id);
    const board = $('board');
    let state, interval;
    const name = card => card.rank + ' ' + card.suit.name;
    const symbol = card => card.rank + card.suit.symbol;
    const labelHand = rating => handNames[rating[0]];
    const mini = cards => '<span class="mini-cards">' + cards.map(card =>
        '<span class="mini' + (card.suit.red ? ' red' : '') + '" aria-label="' + name(card) + '">' +
        symbol(card) + '</span>').join('') + '</span>';

    function makeButton(text, action, secondary = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (secondary) button.className = 'secondary';
        button.addEventListener('click', action);
        return button;
    }

    function clearTimer() {
        clearInterval(interval);
        $('timer').textContent = '';
    }

    function drawBoard() {
        const active = ['question', 'choose'].includes(state.phase);
        const visible = ['memorize', 'result'].includes(state.phase);
        const focusedSlot = document.activeElement?.dataset.slot;
        board.replaceChildren(...state.cards.map((card, index) => {
            const button = document.createElement('button');
            const selected = state.selected.includes(index);
            const final = state.phase === 'result';
            const optimal = final && state.best?.indices.includes(index);
            const picked = final && state.mode === 'hand' && selected;
            const mark = picked && optimal ? '내 선택 / 최고' : picked ? '내 선택' : optimal ? '최고' : '';
            button.type = 'button';
            button.className = 'slot' + (visible ? '' : ' back') +
                (mark ? ' mark' : '');
            button.dataset.slot = index;
            button.disabled = !active;
            if (state.phase === 'choose') button.setAttribute('aria-pressed', selected);
            button.setAttribute('aria-label', (index + 1) + '번 위치' +
                (visible ? ', ' + name(card) : '') + (mark ? ', ' + mark : ''));
            if (visible) {
                if (card.suit.red) button.classList.add('red');
                button.innerHTML = '<span aria-hidden="true">' + card.rank + '</span><span aria-hidden="true">' +
                    card.suit.symbol + '</span><small aria-hidden="true">' + (index + 1) + '</small>' +
                    (mark ? '<span class="mark-text" aria-hidden="true">' + mark + '</span>' : '');
            } else {
                button.textContent = (index + 1) + (selected ? ' ✓' : '');
            }
            button.addEventListener('click', () => pick(index));
            return button;
        }));
        if (active && focusedSlot !== undefined) board.children[Number(focusedSlot)]?.focus({ preventScroll: true });
    }

    function setPhase(title, instruction, preventScroll = true) {
        $('phase').textContent = title;
        $('instruction').textContent = instruction;
        $('feedback').textContent = '';
        $('prompt').hidden = true;
        $('actions').replaceChildren();
        drawBoard();
        $('phase').focus({ preventScroll });
    }

    function start() {
        clearTimer();
        const mode = document.querySelector('[name="mode"]:checked').value;
        const size = Number($('size').value);
        const seconds = Number($('seconds').value);
        const count = $('questions').value === 'all' ? size : Number($('questions').value);
        const deal = shuffle(deck);
        state = { mode, phase: 'memorize', cards: deal.slice(0, size), community: deal.slice(size, size + 3),
            targets: shuffle(Array.from({ length: size }, (_, i) => i)).slice(0, count),
            index: 0, score: 0, selected: [] };
        $('result').hidden = true;
        $('setup').hidden = true;
        $('table').hidden = false;
        setPhase('1. 카드 기억하기', '카드의 숫자와 무늬가 어느 위치에 있는지 기억하세요.', false);
        $('actions').append(makeButton('카드 뒤집기', hideCards), makeButton('훈련 설정', settings, true));
        if (!seconds) {
            $('timer').textContent = '시간 제한 없음';
            return;
        }
        const end = performance.now() + seconds * 1000;
        const round = state;
        const tick = () => {
            if (state !== round || state.phase !== 'memorize') return;
            const remaining = Math.ceil((end - performance.now()) / 1000);
            if (remaining <= 0) hideCards();
            else $('timer').textContent = remaining + '초 남음';
        };
        interval = setInterval(tick, 100);
        tick();
    }

    function hideCards() {
        if (state.phase !== 'memorize') return;
        clearTimer();
        if (state.mode === 'recall') {
            question();
            return;
        }
        state.phase = 'choose';
        setPhase('2. 숨겨진 카드 2장 고르기', '공개 카드 3장과 합쳐 가장 강한 족보를 만들 두 위치를 고르세요.');
        const prompt = $('prompt');
        prompt.innerHTML = '공개 카드 ' + mini(state.community);
        prompt.hidden = false;
        const submit = makeButton('선택 완료', submitHand);
        submit.disabled = true;
        $('actions').append(submit, makeButton('훈련 설정', settings, true));
        $('feedback').textContent = '선택 0 / 2';
    }

    function question() {
        state.phase = 'question';
        state.selected = [];
        state.target = state.targets[state.index];
        setPhase('2. 위치 맞추기 · ' + (state.index + 1) + ' / ' + state.targets.length,
            '아래 카드가 원래 있었던 위치를 고르세요.');
        $('prompt').innerHTML = '찾을 카드 ' + mini([state.cards[state.target]]);
        $('prompt').hidden = false;
        $('actions').append(makeButton('모르겠어요', () => pick(-1), true), makeButton('훈련 설정', settings, true));
    }

    function pick(index) {
        if (state.phase === 'choose') {
            if (state.selected.includes(index)) state.selected = state.selected.filter(i => i !== index);
            else if (state.selected.length < 2) state.selected.push(index);
            else {
                $('feedback').textContent = '이미 2장을 골랐습니다. 바꾸려면 선택한 카드를 다시 누르세요.';
                return;
            }
            drawBoard();
            $('actions').firstElementChild.disabled = state.selected.length !== 2;
            $('feedback').textContent = '선택 ' + state.selected.length + ' / 2';
        } else if (state.phase === 'question') {
            state.phase = 'answer';
            state.selected = [index];
            if (index === state.target) state.score++;
            // Reveal only the target so later questions still test the original memory.
            board.querySelectorAll('button').forEach(button => {
                const i = Number(button.dataset.slot);
                button.disabled = true;
                if (i === state.target) {
                    button.className = 'slot mark' + (state.cards[i].suit.red ? ' red' : '');
                    button.textContent = symbol(state.cards[i]);
                    button.setAttribute('aria-label', (i + 1) + '번 위치, 정답 ' + name(state.cards[i]));
                }
                if (i === index && index !== state.target) button.classList.add('miss');
            });
            $('feedback').textContent = (index === state.target ? '정답!' : '정답 위치:') +
                ' ' + (state.target + 1) + '번 · ' + name(state.cards[state.target]);
            const last = state.index + 1 === state.targets.length;
            const next = makeButton(last ? '결과 보기' : '다음 문제', () => {
                if (state.phase !== 'answer') return;
                if (last) finish('<p><strong>' + state.score + ' / ' + state.targets.length + '</strong>개를 맞혔습니다.</p>');
                else {
                    state.index++;
                    question();
                }
            });
            $('actions').replaceChildren(next, makeButton('훈련 설정', settings, true));
            next.focus({ preventScroll: true });
        }
    }

    function submitHand() {
        if (state.phase !== 'choose' || state.selected.length !== 2) return;
        const yours = state.selected.map(i => state.cards[i]);
        const rating = evaluate([...state.community, ...yours]);
        state.best = bestHand(state.cards, state.community);
        const optimal = state.best.indices.map(i => state.cards[i]);
        const choice = state.selected.map(i => i + 1).join(', ');
        const best = state.best.indices.map(i => i + 1).join(', ');
        const message = compare(rating, state.best.rating) === 0 ? '이번 배치에서 가능한 최고 조합을 찾았습니다!' :
            '최고 조합과 비교해 보세요. 같은 족보라도 숫자로 순위가 달라질 수 있습니다.';
        finish('<p>' + message + '</p><p>공개 카드 ' + mini(state.community) + '</p>' +
            '<p><strong>내 족보: ' + labelHand(rating) + '</strong> · 선택 ' + choice + '번 ' + mini(yours) + '</p>' +
            '<p><strong>최고 족보: ' + labelHand(state.best.rating) + '</strong> · 선택 ' + best + '번 ' + mini(optimal) + '</p>');
    }

    function finish(html) {
        state.phase = 'result';
        $('phase').textContent = '카드 배치 확인';
        $('instruction').textContent = '처음 기억했던 카드 배치를 다시 확인하세요.';
        $('prompt').hidden = true;
        $('feedback').textContent = '';
        $('actions').replaceChildren();
        drawBoard();
        $('summary').innerHTML = html;
        $('result').hidden = false;
        $('result-title').focus();
    }

    function settings() {
        clearTimer();
        state = null;
        $('table').hidden = true;
        $('result').hidden = true;
        $('setup').hidden = false;
        $('start').focus();
    }

    $('start').addEventListener('click', start);
    $('again').addEventListener('click', start);
    $('settings').addEventListener('click', settings);
    const updateSetup = () => {
        $('question-setting').hidden = document.querySelector('[name="mode"]:checked').value === 'hand';
    };
    document.querySelectorAll('[name="mode"]').forEach(input => input.addEventListener('change', updateSetup));
    updateSetup();
})();
