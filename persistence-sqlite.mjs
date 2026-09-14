import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { normalizeEnvelope, normalizeStateNamespace } from "./persistence.mjs";

export const SQLITE_SCHEMA_VERSION = 1;

function conflictError(revision) {
  const error = new Error(`persistence_revision_conflict:${revision}`);
  error.code = "persistence_revision_conflict";
  error.status = 409;
  error.currentRevision = revision;
  return error;
}

export class SqliteStateStoreRegistry {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  migrate() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
    const row = this.db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    const current = Number(row?.version) || 0;
    if (current > SQLITE_SCHEMA_VERSION) throw new Error(`persistence_db_schema_newer:${current}`);
    if (current < 1) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS state_records (
        namespace TEXT PRIMARY KEY,
        revision INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        snapshot_json TEXT NOT NULL
      )`);
      this.db.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(1, new Date().toISOString());
    }
  }

  migrationVersion() {
    const row = this.db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    return Number(row?.version) || 0;
  }

  store(namespace = "default") {
    return new SqliteNamespaceStore(this.db, normalizeStateNamespace(namespace));
  }

  close() {
    this.db.close();
  }
}

class SqliteNamespaceStore {
  constructor(db, namespace) {
    this.db = db;
    this.namespace = namespace;
  }

  async read() {
    const row = this.db.prepare("SELECT revision, updated_at, snapshot_json FROM state_records WHERE namespace = ?").get(this.namespace);
    if (!row) return { revision: 0, updatedAt: null, snapshot: null };
    return {
      revision: Number(row.revision) || 0,
      updatedAt: row.updated_at || null,
      snapshot: normalizeEnvelope(JSON.parse(row.snapshot_json)),
    };
  }

  async write(snapshot, expectedRevision = null) {
    const safe = normalizeEnvelope(snapshot);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT revision FROM state_records WHERE namespace = ?").get(this.namespace);
      const currentRevision = Number(row?.revision) || 0;
      if (expectedRevision != null && Number(expectedRevision) !== currentRevision) throw conflictError(currentRevision);
      const nextRevision = currentRevision + 1;
      const updatedAt = new Date().toISOString();
      this.db.prepare(`INSERT INTO state_records(namespace, revision, updated_at, snapshot_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(namespace) DO UPDATE SET revision=excluded.revision, updated_at=excluded.updated_at, snapshot_json=excluded.snapshot_json`)
        .run(this.namespace, nextRevision, updatedAt, JSON.stringify(safe));
      this.db.exec("COMMIT");
      return { revision: nextRevision, updatedAt, snapshot: safe };
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }
}
