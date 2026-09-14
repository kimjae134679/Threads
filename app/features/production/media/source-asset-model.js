(() => {
  const ACQUISITION_MODES = Object.freeze(["official-api", "public-source-page", "manual-capture", "metadata-only"]);
  const STATES = Object.freeze([
    "DISCOVERED",
    "SOURCE_VERIFIED",
    "ASSETS_PENDING",
    "ASSETS_CAPTURED",
    "RIGHTS_REVIEW",
    "PRIVACY_REVIEW",
    "RENDER_READY",
    "RENDERED",
    "HUMAN_APPROVED",
    "PUBLISH_READY",
  ]);

  function normalizeAsset(asset = {}) {
    const mode = ACQUISITION_MODES.includes(asset.acquisitionMode) ? asset.acquisitionMode : "metadata-only";
    return {
      id: String(asset.id || "").trim(),
      sourceUrl: String(asset.sourceUrl || "").trim(),
      mediaUrl: String(asset.mediaUrl || "").trim(),
      acquisitionMode: mode,
      mimeType: String(asset.mimeType || "").trim(),
      width: finite(asset.width),
      height: finite(asset.height),
      rightsState: oneOf(asset.rightsState, ["unknown", "review", "cleared", "blocked"], "unknown"),
      privacyState: oneOf(asset.privacyState, ["unknown", "review", "clear", "masked", "blocked"], "unknown"),
      humanSelected: Boolean(asset.humanSelected),
    };
  }

  function productionState(input = {}) {
    const sourceVerified = Boolean(input.sourceVerified);
    const assets = (input.assets || []).map(normalizeAsset).filter((asset) => asset.id || asset.sourceUrl || asset.mediaUrl);
    if (!sourceVerified) return gate("DISCOVERED", false, ["source_verification_required"]);
    if (!assets.length || assets.every((asset) => asset.acquisitionMode === "metadata-only" || !asset.mediaUrl)) {
      return gate("ASSETS_PENDING", false, ["source_asset_required"]);
    }
    if (assets.some((asset) => asset.rightsState === "blocked")) return gate("RIGHTS_REVIEW", false, ["rights_blocked"]);
    if (assets.some((asset) => asset.rightsState !== "cleared")) return gate("RIGHTS_REVIEW", false, ["rights_review_required"]);
    if (assets.some((asset) => asset.privacyState === "blocked")) return gate("PRIVACY_REVIEW", false, ["privacy_blocked"]);
    if (assets.some((asset) => !["clear", "masked"].includes(asset.privacyState))) return gate("PRIVACY_REVIEW", false, ["privacy_review_required"]);
    if (!assets.some((asset) => asset.humanSelected)) return gate("RENDER_READY", false, ["asset_selection_required"]);
    if (!input.rendered) return gate("RENDER_READY", true, []);
    if (!input.humanApproved) return gate("RENDERED", false, ["human_approval_required"]);
    if (!input.approvalCurrent) return gate("HUMAN_APPROVED", false, ["approval_stale"]);
    return gate("PUBLISH_READY", true, []);
  }

  function gate(state, allowed, reasons) {
    return { state, allowed: Boolean(allowed), reasons: [...new Set(reasons || [])] };
  }

  function finite(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  window.ThreadsSourceAssetModel = { ACQUISITION_MODES, STATES, normalizeAsset, productionState };
})();
