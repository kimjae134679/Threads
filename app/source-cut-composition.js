(function () {
  'use strict';
  const B = window.ThreadsSourceCut;
  const C = () => window.ThreadsCommunityTemplate;
  const id = () => globalThis.crypto?.randomUUID?.() || 'source-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

  function pageStyle(value = {}) {
    const number = (key, min, max, fallback) => Number.isFinite(Number(value[key])) ? B.clamp(Number(value[key]), min, max) : fallback;
    return {
      paddingTop: number('paddingTop', 0, 800, 0),
      paddingBottom: number('paddingBottom', 0, 800, 0),
      paddingSide: number('paddingSide', 0, 400, 0),
      minimumHeight: [1080, 1350].includes(Number(value.minimumHeight)) ? Number(value.minimumHeight) : 0,
      background: /^#[0-9a-f]{6}$/i.test(value.background || '') ? value.background : '#ffffff',
      beforeText: String(value.beforeText || '').slice(0, 1000),
      afterText: String(value.afterText || '').slice(0, 1000),
      noteSize: number('noteSize', 20, 110, 56),
    };
  }

  function preset(value = {}) {
    const style = pageStyle(value.page);
    return {
      name: String(value.name || '내 스타일').slice(0, 40),
      appearance: B.appearance(value.appearance),
      page: { ...style, beforeText: '', afterText: '' },
    };
  }

  function defaultCommunity(source = {}) {
    return C().settings({
      enabled: true,
      bodyMode: source.bodyMode === 'text' ? 'text' : 'screenshot',
      commentMode: source.commentMode === 'screenshot' ? 'screenshot' : 'text',
      title: source.title || '',
      body: source.sourceText || '',
      comments: source.commentsText || '',
      bodyMedia: source.bodyMedia || [],
      commentPaddingTop: 110,
      commentPaddingBottom: 120,
    });
  }

  function newProject() {
    const base = B.newProject();
    return { ...base, pageLayouts: {}, presets: [], community: defaultCommunity(base.source) };
  }

  function addAsset(project, source) {
    B.addAsset(project, { ...source, uid: id() });
    project.community ||= defaultCommunity(project.source);
  }

  function screenshotSlides(project) {
    if (!project.cover || !project.assets.length) return [];
    const result = [{
      type: 'cover',
      sourceKind: 'cover',
      assetIndex: project.cover.assetIndex,
      rect: { ...project.cover.rect },
      key: 'cover',
    }];
    let commentsStarted = false;
    for (const [assetIndex, asset] of project.assets.entries()) {
      asset.uid ||= id();
      const body = asset.body;
      const marker = Number(asset.commentStartY);
      const hasMarker = Number.isFinite(marker) && marker > body.y + 2 && marker < body.y + body.height - 2;
      const stops = [body.y, ...B.normalizeCuts(asset), ...(hasMarker ? [marker] : []), body.y + body.height]
        .sort((a, b) => a - b)
        .filter((value, index, all) => !index || value - all[index - 1] >= 1);
      let bodyIndex = 0;
      let commentIndex = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        const y = stops[i];
        const next = stops[i + 1];
        if (next - y < 1) continue;
        const sourceKind = commentsStarted || (hasMarker && y >= marker - 0.5) ? 'comment' : 'body';
        const index = sourceKind === 'comment' ? commentIndex++ : bodyIndex++;
        result.push({
          type: sourceKind,
          sourceKind,
          assetIndex,
          rect: { x: body.x, y, width: body.width, height: next - y },
          key: asset.uid + ':' + sourceKind + ':' + index,
        });
      }
      if (hasMarker) commentsStarted = true;
    }
    return result;
  }

  function measureContext() {
    if (typeof document !== 'undefined' && document.createElement) return document.createElement('canvas').getContext('2d');
    return {
      font: '',
      measureText(text) { return { width: Array.from(String(text || '')).length * 30 }; },
    };
  }

  function communityBodySlides(project) {
    const v = C().settings(project.community);
    if (v.bodyMode !== 'text' || !project.cover) return [];
    const ctx = measureContext();
    return C().bodyPages(ctx, v).map((page, i) => ({
      type: 'community',
      sourceKind: 'body',
      assetIndex: project.cover.assetIndex,
      rect: { x: 0, y: 0, width: C().WIDTH, height: C().HEIGHT },
      key: 'community:body:' + i,
      communityPage: { ...page, index: i, width: C().WIDTH, height: C().HEIGHT },
    }));
  }

  function communityCommentSlides(project) {
    const v = C().settings(project.community);
    if (v.commentMode !== 'text' || !project.cover) return [];
    const ctx = measureContext();
    return C().commentPages(ctx, v).map((page, i) => ({
      type: 'community',
      sourceKind: 'comment',
      assetIndex: project.cover.assetIndex,
      rect: { x: 0, y: 0, width: C().WIDTH, height: C().HEIGHT },
      key: 'community:comment:' + i,
      communityPage: { ...page, index: i, width: C().WIDTH, height: C().HEIGHT },
    }));
  }

  function slides(project) {
    const source = screenshotSlides(project);
    if (!source.length) return [];
    const v = C().settings(project.community);
    if (!v.enabled) return source;
    const cover = source[0];
    const sourceBody = source.slice(1).filter((slide) => slide.sourceKind === 'body');
    const sourceComments = source.slice(1).filter((slide) => slide.sourceKind === 'comment');
    const body = v.bodyMode === 'text' ? communityBodySlides(project) : sourceBody;
    const comments = v.commentMode === 'text' ? communityCommentSlides(project) : sourceComments;
    return [cover, ...body, ...comments];
  }

  function restore(value) {
    const p = B.restore(value), seen = new Set();
    p.assets.forEach((a, i) => {
      const uid = String(value.assets[i].uid || '');
      a.uid = /^[a-zA-Z0-9_-]{1,80}$/.test(uid) && !seen.has(uid) ? uid : id();
      seen.add(a.uid);
    });
    p.pageLayouts = Object.create(null);
    for (const [key, style] of Object.entries(value.pageLayouts || {}).slice(0, 200)) {
      if (key === 'cover' || /^[a-zA-Z0-9_-]{1,80}:(body|comment):[0-9]{1,3}$/.test(key)) p.pageLayouts[key] = pageStyle(style);
    }
    p.presets = Array.isArray(value.presets) ? value.presets.slice(0, 20).map(preset) : [];
    p.source.productionNotes = String(value.source?.productionNotes || '').slice(0, 6000);
    p.source.commentsText = String(value.source?.commentsText || '').slice(0, 30000);
    p.source.extraction = {
      selector: String(value.source?.extraction?.selector || '').slice(0, 200),
      confidence: String(value.source?.extraction?.confidence || 'none').slice(0, 20),
      reviewRequired: value.source?.extraction?.reviewRequired !== false,
    };
    p.community = C().settings(value.community || defaultCommunity(p.source));
    if (!p.community.title) p.community.title = p.source.title || '';
    if (!p.community.body && p.source.sourceText) p.community.body = p.source.sourceText;
    if (!p.community.comments && p.source.commentsText) p.community.comments = p.source.commentsText;
    return p;
  }

  function pageGeometry(ctx, slide, project) {
    if (slide.type === 'community') {
      return {
        page: pageStyle({ background: '#ffffff' }),
        style: B.appearance(project.appearance),
        height: C().HEIGHT,
        imageWidth: C().WIDTH,
        imageHeight: C().HEIGHT,
        imageTop: 0,
        before: [], after: [], lineHeight: 0, beforeTop: 0, afterTop: 0,
      };
    }
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
    return {
      page, style, height, imageWidth, imageHeight,
      imageTop: extraTop + page.paddingTop + beforeHeight,
      before, after, lineHeight,
      beforeTop: extraTop + page.paddingTop + 24,
      afterTop: extraTop + page.paddingTop + beforeHeight + imageHeight + 24,
    };
  }

  function render(canvas, image, slide, project, preview = false, raw = false) {
    if (slide.type === 'community') {
      const scale = preview ? Math.min(360 / C().WIDTH, 640 / C().HEIGHT) : 1;
      canvas.width = Math.round(C().WIDTH * scale);
      canvas.height = Math.round(C().HEIGHT * scale);
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      C().render(ctx, slide.communityPage, project.community);
      return;
    }

    const measure = canvas.getContext('2d'), g = pageGeometry(measure, slide, project);
    if (!preview && g.height > 8192) throw new Error('너무 긴 조각이 있습니다. 본문을 더 나누세요.');
    const scale = preview ? Math.min(360 / 1080, 640 / g.height) : 1;
    canvas.width = Math.max(1, Math.round(1080 * scale));
    canvas.height = Math.max(1, Math.round(g.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / 1080, canvas.height / g.height);
    ctx.fillStyle = g.page.background;
    ctx.fillRect(0, 0, 1080, g.height);
    if (slide.type === 'cover' && !raw) {
      const cover = document.createElement('canvas');
      B.render(cover, image, slide, project, false, false);
      ctx.drawImage(cover, g.page.paddingSide, g.imageTop, g.imageWidth, g.imageHeight);
      cover.width = cover.height = 1;
    } else {
      const r = slide.rect;
      ctx.drawImage(image, r.x, r.y, r.width, r.height, g.page.paddingSide, g.imageTop, g.imageWidth, g.imageHeight);
    }
    ctx.font = `${g.style.fontWeight} ${g.page.noteSize}px ${B.fontFamily(g.style.fontId)}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = g.style.outlineWidth;
    ctx.strokeStyle = '#000';
    for (const [lines, top] of [[g.before, g.beforeTop], [g.after, g.afterTop]]) {
      lines.forEach((line, i) => {
        const y = top + i * g.lineHeight;
        ctx.strokeText(line.text, 540, y);
        ctx.fillStyle = g.style.color;
        ctx.fillText(line.text, 540, y);
      });
    }
  }

  window.ThreadsSourceCut = Object.freeze({
    ...B, pageStyle, preset, defaultCommunity, newProject, addAsset, screenshotSlides,
    communityBodySlides, communityCommentSlides, slides, restore, pageGeometry, render,
  });
})();
