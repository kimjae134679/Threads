(function () {
  'use strict';
  let files = [];
  let packagePreview = null;

  function $(s) { return document.querySelector(s); }
  function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function inferKind(index, name) {
    const n = String(name || '').toLowerCase();
    if (/comment|reply|댓글|반응/.test(n)) return 'comment';
    return index === 0 ? 'post' : 'continuation';
  }

  function renderList() {
    const root = $('#sourceAssetList');
    if (!root) return;
    root.innerHTML = files.length ? files.map((entry, i) => `<div class="source-asset-row" data-index="${i}"><img src="${entry.url}" alt="선택 이미지 ${i + 1}" /><div><strong>${i + 1}. ${escapeHtml(entry.file.name)}</strong><small>${escapeHtml(entry.file.type)} · OCR 미실행 · privacy review 필요</small><select class="source-kind"><option value="post"${entry.kind==='post'?' selected':''}>원문</option><option value="continuation"${entry.kind==='continuation'?' selected':''}>이어지는 캡처</option><option value="media"${entry.kind==='media'?' selected':''}>첨부 이미지</option><option value="comment"${entry.kind==='comment'?' selected':''}>댓글/반응</option></select></div><div class="source-order"><button type="button" data-move="up">↑</button><button type="button" data-move="down">↓</button></div></div>`).join('') : '<span class="muted-inline">선택된 실제 자산 없음 · ASSETS_PENDING</span>';
  }

  function revokeAll() { files.forEach(x => URL.revokeObjectURL(x.url)); files = []; packagePreview = null; renderList(); renderCarousel(); }

  function selectedCandidate() {
    const id = globalThis.ThreadsSourceIntakeContext?.getSelectedId?.();
    return globalThis.ThreadsSourceIntakeContext?.getCandidate?.(id) || null;
  }

  function buildPackage() {
    const candidate = selectedCandidate();
    if (!candidate) throw new Error('먼저 후보를 선택하세요.');
    if (!files.length) throw new Error('실제 스크린샷/이미지가 필요합니다.');
    document.querySelectorAll('.source-asset-row').forEach((row, i) => { files[i].kind = row.querySelector('.source-kind').value; });
    packagePreview = window.ThreadsSourcePackage.build({
      sourceUrl: candidate.url || '', sourcePlatform: candidate.sourceType || 'manual', title: candidate.title,
      hookDraft: $('#sourceHookInput').value, captionDraft: $('#sourceCaptionInput').value,
      rightsState: $('#sourceRightsInput').value,
      userProvidedProvenance: candidate.url ? '' : 'browser-local user-selected screenshot',
      assets: files.map((entry, i) => ({ id:`asset-${String(i+1).padStart(2,'0')}`, name:entry.file.name, mime:entry.file.type, kind:entry.kind,
        provenance: candidate.url || 'user-provided local screenshot', privacyReview:'REQUIRED', verifiedByVision:false, verifiedByOcr:false }))
    });
    const status = $('#sourcePackageStatus');
    status.textContent = `SOURCE_PACKAGE 준비됨 · ${packagePreview.assets.length}장\n게시: 차단 · 권리: ${packagePreview.rightsState} · 개인정보: REVIEW_REQUIRED\nOCR/vision: 실행 안 함\n흐름: ${packagePreview.renderPlan.map(x => `${x.slide}:${x.treatment}`).join(' → ')}`;
    renderCarousel();
    return packagePreview;
  }

  function renderCarousel() {
    const root = $('#sourceCarouselPreview');
    if (!root) return;
    if (!packagePreview || !files.length) { root.innerHTML = '<span class="muted-inline">Source Package를 만들면 실제 자산 기반 1080×1080 구성을 여기서 미리 봅니다.</span>'; return; }
    const hook = escapeHtml(packagePreview.hookDraft || packagePreview.title || '이 장면, 무슨 일이 있었던 걸까?');
    const slides = [];
    slides.push(`<article class="source-slide source-slide-hook"><img class="source-slide-bg" src="${files[0].url}" alt="첫 실제 소스 이미지 블러 배경"/><div class="source-slide-shade"></div><div class="source-slide-copy"><small>01 · SOURCE</small><strong>${hook}</strong><span>넘겨서 원문 보기 →</span></div></article>`);
    files.forEach((entry, i) => slides.push(`<article class="source-slide source-slide-evidence"><img class="source-slide-bg" src="${entry.url}" alt="소스 배경 ${i+1}"/><div class="source-slide-backdrop"></div><img class="source-slide-main" src="${entry.url}" alt="실제 소스 자산 ${i+1}"/><span class="source-slide-badge">${String(i+2).padStart(2,'0')} · ${entry.kind==='comment'?'실제 반응':entry.kind==='media'?'첨부 이미지':entry.kind==='continuation'?'이어지는 내용':'원문'}</span></article>`));
    slides.push(`<article class="source-slide source-slide-cta"><div class="source-slide-copy"><small>${escapeHtml(packagePreview.sourcePlatform || 'SOURCE')}</small><strong>${escapeHtml(packagePreview.finalCta)}</strong><span>게시 전 권리·개인정보·사람 검토 필요</span></div></article>`);
    root.innerHTML = slides.join('');
  }

  function bind() {
    const input = $('#sourceAssetInput'); if (!input) return;
    input.addEventListener('change', () => { revokeAll(); files = [...input.files].map((file,i)=>({file,url:URL.createObjectURL(file),kind:inferKind(i,file.name)})); renderList(); });
    $('#clearSourceAssetsBtn').addEventListener('click', () => { input.value=''; revokeAll(); $('#sourcePackageStatus').textContent=''; });
    $('#buildSourcePackageBtn').addEventListener('click', () => { try { buildPackage(); } catch(e) { $('#sourcePackageStatus').textContent=`생성 차단: ${e.message}`; } });
    $('#sourceAssetList').addEventListener('click', e => { const b=e.target.closest('button[data-move]'); if(!b)return; const row=b.closest('.source-asset-row'); const i=Number(row.dataset.index); const j=b.dataset.move==='up'?i-1:i+1; if(j<0||j>=files.length)return; [files[i],files[j]]=[files[j],files[i]]; renderList(); });
    renderList(); renderCarousel();
  }

  window.ThreadsSourceIntake = Object.freeze({ bind, buildPackage, getPreview:()=>packagePreview, renderCarousel });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bind) : bind();
})();
