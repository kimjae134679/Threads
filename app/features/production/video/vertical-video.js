(() => {
  const section = document.querySelector(".card-factory-section");
  const preview = document.querySelector("#cardPreviewGrid");
  if (!section || !preview) return;

  const panel = document.createElement("div");
  panel.className = "card-factory-warning vertical-video-production-panel";
  panel.innerHTML = `
    <strong>03 PRODUCTION · Vertical MP4</strong>
    <p>현재 1080×1080 검토본을 1080×1920 MP4로 렌더합니다. 권리 검토와 저장된 개인정보 검토 revision이 모두 현재여야 합니다. 이 산출물은 04 REVIEW_PUBLISH 검토 대상으로만 전달되며 게시 준비 완료를 의미하지 않습니다.</p>
    <div class="card-factory-grid">
      <label>권리 검토
        <select data-vertical-rights>
          <option value="review">검토 필요</option>
          <option value="cleared">사용 범위 확인 완료</option>
          <option value="blocked">사용 차단</option>
        </select>
      </label>
      <label>장당 초
        <input data-vertical-seconds type="number" min="0.25" max="15" step="0.25" value="2" />
      </label>
    </div>
    <div class="card-factory-actions">
      <button type="button" class="button ghost" data-vertical-rights-save>현재 Card Factory revision에 권리 검토 묶기</button>
      <button type="button" class="button primary" data-vertical-render disabled>세로 MP4 렌더</button>
      <a class="button ghost" data-vertical-download hidden>MP4 다운로드</a>
    </div>
    <div data-vertical-status>권리 검토와 개인정보 검토가 필요합니다.</div>
  `;
  const privacyTools = section.querySelector(".card-privacy-tools");
  (privacyTools || section.querySelector(".card-factory-warning"))?.insertAdjacentElement("afterend", panel);

  const rightsSelect = panel.querySelector("[data-vertical-rights]");
  const secondsInput = panel.querySelector("[data-vertical-seconds]");
  const rightsSave = panel.querySelector("[data-vertical-rights-save]");
  const renderButton = panel.querySelector("[data-vertical-render]");
  const download = panel.querySelector("[data-vertical-download]");
  const status = panel.querySelector("[data-vertical-status]");
  let rightsContext = "";

  rightsSelect.addEventListener("change", () => { rightsSelect.dataset.dirty = "true"; });
  rightsSave.addEventListener("click", bindRightsReview);
  renderButton.addEventListener("click", renderVerticalVideo);
  preview.addEventListener("click", () => queueMicrotask(refresh));
  const observer = new MutationObserver(() => queueMicrotask(refresh));
  observer.observe(preview, { childList: true, subtree: false });
  const detailTitle = document.querySelector("#detailTitle");
  const selectionObserver = detailTitle ? new MutationObserver(() => queueMicrotask(refresh)) : null;
  selectionObserver?.observe(detailTitle, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".candidate-card, [data-open-id], #cardSaveBtn, #cardBuildBtn, [data-privacy-reviewed]")) setTimeout(refresh, 0);
  });
  refresh();

  function currentItem() {
    if (typeof state === "undefined" || typeof selectedId === "undefined") return null;
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function refresh() {
    const item = currentItem();
    panel.hidden = !item;
    if (!item) {
      rightsContext = "";
      rightsSelect.dataset.dirty = "false";
      return;
    }
    const review = item.verticalVideoRightsReview || {};
    const nextRightsContext = `${item.id}:${item.cardFactory?.updatedAt || ""}`;
    if (nextRightsContext !== rightsContext) {
      rightsContext = nextRightsContext;
      rightsSelect.dataset.dirty = "false";
    }
    if (rightsSelect.dataset.dirty !== "true") {
      rightsSelect.value = ["review", "cleared", "blocked"].includes(review.status) ? review.status : "review";
    }
    const gate = productionGate(item);
    renderButton.disabled = !gate.allowed;
    const artifact = item.verticalVideoArtifact;
    if (artifact?.downloadPath) {
      download.href = artifact.downloadPath;
      download.download = `threads-${item.id}-vertical.mp4`;
      download.hidden = false;
    } else {
      download.hidden = true;
      download.removeAttribute("href");
    }
    status.textContent = artifact
      ? artifactStatus(item, artifact)
      : (gate.allowed ? "렌더 가능 · 03 PRODUCTION → 04 REVIEW_PUBLISH · provider 게시 unsupported" : `차단: ${gate.reasons.join(", ")}`);
  }

  function productionGate(item) {
    const cardRevision = String(item.cardFactory?.updatedAt || "");
    const review = item.verticalVideoRightsReview || {};
    const savedPrivacy = item.cardFactory?.privacy?.gate || {};
    const livePrivacy = window.ThreadsCardPrivacyMask?.exportEnvelope?.()?.gate || {};
    const canvases = [...preview.querySelectorAll("canvas[data-card-index]")];
    const reasons = [];
    if (!cardRevision) reasons.push("card_factory_save_required");
    if (review.status === "blocked") reasons.push("rights_blocked");
    else if (review.status !== "cleared") reasons.push("rights_review_required");
    else if (review.basisCardFactoryUpdatedAt !== cardRevision) reasons.push("rights_review_stale");
    if (savedPrivacy.allowed !== true || savedPrivacy.code !== "image-privacy-reviewed") reasons.push("saved_privacy_review_required");
    if (livePrivacy.allowed !== true || livePrivacy.code !== "image-privacy-reviewed") reasons.push("live_privacy_review_required");
    if (!canvases.length) reasons.push("rendered_cards_required");
    if (canvases.length > 20) reasons.push("too_many_cards");
    if (canvases.some((canvas) => canvas.width !== 1080 || canvas.height !== 1080)) reasons.push("reference_square_required");
    return { allowed: reasons.length === 0, reasons, canvases, cardRevision, livePrivacy };
  }

  function bindRightsReview() {
    const item = currentItem();
    if (!item?.cardFactory?.updatedAt) {
      show("먼저 Card Factory에서 현재 검토본을 저장하세요.", "error");
      return;
    }
    const selectedStatus = rightsSelect.value;
    const now = new Date().toISOString();
    item.verticalVideoRightsReview = {
      status: selectedStatus,
      reviewedAt: now,
      basisCardFactoryUpdatedAt: item.cardFactory.updatedAt,
      owner: "03_PRODUCTION",
      automatedRightsClearanceClaimed: false,
    };
    item.updatedAt = now;
    delete item.publishApproval;
    rightsSelect.dataset.dirty = "false";
    persist();
    document.dispatchEvent(new CustomEvent("threads:content-revision-changed", { detail: { candidateId: item.id, source: "vertical-rights-review" } }));
    refresh();
    show(selectedStatus === "cleared" ? "권리 검토를 현재 Card Factory revision에 묶었습니다. 기존 게시 승인은 무효화됩니다." : "권리 상태를 저장했습니다. 세로 렌더는 허용되지 않습니다.", selectedStatus === "cleared" ? "success" : "info");
  }

  async function renderVerticalVideo() {
    const item = currentItem();
    if (!item) return;
    const gate = productionGate(item);
    if (!gate.allowed) {
      status.textContent = `차단: ${gate.reasons.join(", ")}`;
      return;
    }
    renderButton.disabled = true;
    status.textContent = "FFmpeg 세로 MP4 렌더 중…";
    try {
      const assets = gate.canvases.map((canvas, index) => ({ index, dataUrl: canvas.toDataURL("image/png") }));
      const response = await fetch("/api/vertical-video/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidate: clone(item),
          rightsReview: clone(item.verticalVideoRightsReview),
          privacyBasisCardFactoryUpdatedAt: gate.cardRevision,
          assets,
          secondsPerImage: Number(secondsInput.value || 2),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
      const attachedAt = new Date().toISOString();
      item.verticalVideoArtifact = {
        ...payload.artifact,
        attachedAt,
        handoffBasisUpdatedAt: attachedAt,
        awaiting04Review: true,
      };
      item.updatedAt = attachedAt;
      delete item.publishApproval;
      persist();
      document.dispatchEvent(new CustomEvent("threads:content-revision-changed", { detail: { candidateId: item.id, source: "vertical-video-artifact" } }));
      refresh();
      show("1080×1920 MP4를 생성해 04 REVIEW_PUBLISH 검토 대상으로 전달했습니다. 게시 기능은 여전히 unsupported입니다.", "success");
    } catch (error) {
      status.textContent = `차단: ${String(error?.message || error)}`;
      show(`세로 MP4 렌더 실패: ${String(error?.message || error)}`, "error");
    } finally {
      renderButton.disabled = !productionGate(item).allowed;
    }
  }

  function artifactStatus(item, artifact) {
    const current = artifact.handoffBasisUpdatedAt === item.updatedAt;
    return `${current ? "04 검토 대기" : "산출물 revision stale"} · ${artifact.probe?.width || 0}×${artifact.probe?.height || 0} ${artifact.probe?.codec || ""} · publishReady=false · provider=${artifact.providerCapability || "unsupported"}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function show(message, tone) {
    if (typeof showSystemMessage === "function") showSystemMessage(message, tone);
    else console.info(message);
  }
})();
