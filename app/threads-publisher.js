(() => {
  const queue = document.querySelector("#approvalQueueList");
  const connectorBox = document.querySelector(".connector-box");
  if (!queue) return;

  loadStyles();
  addConnectorRow();

  let connector = { configured: false };
  let profile = null;
  let quota = null;
  const posting = new Set();

  // Queue 자체의 카드 교체만 감시한다. 카드 내부에 우리가 버튼/패널을 추가하는 변화는
  // 다시 patchQueue를 호출하지 않아 재귀 렌더를 피한다.
  const observer = new MutationObserver(() => patchQueue());
  observer.observe(queue, { childList: true });

  refreshConnector().finally(patchQueue);

  async function refreshConnector() {
    try {
      const payload = await fetch("/api/connectors", { cache: "no-store" }).then((response) => response.json());
      connector = payload?.connectors?.threads || { configured: false };
      if (connector.configured) {
        const [profileResult, quotaResult] = await Promise.allSettled([
          fetch("/api/threads/profile", { cache: "no-store" }).then(parseApiResponse),
          fetch("/api/threads/quota", { cache: "no-store" }).then(parseApiResponse),
        ]);
        profile = profileResult.status === "fulfilled" ? profileResult.value.profile : null;
        quota = quotaResult.status === "fulfilled" ? quotaResult.value.quota : null;
      }
    } catch (_) {
      connector = { configured: false };
    }
    renderConnector();
  }

  function renderConnector() {
    const status = document.querySelector("#threadsConnectorStatus");
    if (!status) return;
    if (!connector.configured) {
      status.textContent = "THREADS_ACCESS_TOKEN 필요";
      status.className = "threads-token-missing";
      return;
    }
    const account = profile?.username ? `@${profile.username}` : "토큰 연결됨";
    const usage = quotaUsageText(quota);
    status.textContent = usage ? `${account} · ${usage}` : account;
    status.className = "ready-text";
  }

  function patchQueue() {
    for (const card of queue.querySelectorAll(".approval-card[data-item-id]")) {
      const id = card.dataset.itemId;
      const item = state.items.find((candidate) => candidate.id === id);
      if (!item) continue;
      const actions = card.querySelector(".approval-actions");
      if (!actions) continue;

      actions.querySelectorAll("[data-threads-control]").forEach((el) => el.remove());
      card.querySelectorAll(".threads-publish-box").forEach((el) => el.remove());

      const publication = latestPublicationForApproval(item);
      if (publication) {
        actions.appendChild(publicationStatus(item, publication));
        continue;
      }

      if (!isCurrentPublishApproval(item)) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.threadsControl = "prepare";
      button.className = connector.configured ? "button primary" : "button ghost";
      button.textContent = connector.configured ? "Threads 게시 준비" : "Threads 토큰 필요";
      button.disabled = !connector.configured;
      button.addEventListener("click", () => openPublisher(card, item));
      actions.appendChild(button);
    }
  }

  function openPublisher(card, item) {
    card.querySelector(".threads-publish-box")?.remove();
    const text = approvedThreadsText(item);
    if (!text) {
      showSystemMessage("승인된 Threads 초안을 찾지 못했습니다.", "error");
      return;
    }

    const box = document.createElement("div");
    box.className = "threads-publish-box";

    const top = document.createElement("div");
    top.className = "threads-publish-top";
    const account = document.createElement("span");
    account.className = "threads-publish-account";
    account.textContent = profile?.username ? `게시 대상: @${profile.username}` : "게시 대상: 연결된 Threads 계정";
    const chars = document.createElement("span");
    chars.className = "threads-char-count";
    chars.textContent = `${[...text].length.toLocaleString()}자`;
    top.append(account, chars);

    const note = document.createElement("p");
    note.className = "threads-publish-note";
    note.textContent = "아래 내용은 승인된 Draft Studio Threads 편집본이며 여기서는 수정할 수 없습니다. 수정하려면 Draft Studio로 돌아가 편집 저장 후 다시 승인하세요.";

    const preview = document.createElement("textarea");
    preview.readOnly = true;
    preview.value = text;

    const options = document.createElement("div");
    options.className = "threads-publish-actions";
    const replyLabel = document.createElement("label");
    replyLabel.textContent = "댓글 허용 ";
    const reply = document.createElement("select");
    for (const [value, label] of [
      ["everyone", "모두"],
      ["accounts_you_follow", "내가 팔로우하는 계정"],
      ["followers_only", "팔로워만"],
      ["mentioned_only", "멘션된 계정만"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      reply.appendChild(option);
    }
    replyLabel.appendChild(reply);
    options.appendChild(replyLabel);

    const confirmRow = document.createElement("label");
    confirmRow.className = "threads-confirm-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const confirmText = document.createElement("span");
    confirmText.textContent = "이 버튼을 누르면 연결된 Threads 계정에 위 내용이 실제로 공개 게시된다는 것을 확인했습니다.";
    confirmRow.append(checkbox, confirmText);

    const actionRow = document.createElement("div");
    actionRow.className = "threads-publish-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "button ghost";
    cancel.textContent = "닫기";
    cancel.addEventListener("click", () => box.remove());

    const publish = document.createElement("button");
    publish.type = "button";
    publish.className = "button primary";
    publish.textContent = "실제 Threads에 게시";
    publish.disabled = true;
    checkbox.addEventListener("change", () => { publish.disabled = !checkbox.checked || posting.has(item.id); });
    publish.addEventListener("click", () => publishNow(item, reply.value, publish, box));
    actionRow.append(cancel, publish);

    box.append(top, note, preview, options, confirmRow, actionRow);
    card.appendChild(box);
  }

  async function publishNow(item, replyControl, button, box) {
    if (posting.has(item.id)) return;
    const account = profile?.username ? `@${profile.username}` : "연결된 Threads 계정";
    if (!confirm(`${account}에 실제 공개 게시합니다. 계속할까요?`)) return;

    posting.add(item.id);
    button.disabled = true;
    button.textContent = "게시 중…";
    try {
      const payload = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate: JSON.parse(JSON.stringify(item)), replyControl }),
      }).then(parseApiResponse);
      const result = payload.result;
      const record = {
        platform: "threads",
        id: result.id,
        creationId: result.creationId || "",
        text: result.text || approvedThreadsText(item),
        replyControl: result.replyControl || replyControl,
        publishedAt: result.publishedAt || new Date().toISOString(),
        approvalBasis: item.publishApproval?.basisUpdatedAt || null,
        insights: null,
      };
      if (!Array.isArray(item.publications)) item.publications = [];
      item.publications.push(record);
      persist();
      box.remove();
      patchQueue();
      refreshConnector();
      showSystemMessage(`Threads 게시 성공 · 게시물 ID ${record.id}`, "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = "실제 Threads에 게시";
      showSystemMessage(`Threads 게시 실패: ${error.message}`, "error");
    } finally {
      posting.delete(item.id);
    }
  }

  function publicationStatus(item, publication) {
    const wrap = document.createElement("div");
    wrap.className = "threads-publication-row";
    wrap.dataset.threadsControl = "publication";

    const label = document.createElement("span");
    label.className = "threads-posted";
    label.textContent = `Threads 게시됨 · ${publication.id}`;

    const controls = document.createElement("span");
    const insightButton = document.createElement("button");
    insightButton.type = "button";
    insightButton.className = "button ghost";
    insightButton.textContent = publication.insights ? "성과 새로고침" : "성과 회수";
    insightButton.disabled = !connector.configured;
    insightButton.addEventListener("click", () => refreshInsights(item, publication, insightButton));
    controls.appendChild(insightButton);

    if (publication.insights?.metrics) {
      const metrics = document.createElement("span");
      metrics.className = "threads-insights";
      metrics.textContent = insightText(publication.insights.metrics);
      controls.append(" ", metrics);
    }

    wrap.append(label, controls);
    return wrap;
  }

  async function refreshInsights(item, publication, button) {
    button.disabled = true;
    button.textContent = "회수 중…";
    try {
      const payload = await fetch(`/api/threads/insights?id=${encodeURIComponent(publication.id)}`, { cache: "no-store" }).then(parseApiResponse);
      publication.insights = payload.result;
      persist();
      patchQueue();
      showSystemMessage("Threads 게시물 성과를 갱신했습니다.", "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = "성과 회수";
      showSystemMessage(`Threads 성과 회수 실패: ${error.message}`, "error");
    }
  }

  function latestPublicationForApproval(item) {
    const basis = item.publishApproval?.basisUpdatedAt;
    if (!basis) return null;
    const list = Array.isArray(item.publications) ? item.publications : [];
    return [...list].reverse().find((publication) => publication.platform === "threads" && publication.approvalBasis === basis) || null;
  }

  function isCurrentPublishApproval(item) {
    return item.publishApproval?.status === "approved"
      && Boolean(item.publishApproval?.basisUpdatedAt)
      && item.publishApproval.basisUpdatedAt === item.updatedAt;
  }

  function approvedThreadsText(item) {
    const manual = String(item.draftStudio?.manualEdits?.threads || "").trim();
    if (manual) return manual;
    const generated = item.draftStudio?.generated?.threads || {};
    return [generated.hook, generated.body, generated.cta]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  function insightText(metrics) {
    const labels = { views: "조회", likes: "좋아요", replies: "답글", reposts: "리포스트", quotes: "인용", shares: "공유" };
    const parts = [];
    for (const key of ["views", "likes", "replies", "reposts", "quotes", "shares"]) {
      if (metrics[key] === undefined || metrics[key] === null) continue;
      parts.push(`${labels[key]} ${formatMetric(metrics[key])}`);
    }
    return parts.join(" · ") || "성과 데이터 있음";
  }

  function formatMetric(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  }

  function quotaUsageText(value) {
    const usage = value?.data?.[0]?.quota_usage ?? value?.quota_usage;
    const total = value?.data?.[0]?.config?.quota_total ?? value?.config?.quota_total;
    if (usage === undefined || usage === null) return "";
    return total !== undefined && total !== null ? `게시 ${usage}/${total}` : `게시 사용량 ${usage}`;
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

  function addConnectorRow() {
    if (!connectorBox || document.querySelector("#threadsConnectorStatus")) return;
    const row = document.createElement("p");
    row.innerHTML = '<b>Threads 공식 게시</b><span id="threadsConnectorStatus">확인 중</span>';
    connectorBox.appendChild(row);
  }

  function loadStyles() {
    if (document.querySelector('link[href="./threads-publisher.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./threads-publisher.css";
    document.head.appendChild(link);
  }
})();
