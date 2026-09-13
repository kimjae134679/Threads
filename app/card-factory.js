(() => {
  const model = window.ThreadsCardStoryModel;
  const detail = document.querySelector("#detailContent");
  const researchSection = document.querySelector("#researchStatusBadge")?.closest(".detail-section");
  if (!model || !detail || !researchSection) return;

  loadStyles();

  const localImages = [];
  let currentStoryboard = null;

  const section = document.createElement("div");
  section.className = "detail-section card-factory-section";
  section.innerHTML = `
    <div class="card-factory-head">
      <div>
        <h3>Community Card Factory</h3>
        <p>선택한 커뮤니티/바이럴 소재를 1080×1350 카드 스토리로 구성합니다. 원문 캡처 파일은 브라우저 세션에서만 사용하고 저장소나 localStorage에 넣지 않습니다.</p>
      </div>
      <span id="cardFactoryBadge" class="pill neutral">미생성</span>
    </div>
    <div class="card-factory-grid">
      <label>첫 장 훅<input id="cardHook" maxlength="110" /></label>
      <label>출처 표기<input id="cardSource" maxlength="70" placeholder="예: r/memes / 사용자 제공 캡처" /></label>
    </div>
    <label>핵심 원문/요약<textarea id="cardExcerpt" rows="5" maxlength="650" placeholder="원문에서 카드에 필요한 핵심만. 개인정보는 제거하세요."></textarea></label>
    <label>후속/반전/맥락<textarea id="cardFollowup" rows="4" maxlength="520" placeholder="후속글, 반전, 왜 화제가 됐는지"></textarea></label>
    <label>대표 반응 <small class="muted-inline">한 줄에 하나 · 최대 6개</small><textarea id="cardReactions" rows="4" placeholder="찬성 / 반대 / 웃긴 반응 등을 한 줄씩"></textarea></label>
    <label>마지막 카드<input id="cardEnding" maxlength="180" placeholder="예: 너라면 회사 밖에서 바로 뺌?" /></label>
    <div class="card-factory-assets">
      <label class="button ghost file-button">원문 캡처 추가<input id="cardImageInput" type="file" accept="image/*" multiple /></label>
      <span id="cardImageStatus">캡처 없음</span>
      <label>템플릿
        <select id="cardTemplate">
          <option value="dark">Dark Viral</option>
          <option value="paper">Paper Story</option>
          <option value="signal">Signal News</option>
        </select>
      </label>
    </div>
    <div class="card-factory-warning">원문 캡처에 실명·닉네임·얼굴·전화번호 등 개인정보가 있으면 게시 전에 반드시 가림 처리해야 합니다. 현재 MVP는 자동 OCR/PII 마스킹을 완료했다고 간주하지 않습니다.</div>
    <div class="card-factory-actions">
      <button id="cardAutofillBtn" type="button" class="button ghost">현재 자료로 자동 채우기</button>
      <button id="cardBuildBtn" type="button" class="button primary">카드 미리보기 생성</button>
      <button id="cardSaveBtn" type="button" class="button ghost">스토리보드 저장</button>
      <button id="cardDownloadAllBtn" type="button" class="button ghost" disabled>PNG 전체 저장</button>
      <button id="cardManifestBtn" type="button" class="button ghost" disabled>Manifest JSON</button>
    </div>
    <div id="cardPreviewMeta" class="card-preview-meta"></div>
    <div id="cardPreviewGrid" class="card-preview-grid"></div>
  `;
  researchSection.insertAdjacentElement("afterend", section);

  const hook = section.querySelector("#cardHook");
  const excerpt = section.querySelector("#cardExcerpt");
  const followup = section.querySelector("#cardFollowup");
  const reactions = section.querySelector("#cardReactions");
  const ending = section.querySelector("#cardEnding");
  const source = section.querySelector("#cardSource");
  const template = section.querySelector("#cardTemplate");
  const imageInput = section.querySelector("#cardImageInput");
  const imageStatus = section.querySelector("#cardImageStatus");
  const badge = section.querySelector("#cardFactoryBadge");
  const preview = section.querySelector("#cardPreviewGrid");
  const previewMeta = section.querySelector("#cardPreviewMeta");
  const downloadAll = section.querySelector("#cardDownloadAllBtn");
  const manifestButton = section.querySelector("#cardManifestBtn");

  section.querySelector("#cardAutofillBtn").addEventListener("click", autofill);
  section.querySelector("#cardBuildBtn").addEventListener("click", buildPreview);
  section.querySelector("#cardSaveBtn").addEventListener("click", saveStoryboard);
  downloadAll.addEventListener("click", downloadAllCards);
  manifestButton.addEventListener("click", downloadManifest);
  imageInput.addEventListener("change", loadLocalImages);
  preview.addEventListener("click", handlePreviewClick);

  const title = document.querySelector("#detailTitle");
  if (title) new MutationObserver(sync).observe(title, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".candidate-card, [data-open-id], #deleteBtn, #resetBtn, [data-status]")) setTimeout(sync, 0);
  });

  sync();

  function currentItem() {
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function sync() {
    const item = currentItem();
    section.hidden = !item;
    if (!item) return;

    revokeImages();
    const saved = item.cardFactory || {};
    const capture = saved.capture || model.deriveCapture(item);
    hook.value = capture.hook || "";
    excerpt.value = capture.excerpt || "";
    followup.value = capture.followup || "";
    reactions.value = Array.isArray(capture.reactions) ? capture.reactions.join("\n") : "";
    ending.value = capture.ending || "";
    source.value = capture.source || "";
    template.value = saved.template || "dark";
    currentStoryboard = saved.storyboard || null;
    imageInput.value = "";
    imageStatus.textContent = saved.captureImageNames?.length
      ? `이전 세션 캡처 ${saved.captureImageNames.length}개 기록됨 · 파일 다시 선택 필요`
      : "캡처 없음";
    renderSavedState(item);
  }

  function autofill() {
    const item = currentItem();
    if (!item) return;
    const capture = model.deriveCapture(item);
    hook.value = capture.hook;
    excerpt.value = capture.excerpt;
    followup.value = capture.followup;
    reactions.value = capture.reactions.join("\n");
    ending.value = capture.ending;
    source.value = capture.source;
    showSystemMessage("현재 Research/Inbox 자료를 기준으로 카드 입력값을 채웠습니다.", "success");
  }

  async function loadLocalImages() {
    revokeImages();
    const files = [...(imageInput.files || [])].slice(0, 10);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(file);
      localImages.push({ file, url, image: await loadImage(url) });
    }
    imageStatus.textContent = localImages.length ? `원문 캡처 ${localImages.length}개 · 세션 전용` : "캡처 없음";
  }

  function revokeImages() {
    while (localImages.length) {
      const entry = localImages.pop();
      try { URL.revokeObjectURL(entry.url); } catch (_) {}
    }
  }

  function captureFromInputs() {
    return {
      hook: hook.value.trim(),
      excerpt: excerpt.value.trim(),
      followup: followup.value.trim(),
      reactions: reactions.value,
      ending: ending.value.trim(),
      source: source.value.trim(),
    };
  }

  function buildPreview() {
    const item = currentItem();
    if (!item) return;
    if (item.viralReview?.decision === "BLOCK" || window.ThreadsViralModel?.score?.(item)?.comfort?.blocked) {
      showSystemMessage("Audience Comfort 차단 후보는 카드 제작 대상에서 제외됩니다.", "error");
      return;
    }

    currentStoryboard = model.buildStoryboard(item, captureFromInputs(), localImages.length);
    const validation = model.validateStoryboard(currentStoryboard);
    if (!validation.ok) {
      showSystemMessage(`카드 스토리보드 오류: ${validation.issues.join(", ")}`, "error");
      return;
    }
    renderStoryboards(currentStoryboard);
    badge.textContent = `${currentStoryboard.cards.length}장 미리보기`;
    badge.className = "pill green";
    downloadAll.disabled = false;
    manifestButton.disabled = false;
  }

  function renderStoryboards(storyboard) {
    preview.innerHTML = "";
    previewMeta.textContent = `${storyboard.width}×${storyboard.height} · ${storyboard.cards.length}장 · ${template.options[template.selectedIndex].text}`;
    storyboard.cards.forEach((card, index) => {
      const figure = document.createElement("figure");
      figure.className = "card-preview-item";
      const canvas = document.createElement("canvas");
      canvas.width = storyboard.width;
      canvas.height = storyboard.height;
      canvas.dataset.cardIndex = String(index);
      drawCard(canvas, card, index, storyboard.cards.length);
      const caption = document.createElement("figcaption");
      caption.innerHTML = `<span>${index + 1}/${storyboard.cards.length} · ${escapeHtml(card.type)}</span><button type="button" class="button ghost" data-download-card="${index}">PNG</button>`;
      figure.append(canvas, caption);
      preview.appendChild(figure);
    });
  }

  function drawCard(canvas, card, index, total) {
    const ctx = canvas.getContext("2d");
    const palette = paletteFor(template.value);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (template.value === "signal") {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, 28, canvas.height);
    }

    ctx.fillStyle = palette.muted;
    ctx.font = "600 32px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(card.source || "SOURCE", 78, 78);
    ctx.textAlign = "right";
    ctx.fillText(`${index + 1} / ${total}`, canvas.width - 78, 78);
    ctx.textAlign = "left";

    if (card.type === "capture-image") {
      drawCaptureImage(ctx, localImages[card.imageIndex]?.image, card, palette);
      drawFooter(ctx, palette);
      return;
    }

    if (card.type === "hook" || card.type === "ending") {
      ctx.fillStyle = palette.accent;
      roundRect(ctx, 78, 170, 150, 54, 27);
      ctx.fill();
      ctx.fillStyle = palette.accentText;
      ctx.font = "800 27px system-ui, sans-serif";
      ctx.fillText(card.type === "hook" ? "STORY" : "YOUR TAKE", 105, 207);

      ctx.fillStyle = palette.text;
      const fontSize = card.title.length > 70 ? 72 : card.title.length > 42 ? 84 : 96;
      ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
      drawWrapped(ctx, card.title, 78, 340, canvas.width - 156, fontSize * 1.24, 8);
      drawFooter(ctx, palette);
      return;
    }

    ctx.fillStyle = palette.text;
    ctx.font = "900 64px system-ui, sans-serif";
    drawWrapped(ctx, card.title || "", 78, 190, canvas.width - 156, 78, 3);

    ctx.fillStyle = palette.panel;
    roundRect(ctx, 68, 365, canvas.width - 136, 760, 34);
    ctx.fill();

    const bodyLines = String(card.body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
    let y = 435;
    const bodyFont = bodyLines.join(" ").length > 460 ? 38 : 44;
    ctx.font = `650 ${bodyFont}px system-ui, sans-serif`;
    ctx.fillStyle = palette.panelText;
    for (const [lineIndex, line] of bodyLines.entries()) {
      if (y > 1040) break;
      if (card.type === "reactions") {
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.arc(112, y - 12, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.panelText;
        y = drawWrapped(ctx, line, 145, y, canvas.width - 245, bodyFont * 1.45, 3) + 28;
      } else {
        y = drawWrapped(ctx, line, 112, y, canvas.width - 224, bodyFont * 1.5, 5) + (lineIndex < bodyLines.length - 1 ? 30 : 0);
      }
    }
    drawFooter(ctx, palette);
  }

  function drawCaptureImage(ctx, image, card, palette) {
    ctx.fillStyle = palette.text;
    ctx.font = "900 58px system-ui, sans-serif";
    ctx.fillText(card.title || "원문", 78, 185);
    const x = 70;
    const y = 250;
    const w = 940;
    const h = 920;
    ctx.fillStyle = palette.panel;
    roundRect(ctx, x, y, w, h, 28);
    ctx.fill();
    if (!image) {
      ctx.fillStyle = palette.muted;
      ctx.font = "600 40px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("원문 캡처 파일을 다시 선택하세요", canvasCenter(ctx), y + h / 2);
      ctx.textAlign = "left";
      return;
    }
    const innerX = x + 28;
    const innerY = y + 28;
    const innerW = w - 56;
    const innerH = h - 56;
    const scale = Math.min(innerW / image.naturalWidth, innerH / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, innerX + (innerW - drawW) / 2, innerY + (innerH - drawH) / 2, drawW, drawH);
  }

  function canvasCenter(ctx) {
    return ctx.canvas.width / 2;
  }

  function drawFooter(ctx, palette) {
    ctx.fillStyle = palette.muted;
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("AI Content Monetization Lab · review before publish", 78, 1280);
    ctx.textAlign = "left";
  }

  function paletteFor(name) {
    if (name === "paper") return { bg: "#f2efe8", text: "#171717", muted: "#6e6a63", panel: "#ffffff", panelText: "#202020", accent: "#171717", accentText: "#ffffff" };
    if (name === "signal") return { bg: "#f7f8fb", text: "#14171d", muted: "#616975", panel: "#ffffff", panelText: "#1d2229", accent: "#2457ff", accentText: "#ffffff" };
    return { bg: "#101114", text: "#f7f7f8", muted: "#9b9fa8", panel: "#1d2026", panelText: "#f1f2f4", accent: "#f2ff57", accentText: "#111217" };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawWrapped(ctx, text, x, startY, maxWidth, lineHeight, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !current) current = test;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = `${last}…`;
    }
    let y = startY;
    for (const line of visible) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  function saveStoryboard() {
    const item = currentItem();
    if (!item) return;
    if (!currentStoryboard) currentStoryboard = model.buildStoryboard(item, captureFromInputs(), localImages.length);
    const validation = model.validateStoryboard(currentStoryboard);
    if (!validation.ok) return showSystemMessage(`스토리보드를 저장할 수 없습니다: ${validation.issues.join(", ")}`, "error");

    const previous = item.cardFactory || {};
    const next = {
      schemaVersion: 1,
      template: template.value,
      capture: currentStoryboard.capture,
      storyboard: currentStoryboard,
      captureImageNames: localImages.map((entry) => entry.file.name),
      imagePersistence: "session-only",
      updatedAt: new Date().toISOString(),
    };
    const changed = JSON.stringify({ template: previous.template, capture: previous.capture, storyboard: previous.storyboard, captureImageNames: previous.captureImageNames })
      !== JSON.stringify({ template: next.template, capture: next.capture, storyboard: next.storyboard, captureImageNames: next.captureImageNames });
    item.cardFactory = next;
    if (changed) item.updatedAt = new Date().toISOString();
    persist();
    badge.textContent = `저장됨 · ${currentStoryboard.cards.length}장`;
    badge.className = "pill green";
    showSystemMessage(`카드 스토리보드 ${currentStoryboard.cards.length}장을 저장했습니다.${changed ? " 기존 게시 승인이 있었다면 재승인이 필요합니다." : ""}`, "success");
  }

  function renderSavedState(item) {
    preview.innerHTML = "";
    previewMeta.textContent = "";
    downloadAll.disabled = true;
    manifestButton.disabled = !currentStoryboard;
    if (!currentStoryboard) {
      badge.textContent = "미생성";
      badge.className = "pill neutral";
      return;
    }
    badge.textContent = `저장됨 · ${currentStoryboard.cards?.length || 0}장`;
    badge.className = "pill green";
    if (!currentStoryboard.cards?.some((card) => card.type === "capture-image")) {
      renderStoryboards(currentStoryboard);
      downloadAll.disabled = false;
    } else {
      previewMeta.textContent = "원문 캡처가 포함된 저장본입니다. PNG를 다시 만들려면 캡처 파일을 다시 선택하고 미리보기를 생성하세요.";
    }
  }

  function handlePreviewClick(event) {
    const button = event.target.closest?.("[data-download-card]");
    if (!button) return;
    const index = Number(button.dataset.downloadCard);
    const canvas = preview.querySelector(`canvas[data-card-index="${index}"]`);
    if (canvas) downloadCanvas(canvas, fileBase(index));
  }

  async function downloadAllCards() {
    const canvases = [...preview.querySelectorAll("canvas[data-card-index]")];
    if (!canvases.length) return;
    for (let index = 0; index < canvases.length; index += 1) {
      await downloadCanvas(canvases[index], fileBase(index));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  function fileBase(index) {
    const item = currentItem();
    const safe = String(item?.title || "card").replace(/[^0-9a-z가-힣_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "card";
    return `${safe}-${String(index + 1).padStart(2, "0")}.png`;
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    });
  }

  function downloadManifest() {
    const item = currentItem();
    if (!item || !currentStoryboard) return;
    const payload = {
      candidateId: item.id,
      title: item.title,
      sourceUrl: item.url || null,
      template: template.value,
      storyboard: currentStoryboard,
      captureImageNames: localImages.map((entry) => entry.file.name),
      notice: "Source screenshots/media require separate rights/privacy review before publication.",
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `card-manifest-${item.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./card-factory.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./card-factory.css";
    document.head.appendChild(link);
  }
})();
