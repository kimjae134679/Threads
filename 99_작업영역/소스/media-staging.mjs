import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_ASSETS = 10;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MIME_TO_EXT = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);
const EXT_TO_MIME = new Map([...MIME_TO_EXT].map(([mime, ext]) => [ext, mime]));
const STAGED_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

export function getMediaStagingCapabilities(env = process.env) {
  const publicBaseUrl = normalizePublicBaseUrl(env.PUBLIC_MEDIA_BASE_URL);
  const enabled = String(env.MEDIA_STAGING_ENABLED || "") === "1";
  return {
    provider: "local-bounded-staging",
    enabled,
    publicBaseUrl,
    state: !publicBaseUrl ? "public-origin-required" : enabled ? "ready-to-validate" : "live-disabled",
    maxAssets: MAX_ASSETS,
    maxAssetBytes: MAX_ASSET_BYTES,
    supportedMimeTypes: [...MIME_TO_EXT.keys()],
    arbitraryFilesystemPathsAccepted: false,
    plaintextSecretsRequired: false,
    approvalBindingRequired: true,
    externalReachabilityVerified: false,
    note: "A configured HTTPS public origin only creates provider-fetchable URL candidates. External reachability is not claimed until an official provider actually validates/fetches them.",
  };
}

export async function stageRenderedMedia({ candidateId, approvalBasis, assets, rootDir, env = process.env } = {}) {
  const capability = getMediaStagingCapabilities(env);
  if (capability.state !== "ready-to-validate") {
    throw stagingError(503, "media_staging_not_ready", `Media staging is ${capability.state}.`);
  }
  const safeCandidateId = normalizeCandidateId(candidateId);
  const safeApprovalBasis = normalizeApprovalBasis(approvalBasis);
  const rows = Array.isArray(assets) ? assets : [];
  if (!rows.length) throw stagingError(400, "staging_asset_required", "At least one rendered image is required.");
  if (rows.length > MAX_ASSETS) throw stagingError(400, "staging_asset_limit", `At most ${MAX_ASSETS} rendered images may be staged.`);
  const dir = path.resolve(rootDir || path.join(process.cwd(), "data", "runtime", "media-staging"));
  await fs.mkdir(dir, { recursive: true });
  const staged = [];
  const createdPaths = [];
  try {
    for (let index = 0; index < rows.length; index += 1) {
      const decoded = decodeImageDataUrl(rows[index]?.dataUrl);
      const id = `${randomUUID()}.${decoded.ext}`;
      const target = path.join(dir, id);
      const metadataPath = path.join(dir, metadataName(id));
      const metadata = {
        schemaVersion: 1,
        id,
        candidateId: safeCandidateId,
        approvalBasis: safeApprovalBasis,
        index,
        contentType: decoded.contentType,
        bytes: decoded.data.length,
        stagedAt: new Date().toISOString(),
      };
      await fs.writeFile(target, decoded.data, { mode: 0o600, flag: "wx" });
      createdPaths.push(target);
      await fs.writeFile(metadataPath, `${JSON.stringify(metadata)}\n`, { mode: 0o600, flag: "wx" });
      createdPaths.push(metadataPath);
      staged.push({
        id,
        index,
        contentType: decoded.contentType,
        bytes: decoded.data.length,
        url: new URL(`/media/staged/${id}`, capability.publicBaseUrl).toString(),
        candidateId: safeCandidateId,
        approvalBasis: safeApprovalBasis,
      });
    }
  } catch (error) {
    await Promise.allSettled(createdPaths.map((filePath) => fs.rm(filePath, { force: true })));
    throw error;
  }
  return {
    state: "staged-unverified",
    publicBaseUrl: capability.publicBaseUrl,
    approvalBound: true,
    externalReachabilityVerified: false,
    assets: staged,
  };
}

export async function readStagedMedia(id, { rootDir } = {}) {
  const safeId = normalizeStagedId(id);
  const dir = path.resolve(rootDir || path.join(process.cwd(), "data", "runtime", "media-staging"));
  try {
    const [data, metadataText] = await Promise.all([
      fs.readFile(path.join(dir, safeId)),
      fs.readFile(path.join(dir, metadataName(safeId)), "utf8"),
    ]);
    const metadata = parseMetadata(metadataText, safeId);
    const ext = safeId.slice(safeId.lastIndexOf(".") + 1).toLowerCase();
    const contentType = EXT_TO_MIME.get(ext);
    if (metadata.contentType !== contentType || metadata.bytes !== data.length) {
      throw stagingError(409, "staged_media_metadata_mismatch", "Staged media metadata no longer matches the stored asset.");
    }
    return { id: safeId, contentType, data, metadata };
  } catch (error) {
    if (error?.code === "ENOENT") throw stagingError(404, "staged_media_not_found", "Staged media or its approval metadata was not found.");
    throw error;
  }
}

