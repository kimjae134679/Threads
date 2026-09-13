(() => {
  const footer = document.querySelector("footer");
  if (!footer) return;

  loadStyles();
  const section = document.createElement("section");
  section.className = "experiment-lab panel";
  section.innerHTML = `
    <div class="experiment-head">
      <div>
        <p class="eyebrow">EXPERIMENT LAB</p>
        <h2>성과 / KEEP · KILL · SCALE</h2>
        <p class="experiment-sub">실제 게시 결과만 비교합니다. 같은 플랫폼에서 성과가 확인된 게시물이 5개 미만이면 자동 판정하지 않고 LEARN으로 둡니다.</p>
      </div>
      <div class="experiment-actions">
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
  let refreshing = false;

  refresh.addEventListener("click", refreshAllThreadsInsights);
  exportBtn.addEventListener("click", exportCsv);
  list.addEventListener("change", handleChange);
  list.addEventListener("click", handleClick);

  const queue = document.querySelector("#approvalQueueList");
  if (queue) new MutationObserver(render).observe(queue, { childList: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#saveDraftsBtn, #saveGateBtn, #saveResearchBtn, [data-status], [data-threads-control]")) {
      setTimeout(render, 50);
    }
  });

  render();

  function render() {
    const experiments = collectExperiments();
    renderStats(experiments);
    list.innerHTML = "";
    if (!experiments.length) {
      list.innerHTML = '<div class="empty-state compact"><strong>아직 실제 게시 실험이 없습니다.</strong><span>승인 Queue에서 Threads에 게시하면 이곳에 자동으로 쌓입니다.</span></div>';
      return;
    }

    const sorted = [...experiments].sort((a, b) => new Date(b.publication.publishedAt || 0) - new Date(a.publication.publishedAt || 0));
    sorted.forEach((experiment) => list.appendChild(experimentCard(experiment, experiments)));
  }

  function collectExperiments() {
    const rows = [];
    for (const item of state.items || []) {
      for (const publication of item.publications || []) {
        if (!publication?.platform || !publication?.id) continue;
        rows.push({
          id: `${publication.platform}:${publication.id}`,
          item,
          publication,
          platform: publication.platform,
          axis: contentAxis(item.kind),
        });
      }
    }
    return rows;
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
            <span class="experiment-axis">${escapeHtml(experiment.axis)}</span>
          </div>
          <h3>${escapeHtml(item.title || "제목 없음")}</h3>
          <small>${formatDate(publication.publishedAt)} · 게시물 ${escapeHtml(publication.id)}</small>
        </div>
        <button type="button" class="button ghost" data-action="open">후보 열기</button>
      </div>
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
        <label>판정
          <select data-decision>
            ${decisionOption("auto", "자동", manual)}
            ${decisionOption("scale", "SCALE", manual)}
            ${decisionOption("keep", "KEEP", manual)}
            ${decisionOption("kill", "KILL", manual)}
          </select>
        </label>
        <button type="button" class="button ghost" data-action="save-business">실험값 저장</button>
      </div>
      ${businessSummary(business)}
    `;
    return card;
  }

  function renderStats(experiments) {
    const decisions = experiments.map((x) => {
      const manual = String(x.publication.experimentDecision?.manual || "auto").toLowerCase();
      if (manual !== "auto") return manual.toUpperCase();
      const cohort = experiments.filter((row) => row.platform === x.platform && hasReach(row.publication));
      return autoDecision(x, cohort).label;
    });
    const insightCount = experiments.filter((x) => hasReach(x.publication)).length;
    const count = (name) => decisions.filter((x) => x === name).length;
    stats.innerHTML = `
      ${statBox(experiments.length, "실제 게시")}
      ${statBox(insightCount, "성과 있음")}
      ${statBox(count("SCALE"), "SCALE")}
      ${statBox(count("KEEP"), "KEEP")}
      ${statBox(count("KILL"), "KILL")}
      ${statBox(count("LEARN"), "LEARN")}
    `;
  }

  async function refreshAllThreadsInsights() {
    if (refreshing) return;
    const targets = collectExperiments().filter((x) => x.platform === "threads");
    if (!targets.length) {
      showSystemMessage("갱신할 Threads 게시물이 없습니다.", "info");
      return;
    }
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

  function handleChange(event) {
    if (!event.target.matches?.("select[data-decision]")) return;
    // 저장 버튼을 눌렀을 때 함께 반영한다.
  }

  function handleClick(event) {
    const card = event.target.closest?.(".experiment-card");
    if (!card) return;
    const item = state.items.find((candidate) => candidate.id === card.dataset.itemId);
    if (!item) return;
    const publication = (item.publications || []).find((x) => String(x.id) === card.dataset.publicationId);
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
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : null;
      };
      publication.business = {
        clicks: readNumber("clicks"),
        conversions: readNumber("conversions"),
        revenue: readNumber("revenue"),
        currency: "KRW",
        updatedAt: new Date().toISOString(),
      };
      publication.experimentDecision = {
        manual: card.querySelector("[data-decision]")?.value || "auto",
        updatedAt: new Date().toISOString(),
      };
      persist();
      render();
      showSystemMessage("실험 비즈니스 지표와 판정을 저장했습니다.", "success");
    }
  }

  function autoDecision(experiment, cohort) {
    const metrics = normalizeMetrics(experiment.publication.insights?.metrics || {});
    if (!metrics.views) return { label: "LEARN", score: null, reason: "조회 데이터가 아직 없습니다." };
    if (cohort.length < 5) return { label: "LEARN", score: null, reason: `같은 플랫폼 비교군이 ${cohort.length}건입니다. 5건부터 상대 판정을 시작합니다.` };

    const reachValues = cohort.map((row) => normalizeMetrics(row.publication.insights?.metrics || {}).views);
    const rateValues = cohort.map((row) => {
      const m = normalizeMetrics(row.publication.insights?.metrics || {});
      return m.views > 0 ? m.engagements / m.views : 0;
    });
    const rate = metrics.views > 0 ? metrics.engagements / metrics.views : 0;
    const reachPct = percentile(metrics.views, reachValues);
    const ratePct = percentile(rate, rateValues);
    const score = reachPct * 0.55 + ratePct * 0.45;
    const label = score >= 0.75 ? "SCALE" : score <= 0.25 ? "KILL" : "KEEP";
    return {
      label,
      score,
      reason: `같은 ${experiment.platform} ${cohort.length}건 비교 · 조회 백분위 ${(reachPct * 100).toFixed(0)} · 참여율 백분위 ${(ratePct * 100).toFixed(0)} · 종합 ${(score * 100).toFixed(0)}`,
    };
  }

  function percentile(value, values) {
    const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (clean.length <= 1) return 0.5;
    let below = 0;
    let equal = 0;
    clean.forEach((x) => {
      if (x < value) below += 1;
      else if (x === value) equal += 1;
    });
    return (below + Math.max(0, equal - 1) / 2) / (clean.length - 1);
  }

  function normalizeMetrics(raw) {
    const n = (key) => {
      const value = Number(raw?.[key]);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    const metrics = {
      views: n("views"),
      likes: n("likes"),
      replies: n("replies"),
      reposts: n("reposts"),
      quotes: n("quotes"),
      shares: n("shares"),
    };
    metrics.engagements = metrics.likes + metrics.replies + metrics.reposts + metrics.quotes + metrics.shares;
    return metrics;
  }

  function hasReach(publication) {
    return normalizeMetrics(publication.insights?.metrics || {}).views > 0;
  }

  function contentAxis(kind) {
    if (kind === "story" || kind === "humor") return "Internet Story / Culture";
    if (kind === "useful" || kind === "product") return "Useful / Product / Money";
    return "Hot / Issue";
  }

  function businessSummary(business) {
    const values = [];
    if (business.clicks !== null && business.clicks !== undefined) values.push(`클릭 ${formatNumber(business.clicks)}`);
    if (business.conversions !== null && business.conversions !== undefined) values.push(`전환 ${formatNumber(business.conversions)}`);
    if (business.revenue !== null && business.revenue !== undefined) values.push(`실수익 ${formatNumber(business.revenue)}원`);
    return values.length ? `<div class="experiment-business-summary">${values.map(escapeHtml).join(" · ")}</div>` : "";
  }

  function exportCsv() {
    const experiments = collectExperiments();
    const header = ["experiment_id","topic_id","title","axis","platform","publication_id","published_at","views","likes","replies","reposts","quotes","shares","engagement_rate","clicks","conversions","revenue_krw","decision"];
    const rows = experiments.map((x) => {
      const m = normalizeMetrics(x.publication.insights?.metrics || {});
      const cohort = experiments.filter((row) => row.platform === x.platform && hasReach(row.publication));
      const manual = String(x.publication.experimentDecision?.manual || "auto").toLowerCase();
      const decision = manual !== "auto" ? manual.toUpperCase() : autoDecision(x, cohort).label;
      const b = x.publication.business || {};
      return [
        x.id, x.item.id, x.item.title, x.axis, x.platform, x.publication.id, x.publication.publishedAt || "",
        m.views, m.likes, m.replies, m.reposts, m.quotes, m.shares,
        m.views ? (m.engagements / m.views).toFixed(6) : "",
        b.clicks ?? "", b.conversions ?? "", b.revenue ?? "", decision,
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `threads-experiments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function statBox(value, label) {
    return `<article><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`;
  }

  function metricBox(label, value) {
    const rendered = value === null || value === undefined ? "—" : typeof value === "number" ? formatNumber(value) : escapeHtml(value);
    return `<div><span>${escapeHtml(label)}</span><strong>${rendered}</strong></div>`;
  }

  function decisionOption(value, label, selected) {
    return `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`;
  }

  function numberValue(value) {
    return value === null || value === undefined || value === "" ? "" : escapeHtml(String(value));
  }

  function formatNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : String(value ?? "—");
  }

  function formatDate(value) {
    if (!value) return "시각 없음";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ko-KR");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./experiment-lab.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./experiment-lab.css";
    document.head.appendChild(link);
  }
})();
