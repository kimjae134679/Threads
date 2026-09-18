import http from "node:http";
import { PublicationJournal } from "./publication-journal.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOpenAiStatus, researchWithOpenAI, draftWithOpenAI } from "./openai.mjs";
import {
  getThreadsStatus,
  getThreadsProfile,
  getThreadsPublishingLimit,
  publishTextToThreads,
  getThreadsPostInsights,
  getThreadsMediaCapabilities,
  buildThreadsMediaDryRun,
} from "./threads.mjs";
import { getNaverStatus, searchNaver, getNaverSearchTrend } from "./naver.mjs";
import {
  getBufferStatus,
  listBufferThreadsChannels,
  saveBufferThreadsChannel,
  publishThreadsViaBuffer,
} from "./buffer.mjs";
import { JsonStateStoreRegistry, STATE_SCHEMA_VERSION } from "./persistence.mjs";
import { SqliteStateStoreRegistry } from "./persistence-sqlite.mjs";
import { fetchSourceAsset, getSourceAssetCapabilities } from "./source-assets.mjs";
import { handleMediaPublishRoute, getMediaConnectorSnapshot } from "./media-publish-routes.mjs";
import { VerticalVideoArtifactStore, getVerticalVideoArtifactCapabilities } from "./vertical-video-artifacts.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const PACKAGE_VERSION = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8')).version;
const RUNTIME_STARTED_AT = new Date().toISOString();
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const STATE_PATH = process.env.PERSISTENCE_STATE_PATH || path.join(ROOT, "data", "runtime", "state.json");
const PUBLICATION_JOURNAL_PATH = path.join(path.dirname(STATE_PATH), "publication-journal");
const publicationJournal = new PublicationJournal(PUBLICATION_JOURNAL_PATH);
const SQLITE_PATH = process.env.PERSISTENCE_SQLITE_PATH || path.join(ROOT, "data", "runtime", "state.sqlite");
const MEDIA_STAGING_PATH = process.env.MEDIA_STAGING_PATH || path.join(ROOT, "data", "runtime", "media-staging");
const VERTICAL_VIDEO_ARTIFACT_PATH = process.env.VERTICAL_VIDEO_ARTIFACT_PATH || path.join(ROOT, "data", "runtime", "vertical-video");
const verticalVideoArtifacts = new VerticalVideoArtifactStore(VERTICAL_VIDEO_ARTIFACT_PATH);
const PERSISTENCE_BACKEND = String(process.env.PERSISTENCE_BACKEND || "file").trim().toLowerCase();
if (!["file", "sqlite"].includes(PERSISTENCE_BACKEND)) throw new Error(`unsupported_persistence_backend:${PERSISTENCE_BACKEND}`);
const stateStores = PERSISTENCE_BACKEND === "sqlite"
  ? new SqliteStateStoreRegistry(SQLITE_PATH)
  : new JsonStateStoreRegistry(STATE_PATH);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (url.pathname.startsWith("/api/")) validateLocalRequest(req, url);

    if (url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "threads-trend-inbox", version: PACKAGE_VERSION, runtimeStartedAt: RUNTIME_STARTED_AT, now: new Date().toISOString() });
    }

    if (url.pathname === "/api/state/status") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      return json(res, 200, {
        ok: true,
        backend: PERSISTENCE_BACKEND,
        stateSchemaVersion: STATE_SCHEMA_VERSION,
        databaseSchemaVersion: PERSISTENCE_BACKEND === "sqlite" ? stateStores.migrationVersion() : null,
        scopedNamespaces: true,
        optimisticConcurrency: true,
        secretFieldsPersisted: false,
      });
    }

    if (url.pathname === "/api/state") {
      const namespace = url.searchParams.get("namespace") || "default";
      const stateStore = stateStores.store(namespace);
      if (req.method === "GET") {
        const record = await stateStore.read();
        return json(res, 200, { ok: true, namespace, backend: PERSISTENCE_BACKEND, ...record });
      }
      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        const snapshot = body?.snapshot || body;
        const expectedRevision = body?.expectedRevision;
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
          throw requestError(400, "persistence_revision_required", "서버에서 읽은 revision이 필요합니다.");
        }
        const record = await stateStore.write(snapshot, expectedRevision);
        return json(res, 200, { ok: true, namespace, backend: PERSISTENCE_BACKEND, ...record });
      }
      return methodNotAllowed(res, ["GET", "PUT"]);
    }

    if (url.pathname === "/api/source-assets/capabilities") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      return json(res, 200, { ok: true, capability: getSourceAssetCapabilities() });
    }

    if (url.pathname === "/api/source-assets/proxy") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const asset = await fetchSourceAsset(url.searchParams.get("url") || "");
      res.writeHead(200, { "content-type": asset.contentType, "content-length": String(asset.data.length), "cache-control": "no-store", "x-content-type-options": "nosniff" });
      return res.end(asset.data);
    }

    if (url.pathname === "/api/vertical-video/capabilities") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      return json(res, 200, { ok: true, capability: getVerticalVideoArtifactCapabilities() });
    }

    if (url.pathname === "/api/vertical-video/render") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req, 176 * 1024 * 1024);
      const artifact = await verticalVideoArtifacts.render(body);
      return json(res, 200, { ok: true, artifact });
    }

    if (url.pathname.startsWith("/api/vertical-video/artifacts/")) {
      if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res, ["GET", "HEAD"]);
      const artifactId = url.pathname.slice("/api/vertical-video/artifacts/".length);
      const artifact = await verticalVideoArtifacts.read(artifactId);
      res.writeHead(200, {
        "content-type": "video/mp4",
        "content-length": String(artifact.bytes),
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="threads-${artifactId}.mp4"`,
        "x-content-type-options": "nosniff",
      });
      return req.method === "HEAD" ? res.end() : res.end(artifact.data);
    }

    if (await handleMediaPublishRoute({
      req,
      res,
      url,
      env: process.env,
      stagingRoot: MEDIA_STAGING_PATH,
      readJsonBody,
      validateApprovedCandidate,
      approvedCaption: approvedInstagramCaption,
    })) return;

    if (url.pathname === "/api/connectors") {
      return json(res, 200, {
        ok: true,
        connectors: {
          googleTrendsKr: {
            configured: true,
            kind: "official-rss",
            label: "Google Trends KR Trending Now",
          },
          youtubeMostPopularKr: {
            configured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
            kind: "official-api",
            label: "YouTube KR mostPopular",
            requiredEnv: "YOUTUBE_API_KEY",
            note: "2025-07-21 이후 mostPopular은 과거 전체 Trending과 동일하지 않으며 인기 음악·영화·게임 신호 중심입니다.",
          },
          naverApiHub: getNaverStatus(),
          openai: getOpenAiStatus(),
          threads: getThreadsStatus(),
          buffer: getBufferStatus(),
          ...getMediaConnectorSnapshot(process.env),
          verticalVideoProduction: getVerticalVideoArtifactCapabilities(),
        },
      });
    }

    if (url.pathname === "/api/trends/google") {
      return handleGoogleTrends(url, res);
    }

    if (url.pathname === "/api/trends/youtube") {
      return handleYouTubeMostPopular(url, res);
    }

    if (url.pathname === "/api/naver/search") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const result = await searchNaver(
        url.searchParams.get("query") || "",
        url.searchParams.get("type") || "news",
        {
          display: url.searchParams.get("display") || 10,
          sort: url.searchParams.get("sort") || "date",
        }
      );
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/naver/trend") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const result = await getNaverSearchTrend(
        url.searchParams.get("query") || "",
        { days: url.searchParams.get("days") || 30 }
      );
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/ai/research") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const result = await researchWithOpenAI(body?.candidate || body || {});
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/ai/drafts") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const result = await draftWithOpenAI(body?.candidate || body || {});
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/threads/profile") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const profile = await getThreadsProfile();
      return json(res, 200, { ok: true, profile });
    }

    if (url.pathname === "/api/threads/quota") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const quota = await getThreadsPublishingLimit();
      return json(res, 200, { ok: true, quota, collectedAt: new Date().toISOString() });
    }

    if (url.pathname === "/api/threads/media/capabilities") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      return json(res, 200, { ok: true, capability: getThreadsMediaCapabilities() });
    }

    if (url.pathname === "/api/threads/media/dry-run") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const candidate = body?.candidate || {};
      validateApprovedCandidate(candidate);
      const text = approvedThreadsText(candidate);
      const plan = buildThreadsMediaDryRun({ text, mediaUrls: body?.mediaUrls || [] });
      return json(res, 200, { ok: true, plan, auditedAt: new Date().toISOString() });
    }

    if (url.pathname === "/api/threads/publish") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const candidate = body?.candidate || {};
      validateApprovedCandidate(candidate);
      const text = approvedThreadsText(candidate);
      const replyControl = body?.replyControl || "everyone";
      if (!getThreadsStatus().configured) await publishTextToThreads(text, { replyControl });
      const delivery = await publicationJournal.execute({
        provider: "threads", candidateId: candidate.id, approvalBasis: candidate.publishApproval.basisUpdatedAt,
        accountKey: process.env.THREADS_ACCESS_TOKEN.trim(), payload: { text, replyControl },
        publish: () => publishTextToThreads(text, { replyControl }),
      });
      return json(res, 200, { ok: true, ...delivery });
    }

    if (url.pathname === "/api/threads/insights") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const id = url.searchParams.get("id") || "";
      const result = await getThreadsPostInsights(id);
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/buffer/channels") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const result = await listBufferThreadsChannels();
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/api/buffer/channel") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const result = await saveBufferThreadsChannel(body?.channelId || "");
      return json(res, 200, { ok: true, result, connector: getBufferStatus() });
    }

    if (url.pathname === "/api/buffer/publish") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const candidate = body?.candidate || {};
      validateApprovedCandidate(candidate);
      const text = approvedThreadsText(candidate);
      const bufferStatus = getBufferStatus();
      const request = { text, mode: body?.mode || "addToQueue", dueAt: body?.dueAt || null, channelId: bufferStatus.channel?.id || null };
      if (!bufferStatus.configured) await publishThreadsViaBuffer(request);
      const delivery = await publicationJournal.execute({
        provider: "buffer", candidateId: candidate.id, approvalBasis: candidate.publishApproval.basisUpdatedAt,
        accountKey: process.env.BUFFER_API_KEY.trim(), payload: request,
        publish: () => publishThreadsViaBuffer(request),
      });
      return json(res, 200, { ok: true, ...delivery });
    }

    if (url.pathname === "/") {
      res.writeHead(302, { Location: "/app/" });
      return res.end();
    }

    if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res, ["GET", "HEAD"]);
    return await serveStatic(url.pathname, res, req.method === "HEAD");
  } catch (error) {
    console.error(error);
    if (Number.isInteger(error?.status)) {
      return json(res, error.status, {
        ok: false,
        error: error.code || "request_failed",
        message: String(error?.message || error),
        upstreamStatus: error.upstreamStatus || undefined,
        upstreamCode: error.upstreamCode || undefined,
        upstreamSubcode: error.upstreamSubcode || undefined,
        currentRevision: error.currentRevision ?? undefined,
      });
    }
    return json(res, 500, { ok: false, error: "internal_server_error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Threads Trend Inbox: http://${HOST}:${PORT}/app/`);
});

