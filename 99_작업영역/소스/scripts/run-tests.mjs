import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = fs.readdirSync(new URL("../test/", import.meta.url))
  .filter((name) => name.endsWith(".test.mjs")).sort();
// Some integration tests share ports, so run suites sequentially.
for (const file of files) {
  const result = spawnSync(process.execPath, [`test/${file}`], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`All ${files.length} test suites passed.`);
