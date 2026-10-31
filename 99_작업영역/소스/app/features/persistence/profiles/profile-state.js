(() => {
  const model = window.ThreadsPersistenceStateModel;
  const registry = window.ThreadsAccountRegistry;
  if (!model || !registry) return;

  const STORAGE_KEY = "threads_account_profile_state_v1";
  const STATUSES = new Set(["planned", "testing", "active", "paused", "retired"]);

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function text(value, max = 500) { return String(value || "").trim().slice(0, max); }

  function knownIds() {
    return new Set((registry.list?.() || []).map((entry) => entry.id));
  }

  function normalize(value = {}) {
    model.assertSafe(value, "profileState");
    const id = text(value.id, 80);
    if (!id || !knownIds().has(id)) throw new Error(`profile_state_unknown_account:${id || "empty"}`);
    const status = text(value.status, 40).toLowerCase();
    return {
      id,
      enabled: value.enabled !== false,
      status: STATUSES.has(status) ? status : "planned",
      notes: text(value.notes, 500),
      updatedAt: text(value.updatedAt, 64),
    };
  }

  function normalizeMany(values = [], options = {}) {
    const byId = new Map();
    for (const value of Array.isArray(values) ? values : []) {
      try {
        const entry = normalize(value);
        byId.set(entry.id, entry);
      } catch (error) {
        if (!options.ignoreInvalid) throw error;
      }
    }
    return [...byId.values()];
  }

  function readStored() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return normalizeMany(raw, { ignoreInvalid: true });
    } catch (_) { return []; }
  }

  function writeStored(values = []) {
    const normalized = normalizeMany(values);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function get(id) {
    const account = registry.get?.(id);
    if (!account) return null;
    const stored = readStored().find((entry) => entry.id === id);
    return stored || { id, enabled: true, status: account.status || "planned", notes: "", updatedAt: "" };
  }

  function update(id, patch = {}) {
    model.assertSafe(patch, "profileState.patch");
    const current = get(id);
    if (!current) throw new Error(`profile_state_unknown_account:${id || "empty"}`);
    const next = normalize({ ...current, ...patch, id, updatedAt: new Date().toISOString() });
    const values = readStored().filter((entry) => entry.id !== id);
    values.push(next);
    writeStored(values);
    return clone(next);
  }

  function canAssign(id) {
    const entry = get(id);
    return Boolean(entry && entry.enabled && entry.status !== "paused" && entry.status !== "retired");
  }

  function replaceAll(values = []) {
    return clone(writeStored(values));
  }

  function applyScoped(id, values = []) {
    if (!registry.get?.(id)) throw new Error(`profile_state_unknown_account:${id || "empty"}`);
    const incoming = normalizeMany(values);
    if (incoming.some((entry) => entry.id !== id)) throw new Error(`profile_state_scope_mismatch:${id}`);
    const rest = readStored().filter((entry) => entry.id !== id);
    if (incoming[0]) rest.push(incoming[0]);
    writeStored(rest);
    return clone(get(id));
  }

  window.ThreadsPersistenceProfileState = {
    STORAGE_KEY,
    STATUSES: [...STATUSES],
    normalize,
    normalizeMany,
    listStored: () => clone(readStored()),
    get,
    update,
    canAssign,
    replaceAll,
    applyScoped,
  };
})();


