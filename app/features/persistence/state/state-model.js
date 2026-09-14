(() => {
  const CURRENT_SCHEMA = 2;
  const OWNER = "04_REVIEW_PUBLISH";
  const ROLE_CHAIN = ["01_DISCOVERY", "02_EDITORIAL_SCORING", "03_PRODUCTION", OWNER, "05_EXPERIMENTS_ACCOUNTS"];
  const FORBIDDEN_KEY = /(password|passwd|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|cookie)/i;

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function text(value, max = 240) { return String(value || "").trim().slice(0, max); }

  function assertSafe(value, path = "root") {
    if (value == null || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach((entry, index) => assertSafe(entry, `${path}[${index}]`));
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) throw new Error(`persistence_secret_field:${path}.${key}`);
      assertSafe(entry, `${path}.${key}`);
    }
  }

  function normalizeControl(value = {}) {
    const rawStatus = value.status ?? value.state ?? "";
    return {
      status: ["running", "paused", "stopped"].includes(String(rawStatus).toLowerCase()) ? String(rawStatus).toLowerCase() : "running",
      options: clone(value.options || {}),
      history: Array.isArray(value.history) ? clone(value.history.slice(-100)) : [],
    };
  }

  function normalizeProfile(value = {}) {
    const id = text(value.id, 80);
    if (!id) return null;
    return {
      id,
      platform: text(value.platform, 40),
      name: text(value.name || value.label, 120),
      status: text(value.status, 40) || "planned",
      axis: text(value.axis, 160),
      primaryMetric: text(value.primaryMetric, 120),
    };
  }

  function normalizeProfiles(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(normalizeProfile).filter((entry) => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id); return true;
    });
  }

  function normalizeExperiment(value = {}) {
    const itemId = text(value.itemId || value.candidateId, 120);
    const accountId = text(value.accountId, 80);
    const hypothesisId = text(value.hypothesisId, 120);
    const variantId = text(value.variantId, 120);
    const goal = text(value.goal, 500);
    if (!itemId || !(accountId || hypothesisId || variantId || goal)) return null;
    return { itemId, accountId, hypothesisId, variantId, goal, updatedAt: text(value.updatedAt, 64) };
  }

  function normalizeExperiments(values = []) {
    const byItem = new Map();
    for (const value of Array.isArray(values) ? values : []) {
      const entry = normalizeExperiment(value);
      if (entry) byItem.set(entry.itemId, entry);
    }
    return [...byItem.values()];
  }

  function normalizeScope(value = {}) {
    const kind = text(value?.kind, 32);
    if (!kind) return { kind: "workspace", id: "default" };
    if (kind === "workspace") {
      const id = text(value?.id || "default", 80);
      if (id !== "default") throw new Error(`persistence_scope_invalid:${kind}:${id}`);
      return { kind: "workspace", id: "default" };
    }
    if (kind === "account") {
      const id = text(value.id, 80);
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id)) throw new Error(`persistence_scope_invalid:${id || "empty"}`);
      return { kind: "account", id };
    }
    throw new Error(`persistence_scope_invalid_kind:${kind}`);
  }

  function assertScope(snapshot = {}, namespace = "default") {
    const expected = namespace === "default" ? { kind: "workspace", id: "default" } : { kind: "account", id: namespace };
    const actual = normalizeScope(snapshot.scope || {});
    if (actual.kind !== expected.kind || actual.id !== expected.id) {
      throw new Error(`persistence_scope_mismatch:${actual.kind}:${actual.id}->${expected.kind}:${expected.id}`);
    }
    if (actual.kind === "account" && (snapshot.experiments || []).some((entry) => entry.accountId && entry.accountId !== actual.id)) {
      throw new Error(`persistence_scope_cross_account:${actual.id}`);
    }
    return actual;
  }

  function experimentsFromItems(items = []) {
    return normalizeExperiments((Array.isArray(items) ? items : []).map((item) => ({
      itemId: item?.id,
      ...(item?.experimentAssignment || {}),
    })));
  }

  function applyExperiments(appState = {}, experiments = []) {
    const next = clone(appState || { version: 1, items: [] });
    const map = new Map(normalizeExperiments(experiments).map((entry) => [entry.itemId, entry]));
    next.items = (Array.isArray(next.items) ? next.items : []).map((item) => {
      const entry = map.get(String(item?.id || ""));
      if (!entry) return item;
      const { itemId, ...assignment } = entry;
      return { ...item, experimentAssignment: assignment };
    });
    return next;
  }


  function makeSnapshot(appState = {}, schedulerControl = {}, meta = {}) {
    assertSafe(meta.profiles || [], "meta.profiles");
    assertSafe(meta.experiments || [], "meta.experiments");
    const items = Array.isArray(appState.items) ? clone(appState.items) : [];
    const snapshot = {
      schemaVersion: CURRENT_SCHEMA,
      exportedAt: meta.exportedAt || new Date().toISOString(),
      source: text(meta.source || "browser-session", 120),
      roleChain: [...ROLE_CHAIN],
      scope: normalizeScope(meta.scope || {}),
      app: { version: Number(appState.version) || 1, items },
      scheduler: normalizeControl(schedulerControl),
      profiles: normalizeProfiles(meta.profiles || []),
      experiments: normalizeExperiments(meta.experiments?.length ? meta.experiments : experimentsFromItems(items)),
    };
    assertSafe(snapshot);
    return snapshot;
  }

  function migrateSnapshot(input = {}) {
    const snapshot = clone(input || {});
    assertSafe(snapshot);
    const version = Number(snapshot.schemaVersion || 0);
    if (version > CURRENT_SCHEMA) throw new Error(`persistence_schema_newer:${version}`);
    if (version === 0) {
      const legacyState = snapshot.app || snapshot.state || snapshot;
      return makeSnapshot(
        { version: legacyState.version || 1, items: legacyState.items || [] },
        snapshot.scheduler || {},
        { exportedAt: snapshot.exportedAt, source: snapshot.source || "legacy-browser", profiles: snapshot.profiles || [], experiments: snapshot.experiments || [] }
      );
    }
    const app = {
      version: Number(snapshot.app?.version) || 1,
      items: Array.isArray(snapshot.app?.items) ? snapshot.app.items : [],
    };
    const migrated = {
      ...snapshot,
      schemaVersion: CURRENT_SCHEMA,
      roleChain: [...ROLE_CHAIN],
      scope: normalizeScope(snapshot.scope || {}),
      app,
      scheduler: normalizeControl(snapshot.scheduler || {}),
      profiles: normalizeProfiles(snapshot.profiles || []),
      experiments: normalizeExperiments(
        Array.isArray(snapshot.experiments) && snapshot.experiments.length ? snapshot.experiments : experimentsFromItems(app.items)
      ),
    };
    assertSafe(migrated);
    return migrated;
  }

  function restoreAppState(input = {}) {
    const snapshot = migrateSnapshot(input);
    return applyExperiments(snapshot.app, snapshot.experiments);
  }

  function makeScopedSnapshot(appState = {}, schedulerControl = {}, namespace = "default", meta = {}) {
    if (!namespace || namespace === "default") return makeSnapshot(appState, schedulerControl, { ...meta, scope: { kind: "workspace", id: "default" } });
    const full = makeSnapshot(appState, schedulerControl, meta);
    const experiments = full.experiments.filter((entry) => entry.accountId === namespace);
    const profiles = full.profiles.filter((entry) => entry.id === namespace);
    const scoped = {
      ...full,
      source: text(meta.source || "browser-account-scope", 120),
      scope: normalizeScope({ kind: "account", id: namespace }),
      app: { version: full.app.version, items: [] },
      scheduler: normalizeControl({}),
      profiles,
      experiments,
    };
    assertSafe(scoped); assertScope(scoped, namespace); return scoped;
  }

  function restoreScopedAppState(currentAppState = {}, input = {}, namespace = "default") {
    const snapshot = migrateSnapshot(input);
    if (!namespace || namespace === "default") { assertScope(snapshot, "default"); return restoreAppState(snapshot); }
    assertScope(snapshot, namespace);
    const next = clone(currentAppState || { version: 1, items: [] });
    const replacements = new Map(snapshot.experiments.map((entry) => [entry.itemId, entry]));
    next.items = (Array.isArray(next.items) ? next.items : []).map((item) => {
      const current = item?.experimentAssignment;
      const replacement = replacements.get(String(item?.id || ""));
      if (replacement) { const { itemId, ...assignment } = replacement; return { ...item, experimentAssignment: assignment }; }
      if (current?.accountId === namespace) { const copy = { ...item }; delete copy.experimentAssignment; return copy; }
      return item;
    });
    return next;
  }

  window.ThreadsPersistenceStateModel = {
    CURRENT_SCHEMA, OWNER, ROLE_CHAIN: [...ROLE_CHAIN], assertSafe, normalizeControl,
    normalizeProfile, normalizeProfiles, normalizeExperiment, normalizeExperiments, normalizeScope, assertScope,
    experimentsFromItems, applyExperiments, makeSnapshot, makeScopedSnapshot, migrateSnapshot, restoreAppState, restoreScopedAppState,
  };
})();
