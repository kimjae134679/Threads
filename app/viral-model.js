(() => {
  const severePatterns = [
    /동물\s*학대/i, /고어/i, /참수/i, /토막/i, /시체/i, /유혈/i, /잔혹\s*영상/i,
    /강간/i, /아동\s*성/i, /성착취/i, /자살\s*(영상|사진)/i, /신상\s*털/i, /도xx/i,
  ];
  const cautionPatterns = [
    /폭행/i, /학대/i, /사망/i, /살인/i, /피투성이/i, /혐오/i, /성적/i, /노출/i, /괴롭힘/i,
  ];

  function clamp(value, min = 0, max = 100) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.max(min, Math.min(max, numeric));
  }

  function num(value) {
    const numeric = Number(String(value ?? "").replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  }

  function logScore(value, ceilingPower) {
    const numeric = num(value);
    if (!numeric) return 0;
    return clamp((Math.log10(numeric + 1) / ceilingPower) * 100);
  }

  function extractMetrics(item = {}) {
    const meta = item.sourceMeta || {};
    const manual = item.viralSignals || {};
    return {
      views: num(manual.views ?? meta.viewCount ?? meta.views),
      likes: num(manual.likes ?? manual.upvotes ?? meta.likeCount ?? meta.likes ?? meta.upvotes),
      comments: num(manual.comments ?? meta.commentCount ?? meta.comments),
      shares: num(manual.shares ?? meta.shareCount ?? meta.shares),
      rank: num(manual.rank ?? meta.rank),
    };
  }

  function comfortScan(input) {
    const text = typeof input === "string"
      ? input
      : [input?.title, input?.note, input?.researchBundle?.whyNow, ...(input?.researchBundle?.claims || [])].filter(Boolean).join("\n");
    const severeHits = severePatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
    const cautionHits = cautionPatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
    let score = 100 - severeHits.length * 55 - cautionHits.length * 14;
    score = clamp(score);
    const blocked = severeHits.length > 0 || score < 60;
    const level = blocked ? "blocked" : score < 80 ? "review" : "comfortable";
    return { score, blocked, level, severeHits, cautionHits };
  }

  function freshnessScore(item = {}) {
    const direct = Number(item?.signals?.freshness);
    if (Number.isFinite(direct)) return clamp(direct);
    const value = item?.sourceMeta?.publishedAt || item?.sourceMeta?.pubDate || item?.createdAt;
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return 50;
    const ageHours = Math.max(0, (Date.now() - time) / 3_600_000);
    if (ageHours <= 3) return 100;
    if (ageHours <= 12) return 90;
    if (ageHours <= 24) return 80;
    if (ageHours <= 72) return 65;
    if (ageHours <= 168) return 45;
    return 25;
  }

  function cardabilityScore(item = {}) {
    let score = 45;
    if (["story", "humor", "breaking", "useful"].includes(item.kind)) score += 18;
    if (String(item.title || "").length >= 12 && String(item.title || "").length <= 80) score += 12;
    if ((item.relatedSources || []).length >= 1) score += 8;
    if (/왜|이유|논란|후기|반전|결국|진짜|회사|연애|돈|군대|게임|황당|웃긴/i.test(`${item.title || ""} ${item.note || ""}`)) score += 12;
    return clamp(score);
  }

  function score(item = {}) {
    const metrics = extractMetrics(item);
    const comfort = comfortScan(item);
    const views = logScore(metrics.views, 6.5);
    const comments = logScore(metrics.comments, 3.5);
    const likes = logScore(metrics.likes, 5.5);
    const shares = logScore(metrics.shares, 4.5);
    const engagementRate = metrics.views > 0
      ? clamp(((metrics.likes + metrics.comments * 2 + metrics.shares * 3) / metrics.views) * 500)
      : 0;
    const rank = metrics.rank > 0 ? clamp(105 - metrics.rank * 4) : 0;
    const sourceStrength = Math.max(rank, views * 0.7 + comments * 0.3);
    const freshness = freshnessScore(item);
    const cardability = cardabilityScore(item);
    const discussion = Math.max(comments, engagementRate);
    const popularity = Math.max(views, likes * 0.85, shares * 0.9);
    const raw = popularity * 0.32 + discussion * 0.23 + sourceStrength * 0.15 + freshness * 0.15 + cardability * 0.15;
    const viralScore = Math.round(clamp(raw));
    let decision = viralScore >= 78 ? "STRONG" : viralScore >= 58 ? "CANDIDATE" : "LOW";
    if (comfort.blocked) decision = "BLOCK";
    else if (comfort.level === "review" && decision === "STRONG") decision = "REVIEW";
    return {
      viralScore,
      decision,
      comfort,
      metrics,
      components: {
        popularity: Math.round(popularity),
        discussion: Math.round(discussion),
        sourceStrength: Math.round(sourceStrength),
        freshness: Math.round(freshness),
        cardability: Math.round(cardability),
      },
    };
  }

  function dedupeKey(item = {}) {
    const url = String(item.url || "").trim().toLowerCase().replace(/[?#].*$/, "");
    if (url) return `url:${url}`;
    return `title:${String(item.title || "").toLowerCase().replace(/[^0-9a-z가-힣]+/gi, " ").trim()}`;
  }

  window.ThreadsViralModel = { clamp, extractMetrics, comfortScan, freshnessScore, cardabilityScore, score, dedupeKey };
})();
