import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

function commandAvailable(command) {
  return spawnSync(command, ["-version"], { stdio: "ignore", windowsHide: true }).status === 0;
}
import { fileURLToPath } from "node:url";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "threads-vertical-api-"));
const port = 4800 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const revision = "2026-09-15T05:00:00.000Z";
const candidate = {
  id: "api-vertical-candidate",
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
const env = {
  ...process.env,
  PORT: String(port),
  HOST: "127.0.0.1",
  PERSISTENCE_STATE_PATH: path.join(runtime, "state.json"),
  VERTICAL_VIDEO_ARTIFACT_PATH: path.join(runtime, "vertical"),
};
const child = spawn(process.execPath, [fileURLToPath(new URL("../server.mjs", import.meta.url))], { env, stdio: ["ignore", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
try {
  await waitForServer();
  const capabilities = await getJson("/api/vertical-video/capabilities");
  assert.equal(capabilities.capability.owner, "03_PRODUCTION");
  assert.equal(capabilities.capability.handoffTarget, "04_REVIEW_PUBLISH");
  assert.equal(capabilities.capability.providerCapability, "unsupported");
  assert.equal(capabilities.capability.livePublishImplemented, false);

  if (runtimeAvailable) {
    const rendered = await postJson("/api/vertical-video/render", request);
    assert.equal(rendered.response.status, 200);
    assert.equal(rendered.body.artifact.publishReady, false);
    assert.equal(rendered.body.artifact.reviewRequired, true);
    assert.equal(rendered.body.artifact.livePublicationAttempted, false);
    assert.equal(rendered.body.artifact.probe.width, 1080);
    assert.equal(rendered.body.artifact.probe.height, 1920);
    assert.ok(Math.abs(rendered.body.artifact.probe.durationSeconds - 1) < 0.05);

    const video = await fetch(`${base}${rendered.body.artifact.downloadPath}`);
    assert.equal(video.status, 200);
    assert.equal(video.headers.get("content-type"), "video/mp4");
    assert.equal(video.headers.get("cache-control"), "private, no-store");
    assert.ok((await video.arrayBuffer()).byteLength > 0);
  } else {
    console.log("Vertical production API gates passed; ffmpeg/ffprobe unavailable, successful render/download path skipped.");
  }

  const stale = structuredClone(request);
  stale.rightsReview.basisCardFactoryUpdatedAt = "stale";
  const staleResponse = await postJson("/api/vertical-video/render", stale);
  assert.equal(staleResponse.response.status, 409);
  assert.equal(staleResponse.body.error, "rights_review_stale");

  const privacyBlocked = structuredClone(request);
  privacyBlocked.candidate.cardFactory.privacy.gate.allowed = false;
  privacyBlocked.candidate.cardFactory.privacy.gate.code = "image-privacy-review-required";
  const privacyResponse = await postJson("/api/vertical-video/render", privacyBlocked);
  assert.equal(privacyResponse.response.status, 409);
  assert.equal(privacyResponse.body.error, "privacy_review_required");

  console.log("Vertical production server API regression tests passed.");
} finally {
  if (child.exitCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
  await fs.rm(runtime, { recursive: true, force: true });
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${child.exitCode}\nstdout=${stdout}\nstderr=${stderr}`);
    try { const response = await fetch(`${base}/api/health`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`server did not become ready\nstdout=${stdout}\nstderr=${stderr}`);
}
async function getJson(pathname) {
  const response = await fetch(`${base}${pathname}`);
  assert.equal(response.ok, true, `${pathname} -> ${response.status}`);
  return response.json();
}
async function postJson(pathname, body) {
  const response = await fetch(`${base}${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { response, body: await response.json() };
}
