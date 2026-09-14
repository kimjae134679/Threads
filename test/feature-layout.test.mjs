import assert from "node:assert/strict";
import fs from "node:fs";

const requiredFiles = [
  "app/bootstrap/feature-loader.js",
  "app/features/README.md",
  "app/features/themes/README.md",
  "app/features/themes/theme-taxonomy.js",
  "app/features/themes/theme-model.js",
  "app/features/themes/theme-review.js",
  "app/features/themes/theme-review.css",
  "app/features/discovery/sources/README.md",
  "app/features/discovery/sources/source-registry.js",
  "app/features/discovery/sources/source-model.js",
  "app/features/discovery/sources/source-normalization-sync.js",
  "app/features/discovery/sources/source-review.js",
  "app/features/discovery/sources/source-review.css",
  "app/features/discovery/viral/group-actions.js",
  "app/features/discovery/viral/bulk-review-model.js",
  "app/features/discovery/viral/bulk-review.js",
  "app/features/discovery/comfort/comfort-model.js",
  "app/features/discovery/comfort/comfort-review.js",
  "app/features/discovery/comfort/comfort-review.css",
  "app/features/production/media/source-asset-model.js",
  "app/features/production/cards/privacy-mask-model.js",
  "app/features/production/cards/privacy-mask.js",
  "app/features/publish/buffer/buffer-publish-model.js",
  "app/features/publish/buffer/buffer-publisher.js",
  "app/features/publish/buffer/buffer-publisher.css",
  "app/features/publish/official-media/README.md",
  "app/features/publish/official-media/official-media-model.js",
  "app/features/publish/official-media/official-media-publisher.js",
  "app/features/publish/official-media/official-media-publisher.css",
  "app/ARCHITECTURE.md",
];

for (const path of requiredFiles) {
  assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `missing architecture file: ${path}`);
}

const loader = fs.readFileSync(new URL("../app/bootstrap/feature-loader.js", import.meta.url), "utf8");
for (const expected of [
  "features/themes/theme-taxonomy.js",
  "features/themes/theme-model.js",
  "features/themes/theme-review.js",
  "features/discovery/sources/source-registry.js",
  "features/discovery/sources/source-model.js",
  "features/discovery/sources/source-normalization-sync.js",
  "features/discovery/sources/source-review.js",
  "viral-model.js",
  "viral-review.js",
  "features/discovery/viral/group-actions.js",
  "features/discovery/viral/bulk-review-model.js",
  "features/discovery/viral/bulk-review.js",
  "features/discovery/comfort/comfort-model.js",
  "features/discovery/comfort/comfort-review.js",
  "features/discovery/comfort/comfort-review.css",
  "features/production/media/source-asset-model.js",
  "card-story-model.js",
  "features/production/cards/privacy-mask-model.js",
  "features/production/cards/privacy-mask.js",
  "warehouse-model.js",
  "content-warehouse.js",
  "features/publish/buffer/buffer-publish-model.js",
  "features/publish/buffer/buffer-publisher.js",
  "features/publish/buffer/buffer-publisher.css",
  "features/publish/official-media/official-media-model.js",
  "features/publish/official-media/official-media-publisher.js",
  "features/publish/official-media/official-media-publisher.css",
]) {
  assert.ok(loader.includes(expected), `feature loader missing ${expected}`);
}

const assignment = fs.readFileSync(new URL("../app/experiment-assignment.js", import.meta.url), "utf8");
assert.ok(assignment.includes("bootstrap/feature-loader.js"), "feature bootstrap entrypoint must be loaded from base app");
assert.equal((assignment.match(/loadCompanion/g) || []).length, 0, "assignment module must not own cross-feature load chains");

const comfortModel = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-model.js", import.meta.url), "utf8");
for (const expected of ["blocked_comfort_cannot_be_human_approved","scanSignatureAtReview","clearanceStatus","mayAdvance","stale-human-review","exportEnvelope"]) {
  assert.ok(comfortModel.includes(expected), `Audience Comfort model missing ${expected}`);
}

