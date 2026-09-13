(() => {
  const registry = window.ThreadsDiscoveryRegistry;
  if (!registry) return;

  const byId = new Map(registry.sources.map((source) => [source.id, source]));
  const lanesById = new Map(registry.lanes.map((lane) => [lane.id, lane]));

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
    sourceSummary,
    laneSummary,
  };
})();
