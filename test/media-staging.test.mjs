import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getMediaStagingCapabilities, stageRenderedMedia, readStagedMedia, assertStagedMediaUrls, assertStagedMediaForCandidate } from "../media-staging.mjs";

const png1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const env = { MEDIA_STAGING_ENABLED: "1", PUBLIC_MEDIA_BASE_URL: "https://media.example.com" };
const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "threads-media-stage-"));
try {
  assert.equal(getMediaStagingCapabilities({}).state, "public-origin-required");
  assert.equal(getMediaStagingCapabilities({ PUBLIC_MEDIA_BASE_URL: "https://media.example.com" }).state, "live-disabled");
  assert.equal(getMediaStagingCapabilities(env).state, "ready-to-validate");
  assert.equal(getMediaStagingCapabilities(env).approvalBindingRequired, true);
  assert.equal(getMediaStagingCapabilities({ MEDIA_STAGING_ENABLED: "1", PUBLIC_MEDIA_BASE_URL: "https://127.0.0.1" }).state, "public-origin-required");

  const approvalBasis = "2026-09-15T00:00:00.000Z";
  const staged = await stageRenderedMedia({ candidateId: "candidate-1", approvalBasis, assets: [{ dataUrl: png1x1 }], rootDir, env });
  assert.equal(staged.state, "staged-unverified");
  assert.equal(staged.approvalBound, true);
  assert.equal(staged.assets.length, 1);
  assert.match(staged.assets[0].url, /^https:\/\/media\.example\.com\/media\/staged\//);
  assert.equal(staged.externalReachabilityVerified, false);

  const read = await readStagedMedia(staged.assets[0].id, { rootDir });
  assert.equal(read.contentType, "image/png");
  assert.ok(read.data.length > 0);
  assert.equal(read.metadata.candidateId, "candidate-1");
  assert.equal(read.metadata.approvalBasis, approvalBasis);
  assert.deepEqual(assertStagedMediaUrls([staged.assets[0].url], env), [staged.assets[0].url]);
  assert.deepEqual(await assertStagedMediaForCandidate([staged.assets[0].url], { candidateId: "candidate-1", approvalBasis, rootDir, env }), [staged.assets[0].url]);
  await assert.rejects(() => assertStagedMediaForCandidate([staged.assets[0].url], { candidateId: "candidate-2", approvalBasis, rootDir, env }), /different candidate/);
  await assert.rejects(() => assertStagedMediaForCandidate([staged.assets[0].url], { candidateId: "candidate-1", approvalBasis: "2026-09-15T00:02:00.000Z", rootDir, env }), /older approval revision/);
  assert.throws(() => assertStagedMediaUrls(["https://other.example.com/media/staged/x.png"], env), /configured staging origin/);
  await assert.rejects(() => stageRenderedMedia({ candidateId: "../bad", approvalBasis: "2026-09-15T00:00:00Z", assets: [{ dataUrl: png1x1 }], rootDir, env }), /candidate id/);
  await assert.rejects(() => stageRenderedMedia({ candidateId: "candidate-1", approvalBasis: "bad-date", assets: [{ dataUrl: png1x1 }], rootDir, env }), /approval basis/);
  await assert.rejects(() => stageRenderedMedia({ candidateId: "candidate-1", approvalBasis: "2026-09-15T00:00:00Z", assets: [{ dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" }], rootDir, env }), /PNG, JPEG, or WebP/);
  await assert.rejects(() => readStagedMedia("00000000-0000-4000-8000-000000000000.png", { rootDir }), /not found/);
  console.log("Media staging regression tests passed.");
} finally {
  await fs.rm(rootDir, { recursive: true, force: true });
}
