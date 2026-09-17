#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [planFile] = process.argv.slice(2);
if (!planFile) fail('usage: node scripts/validate-reviewed-crop-plan.mjs <reviewed-crop-plan.json>');
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
if (plan.type !== 'REVIEWED_UI_CHROME_CROP_PLAN') fail('expected REVIEWED_UI_CHROME_CROP_PLAN');
if (!plan.sourceUrl || !/^https?:\/\//i.test(plan.sourceUrl)) fail('exact public sourceUrl required');
if (plan.publicationAllowed !== false || plan.publishOwner !== '04_REVIEW_PUBLISH') fail('publication gate must remain closed and owned by 04_REVIEW_PUBLISH');
if (!Array.isArray(plan.assets) || plan.assets.length === 0) fail('crop plan has no source assets');
if (plan.orderedAssetCount !== plan.assets.length) fail('orderedAssetCount mismatch');
const p = plan.policy || {};
if (p.cropScope !== 'UI_CHROME_ONLY' || p.bodyCropForbidden !== true || p.automaticCropForbidden !== true || p.automaticPrivacyMaskingForbidden !== true || p.sourceOrderMutable !== false) fail('crop policy was weakened');

const hashes = new Set();
plan.assets.forEach((asset, index) => {
  const seq = index + 1;
  if (asset.sourceSequence !== seq) fail(`asset ${seq}: sourceSequence must be contiguous and immutable`);
  if (!/^[a-f0-9]{64}$/i.test(asset.sha256 || '')) fail(`asset ${seq}: valid source SHA-256 required`);
  const hash = asset.sha256.toLowerCase();
  if (hashes.has(hash)) fail(`asset ${seq}: duplicate source SHA-256`);
  hashes.add(hash);
  if (asset.captureUrl !== plan.sourceUrl) fail(`asset ${seq}: captureUrl/sourceUrl mismatch`);
  if (!Number.isInteger(asset.sourceWidth) || !Number.isInteger(asset.sourceHeight) || asset.sourceWidth <= 0 || asset.sourceHeight <= 0) fail(`asset ${seq}: valid source dimensions required`);
  if (asset.bodyPreservationVerifiedByHuman !== true) fail(`asset ${seq}: explicit human full-body/media preservation verification required`);
  if (asset.privacyMasking !== 'USER_DIRECTED_ONLY') fail(`asset ${seq}: privacy masking must remain user-directed`);
  const c = asset.crop;
  if (c === null) return;
  if (!c || !Number.isInteger(c.x) || !Number.isInteger(c.y) || !Number.isInteger(c.width) || !Number.isInteger(c.height)) fail(`asset ${seq}: crop must be null or an integer rectangle`);
  if (c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 || c.x + c.width > asset.sourceWidth || c.y + c.height > asset.sourceHeight) fail(`asset ${seq}: crop outside source bounds`);
  if (c.x === 0 && c.y === 0 && c.width === asset.sourceWidth && c.height === asset.sourceHeight) fail(`asset ${seq}: full-frame crop must be null`);
});
console.log(`OK: ${plan.assets.length} reviewed source screenshot(s); order/body preservation/publication gates intact.`);
