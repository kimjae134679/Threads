(() => {
  const model = window.ThreadsFieldTestModel;
  const anchor = document.querySelector(".demo-showcase");
  if (!model || !anchor) return;

  const section = document.createElement("section");
  section.className = "demo-showcase panel field-test-showcase";
  section.innerHTML = `
    <div class="demo-showcase-head">
      <div>
        <p class="eyebrow">FIELD TEST · CURRENT PUBLIC DISCOVERY</p>
        <h2>현재 공개 신호 → 실제 카드 테스트</h2>
        <p>현재 공개 검색/인덱스에서 실제 확인한 후보와 자체 재구성 스토리보드를 연결합니다. 관측되지 않은 반응 수치는 만들지 않으며, 이 영역은 DEMO ONLY입니다.</p>
      </div>
      <div class="demo-showcase-actions"><button type="button" class="button ghost" data-field-action="refresh">새로고침</button></div>
    </div>
    <div class="demo-showcase-status" data-field-status>불러오는 중…</div>
    <div class="demo-showcase-grid" data-field-grid></div>
  `;
  anchor.insertAdjacentElement("afterend", section);

  const status = section.querySelector("[data-field-status]");
  const grid = section.querySelector("[data-field-grid]");
  let items = [];

  section.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-field-action]");
    if (!button) return;
    if (button.dataset.fieldAction === "refresh") load();
    if (button.dataset.fieldAction === "toggle") toggle(button.dataset.fieldId);
    if (button.dataset.fieldAction === "import") importOne(button.dataset.fieldId);
  });

  load();

  async function load() {
    status.textContent = "현재 필드 테스트 데이터를 불러오는 중…";
    grid.innerHTML = "";
    try {
      const indexRes = await fetch("/data/field-test-showcase-index.json", { cache: "no-store" });
      if (!indexRes.ok) throw new Error(`field_test_index_failed:${indexRes.status}`);
      const indexPayload = await indexRes.json();
      if (!indexPayload?.demoOnly || indexPayload?.productionEligible !== false || !/^\/data\/[a-zA-Z0-9._-]+\.json$/.test(indexPayload.current || "")) throw new Error("field_test_index_invalid");
      const [fieldRes, discoveryRes] = await Promise.all([
        fetch(indexPayload.current, { cache: "no-store" }),
        fetch("/data/viral-discovery-latest.json", { cache: "no-store" }),
      ]);
      if (!fieldRes.ok || !discoveryRes.ok) throw new Error(`field_test_load_failed:${fieldRes.status}/${discoveryRes.status}`);
      const [fieldPayload, discoveryPayload] = await Promise.all([fieldRes.json(), discoveryRes.json()]);
      items = model.normalize(fieldPayload, discoveryPayload);
      render();
      status.textContent = `실전 후보 ${items.length}건 · 관측 수치만 표시 · DEMO ONLY · 자동 게시 없음`;
    } catch (error) {
      status.textContent = `필드 테스트를 불러오지 못했습니다: ${String(error?.message || error)}`;
    }
  }

  function render() {
    grid.innerHTML = items.map(renderCard).join("");
  }

  function renderCard(item) {
    const cards = item.storyboard?.cards || [];
    const sourceLink = item.sourceUrl
      ? `<a class="button ghost" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">검증 출처 열기</a>`
      : `<span class="pill yellow">원문/캡처 추가 확인 필요</span>`;
    return `
      <article class="demo-showcase-card" data-field-card="${escapeAttr(item.id)}">
        <div class="demo-card-top"><div class="demo-chip-row">
          <span class="pill neutral">${escapeHtml(item.discoveryLane)}</span>
          <span class="pill neutral">${escapeHtml(item.primaryTheme)}</span>
          <span class="pill ${item.status === "candidate" ? "green" : "yellow"}">${escapeHtml(item.status)}</span>
          <span class="pill ${item.sourceRisk === "red" ? "red" : "yellow"}">${escapeHtml(String(item.sourceRisk).toUpperCase())}</span>
        </div><span class="demo-score">${escapeHtml(model.evidenceText(item.sourceEvidence))}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="demo-source"><b>${escapeHtml(item.sourcePlatform)}</b><span>관측값만 사용</span></div>
        <p class="demo-reason">${escapeHtml(item.whySelected)}</p>
        <div class="demo-caption"><b>자체 재구성 캡션</b><span>${escapeHtml(item.caption)}</span></div>
        <div class="demo-card-actions">${sourceLink}
          <button type="button" class="button ghost" data-field-action="toggle" data-field-id="${escapeAttr(item.id)}">스토리보드 ${cards.length}장</button>
          <button type="button" class="button primary" data-field-action="import" data-field-id="${escapeAttr(item.id)}">Inbox로 복사</button>
        </div>
        <div class="demo-storyboard" data-field-story="${escapeAttr(item.id)}" hidden>${renderStoryboard(cards)}</div>
        <div class="demo-next-checks"><b>확인된/재확인할 사실</b>${item.factChecks.map((value) => `<span>• ${escapeHtml(value)}</span>`).join("")}</div>
      </article>`;
  }

  function renderStoryboard(cards) {
    return cards.map((card, index) => `<div class="demo-story-card"><small>${index + 1}/${cards.length} · ${escapeHtml(card.type || "card")}</small><strong>${escapeHtml(card.title || "")}</strong>${card.body ? `<p>${escapeHtml(card.body)}</p>` : ""}<em>${escapeHtml(card.source || "")}</em></div>`).join("");
  }

  function toggle(id) {
    const target = section.querySelector(`[data-field-story="${cssEscape(id)}"]`);
    if (target) target.hidden = !target.hidden;
  }

  function importOne(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const sourceKey = `field-test:${item.sourceKey}`;
    if ((state.items || []).some((candidate) => candidate.fieldTest?.sourceKey === sourceKey)) {
      showSystemMessage("이미 같은 필드 테스트 후보가 Inbox에 있습니다.", "info");
      return;
    }
    const now = new Date().toISOString();
    const evidence = item.sourceEvidence || {};
    state.items.unshift({
      id: `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      url: item.sourceUrl,
      kind: item.kind,
      sourceType: "public-indexed-field-test",
      sourceRisk: item.sourceRisk,
      sourceReason: "현재 공개 검색/인덱스에서 확인한 필드 테스트 후보입니다. 관측 반응 수치는 참고 신호이며 실제 게시 전 Research/Safety/권리/승인이 필요합니다.",
      collectionAllowed: false,
      note: `[FIELD TEST · DEMO ONLY]\n${item.whySelected}\n\nObserved: ${model.evidenceText(evidence)}\n\n${item.caption}`,
      signals: { freshness: null, velocity: null, audience: null, originalityRoom: null, revenueFit: null },
      score: null,
      scoreBasis: "field_test_requires_human_review",
      platforms: ["Threads", "Instagram Carousel", "YouTube Shorts"],
      status: "inbox",
      relatedSources: [],
      sourceMeta: {
        provider: item.sourcePlatform,
        canonicalUrl: item.sourceUrl,
        viewCount: evidence.views,
        commentCount: evidence.comments,
        likeCount: evidence.votes,
        rank: evidence.rank,
        observedEngagementOnly: true,
      },
      fieldTest: { demoOnly: true, productionEligible: false, sourceKey, storyboard: item.storyboard, factChecks: item.factChecks },
      createdAt: now,
      updatedAt: now,
    });
    selectedId = state.items[0].id;
    persist();
    render();
    showSystemMessage("필드 테스트 후보를 Inbox에 복사했습니다. 자동 게시되지 않으며 전체 검토 체인을 다시 거칩니다.", "success");
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
  function cssEscape(value) { return window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
})();
