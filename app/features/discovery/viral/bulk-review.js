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
    headActions.insertAdjacentHTML("beforeend", '<button id="viralSelectVisibleBtn" class="button ghost" type="button">보이는 항목 선택</button><button id="viralClearSelectionBtn" class="button ghost" type="button">선택 해제</button>');
  }
  if (batchActions && !batchActions.querySelector("#viralBulkHoldBtn")) {
    batchActions.insertAdjacentHTML("beforeend", '<button id="viralBulkHoldBtn" class="button ghost" type="button">선택 보류</button><input id="viralBulkTagInput" type="text" placeholder="태그" style="max-width:120px"><button id="viralBulkTagBtn" class="button ghost" type="button">태그 적용</button><button id="viralEditorialHandoffBtn" class="button primary" type="button">선택 → 편집 검토</button>');
  }

  panel.querySelector("#viralSelectVisibleBtn")?.addEventListener("click", () => toggleVisible(true));
  panel.querySelector("#viralClearSelectionBtn")?.addEventListener("click", () => toggleVisible(false, true));
  panel.querySelector("#viralBulkHoldBtn")?.addEventListener("click", () => apply("hold"));
  panel.querySelector("#viralBulkTagBtn")?.addEventListener("click", () => apply("tag"));
  panel.querySelector("#viralEditorialHandoffBtn")?.addEventListener("click", () => apply("editorial-handoff"));

  function checkedIds() {
    return [...list.querySelectorAll('input[data-viral-id]:checked')].map((node) => node.dataset.viralId).filter(Boolean);
  }

  function toggleVisible(checked, all = false) {
    const scope = all ? list.querySelectorAll('input[data-viral-id]') : list.querySelectorAll('.viral-row input[data-viral-id]');
    let changed = 0;
    for (const box of scope) {
      if (box.checked === checked) continue;
      box.checked = checked;
      box.dispatchEvent(new Event("change", { bubbles: true }));
      changed += 1;
    }
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
    if (result.changed.length && typeof persist === "function") persist();
    if (typeof window.render === "function") window.render();
    const skippedReasons = result.skipped.reduce((acc, row) => {
      acc[row.reason] = (acc[row.reason] || 0) + 1;
      return acc;
    }, {});
    const detail = Object.entries(skippedReasons).map(([reason, count]) => `${reason} ${count}`).join(" · ");
    show(`${result.changed.length}건 처리${result.skipped.length ? ` · ${result.skipped.length}건 제외${detail ? ` (${detail})` : ""}` : ""}`, result.changed.length ? "success" : "info");
  }

  function show(message, tone) {
    if (typeof showSystemMessage === "function") showSystemMessage(message, tone);
    else console.info(message);
  }
})();
