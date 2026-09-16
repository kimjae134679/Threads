#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (i + 4 > buf.length) break;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}
function imageSize(file) {
  const buf = fs.readFileSync(file);
  return pngSize(buf) || jpegSize(buf);
}
function fail(message) { console.error(message); process.exit(1); }

const args = process.argv.slice(2);
let sourceUrl = '', observedAt = '', out = '';
const files = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--source-url') sourceUrl = args[++i] || '';
  else if (args[i] === '--observed-at') observedAt = args[++i] || '';
  else if (args[i] === '--out') out = args[++i] || '';
  else files.push(args[i]);
}
if (!sourceUrl) fail('usage: node scripts/build-screenshot-intake-manifest.mjs --source-url <exact-public-url> [--observed-at <ISO>] [--out file.json] <ordered screenshot files...>');
if (!files.length) fail('at least one ordered source screenshot/image is required');

const assets = files.map((file, index) => {
  if (!fs.existsSync(file)) fail(`missing file: ${file}`);
  const size = imageSize(file);
  if (!size) fail(`unsupported image or unreadable dimensions (PNG/JPEG only): ${file}`);
  return {
    sourceSequence: index + 1,
    file: path.resolve(file),
    name: path.basename(file),
    sourceWidth: size.width,
    sourceHeight: size.height,
    acquisitionState: 'USER_PROVIDED',
    provenance: 'local file selected for source intake; exact source relationship requires human verification',
    captureUrl: sourceUrl,
    observedAt: observedAt || null,
    cropSuggestion: 'NONE — review manually; only platform/browser UI chrome may be cropped',
    cropApplied: '',
    cropDecision: 'NONE',
    verifiedByVision: false,
    verifiedByOcr: false
  };
});

const manifest = {
  type: 'SCREENSHOT_INTAKE_MANIFEST',
  sourceUrl,
  observedAt: observedAt || null,
  orderedAssetCount: assets.length,
  fullBodyCaptureStatus: 'pending',
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  privacyMasking: 'USER_DIRECTED_ONLY',
  note: 'Order and dimensions are machine-recorded. Full-body completeness, source relationship, rights, privacy, OCR/vision, moderation and publication are NOT inferred.',
  assets
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, text); console.log(path.resolve(out)); }
else process.stdout.write(text);
