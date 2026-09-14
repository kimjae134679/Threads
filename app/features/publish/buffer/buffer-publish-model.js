(() => {
  function isCurrentPublishApproval(item = {}) {
    const approval = item.publishApproval || {};
    return approval.status === "approved"
      && Boolean(approval.approvedAt)
      && Boolean(approval.basisUpdatedAt)
      && approval.basisUpdatedAt === item.updatedAt;
  }

  function approvedThreadsText(item = {}) {
    const manual = String(item.draftStudio?.manualEdits?.threads || "").trim();
    if (manual) return manual;
    const generated = item.draftStudio?.generated?.threads || {};
    return [generated.hook, generated.body, generated.cta]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  function textLength(item = {}) {
    return [...approvedThreadsText(item)].length;
  }

  function latestDeliveryForApproval(item = {}) {
    const basis = item.publishApproval?.basisUpdatedAt;
    if (!basis) return null;
    const rows = Array.isArray(item.bufferDeliveries) ? item.bufferDeliveries : [];
    return [...rows].reverse().find((entry) => entry.approvalBasis === basis) || null;
  }

  function buildRequest(item, mode, localDueAt = "") {
    if (!isCurrentPublishApproval(item)) throw new Error("publish_approval_not_current");
    const text = approvedThreadsText(item);
    if (!text) throw new Error("threads_draft_missing");
    if ([...text].length > 500) throw new Error("threads_text_over_500");
    const safeMode = ["addToQueue", "shareNow", "customScheduled"].includes(mode) ? mode : "addToQueue";
    const request = {
      candidate: JSON.parse(JSON.stringify(item)),
      mode: safeMode,
    };
    if (safeMode === "customScheduled") {
      const date = new Date(localDueAt);
      if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error("invalid_due_at");
      request.dueAt = date.toISOString();
    }
    return request;
  }

  function deliveryRecord(result = {}, item = {}) {
    return {
      provider: "buffer",
      platform: "threads",
      id: String(result.id || ""),
      status: String(result.status || ""),
      mode: String(result.mode || ""),
      dueAt: result.dueAt || null,
      channelId: String(result.channelId || ""),
      text: String(result.text || approvedThreadsText(item)),
      thread: Array.isArray(result.thread) ? result.thread.map(String) : [],
      approvalBasis: item.publishApproval?.basisUpdatedAt || null,
      experiment: snapshotAssignment(item.experimentAssignment),
      createdAt: result.createdAt || new Date().toISOString(),
    };
  }

  function snapshotAssignment(assignment = {}) {
    return {
      accountId: String(assignment.accountId || ""),
      hypothesisId: String(assignment.hypothesisId || ""),
      variantId: String(assignment.variantId || ""),
      goal: String(assignment.goal || ""),
      assignmentUpdatedAt: assignment.updatedAt || null,
    };
  }

  window.ThreadsBufferPublishModel = {
    isCurrentPublishApproval,
    approvedThreadsText,
    textLength,
    latestDeliveryForApproval,
    buildRequest,
    deliveryRecord,
    snapshotAssignment,
  };
})();
