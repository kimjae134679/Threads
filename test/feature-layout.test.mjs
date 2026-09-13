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
  "app/features/discovery/sources/source-review.js",
  "app/features/discovery/sources/source-review.css",
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
  "features/discovery/sources/source-review.js",
  "viral-model.js",
  "card-story-model.js",
  "warehouse-model.js",
  "content-warehouse.js",
]) {
  assert.ok(loader.includes(expected), `feature loader missing ${expected}`);
}

const assignment = fs.readFileSync(new URL("../app/experiment-assignment.js", import.meta.url), "utf8");
assert.ok(assignment.includes("bootstrap/feature-loader.js"), "feature bootstrap entrypoint must be loaded from base app");
assert.equal((assignment.match(/loadCompanion/g) || []).length, 0, "assignment module must not own cross-feature load chains");

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

console.log("Feature layout regression tests passed.");
