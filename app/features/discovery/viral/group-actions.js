(() => {
  const discoveryModel = window.ThreadsDiscoverySourceModel;
  const viralModel = window.ThreadsViralModel;
  const list = document.querySelector("#viralList");
  if (!discoveryModel?.groupCandidates || !viralModel?.score || !list) return;

  let patchQueued = false;

  const observer = new MutationObserver(queuePatch);
  observer.observe(list, { childList: true, subtree: true });
  list.addEventListener("click", onClick);
  queuePatch();

  function queuePatch() {
    if (patchQueued) return;
    patchQueued = true;
    queueMicrotask(() => {
      patchQueued = false;
      patchGroupControls();
    });
  }

  function groupMap() {
    const grouped = discoveryModel.groupCandidates(state.items || []);
    const map = new Map();
    for (const group of grouped.exactDuplicates || []) map.set(`exact:${group.key}`, { ...group, type: "exact" });
    for (const group of grouped.sameStories || []) {
      const key = `story:${group.key}`;
      if (!map.has(key)) map.set(key, { ...group, type: "story" });
    }
    return map;
  }

  function patchGroupControls() {
    const groups = groupMap();
    for (const review of list.querySelectorAll(".viral-group-review")) {
      const key = review.querySelector("[data-group-key]")?.dataset.groupKey;
      if (!key) continue;
      const group = groups.get(key);
      if (!group) continue;

      let summary = review.querySelector(".viral-group-status-summary");
      if (!summary) {
        summary = document.createElement("span");
        summary.className = "viral-group-status-summary";
        review.prepend(summary);
      }
      const nextSummary = statusSummary(group);
      if (summary.textContent !== nextSummary) summary.textContent = nextSummary;

      ensureAction(review, key, "research", "그룹 → 조사");
      ensureAction(review, key, "hold", "그룹 보류");
      ensureAction(review, key, "skip", "그룹 패스");

      if (group.type === "story") {
        const strongest = review.querySelector('[data-group-action="keep-strongest"]');
        if (strongest) {
          strongest.dataset.groupAction = "hold-alternatives";
          strongest.textContent = "최고점 유지 · 대안 보류";
          strongest.title = "같은 소재의 최고점 후보는 유지하고 나머지는 삭제성 패스 대신 편집 대안으로 보류합니다.";
        }
      }
    }
  }

  function ensureAction(review, key, action, label) {
    if (review.querySelector(`[data-group-bulk-status="${action}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button ghost";
    button.dataset.groupBulkStatus = action;
    button.dataset.groupKey = key;
    button.textContent = label;
    review.appendChild(button);
  }

  function onClick(event) {
    const bulk = event.target.closest?.("button[data-group-bulk-status]");
    if (bulk) {
      applyGroupDisposition(bulk.dataset.groupKey, bulk.dataset.groupBulkStatus);
      return;
    }

    const alternatives = event.target.closest?.('button[data-group-action="hold-alternatives"]');
    if (alternatives) {
      event.stopPropagation();
      holdStoryAlternatives(alternatives.dataset.groupKey);
    }
  }

  function resolveGroup(key) {
    return groupMap().get(key) || null;
  }

  function memberItems(group) {
    return (group?.members || []).map((entry) => entry.item).filter(Boolean);
  }

  function blocked(item) {
    return viralModel.score(item).comfort.blocked;
  }

  function audit(item, disposition, key) {
    item.viralReview = {
      ...(item.viralReview || {}),
      groupDisposition: disposition,
      groupDispositionKey: key,
      groupDispositionAt: new Date().toISOString(),
    };
    item.updatedAt = new Date().toISOString();
  }

  function applyGroupDisposition(key, disposition) {
    const group = resolveGroup(key);
    if (!group || !["research", "hold", "skip"].includes(disposition)) return;
    let changed = 0;
    let blockedCount = 0;
    for (const item of memberItems(group)) {
      if (disposition !== "skip" && blocked(item)) {
        blockedCount += 1;
        continue;
      }
      item.status = disposition === "hold" ? "inbox" : disposition;
      audit(item, disposition, key);
      changed += 1;
    }
    if (changed) persist();
    render();
    queuePatch();
    const label = disposition === "research" ? "조사 대기" : disposition === "hold" ? "보류" : "패스";
    showSystemMessage(`그룹 ${changed}건을 ${label} 처리했습니다.${blockedCount ? ` 차단 후보 ${blockedCount}건은 승격하지 않았습니다.` : ""}`, changed ? "success" : "info");
  }

  function holdStoryAlternatives(key) {
    const group = resolveGroup(key);
    if (!group || group.type !== "story") return;
    const members = memberItems(group);
    if (members.length < 2) return;
    const ranked = members
      .map((item) => ({ item, score: viralModel.score(item).viralScore }))
      .sort((a, b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)));
    const strongest = ranked[0].item;
    let changed = 0;
    for (const { item } of ranked.slice(1)) {
      if (blocked(item)) continue;
      item.status = "inbox";
      item.viralReview = {
        ...(item.viralReview || {}),
        duplicateResolution: "same-story-alternative-hold",
        duplicateGroupKey: group.key,
        keptStrongestId: strongest.id,
        groupDisposition: "hold",
        groupDispositionKey: key,
        resolvedAt: new Date().toISOString(),
      };
      item.updatedAt = new Date().toISOString();
      changed += 1;
    }
    if (changed) persist();
    render();
    queuePatch();
    showSystemMessage(`같은 소재 대안 ${changed}건을 보류하고 최고점 후보 1건을 유지했습니다.`, changed ? "success" : "info");
  }

  function statusSummary(group) {
    const counts = { inbox: 0, research: 0, ready: 0, skip: 0, hold: 0, blocked: 0 };
    for (const item of memberItems(group)) {
      if (blocked(item)) counts.blocked += 1;
      if (item.viralReview?.groupDisposition === "hold" && item.status === "inbox") counts.hold += 1;
      else if (Object.prototype.hasOwnProperty.call(counts, item.status)) counts[item.status] += 1;
    }
    const parts = [
      counts.research ? `조사 ${counts.research}` : "",
      counts.hold ? `보류 ${counts.hold}` : "",
      counts.ready ? `제작 ${counts.ready}` : "",
      counts.skip ? `패스 ${counts.skip}` : "",
      counts.inbox ? `Inbox ${counts.inbox}` : "",
      counts.blocked ? `차단 ${counts.blocked}` : "",
    ].filter(Boolean);
    return parts.length ? `상태 · ${parts.join(" / ")}` : "상태 · 미분류";
  }

  window.ThreadsViralGroupActions = {
    applyGroupDisposition,
    holdStoryAlternatives,
    statusSummary,
  };
})();
