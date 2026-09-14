(() => {
  const model = window.ThreadsOfficialMediaModel;
  const connectorBox = document.querySelector(".connector-box");
  const queue = document.querySelector("#approvalQueueList");
  if (!model || !connectorBox || !queue) return;

  const row = document.createElement("p");
  row.innerHTML = '<b>Threads 이미지/캐러셀</b><span id="threadsMediaCapabilityStatus">확인 중</span>';
  connectorBox.appendChild(row);
  const status = row.querySelector("#threadsMediaCapabilityStatus");
  let capability = { configured: false, mediaLiveEnabled: false };

  fetch("/api/threads/media/capabilities", { cache: "no-store" })
    .then((response) => response.json())
    .then((payload) => { capability = payload?.capability || capability; renderStatus(); patchQueue(); })
    .catch(() => { status.textContent = "상태 확인 실패"; status.className = "blocked-text"; });

  new MutationObserver(patchQueue).observe(queue, { childList: true });
  patchQueue();

  function renderStatus() {
    const state = model.capabilityState(capability);
    const labels = {
      "credential-required": "토큰 필요 · dry-run 가능",
      "live-disabled": "dry-run 가능 · live 비활성",
      "ready-to-validate": "공식 API 검증 준비",
    };
    status.textContent = labels[state] || state;
    status.className = state === "ready-to-validate" ? "ready-text" : "threads-token-missing";
  }

  function patchQueue() {
    for (const card of queue.querySelectorAll(".approval-card[data-item-id]")) {
      if (card.querySelector(".threads-media-dryrun")) continue;
      const item = state.items.find((candidate) => candidate.id === card.dataset.itemId);
      if (!item || !isCurrentApproval(item)) continue;
      const actions = card.querySelector(".approval-actions");
      if (!actions) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button ghost threads-media-dryrun";
      button.textContent = "이미지/캐러셀 dry-run";
      button.addEventListener("click", () => openDryRun(card, item));
      actions.appendChild(button);
    }
  }

  function openDryRun(card, item) {
    card.querySelector(".threads-media-plan-box")?.remove();
    const box = document.createElement("div");
    box.className = "threads-media-plan-box";
    box.innerHTML = '<strong>공식 Threads 미디어 요청 검증</strong><p>공개 HTTPS 이미지 URL을 한 줄에 하나 입력합니다. 1개=IMAGE, 2~20개=CAROUSEL. 이 단계는 게시하지 않습니다.</p><textarea rows="4" placeholder="https://example.com/card-1.png\nhttps://example.com/card-2.png"></textarea><div class="threads-media-plan-actions"><button type="button" class="button ghost">dry-run 검증</button><span class="threads-media-plan-result"></span></div>';
    const textarea = box.querySelector("textarea");
    const button = box.querySelector("button");
    const result = box.querySelector(".threads-media-plan-result");
    button.addEventListener("click", async () => {
      const local = model.validate(textarea.value, capability);
      if (!local.ok) { result.textContent = `차단: ${local.errors.join(", ")}`; return; }
      button.disabled = true;
      result.textContent = "검증 중…";
      try {
        const response = await fetch("/api/threads/media/dry-run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ candidate: JSON.parse(JSON.stringify(item)), mediaUrls: local.mediaUrls }) });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
        item.threadsMediaDryRuns = [...(item.threadsMediaDryRuns || []), { auditedAt: payload.auditedAt, plan: payload.plan }].slice(-20);
        persist();
        result.textContent = `${payload.plan.mediaType} ${payload.plan.mediaCount}개 · dry-run 통과 · 공개 게시 없음`;
      } catch (error) { result.textContent = `차단: ${error.message}`; }
      finally { button.disabled = false; }
    });
    card.appendChild(box);
  }

  function isCurrentApproval(item) {
    const approval = item.publishApproval || {};
    return approval.status === "approved" && Boolean(approval.approvedAt) && approval.basisUpdatedAt === item.updatedAt;
  }
})();