const comfortReview = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-review.js", import.meta.url), "utf8");
for (const expected of ["viralReadyBtn","Comfort gate","comfort-inline-row","comfort-detail-audit","Comfort 감사 JSON"]) {
  assert.ok(comfortReview.includes(expected), `Audience Comfort UI missing ${expected}`);
}
assert.ok(comfortReview.includes("observer.observe(viralList, { childList: true, subtree: false })"), "Comfort viral observer must not watch its own subtree decorations");
assert.ok(comfortReview.includes("existing.innerHTML !== html"), "Comfort row decoration must be idempotent");

const sourceReview = fs.readFileSync(new URL("../app/features/discovery/sources/source-review.js", import.meta.url), "utf8");
assert.ok(sourceReview.includes("let patchQueued = false"), "Source Review queue must coalesce repeated MutationObserver patches");
assert.ok(sourceReview.includes("new MutationObserver(queuePatch).observe(candidateList, { childList: true })"), "Source Review observer must watch list replacement only, not decorated subtrees");
assert.ok(sourceReview.includes("queueMicrotask(() =>"), "Source Review patches must yield through one queued microtask");

const bulkModel = fs.readFileSync(new URL("../app/features/discovery/viral/bulk-review-model.js", import.meta.url), "utf8");
for (const expected of ["editorial-handoff","editorialPacket","mayAdvance","reviewTags","bulkReview","normalizeTag","remove-tag","summarize"]) {
  assert.ok(bulkModel.includes(expected), `Bulk review model missing ${expected}`);
}

const bulkReview = fs.readFileSync(new URL("../app/features/discovery/viral/bulk-review.js", import.meta.url), "utf8");
for (const expected of ["보이는 항목 선택","선택 보류","태그 적용","태그 제거","태그 필터","선택 → 편집 검토","viralBulkSelectionSummary"]) {
  assert.ok(bulkReview.includes(expected), `Bulk review UI missing ${expected}`);
}

const groupActions = fs.readFileSync(new URL("../app/features/discovery/viral/group-actions.js", import.meta.url), "utf8");
for (const expected of ["그룹 → 편집 검토","ThreadsBulkReviewModel","applyGroupEditorialHandoff","editorial-handoff"]) {
  assert.ok(groupActions.includes(expected), `Group review missing safe editorial handoff path: ${expected}`);
}

const privacyModel = fs.readFileSync(new URL("../app/features/production/cards/privacy-mask-model.js", import.meta.url), "utf8");
for (const expected of ["manual-drag-rectangle","automatedOcrClaimed","automatedFaceDetectionClaimed","exportGate","exportEnvelope","image-privacy-review-required"]) {
  assert.ok(privacyModel.includes(expected), `Card privacy model missing ${expected}`);
}

const privacyUi = fs.readFileSync(new URL("../app/features/production/cards/privacy-mask.js", import.meta.url), "utf8");
for (const expected of ["ThreadsCardPrivacyMaskModel","마스킹 모드","개인정보 검토 완료","blockUnsafeDownloads","Privacy JSON"]) {
  assert.ok(privacyUi.includes(expected), `Card privacy UI missing ${expected}`);
}

assert.ok(privacyUi.includes("observer.observe(preview, { childList: true, subtree: false })"), "Card privacy observer must not watch status/button decorations inside preview cards");

const officialMediaUi = fs.readFileSync(new URL("../app/features/publish/official-media/official-media-publisher.js", import.meta.url), "utf8");
for (const expected of ["/api/media-staging/capabilities", "/api/media-staging/stage", "/api/instagram/media/capabilities", "/api/instagram/media/dry-run", "/api/instagram/media/validate", "04 REVIEW_PUBLISH", "staged-unverified", "externalReachabilityVerified", "canvas.toDataURL(\"image/png\")"]) {
  assert.ok(officialMediaUi.includes(expected), `Official media UI missing safe staging behavior: ${expected}`);
}
assert.ok(officialMediaUi.includes('new MutationObserver(patchQueue).observe(queue, { childList: true })'), "Official media approval observer must not watch its own subtree decorations");

const bufferUi = fs.readFileSync(new URL("../app/features/publish/buffer/buffer-publisher.js", import.meta.url), "utf8");
for (const expected of ["/api/buffer/channels","/api/buffer/channel","/api/buffer/publish","Buffer 예약/게시","500자를 초과"]) {
  assert.ok(bufferUi.includes(expected), `Buffer publisher UI missing ${expected}`);
}

console.log("Feature layout regression tests passed.");

