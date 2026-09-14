import path from "node:path";
import process from "node:process";
import { migrateJsonNamespacesToSqlite } from "../persistence-migrate.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}
if (!args.apply) {
  console.error("Refusing to mutate persistence without explicit --apply.");
  printUsage();
  process.exit(2);
}
if (!args.fromJson || !args.toSqlite) {
  console.error("Both --from-json and --to-sqlite are required.");
  printUsage();
  process.exit(2);
}

const namespaces = String(args.namespaces || "default")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const result = await migrateJsonNamespacesToSqlite({
  jsonPath: path.resolve(args.fromJson),
  sqlitePath: path.resolve(args.toSqlite),
  namespaces,
  overwrite: Boolean(args.overwrite),
});
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--overwrite") parsed.overwrite = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (["--from-json", "--to-sqlite", "--namespaces"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing_cli_value:${arg}`);
      parsed[arg === "--from-json" ? "fromJson" : arg === "--to-sqlite" ? "toSqlite" : "namespaces"] = value;
      index += 1;
    } else {
      throw new Error(`unknown_cli_argument:${arg}`);
    }
  }
  return parsed;
}

function printUsage() {
  console.log("Usage: node scripts/migrate-persistence.mjs --from-json <state.json> --to-sqlite <state.sqlite> [--namespaces default,TH-A] --apply [--overwrite]");
  console.log("Safety: no mutation occurs unless --apply is present; existing SQLite namespaces are preserved unless --overwrite is also explicit.");
}
