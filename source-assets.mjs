const MAX_SOURCE_ASSET_BYTES = 10 * 1024 * 1024;
const SUPPORTED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_HOSTS = new Set([
  "i.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
  "i.ytimg.com",
  "img.youtube.com",
  "pbs.twimg.com",
  "media.tenor.com",
]);
const ALLOWED_SUFFIXES = [".cdninstagram.com", ".fbcdn.net", ".redd.it", ".ytimg.com"];

export function getSourceAssetCapabilities() {
  return {
    mode: "explicit-direct-media-only",
    pageScraping: false,
    bulkCrawling: false,
    generatedImagesDefault: false,
    maxBytes: MAX_SOURCE_ASSET_BYTES,
    allowedHosts: [...ALLOWED_HOSTS],
    allowedHostSuffixes: [...ALLOWED_SUFFIXES],
    supportedContentTypes: [...SUPPORTED_CONTENT_TYPES],
    note: "Fetches only an explicitly supplied direct public media URL from an allowlisted CDN. It does not crawl a post page or bypass access controls.",
  };
}

export function validateSourceAssetUrl(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch (_) { return { ok: false, error: "invalid_url" }; }
  if (url.protocol !== "https:") return { ok: false, error: "https_required" };
  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.has(host) || ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
  if (!allowed) return { ok: false, error: "host_not_allowlisted", host };
  if (url.username || url.password) return { ok: false, error: "credentials_in_url_forbidden" };
  return { ok: true, url: url.href, host };
}

export async function fetchSourceAsset(value, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  let checked = validateSourceAssetUrl(value);
  if (!checked.ok) throw sourceAssetError(400, checked.error, `Source asset URL rejected: ${checked.error}`);
  let current = checked.url;
  for (let hop = 0; hop < 4; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.2", "user-agent": "Threads-AI-Content-Lab/0.35 source-asset-proxy" },
        signal: controller.signal,
      });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw sourceAssetError(502, "source_asset_redirect_missing", "Source asset redirect had no Location header.");
      const next = new URL(location, current).href;
      checked = validateSourceAssetUrl(next);
      if (!checked.ok) throw sourceAssetError(400, "source_asset_redirect_blocked", `Redirect target rejected: ${checked.error}`);
      current = checked.url;
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) throw sourceAssetError(502, "source_asset_upstream_error", `Source asset returned HTTP ${response.status}.`);

    const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) throw sourceAssetError(415, "source_asset_not_supported_image", `Unsupported image content type: ${contentType || "unknown"}.`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (Number.isFinite(declared) && declared > MAX_SOURCE_ASSET_BYTES) throw sourceAssetError(413, "source_asset_too_large", "Source asset exceeds 10 MB.");
    const data = await readBoundedImage(response, controller.signal);
    if (data.length > MAX_SOURCE_ASSET_BYTES) throw sourceAssetError(413, "source_asset_too_large", "Source asset exceeds 10 MB.");
    return { data, contentType, sourceUrl: String(value), finalUrl: current, bytes: data.length };
    } catch (error) {
      if (error?.status) throw error;
      if (controller.signal.aborted || error?.name === "AbortError") throw sourceAssetError(504, "source_asset_timeout", "Source asset request timed out.");
      throw sourceAssetError(502, "source_asset_fetch_failed", String(error?.message || error));
    } finally {
      clearTimeout(timeout);
      if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {});
    }
  }
  throw sourceAssetError(508, "source_asset_redirect_loop", "Too many source asset redirects.");
}

async function readBoundedImage(response, signal) {
  if (!response.body) throw sourceAssetError(502, "source_asset_empty", "Source asset has no image body.");
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw sourceAssetError(504, "source_asset_timeout", "Source asset body timed out.");
      const { done, value } = await reader.read();
      if (signal.aborted) throw sourceAssetError(504, "source_asset_timeout", "Source asset body timed out.");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_SOURCE_ASSET_BYTES) throw sourceAssetError(413, "source_asset_too_large", "Source asset exceeds 10 MB.");
      chunks.push(Buffer.from(value));
    }
    if (!bytes) throw sourceAssetError(502, "source_asset_empty", "Source asset is empty.");
    return Buffer.concat(chunks, bytes);
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function sourceAssetError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
