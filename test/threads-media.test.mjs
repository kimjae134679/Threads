import assert from "node:assert/strict";
import { buildThreadsMediaDryRun, getThreadsMediaCapabilities } from "../threads.mjs";

const oldToken = process.env.THREADS_ACCESS_TOKEN;
const oldLive = process.env.THREADS_MEDIA_LIVE_ENABLED;
delete process.env.THREADS_ACCESS_TOKEN;
delete process.env.THREADS_MEDIA_LIVE_ENABLED;
assert.equal(getThreadsMediaCapabilities().state, "credential-required");

process.env.THREADS_ACCESS_TOKEN = "test-token";
assert.equal(getThreadsMediaCapabilities().state, "live-disabled");
process.env.THREADS_MEDIA_LIVE_ENABLED = "1";
assert.equal(getThreadsMediaCapabilities().state, "ready-to-validate");

const image = buildThreadsMediaDryRun({ text: "hello", mediaUrls: ["https://example.com/one.png"] });
assert.equal(image.mediaType, "IMAGE");
assert.equal(image.mediaCount, 1);
assert.equal(image.dryRun, true);

const carousel = buildThreadsMediaDryRun({ mediaUrls: ["https://example.com/1.png", "https://example.com/2.png"] });
assert.equal(carousel.mediaType, "CAROUSEL");
assert.equal(carousel.steps.filter((step) => step.action === "create-carousel-child").length, 2);
assert.throws(() => buildThreadsMediaDryRun({ mediaUrls: ["http://example.com/a.png"] }), /HTTPS/);
assert.throws(() => buildThreadsMediaDryRun({ mediaUrls: [] }), /최소 1개/);

if (oldToken === undefined) delete process.env.THREADS_ACCESS_TOKEN; else process.env.THREADS_ACCESS_TOKEN = oldToken;
if (oldLive === undefined) delete process.env.THREADS_MEDIA_LIVE_ENABLED; else process.env.THREADS_MEDIA_LIVE_ENABLED = oldLive;
console.log("Threads media dry-run regression tests passed.");