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
    { name: '02-post.png', mime: 'image/png', kind: 'post', provenance: 'public page screenshot 1' },
    { name: '03-post.png', mime: 'image/png', kind: 'post', provenance: 'public page screenshot 2' }
  ]
});
assert.equal(pkg.schemaVersion, 2);
assert.equal(pkg.publicationAllowed, false);
assert.equal(pkg.publishOwner, '04_REVIEW_PUBLISH');
assert.equal(pkg.rightsState, 'UNKNOWN');
assert.equal(pkg.sourceFormat, '이미지 포스팅');
assert.equal(pkg.coverText, '원문 제목 그대로');
assert.equal(pkg.fullBodyCaptureStatus, 'complete');
assert.equal(pkg.assetsPending, false);
assert.equal(pkg.renderPlan[0].treatment, 'cover-image-plus-original-title');
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
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [] }), /cover plus at least one real original-post/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [{name:'x.png',mime:'image/png',kind:'cover'}] }), /cover plus at least one real original-post/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', apiToken: 'x', assets: [{name:'cover.png',mime:'image/png',kind:'cover'},{name:'post.png',mime:'image/png'}] }), /secret-like field/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [{name:'cover.png',mime:'image/png',kind:'cover'},{name:'x.txt',mime:'text\/plain'}] }), /must be an image/);
console.log('source-package: PASS');
