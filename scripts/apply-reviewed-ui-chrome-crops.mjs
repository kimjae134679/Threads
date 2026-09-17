#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function fail(message) { console.error(message); process.exit(1); }
const args = process.argv.slice(2);
let input = '', out = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--in') input = args[++i] || '';
  else if (args[i] === '--out') out = args[++i] || '';
}
if (!input) fail('usage: node scripts/apply-reviewed-ui-chrome-crops.mjs --in <reviewed crop suggestions.json> [--out crop-plan.json]');
const review = JSON.parse(fs.readFileSync(input, 'utf8'));
if (review.type !== 'UI_CHROME_CROP_SUGGESTIONS') fail('input must be UI_CHROME_CROP_SUGGESTIONS');
if (review.publicationAllowed !== false || review.publishOwner !== '04_REVIEW_PUBLISH') fail('publication gate must remain closed and owned by 04_REVIEW_PUBLISH');
if (!Array.isArray(review.suggestions) || !review.suggestions.length) fail('review has no source assets');

const assets = review.suggestions.map((asset, index) => {
  if (asset.sourceSequence !== index + 1) fail('sourceSequence must be contiguous and ordered');
  if (!['KEEP_ORIGINAL', 'HUMAN_APPROVED_UI_CHROME_CROP'].includes(asset.decision)) fail(`asset ${asset.sourceSequence}: explicit human crop decision required`);
  if (asset.bodyPreservationRequired !== true) fail(`asset ${asset.sourceSequence}: body preservation gate missing`);
  if (asset.privacyMasking !== 'USER_DIRECTED_ONLY') fail(`asset ${asset.sourceSequence}: privacy masking must remain user-directed`);
  if (asset.decision === 'HUMAN_APPROVED_UI_CHROME_CROP') {
    const c = asset.suggestedCrop;
    if (!c || !Number.isInteger(c.x) || !Number.isInteger(c.y) || !Number.isInteger(c.width) || !Number.isInteger(c.height)) fail(`asset ${asset.sourceSequence}: approved crop requires integer x/y/width/height`);
    if (c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 || c.x + c.width > asset.sourceWidth || c.y + c.height > asset.sourceHeight) fail(`asset ${asset.sourceSequence}: crop is outside source bounds`);
    if (asset.humanConfirmedBodyPreserved !== true) fail(`asset ${asset.sourceSequence}: reviewer must confirm full original body/media preservation`);
  }
  return {
    sourceSequence: asset.sourceSequence,
    name: asset.name,
    sha256: asset.sha256,
    captureUrl: asset.captureUrl,
    sourceWidth: asset.sourceWidth,
    sourceHeight: asset.sourceHeight,
    crop: asset.decision === 'HUMAN_APPROVED_UI_CHROME_CROP' ? asset.suggestedCrop : null,
    bodyPreservationVerifiedByHuman: asset.decision === 'HUMAN_APPROVED_UI_CHROME_CROP' ? true : null,
    privacyMasking: 'USER_DIRECTED_ONLY'
  };
});

const result = {
  type: 'REVIEWED_UI_CHROME_CROP_PLAN',
  sourceUrl: review.sourceUrl,
  orderedAssetCount: assets.length,
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  policy: {
    cropScope: 'UI_CHROME_ONLY',
    bodyCropForbidden: true,
    automaticCropForbidden: true,
    automaticPrivacyMaskingForbidden: true,
    sourceOrderMutable: false
  },
  assets
};
const text = `${JSON.stringify(result, null, 2)}\n`;
if (out) { const target = path.resolve(out); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); console.log(target); }
else process.stdout.write(text);
