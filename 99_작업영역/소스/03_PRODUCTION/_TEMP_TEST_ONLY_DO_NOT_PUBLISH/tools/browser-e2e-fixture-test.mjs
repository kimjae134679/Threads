// TEMP_TEST_ONLY_DO_NOT_PUBLISH
// Synthetic fixture only. No third-party source content, network, upload, or publish.
import assert from 'node:assert/strict';
import { buildBrowserConversionModel, restoreBrowserConversionModel } from './browser-conversion-adapter.js';

const fixture = `첫 장면입니다. 이 문단은 테스트를 위해 직접 만든 가상 문장입니다. 실제 게시물에서 가져온 내용이 아닙니다.\n\n두 번째 장면입니다. 문단 경계를 유지한 채 카드가 나뉘는지 확인합니다. 다운로드를 흉내 내기 위해 JSON 직렬화를 사용합니다.\n\n세 번째 장면입니다. 재접속을 흉내 내어 직렬화된 결과를 다시 복원하고 TEMP 안전 플래그와 슬라이드 순서를 검사합니다.`;

const generated = buildBrowserConversionModel({
  sourceText: fixture,
  title: 'TEMP 브라우저 왕복 테스트',
  sourceType: 'text',
});
assert.equal(generated.temporaryTestOnly, true);
assert.equal(generated.publicationAllowed, false);
assert.equal(generated.cover.mode, 'text-only');
assert.equal(generated.cover.generatedImage, false);
assert.equal(generated.cover.blur, false);
assert.ok(generated.slides.length >= 1);
assert.equal(generated.slides[0].index, 2);

// Browser download/reconnect is represented by a JSON byte-for-byte roundtrip.
const downloaded = JSON.stringify(generated);
const restored = restoreBrowserConversionModel(downloaded);
assert.deepEqual(restored, generated);

assert.throws(() => restoreBrowserConversionModel({ temporaryTestOnly: false, publicationAllowed: false }));
assert.throws(() => restoreBrowserConversionModel({ temporaryTestOnly: true, publicationAllowed: true }));

console.log(JSON.stringify({
  temporaryTestOnly: restored.temporaryTestOnly,
  publicationAllowed: restored.publicationAllowed,
  slideCount: restored.slides.length,
  firstSlideIndex: restored.slides[0].index,
  roundTripEqual: true,
  syntheticFixtureOnly: true
}, null, 2));
