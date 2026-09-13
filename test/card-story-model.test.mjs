import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/card-story-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Number, Math, Array });
vm.runInContext(source, context, { filename: "card-story-model.js" });
const model = context.window.ThreadsCardStoryModel;

assert.ok(model, "Card story model must register on window");

const item = {
  title: "회사 밖에서도 사원증 차고 다니는 게 이상한 거임?",
  kind: "story",
  sourceType: "community",
  sourceMeta: { community: "Example Community" },
  researchBundle: {
    whyNow: "댓글에서 찬반이 갈리며 화제가 됨",
    verifiedFacts: ["작성자는 회사 밖에서도 사원증을 착용했다고 설명함", "친구가 이를 보고 놀렸다고 적음"],
    claimsToVerify: [],
    angles: ["직장 문화 차이"],
  },
};

{
  const capture = model.deriveCapture(item);
  assert.equal(capture.source, "Example Community");
  assert.ok(capture.hook.includes("사원증"));
  assert.ok(capture.excerpt.includes("작성자는"));
  assert.ok(capture.ending.includes("너라면"));
}

{
  const storyboard = model.buildStoryboard(item, {
    reactions: "나는 바로 뺌\n이게 왜 문제임",
  }, 2);
  assert.equal(storyboard.width, 1080);
  assert.equal(storyboard.height, 1350);
  assert.equal(storyboard.cards[0].type, "hook");
  assert.equal(storyboard.cards.filter((card) => card.type === "capture-image").length, 2);
  assert.equal(storyboard.cards.at(-1).type, "ending");
  assert.equal(model.validateStoryboard(storyboard).ok, true);
}

{
  const invalid = model.validateStoryboard({ cards: [{ type: "excerpt" }] });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.includes("hook_first_required"));
  assert.ok(invalid.issues.includes("ending_required"));
}

console.log("Card storyboard regression tests passed.");
