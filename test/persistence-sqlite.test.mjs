import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SqliteStateStoreRegistry } from "../persistence-sqlite.mjs";

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threads-sqlite-"));
const file = path.join(dir, "state.sqlite");
const registry = new SqliteStateStoreRegistry(file);
const snapshot = { schemaVersion: 2, app: { version: 1, items: [{ id: "db-a" }] }, scheduler: { status: "running" }, profiles: [], experiments: [] };

assert.equal(registry.migrationVersion(), 1);
assert.deepEqual(await registry.store("default").read(), { revision: 0, updatedAt: null, snapshot: null });
const first = await registry.store("default").write(snapshot, 0);
assert.equal(first.revision, 1);
assert.equal((await registry.store("default").read()).snapshot.app.items[0].id, "db-a");
await assert.rejects(() => registry.store("default").write(snapshot, 0), /persistence_revision_conflict:1/);

const scoped = await registry.store("TH-A").write(snapshot, 0);
assert.equal(scoped.revision, 1);
assert.equal((await registry.store("default").read()).revision, 1);
assert.equal((await registry.store("TH-A").read()).revision, 1);
assert.throws(() => registry.store("../escape"), /invalid_persistence_namespace/);
await assert.rejects(() => registry.store("TH-B").write({ ...snapshot, apiKey: "nope" }, 0), /persistence_secret_field/);

registry.close();
await fs.rm(dir, { recursive: true, force: true });
console.log("SQLite persistence regression tests passed.");
