(() => {
  const model = window.ThreadsExperimentModel;
  const registry = window.ThreadsAccountRegistry;
  const footer = document.querySelector("footer");
  if (!footer || !model) return;

  const { normalizeMetrics, hasReach, autoDecision, contentAxis } = model;
  loadStyles();

  const section = document.createElement("section");
  section.className = "experiment-lab panel";
  section.innerHTML = `
    <div class="experiment-head">
      <div>
        <p class="eyebrow">EXPERIMENT LAB</p>
        <h2>성과 / KEEP · KILL · SCALE</h2>
        <p class="experiment-sub">실제 게시 결과만 비교합니다. 계정·가설·버전 배정은 게시 시점 값으로 고정해 과거 실험이 뒤섞이지 않게 합니다.</p>
      </div>
      <div class="experiment-actions">
        <select id="experimentAccountFilter" aria-label="실험 계정 필터"><option value="all">모든 실험 계정</option></select>
        <button id="experimentRefreshBtn" type="button" class="button ghost">Threads 성과 모두 새로고침</button>
        <button id="experimentExportBtn" type="button" class="button ghost">실험 CSV 내보내기</button>
      </div>
    </div>
    <div id="experimentStats" class="experiment-stats"></div>
    <div class="experiment-method">
      <strong>자동 판정 기준</strong>
      <span>같은 플랫폼 cohort 내 조회수 백분위 55% + 참여율 백분위 45%. 상위 25% SCALE · 하위 25% KILL · 그 사이 KEEP. cohort 5건 미만 또는 조회 데이터 없음은 LEARN.</span>
    </div>
    <div id="experimentList" class="experiment-list"></div>
  `;
  footer.insertAdjacentElement("beforebegin", section);

  const list = section.querySelector("#experimentList");
  const stats = section.querySelector("#experimentStats");
  const refresh = section.querySelector("#experimentRefreshBtn");
  const exportBtn = section.querySelector("#experimentExportBtn");
  const accountFilter = section.querySelector("#experimentAccountFilter");
  let refreshing = false;

  refresh.addEventListener("click", refreshAllThreadsInsights);
  exportBtn.addEventListener("click", exportCsv);
  accountFilter.addEventListener("change", render);
  list.addEventListener("click", handleClick);

  const queue = document.querySelector("#approvalQueueList");
  if (queue) new MutationObserver(render).observe(queue, { childList: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#saveDraftsBtn, #saveGateBtn, #saveResearchBtn, #saveExperimentAssignmentBtn, [data-status], [data-threads-control]")) {
      setTimeout(render, 50);
    }
  });

  render();

  function collectExperiments() {
    const rows = [];
    for (const item of state.items || []) {
      for (const publication of item.publications || []) {
        if (!publication?.platform || !publication?.id) continue;
        const assignment = publication.experiment || item.experimentAssignment || {};
        rows.push({
          id: `${publication.platform}:${publication.id}`,
          item,
          publication,
          platform: publication.platform,
          axis: contentAxis(item.kind),
          accountId: String(assignment.accountId || ""),
          hypothesisId: String(assignment.hypothesisId || ""),
          variantId: String(assignment.variantId || ""),
          goal: String(assignment.goal || ""),
          platformUsername: String(publication.platformAccount?.username || ""),
        });
      }
    }
    return rows;
  }

  function render() {
    const experiments = collectExperiments();
    syncAccountFilter(experiments);
    const selectedAccount = accountFilter.value;
    const visible = selectedAccount === "all" ? experiments : experiments.filter((row) => row.accountId === selectedAccount);
    renderStats(visible, experiments);
    list.innerHTML = "";
    if (!visible.length) {
      list.innerHTML = '<div class="empty-state compact"><strong>표시할 실제 게시 실험이 없습니다.</strong><span>승인 Queue에서 계정/실험이 배정된 콘텐츠를 Threads에 게시하면 이곳에 자동으로 쌓입니다.</span></div>';
      return;
    }
    [...visible]
      .sort((a, b) => new Date(b.publication.publishedAt || 0) - new Date(a.publication.publishedAt || 0))
      .forEach((experiment) => list.appendChild(experimentCard(experiment, experiments)));
  }

  function syncAccountFilter(experiments) {
    const current = accountFilter.value || "all";
    const ids = [...new Set(experiments.map((row) => row.accountId).filter(Boolean))].sort();
    accountFilter.innerHTML = '<option value="all">모든 실험 계정</option>';
    for (const id of ids) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = registry?.label ? registry.label(id) : id;
      accountFilter.appendChild(option);
    }
    if (ids.includes(current)) accountFilter.value = current;
    else accountFilter.value = "all";
  }

  function experimentCard(experiment, all) {
    const { item, publication } = experiment;
    const metrics = normalizeMetrics(publication.insights?.metrics || {});
    const cohort = all.filter((row) => row.platform === experiment.platform && hasReach(row.publication));
    const auto = autoDecision(experiment, cohort);
    const manual = String(publication.experimentDecision?.manual || "auto").toLowerCase();
    const decision = manual !== "auto" ? manual.toUpperCase() : auto.label;
    const tone = decision.toLowerCase();
    const engagementRate = metrics.views > 0 ? metrics.engagements / metrics.views : null;
    const business = publication.business || {};
    const experimentMeta = [
      experiment.accountId || "미배정",
      experiment.hypothesisId || "가설 미지정",
      experiment.variantId || "버전 미지정",
    ].join(" · ");

    const card = document.createElement("article");
    card.className = `experiment-card decision-${tone}`;
    card.dataset.itemId = item.id;
    card.dataset.publicationId = publication.id;
    card.innerHTML = `
      <div class="experiment-card-head">
        <div>
          <div class="experiment-title-row">
            <span class="pill neutral">${escapeHtml(experiment.platform)}</span>
            <span class="pill decision-pill decision-${tone}">${escapeHtml(decision)}</span>
            <span class="pill neutral">${escapeHtml(experiment.accountId || "UNASSIGNED")}</span>
            <span class="experiment-axis">${escapeHtml(experiment.axis)}</span>
          </div>
          <h3>${escapeHtml(item.title || "제목 없음")}</h3>
          <small>${formatDate(publication.publishedAt)} · ${escapeHtml(experimentMeta)} · 게시물 ${escapeHtml(publication.id)}${experiment.platformUsername ? ` · @${escapeHtml(experiment.platformUsername)}` : ""}</small>
        </div>
        <button type="button" class="button ghost" data-action="open">후보 열기</button>
      </div>
      ${experiment.goal ? `<div class="experiment-auto-reason"><strong>실험 목표</strong> · ${escapeHtml(experiment.goal)}</div>` : ""}
      <div class="experiment-metrics">
        ${metricBox("조회", metrics.views)}
        ${metricBox("참여", metrics.engagements)}
        ${metricBox("참여율", engagementRate === null ? null : `${(engagementRate * 100).toFixed(2)}%`)}
        ${metricBox("좋아요", metrics.likes)}
        ${metricBox("답글", metrics.replies)}
        ${metricBox("공유계열", metrics.reposts + metrics.quotes + metrics.shares)}
      </div>
      <div class="experiment-auto-reason">${escapeHtml(auto.reason)}</div>
      <div class="experiment-business">
        <label>클릭<input data-business="clicks" type="number" min="0" step="1" value="${numberValue(business.clicks)}" placeholder="미입력" /></label>
        <label>전환<input data-business="conversions" type="number" min="0" step="1" value="${numberValue(business.conversions)}" placeholder="미입력" /></label>
        <label>실수익(KRW)<input data-business="revenue" type="number" min="0" step="1" value="${numberValue(business.revenue)}" placeholder="미입력" /></label>
        <label>판정<select data-decision>
          ${decisionOption("auto", "자동", manual)}
          ${decisionOption("scale", "SCALE", manual)}
          ${decisionOption("keep", "KEEP", manual)}
          ${decisionOption("kill", "KILL", manual)}
        </select></label>
        <button type="button" class="button ghost" data-action="save-business">실험값 저장</button>
      </div>
      ${businessSummary(business)}
    `;
    return card;
  }

  function renderStats(experiments, allExperiments) {
    const decisions = experiments.map((row) => {
      const manual = String(row.publication.experimentDecision?.manual || "auto").toLowerCase();
      if (manual !== "auto") return manual.toUpperCase();
      const cohort = allExperiments.filter((candidate) => candidate.platform === row.platform && hasReach(candidate.publication));
      return autoDecision(row, cohort).label;
    });
    const count = (name) => decisions.filter((value) => value === name).length;
    stats.innerHTML = [
      [experiments.length, "표시 실험"],
      [experiments.filter((row) => hasReach(row.publication)).length, "성과 있음"],
      [count("SCALE"), "SCALE"], [count("KEEP"), "KEEP"], [count("KILL"), "KILL"], [count("LEARN"), "LEARN"],
    ].map(([value, label]) => statBox(value, label)).join("");
  }

  async function refreshAllThreadsInsights() {
    if (refreshing) return;
    const targets = collectExperiments().filter((row) => row.platform === "threads");
    if (!targets.length) return showSystemMessage("갱신할 Threads 게시물이 없습니다.", "info");

    refreshing = true;
    refresh.disabled = true;
    const old = refresh.textContent;
    let ok = 0;
    let failed = 0;
    try {
      for (const target of targets) {
        refresh.textContent = `성과 갱신 ${ok + failed + 1}/${targets.length}`;
        try {
          const response = await fetch(`/api/threads/insights?id=${encodeURIComponent(target.publication.id)}`, { cache: "no-store" });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.ok === false) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
          target.publication.insights = payload.result;
          ok += 1;
        } catch (_) {
          failed += 1;
        }
      }
      persist();
      render();
      showSystemMessage(`Threads 성과 갱신: 성공 ${ok}건${failed ? ` · 실패 ${failed}건` : ""}`, failed ? "info" : "success");
    } finally {
      refreshing = false;
      refresh.disabled = false;
      refresh.textContent = old;
    }
  }

  function handleClick(event) {
    const card = event.target.closest?.(".experiment-card");
    if (!card) return;
    const item = state.items.find((candidate) => candidate.id === card.dataset.itemId);
    if (!item) return;
    const publication = (item.publications || []).find((entry) => String(entry.id) === card.dataset.publicationId);
    if (!publication) return;
    const action = event.target.closest?.("[data-action]")?.dataset.action;

    if (action === "open") {
      selectedId = item.id;
      render();
      document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "save-business") {
      const readNumber = (name) => {
        const raw = card.querySelector(`[data-business="${name}"]`)?.value.trim();
        if (!raw) return null;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : null;
      };
      publication.business = {
        clicks: readNumber("clicks"), conversions: readNumber("conversions"), revenue: readNumber("revenue"),
        currency: "KRW", updatedAt: new Date().toISOString(),
      };
      publication.experimentDecision = {
        manual: card.querySelector("[data-decision]")?.value || "auto", updatedAt: new Date().toISOString(),
      };
      persist();
      render();
      showSystemMessage("실험 비즈니스 지표와 판정을 저장했습니다.", "success");
    }
  }

  function exportCsv() {
    const experiments = collectExperiments();
    const header = ["experiment_id","topic_id","account_id","hypothesis_id","variant_id","platform_username","title","axis","platform","publication_id","published_at","views","likes","replies","reposts","quotes","shares","engagement_rate","clicks","conversions","revenue_krw","decision","experiment_goal"];
    const rows = experiments.map((row) => {
      const metrics = normalizeMetrics(row.publication.insights?.metrics || {});
      const cohort = experiments.filter((candidate) => candidate.platform === row.platform && hasReach(candidate.publication));
      const manual = String(row.publication.experimentDecision?.manual || "auto").toLowerCase();
      const decision = manual !== "auto" ? manual.toUpperCase() : autoDecision(row, cohort).label;
      const business = row.publication.business || {};
      return [row.id, row.item.id, row.accountId, row.hypothesisId, row.variantId, row.platformUsername, row.item.title, row.axis, row.platform, row.publication.id, row.publication.publishedAt || "",
        metrics.views, metrics.likes, metrics.replies, metrics.reposts, metrics.quotes, metrics.shares,
        metrics.views ? (metrics.engagements / metrics.views).toFixed(6) : "",
        business.clicks ?? "", business.conversions ?? "", business.revenue ?? "", decision, row.goal];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `threads-experiments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function businessSummary(business) {
    const values = [];
    if (business.clicks !== null && business.clicks !== undefined) values.push(`클릭 ${formatNumber(business.clicks)}`);
    if (business.conversions !== null && business.conversions !== undefined) values.push(`전환 ${formatNumber(business.conversions)}`);
    if (business.revenue !== null && business.revenue !== undefined) values.push(`실수익 ${formatNumber(business.revenue)}원`);
    return values.length ? `<div class="experiment-business-summary">${values.map(escapeHtml).join(" · ")}</div>` : "";
  }

  function csvCell(value) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function statBox(value, label) { return `<article><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`; }
  function metricBox(label, value) { const rendered = value === null || value === undefined ? "—" : typeof value === "number" ? formatNumber(value) : escapeHtml(value); return `<div><span>${escapeHtml(label)}</span><strong>${rendered}</strong></div>`; }
  function decisionOption(value, label, selected) { return `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`; }
  function numberValue(value) { return value === null || value === undefined || value === "" ? "" : escapeHtml(String(value)); }
  function formatNumber(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString() : String(value ?? "—"); }
  function formatDate(value) { if (!value) return "시각 없음"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ko-KR"); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function loadStyles() { if (document.querySelector('link[href="./experiment-lab.css"]')) return; const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "./experiment-lab.css"; document.head.appendChild(link); }
})();