(function () {
  "use strict";

  async function syncRepoCandidates() {
    try {
      const response = await fetch("/api/repo-candidates", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !Array.isArray(payload.items)) return;

      const incomingPaths = new Set(payload.items.map((item) => item.repoCandidatePath).filter(Boolean));
      const existingByPath = new Map(
        (state.items || []).filter((item) => item.repoCandidatePath).map((item) => [item.repoCandidatePath, item])
      );

      const merged = [];
      let added = 0;
      let refreshed = 0;

      for (const incoming of payload.items) {
        const current = existingByPath.get(incoming.repoCandidatePath);
        if (!current) {
          merged.push(incoming);
          added += 1;
          continue;
        }
        merged.push({
          ...incoming,
          ...current,
          repoSynced: true,
          repoCandidatePath: incoming.repoCandidatePath,
          sourceMeta: {
            ...(incoming.sourceMeta || {}),
            ...(current.sourceMeta || {}),
            processingRank: incoming.sourceMeta?.processingRank,
            processingTotal: incoming.sourceMeta?.processingTotal,
            processingStage: incoming.sourceMeta?.processingStage,
            candidateStage: incoming.sourceMeta?.candidateStage,
            assetStage: incoming.sourceMeta?.assetStage,
            publishStage: incoming.sourceMeta?.publishStage,
            provenanceUrl: incoming.sourceMeta?.provenanceUrl,
            exactUrlVerified: incoming.sourceMeta?.exactUrlVerified,
            publicationAllowed: false,
          },
          scheduler: {
            ...(incoming.scheduler || {}),
            ...(current.scheduler || {}),
            manualRank: current.scheduler?.manualRank ?? incoming.scheduler?.manualRank,
          },
        });
        refreshed += 1;
      }

      const nonRepo = (state.items || []).filter((item) => !item.repoSynced && !item.repoCandidatePath);
      const staleRepoCount = (state.items || []).filter(
        (item) => item.repoSynced && item.repoCandidatePath && !incomingPaths.has(item.repoCandidatePath)
      ).length;

      state.items = [...merged, ...nonRepo];
      if (!selectedId && merged.length) selectedId = merged[0].id;
      persist();
      render();

      const message = `저장소 후보 ${payload.count}개 동기화 · 신규 ${added}개 · 기존 ${refreshed}개 갱신${staleRepoCount ? ` · 삭제/이동된 ${staleRepoCount}개 정리` : ""}. 처리순번은 파일명 기준으로 유지됩니다.`;
      showSystemMessage(message, "success");
    } catch (error) {
      console.warn("저장소 후보 자동 동기화 실패", error);
    }
  }

  syncRepoCandidates();
})();
