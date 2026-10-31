(() => {
  const model = window.ThreadsSchedulerModel;
  const warehouse = window.ThreadsWarehouseModel;
  const footer = document.querySelector("footer");
  if (!model || !warehouse || !footer) return;

  const STORAGE_KEY = "threads_scheduler_control_v1";
  let control = loadControl();
  const section = document.createElement("section");
  section.className = "scheduler-panel panel";
  section.innerHTML = `
    <div class="scheduler-head">
      <div><p class="eyebrow">PUBLISH SCHEDULER</p><h2>게시 Queue / 간격 플래너</h2>
      <p>HOT과 창고 우선순위를 기준으로 계획하되 같은 테마·출처·포맷은 간격을 둡니다. Provider 선택은 목표 경로만 기록하며 실제 게시 실행과 최종 확인은 04 REVIEW_PUBLISH만 수행합니다.</p></div>
      <div class="scheduler-actions">
        <button type="button" class="button ghost" data-control="pause">일시정지</button>
        <button type="button" class="button ghost" data-control="resume">재개</button>
        <button type="button" class="button danger ghost" data-control="stop">중지</button>
      </div>
    </div>
    <div class="scheduler-config">
      <label>기본 간격(분)<input type="number" min="0" max="1440" data-option="slotMinutes" /></label>
      <label>같은 테마(분)<input type="number" min="0" max="1440" data-option="themeGapMinutes" /></label>
      <label>같은 출처(분)<input type="number" min="0" max="1440" data-option="sourceGapMinutes" /></label>
      <label>같은 포맷(분)<input type="number" min="0" max="1440" data-option="formatGapMinutes" /></label>
      <button type="button" class="button primary" data-control="apply">계획 다시 계산</button>
    </div>
    <div id="schedulerStatus" class="scheduler-status"></div>
    <div id="schedulerList" class="scheduler-list"></div>
  `;
  footer.insertAdjacentElement("beforebegin", section);

  const list = section.querySelector("#schedulerList");
  const status = section.querySelector("#schedulerStatus");
  section.addEventListener("click", handleClick);
  section.addEventListener("change", handleChange);
  section.querySelectorAll("[data-option]").forEach((input) => {
    input.value = control.options[input.dataset.option];
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#warehouseList, #cardSaveBtn, #saveDraftsBtn, #saveGateBtn, [data-approval-action], [data-status]")) {
      setTimeout(render, 80);
    }
  });
  render();

  function loadControl() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        state: ["running", "paused", "stopped"].includes(saved?.state) ? saved.state : "running",
        options: model.normalizeOptions(saved?.options || {}),
        history: Array.isArray(saved?.history) ? saved.history.slice(-model.AUDIT_LIMIT) : [],
        updatedAt: saved?.updatedAt || null,
      };
    } catch (_) {
      return { state: "running", options: model.normalizeOptions(), history: [], updatedAt: null };
    }
  }

  function saveControl() {
    control.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(control));
  }

  function auditControl(action, detail = null, from = null, to = null) {
    control.history = model.appendAudit(control.history, { action, detail, from, to });
  }

  function auditItem(item, action, detail = null, from = null, to = null) {
    item.scheduler = { ...(item.scheduler || {}) };
    item.scheduler.audit = model.appendAudit(item.scheduler.audit, { action, itemId: item.id, detail, from, to });
  }

  function eligibleItems() {
    return (state.items || []).filter((item) => warehouse.hasProductionAsset(item));
  }

  function render() {
    const items = eligibleItems();
    const plan = control.state === "stopped" ? [] : model.plan(items, control.options);
    const readyCount = items.filter((item) => warehouse.queueEligibility(item).eligible).length;
    status.innerHTML = `<span class="pill ${control.state === "running" ? "green" : control.state === "paused" ? "yellow" : "red"}">${labelState(control.state)}</span><strong>${plan.length}건 계획</strong><span>게시 가능 ${readyCount}건</span><span>Scheduler 기록 ${control.history.length}건</span>`;
    list.innerHTML = "";
    if (!plan.length) {
      list.innerHTML = `<div class="empty-state compact"><strong>${control.state === "stopped" ? "Scheduler가 중지되었습니다." : "계획 가능한 승인 콘텐츠가 없습니다."}</strong><span>Safety/Privacy/Comfort 및 현재 사람 승인까지 모두 통과해야 Queue에 들어옵니다.</span></div>`;
      return;
    }
    plan.forEach((entry, index) => list.appendChild(row(entry, index, plan.length)));
  }

  function row(entry, index, total) {
    const article = document.createElement("article");
    article.className = "scheduler-row";
    article.dataset.itemId = entry.itemId;
    const auditCount = Array.isArray(entry.item.scheduler?.audit) ? entry.item.scheduler.audit.length : 0;
    article.innerHTML = `
      <div class="scheduler-time"><strong>${escapeHtml(localTime(entry.scheduledAt))}</strong><small>#${index + 1}</small></div>
      <div class="scheduler-main"><h3>${escapeHtml(entry.item.title || "제목 없음")}</h3>
        <div class="scheduler-chips"><span>${escapeHtml(entry.meta.bucket.toUpperCase())}</span><span>${escapeHtml(entry.meta.theme)}</span><span>${escapeHtml(entry.meta.source)}</span><span>${escapeHtml(entry.meta.format)}</span></div>
        <label>게시 목표 경로 <select data-provider-target>${providerOptions(entry.meta.providerTarget)}</select></label>
        <small>이유: ${escapeHtml(entry.reasons.join(" · "))} · 변경 기록 ${auditCount}건</small></div>
      <div class="scheduler-row-actions">
        <button type="button" class="button ghost" data-action="up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="button ghost" data-action="down" ${index === total - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="button primary" data-action="post-now" ${control.state !== "running" ? "disabled" : ""}>지금 게시</button>
      </div>`;
    return article;
  }

  function providerOptions(selected) {
    return Object.values(model.PROVIDERS).map((provider) =>
      `<option value="${escapeHtml(provider.id)}" ${provider.id === selected ? "selected" : ""}>${escapeHtml(provider.label)}</option>`
    ).join("");
  }

  function handleChange(event) {
    const select = event.target.closest?.("[data-provider-target]");
    const card = select?.closest?.("[data-item-id]");
    if (!select || !card) return;
    const item = (state.items || []).find((candidate) => String(candidate.id) === card.dataset.itemId);
    if (!item) return;
    const from = model.providerTarget(item);
    const to = model.setProviderTarget(item, select.value);
    persist();
    render();
    showSystemMessage(`게시 목표 경로를 ${providerLabel(to)}로 기록했습니다. 실제 공개는 04 REVIEW_PUBLISH에서만 실행됩니다.`, "info");
    if (from !== to) auditControl("item-provider-target", `${item.id}:${from}->${to}`);
    saveControl();
  }

  function handleClick(event) {
    const controlAction = event.target.closest?.("[data-control]")?.dataset.control;
    if (controlAction) {
      if (controlAction === "apply") {
        const raw = {};
        section.querySelectorAll("[data-option]").forEach((input) => { raw[input.dataset.option] = input.value; });
        const previous = JSON.stringify(control.options);
        control.options = model.normalizeOptions(raw);
        auditControl("replan-options", JSON.stringify(control.options), previous, JSON.stringify(control.options));
      } else if (controlAction === "pause") {
        const from = control.state; control.state = "paused"; auditControl("pause", null, from, control.state);
      } else if (controlAction === "resume") {
        const from = control.state; control.state = "running"; auditControl("resume", null, from, control.state);
      } else if (controlAction === "stop") {
        const from = control.state; control.state = "stopped"; auditControl("stop", null, from, control.state);
      }
      saveControl(); render(); return;
    }

    const button = event.target.closest?.("[data-action]");
    const card = button?.closest?.("[data-item-id]");
    if (!button || !card) return;
    const item = (state.items || []).find((candidate) => String(candidate.id) === card.dataset.itemId);
    if (!item) return;
    if (button.dataset.action === "up" || button.dataset.action === "down") {
      const before = model.sortCandidates((state.items || []).filter((candidate) => warehouse.queueEligibility(candidate).eligible)).map((candidate) => candidate.id).join(",");
      model.move(state.items || [], item.id, button.dataset.action === "up" ? -1 : 1);
      const after = model.sortCandidates((state.items || []).filter((candidate) => warehouse.queueEligibility(candidate).eligible)).map((candidate) => candidate.id).join(",");
      auditItem(item, "manual-reorder", button.dataset.action, before, after);
      persist(); render(); return;
    }
    if (button.dataset.action === "post-now") routePostNow(item);
  }

  function routePostNow(item) {
    const eligibility = warehouse.queueEligibility(item);
    if (!eligibility.eligible || control.state !== "running") {
      auditItem(item, "post-now-blocked", eligibility.reason || control.state);
      persist();
      showSystemMessage(`지금 게시 불가: ${eligibility.reason || control.state}`, "error");
      return;
    }
    const provider = model.providerTarget(item);
    item.scheduler = { ...(item.scheduler || {}), manualRank: -1, providerTarget: provider, postNowRequestedAt: new Date().toISOString() };
    auditItem(item, "post-now-route", `provider=${provider}; target=04_REVIEW_PUBLISH`);
    persist();
    selectedId = item.id;
    render();
    const approvalCard = document.querySelector(`.approval-card[data-item-id="${cssEscape(item.id)}"]`);
    (approvalCard || document.querySelector("#approvalQueueList"))?.scrollIntoView({ behavior: "smooth", block: "center" });
    showSystemMessage(`Scheduler가 ${providerLabel(provider)} 목표로 04 REVIEW_PUBLISH의 최종 게시 화면에 보냈습니다. 외부 API는 호출하지 않았습니다.`, "info");
  }

  function providerLabel(value) { return model.PROVIDERS[model.normalizeProviderTarget(value)]?.label || "Threads 공식 직접"; }
  function labelState(value) { return value === "running" ? "RUNNING" : value === "paused" ? "PAUSED" : "STOPPED"; }
  function localTime(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString("ko-KR", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }) : "-"; }
  function cssEscape(value) { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&"); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
})();
