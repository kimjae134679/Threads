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

  function redactPII(value) {
    let text = String(value || "");
    const rules = [
      [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[이메일 가림]"],
      [/(?<!\d)(?:01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g, "[전화번호 가림]"],
      [/(?<!\d)\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g, "[전화번호 가림]"],
      [/(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/g, "[주민번호 가림]"],
      [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP 가림]"],
      [/(^|\s)@[A-Za-z0-9_.]{2,32}\b/g, "$1[@핸들 가림]"],
    ];
    for (const [pattern, replacement] of rules) text = text.replace(pattern, replacement);
    return text;
  }

  function safeCardText(value, max = MAX_CARD_TEXT) {
    return cleanText(redactPII(value), max);
  }

  function defaultEnding(item = {}) {
    const kind = String(item.kind || "");
    if (kind === "story") return "너라면 이 상황에서 어떻게 했을 것 같음?";
    if (kind === "humor") return "이건 웃김 vs 이해 안 됨, 어느 쪽임?";
    if (kind === "product" || kind === "useful") return "직접 써봤다면 뭐가 제일 달랐음?";
    return "이 이슈에서 제일 중요한 포인트는 뭐라고 봄?";
  }

  function sourceLabel(item = {}) {
    return safeCardText(
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
      hook: safeCardText(item.title || "제목 없음", 110),
      excerpt: safeCardText(excerpt, 650),
      followup: safeCardText(followup, 520),
      reactions: [],
      ending: safeCardText(defaultEnding(item), 180),
      source: sourceLabel(item),
    };
  }

  function buildStoryboard(item = {}, capture = {}, imageCount = 0) {
    const base = deriveCapture(item);
    const merged = {
      hook: safeCardText(capture.hook || base.hook, 110),
      excerpt: safeCardText(capture.excerpt || base.excerpt, 650),
      followup: safeCardText(capture.followup || base.followup, 520),
      reactions: lines(capture.reactions || base.reactions).slice(0, 6).map((entry) => safeCardText(entry, 180)),
      ending: safeCardText(capture.ending || base.ending, 180),
      source: safeCardText(capture.source || base.source, 70),
    };

    const count = Math.max(0, Math.min(10, Number(imageCount) || 0));
    const cards = [{
      type: "hook",
      title: merged.hook,
      body: "",
      source: merged.source,
      backgroundImageIndex: count ? 0 : null,
      backgroundMode: count ? "blurred-source-image" : "missing-source-image",
    }];

    for (let index = 0; index < count; index += 1) {
      cards.push({
        type: "capture-image",
        title: count > 1 ? `원문 ${index + 1}` : "원문",
        body: "",
        imageIndex: index,
        source: merged.source,
        fit: "contain",
        backgroundMode: "blurred-duplicate",
      });
    }

    return {
      schemaVersion: 3,
      renderProfile: "reference-square",
      width: 1080,
      height: 1080,
      assetPolicy: {
        sourceImageRequired: true,
        generatedImageFallback: false,
        firstAssetUsedAsBlurredCover: true,
        selectedAssetOrderIsCarouselOrder: true,
      },
      privacy: {
        textPiiMasked: true,
        imageMaskingRequired: count > 0,
      },
      capture: merged,
      cards,
    };
  }

  function validateStoryboard(storyboard = {}) {
    const cards = Array.isArray(storyboard.cards) ? storyboard.cards : [];
    const issues = [];
    if (!cards.length) issues.push("card_missing");
    if (cards[0]?.type !== "hook") issues.push("hook_first_required");
    if (storyboard.renderProfile === "reference-square") {
      if (storyboard.width !== 1080 || storyboard.height !== 1080) issues.push("reference_square_size_required");
      if (cards[0]?.backgroundMode !== "blurred-source-image") issues.push("source_image_cover_required");
      if (!cards.some((card) => card.type === "capture-image")) issues.push("source_image_slide_required");
      if (storyboard.assetPolicy?.generatedImageFallback !== false) issues.push("generated_image_fallback_must_be_disabled");
    }
    if (cards.length > 11) issues.push("too_many_cards");
    return { ok: issues.length === 0, issues };
  }


  window.ThreadsCardStoryModel = {
    lines,
    cleanText,
    redactPII,
    safeCardText,
    defaultEnding,
    sourceLabel,
    deriveCapture,
    buildStoryboard,
    validateStoryboard,
  };
})();
