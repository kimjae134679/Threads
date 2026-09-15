import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/features/production/video/vertical-video.js", import.meta.url), "utf8");

assert.match(source, /const detailTitle = document\.querySelector\("#detailTitle"\)/);
assert.match(source, /document\.addEventListener\("threads:content-revision-changed", \(\) => queueMicrotask\(refresh\)\);/);
assert.match(source, /new MutationObserver\(\(\) => queueMicrotask\(refresh\)\)/);
assert.match(source, /selectionObserver\?\.observe\(detailTitle, \{ childList: true, subtree: true, characterData: true \}\)/);
assert.match(source, /observer\.observe\(preview, \{ childList: true, subtree: false \}\)/);
assert.doesNotMatch(source, /observe\(document\.(body|documentElement)/);
assert.match(source, /rightsSelect\.addEventListener\("change", \(\) => \{ rightsSelect\.dataset\.dirty = "true"; \}\)/);
assert.match(source, /const nextRightsContext = item\.id;/);
assert.match(source, /if \(rightsSelect\.dataset\.dirty !== "true"\) \{/);
assert.match(source, /const selectedStatus = rightsSelect\.value;/);
assert.match(source, /rightsSelect\.dataset\.dirty = "false";/);
assert.doesNotMatch(source, /const nextRightsContext = `\$\{item\.id\}:\$\{item\.cardFactory/);
assert.match(source, /const artifactCurrent = artifact\?\.handoffBasisUpdatedAt === item\.updatedAt;/);
assert.match(source, /if \(artifact\?\.downloadPath && artifactCurrent\) \{/);
assert.match(source, /if \(artifact\?\.downloadPath\) download\.setAttribute\("aria-disabled", "true"\);/);

console.log("Vertical production UI selection-sync and pending-rights regression tests passed.");
