(() => {
  const model = window.ThreadsCardPrivacyMaskModel;
  const section = document.querySelector(".card-factory-section");
  const preview = document.querySelector("#cardPreviewGrid");
  const buildButton = document.querySelector("#cardBuildBtn");
  const imageInput = document.querySelector("#cardImageInput");
  const downloadAll = document.querySelector("#cardDownloadAllBtn");
  if (!model || !section || !preview) return;

  const reviews = {};
  let maskMode = false;
  let drag = null;

  const warning = section.querySelector(".card-factory-warning");
  const tools = document.createElement("div");
  tools.className = "card-privacy-tools";
  tools.innerHTML = `
    <div class="card-privacy-copy">
      <strong>이미지 개인정보 가림</strong>
      <span>마스킹 모드에서 캡처 카드 위를 드래그하면 검은 사각형이 최종 canvas에 직접 적용됩니다. OCR/얼굴 자동탐지를 했다고 간주하지 않습니다.</span>
    </div>
    <div class="card-privacy-actions">
      <button id="cardPrivacyMaskModeBtn" type="button" class="button ghost" aria-pressed="false">마스킹 모드</button>
      <button id="cardPrivacyClearBtn" type="button" class="button ghost">현재 마스크 초기화</button>
      <button id="cardPrivacyManifestBtn" type="button" class="button ghost">Privacy JSON</button>
      <span id="cardPrivacyStatus" role="status" aria-live="polite">캡처 카드 없음</span>
    </div>
  `;
  warning?.insertAdjacentElement("afterend", tools);

  const modeButton = tools.querySelector("#cardPrivacyMaskModeBtn");
  const clearButton = tools.querySelector("#cardPrivacyClearBtn");
  const manifestButton = tools.querySelector("#cardPrivacyManifestBtn");
  const status = tools.querySelector("#cardPrivacyStatus");

  modeButton.addEventListener("click", () => {
    maskMode = !maskMode;
    modeButton.setAttribute("aria-pressed", String(maskMode));
    modeButton.textContent = maskMode ? "마스킹 모드 ON" : "마스킹 모드";
    section.classList.toggle("privacy-mask-mode", maskMode);
  });
  clearButton.addEventListener("click", clearMasks);
  manifestButton.addEventListener("click", downloadPrivacyManifest);
  preview.addEventListener("pointerdown", onPointerDown);
  preview.addEventListener("pointerup", onPointerUp);
  preview.addEventListener("pointercancel", () => { drag = null; });
  preview.addEventListener("click", onReviewClick);
  document.addEventListener("click", blockUnsafeDownloads, true);

  buildButton?.addEventListener("click", resetPrivacySession, true);
  imageInput?.addEventListener("change", resetPrivacySession, true);

  const observer = new MutationObserver(() => queueMicrotask(decorateCaptureCards));
  observer.observe(preview, { childList: true, subtree: true });
  decorateCaptureCards();

  function currentItem() {
    if (typeof state === "undefined" || typeof selectedId === "undefined") return null;
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function captureFigures() {
    return [...preview.querySelectorAll(".card-preview-item")].filter((figure) => {
      return figure.querySelector("figcaption span")?.textContent?.includes("capture-image");
    });
  }

  function cardIndex(figure) {
    return Number(figure?.querySelector("canvas[data-card-index]")?.dataset.cardIndex);
  }

  function storyboardFromPreview() {
    const cards = [...preview.querySelectorAll(".card-preview-item")].map((figure) => {
      const typeText = figure.querySelector("figcaption span")?.textContent || "";
      return { type: typeText.includes("capture-image") ? "capture-image" : "other" };
    });
    return { cards };
  }

  function decorateCaptureCards() {
    for (const figure of captureFigures()) {
      const index = cardIndex(figure);
      if (!Number.isInteger(index)) continue;
      const caption = figure.querySelector("figcaption");
      if (!caption || caption.querySelector("[data-privacy-reviewed]")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button ghost";
      button.dataset.privacyReviewed = String(index);
      button.textContent = reviews[index]?.reviewed ? "개인정보 검토 완료 ✓" : "개인정보 검토 완료";
      caption.appendChild(button);
    }
    updateStatus();
  }

  function pointFor(event, canvas) {
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, bounds.width);
    const scaleY = canvas.height / Math.max(1, bounds.height);
    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  }

  function onPointerDown(event) {
    if (!maskMode) return;
    const canvas = event.target.closest?.("canvas[data-card-index]");
    const figure = canvas?.closest?.(".card-preview-item");
    if (!canvas || !captureFigures().includes(figure)) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    drag = { canvas, index: Number(canvas.dataset.cardIndex), start: pointFor(event, canvas), pointerId: event.pointerId };
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { canvas, index, start } = drag;
    drag = null;
    const rect = model.normalizeRect(start, pointFor(event, canvas), canvas.width, canvas.height);
    if (!model.usableRect(rect, 8)) {
      show("마스크 영역이 너무 작습니다.", "info");
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
    const existing = reviews[index] || { reviewed: false, rectangles: [] };
    reviews[index] = { reviewed: false, rectangles: [...existing.rectangles, rect] };
    const button = preview.querySelector(`[data-privacy-reviewed="${index}"]`);
    if (button) button.textContent = "개인정보 검토 완료";
    updateStatus();
    show(`캡처 카드 ${index + 1}에 마스크 1개를 적용했습니다. 검토 완료를 눌러야 PNG 저장이 열립니다.`, "success");
  }

  function onReviewClick(event) {
    const button = event.target.closest?.("[data-privacy-reviewed]");
    if (!button) return;
    const index = Number(button.dataset.privacyReviewed);
    const existing = reviews[index] || { reviewed: false, rectangles: [] };
    reviews[index] = { ...existing, reviewed: !existing.reviewed };
    button.textContent = reviews[index].reviewed ? "개인정보 검토 완료 ✓" : "개인정보 검토 완료";
    updateStatus();
  }

  function clearMasks() {
    for (const key of Object.keys(reviews)) delete reviews[key];
    const rebuild = section.querySelector("#cardBuildBtn");
    if (captureFigures().length && rebuild) {
      show("마스크 상태를 초기화했습니다. 원본 canvas 복원을 위해 미리보기를 다시 생성합니다.", "info");
      rebuild.click();
    } else {
      updateStatus();
    }
  }

  function resetPrivacySession() {
    for (const key of Object.keys(reviews)) delete reviews[key];
    drag = null;
    queueMicrotask(updateStatus);
  }

  function gate() {
    return model.exportGate(storyboardFromPreview(), reviews);
  }

  function blockUnsafeDownloads(event) {
    const target = event.target.closest?.("[data-download-card], #cardDownloadAllBtn");
    if (!target) return;
    const currentGate = gate();
    if (target.matches?.("[data-download-card]")) {
      const index = Number(target.dataset.downloadCard);
      const figure = preview.querySelector(`canvas[data-card-index="${index}"]`)?.closest(".card-preview-item");
      const isCapture = figure?.querySelector("figcaption span")?.textContent?.includes("capture-image");
      if (!isCapture) return;
      if (reviews[index]?.reviewed === true) return;
    } else if (currentGate.allowed) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    show(`이미지 개인정보 검토가 끝나지 않아 PNG 저장을 차단했습니다. 남은 캡처 카드 ${currentGate.pending.length}개.`, "error");
  }

  function updateStatus() {
    const currentGate = gate();
    const maskCount = Object.values(reviews).reduce((sum, row) => sum + (row.rectangles?.length || 0), 0);
    status.textContent = currentGate.captureCount
      ? `캡처 ${currentGate.captureCount} · 검토완료 ${currentGate.reviewedCount} · 마스크 ${maskCount}`
      : "캡처 카드 없음";
    if (downloadAll) downloadAll.dataset.privacyGate = currentGate.code;
  }

  function downloadPrivacyManifest() {
    const item = currentItem();
    const envelope = model.exportEnvelope(storyboardFromPreview(), reviews);
    const payload = {
      candidateId: item?.id || null,
      generatedAt: new Date().toISOString(),
      privacy: envelope,
      notice: "Manual rectangles are session-scoped review metadata. No OCR or automatic face detection is claimed.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `card-privacy-${item?.id || "candidate"}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function show(message, tone) {
    if (typeof showSystemMessage === "function") showSystemMessage(message, tone);
    else console.info(message);
  }
})();
