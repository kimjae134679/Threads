(() => {
  const DATA_URL = "/data/demo-showcase-2026-09-14.json";
  const footer = document.querySelector("footer");
  if (!footer) return;

  const section = document.createElement("section");
  section.className = "demo-showcase panel";
  section.innerHTML = `
    <div class="demo-showcase-head">
      <div>
        <p class="eyebrow">DEMO SHOWCASE · REAL PUBLIC SOURCES</p>
        <h2>실제 후보를 어떻게 가공하는지 보기</h2>
        <p>공개/인덱스 가능한 실제 소스를 바탕으로 만든 데모입니다. 이 영역의 항목은 자동 게시되지 않으며, Inbox로 복사한 뒤 Research/Safety/승인을 다시 거쳐야 합니다.</p>
      </div>
      <div class="demo-showcase-actions">
        <button type="button" class="button ghost" data-demo-action="refresh">새로고침</button>
        <button type="button" class="button primary" data-demo-action="import-all">3개 Inbox에 복사</button>
      </div>
    </div>
    <div class="demo-showcase-status" data-demo-status>불러오는 중…</div>
    <div class="demo-showcase-grid" data-demo-grid></div>
  `;
  footer.insertAdjacentElement("beforebegin", section);

  const status = section.querySelector("[data-demo-status]");
  const grid = section.querySelector("[data-demo-grid]");
  let payload = null;

  section.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-demo-action]");
    if (!button) return;
    const action = button.dataset.demoAction;
    if (action === "refresh") load();
    if (action === "import-all") importAll();
    if (action === "import-one") importOne(button.dataset.demoId);
    if (action === "toggle-story") toggleStory(button.dataset.demoId);
  });

  load();

  async function load() {
    status.textContent = "실제 공개 소스 데모를 불러오는 중…";
    grid.innerHTML = "";
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.items)) throw new Error(`demo_showcase_load_failed:${response.status}`);
      payload = data;
      render();
      status.textContent = `데모 ${data.items.length}건 · 자동 공개 게시 금지 · productionEligible=${String(data.productionEligible)}`;
    } catch (error) {
      status.textContent = `데모를 불러오지 못했습니다: ${String(error?.message || error)}`;
    }
  }

  function render() {
    grid.innerHTML = "";
    for (const item of payload.items) grid.appendChild(renderCard(item));
  }

  function renderCard(item) {
    const article = document.createElement("article");
    article.className = "demo-showcase-card";
    article.dataset.demoId = item.id;
    const evidence = item.sourceEvidence || {};
    const metrics = [
      evidence.votes != null ? `▲ ${Number(evidence.votes).toLocaleString()}` : "",
      evidence.comments != null ? `댓글 ${Number(evidence.comments).toLocaleString()}` : "",
    ].filter(Boolean).join(" · ") || "공개 반응 수치 없음";
    const cards = Array.isArray(item.storyboard?.cards) ? item.storyboard.cards : [];

    article.innerHTML = `
      <div class="demo-card-top">
        <div class="demo-chip-row">
          <span class="pill neutral">${escapeHtml(item.discoveryLane || "미분류")}</span>
          <span class="pill neutral">${escapeHtml(item.primaryTheme || "미분류")}</span>
          <span class="pill ${decisionTone(item.scores?.decision)}">${escapeHtml(item.scores?.decision || "REVIEW")}</span>
        </div>
        <span class="demo-score">V ${Number(item.scores?.viral || 0)} · C ${Number(item.scores?.audienceComfort || 0)}</span>
      </div>
      <h3>${escapeHtml(item.title || "제목 없음")}</h3>
      <div class="demo-source"><b>${escapeHtml(item.sourcePlatform || "source")}</b><span>${escapeHtml(metrics)}</span></div>
      <p class="demo-reason">${escapeHtml(item.scores?.reason || "")}</p>
      <div class="demo-caption"><b>캡션 예시</b><span>${escapeHtml(item.caption || "")}</span></div>
      <div class="demo-card-actions">
        <a class="button ghost" href="${escapeAttr(item.sourceUrl || "#")}" target="_blank" rel="noopener noreferrer">원 출처 열기</a>
        <button type="button" class="button ghost" data-demo-action="toggle-story" data-demo-id="${escapeAttr(item.id)}">스토리보드 ${cards.length}장 보기</button>
        <button type="button" class="button primary" data-demo-action="import-one" data-demo-id="${escapeAttr(item.id)}">Inbox로 복사</button>
      </div>
      <div class="demo-storyboard" data-demo-story="${escapeAttr(item.id)}" hidden>${renderStoryboard(cards)}</div>
      <div class="demo-next-checks"><b>게시 전 확인</b>${(item.nextChecks || []).map((value) => `<span>• ${escapeHtml(value)}</span>`).join("")}</div>
    `;
    return article;
  }

  function renderStoryboard(cards) {
    return cards.map((card, index) => `
      <div class="demo-story-card">
        <small>${index + 1}/${cards.length} · ${escapeHtml(card.type || "card")}</small>
        <strong>${escapeHtml(card.title || "")}</strong>
        ${card.body ? `<p>${escapeHtml(card.body)}</p>` : ""}
        <em>${escapeHtml(card.source || "")}</em>
      </div>
    `).join("");
  }

  function toggleStory(id) {
    const target = section.querySelector(`[data-demo-story="${cssEscape(id)}"]`);
    if (!target) return;
    target.hidden = !target.hidden;
  }

  function importAll() {
    if (!payload?.items?.length) return;
    let added = 0;
    for (const item of payload.items) added += importCandidate(item, false) ? 1 : 0;
    if (added) {
      persist();
      render();
      showSystemMessage(`데모 ${added}건을 Inbox에 복사했습니다. 데모 플래그가 유지되며 자동 게시되지 않습니다.`, "success");
    } else {
      showSystemMessage("이미 같은 데모 후보가 Inbox에 있습니다.", "info");
    }
  }

  function importOne(id) {
    const item = payload?.items?.find((candidate) => candidate.id === id);
    if (!item) return;
    if (!importCandidate(item, true)) {
      showSystemMessage("이미 같은 데모 후보가 Inbox에 있습니다.", "info");
    }
  }

  function importCandidate(demo, persistNow) {
    const demoKey = `showcase:${demo.id}`;
    if ((state.items || []).some((item) => item.demoShowcase?.sourceKey === demoKey)) return false;
    const now = new Date().toISOString();
    const candidate = {
      id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title: demo.title,
      url: demo.sourceUrl,
      kind: demo.kind,
      sourceType: "community",
      sourceRisk: demo.sourceRisk || "yellow",
      sourceReason: "실제 공개/인덱스 가능한 소스에서 만든 DEMO 후보입니다. 원문 재사용 권리를 뜻하지 않으며 실제 게시 전 Research/Safety/권리 검토가 필요합니다.",
      collectionAllowed: false,
      note: `[DEMO ONLY]\n${demo.caption || ""}\n\nObserved evidence: ${evidenceText(demo.sourceEvidence)}\n\n※ 데모 스토리보드는 참고용이며 실제 게시 승인 데이터가 아닙니다.`,
      signals: { freshness: null, velocity: null, audience: null, originalityRoom: null, revenueFit: null },
      score: null,
      scoreBasis: "demo_requires_human_review",
      platforms: ["Threads", "Instagram Carousel", "YouTube Shorts"],
      status: "inbox",
      relatedSources: [],
      sourceMeta: {
        provider: demo.sourcePlatform,
        canonicalUrl: demo.sourceUrl,
        observedEngagement: demo.sourceEvidence || {},
      },
      themeClassification: {
        schemaVersion: 1,
        taxonomyVersion: "demo-2026-09",
        primaryTheme: demo.primaryTheme,
        secondaryThemes: demo.secondaryThemes || [],
        tags: [demo.discoveryLane, "demo"].filter(Boolean),
        confidence: 0.9,
        score: 90,
        reasons: ["demo-showcase curated classification"],
        source: "manual",
        computedAt: now,
        updatedAt: now,
      },
      demoShowcase: {
        demoOnly: true,
        productionEligible: false,
        sourceKey: demoKey,
        discoveryLane: demo.discoveryLane,
        scores: demo.scores,
        storyboard: demo.storyboard,
        caption: demo.caption,
        nextChecks: demo.nextChecks || [],
      },
      createdAt: now,
      updatedAt: now,
    };
    state.items.unshift(candidate);
    selectedId = candidate.id;
    if (persistNow) {
      persist();
      render();
      showSystemMessage("데모 후보를 Inbox에 복사했습니다. 실제 게시 전 검토 단계가 모두 필요합니다.", "success");
    }
    return true;
  }

  function evidenceText(evidence = {}) {
    const parts = [];
    if (evidence.votes != null) parts.push(`votes=${evidence.votes}`);
    if (evidence.comments != null) parts.push(`comments=${evidence.comments}`);
    if (evidence.note) parts.push(evidence.note);
    return parts.join(" · ") || "none";
  }

  function decisionTone(value) {
    if (value === "CANDIDATE" || value === "STRONG") return "green";
    if (value === "BLOCK") return "red";
    return "yellow";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
})();
