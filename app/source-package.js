(function () {
  'use strict';

  const ROLE_CHAIN = ['01_DISCOVERY','02_EDITORIAL_SCORING','03_PRODUCTION','04_REVIEW_PUBLISH','05_EXPERIMENTS_ACCOUNTS'];
  const ALLOWED_KINDS = new Set(['post','continuation','media','comment','context']);

  function cleanText(value, max) {
    return String(value || '').trim().slice(0, max);
  }

  function assertNoSecrets(value, path = 'package') {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/(password|token|api.?key|authorization|cookie|secret)/i.test(key)) throw new Error(`secret-like field rejected: ${path}.${key}`);
      assertNoSecrets(child, `${path}.${key}`);
    }
  }

  function normalizeAsset(asset, index) {
    if (!asset || typeof asset !== 'object') throw new Error(`asset ${index + 1} is invalid`);
    const kind = ALLOWED_KINDS.has(asset.kind) ? asset.kind : 'post';
    const name = cleanText(asset.name, 180);
    const mime = cleanText(asset.mime, 80);
    if (!name) throw new Error(`asset ${index + 1} needs a name`);
    if (!/^image\//.test(mime)) throw new Error(`asset ${index + 1} must be an image`);
    return {
      id: cleanText(asset.id, 80) || `asset-${String(index + 1).padStart(2, '0')}`,
      order: index + 1,
      name,
      mime,
      kind,
      provenance: cleanText(asset.provenance, 500),
      visibleText: cleanText(asset.visibleText, 6000),
      cropSuggestion: cleanText(asset.cropSuggestion, 500) || '중요 원문을 자르지 말고 contain 우선; 남는 영역은 동일 이미지 블러 배경으로 채움',
      privacyReview: cleanText(asset.privacyReview, 1000) || 'REQUIRED',
      piiMaskSuggestions: Array.isArray(asset.piiMaskSuggestions) ? asset.piiMaskSuggestions.map(v => cleanText(v, 240)).filter(Boolean).slice(0, 30) : [],
      verifiedByVision: asset.verifiedByVision === true,
      verifiedByOcr: asset.verifiedByOcr === true
    };
  }

  function build(input) {
    assertNoSecrets(input);
    const assets = (Array.isArray(input.assets) ? input.assets : []).map(normalizeAsset);
    if (!assets.length) throw new Error('at least one real screenshot/image is required');
    const sourceUrl = cleanText(input.sourceUrl, 1200);
    if (!sourceUrl && !cleanText(input.userProvidedProvenance, 1200)) throw new Error('source URL or user-provided provenance is required');
    return {
      schemaVersion: 1,
      type: 'SOURCE_PACKAGE',
      roleChain: ROLE_CHAIN.slice(),
      publishOwner: '04_REVIEW_PUBLISH',
      publicationAllowed: false,
      approvalState: 'NOT_APPROVED',
      rightsState: cleanText(input.rightsState, 40) || 'UNKNOWN',
      privacyState: 'REVIEW_REQUIRED',
      sourcePlatform: cleanText(input.sourcePlatform, 80) || 'manual',
      sourceUrl,
      userProvidedProvenance: cleanText(input.userProvidedProvenance, 1200),
      title: cleanText(input.title, 240),
      hookDraft: cleanText(input.hookDraft, 180),
      captionDraft: cleanText(input.captionDraft, 2200),
      assets,
      renderPlan: assets.map((asset, index) => ({
        slide: index + 1,
        assetId: asset.id,
        treatment: index === 0 ? 'full-bleed-blur-darken-hook' : 'contain-with-blurred-background',
        overlay: index === 0 ? 'hook' : asset.kind === 'comment' ? 'reaction-label-optional' : 'minimal'
      })),
      finalCta: cleanText(input.finalCta, 180) || '너라면 어떻게 생각해?',
      gates: { audienceComfort: 'UNREVIEWED', privacy: 'REQUIRED', rights: 'REQUIRED', humanApproval: 'REQUIRED' }
    };
  }

  window.ThreadsSourcePackage = Object.freeze({ build, normalizeAsset });
})();
