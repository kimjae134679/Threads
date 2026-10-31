import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import '../app/unified-material-txt.js';
import '../app/source-page-plan.js';
const require=createRequire(import.meta.url),C=globalThis.ThreadsUnifiedMaterialTxt;
const source={schema:'threads-verbatim-source-v1',verbatim:true,title:'[후기] 원문 제목',sourceUrl:'https://example.invalid/original',
 body:'한국어  띄어쓰기\r\n제목 - 본문 속 헤더\r\n끝',comments:[{text:'보존 댓글',likes:3,sourceOrder:0}],intake:{id:'existing-source-id',unknownField:'preserve'}};
const records={source,manifest:{schema:'threads-program-input-v1',id:'existing-source-id',title:source.title,sourceUrl:source.sourceUrl,publicationAllowed:false},
 production:{outputVersion:'old-version',reviewRound:'old-round',sourceFingerprint:'old-fingerprint'}};
const human={sourceUrl:source.sourceUrl,title:globalThis.ThreadsPagePlan.titleInfo(source.title).displayTitle,body:source.body,bodyKind:'verbatim',platformCaptions:{instagram:'기존 문안\n\n#기존태그',threads:'기존 Threads'}};
const text=C.serialize({human,records},{bom:true,lineEnding:'\r\n'});

