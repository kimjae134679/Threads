(() => {
  document.addEventListener("change", (event) => {
    if (!event.target.matches?.("#draftReviewStatus")) return;
    const item = state.items.find((candidate) => candidate.id === selectedId);
    if (!item) return;
    item.updatedAt = new Date().toISOString();
    if (item.publishApproval) delete item.publishApproval;
    persist();
    showSystemMessage("Draft 검토 상태가 변경되어 기존 게시 승인을 무효화했습니다. 필요하면 다시 승인하세요.", "info");
  });
})();
