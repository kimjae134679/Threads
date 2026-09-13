(() => {
  const registry = window.ThreadsAccountRegistry;
  const detail = document.querySelector("#detailContent");
  const decisionGrid = document.querySelector("#decisionGrid");
  if (!detail || !decisionGrid || !registry) return;

  loadStyles();

  const hostSection = decisionGrid.closest(".detail-section");
  if (!hostSection) return;

  const section = document.createElement("div");
  section.className = "detail-section experiment-assignment-section";
  section.innerHTML = `
    <div class="experiment-assignment-head">
      <div>
        <h3>계정 / 실험 배정</h3>
        <p>어느 계정 전략에서 무엇을 시험하는 콘텐츠인지 지정합니다. 게시 순간 이 값은 게시 기록에 스냅샷으로 보존됩니다.</p>
      </div>
      <span id="assignmentStatusBadge" class="pill neutral">미배정</span>
    </div>
    <div class="experiment-assignment-grid">
      <label>실험 계정
        <select id="assignmentAccount">
          <option value="">미배정</option>
        </select>
      </label>
      <label>가설 ID
        <input id="assignmentHypothesis" maxlength="80" placeholder="예: H-001" />
      </label>
      <label>버전 ID
        <input id="assignmentVariant" maxlength="80" placeholder="예: V-A" />
      </label>
    </div>
    <div id="assignmentAccountSummary" class="experiment-account-summary"></div>
    <label>이번 실험에서 확인할 것
      <textarea id="assignmentGoal" rows="3" maxlength="500" placeholder="예: 단순 속보보다 '왜 뜨는지' 설명형 훅이 참여율을 높이는지 확인"></textarea>
    </label>
    <button id="saveExperimentAssignmentBtn" type="button" class="button ghost full">계정 / 실험 배정 저장</button>
  `;
  hostSection.insertAdjacentElement("afterend", section);

  const account = section.querySelector("#assignmentAccount");
  const hypothesis = section.querySelector("#assignmentHypothesis");
  const variant = section.querySelector("#assignmentVariant");
  const goal = section.querySelector("#assignmentGoal");
  const badge = section.querySelector("#assignmentStatusBadge");
  const summary = section.querySelector("#assignmentAccountSummary");
  const save = section.querySelector("#saveExperimentAssignmentBtn");

  for (const entry of registry.list()) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.id} · ${entry.name} (${entry.status})`;
    account.appendChild(option);
  }

  account.addEventListener("change", renderAccountSummary);
  save.addEventListener("click", saveAssignment);

  const title = document.querySelector("#detailTitle");
  if (title) new MutationObserver(sync).observe(title, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".candidate-card, #deleteBtn, #resetBtn, [data-status]")) setTimeout(sync, 0);
  });

  sync();
  loadCompanion("./content-strategy.js");
  loadCompanion("./experiment-metadata.js");
  loadCompanion("./viral-model.js", () => loadCompanion("./viral-review.js"));

  function currentItem() {
    return (state.items || []).find((item) => item.id === selectedId) || null;
  }

  function sync() {
    const item = currentItem();
    section.hidden = !item;
    if (!item) return;
    const assignment = item.experimentAssignment || {};
    account.value = assignment.accountId || "";
    hypothesis.value = assignment.hypothesisId || "";
    variant.value = assignment.variantId || "";
    goal.value = assignment.goal || "";
    badge.textContent = assignment.accountId ? registry.label(assignment.accountId) : "미배정";
    badge.className = `pill ${assignment.accountId ? "green" : "neutral"}`;
    renderAccountSummary();
  }

  function renderAccountSummary() {
    const selected = registry.get(account.value);
    if (!selected) {
      summary.innerHTML = '<span>계정을 정하지 않아도 조사/제작은 가능하지만, 실제 실험 비교 전에는 배정하는 것을 권장합니다.</span>';
      return;
    }
    summary.innerHTML = `
      <strong>${escapeHtml(selected.id)} · ${escapeHtml(selected.name)}</strong>
      <span>${escapeHtml(selected.positioning)}</span>
      <small>현재 Registry 상태: ${escapeHtml(selected.status)} · 주 지표: ${escapeHtml(selected.primaryMetric)}</small>
    `;
  }

  function saveAssignment() {
    const item = currentItem();
    if (!item) return;

    const next = {
      accountId: account.value.trim(),
      hypothesisId: hypothesis.value.trim(),
      variantId: variant.value.trim(),
      goal: goal.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    const previous = item.experimentAssignment || {};
    const changed = ["accountId", "hypothesisId", "variantId", "goal"].some((key) => String(previous[key] || "") !== String(next[key] || ""));

    item.experimentAssignment = next;
    if (changed) item.updatedAt = new Date().toISOString();
    persist();
    render();
    sync();
    showSystemMessage(
      next.accountId ? `${registry.label(next.accountId)} 실험으로 배정했습니다.${changed ? " 기존 게시 승인이 있었다면 변경으로 인해 다시 검토해야 합니다." : ""}` : "실험 계정 배정을 미지정 상태로 저장했습니다.",
      next.accountId ? "success" : "info"
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./experiment-assignment.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./experiment-assignment.css";
    document.head.appendChild(link);
  }

  function loadCompanion(src, onload) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (typeof onload === "function") {
        if (existing.dataset.loaded === "true") onload();
        else existing.addEventListener("load", onload, { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      if (typeof onload === "function") onload();
    }, { once: true });
    document.body.appendChild(script);
  }
})();
