import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'threads-shot-plan-'));
const manifestFile = path.join(tmp, 'manifest.json');
const outFile = path.join(tmp, 'plan.json');
const asset = {
  sourceSequence: 1,
  name: '01.png',
  sha256: 'a'.repeat(64),
  byteLength: 123,
  captureUrl: 'https://example.com/post/1',
  acquisitionState: 'MANUAL_CAPTURE',
  provenance: 'manual capture requiring human verification',
  sourceWidth: 1080,
  sourceHeight: 1920
};
const base = {
  type: 'SCREENSHOT_INTAKE_MANIFEST',
  sourceUrl: 'https://example.com/post/1',
  acquisitionState: 'MANUAL_CAPTURE',
  orderedAssetCount: 1,
  assets: [asset]
};
function run(manifest) {
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  return spawnSync(process.execPath, ['scripts/plan-screenshot-normalization.mjs', manifestFile, outFile], { encoding: 'utf8' });
}
try {
  let result = run({ ...base, fullBodyCaptureStatus: 'pending' });
  assert.notEqual(result.status, 0, 'pending intake must not normalize');
  assert.match(result.stderr, /VERIFIED_COMPLETE/);

  result = run({
    ...base,
    fullBodyCaptureStatus: 'VERIFIED_COMPLETE',
    fullBodyVerifiedAt: '2026-09-17T05:00:00.000Z',
    fullBodyVerificationMethod: 'HUMAN_REVIEW'
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.equal(plan.publicationAllowed, false);
  assert.equal(plan.publishOwner, '04_REVIEW_PUBLISH');
  assert.equal(plan.slides.length, 1);
  assert.equal(plan.slides[0].mode, 'CONTAIN_NO_STRETCH');
  assert.equal(plan.slides[0].bodyCropAllowed, false);
  assert.equal(plan.slides[0].privacyMasking, 'USER_DIRECTED_ONLY');

  result = run({
    ...base,
    fullBodyCaptureStatus: 'VERIFIED_COMPLETE',
    fullBodyVerifiedAt: '2026-09-17T05:00:00.000Z',
    fullBodyVerificationMethod: 'AUTO_OCR'
  });
  assert.notEqual(result.status, 0, 'machine-only completeness must not normalize');
  assert.match(result.stderr, /HUMAN_REVIEW or USER_CONFIRMED/);

  console.log('screenshot-normalization-plan tests passed');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
