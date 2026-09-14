(() => {
  const model = window.ThreadsCardPrivacyMaskModel;
  const section = document.querySelector(".card-factory-section");
  const preview = document.querySelector("#cardPreviewGrid");
  const buildButton = document.querySelector("#cardBuildBtn");
  const imageInput = document.querySelector("#cardImageInput");
  const downloadAll = document.querySelector("#cardDownloadAllBtn");
  if (!model || !section || !preview) return;

  const reviews = {};
  const baseLayers = {};
  let maskMode = false;
  let drag = null;

  const warning = section.querySelector(".card-factory-warning");
  const tools = document.createElement("div");
  tools.className = "card-privacy-tools";
  tools.innerHTML = `
    <div class="card-privacy-copy">
      <strong>이미지 개인정보 가림</strong>
      <span>마스킹 모드에서 캡처 카드 위를 드래그하면 검은 사각형이 최종 canvas에 직접 적용됩니다. 검토 상태는 선택한 정확한 이미지 이름·크기·수정시각·형식에 결속됩니다. OCR/얼굴 자동탐지를 했다고 간주하지 않습니다.</span>
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
  preview.addEventListener("click", onPrivacyActionClick);
  document.addEventListener("click", blockUnsafeDownloads, true);

  buildButton?.addEventListener("click", resetPrivacySession, true);
  imageInput?.addEventListener("change", resetPrivacySession, true);

  const observer = new MutationObserver(() => queueMicrotask(decorateCaptureCards));
  // Only react when preview cards themselves are replaced/added. Observing the
  // entire subtree would also see the status labels that this module updates,
  // which can create a self-triggering render loop in a real browser.
  observer.observe(preview, { childList: true, subtree: false });
  decorateCaptureCards();

  window.ThreadsCardPrivacyMask = {
    exportEnvelope: () => model.exportEnvelope(storyboardFromPreview(), reviews, identityMap()),
    gate,
    reset: resetPrivacySession,
  };

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

  function identityFromCanvas(canvas) {
    if (!canvas) return model.normalizeIdentity({});
    return model.normalizeIdentity({
      name: canvas.dataset.captureFileName || "",
      size: canvas.dataset.captureFileSize || 0,
      lastModified: canvas.dataset.captureFileLastModified || 0,
      type: canvas.dataset.captureFileType || "",
    });
  }

  function identityMap() {
    const identities = {};
    for (const figure of captureFigures()) {
      const canvas = figure.querySelector("canvas[data-card-index]");
      const index = Number(canvas?.dataset.cardIndex);
      if (Number.isInteger(index)) identities[index] = identityFromCanvas(canvas);
    }
    return identities;
  }

  function decorateCaptureCards() {
    for (const figure of captureFigures()) {
      const index = cardIndex(figure);
      if (!Number.isInteger(index)) continue;
      const caption = figure.querySelector("figcaption");
      if (!caption) continue;
      if (!caption.querySelector("[data-privacy-card-status]")) {
        const perCard = document.createElement("span");
        perCard.dataset.privacyCardStatus = String(index);
        perCard.className = "card-privacy-card-status";
        caption.appendChild(perCard);
      }
      if (!caption.querySelector("[data-privacy-undo]")) {
        const undo = document.createElement("button");
        undo.type = "button";
        undo.className = "button ghost";
        undo.dataset.privacyUndo = String(index);
        undo.textContent = "마지막 마스크 되돌리기";
        caption.appendChild(undo);
      }
      if (!caption.querySelector("[data-privacy-reviewed]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button ghost";
        button.dataset.privacyReviewed = String(index);
        caption.appendChild(button);
      }
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

  function ensureReviewIdentity(index, canvas) {
    const identity = identityFromCanvas(canvas);
    const existing = reviews[index] || { reviewed: false, rectangles: [], imageIdentity: identity };
    if (existing.imageIdentity?.key && identity.key && !model.identityMatches(existing, identity)) {
      reviews[index] = { reviewed: false, rectangles: [], imageIdentity: identity };
      delete baseLayers[index];
      return reviews[index];
    }
    reviews[index] = { ...existing, imageIdentity: identity };
    return reviews[index];
  }

  function onPointerDown(event) {
    if (!maskMode) return;
    const canvas = event.target.closest?.("canvas[data-card-index]");
    const figure = canvas?.closest?.(".card-preview-item");
    if (!canvas || !captureFigures().includes(figure)) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    const index = Number(canvas.dataset.cardIndex);
    ensureReviewIdentity(index, canvas);
    if (!baseLayers[index]) {
      const ctx = canvas.getContext("2d");
      baseLayers[index] = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    drag = { canvas, index, start: pointFor(event, canvas), pointerId: event.pointerId };
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
    const existing = ensureReviewIdentity(index, canvas);
    reviews[index] = { ...existing, reviewed: false, rectangles: [...existing.rectangles, rect] };
    updateStatus();
    show(`캡처 카드 ${index + 1}에 마스크 1개를 적용했습니다. 검토 완료를 눌러야 PNG 저장이 열립니다.`, "success");
  }

  function onPrivacyActionClick(event) {
    const undo = event.target.closest?.("[data-privacy-undo]");
    if (undo) return undoLastMask(Number(undo.dataset.privacyUndo));
    const button = event.target.closest?.("[data-privacy-reviewed]");
    if (!button) return;
    const index = Number(button.dataset.privacyReviewed);
    const canvas = preview.querySelector(`canvas[data-card-index="${index}"]`);
    const identity = identityFromCanvas(canvas);
    if (!identity.key) {
      show("검토할 실제 캡처 이미지 식별정보가 없습니다. 파일을 다시 선택하고 미리보기를 생성하세요.", "error");
      return;
    }
    const existing = ensureReviewIdentity(index, canvas);
    reviews[index] = { ...existing, reviewed: !existing.reviewed, imageIdentity: identity };
    updateStatus();
  }

  function undoLastMask(index) {
    const review = reviews[index];
    const canvas = preview.querySelector(`canvas[data-card-index="${index}"]`);
    if (!review?.rectangles?.length || !canvas || !baseLayers[index]) return;
    const rectangles = review.rectangles.slice(0, -1);
    reviews[index] = { ...review, reviewed: false, rectangles };
    redrawMasks(index, canvas, rectangles);
    updateStatus();
    show(`캡처 카드 ${index + 1}의 마지막 마스크를 되돌렸습니다. 개인정보 검토는 다시 완료해야 합니다.`, "info");
  }

  function redrawMasks(index, canvas, rectangles) {
    const base = baseLayers[index];
    if (!base) return;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(base, 0, 0);
    ctx.save();
    ctx.fillStyle = "#000000";
    for (const rect of rectangles) ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  function clearMasks() {
    for (const key of Object.keys(reviews)) delete reviews[key];
    for (const key of Object.keys(baseLayers)) delete baseLayers[key];
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
    for (const key of Object.keys(baseLayers)) delete baseLayers[key];
    drag = null;
    queueMicrotask(updateStatus);
  }

  function gate() {
    return model.exportGate(storyboardFromPreview(), reviews, identityMap());
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
      const identity = identityMap()[index];
      if (reviews[index]?.reviewed === true && model.identityMatches(reviews[index], identity)) return;
    } else if (currentGate.allowed) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    show(`이미지 개인정보 검토가 끝나지 않았거나 선택 이미지가 바뀌어 PNG 저장을 차단했습니다. 남은 캡처 카드 ${currentGate.pending.length}개.`, "error");
  }

  function updateStatus() {
    const currentGate = gate();
    const identities = identityMap();
    let maskCount = 0;
    for (const figure of captureFigures()) {
      const index = cardIndex(figure);
      const review = reviews[index] || { reviewed: false, rectangles: [] };
      const count = Array.isArray(review.rectangles) ? review.rectangles.length : 0;
      maskCount += count;
      const identityOk = review.reviewed === true && model.identityMatches(review, identities[index]);
      const label = figure.querySelector(`[data-privacy-card-status="${index}"]`);
      if (label) label.textContent = `마스크 ${count} · ${identityOk ? "검토완료" : "미검토"}`;
      const reviewed = figure.querySelector(`[data-privacy-reviewed="${index}"]`);
      if (reviewed) reviewed.textContent = identityOk ? "개인정보 검토 완료 ✓" : "개인정보 검토 완료";
      const undo = figure.querySelector(`[data-privacy-undo="${index}"]`);
      if (undo) undo.disabled = count === 0;
    }
    status.textContent = currentGate.captureCount
      ? `캡처 ${currentGate.captureCount} · 검토완료 ${currentGate.reviewedCount} · 마스크 ${maskCount}${currentGate.staleIdentity.length ? ` · 이미지 변경 ${currentGate.staleIdentity.length}` : ""}`
      : "캡처 카드 없음";
    if (downloadAll) downloadAll.dataset.privacyGate = currentGate.code;
  }

  function downloadPrivacyManifest() {
    const item = currentItem();
    const envelope = model.exportEnvelope(storyboardFromPreview(), reviews, identityMap());
    const payload = {
      candidateId: item?.id || null,
      generatedAt: new Date().toISOString(),
      privacy: envelope,
      notice: "Manual rectangles are session-scoped review metadata bound to exact local image identity. Original image bytes are not persisted. No OCR or automatic face detection is claimed.",
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
