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
let summary = bulk.summarize(result);
assert.equal(summary.changedCount, 1);
assert.equal(summary.skippedCount, 2);
assert.equal(Object.values(summary.skippedReasons).reduce((total, count) => total + count, 0), 2);

review.comfortReview = comfort.appendAudit(review, "approve", "비그래픽 기사", { viralModel: viral, reviewedAt: "2026-09-14T06:31:00+09:00" });
result = bulk.apply([review], ["review"], "editorial-handoff", { comfortModel: comfort, viralModel: viral });
assert.deepEqual(Array.from(result.changed), ["review"]);
assert.equal(review.status, "research");

result = bulk.apply([safe, review], ["safe", "review"], "tag", { comfortModel: comfort, viralModel: viral, tag: "  회사썰  " });
assert.equal(result.changed.length, 2);
assert.ok(safe.reviewTags.includes("회사썰"));

result = bulk.apply([safe], ["safe"], "tag", { comfortModel: comfort, viralModel: viral, tag: "AI   뉴스" });
assert.ok(safe.reviewTags.includes("ai 뉴스"));
result = bulk.apply([safe], ["safe"], "tag", { comfortModel: comfort, viralModel: viral, tag: "ＡＩ 뉴스" });
assert.equal(safe.reviewTags.filter((tag) => tag === "ai 뉴스").length, 1);
assert.equal(bulk.normalizeTag("  AI   뉴스  "), "ai 뉴스");

result = bulk.apply([safe], ["safe"], "remove-tag", { comfortModel: comfort, viralModel: viral, tag: " AI 뉴스 " });
assert.deepEqual(Array.from(result.changed), ["safe"]);
assert.ok(!safe.reviewTags.includes("ai 뉴스"));
result = bulk.apply([safe], ["safe"], "remove-tag", { comfortModel: comfort, viralModel: viral, tag: "없는태그" });
assert.equal(result.changed.length, 0);
assert.equal(result.skipped[0].reason, "tag-not-present");

safe.reviewTags = [" 회사썰 ", "회사썰", "AI  뉴스"];
assert.deepEqual(Array.from(bulk.normalizedTags(safe)), ["회사썰", "ai 뉴스"]);
const packet = bulk.editorialPacket(safe, { comfortModel: comfort, viralModel: viral, appliedAt: "2026-09-14T06:40:00+09:00" });
assert.deepEqual(Array.from(packet.reviewTags), ["회사썰", "ai 뉴스"]);

result = bulk.apply([blocked], ["blocked"], "reject", { comfortModel: comfort, viralModel: viral });
assert.deepEqual(Array.from(result.changed), ["blocked"]);
assert.equal(blocked.status, "skip");

console.log("Bulk candidate review model regression tests passed.");
