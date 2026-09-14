import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { VerticalVideoArtifactStore, validateVerticalProductionRequest } from "../vertical-video-artifacts.mjs";

function commandAvailable(command) {
  return spawnSync(command, ["-version"], { stdio: "ignore", windowsHide: true }).status === 0;
}

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const revision = "2026-09-15T05:00:00.000Z";
const candidate = {
  id: "vertical-candidate",
  updatedAt: revision,
  cardFactory: {
    updatedAt: revision,
    privacy: { gate: { allowed: true, code: "image-privacy-reviewed", captureCount: 1, reviewedCount: 1 } },
  },
};
const request = {
  candidate,
  rightsReview: { status: "cleared", reviewedAt: revision, basisCardFactoryUpdatedAt: revision },
  privacyBasisCardFactoryUpdatedAt: revision,
  assets: [{ dataUrl: png }, { dataUrl: png }],
  secondsPerImage: 0.5,
};
const runtimeAvailable = commandAvailable(process.env.FFMPEG_PATH || "ffmpeg")
  && commandAvailable(process.env.FFPROBE_PATH || "ffprobe");
assert.equal(validateVerticalProductionRequest(request).assets.length, 2);
assert.throws(() => validateVerticalProductionRequest({ ...request, rightsReview: { status: "review", basisCardFactoryUpdatedAt: revision } }), /rights_review_required/);
assert.throws(() => validateVerticalProductionRequest({ ...request, rightsReview: { status: "cleared", basisCardFactoryUpdatedAt: "stale" } }), /rights_review_stale/);
assert.throws(() => validateVerticalProductionRequest({ ...request, candidate: { ...candidate, cardFactory: { ...candidate.cardFactory, privacy: { gate: { allowed: false, code: "image-privacy-review-required" } } } } }), /privacy_review_required/);

const root = await fs.mkdtemp(path.join(os.tmpdir(), "threads-vertical-store-"));
try {
  const store = new VerticalVideoArtifactStore(root);
  await assert.rejects(() => store.read("../../escape"), /vertical_artifact_not_found/);
  if (!runtimeAvailable) {
    console.log("Vertical production artifact gates passed; ffmpeg/ffprobe unavailable, runtime artifact render skipped.");
  } else {
    const artifact = await store.render(request);
    assert.equal(artifact.owner, "03_PRODUCTION");
    assert.equal(artifact.handoffTarget, "04_REVIEW_PUBLISH");
    assert.equal(artifact.publishReady, false);
    assert.equal(artifact.reviewRequired, true);
    assert.equal(artifact.providerCapability, "unsupported");
    assert.equal(artifact.livePublicationAttempted, false);
    assert.equal(artifact.probe.width, 1080);
    assert.equal(artifact.probe.height, 1920);
    assert.equal(artifact.probe.codec, "h264");
    assert.equal(artifact.probe.pixelFormat, "yuv420p");
    assert.ok(Math.abs(artifact.probe.durationSeconds - 1) < 0.05);
    const served = await store.read(artifact.artifactId);
    assert.ok(served.bytes > 0);
    assert.equal(served.data.length, served.bytes);
    console.log("Vertical production artifact regression tests passed.");
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

