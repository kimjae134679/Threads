(function () {
  'use strict';

  const ROLE_CHAIN = ['01_DISCOVERY','02_EDITORIAL_SCORING','03_PRODUCTION','04_REVIEW_PUBLISH','05_EXPERIMENTS_ACCOUNTS'];
  const ALLOWED_KINDS = new Set(['cover','post','media']);
  const ALLOWED_SOURCE_FORMATS = new Set(['글','이미지','이미지 포스팅']);
  const ALLOWED_ACQUISITION_STATES = new Set(['CAPTURED','USER_PROVIDED','SOURCE_MEDIA','ASSETS_PENDING']);

  function cleanText(value, max) { return String(value || '').trim().slice(0, max); }
  function positiveInt(value) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }

  function assertNoSecrets(value, path = 'package') {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/(password|token|api.?key|authorization|cookie|secret)/i.test(key)) throw new Error(`secret-like field rejected: ${path}.${key}`);
      assertNoSecrets(child, `${path}.${key}`);
    }
  }

  function normalizeAsset(asset, index) {
    if (!asset || typeof asset !== 'object') throw new Error(`asset ${index + 1} is invalid`);
    const kind = ALLOWED_KINDS.has(asset.kind) ? asset.kind : (index === 0 ? 'cover' : 'post');
    const name = cleanText(asset.name, 180);
    const mime = cleanText(asset.mime, 80);
    if (!name) throw new Error(`asset ${index + 1} needs a name`);
    if (!/^image\//.test(mime)) throw new Error(`asset ${index + 1} must be an image`);
    const acquisitionState = ALLOWED_ACQUISITION_STATES.has(asset.acquisitionState) ? asset.acquisitionState : 'ASSETS_PENDING';
    return {
      id: cleanText(asset.id, 80) || `asset-${String(index + 1).padStart(2, '0')}`,
      order: index + 1,
      sourceSequence: positiveInt(asset.sourceSequence) || index + 1,
      name, mime, kind, acquisitionState,
      sourceWidth: positiveInt(asset.sourceWidth), sourceHeight: positiveInt(asset.sourceHeight),
      provenance: cleanText(asset.provenance, 500), captureUrl: cleanText(asset.captureUrl, 1200), observedAt: cleanText(asset.observedAt, 80),
      cropSuggestion: cleanText(asset.cropSuggestion, 500) || '플랫폼/브라우저 UI만 crop 가능; 원문 본문과 첨부 이미지는 자르지 않음',
      cropApplied: cleanText(asset.cropApplied, 500),
      verifiedByVision: asset.verifiedByVision === true, verifiedByOcr: asset.verifiedByOcr === true
    };
  }

  function build(input) {
    assertNoSecrets(input);
    const assets = (Array.isArray(input.assets) ? input.assets : []).map(normalizeAsset);
    if (assets.length < 2) throw new Error('cover plus at least one real original-post screenshot/image is required');
    if (assets[0].kind !== 'cover') throw new Error('asset 1 must be the cover');
    if (assets.slice(1).some(asset => !['post','media'].includes(asset.kind))) throw new Error('slide 2 onward must contain only original post screenshots/media');

    const bodyAssets = assets.slice(1);
    for (let i = 1; i < bodyAssets.length; i += 1) {
      if (bodyAssets[i].sourceSequence <= bodyAssets[i - 1].sourceSequence) throw new Error('original post screenshots/media must use strictly increasing sourceSequence values');
    }

    const sourceUrl = cleanText(input.sourceUrl, 1200);
    if (!sourceUrl && !cleanText(input.userProvidedProvenance, 1200)) throw new Error('source URL or user-provided provenance is required');
    const title = cleanText(input.title, 240);
    const sourceFormat = ALLOWED_SOURCE_FORMATS.has(input.sourceFormat) ? input.sourceFormat : '글';
    const fullBodyCaptureStatus = ['complete','partial','pending'].includes(input.fullBodyCaptureStatus) ? input.fullBodyCaptureStatus : 'pending';
    const bodyAssetsAcquired = bodyAssets.length > 0 && bodyAssets.every(asset => asset.acquisitionState !== 'ASSETS_PENDING');
    const completeBodyEvidence = bodyAssetsAcquired && bodyAssets.every(asset => asset.provenance && asset.sourceWidth && asset.sourceHeight);
    if (fullBodyCaptureStatus === 'complete' && !completeBodyEvidence) {
      throw new Error('fullBodyCaptureStatus=complete requires every body asset to be acquired with provenance and source dimensions');
    }

    return {
      schemaVersion: 4, type: 'SOURCE_PACKAGE', roleChain: ROLE_CHAIN.slice(), publishOwner: '04_REVIEW_PUBLISH', publicationAllowed: false,
      approvalState: 'NOT_APPROVED', rightsState: cleanText(input.rightsState, 40) || 'UNKNOWN', privacyState: 'USER_REVIEW',
      sourcePlatform: cleanText(input.sourcePlatform, 80) || 'manual', sourceFormat, sourceUrl,
      userProvidedProvenance: cleanText(input.userProvidedProvenance, 1200), title, coverText: cleanText(input.coverText, 240) || title,
      assets, fullBodyCaptureStatus, bodyAssetsAcquired, completeBodyEvidence,
      assetsPending: fullBodyCaptureStatus !== 'complete' || !completeBodyEvidence,
      renderPlan: assets.map((asset, index) => ({ slide: index + 1, assetId: asset.id, sourceSequence: asset.sourceSequence,
        treatment: index === 0 ? 'cover-image-plus-original-title' : 'faithful-original-screenshot-contain', overlay: index === 0 ? 'original-title' : 'none' })),
      gates: { audienceComfort: 'UNREVIEWED', privacy: 'USER_REVIEW', rights: 'REQUIRED', humanApproval: 'REQUIRED' }
    };
  }

  window.ThreadsSourcePackage = Object.freeze({ build, normalizeAsset });
})();
