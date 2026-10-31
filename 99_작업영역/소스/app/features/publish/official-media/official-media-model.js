(() => {
  const HTTPS_RE = /^https:\/\//i;
  const TARGETS = Object.freeze({
    "threads-feed": Object.freeze({ provider: "threads", outputProfile: "reference-square", mediaKind: "image-carousel", maxItems: 20, implementation: "current" }),
    "instagram-feed": Object.freeze({ provider: "instagram", outputProfile: "reference-square", mediaKind: "image-carousel", maxItems: 10, implementation: "connector-required" }),
    "instagram-reel": Object.freeze({ provider: "instagram", outputProfile: "vertical-video", mediaKind: "video", maxItems: 1, implementation: "planned", renderImplementation: "ffmpeg-local", width: 1080, height: 1920, container: "mp4" }),
    "youtube-short": Object.freeze({ provider: "youtube", outputProfile: "vertical-video", mediaKind: "video", maxItems: 1, implementation: "planned", renderImplementation: "ffmpeg-local", width: 1080, height: 1920, container: "mp4" }),
  });

  function capabilityState(connector = {}) {
    if (!connector.configured) return "credential-required";
    if (!connector.mediaLiveEnabled) return "live-disabled";
    return "ready-to-validate";
  }

  function targetCapability(targetId, connector = {}) {
    const target = TARGETS[targetId];
    if (!target) return "unsupported";
    if (target.implementation === "planned") return "unsupported";
    return capabilityState(connector);
  }

  function targetSpec(targetId) {
    const target = TARGETS[targetId];
    return target ? { ...target } : null;
  }

  function normalizeUrls(value) {
    const rows = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
    return rows.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  function validate(mediaUrls, connector = {}) {
    return validateTarget("threads-feed", mediaUrls, connector);
  }

  function validateTarget(targetId, mediaUrls, connector = {}) {
    const target = TARGETS[targetId];
    const urls = normalizeUrls(mediaUrls);
    const errors = [];
    if (!target) errors.push("unsupported_target");
    if (!urls.length) errors.push("media_url_required");
    if (target && urls.length > target.maxItems) errors.push("too_many_items_for_target");
    for (const url of urls) if (!HTTPS_RE.test(url)) errors.push("media_url_must_be_https");
    if (target?.mediaKind === "video" && urls.length !== 1) errors.push("single_video_required");

    const mediaType = target?.mediaKind === "video"
      ? "VIDEO"
      : urls.length === 1
        ? "IMAGE"
        : urls.length >= 2
          ? "CAROUSEL"
          : null;

    return {
      ok: errors.length === 0,
      errors: [...new Set(errors)],
      targetId,
      target: target ? { ...target } : null,
      mediaType,
      mediaCount: urls.length,
      mediaUrls: urls,
      capabilityState: targetCapability(targetId, connector),
      renderImplementation: target?.renderImplementation || null,
      livePublishImplemented: target?.implementation === "current",
    };
  }

  window.ThreadsOfficialMediaModel = {
    TARGETS,
    capabilityState,
    targetCapability,
    targetSpec,
    normalizeUrls,
    validate,
    validateTarget,
  };
})();
