'use strict';

// TEMP TEST ONLY / DO NOT PUBLISH.
// Synthetic contract tests only. This does NOT prove an actual browser download/restore round trip.
const { validateFreshPageRestore } = require('./TEMP_TEST_ONLY_validate_fresh_page_restore.js');

const digest = 'sha256:synthetic-temp-test-only';
const cases = [
  ['matching digests pass', { temporaryTestOnly:true, publicationAllowed:false, approvalDigest:digest, restoredApprovedDigest:digest, executionDigest:digest }, true],
  ['publication flag fails closed', { temporaryTestOnly:true, publicationAllowed:true, approvalDigest:digest, restoredApprovedDigest:digest, executionDigest:digest }, false],
  ['restore mismatch fails closed', { temporaryTestOnly:true, publicationAllowed:false, approvalDigest:digest, restoredApprovedDigest:'sha256:mismatch', executionDigest:'sha256:mismatch' }, false],
  ['execution mismatch fails closed', { temporaryTestOnly:true, publicationAllowed:false, approvalDigest:digest, restoredApprovedDigest:digest, executionDigest:'sha256:mismatch' }, false]
];

let failed = 0;
for (const [name, input, expected] of cases) {
  const result = validateFreshPageRestore(input);
  if (result.pass !== expected || result.temporaryTestOnly !== true || result.publicationAllowed !== false) {
    failed += 1;
    console.error('FAIL', name, result);
  } else {
    console.log('PASS', name, result.reason);
  }
}
process.exitCode = failed ? 1 : 0;
