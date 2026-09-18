import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const elements = new Map();
class Element {
  constructor() { this.value = ''; this.files = []; this.listeners = {}; this.textContent = ''; this.innerHTML = ''; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  insertAdjacentElement(_, element) { elements.set('#' + element.id, element); }
  appendChild(child) { if (child.id) elements.set('#' + child.id, child); }
  setAttribute() {}
  click() {}
  remove() {}
}
for (const match of html.matchAll(/id="([^"]+)"/g)) elements.set('#' + match[1], new Element());
for (const id of ['sourceFormatInput', 'sourceBodyCaptureStatus', 'sourceRightsInput']) {
  assert.ok(elements.has('#' + id), `Real HTML must expose ${id}`);
}
elements.set('#exportSourceCarouselPngBtn', new Element());
const documentListeners = {};
const drawCalls = [];
let downloads = 0;
const ctx = {
  drawImage(...args) { drawCalls.push(args); }, fillRect() {}, save() {}, restore() {}, strokeText() {},
  createLinearGradient() { return { addColorStop() {} }; },
  measureText(text) { return { width: text.length * 30 }; }, fillText() {},
};
const document = {
  readyState: 'loading', querySelector: (selector) => elements.get(selector) || null,
  addEventListener(type, listener) { documentListeners[type] = listener; },
  body: { appendChild() {} },
  createElement(tag) {
    if (tag === 'canvas') return { setAttribute() {}, getContext: () => ctx, toBlob(callback) { callback({}); } };
    const element = new Element();
    if (tag === 'a') element.click = () => { downloads += 1; };
    return element;
  },
};
let selectedId = 'a';
const candidates = { a: { id: 'a', title: '정확한 원문 제목', url: 'https://example.com/a' }, b: { id: 'b', title: '다른 후보', url: 'https://example.com/b' } };
let imageError = false;
let deferImages = false;
const imageCallbacks = [];
class Image {
  constructor() { this.naturalWidth = 600; this.naturalHeight = 1500; }
  set src(value) {
    this.url = value;
    const callback = () => imageError ? this.onerror() : this.onload();
    if (deferImages) imageCallbacks.push(callback); else queueMicrotask(callback);
  }
}
let serial = 0;
const window = { ThreadsSourceIntakeContext: {
  getSelectedId: () => selectedId, getCandidate: (id) => candidates[id],
  saveSourcePackage(id, value) { candidates[id].sourcePackage = value; },
} };
const sandbox = { window, document, Image, URL: { createObjectURL: () => `blob:test-${++serial}`, revokeObjectURL() {} },
  setTimeout(callback) { callback(); }, console };
vm.createContext(sandbox);
for (const file of ['source-package.js', 'source-carousel.js', 'source-intake.js']) vm.runInContext(fs.readFileSync(new URL('../app/' + file, import.meta.url), 'utf8'), sandbox);
documentListeners.DOMContentLoaded();
const api = window.ThreadsSourceIntake;
const input = elements.get('#sourceAssetInput');
input.files = [{ name: 'original.png', type: 'image/png', size: 10 }];
input.listeners.change();
elements.get('#sourceBodyCaptureStatus').value = 'complete';
const pkg = await api.buildPackage();
assert.equal(pkg.assetsPending, false);
assert.equal(pkg.candidateId, 'a');
assert.equal(pkg.assets[1].sourceWidth, 600);
assert.equal(pkg.assets[1].sourceHeight, 1500);
assert.equal(pkg.assets[1].acquisitionState, 'USER_PROVIDED');
assert.equal(pkg.publicationAllowed, false);
assert.equal(candidates.a.sourcePackage, pkg);
await api.exportPngSet();
assert.ok(downloads >= 3, 'Cover plus all long-body slices must be exported');
for (const args of drawCalls.filter((call) => call.length === 9)) {
  assert.ok(Math.abs(args[7] / args[3] - args[8] / args[4]) < 1e-12, 'Body images must preserve aspect ratio');
}
const almostSquare = api.sourceSlices({ naturalWidth: 984, naturalHeight: 1300 });
assert.ok(almostSquare.length > 1, 'Images taller than the 4:5 content area must not be squashed');
assert.equal(almostSquare.at(-1).sy + almostSquare.at(-1).sh, 1300);

selectedId = 'b'; documentListeners['threads:candidate-selected']();
assert.equal(api.getPreview(), null);
await assert.rejects(api.buildPackage(), /스크린샷\/이미지/);
selectedId = 'a'; documentListeners['threads:candidate-selected']();
await api.buildPackage();
elements.get('#sourceRightsInput').value = 'LICENSED';
elements.get('#sourceRightsInput').listeners.change();
assert.equal(api.getPreview(), null, 'Changing review inputs invalidates export');
await api.buildPackage();
imageError = true;
await assert.rejects(api.buildPackage(), /이미지를 읽지/);
assert.equal(api.getPreview(), null, 'Failed rebuild must not retain an earlier successful package');
imageError = false;
deferImages = true;
const pending = api.buildPackage();
selectedId = 'b'; documentListeners['threads:candidate-selected']();
imageCallbacks.splice(0).forEach((callback) => callback());
await assert.rejects(pending, /변경/);
assert.equal(api.getPreview(), null, 'Delayed image load cannot attach another candidate\'s files');
deferImages = false;
elements.get('#sourceInputMode').value = 'text';
elements.get('#sourceInputMode').listeners.change();
elements.get('#sourceTextInput').value = '첫 문단입니다.\n\n' + '긴 원문을 빠짐없이 보존합니다. '.repeat(180);
elements.get('#sourceHookInput').value = '짧고 강한 제목\n두 번째 줄';
elements.get('#sourceBodyCaptureStatus').value = 'complete';
const textPackage = await api.buildPackage();
assert.equal(textPackage.inputMode, 'text');
assert.equal(textPackage.assets.length, 0, 'Text mode must not fabricate screenshot acquisition');
assert.equal(textPackage.title, candidates.b.title, 'Editing the cover must preserve the original title');
assert.equal(textPackage.coverText, '짧고 강한 제목\n두 번째 줄');
assert.equal(textPackage.output.height, 1350);
assert.ok(textPackage.output.slideCount > 2, 'Long original text must paginate');
const beforeTextDownloads = downloads;
await api.exportPngSet();
assert.equal(downloads - beforeTextDownloads, textPackage.output.slideCount);
elements.get('#sourceHookInput').listeners.input();
assert.equal(api.getPreview(), null, 'Typing a new headline immediately invalidates export');
await api.exportPngSet();
assert.equal(downloads - beforeTextDownloads, textPackage.output.slideCount, 'Stale output cannot download');
selectedId = 'a'; documentListeners['threads:candidate-selected']();
selectedId = 'b'; documentListeners['threads:candidate-selected']();
assert.equal(elements.get('#sourceHookInput').value, textPackage.coverText, 'Candidate switching preserves edited headline');
elements.get('#sourceTextInput').listeners.input();
assert.equal(elements.get('#sourceBodyCaptureStatus').value, 'pending', 'Changing the body requires completeness review again');
vm.runInContext(fs.readFileSync(new URL('../app/source-intake.js', import.meta.url), 'utf8'), sandbox);
documentListeners.DOMContentLoaded();
assert.equal(elements.get('#sourceInputMode').value, 'text', 'A fresh session restores the saved input mode');
assert.equal(elements.get('#sourceTextInput').value, textPackage.sourceText, 'A fresh session restores original text');
assert.equal(elements.get('#sourceHookInput').value, textPackage.coverText, 'A fresh session restores the user headline');
console.log('Source intake DOM-handler integration passed; image decode/canvas are test doubles.');
