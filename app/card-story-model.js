(() => {
  const MAX_CARD_TEXT = 900;

  function lines(value) {
    if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    return String(value || "").split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  }

  function cleanText(value, max = MAX_CARD_TEXT) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
  }

  function defaultEnding(item = {}) {
    const kind = String(item.kind || "");
    if (kind === "story") return "너라면 이 상황에서 어떻게 했을 것 같음?";
    if (kind === "humor") return "이건 웃김 vs 이해 안 됨, 어느 쪽임?";
    if (kind === "product" || kind === "useful") return "직접 써봤다면 뭐가 제일 달랐음?";
    return "이 이슈에서 제일 중요한 포인트는 뭐라고 봄?";
  }

  function sourceLabel(item = {}) {
    return cleanText(
      item.sourceMeta?.community
      || item.sourceMeta?.provider
      || item.sourceType
      || "source",
      70
    );
  }

  function deriveCapture(item = {}) {
    const bundle = item.researchBundle || {};
    const facts = lines(bundle.verifiedFacts);
    const claims = lines(bundle.claimsToVerify);
    const angles = lines(bundle.angles);
    const noteLines = lines(item.note);

    const excerpt = facts.length
      ? facts.slice(0, 4).join("\n")
      : noteLines.slice(0, 5).join("\n");

    const followup = bundle.whyNow
      || claims.slice(0, 3).join("\n")
      || angles.slice(0, 2).join("\n");

    return {
      hook: cleanText(item.title || "제목 없음", 110),
      excerpt: cleanText(excerpt, 650),
      followup: cleanText(followup, 520),
      reactions: [],
      ending: defaultEnding(item),
      source: sourceLabel(item),
    };
  }

  function buildStoryboard(item = {}, capture = {}, imageCount = 0) {
    const base = deriveCapture(item);
    const merged = {
      hook: cleanText(capture.hook || base.hook, 110),
      excerpt: cleanText(capture.excerpt || base.excerpt, 650),
      followup: cleanText(capture.followup || base.followup, 520),
      reactions: lines(capture.reactions || base.reactions).slice(0, 6).map((entry) => cleanText(entry, 180)),
      ending: cleanText(capture.ending || base.ending, 180),
      source: cleanText(capture.source || base.source, 70),
    };

    const cards = [{ type: "hook", title: merged.hook, body: "", source: merged.source }];

    const count = Math.max(0, Math.min(10, Number(imageCount) || 0));
    for (let index = 0; index < count; index += 1) {
      cards.push({ type: "capture-image", title: count > 1 ? `원문 ${index + 1}` : "원문", body: "", imageIndex: index, source: merged.source });
    }

    if (merged.excerpt) cards.push({ type: "excerpt", title: "핵심 내용", body: merged.excerpt, source: merged.source });
    if (merged.followup) cards.push({ type: "followup", title: "여기서 포인트", body: merged.followup, source: merged.source });
    if (merged.reactions.length) cards.push({ type: "reactions", title: "반응", body: merged.reactions.join("\n"), source: merged.source });
    if (merged.ending) cards.push({ type: "ending", title: merged.ending, body: "", source: merged.source });

    return {
      schemaVersion: 1,
      width: 1080,
      height: 1350,
      capture: merged,
      cards,
    };
  }

  function validateStoryboard(storyboard = {}) {
    const cards = Array.isArray(storyboard.cards) ? storyboard.cards : [];
    const issues = [];
    if (!cards.length) issues.push("card_missing");
    if (cards[0]?.type !== "hook") issues.push("hook_first_required");
    if (!cards.some((card) => card.type === "ending")) issues.push("ending_required");
    if (cards.length > 12) issues.push("too_many_cards");
    return { ok: issues.length === 0, issues };
  }

  window.ThreadsCardStoryModel = {
    lines,
    cleanText,
    defaultEnding,
    sourceLabel,
    deriveCapture,
    buildStoryboard,
    validateStoryboard,
  };
})();
