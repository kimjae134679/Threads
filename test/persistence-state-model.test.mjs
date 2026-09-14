import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/features/persistence/state/state-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, JSON, String, Number, Date, Array, Object, RegExp, Error });
vm.runInContext(source, context, { filename: "state-model.js" });
const model = context.window.ThreadsPersistenceStateModel;
assert.ok(model, "Persistence state model must register on window");

const state = {
  version: 1,
  items: [{ id: "a", title: "safe", scheduler: { providerTarget: "threads-direct", audit: [{ action: "route", owner: "04_REVIEW_PUBLISH" }] } }],
};
const control = { status: "paused", options: { slotMinutes: 30 }, history: Array.from({ length: 105 }, (_, i) => ({ action: `h-${i}` })) };
state.items[0].experimentAssignment = { accountId: "TH-A", hypothesisId: "H1", variantId: "V1", goal: "test", updatedAt: "2026-09-14T09:00:00Z" };
const snapshot = model.makeSnapshot(state, control, { exportedAt: "2026-09-14T09:10:00Z", profiles: [{ id: "TH-A", platform: "threads", name: "Hot" }] });
assert.equal(snapshot.schemaVersion, 2);
assert.equal(snapshot.scheduler.status, "paused");
const browserControlSnapshot = model.makeSnapshot(state, { state: "stopped", options: {}, history: [] });
assert.equal(browserControlSnapshot.scheduler.status, "stopped");
assert.equal(snapshot.scheduler.history.length, 100);
assert.equal(snapshot.scheduler.history[0].action, "h-5");
assert.equal(snapshot.roleChain[3], "04_REVIEW_PUBLISH");
assert.equal(snapshot.app.items[0].scheduler.providerTarget, "threads-direct");
assert.equal(snapshot.profiles[0].id, "TH-A");
assert.equal(snapshot.experiments[0].itemId, "a");
assert.equal(snapshot.experiments[0].accountId, "TH-A");

const legacy = model.migrateSnapshot({ version: 1, items: [{ id: "legacy" }] });
assert.equal(legacy.schemaVersion, 2);
assert.equal(legacy.source, "legacy-browser");
assert.equal(legacy.app.items[0].id, "legacy");
assert.equal(model.restoreAppState(legacy).items[0].id, "legacy");

const v1 = model.migrateSnapshot({ schemaVersion: 1, app: { version: 1, items: [{ id: "v1", experimentAssignment: { accountId: "TH-B", goal: "migrate" } }] }, profiles: [{ id: "TH-B", platform: "threads" }] });
assert.equal(v1.schemaVersion, 2);
assert.equal(v1.profiles[0].id, "TH-B");
assert.equal(v1.experiments[0].itemId, "v1");
assert.equal(v1.experiments[0].accountId, "TH-B");
const restoredV1 = model.restoreAppState(v1);
assert.equal(restoredV1.items[0].experimentAssignment.goal, "migrate");

const explicit = model.makeSnapshot({ version: 1, items: [{ id: "x" }] }, {}, { experiments: [{ itemId: "x", accountId: "TH-C", hypothesisId: "H2" }] });
assert.equal(model.restoreAppState(explicit).items[0].experimentAssignment.accountId, "TH-C");

assert.throws(
  () => model.makeSnapshot({ items: [{ id: "bad", accessToken: "do-not-store" }] }),
  /persistence_secret_field/
);
assert.throws(
  () => model.migrateSnapshot({ schemaVersion: 3, app: { items: [] } }),
  /persistence_schema_newer/
);

console.log("Persistence state model regression tests passed.");

assert.throws(() => model.makeSnapshot({ items: [] }, {}, { profiles: [{ id: "bad", apiKey: "nope" }] }), /persistence_secret_field/);
