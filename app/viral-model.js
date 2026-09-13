(() => {
  const comfortRules = [
    {
      id: "graphic_violence",
      label: "고어/잔혹 폭력",
      severity: "block",
      patterns: [/고어/i, /참수/i, /토막/i, /시체\s*(사진|영상)?/i, /유혈\s*(사진|영상)/i, /잔혹\s*(사진|영상|장면)/i, /gore/i, /g[\s._*\-]*o[\s._*\-]*r[\s._*\-]*e/i, /behead/i, /dismember/i, /graphic\s+violence/i],
    },
    {
      id: "animal_abuse",
      label: "동물 학대",
      severity: "block",
      patterns: [/동물\s*학대/i, /동[\s._*\-]*물[\s._*\-]*학[\s._*\-]*대/i, /동물\s*고문/i, /동물을?\s*(때리|죽이|괴롭히)/i, /animal\s+abuse/i, /animal[\s._*\-]+abuse/i, /animal\s+torture/i],
    },
    {
      id: "sexual_violence",
      label: "성폭력/성착취",
      severity: "block",
      patterns: [/강간/i, /성폭행/i, /성착취/i, /아동\s*성/i, /미성년.*성착취/i, /rape/i, /sexual\s+assault/i, /sexual[\s._*\-]+assault/i, /sexual\s+exploitation/i, /csam/i],
    },
    {
      id: "self_harm_graphic",
      label: "자해/자살 장면",
      severity: "block",
      patterns: [/자살\s*(영상|사진|장면)/i, /자해\s*(영상|사진|장면)/i, /suicide\s*(video|photo|footage)/i, /self[- ]harm\s*(video|photo|footage)/i, /self[\s._*\-]*harm\s*(video|photo|footage)/i],
    },
    {
      id: "doxxing",
      label: "신상털기/도싱",
      severity: "block",
      patterns: [/신상\s*털/i, /신[\s._*\-]*상[\s._*\-]*털/i, /신상\s*공개.*(주소|전화|직장|학교)/i, /도xx/i, /doxx/i, /d[\s._*\-]*o[\s._*\-]*x[\s._*\-]*x/i, /home\s+address.*leak/i],
    },
    {
      id: "gross_unpleasant",
      label: "과도하게 불쾌한 소재",
      severity: "block",
      patterns: [/구더기\s*(떼|가득|영상|사진)?/i, /토사물\s*(사진|영상)/i, /배설물\s*(사진|영상)/i, /썩은\s*시체/i, /maggot\s*(infestation|video|photo)/i, /vomit\s*(video|photo)/i, /feces\s*(video|photo)/i],
    },
    {
      id: "physical_violence",
      label: "폭행/살인/학대 언급",
      severity: "review",
      patterns: [/폭행/i, /학대/i, /살인/i, /피투성이/i, /폭력\s*사건/i, /assault/i, /murder/i],
    },
    {
      id: "death_distress",
      label: "사망/참사",
      severity: "review",
      patterns: [/사망/i, /참사/i, /사고\s*현장/i, /fatal/i, /killed/i],
    },
    {
      id: "sexual_distress",
      label: "성적/노출 주의",
      severity: "review",
      patterns: [/성적\s*(논란|묘사|내용)/i, /노출\s*(논란|사진|영상)/i, /sexual\s+content/i, /nudity/i],
    },
    {
      id: "harassment_hate",
      label: "괴롭힘/혐오",
      severity: "review",
      patterns: [/괴롭힘/i, /혐오\s*(발언|표현|논란)/i, /harassment/i, /hate\s+speech/i],
    },
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

  function comfortText(input) {
    if (typeof input === "string") return input;
    const research = input?.researchBundle || {};
    return [
      input?.title,
      input?.note,
      research.whyNow,
      ...(research.claims || research.claimsToVerify || []),
      ...(research.verifiedFacts || []),
      ...(research.angles || []),
    ].filter(Boolean).join("\n");
  }

  function comfortScan(input) {
    const text = comfortText(input);
    const categories = [];
    for (const rule of comfortRules) {
      const hits = rule.patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
      if (!hits.length) continue;
      categories.push({ id: rule.id, label: rule.label, severity: rule.severity, hits });
    }

    const blockCategories = categories.filter((entry) => entry.severity === "block");
    const reviewCategories = categories.filter((entry) => entry.severity === "review");
    let score = 100 - blockCategories.length * 60 - reviewCategories.length * 16;
    score = clamp(score);
    const blocked = blockCategories.length > 0 || score < 60;
    const level = blocked ? "blocked" : reviewCategories.length > 0 || score < 82 ? "review" : "comfortable";
    const severeHits = blockCategories.flatMap((entry) => entry.hits);
    const cautionHits = reviewCategories.flatMap((entry) => entry.hits);
    return {
      score,
      blocked,
      level,
      categories,
      blockReasons: blockCategories.map((entry) => entry.id),
      reviewReasons: reviewCategories.map((entry) => entry.id),
      severeHits,
      cautionHits,
    };
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
    const url = String(item.url || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
    if (url) return `url:${url}`;
    return `title:${String(item.title || "").toLowerCase().replace(/[^0-9a-z가-힣]+/gi, " ").trim()}`;
  }

  window.ThreadsViralModel = {
    comfortRules,
    clamp,
    extractMetrics,
    comfortText,
    comfortScan,
    freshnessScore,
    cardabilityScore,
    score,
    dedupeKey,
  };
})();
