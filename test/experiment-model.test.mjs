import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/experiment-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: "experiment-model.js" });
const model = context.window.ThreadsExperimentModel;

assert.ok(model, "Experiment model must register on window");

function row(views, engagements, platform = "threads") {
  return {
    platform,
    publication: {
      insights: {
        metrics: {
          views,
          likes: engagements,
          replies: 0,
          reposts: 0,
          quotes: 0,
          shares: 0,
        },
      },
    },
  };
}

{
  const candidate = row(100, 10);
  const result = model.autoDecision(candidate, [candidate]);
  assert.equal(result.label, "LEARN");
  assert.equal(result.score, null);
}

{
  const cohort = [row(100, 2), row(200, 6), row(300, 12), row(400, 20), row(1000, 100)];
  const result = model.autoDecision(cohort[4], cohort);
  assert.equal(result.label, "SCALE");
  assert.ok(result.score >= 0.75);
}

{
  const cohort = [row(100, 1), row(200, 6), row(300, 15), row(400, 24), row(500, 40)];
  const result = model.autoDecision(cohort[0], cohort);
  assert.equal(result.label, "KILL");
  assert.ok(result.score <= 0.25);
}

{
  const cohort = [row(100, 3), row(200, 8), row(300, 15), row(400, 24), row(500, 35)];
  const result = model.autoDecision(cohort[2], cohort);
  assert.equal(result.label, "KEEP");
  assert.ok(result.score > 0.25 && result.score < 0.75);
}

{
  const cohort = [row(0, 0), row(200, 10), row(300, 12), row(400, 20), row(500, 30)];
  const result = model.autoDecision(cohort[0], cohort);
  assert.equal(result.label, "LEARN");
}

{
  assert.equal(model.percentile(30, [10, 20, 30, 40, 50]), 0.5);
  assert.equal(model.percentile(10, [10, 10, 10, 10, 10]), 0.5);
  assert.equal(model.contentAxis("story"), "Internet Story / Culture");
  assert.equal(model.contentAxis("product"), "Useful / Product / Money");
  assert.equal(model.contentAxis("breaking"), "Hot / Issue");
}

console.log("Experiment model regression tests passed.");
