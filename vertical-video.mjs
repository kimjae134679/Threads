import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

export const VERTICAL_VIDEO_PROFILE = Object.freeze({
  id: "vertical-video",
  width: 1080,
  height: 1920,
  fps: 30,
  codec: "h264",
  pixelFormat: "yuv420p",
  container: "mp4",
});

function assertFinitePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${name}_must_be_positive`);
  return number;
}

function quoteConcatPath(path) {
  return String(path).replaceAll("\\", "/").replaceAll("'", "'\\''");
}

async function ensureReadableFile(path) {
  if (!path || typeof path !== "string") throw new Error("image_path_required");
  const info = await stat(path);
  if (!info.isFile() || info.size <= 0) throw new Error("image_file_required");
  const extension = extname(path).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) throw new Error("unsupported_image_type");
  return path;
}

function run(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => reject(Object.assign(new Error("ffmpeg_unavailable"), { cause: error })));
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const error = new Error("vertical_video_render_failed");
      error.exitCode = code;
      error.stderrTail = stderr.slice(-2000);
      reject(error);
    });
  });
}

export async function renderVerticalVideo({
  imagePaths,
  outputPath,
  secondsPerImage = 2,
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
} = {}) {
  const images = Array.isArray(imagePaths) ? imagePaths : [];
  if (!images.length) throw new Error("image_required");
  if (images.length > 20) throw new Error("too_many_images");
  if (!outputPath || typeof outputPath !== "string") throw new Error("output_path_required");
  const duration = assertFinitePositive(secondsPerImage, "seconds_per_image");
  const expectedDurationSeconds = images.length * duration;
  const verifiedImages = [];
  for (const path of images) verifiedImages.push(await ensureReadableFile(path));

  await mkdir(dirname(outputPath), { recursive: true });
  const scratch = await mkdtemp(join(tmpdir(), "threads-vertical-video-"));
  const concatPath = join(scratch, "frames.ffconcat");
  try {
    const rows = ["ffconcat version 1.0"];
    for (const path of verifiedImages) {
      rows.push(`file '${quoteConcatPath(path)}'`);
      rows.push(`duration ${duration}`);
    }
    rows.push(`file '${quoteConcatPath(verifiedImages.at(-1))}'`);
    await writeFile(concatPath, `${rows.join("\n")}\n`, "utf8");

    const vf = [
      `scale=${VERTICAL_VIDEO_PROFILE.width}:${VERTICAL_VIDEO_PROFILE.height}:force_original_aspect_ratio=decrease`,
      `pad=${VERTICAL_VIDEO_PROFILE.width}:${VERTICAL_VIDEO_PROFILE.height}:(ow-iw)/2:(oh-ih)/2:black`,
      "setsar=1",
      `fps=${VERTICAL_VIDEO_PROFILE.fps}`,
    ].join(",");

    await run(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-safe", "0", "-f", "concat", "-i", concatPath,
      "-vf", vf,
      "-t", String(expectedDurationSeconds),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", VERTICAL_VIDEO_PROFILE.pixelFormat,
      "-movflags", "+faststart",
      "-an",
      outputPath,
    ]);

    const info = await stat(outputPath);
    if (!info.isFile() || info.size <= 0) throw new Error("vertical_video_output_missing");
    return {
      outputPath,
      fileName: basename(outputPath),
      bytes: info.size,
      profile: { ...VERTICAL_VIDEO_PROFILE },
      imageCount: verifiedImages.length,
      secondsPerImage: duration,
      expectedDurationSeconds,
      audioIncluded: false,
      publishReady: false,
      reviewRequired: true,
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function probeVerticalVideo({
  inputPath,
  ffprobePath = process.env.FFPROBE_PATH || "ffprobe",
} = {}) {
  await ensureReadableMedia(inputPath);
  const { stdout } = await run(ffprobePath, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,codec_name,pix_fmt,avg_frame_rate",
    "-show_entries", "format=format_name,duration",
    "-of", "json",
    inputPath,
  ]);
  const parsed = JSON.parse(stdout || "{}");
  const stream = parsed.streams?.[0] || {};
  return {
    width: Number(stream.width || 0),
    height: Number(stream.height || 0),
    codec: stream.codec_name || null,
    pixelFormat: stream.pix_fmt || null,
    frameRate: stream.avg_frame_rate || null,
    durationSeconds: Number(parsed.format?.duration || 0),
    formatName: parsed.format?.format_name || null,
  };
}

async function ensureReadableMedia(path) {
  if (!path || typeof path !== "string") throw new Error("media_path_required");
  const info = await stat(path);
  if (!info.isFile() || info.size <= 0) throw new Error("media_file_required");
  return path;
}
