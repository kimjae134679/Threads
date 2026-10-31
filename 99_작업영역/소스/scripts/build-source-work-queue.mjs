import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async p => JSON.parse(await readFile(join(root,p),'utf8'));
const inventory = await read('data/_system/source-material-inventory.json');
const g = inventory.groups, jev = new Set(g.jevResults), usedJev = new Set(), usedBundles = new Set();
const bundleFolders = [...g.discoveryBundles.map(id=>'01_DISCOVERY/data/candidate_bundles/'+id),
  ...g.legacyBundles.map(id=>'data/candidate_bundles/'+id)];
const manifests = await Promise.all(bundleFolders.map(async dir => {
  try { return {dir, data: await read(dir+'/manifest.json')}; }
  catch { return {dir, data:null}; }
}));
const entries = [...g.legacyCandidates,...g.discoveryCandidateNotes].sort().map(candidate => {
  const stem = candidate.split('/').pop().replace(/\.md$/,'');
  const jevResult = 'data/jev_results/'+stem+'.jev.json';
  const bundleFolders = manifests.filter(x => x.data?.legacyCandidate === candidate ||
    x.data?.provenance?.legacyCandidate === candidate).map(x=>x.dir);
  for (const dir of bundleFolders) usedBundles.add(dir);
  if (jev.has(jevResult)) usedJev.add(jevResult);
  return {candidate,jevResult:jev.has(jevResult)?jevResult:null,bundleFolders,
    sourceStatus:bundleFolders.length?'needs_verbatim_source_review':'needs_verbatim_source',conversionStatus:'not_converted',publicationAllowed:false};
});
const queue = {schema:'threads-source-work-queue-v1',baseCommit:inventory.baseCommit,
  scope:'existing materials only; no new discovery',
  totals:{candidates:entries.length,withMatchingJev:usedJev.size,unmatchedJev:jev.size-usedJev.size,
    bundleFolderRecords:manifests.length,linkedBundleFolderRecords:usedBundles.size,
    unlinkedBundleFolderRecords:manifests.length-usedBundles.size,converted:0},
  entries,unmatchedJevResults:[...jev].filter(x=>!usedJev.has(x)).sort(),
  unlinkedBundleFolders:bundleFolders.filter(x=>!usedBundles.has(x)).sort(),
  testOnlyFolders:g.testOnlyFolders,generatedBatchFiles:g.generatedBatches};
if (process.argv.includes('--write')) {
  await writeFile(join(root,'data/_system/source-work-queue.json'),JSON.stringify(queue,null,2)+'\n');
  console.log('Source work queue written:',entries.length);
} else {
  console.log(JSON.stringify(queue.totals,null,2));
  console.log('Use --write to refresh metadata. No original content or approval status is changed.');
}
