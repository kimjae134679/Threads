import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const taxonomySource = fs.readFileSync(new URL("../app/features/themes/theme-taxonomy.js", import.meta.url), "utf8");
const modelSource = fs.readFileSync(new URL("../app/features/themes/theme-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(taxonomySource, context, { filename: "theme-taxonomy.js" });
vm.runInContext(modelSource, context, { filename: "theme-model.js" });

const model = context.window.ThreadsThemeModel;
assert.ok(model, "Theme model must register on window");

{
  const result = model.suggest({ title: "회사 밖에서도 사원증 차고 다니는 게 이상한 거임?", kind: "story" });
  assert.equal(result.primaryTheme, "work_career");
  assert.ok(result.reasons.includes("회사") || result.reasons.includes("사원증"));
}

{
  const result = model.suggest({ title: "소개팅 첫날 계산 문제로 댓글이 갈린 사연", kind: "story" });
  assert.equal(result.primaryTheme, "dating_relationships");
  assert.ok(result.secondaryThemes.includes("internet_humor") || result.secondaryThemes.includes("life_debate"));
}

{
  const item = { title: "고양이 사진이 화제", kind: "humor" };
  const result = model.suggest(item);
  assert.equal(result.primaryTheme, "animals_nature");
}

{
  const item = { title: "완전히 분류하기 어려운 제목" };
  const result = model.suggest(item);
  assert.equal(result.primaryTheme, "general_viral");
}

{
  const item = { title: "회사 회식 이야기" };
  model.assignManual(item, {
    primaryTheme: "life_debate",
    secondaryThemes: ["work_career", "life_debate", "missing"],
    tags: ["회식", "회식", "예절"],
  });
  const resolved = model.resolve(item);
  assert.equal(resolved.primaryTheme, "life_debate");
  assert.deepEqual([...resolved.secondaryThemes], ["work_career"]);
  assert.deepEqual([...resolved.tags], ["회식", "예절"]);
  assert.equal(resolved.source, "manual");
}

console.log("Theme model regression tests passed.");
