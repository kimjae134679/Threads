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
        <p>레퍼런스 기준으로 실제 원문 이미지를 사용하는 1080×1080 캐러셀을 만듭니다. 1장은 첫 원문 이미지를 크게 블러 처리한 배경 + 큰 훅, 2장부터는 선택한 실제 원문 이미지를 순서대로 배치합니다. 생성 이미지는 기본 경로에서 사용하지 않습니다.</p>
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
      <label>Direct source media URLs<textarea id="cardRemoteMediaUrls" rows="3" placeholder="Public direct image HTTPS URLs, one per line"></textarea></label>
      <button id="cardRemoteMediaLoadBtn" type="button" class="button ghost">Load source media URLs</button>
      <label>템플릿
        <select id="cardTemplate">
          <option value="reference-square">Reference Square · 기본</option>
          <option value="dark">Legacy Dark</option>
          <option value="paper">Legacy Paper</option>
          <option value="signal">Legacy Signal</option>
        </select>
      </label>
    </div>
    <div class="card-factory-warning">첫 번째로 선택한 원문 이미지가 1장 블러 배경이 되고, 같은 이미지가 2장 원문으로 다시 들어갑니다. 그 뒤 선택 순서가 그대로 캐러셀 순서입니다. 자동 OCR/권리확보를 했다고 간주하지 않으며 개인정보·초상·저작권 검토를 통과해야 게시할 수 있습니다.</div>
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
  const remoteMediaUrls = section.querySelector("#cardRemoteMediaUrls");
  const remoteMediaLoadButton = section.querySelector("#cardRemoteMediaLoadBtn");
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
  remoteMediaLoadButton.addEventListener("click", loadRemoteImages);
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
    template.value = saved.template || "reference-square";
    currentStoryboard = saved.storyboard || null;
    imageInput.value = "";
    remoteMediaUrls.value = (saved.remoteMediaUrls || []).join("\n");
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
      localImages.push({
        file,
        url,
        image: await loadImage(url),
        identity: { name: file.name, size: file.size, lastModified: file.lastModified, type: file.type },
      });
    }
    imageStatus.textContent = localImages.length ? `원문 캡처 ${localImages.length}개 · 세션 전용` : "캡처 없음";
  }

  async function loadRemoteImages() {
    revokeImages();
    const urls=String(remoteMediaUrls.value||"").split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,10);
    if(!urls.length){ imageStatus.textContent="No source media URLs"; return; }
    remoteMediaLoadButton.disabled=true; imageStatus.textContent=`Loading ${urls.length} source media...`;
    try { for(let i=0;i<urls.length;i+=1){ const sourceUrl=urls[i]; const proxyUrl=`/api/source-assets/proxy?url=${encodeURIComponent(sourceUrl)}`; const image=await loadImage(proxyUrl); localImages.push({file:null,url:proxyUrl,image,identity:{name:`remote-source-${i+1}`,size:0,lastModified:0,type:"remote-url",sourceUrl,origin:"explicit-direct-media"}}); } imageStatus.textContent=`Source media ${localImages.length} loaded · rights/privacy still require review`; }
    catch(error){ revokeImages(); imageStatus.textContent="Blocked source media"; showSystemMessage(`Source media could not be loaded. ${String(error?.message||error)}`,"error"); }
    finally { remoteMediaLoadButton.disabled=false; }
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

    if (!localImages.length) {
      showSystemMessage("레퍼런스 형식은 실제 원문 이미지가 최소 1장 필요합니다. 먼저 원문 이미지/캡처를 선택하세요.", "error");
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
      if (card.type === "capture-image") {
        const entry = localImages[card.imageIndex];
        canvas.dataset.captureImageIndex = String(card.imageIndex ?? "");
        if (entry?.identity) {
          canvas.dataset.captureFileName = entry.identity.name || "";
          canvas.dataset.captureFileSize = String(entry.identity.size || 0);
          canvas.dataset.captureFileLastModified = String(entry.identity.lastModified || 0);
          canvas.dataset.captureFileType = entry.identity.type || "";
        }
      }
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

    if (card.type === "hook") {
      drawHookCard(ctx, localImages[card.backgroundImageIndex]?.image, card, index, total, palette);
      return;
    }

    if (card.type === "capture-image") {
      drawCaptureImage(ctx, localImages[card.imageIndex]?.image, card, index, total, palette);
      return;
    }

    ctx.fillStyle = palette.text;
    ctx.font = "900 64px system-ui, sans-serif";
    drawWrapped(ctx, card.title || "", 78, 180, canvas.width - 156, 78, 3);
    drawFooter(ctx, palette, card.source);
  }

  function drawHookCard(ctx, image, card, index, total, palette) {
    if (image) {
      ctx.save();
      ctx.filter = "blur(34px) brightness(0.58)";
      drawCover(ctx, image, -70, -70, ctx.canvas.width + 140, ctx.canvas.height + 140);
      ctx.restore();
    } else {
      ctx.fillStyle = "#14161a";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, "rgba(0,0,0,0.20)");
    gradient.addColorStop(0.58, "rgba(0,0,0,0.44)");
    gradient.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText(card.source || "SOURCE", 68, 68);
    ctx.textAlign = "right";
    ctx.fillText(`${index + 1} / ${total}`, ctx.canvas.width - 68, 68);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    const title = String(card.title || "");
    const fontSize = title.length > 62 ? 72 : title.length > 38 ? 82 : 94;
    ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
    drawWrapped(ctx, title, 72, 520, ctx.canvas.width - 144, fontSize * 1.17, 5);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "650 25px system-ui, sans-serif";
    ctx.fillText("실제 원문 이미지 기반 · 게시 전 검수", 72, ctx.canvas.height - 60);
  }

  function drawCaptureImage(ctx, image, card, index, total, palette) {
    if (!image) {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 36px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("원문 이미지 파일을 다시 선택하세요", canvasCenter(ctx), ctx.canvas.height / 2);
      ctx.textAlign = "left";
      return;
    }

    ctx.save();
    ctx.filter = "blur(30px) brightness(0.62)";
    drawCover(ctx, image, -60, -60, ctx.canvas.width + 120, ctx.canvas.height + 120);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.fillText(card.source || "SOURCE", 48, 52);
    ctx.textAlign = "right";
    ctx.fillText(`${index + 1} / ${total}`, ctx.canvas.width - 48, 52);
    ctx.textAlign = "left";

    const x = 44;
    const y = 78;
    const w = ctx.canvas.width - 88;
    const h = ctx.canvas.height - 132;
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 24);
    ctx.fill();
    drawContain(ctx, image, x, y, w, h);
  }

  function drawCover(ctx, image, x, y, w, h) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
  }

  function drawContain(ctx, image, x, y, w, h) {
    const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
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
    if (name === "reference-square") return { bg: "#101114", text: "#ffffff", muted: "#d8dbe2", panel: "#17191e", panelText: "#ffffff", accent: "#ffffff", accentText: "#111217" };
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

  function drawWrappedOutlined(ctx, text, x, startY, maxWidth, lineHeight, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !current) current = test;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    let y = startY;
    for (const line of visible) {
      ctx.strokeText(line, x, y);
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
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
    const privacy = window.ThreadsCardPrivacyMask?.exportEnvelope?.() || null;
    const next = {
      schemaVersion: 3,
      renderProfile: "reference-square",
      template: template.value,
      capture: currentStoryboard.capture,
      storyboard: currentStoryboard,
      captureImageNames: localImages.map((entry) => entry.file?.name || entry.identity?.name || "source-media"),
      remoteMediaUrls: localImages.map((entry) => entry.identity?.sourceUrl).filter(Boolean),
      captureImageIdentities: localImages.map((entry) => ({ ...(entry.identity || {}) })),
      privacy,
      imagePersistence: localImages.some((entry) => entry.identity?.sourceUrl) ? "bytes-session-only-urls-reference-only" : "session-only",
      updatedAt: new Date().toISOString(),
    };
    const changed = JSON.stringify({ template: previous.template, capture: previous.capture, storyboard: previous.storyboard, captureImageNames: previous.captureImageNames, captureImageIdentities: previous.captureImageIdentities, remoteMediaUrls: previous.remoteMediaUrls, privacy: previous.privacy })
      !== JSON.stringify({ template: next.template, capture: next.capture, storyboard: next.storyboard, captureImageNames: next.captureImageNames, captureImageIdentities: next.captureImageIdentities, remoteMediaUrls: next.remoteMediaUrls, privacy: next.privacy });
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
      captureImageNames: localImages.map((entry) => entry.file?.name || entry.identity?.name || "source-media"),
      remoteMediaUrls: localImages.map((entry) => entry.identity?.sourceUrl).filter(Boolean),
      captureImageIdentities: localImages.map((entry) => ({ ...(entry.identity || {}) })),
      privacy: window.ThreadsCardPrivacyMask?.exportEnvelope?.() || item.cardFactory?.privacy || null,
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
