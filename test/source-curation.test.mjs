import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../app/source-page-plan.js';
import '../app/source-curation.js';
const C=globalThis.ThreadsSourceCuration;

test('wide source image determines a consistent cover and body canvas height',()=>{
  assert.equal(C.coverHeight(1024,638),673);
  assert.equal(C.coverHeight(1024,1500),1350);
  assert.equal(C.coverHeight(1920,300),608);
});

test('curation keeps source order, image position and exact text',()=>{
  const body='첫 문단  \n\n[IMAGE:photo.jpg]\n두 번째 문단\n';
  const plan=C.exactDraft({title:'원문 제목',body,comments:[{text:'실제 댓글',likes:4}]});
  assert.deepEqual(plan.segments.map(x=>x.kind),['text','image','text']);
  assert.equal(plan.segments[0].text,'첫 문단  \n\n');
  assert.equal(plan.segments[1].location,'body:8');
  assert.equal(plan.segments[2].text,'두 번째 문단\n');
  assert.equal(plan.comments[0].selected,false);
});

test('image output requires chosen source background, verified positions and actual media',()=>{
  const plan=C.exactDraft({title:'원문',body:'본문\n[IMAGE:a.jpg]\n뒷글\n',comments:[]});
  plan.coverTitle='눈길을 끄는 원문 제목';
  plan.cover={kind:'text',segmentId:'s0'};
  assert.ok(C.validate(plan,new Set()).some(x=>x.includes('확인 표시')));
  plan.review={bodyVerified:true,mediaVerified:true,commentsVerified:true};
  assert.ok(C.validate(plan,new Set()).some(x=>x.includes('이미지 파일 누락')));
  assert.deepEqual(C.validate(plan,new Set(['a.jpg'])),[]);
  plan.cover={kind:null,segmentId:null};
  assert.ok(C.validate(plan,new Set(['a.jpg'])).some(x=>x.includes('첫 장')));
  plan.cover={kind:'image',segmentId:'s1'};
  assert.deepEqual(C.validate(plan,new Set(['a.jpg'])),[]);
  plan.style={fontId:'gothic',titleWeight:800};
  plan.segments[0].after={gap:120,note:'이 부분은 편집자가 쓴 의견'};
  assert.deepEqual(C.validate(plan,new Set(['a.jpg'])),[]);
  plan.style.titleWeight=900;
  assert.ok(C.validate(plan,new Set(['a.jpg'])).some(x=>x.includes('폰트')));
  plan.style.titleWeight=800;plan.segments[0].after.gap=401;
  assert.ok(C.validate(plan,new Set(['a.jpg'])).some(x=>x.includes('여백')));
});

test('automatic curation keeps article order, uses available media and leaves human review pending',()=>{
  const plan=C.exactDraft({title:'실제 글 제목',body:'첫 문단\n[IMAGE:photo.jpg]\n마지막 문단',comments:[
    {text:'반응이 있는 댓글',likes:32},{text:'일반 댓글',likes:null},{text:'다른 반응',likes:2}]});
  const suggestion=C.suggest(plan,['photo.jpg']);
  assert.deepEqual(suggestion,{body:2,images:1,missing:0,comments:2});
  assert.deepEqual(plan.segments.map(s=>s.selected),[true,true,true]);
  assert.deepEqual(plan.comments.map(c=>c.selected),[true,false,true]);
  assert.deepEqual(plan.cover,{kind:'image',segmentId:'s1'});
  assert.equal(plan.coverTitle,'실제 글 제목');
  assert.deepEqual(plan.review,{bodyVerified:false,mediaVerified:false,commentsVerified:false});
  assert.ok(C.validate(plan,new Set(['photo.jpg'])).some(message=>message.includes('확인 표시')));
  C.suggest(plan,[]);
  assert.equal(plan.segments[1].selected,true);
  assert.equal(plan.suggestion.missing,1);
  assert.ok(C.validate(plan,new Set()).some(message=>message.includes('이미지 파일 누락')));
});

test('source ZIP roundtrip verifies contents and rejects corrupted bytes and paths',async()=>{
  const sandbox={TextEncoder,TextDecoder,DataView,Uint8Array,Blob};
  sandbox.window=sandbox;vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(new URL('../app/source-cut-zip.js',import.meta.url),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(new URL('../app/source-bundle-zip.js',import.meta.url),'utf8'),sandbox);
  const zip=sandbox.ThreadsSourceCutZip.zip([
    {name:'bundle.json',data:new TextEncoder().encode('{"title":"원문"}')},
    {name:'raw/source.txt',data:new TextEncoder().encode('실제 본문')}]);
  const entries=await sandbox.ThreadsSourceBundleZip.read(zip);
  assert.equal(new TextDecoder().decode(entries.get('raw/source.txt')),'실제 본문');
  const broken=new Uint8Array(await zip.arrayBuffer());broken[52]^=1;
  await assert.rejects(sandbox.ThreadsSourceBundleZip.read(new Blob([broken])),/손상/);
  const unsafe=sandbox.ThreadsSourceCutZip.zip([{name:'../secret',data:new Uint8Array([1])}]);
  await assert.rejects(sandbox.ThreadsSourceBundleZip.read(unsafe),/안전하지 않은/);
});
