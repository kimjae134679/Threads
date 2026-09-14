import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handleMediaPublishRoute, getMediaConnectorSnapshot } from "../media-publish-routes.mjs";

const png1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const env = {
  MEDIA_STAGING_ENABLED: "1",
  PUBLIC_MEDIA_BASE_URL: "https://media.example.com",
  INSTAGRAM_ACCESS_TOKEN: "test-token",
  INSTAGRAM_USER_ID: "123456789",
  INSTAGRAM_GRAPH_API_VERSION: "v99.0",
  INSTAGRAM_REQUIRED_SCOPES: "scope_a scope_b",
  INSTAGRAM_MEDIA_VALIDATION_ENABLED: "1",
};
const root = await fs.mkdtemp(path.join(os.tmpdir(), "threads-media-routes-"));
const candidate = {
  id: "candidate-1",
  updatedAt: "2026-09-15T00:00:00.000Z",
  publishApproval: { status: "approved", approvedAt: "2026-09-15T00:01:00.000Z", basisUpdatedAt: "2026-09-15T00:00:00.000Z" },
};
const validateApprovedCandidate = (value) => {
  if (value?.publishApproval?.basisUpdatedAt !== value?.updatedAt) throw Object.assign(new Error("stale"), { status: 409, code: "publish_approval_stale" });
};
const makeRes = () => ({ status: null, headers: null, chunks: [], writeHead(status, headers) { this.status = status; this.headers = headers; }, end(value) { if (value) this.chunks.push(value); } });
const jsonBody = (payload) => async () => payload;

try {
  const snapshot = getMediaConnectorSnapshot(env);
  assert.equal(snapshot.mediaStaging.state, "ready-to-validate");
  assert.equal(snapshot.instagramMedia.state, "ready-to-validate");

  const stageRes = makeRes();
  assert.equal(await handleMediaPublishRoute({ req: { method: "POST" }, res: stageRes, url: new URL("http://local/api/media-staging/stage"), env, stagingRoot: root, readJsonBody: jsonBody({ candidate, assets: [{ dataUrl: png1x1 }] }), validateApprovedCandidate }), true);
  assert.equal(stageRes.status, 200);
  const stagePayload = JSON.parse(stageRes.chunks.join(""));
  assert.equal(stagePayload.staged.externalReachabilityVerified, false);
  const stagedUrl = stagePayload.staged.assets[0].url;

  const serveRes = makeRes();
  const stagedPath = new URL(stagedUrl).pathname;
  assert.equal(await handleMediaPublishRoute({ req: { method: "GET" }, res: serveRes, url: new URL(`http://local${stagedPath}`), env, stagingRoot: root }), true);
  assert.equal(serveRes.status, 200);
  assert.equal(serveRes.headers["content-type"], "image/png");

  const dryRes = makeRes();
  assert.equal(await handleMediaPublishRoute({ req: { method: "POST" }, res: dryRes, url: new URL("http://local/api/instagram/media/dry-run"), env, stagingRoot: root, readJsonBody: jsonBody({ candidate, mediaUrls: [stagedUrl] }), validateApprovedCandidate, approvedCaption: () => "approved caption" }), true);
  const dry = JSON.parse(dryRes.chunks.join(""));
  assert.equal(dry.plan.provider, "instagram-official");
  assert.equal(dry.plan.externalCalls, 0);
  assert.equal(dry.livePublicationAttempted, false);
  assert.equal(dry.publicationOwner, "04_REVIEW_PUBLISH");

  const providerCalls = [];
  const validateRes = makeRes();
  assert.equal(await handleMediaPublishRoute({
    req: { method: "POST" }, res: validateRes, url: new URL("http://local/api/instagram/media/validate"), env, stagingRoot: root,
    readJsonBody: jsonBody({ candidate, mediaUrls: [stagedUrl] }), validateApprovedCandidate, approvedCaption: () => "approved caption",
    instagramFetch: async (url, options) => { providerCalls.push({ url, body: String(options.body) }); return { ok: true, status: 200, async json() { return { id: "provider-container-1" }; } }; },
  }), true);
  const validated = JSON.parse(validateRes.chunks.join(""));
  assert.equal(validated.validation.validation, "container-created");
  assert.equal(validated.validation.externalCalls, 1);
  assert.equal(validated.validation.livePublicationAttempted, false);
  assert.equal(validated.mediaPublishEndpointCalled, false);
  assert.equal(validated.publicationOwner, "04_REVIEW_PUBLISH");
  assert.equal(providerCalls.length, 1);
  assert.ok(providerCalls.every((call) => !call.url.includes("media_publish")));

  const stale = structuredClone(candidate);
  stale.updatedAt = "2026-09-15T00:02:00.000Z";
  await assert.rejects(() => handleMediaPublishRoute({ req: { method: "POST" }, res: makeRes(), url: new URL("http://local/api/instagram/media/dry-run"), env, readJsonBody: jsonBody({ candidate: stale, mediaUrls: [stagedUrl] }), validateApprovedCandidate }), /stale/);

  const foreign = "https://other.example.com/media/staged/00000000-0000-4000-8000-000000000000.png";
  await assert.rejects(() => handleMediaPublishRoute({ req: { method: "POST" }, res: makeRes(), url: new URL("http://local/api/instagram/media/dry-run"), env, readJsonBody: jsonBody({ candidate, mediaUrls: [foreign] }), validateApprovedCandidate }), /configured staging origin/);

  assert.equal(await handleMediaPublishRoute({ req: { method: "GET" }, res: makeRes(), url: new URL("http://local/not-media"), env }), false);
  console.log("Media publish route regression tests passed.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