async function handleGoogleTrends(url, res) {
  const geo = (url.searchParams.get("geo") || "KR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(geo)) {
    return json(res, 400, { ok: false, error: "invalid_geo" });
  }

  const feedUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "user-agent": "Threads-AI-Content-Lab/0.4 (+local research tool)",
        accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return json(res, 502, {
        ok: false,
        error: "google_trends_upstream_error",
        status: response.status,
      });
    }

    const xml = await response.text();
    const items = parseGoogleTrendsRss(xml, geo);
    return json(res, 200, {
      ok: true,
      source: "Google Trends Trending Now RSS",
      geo,
      feedUrl,
      collectedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    const code = error?.name === "AbortError" ? "google_trends_timeout" : "google_trends_fetch_failed";
    return json(res, 502, { ok: false, error: code, message: String(error?.message || error) });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleYouTubeMostPopular(url, res) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return json(res, 503, {
      ok: false,
      configured: false,
      error: "youtube_api_key_missing",
      message: "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.",
    });
  }

  const region = (url.searchParams.get("region") || "KR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) {
    return json(res, 400, { ok: false, error: "invalid_region" });
  }

  const requestedMax = Number(url.searchParams.get("max") || 20);
  const maxResults = Math.max(1, Math.min(50, Number.isFinite(requestedMax) ? Math.round(requestedMax) : 20));
  const upstream = new URL("https://www.googleapis.com/youtube/v3/videos");
  upstream.searchParams.set("part", "snippet,statistics");
  upstream.searchParams.set("chart", "mostPopular");
  upstream.searchParams.set("regionCode", region);
  upstream.searchParams.set("maxResults", String(maxResults));
  upstream.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(upstream, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(res, 502, {
        ok: false,
        error: "youtube_upstream_error",
        status: response.status,
        message: payload?.error?.message || "YouTube Data API request failed",
      });
    }

    const items = Array.isArray(payload.items) ? payload.items.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      title: item.snippet?.title || "",
      channelId: item.snippet?.channelId || "",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      categoryId: item.snippet?.categoryId || "",
      description: item.snippet?.description || "",
      thumbnail: pickThumbnail(item.snippet?.thumbnails),
      statistics: {
        viewCount: item.statistics?.viewCount || "",
        likeCount: item.statistics?.likeCount || "",
        commentCount: item.statistics?.commentCount || "",
      },
      url: item.id ? `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}` : "",
    })).filter((item) => item.id && item.title) : [];

    return json(res, 200, {
      ok: true,
      source: "YouTube Data API videos.list chart=mostPopular",
      region,
      collectedAt: new Date().toISOString(),
      count: items.length,
      scopeNote: "Since 2025-07-21, mostPopular is not the old general Trending page and is oriented toward Trending Music, Movies, and Gaming charts.",
      items,
    });
  } catch (error) {
    const code = error?.name === "AbortError" ? "youtube_timeout" : "youtube_fetch_failed";
    return json(res, 502, { ok: false, error: code, message: String(error?.message || error) });
  } finally {
    clearTimeout(timeout);
  }
}

function validateApprovedCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") throw requestError(400, "candidate_required", "게시 후보 데이터가 필요합니다.");
  if (candidate.status !== "ready") throw requestError(409, "candidate_not_ready", "후보 상태가 제작 후보(ready)가 아닙니다.");
  if (typeof candidate.score !== "number" || !Number.isFinite(candidate.score) || candidate.score < 0 || candidate.score > 100) throw requestError(409, "candidate_score_missing", "후보 점수 평가가 완료되지 않았습니다.");
  if (candidate.researchBundle?.reviewStatus !== "reviewed") throw requestError(409, "research_review_required", "Research Bundle 사람 검토 완료가 필요합니다.");
  if (candidate.draftStudio?.reviewStatus !== "approved") throw requestError(409, "draft_approval_required", "Draft Studio 사람 승인이 필요합니다.");

  const gate = candidate.safetyGate || {};
  const gateStatuses = [gate.fact, gate.rights, gate.privacy, gate.defamation, gate.platform];
  if (!gate.reviewedAt || gateStatuses.some((value) => !["pass", "warn", "block"].includes(value))) {
    throw requestError(409, "safety_gate_incomplete", "Rights/Safety Gate 검토가 완료되지 않았습니다.");
  }
  if (gateStatuses.includes("block")) throw requestError(409, "safety_gate_blocked", "Rights/Safety Gate에 BLOCK 항목이 있습니다.");
  if (gateStatuses.includes("warn") && !String(gate.notes || "").trim()) {
    throw requestError(409, "safety_gate_warning_unresolved", "WARN 항목의 대응 메모가 필요합니다.");
  }

  if (candidate.contentStrategy?.sourceAssetType === "A10") {
    throw requestError(409, "asset_rights_unknown", "권리 미확인 자산은 게시할 수 없습니다.");
  }
  const captureIndexes = (candidate.cardFactory?.storyboard?.cards || [])
    .flatMap((card, index) => card?.type === "capture-image" ? [index] : []);
  if (captureIndexes.length) {
    const privacy = candidate.cardFactory?.privacy;
    if (privacy?.gate?.allowed !== true || captureIndexes.some((index) =>
      privacy?.masks?.[index]?.reviewed !== true || privacy?.masks?.[index]?.identityMatch !== true)) {
      throw requestError(409, "image_privacy_review_required", "이미지별 개인정보 검토가 필요합니다.");
    }
  }

  const approval = candidate.publishApproval || {};
  if (approval.status !== "approved" || !approval.approvedAt) {
    throw requestError(409, "publish_approval_required", "게시 대기 사람 승인이 필요합니다.");
  }
  if (!approval.basisUpdatedAt || approval.basisUpdatedAt !== candidate.updatedAt) {
    throw requestError(409, "publish_approval_stale", "게시 승인 이후 후보 내용이 변경되었습니다. 다시 승인하세요.");
  }
}

