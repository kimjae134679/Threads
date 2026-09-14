import { mkdir, mkdtemp, rm, stat, writeFile, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { renderVerticalVideo, probeVerticalVideo } from "./vertical-video.mjs";

const ALLOWED_MIME = Object.freeze({ "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" });
const MAX_ASSETS = 20;
const MAX_ASSET_BYTES = 6 * 1024 * 1024;
const ARTIFACT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateVerticalProductionRequest(body = {}) {
  const candidate = body.candidate || {};
  const cardFactory = candidate.cardFactory || {};
  const candidateId = String(candidate.id || "").trim();
  const candidateUpdatedAt = String(candidate.updatedAt || "").trim();
  const cardFactoryUpdatedAt = String(cardFactory.updatedAt || "").trim();
  if (!candidateId || !candidateUpdatedAt || !cardFactoryUpdatedAt) throw requestError(400, "production_revision_required");

  const rights = body.rightsReview || {};
  if (rights.status === "blocked") throw requestError(409, "rights_blocked");
  if (rights.status !== "cleared") throw requestError(409, "rights_review_required");
  if (String(rights.basisCardFactoryUpdatedAt || "") !== cardFactoryUpdatedAt) throw requestError(409, "rights_review_stale");

  const privacy = cardFactory.privacy?.gate || {};
  if (privacy.allowed !== true || privacy.code !== "image-privacy-reviewed") throw requestError(409, "privacy_review_required");
  if (String(body.privacyBasisCardFactoryUpdatedAt || "") !== cardFactoryUpdatedAt) throw requestError(409, "privacy_review_stale");

  const assets = Array.isArray(body.assets) ? body.assets : [];
  if (!assets.length) throw requestError(400, "vertical_assets_required");
  if (assets.length > MAX_ASSETS) throw requestError(400, "too_many_vertical_assets");

  const decoded = assets.map((asset, index) => decodeDataUrl(asset?.dataUrl, index));
  const secondsPerImage = Number(body.secondsPerImage ?? 2);
  if (!Number.isFinite(secondsPerImage) || secondsPerImage < 0.25 || secondsPerImage > 15) throw requestError(400, "invalid_seconds_per_image");

  return {
    candidateId,
    candidateUpdatedAt,
    cardFactoryUpdatedAt,
    rightsReview: {
      status: "cleared",
      reviewedAt: String(rights.reviewedAt || "") || null,
      basisCardFactoryUpdatedAt: cardFactoryUpdatedAt,
    },
    privacyReview: {
      code: privacy.code,
      captureCount: Number(privacy.captureCount || 0),
      reviewedCount: Number(privacy.reviewedCount || 0),
      basisCardFactoryUpdatedAt: cardFactoryUpdatedAt,
    },
    assets: decoded,
    secondsPerImage,
  };
}

export class VerticalVideoArtifactStore {
  constructor(rootPath, options = {}) {
    this.rootPath = rootPath;
    this.ffmpegPath = options.ffmpegPath || process.env.FFMPEG_PATH || "ffmpeg";
    this.ffprobePath = options.ffprobePath || process.env.FFPROBE_PATH || "ffprobe";
  }

  async render(body = {}) {
    const request = validateVerticalProductionRequest(body);
    await mkdir(this.rootPath, { recursive: true });
    const scratch = await mkdtemp(join(tmpdir(), "threads-vertical-artifact-"));
    const artifactId = randomUUID();
    const outputPath = join(this.rootPath, `${artifactId}.mp4`);
    try {
      const imagePaths = [];
      for (let index = 0; index < request.assets.length; index += 1) {
        const asset = request.assets[index];
        const imagePath = join(scratch, `${String(index).padStart(2, "0")}${asset.extension}`);
        await writeFile(imagePath, asset.bytes);
        imagePaths.push(imagePath);
      }
      const rendered = await renderVerticalVideo({ imagePaths, outputPath, secondsPerImage: request.secondsPerImage, ffmpegPath: this.ffmpegPath });
      const probe = await probeVerticalVideo({ inputPath: outputPath, ffprobePath: this.ffprobePath });
      return {
        artifactId,
        owner: "03_PRODUCTION",
        handoffTarget: "04_REVIEW_PUBLISH",
        candidateId: request.candidateId,
        candidateUpdatedAt: request.candidateUpdatedAt,
        cardFactoryUpdatedAt: request.cardFactoryUpdatedAt,
        rightsReview: request.rightsReview,
        privacyReview: request.privacyReview,
        assetCount: request.assets.length,
        secondsPerImage: request.secondsPerImage,
        profile: rendered.profile,
        probe,
        bytes: rendered.bytes,
        downloadPath: `/api/vertical-video/artifacts/${artifactId}`,
        createdAt: new Date().toISOString(),
        publishReady: false,
        reviewRequired: true,
        providerCapability: "unsupported",
        livePublicationAttempted: false,
      };
    } catch (error) {
      await rm(outputPath, { force: true }).catch(() => {});
      throw error;
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }

  async read(artifactId) {
    if (!ARTIFACT_ID.test(String(artifactId || ""))) throw requestError(404, "vertical_artifact_not_found");
    const path = join(this.rootPath, `${artifactId}.mp4`);
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size <= 0) throw new Error("missing");
      return { path, bytes: info.size, data: await readFile(path) };
    } catch {
      throw requestError(404, "vertical_artifact_not_found");
    }
  }
}

export function getVerticalVideoArtifactCapabilities() {
  return {
    state: "local-render-only",
    owner: "03_PRODUCTION",
    handoffTarget: "04_REVIEW_PUBLISH",
    renderImplemented: true,
    output: { width: 1080, height: 1920, container: "mp4", codec: "h264", pixelFormat: "yuv420p" },
    rightsReviewRequired: true,
    privacyReviewRequired: true,
    providerCapability: "unsupported",
    livePublishImplemented: false,
  };
}

function decodeDataUrl(dataUrl, index) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !ALLOWED_MIME[match[1]]) throw requestError(400, `unsupported_vertical_asset:${index}`);
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_ASSET_BYTES) throw requestError(400, `invalid_vertical_asset_size:${index}`);
  return { mimeType: match[1], extension: ALLOWED_MIME[match[1]], bytes };
}

function requestError(status, code) {
  return Object.assign(new Error(code), { status, code });
}
