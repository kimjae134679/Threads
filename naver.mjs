const BASE = "https://naverapihub.apigw.ntruss.com";

export function getNaverStatus() {
  return {
    configured: Boolean(clientId() && clientSecret()),
    kind: "official-api",
    label: "NAVER API HUB Search + Search Trend",
    requiredEnv: ["NAVER_API_HUB_CLIENT_ID", "NAVER_API_HUB_CLIENT_SECRET"],
    note: "뉴스/블로그/카페는 검색 메타데이터만 저장하며 원문 재사용 권리를 의미하지 않습니다.",
  };
}

export async function searchNaver(query, type = "news", options = {}) {
  assertConfigured();
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) throw appError(400, "naver_query_required", "검색어가 필요합니다.");
  const allowed = new Set(["news", "blog", "cafearticle"]);
  if (!allowed.has(type)) throw appError(400, "naver_invalid_type", "지원하지 않는 네이버 검색 유형입니다.");

  const display = clamp(Number(options.display || 10), 1, 20);
  const sort = options.sort === "sim" ? "sim" : "date";
  const url = new URL(`${BASE}/search/v1/${type}`);
  url.searchParams.set("query", cleanQuery);
  url.searchParams.set("display", String(display));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", sort);
  url.searchParams.set("format", "json");

  const response = await fetchWithTimeout(url, { method: "GET", headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw upstreamError(response.status, payload, "naver_search_failed");

  const items = (payload.items || []).map((item) => ({
    title: stripHtml(item.title || ""),
    url: safeHttpUrl(item.originallink || item.link || ""),
    naverUrl: safeHttpUrl(item.link || ""),
    description: stripHtml(item.description || ""),
    publishedAt: item.pubDate || "",
    sourceType: type,
  })).filter((item) => item.title && item.url);

  return {
    provider: "NAVER API HUB Search",
    type,
    query: cleanQuery,
    total: Number(payload.total || 0),
    collectedAt: new Date().toISOString(),
    items,
  };
}

export async function getNaverSearchTrend(query, options = {}) {
  assertConfigured();
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) throw appError(400, "naver_query_required", "검색어가 필요합니다.");

  const requestedDays = clamp(Number(options.days || 30), 7, 365);
  const endParts = seoulDateParts(new Date());
  const endUtc = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day));
  const startUtc = new Date(endUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - requestedDays + 1);
  const body = {
    startDate: utcDateString(startUtc),
    endDate: utcDateString(endUtc),
    timeUnit: requestedDays <= 90 ? "date" : "week",
    keywordGroups: [{ groupName: cleanQuery.slice(0, 100), keywords: [cleanQuery.slice(0, 100)] }],
  };

  const response = await fetchWithTimeout(`${BASE}/search-trend/v1/search`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw upstreamError(response.status, payload, "naver_trend_failed");

  const result = payload.results?.[0] || {};
  const points = (result.data || []).map((point) => ({
    period: point.period,
    ratio: Number(point.ratio),
  })).filter((point) => point.period && Number.isFinite(point.ratio));

  return {
    provider: "NAVER API HUB Search Trend",
    query: cleanQuery,
    startDate: payload.startDate || body.startDate,
    endDate: payload.endDate || body.endDate,
    timeUnit: payload.timeUnit || body.timeUnit,
    points,
    momentum: summarizeMomentum(points),
    collectedAt: new Date().toISOString(),
    dateBasis: "Asia/Seoul",
    note: "ratio는 조회 기간 내 최대 검색량을 100으로 둔 상대값입니다.",
  };
}

function summarizeMomentum(points) {
  if (!points.length) return { recentAverage: null, previousAverage: null, changePercent: null };
  const window = Math.min(7, Math.max(1, Math.floor(points.length / 2)));
  const recent = points.slice(-window).map((x) => x.ratio);
  const previous = points.slice(-(window * 2), -window).map((x) => x.ratio);
  const recentAverage = average(recent);
  const previousAverage = previous.length ? average(previous) : null;
  const changePercent = previousAverage && previousAverage > 0
    ? ((recentAverage - previousAverage) / previousAverage) * 100
    : null;
  return { recentAverage, previousAverage, changePercent, window };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function authHeaders() {
  return {
    "X-NCP-APIGW-API-KEY-ID": clientId(),
    "X-NCP-APIGW-API-KEY": clientSecret(),
    accept: "application/json",
  };
}

function clientId() { return process.env.NAVER_API_HUB_CLIENT_ID?.trim() || ""; }
function clientSecret() { return process.env.NAVER_API_HUB_CLIENT_SECRET?.trim() || ""; }

function assertConfigured() {
  if (!clientId() || !clientSecret()) {
    throw appError(503, "naver_api_hub_credentials_missing", "NAVER_API_HUB_CLIENT_ID / NAVER_API_HUB_CLIENT_SECRET 환경변수가 필요합니다.");
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw appError(504, "naver_timeout", "NAVER API HUB 요청 시간이 초과되었습니다.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function upstreamError(status, payload, code) {
  const message = payload?.errorMessage || payload?.message || payload?.error?.message || `NAVER API HUB HTTP ${status}`;
  const error = appError(502, code, message);
  error.upstreamStatus = status;
  return error;
}

function appError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch (_) {
    return "";
  }
}

function clamp(value, min, max) {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, n));
}

function seoulDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function utcDateString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
