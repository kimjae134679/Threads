#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function fail(message) { console.error(message); process.exit(1); }
function pngInfo(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') fail(`${file} is not PNG`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== 1080 || height !== 1080) fail(`${file} must be 1080x1080, got ${width}x${height}`);
  return { bytes, width, height, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

const [coverFile, bodyDir, outDir, manifestFile] = process.argv.slice(2);
if (!coverFile || !bodyDir || !outDir) fail('usage: node scripts/assemble-rendered-source-carousel.mjs <cover.png> <body-dir> <out-dir> [manifest.json]');
const cover = pngInfo(coverFile);
const bodies = fs.readdirSync(bodyDir).filter(f => /^body-\d+\.png$/i.test(f)).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
if (!bodies.length) fail('body directory has no body-NN.png source screenshot slides');
for (let i = 0; i < bodies.length; i++) {
  const expected = `body-${String(i).padStart(2,'0')}.png`;
  if (bodies[i] !== expected) fail(`expected ${expected}, found ${bodies[i]}`);
}

fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) {
  if (/^slide-\d+\.png$/i.test(file)) fs.rmSync(path.join(outDir, file));
}
const entries = [];
function emit(source, number, kind, info) {
  const output = `slide-${String(number).padStart(2,'0')}.png`;
  fs.copyFileSync(source, path.join(outDir, output));
  entries.push({ slideNumber:number, kind, output, source:path.resolve(source), sourceSha256:info.sha256, bytes:info.bytes.length, width:info.width, height:info.height });
}
emit(coverFile, 1, 'COVER_ONLY', cover);
bodies.forEach((file, i) => emit(path.join(bodyDir, file), i + 2, 'ORIGINAL_POST_SCREENSHOT', pngInfo(path.join(bodyDir, file))));

const manifest = {
  type:'RENDERED_SOURCE_CAROUSEL_ASSEMBLY',
  assembled:true,
  publicationAllowed:false,
  publishOwner:'04_REVIEW_PUBLISH',
  slideCount:entries.length,
  slides:entries,
  claims:{ocr:false,automaticPrivacyMasking:false,rightsCleared:false,published:false,humanVisualApproval:false},
  note:'Deterministic byte-preserving assembly only. Body slides are copied, not rewritten, summarized, stretched, masked, or regenerated.'
};
const text = `${JSON.stringify(manifest,null,2)}\n`;
if (manifestFile) fs.writeFileSync(manifestFile,text); else process.stdout.write(text);
