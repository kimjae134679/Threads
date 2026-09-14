import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const taxonomy = fs.readFileSync(new URL("../app/features/themes/theme-taxonomy.js", import.meta.url), "utf8");
const themeModel = fs.readFileSync(new URL("../app/features/themes/theme-model.js", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../app/features/discovery/sources/source-registry.js", import.meta.url), "utf8");
const sourceModel = fs.readFileSync(new URL("../app/features/discovery/sources/source-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, URL });
vm.runInContext(taxonomy, context);
vm.runInContext(themeModel, context);
vm.runInContext(registry, context);
vm.runInContext(sourceModel, context);

const model = context.window.ThreadsDiscoverySourceModel;
assert.ok(model, "discovery source model must register");

assert.equal(model.inferSourceId({ url: "https://gall.dcinside.com/board/view/?id=test" }), "dcinside");
assert.equal(model.inferSourceId({ url: "https://www.teamblind.com/kr/post/test" }), "blind");
assert.equal(model.inferSourceId({ url: "https://x.com/example/status/1" }), "x");
assert.equal(model.inferSourceId({ url: "https://www.reddit.com/r/memes/comments/abc/test" }), "reddit");
assert.equal(model.inferSourceId({ url: "https://cafe.naver.com/test" }), "naver_cafe");

{
  const item = { title: "회사에서 사원증 차고 다니는 게 이상한 거임?", kind: "story", url: "https://www.teamblind.com/kr/post/test" };
  const lane = model.primaryLane(item);
  assert.ok(["work_career", "community_debate"].includes(lane.id));
  assert.equal(model.matchesLane(item, "work_career"), true);
}

{
  const item = { title: "싱글벙글 오늘 웃긴 짤", kind: "humor", url: "https://gall.dcinside.com/board/view/?id=singbung" };
  assert.equal(model.primaryLane(item).id, "funny_memes");
}

{
  const reddit = model.source("reddit");
  assert.equal(reddit.bulkBodyCollection, false);
  const blind = model.source("blind");
  assert.equal(blind.adapter, "manual-only");
}

{
  const clean = model.canonicalUrl("https://www.reddit.com/r/test/comments/abc/story/?utm_source=x&share=1&id=7#comments");
  assert.equal(clean, "https://reddit.com/r/test/comments/abc/story?id=7");
}

{
  const evidence = model.engagementEvidence({
    viralSignals: { views: 12345, likes: 678 },
    sourceMeta: { commentCount: 91 },
    signals: { popularity: 88, freshness: 72 },
  });
  assert.equal(evidence.level, "observed");
  assert.equal(evidence.observed.views.value, 12345);
  assert.equal(evidence.observed.views.origin, "manual-observed");
  assert.equal(evidence.observed.comments.value, 91);
  assert.equal(evidence.observed.comments.origin, "source-metadata");
  assert.equal(evidence.inferred.popularity, 88);
}

{
  const evidence = model.engagementEvidence({ signals: { popularity: 81 } });
  assert.equal(evidence.level, "inferred-only");
  assert.equal(evidence.hasObservedEngagement, false);
}

{
  const first = {
    id: "a",
    title: "[속보] AI 신기능 발표 영상",
    url: "https://example.com/story?utm_source=x",
    sourceMeta: { provider: "news" },
  };
  const second = {
    id: "b",
    title: "AI 신기능 발표",
    url: "https://example.com/story?utm_medium=social",
    sourceMeta: { provider: "news" },
  };
  const groups = model.groupCandidates([first, second]);
  assert.equal(groups.exactDuplicates.length, 1);
  assert.equal(groups.exactDuplicates[0].count, 2);
  assert.equal(groups.sameStories.length, 1);
}

{
  const normalized = model.normalizeCandidate({
    id: "reddit-1",
    title: "Reddit 밈 반응",
    url: "https://www.reddit.com/r/memes/comments/abc/demo?utm_source=test",
    kind: "humor",
    sourceRisk: "yellow",
    sourceMeta: { likeCount: 14647, publishedAt: "2026-09-03T00:00:00Z" },
  });
  assert.equal(normalized.sourceId, "reddit");
  assert.equal(normalized.discoveryPriority, "normal");
  assert.equal(normalized.manualCaptureRequired, true);
  assert.equal(normalized.bulkBodyCollectionAllowed, false);
  assert.equal(normalized.engagementEvidence.observed.likes.value, 14647);
  assert.equal(normalized.sourceRisk, "yellow");
}

const koreanPrimary = model.listSources().filter((source) => source.discoveryPriority === "primary-korean");
assert.ok(koreanPrimary.length >= 10, "Korean communities should remain first-class discovery sources");
assert.ok(koreanPrimary.some((source) => source.id === "dcinside"));
assert.ok(koreanPrimary.some((source) => source.id === "blind"));
assert.ok(model.listSources().length >= 20, "source registry should stay broad");
assert.ok(model.listLanes().length >= 10, "theme discovery lanes should stay broad");

console.log("Discovery source model regression tests passed.");
