(() => {
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

  function comfortBlocked(item = {}) {
    return item.viralReview?.decision === "BLOCK" || Number(item.viralReview?.comfortScore) < 60;
  }

  function deriveStage(item = {}) {
    if (comfortBlocked(item)) return "blocked";
    if (!hasProductionAsset(item)) return "not-produced";
    if (!safetyPass(item)) return "review";
    if (!currentApproval(item)) return "approval";
    return "ready";
  }

  function normalizeWarehouse(item = {}) {
    const value = item.warehouse || {};
    return {
      bucket: value.bucket === "hot" ? "hot" : "evergreen",
      priority: clampInt(value.priority, 1, 5, 3),
      status: value.status === "hold" ? "hold" : "active",
      notBefore: validDate(value.notBefore),
      expiresAt: validDate(value.expiresAt),
      note: String(value.note || ""),
      updatedAt: value.updatedAt || null,
    };
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
    comfortBlocked,
    deriveStage,
    normalizeWarehouse,
    queueEligibility,
    queueScore,
    sortForQueue,
  };
})();
