(() => {
  const model = window.ThreadsWarehouseModel;
  const footer = document.querySelector("footer");
  if (!model || !footer) return;

  loadStyles();

  let filter = "all";

  const section = document.createElement("section");
  section.className = "content-warehouse panel";
  section.innerHTML = `
    <div class="warehouse-head">
      <div>
        <p class="eyebrow">CONTENT WAREHOUSE</p>
        <h2>완제품 창고 / 게시 대기</h2>
        <p>승인된 완제품을 READY / HOT / EVERGREEN으로 관리합니다. 원 출처·검토상태·자산·변경이력을 함께 보존하며 실제 게시 가능 여부는 Safety Gate와 최신 사람 승인까지 모두 확인합니다.</p>
      </div>
      <div class="warehouse-head-actions">
        <button id="warehouseRefreshBtn" type="button" class="button ghost">상태 새로고침</button>
      </div>
    </div>
    <div id="warehouseSummary" class="warehouse-summary"></div>
    <div class="warehouse-toolbar">
      <div id="warehouseFilters" class="warehouse-filters">
        <button type="button" class="warehouse-filter active" data-filter="all">전체</button>
        <button type="button" class="warehouse-filter" data-filter="ready-bucket">READY</button>
        <button type="button" class="warehouse-filter" data-filter="hot">HOT</button>
        <button type="button" class="warehouse-filter" data-filter="evergreen">EVERGREEN</button>
        <button type="button" class="warehouse-filter" data-filter="queue-ready">지금 게시 가능</button>
        <button type="button" class="warehouse-filter" data-filter="hold">보류</button>
      </div>
      <span id="warehouseNext" class="warehouse-next"></span>
    </div>
    <div id="warehouseList" class="warehouse-list"></div>
  `;
  footer.insertAdjacentElement("beforebegin", section);

  const list = section.querySelector("#warehouseList");
  const summary = section.querySelector("#warehouseSummary");
  const nextLabel = section.querySelector("#warehouseNext");

  section.querySelector("#warehouseRefreshBtn").addEventListener("click", renderWarehouse);
  section.querySelector("#warehouseFilters").addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    section.querySelectorAll("[data-filter]").forEach((el) => el.classList.toggle("active", el === button));
    renderWarehouse();
  });
  list.addEventListener("click", handleClick);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#cardSaveBtn, #saveDraftsBtn, #saveGateBtn, [data-approval-action], [data-status], #saveExperimentAssignmentBtn")) {
      setTimeout(renderWarehouse, 50);
    }
  });

  const approvalQueue = document.querySelector("#approvalQueueList");
  if (approvalQueue) new MutationObserver(renderWarehouse).observe(approvalQueue, { childList: true });

  renderWarehouse();

  function producedItems() {
    return (state.items || []).filter((item) => model.hasProductionAsset(item));
  }

  function renderWarehouse() {
    const items = producedItems();
    const now = Date.now();
    const queue = model.sortForQueue(items, now);
    const queueReady = items.filter((item) => model.queueEligibility(item, now).eligible);
    const readyBucket = items.filter((item) => model.normalizeWarehouse(item).bucket === "ready");
    const hot = items.filter((item) => model.normalizeWarehouse(item).bucket === "hot");
    const evergreen = items.filter((item) => model.normalizeWarehouse(item).bucket === "evergreen");
    const held = items.filter((item) => model.normalizeWarehouse(item).status === "hold");

    summary.innerHTML = [
      [items.length, "완제품"],
      [readyBucket.length, "READY"],
      [hot.length, "HOT"],
      [evergreen.length, "EVERGREEN"],
      [queueReady.length, "지금 게시 가능"],
      [held.length, "보류"],
    ].map(([value, label]) => summaryBox(value, label)).join("");

    const next = queue.find((item) => model.queueEligibility(item, now).eligible);
    nextLabel.textContent = next ? `다음 우선 후보: ${next.title}` : "현재 즉시 게시 가능한 승인 콘텐츠 없음";

    const visible = queue.filter(matchesFilter);
    list.innerHTML = "";
    if (!visible.length) {
      list.innerHTML = '<div class="empty-state compact"><strong>표시할 완제품이 없습니다.</strong><span>Draft Studio 또는 Community Card Factory에서 콘텐츠를 제작하면 자동으로 이 창고에 나타납니다.</span></div>';
      return;
    }
    visible.forEach((item) => list.appendChild(itemCard(item, now)));
  }

  function matchesFilter(item) {
    const warehouse = model.normalizeWarehouse(item);
    if (filter === "all") return true;
    if (filter === "ready-bucket") return warehouse.bucket === "ready";
    if (filter === "hot" || filter === "evergreen") return warehouse.bucket === filter;
    if (filter === "queue-ready") return model.queueEligibility(item).eligible;
    if (filter === "hold") return warehouse.status === "hold";
    return true;
  }

  function itemCard(item, now) {
    const warehouse = model.normalizeWarehouse(item);
    const stage = model.deriveStage(item);
    const eligibility = model.queueEligibility(item, now);
    const assets = model.assetSummary(item);
    const reviews = model.reviewSummary(item);
    const freshness = model.freshnessState(item, now);
    const provenance = warehouse.provenance || model.provenanceSnapshot(item);
    const article = document.createElement("article");
    article.className = `warehouse-card stage-${stage}`;
    article.dataset.itemId = item.id;
    article.innerHTML = `
      <div class="warehouse-card-head">
        <div>
          <div class="warehouse-badges">
            <span class="pill ${stageTone(stage)}">${escapeHtml(stageLabel(stage))}</span>
            <span class="pill ${bucketTone(warehouse.bucket)}">${escapeHtml(warehouse.bucket.toUpperCase())}</span>
            ${assets.cards ? '<span class="pill neutral">CARDS</span>' : ""}
            ${assets.text ? '<span class="pill neutral">TEXT</span>' : ""}
            ${warehouse.status === "hold" ? '<span class="pill red">HOLD</span>' : ""}
            <span class="pill neutral">${escapeHtml(freshnessLabel(freshness))}</span>
          </div>
          <h3>${escapeHtml(item.title || "제목 없음")}</h3>
          <small>${escapeHtml(stageReason(stage, eligibility.reason))}</small>
        </div>
        <button type="button" class="button ghost" data-action="open">후보 열기</button>
      </div>
      <div class="warehouse-meta-grid">
        <div><b>출처</b><span>${escapeHtml(provenance.source || "미분류")}</span></div>
        <div><b>탐색 레인</b><span>${escapeHtml(provenance.discoveryLane || "미분류")}</span></div>
        <div><b>권리</b><span>${escapeHtml(String(reviews.rights || "unknown").toUpperCase())}</span></div>
        <div><b>개인정보</b><span>${escapeHtml(String(reviews.privacy || "unknown").toUpperCase())}${assets.captureCount ? ` · 이미지 ${assets.imagePrivacyReviewed ? "PASS" : "PENDING"}` : ""}</span></div>
        <div><b>Research / Draft</b><span>${escapeHtml(reviews.research)} / ${escapeHtml(reviews.draft)}</span></div>
        <div><b>승인</b><span>${reviews.publishApprovalCurrent ? "CURRENT" : "NEEDS REVIEW"}</span></div>
      </div>
      <div class="warehouse-controls">
        <label>분류<select data-field="bucket">
          ${option("ready", "READY", warehouse.bucket)}
          ${option("hot", "HOT", warehouse.bucket)}
          ${option("evergreen", "EVERGREEN", warehouse.bucket)}
        </select></label>
        <label>우선순위<select data-field="priority">
          ${[5,4,3,2,1].map((value) => option(String(value), `${value}`, String(warehouse.priority))).join("")}
        </select></label>
        <label>상태<select data-field="status">
          ${option("active", "활성", warehouse.status)}
          ${option("hold", "보류", warehouse.status)}
        </select></label>
        <label>이 시각 이후<input data-field="notBefore" type="datetime-local" value="${escapeHtml(localDateValue(warehouse.notBefore))}" /></label>
        <label>유효기한<input data-field="expiresAt" type="datetime-local" value="${escapeHtml(localDateValue(warehouse.expiresAt))}" /></label>
      </div>
      <div class="warehouse-controls">
        <label>테마 태그<input data-field="themeTags" value="${escapeHtml(warehouse.themeTags.join(", "))}" placeholder="ai, work story" /></label>
        <label>포맷 태그<input data-field="formatTags" value="${escapeHtml(warehouse.formatTags.join(", "))}" placeholder="carousel, threads text" /></label>
      </div>
      <label class="warehouse-note">운영 메모<input data-field="note" maxlength="300" value="${escapeHtml(warehouse.note)}" placeholder="예: 오늘 밤 안에 우선 소진" /></label>
      <div class="warehouse-card-actions">
        <span>${eligibility.eligible ? `Queue score ${Math.round(model.queueScore(item, now))}` : `대기 사유: ${escapeHtml(eligibility.reason)}`}</span>
        <span>History ${warehouse.history.length}건</span>
        <button type="button" class="button ghost" data-action="save">창고 설정 저장</button>
      </div>
    `;
    return article;
  }

  function handleClick(event) {
    const card = event.target.closest?.(".warehouse-card[data-item-id]");
    if (!card) return;
    const item = (state.items || []).find((candidate) => candidate.id === card.dataset.itemId);
    if (!item) return;
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action === "open") {
      selectedId = item.id;
      render();
      document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "save") saveWarehouse(item, card);
  }

  function saveWarehouse(item, card) {
    const read = (name) => card.querySelector(`[data-field="${name}"]`)?.value || "";
    const previous = model.normalizeWarehouse(item);
    const updatedAt = new Date().toISOString();
    const next = {
      schemaVersion: 2,
      bucket: ["ready", "hot", "evergreen"].includes(read("bucket")) ? read("bucket") : "ready",
      priority: Math.max(1, Math.min(5, Number(read("priority")) || 3)),
      status: read("status") === "hold" ? "hold" : "active",
      notBefore: isoOrEmpty(read("notBefore")),
      expiresAt: isoOrEmpty(read("expiresAt")),
      themeTags: model.normalizeTags(read("themeTags")),
      formatTags: model.normalizeTags(read("formatTags")),
      note: read("note").trim(),
      provenance: previous.provenance || model.provenanceSnapshot(item),
      history: [],
      updatedAt,
    };
    next.history = model.appendHistory(previous, next, updatedAt);
    item.warehouse = next;
    const substantiveChanged = ["bucket", "priority", "status", "notBefore", "expiresAt", "note"]
      .some((key) => String(previous[key] ?? "") !== String(next[key] ?? ""))
      || previous.themeTags.join("|") !== next.themeTags.join("|")
      || previous.formatTags.join("|") !== next.formatTags.join("|");
    // Warehouse scheduling metadata and taxonomy do not alter approved content itself, so they deliberately do not stale publishApproval.
    persist();
    renderWarehouse();
    showSystemMessage(substantiveChanged ? "Content Warehouse 설정과 변경 이력을 저장했습니다." : "창고 설정에 변경이 없습니다.", substantiveChanged ? "success" : "info");
  }

  function isoOrEmpty(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  function localDateValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function stageLabel(stage) {
    return ({ ready: "게시 가능", approval: "승인 필요", review: "Safety 검토", blocked: "차단", "not-produced": "제작 필요" })[stage] || stage;
  }

  function stageTone(stage) {
    return stage === "ready" ? "green" : stage === "blocked" ? "red" : stage === "review" || stage === "approval" ? "yellow" : "neutral";
  }

  function bucketTone(bucket) {
    if (bucket === "hot") return "yellow";
    if (bucket === "ready") return "green";
    return "neutral";
  }

  function freshnessLabel(state) {
    return ({
      expired: "EXPIRED",
      scheduled: "SCHEDULED",
      "hot-no-expiry": "HOT · NO EXPIRY",
      "expiring-soon": "EXPIRING ≤6H",
      "fresh-today": "FRESH ≤24H",
      fresh: "FRESH",
      open: "OPEN",
    })[state] || String(state || "OPEN").toUpperCase();
  }

  function stageReason(stage, eligibilityReason) {
    if (eligibilityReason === "hold") return "창고에서 보류됨";
    if (eligibilityReason === "not-before") return "예약 시작 시각 전";
    if (eligibilityReason === "expired") return "콘텐츠 유효기한 지남";
    if (stage === "ready") return "Safety Gate + 최신 사람 승인 완료";
    if (stage === "review") return "Safety/Privacy Gate를 통과해야 함";
    if (stage === "approval") return "현재 콘텐츠 기준 사람 게시 승인이 필요함";
    if (stage === "blocked") return "Audience Comfort 또는 Safety 기준 차단";
    return "제작 자산 필요";
  }

  function option(value, label, selected) {
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function summaryBox(value, label) {
    return `<span><strong>${Number(value).toLocaleString()}</strong><small>${escapeHtml(label)}</small></span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./content-warehouse.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./content-warehouse.css";
    document.head.appendChild(link);
  }
})();
