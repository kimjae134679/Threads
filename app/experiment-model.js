(() => {
  function normalizeMetrics(raw = {}) {
    const n = (key) => {
      const value = Number(raw?.[key]);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    const metrics = {
      views: n("views"),
      likes: n("likes"),
      replies: n("replies"),
      reposts: n("reposts"),
      quotes: n("quotes"),
      shares: n("shares"),
    };
    metrics.engagements = metrics.likes + metrics.replies + metrics.reposts + metrics.quotes + metrics.shares;
    return metrics;
  }

  function hasReach(publication) {
    return normalizeMetrics(publication?.insights?.metrics || {}).views > 0;
  }

  function percentile(value, values) {
    const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (clean.length <= 1) return 0.5;
    let below = 0;
    let equal = 0;
    for (const current of clean) {
      if (current < value) below += 1;
      else if (current === value) equal += 1;
    }
    return (below + Math.max(0, equal - 1) / 2) / (clean.length - 1);
  }

  function autoDecision(experiment, cohort) {
    const metrics = normalizeMetrics(experiment?.publication?.insights?.metrics || {});
    if (!metrics.views) {
      return { label: "LEARN", score: null, reachPercentile: null, engagementPercentile: null, reason: "조회 데이터가 아직 없습니다." };
    }
    if (!Array.isArray(cohort) || cohort.length < 5) {
      const count = Array.isArray(cohort) ? cohort.length : 0;
      return {
        label: "LEARN",
        score: null,
        reachPercentile: null,
        engagementPercentile: null,
        reason: `같은 플랫폼 비교군이 ${count}건입니다. 5건부터 상대 판정을 시작합니다.`,
      };
    }

    const reachValues = cohort.map((row) => normalizeMetrics(row.publication?.insights?.metrics || {}).views);
    const rateValues = cohort.map((row) => {
      const rowMetrics = normalizeMetrics(row.publication?.insights?.metrics || {});
      return rowMetrics.views > 0 ? rowMetrics.engagements / rowMetrics.views : 0;
    });
    const engagementRate = metrics.engagements / metrics.views;
    const reachPercentile = percentile(metrics.views, reachValues);
    const engagementPercentile = percentile(engagementRate, rateValues);
    const score = reachPercentile * 0.55 + engagementPercentile * 0.45;
    const label = score >= 0.75 ? "SCALE" : score <= 0.25 ? "KILL" : "KEEP";
    return {
      label,
      score,
      reachPercentile,
      engagementPercentile,
      reason: `같은 ${experiment.platform} ${cohort.length}건 비교 · 조회 백분위 ${(reachPercentile * 100).toFixed(0)} · 참여율 백분위 ${(engagementPercentile * 100).toFixed(0)} · 종합 ${(score * 100).toFixed(0)}`,
    };
  }

  function contentAxis(kind) {
    if (kind === "story" || kind === "humor") return "Internet Story / Culture";
    if (kind === "useful" || kind === "product") return "Useful / Product / Money";
    return "Hot / Issue";
  }

  window.ThreadsExperimentModel = {
    normalizeMetrics,
    hasReach,
    percentile,
    autoDecision,
    contentAxis,
  };
})();
