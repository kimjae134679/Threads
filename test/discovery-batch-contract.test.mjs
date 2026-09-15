import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/features/discovery/demo/discovery-batch-contract.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const { assertBatch } = context.globalThis.ThreadsDiscoveryBatchContract;
const batch = JSON.parse(fs.readFileSync(new URL('../data/discovery-batch-2026-09-15-1626.json', import.meta.url), 'utf8'));
assert.equal(assertBatch(batch), batch);

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
console.log('Discovery batch safety contract regression tests passed.');
