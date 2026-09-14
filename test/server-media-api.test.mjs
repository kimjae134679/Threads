import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const png1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "threads-server-media-"));
const port = 4400 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const now = "2026-09-15T00:00:00.000Z";
const candidate = {
  id: "server-media-candidate",
  status: "ready",
  score: 88,
  updatedAt: now,
  researchBundle: { reviewStatus: "reviewed" },
  draftStudio: { reviewStatus: "approved", manualEdits: { instagram: "approved instagram caption", threads: "approved threads copy" } },
  safetyGate: { fact: "pass", rights: "pass", privacy: "pass", defamation: "pass", platform: "pass", reviewedAt: now, notes: "" },
  publishApproval: { status: "approved", approvedAt: "2026-09-15T00:01:00.000Z", basisUpdatedAt: now },
};
const env = {
  ...process.env,
  PORT: String(port),
  HOST: "127.0.0.1",
  PERSISTENCE_STATE_PATH: path.join(runtime, "state.json"),
  MEDIA_STAGING_PATH: path.join(runtime, "media"),
  MEDIA_STAGING_ENABLED: "1",
  PUBLIC_MEDIA_BASE_URL: "https://media.example.com",
  INSTAGRAM_ACCESS_TOKEN: "test-token",
  INSTAGRAM_USER_ID: "123456789",
  INSTAGRAM_GRAPH_API_VERSION: "v99.0",
  INSTAGRAM_REQUIRED_SCOPES: "scope_a scope_b",
};
const child = spawn(process.execPath, [new URL("../server.mjs", import.meta.url).pathname], { env, stdio: ["ignore", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });

try {
  await waitForServer();

  const connectors = await getJson("/api/connectors");
  assert.equal(connectors.connectors.mediaStaging.state, "ready-to-validate");
  assert.equal(connectors.connectors.instagramMedia.state, "live-disabled");

  const stage = await postJson("/api/media-staging/stage", { candidate, assets: [{ dataUrl: png1x1 }] });
  assert.equal(stage.response.status, 200);
  assert.equal(stage.body.staged.state, "staged-unverified");
  assert.equal(stage.body.staged.externalReachabilityVerified, false);
  const stagedUrl = stage.body.staged.assets[0].url;
  assert.match(stagedUrl, /^https:\/\/media\.example\.com\/media\/staged\//);

  const served = await fetch(`${base}${new URL(stagedUrl).pathname}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.ok((await served.arrayBuffer()).byteLength > 0);

  const dry = await postJson("/api/instagram/media/dry-run", { candidate, mediaUrls: [stagedUrl] });
  assert.equal(dry.response.status, 200);
  assert.equal(dry.body.plan.provider, "instagram-official");
  assert.equal(dry.body.plan.mediaType, "IMAGE");
  assert.equal(dry.body.plan.externalCalls, 0);
  assert.equal(dry.body.livePublicationAttempted, false);
  assert.equal(dry.body.publicationOwner, "04_REVIEW_PUBLISH");

  const foreign = await postJson("/api/instagram/media/dry-run", { candidate, mediaUrls: ["https://other.example.com/media/staged/00000000-0000-4000-8000-000000000000.png"] });
  assert.equal(foreign.response.status, 400);
  assert.equal(foreign.body.error, "staged_media_origin_mismatch");

  const staleCandidate = structuredClone(candidate);
  staleCandidate.updatedAt = "2026-09-15T00:02:00.000Z";
  const stale = await postJson("/api/media-staging/stage", { candidate: staleCandidate, assets: [{ dataUrl: png1x1 }] });
  assert.equal(stale.response.status, 409);
  assert.equal(stale.body.error, "publish_approval_stale");

  console.log("Server media staging/Instagram API regression tests passed.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve)).catch(() => {});
  await fs.rm(runtime, { recursive: true, force: true });
}

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${child.exitCode}\nstdout=${stdout}\nstderr=${stderr}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
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
  const payload = await response.json();
  return { response, body: payload };
}
