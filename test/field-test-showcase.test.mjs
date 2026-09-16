import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const indexPayload = JSON.parse(fs.readFileSync(new URL("../data/field-test-showcase-index.json", import.meta.url), "utf8"));
assert.equal(indexPayload.demoOnly, true);
assert.equal(indexPayload.productionEligible, false);
assert.match(indexPayload.current, /^\/data\/(?:_developer\/)?[a-zA-Z0-9._-]+\.json$/);
assert.equal(Number.isNaN(Date.parse(indexPayload.generatedAt)), false);
const fieldUrl = new URL(`..${indexPayload.current}`, import.meta.url);
assert.equal(fs.existsSync(fieldUrl), true);
const field = JSON.parse(fs.readFileSync(fieldUrl, "utf8"));
assert.equal(field.demoOnly, true);
assert.equal(field.productionEligible, false);

const discovery = JSON.parse(fs.readFileSync(new URL("../data/viral-discovery-latest.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../app/features/discovery/demo/field-test-model.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const model = sandbox.window.ThreadsFieldTestModel;

const items = model.normalize(field, discovery);
assert.equal(items.length, field.items.length);
assert.equal(items.every((item) => item.demoOnly && item.productionEligible === false), true);

const directReddit = items.find((item) => item.sourceKey === "reddit:iphone-duo-announcement:1wbsyos");
assert.ok(directReddit);
assert.equal(directReddit.sourceEvidence.votes, 8238);
assert.equal(directReddit.sourceEvidence.views, null);
assert.match(directReddit.sourceUrl, /^https:\/\/www\.reddit\.com\//);
assert.equal(directReddit.storyboard.renderProfile, "reference-square");
assert.equal(directReddit.storyboard.width, 1080);
assert.equal(directReddit.storyboard.height, 1080);
assert.equal(directReddit.storyboard.assetPolicy.generatedImageFallback, false);

const millennials = items.find((item) => item.sourceKey === "reddit:millennials-workplace-age-gap:1wbom2p");
assert.ok(millennials);
assert.equal(millennials.sourceEvidence.votes, 165);
assert.equal(millennials.sourceEvidence.views, null);
assert.ok(items.every((item) => item.storyboard.cards.length >= 3));

assert.throws(() => model.normalize({ ...field, demoOnly: false }, discovery), /field_test_must_be_demo_only/);
const ui = fs.readFileSync(new URL("../app/features/discovery/demo/field-test-showcase.js", import.meta.url), "utf8");
for (const text of ["관측값만 사용", "DEMO ONLY", "productionEligible: false", "field_test_requires_human_review"]) assert.ok(ui.includes(text));
assert.ok(ui.includes('fetch("/data/field-test-showcase-index.json"'));
assert.equal(ui.includes("field-test-showcase-2026-09-14-night.json"), false);
console.log("Field-test showcase regression tests passed.");
