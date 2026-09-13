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
  "card-story-model.js",
  "warehouse-model.js",
  "content-warehouse.js",
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

const bulkModel = fs.readFileSync(new URL("../app/features/discovery/viral/bulk-review-model.js", import.meta.url), "utf8");
for (const expected of ["editorial-handoff","editorialPacket","mayAdvance","reviewTags","bulkReview"]) {
  assert.ok(bulkModel.includes(expected), `Bulk review model missing ${expected}`);
}

const bulkReview = fs.readFileSync(new URL("../app/features/discovery/viral/bulk-review.js", import.meta.url), "utf8");
for (const expected of ["보이는 항목 선택","선택 보류","태그 적용","선택 → 편집 검토"]) {
  assert.ok(bulkReview.includes(expected), `Bulk review UI missing ${expected}`);
}

console.log("Feature layout regression tests passed.");
