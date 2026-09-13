(() => {
  const model = window.ThreadsDiscoverySourceModel;
  const registry = window.ThreadsDiscoveryRegistry;
  const statsAnchor = document.querySelector(".stats");
  if (!model || !registry || !statsAnchor) return;

  let selectedLane = "all";
  let selectedSource = "all";
  let patchQueued = false;

  const section = document.createElement("section");
  section.className = "discovery-source-board panel";
  section.innerHTML = `
    <div class="discovery-source-head">
      <div>
        <p class="eyebrow">DISCOVERY LANES / SOURCES</p>
        <h2>테마별 탐색 / 플랫폼 분산</h2>
        <p>한 군데 커뮤니티에 의존하지 않고 테마별로 적합한 플랫폼을 나눠 찾습니다. 직접 자동수집이 허용되지 않은 곳은 공개 검색 메타데이터나 수동 URL/스크린샷만 사용합니다.</p>
      </div>
      <div class="discovery-source-controls">
        <label>탐색 레인<select id="discoveryLaneFilter"></select></label>
        <label>플랫폼<select id="discoverySourceFilter"></select></label>
      </div>
    </div>
    <div id="discoveryLaneGrid" class="discovery-lane-grid"></div>
    <details class="discovery-source-matrix">
      <summary>탐색 플랫폼 / 연결 방식 보기</summary>
      <div id="discoverySourceMatrixList" class="discovery-source-matrix-list"></div>
    </details>
  `;
  statsAnchor.insertAdjacentElement("afterend", section);

  const laneFilter = section.querySelector("#discoveryLaneFilter");
  const sourceFilter = section.querySelector("#discoverySourceFilter");
  const laneGrid = section.querySelector("#discoveryLaneGrid");
  const matrix = section.querySelector("#discoverySourceMatrixList");

  fillFilters();
  renderMatrix();
  renderLaneBoard();

  laneFilter.addEventListener("change", () => {
    selectedLane = laneFilter.value;
    syncFilters();
    patchRows();
  });
  sourceFilter.addEventListener("change", () => {
    selectedSource = sourceFilter.value;
    syncFilters();
    patchRows();
  });
  laneGrid.addEventListener("click", (event) => {
    const button = event.target.closest?.("button[data-lane-id]");
    if (!button) return;
    selectedLane = button.dataset.laneId;
    laneFilter.value = selectedLane;
    syncFilters();
    patchRows();
    document.querySelector(".viral-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const candidateList = document.querySelector("#candidateList");
  if (candidateList) new MutationObserver(queuePatch).observe(candidateList, { childList: true });
  const observer = new MutationObserver(queuePatch);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("threads:features-ready", queuePatch);
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#viralDiscoveryImportBtn, #googleTrendsBtn, #youtubeBtn, #clusterBtn, #resetBtn, #candidateForm, [data-status]")) {
      setTimeout(queuePatch, 20);
    }
  });

  queuePatch();

  function fillFilters() {
    laneFilter.innerHTML = '<option value="all">전체 테마/레인</option>';
    for (const lane of model.listLanes()) {
      const option = document.createElement("option");
      option.value = lane.id;
      option.textContent = lane.label;
      laneFilter.appendChild(option);
    }

    sourceFilter.innerHTML = '<option value="all">전체 플랫폼</option>';
    const groups = new Map();
    for (const source of model.listSources()) {
      if (!groups.has(source.family)) groups.set(source.family, []);
      groups.get(source.family).push(source);
    }
    const familyLabels = { trend: "트렌드", news: "뉴스", blog: "블로그", community: "커뮤니티", social: "SNS", video: "영상", web: "기타" };
    for (const [family, sources] of groups) {
      const group = document.createElement("optgroup");
      group.label = familyLabels[family] || family;
      for (const source of sources) {
        const option = document.createElement("option");
        option.value = source.id;
        option.textContent = source.label;
        group.appendChild(option);
      }
      sourceFilter.appendChild(group);
    }
  }

  function renderLaneBoard() {
    const counts = new Map(model.laneSummary(state.items || []).map((row) => [row.id, row.count]));
    laneGrid.innerHTML = model.listLanes().map((lane) => {
      const sourceLabels = lane.sources.slice(0, 5).map((id) => model.source(id).label).join(" · ");
      return `
        <button type="button" class="discovery-lane-card${selectedLane === lane.id ? " active" : ""}" data-lane-id="${escapeHtml(lane.id)}">
          <span class="discovery-lane-top"><strong>${escapeHtml(lane.label)}</strong><b>${counts.get(lane.id) || 0}</b></span>
          <small>${escapeHtml(sourceLabels)}${lane.sources.length > 5 ? " 외" : ""}</small>
          <em>${escapeHtml(lane.note)}</em>
        </button>
      `;
    }).join("");
  }

  function renderMatrix() {
    matrix.innerHTML = model.listSources().map((source) => `
      <article class="discovery-source-row">
        <div><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.family)}</small></div>
        <span class="pill ${adapterTone(source.adapter)}">${escapeHtml(adapterLabel(source.adapter))}</span>
        <span>${escapeHtml(modeLabel(source.mode))}</span>
        <p>${escapeHtml(source.note)}</p>
      </article>
    `).join("");
  }

  function queuePatch() {
    if (patchQueued) return;
    patchQueued = true;
    queueMicrotask(() => {
      patchQueued = false;
      renderLaneBoard();
      ensureViralControls();
      patchRows();
    });
  }

  function ensureViralControls() {
    const toolbar = document.querySelector(".viral-toolbar");
    if (!toolbar || toolbar.querySelector("#viralDiscoverySourceFilters")) return;
    const wrap = document.createElement("div");
    wrap.id = "viralDiscoverySourceFilters";
    wrap.className = "discovery-inline-filters";
    wrap.innerHTML = `
      <select aria-label="탐색 레인"></select>
      <select aria-label="플랫폼"></select>
    `;
    const laneSelect = wrap.children[0];
    const sourceSelect = wrap.children[1];
    copyOptions(laneFilter, laneSelect);
    copyOptions(sourceFilter, sourceSelect);
    laneSelect.value = selectedLane;
    sourceSelect.value = selectedSource;
    laneSelect.addEventListener("change", () => {
      selectedLane = laneSelect.value;
      syncFilters();
      patchRows();
    });
    sourceSelect.addEventListener("change", () => {
      selectedSource = sourceSelect.value;
      syncFilters();
      patchRows();
    });
    toolbar.appendChild(wrap);
  }

  function copyOptions(from, to) {
    to.innerHTML = from.innerHTML;
  }

  function syncFilters() {
    laneFilter.value = selectedLane;
    sourceFilter.value = selectedSource;
    const inline = document.querySelector("#viralDiscoverySourceFilters");
    if (inline) {
      inline.children[0].value = selectedLane;
      inline.children[1].value = selectedSource;
    }
    renderLaneBoard();
  }

  function patchRows() {
    for (const row of document.querySelectorAll(".viral-row")) {
      const itemId = row.querySelector("[data-open-id]")?.dataset.openId;
      if (!itemId) continue;
      patchRow(row, itemId);
    }
  }

  function patchRow(row, itemId) {
    const item = (state.items || []).find((candidate) => candidate.id === itemId);
    if (!item) return;
    const source = model.resolveSource(item);
    const lane = model.primaryLane(item);
    const laneMatches = model.matchesLane(item, selectedLane);
    const sourceMatches = selectedSource === "all" || source.id === selectedSource || source.sourceId === selectedSource;
    row.dataset.discoveryLaneHidden = laneMatches ? "false" : "true";
    row.dataset.discoverySourceHidden = sourceMatches ? "false" : "true";
    row.dataset.discoverySource = source.sourceId;
    row.dataset.discoveryLane = lane?.id || "";

    let chips = row.querySelector(".discovery-source-chip-row");
    if (!chips) {
      chips = document.createElement("div");
      chips.className = "discovery-source-chip-row";
      const body = row.querySelector(".viral-row-body") || row;
      const themeChips = body.querySelector(".theme-chip-row");
      if (themeChips) themeChips.insertAdjacentElement("afterend", chips);
      else body.appendChild(chips);
    }
    chips.innerHTML = `
      <span class="discovery-source-chip">${escapeHtml(source.label)}</span>
      ${lane ? `<span class="discovery-lane-chip">${escapeHtml(lane.label)}</span>` : ""}
      ${source.manualCapture ? '<span class="discovery-mode-chip">원문 수동확인</span>' : ""}
    `;
  }

  function adapterLabel(value) {
    if (value === "connected") return "연결됨";
    if (value === "connected-when-credentialed") return "키 설정 시 연결";
    if (value === "manual-only") return "수동/검색만";
    if (value === "planned-discovery") return "탐색 예정";
    if (value === "planned") return "확장 예정";
    return "보조";
  }

  function adapterTone(value) {
    if (value === "connected" || value === "connected-when-credentialed") return "green";
    if (value === "manual-only") return "yellow";
    return "neutral";
  }

  function modeLabel(value) {
    const labels = {
      rss: "공식 RSS",
      "official-api": "공식 API",
      "official-search-api": "공식 검색 API",
      "official-search-api-metadata": "공식 API 메타데이터",
      "official-api-or-public-index": "공식 API / 공개 인덱스",
      "public-index-metadata-plus-manual": "검색 메타 + 수동 캡처",
      "public-index-or-manual": "공개 인덱스 / 수동",
      "rss-or-public-index": "RSS / 공개 인덱스",
      "rss-search-index": "RSS / 검색 인덱스",
      "public-index-or-manual": "공개 인덱스 / 수동",
    };
    return labels[value] || value;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
})();
