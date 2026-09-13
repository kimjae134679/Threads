(() => {
  const model = window.ThreadsThemeModel;
  const detail = document.querySelector("#detailContent");
  if (!model || !detail) return;

  let selectedFilter = "all";
  let patchQueued = false;
  const assignmentAnchor = document.querySelector(".experiment-assignment-section") || document.querySelector("#decisionGrid")?.closest(".detail-section");
  if (!assignmentAnchor) return;

  const section = document.createElement("div");
  section.className = "detail-section theme-review-section";
  section.innerHTML = `
    <div class="theme-review-head">
      <div>
        <h3>테마 분류</h3>
        <p>소재의 주제를 별도 메타데이터로 분류합니다. 테마 변경은 콘텐츠 본문을 바꾸지 않으므로 게시 승인 자체를 무효화하지 않습니다.</p>
      </div>
      <span id="themeStatusBadge" class="pill neutral">미분류</span>
    </div>
    <div class="theme-review-grid">
      <label>주 테마<select id="themePrimary"></select></label>
      <label>세부 태그<input id="themeTags" maxlength="240" placeholder="예: 사원증, 직장예절, A/B논쟁" /></label>
    </div>
    <div>
      <small class="muted-inline">보조 테마 · 최대 3개</small>
      <div id="themeSecondary" class="theme-secondary-grid"></div>
    </div>
    <div id="themeSuggestion" class="theme-suggestion"></div>
    <div class="theme-review-actions">
      <button id="themeAutoBtn" type="button" class="button ghost">자동 분류 다시 적용</button>
      <button id="themeSaveBtn" type="button" class="button primary">수동 분류 저장</button>
    </div>
  `;
  assignmentAnchor.insertAdjacentElement("afterend", section);

  const primary = section.querySelector("#themePrimary");
  const tags = section.querySelector("#themeTags");
  const secondary = section.querySelector("#themeSecondary");
  const suggestion = section.querySelector("#themeSuggestion");
  const badge = section.querySelector("#themeStatusBadge");

  for (const theme of model.list()) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    primary.appendChild(option);

    if (theme.id !== "general_viral") {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" value="${escapeHtml(theme.id)}" /> <span>${escapeHtml(theme.label)}</span>`;
      secondary.appendChild(label);
    }
  }

  section.querySelector("#themeAutoBtn").addEventListener("click", applyAuto);
  section.querySelector("#themeSaveBtn").addEventListener("click", saveManual);
  primary.addEventListener("change", () => {
    for (const input of secondary.querySelectorAll('input[type="checkbox"]')) {
      input.disabled = input.value === primary.value;
      if (input.disabled) input.checked = false;
    }
  });

  const title = document.querySelector("#detailTitle");
  if (title) new MutationObserver(syncDetail).observe(title, { childList: true, subtree: true, characterData: true });

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".candidate-card, [data-open-id], .warehouse-card, #deleteBtn, #resetBtn, [data-status]")) {
      setTimeout(() => {
        syncDetail();
        classifyMissing();
        queuePatch();
      }, 0);
    }
  });

  const bodyObserver = new MutationObserver(() => queuePatch());
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  classifyMissing();
  syncDetail();
  queuePatch();

  function currentItem() {
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function classifyMissing() {
    let changed = false;
    for (const item of state.items || []) {
      const saved = item.themeClassification;
      if (saved?.source === "manual") continue;
      if (!saved?.primaryTheme || saved?.taxonomyVersion !== window.ThreadsThemeTaxonomy?.version) {
        model.assignAuto(item);
        changed = true;
      }
    }
    if (changed) persist();
  }

  function syncDetail() {
    const item = currentItem();
    section.hidden = !item;
    if (!item) return;

    const resolved = model.resolve(item);
    primary.value = resolved.primaryTheme;
    tags.value = (resolved.tags || []).join(", ");
    for (const input of secondary.querySelectorAll('input[type="checkbox"]')) {
      input.checked = resolved.secondaryThemes.includes(input.value);
      input.disabled = input.value === resolved.primaryTheme;
    }

    badge.textContent = `${model.label(resolved.primaryTheme)} · ${resolved.source === "manual" ? "수동" : resolved.confidence.toUpperCase()}`;
    badge.className = `pill ${resolved.source === "manual" || resolved.confidence === "high" ? "green" : resolved.confidence === "medium" ? "yellow" : "neutral"}`;

    const auto = model.suggest(item);
    const reasons = auto.reasons.length ? auto.reasons.map((reason) => `#${reason}`).join(" ") : "뚜렷한 키워드 없음";
    const secondaryText = auto.secondaryThemes.length ? ` · 보조 ${auto.secondaryThemes.map(model.label).join(" / ")}` : "";
    suggestion.innerHTML = `<strong>자동 제안: ${escapeHtml(model.label(auto.primaryTheme))}${escapeHtml(secondaryText)}</strong><span>신뢰도 ${escapeHtml(auto.confidence)} · 근거 ${escapeHtml(reasons)}</span>`;
  }

  function applyAuto() {
    const item = currentItem();
    if (!item) return;
    const next = model.clearManual(item);
    persist();
    syncDetail();
    queuePatch();
    showSystemMessage(`테마를 자동 분류로 되돌렸습니다: ${model.label(next.primaryTheme)}`, "success");
  }

  function saveManual() {
    const item = currentItem();
    if (!item) return;
    const secondaryThemes = [...secondary.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value)
      .filter((value) => value !== primary.value)
      .slice(0, 3);
    const tagList = String(tags.value || "")
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
    const next = model.assignManual(item, {
      primaryTheme: primary.value,
      secondaryThemes,
      tags: tagList,
    });
    persist();
    syncDetail();
    queuePatch();
    showSystemMessage(`테마를 수동 저장했습니다: ${model.label(next.primaryTheme)}`, "success");
  }

  function queuePatch() {
    if (patchQueued) return;
    patchQueued = true;
    queueMicrotask(() => {
      patchQueued = false;
      ensureFilterControls();
      patchViralRows();
      patchWarehouseRows();
      patchSummary();
    });
  }

  function ensureFilterControls() {
    const viralToolbar = document.querySelector(".viral-toolbar");
    if (viralToolbar && !viralToolbar.querySelector("#viralThemeFilter")) {
      const control = buildFilterControl("viralThemeFilter");
      const filters = viralToolbar.querySelector(".viral-filters");
      (filters || viralToolbar).appendChild(control);
    }

    const warehouseToolbar = document.querySelector(".warehouse-toolbar");
    if (warehouseToolbar && !warehouseToolbar.querySelector("#warehouseThemeFilter")) {
      const control = buildFilterControl("warehouseThemeFilter");
      const filters = warehouseToolbar.querySelector(".warehouse-filters");
      (filters || warehouseToolbar).appendChild(control);
    }
  }

  function buildFilterControl(id) {
    const wrap = document.createElement("label");
    wrap.className = "theme-filter-control";
    wrap.innerHTML = `<span>테마</span><select id="${id}"></select>`;
    const select = wrap.querySelector("select");
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "전체 테마";
    select.appendChild(all);
    for (const theme of model.list()) {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      select.appendChild(option);
    }
    select.value = selectedFilter;
    select.addEventListener("change", () => {
      selectedFilter = select.value;
      for (const peer of document.querySelectorAll("#viralThemeFilter, #warehouseThemeFilter")) peer.value = selectedFilter;
      patchViralRows();
      patchWarehouseRows();
    });
    return wrap;
  }

  function patchViralRows() {
    for (const row of document.querySelectorAll(".viral-row")) {
      const id = row.querySelector("[data-open-id]")?.dataset.openId;
      if (!id) continue;
      patchRow(row, id);
    }
  }

  function patchWarehouseRows() {
    for (const row of document.querySelectorAll(".warehouse-card[data-item-id]")) patchRow(row, row.dataset.itemId);
  }

  function patchRow(row, id) {
    const item = (state.items || []).find((candidate) => candidate.id === id);
    if (!item) return;
    const resolved = model.resolve(item);
    row.dataset.primaryTheme = resolved.primaryTheme;
    row.dataset.themeHidden = selectedFilter === "all" || selectedFilter === resolved.primaryTheme || resolved.secondaryThemes.includes(selectedFilter) ? "false" : "true";

    let chipRow = row.querySelector(".theme-chip-row");
    if (!chipRow) {
      chipRow = document.createElement("div");
      chipRow.className = "theme-chip-row";
      const body = row.querySelector(".viral-row-body") || row.querySelector(".warehouse-card-head > div") || row;
      body.appendChild(chipRow);
    }
    const html = [
      `<span class="theme-chip">${escapeHtml(model.label(resolved.primaryTheme))}</span>`,
      ...resolved.secondaryThemes.map((themeId) => `<span class="theme-chip secondary">${escapeHtml(model.label(themeId))}</span>`),
    ].join("");
    if (chipRow.innerHTML !== html) chipRow.innerHTML = html;
  }

  function patchSummary() {
    const viral = document.querySelector(".viral-review");
    if (!viral) return;
    let summary = viral.querySelector(".theme-summary-bar");
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "theme-summary-bar";
      const anchor = viral.querySelector(".viral-summary");
      anchor?.insertAdjacentElement("afterend", summary);
    }
    const rows = model.summary(state.items || []).slice(0, 8);
    const html = rows.map((entry) => `<span><strong>${entry.count}</strong>${escapeHtml(entry.label)}</span>`).join("");
    if (summary.innerHTML !== html) summary.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
})();
