(() => {
    'use strict';

    const toggleButton = document.querySelector('#answer-toggle');
    const liveRegion = document.querySelector('#study-live');
    const revealItems = [...document.querySelectorAll('[data-reveal]')];

    if (!toggleButton || !liveRegion) return;

    let answersMasked = false;

    function announce(message) {
        liveRegion.textContent = '';
        window.setTimeout(() => {
            liveRegion.textContent = message;
        }, 30);
    }

    function setRevealAccessibility(item, enabled) {
        if (enabled) {
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-label', '영어 표현 정답 보기');
        } else {
            item.removeAttribute('role');
            item.removeAttribute('tabindex');
            item.removeAttribute('aria-label');
        }
    }

    function reveal(item) {
        if (!answersMasked || item.classList.contains('is-revealed')) return;
        item.classList.add('is-revealed');
        setRevealAccessibility(item, false);
        announce('영어 표현을 표시했습니다.');
    }

    function setMasked(nextMasked) {
        answersMasked = nextMasked;
        document.body.classList.toggle('answers-masked', answersMasked);
        toggleButton.setAttribute('aria-pressed', String(answersMasked));
        toggleButton.textContent = answersMasked ? '전체 영어 보기' : '영어 가리고 복습';

        revealItems.forEach((item) => {
            item.classList.remove('is-revealed');
            setRevealAccessibility(item, answersMasked);
        });

        announce(answersMasked
            ? '복습 모드입니다. 한국어를 보고 항목을 누르면 영어 정답을 확인할 수 있습니다.'
            : '모든 영어 표현을 표시했습니다.');
    }

    toggleButton.addEventListener('click', () => setMasked(!answersMasked));

    revealItems.forEach((item) => {
        item.addEventListener('click', () => reveal(item));
        item.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            reveal(item);
        });
    });
})();
