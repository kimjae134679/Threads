import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BUFFER_API_HOST = "https://api.buffer.com";
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const LOCAL_CONFIG_PATH = path.join(ROOT, "config", "buffer.local.json");
const ALLOWED_MODES = new Set(["addToQueue", "shareNow", "customScheduled"]);

export function getBufferStatus() {
  const apiKeyConfigured = Boolean(process.env.BUFFER_API_KEY?.trim());
  const localConfig = readLocalConfig();
  const envChannelId = String(process.env.BUFFER_THREADS_CHANNEL_ID || "").trim();
  const channelId = envChannelId || String(localConfig?.channelId || "").trim();
  const channelConfigured = Boolean(channelId);
  return {
    configured: apiKeyConfigured && channelConfigured,
    apiKeyConfigured,
    channelConfigured,
    kind: "third-party-publisher",
    label: "Buffer API",
    apiHost: bufferApiHost(),
    requiredEnv: ["BUFFER_API_KEY"],
    optionalEnv: ["BUFFER_THREADS_CHANNEL_ID"],
    channelSource: envChannelId ? "env" : channelConfigured ? "config/buffer.local.json" : null,
    channel: channelConfigured ? {
      id: channelId,
      name: localConfig?.name || "",
      displayName: localConfig?.displayName || "",
      organizationId: localConfig?.organizationId || "",
    } : null,
    supports: ["addToQueue", "shareNow", "customScheduled", "threads-thread"],
    mode: "human-approved-only",
    note: "선택형 보조 발행 경로입니다. 앱의 사람 승인과 Safety Gate를 통과한 콘텐츠만 Buffer에 전달하며 API 키는 브라우저로 노출하지 않습니다.",
  };
}

