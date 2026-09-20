(function () {
  'use strict';
  const FONT = '"Carousel Sans KR", "Noto Sans KR", "Malgun Gothic", sans-serif';
  const DEFAULTS = Object.freeze({ outlineWidth: 8, color: '#ffffff', highlightColor: '#ffe34f',
    highlightWords: '', titleBottom: 83 });
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const copyRect = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });

  function rectangle(rect, width, height) {
    if (![rect?.x, rect?.y, rect?.width, rect?.height, width, height].every(Number.isFinite)
      || width <= 0 || height <= 0) throw new Error('이미지 범위가 올바르지 않습니다.');
    const w = clamp(rect.width, Math.min(8, width), width), h = clamp(rect.height, Math.min(8, height), height);
    return { x: clamp(rect.x, 0, width - w), y: clamp(rect.y, 0, height - h), width: w, height: h };
  }
  function normalizeCuts(asset, cuts = asset.cuts) {
    const r = asset.body;
    return [...cuts].filter(Number.isFinite).sort((a, b) => a - b)
      .filter((y, i, all) => y > r.y + 1 && y < r.y + r.height - 1 && (!i || y - all[i - 1] >= 2));
  }
  function bodySlices(asset) {
    const r = asset.body, stops = [r.y, ...normalizeCuts(asset), r.y + r.height];
    return stops.slice(0, -1).map((y, i) => ({ x: r.x, y, width: r.width, height: stops[i + 1] - y }));
  }
  function appearance(value = {}) {
    const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v || '') ? v : fallback;
    return { outlineWidth: clamp(Number(value.outlineWidth) || 8, 2, 20),
      titleBottom: clamp(Number(value.titleBottom) || 83, 42, 94),
      color: color(value.color, DEFAULTS.color), highlightColor: color(value.highlightColor, DEFAULTS.highlightColor),
      highlightWords: String(value.highlightWords || '').slice(0, 500) };
  }
  function newProject() {
    return { type: 'SOURCE_CUT_PROJECT', version: 1, title: '', appearance: { ...DEFAULTS }, assets: [],
      cover: null, source: {}, rawCover: false, complete: false, publicationAllowed: false };
  }
  function addAsset(project, source) {
    const body = rectangle({ x: 0, y: 0, width: source.width, height: source.height }, source.width, source.height);
    project.assets.push({ ...source, body, cuts: [] });
    if (!project.cover) project.cover = { assetIndex: 0, rect: { ...body, height: Math.min(body.height, body.width * 1.25) } };
  }
  function restore(value) {
    if (value?.type !== 'SOURCE_CUT_PROJECT' || value.version !== 1 || !Array.isArray(value.assets)
      || !value.assets.length || value.assets.length > 30) throw new Error('지원하는 컷 편집 저장 파일이 아닙니다.');
    const project = newProject();
    project.title = String(value.title || '').slice(0, 240);
    project.appearance = appearance(value.appearance);
    project.rawCover = value.rawCover === true;
    project.source = { candidateId: String(value.source?.candidateId || ''), title: String(value.source?.title || ''),
      url: String(value.source?.url || ''), inputMode: value.source?.inputMode === 'text' ? 'text' : 'images',
      sourceText: String(value.source?.sourceText || '').slice(0, 20000) };
    project.assets = value.assets.map((a) => {
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.dataUrl || '')
        || !Number.isInteger(a.width) || !Number.isInteger(a.height) || a.width < 1 || a.height < 1
        || a.width * a.height > 80000000 || !Array.isArray(a.cuts) || a.cuts.length > 100) {
        throw new Error('저장된 원본 이미지나 분할선이 올바르지 않습니다.');
      }
      const asset = { name: String(a.name || 'original'), dataUrl: a.dataUrl, width: a.width, height: a.height,
        kind: a.kind === 'text' ? 'text' : 'image', body: rectangle(a.body, a.width, a.height) };
      asset.cuts = normalizeCuts(asset, a.cuts);
      return asset;
    });
    const index = value.cover?.assetIndex;
    if (!Number.isInteger(index) || !project.assets[index]) throw new Error('표지 원본을 확인할 수 없습니다.');
    const asset = project.assets[index];
    project.cover = { assetIndex: index, rect: rectangle(value.cover.rect, asset.width, asset.height) };
    // Restored images must be reviewed again before export; a project file never grants publication approval.
    project.complete = false;
    return project;
  }
  function pointer(event, bounds, scroll, scale) {
    return { x: (event.clientX - bounds.left + scroll.left) / scale,
      y: (event.clientY - bounds.top + scroll.top) / scale };
  }
  function splitLines(ctx, text, width) {
    const result = []; let start = 0, line = '', offset = 0;
    for (const char of String(text).replace(/\r\n?/g, '\n')) {
      if (char === '\n') { result.push({ text: line, start }); line = ''; offset += 1; start = offset; continue; }
      if (line && ctx.measureText(line + char).width > width) { result.push({ text: line, start }); line = ''; start = offset; }
      line += char; offset += char.length;
    }
    result.push({ text: line, start });
    return result;
  }
  function highlightRanges(title, words) {
    const ranges = [];
    for (const word of String(words).split(/[,\n]/).map((s) => s.trim()).filter(Boolean)) {
      for (let at = title.indexOf(word); at >= 0; at = title.indexOf(word, at + word.length)) ranges.push([at, at + word.length]);
    }
    return ranges;
  }
  function headline(ctx, title, height, style) {
    const text = String(title).replace(/\r\n?/g, '\n').trim();
    if (!text) throw new Error('표지 제목을 입력하세요.');
    const bottom = height * style.titleBottom / 100;
    for (let size = Math.min(116, Math.floor(height * .14)); size >= 24; size -= 2) {
      ctx.font = `900 ${size}px ${FONT}`;
      const lines = splitLines(ctx, text, 984), lineHeight = size * 1.2;
      if (lines.length <= 3 && bottom - lines.length * lineHeight >= 24) {
        return { text, lines, size, lineHeight, top: bottom - lines.length * lineHeight,
          ranges: highlightRanges(text, style.highlightWords) };
      }
    }
    throw new Error('제목을 줄이거나 표지 높이를 늘려주세요.');
  }
  function slides(project) {
    if (!project.cover || !project.assets.length) return [];
    return [{ type: 'cover', assetIndex: project.cover.assetIndex, rect: copyRect(project.cover.rect) },
      ...project.assets.flatMap((a, assetIndex) => bodySlices(a).map((rect) => ({ type: 'body', assetIndex, rect })))];
  }
  function render(canvas, image, slide, project, preview = false, raw = false) {
    const height = Math.round(1080 * slide.rect.height / slide.rect.width);
    if (!preview && (height > 8192 || height < 1)) throw new Error('너무 긴 조각이 있습니다. 본문에 분할선을 더 넣거나 범위를 조절하세요.');
    const scale = preview ? Math.min(360 / 1080, 640 / Math.max(height, 1)) : 1;
    canvas.width = Math.max(1, Math.round(1080 * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d'), r = slide.rect;
    ctx.scale(canvas.width / 1080, canvas.height / Math.max(height, 1));
    ctx.drawImage(image, r.x, r.y, r.width, r.height, 0, 0, 1080, height);
    if (slide.type !== 'cover' || raw) return;
    const style = appearance(project.appearance), layout = headline(ctx, project.title, height, style);
    const gradient = ctx.createLinearGradient(0, Math.max(0, layout.top - 140), 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, height);
    ctx.lineWidth = style.outlineWidth; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.textBaseline = 'top';
    // Stroke the whole line once, then paint colored runs at measured offsets to keep the outline continuous.
    layout.lines.forEach((line, i) => {
      const y = layout.top + i * layout.lineHeight;
      ctx.strokeText(line.text, 48, y); ctx.fillStyle = style.color; ctx.fillText(line.text, 48, y);
      let offset = 0;
      for (const char of line.text) {
        if (layout.ranges.some(([from, to]) => line.start + offset >= from && line.start + offset < to)) {
          ctx.fillStyle = style.highlightColor;
          ctx.fillText(char, 48 + ctx.measureText(line.text.slice(0, offset)).width, y);
        }
        offset += char.length;
      }
    });
  }
  window.ThreadsSourceCut = Object.freeze({ FONT, DEFAULTS, clamp, rectangle, normalizeCuts, bodySlices,
    appearance, newProject, addAsset, restore, pointer, splitLines, highlightRanges, headline, slides, render });
})();
