import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../app/source-carousel.js', import.meta.url), 'utf8'), { window });
const api = window.ThreadsSourceCarousel;
const calls = [];
const ctx = {
  font: '', save() {}, restore() {}, fillRect() {},
  drawImage(...args) { calls.push({ kind: 'image', args }); },
  measureText(text) { return { width: Array.from(text).length * Number(this.font.match(/(\d+)px/)?.[1] || 40) }; },
  fillText(text, x, y) { calls.push({ kind: 'fill', text, x, y, font: this.font }); },
  strokeText(text, x, y) { calls.push({ kind: 'stroke', text, x, y, width: this.lineWidth, blur: this.shadowBlur }); },
  createLinearGradient() { return { addColorStop() {} }; },
};
const title = '북향 vs 남향\n차이가 이 정도?';
api.render(ctx, { type: 'cover', title, lines: ['원문 본문'] });
const strokes = calls.filter((call) => call.kind === 'stroke');
assert.equal(strokes.length, 2, 'Manual headline line breaks must survive rendering');
assert.equal(strokes[0].text, '북향 vs 남향');
assert.ok(strokes.every((call) => call.width === 2 && call.blur === 0), 'Use thin crisp outlines without blurred shadows');
assert.ok(strokes[0].y > 700 && strokes.at(-1).y < 1100, 'Headline must sit above the lower edge');
assert.equal(ctx.filter, 'none');
assert.throws(() => api.titleLayout(ctx, '너무 긴 제목'.repeat(60)), /너무 깁니다/);

const body = ('문장을 생략하지 않습니다. '.repeat(35) + '\n\n').repeat(5) + '마지막 문장';
const pages = api.textPages(ctx, body);
assert.ok(pages.length > 1);
assert.equal(pages.flat().join(''), body.replace(/\n/g, ''), 'Every original character must survive pagination');
assert.ok(pages.every((page) => page.length <= 19));
const plan = api.plan(ctx, { inputMode: 'text', title, sourceText: body }, [], []);
assert.equal(plan.length, pages.length + 1);
assert.equal(plan[0].type, 'cover');
assert.ok(plan.slice(1).every((slide) => slide.type === 'text'));
assert.equal(api.WIDTH, 1080);
assert.equal(api.HEIGHT, 1350);

for (const [w, h, expectedHeight] of [[1600, 900, 608], [1000, 1000, 1080],
  [1200, 1000, 900], [800, 1000, 1350], [600, 5000, 1350], [4000, 500, 608]]) {
  const image = { naturalWidth: w, naturalHeight: h };
  const imagePlan = api.plan(ctx, { title }, [image], [{ kind: 'post' }]);
  assert.ok(imagePlan.every((slide) => slide.width === 1080 && slide.height === expectedHeight),
    'Every page in one carousel must share the auto-sized cover frame');
  calls.length = 0;
  api.render(ctx, imagePlan[0]);
  const args = calls.find((call) => call.kind === 'image').args;
  assert.deepEqual(args.slice(5), [0, 0, 1080, expectedHeight], 'Cover must reach every canvas edge');
  assert.ok(Math.abs(args[7] / args[3] - args[8] / args[4]) < 1e-10, 'Cover must never distort the image');
  assert.ok(args[1] >= 0 && args[2] >= 0 && args[1] + args[3] <= w + 1e-8 && args[2] + args[4] <= h + 1e-8);
  const headline = api.titleLayout(ctx, title, imagePlan[0]);
  assert.ok(headline.top > 48 && headline.bottom < expectedHeight * 0.84);
  const bodySlides = imagePlan.slice(1);
  assert.equal(bodySlides[0].slice.sy, 0);
  assert.equal(bodySlides.at(-1).slice.sy + bodySlides.at(-1).slice.sh, h, 'Full source must survive cover cropping');
  bodySlides.forEach((slide, index) => {
    assert.ok(slide.slice.sh * 984 / w <= expectedHeight - 96 + 1e-8);
    if (index) assert.ok(slide.slice.sy <= bodySlides[index - 1].slice.sy + bodySlides[index - 1].slice.sh);
  });
}
const mixed = api.plan(ctx, { title }, [{ naturalWidth: 1200, naturalHeight: 1000 },
  { naturalWidth: 600, naturalHeight: 5000 }], [{ kind: 'media' }, { kind: 'post' }]);
assert.ok(mixed.every((slide) => slide.height === 900), 'The first source determines the whole carousel frame');
assert.throws(() => api.frameFor({ naturalWidth: 0, naturalHeight: 600 }), /크기/);
console.log('Source carousel full-bleed sizing, title layout and complete body pagination: PASS');