export async function listBufferThreadsChannels() {
  requireApiKey();
  const organizationsPayload = await bufferGraphql(`
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);
  const organizations = Array.isArray(organizationsPayload?.account?.organizations)
    ? organizationsPayload.account.organizations
    : [];

  const channels = [];
  for (const organization of organizations) {
    if (!organization?.id) continue;
    const payload = await bufferGraphql(`
      query GetChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id
          name
          displayName
          service
          avatar
          isQueuePaused
        }
      }
    `, { organizationId: organization.id });
    const rows = Array.isArray(payload?.channels) ? payload.channels : [];
    for (const channel of rows) {
      if (String(channel?.service || "").toLowerCase() !== "threads") continue;
      channels.push({
        id: String(channel.id || ""),
        name: String(channel.name || ""),
        displayName: String(channel.displayName || ""),
        service: "threads",
        avatar: String(channel.avatar || ""),
        isQueuePaused: Boolean(channel.isQueuePaused),
        organizationId: String(organization.id),
        organizationName: String(organization.name || ""),
      });
    }
  }

  return { organizations, channels, collectedAt: new Date().toISOString() };
}

export async function saveBufferThreadsChannel(channelId) {
  const id = String(channelId || "").trim();
  if (!id) throw apiError(400, "buffer_channel_required", "저장할 Buffer Threads 채널 ID가 필요합니다.");
  const discovery = await listBufferThreadsChannels();
  const channel = discovery.channels.find((entry) => entry.id === id);
  if (!channel) throw apiError(400, "buffer_threads_channel_not_found", "선택한 채널이 현재 Buffer 계정의 Threads 채널 목록에 없습니다.");

  await fsp.mkdir(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
  const config = {
    schemaVersion: 1,
    channelId: channel.id,
    name: channel.name,
    displayName: channel.displayName,
    organizationId: channel.organizationId,
    organizationName: channel.organizationName,
    savedAt: new Date().toISOString(),
  };
  await fsp.writeFile(LOCAL_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

export function buildBufferPostInput({ channelId, text, thread, mode = "addToQueue", dueAt = null, aiAssisted = true } = {}) {
  const id = String(channelId || "").trim();
  if (!id) throw apiError(400, "buffer_channel_required", "Buffer Threads 채널 ID가 필요합니다.");
  const safeMode = String(mode || "addToQueue");
  if (!ALLOWED_MODES.has(safeMode)) throw apiError(400, "buffer_mode_invalid", "지원하지 않는 Buffer 게시 모드입니다.");

  const segments = normalizeSegments(thread, text);
  if (!segments.length) throw apiError(400, "buffer_text_required", "Buffer에 전달할 Threads 원고가 비어 있습니다.");
  for (const segment of segments) {
    if ([...segment].length > 500) {
      throw apiError(400, "buffer_threads_segment_too_long", "Threads 게시물 한 조각이 500자를 초과합니다. 승인된 원고를 게시물 단위로 다시 나눠 검토하세요.");
    }
  }

  const input = {
    text: segments[0],
    channelId: id,
    schedulingType: "automatic",
    mode: safeMode,
    needsApproval: false,
    aiAssisted: Boolean(aiAssisted),
    source: "threads-ai-content-lab",
  };

  if (segments.length > 1) {
    input.metadata = {
      threads: {
        thread: segments.map((segment) => ({ text: segment })),
      },
    };
  }

  if (safeMode === "customScheduled") {
    const scheduled = new Date(String(dueAt || ""));
    if (!Number.isFinite(scheduled.getTime())) throw apiError(400, "buffer_due_at_required", "예약 게시에는 유효한 dueAt이 필요합니다.");
    if (scheduled.getTime() <= Date.now()) throw apiError(400, "buffer_due_at_past", "Buffer 예약 시각은 현재보다 이후여야 합니다.");
    input.dueAt = scheduled.toISOString();
  }

  return { input, segments };
}

export async function publishThreadsViaBuffer({ text, thread, mode = "addToQueue", dueAt = null, channelId = null } = {}) {
  requireApiKey();
  const configuredChannelId = resolveConfiguredChannelId();
  const { input, segments } = buildBufferPostInput({
    channelId: String(channelId || "").trim() || configuredChannelId,
    text,
    thread,
    mode,
    dueAt,
    aiAssisted: true,
  });

  const payload = await bufferGraphql(`
    mutation CreateThreadsPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            status
            text
            dueAt
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `, { input });

  const result = payload?.createPost;
  if (!result?.post?.id) {
    throw apiError(502, "buffer_publish_failed", String(result?.message || "Buffer가 게시물 ID를 반환하지 않았습니다."));
  }

  return {
    provider: "buffer",
    platform: "threads",
    id: String(result.post.id),
    status: String(result.post.status || ""),
    text: String(result.post.text || segments[0]),
    thread: segments,
    dueAt: result.post.dueAt || input.dueAt || null,
    mode: input.mode,
    channelId: input.channelId,
    createdAt: new Date().toISOString(),
  };
}

function normalizeSegments(thread, text) {
  const source = Array.isArray(thread) && thread.length ? thread : [text];
  return source
    .map((entry) => typeof entry === "string" ? entry : entry?.text)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function resolveConfiguredChannelId() {
  const envChannelId = String(process.env.BUFFER_THREADS_CHANNEL_ID || "").trim();
  if (envChannelId) return envChannelId;
  return String(readLocalConfig()?.channelId || "").trim();
}

function readLocalConfig() {
  try {
    if (!fs.existsSync(LOCAL_CONFIG_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

async function bufferGraphql(query, variables = {}) {
  requireApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(bufferApiHost(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${process.env.BUFFER_API_KEY.trim()}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw apiError(502, "buffer_upstream_error", `Buffer API request failed (${response.status})`, { upstreamStatus: response.status });
    }
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      const message = payload.errors.map((error) => error?.message).filter(Boolean).join("; ") || "Buffer GraphQL error";
      throw apiError(502, "buffer_graphql_error", message);
    }
    return payload?.data || {};
  } catch (error) {
    if (error?.status) throw error;
    if (error?.name === "AbortError") throw apiError(504, "buffer_timeout", "Buffer API 요청 시간이 초과되었습니다.");
    throw apiError(502, "buffer_fetch_failed", String(error?.message || error));
  } finally {
    clearTimeout(timeout);
  }
}

function requireApiKey() {
  if (!process.env.BUFFER_API_KEY?.trim()) {
    throw apiError(503, "buffer_api_key_missing", "BUFFER_API_KEY 환경변수가 설정되지 않았습니다.");
  }
}

function bufferApiHost() {
  const value = String(process.env.BUFFER_API_HOST || DEFAULT_BUFFER_API_HOST).trim();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return DEFAULT_BUFFER_API_HOST;
    return url.origin;
  } catch (_) {
    return DEFAULT_BUFFER_API_HOST;
  }
}

function apiError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}
