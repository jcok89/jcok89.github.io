(() => {
    'use strict';

    const articles = {
        '001': {
            title: '테세우스의 어머니는 왜 헬레네의 시녀가 되었을까?',
            description: '파리스보다 먼저 헬레네를 납치했던 테세우스와 그 선택의 대가를 치른 어머니 아이트라의 이야기.'
        },
        '002': {
            title: '부처의 전생은 왜 자신의 아이들을 노예로 내주었나?',
            description: '보시의 극단을 보여주는 베산타라 자타카를 오늘의 시선으로 다시 묻는 Jake Ok의 글.'
        },
        '003': {
            title: '베산타라 자타카 — 모든 것을 주려 했던 왕자의 이야기',
            description: '팔리 전통의 자타카 547번, 베산타라 이야기를 처음부터 끝까지 읽기 쉽게 풀어낸 한국어 재서술.',
            toc: true
        }
    };

    const escapeHtml = (value) => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const inlineMarkdown = (value) => {
        const links = [];
        let output = escapeHtml(value).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
            const token = `@@JAKE_LINK_${links.length}@@`;
            links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
            return token;
        });

        output = output
            .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        links.forEach((link, index) => {
            output = output.replace(`@@JAKE_LINK_${index}@@`, link);
        });
        return output;
    };

    const tableCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

    function renderMarkdown(markdown) {
        const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
        const html = [];
        let paragraph = [];
        let quote = [];
        let list = [];

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
        const flushList = () => {
            if (!list.length) return;
            html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
            list = [];
        };

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (line.startsWith('>')) {
                flushParagraph();
                flushList();
                quote.push(line.replace(/^>\s?/, ''));
                continue;
            }
            flushQuote();

            const listItem = line.match(/^\s*-\s+(.+)$/);
            if (listItem) {
                flushParagraph();
                list.push(listItem[1]);
                continue;
            }
            flushList();

            const nextLine = lines[index + 1] || '';
            if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}/.test(nextLine)) {
                flushParagraph();
                const headers = tableCells(line);
                const rows = [];
                index += 2;
                while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
                    rows.push(tableCells(lines[index]));
                    index += 1;
                }
                index -= 1;
                html.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
                continue;
            }

            const heading = line.match(/^(#{1,2})\s+(.+)$/);
            if (heading) {
                flushParagraph();
                const level = heading[1].length === 1 && html.some((item) => item.startsWith('<h1>')) ? 2 : heading[1].length;
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
        flushList();
        flushParagraph();
        return html.join('\n');
    }

    function addTableOfContents(container) {
        const headings = [...container.querySelectorAll('h2')];
        if (headings.length < 4) return;

        headings.forEach((heading, index) => {
            heading.id = `section-${index + 1}`;
        });

        const details = document.createElement('details');
        details.className = 'article-toc';
        details.innerHTML = `<summary>이야기 차례 <span>${headings.length}개 장</span></summary><ol>${headings.map((heading) => `<li><a href="#${heading.id}">${heading.textContent}</a></li>`).join('')}</ol>`;
        const firstDivider = container.querySelector('hr');
        firstDivider?.insertAdjacentElement('afterend', details);
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
        document.querySelector('meta[name="description"]')?.setAttribute('content', article.description);

        try {
            const encoded = window.__JAKE_WRITINGS__?.[id];
            if (!encoded) throw new Error('글 데이터가 없습니다.');
            const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
            container.innerHTML = renderMarkdown(new TextDecoder('utf-8').decode(bytes));
            if (article.toc) addTableOfContents(container);
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
