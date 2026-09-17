#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
function readImage(file) {
  const buf = fs.readFileSync(file);
  return { buf, size: pngSize(buf) || jpegSize(buf) };
}
function fail(message) { console.error(message); process.exit(1); }
function isNonPublicIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return false;
  const [a, b] = parts.map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}
function isPrivateIpv6(host) {
  const bare = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!bare.includes(':')) return false;
  if (bare === '::' || bare === '::1') return true;
  if (/^(fc|fd)[0-9a-f]{2}:/.test(bare)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(bare)) return true;
  if (/^::ffff:(10\.|127\.|169\.254\.|192\.168\.)/.test(bare)) return true;
  const mapped172 = bare.match(/^::ffff:172\.(\d+)\./);
  return Boolean(mapped172 && Number(mapped172[1]) >= 16 && Number(mapped172[1]) <= 31);
}
function validateSourceUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { fail('source URL must be an exact absolute public http(s) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail('source URL must use http(s)');
  if (!parsed.hostname || parsed.username || parsed.password) fail('source URL must be a public URL without embedded credentials');
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local')) fail('source URL must not point to a local/private host');
  if (isNonPublicIpv4(host)) fail('source URL must point to a globally routable public IPv4 host');
  if (isPrivateIpv6(host)) fail('source URL must not point to a local/private IPv6 host');
  const secretKeys = /^(access[_-]?token|auth|authorization|api[_-]?key|key|secret|signature|sig|token)$/i;
  for (const key of parsed.searchParams.keys()) {
    if (secretKeys.test(key)) fail(`source URL query appears to contain a secret-bearing parameter: ${key}`);
  }
  parsed.hash = '';
  return parsed.toString();
}
function validateObservedAt(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) fail('--observed-at must be an ISO-8601 datetime');
  return parsed.toISOString();
}
function naturalFileOrder(a, b) {
  return path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' });
}

const allowedAcquisitionStates = new Set(['USER_PROVIDED', 'MANUAL_CAPTURE', 'BROWSER_CAPTURE']);
const allowedOrderModes = new Set(['cli', 'filename']);
const args = process.argv.slice(2);
let sourceUrl = '', observedAt = '', out = '', acquisitionState = '', orderMode = 'cli';
let files = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--source-url') sourceUrl = args[++i] || '';
  else if (args[i] === '--observed-at') observedAt = args[++i] || '';
  else if (args[i] === '--acquisition-state') acquisitionState = args[++i] || '';
  else if (args[i] === '--order-mode') orderMode = args[++i] || '';
  else if (args[i] === '--out') out = args[++i] || '';
  else files.push(args[i]);
}
if (!sourceUrl || !acquisitionState) fail('usage: node scripts/build-screenshot-intake-manifest.mjs --source-url <exact-public-url> --acquisition-state <USER_PROVIDED|MANUAL_CAPTURE|BROWSER_CAPTURE> [--order-mode <cli|filename>] [--observed-at <ISO>] [--out file.json] <source screenshot files...>');
sourceUrl = validateSourceUrl(sourceUrl);
observedAt = validateObservedAt(observedAt);
if (!allowedAcquisitionStates.has(acquisitionState)) fail('--acquisition-state must be USER_PROVIDED, MANUAL_CAPTURE, or BROWSER_CAPTURE');
if (!allowedOrderModes.has(orderMode)) fail('--order-mode must be cli or filename');
if (!files.length) fail('at least one ordered source screenshot/image is required');
if (orderMode === 'filename') files = [...files].sort(naturalFileOrder);

const provenanceByState = {
  USER_PROVIDED: 'local file supplied by user for source intake; exact source relationship requires human verification',
  MANUAL_CAPTURE: 'local file recorded as a manual capture from the stated source URL; exact source relationship requires human verification',
  BROWSER_CAPTURE: 'local file recorded as a browser capture from the stated source URL; exact source relationship requires human verification'
};
const seenHashes = new Map();
const assets = files.map((file, index) => {
  if (!fs.existsSync(file)) fail(`missing file: ${file}`);
  const { buf, size } = readImage(file);
  if (!size) fail(`unsupported image or unreadable dimensions (PNG/JPEG only): ${file}`);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  if (seenHashes.has(sha256)) fail(`duplicate source asset bytes: ${file} duplicates ${seenHashes.get(sha256)}`);
  seenHashes.set(sha256, file);
  return {
    sourceSequence: index + 1,
    file: path.resolve(file),
    name: path.basename(file),
    byteLength: buf.length,
    sha256,
    sourceWidth: size.width,
    sourceHeight: size.height,
    acquisitionState,
    provenance: provenanceByState[acquisitionState],
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
  acquisitionState,
  orderMode,
  orderedAssetCount: assets.length,
  fullBodyCaptureStatus: 'pending',
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  privacyMasking: 'USER_DIRECTED_ONLY',
  note: 'Order, dimensions, byte length and SHA-256 are machine-recorded. filename order mode uses deterministic natural basename ordering; cli mode preserves explicit argument order. Acquisition method is explicitly supplied, never inferred. Duplicate bytes are rejected. Full-body completeness, source relationship, rights, privacy, OCR/vision, moderation and publication are NOT inferred.',
  assets
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, text); console.log(path.resolve(out)); }
else process.stdout.write(text);
