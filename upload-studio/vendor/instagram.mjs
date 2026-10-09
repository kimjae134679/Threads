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
  const validationEnabled = String(env.INSTAGRAM_MEDIA_VALIDATION_ENABLED || "") === "1";
  return {
    provider: "instagram-official",
    configured,
    mediaLiveEnabled,
    state: !configured ? "credential-required" : validationEnabled ? "ready-to-validate" : "live-disabled",
    validationEnabled,
    validationState: !configured ? "credential-required" : validationEnabled ? "ready-to-validate" : "live-disabled",
    missing,
    apiHost: "https://graph.facebook.com",
    apiVersion,
    userIdConfigured: /^[0-9]+$/.test(userId),
    requiredScopes,
    requiredScopesSource: requiredScopes.length ? "operator-configured" : "missing",
    supportedMediaTypes: ["IMAGE", "CAROUSEL"],
    maxCarouselItems: MAX_CAROUSEL_ITEMS,
    publicHttpsMediaRequired: true,
    providerContainerValidationImplemented: true,
    livePublishImplemented: false,
    note: "Dry-run is always non-networked. Optional provider validation can create media containers only when explicitly enabled; media_publish is never called by this adapter.",
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

export async function validateInstagramMediaContainers({ caption = "", mediaUrls = [], env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const capability = getInstagramMediaCapabilities(env);
  if (!capability.configured) throw instagramError(503, "instagram_credentials_required", "Instagram provider validation requires operator-supplied credentials, user id, API version, and scopes.");
  if (!capability.validationEnabled) throw instagramError(503, "instagram_validation_disabled", "Instagram provider container validation is disabled.");
  if (typeof fetchImpl !== "function") throw instagramError(500, "instagram_fetch_unavailable", "Provider validation fetch implementation is unavailable.");
  const urls = validateInstagramMediaUrls(mediaUrls);
  const cleanCaption = String(caption || "");
  const endpoint = `${capability.apiHost}/${capability.apiVersion}/${String(env.INSTAGRAM_USER_ID).trim()}/media`;
  const token = String(env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const calls = [];
  const childIds = [];
  const postContainer = async (params, action) => {
    const body = new URLSearchParams({ ...params, access_token: token });
    const response = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    calls.push({ action, method: "POST", path: new URL(endpoint).pathname, status: Number(response?.status || 0) });
    const payload = await safeProviderJson(response);
    if (!response?.ok || !payload?.id) throw providerError(response?.status, payload);
    return String(payload.id);
  };
  let containerId;
  const mediaType = urls.length === 1 ? "IMAGE" : "CAROUSEL";
  if (mediaType === "IMAGE") {
    containerId = await postContainer({ image_url: urls[0], caption: cleanCaption }, "create-media-container");
  } else {
    for (let index = 0; index < urls.length; index += 1) {
      childIds.push(await postContainer({ image_url: urls[index], is_carousel_item: "true" }, "create-carousel-child"));
    }
    containerId = await postContainer({ media_type: "CAROUSEL", children: childIds.join(","), caption: cleanCaption }, "create-carousel-parent");
  }
  return {
    provider: "instagram-official",
    validation: "container-created",
    mediaType,
    mediaCount: urls.length,
    containerId,
    childContainerIds: childIds,
    externalCalls: calls.length,
    calls,
    providerContainerCreationObserved: true,
    providerMediaProcessingVerified: false,
    providerMediaFetchFullyVerified: false,
    livePublicationAttempted: false,
    mediaPublishEndpointCalled: false,
    publicationOwner: "04_REVIEW_PUBLISH",
  };
}

async function safeProviderJson(response) {
  try { return await response.json(); } catch { return {}; }
}

function providerError(status, payload) {
  const upstream = payload?.error || {};
  const error = instagramError(502, "instagram_provider_validation_failed", "Instagram container validation failed at the official provider boundary.");
  error.upstreamStatus = Number(status || 0) || undefined;
  error.upstreamCode = Number.isFinite(Number(upstream.code)) ? Number(upstream.code) : undefined;
  error.upstreamSubcode = Number.isFinite(Number(upstream.error_subcode)) ? Number(upstream.error_subcode) : undefined;
  return error;
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
