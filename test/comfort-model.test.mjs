import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const viralSource = fs.readFileSync(new URL("../app/viral-model.js", import.meta.url), "utf8");
const comfortSource = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, Date, Math, Number, String, RegExp });
vm.runInContext(viralSource, context, { filename: "viral-model.js" });
vm.runInContext(comfortSource, context, { filename: "comfort-model.js" });

const viral = context.window.ThreadsViralModel;
const comfort = context.window.ThreadsComfortReviewModel;
assert.ok(viral);
assert.ok(comfort);

{
  const result = viral.comfortScan("동 물 학 대 + g o r e clip");
  assert.equal(result.blocked, true);
  assert.ok(result.blockReasons.includes("animal_abuse"));
  assert.ok(result.blockReasons.includes("graphic_violence"));
}

{
  const result = viral.comfortScan("public post tried d.o.x.x on a private person");
  assert.equal(result.blocked, true);
  assert.ok(result.blockReasons.includes("doxxing"));
}

{
  const item = { id: "review-1", title: "폭행 사건 판결을 설명하는 기사" };
  assert.equal(comfort.mayHumanApprove(item, viral), true);
  assert.equal(comfort.mayAdvance(item, "ready", viral).allowed, false, "REVIEW must not reach ready before human clearance");
  item.comfortReview = comfort.appendAudit(item, "approve", "비그래픽 사건 설명", {
    viralModel: viral,
    reviewedAt: "2026-09-14T05:00:00+09:00",
  });
  assert.equal(item.comfortReview.outcome, "approve");
  assert.equal(item.comfortReview.reviewer, null, "reviewer identity must not be fabricated");
  assert.equal(item.comfortReview.audit.length, 1);
  assert.deepEqual(Array.from(item.comfortReview.audit[0].reviewReasonsAtReview), ["physical_violence"]);
  assert.equal(item.comfortReview.humanClearedReview, true);
  assert.equal(comfort.mayAdvance(item, "ready", viral).allowed, true, "matching human clearance should permit ready");
}

{
  const item = { id: "stale-review", title: "폭행 사건 판결 기사" };
  item.comfortReview = comfort.appendAudit(item, "approve", "비그래픽 기사", { viralModel: viral, reviewedAt: "2026-09-14T05:10:00+09:00" });
  assert.equal(comfort.clearanceStatus(item, viral).code, "human-cleared-review");
  item.title = "폭행 사건 판결 기사와 사망 보도";
  const stale = comfort.clearanceStatus(item, viral);
  assert.equal(stale.allowed, false);
  assert.equal(stale.code, "stale-human-review", "content/scan changes must invalidate the prior human clearance");
}

{
  const item = { id: "blocked-1", title: "동물 학대 고어 영상" };
  assert.throws(
    () => comfort.appendAudit(item, "approve", "", { viralModel: viral }),
    /blocked_comfort_cannot_be_human_approved/,
  );
  assert.equal(comfort.mayAdvance(item, "ready", viral).allowed, false);
}

{
  const item = { id: "safe-1", title: "고양이가 박스에서 낮잠자는 영상" };
  const clearance = comfort.clearanceStatus(item, viral);
  assert.equal(clearance.allowed, true);
  assert.equal(clearance.code, "comfortable");
  const exported = comfort.exportEnvelope(item, viral);
  assert.equal(exported.clearance.allowed, true);
  assert.deepEqual(Array.from(exported.audit), []);
}

{
  const items = [
    { id: "b", title: "g o r e footage", status: "inbox" },
    { id: "r", title: "폭행 사건 판결 기사", status: "inbox", comfortReview: { humanClearedReview: true, humanClearanceSignature: "old" } },
    { id: "s", title: "고양이 사진", status: "inbox" },
  ];
  const blockBatch = comfort.safeBatchDisposition(items, "skip-blocked", { level: "blocked", category: "all" }, viral);
  assert.deepEqual(Array.from(blockBatch.changed), ["b"]);
  assert.equal(items[0].status, "skip");
  const holdBatch = comfort.safeBatchDisposition(items, "hold", { level: "review", category: "physical_violence" }, viral);
  assert.deepEqual(Array.from(holdBatch.changed), ["r"]);
  assert.equal(items[1].status, "inbox");
  assert.equal(items[1].comfortReview.humanClearedReview, false, "holding a REVIEW candidate must clear previous downstream approval");
}

console.log("Audience Comfort model regression tests passed.");
