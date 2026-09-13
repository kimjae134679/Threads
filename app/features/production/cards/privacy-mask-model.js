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

  function captureIndexes(storyboard = {}) {
    return (Array.isArray(storyboard.cards) ? storyboard.cards : [])
      .map((card, index) => card?.type === "capture-image" ? index : -1)
      .filter((index) => index >= 0);
  }

  function exportGate(storyboard = {}, reviews = {}) {
    const indexes = captureIndexes(storyboard);
    const pending = indexes.filter((index) => reviews?.[index]?.reviewed !== true);
    return {
      allowed: pending.length === 0,
      captureCount: indexes.length,
      reviewedCount: indexes.length - pending.length,
      pending,
      code: pending.length ? "image-privacy-review-required" : "image-privacy-reviewed",
    };
  }

  function exportEnvelope(storyboard = {}, reviews = {}) {
    const gate = exportGate(storyboard, reviews);
    const masks = {};
    for (const index of captureIndexes(storyboard)) {
      masks[index] = {
        reviewed: reviews?.[index]?.reviewed === true,
        rectangles: (Array.isArray(reviews?.[index]?.rectangles) ? reviews[index].rectangles : [])
          .filter((rect) => usableRect(rect))
          .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
      };
    }
    return {
      schemaVersion: 1,
      mode: "manual-drag-rectangle",
      automatedOcrClaimed: false,
      automatedFaceDetectionClaimed: false,
      gate,
      masks,
    };
  }

  window.ThreadsCardPrivacyMaskModel = {
    clamp,
    normalizeRect,
    usableRect,
    captureIndexes,
    exportGate,
    exportEnvelope,
  };
})();
