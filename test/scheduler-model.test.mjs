import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const warehouseSource = fs.readFileSync(new URL("../app/warehouse-model.js", import.meta.url), "utf8");
const schedulerSource = fs.readFileSync(new URL("../app/features/publish/scheduler/scheduler-model.js", import.meta.url), "utf8");
const context = vm.createContext({ window: {}, String, Number, Math, Date, Array, Set, Map });
vm.runInContext(warehouseSource, context, { filename: "warehouse-model.js" });
vm.runInContext(schedulerSource, context, { filename: "scheduler-model.js" });
const model = context.window.ThreadsSchedulerModel;
assert.ok(model, "Scheduler model must register on window");

const now = Date.parse("2026-09-14T08:00:00Z");
function item(id, bucket, theme, source, format) {
  const updatedAt = "2026-09-14T07:00:00Z";
  return {
    id, title: id, createdAt: "2026-09-14T01:00:00Z", updatedAt,
    draftStudio: { generated: { threads: { hook: "h", body: "b" } }, reviewStatus: "approved" },
    researchBundle: { reviewStatus: "reviewed" },
    safetyGate: { fact:"pass", rights:"pass", privacy:"pass", defamation:"pass", platform:"pass", reviewedAt:updatedAt },
    publishApproval: { status:"approved", approvedAt:updatedAt, basisUpdatedAt:updatedAt },
    warehouse: { bucket, priority:3, status:"active", themeTags:[theme], formatTags:[format] },
    discoveryNormalized: { sourceId: source },
  };
}

const ids = (plan) => Array.from(plan, (entry) => String(entry.itemId));
const hot = item("hot", "hot", "ai", "reddit", "carousel");
const ready = item("ready", "ready", "work", "naver", "text");
const evergreen = item("evergreen", "evergreen", "money", "news", "text");
let plan = model.plan([evergreen, ready, hot], { slotMinutes:60, themeGapMinutes:120, sourceGapMinutes:120, formatGapMinutes:60 }, now);
assert.deepEqual(ids(plan), ["hot", "ready", "evergreen"]);
assert.ok(plan[0].reasons.includes("hot-priority"));
assert.equal(plan[1].scheduledAtMs - plan[0].scheduledAtMs, 60 * 60_000);

const sameTheme = item("same-theme", "ready", "ai", "other", "video");
plan = model.plan([hot, sameTheme], { slotMinutes:30, themeGapMinutes:120, sourceGapMinutes:0, formatGapMinutes:0 }, now);
assert.equal(plan[1].scheduledAtMs - plan[0].scheduledAtMs, 120 * 60_000);
assert.ok(plan[1].reasons.includes("theme-spacing:120m"));

const sameSource = item("same-source", "ready", "other", "reddit", "video");
plan = model.plan([hot, sameSource], { slotMinutes:15, themeGapMinutes:0, sourceGapMinutes:90, formatGapMinutes:0 }, now);
assert.equal(plan[1].scheduledAtMs - plan[0].scheduledAtMs, 90 * 60_000);
assert.ok(plan[1].reasons.includes("source-spacing:90m"));

const reordered = [hot, ready, evergreen];
model.move(reordered, "evergreen", -1, now);
model.move(reordered, "evergreen", -1, now);
plan = model.plan(reordered, { slotMinutes:60, themeGapMinutes:0, sourceGapMinutes:0, formatGapMinutes:0 }, now);
assert.equal(plan[0].itemId, "evergreen");
assert.ok(plan[0].reasons.includes("manual-order"));

const held = item("held", "hot", "ai", "reddit", "text");
held.warehouse.status = "hold";
plan = model.plan([held, hot], {}, now);
assert.deepEqual(ids(plan), ["hot"]);

console.log("Scheduler model regression tests passed.");
