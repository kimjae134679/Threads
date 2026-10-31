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
if (!input) fail('usage: node scripts/suggest-ui-chrome-crops.mjs --in <verified intake manifest.json> [--out suggestions.json]');
const manifest = JSON.parse(fs.readFileSync(input, 'utf8'));
if (manifest.type !== 'SCREENSHOT_INTAKE_MANIFEST') fail('input must be SCREENSHOT_INTAKE_MANIFEST');
if (!Array.isArray(manifest.assets) || !manifest.assets.length) fail('manifest has no source assets');

const suggestions = manifest.assets.map((asset, index) => {
  if (asset.sourceSequence !== index + 1) fail('sourceSequence must be contiguous and ordered');
  return {
    sourceSequence: asset.sourceSequence,
    name: asset.name,
    sha256: asset.sha256,
    sourceWidth: asset.sourceWidth,
    sourceHeight: asset.sourceHeight,
    captureUrl: asset.captureUrl,
    suggestedCrop: null,
    decision: 'HUMAN_REVIEW_REQUIRED',
    reason: 'No pixel crop is inferred automatically. Reviewer may enter a crop only for browser/platform UI chrome after confirming that no original post body or attached source media is removed.',
    bodyPreservationRequired: true,
    autoApplied: false,
    privacyMasking: 'USER_DIRECTED_ONLY'
  };
});
const result = {
  type: 'UI_CHROME_CROP_SUGGESTIONS',
  sourceUrl: manifest.sourceUrl,
  orderedAssetCount: suggestions.length,
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  policy: {
    cropScope: 'UI_CHROME_ONLY',
    bodyCropForbidden: true,
    autoCropForbidden: true,
    autoPrivacyMaskingForbidden: true,
    sourceOrderMutable: false
  },
  suggestions
};
const text = `${JSON.stringify(result, null, 2)}\n`;
if (out) { const target = path.resolve(out); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); console.log(target); }
else process.stdout.write(text);