test('preserved canonical notes retain only exactly pinned saved-media inspection input, never verbatim approval',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-saved-media-'));try{
  const {createHash}=await import('node:crypto'),hash=b=>createHash('sha256').update(b).digest('hex'),review={verbatim:false,bodyRead:false,commentsRead:false,rightsReviewed:false,privacyReviewed:false,publicationAllowed:false};await fs.mkdir(path.join(root,'media'));
  const media=[];for(let i=1;i<=8;i++){const name=String(i).padStart(2,'0')+'-'+String(i).padStart(2,'0')+'.jpg',bytes=Buffer.from('fixture image '+i);await fs.writeFile(path.join(root,'media',name),bytes);media.push({sequence:i,file:'media/'+name,bytes:bytes.length,sha256:hash(bytes),role:'body',bodyPositionVerified:false,ocrVerified:false,rightsReviewed:false});}
  const manifest={schema:'threads-program-input-v1',id:'existing-media-id',title:'[후기] 이미지 본문',sourceUrl:'https://example.invalid/media',media,sourceReview:review,publicationAllowed:false},raw=JSON.stringify(manifest,null,2)+'\r\n';await fs.writeFile(path.join(root,'manifest.json'),raw);
  const {loadBatchInput}=require('../desktop/batch-input.cjs'),before=await loadBatchInput(root,{id:manifest.id}),data={human:{title:'이미지 본문',sourceUrl:manifest.sourceUrl,body:'[BODY_SEQUENCE]\n보존된 검토 메모',bodyKind:'preserved',platformCaptions:{}},records:{source:null,manifest,legacyFiles:{'manifest.json':{text:raw,bytes:Buffer.byteLength(raw),sha256:hash(raw)}}}};
  await fs.writeFile(path.join(root,'자료.txt'),C.serialize(data));const after=await loadBatchInput(root,{id:manifest.id});assert.deepEqual(after,before);assert.equal(after.inputKind,'saved-media');assert.deepEqual(JSON.parse(after.sourceText).sourceReview,review);assert.equal(after.files.length,8);
  await assert.rejects(loadBatchInput(root,{id:'wrong-id'}),/id_conflict/);
  const corrupt=structuredClone(data);corrupt.records.manifest.media.reverse();await fs.writeFile(path.join(root,'자료.txt'),C.serialize(corrupt));await assert.rejects(loadBatchInput(root),/saved_media/);
  await fs.writeFile(path.join(root,'자료.txt'),C.serialize(data));await fs.writeFile(path.join(root,'media/01-01.jpg'),'tampered');await assert.rejects(loadBatchInput(root),/saved_media|원본 이미지/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const name of ['active38'])test(name+' saved source importer preserves existing ID and exact canonical bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-import-'));try{
  const file=path.join(root,'자료.txt'),input=path.join(root,'input');await fs.writeFile(file,text);
  const {importSavedSource}=require('../desktop/source-import.cjs');
  const row=await importSavedSource({file,root:input});assert.equal(row.id,'existing-source-id');
  const index=JSON.parse(await fs.readFile(path.join(input,'index.json'),'utf8')),entry=index.records.find(x=>x.id===row.id);
  assert.equal(await fs.readFile(path.join(input,entry.folder,'source','source.txt'),'utf8'),text);
  assert.equal(JSON.parse(await fs.readFile(path.join(input,entry.folder,'manifest.json'),'utf8')).publicationAllowed,false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const name of ['active38'])test(name+' folder/batch parser reads one TXT and holds explicit summaries before fallback',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-batch-'));try{
  await fs.writeFile(path.join(root,'資料.txt'),text); // Unsupported filename is not guessed.
  await fs.writeFile(path.join(root,'자료.txt'),text);
  const dir='../desktop/';
  const {discoverCandidates}=require(dir+'folder-batch.cjs'),{loadBatchInput}=require(dir+'batch-input.cjs');
  const found=await discoverCandidates(root);assert.equal(found.length,1);assert.equal(found[0].id,'existing-source-id');
  const job=await loadBatchInput(root);assert.equal(job.sourceText,text.replace(/^\ufeff/,''));assert.equal(job.sourceUrl,source.sourceUrl);assert.equal(job.originalTitle,source.title);assert.equal(job.displayTitle,human.title);assert.equal(job.unifiedMaterial.records.source.title,source.title);
  const summary=C.serialize({human:{...human,bodyKind:'summary'},records});await fs.writeFile(path.join(root,'자료.txt'),summary);
  await fs.writeFile(path.join(root,'source.json'),JSON.stringify(source));
  await assert.rejects(loadBatchInput(root),/unified_material_not_verbatim/);
  await fs.writeFile(path.join(root,'자료.txt'),text.replace('제목 - 원문 제목','제목 - 손상'));
  await assert.rejects(loadBatchInput(root),/unified_material_invalid/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const name of ['active38'])test(name+' import fails closed on conflicting stored identity and empty verbatim source',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-conflict-'));try{
  const file=path.join(root,'자료.txt'),input=path.join(root,'input');
  const {importSavedSource}=require('../desktop/source-import.cjs');
  const conflict={...records,manifest:{...records.manifest,id:'different-id'}};
  await fs.writeFile(file,C.serialize({human,records:conflict}));
  await assert.rejects(importSavedSource({file,root:input}),/unified_material_id_conflict/);
  for(const body of ['', ' \r\n\t']){
    await fs.writeFile(file,C.serialize({human:{...human,body},records:{...records,source:{...source,body}}}));
    await assert.rejects(importSavedSource({file,root:input}),/unified_material_source_mismatch/);
  }
  await fs.mkdir(input,{recursive:true});await fs.writeFile(path.join(input,'index.json'),JSON.stringify({schema:'threads-program-input-index-v1',records:[{id:'existing-source-id',title:'기존 다른 글',sourceUrl:'https://example.invalid/different',folder:'old'}]}));
  await fs.writeFile(file,text);
  await assert.rejects(importSavedSource({file,root:input}),/unified_material_id_conflict/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const name of ['active38'])test(name+' indexed discovery cannot bypass canonical identity validation before production',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-index-'));try{
  const folder=path.join(root,'candidate');await fs.mkdir(folder);
  await fs.writeFile(path.join(root,'index.json'),JSON.stringify({schema:'threads-program-input-index-v1',records:[{id:'existing-source-id',folder:'candidate',sourceUrl:source.sourceUrl}]}));
  await fs.writeFile(path.join(folder,'자료.txt'),C.serialize({human,records:{...records,source:{...source,intake:{...source.intake,id:'different-id'}}}}));
  const dir='../desktop/',{discoverCandidates}=require(dir+'folder-batch.cjs'),{loadBatchInput}=require(dir+'batch-input.cjs');
  const [candidate]=await discoverCandidates(root);
  await assert.rejects(loadBatchInput(candidate.folder,candidate),/unified_material_id_conflict/);
  await fs.writeFile(path.join(folder,'자료.txt'),text);
  await assert.rejects(loadBatchInput(folder,{id:'different-outer-id'}),/unified_material_id_conflict/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const name of ['active38'])test(name+' prepared canonical wrapper preserves source ID and original rendering bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-prepared-'));try{
  const {createHash}=await import('node:crypto'),fingerprint='b'.repeat(64),id=source.intake.id+'-'+fingerprint.slice(0,16),originalText=JSON.stringify(source,null,2)+'\r\n';
  const preparedInput={schema:'threads-prepared-input-v1',id,postId:source.intake.id,sourceId:source.intake.id,fingerprint};
  const data={human,records:{source,preparedInput,sourceOriginal:{name:'source.json',text:originalText,sha256:createHash('sha256').update(originalText).digest('hex')}}};
  await fs.writeFile(path.join(root,'자료.txt'),C.serialize(data));
  const dir='../desktop/',{loadBatchInput}=require(dir+'batch-input.cjs');
  const job=await loadBatchInput(root,{id});assert.equal(job.sourceName,'source.json');assert.equal(job.sourceText,originalText);assert.equal(job.unifiedMaterial.records.source.intake.id,source.intake.id);
  await fs.writeFile(path.join(root,'자료.txt'),C.serialize({...data,records:{...data.records,preparedInput:{...preparedInput,fingerprint:'c'.repeat(64)}}}));await assert.rejects(loadBatchInput(root,{id}),/unified_material_id_conflict/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
