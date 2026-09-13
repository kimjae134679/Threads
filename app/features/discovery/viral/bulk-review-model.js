(() => {
  function selectedItems(items = [], ids = []) {
    const wanted = new Set(ids);
    return items.filter((item) => wanted.has(item.id));
  }

  function appendAudit(item, action, details = {}) {
    const previous = Array.isArray(item?.bulkReview?.audit) ? item.bulkReview.audit : [];
    const entry = {
      action,
      appliedAt: details.appliedAt || new Date().toISOString(),
      source: details.source || "bulk-review-ui",
      tag: details.tag || null,
      reason: details.reason || null,
    };
    item.bulkReview = {
      ...(item.bulkReview || {}),
      lastAction: action,
      lastActionAt: entry.appliedAt,
      audit: [...previous, entry],
    };
    item.updatedAt = entry.appliedAt;
    return entry;
  }

  function editorialPacket(item, options = {}) {
    const comfortModel = options.comfortModel || window.ThreadsComfortReviewModel;
    const viralModel = options.viralModel || window.ThreadsViralModel;
    return {
      schemaVersion: 1,
      candidateId: item.id,
      createdAt: options.appliedAt || new Date().toISOString(),
      source: {
        sourceKey: item.sourceKey || null,
        url: item.url || "",
        sourceRisk: item.sourceRisk || item.discoveryNormalized?.sourceRisk || "unknown",
        discoverySourceId: item.discoveryNormalized?.sourceId || null,
        discoveryLaneId: item.discoveryNormalized?.laneId || null,
      },
      viral: viralModel?.score ? viralModel.score(item) : item.viralReview || null,
      comfort: comfortModel?.exportEnvelope ? comfortModel.exportEnvelope(item, viralModel) : null,
      reviewTags: Array.isArray(item.reviewTags) ? [...item.reviewTags] : [],
    };
  }

  function apply(items = [], ids = [], action, options = {}) {
    const comfortModel = options.comfortModel || window.ThreadsComfortReviewModel;
    const viralModel = options.viralModel || window.ThreadsViralModel;
    const appliedAt = options.appliedAt || new Date().toISOString();
    const tag = String(options.tag || "").trim();
    const changed = [];
    const skipped = [];

    for (const item of selectedItems(items, ids)) {
      if (action === "hold") {
        item.status = "inbox";
        appendAudit(item, "hold", { appliedAt, reason: "manual-bulk-hold" });
        changed.push(item.id);
        continue;
      }
      if (action === "reject") {
        item.status = "skip";
        appendAudit(item, "reject", { appliedAt, reason: "manual-bulk-reject" });
        changed.push(item.id);
        continue;
      }
      if (action === "tag") {
        if (!tag) {
          skipped.push({ id: item.id, reason: "empty-tag" });
          continue;
        }
        const tags = new Set(Array.isArray(item.reviewTags) ? item.reviewTags : []);
        tags.add(tag);
        item.reviewTags = [...tags].slice(0, 20);
        appendAudit(item, "tag", { appliedAt, tag });
        changed.push(item.id);
        continue;
      }
      if (action === "editorial-handoff") {
        const gate = comfortModel?.mayAdvance
          ? comfortModel.mayAdvance(item, "editorial", viralModel)
          : { allowed: false, code: "comfort-gate-unavailable" };
        if (!gate.allowed) {
          skipped.push({ id: item.id, reason: gate.code || "comfort-gate" });
          continue;
        }
        item.status = "research";
        item.editorialHandoff = editorialPacket(item, { comfortModel, viralModel, appliedAt });
        appendAudit(item, "editorial-handoff", { appliedAt, reason: gate.code });
        changed.push(item.id);
      }
    }

    return { changed, skipped };
  }

  window.ThreadsBulkReviewModel = {
    selectedItems,
    appendAudit,
    editorialPacket,
    apply,
  };
})();
