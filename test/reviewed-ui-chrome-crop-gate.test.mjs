import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/apply-reviewed-ui-chrome-crops.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'threads-crop-gate-'));

function run(name, input) {
  const file = path.join(tmp, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(input));
  return spawnSync(process.execPath, [script, '--in', file], { encoding: 'utf8' });
}

const baseAsset = {
  sourceSequence: 1,
  name: 'source-001.png',
  sha256: 'a'.repeat(64),
  captureUrl: 'https://example.com/post/1',
  sourceWidth: 1080,
  sourceHeight: 2200,
  bodyPreservationRequired: true,
  privacyMasking: 'USER_DIRECTED_ONLY',
  decision: 'KEEP_ORIGINAL',
  autoApplied: false,
  suggestedCrop: null,
  humanConfirmedBodyPreserved: true
};
const base = {
  type: 'UI_CHROME_CROP_SUGGESTIONS',
  sourceUrl: 'https://example.com/post/1',
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  policy: { cropScope: 'UI_CHROME_ONLY', bodyCropForbidden: true, autoCropForbidden: true, autoPrivacyMaskingForbidden: true, sourceOrderMutable: false },
  suggestions: [baseAsset]
};

let r = run('keep', base);
assert.equal(r.status, 0, r.stderr);
let out = JSON.parse(r.stdout);
assert.equal(out.publicationAllowed, false);
assert.equal(out.publishOwner, '04_REVIEW_PUBLISH');
assert.equal(out.policy.bodyCropForbidden, true);
assert.equal(out.policy.automaticCropForbidden, true);
assert.equal(out.policy.automaticPrivacyMaskingForbidden, true);
assert.equal(out.assets[0].crop, null);

r = run('missing-policy', { ...base, policy: undefined });
assert.notEqual(r.status, 0);
assert.match(r.stderr, /policy/);
r = run('automatic-crop', { ...base, suggestions: [{ ...baseAsset, autoApplied: true }] });
assert.notEqual(r.status, 0);
assert.match(r.stderr, /automatic crop/);

r = run('unreviewed', { ...base, suggestions: [{ ...baseAsset, decision: 'HUMAN_REVIEW_REQUIRED' }] });
assert.notEqual(r.status, 0, 'unreviewed crop must be rejected');

r = run('approved-without-body-confirmation', {
  ...base,
  suggestions: [{ ...baseAsset, decision: 'HUMAN_APPROVED_UI_CHROME_CROP', humanConfirmedBodyPreserved: false, suggestedCrop: { x: 0, y: 100, width: 1080, height: 2000 } }]
});
assert.notEqual(r.status, 0, 'approved crop without explicit body-preservation confirmation must be rejected');

r = run('out-of-bounds', {
  ...base,
  suggestions: [{ ...baseAsset, decision: 'HUMAN_APPROVED_UI_CHROME_CROP', suggestedCrop: { x: 0, y: 100, width: 1080, height: 2200 }, humanConfirmedBodyPreserved: true }]
});
assert.notEqual(r.status, 0, 'out-of-bounds crop must be rejected');

r = run('approved', {
  ...base,
  suggestions: [{ ...baseAsset, decision: 'HUMAN_APPROVED_UI_CHROME_CROP', suggestedCrop: { x: 0, y: 100, width: 1080, height: 2000 }, humanConfirmedBodyPreserved: true }]
});
assert.equal(r.status, 0, r.stderr);
out = JSON.parse(r.stdout);
assert.deepEqual(out.assets[0].crop, { x: 0, y: 100, width: 1080, height: 2000 });
assert.equal(out.assets[0].bodyPreservationVerifiedByHuman, true);
assert.equal(out.assets[0].privacyMasking, 'USER_DIRECTED_ONLY');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('reviewed UI-chrome crop gate invariants: OK');
