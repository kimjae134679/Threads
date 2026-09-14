(() => {
  const model = window.ThreadsOfficialMediaModel;
  const connectorBox = document.querySelector(".connector-box");
  const queue = document.querySelector("#approvalQueueList");
  if (!model || !connectorBox || !queue) return;

  const capabilities = {
    threads: { configured: false, mediaLiveEnabled: false },
    staging: { state: "public-origin-required", externalReachabilityVerified: false },
    instagram: { state: "credential-required", validationState: "credential-required", validationEnabled: false, livePublishImplemented: false },
  };

  const threadsStatus = appendConnectorRow("Threads 이미지/캐러셀", "threadsMediaCapabilityStatus");
  const stagingStatus = appendConnectorRow("미디어 스테이징", "mediaStagingCapabilityStatus");
  const instagramStatus = appendConnectorRow("Instagram Feed/Carousel", "instagramMediaCapabilityStatus");

  Promise.allSettled([
    loadCapability("/api/threads/media/capabilities", "threads"),
    loadCapability("/api/media-staging/capabilities", "staging"),
    loadCapability("/api/instagram/media/capabilities", "instagram"),
  ]).finally(() => { renderStatuses(); patchQueue(); });

  new MutationObserver(patchQueue).observe(queue, { childList: true });
  patchQueue();

  function appendConnectorRow(label, id) {
    const row = document.createElement("p");
    row.innerHTML = `<b>${label}</b><span id="${id}">확인 중</span>`;
    connectorBox.appendChild(row);
    return row.querySelector(`#${id}`);
  }

  async function loadCapability(url, key) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      capabilities[key] = payload.capability || capabilities[key];
    } catch (error) {
      capabilities[key] = { ...capabilities[key], state: "status-unavailable", error: String(error?.message || error) };
    }
  }

  function renderStatuses() {
    const threadsState = model.capabilityState(capabilities.threads);
    threadsStatus.textContent = capabilityLabel(threadsState);
    threadsStatus.className = threadsState === "ready-to-validate" ? "ready-text" : "threads-token-missing";
    stagingStatus.textContent = capabilityLabel(capabilities.staging.state, true);
    stagingStatus.className = capabilities.staging.state === "ready-to-validate" ? "ready-text" : "threads-token-missing";
    instagramStatus.textContent = capabilityLabel(capabilities.instagram.state);
    instagramStatus.className = capabilities.instagram.state === "ready-to-validate" ? "ready-text" : "threads-token-missing";
  }

  function capabilityLabel(state, staging = false) {
    const labels = {
      "credential-required": "자격 증명 필요 · live 없음",
      "public-origin-required": "공개 HTTPS origin 필요",
      "live-disabled": staging ? "스테이징 비활성" : "dry-run 가능 · live 비활성",
      "ready-to-validate": staging ? "스테이징 준비 · 외부 도달성 미검증" : "공식 API 검증 준비",
      "status-unavailable": "상태 확인 실패",
    };
    return labels[state] || state || "unknown";
  }

  function patchQueue() {
    for (const card of queue.querySelectorAll(".approval-card[data-item-id]")) {
      const item = state.items.find((candidate) => candidate.id === card.dataset.itemId);
      if (!item || !isCurrentApproval(item)) continue;
      const actions = card.querySelector(".approval-actions");
      if (!actions) continue;
      ensureThreadsButton(card, item, actions);
      ensureInstagramButton(card, item, actions);
    }
  }
  function ensureThreadsButton(card, item, actions) {
    if (card.querySelector(".threads-media-dryrun")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button ghost threads-media-dryrun";
    button.textContent = "Threads 이미지/캐러셀 dry-run";
    button.addEventListener("click", () => openThreadsDryRun(card, item));
    actions.appendChild(button);
  }

  function ensureInstagramButton(card, item, actions) {
    if (card.querySelector(".instagram-media-stage")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button ghost instagram-media-stage";
    button.textContent = "Instagram 스테이징 / dry-run";
    button.addEventListener("click", () => openInstagramStage(card, item));
    actions.appendChild(button);
  }

  function openThreadsDryRun(card, item) {
    card.querySelector(".threads-media-plan-box")?.remove();
    const box = document.createElement("div");
    box.className = "threads-media-plan-box";
    box.innerHTML = '<strong>공식 Threads 미디어 요청 검증</strong><p>공개 HTTPS 이미지 URL을 한 줄에 하나 입력합니다. 1개=IMAGE, 2~20개=CAROUSEL. 이 단계는 게시하지 않습니다.</p><textarea rows="4" placeholder="https://example.com/card-1.png\nhttps://example.com/card-2.png"></textarea><div class="threads-media-plan-actions"><button type="button" class="button ghost">dry-run 검증</button><span class="threads-media-plan-result"></span></div>';
    const textarea = box.querySelector("textarea");
    const button = box.querySelector("button");
    const result = box.querySelector(".threads-media-plan-result");
    button.addEventListener("click", async () => {
      const local = model.validate(textarea.value, capabilities.threads);
      if (!local.ok) { result.textContent = `차단: ${local.errors.join(", ")}`; return; }
      button.disabled = true;
      result.textContent = "검증 중…";
      try {
        const payload = await postJson("/api/threads/media/dry-run", { candidate: clone(item), mediaUrls: local.mediaUrls });
        item.threadsMediaDryRuns = [...(item.threadsMediaDryRuns || []), { auditedAt: payload.auditedAt, plan: payload.plan }].slice(-20);
        persist();
        result.textContent = `${payload.plan.mediaType} ${payload.plan.mediaCount}개 · dry-run 통과 · 공개 게시 없음`;
      } catch (error) { result.textContent = `차단: ${error.message}`; }
      finally { button.disabled = false; }
    });
    card.appendChild(box);
  }

  function openInstagramStage(card, item) {
    card.querySelector(".instagram-media-stage-box")?.remove();
    const box = document.createElement("div");
    box.className = "threads-media-plan-box instagram-media-stage-box";
    box.innerHTML = '<strong>04 REVIEW_PUBLISH · Instagram Feed/Carousel</strong><p class="instagram-media-stage-note"></p><div class="threads-media-plan-actions"><button type="button" class="button ghost" data-stage>승인 렌더 스테이징</button><button type="button" class="button ghost" data-dry-run disabled>Instagram dry-run</button><button type="button" class="button ghost" data-provider-validate disabled>공식 컨테이너 검증</button></div><div class="instagram-media-stage-result"></div>';
    const note = box.querySelector(".instagram-media-stage-note");
    const stageButton = box.querySelector("[data-stage]");
    const dryRunButton = box.querySelector("[data-dry-run]");
    const validateButton = box.querySelector("[data-provider-validate]");
    const result = box.querySelector(".instagram-media-stage-result");
    let stagedUrls = [];

    note.textContent = `스테이징: ${capabilityLabel(capabilities.staging.state, true)} · Instagram: ${capabilityLabel(capabilities.instagram.state)} · 외부 도달성은 아직 검증하지 않음`;
    stageButton.addEventListener("click", async () => {
      result.textContent = "";
      try {
        const assets = collectRenderedAssets(item);
        stageButton.disabled = true;
        result.textContent = `${assets.length}개 렌더를 승인 revision에 묶어 스테이징 중…`;
        const payload = await postJson("/api/media-staging/stage", { candidate: clone(item), assets });
        stagedUrls = (payload.staged?.assets || []).map((asset) => asset.url);
        item.instagramMediaStaging = {
          auditedAt: payload.auditedAt,
          state: payload.staged?.state || "staged-unverified",
          approvalBasis: item.publishApproval?.basisUpdatedAt || null,
          mediaUrls: stagedUrls,
          externalReachabilityVerified: payload.staged?.externalReachabilityVerified === true,
        };
        persist();
        dryRunButton.disabled = !stagedUrls.length;
        validateButton.disabled = !stagedUrls.length || capabilities.instagram.validationState !== "ready-to-validate";
        result.textContent = `${item.instagramMediaStaging.state} · ${stagedUrls.length}개 · approval ${item.instagramMediaStaging.approvalBasis} · 외부 도달성 미검증`;
      } catch (error) {
        stagedUrls = [];
        dryRunButton.disabled = true;
        validateButton.disabled = true;
        result.textContent = `차단: ${error.message}`;
      } finally { stageButton.disabled = false; }
    });

    validateButton.addEventListener("click", async () => {
      if (!stagedUrls.length || capabilities.instagram.validationState !== "ready-to-validate") return;
      validateButton.disabled = true;
      result.textContent = "공식 Instagram 컨테이너 생성만 검증 중… 게시 호출은 하지 않습니다.";
      try {
        const payload = await postJson("/api/instagram/media/validate", { candidate: clone(item), mediaUrls: stagedUrls });
        item.instagramMediaValidations = [...(item.instagramMediaValidations || []), {
          auditedAt: payload.auditedAt,
          approvalBasis: payload.approvalBasis,
          publicationOwner: payload.publicationOwner,
          validation: payload.validation,
        }].slice(-20);
        persist();
        result.textContent = `${payload.validation.mediaType} ${payload.validation.mediaCount}개 · 컨테이너 생성 관측 · 외부 호출 ${payload.validation.externalCalls}회 · media_publish 호출 없음`;
      } catch (error) { result.textContent = `차단: ${error.message}`; }
      finally { validateButton.disabled = capabilities.instagram.validationState !== "ready-to-validate"; }
    });

    dryRunButton.addEventListener("click", async () => {
      if (!stagedUrls.length) return;
      dryRunButton.disabled = true;
      result.textContent = "Instagram 공식 요청 계획 검증 중…";
      try {
        const payload = await postJson("/api/instagram/media/dry-run", { candidate: clone(item), mediaUrls: stagedUrls });
        item.instagramMediaDryRuns = [...(item.instagramMediaDryRuns || []), {
          auditedAt: payload.auditedAt,
          approvalBasis: payload.approvalBasis,
          publicationOwner: payload.publicationOwner,
          plan: payload.plan,
        }].slice(-20);
        persist();
        result.textContent = `${payload.plan.mediaType} ${payload.plan.mediaCount}개 · dry-run 통과 · ${payload.publicationOwner} · live 호출 없음`;
      } catch (error) { result.textContent = `차단: ${error.message}`; }
      finally { dryRunButton.disabled = false; }
    });
    card.appendChild(box);
  }

  function collectRenderedAssets(item) {
    if (selectedId !== item.id) throw new Error("해당 후보를 열고 Community Card Factory에서 현재 승인본을 다시 렌더하세요.");
    if (!isCurrentApproval(item)) throw new Error("현재 승인 revision이 아닙니다. 04에서 다시 승인하세요.");
    const canvases = [...document.querySelectorAll("#cardPreviewGrid canvas[data-card-index]")];
    if (!canvases.length) throw new Error("스테이징할 렌더가 없습니다. Community Card Factory 미리보기를 먼저 생성하세요.");
    if (canvases.length > 10) throw new Error("Instagram Feed/Carousel 스테이징은 최대 10장입니다.");
    for (const canvas of canvases) {
      if (canvas.width !== 1080 || canvas.height !== 1080) throw new Error("Instagram Feed/Carousel은 현재 1080×1080 승인 렌더만 스테이징합니다.");
    }
    return canvases.map((canvas, index) => ({ index, dataUrl: canvas.toDataURL("image/png") }));
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    return payload;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isCurrentApproval(item) {
    const approval = item.publishApproval || {};
    return approval.status === "approved" && Boolean(approval.approvedAt) && approval.basisUpdatedAt === item.updatedAt;
  }
})();