function approvedThreadsText(candidate) {
  const manual = String(candidate.draftStudio?.manualEdits?.threads || "").trim();
  if (manual) return manual;
  const generated = candidate.draftStudio?.generated?.threads || {};
  const text = [generated.hook, generated.body, generated.cta].map((x) => String(x || "").trim()).filter(Boolean).join("\n\n");
  if (!text) throw requestError(409, "threads_draft_missing", "승인된 Threads 초안이 없습니다.");
  return text;
}

function approvedInstagramCaption(candidate) {
  const manual = String(candidate.draftStudio?.manualEdits?.instagram || "").trim();
  if (manual) return manual;
  const generated = candidate.draftStudio?.generated?.instagram || {};
  const text = [generated.hook, generated.caption, generated.body, generated.cta]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");
  return text || approvedThreadsText(candidate);
}

function validateLocalRequest(req, url) {
  const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]", HOST.toLowerCase()]);
  if (!allowedHosts.has(url.hostname.toLowerCase()) || Number(url.port || 80) !== req.socket.localPort) {
    throw requestError(403, "untrusted_host", "로컬 앱 주소를 사용하세요.");
  }
  const origin = req.headers.origin;
  if ((origin && origin !== url.origin) || req.headers["sec-fetch-site"] === "cross-site") {
    throw requestError(403, "cross_origin_request", "다른 웹사이트의 API 요청은 허용하지 않습니다.");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") throw requestError(415, "json_content_type_required", "application/json이 필요합니다.");
  }
}

