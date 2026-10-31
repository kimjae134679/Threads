(() => {
  const research = document.querySelector(".research-workspace");
  const connectorBox = document.querySelector(".connector-box");
  if (!research) return;

  loadStyles();
  const section = document.createElement("section");
  section.className = "detail-section source-enrichment";
  section.innerHTML = `
    <div class="source-enrichment-head">
      <div>
        <h3>한국 자료 보강</h3>
        <div class="source-enrichment-help">NAVER API HUB 공식 검색 API로 제목·링크·요약 패시지만 가져옵니다. 원문 재사용 권리는 생기지 않습니다.</div>
      </div>
      <span id="naverEnrichmentStatus" class="pill neutral">확인 중</span>
    </div>
    <label>검색어<input id="naverEnrichmentQuery" type="text" maxlength="100" placeholder="후보 제목 또는 핵심 키워드" /></label>
    <div class="source-enrichment-actions">
      <button type="button" class="button ghost" data-naver-search="news">뉴스 검색</button>
      <button type="button" class="button ghost" data-naver-search="blog">블로그 검색</button>
      <button type="button" class="button ghost" data-naver-search="cafearticle">카페글 검색</button>
      <button type="button" class="button ghost" id="naverTrendBtn">검색 트렌드 30일</button>
    </div>
    <div id="naverTrendSummary" class="naver-trend-summary" hidden></div>
    <div id="naverSearchResults" class="naver-search-results"></div>
  `;
  research.insertAdjacentElement("afterend", section);

  const ui = {
    query: section.querySelector("#naverEnrichmentQuery"),
    status: section.querySelector("#naverEnrichmentStatus"),
    trend: section.querySelector("#naverTrendBtn"),
    trendSummary: section.querySelector("#naverTrendSummary"),
    results: section.querySelector("#naverSearchResults"),
    searchButtons: [...section.querySelectorAll("[data-naver-search]")],
  };

  let connector = { configured: false };
  let busy = false;

  ui.searchButtons.forEach((button) => button.addEventListener("click", () => runSearch(button.dataset.naverSearch)));
  ui.trend.addEventListener("click", runTrend);
  ui.results.addEventListener("click", addRelatedSource);

  const title = document.querySelector("#detailTitle");
  if (title) new MutationObserver(render).observe(title, { childList: true, subtree: true });
  document.querySelector("#candidateList")?.addEventListener("click", () => queueMicrotask(render));

  addConnectorRow();
  refreshConnector().finally(render);

  async function refreshConnector() {
    try {
      const payload = await fetch("/api/connectors", { cache: "no-store" }).then((r) => r.json());
      connector = payload?.connectors?.naverApiHub || { configured: false };
    } catch (_) {
      connector = { configured: false };
    }
    renderConnector();
  }

  function renderConnector() {
    const span = document.querySelector("#naverApiHubConnectorStatus");
    if (span) {
      span.textContent = connector.configured ? "연결됨" : "NAVER API HUB 키 필요";
      span.className = connector.configured ? "ready-text" : "";
    }
    ui.status.textContent = connector.configured ? "사용 가능" : "API 키 필요";
    ui.status.className = `pill ${connector.configured ? "green" : "neutral"}`;
  }

  function render() {
    const item = currentItem();
    section.hidden = !item;
    if (!item) return;
    if (document.activeElement !== ui.query) ui.query.value = item.sourceEnrichment?.naverQuery || item.title || "";
    const disabled = busy || !connector.configured;
    ui.searchButtons.forEach((button) => { button.disabled = disabled; });
    ui.trend.disabled = disabled;
    renderTrend(item);
    renderSearch(item);
  }

  async function runSearch(type) {
    const item = currentItem();
    const query = ui.query.value.trim();
    if (!item || !query || busy || !connector.configured) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ type, query, display: "10", sort: "date" });
      const payload = await fetch(`/api/naver/search?${params}`, { cache: "no-store" }).then(parseResponse);
      item.sourceEnrichment ||= {};
      item.sourceEnrichment.naverQuery = query;
      item.sourceEnrichment.naverSearch ||= {};
      item.sourceEnrichment.naverSearch[type] = payload.result;
      item.sourceEnrichment.updatedAt = new Date().toISOString();
      persist();
      render();
      showSystemMessage(`NAVER ${typeLabel(type)} 검색 결과 ${payload.result.items.length}건을 저장했습니다.`, "success");
    } catch (error) {
      showSystemMessage(`NAVER 검색 실패: ${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function runTrend() {
    const item = currentItem();
    const query = ui.query.value.trim();
    if (!item || !query || busy || !connector.configured) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ query, days: "30" });
      const payload = await fetch(`/api/naver/trend?${params}`, { cache: "no-store" }).then(parseResponse);
      item.sourceEnrichment ||= {};
      item.sourceEnrichment.naverQuery = query;
      item.sourceEnrichment.naverTrend = payload.result;
      item.sourceEnrichment.updatedAt = new Date().toISOString();
      persist();
      render();
      showSystemMessage("NAVER 검색 트렌드 30일 데이터를 저장했습니다. 상대값 신호이며 자동 점수에는 반영하지 않습니다.", "success");
    } catch (error) {
      showSystemMessage(`NAVER 트렌드 조회 실패: ${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  function renderTrend(item) {
    const trend = item.sourceEnrichment?.naverTrend;
    if (!trend?.points?.length) {
      ui.trendSummary.hidden = true;
      ui.trendSummary.innerHTML = "";
      return;
    }
    const momentum = trend.momentum || {};
    const change = Number(momentum.changePercent);
    const changeText = Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : "비교 불가";
    const recent = Number.isFinite(Number(momentum.recentAverage)) ? Number(momentum.recentAverage).toFixed(1) : "—";
    const previous = Number.isFinite(Number(momentum.previousAverage)) ? Number(momentum.previousAverage).toFixed(1) : "—";
    const latest = trend.points[trend.points.length - 1];
    ui.trendSummary.hidden = false;
    ui.trendSummary.innerHTML = `
      <strong>${escapeHtml(trend.query)}</strong>
      <span>최근 평균 ${recent} · 이전 평균 ${previous} · 변화 ${escapeHtml(changeText)} · 최신 ${latest ? latest.ratio.toFixed(1) : "—"}</span>
      <small>검색량 절대값이 아니라 조회 기간 내 최대값=100의 상대지수입니다. 이 값만으로 유행을 확정하지 않습니다.</small>
    `;
  }

  function renderSearch(item) {
    const searches = item.sourceEnrichment?.naverSearch || {};
    const entries = ["news", "blog", "cafearticle"].flatMap((type) => {
      const result = searches[type];
      return (result?.items || []).map((source, index) => ({ ...source, type, index, query: result.query }));
    });
    ui.results.innerHTML = "";
    if (!entries.length) return;

    entries.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    entries.slice(0, 30).forEach((source) => {
      const row = document.createElement("article");
      row.className = "naver-source-row";
      row.innerHTML = `
        <div>
          <div class="naver-source-meta"><span class="pill neutral">${escapeHtml(typeLabel(source.type))}</span>${source.publishedAt ? `<span>${escapeHtml(formatDate(source.publishedAt))}</span>` : ""}</div>
          <strong>${escapeHtml(source.title)}</strong>
          <p>${escapeHtml(source.description || "")}</p>
          <a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">원문 열기</a>
        </div>
        <button type="button" class="button ghost" data-add-related data-type="${escapeAttr(source.type)}" data-index="${source.index}">출처 후보로 추가</button>
      `;
      ui.results.appendChild(row);
    });
  }

  function addRelatedSource(event) {
    const button = event.target.closest?.("[data-add-related]");
    if (!button) return;
    const item = currentItem();
    if (!item) return;
    const type = button.dataset.type;
    const index = Number(button.dataset.index);
    const source = item.sourceEnrichment?.naverSearch?.[type]?.items?.[index];
    if (!source?.url) return;

    item.relatedSources ||= [];
    if (!item.relatedSources.some((existing) => existing.url === source.url)) {
      item.relatedSources.push({
        title: source.title,
        url: source.url,
        source: `NAVER ${typeLabel(type)} 검색`,
        sourceType: type === "cafearticle" ? "community-search" : type,
        risk: "yellow",
        discoveredAt: new Date().toISOString(),
      });
      item.updatedAt = new Date().toISOString();
      persist();
      showSystemMessage("Research용 출처 후보에 추가했습니다. 추가했다는 사실이 내용 검증 완료를 의미하지는 않습니다.", "success");
      button.disabled = true;
      button.textContent = "추가됨";
    }
  }

  function setBusy(value) {
    busy = value;
    render();
  }

  function currentItem() {
    return state.items.find((candidate) => candidate.id === selectedId) || null;
  }

  async function parseResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    return payload;
  }

  function addConnectorRow() {
    if (!connectorBox || document.querySelector("#naverApiHubConnectorStatus")) return;
    const row = document.createElement("p");
    row.innerHTML = '<b>NAVER API HUB</b><span id="naverApiHubConnectorStatus">확인 중</span>';
    connectorBox.appendChild(row);
  }

  function typeLabel(type) {
    return ({ news: "뉴스", blog: "블로그", cafearticle: "카페글" })[type] || type;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ko-KR");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function loadStyles() {
    if (document.querySelector('link[href="./source-enrichment.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./source-enrichment.css";
    document.head.appendChild(link);
  }
})();
