import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'data/_system/source-material-inventory.json');
const ignored = new Set(['.git', 'node_modules', 'runtime']);
async function collect(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) && entry.isDirectory()) continue;
    const target = join(dir, entry.name);
    if (entry.isDirectory()) await collect(target, found);
    else if (entry.isFile()) found.push(relative(root, target).replaceAll('\\', '/'));
  }
  return found;
}
const files = (await collect(root)).sort();
const prefix = s => files.filter(p => p.startsWith(s));
const folderIds = s => [...new Set(prefix(s).map(p => p.slice(s.length).split('/')[0]))].sort();
const groups = {
  legacyCandidates: prefix('data/candidates/').filter(p => p.endsWith('.md') && !p.endsWith('/README.md')),
  jevResults: prefix('data/jev_results/').filter(p => p.endsWith('.jev.json')),
  generatedBatches: prefix('data/candidate_batches/').filter(p => p.endsWith('.md') && !p.endsWith('/README.md')),
  discoveryBundles: folderIds('01_DISCOVERY/data/candidate_bundles/'),
  legacyBundles: folderIds('data/candidate_bundles/'),
  testOnlyFolders: folderIds('03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/'),
  sourcePackages: folderIds('data/source-packages/')
};
const inventory = {
  schema: 'threads-source-material-inventory-v1', repo: 'kimjae134679/Threads',
  baseCommit: 'working-tree', note: 'Paths only. Never infer verbatim text or conversion from metadata.',
  counts: Object.fromEntries(Object.entries(groups).map(([k,v]) => [k,v.length])),
  duplicateBundleIdsAcrossRoots: groups.discoveryBundles.filter(id => groups.legacyBundles.includes(id)),
  groups, conversion: { converted: [], status: 'inventory_only' }
};
if (process.argv.includes('--write')) {
  await mkdir(dirname(output), { recursive:true });
  await writeFile(output, JSON.stringify(inventory, null, 2) + '\n');
  console.log('Inventory written:', output);
} else {
  let tracked = null;
  try { tracked = JSON.parse(await readFile(output, 'utf8')); } catch {}
  console.log(JSON.stringify({ current:inventory.counts, tracked:tracked?.counts || null,
    duplicates:inventory.duplicateBundleIdsAcrossRoots, uniqueBundleIds:new Set([...groups.discoveryBundles,...groups.legacyBundles]).size },null,2));
  console.log('Use --write to refresh the index. Existing source files are never modified.');
}
