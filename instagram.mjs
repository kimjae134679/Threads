const MAX_CAROUSEL_ITEMS = 10;

export function getInstagramMediaCapabilities(env = process.env) {
  const token = String(env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const userId = String(env.INSTAGRAM_USER_ID || "").trim();
  const apiVersion = normalizeApiVersion(env.INSTAGRAM_GRAPH_API_VERSION);
  const requiredScopes = normalizeScopes(env.INSTAGRAM_REQUIRED_SCOPES);
  const missing = [];
  if (!token) missing.push("INSTAGRAM_ACCESS_TOKEN");
  if (!/^[0-9]+$/.test(userId)) missing.push("INSTAGRAM_USER_ID");
  if (!apiVersion) missing.push("INSTAGRAM_GRAPH_API_VERSION");
  if (!requiredScopes.length) missing.push("INSTAGRAM_REQUIRED_SCOPES");
  const configured = missing.length === 0;
  const mediaLiveEnabled = String(env.INSTAGRAM_MEDIA_LIVE_ENABLED || "") === "1";
  return {
    provider: "instagram-official",
    configured,
    mediaLiveEnabled,
    state: !configured ? "credential-required" : mediaLiveEnabled ? "ready-to-validate" : "live-disabled",
    missing,
    apiHost: "https://graph.facebook.com",
    apiVersion,
    userIdConfigured: /^[0-9]+$/.test(userId),
    requiredScopes,
    requiredScopesSource: requiredScopes.length ? "operator-configured" : "missing",
    supportedMediaTypes: ["IMAGE", "CAROUSEL"],
    maxCarouselItems: MAX_CAROUSEL_ITEMS,
    publicHttpsMediaRequired: true,
    livePublishImplemented: false,
    note: "Dry-run only. The server does not guess Graph API version or scopes and does not call Instagram publication endpoints.",
  };
}

export function buildInstagramMediaDryRun({ caption = "", mediaUrls = [], env = process.env } = {}) {
  const urls = validateInstagramMediaUrls(mediaUrls);
  const capability = getInstagramMediaCapabilities(env);
  const userPath = capability.userIdConfigured ? `/${String(env.INSTAGRAM_USER_ID).trim()}` : "/{ig-user-id}";
  const versionPrefix = capability.apiVersion ? `/${capability.apiVersion}` : "/{graph-api-version}";
  const mediaPath = `${versionPrefix}${userPath}/media`;
  const publishPath = `${versionPrefix}${userPath}/media_publish`;
  const mediaType = urls.length === 1 ? "IMAGE" : "CAROUSEL";
  const cleanCaption = String(caption || "");
  const steps = [];
  if (mediaType === "IMAGE") {
    steps.push({ action: "create-media-container", method: "POST", path: mediaPath, params: { image_url: urls[0], caption: cleanCaption } });
  } else {
    urls.forEach((imageUrl, index) => {
      steps.push({ action: "create-carousel-child", index, method: "POST", path: mediaPath, params: { image_url: imageUrl, is_carousel_item: true } });
    });
    steps.push({ action: "create-carousel-parent", method: "POST", path: mediaPath, params: { media_type: "CAROUSEL", children: "<child-container-ids>", caption: cleanCaption } });
  }
  steps.push({ action: "publish-container", method: "POST", path: publishPath, params: { creation_id: "<container-id>" } });
  return {
    dryRun: true,
    provider: "instagram-official",
    mediaType,
    mediaCount: urls.length,
    captionLength: [...cleanCaption].length,
    mediaUrls: urls,
    steps,
    capability,
    externalCalls: 0,
  };
}

export function validateInstagramMediaUrls(mediaUrls) {
  const urls = (Array.isArray(mediaUrls) ? mediaUrls : []).map((value) => String(value || "").trim()).filter(Boolean);
  if (!urls.length) throw instagramError(400, "instagram_media_url_required", "At least one public HTTPS image URL is required.");
  if (urls.length > MAX_CAROUSEL_ITEMS) throw instagramError(400, "instagram_carousel_too_many_items", `Instagram carousel dry-run accepts at most ${MAX_CAROUSEL_ITEMS} images.`);
  for (const value of urls) {
    let parsed;
    try { parsed = new URL(value); } catch { throw instagramError(400, "instagram_media_url_invalid", "A valid media URL is required."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw instagramError(400, "instagram_media_url_must_be_https", "Instagram media URLs must be public HTTPS URLs without embedded credentials.");
  }
  return urls;
}

function normalizeApiVersion(value) {
  const text = String(value || "").trim();
  return /^v\d+\.\d+$/.test(text) ? text : null;
}

function normalizeScopes(value) {
  return [...new Set(String(value || "").split(/[\s,]+/).map((entry) => entry.trim()).filter(Boolean))];
}

function instagramError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
