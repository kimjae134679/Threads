const youtubeButton = document.querySelector("#youtubeBtn");
const youtubeConnectorStatus = document.querySelector("#youtubeConnectorStatus");

youtubeButton.addEventListener("click", importYouTubeMostPopular);
loadConnectorStatus();

async function loadConnectorStatus() {
  youtubeButton.disabled = true;
  try {
    const response = await fetch("/api/connectors", { cache: "no-store" });
    const payload = await response.json();
    const connector = payload?.connectors?.youtubeMostPopularKr;
    if (!response.ok || !payload.ok || !connector) throw new Error("connector_status_unavailable");

    if (connector.configured) {
      youtubeConnectorStatus.textContent = "연결됨";
      youtubeConnectorStatus.className = "ready-text";
      youtubeButton.disabled = false;
      youtubeButton.title = connector.note || "";
    } else {
      youtubeConnectorStatus.textContent = "API 키 필요";
      youtubeConnectorStatus.className = "blocked-text";
      youtubeButton.disabled = true;
      youtubeButton.title = "서버 실행 전에 YOUTUBE_API_KEY 환경변수를 설정하세요.";
    }
  } catch (error) {
    youtubeConnectorStatus.textContent = "서버 실행 필요";
    youtubeConnectorStatus.className = "blocked-text";
    youtubeButton.disabled = true;
    youtubeButton.title = "저장소 루트에서 npm start로 실행하세요.";
  }
}

async function importYouTubeMostPopular() {
  if (youtubeButton.disabled) return;
  const previousText = youtubeButton.textContent;
  youtubeButton.disabled = true;
  youtubeButton.textContent = "가져오는 중…";
  showSystemMessage("YouTube KR mostPopular 메타데이터를 확인하고 있습니다.", "info");

  try {
    const response = await fetch("/api/trends/youtube?region=KR&max=20", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Array.isArray(payload.items)) {
      throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
    }

    const existingKeys = new Set(state.items.map((item) => item.sourceKey).filter(Boolean));
    const newItems = payload.items
      .filter((video) => !existingKeys.has(`youtube:${video.id}`))
      .map((video) => youtubeToCandidate(video, payload));

    if (newItems.length) {
      state.items = [...newItems, ...state.items];
      selectedId = newItems[0].id;
      persist();
      render();
    }

    const skipped = payload.items.length - newItems.length;
    showSystemMessage(
      `YouTube KR에서 ${payload.items.length}개를 확인해 ${newItems.length}개를 새로 추가했습니다.${skipped ? ` 중복 ${skipped}개는 건너뛰었습니다.` : ""} 이 목록은 과거 전체 Trending과 같은 의미가 아닙니다.`,
      "success"
    );
  } catch (error) {
    showSystemMessage(`YouTube 데이터를 가져오지 못했습니다. (${error.message})`, "error");
  } finally {
    youtubeButton.disabled = false;
    youtubeButton.textContent = previousText;
    loadConnectorStatus();
  }
}

function youtubeToCandidate(video, payload) {
  const viewCount = formatCount(video.statistics?.viewCount);
  const likeCount = formatCount(video.statistics?.likeCount);
  const commentCount = formatCount(video.statistics?.commentCount);
  const lines = [
    `YouTube mostPopular KR 피드 순번: ${video.rank ?? "-"}`,
    `채널: ${video.channelTitle || "-"}`,
    `게시: ${video.publishedAt || "-"}`,
    `조회수: ${viewCount}`,
    `좋아요: ${likeCount}`,
    `댓글: ${commentCount}`,
    `범위 주의: ${payload.scopeNote || "mostPopular은 전체 YouTube 유행과 동일한 지표가 아닙니다."}`,
    "※ 영상/썸네일/음원 자체의 재사용 권리를 의미하지 않습니다. 아이디어·주제 신호로만 사용하고 독자 콘텐츠를 만드세요.",
  ];

  return {
    id: makeId(),
    sourceKey: `youtube:${video.id}`,
    title: video.title,
    url: video.url || "",
    kind: "breaking",
    sourceType: "youtube-signal",
    sourceRisk: "green",
    sourceReason: "YouTube Data API의 공개 영상 메타데이터 신호입니다. 메타데이터 수집과 영상 자산의 재사용 권리는 별개입니다.",
    collectionAllowed: true,
    note: lines.join("\n"),
    signals: {
      freshness: freshnessFromDate(video.publishedAt),
      velocity: null,
      audience: null,
      originalityRoom: null,
      revenueFit: null,
    },
    score: null,
    scoreBasis: "needs_human_review",
    platforms: ["YouTube Shorts", "Instagram Reels", "TikTok", "Threads"],
    status: "inbox",
    relatedSources: [{
      title: video.title,
      url: video.url || "",
      source: video.channelTitle || "YouTube",
      sourceType: "youtube",
    }],
    sourceMeta: {
      provider: payload.source || "YouTube Data API",
      geo: payload.region || "KR",
      rank: video.rank ?? null,
      videoId: video.id,
      channelId: video.channelId || "",
      viewCount: video.statistics?.viewCount || "",
      likeCount: video.statistics?.likeCount || "",
      commentCount: video.statistics?.commentCount || "",
      publishedAt: video.publishedAt || "",
      collectedAt: payload.collectedAt || new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function formatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value || "-";
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
}
