import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonStateStoreRegistry } from "../persistence.mjs";
import { SqliteStateStoreRegistry } from "../persistence-sqlite.mjs";
import { migrateJsonNamespacesToSqlite } from "../persistence-migrate.mjs";

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threads-persistence-migrate-"));
const jsonPath = path.join(dir, "state.json");
const sqlitePath = path.join(dir, "state.sqlite");
const source = new JsonStateStoreRegistry(jsonPath);
const v1 = { schemaVersion: 1, app: { version: 1, items: [{ id: "a", experimentAssignment: { accountId: "TH-A", variantId: "A" } }] }, scheduler: { status: "paused" } };
await source.store("default").write(v1, 0);
await source.store("default").write(v1, 1);
await source.store("TH-A").write({ ...v1, app: { version: 1, items: [{ id: "profile-a" }] } }, 0);

const migrated = await migrateJsonNamespacesToSqlite({ jsonPath, sqlitePath, namespaces: ["default", "TH-A", "TH-B"] });
assert.deepEqual(migrated.results.map(({ namespace, status, revision }) => ({ namespace, status, revision })), [
  { namespace: "default", status: "imported", revision: 2 },
  { namespace: "TH-A", status: "imported", revision: 1 },
  { namespace: "TH-B", status: "skipped-empty", revision: 0 },
]);
const target = new SqliteStateStoreRegistry(sqlitePath);
const defaultRecord = await target.store("default").read();
const profileRecord = await target.store("TH-A").read();
assert.equal(defaultRecord.revision, 2);
assert.equal(defaultRecord.snapshot.schemaVersion, 2);
assert.equal(defaultRecord.snapshot.scheduler.status, "paused");
assert.equal(defaultRecord.snapshot.experiments[0].itemId, "a");
assert.equal(profileRecord.revision, 1);
assert.equal(profileRecord.snapshot.app.items[0].id, "profile-a");
assert.deepEqual(await target.store("TH-B").read(), { revision: 0, updatedAt: null, snapshot: null });
target.close();

await assert.rejects(
  () => migrateJsonNamespacesToSqlite({ jsonPath, sqlitePath, namespaces: ["default"] }),
  /persistence_import_target_exists:default/
);
await assert.rejects(
  () => migrateJsonNamespacesToSqlite({ jsonPath, sqlitePath, namespaces: ["..\\escape"] }),
  /invalid_persistence_namespace/
);

const overwrite = await migrateJsonNamespacesToSqlite({ jsonPath, sqlitePath, namespaces: ["default"], overwrite: true });
assert.equal(overwrite.results[0].revision, 2);

await fs.rm(dir, { recursive: true, force: true });
console.log("Persistence file-to-SQLite migration regression tests passed.");
