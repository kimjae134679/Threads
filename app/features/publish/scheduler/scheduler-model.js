(() => {
  const warehouse = window.ThreadsWarehouseModel;
  if (!warehouse) return;

  const DEFAULTS = Object.freeze({
    slotMinutes: 60,
    themeGapMinutes: 120,
    sourceGapMinutes: 120,
    formatGapMinutes: 60,
  });
  const PROVIDERS = Object.freeze({
    "threads-direct": Object.freeze({ id: "threads-direct", label: "Threads 공식 직접", finalOwner: "04_REVIEW_PUBLISH" }),
    buffer: Object.freeze({ id: "buffer", label: "Buffer 보조 경로", finalOwner: "04_REVIEW_PUBLISH" }),
  });
  const AUDIT_LIMIT = 100;

  function clampMinutes(value, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(0, Math.min(1440, n)) : fallback;
  }

  function normalizeOptions(value = {}) {
    return {
      slotMinutes: clampMinutes(value.slotMinutes, DEFAULTS.slotMinutes),
      themeGapMinutes: clampMinutes(value.themeGapMinutes, DEFAULTS.themeGapMinutes),
      sourceGapMinutes: clampMinutes(value.sourceGapMinutes, DEFAULTS.sourceGapMinutes),
      formatGapMinutes: clampMinutes(value.formatGapMinutes, DEFAULTS.formatGapMinutes),
    };
  }

  function normalizeProviderTarget(value) {
    return PROVIDERS[String(value || "")] ? String(value) : "threads-direct";
  }

  function providerTarget(item = {}) {
    return normalizeProviderTarget(item.scheduler?.providerTarget);
  }

  function appendAudit(history = [], event = {}, limit = AUDIT_LIMIT) {
    const rows = Array.isArray(history) ? history.slice() : [];
    rows.push({
      at: event.at || new Date().toISOString(),
      action: String(event.action || "unknown"),
      itemId: event.itemId == null ? null : String(event.itemId),
      from: event.from == null ? null : String(event.from),
      to: event.to == null ? null : String(event.to),
      detail: event.detail == null ? null : String(event.detail),
      owner: "04_REVIEW_PUBLISH",
    });
    const safeLimit = Math.max(1, Math.min(500, Math.round(Number(limit)) || AUDIT_LIMIT));
    return rows.slice(-safeLimit);
  }

  function setProviderTarget(item = {}, target, at = new Date().toISOString()) {
    const from = providerTarget(item);
    const to = normalizeProviderTarget(target);
    item.scheduler = { ...(item.scheduler || {}), providerTarget: to };
    if (from !== to) {
      item.scheduler.audit = appendAudit(item.scheduler.audit, {
        at, action: "provider-target", itemId: item.id, from, to,
        detail: "Target only; final publication remains owned by 04 REVIEW_PUBLISH.",
      });
    }
    return to;
  }

  function meta(item = {}) {
    const w = warehouse.normalizeWarehouse(item);
    const theme = w.themeTags[0] || item.themeClassification?.primaryTheme || item.discoveryNormalized?.laneId || "general";
    const source = item.discoveryNormalized?.sourceId || item.sourceType || "unknown";
    const format = w.formatTags[0]
      || (warehouse.hasCardAsset(item) ? "carousel" : warehouse.hasTextDraft(item) ? "text" : "unknown");
    return { theme, source, format, bucket: w.bucket, priority: w.priority, providerTarget: providerTarget(item) };
  }

  function manualRank(item = {}) {
    const value = Number(item.scheduler?.manualRank);
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  function sortCandidates(items = [], now = Date.now()) {
    return [...items].sort((a, b) => {
      const rankA = manualRank(a);
      const rankB = manualRank(b);
      if (rankA !== rankB) return rankA - rankB;
      const scoreA = warehouse.queueScore(a, now);
      const scoreB = warehouse.queueScore(b, now);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  }

  function latestMatching(planned, field, value) {
    for (let i = planned.length - 1; i >= 0; i -= 1) {
      if (planned[i].meta[field] === value) return planned[i];
    }
    return null;
  }

  function bumpForSpacing(time, planned, field, value, gapMinutes, reasons) {
    if (!gapMinutes || !value) return time;
    const previous = latestMatching(planned, field, value);
    if (!previous) return time;
    const minTime = previous.scheduledAtMs + gapMinutes * 60_000;
    if (time >= minTime) return time;
    reasons.push(`${field}-spacing:${gapMinutes}m`);
    return minTime;
  }

  function plan(items = [], options = {}, now = Date.now()) {
    const config = normalizeOptions(options);
    const eligible = items.filter((item) => warehouse.queueEligibility(item, now).eligible);
    const ordered = sortCandidates(eligible, now);
    const planned = [];
    let cursor = now;

    for (const item of ordered) {
      const info = meta(item);
      const reasons = [];
      let time = Math.max(cursor, Date.parse(warehouse.normalizeWarehouse(item).notBefore || "") || 0);
      if (info.bucket === "hot") reasons.push("hot-priority");
      if (Number.isFinite(Number(item.scheduler?.manualRank))) reasons.push("manual-order");
      time = bumpForSpacing(time, planned, "theme", info.theme, config.themeGapMinutes, reasons);
      time = bumpForSpacing(time, planned, "source", info.source, config.sourceGapMinutes, reasons);
      time = bumpForSpacing(time, planned, "format", info.format, config.formatGapMinutes, reasons);
      planned.push({
        item,
        itemId: item.id,
        scheduledAt: new Date(time).toISOString(),
        scheduledAtMs: time,
        meta: info,
        reasons: reasons.length ? reasons : ["queue-priority"],
      });
      cursor = time + config.slotMinutes * 60_000;
    }
    return planned;
  }

  function setManualOrder(items = [], orderedIds = []) {
    const rank = new Map(orderedIds.map((id, index) => [String(id), index]));
    for (const item of items) {
      if (!rank.has(String(item.id))) continue;
      item.scheduler = { ...(item.scheduler || {}), manualRank: rank.get(String(item.id)) };
    }
    return items;
  }

  function move(items = [], itemId, delta, now = Date.now()) {
    const ordered = sortCandidates(items.filter((item) => warehouse.queueEligibility(item, now).eligible), now);
    const index = ordered.findIndex((item) => String(item.id) === String(itemId));
    if (index < 0) return ordered.map((item) => item.id);
    const target = Math.max(0, Math.min(ordered.length - 1, index + Math.sign(delta || 0)));
    if (target === index) return ordered.map((item) => item.id);
    const [picked] = ordered.splice(index, 1);
    ordered.splice(target, 0, picked);
    setManualOrder(items, ordered.map((item) => item.id));
    return ordered.map((item) => item.id);
  }

  window.ThreadsSchedulerModel = {
    DEFAULTS, PROVIDERS, AUDIT_LIMIT, normalizeOptions, normalizeProviderTarget, providerTarget,
    appendAudit, setProviderTarget, meta, sortCandidates, plan, setManualOrder, move,
  };
})();
