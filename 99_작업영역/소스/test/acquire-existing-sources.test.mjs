import test from 'node:test';
import assert from 'node:assert/strict';
import { exactLink, imageLinks, decodeHtml } from '../scripts/acquire-existing-sources.mjs';

test('uses a labeled exact article URL and does not guess a related link', () => {
  const note = '# 제목\n- 관련자료: https://example.org/related\n- 정확한 원문 링크: https://theqoo.net/review/123\n';
  assert.equal(exactLink(note),'https://theqoo.net/review/123');
  assert.equal(exactLink('# 제목\n- 관련자료: https://example.org/related\n'),null);
});
test('reads the original HTML charset and lazy image URLs', () => {
  const bytes = Buffer.from([0x3c,0x68,0x31,0x3e,0xbe,0xc8,0xb3,0xe7,0x3c,0x2f,0x68,0x31,0x3e]);
  assert.equal(decodeHtml(bytes, 'text/html; charset=euc-kr'), '<h1>안녕</h1>');
  assert.deepEqual(imageLinks('<img src="data:image/gif;base64,AAAA" srcset="/real.jpg 2x">', 'https://example.org/post'),
    ['https://example.org/real.jpg']);
});
test('keeps ordered image URLs and rejects small page icons', () => {
  const html = '<img width="16" src="/icon.png"><img data-src="/photo.webp"><img src="/photo.webp"><img src="https://cdn.example.org/b.png">';
  assert.deepEqual(imageLinks(html,'https://theqoo.net/review/1'),[
    'https://theqoo.net/photo.webp','https://cdn.example.org/b.png'
  ]);
});
