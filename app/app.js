const STORAGE_KEY = "threads_trend_inbox_v1";

const kindLabels = {
  breaking: "이슈/속보",
  story: "인터넷 사연",
  humor: "유머/밈",
  useful: "정보/팁",
  product: "제품/소비",
  explainer: "설명/분석",
};

const statusLabels = {
  inbox: "Inbox",
  research: "조사 대기",
  ready: "제작 후보",
  skip: "패스",
};

const platformByKind = {
  breaking: ["Threads", "X", "YouTube Shorts", "Instagram Carousel"],
  story: ["Threads", "YouTube Shorts", "Instagram Reels", "TikTok"],
  humor: ["Instagram Reels", "TikTok", "YouTube Shorts", "Threads"],
  useful: ["Instagram Carousel", "Naver Blog", "YouTube Shorts", "Threads"],
  product: ["Naver/Independent Blog", "YouTube Long", "YouTube Shorts", "Instagram"],
  explainer: ["YouTube Long", "Blog", "Threads", "Instagram Carousel"],
};

let state = loadState();
let selectedId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  form: $("#candidateForm"),
  title: $("#titleInput"),
  url: $("#urlInput"),
  kind: $("#kindInput"),
  source: $("#sourceInput"),
  note: $("#noteInput"),
  freshness: $("#freshnessInput"),
  velocity: $("#velocityInput"),
  audience: $("#audienceInput"),
  originality: $("#originalityInput"),
  revenue: $("#revenueInput"),
  list: $("#candidateList"),
  empty: $("#emptyState"),
  detailEmpty: $("#detailEmpty"),
  detailContent: $("#detailContent"),
  detailTitle: $("#detailTitle"),
  detailRisk: $("#detailRisk"),
  decisionGrid: $("#decisionGrid"),
  platformChips: $("#platformChips"),
  checkList: $("#checkList"),
  detailNote: $("#detailNote"),
  prompt: $("#promptOutput"),
  search: $("#searchInput"),
  statusFilter: $("#statusFilter"),
  riskFilter: $("#riskFilter"),
  systemMessage: $("#systemMessage"),
  evalFreshness: $("#evalFreshness"),
  evalVelocity: $("#evalVelocity"),
  evalAudience: $("#evalAudience"),
  evalOriginality: $("#evalOriginality"),
  evalRevenue: $("#evalRevenue"),
};

bindRange("freshnessInput", "freshnessOut");
bindRange("velocityInput", "velocityOut");
bindRange("audienceInput", "audienceOut");
bindRange("originalityInput", "originalityOut");
bindRange("revenueInput", "revenueOut");

els.form.addEventListener("submit", addCandidate);
els.search.addEventListener("input", render);
els.statusFilter.addEventListener("change", render);
els.riskFilter.addEventListener("change", render);
$("#googleTrendsBtn").addEventListener("click", importGoogleTrends);
$("#saveEvaluationBtn").addEventListener("click", saveEvaluation);
$("#saveNoteBtn").addEventListener("click", saveSelectedNote);
$("#copyPromptBtn").addEventListener("click", copyPrompt);
$("#deleteBtn").addEventListener("click", deleteSelected);
$("#exportBtn").addEventListener("click", exportJson);
$("#importInput").addEventListener("change", importJson);
$("#resetBtn").addEventListener("click", resetAll);
$$('[data-status]').forEach((button) => button.addEventListener("click", () => setSelectedStatus(button.dataset.status)));

render();

