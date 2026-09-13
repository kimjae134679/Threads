(() => {
  const OUTCOMES = Object.freeze({
    APPROVE: "approve",
    HOLD: "hold",
    REJECT: "reject",
  });

  function ruleMap(viralModel = window.ThreadsViralModel) {
    return new Map((viralModel?.comfortRules || []).map((rule) => [rule.id, rule]));
  }

  function categoryLabel(id, viralModel = window.ThreadsViralModel) {
    return ruleMap(viralModel).get(id)?.label || id || "unknown";
  }

  function categorySeverity(id, viralModel = window.ThreadsViralModel) {
    return ruleMap(viralModel).get(id)?.severity || "review";
  }

  function scan(item, viralModel = window.ThreadsViralModel) {
    if (!viralModel?.comfortScan) return {
      score: 0,
      blocked: false,
      level: "comfortable",
      categories: [],
      blockReasons: [],
      reviewReasons: [],
    };
    return viralModel.comfortScan(item);
  }

  function reasonRows(item, viralModel = window.ThreadsViralModel) {
    return scan(item, viralModel).categories.map((entry) => ({
      id: entry.id,
      label: entry.label || categoryLabel(entry.id, viralModel),
      severity: entry.severity || categorySeverity(entry.id, viralModel),
      hitCount: Array.isArray(entry.hits) ? entry.hits.length : 0,
    }));
  }

  function mayHumanApprove(item, viralModel = window.ThreadsViralModel) {
    const result = scan(item, viralModel);
    return !result.blocked && result.level === "review";
  }

  function appendAudit(item, outcome, note = "", options = {}) {
    const viralModel = options.viralModel || window.ThreadsViralModel;
    const result = scan(item, viralModel);
    const normalizedOutcome = String(outcome || "").toLowerCase();
    if (!Object.values(OUTCOMES).includes(normalizedOutcome)) throw new Error("invalid_comfort_review_outcome");
    if (result.blocked && normalizedOutcome === OUTCOMES.APPROVE) throw new Error("blocked_comfort_cannot_be_human_approved");

    const entry = {
      outcome: normalizedOutcome,
      note: String(note || "").trim(),
      reviewedAt: options.reviewedAt || new Date().toISOString(),
      reviewer: options.reviewer || null,
      reviewSource: options.reviewSource || "human-ui",
      comfortLevelAtReview: result.level,
      comfortScoreAtReview: result.score,
      categoriesAtReview: result.categories.map((category) => category.id),
      blockReasonsAtReview: [...result.blockReasons],
      reviewReasonsAtReview: [...result.reviewReasons],
    };

    const previous = Array.isArray(item?.comfortReview?.audit) ? item.comfortReview.audit : [];
    return {
      ...(item.comfortReview || {}),
      outcome: normalizedOutcome,
      note: entry.note,
      reviewedAt: entry.reviewedAt,
      reviewer: entry.reviewer,
      reviewSource: entry.reviewSource,
      audit: [...previous, entry],
    };
  }

  function matches(item, filters = {}, viralModel = window.ThreadsViralModel) {
    const result = scan(item, viralModel);
    const level = filters.level || "all";
    const category = filters.category || "all";
    if (level !== "all" && result.level !== level) return false;
    if (category !== "all" && !result.categories.some((entry) => entry.id === category)) return false;
    return true;
  }

  function safeBatchDisposition(items = [], disposition, filters = {}, viralModel = window.ThreadsViralModel) {
    const changed = [];
    const skipped = [];
    for (const item of items) {
      if (!matches(item, filters, viralModel)) continue;
      const result = scan(item, viralModel);
      if (disposition === "hold") {
        if (result.blocked) {
          skipped.push({ id: item.id, reason: "blocked" });
          continue;
        }
        item.status = "inbox";
        item.comfortBatchDisposition = { action: "hold", appliedAt: new Date().toISOString() };
        changed.push(item.id);
      } else if (disposition === "skip-blocked") {
        if (!result.blocked) {
          skipped.push({ id: item.id, reason: "not-blocked" });
          continue;
        }
        item.status = "skip";
        item.comfortBatchDisposition = { action: "skip-blocked", appliedAt: new Date().toISOString() };
        changed.push(item.id);
      }
    }
    return { changed, skipped };
  }

  window.ThreadsComfortReviewModel = {
    OUTCOMES,
    categoryLabel,
    categorySeverity,
    scan,
    reasonRows,
    mayHumanApprove,
    appendAudit,
    matches,
    safeBatchDisposition,
  };
})();
