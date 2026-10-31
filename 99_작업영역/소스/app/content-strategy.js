(() => {
  const detail = document.querySelector("#detailContent");
  const assignmentSection = document.querySelector(".experiment-assignment-section");
  if (!detail || !assignmentSection) return;

  loadStyles();
  loadCompanion("./publication-strategy-snapshot.js");
  document.addEventListener("click", blockUnknownRightsPublish, true);

  const formats = [
    ["", "미지정"],
    ["F01", "F01 · Text Hot Take"],
    ["F02", "F02 · Text Explainer"],
    ["F03", "F03 · List / Checklist"],
    ["F04", "F04 · Question / Open Thread"],
    ["F05", "F05 · Original Screenshot Commentary"],
    ["F06", "F06 · Screenshot Evidence + Analysis"],
    ["F07", "F07 · Original Image Card"],
    ["F08", "F08 · Carousel"],
    ["F09", "F09 · Meme / Relatable"],
    ["F10", "F10 · Chart / Comparison Card"],
    ["F11", "F11 · Short Vertical Video"],
    ["F12", "F12 · Screen Recording Demo"],
    ["F13", "F13 · Voiceover Explainer"],
    ["F14", "F14 · Long Text Attachment"],
    ["F15", "F15 · Reply / Quote Response"],
    ["F16", "F16 · Poll / Binary Choice"],
    ["F17", "F17 · Personal / Failure Story"],
    ["F18", "F18 · Case Study"],
    ["F19", "F19 · Before / After"],
    ["F20", "F20 · Repurposed Own Content"],
  ];

  const hooks = [
    ["", "미지정"],
    ["H01", "H01 · Breaking"],
    ["H02", "H02 · Why / 왜 뜨는지"],
    ["H03", "H03 · Number / 숫자"],
    ["H04", "H04 · Contrarian / 반전"],
    ["H05", "H05 · Problem / 문제 제시"],
    ["H06", "H06 · Result-first / 결과 먼저"],
    ["H07", "H07 · Story / 장면"],
    ["H08", "H08 · Comparison / 비교"],
    ["H09", "H09 · Curiosity / 의외점"],
    ["H10", "H10 · Question / 질문"],
  ];

  const ctas = [
    ["C00", "C00 · 없음"],
    ["C01", "C01 · 답글 질문"],
    ["C02", "C02 · 저장/기억"],
    ["C03", "C03 · 공유"],
    ["C04", "C04 · 팔로우/프로필"],
    ["C05", "C05 · 링크 클릭"],
    ["C06", "C06 · 제품/도구 사용"],
    ["C07", "C07 · 블로그/뉴스레터"],
    ["C08", "C08 · 다음 글/시리즈"],
  ];

  const assets = [
    ["", "미지정"],
    ["A01", "A01 · Original text"],
    ["A02", "A02 · Original photo"],
    ["A03", "A03 · Original video"],
    ["A04", "A04 · Original screenshot"],
    ["A05", "A05 · Original chart/card"],
    ["A06", "A06 · Official excerpt/screenshot"],
    ["A07", "A07 · Licensed asset"],
    ["A08", "A08 · Public domain/permissive"],
    ["A09", "A09 · External material for commentary"],
    ["A10", "A10 · Unknown rights (게시 차단)"],
  ];

  const replies = [
    ["R0", "R0 · 최소 reply 운영"],
    ["R1", "R1 · 내 게시물 댓글 적극 reply"],
    ["R2", "R2 · R1 + niche 외부 대화 참여"],
  ];

  const section = document.createElement("div");
  section.className = "detail-section content-strategy-section";
  section.innerHTML = `
    <div class="content-strategy-head">
      <div>
        <h3>제작 포맷 / 훅 실험</h3>
        <p>벤치마크에서 추출한 형식을 실제 실험 변수로 기록합니다. 게시 성공 시 publication에 고정됩니다.</p>
      </div>
      <span id="contentStrategyBadge" class="pill neutral">미지정</span>
    </div>
    <div class="content-strategy-grid">
      <label>콘텐츠 포맷<select id="contentFormat"></select></label>
      <label>훅 유형<select id="hookType"></select></label>
      <label>CTA<select id="ctaType"></select></label>
      <label>자산 출처<select id="sourceAssetType"></select></label>
      <label>Reply 운영<select id="replyMode"></select></label>
      <label class="content-check"><input id="hasTopicTag" type="checkbox" /> Topic tag 사용 예정</label>
    </div>
    <label>포맷/변형 메모
      <textarea id="contentStrategyNote" rows="3" maxlength="500" placeholder="예: 공식 가격표 일부 screenshot + 자체 비교 card, 첫 문장은 H08 비교형"></textarea>
    </label>
    <div id="contentStrategyWarning" class="content-strategy-warning" hidden></div>
    <button id="saveContentStrategyBtn" type="button" class="button ghost full">제작 실험값 저장</button>
  `;
  assignmentSection.insertAdjacentElement("afterend", section);

  const format = section.querySelector("#contentFormat");
  const hook = section.querySelector("#hookType");
  const cta = section.querySelector("#ctaType");
  const asset = section.querySelector("#sourceAssetType");
  const reply = section.querySelector("#replyMode");
  const topic = section.querySelector("#hasTopicTag");
  const note = section.querySelector("#contentStrategyNote");
  const badge = section.querySelector("#contentStrategyBadge");
  const warning = section.querySelector("#contentStrategyWarning");
  const save = section.querySelector("#saveContentStrategyBtn");

  fill(format, formats);
  fill(hook, hooks);
  fill(cta, ctas);
  fill(asset, assets);
  fill(reply, replies);

  asset.addEventListener("change", renderWarning);
  save.addEventListener("click", saveStrategy);

  const title = document.querySelector("#detailTitle");
  if (title) new MutationObserver(sync).observe(title, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".candidate-card, #deleteBtn, #resetBtn, [data-status]")) setTimeout(sync, 0);
  });

  sync();

  function fill(select, values) {
    for (const [value, label] of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
  }

  function currentItem() {
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function sync() {
    const item = currentItem();
    section.hidden = !item;
    if (!item) return;
    const strategy = item.contentStrategy || {};
    format.value = strategy.contentFormat || "";
    hook.value = strategy.hookType || "";
    cta.value = strategy.ctaType || "C00";
    asset.value = strategy.sourceAssetType || "";
    reply.value = strategy.replyMode || "R0";
    topic.checked = Boolean(strategy.hasTopicTag);
    note.value = strategy.note || "";
    const parts = [strategy.contentFormat, strategy.hookType].filter(Boolean);
    badge.textContent = parts.length ? parts.join(" / ") : "미지정";
    badge.className = `pill ${parts.length ? "green" : "neutral"}`;
    renderWarning();
  }

  function renderWarning() {
    if (asset.value === "A10") {
      warning.hidden = false;
      warning.textContent = "권리 미확인 자산(A10)은 실제 게시를 차단합니다. 권리를 확인한 뒤 A06/A07/A08/A09 등 올바른 분류로 바꾸고 Safety Gate를 다시 검토하세요.";
    } else if (["A06", "A09"].includes(asset.value)) {
      warning.hidden = false;
      warning.textContent = "외부/공식 자료 일부를 쓰는 경우 필요한 범위만 사용하고 source·권리·개인정보를 04 단계에서 다시 확인합니다.";
    } else {
      warning.hidden = true;
      warning.textContent = "";
    }
  }

  function saveStrategy() {
    const item = currentItem();
    if (!item) return;
    const next = {
      contentFormat: format.value,
      hookType: hook.value,
      ctaType: cta.value,
      sourceAssetType: asset.value,
      replyMode: reply.value,
      hasTopicTag: topic.checked,
      note: note.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    const previous = item.contentStrategy || {};
    const keys = ["contentFormat", "hookType", "ctaType", "sourceAssetType", "replyMode", "hasTopicTag", "note"];
    const changed = keys.some((key) => String(previous[key] ?? "") !== String(next[key] ?? ""));
    item.contentStrategy = next;

    if (next.sourceAssetType === "A10") {
      const gate = item.safetyGate || {
        schemaVersion: 1,
        fact: "unknown",
        rights: "unknown",
        privacy: "unknown",
        defamation: "unknown",
        platform: "unknown",
        notes: "",
        reviewedAt: null,
      };
      gate.rights = "block";
      gate.reviewedAt = null;
      gate.updatedAt = new Date().toISOString();
      if (!String(gate.notes || "").includes("A10")) {
        gate.notes = [String(gate.notes || "").trim(), "A10 권리 미확인 자산: 권리 확인 전 실제 게시 금지."].filter(Boolean).join("\n");
      }
      item.safetyGate = gate;
    }

    if (changed) item.updatedAt = new Date().toISOString();
    persist();
    render();
    sync();
    showSystemMessage(
      next.sourceAssetType === "A10"
        ? "A10 권리 미확인 자산으로 저장했습니다. Safety Gate 권리 항목을 BLOCK 처리했고 실제 게시도 차단합니다."
        : next.contentFormat
          ? `${next.contentFormat} / ${next.hookType || "훅 미지정"} 제작 실험값을 저장했습니다.${changed ? " 기존 게시 승인이 있었다면 재승인이 필요합니다." : ""}`
          : "제작 실험값을 미지정 상태로 저장했습니다.",
      next.sourceAssetType === "A10" ? "error" : next.contentFormat ? "success" : "info"
    );
  }

  function blockUnknownRightsPublish(event) {
    const target = event.target.closest?.("button");
    if (!target) return;
    const card = target.closest?.(".approval-card[data-item-id]");
    if (!card) return;
    const item = (state.items || []).find((candidate) => candidate.id === card.dataset.itemId);
    if (item?.contentStrategy?.sourceAssetType !== "A10") return;
    const isPrepare = target.matches?.('[data-threads-control="prepare"]');
    const isActualPublish = Boolean(target.closest?.(".threads-publish-box")) && /실제\s*Threads에\s*게시/.test(target.textContent || "");
    if (!isPrepare && !isActualPublish) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showSystemMessage("권리 미확인 자산(A10)은 게시할 수 없습니다. 자산 권리를 확인하고 제작 실험값과 Safety Gate를 다시 저장하세요.", "error");
  }

  function loadStyles() {
    if (document.querySelector('link[href="./content-strategy.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./content-strategy.css";
    document.head.appendChild(link);
  }

  function loadCompanion(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
})();
