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
        <button type="button" class="button ghost" id="comfortAuditExport">Comfort 감사 JSON</button>
      </div>
    </div>
    <div id="comfortList" class="comfort-list"></div>
  `;
  viralPanel.insertAdjacentElement("afterend", section);

  const list = section.querySelector("#comfortList");
  const stats = section.querySelector("#comfortStats");
  const levelSelect = section.querySelector("#comfortLevelFilter");
  const categorySelect = section.querySelector("#comfortCategoryFilter");
  const viralList = document.querySelector("#viralList");
  let lastOpenedId = null;

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
  section.querySelector("#comfortAuditExport").addEventListener("click", exportAuditJson);
  list.addEventListener("click", handleListClick);

  const observer = new MutationObserver(() => queueRender());
  const candidateList = document.querySelector("#candidateList");
  if (candidateList) observer.observe(candidateList, { childList: true });
  if (viralList) observer.observe(viralList, { childList: true, subtree: false });
  let queued = false;

  document.addEventListener("click", enforceReadyGate, true);
  document.addEventListener("click", rememberOpenedCandidate, true);

  syncComfortMetadata();
  render();
  decorateViralRows();

  function queueRender() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      syncComfortMetadata();
      render();
      decorateViralRows();
      decorateDetail();
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
      const signature = comfortModel.scanSignature(result);
      const clearance = comfortModel.clearanceStatus(item, viralModel);
      if (item.comfortReview?.scanSignature === signature && item.comfortReview?.clearanceCode === clearance.code) continue;
      item.comfortReview = {
        ...(item.comfortReview || {}),
        latestScan: next,
        scanSignature: signature,
        clearanceCode: clearance.code,
        clearanceAllowed: clearance.allowed,
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
    const latest = comfortModel.latestAudit(item);
    const clearance = comfortModel.clearanceStatus(item, viralModel);
    row.innerHTML = `
      <div class="comfort-row-main">
        <div class="comfort-row-title"><strong>${escapeHtml(item.title || "제목 없음")}</strong><span class="comfort-level ${scan.level}">${scan.level.toUpperCase()}</span></div>
        <div class="comfort-chip-row">${reasons.length ? reasons.map((reason) => `<span class="comfort-chip ${reason.severity}">${escapeHtml(reason.label)}</span>`).join("") : '<span class="comfort-chip safe">감지 사유 없음</span>'}</div>
        <div class="comfort-clearance ${clearance.allowed ? "allowed" : "blocked"}">${escapeHtml(clearance.label)}</div>
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
      if (action === "hold") item.status = "inbox";
      if (action === "reject") item.status = "skip";
      item.updatedAt = new Date().toISOString();
      syncComfortMetadata();
      if (typeof persist === "function") persist();
      if (typeof window.render === "function") window.render();
      showMessage(`Comfort 검토 기록: ${action}`, "success");
      render();
      decorateViralRows();
      decorateDetail();
    } catch (error) {
      showMessage(error.message === "blocked_comfort_cannot_be_human_approved" ? "BLOCK 후보는 사람 검토로 승인할 수 없습니다." : `검토 기록 실패: ${error.message}`, "error");
    }
  }

  function applyBatch(action) {
    const result = comfortModel.safeBatchDisposition(state.items || [], action, filters(), viralModel);
    syncComfortMetadata();
    if (result.changed.length && typeof persist === "function") persist();
    if (typeof window.render === "function") window.render();
    showMessage(`${result.changed.length}건 처리 · ${result.skipped.length}건 안전 규칙으로 제외`, result.changed.length ? "success" : "info");
    render();
    decorateViralRows();
  }

  function enforceReadyGate(event) {
    const button = event.target.closest?.("#viralReadyBtn");
    if (!button) return;
    const checked = [...document.querySelectorAll('#viralList input[data-viral-id]:checked')];
    if (!checked.length) return;
    const blocked = [];
    let allowedCount = 0;
    for (const checkbox of checked) {
      const item = (state.items || []).find((entry) => entry.id === checkbox.dataset.viralId);
      if (!item) continue;
      const gate = comfortModel.mayAdvance(item, "ready", viralModel);
      if (gate.allowed) {
        allowedCount += 1;
        continue;
      }
      blocked.push({ item, gate });
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (blocked.length) {
      const reasonCounts = blocked.reduce((map, row) => {
        map[row.gate.code] = (map[row.gate.code] || 0) + 1;
        return map;
      }, {});
      const summary = Object.entries(reasonCounts).map(([code, count]) => `${code} ${count}`).join(" · ");
      showMessage(`Comfort gate로 ${blocked.length}건 제작 후보 전환 제외 (${summary})`, "error");
    }
    if (!allowedCount) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function decorateViralRows() {
    if (!viralList) return;
    for (const checkbox of viralList.querySelectorAll('input[data-viral-id]')) {
      const item = (state.items || []).find((entry) => entry.id === checkbox.dataset.viralId);
      const row = checkbox.closest(".viral-row") || checkbox.closest("article") || checkbox.parentElement;
      if (!item || !row) continue;
      const existing = row.querySelector(".comfort-inline-row");
      const reasons = comfortModel.reasonRows(item, viralModel);
      const clearance = comfortModel.clearanceStatus(item, viralModel);
      const html = `<span class="comfort-inline-state ${clearance.allowed ? "allowed" : "blocked"}">${escapeHtml(clearance.label)}</span>${reasons.map((reason) => `<span class="comfort-chip ${reason.severity}">${escapeHtml(reason.label)}</span>`).join("")}`;
      if (existing) {
        if (existing.innerHTML !== html) existing.innerHTML = html;
      }
      else {
        const strip = document.createElement("div");
        strip.className = "comfort-inline-row";
        strip.innerHTML = html;
        row.appendChild(strip);
      }
    }
  }

  function rememberOpenedCandidate(event) {
    const button = event.target.closest?.("button[data-open-id]");
    if (!button) return;
    lastOpenedId = button.dataset.openId || null;
    queueMicrotask(decorateDetail);
  }

  function decorateDetail() {
    if (!lastOpenedId) return;
    const item = (state.items || []).find((entry) => entry.id === lastOpenedId);
    const panel = document.querySelector(".detail-panel");
    if (!item || !panel) return;
    const envelope = comfortModel.exportEnvelope(item, viralModel);
    let block = panel.querySelector(".comfort-detail-audit");
    if (!block) {
      block = document.createElement("section");
      block.className = "comfort-detail-audit";
      panel.appendChild(block);
    }
    const audit = envelope.audit.slice(-5).reverse();
    block.innerHTML = `
      <h3>Audience Comfort 기록</h3>
      <div class="comfort-chip-row">${envelope.latestScan.categories.length ? envelope.latestScan.categories.map((reason) => `<span class="comfort-chip ${escapeHtml(reason.severity)}">${escapeHtml(reason.label)}</span>`).join("") : '<span class="comfort-chip safe">감지 사유 없음</span>'}</div>
      <p class="comfort-detail-clearance">현재 gate: <strong>${escapeHtml(envelope.clearance.label)}</strong></p>
      ${audit.length ? `<div class="comfort-detail-history">${audit.map((entry) => `<div><strong>${escapeHtml(entry.outcome)}</strong> · ${escapeHtml(formatTime(entry.reviewedAt))}${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</div>`).join("")}</div>` : '<p>사람 검토 기록 없음</p>'}
    `;
  }

  function exportAuditJson() {
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      candidates: (state.items || []).map((item) => comfortModel.exportEnvelope(item, viralModel)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `threads-comfort-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showMessage(`Comfort 감사 메타데이터 ${(state.items || []).length}건 내보냄`, "success");
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
