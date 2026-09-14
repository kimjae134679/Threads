import assert from "node:assert/strict";
import { fetchSourceAsset, getSourceAssetCapabilities, validateSourceAssetUrl } from "../source-assets.mjs";
const capability = getSourceAssetCapabilities();
assert.equal(capability.pageScraping, false);
assert.equal(capability.bulkCrawling, false);
assert.equal(capability.generatedImagesDefault, false);
assert.ok(capability.maxBytes > 0);
assert.equal(validateSourceAssetUrl("https://i.redd.it/example.jpg").ok, true);
assert.equal(validateSourceAssetUrl("https://preview.redd.it/example.png?width=1080").ok, true);
assert.equal(validateSourceAssetUrl("https://scontent.cdninstagram.com/example.jpg").ok, true);
assert.equal(validateSourceAssetUrl("https://pbs.twimg.com/media/example.jpg").ok, true);
assert.equal(validateSourceAssetUrl("http://i.redd.it/example.jpg").error, "https_required");
assert.equal(validateSourceAssetUrl("https://example.com/image.jpg").error, "host_not_allowlisted");
assert.equal(validateSourceAssetUrl("https://user:pass@i.redd.it/example.jpg").error, "credentials_in_url_forbidden");
const png = Buffer.from([137,80,78,71]);
const image = await fetchSourceAsset("https://i.redd.it/example.png", { fetchImpl: async () => new Response(png, { status: 200, headers: { "content-type": "image/png", "content-length": String(png.length) } }) });
assert.equal(image.contentType, "image/png");
assert.equal(image.bytes, png.length);await assert.rejects(
  fetchSourceAsset("https://i.redd.it/example.jpg", { fetchImpl: async () => new Response("", { status: 302, headers: { location: "https://example.com/private.jpg" } }) }),
  (error) => error.code === "source_asset_redirect_blocked" && error.status === 400
);
await assert.rejects(
  fetchSourceAsset("https://i.redd.it/example.svg", { fetchImpl: async () => new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }) }),
  (error) => error.code === "source_asset_not_supported_image" && error.status === 415
);
console.log("Source asset acquisition policy regression tests passed.");