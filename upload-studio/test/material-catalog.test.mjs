import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createState,importBundle,setFinalReview,finalCaption} from '../domain.mjs';
import {LocalAssets} from '../local-assets.mjs';
import {MaterialCatalog} from '../material-catalog.mjs';
import {materialZip} from '../material-zip.mjs';
import {createStudioServer} from '../server.mjs';
import {StateStore} from '../store.mjs';
import '../../app/unified-material-txt.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ol8AAAAASUVORK5CYII=','base64');
test('collection scope is visible and canonical notes never expose their whole program footer as article text',async()=>{
 const f=await fixture();try{
  const html=await fs.readFile(new URL('../public/materials.html',import.meta.url),'utf8'),js=await fs.readFile(new URL('../public/materials.js',import.meta.url),'utf8');assert.match(html,/option value="collection"/);assert.match(js,/collection:'수집 원문 · 미제작·미승인'/);assert.match(js,/c\.collection/);
  const canonical=globalThis.ThreadsUnifiedMaterialTxt.serialize({human:{sourceUrl:'https://example.invalid/Zz',title:'표시 제목',body:'실제 참고 내용',bodyKind:'preserved',platformCaptions:{}},records:{manifest:{id:'pending',publicationAllowed:false},unknown:{providerState:'paused'}}});
  const source=path.join(f.root,'inputs/pending/source/source.txt');await fs.writeFile(source,canonical);const row=(await f.catalog.index()).records.find(r=>r.scope==='intake'),d=await f.catalog.detail(row.key);assert.equal(d.originalText,'실제 참고 내용');assert.equal(d.originalTextKind,'preserved');
  const exported=globalThis.ThreadsUnifiedMaterialTxt.parse((await f.catalog.unifiedText(row.key)).bytes);assert.deepEqual(exported.records.material.sourceMaterial,globalThis.ThreadsUnifiedMaterialTxt.parse(canonical),'single readable export retains exact source envelope and unknown fields');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-materials-')),materialRoot=path.join(root,'material'),inputRoot=path.join(root,'inputs');
 const im=await new LocalAssets(root).add({name:'fixture.png',mime:'image/png',base64:png.toString('base64')});
 let state=importBundle(createState(),{bundle_id:'test',posts:['a','b','c','h','r','x'].map(post_id=>({post_id,output_version:'v1',caption:'본문\n\n줄바꿈 그대로',tags:'#원래',common_tags:['이야기'],topic_tags:['여행','기록'],source:{label:post_id},images:[{asset_id:im.asset_id,mime:im.mime,order:1}]}))});
 state=setFinalReview(state,'a','passed',state.posts[0].revision,Date.now());state=setFinalReview(state,'b','discard',state.posts[1].revision,Date.now());
 state=setFinalReview(state,'h','hold',state.posts[3].revision,Date.now());state=setFinalReview(state,'r','revise',state.posts[4].revision,Date.now());state.posts[5].review_note='검토 메모';
 state.post_history={c:{entries:[{id:'old',saved_at:new Date().toISOString(),snapshot:{output_version:'old',caption:'이전 본문',platform_captions:{instagram:'이전 본문',threads:'이전 제목'},images:state.posts[2].images,tags:'#과거',topic_tags:[],source:{label:'c'}}}],cursor:0}};
 await fs.mkdir(path.join(materialRoot,'06_자동 제작 결과'),{recursive:true});await fs.mkdir(path.join(inputRoot,'pending','source'),{recursive:true});await fs.writeFile(path.join(inputRoot,'pending','source','original.txt'),'원본 그대로');
 const output=path.join(materialRoot,'06_자동 제작 결과','a');await fs.mkdir(path.join(output,'rendered'),{recursive:true});await fs.writeFile(path.join(output,'rendered','slide-001.png'),png);await fs.writeFile(path.join(output,'production-plan.json'),JSON.stringify({publishCaption:'제작 폴더 본문\n\n저장된 줄바꿈'}));
 await fs.writeFile(path.join(materialRoot,'06_자동 제작 결과','status.json'),JSON.stringify({inputFolder:inputRoot,entries:[{id:'a',title:'a',status:'generated',sourceFingerprint:'original-a',outputSha256:'output-a',ruleVersion:'fixture',outputFolder:'a',images:[{name:'rendered/slide-001.png',sha256:im.asset_id}]},{id:'pending',title:'준비중',status:'needs_source',relativePath:'pending',images:[]}]}));
 return {root,materialRoot,state,im,catalog:new MaterialCatalog({root,materialRoot,readState:async()=>state})};
}

test('one readable material TXT keeps both platform captions, existing tags and exact private post snapshot',async()=>{
 const f=await fixture();try{
  f.state.posts[0].provider_status={state:'paused',unrecognized_field:'preserve'};
  const before=structuredClone(f.state),index=await f.catalog.index(),record=index.records.find(r=>r.postId==='a'&&r.scope==='current');
  const files=await f.catalog.packageFiles(record.key,'instagram'),texts=files.filter(x=>x.name.endsWith('.txt'));
  assert.deepEqual(texts.map(x=>x.name),['자료.txt']);
  const data=globalThis.ThreadsUnifiedMaterialTxt.parse(texts[0].bytes);
  assert.equal(data.visibility,'private');
  assert.equal(data.human.platformCaptions.instagram,finalCaption(f.state.posts[0],'instagram'));
  assert.equal(data.human.platformCaptions.threads,finalCaption(f.state.posts[0],'threads'));
  assert.deepEqual(data.records.post,f.state.posts[0]);
  assert.deepEqual(f.state,before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('all current statuses, intake and historical records remain distinct and read-only',async()=>{
 const f=await fixture();try{const before=JSON.stringify(f.state),index=await f.catalog.index();assert.equal(index.counts.current,6);assert.equal(index.counts.intake,1);assert.equal(index.counts.currentDecisions.passed,1);assert.equal(index.counts.currentDecisions.discard,1);assert.equal(index.counts.currentDecisions.unreviewed,2);assert.equal(index.counts.currentDecisions.hold,1);assert.equal(index.counts.currentDecisions.revise,1);assert.equal(index.counts.currentStages.reviewing,1);assert.equal(index.counts.uniquePosts,7);
 const current=index.records.find(r=>r.postId==='a'&&r.scope==='current'),detail=await f.catalog.detail(current.key);assert.equal(detail.texts.instagram.fullText,finalCaption(f.state.posts[0],'instagram'));assert.equal(detail.currentFinalPass,true);assert.equal(detail.publicationAuthorized,false);assert.equal(detail.images[0].order,1);
 const old=await f.catalog.detail(index.records.find(r=>r.postId==='c'&&r.scope==='historical').key);assert.equal(old.currentFinalPass,false);assert.equal(old.completeMetadata,false);assert.equal(old.savedReview,null);
 const generated=await f.catalog.detail(index.records.find(r=>r.postId==='a'&&r.scope==='producer').key);assert.notEqual(generated.outputVersion,'v1');assert.equal(generated.texts.instagram.body,'제작 폴더 본문\n\n저장된 줄바꿈');assert.equal(generated.texts.threads.body,'제작 폴더 본문\n\n저장된 줄바꿈','raw producer Threads writing is never replaced by its cover title');assert.equal(generated.currentFinalPass,false);assert.equal(generated.decision,'unreviewed');assert.deepEqual((await f.catalog.image(generated.key,1)).bytes,png);
 const intake=await f.catalog.detail(index.records.find(r=>r.scope==='intake').key);assert.equal(intake.originalStatus,'needs_source');assert.equal(intake.texts,null);assert.equal(intake.sourceFiles.length,1);assert.equal(JSON.stringify(f.state),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('automatic replacement archives and backup edit history retain every old version',async()=>{
 const f=await fixture();try{const directory=path.join(f.root,'replaced','auto-production','a'.repeat(64));await fs.mkdir(directory,{recursive:true});const post={...structuredClone(f.state.posts[0]),post_id:'retired',output_version:'retired-v',final_review:null},history={entries:[{id:'prior',snapshot:{output_version:'prior-v',caption:'초기 보관 본문',images:post.images,source:{label:'retired'}}}]};await fs.writeFile(path.join(directory,'previous-post.json'),JSON.stringify({schema:1,post,history}));const backup=structuredClone(f.state);backup.post_history.a={entries:[{id:'aged-out',snapshot:{output_version:'aged-out-v',caption:'백업에만 남은 문안',images:post.images,source:{label:'a'}}}]};await fs.writeFile(path.join(f.root,'state.backup.json'),JSON.stringify(backup));const index=await f.catalog.index();assert.ok(index.records.some(r=>r.postId==='retired'&&r.outputVersion==='retired-v'&&r.scope==='historical'));assert.ok(index.records.some(r=>r.postId==='retired'&&r.outputVersion==='prior-v'));assert.ok(index.records.some(r=>r.postId==='a'&&r.outputVersion==='aged-out-v'));
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('decorative saved title never erases hashtag export or mutates saved body',async()=>{const f=await fixture();try{f.state.posts[2].caption='[ 저장된 제목 ]\n\n그대로 본문';f.state.posts[2].platform_captions.instagram=f.state.posts[2].caption;const index=await f.catalog.index(),d=await f.catalog.detail(index.records.find(r=>r.postId==='c'&&r.scope==='current').key);assert.equal(d.texts.instagram.body,f.state.posts[2].caption);assert.ok(d.texts.instagram.hashtags.includes('#원래'));assert.ok(d.texts.instagram.hashtags.includes('#여행'));assert.equal(d.texts.instagram.fullText,finalCaption(f.state.posts[2],'instagram'));}finally{await fs.rm(f.root,{recursive:true,force:true});}});
function unzipStored(bytes){const files=new Map();let offset=0;while(bytes.readUInt32LE(offset)===0x04034b50){const length=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extraLength=bytes.readUInt16LE(offset+28),start=offset+30+nameLength+extraLength,name=bytes.subarray(offset+30,offset+30+nameLength).toString('utf8'),data=bytes.subarray(start,start+length);let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}assert.equal((crc^0xffffffff)>>>0,bytes.readUInt32LE(offset+14),'ZIP CRC matches the original bytes');files.set(name,data);offset=start+length;}assert.equal(bytes.readUInt32LE(offset),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);return files;}
test('UTF-8 ZIP round trips unchanged texts and image bytes with valid checksums',async()=>{const files=[{name:'본문.txt',bytes:Buffer.from('첫 줄\n\n원본 줄바꿈')},{name:'01.png',bytes:png}],parts=[];for await(const b of materialZip(files))parts.push(b);const extracted=unzipStored(Buffer.concat(parts));for(const f of files)assert.deepEqual(extracted.get(f.name),f.bytes);});
test('HTTP catalog and downloads are read-only and new saved items appear automatically',async()=>{
 const f=await fixture();let app;try{await fs.writeFile(path.join(f.root,'state.json'),JSON.stringify(f.state));app=await createStudioServer({root:f.root,materialRoot:f.materialRoot,port:0,seedTags:false});const before=await fs.readFile(path.join(f.root,'state.json'));
 assert.equal((await fetch(app.url+'/materials/')).status,200);const index=await(await fetch(app.url+'/api/materials')).json(),row=index.records.find(r=>r.postId==='a'&&r.scope==='current');const response=await fetch(app.url+'/api/materials/'+row.key+'/package?platform=instagram');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);const files=unzipStored(Buffer.from(await response.arrayBuffer()));assert.deepEqual(files.get('01.png'),png);assert.equal(globalThis.ThreadsUnifiedMaterialTxt.parse(files.get('자료.txt')).records.material.texts.instagram.body,'본문\n\n줄바꿈 그대로');assert.deepEqual(await fs.readFile(path.join(f.root,'state.json')),before);
 const textResponse=await fetch(app.url+'/api/materials/'+row.key+'/text?scope=current');assert.equal(textResponse.status,200);assert.match(textResponse.headers.get('content-disposition'),/자료|UTF-8/);const textData=globalThis.ThreadsUnifiedMaterialTxt.parse(await textResponse.text());assert.equal(textData.human.platformCaptions.instagram,finalCaption(f.state.posts[0],'instagram'));assert.equal(textData.human.platformCaptions.threads,finalCaption(f.state.posts[0],'threads'));assert.equal(textData.records.material.publicationAuthorized,false);
 const audit=await(await fetch(app.url+'/api/materials/audit')).json();assert.equal(audit.problems.length,0);assert.equal(audit.stableRevision,true);
 await new StateStore(f.root).mutate(s=>setFinalReview(s,'a','hold',s.posts.find(p=>p.post_id==='a').revision,Date.now()));const old=await(await fetch(app.url+'/api/materials/'+row.key)).json();assert.equal(old.scope,'historical');assert.equal(old.currentFinalPass,false);assert.equal((await fetch(app.url+'/api/materials/'+row.key+'/package?platform=instagram&scope=current')).status,409);
 await new StateStore(f.root).mutate(s=>importBundle(s,{bundle_id:'new',posts:[{post_id:'new',output_version:'new-v',caption:'새 저장본',source:{label:'새 저장본'},images:[{asset_id:f.im.asset_id,mime:f.im.mime,order:1}]}]}));const latest=await(await fetch(app.url+'/api/materials')).json();assert.ok(latest.records.some(r=>r.postId==='new'&&r.scope==='current'&&r.decision==='unreviewed'));assert.equal((await fetch(app.url+'/api/materials/../../state.json')).status,404);
 }finally{if(app)await app.close();await fs.rm(f.root,{recursive:true,force:true});}
});
test('packages preserve ordered image bytes, text and review labels; changed files fail closed',async()=>{
 const f=await fixture();try{const index=await f.catalog.index(),record=index.records.find(r=>r.postId==='a'&&r.scope==='current');const files=await f.catalog.packageFiles(record.key,'instagram');const map=new Map(files.map(x=>[x.name,x.bytes]));assert.deepEqual(map.get('01.png'),png);const snapshot=globalThis.ThreadsUnifiedMaterialTxt.parse(map.get('자료.txt'));assert.equal(snapshot.records.material.texts.instagram.body,'본문\n\n줄바꿈 그대로');assert.equal(snapshot.human.platformCaptions.instagram,finalCaption(f.state.posts[0],'instagram'));assert.match(snapshot.records.material.statusLabel,/통과/);const metadata=snapshot.records.material;assert.equal(metadata.publicationAuthorized,false);assert.equal(metadata.images[0].sha256,f.im.asset_id);
 await fs.writeFile(path.join(f.root,'assets',f.im.asset_id),Buffer.from('changed'));await assert.rejects(f.catalog.packageFiles(record.key,'instagram'),/material_asset_hash_mismatch/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('archived passes never become current passes and exact duplicate sources retain links',async()=>{
 const f=await fixture();try{const dir=path.join(f.root,'replaced','old');await fs.mkdir(dir,{recursive:true});const old=structuredClone(f.state);old.posts[0].output_version='old';await fs.writeFile(path.join(dir,'state.json'),JSON.stringify(old));await fs.writeFile(path.join(dir,'state.backup.json'),JSON.stringify(old));const index=await f.catalog.index();const rows=index.records.filter(r=>r.postId==='a'&&r.scope==='historical');assert.equal(rows.length,1);assert.equal(rows[0].sourceCount,2);const detail=await f.catalog.detail(rows[0].key);assert.equal(detail.currentFinalPass,false);assert.equal(detail.savedReview.decision,'passed');assert.equal(detail.decision,'unreviewed');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});


test('single TXT header uses display title while original title and saved captions stay untouched',async()=>{
 const f=await fixture();try{
  f.state.posts[0].source.original_title='[네이트판] 원문 제목';f.state.posts[0].source.display_title='표시 제목';
  const before=structuredClone(f.state),row=(await f.catalog.index()).records.find(x=>x.postId==='a'&&x.scope==='current');
  const files=await f.catalog.packageFiles(row.key,'instagram'),data=globalThis.ThreadsUnifiedMaterialTxt.parse(files.find(x=>x.name==='자료.txt').bytes);
  assert.equal(data.human.title,'표시 제목');assert.equal(data.records.post.source.original_title,'[네이트판] 원문 제목');assert.deepEqual(f.state,before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('repository collection is an unproduced catalog with original filename keys and no inherited approval',async()=>{
 const f=await fixture();try{
  const repo=path.join(f.root,'repo'),folder=path.join(repo,'data/candidates/2026-10-09_추가수집'),name='261010_C1_A0_P0_카탈로그검증.md',markdown='# 수집된 표시 제목\n\n## 정확한 링크\nhttps://example.invalid/Zz?id=12\n\n## 글 내용\n본문 요약과 실제 결말.\n\n## 게시 설명글 초안\n수집된 표시 제목\n\n사건.\n\n행동.\n\n결말.\n\n#썰 #사연 #주제 #경험\n\n- 재사용 승인: false\n';
  await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,name),markdown);await fs.mkdir(path.join(repo,'data/candidates/_raw_batches'),{recursive:true});await fs.writeFile(path.join(repo,'data/candidates/_raw_batches',name),markdown);
  const before=JSON.stringify(f.state),catalog=new MaterialCatalog({root:f.root,materialRoot:f.materialRoot,readState:async()=>f.state,repositoryRoot:repo}),index=await catalog.index();assert.equal(index.counts.collection,1);const entry=index.records.find(r=>r.scope==='collection');assert.equal(entry.postId,'repo:'+name);assert.equal(entry.outputVersion,null);assert.equal(entry.currentFinalPass,false);const detail=await catalog.detail(entry.key);assert.equal(detail.publicationAuthorized,false);assert.equal(detail.reviewUrl,null);assert.equal(detail.originalText,markdown);assert.equal(detail.images.length,0);
  const file=await catalog.unifiedText(entry.key),snapshot=globalThis.ThreadsUnifiedMaterialTxt.parse(file.bytes);assert.equal(snapshot.records.candidate.originalKey,name);assert.equal(snapshot.records.candidate.originalMarkdown,markdown);assert.equal(snapshot.human.sourceUrl,'https://example.invalid/Zz?id=12');assert.equal(snapshot.human.bodyKind,'summary');assert.equal(JSON.stringify(f.state),before);await assert.rejects(catalog.packageFiles(entry.key,'instagram'),/material_production_not_ready/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
