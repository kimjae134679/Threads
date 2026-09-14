(() => {
  const model = window.ThreadsBufferPublishModel;
  const queue = document.querySelector("#approvalQueueList");
  const connectorBox = document.querySelector(".connector-box");
  if (!model || !queue) return;

  loadStyles();

  let connector = null;
  let setupPanel = null;
  const posting = new Set();

  addConnectorRow();
  refreshConnector().finally(patchQueue);

  const observer = new MutationObserver(() => patchQueue());
  observer.observe(queue, { childList: true });

  async function refreshConnector() {
    try {
      const payload = await fetch("/api/connectors", { cache: "no-store" }).then(parseApiResponse);
      connector = payload?.connectors?.buffer || null;
    } catch (_) {
      connector = null;
    }
    renderConnector();
  }

  function renderConnector() {
    const status = document.querySelector("#bufferConnectorStatus");
    const setup = document.querySelector("#bufferConnectorSetup");
    if (!status) return;

    setup?.replaceChildren();
    setupPanel = setup || null;

    if (!connector?.apiKeyConfigured) {
      status.textContent = "BUFFER_API_KEY 필요";
      status.className = "buffer-missing";
      return;
    }

    if (!connector?.channelConfigured) {
      status.textContent = "API 키 연결됨 · Threads 채널 선택 필요";
      status.className = "buffer-partial";
      renderChannelSetup();
      return;
    }

    const channel = connector.channel || {};
    status.textContent = channel.displayName || channel.name || "Threads 채널 연결됨";
    status.className = "ready-text";
  }

  function renderChannelSetup() {
    if (!setupPanel) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button ghost";
    button.textContent = "Buffer Threads 채널 찾기";
    button.addEventListener("click", loadChannels);
    setupPanel.appendChild(button);
  }

  async function loadChannels() {
    if (!setupPanel) return;
    setupPanel.replaceChildren();
    const busy = document.createElement("span");
    busy.textContent = "Buffer 채널 조회 중…";
    setupPanel.appendChild(busy);
    try {
      const payload = await fetch("/api/buffer/channels", { cache: "no-store" }).then(parseApiResponse);
      const channels = payload?.result?.channels || [];
      if (!channels.length) {
        setupPanel.textContent = "연결된 Threads 채널을 찾지 못했습니다.";
        return;
      }
      const select = document.createElement("select");
      for (const channel of channels) {
        const option = document.createElement("option");
        option.value = channel.id;
        option.textContent = `${channel.displayName || channel.name || channel.id}${channel.organizationName ? ` · ${channel.organizationName}` : ""}`;
        select.appendChild(option);
      }
      const save = document.createElement("button");
      save.type = "button";
      save.className = "button primary";
      save.textContent = "이 Threads 채널 사용";
      save.addEventListener("click", () => saveChannel(select.value, save));
      setupPanel.replaceChildren(select, save);
    } catch (error) {
      setupPanel.textContent = `Buffer 채널 조회 실패: ${error.message}`;
    }
  }

  async function saveChannel(channelId, button) {
    button.disabled = true;
    button.textContent = "저장 중…";
    try {
      const payload = await fetch("/api/buffer/channel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId }),
      }).then(parseApiResponse);
      connector = payload.connector || connector;
      renderConnector();
      patchQueue();
      showSystemMessage("Buffer Threads 채널을 로컬 설정에 저장했습니다.", "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = "이 Threads 채널 사용";
      showSystemMessage(`Buffer 채널 저장 실패: ${error.message}`, "error");
    }
  }

  function patchQueue() {
    for (const card of queue.querySelectorAll(".approval-card[data-item-id]")) {
      const item = (state.items || []).find((candidate) => candidate.id === card.dataset.itemId);
      if (!item) continue;
      const actions = card.querySelector(".approval-actions");
      if (!actions) continue;

      actions.querySelectorAll("[data-buffer-control]").forEach((node) => node.remove());
      card.querySelectorAll(".buffer-publish-box").forEach((node) => node.remove());

      const existing = model.latestDeliveryForApproval(item);
      if (existing) {
        const status = document.createElement("span");
        status.dataset.bufferControl = "status";
        status.className = "buffer-delivery-status";
        status.textContent = deliveryText(existing);
        actions.appendChild(status);
        continue;
      }

      if (!model.isCurrentPublishApproval(item)) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.bufferControl = "prepare";
      button.className = connector?.configured ? "button" : "button ghost";
      button.textContent = connector?.configured ? "Buffer 예약/게시" : "Buffer 연결 필요";
      button.disabled = !connector?.configured;
      button.addEventListener("click", () => openPublisher(card, item));
      actions.appendChild(button);
    }
  }

  function openPublisher(card, item) {
    card.querySelector(".buffer-publish-box")?.remove();
    const text = model.approvedThreadsText(item);
    const length = model.textLength(item);

    const box = document.createElement("div");
    box.className = "buffer-publish-box";

    const heading = document.createElement("div");
    heading.className = "buffer-publish-head";
    const label = document.createElement("strong");
    label.textContent = "Buffer 예약/게시";
    const count = document.createElement("span");
    count.textContent = `${length.toLocaleString()} / 500자`;
    count.className = length > 500 ? "buffer-length-over" : "";
    heading.append(label, count);

    const note = document.createElement("p");
    note.textContent = "승인된 Threads 원고만 전달합니다. Buffer는 예약/전송을 담당하며 원고 수정은 하지 않습니다.";

    const preview = document.createElement("textarea");
    preview.readOnly = true;
    preview.value = text;

    const controls = document.createElement("div");
    controls.className = "buffer-publish-controls";
    const modeLabel = document.createElement("label");
    modeLabel.textContent = "방식 ";
    const mode = document.createElement("select");
    for (const [value, caption] of [
      ["addToQueue", "Buffer 다음 큐"],
      ["customScheduled", "지정 시각 예약"],
      ["shareNow", "즉시 게시"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = caption;
      mode.appendChild(option);
    }
    modeLabel.appendChild(mode);

    const dueLabel = document.createElement("label");
    dueLabel.textContent = "게시 시각 ";
    const dueAt = document.createElement("input");
    dueAt.type = "datetime-local";
    dueAt.min = localDateValue(Date.now() + 60_000);
    dueLabel.appendChild(dueAt);
    dueLabel.hidden = true;
    mode.addEventListener("change", () => { dueLabel.hidden = mode.value !== "customScheduled"; });
    controls.append(modeLabel, dueLabel);

    const confirmRow = document.createElement("label");
    confirmRow.className = "buffer-confirm-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const confirmText = document.createElement("span");
    confirmText.textContent = "위 승인 원고를 연결된 Buffer Threads 채널에 큐/예약/게시 요청하는 것을 확인했습니다.";
    confirmRow.append(checkbox, confirmText);

    const warning = document.createElement("p");
    warning.className = "buffer-warning";
    warning.hidden = length <= 500;
    warning.textContent = "현재 승인 원고가 500자를 초과합니다. 자동으로 자르지 않습니다. Draft Studio에서 게시물 단위로 수정하고 다시 승인하세요.";

    const actions = document.createElement("div");
    actions.className = "buffer-publish-actions";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "button ghost";
    close.textContent = "닫기";
    close.addEventListener("click", () => box.remove());
    const send = document.createElement("button");
    send.type = "button";
    send.className = "button primary";
    send.textContent = "Buffer에 전달";
    send.disabled = true;
    checkbox.addEventListener("change", () => {
      send.disabled = !checkbox.checked || posting.has(item.id) || length > 500;
    });
    send.addEventListener("click", () => sendToBuffer(item, mode.value, dueAt.value, send, box));
    actions.append(close, send);

    box.append(heading, note, preview, controls, warning, confirmRow, actions);
    card.appendChild(box);
  }

  async function sendToBuffer(item, mode, dueAt, button, box) {
    if (posting.has(item.id)) return;
    let request;
    try {
      request = model.buildRequest(item, mode, dueAt);
    } catch (error) {
      const messages = {
        invalid_due_at: "예약 시각을 현재보다 이후로 지정하세요.",
        threads_text_over_500: "승인 원고가 500자를 초과합니다.",
        publish_approval_not_current: "현재 원고 기준 게시 승인이 유효하지 않습니다.",
      };
      return showSystemMessage(messages[error.message] || error.message, "error");
    }

    const verb = mode === "shareNow" ? "즉시 공개 게시" : mode === "customScheduled" ? "지정 시각 예약" : "다음 Buffer 큐에 추가";
    if (!confirm(`승인된 원고를 Buffer에 전달해 ${verb}합니다. 계속할까요?`)) return;

    posting.add(item.id);
    button.disabled = true;
    button.textContent = "전달 중…";
    try {
      const payload = await fetch("/api/buffer/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }).then(parseApiResponse);
      const record = model.deliveryRecord(payload.result || {}, item);
      if (!Array.isArray(item.bufferDeliveries)) item.bufferDeliveries = [];
      item.bufferDeliveries.push(record);
      persist();
      box.remove();
      patchQueue();
      showSystemMessage(`Buffer 전달 완료 · ${record.mode || mode} · ID ${record.id}`, "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Buffer에 전달";
      showSystemMessage(`Buffer 전달 실패: ${error.message}`, "error");
    } finally {
      posting.delete(item.id);
    }
  }

  function deliveryText(delivery) {
    if (delivery.mode === "shareNow") return `Buffer 즉시 게시 요청됨 · ${delivery.id}`;
    if (delivery.mode === "customScheduled") return `Buffer 예약됨 · ${formatDateTime(delivery.dueAt)} · ${delivery.id}`;
    return `Buffer 큐에 추가됨 · ${delivery.id}`;
  }

  function addConnectorRow() {
    if (!connectorBox || document.querySelector("#bufferConnectorStatus")) return;
    const row = document.createElement("p");
    row.innerHTML = '<b>Buffer 예약 게시</b><span id="bufferConnectorStatus">확인 중</span>';
    const setup = document.createElement("div");
    setup.id = "bufferConnectorSetup";
    setup.className = "buffer-connector-setup";
    connectorBox.append(row, setup);
  }

  function localDateValue(value) {
    const date = new Date(value);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDateTime(value) {
    const date = new Date(value || "");
    if (!Number.isFinite(date.getTime())) return "시각 미확인";
    return date.toLocaleString("ko-KR");
  }

  async function parseApiResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      const error = new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function loadStyles() {
    if (document.querySelector('link[href="./features/publish/buffer/buffer-publisher.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./features/publish/buffer/buffer-publisher.css";
    document.head.appendChild(link);
  }
})();
