import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../app/source-carousel.js', import.meta.url), 'utf8'), { window });
const api = window.ThreadsSourceCarousel;
const calls = [];
const ctx = {
  font: '', save() {}, restore() {}, fillRect() {}, drawImage() {},
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
console.log('Source carousel title layout and complete text pagination: PASS');
