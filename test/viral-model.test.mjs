import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/viral-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, Date, Math, Number, String, RegExp });
vm.runInContext(source, context, { filename: "viral-model.js" });
const model = context.window.ThreadsViralModel;

assert.ok(model, "Viral model must register on window");

{
  const result = model.comfortScan("귀여운 고양이가 창문 밖을 구경하는 사진");
  assert.equal(result.blocked, false);
  assert.ok(result.score >= 80);
}

{
  const result = model.comfortScan("동물 학대 고어 영상 논란");
  assert.equal(result.blocked, true);
  assert.ok(result.blockReasons.includes("animal_abuse"));
  assert.ok(result.blockReasons.includes("graphic_violence"));
}

{
  const result = model.comfortScan("구더기 가득한 음식 사진이 화제가 됨");
  assert.equal(result.blocked, true);
  assert.ok(result.blockReasons.includes("gross_unpleasant"));
}

{
  const result = model.comfortScan("폭행 사건 판결을 설명하는 기사");
  assert.equal(result.blocked, false);
  assert.equal(result.level, "review");
  assert.ok(result.reviewReasons.includes("physical_violence"));
}

{
  const result = model.comfortScan("일반인 집 주소와 전화번호를 신상털이로 공개");
  assert.equal(result.blocked, true);
  assert.ok(result.blockReasons.includes("doxxing"));
}

{
  const hot = model.score({
    title: "회사에서 벌어진 황당한 사원증 논쟁",
    kind: "story",
    sourceMeta: { viewCount: 850000, likeCount: 24000, commentCount: 3100, rank: 2, publishedAt: new Date().toISOString() },
  });
  assert.ok(hot.viralScore >= 58, `expected candidate score, got ${hot.viralScore}`);
  assert.notEqual(hot.decision, "BLOCK");
}

{
  const blocked = model.score({
    title: "동물 학대 고어 영상",
    kind: "story",
    sourceMeta: { viewCount: 9000000, commentCount: 50000, rank: 1 },
  });
  assert.equal(blocked.decision, "BLOCK");
}

{
  assert.equal(model.dedupeKey({ url: "https://example.com/post/?id=1#x" }), "url:https://example.com/post");
  assert.equal(model.dedupeKey({ title: "회사 사원증 논쟁!" }), "title:회사 사원증 논쟁");
}

console.log("Viral model regression tests passed.");
