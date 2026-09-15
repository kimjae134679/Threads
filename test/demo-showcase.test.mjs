import assert from "node:assert/strict";
import fs from "node:fs";

const path = new URL("../data/demo-showcase-2026-09-15.json", import.meta.url);
const payload = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(payload.demoOnly, true);
assert.equal(payload.productionEligible, false);
assert.ok(Array.isArray(payload.items));
assert.ok(payload.items.length >= 3);

for (const item of payload.items) {
  assert.ok(item.id);
  assert.ok(item.title);
  assert.ok(/^https:\/\//.test(item.sourceUrl));
  assert.ok(item.discoveryLane);
  assert.ok(item.primaryTheme);
  assert.ok(item.sourceEvidence && ["observed", "secondary"].includes(item.sourceEvidence.mode));
  if (item.sourceEvidence.mode === "secondary") {
    assert.equal(item.sourceEvidence.votes, null);
    assert.equal(item.sourceEvidence.comments, null);
  }
  assert.notEqual(item.publicationAllowed, true);
  assert.ok(item.scores && Number.isFinite(Number(item.scores.viral)));
  assert.ok(item.scores && Number.isFinite(Number(item.scores.audienceComfort)));
  const cards = item.storyboard?.cards || [];
  assert.ok(cards.length >= 3);
  assert.equal(cards[0].type, "hook");
  assert.equal(cards.at(-1).type, "ending");
  assert.ok(item.caption);
  assert.ok(Array.isArray(item.nextChecks) && item.nextChecks.length);
}

const ui = fs.readFileSync(new URL("../app/features/discovery/demo/demo-showcase.js", import.meta.url), "utf8");
for (const expected of [
  "DEMO SHOWCASE",
  "productionEligible=${String(data.productionEligible)}",
  "Inbox로 복사",
  "데모 SVG 받기",
  "카드별 PNG 받기",
  "downloadPngCards",
  "canvas.toBlob",
  "downloadPreview",
  "DEMO_ONLY-${safeFileName(item.id)}-storyboard.svg",
  "demoOnly: true",
  "productionEligible: false",
  "demo_requires_human_review",
]) {
  assert.ok(ui.includes(expected), `demo showcase UI missing ${expected}`);
}

console.log("Demo showcase regression tests passed.");
