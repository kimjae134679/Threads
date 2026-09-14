import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const field = JSON.parse(fs.readFileSync(new URL("../data/field-test-showcase-2026-09-14-night.json", import.meta.url), "utf8"));
const discovery = JSON.parse(fs.readFileSync(new URL("../data/viral-discovery-latest.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../app/features/discovery/demo/field-test-model.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const model = sandbox.window.ThreadsFieldTestModel;

const items = model.normalize(field, discovery);
assert.equal(items.length, field.items.length);
assert.equal(items.every((item) => item.demoOnly && item.productionEligible === false), true);
assert.equal(items[0].sourceEvidence.views, 59191);
assert.equal(items[0].sourceEvidence.comments, 60);
assert.equal(items[0].sourceEvidence.rank, 1);
assert.match(items[0].sourceUrl, /^https:\/\//);
assert.equal(items[2].sourceEvidence.votes, 165);
assert.equal(items[2].sourceEvidence.views, null);
assert.ok(items.every((item) => item.storyboard.cards.length >= 3));

assert.throws(() => model.normalize({ ...field, demoOnly: false }, discovery), /field_test_must_be_demo_only/);
const ui = fs.readFileSync(new URL("../app/features/discovery/demo/field-test-showcase.js", import.meta.url), "utf8");
for (const text of ["관측값만 사용", "DEMO ONLY", "productionEligible: false", "field_test_requires_human_review"]) assert.ok(ui.includes(text));
console.log("Field-test showcase regression tests passed.");
