import assert from "node:assert/strict";
import { buildBufferPostInput, getBufferStatus } from "../buffer.mjs";

{
  const { input, segments } = buildBufferPostInput({
    channelId: "threads-channel-1",
    text: "첫 게시물",
    mode: "addToQueue",
  });
  assert.equal(input.channelId, "threads-channel-1");
  assert.equal(input.mode, "addToQueue");
  assert.equal(input.schedulingType, "automatic");
  assert.equal(input.needsApproval, false);
  assert.equal(input.text, "첫 게시물");
  assert.equal(input.metadata, undefined);
  assert.deepEqual(segments, ["첫 게시물"]);
}

{
  const { input, segments } = buildBufferPostInput({
    channelId: "threads-channel-2",
    thread: ["첫 번째", "두 번째", "세 번째"],
    mode: "shareNow",
  });
  assert.equal(input.text, "첫 번째");
  assert.equal(input.metadata.threads.thread.length, 3);
  assert.equal(input.metadata.threads.thread[0].text, input.text);
  assert.deepEqual(segments, ["첫 번째", "두 번째", "세 번째"]);
}

{
  const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { input } = buildBufferPostInput({
    channelId: "threads-channel-3",
    text: "예약 테스트",
    mode: "customScheduled",
    dueAt,
  });
  assert.equal(input.mode, "customScheduled");
  assert.equal(input.dueAt, dueAt);
}

{
  assert.throws(() => buildBufferPostInput({
    channelId: "threads-channel-4",
    text: "x".repeat(501),
  }), (error) => error?.code === "buffer_threads_segment_too_long");
}

{
  assert.throws(() => buildBufferPostInput({
    channelId: "threads-channel-5",
    text: "예약",
    mode: "customScheduled",
    dueAt: new Date(Date.now() - 60_000).toISOString(),
  }), (error) => error?.code === "buffer_due_at_past");
}

{
  const status = getBufferStatus();
  assert.equal(typeof status.apiKeyConfigured, "boolean");
  assert.equal(typeof status.channelConfigured, "boolean");
  assert.equal(status.kind, "third-party-publisher");
  assert.ok(status.supports.includes("customScheduled"));
}

console.log("Buffer adapter regression tests passed.");
