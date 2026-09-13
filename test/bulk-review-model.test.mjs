import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const viralSource = fs.readFileSync(new URL("../app/viral-model.js", import.meta.url), "utf8");
const comfortSource = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-model.js", import.meta.url), "utf8");
const bulkSource = fs.readFileSync(new URL("../app/features/discovery/viral/bulk-review-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, Date, Math, Number, String, RegExp, Set });
vm.runInContext(viralSource, context);
vm.runInContext(comfortSource, context);
vm.runInContext(bulkSource, context);

const viral = context.window.ThreadsViralModel;
const comfort = context.window.ThreadsComfortReviewModel;
const bulk = context.window.ThreadsBulkReviewModel;

const safe = { id: "safe", title: "고양이 박스 낮잠", status: "inbox", sourceRisk: "green" };
const review = { id: "review", title: "폭행 사건 판결 기사", status: "inbox", sourceRisk: "green" };
const blocked = { id: "blocked", title: "동물 학대 고어 영상", status: "inbox", sourceRisk: "red" };

let result = bulk.apply([safe, review, blocked], ["safe", "review", "blocked"], "editorial-handoff", { comfortModel: comfort, viralModel: viral, appliedAt: "2026-09-14T06:30:00+09:00" });
assert.deepEqual(Array.from(result.changed), ["safe"]);
assert.equal(result.skipped.length, 2);
assert.ok(safe.editorialHandoff);
assert.equal(safe.editorialHandoff.comfort.clearance.allowed, true);

review.comfortReview = comfort.appendAudit(review, "approve", "비그래픽 기사", { viralModel: viral, reviewedAt: "2026-09-14T06:31:00+09:00" });
result = bulk.apply([review], ["review"], "editorial-handoff", { comfortModel: comfort, viralModel: viral });
assert.deepEqual(Array.from(result.changed), ["review"]);
assert.equal(review.status, "research");

result = bulk.apply([safe, review], ["safe", "review"], "tag", { comfortModel: comfort, viralModel: viral, tag: "회사썰" });
assert.equal(result.changed.length, 2);
assert.ok(safe.reviewTags.includes("회사썰"));

result = bulk.apply([blocked], ["blocked"], "reject", { comfortModel: comfort, viralModel: viral });
assert.deepEqual(Array.from(result.changed), ["blocked"]);
assert.equal(blocked.status, "skip");

console.log("Bulk candidate review model regression tests passed.");
