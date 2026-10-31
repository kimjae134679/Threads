import assert from 'node:assert/strict';
import test from 'node:test';
import { exactSourceUrl, platformFor, titleFrom } from '../scripts/normalize-existing-candidates.mjs';

test('extracts only an exact source URL field', () => {
  const markdown = [
    '# Candidate',
    '- discovery URL: https://example.com/search',
    '- sourceUrl: https://theqoo.net/square/12345',
  ].join('\n');
  assert.equal(exactSourceUrl(markdown), 'https://theqoo.net/square/12345');
});

test('reads a bare URL only under an exact-link heading', () => {
  assert.equal(exactSourceUrl('## 정확한 링크\n\nhttps://www.inven.co.kr/board/webzine/2097/123'), 'https://www.inven.co.kr/board/webzine/2097/123');
  assert.equal(exactSourceUrl('## 참고 URL\nhttps://example.com/index'), null);
});

test('recognizes legacy public URL field names', () => {
  assert.equal(exactSourceUrl('- publicUrl: https://theqoo.net/square/456'), 'https://theqoo.net/square/456');
  assert.equal(exactSourceUrl('- public_url: https://www.inven.co.kr/board/webzine/2097/789'), 'https://www.inven.co.kr/board/webzine/2097/789');
});

test('does not treat an unlabelled link as the source URL', () => {
  assert.equal(exactSourceUrl('# Candidate\nSee https://example.com/post/1'), null);
});

test('prefers observed title and falls back to a Markdown heading', () => {
  assert.equal(titleFrom('- exactObservedTitle: 원문 제목\n# 다른 메모', 'candidate.md'), '원문 제목');
  assert.equal(titleFrom('# 제목 기록\n', 'candidate.md'), '제목 기록');
});

test('classifies known source hosts and a safe unknown host', () => {
  assert.equal(platformFor('https://theqoo.net/square/123', '', ''), 'theqoo');
  assert.equal(platformFor('https://www.example.org/post/1', '', ''), 'example');
  assert.equal(platformFor(null, 'Blind public source', 'candidate.md'), 'blind');
});
