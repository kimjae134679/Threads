(() => {
  const detail = document.querySelector("#detailContent");
  const draftStudio = document.querySelector(".draft-studio");
  const footer = document.querySelector("footer");
  if (!detail || !footer) return;

  loadSafetyStyles();
  const ui = buildSafetyUi();
  const anchor = draftStudio || document.querySelector(".research-workspace");
  anchor?.insertAdjacentElement("afterend", ui.gateSection);
  footer.insertAdjacentElement("beforebegin", ui.queueSection);

  ui.suggest.addEventListener("click", suggestGate);
  ui.save.addEventListener("click", saveGate);
  ui.queueList.addEventListener("click", handleQueueClick);

  const titleObserver = new MutationObserver(() => renderSafety());
  titleObserver.observe(document.querySelector("#detailTitle"), { childList: true, subtree: true });
  document.querySelector("#candidateList")?.addEventListener("click", () => queueMicrotask(renderSafety));
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#saveResearchBtn, #saveEvaluationBtn, [data-status], #saveDraftsBtn, #cardSaveBtn, [data-vertical-rights-save]")) {
      setTimeout(renderSafety, 0);
    }
  });
  document.addEventListener("threads:content-revision-changed", () => queueMicrotask(renderSafety));
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("#draftReviewStatus")) setTimeout(renderSafety, 0);
  });

  renderSafety();

  function renderSafety() {
    renderGate();
    renderQueue();
  }

  function renderGate() {
    const item = selectedItem();
    ui.gateSection.hidden = !item;
    if (!item) return;
    const gate = item.safetyGate || emptyGate();
    ui.fact.value = gate.fact || "unknown";
    ui.rights.value = gate.rights || "unknown";
    ui.privacy.value = gate.privacy || "unknown";
    ui.defamation.value = gate.defamation || "unknown";
    ui.platform.value = gate.platform || "unknown";
    ui.notes.value = gate.notes || "";
    renderGateBadge(gate);
    renderGateSummary(gate);
  }

  function suggestGate() {
    const item = selectedItem();
    if (!item) return;
    const bundle = item.researchBundle || {};
    const riskText = String(bundle.riskNotes || "").toLowerCase();
    const storyLike = item.kind === "story" || item.sourceType === "community";

    ui.fact.value = bundle.reviewStatus === "reviewed"
      ? ((bundle.claimsToVerify || []).length ? "warn" : "pass")
      : "block";
    ui.rights.value = item.sourceRisk === "green" && !/권리|저작|license|라이선스/.test(riskText) ? "pass" : "warn";
    ui.privacy.value = storyLike || /개인정보|privacy|식별/.test(riskText) ? "warn" : "pass";
    ui.defamation.value = storyLike || /명예|defamation|범죄|불륜|폭로/.test(riskText) ? "warn" : "pass";
    ui.platform.value = item.draftStudio?.generated ? "warn" : "unknown";

    const suggestions = [];
    if (ui.fact.value === "warn") suggestions.push("미확인 주장은 최종 초안에서 단정하지 않고 삭제/완화할 것.");
    if (ui.rights.value === "warn") suggestions.push("원본 이미지·영상·본문 재사용 없이 자체 그래픽/해설/허가 자산만 사용할 것.");
    if (ui.privacy.value === "warn") suggestions.push("일반인 식별정보와 결합 식별 가능 단서를 제거할 것.");
    if (ui.defamation.value === "warn") suggestions.push("개인에 대한 범죄·불륜·갑질 등 주장을 사실처럼 단정하지 않을 것.");
    if (ui.platform.value === "warn") suggestions.push("게시 플랫폼의 최신 원본성/AI 표시/재사용 정책을 최종 확인할 것.");
    ui.notes.value = suggestions.join("\n");
    renderGateSummary(readGateForm());
  }

  function saveGate() {
    const item = selectedItem();
    if (!item) return;
    const gate = readGateForm();
    const statuses = gateStatuses(gate);
    if (statuses.includes("warn") && !gate.notes.trim()) {
      alert("WARN 항목이 있으면 어떤 방식으로 위험을 줄일지 메모를 남겨주세요.");
      return;
    }
    gate.schemaVersion = 1;
    gate.reviewedAt = statuses.every((x) => x !== "unknown") ? new Date().toISOString() : null;
    gate.updatedAt = new Date().toISOString();
    item.safetyGate = gate;
    item.updatedAt = new Date().toISOString();
    persist();
    renderSafety();
    showSystemMessage(gate.reviewedAt ? "Rights/Safety Gate를 저장했습니다." : "Gate를 저장했습니다. UNKNOWN 항목이 남아 있습니다.", gate.reviewedAt ? "success" : "info");
  }

  function renderGateBadge(gate) {
    const statuses = gateStatuses(gate);
    let label = "미검토";
    let tone = "neutral";
    if (statuses.includes("block")) {
      label = "BLOCK";
      tone = "red";
    } else if (statuses.every((x) => x !== "unknown")) {
      if (statuses.includes("warn")) {
        label = "경고 있음";
        tone = "yellow";
      } else {
        label = "검토 완료";
        tone = "green";
      }
    }
    ui.badge.textContent = label;
    ui.badge.className = `pill risk-${tone === "red" ? "red" : tone === "yellow" ? "yellow" : tone === "green" ? "green" : "yellow"}`;
  }

  function renderGateSummary(gate) {
    const labels = [
      ["사실", gate.fact],
      ["권리", gate.rights],
      ["개인정보", gate.privacy],
      ["명예훼손", gate.defamation],
      ["플랫폼", gate.platform],
    ];
    ui.summary.innerHTML = "";
    labels.forEach(([name, status]) => {
      const chip = document.createElement("span");
      chip.className = `pill gate-${status || "unknown"}`;
      chip.textContent = `${name}: ${(status || "unknown").toUpperCase()}`;
      ui.summary.appendChild(chip);
    });
  }

  function renderQueue() {
    ui.queueList.innerHTML = "";
    const candidates = state.items
      .filter((item) => item.draftStudio?.generated)
      .sort((a, b) => readinessRank(b) - readinessRank(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    ui.queueCount.textContent = `${candidates.length}건`;
    if (!candidates.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state compact";
      empty.innerHTML = "<strong>승인 Queue가 비어 있습니다.</strong><span>Draft Studio 초안이 생기면 여기에 표시됩니다.</span>";
      ui.queueList.appendChild(empty);
      return;
    }

    candidates.forEach((item) => ui.queueList.appendChild(queueCard(item)));
  }

  function queueCard(item) {
    const readiness = publishReadiness(item);
    const approvalCurrent = currentApproval(item);
    const card = document.createElement("article");
    card.className = `approval-card ${approvalCurrent ? "approved" : readiness.ready ? "ready" : readiness.blocked ? "blocked" : ""}`;
    card.dataset.itemId = item.id;

    const head = document.createElement("div");
    head.className = "approval-card-head";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const badge = document.createElement("span");
    badge.className = "pill neutral";
    badge.textContent = approvalCurrent ? "게시 대기 승인" : readiness.ready ? "승인 가능" : readiness.blocked ? "BLOCK" : "미완료";
    head.append(title, badge);

    const meta = document.createElement("div");
    meta.className = "approval-meta";
    meta.textContent = `Research ${item.researchBundle?.reviewStatus || "없음"} · Draft ${item.draftStudio?.reviewStatus || "없음"} · Gate ${gateStateLabel(item.safetyGate)} ? Card privacy ${cardPrivacyLabel(item)}`;

    const reason = document.createElement("div");
    reason.className = "approval-reason";
    reason.textContent = approvalCurrent
      ? `승인 시각 ${formatDate(item.publishApproval.approvedAt)} · 이후 내용이 바뀌면 자동으로 재승인 필요`
      : readiness.reasons.join(" · ") || "모든 조건 충족";

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const open = button("열기", "button ghost", () => openItem(item.id));
    actions.appendChild(open);
    if (approvalCurrent) {
      actions.appendChild(button("승인 취소", "button danger ghost", () => revokeApproval(item)));
    } else {
      const approve = button("게시 대기 승인", "button primary", () => approveForPublish(item));
      approve.disabled = !readiness.ready;
      actions.appendChild(approve);
    }

    card.append(head, meta, reason, actions);
    return card;
  }

  function approveForPublish(item) {
    const readiness = publishReadiness(item);
    if (!readiness.ready) return;
    item.publishApproval = {
      status: "approved",
      approvedAt: new Date().toISOString(),
      basisUpdatedAt: item.updatedAt || null,
    };
    persist();
    renderQueue();
    showSystemMessage("게시 대기 상태로 사람 승인했습니다. 아직 실제 플랫폼 게시를 실행하지 않습니다.", "success");
  }

  function revokeApproval(item) {
    delete item.publishApproval;
    persist();
    renderQueue();
  }

  function currentApproval(item) {
    return item.publishApproval?.status === "approved" && item.publishApproval?.basisUpdatedAt === (item.updatedAt || null);
  }

  function publishReadiness(item) {
    const reasons = [];
    let blocked = false;
    if (item.status !== "ready") reasons.push("후보 상태가 제작 후보가 아님");
    if (typeof item.score !== "number" || !Number.isFinite(item.score) || item.score < 0 || item.score > 100) reasons.push("점수 평가 미완료");
    if (item.researchBundle?.reviewStatus !== "reviewed") reasons.push("Research 사람 검토 미완료");
    if (item.draftStudio?.reviewStatus !== "approved") reasons.push("Draft 사람 승인 미완료");

    if (item.contentStrategy?.sourceAssetType === "A10") reasons.push("권리 미확인 자산");
    const gate = item.safetyGate || emptyGate();
    const statuses = gateStatuses(gate);
    if (statuses.includes("block")) {
      reasons.push("Safety Gate BLOCK 존재");
      blocked = true;
    }
    if (statuses.includes("unknown")) reasons.push("Safety Gate UNKNOWN 존재");
    if (!gate.reviewedAt) reasons.push("Safety Gate 검토 미완료");
    if (statuses.includes("warn") && !String(gate.notes || "").trim()) reasons.push("WARN 대응 메모 없음");

    const captureCount = (item.cardFactory?.storyboard?.cards || []).filter((card) => card?.type === "capture-image").length;
    if (captureCount > 0) {
      const privacy = item.cardFactory?.privacy;
      if (!privacy?.gate?.allowed) {
        reasons.push(privacy?.gate?.code === "image-privacy-review-stale"
          ? "Card image changed: privacy re-review required"
          : "Card image privacy review incomplete");
      }
    }

    return { ready: reasons.length === 0, blocked, reasons };
  }


  function cardPrivacyLabel(item) {
    const captureCount = (item.cardFactory?.storyboard?.cards || []).filter((card) => card?.type === "capture-image").length;
    if (!captureCount) return "N/A";
    const privacy = item.cardFactory?.privacy;
    if (privacy?.gate?.allowed) return `PASS ${privacy.gate.reviewedCount || captureCount}/${captureCount}`;
    if (privacy?.gate?.code === "image-privacy-review-stale") return "STALE";
    return `PENDING ${privacy?.gate?.reviewedCount || 0}/${captureCount}`;
  }

  function readinessRank(item) {
    if (currentApproval(item)) return 4;
    const readiness = publishReadiness(item);
    if (readiness.ready) return 3;
    if (readiness.blocked) return 0;
    return 1;
  }

  function handleQueueClick(event) {
    const card = event.target.closest?.(".approval-card");
    if (!card) return;
  }

  function openItem(id) {
    if (!state.items.some((item) => item.id === id)) return;
    selectedId = id;
    render();
    renderSafety();
    document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readGateForm() {
    return {
      fact: ui.fact.value,
      rights: ui.rights.value,
      privacy: ui.privacy.value,
      defamation: ui.defamation.value,
      platform: ui.platform.value,
      notes: ui.notes.value.trim(),
    };
  }

  function emptyGate() {
    return {
      schemaVersion: 1,
      fact: "unknown",
      rights: "unknown",
      privacy: "unknown",
      defamation: "unknown",
      platform: "unknown",
      notes: "",
      reviewedAt: null,
      updatedAt: null,
    };
  }

  function gateStatuses(gate) {
    return [gate.fact, gate.rights, gate.privacy, gate.defamation, gate.platform].map((x) => ["pass", "warn", "block"].includes(x) ? x : "unknown");
  }

  function gateStateLabel(gate) {
    const statuses = gateStatuses(gate || emptyGate());
    if (statuses.includes("block")) return "BLOCK";
    if (statuses.includes("unknown")) return "미검토";
    if (statuses.includes("warn")) return "WARN";
    return "PASS";
  }

  function selectedItem() {
    return state.items.find((candidate) => candidate.id === selectedId) || null;
  }

  function button(text, className, onClick) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = text;
    el.addEventListener("click", onClick);
    return el;
  }

  function buildSafetyUi() {
    const gateSection = document.createElement("section");
    gateSection.className = "detail-section safety-gate";
    gateSection.innerHTML = `
      <div class="safety-gate-head">
        <div>
          <h3>Rights / Safety Gate</h3>
          <div class="gate-help">PASS/WARN/BLOCK을 사람이 확인합니다. WARN은 대응 메모가 있어야 승인 Queue로 갈 수 있습니다.</div>
        </div>
        <span id="safetyGateBadge" class="pill neutral">미검토</span>
      </div>
      <div id="safetyGateSummary" class="gate-summary"></div>
      <div class="gate-grid">
        ${gateSelect("gateFact", "사실 검증")}
        ${gateSelect("gateRights", "저작권 / 자산 권리")}
        ${gateSelect("gatePrivacy", "개인정보 / 초상")}
        ${gateSelect("gateDefamation", "명예훼손 / 일반인 주장")}
        ${gateSelect("gatePlatform", "플랫폼 원본성 / AI 정책")}
      </div>
      <label>대응 / 검토 메모<textarea id="gateNotes" rows="5" placeholder="WARN을 어떻게 해소할지, 어떤 자산을 쓰지 않을지 등을 기록"></textarea></label>
      <div class="gate-actions">
        <button id="suggestGateBtn" type="button" class="button ghost">현재 자료로 초벌 판정</button>
        <button id="saveGateBtn" type="button" class="button primary">Gate 저장</button>
      </div>
    `;

    const queueSection = document.createElement("section");
    queueSection.className = "panel approval-queue";
    queueSection.innerHTML = `
      <div class="approval-queue-head">
        <div>
          <p class="eyebrow">HUMAN APPROVAL</p>
          <h2>게시 승인 Queue</h2>
          <div class="gate-help">여기서 승인해도 실제 게시하지 않습니다. 이후 공식 플랫폼 API 연결 전 마지막 사람 승인 상태입니다.</div>
        </div>
        <span id="approvalQueueCount" class="pill neutral">0건</span>
      </div>
      <div id="approvalQueueList" class="approval-list"></div>
    `;

    return {
      gateSection,
      queueSection,
      badge: gateSection.querySelector("#safetyGateBadge"),
      summary: gateSection.querySelector("#safetyGateSummary"),
      fact: gateSection.querySelector("#gateFact"),
      rights: gateSection.querySelector("#gateRights"),
      privacy: gateSection.querySelector("#gatePrivacy"),
      defamation: gateSection.querySelector("#gateDefamation"),
      platform: gateSection.querySelector("#gatePlatform"),
      notes: gateSection.querySelector("#gateNotes"),
      suggest: gateSection.querySelector("#suggestGateBtn"),
      save: gateSection.querySelector("#saveGateBtn"),
      queueCount: queueSection.querySelector("#approvalQueueCount"),
      queueList: queueSection.querySelector("#approvalQueueList"),
    };
  }

  function gateSelect(id, label) {
    return `<label>${label}<select id="${id}">
      <option value="unknown">UNKNOWN</option>
      <option value="pass">PASS</option>
      <option value="warn">WARN</option>
      <option value="block">BLOCK</option>
    </select></label>`;
  }

  function loadSafetyStyles() {
    if (document.querySelector('link[href="./safety-gate.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./safety-gate.css";
    document.head.appendChild(link);
  }
})();
