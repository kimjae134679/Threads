import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash}from'node:crypto';
import {createRequire}from'node:module';import '../app/source-page-plan.js';
const require=createRequire(import.meta.url),{loadCoverAsset}=require('../desktop/cover-asset.cjs'),P=globalThis.ThreadsPagePlan;
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-cover-'));
try{
 const work=path.join(root,'작업 정보'),media=path.join(work,'cover-media');await fs.mkdir(media,{recursive:true});
 assert.equal(await loadCoverAsset(root),null);
 const data=Buffer.from([255,216,255,0,1,2]),asset={schema:'threads-cover-asset-v1',kind:'related',coverOnly:true,actualScene:false,
  name:'cleaning.jpg',sha256:createHash('sha256').update(data).digest('hex'),sourceUrl:'https://commons.wikimedia.org/wiki/File:Cleaning.jpg',
  attribution:'Photographer',license:'CC BY 2.0',relevance:'원문의 대청소 상황을 설명하는 참고 사진'};
 await fs.writeFile(path.join(media,asset.name),data);await fs.writeFile(path.join(work,'cover-asset.json'),JSON.stringify(asset));
 assert.equal((await loadCoverAsset(root)).file.data,data.toString('base64'));
 const original={id:'body',kind:'text',text:'원문의 첫 문장입니다.\n\n마지막 문장도 그대로 유지합니다.',selected:true};
 const extra={id:'supplementary-cover',kind:'image',mediaName:'cleaning.jpg',coverOnly:true,selected:true,contentRole:'illustrative_cover'};
 const plan={originalTitle:'결벽증 새언니 썰',coverTitle:'결벽증 새언니 썰',segments:[original,extra],comments:[],
  coverAsset:asset,editorial:{templateId:'photo_cover',coverSegmentId:extra.id}};
 const result=P.compile(plan,{'cleaning.jpg':{width:1280,height:853,analysis:{kind:'photo'}}},(t,s)=>t.length*s*.7);
 assert.equal(result.coverAsset.actualScene,false);assert.equal(result.sourceUnits.length,1);
 assert.equal(result.sourceUnits[0].text,original.text);
 assert(result.pages[0].operations.some(o=>o.kind==='image'&&o.sourceId===extra.id));
 assert(result.pages[0].operations.some(o=>o.role==='attribution'&&o.text.includes('참고 사진')));
 assert(!result.pages.slice(1).flatMap(p=>p.operations).some(o=>o.sourceId===extra.id));
 assert.throws(()=>P.compile({...plan,segments:[extra]},{'cleaning.jpg':{width:1280,height:853}},(t,s)=>t.length*s),/실제 원문/);
 assert.throws(()=>P.compile({...plan,segments:[original,{id:'missing',kind:'image',mediaName:'missing.png',selected:true},extra]},{'cleaning.jpg':{width:1280,height:853}},(t,s)=>t.length*s),/이미지 파일 누락/);
 await fs.writeFile(path.join(work,'cover-asset.json'),JSON.stringify({...asset,name:'../escape.jpg'}));await assert.rejects(loadCoverAsset(root),/출처/);
 await fs.writeFile(path.join(work,'cover-asset.json'),JSON.stringify({...asset,sha256:'0'.repeat(64)}));await assert.rejects(loadCoverAsset(root),/검증 기록/);
 await fs.writeFile(path.join(work,'cover-asset.json'),JSON.stringify({...asset,kind:'ai_generated'}));await assert.rejects(loadCoverAsset(root),/출처/);
}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('Supplementary cover provenance, hashing, traversal, body preservation and missing-original refusal PASS');
