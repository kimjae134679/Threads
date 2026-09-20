(function () {
  'use strict';

  const sessions = new Map();
  let activeId = null;
  let files = [];
  let packagePreview = null;
  let previewBasis = '';
  let previewCanvases = [];
  let exporting = false;
  let buildGeneration = 0;
  const $ = (selector) => document.querySelector(selector);
  const renderer = () => window.ThreadsSourceCarousel;
  const context = () => window.ThreadsSourceIntakeContext;
  const selectedCandidate = () => context()?.getCandidate?.(context()?.getSelectedId?.()) || null;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
  const fieldIds = { format: 'sourceFormatInput', body: 'sourceBodyCaptureStatus', rights: 'sourceRightsInput',
    caption: 'sourceCaptionInput', hook: 'sourceHookInput', mode: 'sourceInputMode', text: 'sourceTextInput' };

  function fields() {
    return Object.fromEntries(Object.entries(fieldIds).map(([key, id]) => [key, $('#' + id).value]));
  }

  function renderMode() {
    const textOnly = $('#sourceInputMode').value === 'text';
    $('#sourceTextLabel').hidden = !textOnly;
    $('#sourceImageLabel').hidden = textOnly;
    $('#sourceAssetList').hidden = textOnly;
    $('#sourceFormatInput').disabled = textOnly;
    if (textOnly) $('#sourceFormatInput').value = '글';
  }

  function syncSelection() {
    const candidate = selectedCandidate();
    const id = candidate?.id || null;
    if (id === activeId) return;
    if (activeId) sessions.set(activeId, { files, fields: fields() });
    activeId = id;
    const session = sessions.get(id);
    const saved = candidate?.sourcePackage;
    files = session?.files || [];
    const defaults = { format: saved?.sourceFormat || '글', body: saved?.fullBodyCaptureStatus || 'pending',
      rights: saved?.rightsState || 'UNKNOWN', caption: saved?.captionDraft || '',
      hook: saved?.coverText || candidate?.title || '', mode: saved?.inputMode || 'images', text: saved?.sourceText || '' };
    const values = { ...defaults, ...session?.fields };
    for (const [key, fieldId] of Object.entries(fieldIds)) $('#' + fieldId).value = values[key];
    $('#sourceAssetInput').value = '';
    renderMode();
    invalidate(saved ? '저장된 제목과 원문을 복원했습니다. 이미지 모드에서는 원본 파일을 다시 선택하세요.'
      : '원문 캡처를 선택하거나 텍스트 원문을 입력하세요.');
    renderList();
  }

  function basis() {
    const candidate = selectedCandidate();
    return JSON.stringify({ id: candidate?.id, title: candidate?.title, url: candidate?.url, fields: fields(),
      files: files.map((entry) => [entry.url, entry.kind]) });
  }

  function invalidate(message = '입력이 변경되었습니다. 미리보기를 다시 만들어주세요.') {
    buildGeneration += 1;
    packagePreview = null;
    previewBasis = '';
    previewCanvases = [];
    $('#sourcePackageStatus').textContent = message;
    renderCarousel();
  }

  function renderList() {
    $('#sourceAssetList').innerHTML = files.length
      ? '<p class="muted-inline">첫 번째 원문을 표지 배경으로 사용합니다.</p>' + files.map((entry, index) => `
        <div class="source-asset-row" data-index="${index}"><img src="${entry.url}" alt="원문 자산 ${index + 1}"/>
          <div><strong>${index + 1}. ${escapeHtml(entry.file.name)}</strong>
            <select class="source-kind" aria-label="원문 ${index + 1} 종류">
              <option value="post"${entry.kind === 'post' ? ' selected' : ''}>원문 스크린샷</option>
              <option value="media"${entry.kind === 'media' ? ' selected' : ''}>원문 첨부 이미지</option>
            </select></div>
          <div class="source-order"><button type="button" data-move="up">위로</button><button type="button" data-move="down">아래로</button></div>
        </div>`).join('') : '<span class="muted-inline">인스타 메뉴·버튼이 제외된 원문 캡처를 선택하세요.</span>';
  }

  function clearFiles() {
    files.forEach((entry) => URL.revokeObjectURL(entry.url));
    files = [];
    $('#sourceAssetInput').value = '';
    $('#sourceBodyCaptureStatus').value = 'pending';
    invalidate('이미지 선택을 비웠습니다.');
    renderList();
  }

  async function buildPackage() {
    syncSelection();
    invalidate('미리보기를 만드는 중입니다.');
    const generation = buildGeneration;
    const candidate = selectedCandidate();
    if (!candidate) throw new Error('먼저 후보를 선택하세요.');
    const values = fields();
    const textOnly = values.mode === 'text';
    if (!textOnly && !files.length) throw new Error('원문 스크린샷/이미지를 선택하거나 텍스트 원문 모드를 사용하세요.');
    if (!values.hook.trim()) throw new Error('표지 제목을 입력하세요.');
    const expectedBasis = basis();
    const entries = textOnly ? [] : files.map((entry) => ({ ...entry }));
    const images = await Promise.all(entries.map((entry) => loadImage(entry.url)));
    if (document.fonts?.load) {
      await Promise.all([document.fonts.load('900 116px \"Carousel Sans KR\"'), document.fonts.load('400 40px \"Carousel Sans KR\"')]);
    }
    if (document.fonts?.ready) await document.fonts.ready;
    if (basis() !== expectedBasis || generation !== buildGeneration) throw new Error('선택한 후보나 입력이 변경되었습니다. 다시 만들어주세요.');
    const provenance = candidate.url || (textOnly ? 'User-provided original text' : 'User-selected original screenshot/image');
    const observedAt = new Date().toISOString();
    const next = window.ThreadsSourcePackage.build({
      inputMode: values.mode, sourceText: textOnly ? values.text : undefined,
      sourceUrl: candidate.url || '', sourcePlatform: candidate.sourceType || 'manual',
      sourceFormat: values.format, title: candidate.title, coverText: values.hook,
      fullBodyCaptureStatus: values.body, rightsState: values.rights,
      userProvidedProvenance: candidate.url ? '' : provenance,
      assets: textOnly ? [] : [
        { id: 'asset-cover-auto', name: `AUTO_COVER_FROM_${entries[0].file.name}`, mime: 'image/png', kind: 'cover',
          provenance: 'Cover composed from the first original image and user headline' },
        ...entries.map((entry, index) => ({
          id: `asset-${String(index + 1).padStart(2, '0')}`, name: entry.file.name, mime: entry.file.type,
          kind: entry.kind, sourceSequence: index + 1, acquisitionState: 'USER_PROVIDED',
          sourceWidth: images[index].naturalWidth, sourceHeight: images[index].naturalHeight,
          provenance, captureUrl: candidate.url || '', observedAt, verifiedByVision: false, verifiedByOcr: false,
        })),
      ],
    });
    next.candidateId = candidate.id;
    next.captionDraft = values.caption;
    next.originalImageBytesPersisted = false;
    const measure = document.createElement('canvas').getContext('2d');
    const slides = renderer().plan(measure, next, images, entries);
    const { width, height } = slides[0];
    next.coverStyle = { ...renderer().STYLE, width, height,
      titleBottom: renderer().titleLayout(measure, next.coverText || next.title, { width, height }).bottom,
      canvasSizing: textOnly ? 'text-default' : 'source-aspect',
      backgroundBlur: 0, titleStroke: '#000', titleFill: '#fff' };
    const canvases = slides.map((slide) => {
      const canvas = document.createElement('canvas');
      canvas.width = slide.width;
      canvas.height = slide.height;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', slide.type === 'cover' ? `표지: ${next.coverText}` : '원문 본문');
      renderer().render(canvas.getContext('2d'), slide);
      return canvas;
    });
    next.output = { width, height, slideCount: slides.length,
      bodyPagination: textOnly ? 'wrapped-original-text' : 'aspect-preserving-slices' };
    if (next.renderPlan[0]) {
      next.renderPlan[0].treatment = textOnly ? 'source-text-plus-headline' : 'source-image-plus-headline';
      next.renderPlan[0].overlay = 'user-headline';
    }
    context()?.saveSourcePackage?.(candidate.id, next);
    packagePreview = next;
    previewBasis = expectedBasis;
    previewCanvases = canvases;
    $('#sourcePackageStatus').textContent = `표지 1장 + 본문 ${slides.length - 1}장 · ${width}×${height}\n${textOnly
      ? '제목과 원문 텍스트 저장됨' : '제목과 이미지 정보 저장됨 · 원본 파일은 브라우저 세션에만 유지'}\n전체 본문: ${next.fullBodyCaptureStatus} · 실제 게시 없음`;
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
    root.innerHTML = '';
    if (!packagePreview) {
      root.innerHTML = '<span class="muted-inline">원문과 표지 제목을 입력한 뒤 미리보기를 만드세요.</span>';
      return;
    }
    const actions = document.createElement('div');
    actions.className = 'source-carousel-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'exportSourceCarouselPngBtn';
    button.textContent = `${packagePreview.output.width}×${packagePreview.output.height} PNG 세트 받기`;
    button.disabled = packagePreview.assetsPending || exporting;
    button.addEventListener('click', exportPngSet);
    actions.appendChild(button);
    const help = document.createElement('small');
    help.textContent = packagePreview.assetsPending ? '전체 본문 포함 여부를 확인하면 다운로드할 수 있습니다.'
      : '미리보기와 동일한 이미지가 저장됩니다. 게시 승인은 별도입니다.';
    actions.appendChild(help);
    root.appendChild(actions);
    previewCanvases.forEach((canvas, index) => {
      const figure = document.createElement('figure');
      figure.className = 'source-slide';
      figure.appendChild(canvas);
      const caption = document.createElement('figcaption');
      caption.textContent = index === 0 ? '표지' : `본문 ${index}`;
      figure.appendChild(caption);
      root.appendChild(figure);
    });
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
    const canvases = [...previewCanvases];
    const isCurrent = () => basis() === expectedBasis && previewBasis === expectedBasis;
    renderCarousel();
    try {
      for (let index = 0; index < canvases.length; index += 1) {
        if (!isCurrent()) throw new Error('제작 입력이 변경되어 출력을 중단했습니다.');
        await downloadCanvas(canvases[index], `source-carousel-${String(index + 1).padStart(2, '0')}.png`, isCurrent);
      }
      $('#sourcePackageStatus').textContent += `\nPNG ${canvases.length}장 다운로드 요청 완료. 브라우저 다운로드 목록에서 저장 여부를 확인하세요.`;
    } catch (error) {
      if (isCurrent()) $('#sourcePackageStatus').textContent += `\nPNG 출력 중단: ${error.message}`;
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
      invalidate('선택한 원문의 순서와 전체 본문 포함 여부를 확인하세요.');
      renderList();
    });
    $('#clearSourceAssetsBtn').addEventListener('click', clearFiles);
    $('#buildSourcePackageBtn').addEventListener('click', async () => {
      const pending = buildPackage();
      const generation = buildGeneration;
      try { await pending; }
      catch (error) {
        // Do not replace another candidate's state with a stale build error.
        if (generation === buildGeneration && !packagePreview) $('#sourcePackageStatus').textContent = `생성 차단: ${error.message}`;
      }
    });
    $('#openSourceCutEditorBtn')?.addEventListener('click', () => {
      syncSelection();
      const candidate = selectedCandidate(), values = fields();
      if (!candidate) return invalidate('먼저 후보를 선택하세요.');
      if (values.mode === 'images' && !files.length) return invalidate('원문 이미지를 먼저 선택하세요.');
      if (values.mode === 'text' && !values.text.trim()) return invalidate('원문 본문을 먼저 입력하세요.');
      const payload = { type: 'threads-cut-input', title: values.hook,
        source: { candidateId: candidate.id, title: candidate.title, url: candidate.url || '', inputMode: values.mode },
        sourceText: values.mode === 'text' ? values.text : '', files: values.mode === 'text' ? [] : files.map((entry) => entry.file) };
      const popup = window.open('./source-cut-editor.html#intake', '_blank');
      if (!popup) return invalidate('팝업이 차단되었습니다. 이 사이트의 새 창 열기를 허용하세요.');
      const onReady = (event) => {
        if (event.source !== popup || event.origin !== location.origin || event.data?.type !== 'threads-cut-ready') return;
        popup.postMessage(payload, location.origin);
        window.removeEventListener('message', onReady);
      };
      window.addEventListener('message', onReady);
      setTimeout(() => window.removeEventListener('message', onReady), 60000);
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
    for (const id of Object.values(fieldIds)) {
      const onChange = () => {
        if (id === 'sourceTextInput' || id === 'sourceInputMode' || id === 'sourceFormatInput') {
          $('#sourceBodyCaptureStatus').value = 'pending';
        }
        renderMode();
        invalidate();
      };
      $('#' + id).addEventListener('input', onChange);
      $('#' + id).addEventListener('change', onChange);
    }
    document.addEventListener('threads:candidate-selected', syncSelection);
    syncSelection(); renderList(); renderCarousel();
  }

  window.ThreadsSourceIntake = Object.freeze({ bind, buildPackage, getPreview: () => packagePreview,
    renderCarousel, exportPngSet, sourceSlices: (...args) => renderer().sourceSlices(...args), syncSelection });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bind) : bind();
})();
