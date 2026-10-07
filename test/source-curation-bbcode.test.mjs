import test from 'node:test';
import assert from 'node:assert/strict';
import '../app/source-curation.js';
const C=globalThis.ThreadsSourceCuration;
function htmlWithText(value) {
 const body={nodeType:1,tagName:'ARTICLE',className:'',id:'',hidden:false,parentElement:null,children:[],textContent:value,getAttribute:()=>null,matches:()=>false,querySelector:()=>null,querySelectorAll:()=>[]};
 body.childNodes=[{nodeType:3,nodeValue:value,parentElement:body}];
 return {querySelector:()=>null,querySelectorAll:selector=>selector==='article'?[body]:[]};
}
test('BBcode source images preserve article sequence, query URLs and missing-media evidence',()=>{
 const saved=globalThis.DOMParser;
 globalThis.DOMParser=class{parseFromString(text){return htmlWithText(text);}};
 try {
  const p=C.htmlDraft('앞 문단 [img=https://example.com/a.jpg?type=w430] 중간 문단 [img=https://example.com/b.png] 마지막 문단',['a.jpg']);
  assert.deepEqual(p.segments.map(x=>x.kind),['text','image','text','image','text']);
  assert.deepEqual(p.segments.filter(x=>x.kind==='text').map(x=>x.text),['앞 문단','중간 문단','마지막 문단']);
  assert.equal(p.segments[1].mediaUrl,'https://example.com/a.jpg?type=w430');
  assert.equal(p.segments[1].available,true);assert.equal(p.segments[3].available,false);
  assert.equal(p.publicationAllowed,false);
  const unsafe=C.htmlDraft('실제 문단 '+ 'a'.repeat(90)+' [img=javascript:alert(1)] [img=https://example.com/page]');
  assert.equal(unsafe.segments.filter(x=>x.kind==='image').length,0);
  assert.ok(unsafe.segments[0].text.includes('[img=javascript:alert(1)]'));
 }finally{globalThis.DOMParser=saved;}
});
