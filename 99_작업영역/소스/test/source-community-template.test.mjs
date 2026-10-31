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
const document = { createElement(tag) { if (tag === 'canvas') return { width: 0, height: 0, getContext: () => ctx }; return {}; } };
const window = {};
const sandbox = { window, document };

for (const name of ['source-cut-model.js', 'source-community-template.js', 'source-cut-composition.js']) {
  vm.runInNewContext(fs.readFileSync(new URL('../app/' + name, import.meta.url), 'utf8'), sandbox);
}

const T = window.ThreadsCommunityTemplate;
assert.equal(
  T.cleanTitle('웹진 인벤 : 자체생산)본인 일본 유학 및 결혼 썰 - 오픈이슈갤러리'),
  '자체생산)본인 일본 유학 및 결혼 썰'
);

const value = T.settings({
  enabled: true,
  bodyMode: 'text',
  commentMode: 'text',
  brand: '모두의톡',
  title: '웹진 인벤 : 실제 원문 제목 - 오픈이슈갤러리',
  body: '첫 문단입니다.\n줄바꿈도 유지합니다.\n\n두 번째 문단입니다.',
  comments: '첫 번째 실제 댓글\n\n두 번째 실제 댓글',
  bodyMedia: [{
    id: 'm1',
    name: '본문 이미지',
    width: 600,
    height: 400,
    dataUrl: 'data:image/png;base64,AA==',
    insertAfter: 1,
  }],
  commentPaddingTop: 140,
  commentPaddingBottom: 160,
});

assert.equal(value.title, '실제 원문 제목');
assert.equal(T.paragraphs(value.body).length, 2);
assert.equal(Array.from(T.parseComments(value.comments)).join('|'), '첫 번째 실제 댓글|두 번째 실제 댓글');

const bodyPages = T.bodyPages(ctx, value);
assert.equal(bodyPages[0].kind, 'post');
assert.ok(bodyPages.some((p) => p.blocks.some((b) => b.type === 'image')), 'body media must be retained between text blocks');

const commentPages = T.commentPages(ctx, value);
assert.ok(commentPages.length >= 1);
calls.length = 0;
T.render(ctx, commentPages[0], value);
assert.ok(calls.some((c) => c.text.includes('첫 번째 실제 댓글')));
assert.ok(calls.some((c) => c.text.includes('두 번째 실제 댓글')));
assert.ok(calls.every((c) => !/댓글\s*\d|닉네임|좋아요|답글|등록|입력/.test(c.text)), 'Comment canvas must not invent metadata or controls');
assert.ok(Math.min(...calls.map((c) => c.y)) >= 140, 'Top whitespace must be preserved');

const M = window.ThreadsSourceCut;
const p = M.newProject();
M.addAsset(p, { name: 'source.png', width: 800, height: 1200, dataUrl: 'data:image/png;base64,AA==' });
p.title = '표지 제목은 기존 렌더러 사용';
p.community = value;
const slides = M.slides(p);
assert.equal(slides[0].type, 'cover');
assert.ok(slides.slice(1).every((slide) => slide.type === 'community'));
assert.ok(slides.some((slide) => slide.communityPage?.kind === 'comments'));

p.community = T.settings({ ...value, bodyMode: 'screenshot', body: '', bodyMedia: [] });
const screenshotSlides = M.slides(p);
assert.equal(screenshotSlides[0].type, 'cover');
assert.ok(screenshotSlides.some((slide) => slide.sourceKind === 'body'), 'screenshot body must remain usable without extracted text');
console.log('Community template: title cleanup, screenshot/text modes, body media and metadata-free comments: PASS');
