import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { probeVerticalVideo, renderVerticalVideo, VERTICAL_VIDEO_PROFILE } from "../vertical-video.mjs";

function commandAvailable(command) {
  return spawnSync(command, ["-version"], { stdio: "ignore", windowsHide: true }).status === 0;
}

assert.equal(VERTICAL_VIDEO_PROFILE.width, 1080);
assert.equal(VERTICAL_VIDEO_PROFILE.height, 1920);
assert.equal(VERTICAL_VIDEO_PROFILE.fps, 30);

await assert.rejects(
  () => renderVerticalVideo({ imagePaths: [], outputPath: "unused.mp4" }),
  /image_required/
);

if (!commandAvailable(process.env.FFMPEG_PATH || "ffmpeg") || !commandAvailable(process.env.FFPROBE_PATH || "ffprobe")) {
  console.log("vertical-video.test.mjs: ffmpeg/ffprobe unavailable; runtime render smoke skipped");
  process.exit(0);
}

const root = await mkdtemp(join(tmpdir(), "threads-vertical-video-test-"));
try {
  const frameA = join(root, "frame-a.png");
  const frameB = join(root, "frame-b.png");
  const output = join(root, "vertical.mp4");
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

  for (const [file, source] of [[frameA, "red"], [frameB, "blue"]]) {
    const result = spawnSync(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", `color=c=${source}:s=640x360:d=0.1`,
      "-frames:v", "1", file,
    ], { windowsHide: true });
    assert.equal(result.status, 0, result.stderr?.toString() || "fixture render failed");
  }

  const render = await renderVerticalVideo({
    imagePaths: [frameA, frameB],
    outputPath: output,
    secondsPerImage: 0.5,
  });
  assert.equal(render.imageCount, 2);
  assert.equal(render.expectedDurationSeconds, 1);
  assert.equal(render.audioIncluded, false);
  assert.equal(render.publishReady, false);
  assert.equal(render.reviewRequired, true);
  assert.ok(render.bytes > 0);

  const probe = await probeVerticalVideo({ inputPath: output });
  assert.equal(probe.width, 1080);
  assert.equal(probe.height, 1920);
  assert.equal(probe.codec, "h264");
  assert.equal(probe.pixelFormat, "yuv420p");
  assert.ok(probe.durationSeconds >= 0.9 && probe.durationSeconds <= 1.2, JSON.stringify(probe));
  console.log("vertical-video.test.mjs: actual ffmpeg render + ffprobe PASS", JSON.stringify(probe));
} finally {
  await rm(root, { recursive: true, force: true });
}
