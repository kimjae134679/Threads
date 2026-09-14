import { JsonStateStoreRegistry, normalizeStateNamespace } from "./persistence.mjs";
import { SqliteStateStoreRegistry } from "./persistence-sqlite.mjs";

export async function migrateJsonNamespacesToSqlite({ jsonPath, sqlitePath, namespaces = ["default"], overwrite = false } = {}) {
  if (!jsonPath || !sqlitePath) throw new Error("persistence_migration_paths_required");
  const source = new JsonStateStoreRegistry(jsonPath);
  const target = new SqliteStateStoreRegistry(sqlitePath);
  const results = [];
  try {
    for (const rawNamespace of namespaces) {
      const namespace = normalizeStateNamespace(rawNamespace);
      const record = await source.store(namespace).read();
      if (!record.snapshot) {
        results.push({ namespace, status: "skipped-empty", revision: 0 });
        continue;
      }
      const imported = await target.importRecord(namespace, record, { overwrite });
      results.push({ namespace, status: "imported", revision: imported.revision, updatedAt: imported.updatedAt });
    }
    return { backend: "sqlite", migrationVersion: target.migrationVersion(), results };
  } finally {
    target.close();
  }
}