export function assertStagedMediaUrls(urls, env = process.env) {
  const base = normalizePublicBaseUrl(env.PUBLIC_MEDIA_BASE_URL);
  if (!base) throw stagingError(503, "public_media_origin_required", "PUBLIC_MEDIA_BASE_URL must be a public HTTPS origin.");
  const origin = new URL(base).origin;
  const rows = Array.isArray(urls) ? urls : [];
  if (!rows.length) throw stagingError(400, "staged_media_url_required", "At least one staged media URL is required.");
  for (const value of rows) {
    let parsed;
    try { parsed = new URL(String(value || "")); } catch { throw stagingError(400, "staged_media_url_invalid", "Invalid staged media URL."); }
    if (parsed.origin !== origin || !parsed.pathname.startsWith("/media/staged/")) {
      throw stagingError(400, "staged_media_origin_mismatch", "Instagram dry-run only accepts URLs from the configured staging origin.");
    }
    normalizeStagedId(parsed.pathname.slice("/media/staged/".length));
    if (parsed.search || parsed.hash) throw stagingError(400, "staged_media_url_invalid", "Staged media URLs cannot contain query or fragment values.");
  }
  return rows.map((value) => String(value));
}

export async function assertStagedMediaForCandidate(urls, { candidateId, approvalBasis, rootDir, env = process.env } = {}) {
  const safeCandidateId = normalizeCandidateId(candidateId);
  const safeApprovalBasis = normalizeApprovalBasis(approvalBasis);
  const normalized = assertStagedMediaUrls(urls, env);
  for (const value of normalized) {
    const parsed = new URL(value);
    const id = normalizeStagedId(parsed.pathname.slice("/media/staged/".length));
    const asset = await readStagedMedia(id, { rootDir });
    if (asset.metadata.candidateId !== safeCandidateId) {
      throw stagingError(409, "staged_media_candidate_mismatch", "Staged media belongs to a different candidate.");
    }
    if (asset.metadata.approvalBasis !== safeApprovalBasis) {
      throw stagingError(409, "staged_media_approval_stale", "Staged media was created for an older approval revision. Restage the current approved render.");
    }
  }
  return normalized;
}

function parseMetadata(value, expectedId) {
  let metadata;
  try { metadata = JSON.parse(String(value || "")); } catch { throw stagingError(409, "staged_media_metadata_invalid", "Staged media approval metadata is invalid."); }
  if (metadata?.schemaVersion !== 1 || metadata?.id !== expectedId) throw stagingError(409, "staged_media_metadata_invalid", "Staged media approval metadata is invalid.");
  return {
    schemaVersion: 1,
    id: expectedId,
    candidateId: normalizeCandidateId(metadata.candidateId),
    approvalBasis: normalizeApprovalBasis(metadata.approvalBasis),
    index: Number(metadata.index),
    contentType: String(metadata.contentType || ""),
    bytes: Number(metadata.bytes),
    stagedAt: String(metadata.stagedAt || ""),
  };
}

function metadataName(id) {
  return `${normalizeStagedId(id)}.meta.json`;
}

function decodeImageDataUrl(value) {
  const text = String(value || "");
  const match = text.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw stagingError(400, "staging_asset_data_url_invalid", "Rendered media must be a PNG, JPEG, or WebP base64 data URL.");
  const contentType = match[1].toLowerCase();
  const data = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  if (!data.length) throw stagingError(400, "staging_asset_empty", "Rendered media is empty.");
  if (data.length > MAX_ASSET_BYTES) throw stagingError(413, "staging_asset_too_large", `Rendered media exceeds ${MAX_ASSET_BYTES} bytes.`);
  return { contentType, ext: MIME_TO_EXT.get(contentType), data };
}

function normalizeCandidateId(value) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(text)) throw stagingError(400, "staging_candidate_id_invalid", "A bounded candidate id is required.");
  return text;
}

function normalizeApprovalBasis(value) {
  const text = String(value || "").trim();
  if (!text || !Number.isFinite(Date.parse(text))) throw stagingError(400, "staging_approval_basis_invalid", "A valid current approval basis timestamp is required.");
  return text;
}

function normalizeStagedId(value) {
  const text = String(value || "").trim();
  if (!STAGED_FILE_RE.test(text)) throw stagingError(400, "staged_media_id_invalid", "Invalid staged media id.");
  return text;
}

function normalizePublicBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    if (!isPublicHostname(parsed.hostname)) return null;
    return `${parsed.origin}/`;
  } catch {
    return null;
  }
}

function isPublicHostname(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host === "::1" || host.endsWith(".local")) return false;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return false;
  if (host === "0.0.0.0") return false;
  return host.includes(".") || host.includes(":");
}

function stagingError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
