(() => {
  const DATA_URL = "/data/demo-showcase-2026-09-15.json";
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
        <button type="button" class="button primary" data-demo-action="import-all">전체 Inbox에 복사</button>
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
    if (action === "download-preview") downloadPreview(button.dataset.demoId);
    if (action === "download-png") downloadPngCards(button.dataset.demoId);
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
        <button type="button" class="button ghost" data-demo-action="download-preview" data-demo-id="${escapeAttr(item.id)}">데모 SVG 받기</button>
        <button type="button" class="button ghost" data-demo-action="download-png" data-demo-id="${escapeAttr(item.id)}">카드별 PNG 받기</button>
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

  function downloadPreview(id) {
    const item = payload?.items?.find((candidate) => candidate.id === id);
    if (!item) return;
    const cards = Array.isArray(item.storyboard?.cards) ? item.storyboard.cards : [];
    const width = 1080, height = Math.max(1080, cards.length * 1080);
    const panels = cards.map((card, index) => renderPreviewPanel(card, index, cards.length)).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${panels}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `DEMO_ONLY-${safeFileName(item.id)}-storyboard.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showSystemMessage("DEMO ONLY 스토리보드 SVG를 만들었습니다. 실제 게시 자산이 아닙니다.", "info");
  }

  async function downloadPngCards(id) {
    const item = payload?.items?.find((candidate) => candidate.id === id); if (!item) return;
    const cards = Array.isArray(item.storyboard?.cards) ? item.storyboard.cards : []; if (!cards.length) return;
    for (let index = 0; index < cards.length; index += 1) {
      const canvas = renderPngCard(cards[index], index, cards.length);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png")); if (!blob) throw new Error("demo_png_export_failed");
      const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url;
      link.download = `DEMO_ONLY-${safeFileName(item.id)}-card-${String(index + 1).padStart(2, "0")}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); await new Promise((resolve) => setTimeout(resolve, 80));
    }
    showSystemMessage(`DEMO ONLY 카드 PNG ${cards.length}장을 만들었습니다. 실제 게시 자산이 아닙니다.`, "info");
  }

  function renderPngCard(card, index, total) {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#111318"; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = "#9ca3af"; ctx.font = "28px sans-serif"; ctx.fillText(`DEMO ONLY · ${index + 1}/${total}`, 72, 110);
    drawWrapped(ctx, String(card.title || ""), 72, 210, 936, 78, "800 68px sans-serif", "#ffffff", 5);
    drawWrapped(ctx, String(card.body || ""), 72, 620, 936, 49, "34px sans-serif", "#d1d5db", 6);
    ctx.fillStyle = "#9ca3af"; ctx.font = "25px sans-serif"; ctx.fillText(String(card.source || "DEMO ONLY").slice(0, 70), 72, 990); return canvas;
  }

  function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, font, fillStyle, maxLines) {
    ctx.font = font; ctx.fillStyle = fillStyle; const chars = [...text]; let line = "", row = 0;
    for (const char of chars) { const next = line + char; if (ctx.measureText(next).width > maxWidth && line) { ctx.fillText(line, x, y + row * lineHeight); row += 1; line = char; if (row >= maxLines) return; } else line = next; }
    if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
  }

  function renderPreviewPanel(card, index, total) {
    const y = index * 1080, title = escapeXml(card.title || ""), body = escapeXml(card.body || ""), source = escapeXml(card.source || "DEMO ONLY");
    return `<g transform="translate(0 ${y})"><rect width="1080" height="1080" fill="#111318"/><text x="72" y="110" fill="#9ca3af" font-size="28" font-family="sans-serif">DEMO ONLY · ${index + 1}/${total}</text><foreignObject x="72" y="190" width="936" height="650"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;color:white;font-size:68px;font-weight:800;white-space:pre-wrap;line-height:1.16">${title}<div style="font-size:34px;font-weight:400;line-height:1.45;margin-top:44px;color:#d1d5db">${body}</div></div></foreignObject><text x="72" y="990" fill="#9ca3af" font-size="25" font-family="sans-serif">${source}</text></g>`;
  }
  function safeFileName(value) { return String(value || "demo").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80); }
  function escapeXml(value) { return String(value ?? "").replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]); }

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
      sourceMeta: { provider: demo.sourcePlatform, canonicalUrl: demo.sourceUrl, observedEngagement: demo.sourceEvidence || {} },
      themeClassification: { schemaVersion: 1, taxonomyVersion: "demo-2026-09", primaryTheme: demo.primaryTheme, secondaryThemes: demo.secondaryThemes || [], tags: [demo.discoveryLane, "demo"].filter(Boolean), confidence: 0.9, score: 90, reasons: ["demo-showcase curated classification"], source: "manual", computedAt: now, updatedAt: now },
      demoShowcase: { demoOnly: true, productionEligible: false, sourceKey: demoKey, discoveryLane: demo.discoveryLane, scores: demo.scores, storyboard: demo.storyboard, caption: demo.caption, nextChecks: demo.nextChecks || [] },
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

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
  function cssEscape(value) { if (window.CSS?.escape) return window.CSS.escape(String(value)); return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
})();
