(() => {
  const model = window.ThreadsBulkReviewModel;
  const comfortModel = window.ThreadsComfortReviewModel;
  const viralModel = window.ThreadsViralModel;
  const panel = document.querySelector(".viral-review");
  const list = document.querySelector("#viralList");
  if (!model || !comfortModel || !viralModel || !panel || !list || typeof state === "undefined") return;

  const headActions = panel.querySelector(".viral-head-actions");
  const batchActions = panel.querySelector(".viral-batch-actions");
  if (headActions && !headActions.querySelector("#viralSelectVisibleBtn")) {
    headActions.insertAdjacentHTML("beforeend", '<button id="viralSelectVisibleBtn" class="button ghost" type="button">보이는 항목 선택</button><button id="viralClearSelectionBtn" class="button ghost" type="button">선택 해제</button><span id="viralBulkSelectionSummary" role="status" aria-live="polite">선택 0건</span>');
  }
  if (batchActions && !batchActions.querySelector("#viralBulkHoldBtn")) {
    batchActions.insertAdjacentHTML("beforeend", '<button id="viralBulkHoldBtn" class="button ghost" type="button">선택 보류</button><input id="viralBulkTagInput" type="text" placeholder="태그" aria-label="검토 태그" style="max-width:120px"><button id="viralBulkTagBtn" class="button ghost" type="button">태그 적용</button><button id="viralBulkRemoveTagBtn" class="button ghost" type="button">태그 제거</button><input id="viralBulkTagFilter" type="text" placeholder="태그 필터" aria-label="검토 태그 필터" style="max-width:120px"><button id="viralEditorialHandoffBtn" class="button primary" type="button">선택 → 편집 검토</button>');
  }

  panel.querySelector("#viralSelectVisibleBtn")?.addEventListener("click", () => toggleVisible(true));
  panel.querySelector("#viralClearSelectionBtn")?.addEventListener("click", () => toggleVisible(false, true));
  panel.querySelector("#viralBulkHoldBtn")?.addEventListener("click", () => apply("hold"));
  panel.querySelector("#viralBulkTagBtn")?.addEventListener("click", () => apply("tag"));
  panel.querySelector("#viralBulkRemoveTagBtn")?.addEventListener("click", () => apply("remove-tag"));
  panel.querySelector("#viralEditorialHandoffBtn")?.addEventListener("click", () => apply("editorial-handoff"));
  panel.querySelector("#viralBulkTagFilter")?.addEventListener("input", applyTagFilter);
  list.addEventListener("change", updateSelectionSummary);
  document.addEventListener("keydown", onShortcut);
  queueMicrotask(() => {
    updateSelectionSummary();
    applyTagFilter();
  });

  function checkedIds() {
    return [...list.querySelectorAll('input[data-viral-id]:checked')].map((node) => node.dataset.viralId).filter(Boolean);
  }

  function toggleVisible(checked, all = false) {
    const scope = all
      ? list.querySelectorAll('input[data-viral-id]')
      : [...list.querySelectorAll('.viral-row input[data-viral-id]')].filter((box) => box.closest(".viral-row")?.hidden !== true);
    let changed = 0;
    for (const box of scope) {
      if (box.checked === checked) continue;
      box.checked = checked;
      box.dispatchEvent(new Event("change", { bubbles: true }));
      changed += 1;
    }
    updateSelectionSummary();
    show(`${changed}건 선택 상태 변경`, changed ? "success" : "info");
  }

  function apply(action) {
    const ids = checkedIds();
    if (!ids.length) {
      show("선택된 후보가 없습니다.", "info");
      return;
    }
    const tag = panel.querySelector("#viralBulkTagInput")?.value || "";
    const result = model.apply(state.items || [], ids, action, { comfortModel, viralModel, tag });
    const summary = model.summarize ? model.summarize(result) : {
      changedCount: result.changed.length,
      skippedCount: result.skipped.length,
      skippedReasons: result.skipped.reduce((acc, row) => {
        acc[row.reason] = (acc[row.reason] || 0) + 1;
        return acc;
      }, {}),
    };
    if (summary.changedCount && typeof persist === "function") persist();
    if (typeof window.render === "function") window.render();
    const detail = Object.entries(summary.skippedReasons || {}).map(([reason, count]) => `${reason} ${count}`).join(" · ");
    show(`${summary.changedCount}건 처리${summary.skippedCount ? ` · ${summary.skippedCount}건 제외${detail ? ` (${detail})` : ""}` : ""}`, summary.changedCount ? "success" : "info");
    queueMicrotask(() => {
      applyTagFilter();
      updateSelectionSummary();
    });
  }

  function applyTagFilter() {
    const filter = model.normalizeTag(panel.querySelector("#viralBulkTagFilter")?.value || "");
    for (const row of list.querySelectorAll(".viral-row")) {
      const id = row.querySelector('input[data-viral-id]')?.dataset.viralId;
      const item = (state.items || []).find((entry) => entry.id === id);
      const matches = !filter || model.normalizedTags(item).includes(filter);
      row.hidden = !matches;
    }
    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const summary = panel.querySelector("#viralBulkSelectionSummary");
    if (!summary) return;
    const selected = checkedIds();
    const visible = [...list.querySelectorAll('.viral-row input[data-viral-id]')].filter((box) => box.closest(".viral-row")?.hidden !== true).length;
    const statusCounts = {};
    for (const item of model.selectedItems(state.items || [], selected)) {
      const status = item.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const statusText = Object.entries(statusCounts).map(([status, count]) => `${status} ${count}`).join(" / ");
    summary.textContent = `선택 ${selected.length}건 · 표시 ${visible}건${statusText ? ` · ${statusText}` : ""}`;
  }

  function onShortcut(event) {
    const active = document.activeElement;
    const typing = active && (active.matches?.("input, textarea, select") || active.isContentEditable);
    if (typing) return;
    if (event.key === "Escape") {
      toggleVisible(false, true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      toggleVisible(true);
    }
  }

  function show(message, tone) {
    if (typeof showSystemMessage === "function") showSystemMessage(message, tone);
    else console.info(message);
  }
})();