function bindRange(inputId, outputId) {
  const input = $(`#${inputId}`);
  const output = $(`#${outputId}`);
  const sync = () => { output.value = input.value; output.textContent = input.value; };
  input.addEventListener("input", sync);
  sync();
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.items)) return parsed;
  } catch (error) {
    console.warn("저장된 Inbox를 읽지 못했습니다.", error);
  }
  return { version: 1, items: [] };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addCandidate(event) {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const sourceDecision = classifySource(els.url.value.trim(), els.source.value);
  const signals = {
    freshness: Number(els.freshness.value),
    velocity: Number(els.velocity.value),
    audience: Number(els.audience.value),
    originalityRoom: Number(els.originality.value),
    revenueFit: Number(els.revenue.value),
  };

  const item = {
    id: makeId(),
    title,
    url: els.url.value.trim(),
    kind: els.kind.value,
    sourceType: sourceDecision.sourceType,
    sourceRisk: sourceDecision.risk,
    sourceReason: sourceDecision.reason,
    collectionAllowed: sourceDecision.collectionAllowed,
    note: els.note.value.trim(),
    signals,
    score: calculateScore(signals, sourceDecision.risk),
    scoreBasis: "manual_signals",
    platforms: platformByKind[els.kind.value] || ["Threads"],
    status: sourceDecision.risk === "red" ? "skip" : "inbox",
    relatedSources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.items.unshift(item);
  selectedId = item.id;
  persist();
  els.form.reset();
  resetRanges();
  render();
}

async function importGoogleTrends() {
  const button = $("#googleTrendsBtn");
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = "가져오는 중…";
  showSystemMessage("Google Trends KR 실시간 인기 RSS를 확인하고 있습니다.", "info");

  try {
    const response = await fetch("/api/trends/google?geo=KR", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Array.isArray(payload.items)) {
      throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
    }

    const existingKeys = new Set(state.items.map((item) => item.sourceKey).filter(Boolean));
    const existingTrendTitles = new Set(
      state.items.filter((item) => item.sourceType === "trend-signal").map((item) => item.title.toLowerCase())
    );

    const newItems = payload.items.filter((trend) => {
      const key = trendKey(trend.title);
      return !existingKeys.has(key) && !existingTrendTitles.has(String(trend.title || "").toLowerCase());
    }).map((trend) => trendToCandidate(trend, payload));

    if (newItems.length) {
      state.items = [...newItems, ...state.items];
      selectedId = newItems[0].id;
      persist();
      render();
    }

    const skipped = payload.items.length - newItems.length;
    showSystemMessage(
      `Google Trends KR에서 ${payload.items.length}개를 확인해 ${newItems.length}개를 새로 추가했습니다.${skipped ? ` 중복 ${skipped}개는 건너뛰었습니다.` : ""}`,
      "success"
    );
  } catch (error) {
    showSystemMessage(
      `Google Trends를 가져오지 못했습니다. 저장소를 파일로 직접 연 경우에는 저장소 루트에서 'npm start'로 실행하세요. (${error.message})`,
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}

function trendToCandidate(trend, payload) {
  const relatedSources = Array.isArray(trend.news) ? trend.news.map((news) => ({
    title: news.title || "",
    url: news.url || "",
    source: news.source || "",
    sourceType: "news",
  })).filter((item) => item.title || item.url) : [];

  return {
    id: makeId(),
    sourceKey: trendKey(trend.title),
    title: trend.title,
    url: trend.trendsUrl || payload.feedUrl || "",
    kind: "breaking",
    sourceType: "trend-signal",
    sourceRisk: "green",
    sourceReason: "Google Trends 공식 Trending Now RSS에서 수집한 '관심도 신호'입니다. 이 신호 자체가 사건의 사실관계를 증명하지 않으므로 관련 내용은 별도 조사합니다.",
    collectionAllowed: true,
    note: buildTrendNote(trend),
    signals: {
      freshness: freshnessFromDate(trend.pubDate),
      velocity: null,
      audience: null,
      originalityRoom: null,
      revenueFit: null,
    },
    score: null,
    scoreBasis: "needs_human_review",
    platforms: platformByKind.breaking,
    status: "inbox",
    relatedSources,
    sourceMeta: {
      provider: payload.source || "Google Trends Trending Now RSS",
      geo: payload.geo || "KR",
      rank: trend.rank ?? null,
      approxTraffic: trend.approxTraffic || "",
      pubDate: trend.pubDate || "",
      collectedAt: payload.collectedAt || new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildTrendNote(trend) {
  const lines = [];
  if (trend.approxTraffic) lines.push(`Google Trends 검색량 표기: ${trend.approxTraffic}`);
  if (trend.pubDate) lines.push(`피드 시각: ${trend.pubDate}`);
  if (trend.description) lines.push(`트렌드 설명: ${trend.description}`);
  const news = Array.isArray(trend.news) ? trend.news.slice(0, 3) : [];
  if (news.length) {
    lines.push("관련 기사 후보:");
    news.forEach((item) => lines.push(`- ${item.source ? `${item.source}: ` : ""}${item.title}${item.url ? ` (${item.url})` : ""}`));
  }
  lines.push("※ Trending Now 신호만으로 사실 확정 금지. Research 단계에서 1차 자료/복수 출처 확인 필요.");
  return lines.join("\n");
}

function trendKey(title) {
  return `google-trends:KR:${String(title || "").trim().toLowerCase()}`;
}

function freshnessFromDate(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return null;
  const ageHours = Math.max(0, (Date.now() - time) / 3_600_000);
  if (ageHours <= 2) return 100;
  if (ageHours <= 6) return 90;
  if (ageHours <= 12) return 80;
  if (ageHours <= 24) return 70;
  if (ageHours <= 48) return 50;
  return 30;
}

function resetRanges() {
  const defaults = { freshnessInput: 70, velocityInput: 50, audienceInput: 60, originalityInput: 70, revenueInput: 45 };
  Object.entries(defaults).forEach(([id, value]) => {
    const input = $(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event("input"));
  });
}

function classifySource(rawUrl, selectedType) {
  let host = "";
  try { host = rawUrl ? new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch (_) {}

  const blocked = [
    { test: (h) => h === "dcinside.com" || h.endsWith(".dcinside.com"), reason: "DCInside는 현재 프로젝트 정책상 자동 크롤링/대량수집 차단 소스입니다." },
    { test: (h) => h === "teamblind.com" || h.endsWith(".teamblind.com") || h === "blind.com" || h.endsWith(".blind.com"), reason: "Blind는 명시적 허가 없는 크롤링/스크래핑/복제를 기본 차단합니다." },
  ];
  const blockedRule = blocked.find((rule) => rule.test(host));
  if (blockedRule) return { sourceType: "community", risk: "red", reason: blockedRule.reason, collectionAllowed: false };

  if (/((^|\.)go\.kr$)|((^|\.)gov\.kr$)|(^data\.go\.kr$)/.test(host)) {
    return { sourceType: "official", risk: "green", reason: "공공/공식 도메인으로 보입니다. 개별 자료의 이용조건은 발행 전 확인합니다.", collectionAllowed: true };
  }

  if (selectedType === "official" || selectedType === "licensed") {
    return { sourceType: selectedType, risk: "green", reason: "공식/라이선스 소스로 지정되었습니다. 실제 라이선스 범위는 기록해 두세요.", collectionAllowed: true };
  }

  if (!rawUrl && (selectedType === "manual" || selectedType === "auto")) {
    return { sourceType: "manual", risk: "green", reason: "외부 원문 없이 직접 입력한 소재입니다.", collectionAllowed: true };
  }

  const socialHosts = ["youtube.com", "youtu.be", "threads.net", "instagram.com", "x.com", "twitter.com", "tiktok.com", "facebook.com"];
  const isSocial = socialHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (isSocial || selectedType === "social") {
    return { sourceType: "social", risk: "yellow", reason: "공개 SNS는 참고 가능하지만 본문/영상 재사용 권리는 별도 확인이 필요합니다.", collectionAllowed: false };
  }

  const closedCommunity = host.includes("cafe.naver.com") || host.includes("cafe.daum.net") || selectedType === "community";
  if (closedCommunity) {
    return { sourceType: "community", risk: "yellow", reason: "커뮤니티 자료는 접근권한·약관·개인정보·명예훼손 위험을 사람 검토합니다.", collectionAllowed: false };
  }

  if (selectedType === "news") {
    return { sourceType: "news", risk: "yellow", reason: "뉴스는 사실 확인용으로 사용하고 기사 본문/이미지를 그대로 재판매하지 않습니다.", collectionAllowed: false };
  }

  return {
    sourceType: selectedType === "auto" ? "unknown" : selectedType,
    risk: "yellow",
    reason: "이용조건을 아직 확인하지 않은 공개 URL입니다. UNKNOWN은 자동수집 허용으로 취급하지 않습니다.",
    collectionAllowed: false,
  };
}

function calculateScore(signals, risk) {
  const values = Object.values(signals).map(Number);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const penalty = risk === "red" ? 35 : risk === "yellow" ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(average - penalty)));
}

function render() {
  renderStats();
  const query = els.search.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const risk = els.riskFilter.value;
  const filtered = state.items.filter((item) => {
    const searchable = `${item.title} ${item.note || ""} ${item.url || ""}`.toLowerCase();
    return (!query || searchable.includes(query)) && (status === "all" || item.status === status) && (risk === "all" || item.sourceRisk === risk);
  });

  els.list.innerHTML = "";
  filtered.forEach((item) => els.list.appendChild(candidateCard(item)));
  els.empty.hidden = filtered.length > 0;

  if (selectedId && !state.items.some((item) => item.id === selectedId)) selectedId = null;
  renderDetail();
}

function renderStats() {
  $("#statTotal").textContent = state.items.length;
  $("#statResearch").textContent = state.items.filter((x) => x.status === "research").length;
  $("#statBlocked").textContent = state.items.filter((x) => x.sourceRisk === "red").length;
  $("#statReady").textContent = state.items.filter((x) => x.status === "ready").length;
}

function candidateCard(item) {
  const card = document.createElement("article");
  const scoreText = item.score == null ? "검토" : item.score;
  const scoreTitle = item.score == null ? "자동 수집된 실제 신호입니다. 독자 적합도/원본성/수익성은 사람 검토 후 평가합니다." : "운영자 입력 신호 평균에서 소스 위험 패널티를 뺀 초기 점수";
  card.className = `candidate-card${item.id === selectedId ? " active" : ""}`;
  card.innerHTML = `
    <div class="card-top">
      <div style="min-width:0">
        <p class="card-title"></p>
        <div class="card-url"></div>
      </div>
      <div class="score-badge" title="${escapeHtml(scoreTitle)}">${escapeHtml(scoreText)}</div>
    </div>
    <div class="card-meta">
      <span class="pill risk-${item.sourceRisk}">${item.sourceRisk.toUpperCase()}</span>
      <span>${kindLabels[item.kind] || item.kind}</span>
      <span>${statusLabels[item.status] || item.status}</span>
      <span>${item.sourceType}</span>
    </div>
    <div class="card-footer">
      <span>${(item.platforms || []).slice(0, 2).join(" · ")}</span>
      <span>${formatDate(item.createdAt)}</span>
    </div>`;
  card.querySelector(".card-title").textContent = item.title;
  card.querySelector(".card-url").textContent = item.sourceMeta?.approxTraffic ? `Google 검색량 ${item.sourceMeta.approxTraffic} · ${item.url || ""}` : (item.url || "직접 입력 소재");
  card.addEventListener("click", () => { selectedId = item.id; render(); });
  return card;
}

function renderDetail() {
  const item = state.items.find((x) => x.id === selectedId);
  els.detailEmpty.hidden = Boolean(item);
  els.detailContent.hidden = !item;
  if (!item) return;

  els.detailTitle.textContent = item.title;
  els.detailRisk.className = `pill risk-${item.sourceRisk}`;
  els.detailRisk.textContent = item.sourceRisk.toUpperCase();
  els.detailNote.value = item.note || "";
  setEvaluationInputs(item.signals || {});

  const decisionRows = [
    ["초기 점수", item.score == null ? "검토 필요" : `${item.score}/100`],
    ["상태", statusLabels[item.status]],
    ["소스", item.sourceType],
    ["자동 수집", item.collectionAllowed ? "허용 후보" : "차단/검토"],
    ...(item.sourceMeta?.approxTraffic ? [["검색량 표기", item.sourceMeta.approxTraffic]] : []),
    ...(item.sourceMeta?.rank ? [["피드 순번", String(item.sourceMeta.rank)]] : []),
    ["생성 시점", formatDate(item.createdAt)],
  ];
  els.decisionGrid.innerHTML = decisionRows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("");

  els.platformChips.innerHTML = "";
  (item.platforms || []).forEach((platform) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = platform;
    els.platformChips.appendChild(chip);
  });

  const checks = buildChecks(item);
  els.checkList.innerHTML = "";
  checks.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    els.checkList.appendChild(li);
  });

  els.prompt.value = buildPrompt(item);
}

function setEvaluationInputs(signals) {
  els.evalFreshness.value = nullableInputValue(signals.freshness);
  els.evalVelocity.value = nullableInputValue(signals.velocity);
  els.evalAudience.value = nullableInputValue(signals.audience);
  els.evalOriginality.value = nullableInputValue(signals.originalityRoom);
  els.evalRevenue.value = nullableInputValue(signals.revenueFit);
}

function nullableInputValue(value) {
  return value == null || Number.isNaN(Number(value)) ? "" : String(value);
}

function parseEvaluationValue(input) {
  const raw = input.value.trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function saveEvaluation() {
  const item = state.items.find((x) => x.id === selectedId);
  if (!item) return;

  const signals = {
    freshness: parseEvaluationValue(els.evalFreshness),
    velocity: parseEvaluationValue(els.evalVelocity),
    audience: parseEvaluationValue(els.evalAudience),
    originalityRoom: parseEvaluationValue(els.evalOriginality),
    revenueFit: parseEvaluationValue(els.evalRevenue),
  };
  const complete = Object.values(signals).every((value) => value != null);
  item.signals = signals;
  item.score = complete ? calculateScore(signals, item.sourceRisk) : null;
  item.scoreBasis = complete ? "human_reviewed" : "partial_human_review";
  item.updatedAt = new Date().toISOString();
  persist();
  render();
  showSystemMessage(complete ? `평가를 저장했습니다. 초기 점수는 ${item.score}점입니다.` : "평가를 저장했습니다. 빈 항목이 있어 점수는 아직 계산하지 않습니다.", complete ? "success" : "info");
}

function buildChecks(item) {
  const checks = [
    item.sourceReason,
    "핵심 주장·숫자·날짜를 1차 자료 또는 독립된 복수 출처로 확인하기.",
    "원문을 문장만 바꿔 재작성하지 말고 자체 구조·설명·비교·관점을 추가하기.",
  ];
  if (item.sourceType === "trend-signal") checks.unshift("검색량 급상승은 '관심 신호'일 뿐입니다. 왜 급상승했는지 원인을 별도 조사하세요.");
  if (item.kind === "story") checks.push("닉네임, 직장, 학교, 지역, 얼굴 등 일반인 식별 단서를 제거하고 개인 폭로를 사실처럼 단정하지 않기.");
  if (item.kind === "humor") checks.push("짤/영상/음원은 직접 제작·라이선스·Public Domain·허용된 Remix 여부를 확인하기.");
  if (item.kind === "breaking") checks.push("오래된 사건을 오늘 일처럼 쓰지 않도록 실제 발생일과 새로 발생한 사실을 분리하기.");
  if (item.sourceRisk === "red") checks.unshift("이 소스는 자동수집/대량복제 경로에서 제외. 개별 소재 검토가 필요합니다.");
  return checks;
}

function buildPrompt(item) {
  const platformLines = (item.platforms || []).map((x) => `- ${x}`).join("\n");
  const sourceLines = (item.relatedSources || []).slice(0, 8).map((x) => `- ${x.source ? `${x.source}: ` : ""}${x.title || ""}${x.url ? ` | ${x.url}` : ""}`).join("\n") || "- 추가 출처 없음";
  return `당신은 AI Content Monetization Lab의 리서처 겸 편집자다.\n\n[소재]\n제목: ${item.title}\nURL: ${item.url || "없음 - 직접 입력"}\n유형: ${kindLabels[item.kind] || item.kind}\n소스 분류: ${item.sourceType}\n소스 위험도: ${item.sourceRisk.toUpperCase()}\n메모: ${item.note || "없음"}\n\n[초기 신호]\n- freshness: ${formatSignal(item.signals?.freshness)}\n- velocity: ${formatSignal(item.signals?.velocity)}\n- audience_fit: ${formatSignal(item.signals?.audience)}\n- originality_room: ${formatSignal(item.signals?.originalityRoom)}\n- revenue_fit: ${formatSignal(item.signals?.revenueFit)}\n- initial_score: ${item.score == null ? "HUMAN_REVIEW_REQUIRED" : item.score}\n\n[관련 출처 후보]\n${sourceLines}\n\n[추천 플랫폼]\n${platformLines}\n\n[해야 할 일]\n1. 현재 시점의 사실을 다시 조사하고 1차 자료를 우선한다.\n2. 확인된 사실 / 불확실한 주장 / 의견을 분리한다.\n3. 저작권, 개인정보, 명예훼손, 플랫폼 원본성 위험을 표시한다.\n4. 원문 표현을 바꾸는 수준이 아니라 우리가 새로 보탤 설명·비교·맥락·관점 3개 이상을 제안한다.\n5. 가장 좋은 콘텐츠 각도 3개를 제안하고 이유를 쓴다.\n6. 플랫폼별로 서로 다른 초안 구조를 만든다. 같은 결과물을 그대로 복붙하지 않는다.\n7. 수익 연결 가능성이 있으면 광고/affiliate/brand/traffic/audience_building 중 적절한 경로를 표시한다.\n8. 위험도가 높으면 자동 발행하지 말고 HUMAN REVIEW를 표시한다.\n9. Google Trends 항목이면 검색 급상승 이유를 추측으로 쓰지 말고 반드시 근거를 찾아 확인한다.\n\n출력은 Research Bundle 형태로 정리한다.`;
}

function formatSignal(value) {
  return value == null || Number.isNaN(Number(value)) ? "UNKNOWN" : String(value);
}

function saveSelectedNote() {
  const item = state.items.find((x) => x.id === selectedId);
  if (!item) return;
  item.note = els.detailNote.value.trim();
  item.updatedAt = new Date().toISOString();
  persist();
  render();
}

function setSelectedStatus(status) {
  const item = state.items.find((x) => x.id === selectedId);
  if (!item) return;
  if (item.sourceRisk === "red" && status === "ready") {
    alert("RED 소스는 바로 제작 후보로 올리지 않습니다. 먼저 출처/권리/위험을 별도로 검토하세요.");
    return;
  }
  if (status === "ready" && item.score == null) {
    alert("제작 후보로 올리기 전에 5개 평가 항목을 모두 입력해 점수를 계산하세요.");
    return;
  }
  item.status = status;
  item.updatedAt = new Date().toISOString();
  persist();
  render();
}

async function copyPrompt() {
  if (!els.prompt.value) return;
  try {
    await navigator.clipboard.writeText(els.prompt.value);
    $("#copyPromptBtn").textContent = "복사됨";
    setTimeout(() => { $("#copyPromptBtn").textContent = "프롬프트 복사"; }, 1200);
  } catch (_) {
    els.prompt.select();
    document.execCommand("copy");
  }
}

function deleteSelected() {
  const item = state.items.find((x) => x.id === selectedId);
  if (!item || !confirm(`삭제할까요?\n${item.title}`)) return;
  state.items = state.items.filter((x) => x.id !== selectedId);
  selectedId = null;
  persist();
  render();
}

function exportJson() {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `threads-trend-inbox-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.items)) throw new Error("items 배열이 없습니다.");
    const validItems = parsed.items.filter((item) => item && typeof item.id === "string" && typeof item.title === "string");
    state = { version: 1, items: validItems };
    selectedId = null;
    persist();
    render();
    showSystemMessage(`${validItems.length}개의 Inbox 항목을 불러왔습니다.`, "success");
  } catch (error) {
    alert(`불러오지 못했습니다: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function resetAll() {
  if (!state.items.length) return;
  if (!confirm("현재 브라우저에 저장된 Inbox 데이터를 모두 비울까요? 내보낸 JSON 파일은 영향을 받지 않습니다.")) return;
  state = { version: 1, items: [] };
  selectedId = null;
  persist();
  render();
  showSystemMessage("Inbox를 비웠습니다.", "info");
}

function showSystemMessage(message, type = "info") {
  els.systemMessage.hidden = false;
  els.systemMessage.className = `system-message ${type}`;
  els.systemMessage.textContent = message;
}

function formatDate(value) {
  try { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
  catch (_) { return "-"; }
}

function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
