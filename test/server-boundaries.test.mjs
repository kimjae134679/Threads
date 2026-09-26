import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "threads-boundaries-"));
const base = "http://127.0.0.1:4281";
const child = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: "4281", HOST: "127.0.0.1", PERSISTENCE_BACKEND: "file",
    PERSISTENCE_STATE_PATH: path.join(runtime, "state.json"),
    THREADS_ACCESS_TOKEN: "", BUFFER_API_KEY: "", OPENAI_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (chunk) => { logs += chunk; });
child.stderr.on("data", (chunk) => { logs += chunk; });
const now = "2026-09-18T00:00:00.000Z";
const candidate = {
  id: "audit-only", status: "ready", score: 80, updatedAt: now,
  researchBundle: { reviewStatus: "reviewed" },
  draftStudio: { reviewStatus: "approved", manualEdits: { threads: "Local test only" } },
  safetyGate: { fact: "pass", rights: "pass", privacy: "pass", defamation: "pass", platform: "pass", reviewedAt: now },
  publishApproval: { status: "approved", approvedAt: now, basisUpdatedAt: now },
};

try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(base + "/api/health")).ok) break; } catch {}
    if (attempt >= 80 || child.exitCode !== null) throw new Error(logs || "Server did not start");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  for (const pathname of ["/.git/config", "/server.mjs", "/package.json", "/config/buffer.example.json", "/data/runtime/state.json", "/app/%2eenv", "/app/..%5c.git/config"]) {
    assert.equal((await fetch(base + pathname)).status, 404, pathname);
  }
  assert.equal((await fetch(base + "/app/%ZZ")).status, 400);
  assert.equal((await fetch(base + "/api/health")).status, 200, "Malformed paths must not crash the server");
  assert.equal((await fetch(base + "/app/")).status, 200);
  assert.equal((await fetch(base + "/api/state", { headers: { origin: "https://untrusted.example" } })).status, 403);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http.get(base + "/api/state", { headers: { host: "untrusted.example:4281" } }, (response) => {
      response.resume(); resolve(response.statusCode);
    }).on("error", reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await fetch(base + "/api/state", { headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await fetch(base + "/api/state", { method: "PUT", headers: { "content-type": "text/plain" }, body: "{}" })).status, 415);

  const snapshot = { schemaVersion: 2, app: { items: [] } };
  assert.equal((await request("/api/state", { snapshot }, "PUT")).status, 400);
  const writes = await Promise.all(Array.from({ length: 8 }, () => request("/api/state", { snapshot, expectedRevision: 0 }, "PUT")));
  assert.equal(writes.filter((response) => response.status === 200).length, 1);
  assert.equal(writes.filter((response) => response.status === 409).length, 7);
  assert.equal((await (await fetch(base + "/api/state")).json()).revision, 1);

  const dryRun = (item) => request("/api/threads/media/dry-run", { candidate: item, mediaUrls: ["https://example.com/image.png"] });
  assert.equal((await dryRun(candidate)).status, 200);
  for (const score of [null, "", " ", false, "80", -1, 101]) {
    const response = await dryRun({ ...candidate, score });
    assert.equal(response.status, 409, `Invalid score: ${JSON.stringify(score)}`);
    assert.equal((await response.json()).error, "candidate_score_missing");
  }
  for (const value of ["PASS", "invalid", true, 1, null, "unknown", "block"]) {
    const response = await dryRun({ ...candidate, safetyGate: { ...candidate.safetyGate, rights: value } });
    assert.equal(response.status, 409, `Invalid rights gate: ${value}`);
  }
  assert.equal((await dryRun({ ...candidate, contentStrategy: { sourceAssetType: "A10" } })).status, 409);
  assert.equal((await dryRun({ ...candidate, cardFactory: { storyboard: { cards: [{ type: "capture-image" }] } } })).status, 409);
  assert.equal((await dryRun({ ...candidate, updatedAt: "changed" })).status, 409);
  assert.equal((await request("/api/threads/publish", { candidate })).status, 503, "No credentials means no external publish");
  console.log("Server static/origin/approval/concurrent-write boundaries passed; no external APIs called.");
} finally {
  if (child.exitCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
  await fs.rm(runtime, { recursive: true, force: true });
}

function request(pathname, body, method = "POST") {
  return fetch(base + pathname, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
