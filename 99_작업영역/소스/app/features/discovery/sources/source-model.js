(() => {
  const registry = window.ThreadsDiscoveryRegistry;
  if (!registry) return;

  const byId = new Map(registry.sources.map((source) => [source.id, source]));
  const lanesById = new Map(registry.lanes.map((lane) => [lane.id, lane]));
  const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "igshid", "ref", "ref_src", "share"]);
  const TITLE_NOISE = new Set(["속보", "단독", "공식", "영상", "짤", "펌", "근황", "화제", "논란", "breaking", "official", "update", "updated", "video", "clip"]);
  const METRICS = [
    ["views", ["viewCount", "views"]],
    ["likes", ["likeCount", "likes", "upvotes"]],
    ["comments", ["commentCount", "comments"]],
    ["shares", ["shareCount", "shares"]],
    ["rank", ["rank"]],
  ];

  function hostname(value) {
    if (!value) return "";
    try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch (_) { return ""; }
  }

  function matchesHost(host, candidate) {
    const normalized = String(candidate || "").toLowerCase().replace(/^www\./, "");
    return host === normalized || host.endsWith(`.${normalized}`);
  }

  function inferSourceId(item = {}) {
    const explicit = item.discoverySource?.sourceId || item.discoverySourceId || item.sourceMeta?.sourceId;
    if (explicit && byId.has(explicit)) return explicit;

    const host = hostname(item.url);
    if (host) {
      for (const source of registry.sources) {
        if (source.hosts.some((candidate) => matchesHost(host, candidate))) return source.id;
      }
    }

    const provider = `${item.sourceMeta?.provider || ""} ${item.sourceMeta?.community || ""} ${item.sourceType || ""}`.toLowerCase();
    if (/reddit|r\//.test(provider)) return "reddit";
    if (/twitter|\bx\b/.test(provider)) return "x";
    if (/blind/.test(provider)) return "blind";
    if (/dcinside|디시/.test(provider)) return "dcinside";
    if (/youtube/.test(provider)) return "youtube";
    if (/threads/.test(provider)) return "threads";
    if (/instagram/.test(provider)) return "instagram";
    if (/naver.*cafe|카페/.test(provider)) return "naver_cafe";
    if (/naver.*blog|블로그/.test(provider)) return "naver_blog";
    if (/news|뉴스/.test(provider) || item.sourceType === "news") return "generic_news";
    if (item.sourceType === "trend-signal") return "google_trends";
    return "other_public";
  }

  function resolveSource(item = {}) {
    const sourceId = inferSourceId(item);
    const source = byId.get(sourceId) || byId.get("other_public");
    return { ...source, sourceId: source.id };
  }

  function themeIds(item = {}) {
    const themeModel = window.ThreadsThemeModel;
    if (!themeModel) return [];
    const classification = themeModel.resolve(item);
    return [classification.primaryTheme, ...(classification.secondaryThemes || [])].filter(Boolean);
  }

  function laneScores(item = {}) {
    const sourceId = inferSourceId(item);
    const themes = themeIds(item);
    return registry.lanes.map((lane) => {
      const themeMatches = lane.themes.filter((theme) => themes.includes(theme));
      const sourceMatch = lane.sources.includes(sourceId);
      let score = themeMatches.length * 5 + (sourceMatch ? 2 : 0);
      if (lane.id === "community_debate" && item.kind === "story") score += 1;
      if (lane.id === "funny_memes" && item.kind === "humor") score += 2;
      if (lane.id === "news_issues" && item.kind === "breaking") score += 2;
      return { lane, score, themeMatches, sourceMatch };
    }).sort((a, b) => b.score - a.score || a.lane.label.localeCompare(b.lane.label, "ko"));
  }

  function primaryLane(item = {}) {
    const rows = laneScores(item);
    return rows[0]?.score > 0 ? rows[0].lane : lanesById.get("news_issues") || registry.lanes[0];
  }

  function matchesLane(item = {}, laneId = "all") {
    if (!laneId || laneId === "all") return true;
    const lane = lanesById.get(laneId);
    if (!lane) return true;
    const themes = themeIds(item);
    return lane.themes.some((theme) => themes.includes(theme));
  }

  function source(id) {
    return byId.get(id) || byId.get("other_public");
  }

  function lane(id) {
    return lanesById.get(id) || null;
  }

  function listSources() {
    return registry.sources.map((entry) => ({ ...entry, hosts: [...entry.hosts] }));
  }

  function listLanes() {
    return registry.lanes.map((entry) => ({ ...entry, themes: [...entry.themes], sources: [...entry.sources] }));
  }

  function canonicalUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      url.hash = "";
      for (const key of [...url.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
      }
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
      const query = url.searchParams.toString();
      return `${url.protocol}//${url.host}${url.pathname}${query ? `?${query}` : ""}`;
    } catch (_) {
      return String(value).trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
    }
  }

  function normalizedTitle(value) {
    const compact = String(value || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\[[^\]]{1,24}\]|\([^)]{1,24}\)/g, " ")
      .replace(/[^0-9a-z가-힣]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return compact.split(" ").filter((token) => token && !TITLE_NOISE.has(token)).join(" ");
  }

  function sameStoryKey(item = {}) {
    const explicit = item.discoveryGroupId || item.sameStoryGroup || item.sourceMeta?.storyGroup;
    if (explicit) return `explicit:${String(explicit).trim().toLowerCase()}`;
    const title = normalizedTitle(item.title);
    if (title) {
      const tokens = title.split(" ").filter((token) => token.length >= 2).slice(0, 12).sort();
      if (tokens.length >= 2) return `title:${tokens.join("|")}`;
      return `title:${title}`;
    }
    const url = canonicalUrl(item.url);
    return url ? `url:${url}` : "unknown";
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(String(value).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function firstMetric(obj, keys) {
    for (const key of keys) {
      const value = numberOrNull(obj?.[key]);
      if (value !== null) return { value, key };
    }
    return null;
  }

  function engagementEvidence(item = {}) {
    const manual = item.viralSignals || {};
    const meta = item.sourceMeta || {};
    const observed = {};
    for (const [metric, metaKeys] of METRICS) {
      const manualKeys = metric === "likes" ? ["likes", "upvotes"] : [metric];
      const manualHit = firstMetric(manual, manualKeys);
      const metaHit = firstMetric(meta, metaKeys);
      const hit = manualHit || metaHit;
      if (!hit) continue;
      observed[metric] = {
        value: hit.value,
        origin: manualHit ? "manual-observed" : "source-metadata",
        field: hit.key,
      };
    }

    const inferred = {};
    const signals = item.signals || {};
    for (const key of ["popularity", "discussion", "freshness", "sourceStrength", "cardability"]) {
      const value = numberOrNull(signals[key]);
      if (value !== null) inferred[key] = value;
    }

    const observedCount = Object.keys(observed).length;
    const inferredCount = Object.keys(inferred).length;
    return {
      observed,
      inferred,
      observedCount,
      inferredCount,
      level: observedCount ? "observed" : inferredCount ? "inferred-only" : "none",
      hasObservedEngagement: observedCount > 0,
    };
  }

  function normalizeCandidate(item = {}) {
    const resolvedSource = resolveSource(item);
    const resolvedLane = primaryLane(item);
    const evidence = engagementEvidence(item);
    const url = canonicalUrl(item.url);
    return {
      schemaVersion: 1,
      id: item.id || item.sourceKey || null,
      title: String(item.title || "").trim(),
      canonicalUrl: url,
      sourceId: resolvedSource.sourceId,
      sourceLabel: resolvedSource.label,
      sourceFamily: resolvedSource.family,
      adapter: resolvedSource.adapter,
      discoveryPriority: resolvedSource.discoveryPriority || "normal",
      collectionMode: resolvedSource.mode,
      manualCaptureRequired: Boolean(resolvedSource.manualCapture),
      bulkBodyCollectionAllowed: Boolean(resolvedSource.bulkBodyCollection),
      laneId: resolvedLane?.id || null,
      laneLabel: resolvedLane?.label || null,
      themeIds: themeIds(item),
      engagementEvidence: evidence,
      exactDuplicateKey: url ? `url:${url}` : `title:${normalizedTitle(item.title)}`,
      sameStoryKey: sameStoryKey(item),
      publishedAt: item.sourceMeta?.publishedAt || item.sourceMeta?.pubDate || item.createdAt || null,
      sourceRisk: item.sourceRisk || item.discoverySource?.sourceRisk || null,
    };
  }

  function groupCandidates(items = []) {
    const exact = new Map();
    const stories = new Map();
    for (const item of items) {
      const normalized = normalizeCandidate(item);
      if (!exact.has(normalized.exactDuplicateKey)) exact.set(normalized.exactDuplicateKey, []);
      exact.get(normalized.exactDuplicateKey).push({ item, normalized });
      if (!stories.has(normalized.sameStoryKey)) stories.set(normalized.sameStoryKey, []);
      stories.get(normalized.sameStoryKey).push({ item, normalized });
    }
    const mapGroup = (map) => [...map.entries()]
      .filter(([, members]) => members.length > 1)
      .map(([key, members]) => ({ key, members, count: members.length }));
    return { exactDuplicates: mapGroup(exact), sameStories: mapGroup(stories) };
  }

  function sourceSummary(items = []) {
    const counts = new Map();
    for (const item of items) {
      const id = inferSourceId(item);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: source(id).label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  }

  function laneSummary(items = []) {
    const counts = new Map();
    for (const item of items) {
      const resolved = primaryLane(item);
      if (!resolved) continue;
      counts.set(resolved.id, (counts.get(resolved.id) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: lane(id)?.label || id, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  }

  window.ThreadsDiscoverySourceModel = {
    hostname,
    inferSourceId,
    resolveSource,
    laneScores,
    primaryLane,
    matchesLane,
    source,
    lane,
    listSources,
    listLanes,
    canonicalUrl,
    normalizedTitle,
    sameStoryKey,
    engagementEvidence,
    normalizeCandidate,
    groupCandidates,
    sourceSummary,
    laneSummary,
  };
})();
