(() => {
  const model = window.ThreadsViralModel;
  const statsAnchor = document.querySelector(".stats");
  const candidateList = document.querySelector("#candidateList");
  if (!model || !statsAnchor || !candidateList) return;

  loadStyles();

  const selected = new Set();
  let filter = "recommended";
  let patchQueued = false;

  const section = document.createElement("section");
  section.className = "viral-review panel";
  section.innerHTML = `
    <div class="viral-head">
      <div>
        <p class="eyebrow">VIRAL FINDER / BATCH REVIEW</p>
        <h2>바이럴 후보 선별</h2>
        <p>이미 Inbox에 들어온 실제 신호를 조회·반응·신선도·카드화 가능성으로 재정렬하고, 불쾌감 필터를 통과한 것만 여러 개 골라 제작 단계로 넘깁니다.</p>
      </div>
      <div class="viral-head-actions">
        <button id="viralRescoreBtn" class="button ghost" type="button">전체 다시 점수</button>
        <button id="viralSelectBtn" class="button ghost" type="button">추천 전부 선택</button>
      </div>
    </div>
    <div class="viral-summary" id="viralSummary"></div>
    <div class="viral-toolbar">
      <div class="viral-filters" id="viralFilters">
        <button type="button" class="viral-filter active" data-filter="recommended">추천만</button>
        <button type="button" class="viral-filter" data-filter="all">전체</button>
        <button type="button" class="viral-filter" data-filter="review">주의 검토</button>
        <button type="button" class="viral-filter" data-filter="blocked">불쾌감 차단</button>
      </div>
      <div class="viral-batch-actions">
        <span id="viralSelectedCount">0개 선택</span>
        <button id="viralResearchBtn" type="button" class="button ghost">선택 → 조사</button>
        <button id="viralReadyBtn" type="button" class="button primary">선택 → 제작 후보</button>
        <button id="viralSkipBtn" type="button" class="button ghost">선택 패스</button>
        <button id="viralBlockSkipBtn" type="button" class="button danger ghost">차단 후보 자동 패스</button>
      </div>
    </div>
    <div id="viralList" class="viral-list"></div>
  `;
  statsAnchor.insertAdjacentElement("afterend", section);

  const list = section.querySelector("#viralList");
  const summary = section.querySelector("#viralSummary");
  const selectedCount = section.querySelector("#viralSelectedCount");

  section.querySelector("#viralRescoreBtn").addEventListener("click", () => { scoreAndPersist(); renderPanel(); });
  section.querySelector("#viralSelectBtn").addEventListener("click", selectRecommended);
  section.querySelector("#viralResearchBtn").addEventListener("click", () => applySelected("research"));
  section.querySelector("#viralReadyBtn").addEventListener("click", () => applySelected("ready"));
  section.querySelector("#viralSkipBtn").addEventListener("click", () => applySelected("skip"));
  section.querySelector("#viralBlockSkipBtn").addEventListener("click", skipBlocked);
  section.querySelector("#viralFilters").addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    section.querySelectorAll("[data-filter]").forEach((el) => el.classList.toggle("active", el === button));
    renderPanel();
  });
  list.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("input[data-viral-id]");
    if (!checkbox) return;
    if (checkbox.checked) selected.add(checkbox.dataset.viralId);
    else selected.delete(checkbox.dataset.viralId);
    updateSelectedCount();
  });
  list.addEventListener("click", (event) => {
    const open = event.target.closest?.("button[data-open-id]");
    if (!open) return;
    selectedId = open.dataset.openId;
    render();
    document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const observer = new MutationObserver(() => queuePatch());
  observer.observe(candidateList, { childList: true });

  scoreAndPersist();
  renderPanel();

  function queuePatch() {
    if (patchQueued) return;
    patchQueued = true;
    queueMicrotask(() => {
      patchQueued = false;
      pruneSelection();
      renderPanel();
    });
  }

  function scoredRows() {
    const seen = new Set();
    return (state.items || []).map((item) => {
      const result = model.score(item);
      const key = model.dedupeKey(item);
      const duplicate = seen.has(key);
      seen.add(key);
      return { item, result, duplicate };
    }).sort((a, b) => b.result.viralScore - a.result.viralScore || new Date(b.item.createdAt || 0) - new Date(a.item.createdAt || 0));
  }

  function scoreAndPersist() {
    for (const { item, result } of scoredRows()) {
      item.viralReview = {
        viralScore: result.viralScore,
        comfortScore: result.comfort.score,
        decision: result.decision,
        components: result.components,
        metrics: result.metrics,
        severeHits: result.comfort.severeHits,
        cautionHits: result.comfort.cautionHits,
        computedAt: new Date().toISOString(),
      };
    }
    persist();
  }

  function renderPanel() {
    const rows = scoredRows();
    const counts = {
      strong: rows.filter((row) => row.result.decision === "STRONG").length,
      candidate: rows.filter((row) => row.result.decision === "CANDIDATE").length,
      review: rows.filter((row) => row.result.decision === "REVIEW").length,
      blocked: rows.filter((row) => row.result.decision === "BLOCK").length,
    };
    summary.innerHTML = `
      ${summaryBox(rows.length, "전체")}
      ${summaryBox(counts.strong, "강추천")}
      ${summaryBox(counts.candidate, "후보")}
      ${summaryBox(counts.review, "주의 검토")}
      ${summaryBox(counts.blocked, "불쾌감 차단")}
    `;

    const visible = rows.filter((row) => matchesFilter(row));
    list.innerHTML = "";
    if (!visible.length) {
      list.innerHTML = '<div class="empty-state compact"><strong>조건에 맞는 바이럴 후보가 없습니다.</strong><span>Google Trends/YouTube/API 수집이나 수동 URL 반입 후 다시 확인하세요.</span></div>';
      updateSelectedCount();
      return;
    }

    for (const row of visible.slice(0, 50)) list.appendChild(rowElement(row));
    updateSelectedCount();
  }

  function matchesFilter(row) {
    if (filter === "all") return true;
    if (filter === "blocked") return row.result.decision === "BLOCK";
    if (filter === "review") return row.result.decision === "REVIEW";
    return ["STRONG", "CANDIDATE"].includes(row.result.decision) && !row.duplicate;
  }

  function rowElement({ item, result, duplicate }) {
    const article = document.createElement("article");
    const blocked = result.decision === "BLOCK";
    const review = result.decision === "REVIEW";
    article.className = `viral-row viral-${result.decision.toLowerCase()}${duplicate ? " viral-duplicate" : ""}`;
    const metrics = result.metrics;
    const metricText = [
      metrics.views ? `조회 ${format(metrics.views)}` : "",
      metrics.likes ? `좋아요 ${format(metrics.likes)}` : "",
      metrics.comments ? `댓글 ${format(metrics.comments)}` : "",
      metrics.shares ? `공유 ${format(metrics.shares)}` : "",
      metrics.rank ? `순위 #${metrics.rank}` : "",
    ].filter(Boolean).join(" · ") || "정량 반응값 없음";
    const source = item.sourceMeta?.provider || item.sourceType || "manual";
    const disabled = blocked || duplicate;
    article.innerHTML = `
      <label class="viral-check" title="${disabled ? (blocked ? "불쾌감 필터 차단" : "중복 후보") : "제작 후보로 선택"}">
        <input type="checkbox" data-viral-id="${escapeHtml(item.id)}" ${selected.has(item.id) ? "checked" : ""} ${disabled ? "disabled" : ""} />
      </label>
      <div class="viral-score"><strong>${result.viralScore}</strong><span>VIRAL</span></div>
      <div class="viral-row-body">
        <div class="viral-row-top">
          <span class="pill ${tone(result.decision)}">${escapeHtml(label(result.decision))}</span>
          <span class="viral-comfort">Comfort ${result.comfort.score}</span>
          <span class="viral-source">${escapeHtml(source)}</span>
          ${duplicate ? '<span class="pill neutral">중복</span>' : ""}
        </div>
        <h3>${escapeHtml(item.title || "제목 없음")}</h3>
        <p>${escapeHtml(metricText)}</p>
        <small>인기도 ${result.components.popularity} · 대화 ${result.components.discussion} · 신선도 ${result.components.freshness} · 카드화 ${result.components.cardability}</small>
        ${blocked ? `<div class="viral-warning">불쾌감 자동 차단: ${escapeHtml(blockReason(result))}</div>` : review ? '<div class="viral-warning mild">주의 소재가 감지되어 사람 확인 후 사용합니다.</div>' : ""}
      </div>
      <button type="button" class="button ghost" data-open-id="${escapeHtml(item.id)}">열기</button>
    `;
    return article;
  }

  function selectRecommended() {
    for (const row of scoredRows()) {
      if (["STRONG", "CANDIDATE"].includes(row.result.decision) && !row.duplicate) selected.add(row.item.id);
    }
    renderPanel();
  }

  function applySelected(status) {
    if (!selected.size) return showSystemMessage("먼저 바이럴 후보를 선택하세요.", "info");
    let changed = 0;
    for (const item of state.items || []) {
      if (!selected.has(item.id)) continue;
      const result = model.score(item);
      if (result.comfort.blocked) continue;
      item.status = status;
      item.viralReview = { ...(item.viralReview || {}), selectedForProduction: status === "ready", selectedAt: new Date().toISOString() };
      item.updatedAt = new Date().toISOString();
      changed += 1;
    }
    persist();
    render();
    selected.clear();
    renderPanel();
    const text = status === "ready" ? "제작 후보" : status === "research" ? "조사 대기" : "패스";
    showSystemMessage(`${changed}개 바이럴 후보를 ${text}로 이동했습니다.`, changed ? "success" : "info");
  }

  function skipBlocked() {
    let changed = 0;
    for (const row of scoredRows()) {
      if (row.result.decision !== "BLOCK" || row.item.status === "skip") continue;
      row.item.status = "skip";
      row.item.viralReview = { ...(row.item.viralReview || {}), autoExcluded: true, excludedAt: new Date().toISOString() };
      row.item.updatedAt = new Date().toISOString();
      selected.delete(row.item.id);
      changed += 1;
    }
    persist();
    render();
    renderPanel();
    showSystemMessage(`불쾌감 차단 후보 ${changed}개를 패스 처리했습니다.`, "success");
  }

  function pruneSelection() {
    const ids = new Set((state.items || []).map((item) => item.id));
    for (const id of selected) if (!ids.has(id)) selected.delete(id);
  }

  function updateSelectedCount() {
    selectedCount.textContent = `${selected.size}개 선택`;
  }

  function summaryBox(value, text) {
    return `<span><strong>${Number(value).toLocaleString()}</strong><small>${escapeHtml(text)}</small></span>`;
  }

  function blockReason(result) {
    if (result.comfort.severeHits.length) return "고위험 불쾌 소재 키워드 감지";
    if (result.comfort.cautionHits.length) return "주의 소재가 여러 개 감지됨";
    return "Audience Comfort 기준 미달";
  }

  function label(value) {
    return ({ STRONG: "강추천", CANDIDATE: "후보", REVIEW: "주의 검토", BLOCK: "차단", LOW: "낮음" })[value] || value;
  }

  function tone(value) {
    return value === "STRONG" ? "green" : value === "BLOCK" ? "red" : value === "REVIEW" ? "yellow" : "neutral";
  }

  function format(value) {
    return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./viral-review.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./viral-review.css";
    document.head.appendChild(link);
  }
})();
