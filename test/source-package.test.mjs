import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync(new URL('../app/source-package.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(code, { window });
const api = window.ThreadsSourcePackage;
assert.ok(api);

const pkg = api.build({
  sourcePlatform: 'Inven',
  sourceFormat: '이미지 포스팅',
  sourceUrl: 'https://example.com/original-post',
  title: '원문 제목 그대로',
  fullBodyCaptureStatus: 'complete',
  assets: [
    { name: '01-cover.png', mime: 'image/png', kind: 'cover', provenance: 'selected cover image' },
    { name: '02-post.png', mime: 'image/png', kind: 'post', acquisitionState: 'CAPTURED', sourceSequence: 1, sourceWidth: 1080, sourceHeight: 1800, provenance: 'public page screenshot 1' },
    { name: '03-post.png', mime: 'image/png', kind: 'post', acquisitionState: 'CAPTURED', sourceSequence: 2, sourceWidth: 1080, sourceHeight: 1800, provenance: 'public page screenshot 2' }
  ]
});
assert.equal(pkg.schemaVersion, 5);
assert.equal(pkg.publicationAllowed, false);
assert.equal(pkg.publishOwner, '04_REVIEW_PUBLISH');
assert.equal(pkg.rightsState, 'UNKNOWN');
assert.equal(pkg.sourceFormat, '이미지 포스팅');
assert.equal(pkg.coverText, '원문 제목 그대로');
assert.equal(pkg.fullBodyCaptureStatus, 'complete');
assert.equal(pkg.bodyAssetsAcquired, true);
assert.equal(pkg.completeBodyEvidence, true);
assert.equal(pkg.assetsPending, false);
assert.equal(pkg.renderPlan[0].treatment, 'source-media-no-blur-plus-title');
assert.equal(pkg.renderPlan[1].treatment, 'faithful-original-screenshot-contain');
assert.equal(pkg.renderPlan[1].overlay, 'none');
assert.equal('finalCta' in pkg, false);
assert.equal('piiMaskSuggestions' in pkg.assets[1], false);
assert.equal(pkg.assets[1].verifiedByOcr, false);
assert.equal(pkg.assets[1].verifiedByVision, false);

const partial = api.build({
  sourceUrl: 'https://example.com/partial',
  title: '부분 캡처',
  assets: [
    { name: 'cover.png', mime: 'image/png', kind: 'cover' },
    { name: 'post.png', mime: 'image/png', kind: 'post' }
  ]
});
assert.equal(partial.fullBodyCaptureStatus, 'pending');
assert.equal(partial.assetsPending, true);
assert.equal(partial.bodyAssetsAcquired, false);
assert.equal(partial.completeBodyEvidence, false);
const textOnly = api.build({
  sourcePlatform: 'Blind',
  sourceFormat: '글',
  sourceUrl: 'https://example.com/text-post',
  title: '글형 후보',
  coverText: '짧은 표지 제목',
  assets: [
    { name: 'text-cover.png', mime: 'image/png', kind: 'cover', provenance: 'text-only cover; no generated imagery' },
    { name: 'post.png', mime: 'image/png', kind: 'post' }
  ]
});
assert.equal(textOnly.renderPlan[0].treatment, 'text-only-cover-no-generated-image');
assert.equal(textOnly.renderPlan[0].overlay, 'cover-title');


assert.throws(() => api.build({
  sourceUrl: 'https://example.com/incomplete',
  title: '완료라고 잘못 표시한 캡처',
  fullBodyCaptureStatus: 'complete',
  assets: [
    { name: 'cover.png', mime: 'image/png', kind: 'cover' },
    { name: 'post.png', mime: 'image/png', kind: 'post', provenance: 'missing acquisition and dimensions' }
  ]
}), /requires every body asset to be acquired with provenance and source dimensions/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [] }), /cover plus at least one real original-post/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [{name:'x.png',mime:'image/png',kind:'cover'}] }), /cover plus at least one real original-post/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', apiToken: 'x', assets: [{name:'cover.png',mime:'image/png',kind:'cover'},{name:'post.png',mime:'image/png'}] }), /secret-like field/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [{name:'cover.png',mime:'image/png',kind:'cover'},{name:'x.txt',mime:'text\/plain'}] }), /must be an image/);
const textInput = { inputMode: 'text', sourceFormat: '글', sourceUrl: 'https://example.com/text',
  title: '보존할 원제목', coverText: '짧은 표지 제목', sourceText: '첫 문단\n\n마지막 문단',
  fullBodyCaptureStatus: 'complete' };
const textPackage = api.build(textInput);
assert.equal(textPackage.sourceText, textInput.sourceText);
assert.equal(textPackage.assetsPending, false);
assert.equal(textPackage.assets.length, 0);
assert.equal(textPackage.bodyAssetsAcquired, false);
assert.equal(textPackage.publicationAllowed, false);
assert.equal(textPackage.rightsState, 'UNKNOWN');
assert.equal(textPackage.title, textInput.title);
assert.equal(api.build({ ...textInput, fullBodyCaptureStatus: 'pending' }).assetsPending, true);
assert.throws(() => api.build({ ...textInput, sourceText: '' }), /본문/);
assert.throws(() => api.build({ ...textInput, sourceText: '가'.repeat(20001) }), /20,000/);
assert.throws(() => api.build({ ...textInput, sourceFormat: '이미지' }), /글일 때/);
assert.throws(() => api.build({ ...textInput, assets: [{}] }), /함께/);
console.log('source-package: PASS');
