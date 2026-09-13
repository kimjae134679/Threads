(() => {
  const detail = document.querySelector("#detailContent");
  const researchWorkspace = document.querySelector(".research-workspace");
  const connectorBox = document.querySelector(".connector-box");
  if (!detail || !researchWorkspace) return;

  loadAiStyles();
  const ui = buildAiUi();
  researchWorkspace.appendChild(ui.toolbar);
  researchWorkspace.insertAdjacentElement("afterend", ui.draftSection);
  addConnectorRow();

  let connector = { configured: false, model: "" };
  let busy = false;

  ui.researchButton.addEventListener("click", runAiResearch);
  ui.draftButton.addEventListener("click", runAiDrafts);
  ui.saveDrafts.addEventListener("click", saveDraftEdits);
  ui.clearDrafts.addEventListener("click", clearDrafts);
  ui.copyAll.addEventListener("click", copyAllDrafts);
  ui.reviewStatus.addEventListener("change", saveDraftReviewStatus);

  const observer = new MutationObserver(() => renderAiStudio());
  observer.observe(document.querySelector("#detailTitle"), { childList: true, subtree: true });
  document.querySelector("#candidateList")?.addEventListener("click", () => queueMicrotask(renderAiStudio));

  refreshConnector().finally(renderAiStudio);

  async function refreshConnector() {
    try {
      const response = await fetch("/api/connectors", { cache: "no-store" });
      const payload = await response.json();
      connector = payload?.connectors?.openai || { configured: false, model: "" };
    } catch (_) {
      connector = { configured: false, model: "" };
    }
    renderConnector();
  }

  function renderConnector() {
    const status = document.querySelector("#openAiConnectorStatus");
    if (!status) return;
    if (connector.configured) {
      status.textContent = `연결됨 · ${connector.model || "model"}`;
      status.className = "ai-connector-ok";
    } else {
      status.textContent = "OPENAI_API_KEY 필요";
      status.className = "ai-connector-off";
    }
  }

  function renderAiStudio() {
    const item = selectedItem();
    const reviewed = item?.researchBundle?.reviewStatus === "reviewed";
    const hasDraft = Boolean(item?.draftStudio?.generated);

    ui.researchButton.disabled = busy || !item || !connector.configured;
    ui.draftButton.disabled = busy || !item || !connector.configured || !reviewed;
    ui.saveDrafts.disabled = !item || !hasDraft;
    ui.clearDrafts.disabled = !item || !hasDraft;
    ui.copyAll.disabled = !item || !hasDraft;
    ui.reviewStatus.disabled = !item || !hasDraft;

    ui.connectorText.textContent = connector.configured
      ? `OpenAI ${connector.model || ""} · 웹 검색 조사 가능`
      : "OPENAI_API_KEY가 없어 수동 Research Bundle만 사용 중";

    if (!item) {
      ui.draftSection.hidden = true;
      return;
    }

    ui.draftSection.hidden = false;
    ui.reviewStatus.value = item.draftStudio?.reviewStatus || "draft";
    renderDraftCards(item);
    renderDraftMeta(item);
  }

  async function runAiResearch() {
    const item = selectedItem();
    if (!item || busy || !connector.configured) return;

    if (item.sourceRisk === "red") {
      const ok = confirm("이 후보는 RED 소스입니다. 원문을 재사용하지 않고 독립된 공개 출처만 조사하는 방식으로 진행합니다. 계속할까요?");
      if (!ok) return;
    }

    setBusy(true, "AI가 최신 자료를 조사 중입니다…");
    try {
      const candidate = cloneCandidateForAi(item, true);
      const response = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.error || "AI 조사에 실패했습니다.");

      const result = payload.result || {};
      item.researchBundle = aiResearchToBundle(result);
      item.aiResearch = {
        summary: result.summary || "",
        recommendedStatus: result.recommendedStatus || "research",
        webSources: result.webSources || [],
        aiMeta: result.aiMeta || null,
        generatedAt: result.generatedAt || new Date().toISOString(),
      };
      item.updatedAt = new Date().toISOString();
      persist();
      renderResearchBundle();
      render();
      showSystemMessage("AI 조사 결과를 Research Bundle에 채웠습니다. 아직 '조사 중' 상태이며 사람이 확인한 뒤 검토 완료로 바꿔야 합니다.", "success");
    } catch (error) {
      showSystemMessage(`AI 조사 실패: ${error.message}`, "error");
    } finally {
      setBusy(false);
      renderAiStudio();
    }
  }

  async function runAiDrafts() {
    const item = selectedItem();
    if (!item || busy || !connector.configured) return;
    if (item.researchBundle?.reviewStatus !== "reviewed") {
      showSystemMessage("Draft Studio는 사람 검토 완료된 Research Bundle에서만 실행됩니다.", "error");
      return;
    }

    if (item.draftStudio?.generated) {
      const ok = confirm("기존 AI 초안을 새로 생성하면 생성본이 교체됩니다. 수동 편집본은 별도 manualEdits에 남지만, 계속할까요?");
      if (!ok) return;
    }

    setBusy(true, "플랫폼별 초안을 만드는 중입니다…");
    try {
      const response = await fetch("/api/ai/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate: cloneCandidateForAi(item, false) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.error || "Draft Studio 생성에 실패했습니다.");

      const result = payload.result || {};
      item.draftStudio = {
        schemaVersion: 1,
        reviewStatus: "draft",
        generated: normalizeDraftResult(result),
        manualEdits: {},
        aiMeta: result.aiMeta || null,
        generatedAt: result.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      item.updatedAt = new Date().toISOString();
      persist();
      renderAiStudio();
      showSystemMessage("플랫폼별 초안을 생성했습니다. 자동 게시되지 않으며 Draft Studio에서 수정·검토하세요.", "success");
    } catch (error) {
      showSystemMessage(`초안 생성 실패: ${error.message}`, "error");
    } finally {
      setBusy(false);
      renderAiStudio();
    }
  }

  function saveDraftEdits() {
    const item = selectedItem();
    if (!item?.draftStudio?.generated) return;
    item.draftStudio.manualEdits = {};
    ui.draftSection.querySelectorAll("textarea[data-platform]").forEach((textarea) => {
      item.draftStudio.manualEdits[textarea.dataset.platform] = textarea.value;
    });
    item.draftStudio.updatedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    persist();
    showSystemMessage("Draft Studio 편집본을 저장했습니다.", "success");
  }

  function clearDrafts() {
    const item = selectedItem();
    if (!item?.draftStudio) return;
    if (!confirm("이 후보의 Draft Studio 초안과 편집본을 삭제할까요?")) return;
    delete item.draftStudio;
    item.updatedAt = new Date().toISOString();
    persist();
    renderAiStudio();
  }

  async function copyAllDrafts() {
    const item = selectedItem();
    if (!item?.draftStudio?.generated) return;
    const text = draftExportText(item);
    try {
      await navigator.clipboard.writeText(text);
      showSystemMessage("전체 초안을 클립보드에 복사했습니다.", "success");
    } catch (_) {
      fallbackCopy(text);
    }
  }

  function saveDraftReviewStatus() {
    const item = selectedItem();
    if (!item?.draftStudio?.generated) return;
    item.draftStudio.reviewStatus = ui.reviewStatus.value;
    item.draftStudio.updatedAt = new Date().toISOString();
    persist();
    renderDraftMeta(item);
  }

  function renderDraftCards(item) {
    const generated = item?.draftStudio?.generated;
    ui.cards.innerHTML = "";
    ui.warnings.innerHTML = "";
    if (!generated) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact";
      empty.innerHTML = "<strong>아직 초안이 없습니다.</strong><span>Research Bundle을 사람 검토 완료로 저장한 뒤 AI 초안 생성을 실행하세요.</span>";
      ui.cards.appendChild(empty);
      return;
    }

    const platforms = [
      ["threads", "Threads", formatThreads(generated.threads)],
      ["shortVideo", "Shorts / Reels / TikTok", formatShortVideo(generated.shortVideo)],
      ["instagramCarousel", "Instagram Carousel", formatCarousel(generated.instagramCarousel)],
      ["blog", "Blog", formatBlog(generated.blog)],
      ["youtubeLong", "YouTube Long", formatYouTubeLong(generated.youtubeLong)],
    ];

    for (const [key, label, generatedText] of platforms) {
      const card = document.createElement("article");
      card.className = "draft-card";
      card.dataset.platform = key;
      const textarea = document.createElement("textarea");
      textarea.dataset.platform = key;
      textarea.value = item.draftStudio.manualEdits?.[key] ?? generatedText;
      const header = document.createElement("div");
      header.className = "draft-card-head";
      const strong = document.createElement("strong");
      strong.textContent = label;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "button ghost";
      copy.textContent = "복사";
      copy.addEventListener("click", () => copyText(textarea.value));
      header.append(strong, copy);
      card.append(header, textarea);
      ui.cards.appendChild(card);
    }

    const warnings = [
      ...(generated.factWarnings || []).map((x) => `사실: ${x}`),
      ...(generated.rightsWarnings || []).map((x) => `권리: ${x}`),
      ...(generated.prohibitedReuse || []).map((x) => `재사용 금지: ${x}`),
    ];
    if (warnings.length) {
      const box = document.createElement("div");
      box.className = "draft-warning-box";
      const title = document.createElement("strong");
      title.textContent = "게시 전 확인";
      const list = document.createElement("ul");
      warnings.forEach((warning) => {
        const li = document.createElement("li");
        li.textContent = warning;
        list.appendChild(li);
      });
      box.append(title, list);
      ui.warnings.appendChild(box);
    }
  }

  function renderDraftMeta(item) {
    const studio = item?.draftStudio;
    if (!studio?.generated) {
      ui.meta.textContent = "사람 검토 완료 Research Bundle에서 생성합니다.";
      ui.badge.textContent = "미생성";
      ui.badge.className = "pill neutral";
      return;
    }
    const model = studio.aiMeta?.model || "AI";
    const total = studio.aiMeta?.totalTokens;
    ui.meta.textContent = `${model} · ${formatDate(studio.generatedAt)}${Number.isFinite(total) ? ` · ${total.toLocaleString()} tokens` : ""}`;
    const labels = { draft: "초안", reviewing: "검토 중", approved: "사람 승인" };
    ui.badge.textContent = labels[studio.reviewStatus] || "초안";
    ui.badge.className = `pill ${studio.reviewStatus === "approved" ? "green" : "neutral"}`;
  }

  function setBusy(next, message = "") {
    busy = next;
    ui.toolbar.classList.toggle("ai-busy", next);
    ui.draftSection.classList.toggle("ai-busy", next);
    if (message) showSystemMessage(message, "info");
  }

  function selectedItem() {
    return state.items.find((candidate) => candidate.id === selectedId) || null;
  }

  function cloneCandidateForAi(item, includeUnsavedResearch) {
    const clone = JSON.parse(JSON.stringify(item));
    if (includeUnsavedResearch && typeof collectUnsavedBundle === "function") {
      clone.researchBundle = collectUnsavedBundle();
    }
    // RED source는 원문 접근을 유도하지 않도록 AI 조사 입력에서 URL을 분리한다.
    if (clone.sourceRisk === "red") {
      clone.blockedSourceUrl = clone.url;
      clone.url = "";
      clone.note = `${clone.note || ""}\n[정책] RED 소스 원문을 열거나 크롤링하지 말고, 제목의 주제를 독립 공개 출처로만 조사할 것.`.trim();
    }
    return clone;
  }

  function aiResearchToBundle(result) {
    const facts = (result.verifiedFacts || []).map((fact) => {
      const suffix = fact.confidence ? ` [AI confidence: ${fact.confidence}]` : "";
      return `${fact.fact || ""}${suffix}`.trim();
    }).filter(Boolean);
    const angles = (result.angles || []).map((angle) => {
      const platforms = (angle.bestPlatforms || []).join(", ");
      return `${angle.name || "각도"}: ${angle.hook || ""}${platforms ? ` (${platforms})` : ""}`.trim();
    }).filter(Boolean);
    const riskLines = [
      ...(result.rightsRisks || []).map((x) => `권리: ${x}`),
      ...(result.privacyRisks || []).map((x) => `개인정보: ${x}`),
      ...(result.defamationRisks || []).map((x) => `명예훼손: ${x}`),
      ...(result.safetyNotes || []).map((x) => `기타: ${x}`),
    ];

    const sourceMap = new Map();
    for (const url of [...(result.sourceUrls || []), ...(result.webSources || [])]) {
      const clean = String(url || "").trim();
      if (clean && !sourceMap.has(clean)) sourceMap.set(clean, { url: clean, note: "AI 웹 조사 후보 · 사람 확인 필요" });
    }

    return {
      schemaVersion: 2,
      reviewStatus: "researching",
      whyNow: result.whyNow || "",
      verifiedFacts: facts,
      claimsToVerify: result.claimsToVerify || [],
      angles,
      riskNotes: riskLines.join("\n"),
      sources: [...sourceMap.values()],
      aiSummary: result.summary || "",
      aiRecommendedStatus: result.recommendedStatus || "research",
      aiGeneratedAt: result.generatedAt || new Date().toISOString(),
      aiMeta: result.aiMeta || null,
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeDraftResult(result) {
    return {
      threads: result.threads || { hook: "", body: "", cta: "" },
      shortVideo: result.shortVideo || { hook: "", script: "", onScreenText: [], brollIdeas: [] },
      instagramCarousel: result.instagramCarousel || { cover: "", slides: [], caption: "" },
      blog: result.blog || { title: "", dek: "", outline: [], seoQuestions: [] },
      youtubeLong: result.youtubeLong || { title: "", thumbnailText: "", opening: "", outline: [] },
      factWarnings: result.factWarnings || [],
      rightsWarnings: result.rightsWarnings || [],
      prohibitedReuse: result.prohibitedReuse || [],
    };
  }

  function buildAiUi() {
    const toolbar = document.createElement("div");
    toolbar.className = "ai-toolbar";
    toolbar.innerHTML = `
      <div class="ai-toolbar-row">
        <button id="aiResearchBtn" type="button" class="button primary">AI로 최신 조사</button>
        <span id="aiConnectorText" class="ai-meta"></span>
      </div>
      <div class="ai-help">AI 조사 결과는 자동으로 '사람 검토 완료'가 되지 않습니다. 출처를 직접 열어 확인한 뒤 Research Bundle의 검토 상태를 바꾸세요.</div>
    `;

    const draftSection = document.createElement("section");
    draftSection.className = "detail-section draft-studio";
    draftSection.innerHTML = `
      <div class="draft-studio-heading">
        <div>
          <h3>Draft Studio</h3>
          <div id="draftMeta" class="ai-meta">사람 검토 완료 Research Bundle에서 생성합니다.</div>
        </div>
        <span id="draftBadge" class="pill neutral">미생성</span>
      </div>
      <div class="draft-actions">
        <button id="aiDraftBtn" type="button" class="button primary">플랫폼별 AI 초안 생성</button>
        <label>검토 상태
          <select id="draftReviewStatus">
            <option value="draft">초안</option>
            <option value="reviewing">검토 중</option>
            <option value="approved">사람 승인</option>
          </select>
        </label>
        <button id="saveDraftsBtn" type="button" class="button ghost">편집 저장</button>
        <button id="copyAllDraftsBtn" type="button" class="button ghost">전체 복사</button>
        <button id="clearDraftsBtn" type="button" class="button danger ghost">초안 삭제</button>
      </div>
      <div class="draft-warning">사람 승인은 게시 허가 상태일 뿐 자동 게시를 실행하지 않습니다. 사실·권리·플랫폼 정책을 마지막으로 확인하세요.</div>
      <div id="draftCards" class="draft-grid"></div>
      <div id="draftWarnings"></div>
    `;

    return {
      toolbar,
      draftSection,
      researchButton: toolbar.querySelector("#aiResearchBtn"),
      connectorText: toolbar.querySelector("#aiConnectorText"),
      draftButton: draftSection.querySelector("#aiDraftBtn"),
      reviewStatus: draftSection.querySelector("#draftReviewStatus"),
      saveDrafts: draftSection.querySelector("#saveDraftsBtn"),
      copyAll: draftSection.querySelector("#copyAllDraftsBtn"),
      clearDrafts: draftSection.querySelector("#clearDraftsBtn"),
      cards: draftSection.querySelector("#draftCards"),
      warnings: draftSection.querySelector("#draftWarnings"),
      meta: draftSection.querySelector("#draftMeta"),
      badge: draftSection.querySelector("#draftBadge"),
    };
  }

  function addConnectorRow() {
    if (!connectorBox || document.querySelector("#openAiConnectorStatus")) return;
    const row = document.createElement("p");
    row.innerHTML = "<b>OpenAI AI 조사/초안</b><span id=\"openAiConnectorStatus\">확인 중</span>";
    const threadsRow = [...connectorBox.querySelectorAll("p")].find((p) => p.textContent.includes("Threads API"));
    if (threadsRow) connectorBox.insertBefore(row, threadsRow);
    else connectorBox.appendChild(row);
  }

  function loadAiStyles() {
    if (document.querySelector('link[href="./ai-studio.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./ai-studio.css";
    document.head.appendChild(link);
  }

  function formatThreads(value = {}) {
    return [value.hook, value.body, value.cta].filter(Boolean).join("\n\n");
  }

  function formatShortVideo(value = {}) {
    return [
      value.hook ? `[HOOK]\n${value.hook}` : "",
      value.script ? `[SCRIPT]\n${value.script}` : "",
      value.onScreenText?.length ? `[ON SCREEN]\n- ${value.onScreenText.join("\n- ")}` : "",
      value.brollIdeas?.length ? `[B-ROLL]\n- ${value.brollIdeas.join("\n- ")}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function formatCarousel(value = {}) {
    return [
      value.cover ? `[COVER]\n${value.cover}` : "",
      value.slides?.length ? `[SLIDES]\n${value.slides.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
      value.caption ? `[CAPTION]\n${value.caption}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function formatBlog(value = {}) {
    return [
      value.title ? `# ${value.title}` : "",
      value.dek || "",
      value.outline?.length ? `\n[OUTLINE]\n- ${value.outline.join("\n- ")}` : "",
      value.seoQuestions?.length ? `\n[SEO QUESTIONS]\n- ${value.seoQuestions.join("\n- ")}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function formatYouTubeLong(value = {}) {
    return [
      value.title ? `[TITLE]\n${value.title}` : "",
      value.thumbnailText ? `[THUMBNAIL]\n${value.thumbnailText}` : "",
      value.opening ? `[OPENING]\n${value.opening}` : "",
      value.outline?.length ? `[OUTLINE]\n- ${value.outline.join("\n- ")}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function draftExportText(item) {
    const generated = item.draftStudio.generated;
    const edits = item.draftStudio.manualEdits || {};
    const sections = [
      ["Threads", edits.threads ?? formatThreads(generated.threads)],
      ["Shorts / Reels / TikTok", edits.shortVideo ?? formatShortVideo(generated.shortVideo)],
      ["Instagram Carousel", edits.instagramCarousel ?? formatCarousel(generated.instagramCarousel)],
      ["Blog", edits.blog ?? formatBlog(generated.blog)],
      ["YouTube Long", edits.youtubeLong ?? formatYouTubeLong(generated.youtubeLong)],
    ];
    return sections.map(([title, text]) => `===== ${title} =====\n${text}`).join("\n\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showSystemMessage("초안을 복사했습니다.", "success");
    } catch (_) {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
    showSystemMessage("클립보드에 복사했습니다.", "success");
  }
})();
