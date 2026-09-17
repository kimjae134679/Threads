#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [manifestFile, outFile] = process.argv.slice(2);
if (!manifestFile) fail('usage: node scripts/plan-screenshot-normalization.mjs <intake-manifest.json> [out.json]');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.type !== 'SCREENSHOT_INTAKE_MANIFEST' || !Array.isArray(manifest.assets) || manifest.assets.length === 0) fail('expected non-empty SCREENSHOT_INTAKE_MANIFEST');
if (!manifest.sourceUrl || !/^https?:\/\//i.test(manifest.sourceUrl)) fail('intake manifest must preserve an exact public sourceUrl');
if (manifest.orderedAssetCount !== manifest.assets.length) fail(`orderedAssetCount mismatch; expected ${manifest.assets.length}, got ${manifest.orderedAssetCount}`);
if (manifest.fullBodyCaptureStatus !== 'VERIFIED_COMPLETE') fail('normalization requires fullBodyCaptureStatus=VERIFIED_COMPLETE after human verification; pending/incomplete source sequences must remain ASSETS_PENDING');
if (!manifest.fullBodyVerifiedAt || Number.isNaN(new Date(manifest.fullBodyVerifiedAt).getTime())) fail('VERIFIED_COMPLETE requires a valid fullBodyVerifiedAt timestamp');
if (!manifest.fullBodyVerificationMethod || !['HUMAN_REVIEW','USER_CONFIRMED'].includes(manifest.fullBodyVerificationMethod)) fail('VERIFIED_COMPLETE requires fullBodyVerificationMethod=HUMAN_REVIEW or USER_CONFIRMED');

const sequences = manifest.assets.map((asset, index) => {
  const n = Number(asset.sourceSequence);
  if (!Number.isInteger(n) || n < 1) fail(`invalid sourceSequence at asset ${index + 1}`);
  if (!asset.sha256 || !/^[a-f0-9]{64}$/i.test(asset.sha256)) fail(`missing/invalid sha256 at asset ${index + 1}`);
  if (!(Number(asset.byteLength) > 0)) fail(`missing/invalid byteLength at asset ${index + 1}`);
  if (!asset.captureUrl || asset.captureUrl !== manifest.sourceUrl) fail(`captureUrl/sourceUrl mismatch at asset ${index + 1}`);
  if (!asset.acquisitionState || asset.acquisitionState !== manifest.acquisitionState) fail(`acquisitionState mismatch at asset ${index + 1}`);
  if (!asset.provenance) fail(`missing provenance at asset ${index + 1}`);
  return n;
});
if (new Set(sequences).size !== sequences.length) fail('duplicate sourceSequence values are not allowed');
if (new Set(manifest.assets.map((asset) => asset.sha256.toLowerCase())).size !== manifest.assets.length) fail('duplicate source asset hashes are not allowed');
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
    sha256: asset.sha256,
    byteLength: asset.byteLength,
    captureUrl: asset.captureUrl,
    acquisitionState: asset.acquisitionState,
    provenance: asset.provenance,
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
  sourceUrl: manifest.sourceUrl,
  sourceManifest: manifestFile,
  orderedAssetCount: manifest.orderedAssetCount,
  fullBodyCaptureStatus: manifest.fullBodyCaptureStatus,
  fullBodyVerifiedAt: manifest.fullBodyVerifiedAt,
  fullBodyVerificationMethod: manifest.fullBodyVerificationMethod,
  sourceSequencePolicy: 'PRESERVE_CONTIGUOUS_SOURCE_ORDER_FROM_1',
  sourceEvidencePolicy: 'PRESERVE_SHA256_BYTES_CAPTURE_URL_ACQUISITION_AND_PROVENANCE',
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  note: 'Square normalization is gated on explicit human/user full-body verification, then contains every complete source image without stretching. It preserves source order/evidence and does not infer crop bounds, OCR, moderation, rights or publication readiness.',
  slides
};
const text = `${JSON.stringify(plan, null, 2)}\n`;
if (outFile) fs.writeFileSync(outFile, text); else process.stdout.write(text);
