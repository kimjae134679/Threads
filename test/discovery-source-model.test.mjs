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

assert.ok(model.listSources().length >= 20, "source registry should stay broad");
assert.ok(model.listLanes().length >= 10, "theme discovery lanes should stay broad");

console.log("Discovery source model regression tests passed.");
