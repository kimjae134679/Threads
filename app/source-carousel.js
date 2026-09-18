(function () {
  'use strict';

  const WIDTH = 1080, HEIGHT = 1350, PAD = 48;
  const FONT = '"Carousel Sans KR", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  const STYLE = Object.freeze({ width: WIDTH, height: HEIGHT, titleBottom: 1120,
    titleMaxSize: 116, titleMinSize: 64, outlineWidth: 2, shadowBlur: 0 });

  function wrapText(ctx, text, width) {
    const lines = [];
    for (const paragraph of String(text).replace(/\r\n?/g, '\n').split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (line && ctx.measureText(line + character).width > width) {
          lines.push(line);
          line = character;
        } else line += character;
      }
      lines.push(line);
    }
    return lines;
  }

  function titleLayout(ctx, title) {
    if (!String(title).trim()) throw new Error('표지 제목을 입력하세요.');
    const preferredLines = Math.max(2, String(title).trim().split('\n').length);
    for (const maxLines of [...new Set([preferredLines, 3])].filter((count) => count <= 3)) {
      for (let size = STYLE.titleMaxSize; size >= STYLE.titleMinSize; size -= 2) {
        ctx.font = `900 ${size}px ${FONT}`;
        const lines = wrapText(ctx, String(title).trim(), WIDTH - PAD * 2);
        if (lines.length <= maxLines) {
          const lineHeight = size * 1.16;
          return { lines, size, lineHeight, top: STYLE.titleBottom - lines.length * lineHeight };
        }
      }
    }
    throw new Error('표지 제목이 너무 깁니다. 크게 읽히도록 2~3줄로 줄여주세요.');
  }

  function sourceSlices(image, width = WIDTH, height = HEIGHT, pad = PAD) {
    const scale = (width - pad * 2) / image.naturalWidth;
    const visibleHeight = (height - pad * 2) / scale;
    if (image.naturalHeight <= visibleHeight) return [{ sy: 0, sh: image.naturalHeight }];
    const step = Math.max(1, visibleHeight - 72 / scale), slices = [];
    for (let sy = 0; sy < image.naturalHeight; sy += step) {
      const sh = Math.min(visibleHeight, image.naturalHeight - sy);
      slices.push({ sy, sh });
      if (sy + sh >= image.naturalHeight) break;
    }
    return slices;
  }

  function textPages(ctx, text) {
    ctx.font = `400 40px ${FONT}`;
    const lines = wrapText(ctx, text, WIDTH - PAD * 2);
    const perPage = Math.floor((HEIGHT - PAD * 2) / 64);
    const pages = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    return pages;
  }

  function plan(ctx, pkg, images, entries) {
    titleLayout(ctx, pkg.coverText || pkg.title);
    if (pkg.inputMode === 'text') {
      const pages = textPages(ctx, pkg.sourceText);
      return [{ type: 'cover', title: pkg.coverText || pkg.title, lines: pages[0] },
        ...pages.map((lines) => ({ type: 'text', lines }))];
    }
    if (!images.length) throw new Error('원문 이미지를 다시 선택하세요.');
    return [{ type: 'cover', title: pkg.coverText || pkg.title, image: images[0] },
      ...images.flatMap((image, index) => entries[index].kind === 'post'
        ? sourceSlices(image).map((slice) => ({ type: 'post', image, slice }))
        : [{ type: 'media', image }])];
  }

  function drawTextBody(ctx, lines) {
    ctx.font = `400 40px ${FONT}`;
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, PAD, PAD + i * 64));
  }

  function render(ctx, slide) {
    // Preview and export use the same canvas; never blur or redraw the source photograph.
    ctx.save();
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (slide.type === 'text') drawTextBody(ctx, slide.lines);
    else if (slide.type === 'post') {
      const scale = (WIDTH - PAD * 2) / slide.image.naturalWidth;
      ctx.drawImage(slide.image, 0, slide.slice.sy, slide.image.naturalWidth, slide.slice.sh,
        PAD, PAD, WIDTH - PAD * 2, slide.slice.sh * scale);
    } else if (slide.type === 'media') {
      const scale = Math.min((WIDTH - PAD * 2) / slide.image.naturalWidth,
        (HEIGHT - PAD * 2) / slide.image.naturalHeight);
      const w = slide.image.naturalWidth * scale, h = slide.image.naturalHeight * scale;
      ctx.drawImage(slide.image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
    } else if (slide.type === 'cover') {
      if (slide.image) {
        // Keep the original width and top of the post; the following slides preserve the full body.
        const scale = (WIDTH - PAD * 2) / slide.image.naturalWidth;
        const sourceHeight = Math.min(slide.image.naturalHeight, (HEIGHT - PAD) / scale);
        ctx.drawImage(slide.image, 0, 0, slide.image.naturalWidth, sourceHeight,
          PAD, PAD, WIDTH - PAD * 2, sourceHeight * scale);
      } else drawTextBody(ctx, slide.lines);
      const layout = titleLayout(ctx, slide.title);
      const gradient = ctx.createLinearGradient(0, layout.top - 200, 0, STYLE.titleBottom + 90);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.45, 'rgba(0,0,0,0.75)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, layout.top - 200, WIDTH, HEIGHT - layout.top + 200);
      ctx.font = `900 ${layout.size}px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      ctx.lineWidth = STYLE.outlineWidth;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      layout.lines.forEach((line, i) => {
        const y = layout.top + i * layout.lineHeight;
        ctx.strokeText(line, PAD, y);
        ctx.fillText(line, PAD, y);
      });
    } else throw new Error('지원하지 않는 슬라이드 형식입니다.');
    ctx.restore();
  }

  window.ThreadsSourceCarousel = Object.freeze({ WIDTH, HEIGHT, FONT, STYLE, wrapText,
    titleLayout, sourceSlices, textPages, plan, render });
})();