async function readJsonBody(req, maxBytes = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw requestError(413, "payload_too_large", "요청 본문이 너무 큽니다.");
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    throw requestError(400, "invalid_json", "JSON 요청 본문을 해석하지 못했습니다.");
  }
}

function pickThumbnail(thumbnails = {}) {
  return thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || "";
}

function parseGoogleTrendsRss(xml, geo) {
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  return blocks.slice(0, 30).map((block, index) => {
    const newsBlocks = block.match(/<ht:news_item(?:\s[^>]*)?>[\s\S]*?<\/ht:news_item>/gi) || [];
    const news = newsBlocks.slice(0, 5).map((newsBlock) => ({
      title: textTag(newsBlock, "ht:news_item_title"),
      url: textTag(newsBlock, "ht:news_item_url"),
      source: textTag(newsBlock, "ht:news_item_source"),
    })).filter((item) => item.title || item.url);

    const title = textTag(block, "title");
    return {
      rank: index + 1,
      title,
      approxTraffic: textTag(block, "ht:approx_traffic"),
      pubDate: textTag(block, "pubDate"),
      description: stripTags(textTag(block, "description")),
      picture: textTag(block, "ht:picture"),
      pictureSource: textTag(block, "ht:picture_source"),
      news,
      trendsUrl: `https://trends.google.com/trending?geo=${encodeURIComponent(geo)}`,
    };
  }).filter((item) => item.title);
}

function textTag(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  if (!match) return "";
  return decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
}

function stripTags(value) {
  return decodeXml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

async function serveStatic(pathname, res, headOnly = false) {
  let relative;
  try { relative = decodeURIComponent(pathname).replace(/^\/+/, ""); }
  catch { return json(res, 400, { ok: false, error: "invalid_path" }); }
  const segments = relative.split(/[\\/]/);
  if (!["app", "data", "docs"].includes(segments[0]) || segments.some((part) => part.startsWith(".")) ||
      (segments[0] === "data" && segments[1] === "runtime")) {
    return json(res, 404, { ok: false, error: "not_found" });
  }
  if (pathname.endsWith("/")) relative += "index.html";

  const target = path.resolve(ROOT, relative);
  if (!(target === ROOT || target.startsWith(`${ROOT}${path.sep}`))) {
    return json(res, 403, { ok: false, error: "forbidden" });
  }

  try {
    const realTarget = await fs.realpath(target);
    const realRoot = await fs.realpath(ROOT);
    // Static assets must stay in the repository and must never expose runtime storage.
    const runtimeRoots = [path.join(ROOT, "data", "runtime"), MEDIA_STAGING_PATH, VERTICAL_VIDEO_ARTIFACT_PATH, PUBLICATION_JOURNAL_PATH];
    const stateFiles = [STATE_PATH, SQLITE_PATH].map((file) => path.resolve(file));
    if (!realTarget.startsWith(`${realRoot}${path.sep}`) || realTarget !== target ||
        runtimeRoots.some((dir) => realTarget === path.resolve(dir) || realTarget.startsWith(`${path.resolve(dir)}${path.sep}`)) ||
        stateFiles.some((file) => realTarget === file || realTarget.startsWith(file + ".") || realTarget.startsWith(file + "-")) ||
        (path.dirname(realTarget) === path.dirname(path.resolve(STATE_PATH)) &&
         path.basename(realTarget).startsWith(path.parse(STATE_PATH).name + "."))) {
      return json(res, 404, { ok: false, error: "not_found" });
    }
    const data = await fs.readFile(realTarget);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-store" : "public, max-age=60",
      "x-content-type-options": "nosniff",
    });
    return res.end(headOnly ? undefined : data);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      return json(res, 404, { ok: false, error: "not_found" });
    }
    throw error;
  }
}

function requestError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function methodNotAllowed(res, allowed) {
  res.writeHead(405, {
    allow: allowed.join(", "),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify({ ok: false, error: "method_not_allowed", allowed }));
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}
