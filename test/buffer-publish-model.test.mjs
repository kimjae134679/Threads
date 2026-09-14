import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/features/publish/buffer/buffer-publish-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, Date, JSON, String, Array, Error });
vm.runInContext(source, context, { filename: "buffer-publish-model.js" });
const model = context.window.ThreadsBufferPublishModel;
assert.ok(model, "Buffer publish model must register on window");

const now = new Date().toISOString();
const candidate = {
  id: "candidate-1",
  updatedAt: now,
  publishApproval: { status: "approved", approvedAt: now, basisUpdatedAt: now },
  draftStudio: {
    reviewStatus: "approved",
    manualEdits: { threads: "승인된 Threads 원고" },
  },
  experimentAssignment: { accountId: "TH-A", hypothesisId: "H-001", variantId: "V-A", goal: "engagement", updatedAt: now },
};

assert.equal(model.isCurrentPublishApproval(candidate), true);
assert.equal(model.approvedThreadsText(candidate), "승인된 Threads 원고");
assert.equal(model.textLength(candidate), 14);
assert.equal(model.latestDeliveryForApproval(candidate), null);

{
  const request = model.buildRequest(candidate, "addToQueue");
  assert.equal(request.mode, "addToQueue");
  assert.equal(request.candidate.id, "candidate-1");
}

{
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const request = model.buildRequest(candidate, "customScheduled", future);
  assert.equal(request.mode, "customScheduled");
  assert.equal(request.dueAt, future);
}

{
  const record = model.deliveryRecord({
    id: "buffer-post-1",
    status: "scheduled",
    mode: "customScheduled",
    dueAt: new Date(Date.now() + 3_600_000).toISOString(),
    text: "승인된 Threads 원고",
  }, candidate);
  assert.equal(record.provider, "buffer");
  assert.equal(record.platform, "threads");
  assert.equal(record.approvalBasis, now);
  assert.equal(record.experiment.accountId, "TH-A");
}

{
  const stale = { ...candidate, updatedAt: new Date(Date.now() + 5_000).toISOString() };
  assert.equal(model.isCurrentPublishApproval(stale), false);
  assert.throws(() => model.buildRequest(stale, "shareNow"), /publish_approval_not_current/);
}

console.log("Buffer publish UI model regression tests passed.");
