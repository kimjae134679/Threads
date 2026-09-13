import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

    if (url.pathname === "/api/trends/google") {
      return handleGoogleTrends(url, res);
    }

    if (url.pathname === "/") {
      res.writeHead(302, { Location: "/app/" });
      return res.end();
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
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
        "user-agent": "Threads-AI-Content-Lab/0.1 (+local research tool)",
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

async function serveStatic(pathname, res) {
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
    return res.end(data);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      return json(res, 404, { ok: false, error: "not_found" });
    }
    throw error;
  }
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}
