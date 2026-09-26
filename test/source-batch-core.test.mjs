import test from 'node:test';
import assert from 'node:assert/strict';
import '../app/source-batch-core.js';
const C = globalThis.ThreadsSourceBatchCore;

test('verbatim text retains interior spaces and blank lines', () => {
  const body = '첫 줄  \n\n  다음 줄\n';
  const parsed = C.parseExactText('[TITLE]\n그대로\n[BODY]\n' + body + '[COMMENTS]\nNONE\n');
  assert.equal(parsed.title, '그대로');
  assert.equal(parsed.body, body);
});
test('image positions remain between original text blocks', () => {
  assert.deepEqual(C.splitBody('앞\n[IMAGE:a.webp]\n뒤').map(x => x.type), ['text','image','text']);
  assert.equal(C.splitBody('앞\n[IMAGE:a.webp]\n뒤')[1].value, 'a.webp');
});
test('only supported popular comments are selected in stable order', () => {
  const result = C.rankPopular([{text:'미확인',likes:NaN},{text:'보통',likes:5},
    {text:'인기',likes:20},{text:'베스트',likes:NaN,best:true}]);
  assert.deepEqual(result.map(x=>x.text), ['베스트','인기','보통']);
});
test('old metadata and incomplete records are not converted', () => {
  assert.equal(C.classifyPath('data/jev_results/x.jev.json'),'jev_evaluation');
  assert.equal(C.classifyPath('03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/x/test.json'),'test_only');
  const a={title:'제목',body:'본문',exactText:true,commentCount:0,commentStatus:'observed',renderedPages:2,missingMedia:[]};
  assert.equal(C.status({...a,exactText:false}),'needs_verbatim_check');
  assert.equal(C.status({...a,missingMedia:['a.png']}),'needs_media');
  assert.equal(C.status({...a,commentStatus:'unknown'}),'needs_comment_check');
  assert.equal(C.status(a),'converted');
});
