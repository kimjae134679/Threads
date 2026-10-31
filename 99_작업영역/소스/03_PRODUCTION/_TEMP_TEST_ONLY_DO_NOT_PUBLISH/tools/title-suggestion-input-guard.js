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

function numericTokens(text) {
  return new Set(String(text).match(/\d+(?:[.,]\d+)*/g) || []);
}

function quotedSegments(text) {
  const out = [];
  const re = /["“”'‘’「」『』]([^"“”'‘’「」『』]{2,})["“”'‘’「」『』]/g;
  let match;
  while ((match = re.exec(String(text))) !== null) out.push(match[1].trim());
  return out.filter(Boolean);
}

export function assertSuggestedTitle(title, verifiedInput) {
  if (!verifiedInput?.temporaryTestOnly || verifiedInput?.publicationAllowed !== false) throw new Error('Unsafe title input');
  const value = String(title || '').trim();
  if (!value) throw new Error('Empty suggested title');

  // Deterministic checks for two high-risk invention classes. This is intentionally conservative:
  // semantic fact checking still requires human/model review and this does not grant publication approval.
  const evidence = `${verifiedInput.exactObservedTitle || ''}\n${verifiedInput.verifiedSourceText || ''}`;
  const evidenceNumbers = numericTokens(evidence);
  for (const token of numericTokens(value)) {
    if (!evidenceNumbers.has(token)) throw new Error(`Suggested title blocked: unverified numeric token ${token}`);
  }
  for (const quote of quotedSegments(value)) {
    if (!evidence.includes(quote)) throw new Error('Suggested title blocked: quoted wording is not present in verified evidence');
  }
  return value;
}
