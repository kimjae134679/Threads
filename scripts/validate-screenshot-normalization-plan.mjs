#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [planFile] = process.argv.slice(2);
if (!planFile) fail('usage: node scripts/validate-screenshot-normalization-plan.mjs <normalization-plan.json>');
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
if (plan.type !== 'SCREENSHOT_NORMALIZATION_PLAN') fail('expected SCREENSHOT_NORMALIZATION_PLAN');
if (!plan.sourceUrl || !/^https?:\/\//i.test(plan.sourceUrl)) fail('exact public sourceUrl required');
if (!Array.isArray(plan.slides) || plan.slides.length === 0) fail('non-empty slides required');
if (plan.orderedAssetCount !== plan.slides.length) fail('orderedAssetCount mismatch');
if (plan.fullBodyCaptureStatus !== 'VERIFIED_COMPLETE') fail('full body must be human/user verified complete');
if (!['HUMAN_REVIEW','USER_CONFIRMED'].includes(plan.fullBodyVerificationMethod)) fail('invalid full-body verification method');
if (plan.publicationAllowed !== false) fail('normalization plan must never grant publication');
if (plan.publishOwner !== '04_REVIEW_PUBLISH') fail('publish owner must remain 04_REVIEW_PUBLISH');

const hashes = new Set();
for (let i = 0; i < plan.slides.length; i += 1) {
  const s = plan.slides[i];
  const expected = i + 1;
  if (Number(s.sourceSequence) !== expected) fail(`source sequence mismatch at slide ${expected}`);
  if (!/^[a-f0-9]{64}$/i.test(s.sha256 || '')) fail(`invalid sha256 at slide ${expected}`);
  const hash = s.sha256.toLowerCase();
  if (hashes.has(hash)) fail(`duplicate source hash at slide ${expected}`);
  hashes.add(hash);
  if (!(Number(s.byteLength) > 0)) fail(`invalid byteLength at slide ${expected}`);
  if (s.captureUrl !== plan.sourceUrl) fail(`captureUrl/sourceUrl mismatch at slide ${expected}`);
  if (!s.acquisitionState || !s.provenance) fail(`missing acquisition/provenance at slide ${expected}`);
  if (s.mode !== 'CONTAIN_NO_STRETCH') fail(`stretch/crop normalization mode forbidden at slide ${expected}`);
  if (s.bodyCropAllowed !== false) fail(`body cropping must remain forbidden at slide ${expected}`);
  if (s.privacyMasking !== 'USER_DIRECTED_ONLY') fail(`privacy masking must remain user-directed at slide ${expected}`);
  if (Number(s.target?.width) !== 1080 || Number(s.target?.height) !== 1080) fail(`target must be 1080x1080 at slide ${expected}`);
  const w = Number(s.sourceWidth), h = Number(s.sourceHeight), sw = Number(s.scaledWidth), sh = Number(s.scaledHeight);
  if (!(w > 0 && h > 0 && sw > 0 && sh > 0 && sw <= 1080 && sh <= 1080)) fail(`invalid dimensions at slide ${expected}`);
  const scale = Math.min(1080 / w, 1080 / h);
  if (sw !== Math.max(1, Math.round(w * scale)) || sh !== Math.max(1, Math.round(h * scale))) fail(`non-contain dimensions at slide ${expected}`);
  if (Number(s.padLeft) + sw + Number(s.padRight) !== 1080 || Number(s.padTop) + sh + Number(s.padBottom) !== 1080) fail(`padding does not close to 1080 at slide ${expected}`);
}
console.log(`OK: ${plan.slides.length} source screenshots preserve evidence/order and 1080x1080 contain/no-stretch normalization.`);
