const clusterButton = document.querySelector("#clusterBtn");
const clusterSummary = document.querySelector("#clusterSummary");
const clusterDetailSection = document.querySelector("#clusterDetailSection");
const clusterDetail = document.querySelector("#clusterDetail");

clusterButton.addEventListener("click", runTopicClustering);

const clusterObserver = new MutationObserver(() => renderClusterDetail());
clusterObserver.observe(document.querySelector("#detailTitle"), { childList: true, subtree: true });
document.querySelector("#candidateList").addEventListener("click", () => queueMicrotask(renderClusterDetail));

document.addEventListener("DOMContentLoaded", () => {
  renderClusterSummary();
  renderClusterDetail();
});

renderClusterSummary();
renderClusterDetail();

function runTopicClustering() {
  if (state.items.length < 2) {
    showSystemMessage("유사 토픽을 묶으려면 후보가 2개 이상 필요합니다.", "info");
    return;
  }

  const parent = state.items.map((_, index) => index);
  const pairScores = new Map();

  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };

  const unite = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < state.items.length; i += 1) {
    for (let j = i + 1; j < state.items.length; j += 1) {
      const left = state.items[i];
      const right = state.items[j];
      const similarity = topicSimilarity(left, right);
      pairScores.set(`${i}:${j}`, similarity);
      if (shouldCluster(left, right, similarity)) unite(i, j);
    }
  }

  const groups = new Map();
  state.items.forEach((item, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(index);
  });

  let multiGroupCount = 0;
  let clusteredItemCount = 0;
  const now = new Date().toISOString();

  groups.forEach((indices) => {
    if (indices.length < 2) {
      const item = state.items[indices[0]];
      delete item.clusterId;
      delete item.clusterSize;
      delete item.clusterConfidence;
      delete item.clusteredAt;
      return;
    }

    multiGroupCount += 1;
    clusteredItemCount += indices.length;
    const representative = chooseRepresentative(indices.map((index) => state.items[index]));
    const clusterId = `topic:${stableHash(normalizeTitle(representative.title) || representative.id)}`;
    const confidence = clusterConfidence(indices, pairScores);

    indices.forEach((index) => {
      const item = state.items[index];
      item.clusterId = clusterId;
      item.clusterSize = indices.length;
      item.clusterConfidence = confidence;
      item.clusteredAt = now;
    });
  });

  persist();
  render();
  renderClusterSummary();
  renderClusterDetail();

  if (multiGroupCount === 0) {
    showSystemMessage("현재 기준에서 충분히 유사한 후보 묶음을 찾지 못했습니다. 자동 병합은 하지 않았습니다.", "info");
  } else {
    showSystemMessage(`유사 토픽 ${multiGroupCount}개 묶음에서 후보 ${clusteredItemCount}개를 연결했습니다. 자동 병합/삭제는 하지 않습니다.`, "success");
  }
}

function topicSimilarity(left, right) {
  if (sameCanonicalUrl(left.url, right.url)) return 1;
  if (shareRelatedUrl(left, right)) return 0.98;

  const leftTitle = normalizeTitle(left.title);
  const rightTitle = normalizeTitle(right.title);
  if (!leftTitle || !rightTitle) return 0;
  if (leftTitle === rightTitle) return 1;

  const tokenScore = jaccard(tokenSet(leftTitle), tokenSet(rightTitle));
  const bigramScore = dice(ngramSet(leftTitle.replace(/\s+/g, ""), 2), ngramSet(rightTitle.replace(/\s+/g, ""), 2));
  const trigramScore = dice(ngramSet(leftTitle.replace(/\s+/g, ""), 3), ngramSet(rightTitle.replace(/\s+/g, ""), 3));
  const entityBoost = sharedDistinctiveTokenScore(leftTitle, rightTitle);

  return Math.min(1, Math.max(tokenScore, bigramScore * 0.9, trigramScore, entityBoost));
}

function shouldCluster(left, right, similarity) {
  if (similarity >= 0.98) return true;
  const shortest = Math.min(normalizeTitle(left.title).length, normalizeTitle(right.title).length);
  if (shortest <= 6) return similarity >= 0.84;
  if (shortest <= 12) return similarity >= 0.72;
  return similarity >= 0.62;
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\[\](){}<>【】「」『』“”‘’"'`~!@#$%^&*_=+|\\/:;,.?·…—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(normalized) {
  const stop = new Set(["관련", "논란", "화제", "속보", "오늘", "영상", "공개", "결국", "진짜", "현재", "대한", "에서", "으로", "하는", "했다", "까지", "this", "that", "with", "from", "official", "video"]);
  return new Set(normalized.split(/\s+/).filter((token) => token.length >= 2 && !stop.has(token)));
}

