import fs from "node:fs/promises";
import path from "node:path";

export const STATE_SCHEMA_VERSION = 1;
const FORBIDDEN_KEY = /(password|passwd|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|cookie)/i;

export function assertNoSecrets(value, currentPath = "root") {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${currentPath}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      const error = new Error(`persistence_secret_field:${currentPath}.${key}`);
      error.code = "persistence_secret_field";
      error.status = 400;
      throw error;
    }
    assertNoSecrets(entry, `${currentPath}.${key}`);
  }
}

export function normalizeEnvelope(input = {}) {
  const schemaVersion = Number(input.schemaVersion || 0);
  if (schemaVersion !== STATE_SCHEMA_VERSION) {
    const error = new Error(`unsupported_persistence_schema:${schemaVersion}`);
    error.code = "unsupported_persistence_schema";
    error.status = 400;
    throw error;
  }
  const envelope = JSON.parse(JSON.stringify(input));
  assertNoSecrets(envelope);
  return envelope;
}

export class JsonStateStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
  }

  async read() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const record = JSON.parse(raw);
      return {
        revision: Number(record.revision) || 0,
        updatedAt: record.updatedAt || null,
        snapshot: normalizeEnvelope(record.snapshot || {}),
      };
    } catch (error) {
      if (error?.code === "ENOENT") return { revision: 0, updatedAt: null, snapshot: null };
      throw error;
    }
  }

  async write(snapshot, expectedRevision = null) {
    const safe = normalizeEnvelope(snapshot);
    const current = await this.read();
    if (expectedRevision != null && Number(expectedRevision) !== current.revision) {
      const error = new Error(`persistence_revision_conflict:${current.revision}`);
      error.code = "persistence_revision_conflict";
      error.status = 409;
      error.currentRevision = current.revision;
      throw error;
    }
    const next = {
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      snapshot: safe,
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempPath, this.filePath);
    return next;
  }
}
