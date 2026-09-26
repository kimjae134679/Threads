import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = fs.readdirSync(root).filter((name) => /\.(mjs|js)$/.test(name));
for (const directory of ["app", "scripts", "test"]) collect(directory);
files.push(...fs.readdirSync(path.join(root, "desktop")).filter((name) => name.endsWith(".cjs")).map((name) => "desktop/" + name));
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checks passed for ${files.length} JavaScript files.`);

function collect(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (/\.(mjs|js)$/.test(entry.name)) files.push(file);
  }
}