function ngramSet(value, size) {
  const set = new Set();
  if (!value) return set;
  if (value.length < size) {
    set.add(value);
    return set;
  }
  for (let i = 0; i <= value.length - size; i += 1) set.add(value.slice(i, i + size));
  return set;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((value) => { if (right.has(value)) intersection += 1; });
  return intersection / (left.size + right.size - intersection);
}

function dice(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((value) => { if (right.has(value)) intersection += 1; });
  return (2 * intersection) / (left.size + right.size);
}

function sharedDistinctiveTokenScore(leftTitle, rightTitle) {
  const left = tokenSet(leftTitle);
  const right = tokenSet(rightTitle);
  const shared = [...left].filter((token) => right.has(token));
  if (!shared.length) return 0;
  const longShared = shared.filter((token) => token.length >= 4);
  if (longShared.length >= 2) return 0.72;
  if (longShared.length === 1 && Math.min(left.size, right.size) <= 3) return 0.66;
  return 0;
}

function canonicalUrl(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "igshid", "si"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch (_) {
    return String(raw).trim();
  }
}

function sameCanonicalUrl(left, right) {
  const a = canonicalUrl(left);
  const b = canonicalUrl(right);
  return Boolean(a && b && a === b);
}

function shareRelatedUrl(left, right) {
  const leftUrls = new Set([left.url, ...(left.relatedSources || []).map((item) => item.url)].map(canonicalUrl).filter(Boolean));
  const rightUrls = [right.url, ...(right.relatedSources || []).map((item) => item.url)].map(canonicalUrl).filter(Boolean);
  return rightUrls.some((url) => leftUrls.has(url));
}

function chooseRepresentative(items) {
  return [...items].sort((a, b) => {
    const riskRank = { green: 0, yellow: 1, red: 2 };
    const sourceRank = { official: 0, "trend-signal": 1, "youtube-signal": 2, news: 3, social: 4, community: 5, unknown: 6 };
    const riskDiff = (riskRank[a.sourceRisk] ?? 9) - (riskRank[b.sourceRisk] ?? 9);
    if (riskDiff) return riskDiff;
    const sourceDiff = (sourceRank[a.sourceType] ?? 9) - (sourceRank[b.sourceType] ?? 9);
    if (sourceDiff) return sourceDiff;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  })[0];
}

function clusterConfidence(indices, pairScores) {
  let max = 0;
  for (let a = 0; a < indices.length; a += 1) {
    for (let b = a + 1; b < indices.length; b += 1) {
      const left = Math.min(indices[a], indices[b]);
      const right = Math.max(indices[a], indices[b]);
      max = Math.max(max, pairScores.get(`${left}:${right}`) || 0);
    }
  }
  return Math.round(max * 100);
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function renderClusterSummary() {
  const clusters = new Map();
  state.items.forEach((item) => {
    if (!item.clusterId || (item.clusterSize || 0) < 2) return;
    if (!clusters.has(item.clusterId)) clusters.set(item.clusterId, []);
    clusters.get(item.clusterId).push(item);
  });

  if (!clusters.size) {
    clusterSummary.hidden = true;
    clusterSummary.textContent = "";
    return;
  }

  const clusteredCount = [...clusters.values()].reduce((sum, items) => sum + items.length, 0);
  clusterSummary.hidden = false;
  clusterSummary.textContent = `유사 토픽 ${clusters.size}개 묶음 · 연결된 후보 ${clusteredCount}개 · 결과는 자동 병합이 아니라 조사 편의를 위한 휴리스틱입니다.`;
}

function renderClusterDetail() {
  const item = state.items.find((candidate) => candidate.id === selectedId);
  if (!item?.clusterId || (item.clusterSize || 0) < 2) {
    clusterDetailSection.hidden = true;
    clusterDetail.innerHTML = "";
    return;
  }

  const members = state.items.filter((candidate) => candidate.clusterId === item.clusterId);
  clusterDetailSection.hidden = false;
  clusterDetail.innerHTML = "";

  const meta = document.createElement("p");
  meta.className = "cluster-meta";
  meta.textContent = `${members.length}개 후보 · 최대 유사도 ${item.clusterConfidence ?? "-"}%`;
  clusterDetail.appendChild(meta);

  members.forEach((member) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `cluster-member${member.id === item.id ? " current" : ""}`;
    button.innerHTML = `<span></span><small>${escapeClusterHtml(member.sourceType || "unknown")} · ${escapeClusterHtml(member.sourceRisk?.toUpperCase() || "-")}</small>`;
    button.querySelector("span").textContent = member.title;
    button.addEventListener("click", () => {
      selectedId = member.id;
      render();
      queueMicrotask(renderClusterDetail);
    });
    clusterDetail.appendChild(button);
  });
}

function escapeClusterHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
