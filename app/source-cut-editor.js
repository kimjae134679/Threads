(function () {
  'use strict';
  const M = window.ThreadsSourceCut, $ = (id) => document.getElementById(id);
  const pane = $('viewport'), spacer = $('spacer'), canvas = $('sourceCanvas'), ctx = canvas.getContext('2d');
  let project = M.newProject(), images = [], selected = 0, mode = 'pan', scale = 1, drag = null;
  let busy = false, dirty = false, previewReady = false, paintRequest = 0, lastPointer = null;
  let freshRectangle = false, scrollRequest = 0;
  let fontsReady = true;
  let auditTimer = 0, historyBefore = null, historyProject = '', auditAction = 'edit';
  let savedOriginals = new Set();
  const presetKey = 'threads-cut-style-presets-v1';
  let presets = [];
  try { const saved = JSON.parse(localStorage.getItem(presetKey) || '[]'); if (Array.isArray(saved)) presets = saved.slice(0, 20).map(M.preset); } catch (_) { /* Keep file-based presets available when local storage is unavailable. */ }
  const pageKeys = ['paddingTop', 'paddingBottom', 'paddingSide', 'minimumHeight', 'background', 'beforeText', 'afterText', 'noteSize'];
  const communityIds = ['bodyMode','commentMode','communityBrand','communityTitle','communityBody','communityComments','commentPaddingTop','commentPaddingBottom'];
  let currentStep = 1;
  function goStep(step) {
    currentStep = Math.max(1, Math.min(4, Number(step) || 1));
    document.querySelectorAll('.workflow-step').forEach((section) => section.classList.toggle('active', Number(section.dataset.step) === currentStep));
    document.querySelectorAll('.stepper .step').forEach((button) => button.classList.toggle('active', Number(button.dataset.stepTarget) === currentStep));
    if (currentStep === 3) schedulePreview();
    if (currentStep === 2) setTimeout(layout, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function readCommunityUi() {
    return window.ThreadsCommunityTemplate.settings({
      enabled: $('communityEnabled').checked,
      bodyMode: $('bodyMode').value,
      commentMode: $('commentMode').value,
      brand: $('communityBrand').value,
      title: $('communityTitle').value,
      body: $('communityBody').value,
      comments: $('communityComments').value,
      bodyMedia: project.community?.bodyMedia || [],
      commentPaddingTop: $('commentPaddingTop').value,
      commentPaddingBottom: $('commentPaddingBottom').value,
    });
  }
  function syncCommunityUi() {
    project.community ||= M.defaultCommunity(project.source);
    const value = window.ThreadsCommunityTemplate.settings(project.community);
    $('communityEnabled').checked = value.enabled;
    for (const id of communityIds) {
      const key = id.replace(/^community/, '').replace(/^comment/, 'comment');
      const map = {
        bodyMode:'bodyMode', commentMode:'commentMode', communityBrand:'brand', communityTitle:'title', communityBody:'body',
        communityComments:'comments', commentPaddingTop:'commentPaddingTop', commentPaddingBottom:'commentPaddingBottom'
      };
      $(id).value = value[map[id]];
    }
  }
  function renderAssetRail() {
    const rail = $('assetRail'); if (!rail) return;
    rail.replaceChildren();
    project.assets.forEach((a, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'asset-thumb' + (i === selected ? ' active' : '');
      button.dataset.assetIndex = String(i);
      const img = document.createElement('img'); img.src = a.dataUrl; img.alt = `원문 ${i + 1}`;
      const strong = document.createElement('strong'); strong.textContent = `${i + 1}. ${a.name}`;
      const small = document.createElement('small'); small.textContent = `${a.width} × ${a.height}`;
      button.append(img, strong, small); rail.append(button);
    });
  }
  function bodyParagraphCount() {
    return window.ThreadsCommunityTemplate.paragraphs(project.community?.body || '').length;
  }
  function renderBodyMediaList() {
    const root = $('bodyMediaList'); if (!root) return;
    root.replaceChildren();
    project.community ||= M.defaultCommunity(project.source);
    const media = project.community.bodyMedia || [];
    if (!media.length) {
      const empty = document.createElement('p');
      empty.className = 'small media-empty';
      empty.textContent = '본문 이미지 없음';
      root.append(empty);
      return;
    }
    const maxParagraph = bodyParagraphCount();
    media.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'body-media-row';
      const img = document.createElement('img'); img.src = item.dataUrl; img.alt = item.alt || item.name || `본문 이미지 ${index + 1}`;
      const meta = document.createElement('div'); meta.className = 'body-media-meta';
      const strong = document.createElement('strong'); strong.textContent = item.name || `본문 이미지 ${index + 1}`;
      const label = document.createElement('label'); label.textContent = '삽입 위치';
      const select = document.createElement('select');
      for (let n = 0; n <= maxParagraph; n++) {
        const option = document.createElement('option'); option.value = String(n);
        option.textContent = n === 0 ? '본문 맨 앞' : `${n}번째 문단 뒤`;
        select.append(option);
      }
      select.value = String(Math.min(Number(item.insertAfter) || 0, maxParagraph));
      select.addEventListener('change', () => {
        project.community.bodyMedia[index].insertAfter = Number(select.value);
        changed(true); renderBodyMediaList();
      });
      label.append(select);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
      remove.addEventListener('click', () => {
        project.community.bodyMedia.splice(index, 1);
        changed(true); renderBodyMediaList();
      });
      meta.append(strong, label, remove); row.append(img, meta); root.append(row);
    });
  }
  function renderBoundaryStatus() {
    const root = $('commentBoundaryStatus'); if (!root) return;
    const markers = project.assets.map((a, i) => a.commentStartY !== null && a.commentStartY !== undefined && Number.isFinite(Number(a.commentStartY)) ? `원문 ${i + 1}: ${Math.round(a.commentStartY)}px` : '').filter(Boolean);
    if (project.community?.commentMode === 'text') {
      root.textContent = '댓글은 오른쪽 “실제 댓글 텍스트만” 내용을 새 양식으로 출력합니다. 스크린샷 댓글 시작선은 사용하지 않습니다.';
    } else if (markers.length) {
      root.textContent = '댓글 시작선: ' + markers.join(' · ') + ' — 첫 시작선 이후 원문은 댓글 스크린샷으로 분리됩니다.';
    } else {
      root.textContent = '댓글을 스크린샷으로 쓸 때는 왼쪽 “댓글 시작점”을 누르고 댓글이 시작되는 위치를 한 번 클릭하세요.';
    }
  }
  function renderQuickPreview() {
    const root = $('quickPreview'); if (!root) return;
    root.replaceChildren();
    const figures = [...$('coverPreview').querySelectorAll('canvas'), ...$('bodyPreview').querySelectorAll('canvas')].slice(0, 6);
    figures.forEach((source) => { const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height; copy.getContext('2d').drawImage(source, 0, 0); root.append(copy); });
  }

  const modes = [...document.querySelectorAll('[data-mode]')];
  const message = (text) => { $('message').textContent = text; };
  const asset = () => project.assets[selected];
  const bounds = () => { const b = pane.getBoundingClientRect(); return { left: b.left + pane.clientLeft, top: b.top + pane.clientTop }; };
  const point = (e) => M.pointer(e, bounds(), { left: pane.scrollLeft, top: pane.scrollTop }, scale);
  const currentRect = () => mode === 'cover' && project.cover?.assetIndex === selected ? project.cover.rect : asset()?.body;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function setBusy(value) {
    busy = value;
    document.querySelectorAll('button,input,textarea,select').forEach((el) => { el.disabled = value; });
    if (!value) syncExport();
    if ($('captureUrlButton')) $('captureUrlButton').disabled = value || !window.ThreadsCutDesktop;
    if ($('openReferences')) $('openReferences').disabled = value || !window.ThreadsCutDesktop;
  }
  function exportBlockReason() {
    if (busy) return '이미지 생성 작업이 진행 중입니다.';
    if (!previewReady) return '먼저 미리보기에서 결과를 확인하세요.';
    if (!project.complete) return '“본문·댓글 내용과 순서를 확인했습니다”를 체크하세요.';
    const community = window.ThreadsCommunityTemplate.settings(project.community || {});
    if (community.enabled && community.bodyMode === 'text' && !community.body.trim() && !community.bodyMedia.length) {
      return '본문이 “글·이미지로 재구성”인데 본문 글/이미지가 없습니다. 글을 입력하거나 스크린샷 방식으로 바꾸세요.';
    }
    return '';
  }
  function syncExport() {
    const reason = exportBlockReason();
    $('exportZip').disabled = Boolean(reason);
    if ($('exportReason')) $('exportReason').textContent = reason || 'ZIP 생성 준비 완료';
  }
  function changed(body = false) {
    dirty = true;
    project.referenceApproved = false; if ($('referenceApproved')) $('referenceApproved').checked = false;
    scheduleAudit();
    if (body) { project.complete = false; $('complete').checked = false; }
    draw(); schedulePreview(); syncExport();
  }
  function setMode(next, fresh = false) {
    mode = next; drag = null; freshRectangle = fresh && ['cover', 'body'].includes(next);
    if (mode === 'cover' && asset() && project.cover.assetIndex !== selected) {
      project.cover = { assetIndex: selected, rect: { ...asset().body, height: Math.min(asset().body.height, asset().body.width * 1.25) } };
      changed();
    }
    modes.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    $('modeHelp').textContent = {
      pan: '원문 이동: 휠로 스크롤하거나 드래그하세요. 다른 원문은 위 목록에서 선택합니다.',
      cover: fresh ? '드래그해서 새 표지 범위를 그리세요. 이후에는 안쪽을 끌어 이동하고 모서리로 크기를 조절합니다.' : '안쪽은 이동, 모서리는 크기 조절입니다. 새 범위는 ‘표지 범위’를 다시 눌러 그리세요.',
      body: fresh ? '드래그해서 본문 범위를 그리세요. 화면 아래쪽으로 끌면 원문이 자동으로 스크롤됩니다.' : '분할선은 위아래로 끌 수 있습니다. 본문 범위를 새로 그리려면 ‘본문 범위’를 다시 누르세요.',
      comment: '댓글이 시작되는 첫 줄을 클릭하세요. 그 지점 이후 캡처는 댓글 영역으로 분리됩니다.',
      cut: '본문에서 나눌 위치를 클릭하세요. 선 위까지 한 장, 아래부터 다음 장입니다. Esc를 누르면 취소합니다.',
    }[mode];
    $('coordinates').hidden = mode === 'pan' || mode === 'cut' || mode === 'comment';
    canvas.style.cursor = mode === 'pan' ? 'grab' : 'crosshair'; draw();
  }
  function refreshAssets() {
    const select = $('asset'); select.replaceChildren();
    project.assets.forEach((a, i) => { const option = document.createElement('option'); option.value = i; option.textContent = `${i + 1}. ${a.name}`; select.appendChild(option); });
    selected = Math.min(selected, Math.max(0, images.length - 1)); select.value = String(selected);
    $('title').value = project.title;
    for (const key of ['color', 'highlightColor', 'highlightWords', 'titleBottom']) $(key).value = project.appearance[key];
    $('outline').value = project.appearance.outlineWidth;
    refreshFontControls();
    syncCommunityUi();
    renderAssetRail();
    renderBodyMediaList();
    renderBoundaryStatus();
    $('productionNotes').value = project.source.productionNotes || '';
    $('editingReason').value = project.editingReason || ''; $('referenceApproved').checked = project.referenceApproved === true;
    if (project.assets.length && historyProject !== project.projectId) {
      historyBefore = null; historyProject = project.projectId; savedOriginals = new Set();
      historyBefore = M.recordEdit(project, null, 'open/import'); showHistory();
    }
    scheduleAudit('open-or-style');
    refreshPageOptions(); syncPageFields(); refreshPresetList();
    $('outlineValue').textContent = project.appearance.outlineWidth + 'px';
    $('titleBottomValue').textContent = project.appearance.titleBottom + '%';
    $('sourceInfo').textContent = project.source.title ? `소재: ${project.source.title}` : '원문 범위와 페이지가 나뉠 위치를 직접 정하세요.';
    $('complete').checked = project.complete; $('raw').checked = project.rawCover; pane.scrollTop = 0; pane.scrollLeft = 0;
    layout(); cutList(); schedulePreview();
  }
  function layout() {
    const a = asset();
    scale = a ? Math.max(1, pane.clientWidth) / a.width * Number($('zoom').value) : 1;
    spacer.style.width = (a ? a.width * scale : pane.clientWidth) + 'px';
    spacer.style.height = (a ? Math.max(pane.clientHeight, a.height * scale) : pane.clientHeight) + 'px';
    draw();
  }
  function draw() {
    const w = Math.max(1, pane.clientWidth), h = Math.max(1, pane.clientHeight), dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.style.left = pane.scrollLeft + 'px'; canvas.style.top = pane.scrollTop + 'px';
    ctx.scale(dpr, dpr); ctx.fillStyle = '#e2e6ed'; ctx.fillRect(0, 0, w, h);
    const a = asset(); if (!a) return;
    const x = -pane.scrollLeft, y = -pane.scrollTop;
    // Render only a viewport-sized canvas; source coordinates stay independent of scroll and zoom.
    ctx.drawImage(images[selected], x, y, a.width * scale, a.height * scale);
    const rect = currentRect();
    const rx = rect.x * scale + x, ry = rect.y * scale + y, rw = rect.width * scale, rh = rect.height * scale;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(rx, ry, rw, rh); ctx.fill('evenodd');
    ctx.strokeStyle = mode === 'cover' ? '#2563eb' : '#16835c'; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = '#fff';
    if (mode === 'cover' || mode === 'body') for (const xx of [rx, rx + rw]) for (const yy of [ry, ry + rh]) { ctx.fillRect(xx - 5, yy - 5, 10, 10); ctx.strokeRect(xx - 5, yy - 5, 10, 10); }
    if (mode !== 'cover') {
      const r = a.body;
      a.cuts.forEach((cut, index) => {
        const cy = cut * scale + y, left = r.x * scale + x, right = (r.x + r.width) * scale + x;
        if (cy < -20 || cy > h + 20) return;
        ctx.strokeStyle = '#dc3f21'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
        ctx.fillStyle = '#a32b13'; ctx.fillRect(Math.max(0, left), cy - 23, 178, 23); ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
        ctx.fillText(`본문 ${index + 1} 끝 / ${index + 2} 시작`, Math.max(0, left) + 7, cy - 7);
      });
      if (a.commentStartY !== null && a.commentStartY !== undefined && Number.isFinite(Number(a.commentStartY))) {
        const cy = Number(a.commentStartY) * scale + y, left = r.x * scale + x, right = (r.x + r.width) * scale + x;
        if (cy >= -24 && cy <= h + 24) {
          ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
          ctx.fillStyle = '#6d28d9'; ctx.fillRect(Math.max(0, left), cy - 25, 126, 25); ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
          ctx.fillText('여기부터 댓글', Math.max(0, left) + 8, cy - 8);
        }
      }
    }
    $('position').textContent = `원문 ${selected + 1} · 현재 위쪽 ${Math.round(pane.scrollTop / scale)}px / 전체 ${a.height}px · 경계는 스크롤해도 유지됩니다.`;
    for (const key of ['X', 'Y', 'Width', 'Height']) $('rect' + key).value = Math.round(rect[key.toLowerCase()]);
  }
  function cutList() {
    const root = $('cutList'); root.replaceChildren(); const a = asset(); if (!a) return;
    if (!a.cuts.length) { root.textContent = '분할선 없음: 선택한 본문 전체가 한 장입니다. 위의 ‘여기서 페이지 나누기’를 누른 뒤 원문을 클릭하세요.'; return; }
    a.cuts.forEach((cut, index) => {
      const row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input');
      row.className = 'cut-row'; label.append(`본문 ${index + 1} 끝 (px)`); input.type = 'number'; input.min = Math.ceil(a.body.y + 2); input.max = Math.floor(a.body.y + a.body.height - 2); input.value = Math.round(cut);
      input.addEventListener('change', () => { a.cuts[index] = Number(input.value); a.cuts = M.normalizeCuts(a); cutList(); changed(true); }); label.append(input); row.append(label);
      const jump = document.createElement('button'); jump.type = 'button'; jump.textContent = '선으로 이동'; jump.addEventListener('click', () => { pane.scrollTop = cut * scale - pane.clientHeight / 2; draw(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제'; remove.setAttribute('aria-label', `분할선 ${index + 1} 삭제`); remove.addEventListener('click', () => { a.cuts.splice(index, 1); cutList(); changed(true); });
      row.append(jump, remove); root.append(row);
    });
  }
  function schedulePreview() {
    previewReady = false; syncExport();
    if (paintRequest) clearTimeout(paintRequest);
    paintRequest = setTimeout(() => {
      paintRequest = 0;
      preview().catch((error) => { $('previewError').textContent = error.message; previewReady = false; syncExport(); });
    }, 0);
  }
  async function preview() {
    $('coverPreview').replaceChildren(); $('bodyPreview').replaceChildren(); $('previewError').textContent = '';
    const community = window.ThreadsCommunityTemplate.settings(project.community || {});
    if (community.enabled && community.bodyMode === 'text' && !community.body.trim() && !community.bodyMedia.length) {
      $('previewError').textContent = '글·이미지 재구성 방식에는 본문 글 또는 본문 이미지가 필요합니다. 스크린샷 방식을 쓰면 현재 선택한 본문 영역을 그대로 출력합니다.';
      previewReady = false; syncExport(); return;
    }
    if (community.enabled && community.bodyMode === 'text') await window.ThreadsCommunityTemplate.prepareMedia(community);
    const slides = M.slides(project); previewReady = false; syncExport(); refreshPageOptions();
    if (!slides.length) return;
    if (slides.length > 150) { $('previewError').textContent = '한 편집에서는 150장 이하로 나눠주세요.'; return; }
    try {
      slides.forEach((slide, index) => {
        const figure = document.createElement('figure'), c = document.createElement('canvas'), caption = document.createElement('figcaption');
        M.render(c, images[slide.assetIndex], slide, project, true, $('raw').checked);
        const r = slide.rect, outputHeight = Math.round(M.pageGeometry(c.getContext('2d'), slide, project).height);
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', index ? `본문 ${index}` : '표지');
        caption.textContent = `${index ? '본문 ' + index : '표지'} · 원문 ${slide.assetIndex + 1} · ${Math.round(r.y)}–${Math.round(r.y + r.height)}px · 출력 1080×${outputHeight}`;
        figure.append(c, caption); $(index ? 'bodyPreview' : 'coverPreview').append(figure);
      });
      if (slides.some((s) => M.pageGeometry(canvas.getContext('2d'), s, project).height > 8192)) throw new Error('너무 긴 조각이 있습니다. 분할선을 추가하면 다운로드할 수 있습니다.');
      previewReady = true;
    } catch (error) { $('previewError').textContent = error.message; }
    $('pageCount').textContent = `${slides.length - 1}장`; renderQuickPreview(); syncExport();
  }
  async function readFile(file) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('파일을 읽지 못했습니다.')); r.readAsDataURL(file); });
  }
  async function decode(dataUrl) {
    return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); image.src = dataUrl; });
  }
  async function acquire(files, metadata = null) {
    if (busy) return; setBusy(true);
    try {
      if (!files.length || files.length + project.assets.length > 30) throw new Error('원문 이미지는 한 편집에 1~30장까지 넣으세요.');
      if (project.assets.reduce((n, a) => n + a.dataUrl.length, 0) + files.reduce((n, f) => n + f.size * 1.34, 0) > 80 * 1024 * 1024) throw new Error('원문 용량 합계가 너무 큽니다. 새 편집에서 나눠주세요.');
      const prepared = [];
      for (const file of files) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 25 * 1024 * 1024) throw new Error('PNG/JPEG/WebP 이미지, 파일당 25MB 이하를 사용하세요.');
        const dataUrl = await readFile(file), image = await decode(dataUrl);
        if (project.assets.reduce((n, a) => n + a.width * a.height, 0)
          + prepared.reduce((n, p) => n + p.asset.width * p.asset.height, 0)
          + image.naturalWidth * image.naturalHeight > 80000000) throw new Error('원본이 너무 큽니다. 새 편집에서 나눠 넣으세요.');
        prepared.push({ image, asset: { name: file.name, width: image.naturalWidth, height: image.naturalHeight, dataUrl, kind: 'image' } });
      }
      for (const item of prepared) { M.addAsset(project, item.asset); images.push(item.image); }
      if (metadata) {
        project.source = metadata.source; project.title = String(metadata.title || '').slice(0, 240);
        project.community ||= M.defaultCommunity(project.source);
        if (!project.community.title) project.community.title = project.source.title || project.title;
        if (!project.community.body && project.source.sourceText) project.community.body = project.source.sourceText;
        if (!project.community.comments && project.source.commentsText) project.community.comments = project.source.commentsText;
        if (!project.community.bodyMedia?.length && Array.isArray(project.source.bodyMedia)) project.community.bodyMedia = project.source.bodyMedia;
      }
      project.complete = false; dirty = true; refreshAssets(); goStep(2);
      message('원문을 불러왔습니다. 표지는 기존처럼 잡고, 오른쪽에서 본문/실제 댓글 텍스트를 새 게시판 양식으로 확인하세요.');
    } catch (error) { message(error.message); }
    finally { setBusy(false); $('files').value = ''; }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function exportZip() {
    const blocked = exportBlockReason();
    if (blocked) { message(blocked); syncExport(); return; }
    await flushAudit('export-request');
    const snapshot = clone(project), snapshotImages = [...images], raw = $('raw').checked; setBusy(true);
    try {
      const community = window.ThreadsCommunityTemplate.settings(snapshot.community || {});
      if (community.enabled && community.bodyMode === 'text') await window.ThreadsCommunityTemplate.prepareMedia(community);
      const entries = [], slides = M.slides(snapshot);
      for (let i = 0; i < slides.length; i++) {
        message(`PNG 생성 중 ${i + 1}/${slides.length}`);
        const c = document.createElement('canvas'); M.render(c, snapshotImages[slides[i].assetIndex], slides[i], snapshot, false, raw);
        const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG 생성에 실패했습니다.');
        entries.push({ name: i ? `body-${String(i).padStart(2, '0')}.png` : 'cover.png', data: new Uint8Array(await blob.arrayBuffer()) });
        c.width = 1; c.height = 1;
      }
      const manifest = { ...snapshot, assets: snapshot.assets.map(({ dataUrl, ...a }) => a), rawCover: raw, slides };
      entries.push({ name: 'edit-log.json', data: new TextEncoder().encode(JSON.stringify(snapshot.editLog || [], null, 2)) });
      entries.push({ name: 'reference-summary.json', data: new TextEncoder().encode(JSON.stringify(M.reference(snapshot), null, 2)) });
      entries.push({ name: 'cut-manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
      download(window.ThreadsSourceCutZip.zip(entries), 'source-cut-images.zip'); message('ZIP 다운로드를 요청했습니다. 브라우저 다운로드 목록에서 확인하세요.');
    } catch (error) { message(error.message); }
    finally { setBusy(false); }
  }
  function scheduleAudit(action) {
    if (action) auditAction = action;
    clearTimeout(auditTimer); auditTimer = setTimeout(() => flushAudit(auditAction), 800);
  }
  function showHistory() {
    $('recentHistory').textContent = (project.editLog || []).slice(-8).reverse().map(e => `${e.at} · ${e.action} · ${e.changes.map(c => c.field).join(', ')}${e.userReason ? '\n기준: ' + e.userReason : ''}`).join('\n\n');
  }
  async function flushAudit(action = 'edit') {
    clearTimeout(auditTimer); if (!project.assets.length) return;
    if (historyProject !== project.projectId) { historyBefore = null; historyProject = project.projectId; savedOriginals = new Set(); }
    project.editingReason = $('editingReason').value;
    historyBefore = M.recordEdit(project, historyBefore, action, project.editingReason);
    showHistory();
    if (!window.ThreadsCutDesktop?.saveReference) { $('historyStatus').textContent = `${project.editLog.length}건 기록됨. 편집 저장이나 로그 받기로 보관하세요. PC 자동 기록은 데스크톱 앱에서 제공합니다.`; return; }
    const projectId = project.projectId, pending = project.assets.filter(a => !savedOriginals.has(a.uid));
    try {
      const result = await window.ThreadsCutDesktop.saveReference({ projectId, images: pending.map(a => ({ uid: a.uid, dataUrl: a.dataUrl })), summary: M.reference(project), events: clone(project.editLog) });
      if (project.projectId === projectId) { pending.forEach(a => savedOriginals.add(a.uid)); $('historyStatus').textContent = `PC 자동 기록 ${result.eventCount}건 · ${result.folder}`; }
    } catch (error) { $('historyStatus').textContent = 'PC 기록 저장 실패: ' + error.message + ' · 편집 저장 파일로 보관해주세요.'; return false; }
  }
  document.addEventListener('input', event => { auditAction = event.target.id || 'input'; }, true);
  document.addEventListener('change', event => { auditAction = event.target.id || 'change'; }, true);
  document.addEventListener('change', event => { if (!busy && event.target.id !== 'projectFile' && event.target.id !== 'files') flushAudit(event.target.id || 'change'); });
  canvas.addEventListener('pointerup', () => flushAudit(mode + '-gesture'));
  document.addEventListener('click', event => { if (['fullBody','applyPreset','applyBodySpacing','moveUp','moveDown'].includes(event.target.id)) flushAudit(event.target.id); });
  $('editingReason').addEventListener('input', () => { project.editingReason = $('editingReason').value; dirty = true; });
  $('recordReason').addEventListener('click', () => { dirty = true; flushAudit('reason'); });
  $('referenceApproved').addEventListener('change', () => { project.referenceApproved = $('referenceApproved').checked; dirty = true; flushAudit('reference-selection'); });
  $('saveHistory').addEventListener('click', async () => { await flushAudit('save-log'); download(new Blob([JSON.stringify({ ...M.reference(project), events: project.editLog }, null, 2)], {type:'application/json'}), 'source-cut-edit-log.json'); });
  $('openReferences').disabled = !window.ThreadsCutDesktop;
  $('openReferences').addEventListener('click', () => window.ThreadsCutDesktop?.openReferences().catch(error => message(error.message)));
  function refreshFontControls() {
    $('fontId').value = project.appearance.fontId;
    $('fontWeight').replaceChildren();
    M.FONTS[project.appearance.fontId].weights.forEach(weight => { const option = document.createElement('option'); option.value = weight; option.textContent = weight === 400 ? '보통 · 400' : '아주 굵게 · ' + weight; $('fontWeight').appendChild(option); });
    $('fontWeight').value = project.appearance.fontWeight;
  }
  function refreshPageOptions() {
    const select = $('layoutPage'), previous = select.value, all = M.slides(project);
    select.replaceChildren(); all.forEach((slide, i) => { const option = document.createElement('option'); option.value = slide.key; option.textContent = i ? `본문 ${i}` : '표지'; select.appendChild(option); });
    select.value = all.some(s => s.key === previous) ? previous : all[0]?.key || '';
    if (previous !== select.value) syncPageFields();
    const unused = Object.entries(project.pageLayouts || {}).filter(([key, value]) => !all.some(s => s.key === key) && (value.beforeText || value.afterText));
    $('unplacedNotes').textContent = unused.length ? '현재 장에 배치되지 않은 보관 문구: ' + unused.map(([,v]) => [v.beforeText,v.afterText].filter(Boolean).join(' / ')).join(' · ') : '';
  }
  function syncPageFields() { const style = M.pageStyle(project.pageLayouts?.[$('layoutPage').value]); pageKeys.forEach(key => { $(key).value = style[key]; }); }
  function persistPresets() {
    project.presets = presets.map(M.preset);
    try { localStorage.setItem(presetKey, JSON.stringify(presets)); } catch (_) { message('이 환경에서는 프리셋을 자동 보관할 수 없습니다. 편집 저장 파일로 보관하세요.'); }
  }
  function refreshPresetList() {
    const previous = $('presetList').value; $('presetList').replaceChildren();
    presets.forEach((p, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = p.name; $('presetList').appendChild(option); });
    $('presetList').value = previous !== '' && presets[Number(previous)] ? previous : presets.length ? '0' : '';
  }
  $('layoutPage').addEventListener('change', syncPageFields);
  pageKeys.forEach(key => $(key).addEventListener('input', () => {
    const page = $('layoutPage').value; if (!page) return;
    project.pageLayouts ||= {}; project.pageLayouts[page] = M.pageStyle(Object.fromEntries(pageKeys.map(k => [k, $(k).value]))); changed(true);
  }));
  $('productionNotes').addEventListener('input', () => { project.source.productionNotes = $('productionNotes').value; dirty = true; scheduleAudit('production-notes'); });
  for (const key of ['fontId','fontWeight']) $(key).addEventListener('change', () => {
    project.appearance = M.appearance({ ...project.appearance, [key]: $(key).value }); refreshFontControls(); changed();
  });
  $('applyBodySpacing').addEventListener('click', () => {
    const selectedStyle = M.pageStyle(project.pageLayouts?.[$('layoutPage').value]); project.pageLayouts ||= {};
    M.slides(project).filter(s => s.type === 'body').forEach(slide => {
      const old = M.pageStyle(project.pageLayouts[slide.key]); project.pageLayouts[slide.key] = { ...selectedStyle, beforeText: old.beforeText, afterText: old.afterText };
    }); syncPageFields(); changed(true);
  });
  $('savePreset').addEventListener('click', () => {
    const name = $('presetName').value.trim(); if (!name) return message('프리셋 이름을 입력하세요.');
    const next = M.preset({ name, appearance: project.appearance, page: project.pageLayouts?.[$('layoutPage').value] });
    const index = presets.findIndex(p => p.name === name);
    if (index < 0 && presets.length >= 20) return message('프리셋은 20개까지 저장합니다. 사용하지 않는 프리셋을 삭제하세요.');
    if (index < 0) presets.push(next); else presets[index] = next;
    persistPresets(); refreshPresetList(); dirty = true; message('폰트·굵기·색상·여백을 프리셋으로 저장했습니다. 문구 내용은 복사하지 않습니다.');
  });
  $('applyPreset').addEventListener('click', () => {
    const selected = presets[Number($('presetList').value)]; if (!selected) return;
    project.appearance = M.appearance(selected.appearance); project.pageLayouts ||= {};
    const page = $('layoutPage').value;
    if (page) { const old = M.pageStyle(project.pageLayouts[page]); project.pageLayouts[page] = { ...selected.page, beforeText: old.beforeText, afterText: old.afterText }; }
    refreshAssets(); syncPageFields(); changed(true);
  });
  $('deletePreset').addEventListener('click', () => {
    if (!$('presetList').value) return; presets.splice(Number($('presetList').value),1); persistPresets(); refreshPresetList(); dirty = true;
  });
  refreshFontControls(); refreshPresetList();
  const desktop = window.ThreadsCutDesktop;
  if ($('captureUrlButton')) {
    $('captureUrlButton').disabled = !desktop;
    if (desktop) {
      $('captureHelp').textContent = '공개 페이지를 아래까지 불러와 캡처합니다. 아주 긴 글은 여러 원문 이미지로 이어서 열립니다. 로그인 화면이나 무한 스크롤은 직접 캡처를 사용하세요.';
      desktop.onProgress(({ percent, message: text }) => { $('captureProgress').value = percent; message(text); });
      $('cancelCapture').addEventListener('click', () => desktop.cancel().catch((error) => message(error.message)));
      $('captureUrlButton').addEventListener('click', async () => {
        if (busy) return;
        const input = $('captureUrl').value.trim();
        if (!input) return message('먼저 게시글 링크를 입력하세요.');
        if (dirty && !window.confirm('새 링크로 현재 편집을 교체합니다. 필요한 경우 취소 후 편집 저장을 먼저 해주세요.')) return;
        setBusy(true); $('cancelCapture').hidden = false; $('cancelCapture').disabled = false;
        $('captureProgress').hidden = false; $('captureProgress').value = 0;
        try {
          const result = await desktop.capture(input);
          if (!result.ok) throw new Error(result.error);
          const next = M.newProject();
          const extracted = result.extracted || {};
          next.title = result.title;
          next.source = {
            title: result.title,
            url: result.url,
            inputMode: 'images',
            sourceText: String(extracted.bodyText || '').slice(0, 30000),
            commentsText: String(extracted.commentsText || '').slice(0, 30000),
            extraction: {
              selector: String(extracted.selector || ''),
              confidence: String(extracted.confidence || 'none'),
              reviewRequired: extracted.reviewRequired !== false,
            },
          };
          for (const a of result.assets) M.addAsset(next, { ...a, kind: 'image' });
          next.community = M.defaultCommunity({
            ...next.source,
            bodyMedia: Array.isArray(extracted.bodyMedia) ? extracted.bodyMedia : [],
            bodyMode: 'screenshot',
            commentMode: 'text',
          });
          next.community.title = result.title;
          next.community.body = next.source.sourceText;
          next.community.comments = next.source.commentsText;
          next.community.bodyMedia = Array.isArray(extracted.bodyMedia) ? extracted.bodyMedia : [];
          await openProject(next); dirty = true;
          $('captureProgress').value = 100;
          const parts = [
            `캡처 ${result.assets.length}장`,
            next.source.sourceText ? `본문 글 ${next.source.sourceText.length}자` : '본문 글 자동추출 없음',
            next.source.commentsText ? `댓글 ${Number(extracted.commentCount) || 0}개` : '댓글 자동추출 없음',
            next.community.bodyMedia.length ? `본문 이미지 ${next.community.bodyMedia.length}장` : '본문 이미지 없음',
          ];
          if ($('captureEvidence')) $('captureEvidence').textContent = parts.join(' · ') + ' — 자동 판별 결과는 반드시 확인하세요.';
          message(parts.join(' · ') + '을 열었습니다. 기본은 본문 스크린샷 + 댓글 글씨 방식입니다.');
        } catch (error) { message(error.message); $('captureProgress').hidden = true; }
        finally { setBusy(false); $('cancelCapture').hidden = true; }
      });
    }
  }
  $('files').addEventListener('change', () => acquire([...$('files').files]));
  $('filesMirror')?.addEventListener('change', async () => {
    await acquire([...$('filesMirror').files]);
    $('filesMirror').value = '';
  });
  $('bodyMediaFiles')?.addEventListener('change', async () => {
    const files = [...$('bodyMediaFiles').files];
    $('bodyMediaFiles').value = '';
    if (!files.length || busy) return;
    project.community ||= M.defaultCommunity(project.source);
    project.community.bodyMedia ||= [];
    if (project.community.bodyMedia.length + files.length > 24) return message('본문 이미지는 최대 24장까지 넣을 수 있습니다.');
    setBusy(true);
    try {
      for (const [index, file] of files.entries()) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
          throw new Error('본문 이미지는 PNG/JPEG/WebP, 파일당 15MB 이하만 사용하세요.');
        }
        const dataUrl = await readFile(file);
        const image = await decode(dataUrl);
        project.community.bodyMedia.push({
          id: 'manual-media-' + Date.now().toString(36) + '-' + index,
          name: file.name,
          dataUrl,
          width: image.naturalWidth,
          height: image.naturalHeight,
          insertAfter: bodyParagraphCount(),
          sourceUrl: '',
          alt: '',
          acquisition: 'manual',
        });
      }
      project.community = window.ThreadsCommunityTemplate.settings(project.community);
      project.community.bodyMode = 'text';
      $('bodyMode').value = 'text';
      renderBodyMediaList();
      changed(true);
      message('본문 이미지를 추가했습니다. 각 이미지의 삽입 위치를 확인하세요.');
    } catch (error) { message(error.message); }
    finally { setBusy(false); }
  });
  async function openProject(value) {
    if (project.assets.length) await flushAudit('before-open');
    const next = M.restore(value), loaded = [];
    if (next.assets.reduce((n, a) => n + a.width * a.height, 0) > 80000000
      || next.assets.reduce((n, a) => n + a.dataUrl.length, 0) > 80 * 1024 * 1024) throw new Error('원본 합계가 너무 큽니다. 나누어 편집하세요.');
    for (const a of next.assets) { const image = await decode(a.dataUrl); if (image.naturalWidth !== a.width || image.naturalHeight !== a.height) throw new Error('저장된 크기와 실제 이미지가 다릅니다.'); loaded.push(image); }
    project = next; images = loaded; selected = 0; dirty = false;
    if (next.presets?.length) { const combined = new Map(presets.map(p => [p.name, p])); next.presets.forEach(p => combined.set(p.name, p)); presets = [...combined.values()].slice(-20); persistPresets(); }
    refreshAssets(); goStep(2);
  }
  $('openBundleTool')?.addEventListener('click', async () => {
    if(window.ThreadsCutDesktop?.openSourceBundle)
      try {await window.ThreadsCutDesktop.openSourceBundle();}catch(error){message('원문 ZIP 창 열기 실패: '+error.message);}
    else window.open('./source-batch.html','_blank');
  });
  $('projectFile').addEventListener('change', async () => {
    const file = $('projectFile').files[0]; if (!file || busy) return;
    if (dirty && !window.confirm('현재 편집을 교체합니다. 필요한 경우 취소 후 편집 저장을 먼저 해주세요.')) return;
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('편집 파일은 100MB 이하만 열 수 있습니다.');
      await openProject(JSON.parse(await file.text())); message('원본 이미지·제목·범위·분할선을 복원했습니다. 출력 전 결과를 다시 확인하세요.');
    } catch (error) { message(error.message); }
    finally { setBusy(false); $('projectFile').value = ''; }
  });
  $('saveProject').addEventListener('click', async () => {
    await flushAudit('save-project');
    if (!images.length) return message('먼저 원문 이미지를 넣으세요.');
    project.presets = presets.map(M.preset);
    download(new Blob([JSON.stringify(project)], { type: 'application/json' }), 'source-cut-project.json');
    message('원본 이미지와 편집 설정을 함께 저장 요청했습니다. 파일을 다시 열면 편집을 이어갈 수 있습니다.');
  });
  $('asset').addEventListener('change', () => { selected = Number($('asset').value); pane.scrollTop = 0; pane.scrollLeft = 0; setMode('pan'); layout(); cutList(); });
  for (const [id, delta] of [['moveUp', -1], ['moveDown', 1]]) $(id).addEventListener('click', () => {
    const target = selected + delta; if (!asset() || target < 0 || target >= images.length) return;
    [project.assets[selected], project.assets[target]] = [project.assets[target], project.assets[selected]];
    [images[selected], images[target]] = [images[target], images[selected]];
    const c = project.cover.assetIndex; if (c === selected) project.cover.assetIndex = target; else if (c === target) project.cover.assetIndex = selected;
    selected = target; changed(true); refreshAssets();
  });
  $('zoom').addEventListener('change', () => { const old = scale, top = pane.scrollTop / old, left = pane.scrollLeft / old; layout(); pane.scrollTop = top * scale; pane.scrollLeft = left * scale; draw(); });
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode, true)));
  for (const key of ['X', 'Y', 'Width', 'Height']) $('rect' + key).addEventListener('change', () => {
    if (!asset()) return; const r = currentRect(), n = Number($('rect' + key).value); if (!Number.isFinite(n)) return;
    const next = M.rectangle({ ...r, [key.toLowerCase()]: n }, asset().width, asset().height);
    if (mode === 'cover') project.cover.rect = next; else { asset().body = next; asset().cuts = M.normalizeCuts(asset()); }
    cutList(); changed(mode !== 'cover');
  });
  $('fullBody').addEventListener('click', () => { if (!asset()) return; asset().body = { x: 0, y: 0, width: asset().width, height: asset().height }; setMode('body'); cutList(); changed(true); });
  $('showCover').addEventListener('click', () => { if (!project.cover) return; selected = project.cover.assetIndex; refreshAssets(); setMode('cover'); pane.scrollTop = project.cover.rect.y * scale - 30; pane.scrollLeft = project.cover.rect.x * scale - 30; draw(); });
  $('title').addEventListener('input', () => { project.title = $('title').value; changed(); });
  for (const id of ['outline', 'titleBottom', 'color', 'highlightColor', 'highlightWords']) $(id).addEventListener('input', () => {
    const key = id === 'outline' ? 'outlineWidth' : id; project.appearance[key] = $(id).value; project.appearance = M.appearance(project.appearance);
    $('outlineValue').textContent = project.appearance.outlineWidth + 'px'; $('titleBottomValue').textContent = project.appearance.titleBottom + '%'; changed();
  });
  $('raw').addEventListener('change', () => { project.rawCover = $('raw').checked; changed(); });
  $('complete').addEventListener('change', () => { project.complete = $('complete').checked; syncExport(); });
  $('exportZip').addEventListener('click', exportZip);
  pane.addEventListener('scroll', () => { if (drag && drag.type !== 'pan' && lastPointer) applyDrag(lastPointer); else draw(); });
  canvas.addEventListener('pointerdown', (event) => {
    if (busy || !asset()) return; const p = point(event), a = asset(), r = currentRect(); lastPointer = event;
    if (mode === 'comment') {
      const b = a.body;
      if (p.x < b.x || p.x > b.x + b.width || p.y <= b.y + 2 || p.y >= b.y + b.height - 2) return message('선택한 본문 범위 안에서 댓글이 시작되는 위치를 클릭하세요.');
      a.commentStartY = Math.round(p.y);
      setMode('pan'); renderBoundaryStatus(); changed(true);
      message(`원문 ${selected + 1}의 ${Math.round(p.y)}px부터 댓글 영역으로 분리했습니다.`);
      return;
    }
    if (mode === 'cut') {
      const b = a.body;
      if (p.x < b.x || p.x > b.x + b.width || p.y <= b.y + 2 || p.y >= b.y + b.height - 2) return message('선택한 본문 범위 안에서 클릭하세요.');
      if (a.cuts.length >= 100) return message('원문 한 장에는 100개까지 분할선을 넣을 수 있습니다.');
      a.cuts = M.normalizeCuts(a, [...a.cuts, Math.round(p.y)]); setMode('body'); cutList(); changed(true);
      message(`본문이 ${a.cuts.length + 1}장으로 나뉩니다. 주황색 선을 끌어 위치를 조절하세요.`); return;
    }
    const threshold = 10 / scale, inside = p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
    const left = Math.abs(p.x - r.x) < threshold, right = Math.abs(p.x - r.x - r.width) < threshold;
    const top = Math.abs(p.y - r.y) < threshold, bottom = Math.abs(p.y - r.y - r.height) < threshold;
    const cut = mode === 'body' && inside ? a.cuts.findIndex((y) => Math.abs(y - p.y) < threshold) : -1;
    drag = { start: p, screen: { x: event.clientX, y: event.clientY }, scroll: { top: pane.scrollTop, left: pane.scrollLeft },
      rect: { ...r }, left, top, cut, type: mode === 'pan' ? 'pan' : freshRectangle ? 'new' : cut >= 0 ? 'cut' : (left || right) && (top || bottom) ? 'resize' : inside ? 'move' : 'new' };
    freshRectangle = false;
    canvas.setPointerCapture(event.pointerId);
    if (scrollRequest) cancelAnimationFrame(scrollRequest);
    scrollRequest = requestAnimationFrame(autoScroll);
  });
  function autoScroll() {
    if (!drag || drag.type === 'pan' || !lastPointer) { scrollRequest = 0; return; }
    const b = bounds(), y = lastPointer.clientY - b.top, x = lastPointer.clientX - b.left;
    const oldTop = pane.scrollTop, oldLeft = pane.scrollLeft;
    if (y > pane.clientHeight - 28) pane.scrollTop += 12; else if (y < 28) pane.scrollTop -= 12;
    if (x > pane.clientWidth - 28) pane.scrollLeft += 12; else if (x < 28) pane.scrollLeft -= 12;
    if (oldTop !== pane.scrollTop || oldLeft !== pane.scrollLeft) applyDrag(lastPointer);
    scrollRequest = requestAnimationFrame(autoScroll);
  }
  function applyDrag(event) {
    if (!drag || busy || !asset()) return; lastPointer = event;
    const d = drag, a = asset();
    if (d.type === 'pan') { pane.scrollTop = d.scroll.top - event.clientY + d.screen.y; pane.scrollLeft = d.scroll.left - event.clientX + d.screen.x; draw(); return; }
    const p = point(event); p.x = M.clamp(p.x, 0, a.width); p.y = M.clamp(p.y, 0, a.height);
    if (d.type === 'cut') {
      const low = d.cut ? a.cuts[d.cut - 1] + 2 : a.body.y + 2, high = d.cut < a.cuts.length - 1 ? a.cuts[d.cut + 1] - 2 : a.body.y + a.body.height - 2;
      a.cuts[d.cut] = M.clamp(Math.round(p.y), low, high);
    } else {
      let r;
      if (d.type === 'move') r = { ...d.rect, x: d.rect.x + p.x - d.start.x, y: d.rect.y + p.y - d.start.y };
      else { const anchor = d.type === 'new' ? d.start : { x: d.left ? d.rect.x + d.rect.width : d.rect.x, y: d.top ? d.rect.y + d.rect.height : d.rect.y };
        r = { x: Math.min(p.x, anchor.x), y: Math.min(p.y, anchor.y), width: Math.abs(p.x - anchor.x), height: Math.abs(p.y - anchor.y) }; }
      r = M.rectangle(r, a.width, a.height);
      if (mode === 'cover') project.cover.rect = r; else { a.body = r; a.cuts = M.normalizeCuts(a); }
    }
    changed(mode !== 'cover');
  }
  canvas.addEventListener('pointermove', applyDrag);
  const stopDrag = () => { drag = null; lastPointer = null; if (scrollRequest) cancelAnimationFrame(scrollRequest); scrollRequest = 0; cutList(); };
  canvas.addEventListener('pointerup', stopDrag); canvas.addEventListener('pointercancel', stopDrag);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { stopDrag(); setMode('pan'); } });
  new ResizeObserver(layout).observe(pane);
  window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  async function fromText(text, metadata) {
    if (busy || !text.trim() || text.length > 20000) return message('텍스트 원문은 1~20,000자로 입력하세요.');
    setBusy(true);
    try {
      M.assertFontText(text, 'sans');
      await document.fonts?.load(`400 40px ${M.FONT}`);
      const c = document.createElement('canvas'); c.width = 1080; const context = c.getContext('2d'); context.font = `400 40px ${M.FONT}`;
      const lines = M.splitLines(context, text, 984), prepared = [];
      for (let i = 0; i < lines.length; i += 80) {
        const page = lines.slice(i, i + 80); c.height = 96 + page.length * 64;
        context.fillStyle = '#fff'; context.fillRect(0, 0, 1080, c.height); context.font = `400 40px ${M.FONT}`; context.fillStyle = '#171717'; context.textBaseline = 'top';
        page.forEach((line, row) => context.fillText(line.text, 48, 48 + row * 64));
        const dataUrl = c.toDataURL('image/png'), image = await decode(dataUrl);
        prepared.push({ image, source: { name: `텍스트 원문 ${i / 80 + 1}`, width: c.width, height: c.height, dataUrl, kind: 'text' } });
      }
      if (project.assets.length + prepared.length > 30) throw new Error('원문이 너무 많습니다. 새 편집에서 나눠주세요.');
      for (const p of prepared) { M.addAsset(project, p.source); images.push(p.image); }
      project.source = metadata.source; project.source.sourceText = text; project.title = metadata.title || '';
      project.community ||= M.defaultCommunity(project.source);
      project.community.title = project.source.title || project.title || project.community.title;
      project.community.body = text;
      if (project.source.commentsText) project.community.comments = project.source.commentsText;
      if (Array.isArray(project.source.bodyMedia)) project.community.bodyMedia = project.source.bodyMedia;
      dirty = true; project.complete = false;
      refreshAssets(); goStep(2); message('텍스트 원문을 불러왔습니다. 표지는 기존대로 편집하고 본문은 새 커뮤니티 양식으로 미리볼 수 있습니다.');
    } catch (error) { message(error.message); }
    finally { setBusy(false); }
  }
  let intakeAccepted = false;
  window.addEventListener('message', (event) => {
    if (!window.opener || event.source !== window.opener || event.origin !== location.origin || event.data?.type !== 'threads-cut-input' || intakeAccepted || dirty) return;
    intakeAccepted = true;
    const data = event.data, metadata = { title: String(data.title || ''), source: {
      candidateId: String(data.source?.candidateId || ''),
      title: String(data.source?.title || ''),
      url: String(data.source?.url || ''),
      inputMode: data.source?.inputMode === 'text' ? 'text' : 'images',
      productionNotes: String(data.source?.productionNotes || '').slice(0, 6000),
      commentsText: String(data.source?.commentsText || '').slice(0, 30000),
      bodyMedia: Array.isArray(data.source?.bodyMedia) ? data.source.bodyMedia.slice(0, 24) : [],
    } };
    if (data.sourceText) fromText(String(data.sourceText), metadata);
    else if (Array.isArray(data.files)) acquire(data.files, metadata);
  });
  document.querySelectorAll('[data-step-target]').forEach((button) => button.addEventListener('click', () => goStep(button.dataset.stepTarget)));
  $('assetRail')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-asset-index]'); if (!button) return;
    selected = Number(button.dataset.assetIndex); $('asset').value = String(selected); pane.scrollTop = 0; pane.scrollLeft = 0;
    setMode('pan'); renderAssetRail(); layout(); cutList();
  });
  for (const [id, delta] of [['prevAssetQuick', -1], ['nextAssetQuick', 1]]) $(id)?.addEventListener('click', () => {
    if (!images.length) return; selected = (selected + delta + images.length) % images.length; $('asset').value = String(selected);
    pane.scrollTop = 0; pane.scrollLeft = 0; setMode('pan'); renderAssetRail(); layout(); cutList();
  });
  $('asset').addEventListener('change', () => renderAssetRail());
  $('clearCommentBoundary')?.addEventListener('click', () => {
    if (!asset()) return;
    asset().commentStartY = null;
    renderBoundaryStatus();
    changed(true);
    message('선택한 원문의 댓글 시작선을 지웠습니다.');
  });
  const communityChange = () => {
    project.community = readCommunityUi();
    project.complete = false; $('complete').checked = false;
    renderBodyMediaList();
    renderBoundaryStatus();
    changed(true);
  };
  $('communityEnabled').addEventListener('change', communityChange);
  communityIds.forEach((id) => { $(id).addEventListener('input', communityChange); $(id).addEventListener('change', communityChange); });

  if (window.opener && location.hash === '#intake') window.opener.postMessage({ type: 'threads-cut-ready' }, location.origin);
  if (document.fonts?.load) {
    Promise.allSettled([
      document.fonts.load('800 38px "Seoul Namsan EB"'),
      document.fonts.load('500 58px "Yangjin"'),
      ...Object.values(M.FONTS).flatMap(f => f.weights.map(w => document.fonts.load(`${w} 48px ${f.family}`))),
    ]).then(() => schedulePreview());
  }
  document.fonts?.ready.then(schedulePreview).catch(() => schedulePreview());
  window.ThreadsSourceCutEditor = Object.freeze({ openProject: async (value) => {
    if (busy) throw new Error('파일 처리 중입니다. 잠시 후 다시 시도하세요.');
    setBusy(true); try { await openProject(value); } finally { setBusy(false); }
  }, getProject: () => clone(project), flushHistory: async () => { if (await flushAudit('close') === false) throw new Error('PC 기록 저장에 실패했습니다. 편집 저장 후 다시 닫아주세요.'); } });
  syncCommunityUi(); goStep(project.assets.length ? 2 : 1); setMode('pan'); layout();
})();
