(() => {
  function normalize(fieldPayload = {}, discoveryPayload = {}) {
    if (!fieldPayload?.demoOnly || fieldPayload?.productionEligible !== false) {
      throw new Error("field_test_must_be_demo_only");
    }
    const discoveryByKey = new Map((discoveryPayload.items || []).map((item) => [item.sourceKey, item]));
    return (fieldPayload.items || []).map((item) => joinItem(item, discoveryByKey.get(item.sourceKey)));
  }

  function joinItem(field, discovery = {}) {
    const observed = field.observedSignals || {};
    const sourceMeta = discovery.sourceMeta || {};
    const sourceEvidence = {
      mode: "observed",
      views: finiteOrNull(observed.views ?? sourceMeta.viewCount),
      comments: finiteOrNull(observed.comments ?? sourceMeta.commentCount),
      votes: finiteOrNull(observed.votes ?? sourceMeta.likeCount),
      rank: finiteOrNull(observed.rank ?? sourceMeta.rank),
      spread: observed.spread || sourceMeta.community || "",
    };
    return {
      id: `field-${slug(field.sourceKey)}`,
      sourceKey: field.sourceKey,
      title: discovery.title || field.storyboard?.cards?.[0]?.title || field.sourceKey,
      sourceUrl: discovery.url || "",
      sourcePlatform: sourceMeta.provider || discovery.sourceType || "public source",
      sourceRisk: discovery.sourceRisk || "yellow",
      kind: discovery.kind || "story",
      discoveryLane: field.lane || "미분류",
      primaryTheme: field.theme || "미분류",
      status: field.status || "review",
      whySelected: field.whySelected || "",
      sourceEvidence,
      factChecks: [...(field.factChecks || [])],
      storyboard: field.storyboard || { cards: [] },
      caption: field.caption || "",
      productionEligible: false,
      demoOnly: true,
    };
  }

  function evidenceText(evidence = {}) {
    return [
      evidence.views != null ? `조회 ${Number(evidence.views).toLocaleString()}` : "",
      evidence.comments != null ? `댓글 ${Number(evidence.comments).toLocaleString()}` : "",
      evidence.votes != null ? `반응 ${Number(evidence.votes).toLocaleString()}` : "",
      evidence.rank != null ? `공개 인덱스 ${Number(evidence.rank)}위` : "",
      evidence.spread || "",
    ].filter(Boolean).join(" · ") || "검증 가능한 공개 반응 수치 없음";
  }

  function finiteOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function slug(value) {
    return String(value || "unknown").toLowerCase().replace(/[^0-9a-z가-힣]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  }

  window.ThreadsFieldTestModel = { normalize, joinItem, evidenceText };
})();
