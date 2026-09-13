(() => {
  const model = window.ThreadsDiscoverySourceModel;
  const candidateList = document.querySelector("#candidateList");
  if (!model?.normalizeCandidate || !candidateList) return;

  let queuedReason = null;
  let queued = false;

  const SIGNATURE_FIELDS = [
    "schemaVersion",
    "id",
    "title",
    "canonicalUrl",
    "sourceId",
    "sourceLabel",
    "sourceFamily",
    "adapter",
    "collectionMode",
    "manualCaptureRequired",
    "bulkBodyCollectionAllowed",
    "laneId",
    "laneLabel",
    "themeIds",
    "engagementEvidence",
    "exactDuplicateKey",
    "sameStoryKey",
    "publishedAt",
    "sourceRisk",
  ];

  function signature(value = {}) {
    const stable = {};
    for (const key of SIGNATURE_FIELDS) stable[key] = value?.[key] ?? null;
    return JSON.stringify(stable);
  }

  function syncItem(item, reason = "discovery-normalization-sync") {
    if (!item) return false;
    const normalized = model.normalizeCandidate(item);
    if (signature(item.discoveryNormalized) === signature(normalized)) return false;
    item.discoveryNormalized = {
      ...normalized,
      normalizedAt: new Date().toISOString(),
      normalizedBy: reason,
    };
    return true;
  }

  function syncAll(reason = "discovery-normalization-sync") {
    if (typeof state === "undefined" || !Array.isArray(state?.items)) return 0;
    let changed = 0;
    for (const item of state.items) {
      if (syncItem(item, reason)) changed += 1;
    }
    if (changed && typeof persist === "function") persist();
    return changed;
  }

  function queueSync(reason) {
    queuedReason = reason || queuedReason || "candidate-state-change";
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      const reasonToUse = queuedReason || "candidate-state-change";
      queuedReason = null;
      syncAll(reasonToUse);
    });
  }

  const observer = new MutationObserver(() => queueSync("candidate-list-render"));
  observer.observe(candidateList, { childList: true, subtree: false });

  document.querySelector("#candidateForm")?.addEventListener("submit", () => queueSync("manual-candidate"));
  document.querySelector("#googleTrendsBtn")?.addEventListener("click", () => queueSync("google-trends-trigger"));
  document.querySelector("#importInput")?.addEventListener("change", () => queueSync("json-import-trigger"));
  document.addEventListener("threads:features-ready", () => queueSync("feature-bootstrap"), { once: true });

  window.ThreadsDiscoveryNormalizationSync = {
    syncItem,
    syncAll,
    signature,
  };

  queueSync("source-normalization-bootstrap");
})();
