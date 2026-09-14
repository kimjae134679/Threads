import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/features/publish/official-media/official-media-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Array, Object, RegExp, Set });
vm.runInContext(source, context, { filename: "official-media-model.js" });
const model = context.window.ThreadsOfficialMediaModel;

assert.equal(model.targetSpec("threads-feed").maxItems, 20);
assert.equal(model.targetSpec("instagram-feed").maxItems, 10);
assert.equal(model.targetSpec("instagram-feed").outputProfile, "reference-square");
assert.equal(model.targetSpec("instagram-reel").outputProfile, "vertical-video");
assert.equal(model.targetSpec("youtube-short").outputProfile, "vertical-video");
assert.equal(model.targetCapability("instagram-reel", { configured: true, mediaLiveEnabled: true }), "unsupported");
assert.equal(model.targetCapability("youtube-short", { configured: true, mediaLiveEnabled: true }), "unsupported");

const ig = model.validateTarget("instagram-feed", ["https://example.com/a.png", "https://example.com/b.png"], {});
assert.equal(ig.ok, true);
assert.equal(ig.mediaType, "CAROUSEL");
assert.equal(ig.capabilityState, "credential-required");

const tooManyIg = model.validateTarget("instagram-feed", Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.png`), {});
assert.equal(tooManyIg.ok, false);
assert.ok(tooManyIg.errors.includes("too_many_items_for_target"));

const bad = model.validateTarget("threads-feed", ["http://example.com/a.png"], {});
assert.equal(bad.ok, false);
assert.ok(bad.errors.includes("media_url_must_be_https"));

console.log("Official media target regression tests passed.");
