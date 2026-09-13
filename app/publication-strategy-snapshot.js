(() => {
  const seen = new Set();

  for (const item of state.items || []) {
    for (const publication of item.publications || []) seen.add(key(item, publication));
  }

  const queue = document.querySelector("#approvalQueueList");
  if (queue) {
    new MutationObserver(() => queueMicrotask(scan)).observe(queue, { childList: true, subtree: true });
  }
  document.addEventListener("click", () => setTimeout(scan, 60));

  function scan() {
    let changed = false;
    for (const item of state.items || []) {
      for (const publication of item.publications || []) {
        const id = key(item, publication);
        if (seen.has(id)) continue;
        seen.add(id);
        if (!publication.strategy) {
          publication.strategy = snapshot(item.contentStrategy);
          changed = true;
        }
      }
    }
    if (changed) persist();
  }

  function key(item, publication) {
    return `${item.id}:${publication.platform || ""}:${publication.id || ""}`;
  }

  function snapshot(strategy) {
    return {
      contentFormat: String(strategy?.contentFormat || ""),
      hookType: String(strategy?.hookType || ""),
      ctaType: String(strategy?.ctaType || ""),
      sourceAssetType: String(strategy?.sourceAssetType || ""),
      replyMode: String(strategy?.replyMode || ""),
      hasTopicTag: Boolean(strategy?.hasTopicTag),
      note: String(strategy?.note || ""),
      strategyUpdatedAt: strategy?.updatedAt || null,
      capturedAt: new Date().toISOString(),
    };
  }
})();
