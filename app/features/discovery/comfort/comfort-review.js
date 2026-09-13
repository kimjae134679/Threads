(() => {
  const viralModel = window.ThreadsViralModel;
  const comfortModel = window.ThreadsComfortReviewModel;
  const viralPanel = document.querySelector(".viral-review");
  if (!viralModel || !comfortModel || !viralPanel || typeof state === "undefined") return;

  const section = document.createElement("section");
  section.className = "comfort-review panel";
  section.innerHTML = `
    <div class="comfort-head">
      <div>
        <p class="eyebrow">AUDIENCE COMFORT / HUMAN REVIEW</p>
        <h2>불쾌감·민감소재 검토</h2>
        <p>BLOCK과 REVIEW 사유를 카테고리별로 확인하고, REVIEW만 사람 판단으로 승인/보류/거절합니다. BLOCK은 승인할 수 없습니다.</p>
      </div>
      <div class="comfort-stats" id="comfortStats"></div>
    </div>
    <div class="comfort-toolbar">
      <label>상태
        <select id="comfortLevelFilter">
          <option value="all">전체</option>
          <option value="blocked">BLOCK</option>
          <option value="review">REVIEW</option>
          <option value="comfortable">정상</option>
        </select>
      </label>
      <label>카테고리
        <select id="comfortCategoryFilter"><option value="all">전체</option></select>
      </label>
      <div class="comfort-batch-actions">
        <button type="button" class="button ghost" id="comfortBatchHold">현재 REVIEW 보류</button>
        <button type="button" class="button danger ghost" id="comfortBatchSkipBlocked">현재 BLOCK 패스</button>
      </div>
    </div>
    <div id="comfortList" class="comfort-list"></div>
  `;
  viralPanel.insertAdjacentElement("afterend", section);

  const list = section.querySelector("#comfortList");
  const stats = section.querySelector("#comfortStats");
  const levelSelect = section.querySelector("#comfortLevelFilter");
  const categorySelect = section.querySelector("#comfortCategoryFilter");

  for (const rule of viralModel.comfortRules || []) {
    const option = document.createElement("option");
    option.value = rule.id;
    option.textContent = `${rule.severity === "block" ? "BLOCK" : "REVIEW"} · ${rule.label}`;
    categorySelect.appendChild(option);
  }

  levelSelect.addEventListener("change", render);
  categorySelect.addEventListener("change", render);
  section.querySelector("#comfortBatchHold").addEventListener("click", () => applyBatch("hold"));
  section.querySelector("#comfortBatchSkipBlocked").addEventListener("click", () => applyBatch("skip-blocked"));
  list.addEventListener("click", handleListClick);

  const observer = new MutationObserver(() => queueRender());
  const candidateList = document.querySelector("#candidateList");
  if (candidateList) observer.observe(candidateList, { childList: true });
  let queued = false;

  syncComfortMetadata();
  render();

  function queueRender() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      syncComfortMetadata();
      render();
    });
  }

  function filters() {
    return { level: levelSelect.value, category: categorySelect.value };
  }

  function syncComfortMetadata() {
    let changed = false;
    for (const item of state.items || []) {
      const result = comfortModel.scan(item, viralModel);
      const next = {
        level: result.level,
        score: result.score,
        blocked: result.blocked,
        categories: result.categories.map((entry) => ({ id: entry.id, label: entry.label, severity: entry.severity })),
        blockReasons: [...result.blockReasons],
        reviewReasons: [...result.reviewReasons],
      };
      const signature = JSON.stringify(next);
      if (item.comfortReview?.scanSignature === signature) continue;
      item.comfortReview = {
        ...(item.comfortReview || {}),
        latestScan: next,
        scanSignature: signature,
        scannedAt: new Date().toISOString(),
      };
      changed = true;
    }
    if (changed && typeof persist === "function") persist();
  }

  function render() {
    const all = (state.items || []).map((item) => ({ item, scan: comfortModel.scan(item, viralModel) }));
    const counts = {
      blocked: all.filter((row) => row.scan.level === "blocked").length,
      review: all.filter((row) => row.scan.level === "review").length,
      comfortable: all.filter((row) => row.scan.level === "comfortable").length,
    };
    stats.innerHTML = `<span><strong>${counts.blocked}</strong> BLOCK</span><span><strong>${counts.review}</strong> REVIEW</span><span><strong>${counts.comfortable}</strong> 정상</span>`;

    const visible = all.filter(({ item }) => comfortModel.matches(item, filters(), viralModel));
    list.innerHTML = "";
    if (!visible.length) {
      list.innerHTML = '<div class="empty-state compact"><strong>조건에 맞는 후보가 없습니다.</strong><span>필터를 바꾸거나 새 후보를 반입하세요.</span></div>';
      return;
    }
    for (const row of visible.slice(0, 80)) list.appendChild(renderRow(row));
  }

  function renderRow({ item, scan }) {
    const row = document.createElement("article");
    row.className = `comfort-row ${scan.level}`;
    row.dataset.comfortId = item.id;
    const reasons = comfortModel.reasonRows(item, viralModel);
    const audit = Array.isArray(item.comfortReview?.audit) ? item.comfortReview.audit : [];
    const latest = audit.at(-1);
    row.innerHTML = `
      <div class="comfort-row-main">
        <div class="comfort-row-title"><strong>${escapeHtml(item.title || "제목 없음")}</strong><span class="comfort-level ${scan.level}">${scan.level.toUpperCase()}</span></div>
        <div class="comfort-chip-row">${reasons.length ? reasons.map((reason) => `<span class="comfort-chip ${reason.severity}">${escapeHtml(reason.label)}</span>`).join("") : '<span class="comfort-chip safe">감지 사유 없음</span>'}</div>
        ${latest ? `<div class="comfort-audit">최근 검토: ${escapeHtml(latest.outcome)} · ${escapeHtml(formatTime(latest.reviewedAt))}${latest.note ? ` · ${escapeHtml(latest.note)}` : ""}</div>` : ""}
      </div>
      <div class="comfort-row-actions">
        ${scan.level === "review" ? `
          <input type="text" class="comfort-note" data-note-id="${escapeHtml(item.id)}" placeholder="검토 메모(선택)">
          <button type="button" class="button ghost" data-comfort-action="approve" data-id="${escapeHtml(item.id)}">사람 검토 승인</button>
          <button type="button" class="button ghost" data-comfort-action="hold" data-id="${escapeHtml(item.id)}">보류</button>
          <button type="button" class="button danger ghost" data-comfort-action="reject" data-id="${escapeHtml(item.id)}">거절</button>
        ` : scan.level === "blocked" ? '<span class="comfort-block-note">자동 BLOCK · 승인 불가</span>' : '<span class="comfort-safe-note">Comfort 통과</span>'}
      </div>
    `;
    return row;
  }

  function handleListClick(event) {
    const button = event.target.closest?.("button[data-comfort-action]");
    if (!button) return;
    const item = (state.items || []).find((entry) => entry.id === button.dataset.id);
    if (!item) return;
    const action = button.dataset.comfortAction;
    const note = list.querySelector(`input[data-note-id="${cssEscape(item.id)}"]`)?.value || "";
    try {
      item.comfortReview = comfortModel.appendAudit(item, action, note, { viralModel, reviewer: null, reviewSource: "human-ui" });
      if (action === "approve") item.comfortReview.humanClearedReview = true;
      if (action === "hold") item.status = "inbox";
      if (action === "reject") item.status = "skip";
      item.updatedAt = new Date().toISOString();
      if (typeof persist === "function") persist();
      if (typeof render === "function" && render !== window.render) {}
      if (typeof window.render === "function") window.render();
      showMessage(`Comfort 검토 기록: ${action}`, "success");
      render();
    } catch (error) {
      showMessage(error.message === "blocked_comfort_cannot_be_human_approved" ? "BLOCK 후보는 사람 검토로 승인할 수 없습니다." : `검토 기록 실패: ${error.message}`, "error");
    }
  }

  function applyBatch(action) {
    const result = comfortModel.safeBatchDisposition(state.items || [], action, filters(), viralModel);
    if (result.changed.length && typeof persist === "function") persist();
    if (typeof window.render === "function") window.render();
    showMessage(`${result.changed.length}건 처리 · ${result.skipped.length}건 안전 규칙으로 제외`, result.changed.length ? "success" : "info");
    render();
  }

  function showMessage(message, tone) {
    if (typeof showSystemMessage === "function") showSystemMessage(message, tone);
    else console.info(message);
  }

  function formatTime(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? new Date(time).toLocaleString("ko-KR") : "시간 미확인";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
})();
