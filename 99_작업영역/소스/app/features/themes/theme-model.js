(() => {
  const taxonomy = window.ThreadsThemeTaxonomy;
  if (!taxonomy) return;

  const themeById = new Map(taxonomy.themes.map((theme) => [theme.id, theme]));

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/<[^>]*>/g, " ")
      .replace(/[\u200b-\u200d\ufeff]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sourceText(item = {}) {
    const research = item.researchBundle || {};
    const parts = [
      item.title,
      item.note,
      item.kind,
      item.sourceType,
      item.sourceMeta?.provider,
      item.sourceMeta?.channelTitle,
      research.whyNow,
      ...(research.verifiedFacts || []),
      ...(research.claimsToVerify || []),
      ...(research.angles || []),
      ...(item.relatedSources || []).flatMap((source) => [source.title, source.source]),
    ];
    return normalizeText(parts.filter(Boolean).join(" \n "));
  }

  function keywordHits(text, keywords = []) {
    const hits = [];
    for (const keyword of keywords) {
      const needle = normalizeText(keyword);
      if (!needle) continue;
      if (text.includes(needle)) hits.push(keyword);
    }
    return hits;
  }

  function scoreTheme(theme, text, item = {}) {
    if (theme.id === "general_viral") return { score: 0, hits: [] };
    const hits = keywordHits(text, theme.keywords);
    let score = hits.length * 2;

    const kind = String(item.kind || "");
    if (theme.id === "internet_humor" && kind === "humor") score += 3;
    if (hits.length && theme.id === "tech_ai_games" && ["product", "explainer"].includes(kind)) score += 1;
    if (hits.length && theme.id === "society_news" && kind === "breaking") score += 1;
    if (hits.length && theme.id === "money_consumption" && kind === "product") score += 1;

    const title = normalizeText(item.title);
    for (const hit of hits) {
      const normalizedHit = normalizeText(hit);
      if (normalizedHit && title.includes(normalizedHit)) score += 1;
    }
    return { score, hits };
  }

  function suggest(item = {}) {
    const text = sourceText(item);
    const scored = taxonomy.themes
      .filter((theme) => theme.id !== "general_viral")
      .map((theme) => ({ theme, ...scoreTheme(theme, text, item) }))
      .sort((a, b) => b.score - a.score || a.theme.label.localeCompare(b.theme.label, "ko"));

    const top = scored[0] || { score: 0, hits: [], theme: themeById.get("general_viral") };
    const second = scored[1] || { score: 0 };
    const primaryTheme = top.score > 0 ? top.theme.id : "general_viral";
    const secondaryThemes = scored
      .filter((row) => row.score >= 2 && row.theme.id !== primaryTheme && row.score >= Math.max(2, top.score * 0.5))
      .slice(0, 2)
      .map((row) => row.theme.id);

    let confidence = "low";
    if (top.score >= 8 && top.score - second.score >= 2) confidence = "high";
    else if (top.score >= 4) confidence = "medium";

    return {
      schemaVersion: 1,
      taxonomyVersion: taxonomy.version,
      primaryTheme,
      secondaryThemes,
      tags: [],
      confidence,
      score: top.score,
      reasons: top.hits.slice(0, 8),
      source: "auto",
      computedAt: new Date().toISOString(),
    };
  }

  function normalizeAssignment(value = {}) {
    const primaryTheme = themeById.has(value.primaryTheme) ? value.primaryTheme : "general_viral";
    const secondaryThemes = [...new Set(Array.isArray(value.secondaryThemes) ? value.secondaryThemes : [])]
      .filter((id) => id !== primaryTheme && themeById.has(id))
      .slice(0, 3);
    const tags = [...new Set(Array.isArray(value.tags) ? value.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [])].slice(0, 12);
    return {
      schemaVersion: 1,
      taxonomyVersion: taxonomy.version,
      primaryTheme,
      secondaryThemes,
      tags,
      confidence: ["high", "medium", "low", "manual"].includes(value.confidence) ? value.confidence : "low",
      score: Number.isFinite(Number(value.score)) ? Number(value.score) : 0,
      reasons: Array.isArray(value.reasons) ? value.reasons.map(String).slice(0, 8) : [],
      source: value.source === "manual" ? "manual" : "auto",
      computedAt: value.computedAt || null,
      updatedAt: value.updatedAt || null,
    };
  }

  function resolve(item = {}) {
    const saved = item.themeClassification;
    if (saved?.source === "manual") return normalizeAssignment(saved);
    if (saved?.taxonomyVersion === taxonomy.version && saved?.primaryTheme) return normalizeAssignment(saved);
    return normalizeAssignment(suggest(item));
  }

  function assignAuto(item = {}) {
    const current = item.themeClassification;
    if (current?.source === "manual") return normalizeAssignment(current);
    const next = suggest(item);
    item.themeClassification = next;
    return normalizeAssignment(next);
  }

  function assignManual(item = {}, input = {}) {
    const next = normalizeAssignment({
      ...input,
      source: "manual",
      confidence: "manual",
      computedAt: input.computedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    item.themeClassification = next;
    return next;
  }

  function clearManual(item = {}) {
    const next = suggest(item);
    item.themeClassification = next;
    return normalizeAssignment(next);
  }

  function theme(id) {
    return themeById.get(id) || themeById.get("general_viral");
  }

  function label(id) {
    return theme(id)?.label || id || "기타 바이럴";
  }

  function list() {
    return taxonomy.themes.map((entry) => ({ ...entry, keywords: [...entry.keywords] }));
  }

  function summary(items = []) {
    const counts = new Map();
    for (const item of items) {
      const classification = resolve(item);
      counts.set(classification.primaryTheme, (counts.get(classification.primaryTheme) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: label(id), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  }

  window.ThreadsThemeModel = {
    normalizeText,
    sourceText,
    suggest,
    resolve,
    assignAuto,
    assignManual,
    clearManual,
    normalizeAssignment,
    theme,
    label,
    list,
    summary,
  };
})();
