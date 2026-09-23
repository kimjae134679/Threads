import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const calls = [];
const ctx = {
  font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, textBaseline: '', textAlign: '',
  measureText(text) { return { width: Array.from(String(text)).length * 30 }; },
  fillText(text, x, y) { calls.push({ text, x, y }); },
  fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, rect() {}, roundRect() {},
  save() {}, restore() {}, scale() {}, drawImage() {},
};
const document = { createElement(tag) { if (tag === 'canvas') return { width:0,height:0,getContext:() => ctx }; return {}; } };
const window = {};
const sandbox = { window, document };
for (const name of ['source-cut-model.js','source-community-template.js','source-cut-composition.js']) {
  vm.runInNewContext(fs.readFileSync(new URL('../app/' + name, import.meta.url), 'utf8'), sandbox);
}
const T = window.ThreadsCommunityTemplate;
const value = T.settings({
  brand: '모두의톡', category: '연애·결혼', title: '원문 제목',
  body: '첫 문단입니다.\n두 번째 문단도 원문 그대로입니다.',
  comments: '첫 번째 실제 댓글\n두 번째 실제 댓글',
  commentPaddingTop: 140, commentPaddingBottom: 160,
});
assert.equal(Array.from(T.parseComments(value.comments)).join('|'), '첫 번째 실제 댓글|두 번째 실제 댓글');
const pages = T.plan(ctx, value);
assert.equal(pages[0].kind, 'post');
assert.ok(pages.some((p) => p.kind === 'comments'));
const comment = pages.find((p) => p.kind === 'comments');
calls.length = 0; T.render(ctx, comment, value);
assert.ok(calls.some((c) => c.text.includes('첫 번째 실제 댓글')));
assert.ok(calls.some((c) => c.text.includes('두 번째 실제 댓글')));
assert.ok(calls.every((c) => !/댓글\s*\d|닉네임|좋아요|답글|등록|입력/.test(c.text)), 'Comment canvas must not invent metadata or controls');
assert.ok(Math.min(...calls.map((c) => c.y)) >= 140, 'Top whitespace must be preserved');

const M = window.ThreadsSourceCut;
const p = M.newProject();
M.addAsset(p, {name:'source.png',width:800,height:1200,dataUrl:'data:image/png;base64,AA=='});
p.title = '표지 제목은 기존 렌더러 사용';
p.community = value;
const slides = M.slides(p);
assert.equal(slides[0].type, 'cover');
assert.ok(slides.slice(1).every((slide) => slide.type === 'community'));
assert.ok(slides.some((slide) => slide.communityPage?.kind === 'comments'));
console.log('Community body/comment template: exact text-only comments, no fake metadata, cover preserved: PASS');
