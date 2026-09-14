import http from "node:http";
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
} from "./threads.mjs";
import { getNaverStatus, searchNaver, getNaverSearchTrend } from "./naver.mjs";
import {
  getBufferStatus,
  listBufferThreadsChannels,
  saveBufferThreadsChannel,
  publishThreadsViaBuffer,
} from "./buffer.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";

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

    if (url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "threads-trend-inbox", now: new Date().toISOString() });
    }

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

    if (url.pathname === "/api/threads/publish") {
      if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
      const body = await readJsonBody(req);
      const candidate = body?.candidate || {};
      validateApprovedCandidate(candidate);
      const text = approvedThreadsText(candidate);
      const result = await publishTextToThreads(text, { replyControl: body?.replyControl || "everyone" });
      return json(res, 200, { ok: true, result });
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
      const result = await publishThreadsViaBuffer({
        text,
        mode: body?.mode || "addToQueue",
        dueAt: body?.dueAt || null,
      });
      return json(res, 200, { ok: true, result });
    }

    if (url.pathname === "/") {
      res.writeHead(302, { Location: "/app/" });
      return res.end();
    }

    if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res, ["GET", "HEAD"]);
    return serveStatic(url.pathname, res, req.method === "HEAD");
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
  if (!Number.isFinite(Number(candidate.score))) throw requestError(409, "candidate_score_missing", "후보 점수 평가가 완료되지 않았습니다.");
  if (candidate.researchBundle?.reviewStatus !== "reviewed") throw requestError(409, "research_review_required", "Research Bundle 사람 검토 완료가 필요합니다.");
  if (candidate.draftStudio?.reviewStatus !== "approved") throw requestError(409, "draft_approval_required", "Draft Studio 사람 승인이 필요합니다.");

  const gate = candidate.safetyGate || {};
  const gateStatuses = [gate.fact, gate.rights, gate.privacy, gate.defamation, gate.platform];
  if (!gate.reviewedAt || gateStatuses.some((value) => !value || value === "unknown")) {
    throw requestError(409, "safety_gate_incomplete", "Rights/Safety Gate 검토가 완료되지 않았습니다.");
  }
  if (gateStatuses.includes("block")) throw requestError(409, "safety_gate_blocked", "Rights/Safety Gate에 BLOCK 항목이 있습니다.");
  if (gateStatuses.includes("warn") && !String(gate.notes || "").trim()) {
    throw requestError(409, "safety_gate_warning_unresolved", "WARN 항목의 대응 메모가 필요합니다.");
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

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) {
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
  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (pathname.endsWith("/")) relative += "index.html";

  const target = path.resolve(ROOT, relative);
  if (!(target === ROOT || target.startsWith(`${ROOT}${path.sep}`))) {
    return json(res, 403, { ok: false, error: "forbidden" });
  }

  try {
    const data = await fs.readFile(target);
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
