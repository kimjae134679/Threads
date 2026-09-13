const DEFAULT_THREADS_API_HOST = "https://graph.threads.net";
const POST_INSIGHT_METRICS = "views,likes,replies,reposts,quotes,shares";

export function getThreadsStatus() {
  return {
    configured: Boolean(process.env.THREADS_ACCESS_TOKEN?.trim()),
    kind: "official-api",
    label: "Threads API",
    apiHost: threadsApiHost(),
    requiredEnv: "THREADS_ACCESS_TOKEN",
    requiredScopes: ["threads_basic", "threads_content_publish"],
    optionalScopes: ["threads_manage_insights"],
    mode: "human-approved-text-only",
    note: "실제 게시 버튼을 누른 경우에만 텍스트 컨테이너 생성 → threads_publish 2단계로 공개 게시합니다. auto_publish_text는 사용하지 않습니다.",
  };
}

export async function getThreadsProfile() {
  requireToken();
  const url = apiUrl("/me");
  url.searchParams.set("fields", "id,username,name,threads_profile_picture_url,threads_biography");
  return threadsFetchJson(url, { method: "GET" }, 15_000);
}

export async function getThreadsPublishingLimit() {
  requireToken();
  const url = apiUrl("/me/threads_publishing_limit");
  url.searchParams.set("fields", "quota_usage,config");
  return threadsFetchJson(url, { method: "GET" }, 15_000);
}

export async function publishTextToThreads(text, { replyControl = "everyone" } = {}) {
  requireToken();
  const cleanText = String(text || "").trim();
  if (!cleanText) throw apiError(400, "threads_text_required", "Threads에 게시할 텍스트가 비어 있습니다.");
  if (cleanText.length > 10_000) throw apiError(400, "threads_text_too_large", "게시 텍스트가 비정상적으로 깁니다. 최종 내용을 다시 확인하세요.");

  const allowedReplyControls = new Set(["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"]);
  const safeReplyControl = allowedReplyControls.has(replyControl) ? replyControl : "everyone";

  // 1) 컨테이너만 만든다. auto_publish_text를 절대 넣지 않는다.
  const createUrl = apiUrl("/me/threads");
  createUrl.searchParams.set("media_type", "TEXT");
  createUrl.searchParams.set("text", cleanText);
  createUrl.searchParams.set("reply_control", safeReplyControl);
  const container = await threadsFetchJson(createUrl, { method: "POST" }, 20_000);
  const creationId = String(container?.id || "").trim();
  if (!creationId) throw apiError(502, "threads_container_id_missing", "Threads API가 컨테이너 ID를 반환하지 않았습니다.");

  // 2) 사람이 로컬 UI에서 실제 게시 버튼을 누른 요청에서만 명시적으로 publish 한다.
  const publishUrl = apiUrl("/me/threads_publish");
  publishUrl.searchParams.set("creation_id", creationId);
  const published = await threadsFetchJson(publishUrl, { method: "POST" }, 20_000);
  const threadId = String(published?.id || "").trim();
  if (!threadId) throw apiError(502, "threads_publish_id_missing", "Threads API가 게시물 ID를 반환하지 않았습니다.", { creationId });

  return {
    id: threadId,
    creationId,
    text: cleanText,
    replyControl: safeReplyControl,
    publishedAt: new Date().toISOString(),
  };
}

export async function getThreadsPostInsights(threadId) {
  requireToken();
  const id = String(threadId || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw apiError(400, "invalid_thread_id", "유효한 Threads 게시물 ID가 필요합니다.");
  const url = apiUrl(`/${encodeURIComponent(id)}/insights`);
  url.searchParams.set("metric", POST_INSIGHT_METRICS);
  const payload = await threadsFetchJson(url, { method: "GET" }, 15_000);
  return {
    threadId: id,
    collectedAt: new Date().toISOString(),
    metrics: normalizeInsights(payload),
    raw: payload,
  };
}

function normalizeInsights(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const metrics = {};
  for (const row of rows) {
    const name = String(row?.name || row?.title || "").trim();
    if (!name) continue;
    const first = Array.isArray(row?.values) ? row.values[0] : null;
    const value = first?.value ?? row?.value ?? null;
    metrics[name] = value;
  }
  return metrics;
}

async function threadsFetchJson(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${process.env.THREADS_ACCESS_TOKEN.trim()}`,
        accept: "application/json",
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw apiError(502, "threads_upstream_error", payload?.error?.message || `Threads API request failed (${response.status})`, {
        upstreamStatus: response.status,
        upstreamCode: payload?.error?.code || null,
        upstreamSubcode: payload?.error?.error_subcode || null,
      });
    }
    return payload;
  } catch (error) {
    if (error?.status) throw error;
    if (error?.name === "AbortError") throw apiError(504, "threads_timeout", "Threads API 요청 시간이 초과되었습니다.");
    throw apiError(502, "threads_fetch_failed", String(error?.message || error));
  } finally {
    clearTimeout(timeout);
  }
}

function requireToken() {
  if (!process.env.THREADS_ACCESS_TOKEN?.trim()) {
    throw apiError(503, "threads_access_token_missing", "THREADS_ACCESS_TOKEN 환경변수가 설정되지 않았습니다.");
  }
}

function threadsApiHost() {
  const value = process.env.THREADS_API_HOST?.trim() || DEFAULT_THREADS_API_HOST;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return DEFAULT_THREADS_API_HOST;
    return url.origin;
  } catch (_) {
    return DEFAULT_THREADS_API_HOST;
  }
}

function apiUrl(pathname) {
  return new URL(pathname, `${threadsApiHost()}/`);
}

function apiError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}
