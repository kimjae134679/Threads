// TEMP_TEST_ONLY_DO_NOT_PUBLISH
// Stage 12 guard: title-generation code must not run from unverified/incomplete source claims.
// This module does NOT publish, fetch, persist third-party bodies, or invent title facts.
export const TEMP_TEST_ONLY = true;
export const PUBLICATION_ALLOWED = false;

export function buildVerifiedTitleInput({ exactObservedTitle = '', verifiedSourceText = '', sourceVerified = false, fullBodyRead = false } = {}) {
  if (!TEMP_TEST_ONLY || PUBLICATION_ALLOWED) throw new Error('TEMP safety invariant failed');
  if (sourceVerified !== true) throw new Error('Title suggestion blocked: exact source is not verified');
  const observed = String(exactObservedTitle).trim();
  const body = String(verifiedSourceText).trim();
  if (!observed) throw new Error('Title suggestion blocked: exact observed title is required');
  if (!body) throw new Error('Title suggestion blocked: verified source text is required');
  return Object.freeze({
    temporaryTestOnly: true,
    publicationAllowed: false,
    exactObservedTitle: observed,
    verifiedSourceText: body,
    fullBodyRead: fullBodyRead === true,
    constraints: Object.freeze({
      useOnlyVerifiedFacts: true,
      preserveExactObservedTitleSeparately: true,
      noInventedNumbersQuotesMotivesCrimes: true,
      preferredLengthChars: [18, 34],
      maxCoreConflictCount: 1,
    }),
  });
}

export function assertSuggestedTitle(title, verifiedInput) {
  if (!verifiedInput?.temporaryTestOnly || verifiedInput?.publicationAllowed !== false) throw new Error('Unsafe title input');
  const value = String(title || '').trim();
  if (!value) throw new Error('Empty suggested title');
  // Semantic fact checking remains a human/model review step; this guard only enforces safe provenance input.
  return value;
}
