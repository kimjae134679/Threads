(function () {
  'use strict';

  const WIDTH = 1080;
  const HEIGHT = 1350;
  const BOARD_FONT = '"Seoul Namsan EB", "서울남산체 EB", "SeoulNamsanEB", "Malgun Gothic", sans-serif';
  const TITLE_FONT = '"Yangjin", "양진체", "Seoul Namsan EB", "Malgun Gothic", sans-serif';
  const DEFAULTS = Object.freeze({
    enabled: true,
    bodyMode: 'screenshot',
    commentMode: 'text',
    brand: '모두의톡',
    title: '',
    body: '',
    comments: '',
    bodyMedia: [],
    commentPaddingTop: 110,
    commentPaddingBottom: 120,
  });
  const mediaCache = new Map();

  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const clean = (value, max) => String(value || '').replace(/\r\n?/g, '\n').slice(0, max);
  const dataImage = (value) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value || '');

  function normalizeMedia(value, index = 0) {
    if (!value || !dataImage(value.dataUrl)) return null;
    const width = Math.round(Number(value.width));
    const height = Math.round(Number(value.height));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > 24000000) return null;
    return {
      id: String(value.id || 'media-' + index).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'media-' + index,
      name: String(value.name || '본문 이미지 ' + (index + 1)).slice(0, 120),
      dataUrl: value.dataUrl,
      width,
      height,
      insertAfter: clamp(Math.round(Number(value.insertAfter) || 0), 0, 999),
      sourceUrl: String(value.sourceUrl || '').slice(0, 4096),
      alt: String(value.alt || '').slice(0, 300),
      acquisition: String(value.acquisition || 'manual').slice(0, 40),
    };
  }

  function cleanTitle(value) {
    let title = String(value || '').replace(/\s+/g, ' ').trim();
    const prefix = [
      /^(?:웹진\s*)?인벤\s*[:|·-]\s*/i,
      /^웹젠\s*인벤\s*[:|·-]\s*/i,
      /^(?:더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\s*[:|·-]\s*/i,
      /^\[(?:인벤|더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\]\s*/i,
    ];
    const suffix = [
      /\s*[-|·:]\s*(?:오픈\s*이슈\s*갤러리|오픈이슈갤러리)\s*$/i,
      /\s*[-|·:]\s*(?:인벤|더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\s*$/i,
      /\s*[-|·:]\s*(?:자유게시판|유머게시판|이슈게시판|커뮤니티)\s*$/i,
    ];
    for (const pattern of prefix) title = title.replace(pattern, '').trim();
    for (const pattern of suffix) title = title.replace(pattern, '').trim();
    return title.slice(0, 240);
  }

  function settings(value = {}) {
    const media = Array.isArray(value.bodyMedia)
      ? value.bodyMedia.slice(0, 24).map(normalizeMedia).filter(Boolean)
      : [];
    return {
      enabled: value.enabled !== false,
      bodyMode: value.bodyMode === 'text' ? 'text' : 'screenshot',
      commentMode: value.commentMode === 'screenshot' ? 'screenshot' : 'text',
      brand: String(value.brand || DEFAULTS.brand).slice(0, 24),
      title: cleanTitle(value.title),
      body: clean(value.body, 30000),
      comments: clean(value.comments, 30000),
      bodyMedia: media,
      commentPaddingTop: clamp(Number(value.commentPaddingTop) || DEFAULTS.commentPaddingTop, 40, 360),
      commentPaddingBottom: clamp(Number(value.commentPaddingBottom) || DEFAULTS.commentPaddingBottom, 40, 360),
    };
  }

  function paragraphs(value) {
    const normalized = clean(value, 30000).trim();
    if (!normalized) return [];
    return normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  }

  function parseComments(value) {
    const text = clean(value, 30000).trim();
    if (!text) return [];
    const blocks = text.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
    if (blocks.length > 1) return blocks;
    return text.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function wrap(ctx, text, maxWidth, font) {
    ctx.font = font;
    const lines = [];
    let line = '';
    const normalized = clean(text, 30000);
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

  function imageGeometry(media) {
    const maxWidth = 920;
    const maxHeight = 610;
    const scale = Math.min(maxWidth / media.width, maxHeight / media.height, 1);
    return { width: Math.max(1, Math.round(media.width * scale)), height: Math.max(1, Math.round(media.height * scale)) };
  }

  function bodyBlocks(ctx, value) {
    const v = settings(value);
    const ps = paragraphs(v.body);
    const grouped = new Map();
    for (const media of v.bodyMedia) {
      const key = clamp(media.insertAfter, 0, ps.length);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(media);
    }
    const result = [];
    const pushMedia = (count) => {
      for (const media of grouped.get(count) || []) {
        const g = imageGeometry(media);
        result.push({ type: 'image', media, width: g.width, height: g.height, blockHeight: g.height + 34 });
      }
    };
    pushMedia(0);
    ps.forEach((paragraph, index) => {
      const lines = wrap(ctx, paragraph, 920, `800 38px ${BOARD_FONT}`);
      result.push({ type: 'text', text: paragraph, lines, blockHeight: Math.max(54, lines.length * 54) + 34 });
      pushMedia(index + 1);
    });
    return result;
  }

  function bodyPages(ctx, value) {
    const v = settings(value);
    if (!v.body.trim() && !v.bodyMedia.length) return [];
    const titleLines = wrap(ctx, v.title || '원문 제목', 920, `500 58px ${TITLE_FONT}`);
    const blocks = bodyBlocks(ctx, v);
    const pages = [];
    let page = null;
    const newPage = (first) => {
      const titleHeight = first ? Math.max(1, titleLines.length) * 70 + 116 : 0;
      page = { kind: 'post', first, titleLines: first ? titleLines : [], blocks: [], startY: 176 + titleHeight };
      pages.push(page);
    };
    newPage(true);
    let used = page.startY;
    const bottom = HEIGHT - 92;

    for (const block of blocks) {
      if (block.type === 'text') {
        let at = 0;
        while (at < block.lines.length) {
          const available = Math.max(54, bottom - used - 24);
          const count = Math.max(1, Math.min(block.lines.length - at, Math.floor(available / 54)));
          if (count < 1 || (used + 54 > bottom && page.blocks.length)) {
            newPage(false); used = page.startY; continue;
          }
          const lines = block.lines.slice(at, at + count);
          const height = lines.length * 54 + 28;
          page.blocks.push({ type: 'text', lines, height });
          used += height;
          at += count;
          if (at < block.lines.length) { newPage(false); used = page.startY; }
        }
      } else {
        const height = block.blockHeight;
        if (page.blocks.length && used + height > bottom) { newPage(false); used = page.startY; }
        page.blocks.push({ ...block, height });
        used += height;
      }
    }
    return pages.filter((p) => p.blocks.length || p.first);
  }

  function commentPages(ctx, value) {
    const v = settings(value);
    const comments = parseComments(v.comments);
    if (!comments.length) return [];
    const maxWidth = 920;
    const usableBottom = HEIGHT - v.commentPaddingBottom;
    const pages = [];
    let page = { kind: 'comments', comments: [] };
    let used = v.commentPaddingTop;
    for (const comment of comments) {
      const lines = wrap(ctx, comment, maxWidth, `800 38px ${BOARD_FONT}`);
      const height = Math.max(72, lines.length * 54 + 34);
      if (page.comments.length && used + height > usableBottom) {
        pages.push(page);
        page = { kind: 'comments', comments: [] };
        used = v.commentPaddingTop;
      }
      page.comments.push({ text: comment, lines, height });
      used += height;
    }
    if (page.comments.length) pages.push(page);
    return pages;
  }

  function plan(ctx, value) {
    return [...bodyPages(ctx, value), ...commentPages(ctx, value)].map((page, index) => ({
      ...page, index, width: WIDTH, height: HEIGHT,
    }));
  }

  async function prepareMedia(value) {
    if (typeof Image === 'undefined') return;
    const v = settings(value);
    const pending = v.bodyMedia.filter((media) => !mediaCache.has(media.dataUrl)).map((media) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { mediaCache.set(media.dataUrl, image); resolve(); };
      image.onerror = () => reject(new Error(`본문 이미지 ‘${media.name}’를 읽지 못했습니다.`));
      image.src = media.dataUrl;
    }));
    await Promise.all(pending);
  }

  function drawBrand(ctx, v) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111827';
    ctx.font = `800 34px ${BOARD_FONT}`;
    ctx.fillText(v.brand, 72, 54);
    ctx.fillStyle = '#7b8492';
    ctx.font = `800 23px ${BOARD_FONT}`;
    ctx.fillText('일상의 모든 이야기', 250, 61);
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
      ctx.strokeStyle = '#eceef2';
      ctx.beginPath(); ctx.moveTo(72, y); ctx.lineTo(1008, y); ctx.stroke();
      y += 58;
    }
    for (const block of page.blocks) {
      if (block.type === 'text') {
        ctx.fillStyle = '#20242a';
        ctx.font = `800 38px ${BOARD_FONT}`;
        for (const line of block.lines) {
          if (line) ctx.fillText(line, 72, y);
          y += 54;
        }
        y += 28;
      } else {
        const image = mediaCache.get(block.media.dataUrl);
        if (!image) throw new Error(`본문 이미지 ‘${block.media.name}’ 준비가 끝나지 않았습니다.`);
        const x = Math.round((WIDTH - block.width) / 2);
        ctx.drawImage(image, x, y, block.width, block.height - 34);
        y += block.height;
      }
    }
  }

  function renderComments(ctx, page, value) {
    const v = settings(value);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
        ctx.strokeStyle = '#e6e9ee';
        ctx.lineWidth = 2;
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
    WIDTH, HEIGHT, BOARD_FONT, TITLE_FONT, DEFAULTS,
    cleanTitle, settings, paragraphs, parseComments, wrap, imageGeometry, bodyBlocks, bodyPages, commentPages, plan, prepareMedia, render,
  });
})();
