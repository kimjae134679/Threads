import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const modelSource = fs.readFileSync(new URL("../app/features/persistence/state/state-model.js", import.meta.url), "utf8");
const registrySource = fs.readFileSync(new URL("../app/account-registry.js", import.meta.url), "utf8");
const profileSource = fs.readFileSync(new URL("../app/features/persistence/profiles/profile-state.js", import.meta.url), "utf8");
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
};
const context = vm.createContext({ window: {}, localStorage, JSON, String, Number, Date, Array, Object, RegExp, Error, Set, Map });
vm.runInContext(modelSource, context, { filename: "state-model.js" });
vm.runInContext(registrySource, context, { filename: "account-registry.js" });
vm.runInContext(profileSource, context, { filename: "profile-state.js" });
const profiles = context.window.ThreadsPersistenceProfileState;
assert.ok(profiles, "Profile runtime state must register on window");

assert.equal(profiles.get("TH-A").status, "planned");
assert.equal(profiles.get("TH-A").enabled, true);
const savedA = profiles.update("TH-A", { status: "active", enabled: true, notes: "fast issue lane" });
assert.equal(savedA.status, "active");
assert.equal(profiles.get("TH-A").notes, "fast issue lane");
profiles.update("TH-B", { status: "paused", enabled: false, notes: "hold" });
const scoped = profiles.applyScoped("TH-A", [{ id: "TH-A", status: "testing", enabled: false, notes: "restored" }]);
assert.equal(scoped.status, "testing");
assert.equal(scoped.enabled, false);
assert.equal(profiles.get("TH-B").status, "paused", "scoped restore must preserve other accounts");
assert.equal(profiles.get("TH-B").enabled, false);

assert.throws(() => profiles.update("UNKNOWN", { status: "active" }), /profile_state_unknown_account/);
assert.throws(() => profiles.update("TH-A", { apiKey: "never-store" }), /persistence_secret_field/);
assert.throws(
  () => profiles.applyScoped("TH-A", [{ id: "TH-B", status: "active" }]),
  /profile_state_scope_mismatch/
);

profiles.replaceAll([{ id: "TH-C", status: "retired", enabled: false, notes: "done" }]);
assert.equal(profiles.get("TH-C").status, "retired");
assert.equal(profiles.get("TH-A").status, "planned", "replaceAll clears absent stored overrides");
assert.deepEqual(JSON.parse(JSON.stringify(profiles.listStored().map((entry) => entry.id))), ["TH-C"]);

console.log("Persistence profile runtime-state regression tests passed.");
