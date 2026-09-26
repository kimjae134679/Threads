import test from 'node:test';
import assert from 'node:assert/strict';
import { exactLink, imageLinks } from '../scripts/acquire-existing-sources.mjs';

test('uses a labeled exact article URL and does not guess a related link', () => {
  const note = '# 제목\n- 관련자료: https://example.org/related\n- 정확한 원문 링크: https://theqoo.net/review/123\n';
  assert.equal(exactLink(note),'https://theqoo.net/review/123');
  assert.equal(exactLink('# 제목\n- 관련자료: https://example.org/related\n'),null);
});
test('keeps ordered image URLs and rejects small page icons', () => {
  const html = '<img width="16" src="/icon.png"><img data-src="/photo.webp"><img src="/photo.webp"><img src="https://cdn.example.org/b.png">';
  assert.deepEqual(imageLinks(html,'https://theqoo.net/review/1'),[
    'https://theqoo.net/photo.webp','https://cdn.example.org/b.png'
  ]);
});
