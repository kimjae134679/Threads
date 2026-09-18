(function () {
  'use strict';

  const WIDTH = 1080, HEIGHT = 1350, PAD = 48;
  const FONT = '"Carousel Sans KR", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  const STYLE = Object.freeze({ width: WIDTH, height: HEIGHT, titleBottom: 1120,
    titleMaxSize: 116, titleMinSize: 64, outlineWidth: 2, shadowBlur: 0,
    minHeight: 608, maxHeight: HEIGHT, imageFit: 'cover', canvasSizing: 'source-aspect' });

  function frameFor(image) {
    if (!image) return { width: WIDTH, height: HEIGHT };
    if (!(Number.isFinite(image.naturalWidth) && image.naturalWidth > 0
      && Number.isFinite(image.naturalHeight) && image.naturalHeight > 0)) {
      throw new Error('원문 이미지의 크기를 확인할 수 없습니다.');
    }
    return { width: WIDTH, height: Math.max(STYLE.minHeight, Math.min(STYLE.maxHeight,
      Math.round(WIDTH * image.naturalHeight / image.naturalWidth))) };
  }

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

  function titleLayout(ctx, title, frame = frameFor()) {
    if (!String(title).trim()) throw new Error('표지 제목을 입력하세요.');
    const preferredLines = Math.max(2, String(title).trim().split('\n').length);
    for (const maxLines of [...new Set([preferredLines, 3])].filter((count) => count <= 3)) {
      for (let size = Math.min(STYLE.titleMaxSize, Math.floor(frame.height * 0.14)); size >= STYLE.titleMinSize; size -= 2) {
        ctx.font = `900 ${size}px ${FONT}`;
        const lines = wrapText(ctx, String(title).trim(), frame.width - PAD * 2);
        if (lines.length <= maxLines) {
          const lineHeight = size * 1.16;
          const bottom = Math.round(frame.height * STYLE.titleBottom / HEIGHT);
          return { lines, size, lineHeight, bottom, top: bottom - lines.length * lineHeight };
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
    const frame = frameFor(pkg.inputMode === 'text' ? undefined : images[0]);
    titleLayout(ctx, pkg.coverText || pkg.title, frame);
    if (pkg.inputMode === 'text') {
      const pages = textPages(ctx, pkg.sourceText);
      return [{ type: 'cover', title: pkg.coverText || pkg.title, lines: pages[0], ...frame },
        ...pages.map((lines) => ({ type: 'text', lines, ...frame }))];
    }
    if (!images.length) throw new Error('원문 이미지를 다시 선택하세요.');
    return [{ type: 'cover', title: pkg.coverText || pkg.title, image: images[0], ...frame },
      ...images.flatMap((image, index) => entries[index].kind === 'post'
        ? sourceSlices(image, frame.width, frame.height).map((slice) => ({ type: 'post', image, slice, ...frame }))
        : [{ type: 'media', image, ...frame }])];
  }

  function drawTextBody(ctx, lines) {
    ctx.font = `400 40px ${FONT}`;
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, PAD, PAD + i * 64));
  }

  function render(ctx, slide) {
    const width = slide.width || WIDTH, height = slide.height || HEIGHT;
    // Preview and export use the same canvas; never blur or redraw the source photograph.
    ctx.save();
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    if (slide.type === 'text') drawTextBody(ctx, slide.lines);
    else if (slide.type === 'post') {
      const scale = (width - PAD * 2) / slide.image.naturalWidth;
      ctx.drawImage(slide.image, 0, slide.slice.sy, slide.image.naturalWidth, slide.slice.sh,
        PAD, PAD, width - PAD * 2, slide.slice.sh * scale);
    } else if (slide.type === 'media') {
      const scale = Math.min((width - PAD * 2) / slide.image.naturalWidth,
        (height - PAD * 2) / slide.image.naturalHeight);
      const w = slide.image.naturalWidth * scale, h = slide.image.naturalHeight * scale;
      ctx.drawImage(slide.image, (width - w) / 2, (height - h) / 2, w, h);
    } else if (slide.type === 'cover') {
      if (slide.image) {
        // Fill the cover without distortion. Crop only at the size limits; body slides retain the full source.
        const scale = Math.max(width / slide.image.naturalWidth, height / slide.image.naturalHeight);
        const sw = width / scale, sh = height / scale;
        ctx.drawImage(slide.image, (slide.image.naturalWidth - sw) / 2, 0, sw, sh,
          0, 0, width, height);
      } else drawTextBody(ctx, slide.lines);
      const layout = titleLayout(ctx, slide.title, { width, height });
      const fade = Math.min(200, height * 0.15);
      const gradient = ctx.createLinearGradient(0, layout.top - fade, 0, layout.bottom + height / 15);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.45, 'rgba(0,0,0,0.75)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, layout.top - fade, width, height - layout.top + fade);
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
    frameFor, titleLayout, sourceSlices, textPages, plan, render });
})();
