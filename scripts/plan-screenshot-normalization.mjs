#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [manifestFile, outFile] = process.argv.slice(2);
if (!manifestFile) fail('usage: node scripts/plan-screenshot-normalization.mjs <intake-manifest.json> [out.json]');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.type !== 'SCREENSHOT_INTAKE_MANIFEST' || !Array.isArray(manifest.assets) || manifest.assets.length === 0) fail('expected non-empty SCREENSHOT_INTAKE_MANIFEST');

const sequences = manifest.assets.map((asset, index) => {
  const n = Number(asset.sourceSequence);
  if (!Number.isInteger(n) || n < 1) fail(`invalid sourceSequence at asset ${index + 1}`);
  return n;
});
if (new Set(sequences).size !== sequences.length) fail('duplicate sourceSequence values are not allowed');
if (sequences[0] !== 1) fail('sourceSequence must start at 1; missing first source screenshot is not allowed');
for (let i = 1; i < sequences.length; i += 1) {
  if (sequences[i] !== sequences[i - 1] + 1) fail(`sourceSequence gap or reorder at asset ${i + 1}; expected ${sequences[i - 1] + 1}, got ${sequences[i]}`);
}

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
  sourceSequencePolicy: 'PRESERVE_CONTIGUOUS_SOURCE_ORDER_FROM_1',
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  note: 'Square normalization contains the complete source image without stretching. It requires a contiguous sourceSequence beginning at 1 so missing middle/first screenshots cannot silently pass. It does not infer safe crop bounds, full-body completeness, OCR, moderation, rights or publication readiness.',
  slides
};
const text = `${JSON.stringify(plan, null, 2)}\n`;
if (outFile) fs.writeFileSync(outFile, text); else process.stdout.write(text);
