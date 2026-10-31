'use strict';

// TEMP TEST ONLY / DO NOT PUBLISH.
// Prototype validator for items 13-15. It cannot upgrade any real candidate C/A/P state.
function validateFreshPageRestore(observed) {
  const fail = (reason) => ({ pass: false, temporaryTestOnly: true, publicationAllowed: false, reason });
  if (!observed || observed.temporaryTestOnly !== true) return fail('temporaryTestOnly must be true');
  if (observed.publicationAllowed !== false) return fail('publicationAllowed must be false');
  if (!observed.approvalDigest || !observed.restoredApprovedDigest || !observed.executionDigest) return fail('approval/restored/execution digests are required');
  if (observed.approvalDigest !== observed.restoredApprovedDigest) return fail('fresh-page restored digest differs from approval digest');
  if (observed.restoredApprovedDigest !== observed.executionDigest) return fail('execution digest differs from restored approved digest');
  return { pass: true, temporaryTestOnly: true, publicationAllowed: false, reason: 'TEMP contract satisfied; this is not publication approval' };
}

if (typeof module !== 'undefined') module.exports = { validateFreshPageRestore };
if (typeof window !== 'undefined') window.TEMP_TEST_ONLY_validateFreshPageRestore = validateFreshPageRestore;
