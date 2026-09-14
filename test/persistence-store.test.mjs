import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonStateStore, assertNoSecrets } from "../persistence.mjs";

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threads-persist-"));
const file = path.join(dir, "state.json");
const store = new JsonStateStore(file);

assert.deepEqual(await store.read(), { revision: 0, updatedAt: null, snapshot: null });
const snapshot = { schemaVersion: 1, app: { version: 1, items: [{ id: "a", title: "safe" }] }, scheduler: { status: "running" } };
const first = await store.write(snapshot, 0);
assert.equal(first.revision, 1);
assert.equal((await store.read()).snapshot.app.items[0].id, "a");

await assert.rejects(() => store.write(snapshot, 0), /persistence_revision_conflict:1/);
await assert.rejects(
  () => store.write({ schemaVersion: 1, app: { items: [{ id: "bad", password: "nope" }] } }, 1),
  /persistence_secret_field/
);
assert.throws(() => assertNoSecrets({ nested: { apiKey: "nope" } }), /persistence_secret_field/);
await assert.rejects(() => store.write({ schemaVersion: 2, app: { items: [] } }, 1), /unsupported_persistence_schema:2/);

await fs.rm(dir, { recursive: true, force: true });
console.log("Persistence store regression tests passed.");
