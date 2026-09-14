import path from "node:path";
import { getMediaStagingCapabilities, stageRenderedMedia, readStagedMedia, assertStagedMediaUrls } from "./media-staging.mjs";
import { getInstagramMediaCapabilities, buildInstagramMediaDryRun } from "./instagram.mjs";

const DEFAULT_STAGING_ROOT = path.join(process.cwd(), "data", "runtime", "media-staging");
const STAGED_PATH_PREFIX = "/media/staged/";

export function getMediaConnectorSnapshot(env = process.env) {
  return {
    mediaStaging: getMediaStagingCapabilities(env),
    instagramMedia: getInstagramMediaCapabilities(env),
  };
}

export async function handleMediaPublishRoute({ req, res, url, env = process.env, stagingRoot = DEFAULT_STAGING_ROOT, readJsonBody, validateApprovedCandidate, approvedCaption } = {}) {
  if (!req || !res || !url) return false;

  if (url.pathname === "/api/media-staging/capabilities") {
    requireMethod(req, "GET");
    return sendJson(res, 200, { ok: true, capability: getMediaStagingCapabilities(env) });
  }

  if (url.pathname === "/api/instagram/media/capabilities") {
    requireMethod(req, "GET");
    return sendJson(res, 200, { ok: true, capability: getInstagramMediaCapabilities(env) });
  }

  if (url.pathname === "/api/media-staging/stage") {
    requireMethod(req, "POST");
    requireFunction(readJsonBody, "readJsonBody");
    requireFunction(validateApprovedCandidate, "validateApprovedCandidate");
    const body = await readJsonBody(req, 24 * 1024 * 1024);
    const candidate = body?.candidate || {};
    validateApprovedCandidate(candidate);
    const approvalBasis = String(candidate.publishApproval?.basisUpdatedAt || "").trim();
    const staged = await stageRenderedMedia({
      candidateId: candidate.id,
      approvalBasis,
      assets: body?.assets || [],
      rootDir: stagingRoot,
      env,
    });
    return sendJson(res, 200, { ok: true, staged, auditedAt: new Date().toISOString() });
  }

  if (url.pathname === "/api/instagram/media/dry-run") {
    requireMethod(req, "POST");
    requireFunction(readJsonBody, "readJsonBody");
    requireFunction(validateApprovedCandidate, "validateApprovedCandidate");
    const body = await readJsonBody(req);
    const candidate = body?.candidate || {};
    validateApprovedCandidate(candidate);
    const mediaUrls = assertStagedMediaUrls(body?.mediaUrls || [], env);
    const caption = typeof approvedCaption === "function" ? approvedCaption(candidate) : "";
    const plan = buildInstagramMediaDryRun({ caption, mediaUrls, env });
    return sendJson(res, 200, {
      ok: true,
      plan,
      auditedAt: new Date().toISOString(),
      publicationOwner: "04_REVIEW_PUBLISH",
      livePublicationAttempted: false,
    });
  }

  if (url.pathname.startsWith(STAGED_PATH_PREFIX)) {
    requireMethod(req, "GET");
    const id = decodeURIComponent(url.pathname.slice(STAGED_PATH_PREFIX.length));
    const asset = await readStagedMedia(id, { rootDir: stagingRoot });
    res.writeHead(200, {
      "content-type": asset.contentType,
      "content-length": String(asset.data.length),
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    });
    res.end(asset.data);
    return true;
  }

  return false;
}

function requireFunction(value, name) {
  if (typeof value !== "function") throw routeError(500, "media_route_dependency_missing", `Missing ${name} dependency.`);
}

function requireMethod(req, method) {
  if (req.method !== method) throw routeError(405, "method_not_allowed", `Only ${method} is allowed for this media route.`);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
  return true;
}

function routeError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
