(function () {
  'use strict';
  const B = window.ThreadsSourceCut;
  const id = () => globalThis.crypto?.randomUUID?.() || 'source-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  function pageStyle(value = {}) {
    const number = (key, min, max, fallback) => Number.isFinite(Number(value[key])) ? B.clamp(Number(value[key]), min, max) : fallback;
    return { paddingTop: number('paddingTop', 0, 800, 0), paddingBottom: number('paddingBottom', 0, 800, 0), paddingSide: number('paddingSide', 0, 400, 0),
      minimumHeight: [1080, 1350].includes(Number(value.minimumHeight)) ? Number(value.minimumHeight) : 0,
      background: /^#[0-9a-f]{6}$/i.test(value.background || '') ? value.background : '#ffffff',
      beforeText: String(value.beforeText || '').slice(0, 1000), afterText: String(value.afterText || '').slice(0, 1000), noteSize: number('noteSize', 20, 110, 56) };
  }
  function preset(value = {}) {
    const style = pageStyle(value.page);
    return { name: String(value.name || '내 스타일').slice(0, 40), appearance: B.appearance(value.appearance), page: { ...style, beforeText: '', afterText: '' } };
  }
  function newProject() { return { ...B.newProject(), pageLayouts: {}, presets: [] }; }
  function addAsset(project, source) { B.addAsset(project, { ...source, uid: id() }); }
  function slides(project) {
    const counts = {};
    return B.slides(project).map((slide) => {
      const a = project.assets[slide.assetIndex]; a.uid ||= id();
      const index = counts[a.uid] || 0;
      if (slide.type === 'body') counts[a.uid] = index + 1;
      return { ...slide, key: slide.type === 'cover' ? 'cover' : a.uid + ':body:' + index };
    });
  }
  function restore(value) {
    const p = B.restore(value), seen = new Set();
    p.assets.forEach((a, i) => {
      const uid = String(value.assets[i].uid || '');
      a.uid = /^[a-zA-Z0-9_-]{1,80}$/.test(uid) && !seen.has(uid) ? uid : id(); seen.add(a.uid);
    });
    p.pageLayouts = Object.create(null);
    for (const [key, style] of Object.entries(value.pageLayouts || {}).slice(0, 200)) {
      if (key === 'cover' || /^[a-zA-Z0-9_-]{1,80}:body:[0-9]{1,3}$/.test(key)) p.pageLayouts[key] = pageStyle(style);
    }
    p.presets = Array.isArray(value.presets) ? value.presets.slice(0, 20).map(preset) : [];
    p.source.productionNotes = String(value.source?.productionNotes || '').slice(0, 6000);
    return p;
  }
  function pageGeometry(ctx, slide, project) {
    const page = pageStyle(project.pageLayouts?.[slide.key]), style = B.appearance(project.appearance);
    ctx.font = `${style.fontWeight} ${page.noteSize}px ${B.fontFamily(style.fontId)}`;
    const noteWidth = 1080 - 2 * Math.max(48, page.paddingSide);
    const lines = (text) => { B.assertFontText(text, style.fontId); return text.trim() ? B.splitLines(ctx, text, noteWidth) : []; };
    const before = lines(page.beforeText), after = lines(page.afterText), lineHeight = page.noteSize * 1.3;
    if (before.length > 16 || after.length > 16) throw new Error('문구가 너무 깁니다. 글씨 크기를 줄이거나 여러 장에 나눠주세요.');
    const beforeHeight = before.length ? before.length * lineHeight + 48 : 0, afterHeight = after.length ? after.length * lineHeight + 48 : 0;
    const imageWidth = 1080 - page.paddingSide * 2, imageHeight = Math.max(1, Math.round(imageWidth * slide.rect.height / slide.rect.width));
    const contentHeight = page.paddingTop + beforeHeight + imageHeight + afterHeight + page.paddingBottom;
    const height = Math.max(page.minimumHeight, contentHeight), extraTop = (height - contentHeight) / 2;
    return { page, style, height, imageWidth, imageHeight, imageTop: extraTop + page.paddingTop + beforeHeight,
      before, after, lineHeight, beforeTop: extraTop + page.paddingTop + 24, afterTop: extraTop + page.paddingTop + beforeHeight + imageHeight + 24 };
  }
  function render(canvas, image, slide, project, preview = false, raw = false) {
    const measure = canvas.getContext('2d'), g = pageGeometry(measure, slide, project);
    if (!preview && g.height > 8192) throw new Error('여백과 문구를 포함한 높이가 너무 깁니다. 본문을 더 나누세요.');
    const scale = preview ? Math.min(360 / 1080, 640 / g.height) : 1;
    canvas.width = Math.max(1, Math.round(1080 * scale)); canvas.height = Math.max(1, Math.round(g.height * scale));
    const ctx = canvas.getContext('2d'); ctx.scale(canvas.width / 1080, canvas.height / g.height);
    ctx.fillStyle = g.page.background; ctx.fillRect(0, 0, 1080, g.height);
    if (slide.type === 'cover' && !raw) {
      const cover = document.createElement('canvas'); B.render(cover, image, slide, project, false, false);
      ctx.drawImage(cover, g.page.paddingSide, g.imageTop, g.imageWidth, g.imageHeight); cover.width = cover.height = 1;
    } else {
      const r = slide.rect; ctx.drawImage(image, r.x, r.y, r.width, r.height, g.page.paddingSide, g.imageTop, g.imageWidth, g.imageHeight);
    }
    ctx.font = `${g.style.fontWeight} ${g.page.noteSize}px ${B.fontFamily(g.style.fontId)}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round'; ctx.lineWidth = g.style.outlineWidth; ctx.strokeStyle = '#000';
    for (const [lines, top] of [[g.before, g.beforeTop], [g.after, g.afterTop]]) {
      lines.forEach((line, i) => { const y = top + i * g.lineHeight;
        ctx.strokeText(line.text, 540, y); ctx.fillStyle = g.style.color; ctx.fillText(line.text, 540, y);
      });
    }
  }
  window.ThreadsSourceCut = Object.freeze({ ...B, pageStyle, preset, newProject, addAsset, slides, restore, pageGeometry, render });
})();
