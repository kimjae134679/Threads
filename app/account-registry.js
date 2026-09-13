(() => {
  const accounts = [
    {
      id: "TH-A",
      platform: "threads",
      status: "planned",
      axis: "Hot / Issue",
      name: "Hot / Issue",
      positioning: "지금 뜨는 이슈를 빠르게 정리하고 왜 중요한지 설명",
      primaryMetric: "engagement_rate",
    },
    {
      id: "TH-B",
      platform: "threads",
      status: "planned",
      axis: "Useful / Product / Money",
      name: "Useful / Product / Money",
      positioning: "AI 도구·앱·제품을 비교하고 실제 선택 기준 제공",
      primaryMetric: "clicks / conversions",
    },
    {
      id: "TH-C",
      platform: "threads",
      status: "planned",
      axis: "Internet Story / Culture",
      name: "Internet Story / Culture",
      positioning: "인터넷 사연을 검증·익명화해 쟁점과 교훈 중심으로 재구성",
      primaryMetric: "replies / shares",
    },
  ];

  const byId = new Map(accounts.map((account) => [account.id, account]));

  window.ThreadsAccountRegistry = Object.freeze({
    list() {
      return accounts.map((account) => ({ ...account }));
    },
    get(id) {
      const account = byId.get(String(id || ""));
      return account ? { ...account } : null;
    },
    label(id) {
      const account = byId.get(String(id || ""));
      return account ? `${account.id} · ${account.name}` : String(id || "미배정");
    },
  });
})();
