(() => {
  const root = document.documentElement;
  const modules = [
    {
      id: "production-strategy",
      scripts: [
        "./publication-strategy-snapshot.js",
        "./content-strategy.js",
      ],
    },
    {
      id: "experiment-metadata",
      scripts: ["./experiment-metadata.js"],
    },
    {
      id: "themes",
      styles: ["./features/themes/theme-review.css"],
      scripts: [
        "./features/themes/theme-taxonomy.js",
        "./features/themes/theme-model.js",
        "./features/themes/theme-review.js",
      ],
    },
    {
      id: "discovery-sources",
      styles: ["./features/discovery/sources/source-review.css"],
      scripts: [
        "./features/discovery/sources/source-registry.js",
        "./features/discovery/sources/source-model.js",
        "./features/discovery/sources/source-normalization-sync.js",
        "./features/discovery/sources/source-review.js",
      ],
    },
    {
      id: "viral-finder",
      scripts: ["./viral-model.js", "./viral-review.js"],
    },
    {
      id: "community-cards",
      scripts: ["./card-story-model.js", "./card-factory.js"],
    },
    {
      id: "warehouse",
      scripts: ["./warehouse-model.js", "./content-warehouse.js"],
    },
  ];

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  function start() {
    bootstrap().catch((error) => {
      console.error("Feature bootstrap failed", error);
      root.dataset.featureBootstrap = "error";
      root.dataset.featureBootstrapError = String(error?.message || error);
    });
  }

  async function bootstrap() {
    root.dataset.featureBootstrap = "loading";
    for (const module of modules) {
      for (const href of module.styles || []) ensureStyle(href, module.id);
      for (const src of module.scripts || []) await ensureScript(src, module.id);
      root.dataset[`feature${toDatasetKey(module.id)}`] = "ready";
    }
    root.dataset.featureBootstrap = "ready";
    document.dispatchEvent(new CustomEvent("threads:features-ready", {
      detail: { modules: modules.map((module) => module.id) },
    }));
  }

  function ensureStyle(href, featureId) {
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find((node) => normalizeUrl(node.getAttribute("href")) === normalizeUrl(href));
    if (existing) return existing;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.feature = featureId;
    document.head.appendChild(link);
    return link;
  }

  function ensureScript(src, featureId) {
    const normalized = normalizeUrl(src);
    const existing = [...document.scripts]
      .find((node) => normalizeUrl(node.getAttribute("src")) === normalized);
    if (existing) {
      if (existing.dataset.loaded === "true" || existing.readyState === "complete") return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(existing), { once: true });
        existing.addEventListener("error", () => reject(new Error(`feature_script_failed:${src}`)), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.feature = featureId;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve(script);
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`feature_script_failed:${src}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  function normalizeUrl(value) {
    if (!value) return "";
    try { return new URL(value, document.baseURI).href; } catch (_) { return String(value); }
  }

  function toDatasetKey(value) {
    return String(value || "")
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }
})();
