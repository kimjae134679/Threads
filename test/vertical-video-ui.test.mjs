import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/features/production/video/vertical-video.js", import.meta.url), "utf8");

assert.match(source, /const detailTitle = document\.querySelector\("#detailTitle"\)/);
assert.match(source, /new MutationObserver\(\(\) => queueMicrotask\(refresh\)\)/);
assert.match(source, /selectionObserver\?\.observe\(detailTitle, \{ childList: true, subtree: true, characterData: true \}\)/);
assert.match(source, /observer\.observe\(preview, \{ childList: true, subtree: false \}\)/);
assert.doesNotMatch(source, /observe\(document\.(body|documentElement)/);

console.log("Vertical production UI selection-sync regression test passed.");
