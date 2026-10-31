(() => {
  const BUCKETS = new Set(["ready", "hot", "evergreen"]);

  function currentApproval(item = {}) {
    const approval = item.publishApproval || {};
    return approval.status === "approved"
      && Boolean(approval.approvedAt)
      && Boolean(approval.basisUpdatedAt)
      && approval.basisUpdatedAt === item.updatedAt;
  }

  function safetyPass(item = {}) {
    const gate = item.safetyGate || {};
    const values = [gate.fact, gate.rights, gate.privacy, gate.defamation, gate.platform];
    if (!gate.reviewedAt || values.some((value) => !value || value === "unknown")) return false;
    if (values.includes("block")) return false;
    if (values.includes("warn") && !String(gate.notes || "").trim()) return false;
    return true;
  }

  function hasTextDraft(item = {}) {
    const manual = String(item.draftStudio?.manualEdits?.threads || "").trim();
    if (manual) return true;
    const generated = item.draftStudio?.generated?.threads || {};
    return Boolean([generated.hook, generated.body, generated.cta].some((value) => String(value || "").trim()));
  }

  function hasCardAsset(item = {}) {
    return Array.isArray(item.cardFactory?.storyboard?.cards) && item.cardFactory.storyboard.cards.length > 0;
  }

  function hasProductionAsset(item = {}) {
    return hasTextDraft(item) || hasCardAsset(item);
  }

  function cardPrivacyPass(item = {}) {
    const cards = Array.isArray(item.cardFactory?.storyboard?.cards) ? item.cardFactory.storyboard.cards : [];
    const captureCount = cards.filter((card) => card?.type === "capture-image").length;
    if (!captureCount) return true;
    return item.cardFactory?.privacy?.gate?.allowed === true;
  }

  function comfortBlocked(item = {}) {
    return item.viralReview?.decision === "BLOCK" || Number(item.viralReview?.comfortScore) < 60;
  }

  function deriveStage(item = {}) {
    if (comfortBlocked(item)) return "blocked";
    if (!hasProductionAsset(item)) return "not-produced";
    if (!cardPrivacyPass(item)) return "review";
    if (!safetyPass(item)) return "review";
    if (!currentApproval(item)) return "approval";
    return "ready";
  }

  function normalizeTags(values = []) {
    const source = Array.isArray(values) ? values : String(values || "").split(",");
    const out = [];
    const seen = new Set();
    for (const value of source) {
      const tag = String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
      if (out.length >= 20) break;
    }
    return out;
  }

  function normalizeHistory(values = []) {
    if (!Array.isArray(values)) return [];
    return values.slice(-50).map((entry) => ({
      at: validDate(entry?.at) || null,
      action: String(entry?.action || "update"),
      from: entry?.from ? String(entry.from) : null,
      to: entry?.to ? String(entry.to) : null,
      note: String(entry?.note || ""),
    }));
  }

  function normalizeWarehouse(item = {}) {
    const value = item.warehouse || {};
    const bucket = BUCKETS.has(value.bucket) ? value.bucket : "ready";
    return {
      schemaVersion: Math.max(2, Number(value.schemaVersion) || 2),
      bucket,
      priority: clampInt(value.priority, 1, 5, 3),
      status: value.status === "hold" ? "hold" : "active",
      notBefore: validDate(value.notBefore),
      expiresAt: validDate(value.expiresAt),
      themeTags: normalizeTags(value.themeTags),
      formatTags: normalizeTags(value.formatTags),
      note: String(value.note || ""),
      provenance: value.provenance && typeof value.provenance === "object" ? value.provenance : null,
      history: normalizeHistory(value.history),
      updatedAt: value.updatedAt || null,
    };
  }

  function freshnessState(item = {}, now = Date.now()) {
    const warehouse = normalizeWarehouse(item);
    const expiresAt = Date.parse(warehouse.expiresAt || "");
    if (Number.isFinite(expiresAt) && expiresAt <= now) return "expired";
    const notBefore = Date.parse(warehouse.notBefore || "");
    if (Number.isFinite(notBefore) && notBefore > now) return "scheduled";
    if (!Number.isFinite(expiresAt)) return warehouse.bucket === "hot" ? "hot-no-expiry" : "open";
    const hours = Math.max(0, (expiresAt - now) / 3_600_000);
    if (hours <= 6) return "expiring-soon";
    if (hours <= 24) return "fresh-today";
    return "fresh";
  }

  function assetSummary(item = {}) {
    const text = hasTextDraft(item);
    const cards = hasCardAsset(item);
    const captureCount = (item.cardFactory?.storyboard?.cards || []).filter((card) => card?.type === "capture-image").length;
    return {
      text,
      cards,
      captureCount,
      cardCount: Array.isArray(item.cardFactory?.storyboard?.cards) ? item.cardFactory.storyboard.cards.length : 0,
      imagePrivacyReviewed: captureCount ? cardPrivacyPass(item) : null,
    };
  }

  function reviewSummary(item = {}) {
    const gate = item.safetyGate || {};
    return {
      research: item.researchBundle?.reviewStatus || "unreviewed",
      draft: item.draftStudio?.reviewStatus || "unreviewed",
      safety: safetyPass(item) ? "pass" : "pending",
      rights: gate.rights || "unknown",
      privacy: gate.privacy || "unknown",
      comfort: comfortBlocked(item) ? "blocked" : (item.viralReview?.decision || "unknown"),
      publishApprovalCurrent: currentApproval(item),
    };
  }

  function provenanceSnapshot(item = {}) {
    const normalized = item.discoveryNormalized || {};
    return {
      candidateId: item.id || null,
      sourceUrl: item.url || null,
      canonicalUrl: normalized.canonicalUrl || item.url || null,
      source: normalized.source || normalized.sourceId || item.sourceType || null,
      discoveryLane: normalized.lane || normalized.discoveryLane || null,
      sourceRisk: normalized.sourceRisk || item.sourceRisk || null,
      sourceAdapterStatus: normalized.adapterStatus || null,
      observedEngagement: normalized.engagementEvidence?.mode === "observed"
        ? normalized.engagementEvidence
        : null,
      capturedAt: new Date().toISOString(),
    };
  }

  function appendHistory(previous = {}, next = {}, at = new Date().toISOString()) {
    const history = normalizeHistory(previous.history);
    const fields = ["bucket", "priority", "status", "notBefore", "expiresAt", "note"];
    for (const field of fields) {
      const before = String(previous[field] ?? "");
      const after = String(next[field] ?? "");
      if (before === after) continue;
      history.push({ at, action: `set-${field}`, from: before || null, to: after || null, note: "" });
    }
    const tagFields = ["themeTags", "formatTags"];
    for (const field of tagFields) {
      const before = normalizeTags(previous[field]).join("|");
      const after = normalizeTags(next[field]).join("|");
      if (before === after) continue;
      history.push({ at, action: `set-${field}`, from: before || null, to: after || null, note: "" });
    }
    return normalizeHistory(history);
  }

  function queueEligibility(item = {}, now = Date.now()) {
    const warehouse = normalizeWarehouse(item);
    const stage = deriveStage(item);
    if (stage !== "ready") return { eligible: false, reason: stage };
    if (warehouse.status === "hold") return { eligible: false, reason: "hold" };
    const notBefore = Date.parse(warehouse.notBefore || "");
    if (Number.isFinite(notBefore) && notBefore > now) return { eligible: false, reason: "not-before" };
    const expiresAt = Date.parse(warehouse.expiresAt || "");
    if (Number.isFinite(expiresAt) && expiresAt <= now) return { eligible: false, reason: "expired" };
    return { eligible: true, reason: "ready" };
  }

  function queueScore(item = {}, now = Date.now()) {
    const warehouse = normalizeWarehouse(item);
    const eligibility = queueEligibility(item, now);
    if (!eligibility.eligible) return Number.NEGATIVE_INFINITY;
    let score = warehouse.priority * 20;
    if (warehouse.bucket === "hot") score += 60;
    if (warehouse.bucket === "ready") score += 15;
    const expiresAt = Date.parse(warehouse.expiresAt || "");
    if (Number.isFinite(expiresAt)) {
      const hours = Math.max(0, (expiresAt - now) / 3_600_000);
      score += Math.max(0, 36 - Math.min(36, hours));
    }
    const created = Date.parse(item.createdAt || "");
    if (Number.isFinite(created)) {
      const ageHours = Math.max(0, (now - created) / 3_600_000);
      score += Math.min(10, ageHours / 24);
    }
    return score;
  }

  function sortForQueue(items = [], now = Date.now()) {
    return [...items].sort((a, b) => {
      const scoreA = queueScore(a, now);
      const scoreB = queueScore(b, now);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  }

  function clampInt(value, min, max, fallback) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function validDate(value) {
    if (!value) return "";
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  window.ThreadsWarehouseModel = {
    currentApproval,
    safetyPass,
    hasTextDraft,
    hasCardAsset,
    hasProductionAsset,
    cardPrivacyPass,
    comfortBlocked,
    deriveStage,
    normalizeTags,
    normalizeHistory,
    normalizeWarehouse,
    freshnessState,
    assetSummary,
    reviewSummary,
    provenanceSnapshot,
    appendHistory,
    queueEligibility,
    queueScore,
    sortForQueue,
  };
})();
