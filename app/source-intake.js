(function () {
  'use strict';

  const sessions = new Map();
  let activeId = null;
  let files = [];
  let packagePreview = null;
  let previewBasis = '';
  let exporting = false;
  const $ = (selector) => document.querySelector(selector);
  const context = () => window.ThreadsSourceIntakeContext;
  const selectedCandidate = () => context()?.getCandidate?.(context()?.getSelectedId?.()) || null;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  function fields() {
    return {
      format: $('#sourceFormatInput').value,
      body: $('#sourceBodyCaptureStatus').value,
      rights: $('#sourceRightsInput').value,
      caption: $('#sourceCaptionInput').value,
    };
  }

  function syncSelection() {
    const candidate = selectedCandidate();
    const id = candidate?.id || null;
    if (id === activeId) return;
    if (activeId) sessions.set(activeId, { files, fields: fields() });
    activeId = id;
    const session = sessions.get(id);
    files = session?.files || [];
    const values = session?.fields || { format: '글', body: 'pending', rights: 'UNKNOWN', caption: '' };
    $('#sourceFormatInput').value = values.format;
    $('#sourceBodyCaptureStatus').value = values.body;
    $('#sourceRightsInput').value = values.rights;
    $('#sourceCaptionInput').value = values.caption;
    $('#sourceHookInput').value = candidate?.title || '';
    $('#sourceAssetInput').value = '';
    invalidate(candidate?.sourcePackage
      ? '저장된 제작 메타데이터가 있습니다. 이미지 파일은 이 브라우저 세션에서 다시 선택해야 합니다.'
      : '현재 후보의 원문 이미지를 선택하세요.');
    renderList();
  }

  function basis() {
    const candidate = selectedCandidate();
    return JSON.stringify({ id: candidate?.id, title: candidate?.title, url: candidate?.url, fields: fields(),
      files: files.map((entry) => [entry.url, entry.kind]) });
  }

  function invalidate(message = '입력이 변경되었습니다. Source Package를 다시 만들어주세요.') {
    packagePreview = null;
    previewBasis = '';
    $('#sourcePackageStatus').textContent = message;
    renderCarousel();
  }

  function renderList() {
    const root = $('#sourceAssetList');
    root.innerHTML = files.length ? '<div class="source-asset-row"><strong>커버: 첫 이미지와 원문 제목</strong></div>' +
      files.map((entry, index) => `<div class="source-asset-row" data-index="${index}">
        <img src="${entry.url}" alt="원문 자산 ${index + 1}"/>
        <div><strong>${index + 1}. ${escapeHtml(entry.file.name)}</strong>
          <select class="source-kind" aria-label="원문 ${index + 1} 종류">
            <option value="post"${entry.kind === 'post' ? ' selected' : ''}>원문 스크린샷</option>
            <option value="media"${entry.kind === 'media' ? ' selected' : ''}>원문 첨부 이미지</option>
          </select></div>
        <div class="source-order"><button type="button" data-move="up">위로</button><button type="button" data-move="down">아래로</button></div>
      </div>`).join('') : '<span class="muted-inline">원문 스크린샷/이미지를 선택하세요.</span>';
  }

  function clearFiles() {
    files.forEach((entry) => URL.revokeObjectURL(entry.url));
    files = [];
    if (activeId) sessions.delete(activeId);
    $('#sourceAssetInput').value = '';
    $('#sourceBodyCaptureStatus').value = 'pending';
    invalidate('이미지 선택을 비웠습니다.');
    renderList();
  }

  async function buildPackage() {
    syncSelection();
    invalidate('이미지 크기를 확인하는 중입니다.');
    const candidate = selectedCandidate();
    if (!candidate) throw new Error('먼저 후보를 선택하세요.');
    if (!files.length) throw new Error('실제 원문 스크린샷/이미지 1장 이상이 필요합니다.');
    const expectedBasis = basis();
    const entries = files.map((entry) => ({ ...entry }));
    const images = await Promise.all(entries.map((entry) => loadImage(entry.url)));
    if (basis() !== expectedBasis) throw new Error('선택한 후보나 이미지가 변경되었습니다. 다시 만들어주세요.');
    const values = fields();
    const provenance = candidate.url || 'User-selected original screenshot/image';
    const observedAt = new Date().toISOString();
    const next = window.ThreadsSourcePackage.build({
      sourceUrl: candidate.url || '', sourcePlatform: candidate.sourceType || 'manual',
      sourceFormat: values.format, title: candidate.title, coverText: candidate.title,
      fullBodyCaptureStatus: values.body, rightsState: values.rights,
      userProvidedProvenance: candidate.url ? '' : provenance,
      assets: [
        { id: 'asset-cover-auto', name: `AUTO_COVER_FROM_${entries[0].file.name}`, mime: 'image/png', kind: 'cover',
          provenance: `Cover plan derived from first source image; title=${candidate.title}` },
        ...entries.map((entry, index) => ({
          id: `asset-${String(index + 1).padStart(2, '0')}`, name: entry.file.name, mime: entry.file.type,
          kind: entry.kind, sourceSequence: index + 1, acquisitionState: 'USER_PROVIDED',
          sourceWidth: images[index].naturalWidth, sourceHeight: images[index].naturalHeight,
          provenance, captureUrl: candidate.url || '', observedAt,
          verifiedByVision: false, verifiedByOcr: false,
        })),
      ],
    });
    next.candidateId = candidate.id;
    next.captionDraft = values.caption;
    next.originalImageBytesPersisted = false;
    context()?.saveSourcePackage?.(candidate.id, next);
    packagePreview = next;
    previewBasis = expectedBasis;
    $('#sourcePackageStatus').textContent = `Source Package 준비됨 · 커버 1 + 원문 ${entries.length}개\n전체 본문: ${next.fullBodyCaptureStatus} · ASSETS_PENDING: ${next.assetsPending ? 'YES' : 'NO'}\n이미지 크기 확인 완료 · OCR/자동 개인정보 검토 미실행\n메타데이터 저장됨 · 이미지 파일은 브라우저 세션에만 유지 · 실제 게시 없음`;
    renderCarousel();
    return next;
  }

  function ensurePreviewRoot() {
    let root = $('#sourceCarouselPreview');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sourceCarouselPreview';
      root.className = 'source-carousel-preview';
      $('#sourcePackageStatus').insertAdjacentElement('afterend', root);
    }
    return root;
  }

  function renderCarousel() {
    const root = ensurePreviewRoot();
    if (!packagePreview || !files.length) {
      root.innerHTML = '<span class="muted-inline">이미지를 선택하고 전체 본문 포함 여부를 확인한 뒤 Source Package를 만드세요.</span>';
      return;
    }
    const title = escapeHtml(packagePreview.coverText || packagePreview.title);
    const ready = !packagePreview.assetsPending;
    root.innerHTML = `<div class="source-carousel-actions"><button type="button" id="exportSourceCarouselPngBtn"${!ready || exporting ? ' disabled' : ''}>1080×1080 PNG 세트 받기</button>
      <small>${ready ? '전체 본문 포함 확인됨 · 게시 동작 없음' : '전체 본문 포함 확인 전 출력 차단'}</small></div>
      <article class="source-slide source-slide-hook"><img class="source-slide-bg" src="${files[0].url}" alt="커버 배경"/>
        <div class="source-slide-shade"></div><div class="source-slide-copy"><strong>${title}</strong></div></article>` +
      files.map((entry, index) => `<article class="source-slide source-slide-evidence"><img class="source-slide-main" src="${entry.url}" alt="원문 ${index + 1}"/>
        <span class="source-slide-badge">원문 ${index + 1} · 긴 캡처는 PNG 출력 때 분할</span></article>`).join('');
    $('#exportSourceCarouselPngBtn').addEventListener('click', exportPngSet);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
        ? resolve(image) : reject(new Error('이미지 크기를 확인할 수 없습니다.'));
      image.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
      image.src = url;
    });
  }

  function cover(ctx, image, width, height) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  }

  function contain(ctx, image, width, height, pad = 48) {
    const scale = Math.min((width - pad * 2) / image.naturalWidth, (height - pad * 2) / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  }

  function sourceSlices(image, width = 1080, height = 1080, pad = 48) {
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

  function drawSourceSlice(ctx, image, slice, width = 1080, height = 1080, pad = 48) {
    const scale = (width - pad * 2) / image.naturalWidth;
    ctx.drawImage(image, 0, slice.sy, image.naturalWidth, slice.sh, pad, pad, width - pad * 2, slice.sh * scale);
  }

  function drawTitle(ctx, title) {
    // Wrap by character so long Korean titles cannot overflow or be silently truncated.
    let lines = [], size = 66;
    for (; size >= 24; size -= 2) {
      ctx.font = `700 ${size}px system-ui,sans-serif`;
      lines = [''];
      for (const character of String(title)) {
        const index = lines.length - 1;
        if (lines[index] && ctx.measureText(lines[index] + character).width > 936) lines.push(character);
        else lines[index] += character;
      }
      if (lines.length * size * 1.25 <= 800) break;
    }
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    const lineHeight = size * 1.25;
    lines.forEach((line, index) => ctx.fillText(line, 72, (1080 - lines.length * lineHeight) / 2 + index * lineHeight));
  }

  function downloadCanvas(canvas, name, isCurrent) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG 생성 실패'));
      if (!isCurrent()) return reject(new Error('제작 입력이 변경되어 출력을 중단했습니다.'));
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png'));
  }

  async function exportPngSet() {
    syncSelection();
    if (exporting || !packagePreview || packagePreview.assetsPending || basis() !== previewBasis) return;
    exporting = true;
    const expectedBasis = previewBasis;
    const isCurrent = () => basis() === expectedBasis && previewBasis === expectedBasis;
    const pkg = packagePreview;
    const entries = files.map((entry) => ({ ...entry }));
    renderCarousel();
    try {
      const images = await Promise.all(entries.map((entry) => loadImage(entry.url)));
      if (!isCurrent()) throw new Error('제작 입력이 변경되었습니다.');
      let outputIndex = 1;
      const download = async (canvas) => {
        await downloadCanvas(canvas, `source-carousel-${String(outputIndex++).padStart(2, '0')}.png`, isCurrent);
      };
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      cover(ctx, images[0], 1080, 1080);
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, 1080, 1080);
      drawTitle(ctx, pkg.coverText || pkg.title);
      await download(canvas);
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const slices = entries[index].kind === 'post' ? sourceSlices(image) : [null];
        for (const slice of slices) {
          if (!isCurrent()) throw new Error('제작 입력이 변경되어 출력을 중단했습니다.');
          ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 1080, 1080);
          if (slice) drawSourceSlice(ctx, image, slice);
          else contain(ctx, image, 1080, 1080);
          await download(canvas);
        }
      }
      $('#sourcePackageStatus').textContent += `\nPNG ${outputIndex - 1}장 다운로드 요청 완료. 브라우저 다운로드 목록에서 파일 저장 여부를 확인하세요. 실제 게시 없음.`;
    } catch (error) {
      $('#sourcePackageStatus').textContent += `\nPNG 출력 중단: ${error.message}`;
    } finally {
      exporting = false;
      renderCarousel();
    }
  }

  function bind() {
    const input = $('#sourceAssetInput');
    if (!input) return;
    input.addEventListener('change', () => {
      const selectedFiles = [...input.files];
      syncSelection();
      if (!selectedCandidate()) return invalidate('먼저 후보를 선택하세요.');
      clearFiles();
      files = selectedFiles.filter((file) => /^image\//.test(file.type)).map((file) => ({
        file, url: URL.createObjectURL(file), kind: 'post',
      }));
      invalidate('선택한 이미지의 원문 순서와 전체 본문 포함 여부를 확인하세요.');
      renderList();
    });
    $('#clearSourceAssetsBtn').addEventListener('click', clearFiles);
    $('#buildSourcePackageBtn').addEventListener('click', async () => {
      try { await buildPackage(); }
      catch (error) { invalidate(`생성 차단: ${error.message}`); }
    });
    $('#sourceAssetList').addEventListener('change', (event) => {
      const row = event.target.closest('.source-asset-row[data-index]');
      if (!row) return;
      files[Number(row.dataset.index)].kind = event.target.value;
      invalidate();
    });
    $('#sourceAssetList').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-move]');
      if (!button) return;
      const index = Number(button.closest('.source-asset-row').dataset.index);
      const target = button.dataset.move === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= files.length) return;
      [files[index], files[target]] = [files[target], files[index]];
      invalidate(); renderList();
    });
    for (const id of ['sourceFormatInput', 'sourceBodyCaptureStatus', 'sourceRightsInput', 'sourceCaptionInput']) {
      $('#' + id).addEventListener('change', () => invalidate());
    }
    document.addEventListener('threads:candidate-selected', syncSelection);
    syncSelection(); renderList(); renderCarousel();
  }

  window.ThreadsSourceIntake = Object.freeze({ bind, buildPackage, getPreview: () => packagePreview,
    renderCarousel, exportPngSet, sourceSlices, syncSelection });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bind) : bind();
})();
