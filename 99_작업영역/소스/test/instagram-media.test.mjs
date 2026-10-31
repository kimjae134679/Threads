import assert from "node:assert/strict";
import { getInstagramMediaCapabilities, buildInstagramMediaDryRun, validateInstagramMediaContainers } from "../instagram.mjs";

assert.equal(getInstagramMediaCapabilities({}).state, "credential-required");
const configured = {
  INSTAGRAM_ACCESS_TOKEN: "test-token",
  INSTAGRAM_USER_ID: "123456789",
  INSTAGRAM_GRAPH_API_VERSION: "v99.0",
  INSTAGRAM_REQUIRED_SCOPES: "scope_a,scope_b",
};
assert.equal(getInstagramMediaCapabilities(configured).state, "live-disabled");
assert.equal(getInstagramMediaCapabilities(configured).validationState, "live-disabled");
assert.equal(getInstagramMediaCapabilities({ ...configured, INSTAGRAM_MEDIA_VALIDATION_ENABLED: "1" }).state, "ready-to-validate");
assert.equal(getInstagramMediaCapabilities({ ...configured, INSTAGRAM_MEDIA_LIVE_ENABLED: "1" }).mediaLiveEnabled, true);

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

const validationEnv = { ...configured, INSTAGRAM_MEDIA_VALIDATION_ENABLED: "1" };
await assert.rejects(() => validateInstagramMediaContainers({ mediaUrls: ["https://media.example.com/a.png"], env: configured, fetchImpl: async () => { throw new Error("must not call"); } }), /validation is disabled/);
const imageCalls = [];
const imageValidation = await validateInstagramMediaContainers({
  caption: "approved caption",
  mediaUrls: ["https://media.example.com/a.png"],
  env: validationEnv,
  fetchImpl: async (url, options) => { imageCalls.push({ url, body: String(options.body) }); return { ok: true, status: 200, async json() { return { id: "container-image-1" }; } }; },
});
assert.equal(imageValidation.validation, "container-created");
assert.equal(imageValidation.externalCalls, 1);
assert.equal(imageValidation.livePublicationAttempted, false);
assert.equal(imageValidation.mediaPublishEndpointCalled, false);
assert.equal(imageValidation.providerMediaProcessingVerified, false);
assert.equal(imageCalls.length, 1);
assert.match(imageCalls[0].url, /\/v99\.0\/123456789\/media$/);
assert.ok(imageCalls[0].body.includes("image_url=https%3A%2F%2Fmedia.example.com%2Fa.png"));
assert.ok(imageCalls[0].body.includes("access_token=test-token"));
assert.ok(!imageCalls[0].url.includes("media_publish"));

let nextId = 0;
const carouselCalls = [];
const carouselValidation = await validateInstagramMediaContainers({
  caption: "carousel",
  mediaUrls: ["https://media.example.com/1.png", "https://media.example.com/2.png"],
  env: validationEnv,
  fetchImpl: async (url, options) => { carouselCalls.push({ url, body: String(options.body) }); nextId += 1; return { ok: true, status: 200, async json() { return { id: `container-${nextId}` }; } }; },
});
assert.equal(carouselValidation.mediaType, "CAROUSEL");
assert.equal(carouselValidation.externalCalls, 3);
assert.deepEqual(carouselValidation.childContainerIds, ["container-1", "container-2"]);
assert.ok(carouselCalls[0].body.includes("is_carousel_item=true"));
assert.ok(carouselCalls[2].body.includes("media_type=CAROUSEL"));
assert.ok(carouselCalls[2].body.includes("children=container-1%2Ccontainer-2"));
assert.ok(carouselCalls.every((call) => !call.url.includes("media_publish")));

await assert.rejects(
  () => validateInstagramMediaContainers({ mediaUrls: ["https://media.example.com/a.png"], env: validationEnv, fetchImpl: async () => ({ ok: false, status: 400, async json() { return { error: { message: "token test-token must not leak", code: 190, error_subcode: 463 } }; } }) }),
  (error) => error.code === "instagram_provider_validation_failed" && error.upstreamStatus === 400 && error.upstreamCode === 190 && error.upstreamSubcode === 463 && !error.message.includes("test-token")
);

console.log("Instagram media dry-run/provider validation regression tests passed.");
