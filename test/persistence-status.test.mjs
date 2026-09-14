import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "threads-persistence-status-"));
try {
  await checkBackend("file", 4198);
  await checkBackend("sqlite", 4199);
  console.log("Persistence status diagnostics tests passed.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

async function checkBackend(backend, port) {
  const statePath = path.join(root, `${backend}.json`);
  const sqlitePath = path.join(root, `${backend}.sqlite`);
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), PERSISTENCE_BACKEND: backend, PERSISTENCE_STATE_PATH: statePath, PERSISTENCE_SQLITE_PATH: sqlitePath },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(base);
    const response = await fetch(`${base}/api/state/status`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.backend, backend);
    assert.equal(body.stateSchemaVersion, 2);
    assert.equal(body.scopedNamespaces, true);
    assert.equal(body.optimisticConcurrency, true);
    assert.equal(body.secretFieldsPersisted, false);
    assert.equal(body.databaseSchemaVersion, backend === "sqlite" ? 1 : null);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes(root), false);
    assert.equal(serialized.includes(statePath), false);
    assert.equal(serialized.includes(sqlitePath), false);
  } finally {
    if (child.exitCode == null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
}

async function waitForHealth(base) {
  for (let index = 0; index < 60; index += 1) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("persistence_status_server_timeout");
}
