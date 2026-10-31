import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonStateStoreRegistry } from "../persistence.mjs";
import { SqliteStateStoreRegistry } from "../persistence-sqlite.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "threads-persistence-parity-"));
const factories = [
  ["file", () => new JsonStateStoreRegistry(path.join(root, "state.json"))],
  ["sqlite", () => new SqliteStateStoreRegistry(path.join(root, "state.sqlite"))],
];
const snapshot = { schemaVersion: 2, app: { version: 1, items: [{ id: "parity" }] }, scheduler: { status: "paused" }, profiles: [], experiments: [] };

for (const [name, createRegistry] of factories) {
  const registry = createRegistry();
  const empty = await registry.store("default").read();
  assert.deepEqual(empty, { revision: 0, updatedAt: null, snapshot: null }, `${name}: empty contract`);
  const first = await registry.store("default").write(snapshot, 0);
  assert.equal(first.revision, 1, `${name}: first revision`);
  assert.equal((await registry.store("default").read()).snapshot.app.items[0].id, "parity", `${name}: readback`);
  await assert.rejects(() => registry.store("default").write(snapshot, 0), /persistence_revision_conflict:1/, `${name}: stale revision`);
  await registry.store("TH-A").write({ ...snapshot, app: { version: 1, items: [{ id: "profile" }] } }, 0);
  assert.equal((await registry.store("default").read()).snapshot.app.items[0].id, "parity", `${name}: namespace isolation`);
  assert.equal((await registry.store("TH-A").read()).snapshot.app.items[0].id, "profile", `${name}: scoped readback`);
  assert.throws(() => registry.store("../escape"), /invalid_persistence_namespace/, `${name}: namespace validation`);
  await assert.rejects(() => registry.store("TH-B").write({ ...snapshot, password: "nope" }, 0), /persistence_secret_field/, `${name}: secret rejection`);
  if (typeof registry.close === "function") registry.close();
}

await fs.rm(root, { recursive: true, force: true });
console.log("Persistence backend parity tests passed.");
