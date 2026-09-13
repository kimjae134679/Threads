(() => {
  loadStyles();
  waitForLab();

  function waitForLab() {
    const lab = document.querySelector(".experiment-lab");
    if (lab) return initialize(lab);
    const observer = new MutationObserver(() => {
      const found = document.querySelector(".experiment-lab");
      if (!found) return;
      observer.disconnect();
      initialize(found);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initialize(lab) {
    if (lab.dataset.metadataReady === "true") return;
    lab.dataset.metadataReady = "true";

    const actions = lab.querySelector(".experiment-actions");
    const list = lab.querySelector("#experimentList");
    if (!actions || !list) return;

    const filterWrap = document.createElement("span");
    filterWrap.className = "experiment-meta-filters";
    filterWrap.innerHTML = `
      <select id="experimentFormatFilter" aria-label="콘텐츠 포맷 필터"><option value="all">모든 포맷</option></select>
      <select id="experimentHookFilter" aria-label="훅 유형 필터"><option value="all">모든 훅</option></select>
    `;
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "button ghost";
    exportButton.textContent = "실험 메타 CSV";
    exportButton.addEventListener("click", exportMetadataCsv);
    actions.prepend(filterWrap);
    actions.appendChild(exportButton);

    const formatFilter = filterWrap.querySelector("#experimentFormatFilter");
    const hookFilter = filterWrap.querySelector("#experimentHookFilter");
    formatFilter.addEventListener("change", applyFilters);
    hookFilter.addEventListener("change", applyFilters);

    const observer = new MutationObserver(() => queueMicrotask(patchCards));
    observer.observe(list, { childList: true, subtree: true });
    patchCards();

    function patchCards() {
      const rows = collectRows();
      syncOptions(formatFilter, rows.map((row) => row.strategy.contentFormat).filter(Boolean), "모든 포맷");
      syncOptions(hookFilter, rows.map((row) => row.strategy.hookType).filter(Boolean), "모든 훅");

      for (const card of list.querySelectorAll(".experiment-card[data-item-id][data-publication-id]")) {
        const row = findRow(card.dataset.itemId, card.dataset.publicationId, rows);
        if (!row) continue;
        card.dataset.contentFormat = row.strategy.contentFormat || "";
        card.dataset.hookType = row.strategy.hookType || "";
        let meta = card.querySelector(".experiment-meta-row");
        if (!meta) {
          meta = document.createElement("div");
          meta.className = "experiment-meta-row";
          const metricAnchor = card.querySelector(".experiment-metrics");
          if (metricAnchor) metricAnchor.insertAdjacentElement("beforebegin", meta);
          else card.appendChild(meta);
        }
        meta.innerHTML = metadataPills(row.strategy);
      }
      applyFilters();
    }

    function applyFilters() {
      const selectedFormat = formatFilter.value;
      const selectedHook = hookFilter.value;
      for (const card of list.querySelectorAll(".experiment-card")) {
        const formatOk = selectedFormat === "all" || card.dataset.contentFormat === selectedFormat;
        const hookOk = selectedHook === "all" || card.dataset.hookType === selectedHook;
        card.dataset.metaHidden = formatOk && hookOk ? "false" : "true";
      }
    }
  }

  function collectRows() {
    const rows = [];
    for (const item of state.items || []) {
      for (const publication of item.publications || []) {
        if (!publication?.platform || !publication?.id) continue;
        const assignment = publication.experiment || item.experimentAssignment || {};
        const strategy = publication.strategy || item.contentStrategy || {};
        rows.push({ item, publication, assignment, strategy });
      }
    }
    return rows;
  }

  function findRow(itemId, publicationId, rows) {
    return rows.find((row) => row.item.id === itemId && String(row.publication.id) === String(publicationId)) || null;
  }

  function metadataPills(strategy) {
    const pairs = [
      [strategy.contentFormat, "포맷"],
      [strategy.hookType, "훅"],
      [strategy.ctaType, "CTA"],
      [strategy.sourceAssetType, "자산"],
      [strategy.replyMode, "Reply"],
      [strategy.hasTopicTag ? "Topic tag" : "", ""],
    ].filter(([value]) => value);
    if (!pairs.length) return '<span class="pill neutral">제작 메타 미지정</span>';
    return pairs.map(([value, label]) => `<span class="pill neutral">${escapeHtml(label ? `${label} ${value}` : value)}</span>`).join("");
  }

  function syncOptions(select, values, allLabel) {
    const current = select.value || "all";
    const unique = [...new Set(values)].sort();
    select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>`;
    for (const value of unique) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    select.value = unique.includes(current) ? current : "all";
  }

  function exportMetadataCsv() {
    const rows = collectRows();
    const model = window.ThreadsExperimentModel;
    const normalized = rows.map((row) => {
      const assignment = row.assignment || {};
      const strategy = row.strategy || {};
      const metrics = model?.normalizeMetrics ? model.normalizeMetrics(row.publication.insights?.metrics || {}) : normalizeMetrics(row.publication.insights?.metrics || {});
      const business = row.publication.business || {};
      return { ...row, assignment, strategy, metrics, business };
    });

    const header = [
      "experiment_id","topic_id","account_id","hypothesis_id","variant_id","platform","platform_username","title",
      "content_format","hook_type","cta_type","source_asset_type","reply_mode","has_topic_tag","strategy_note",
      "published_at","views","likes","replies","reposts","quotes","shares","engagement_rate","clicks","conversions","revenue_krw"
    ];
    const body = normalized.map((row) => {
      const m = row.metrics;
      return [
        `${row.publication.platform}:${row.publication.id}`,
        row.item.id,
        row.assignment.accountId || "",
        row.assignment.hypothesisId || "",
        row.assignment.variantId || "",
        row.publication.platform,
        row.publication.platformAccount?.username || "",
        row.item.title || "",
        row.strategy.contentFormat || "",
        row.strategy.hookType || "",
        row.strategy.ctaType || "",
        row.strategy.sourceAssetType || "",
        row.strategy.replyMode || "",
        row.strategy.hasTopicTag ? "true" : "false",
        row.strategy.note || "",
        row.publication.publishedAt || "",
        m.views, m.likes, m.replies, m.reposts, m.quotes, m.shares,
        m.views > 0 ? (m.engagements / m.views).toFixed(6) : "",
        row.business.clicks ?? "",
        row.business.conversions ?? "",
        row.business.revenue ?? "",
      ];
    });
    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `threads-experiment-metadata-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function normalizeMetrics(metrics) {
    const number = (key) => Number(metrics?.[key]) || 0;
    const result = {
      views: number("views"), likes: number("likes"), replies: number("replies"), reposts: number("reposts"), quotes: number("quotes"), shares: number("shares"),
    };
    result.engagements = result.likes + result.replies + result.reposts + result.quotes + result.shares;
    return result;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function loadStyles() {
    if (document.querySelector('link[href="./experiment-metadata.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./experiment-metadata.css";
    document.head.appendChild(link);
  }
})();
