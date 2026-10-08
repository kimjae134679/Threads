import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {exportRelease} from '../mobile/android-review/pc/exchange.mjs';
import {createGithubAdapter} from '../mobile/android-review/app/github-adapter.js';
import {version} from '../desktop/post-review-store.cjs';
const bytes=Buffer.alloc(4*1024*1024+1,17);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
const sha=createHash('sha256').update(bytes).digest('hex'),blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const row={id:'synthetic-large-png',title:'Synthetic image size fixture',sourceFingerprint:'1'.repeat(64),outputSha256:'2'.repeat(64),ruleVersion:'synthetic',reviewRound:'fixture',images:[{name:'rendered/slide-001.png',sha256:sha}]};
const entry={id:row.id,title:row.title,outputVersion:version(row),reviewRound:row.reviewRound,revision:0,review:null,images:[{url:'/v1/review/assets/'+sha+'.png',sha256:sha,label:'Synthetic cover'}]};
const state={githubReviewSchema:1,manifest:{schemaVersion:1,reviewRound:'fixture',criteria:{version:'synthetic',items:[]},entries:[entry]},assets:{[entry.images[0].url]:{sha256:sha,blobSha:blob}},operations:{}};
test('PC export handles a 4 MiB synthetic PNG without recursive base64 regex overflow',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'large-png-export-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store={readOnly:true,pcVersion:'0.3.19',root:path.join(root,'unused-source'),list:async()=>({reviewRound:'fixture',entries:[{...entry,hasOutput:true}]}),image:async()=> 'data:image/png;base64,'+bytes.toString('base64')};
 const r=await exportRelease({store,rows:[row],criteria:state.manifest.criteria,reviewRound:'fixture',allowedOutputRoot:root,outputDirectory:path.join(root,'release')});
 assert.deepEqual(await fs.readFile(path.join(r.assetDirectory,sha+'.png')),bytes);
 await assert.rejects(exportRelease({store:{...store,image:async()=> 'data:image/png;base64,'+bytes.toString('base64').slice(0,-1)+'!'},rows:[row],criteria:state.manifest.criteria,reviewRound:'fixture',allowedOutputRoot:root,outputDirectory:path.join(root,'invalid')}),/PNG/);
});
test('mobile adapter downloads a 4 MiB synthetic PNG with strict bounded base64 validation',async()=>{
 let corrupt=false;const stateBytes=Buffer.from(JSON.stringify(state));
 const adapter=createGithubAdapter({approved:true,dedicatedReviewRepository:true,owner:'fixture',repo:'review',repositoryId:1,branch:'mobile-review/data',api:async route=>{
  if(route==='/repos/fixture/review')return {private:true,id:1,owner:{login:'fixture'},name:'review',default_branch:'main'};
  if(route.includes('/git/ref/'))return {object:{sha:'a'.repeat(40)}};
  if(route.includes('/git/commits/'))return {tree:{sha:'b'.repeat(40)}};
  if(route.includes('/contents/'))return {encoding:'base64',size:stateBytes.length,content:stateBytes.toString('base64'),sha:createHash('sha1').update(Buffer.concat([Buffer.from('blob '+stateBytes.length+'\0'),stateBytes])).digest('hex')};
  return {encoding:'base64',size:bytes.length,sha:blob,content:corrupt?bytes.toString('base64').slice(0,-1)+'!':bytes.toString('base64')};
 }});
 await adapter.request('/v1/review/manifest');assert.deepEqual(Buffer.from(await (await adapter.downloadAsset(entry.images[0])).arrayBuffer()),bytes);
 corrupt=true;await assert.rejects(adapter.downloadAsset(entry.images[0]),/base64/);
});
