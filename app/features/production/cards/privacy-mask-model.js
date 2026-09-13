(() => {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function normalizeRect(start = {}, end = {}, width = 1080, height = 1350) {
    const maxW = Math.max(1, Number(width) || 1080);
    const maxH = Math.max(1, Number(height) || 1350);
    const x1 = clamp(start.x, 0, maxW);
    const y1 = clamp(start.y, 0, maxH);
    const x2 = clamp(end.x, 0, maxW);
    const y2 = clamp(end.y, 0, maxH);
    const x = Math.round(Math.min(x1, x2));
    const y = Math.round(Math.min(y1, y2));
    const rectWidth = Math.round(Math.abs(x2 - x1));
    const rectHeight = Math.round(Math.abs(y2 - y1));
    return { x, y, width: rectWidth, height: rectHeight };
  }

  function usableRect(rect = {}, minimum = 4) {
    return Number(rect.width) >= minimum && Number(rect.height) >= minimum;
  }

  function normalizeIdentity(identity = {}) {
    const name = String(identity.name || "").trim();
    const type = String(identity.type || "").trim().toLowerCase();
    const size = Math.max(0, Number(identity.size) || 0);
    const lastModified = Math.max(0, Number(identity.lastModified) || 0);
    const key = name && size >= 0
      ? `${name}\u001f${size}\u001f${lastModified}\u001f${type}`
      : "";
    return { name, size, lastModified, type, key };
  }

  function fileIdentity(file = {}) {
    return normalizeIdentity({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      type: file.type,
    });
  }

  function identityMatches(review = {}, identity = {}) {
    const left = normalizeIdentity(review.imageIdentity || {});
    const right = normalizeIdentity(identity || {});
    return Boolean(left.key && right.key && left.key === right.key);
  }

  function captureIndexes(storyboard = {}) {
    return (Array.isArray(storyboard.cards) ? storyboard.cards : [])
      .map((card, index) => card?.type === "capture-image" ? index : -1)
      .filter((index) => index >= 0);
  }

  function exportGate(storyboard = {}, reviews = {}, identities = {}) {
    const indexes = captureIndexes(storyboard);
    const pending = [];
    const staleIdentity = [];
    for (const index of indexes) {
      const review = reviews?.[index];
      const identity = identities?.[index];
      if (review?.reviewed !== true) {
        pending.push(index);
        continue;
      }
      if (identity && !identityMatches(review, identity)) {
        pending.push(index);
        staleIdentity.push(index);
      }
    }
    return {
      allowed: pending.length === 0,
      captureCount: indexes.length,
      reviewedCount: indexes.length - pending.length,
      pending,
      staleIdentity,
      code: pending.length
        ? (staleIdentity.length ? "image-privacy-review-stale" : "image-privacy-review-required")
        : "image-privacy-reviewed",
    };
  }

  function exportEnvelope(storyboard = {}, reviews = {}, identities = {}) {
    const gate = exportGate(storyboard, reviews, identities);
    const masks = {};
    for (const index of captureIndexes(storyboard)) {
      const identity = normalizeIdentity(identities?.[index] || reviews?.[index]?.imageIdentity || {});
      masks[index] = {
        reviewed: reviews?.[index]?.reviewed === true,
        imageIdentity: identity,
        identityMatch: identity.key ? identityMatches(reviews?.[index], identity) : false,
        rectangleCount: (Array.isArray(reviews?.[index]?.rectangles) ? reviews[index].rectangles : [])
          .filter((rect) => usableRect(rect)).length,
        rectangles: (Array.isArray(reviews?.[index]?.rectangles) ? reviews[index].rectangles : [])
          .filter((rect) => usableRect(rect))
          .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
      };
    }
    return {
      schemaVersion: 2,
      mode: "manual-drag-rectangle",
      automatedOcrClaimed: false,
      automatedFaceDetectionClaimed: false,
      originalImageBytesPersisted: false,
      gate,
      masks,
    };
  }

  window.ThreadsCardPrivacyMaskModel = {
    clamp,
    normalizeRect,
    usableRect,
    normalizeIdentity,
    fileIdentity,
    identityMatches,
    captureIndexes,
    exportGate,
    exportEnvelope,
  };
})();
