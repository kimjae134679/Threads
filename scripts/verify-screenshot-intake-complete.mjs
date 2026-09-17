#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const args = process.argv.slice(2);
let manifestFile = '', outFile = '', method = '', verifiedAt = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--method') method = args[++i] || '';
  else if (args[i] === '--verified-at') verifiedAt = args[++i] || '';
  else if (args[i] === '--out') outFile = args[++i] || '';
  else if (!manifestFile) manifestFile = args[i];
  else fail(`unexpected argument: ${args[i]}`);
}
if (!manifestFile || !method) fail('usage: node scripts/verify-screenshot-intake-complete.mjs <intake-manifest.json> --method <HUMAN_REVIEW|USER_CONFIRMED> [--verified-at <ISO>] [--out file.json]');
if (!['HUMAN_REVIEW','USER_CONFIRMED'].includes(method)) fail('--method must be HUMAN_REVIEW or USER_CONFIRMED');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.type !== 'SCREENSHOT_INTAKE_MANIFEST' || !Array.isArray(manifest.assets) || manifest.assets.length === 0) fail('expected non-empty SCREENSHOT_INTAKE_MANIFEST');
if (manifest.orderedAssetCount !== manifest.assets.length) fail('orderedAssetCount mismatch');
if (manifest.publicationAllowed !== false || manifest.publishOwner !== '04_REVIEW_PUBLISH') fail('intake manifest must remain publicationAllowed=false and owned by 04_REVIEW_PUBLISH');
if (manifest.privacyMasking !== 'USER_DIRECTED_ONLY') fail('privacyMasking must remain USER_DIRECTED_ONLY');
if (!['USER_PROVIDED','MANUAL_CAPTURE','BROWSER_CAPTURE'].includes(manifest.acquisitionState)) fail('invalid acquisitionState');
let source;
try { source = new URL(manifest.sourceUrl); } catch { fail('manifest sourceUrl must be an absolute URL'); }
if (!['http:','https:'].includes(source.protocol) || !source.hostname || source.username || source.password) fail('manifest sourceUrl must be a credential-free http(s) URL');
const seq = manifest.assets.map((asset) => Number(asset.sourceSequence));
const seenHashes = new Set();
for (let i = 0; i < seq.length; i += 1) {
  const asset = manifest.assets[i];
  if (seq[i] !== i + 1) fail(`sourceSequence must be contiguous from 1; expected ${i + 1}, got ${seq[i]}`);
  if (!/^[0-9a-f]{64}$/i.test(String(asset.sha256 || ''))) fail(`asset ${i + 1} has invalid SHA-256`);
  if (seenHashes.has(asset.sha256.toLowerCase())) fail(`asset ${i + 1} duplicates a prior SHA-256`);
  seenHashes.add(asset.sha256.toLowerCase());
  for (const field of ['byteLength','sourceWidth','sourceHeight']) if (!Number.isInteger(asset[field]) || asset[field] <= 0) fail(`asset ${i + 1} ${field} must be a positive integer`);
  if (asset.acquisitionState !== manifest.acquisitionState) fail(`asset ${i + 1} acquisitionState mismatch`);
  if (asset.captureUrl !== manifest.sourceUrl) fail(`asset ${i + 1} captureUrl must equal manifest sourceUrl`);
  if (typeof asset.provenance !== 'string' || !asset.provenance.trim()) fail(`asset ${i + 1} provenance is required`);
  if (asset.verifiedByVision !== false || asset.verifiedByOcr !== false) fail(`asset ${i + 1} must not claim OCR/vision verification in intake`);
}
const timestamp = verifiedAt || new Date().toISOString();
if (Number.isNaN(new Date(timestamp).getTime())) fail('--verified-at must be an ISO-8601 datetime');
manifest.fullBodyCaptureStatus = 'VERIFIED_COMPLETE';
manifest.fullBodyVerifiedAt = new Date(timestamp).toISOString();
manifest.fullBodyVerificationMethod = method;
manifest.publicationAllowed = false;
manifest.publishOwner = '04_REVIEW_PUBLISH';
manifest.note = `${manifest.note || ''} Full-body completeness was explicitly confirmed via ${method}; this does not verify rights, privacy, OCR/vision, moderation or publication readiness.`.trim();
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (outFile) fs.writeFileSync(outFile, text); else process.stdout.write(text);
