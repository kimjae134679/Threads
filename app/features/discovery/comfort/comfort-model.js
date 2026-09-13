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

  function scanSignature(input) {
    const result = input?.level && Array.isArray(input?.categories) ? input : scan(input);
    return JSON.stringify({
      level: result.level,
      score: result.score,
      blocked: Boolean(result.blocked),
      categories: result.categories.map((entry) => entry.id).sort(),
      blockReasons: [...result.blockReasons].sort(),
      reviewReasons: [...result.reviewReasons].sort(),
    });
  }

  function reasonRows(item, viralModel = window.ThreadsViralModel) {
    return scan(item, viralModel).categories.map((entry) => ({
      id: entry.id,
      label: entry.label || categoryLabel(entry.id, viralModel),
      severity: entry.severity || categorySeverity(entry.id, viralModel),
      hitCount: Array.isArray(entry.hits) ? entry.hits.length : 0,
    }));
  }

  function latestAudit(item) {
    const audit = Array.isArray(item?.comfortReview?.audit) ? item.comfortReview.audit : [];
    return audit.length ? audit[audit.length - 1] : null;
  }

  function mayHumanApprove(item, viralModel = window.ThreadsViralModel) {
    const result = scan(item, viralModel);
    return !result.blocked && result.level === "review";
  }

  function clearanceStatus(item, viralModel = window.ThreadsViralModel) {
    const result = scan(item, viralModel);
    const currentSignature = scanSignature(result);
    if (result.blocked) {
      return { allowed: false, code: "blocked", label: "자동 BLOCK", scan: result, currentSignature, audit: latestAudit(item) };
    }
    if (result.level === "comfortable") {
      return { allowed: true, code: "comfortable", label: "Comfort 통과", scan: result, currentSignature, audit: latestAudit(item) };
    }
    const audit = latestAudit(item);
    const approved = audit?.outcome === OUTCOMES.APPROVE;
    const sameScan = Boolean(audit?.scanSignatureAtReview) && audit.scanSignatureAtReview === currentSignature;
    if (approved && sameScan) {
      return { allowed: true, code: "human-cleared-review", label: "REVIEW 사람 승인", scan: result, currentSignature, audit };
    }
    if (approved && !sameScan) {
      return { allowed: false, code: "stale-human-review", label: "REVIEW 재검토 필요", scan: result, currentSignature, audit };
    }
    return { allowed: false, code: "review-needs-human-clearance", label: "REVIEW 사람 승인 필요", scan: result, currentSignature, audit };
  }

  function mayAdvance(item, target = "ready", viralModel = window.ThreadsViralModel) {
    const clearance = clearanceStatus(item, viralModel);
    if (target === "research") return { ...clearance, allowed: !clearance.scan.blocked };
    if (["ready", "editorial", "production"].includes(target)) return clearance;
    return clearance;
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
      scanSignatureAtReview: scanSignature(result),
    };

    const previous = Array.isArray(item?.comfortReview?.audit) ? item.comfortReview.audit : [];
    const humanClearedReview = normalizedOutcome === OUTCOMES.APPROVE && result.level === "review" && !result.blocked;
    return {
      ...(item.comfortReview || {}),
      outcome: normalizedOutcome,
      note: entry.note,
      reviewedAt: entry.reviewedAt,
      reviewer: entry.reviewer,
      reviewSource: entry.reviewSource,
      humanClearedReview,
      humanClearanceSignature: humanClearedReview ? entry.scanSignatureAtReview : null,
      audit: [...previous, entry],
    };
  }

  function exportEnvelope(item, viralModel = window.ThreadsViralModel) {
    const result = scan(item, viralModel);
    const clearance = clearanceStatus(item, viralModel);
    return {
      candidateId: item?.id || null,
      title: item?.title || "",
      latestScan: {
        level: result.level,
        score: result.score,
        blocked: result.blocked,
        categories: result.categories.map((entry) => ({ id: entry.id, label: entry.label, severity: entry.severity })),
        blockReasons: [...result.blockReasons],
        reviewReasons: [...result.reviewReasons],
        scanSignature: clearance.currentSignature,
      },
      clearance: {
        allowed: clearance.allowed,
        code: clearance.code,
        label: clearance.label,
      },
      audit: Array.isArray(item?.comfortReview?.audit) ? item.comfortReview.audit.map((entry) => ({ ...entry })) : [],
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
        item.comfortReview = { ...(item.comfortReview || {}), humanClearedReview: false, humanClearanceSignature: null };
        item.comfortBatchDisposition = { action: "hold", appliedAt: new Date().toISOString() };
        changed.push(item.id);
      } else if (disposition === "skip-blocked") {
        if (!result.blocked) {
          skipped.push({ id: item.id, reason: "not-blocked" });
          continue;
        }
        item.status = "skip";
        item.comfortReview = { ...(item.comfortReview || {}), humanClearedReview: false, humanClearanceSignature: null };
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
    scanSignature,
    reasonRows,
    latestAudit,
    mayHumanApprove,
    clearanceStatus,
    mayAdvance,
    appendAudit,
    exportEnvelope,
    matches,
    safeBatchDisposition,
  };
})();
