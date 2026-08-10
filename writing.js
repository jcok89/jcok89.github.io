(() => {
    'use strict';

    const articles = {
        '001': {
            title: '테세우스의 어머니는 왜 헬레네의 시녀가 되었을까?'
        }
    };

    const escapeHtml = (value) => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const inlineMarkdown = (value) => escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    function renderMarkdown(markdown) {
        const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
        const html = [];
        let paragraph = [];
        let quote = [];

        const flushParagraph = () => {
            if (!paragraph.length) return;
            html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
            paragraph = [];
        };
        const flushQuote = () => {
            if (!quote.length) return;
            const content = quote.join('\n').split(/\n\s*\n/).map((part) => `<p>${inlineMarkdown(part.replace(/\n/g, ' '))}</p>`).join('');
            html.push(`<blockquote>${content}</blockquote>`);
            quote = [];
        };

        for (const line of lines) {
            if (line.startsWith('>')) {
                flushParagraph();
                quote.push(line.replace(/^>\s?/, ''));
                continue;
            }
            flushQuote();

            const heading = line.match(/^(#{1,2})\s+(.+)$/);
            if (heading) {
                flushParagraph();
                const level = heading[1].length;
                html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
            } else if (/^---+$/.test(line.trim())) {
                flushParagraph();
                html.push('<hr>');
            } else if (!line.trim()) {
                flushParagraph();
            } else {
                paragraph.push(line.trim());
            }
        }
        flushQuote();
        flushParagraph();
        return html.join('\n');
    }

    async function loadArticle() {
        const container = document.querySelector('#article');
        const id = new URLSearchParams(window.location.search).get('id') || '001';
        const article = articles[id];

        if (!article) {
            container.innerHTML = '<p class="article-error">존재하지 않는 글입니다. 글 목록에서 다시 선택해 주세요.</p>';
            return;
        }

        document.title = `${article.title} | Jake Ok의 글들`;

        try {
            const encoded = window.__JAKE_WRITINGS__?.[id];
            if (!encoded) throw new Error('글 데이터가 없습니다.');
            const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
            container.innerHTML = renderMarkdown(new TextDecoder('utf-8').decode(bytes));
        } catch (error) {
            console.error('글을 불러오지 못했습니다.', error);
            container.innerHTML = '<p class="article-error">글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
        }
    }

    function protectArticle() {
        const container = document.querySelector('#article');
        const warning = document.createElement('div');
        let warningTimer;
        warning.className = 'copy-warning';
        warning.setAttribute('role', 'status');
        warning.textContent = '저작권 보호를 위해 글 복사를 허용하지 않습니다.';
        document.body.append(warning);

        const showWarning = () => {
            warning.classList.add('is-visible');
            window.clearTimeout(warningTimer);
            warningTimer = window.setTimeout(() => warning.classList.remove('is-visible'), 2200);
        };

        ['copy', 'cut', 'contextmenu', 'dragstart'].forEach((eventName) => {
            container.addEventListener(eventName, (event) => {
                event.preventDefault();
                showWarning();
            });
        });

        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && ['c', 'x', 's', 'u'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                showWarning();
            }
        });
    }

    protectArticle();
    loadArticle();
})();
