import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {sourceAccess}=require('../desktop/source-access.cjs');
const {fetchPublic}=require('../desktop/public-source.cjs');
for(const host of ['teamblind.com','www.teamblind.com','gall.dcinside.com','m.dcinside.com','cafe.daum.net','m.cafe.daum.net']) {
  assert.equal(sourceAccess('https://'+host+'/post/1').automatic,false);
  assert.equal(sourceAccess('https://'+host+'/post/1').blockAutomatic,true);
  let called=false;
  await assert.rejects(fetchPublic('https://'+host+'/post/1',{mime:'html',maxBytes:100,fetchImpl:async()=>{called=true;}}));
  assert.equal(called,false);
}
assert.equal(sourceAccess('').mode,'needs_exact_url');
assert.equal(sourceAccess('https://theqoo.net/square/3826792703').automatic,true);
assert.equal(sourceAccess('https://www.inven.co.kr/board/1').automatic,true);
assert.equal(sourceAccess('https://theqoo.net.evil.example/post').automatic,false);
assert.equal(sourceAccess('https://www.ppomppu.co.kr/zboard/view.php?id=freeboard&no=123').automatic,true);
assert.equal(sourceAccess('https://www.ppomppu.co.kr/zboard/view.php?id=myboard&no=123').blockAutomatic,true);
assert.equal(sourceAccess('https://www.ppomppu.co.kr/search_bbs.php').blockAutomatic,true);
console.log('Community access routing and pre-request restriction: PASS');
