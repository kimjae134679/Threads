(function () {
  'use strict';
  const WIDTH = 1080, HEIGHT = 1350;
  const BOARD_FONT = '"Seoul Namsan EB", "서울남산체 EB", "SeoulNamsanEB", "Malgun Gothic", sans-serif';
  const TITLE_FONT = '"Yangjin", "양진체", "Seoul Namsan EB", "Malgun Gothic", sans-serif';
  const DEFAULTS = Object.freeze({
    enabled: true,
    brand: '모두의톡',
    title: '',
    body: '',
    comments: '',
    commentPaddingTop: 110,
    commentPaddingBottom: 120,
  });

  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function settings(value = {}) {
    return {
      enabled: value.enabled !== false,
      brand: String(value.brand || DEFAULTS.brand).slice(0, 24),
      title: String(value.title || '').slice(0, 240),
      body: String(value.body || '').slice(0, 30000),
      comments: String(value.comments || '').slice(0, 30000),
      commentPaddingTop: clamp(Number(value.commentPaddingTop) || DEFAULTS.commentPaddingTop, 40, 360),
      commentPaddingBottom: clamp(Number(value.commentPaddingBottom) || DEFAULTS.commentPaddingBottom, 40, 360),
    };
  }

  function parseComments(value) {
    const text = String(value || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    const blocks = text.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
    if (blocks.length > 1) return blocks;
    return text.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function wrap(ctx, text, maxWidth, font) {
    ctx.font = font;
    const lines = [];
    let line = '';
    const normalized = String(text || '').replace(/\r\n?/g, '\n');
    for (const ch of normalized) {
      if (ch === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      const next = line + ch;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
    lines.push(line);
    return lines;
  }

  function bodyPages(ctx, value) {
    const v = settings(value);
    if (!v.body.trim()) return [];
    const titleFont = `500 58px ${TITLE_FONT}`;
    const bodyFont = `800 38px ${BOARD_FONT}`;
    const titleLines = wrap(ctx, v.title || '원문 제목', 920, titleFont);
    const bodyLines = wrap(ctx, v.body, 920, bodyFont);
    const firstBodyTop = 250 + Math.max(1, titleLines.length) * 70 + 62;
    const firstCapacity = Math.max(4, Math.floor((HEIGHT - firstBodyTop - 100) / 58));
    const nextCapacity = Math.floor((HEIGHT - 180) / 58);
    const pages = [];
    let at = 0;
    pages.push({ kind: 'post', first: true, titleLines, lines: bodyLines.slice(at, at += firstCapacity) });
    while (at < bodyLines.length) pages.push({ kind: 'post', first: false, titleLines: [], lines: bodyLines.slice(at, at += nextCapacity) });
    return pages;
  }

  function commentPages(ctx, value) {
    const v = settings(value);
    const comments = parseComments(v.comments);
    if (!comments.length) return [];
    const font = `800 38px ${BOARD_FONT}`;
    const maxWidth = 920;
    const usable = HEIGHT - v.commentPaddingTop - v.commentPaddingBottom;
    const pages = [];
    let page = [], used = 0;
    for (const comment of comments) {
      const lines = wrap(ctx, comment, maxWidth, font);
      const height = Math.max(72, lines.length * 54 + 34);
      const required = height + (page.length ? 1 : 0);
      if (page.length && used + required > usable) {
        pages.push({ kind: 'comments', comments: page });
        page = []; used = 0;
      }
      page.push({ text: comment, lines, height });
      used += required;
    }
    if (page.length) pages.push({ kind: 'comments', comments: page });
    return pages;
  }

  function plan(ctx, value) {
    return [...bodyPages(ctx, value), ...commentPages(ctx, value)].map((page, index) => ({
      ...page, index, width: WIDTH, height: HEIGHT,
    }));
  }

  function drawBrand(ctx, v) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111827';
    ctx.font = `800 34px ${BOARD_FONT}`;
    ctx.fillText(v.brand, 72, 70);
    ctx.fillStyle = '#7b8492';
    ctx.font = `800 24px ${BOARD_FONT}`;
    ctx.fillText('일상의 모든 이야기', 250, 76);
    ctx.strokeStyle = '#e7eaf0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(72, 126); ctx.lineTo(1008, 126); ctx.stroke();
  }

  function renderPost(ctx, page, value) {
    const v = settings(value);
    drawBrand(ctx, v);
    let y = 176;
    if (page.first) {
      ctx.fillStyle = '#101318';
      ctx.font = `500 58px ${TITLE_FONT}`;
      for (const line of page.titleLines) { ctx.fillText(line, 72, y); y += 70; }
      y += 22;
      ctx.strokeStyle = '#eceef2'; ctx.beginPath(); ctx.moveTo(72, y); ctx.lineTo(1008, y); ctx.stroke(); y += 58;
    }
    ctx.fillStyle = '#20242a';
    ctx.font = `800 38px ${BOARD_FONT}`;
    for (const line of page.lines) {
      if (line) ctx.fillText(line, 72, y);
      y += 58;
    }
  }

  function renderComments(ctx, page, value) {
    const v = settings(value);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    let y = v.commentPaddingTop;
    ctx.font = `800 38px ${BOARD_FONT}`;
    ctx.textBaseline = 'top';
    for (let i = 0; i < page.comments.length; i++) {
      const item = page.comments[i];
      ctx.fillStyle = '#171a20';
      for (const line of item.lines) {
        if (line) ctx.fillText(line, 72, y);
        y += 54;
      }
      y += 26;
      if (i < page.comments.length - 1) {
        ctx.strokeStyle = '#e6e9ee'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(72, y); ctx.lineTo(1008, y); ctx.stroke();
        y += 28;
      }
    }
  }

  function render(ctx, page, value) {
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    if (page.kind === 'comments') renderComments(ctx, page, value);
    else renderPost(ctx, page, value);
    ctx.restore();
  }

  window.ThreadsCommunityTemplate = Object.freeze({
    WIDTH, HEIGHT, BOARD_FONT, TITLE_FONT, DEFAULTS, settings, parseComments, wrap, bodyPages, commentPages, plan, render,
  });
})();