import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/warehouse-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Number, Math, Date, Array, Set });
vm.runInContext(source, context, { filename: "warehouse-model.js" });
const model = context.window.ThreadsWarehouseModel;

assert.ok(model, "Warehouse model must register on window");

const now = Date.parse("2026-09-14T00:00:00Z");

function approvedItem(overrides = {}) {
  const updatedAt = "2026-09-13T23:00:00Z";
  return {
    id: "x",
    title: "example",
    url: "https://example.com/post?utm_source=test",
    createdAt: "2026-09-13T12:00:00Z",
    updatedAt,
    draftStudio: { generated: { threads: { hook: "h", body: "b", cta: "" } }, reviewStatus: "approved" },
    researchBundle: { reviewStatus: "reviewed" },
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
  const ready = approvedItem({ id: "ready", warehouse: { bucket: "ready", priority: 3, status: "active" } });
  const evergreen = approvedItem({ id: "green", warehouse: { bucket: "evergreen", priority: 3, status: "active" } });
  const ordered = model.sortForQueue([evergreen, ready, hot], now);
  assert.equal(ordered[0].id, "hot");
  assert.equal(ordered[1].id, "ready");
  assert.ok(model.queueScore(hot, now) > model.queueScore(ready, now));
  assert.ok(model.queueScore(ready, now) > model.queueScore(evergreen, now));
}

{
  const future = approvedItem({ warehouse: { bucket: "hot", priority: 5, status: "active", notBefore: "2026-09-15T00:00:00Z" } });
  assert.equal(model.queueEligibility(future, now).reason, "not-before");
  assert.equal(model.freshnessState(future, now), "scheduled");
}

{
  const expired = approvedItem({ warehouse: { bucket: "hot", priority: 5, status: "active", expiresAt: "2026-09-13T23:59:00Z" } });
  assert.equal(model.queueEligibility(expired, now).reason, "expired");
  assert.equal(model.freshnessState(expired, now), "expired");
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
  assert.equal(model.assetSummary(reviewedCard).imagePrivacyReviewed, true);
}

{
  const normalized = model.normalizeWarehouse({
    warehouse: {
      bucket: "ready",
      themeTags: [" AI ", "ＡＩ", "Work Story"],
      formatTags: "Carousel, short Video, carousel",
      history: [{ at: "2026-09-13T00:00:00Z", action: "created" }],
    },
  });
  assert.equal(normalized.bucket, "ready");
  assert.deepEqual([...normalized.themeTags], ["ai", "work story"]);
  assert.deepEqual([...normalized.formatTags], ["carousel", "short video"]);
  assert.equal(normalized.history.length, 1);
}

{
  const previous = model.normalizeWarehouse({ warehouse: { bucket: "ready", priority: 3, status: "active", themeTags: ["ai"] } });
  const next = { ...previous, bucket: "hot", priority: 5, themeTags: ["ai", "breaking"] };
  const history = model.appendHistory(previous, next, "2026-09-14T00:00:00Z");
  assert.ok(history.some((entry) => entry.action === "set-bucket" && entry.to === "hot"));
  assert.ok(history.some((entry) => entry.action === "set-priority" && entry.to === "5"));
  assert.ok(history.some((entry) => entry.action === "set-themeTags"));
}

{
  const item = approvedItem({
    discoveryNormalized: {
      canonicalUrl: "https://example.com/post",
      source: "reddit",
      lane: "community_debate",
      sourceRisk: "yellow",
      adapterStatus: "connected",
      engagementEvidence: { mode: "observed", likes: 100, comments: 20 },
    },
  });
  const provenance = model.provenanceSnapshot(item);
  assert.equal(provenance.candidateId, "x");
  assert.equal(provenance.canonicalUrl, "https://example.com/post");
  assert.equal(provenance.source, "reddit");
  assert.equal(provenance.observedEngagement.likes, 100);
  const reviews = model.reviewSummary(item);
  assert.equal(reviews.research, "reviewed");
  assert.equal(reviews.draft, "approved");
  assert.equal(reviews.safety, "pass");
  assert.equal(reviews.publishApprovalCurrent, true);
}

console.log("Warehouse model regression tests passed.");
