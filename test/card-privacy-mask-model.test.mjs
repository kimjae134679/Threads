import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/features/production/cards/privacy-mask-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, Math, Number, String });
vm.runInContext(source, context);
const model = context.window.ThreadsCardPrivacyMaskModel;

const rect = model.normalizeRect({ x: 500, y: 700 }, { x: 100, y: 200 }, 1080, 1350);
assert.deepEqual({ ...rect }, { x: 100, y: 200, width: 400, height: 500 });
assert.equal(model.usableRect(rect), true);
assert.equal(model.usableRect({ x: 0, y: 0, width: 2, height: 100 }), false);

const clamped = model.normalizeRect({ x: -50, y: -20 }, { x: 2000, y: 3000 }, 1080, 1350);
assert.deepEqual({ ...clamped }, { x: 0, y: 0, width: 1080, height: 1350 });

const storyboard = {
  cards: [
    { type: "hook" },
    { type: "capture-image" },
    { type: "excerpt" },
    { type: "capture-image" },
    { type: "ending" },
  ],
};

let gate = model.exportGate(storyboard, {});
assert.equal(gate.allowed, false);
assert.deepEqual(Array.from(gate.pending), [1, 3]);

gate = model.exportGate(storyboard, {
  1: { reviewed: true, rectangles: [rect] },
  3: { reviewed: false, rectangles: [] },
});
assert.equal(gate.allowed, false);
assert.deepEqual(Array.from(gate.pending), [3]);

gate = model.exportGate(storyboard, {
  1: { reviewed: true, rectangles: [rect] },
  3: { reviewed: true, rectangles: [] },
});
assert.equal(gate.allowed, true);
assert.equal(gate.reviewedCount, 2);

const envelope = model.exportEnvelope(storyboard, {
  1: { reviewed: true, rectangles: [rect, { x: 1, y: 1, width: 1, height: 1 }] },
  3: { reviewed: true, rectangles: [] },
});
assert.equal(envelope.automatedOcrClaimed, false);
assert.equal(envelope.automatedFaceDetectionClaimed, false);
assert.equal(envelope.masks[1].rectangles.length, 1);
assert.equal(envelope.gate.allowed, true);

console.log("Card privacy mask model regression tests passed.");
