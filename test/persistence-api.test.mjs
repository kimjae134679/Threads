import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = 4197;
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threads-state-api-"));
const statePath = path.join(dir, "state.json");
const child = spawn(process.execPath, ["server.mjs"], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), PERSISTENCE_STATE_PATH: statePath }, stdio: "ignore" });
const base = `http://127.0.0.1:${port}`;
try {
  for (let i = 0; i < 50; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 50)); }
  let res = await fetch(`${base}/api/state`); let body = await res.json(); assert.equal(body.revision, 0); assert.equal(body.snapshot, null);
  const snapshot = { schemaVersion: 1, app: { version: 1, items: [] }, scheduler: { control: {}, history: [] }, profiles: [], experiments: [] };
  res = await fetch(`${base}/api/state`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot, expectedRevision: 0 }) }); body = await res.json(); assert.equal(res.status, 200); assert.equal(body.revision, 1);
  res = await fetch(`${base}/api/state`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot, expectedRevision: 0 }) }); body = await res.json(); assert.equal(res.status, 409); assert.equal(body.error, "persistence_revision_conflict"); assert.equal(body.currentRevision, 1);
  res = await fetch(`${base}/api/state`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot: { ...snapshot, accessToken: "nope" }, expectedRevision: 1 }) }); body = await res.json(); assert.equal(res.status, 400); assert.equal(body.error, "persistence_secret_field");
  console.log("Persistence API regression tests passed.");
} finally { child.kill(); await fs.rm(dir, { recursive: true, force: true }); }
