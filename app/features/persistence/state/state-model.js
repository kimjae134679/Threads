(() => {
  const CURRENT_SCHEMA = 1;
  const OWNER = "04_REVIEW_PUBLISH";
  const FORBIDDEN_KEY = /(password|passwd|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|cookie)/i;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function assertSafe(value, path = "root") {
    if (value == null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => assertSafe(entry, `${path}[${index}]`));
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) throw new Error(`persistence_secret_field:${path}.${key}`);
      assertSafe(entry, `${path}.${key}`);
    }
  }

  function normalizeControl(value = {}) {
    const status = ["running", "paused", "stopped"].includes(String(value.status || "").toLowerCase())
      ? String(value.status).toLowerCase() : "running";
    return {
      status,
      options: clone(value.options || {}),
      history: Array.isArray(value.history) ? clone(value.history.slice(-100)) : [],
    };
  }

  function makeSnapshot(appState = {}, schedulerControl = {}, meta = {}) {
    const items = Array.isArray(appState.items) ? clone(appState.items) : [];
    const snapshot = {
      schemaVersion: CURRENT_SCHEMA,
      exportedAt: meta.exportedAt || new Date().toISOString(),
      source: String(meta.source || "browser-session"),
      roleChain: ["01_DISCOVERY", "02_EDITORIAL_SCORING", "03_PRODUCTION", OWNER, "05_EXPERIMENTS_ACCOUNTS"],
      app: { version: Number(appState.version) || 1, items },
      scheduler: normalizeControl(schedulerControl),
      profiles: Array.isArray(meta.profiles) ? clone(meta.profiles) : [],
      experiments: Array.isArray(meta.experiments) ? clone(meta.experiments) : [],
    };
    assertSafe(snapshot);
    return snapshot;
  }

  function migrateSnapshot(input = {}) {
    const snapshot = clone(input || {});
    const version = Number(snapshot.schemaVersion || 0);
    if (version > CURRENT_SCHEMA) throw new Error(`persistence_schema_newer:${version}`);
    if (version === 0) {
      const legacyState = snapshot.app || snapshot.state || snapshot;
      return makeSnapshot(
        { version: legacyState.version || 1, items: legacyState.items || [] },
        snapshot.scheduler || {},
        { exportedAt: snapshot.exportedAt, source: snapshot.source || "legacy-browser" }
      );
    }
    snapshot.app = {
      version: Number(snapshot.app?.version) || 1,
      items: Array.isArray(snapshot.app?.items) ? snapshot.app.items : [],
    };
    snapshot.scheduler = normalizeControl(snapshot.scheduler || {});
    snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : [];
    snapshot.experiments = Array.isArray(snapshot.experiments) ? snapshot.experiments : [];
    snapshot.schemaVersion = CURRENT_SCHEMA;
    snapshot.roleChain = ["01_DISCOVERY", "02_EDITORIAL_SCORING", "03_PRODUCTION", OWNER, "05_EXPERIMENTS_ACCOUNTS"];
    assertSafe(snapshot);
    return snapshot;
  }

  function restoreAppState(input = {}) {
    const snapshot = migrateSnapshot(input);
    return clone(snapshot.app);
  }

  window.ThreadsPersistenceStateModel = {
    CURRENT_SCHEMA,
    OWNER,
    assertSafe,
    normalizeControl,
    makeSnapshot,
    migrateSnapshot,
    restoreAppState,
  };
})();
