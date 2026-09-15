import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = fs.readFileSync(new URL('../app/source-package.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(code, { window });
const api = window.ThreadsSourcePackage;
assert.ok(api);

const pkg = api.build({
  sourcePlatform: 'Blind',
  sourceUrl: 'https://www.teamblind.com/kr/post/example',
  title: '실제 원문 캡처 테스트',
  hookDraft: '첫 장은 실제 이미지로 시작',
  assets: [
    { name: '01-post.png', mime: 'image/png', kind: 'post', provenance: 'public page manual capture' },
    { name: '02-comment.png', mime: 'image/png', kind: 'comment', provenance: 'public page manual capture', piiMaskSuggestions: ['profile name'] }
  ]
});
assert.equal(pkg.publicationAllowed, false);
assert.equal(pkg.publishOwner, '04_REVIEW_PUBLISH');
assert.equal(pkg.rightsState, 'UNKNOWN');
assert.equal(pkg.assets.length, 2);
assert.equal(pkg.renderPlan[0].treatment, 'full-bleed-blur-darken-hook');
assert.equal(pkg.renderPlan[1].treatment, 'contain-with-blurred-background');
assert.equal(pkg.assets[0].verifiedByOcr, false);
assert.equal(pkg.assets[0].verifiedByVision, false);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [] }), /at least one real screenshot/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', apiToken: 'x', assets: [{name:'x.png',mime:'image/png'}] }), /secret-like field/);
assert.throws(() => api.build({ sourceUrl: 'https://example.com', assets: [{name:'x.txt',mime:'text\/plain'}] }), /must be an image/);
console.log('source-package: PASS');
