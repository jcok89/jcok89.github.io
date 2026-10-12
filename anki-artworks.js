(function () {
    'use strict';

    const STORAGE_KEY = 'jake-anki-artworks-v1';
    const MODE_KEY = 'jake-anki-artworks-mode';
    const ORDER_KEY = 'jake-anki-artworks-order';
    const sessions = AnkiSession.create('artworks');
    const DAY = 24 * 60 * 60 * 1000;
    const ratings = {
        again: { delay: 60 * 1000, multiplier: 0, easeDelta: -0.2 },
        hard: { delay: 6 * 60 * 60 * 1000, multiplier: 1.2, easeDelta: -0.15 },
        good: { delay: DAY, multiplier: 2.5, easeDelta: 0 },
        easy: { delay: 4 * DAY, multiplier: 4, easeDelta: 0.15 }
    };

    const elements = {
        mode: document.getElementById('study-mode'),
        order: document.getElementById('review-order'),
        sessionMessage: document.getElementById('session-message'),
        restart: document.getElementById('restart-session'),
        remaining: document.getElementById('remaining-count'),
        studied: document.getElementById('studied-count'),
        total: document.getElementById('total-count'),
        progress: document.getElementById('progress-fill'),
        reviewArea: document.querySelector('.review-area'),
        front: document.getElementById('card-front'),
        back: document.getElementById('card-back'),
        show: document.getElementById('show-answer'),
        ratingButtons: document.getElementById('rating-buttons'),
        complete: document.getElementById('complete-panel'),
        completeMessage: document.getElementById('complete-message'),
        reviewAll: document.getElementById('review-all'),
        reset: document.getElementById('reset-progress')
    };

    let progress = loadProgress();
    let deck = [];
    let queue = [];
    let currentCard = null;
    let sessionTotal = 0;
    let includeFuture = false;

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function loadProgress() {
        return AnkiSession.readProgress(STORAGE_KEY);
    }

    function saveProgress() {
        if (!AnkiSession.write(STORAGE_KEY, JSON.stringify(progress))) showStorageWarning();
    }

    function makeWorkCards() {
        return ANKI_ARTWORKS.map((item) => ({
            id: `work-${item.no}`,
            type: 'work-to-artist',
            work: item.work,
            artist: item.artist,
            artistEn: item.artistEn,
            numbers: [item.no]
        }));
    }

    function makeArtistCards() {
        const artists = new Map();
        ANKI_ARTWORKS.forEach((item) => {
            const key = item.artistEn;
            if (!artists.has(key)) {
                artists.set(key, { artist: item.artist, artistEn: item.artistEn, works: [], numbers: [] });
            }
            artists.get(key).works.push(item.work);
            artists.get(key).numbers.push(item.no);
        });
        return Array.from(artists.values()).map((item) => ({
            id: `artist-${slug(item.artistEn)}-${item.numbers.join('-')}`,
            type: 'artist-to-work',
            ...item
        }));
    }

    function slug(value) {
        return value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    }

    function buildDeck(mode) {
        const workCards = makeWorkCards();
        if (mode === 'work-to-artist') return workCards;
        const artistCards = makeArtistCards();
        if (mode === 'artist-to-work') return artistCards;
        return interleave(workCards, artistCards);
    }

    function interleave(first, second) {
        const result = [];
        const length = Math.max(first.length, second.length);
        for (let index = 0; index < length; index += 1) {
            if (first[index]) result.push(first[index]);
            if (second[index]) result.push(second[index]);
        }
        return result;
    }

    function sessionScope() {
        return [elements.mode.value];
    }

    function showStorageWarning() {
        elements.sessionMessage.textContent = '저장 공간에 접근할 수 없어 이번 복습은 저장되지 않습니다.';
    }

    function saveSession() {
        const remaining = currentCard ? [currentCard, ...queue] : queue;
        if (!sessions.save(sessionScope(), deck, remaining, sessionTotal, includeFuture, elements.order.value)) {
            showStorageWarning();
        }
    }

    function startSession(restart = false) {
        deck = buildDeck(elements.mode.value);
        const saved = restart ? null : sessions.load(sessionScope(), deck);
        if (saved) {
            queue = saved.remaining;
            sessionTotal = saved.total;
            includeFuture = saved.includeFuture;
            elements.order.value = saved.order;
            elements.sessionMessage.textContent = '멈춘 지점부터 이어서 복습합니다. 남은 순서도 그대로 유지됩니다.';
        } else {
            const now = Date.now();
            queue = deck.filter((card) => includeFuture || !progress[card.id] || progress[card.id].due <= now);
            if (elements.order.value === 'random') queue = AnkiSession.shuffle(queue);
            sessionTotal = queue.length;
            elements.sessionMessage.textContent = '멈춘 카드와 남은 순서는 자동 저장됩니다. 다시 열면 이어서 시작합니다.';
        }
        currentCard = null;
        elements.total.textContent = deck.length.toLocaleString('ko-KR');
        showNextCard();
    }

    function showNextCard() {
        currentCard = queue.shift() || null;
        saveSession();
        updateStatus();
        if (!currentCard) {
            showComplete();
            return;
        }

        elements.complete.hidden = true;
        elements.reviewArea.hidden = false;
        elements.front.hidden = false;
        elements.back.hidden = true;
        elements.show.hidden = false;
        elements.ratingButtons.hidden = true;
        renderCard(currentCard);
        elements.show.focus({ preventScroll: true });
    }

    function renderCard(card) {
        if (card.type === 'work-to-artist') {
            elements.front.innerHTML = `
                <span class="card-label">작품 → 작가</span>
                <h2 class="card-question">《${escapeHtml(card.work)}》</h2>
                <p class="card-prompt">이 작품을 그린 작가는?</p>
                <span class="source-number">목록 #${card.numbers[0]}</span>`;
            elements.back.innerHTML = `
                <span class="card-label">정답</span>
                <p class="answer-primary">${escapeHtml(card.artist)}</p>
                <span class="answer-rule"></span>
                <p class="answer-secondary">${escapeHtml(card.artistEn)}</p>
                <span class="source-number">《${escapeHtml(card.work)}》 · #${card.numbers[0]}</span>`;
            return;
        }

        const works = card.works.map((work) => `<li>《${escapeHtml(work)}》</li>`).join('');
        elements.front.innerHTML = `
            <span class="card-label">작가 → 작품</span>
            <h2 class="card-question">${escapeHtml(card.artist)}</h2>
            <p class="answer-secondary">${escapeHtml(card.artistEn)}</p>
            <p class="card-prompt">이 목록에 포함된 작품은?</p>`;
        elements.back.innerHTML = `
            <span class="card-label">정답 · ${card.works.length}점</span>
            <ul class="answer-list">${works}</ul>
            <span class="source-number">목록 #${card.numbers.join(', #')}</span>`;
    }

    function revealAnswer() {
        if (!currentCard || elements.show.hidden) return;
        elements.front.hidden = true;
        elements.back.hidden = false;
        elements.show.hidden = true;
        elements.ratingButtons.hidden = false;
        elements.ratingButtons.querySelector('[data-rating="good"]').focus({ preventScroll: true });
    }

    function rateCard(ratingName) {
        if (!currentCard || elements.ratingButtons.hidden) return;
        const rule = ratings[ratingName];
        if (!rule) return;
        const previous = progress[currentCard.id] || { interval: 0, ease: 2.5, reviews: 0, lapses: 0 };
        let interval;

        if (ratingName === 'again') {
            interval = rule.delay;
        } else if (previous.interval > 0) {
            interval = Math.max(rule.delay, Math.round(previous.interval * rule.multiplier * previous.ease));
        } else {
            interval = rule.delay;
        }

        progress[currentCard.id] = {
            due: Date.now() + interval,
            interval,
            ease: Math.max(1.3, previous.ease + rule.easeDelta),
            reviews: previous.reviews + 1,
            lapses: previous.lapses + (ratingName === 'again' ? 1 : 0)
        };
        saveProgress();
        showNextCard();
    }

    function updateStatus() {
        const reviewed = deck.filter((card) => progress[card.id]?.reviews > 0).length;
        const remaining = currentCard ? queue.length + 1 : queue.length;
        const completedThisSession = Math.max(0, sessionTotal - remaining);
        elements.remaining.textContent = remaining.toLocaleString('ko-KR');
        elements.studied.textContent = reviewed.toLocaleString('ko-KR');
        elements.progress.style.width = sessionTotal ? `${(completedThisSession / sessionTotal) * 100}%` : '100%';
    }

    function showComplete() {
        elements.reviewArea.hidden = true;
        elements.complete.hidden = false;
        const reviewed = deck.filter((card) => progress[card.id]?.reviews > 0).length;
        elements.completeMessage.textContent = reviewed
            ? `${reviewed.toLocaleString('ko-KR')}장의 학습 기록을 보관 중입니다. 기억 상태에 맞춰 다시 보여드릴게요.`
            : '지금 복습할 카드가 없습니다. 전체 카드를 다시 볼 수도 있습니다.';
    }

    elements.show.addEventListener('click', revealAnswer);
    elements.ratingButtons.addEventListener('click', (event) => {
        const button = event.target.closest('[data-rating]');
        if (button) rateCard(button.dataset.rating);
    });
    elements.mode.addEventListener('change', () => {
        AnkiSession.write(MODE_KEY, elements.mode.value);
        includeFuture = false;
        startSession();
    });
    elements.reviewAll.addEventListener('click', () => {
        includeFuture = true;
        startSession(true);
    });
    elements.reset.addEventListener('click', () => {
        if (!window.confirm('이 덱의 학습 기록과 복습 일정을 모두 지울까요?')) return;
        progress = {};
        sessions.clear();
        saveProgress();
        includeFuture = false;
        startSession();
    });
    elements.order.addEventListener('change', () => {
        AnkiSession.write(ORDER_KEY, elements.order.value);
        const remaining = currentCard ? [currentCard, ...queue] : queue;
        queue = elements.order.value === 'random'
            ? AnkiSession.shuffle(remaining)
            : deck.filter((card) => remaining.includes(card));
        currentCard = null;
        elements.sessionMessage.textContent = '남은 카드만 선택한 순서로 복습합니다. 이미 복습한 카드는 반복하지 않습니다.';
        showNextCard();
    });
    elements.restart.addEventListener('click', () => {
        if (!window.confirm('현재 복습 위치를 바꾸고 선택한 전체 카드를 처음부터 다시 볼까요? 학습 기록과 일정은 유지됩니다.')) return;
        includeFuture = true;
        startSession(true);
    });
    document.addEventListener('keydown', (event) => {
        if (event.target.matches('select, button') && event.key === ' ') return;
        if (event.key === ' ') {
            event.preventDefault();
            revealAnswer();
        }
        if (!elements.ratingButtons.hidden && ['1', '2', '3', '4'].includes(event.key)) {
            const names = ['again', 'hard', 'good', 'easy'];
            rateCard(names[Number(event.key) - 1]);
        }
    });

    const savedOrder = AnkiSession.read(ORDER_KEY);
    if (['sequential', 'random'].includes(savedOrder)) elements.order.value = savedOrder;
    const savedMode = AnkiSession.read(MODE_KEY);
    if (savedMode && Array.from(elements.mode.options).some((option) => option.value === savedMode)) {
        elements.mode.value = savedMode;
    }
    startSession();
}());
