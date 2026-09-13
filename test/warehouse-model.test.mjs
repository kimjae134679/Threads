import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/warehouse-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Number, Math, Date, Array });
vm.runInContext(source, context, { filename: "warehouse-model.js" });
const model = context.window.ThreadsWarehouseModel;

assert.ok(model, "Warehouse model must register on window");

const now = Date.parse("2026-09-14T00:00:00Z");

function approvedItem(overrides = {}) {
  const updatedAt = "2026-09-13T23:00:00Z";
  return {
    id: "x",
    title: "example",
    createdAt: "2026-09-13T12:00:00Z",
    updatedAt,
    draftStudio: { generated: { threads: { hook: "h", body: "b", cta: "" } } },
    safetyGate: {
      fact: "pass", rights: "pass", privacy: "pass", defamation: "pass", platform: "pass",
      reviewedAt: "2026-09-13T23:00:00Z", notes: "",
    },
    publishApproval: { status: "approved", approvedAt: "2026-09-13T23:10:00Z", basisUpdatedAt: updatedAt },
    warehouse: { bucket: "evergreen", priority: 3, status: "active" },
    ...overrides,
  };
}

{
  const item = approvedItem();
  assert.equal(model.deriveStage(item), "ready");
  assert.equal(model.queueEligibility(item, now).eligible, true);
}

{
  const item = approvedItem({ warehouse: { bucket: "hot", priority: 5, status: "hold" } });
  const result = model.queueEligibility(item, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "hold");
}

{
  const item = approvedItem({ publishApproval: { status: "approved", approvedAt: "x", basisUpdatedAt: "old" } });
  assert.equal(model.deriveStage(item), "approval");
}

{
  const item = approvedItem({ viralReview: { decision: "BLOCK", comfortScore: 10 } });
  assert.equal(model.deriveStage(item), "blocked");
}

{
  const hot = approvedItem({ id: "hot", warehouse: { bucket: "hot", priority: 3, status: "active" } });
  const evergreen = approvedItem({ id: "green", warehouse: { bucket: "evergreen", priority: 3, status: "active" } });
  const ordered = model.sortForQueue([evergreen, hot], now);
  assert.equal(ordered[0].id, "hot");
  assert.ok(model.queueScore(hot, now) > model.queueScore(evergreen, now));
}

{
  const future = approvedItem({ warehouse: { bucket: "hot", priority: 5, status: "active", notBefore: "2026-09-15T00:00:00Z" } });
  assert.equal(model.queueEligibility(future, now).reason, "not-before");
}

{
  const pendingCard = approvedItem({
    cardFactory: { storyboard: { cards: [{ type: "hook" }, { type: "capture-image" }] }, privacy: { gate: { allowed: false } } },
  });
  assert.equal(model.cardPrivacyPass(pendingCard), false);
  assert.equal(model.deriveStage(pendingCard), "review");

  const reviewedCard = approvedItem({
    cardFactory: { storyboard: { cards: [{ type: "hook" }, { type: "capture-image" }] }, privacy: { gate: { allowed: true } } },
  });
  assert.equal(model.cardPrivacyPass(reviewedCard), true);
}

console.log("Warehouse model regression tests passed.");
