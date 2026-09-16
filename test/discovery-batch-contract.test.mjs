import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/features/discovery/demo/discovery-batch-contract.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const { assertBatch } = context.globalThis.ThreadsDiscoveryBatchContract;
const contractEraStart = 'discovery-batch-2026-09-15-1626.json';
const rawDir = new URL('../data/_raw_batches/', import.meta.url);
const batchFiles = fs.readdirSync(rawDir)
  .filter((name) => /^discovery-batch-.*\.json$/.test(name) && name >= contractEraStart)
  .sort()
  .map((name) => `../data/_raw_batches/${name}`);
assert.ok(batchFiles.length >= 3, 'expected current discovery batch coverage');
const batches = batchFiles.map((path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8')));
const contractBatches = batches.filter((batch) => batch?.candidates?.every((candidate) => candidate.manualReviewRequired === true && typeof candidate.engagementCanonical === 'boolean' && candidate.comfort));
assert.ok(contractBatches.length >= 3, 'expected contract-v2 discovery batch coverage');
for (const current of contractBatches) assert.equal(assertBatch(current), current);
const batch = contractBatches[0];

const clone = () => JSON.parse(JSON.stringify(batch));
let bad = clone(); bad.candidates[0].publicationAllowed = true;
assert.throws(() => assertBatch(bad), /not_fail_closed/);
bad = clone(); bad.candidates[0].manualReviewRequired = false;
assert.throws(() => assertBatch(bad), /not_fail_closed/);
bad = clone(); bad.candidates[0].engagementCanonical = false; bad.candidates[0].observedEngagement = { likes: 999 };
assert.throws(() => assertBatch(bad), /noncanonical_engagement/);
bad = clone(); bad.candidates[1].url = bad.candidates[0].url;
assert.throws(() => assertBatch(bad), /duplicate_url/);
bad = clone(); bad.candidates[0].comfort = 'BLOCK'; bad.candidates[0].viralDecision = 'APPROVE';
assert.throws(() => assertBatch(bad), /comfort_block/);
console.log(`Discovery batch safety contract regression tests passed for ${contractBatches.length} contract-v2 batches (${batchFiles.length - contractBatches.length} legacy batches skipped).`);
