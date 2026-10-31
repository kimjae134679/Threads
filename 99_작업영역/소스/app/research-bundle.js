const researchEls = {
  status: document.querySelector("#researchReviewStatus"),
  badge: document.querySelector("#researchStatusBadge"),
  whyNow: document.querySelector("#researchWhyNow"),
  facts: document.querySelector("#researchVerifiedFacts"),
  claims: document.querySelector("#researchClaims"),
  angles: document.querySelector("#researchAngles"),
  riskNotes: document.querySelector("#researchRiskNotes"),
  sources: document.querySelector("#researchSources"),
  save: document.querySelector("#saveResearchBtn"),
  copy: document.querySelector("#copyResearchJsonBtn"),
};

researchEls.save.addEventListener("click", saveResearchBundle);
researchEls.copy.addEventListener("click", copyResearchBundleJson);

const researchObserver = new MutationObserver(() => renderResearchBundle());
researchObserver.observe(document.querySelector("#detailTitle"), { childList: true, subtree: true });
document.querySelector("#candidateList").addEventListener("click", () => queueMicrotask(renderResearchBundle));

// app.js가 먼저 ready 버튼에 target listener를 붙이므로 document capture 단계에서
// Research Bundle 미검토 상태를 먼저 차단한다.
document.addEventListener("click", (event) => {
  const readyButton = event.target.closest?.('[data-status="ready"]');
  if (!readyButton) return;
  const item = state.items.find((candidate) => candidate.id === selectedId);
  if (!item) return;
  if (item.researchBundle?.reviewStatus === "reviewed") return;

  event.preventDefault();
  event.stopImmediatePropagation();
  alert("제작 후보로 올리기 전에 Research Bundle을 작성하고 '사람 검토 완료'로 저장하세요.");
}, true);

renderResearchBundle();
loadOptionalAiStudio();

function renderResearchBundle() {
  const item = state.items.find((candidate) => candidate.id === selectedId);
  const bundle = item?.researchBundle || emptyResearchBundle();

  researchEls.status.value = bundle.reviewStatus || "unresearched";
  researchEls.whyNow.value = bundle.whyNow || "";
  researchEls.facts.value = (bundle.verifiedFacts || []).join("\n");
  researchEls.claims.value = (bundle.claimsToVerify || []).join("\n");
  researchEls.angles.value = (bundle.angles || []).join("\n");
  researchEls.riskNotes.value = bundle.riskNotes || "";
  researchEls.sources.value = formatResearchSources(bundle.sources || []);
  setResearchBadge(bundle.reviewStatus || "unresearched");
}

function saveResearchBundle() {
  const item = state.items.find((candidate) => candidate.id === selectedId);
  if (!item) return;

  const previous = item.researchBundle || {};
  const bundle = {
    ...previous,
    schemaVersion: Math.max(Number(previous.schemaVersion || 1), 1),
    reviewStatus: researchEls.status.value,
    whyNow: researchEls.whyNow.value.trim(),
    verifiedFacts: splitLines(researchEls.facts.value),
    claimsToVerify: splitLines(researchEls.claims.value),
    angles: splitLines(researchEls.angles.value),
    riskNotes: researchEls.riskNotes.value.trim(),
    sources: parseResearchSources(researchEls.sources.value),
    updatedAt: new Date().toISOString(),
  };

  if (bundle.reviewStatus === "reviewed") {
    const missing = [];
    if (!bundle.whyNow) missing.push("왜 지금 뜨는가");
    if (!bundle.verifiedFacts.length) missing.push("확인된 사실");
    if (!bundle.sources.length) missing.push("추가 출처");
    if (missing.length) {
      alert(`'사람 검토 완료'로 저장하려면 다음 항목이 필요합니다:\n- ${missing.join("\n- ")}`);
      return;
    }
  }

  item.researchBundle = bundle;
  item.updatedAt = new Date().toISOString();
  persist();
  setResearchBadge(bundle.reviewStatus);
  showSystemMessage(
    bundle.reviewStatus === "reviewed" ? "Research Bundle을 사람 검토 완료 상태로 저장했습니다." : "Research Bundle을 저장했습니다.",
    bundle.reviewStatus === "reviewed" ? "success" : "info"
  );
}

async function copyResearchBundleJson() {
  const item = state.items.find((candidate) => candidate.id === selectedId);
  if (!item) return;

  const payload = {
    topic: {
      id: item.id,
      clusterId: item.clusterId || null,
      title: item.title,
      url: item.url || null,
      kind: item.kind,
      sourceType: item.sourceType,
      sourceRisk: item.sourceRisk,
      sourceReason: item.sourceReason,
      sourceMeta: item.sourceMeta || null,
      signals: item.signals || null,
      score: item.score ?? null,
      relatedSources: item.relatedSources || [],
    },
    researchBundle: item.researchBundle || collectUnsavedBundle(),
    aiResearch: item.aiResearch || null,
  };

  const text = JSON.stringify(payload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    const old = researchEls.copy.textContent;
    researchEls.copy.textContent = "JSON 복사됨";
    setTimeout(() => { researchEls.copy.textContent = old; }, 1200);
  } catch (_) {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    document.body.appendChild(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
}

function collectUnsavedBundle() {
  const item = state.items.find((candidate) => candidate.id === selectedId);
  const previous = item?.researchBundle || {};
  return {
    ...previous,
    schemaVersion: Math.max(Number(previous.schemaVersion || 1), 1),
    reviewStatus: researchEls.status.value,
    whyNow: researchEls.whyNow.value.trim(),
    verifiedFacts: splitLines(researchEls.facts.value),
    claimsToVerify: splitLines(researchEls.claims.value),
    angles: splitLines(researchEls.angles.value),
    riskNotes: researchEls.riskNotes.value.trim(),
    sources: parseResearchSources(researchEls.sources.value),
    updatedAt: null,
  };
}

function emptyResearchBundle() {
  return {
    schemaVersion: 1,
    reviewStatus: "unresearched",
    whyNow: "",
    verifiedFacts: [],
    claimsToVerify: [],
    angles: [],
    riskNotes: "",
    sources: [],
    updatedAt: null,
  };
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseResearchSources(value) {
  return splitLines(value).map((line) => {
    const separator = line.indexOf("|");
    if (separator < 0) return { url: line.trim(), note: "" };
    return {
      url: line.slice(0, separator).trim(),
      note: line.slice(separator + 1).trim(),
    };
  }).filter((source) => source.url || source.note);
}

function formatResearchSources(sources) {
  return sources.map((source) => source.note ? `${source.url} | ${source.note}` : source.url).join("\n");
}

function setResearchBadge(status) {
  const labels = {
    unresearched: ["미조사", "neutral"],
    researching: ["조사 중", "yellow"],
    reviewed: ["사람 검토 완료", "green"],
  };
  const [label, tone] = labels[status] || labels.unresearched;
  researchEls.badge.textContent = label;
  researchEls.badge.className = `pill research-${tone}`;
}

function loadOptionalAiStudio() {
  if (document.querySelector('script[data-ai-studio="true"]')) return;
  const script = document.createElement("script");
  script.src = "./ai-studio.js";
  script.dataset.aiStudio = "true";
  script.addEventListener("error", () => console.warn("AI Studio script failed to load."));
  document.body.appendChild(script);
}
