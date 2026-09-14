import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/features/production/media/source-asset-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Number, Boolean, Array, Object, Set });
vm.runInContext(source, context, { filename: "source-asset-model.js" });
const model = context.window.ThreadsSourceAssetModel;

assert.equal(model.productionState({}).state, "DISCOVERED");
assert.equal(model.productionState({ sourceVerified: true, assets: [] }).state, "ASSETS_PENDING");
assert.equal(model.productionState({ sourceVerified: true, assets: [{ id: "a", acquisitionMode: "metadata-only" }] }).state, "ASSETS_PENDING");

const acquired = [{ id: "a", acquisitionMode: "manual-capture", mediaUrl: "blob:test", rightsState: "review", privacyState: "unknown", humanSelected: true }];
assert.equal(model.productionState({ sourceVerified: true, assets: acquired }).state, "RIGHTS_REVIEW");

const rightsCleared = acquired.map((asset) => ({ ...asset, rightsState: "cleared" }));
assert.equal(model.productionState({ sourceVerified: true, assets: rightsCleared }).state, "PRIVACY_REVIEW");

const ready = rightsCleared.map((asset) => ({ ...asset, privacyState: "masked" }));
assert.equal(JSON.stringify(model.productionState({ sourceVerified: true, assets: ready })), JSON.stringify({ state: "RENDER_READY", allowed: true, reasons: [] }));
assert.equal(model.productionState({ sourceVerified: true, assets: ready, rendered: true }).state, "RENDERED");
assert.equal(model.productionState({ sourceVerified: true, assets: ready, rendered: true, humanApproved: true, approvalCurrent: false }).state, "HUMAN_APPROVED");
assert.equal(JSON.stringify(model.productionState({ sourceVerified: true, assets: ready, rendered: true, humanApproved: true, approvalCurrent: true })), JSON.stringify({ state: "PUBLISH_READY", allowed: true, reasons: [] }));

console.log("Source asset production-gate regression tests passed.");
