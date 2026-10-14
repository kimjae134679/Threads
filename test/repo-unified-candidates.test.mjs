import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadRepoCandidates} from '../repo-candidates.mjs';
import '../app/unified-material-txt.js';
const C=globalThis.ThreadsUnifiedMaterialTxt;
const markdown=url=>'# 표시 제목\n\n## 글 내용\nZ가 포함된 본문과 실제 결말.\n\n## 정확한 링크\n'+url+'\n\n## 형식\n글\n';
test('recursive legacy MD preserves Z/z URL and body without activating raw/archive files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'repo-unified-'));try{
  const folder=path.join(root,'data/candidates/새 수집');await fs.mkdir(folder,{recursive:true});
  const name='261010_C1_A0_P0_Z사건.md',url='https://www.82cook.com/entiz/read.php?bn=15&num=1859445';
  await fs.writeFile(path.join(folder,name),markdown(url));
  await fs.mkdir(path.join(root,'data/candidates/_raw_batches'),{recursive:true});await fs.writeFile(path.join(root,'data/candidates/_raw_batches','261010_C1_A0_P0_retired.md'),markdown('https://example.invalid/retired'));
  const list=await loadRepoCandidates(root);assert.equal(list.count,1);assert.equal(list.items[0].url,url);assert.match(list.items[0].note,/Z가 포함된/);
  assert.equal(list.items[0].id,'repo:'+name);assert.equal(list.items[0].repoCandidatePath,'data/candidates/새 수집/'+name);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('known collection filename prefixes and BOM preserve original keys while only display titles are cleaned',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'repo-collection-'));try{
  const dir=path.join(root,'data/candidates/2026-10-09_추가수집');await fs.mkdir(dir,{recursive:true});
  const names=['추가수집261010_C1_A0_P0_사건.md','신규수집261009_C1_A0_P0_사건2.md'];
  for(const name of names)await fs.writeFile(path.join(dir,name),'\ufeff# [네이트판] [ 실제 제목 ]\r\n\r\n## 정확한 링크\r\nhttps://example.invalid/Zz\r\n\r\n## 글 내용\r\n실제 결말.\r\n');
  const data=await loadRepoCandidates(root);assert.equal(data.count,2);for(const item of data.items){assert.ok(names.includes(item.id.slice(5)));assert.equal(item.title,'실제 제목');assert.equal(item.sourceMeta.originalTitle,'[네이트판] [ 실제 제목 ]');assert.equal(item.sourceMeta.candidateStage,'C1');assert.equal(item.url,'https://example.invalid/Zz');}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('one TXT candidate retains existing filename key, stages and summary provenance',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'repo-unified-'));try{
  const folder=path.join(root,'data/candidates/새 수집');await fs.mkdir(folder,{recursive:true});
  const key='261010_C0_A0_P0_Z사건.md',url='https://example.invalid/zboard?key=Zz';
  const human={title:'표시 제목',sourceUrl:url,body: 'Z가 포함된 본문과 실제 결말.',bodyKind:'summary',platformCaptions:{instagram:'표시 제목\n\n기존 문안\n\n#썰 #사연 #일상 #친구'}};
  const records={candidate:{originalKey:key,originalMarkdown:markdown(url),publicationAllowed:false}};
  await fs.writeFile(path.join(folder,key.replace(/\.md$/,'.txt')),C.serialize({human,records},{visibility:'public'}));
  const list=await loadRepoCandidates(root);assert.equal(list.count,1);assert.equal(list.items[0].id,'repo:'+key);assert.equal(list.items[0].url,'');assert.equal(list.items[0].sourceMeta.provenanceUrl,url);assert.equal(list.items[0].sourceMeta.publicationAllowed,false);
  assert.equal(list.items[0].title,'표시 제목');assert.match(list.items[0].repoCandidatePath,/\.txt$/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('legacy date/platform filenames retain explicit C/A/P and exact source field in MD and canonical TXT',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'repo-unified-'));try{const dir=path.join(root,'data/candidates');await fs.mkdir(dir,{recursive:true});const key='2026-09-22_blind_AZaz.md',md='# 실제 표시\n\n- stage: C1\n- sourceUrl: https://example.invalid/Zz?key=AZaz\n- A1: false\n- P1: false\n- whyGood: 실제 사건과 결말 근거\n';
 await fs.writeFile(path.join(dir,key),md);let list=await loadRepoCandidates(root);assert.equal(list.count,1);assert.equal(list.items[0].url,'https://example.invalid/Zz?key=AZaz');assert.equal(list.items[0].sourceMeta.candidateStage,'C1');assert.equal(list.items[0].sourceMeta.assetStage,'A0');assert.equal(list.items[0].id,'repo:'+key);
 await fs.writeFile(path.join(dir,key.replace(/\.md$/,'.txt')),C.serialize({human:{title:'실제 표시',sourceUrl:list.items[0].url,body:'실제 사건과 결말 근거',bodyKind:'summary',platformCaptions:{}},records:{candidate:{originalKey:key,originalMarkdown:md,publicationAllowed:false}}},{visibility:'public'}));list=await loadRepoCandidates(root);assert.equal(list.count,1);assert.equal(list.items[0].id,'repo:'+key);assert.equal(list.items[0].sourceMeta.candidateStage,'C1');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
