#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [manifestFile, outFile] = process.argv.slice(2);
if (!manifestFile) fail('usage: node scripts/plan-screenshot-normalization.mjs <intake-manifest.json> [out.json]');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.type !== 'SCREENSHOT_INTAKE_MANIFEST' || !Array.isArray(manifest.assets)) fail('expected SCREENSHOT_INTAKE_MANIFEST');
const slides = manifest.assets.map((asset) => {
  const w = Number(asset.sourceWidth), h = Number(asset.sourceHeight);
  if (!(w > 0 && h > 0)) fail(`invalid source dimensions: ${asset.name || asset.file || 'asset'}`);
  const scale = Math.min(1080 / w, 1080 / h);
  const scaledWidth = Math.max(1, Math.round(w * scale));
  const scaledHeight = Math.max(1, Math.round(h * scale));
  return {
    sourceSequence: asset.sourceSequence,
    name: asset.name,
    sourceWidth: w,
    sourceHeight: h,
    target: { width: 1080, height: 1080 },
    mode: 'CONTAIN_NO_STRETCH',
    scaledWidth,
    scaledHeight,
    padLeft: Math.floor((1080 - scaledWidth) / 2),
    padRight: Math.ceil((1080 - scaledWidth) / 2),
    padTop: Math.floor((1080 - scaledHeight) / 2),
    padBottom: Math.ceil((1080 - scaledHeight) / 2),
    bodyCropAllowed: false,
    uiChromeCrop: 'MANUAL_OR_VERIFIED_SUGGESTION_ONLY',
    privacyMasking: 'USER_DIRECTED_ONLY'
  };
});
const plan = {
  type: 'SCREENSHOT_NORMALIZATION_PLAN',
  sourceUrl: manifest.sourceUrl || null,
  sourceManifest: manifestFile,
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  note: 'Square normalization contains the complete source image without stretching. It does not infer safe crop bounds, full-body completeness, OCR, moderation, rights or publication readiness.',
  slides
};
const text = `${JSON.stringify(plan, null, 2)}\n`;
if (outFile) fs.writeFileSync(outFile, text); else process.stdout.write(text);
