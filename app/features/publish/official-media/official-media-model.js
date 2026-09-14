(() => {
  const HTTPS_RE = /^https:\/\//i;

  function capabilityState(connector = {}) {
    if (!connector.configured) return "credential-required";
    if (!connector.mediaLiveEnabled) return "live-disabled";
    return "ready-to-validate";
  }

  function normalizeUrls(value) {
    const rows = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
    return rows.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  function validate(mediaUrls, connector = {}) {
    const urls = normalizeUrls(mediaUrls);
    const errors = [];
    if (!urls.length) errors.push("media_url_required");
    if (urls.length > 20) errors.push("carousel_too_many_items");
    for (const url of urls) if (!HTTPS_RE.test(url)) errors.push("media_url_must_be_https");
    const mediaType = urls.length === 1 ? "IMAGE" : urls.length >= 2 ? "CAROUSEL" : null;
    return {
      ok: errors.length === 0,
      errors: [...new Set(errors)],
      mediaType,
      mediaCount: urls.length,
      mediaUrls: urls,
      capabilityState: capabilityState(connector),
    };
  }

  window.ThreadsOfficialMediaModel = { capabilityState, normalizeUrls, validate };
})();