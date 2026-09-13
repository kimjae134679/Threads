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

const normalizationSync = fs.readFileSync(new URL("../app/features/discovery/sources/source-normalization-sync.js", import.meta.url), "utf8");
for (const expected of [
  "ThreadsDiscoverySourceModel",
  "normalizeCandidate",
  "discoveryNormalized",
  "candidate-list-render",
  "manual-candidate",
  "google-trends-trigger",
  "json-import-trigger",
  "normalizedAt",
  "normalizedBy",
]) {
  assert.ok(normalizationSync.includes(expected), `Discovery normalization sync missing ${expected}`);
}

const viralReview = fs.readFileSync(new URL("../app/viral-review.js", import.meta.url), "utf8");
for (const expected of [
  "ThreadsDiscoverySourceModel",
  "discoveryNormalized",
  "normalizeCandidate",
  "viralEvidenceFilter",
  "viralSourceRiskFilter",
  'data-group-action="select"',
  'data-group-action="collapse"',
  'data-group-action="keep-strongest"',
  "duplicateResolution",
]) {
  assert.ok(viralReview.includes(expected), `Viral Finder bulk-review wiring missing ${expected}`);
}

const groupActions = fs.readFileSync(new URL("../app/features/discovery/viral/group-actions.js", import.meta.url), "utf8");
for (const expected of [
  "groupDisposition",
  "data-group-bulk-status",
  "hold-alternatives",
  "same-story-alternative-hold",
  "그룹 → 조사",
  "그룹 보류",
  "그룹 패스",
  "최고점 유지 · 대안 보류",
]) {
  assert.ok(groupActions.includes(expected), `Viral group-action feature missing ${expected}`);
}

const comfortModel = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-model.js", import.meta.url), "utf8");
for (const expected of [
  "blocked_comfort_cannot_be_human_approved",
  "reviewSource",
  "categoriesAtReview",
  "safeBatchDisposition",
  "skip-blocked",
]) {
  assert.ok(comfortModel.includes(expected), `Audience Comfort model missing ${expected}`);
}

const comfortReview = fs.readFileSync(new URL("../app/features/discovery/comfort/comfort-review.js", import.meta.url), "utf8");
for (const expected of [
  "AUDIENCE COMFORT / HUMAN REVIEW",
  "comfortCategoryFilter",
  "사람 검토 승인",
  "자동 BLOCK · 승인 불가",
  "comfortBatchSkipBlocked",
  "scanSignature",
]) {
  assert.ok(comfortReview.includes(expected), `Audience Comfort UI missing ${expected}`);
}

console.log("Feature layout regression tests passed.");
