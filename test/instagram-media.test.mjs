import assert from "node:assert/strict";
import { getInstagramMediaCapabilities, buildInstagramMediaDryRun } from "../instagram.mjs";

assert.equal(getInstagramMediaCapabilities({}).state, "credential-required");
const configured = {
  INSTAGRAM_ACCESS_TOKEN: "test-token",
  INSTAGRAM_USER_ID: "123456789",
  INSTAGRAM_GRAPH_API_VERSION: "v99.0",
  INSTAGRAM_REQUIRED_SCOPES: "scope_a,scope_b",
};
assert.equal(getInstagramMediaCapabilities(configured).state, "live-disabled");
assert.equal(getInstagramMediaCapabilities({ ...configured, INSTAGRAM_MEDIA_LIVE_ENABLED: "1" }).state, "ready-to-validate");

const image = buildInstagramMediaDryRun({ caption: "hello", mediaUrls: ["https://media.example.com/a.png"], env: configured });
assert.equal(image.mediaType, "IMAGE");
assert.equal(image.mediaCount, 1);
assert.equal(image.externalCalls, 0);
assert.equal(image.steps[0].action, "create-media-container");
assert.match(image.steps[0].path, /^\/v99\.0\/123456789\/media$/);
assert.equal(image.steps.at(-1).action, "publish-container");

const carousel = buildInstagramMediaDryRun({ mediaUrls: ["https://media.example.com/1.png", "https://media.example.com/2.png"], env: configured });
assert.equal(carousel.mediaType, "CAROUSEL");
assert.equal(carousel.steps.filter((step) => step.action === "create-carousel-child").length, 2);
assert.ok(carousel.steps.some((step) => step.action === "create-carousel-parent"));
assert.throws(() => buildInstagramMediaDryRun({ mediaUrls: ["http://media.example.com/a.png"], env: configured }), /public HTTPS/);
assert.throws(() => buildInstagramMediaDryRun({ mediaUrls: Array.from({ length: 11 }, (_, i) => `https://media.example.com/${i}.png`), env: configured }), /at most 10/);
console.log("Instagram media dry-run regression tests passed.");
