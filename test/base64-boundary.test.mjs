import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createScaleFixture} from '../mobile/android-review/test/scale-fixture.mjs';
import {createGithubAdapter} from '../mobile/android-review/app/github-adapter.js';
import {readReviewStateBlob,readPinnedReviewState} from '../mobile/android-review/pc/github-transport.mjs';
import {runReleaseFeed} from '../mobile/android-review/pc/release-feed.mjs';
import {version} from '../desktop/post-review-store.cjs';
import {mockReviewGithub} from '../mobile/android-review/test/helpers/mock-review-github.mjs';

const stateLimit=8*1024*1024,imageLimit=25*1024*1024;
const wrap=(content,ending='\r\n ')=>content.replace(/.{1,60}/g,'$&'+ending);
const configured=(f,api=f.api)=>createGithubAdapter({...f.repository,approved:true,api});
function wrappedApi(f){return async route=>{const r=await f.api(route);return r.encoding==='base64'?{...r,content:wrap(r.content)}:r;};}

test('exact 8 MiB pinned state survives CRLF and space wrapping in PC and mobile readers',async()=>{
 const f=createScaleFixture({posts:1,pages:1,targetBytes:stateLimit}),api=wrappedApi(f);
 assert.equal(f.stateBytes.length,stateLimit);
 assert.equal((await configured(f,api).request('/v1/review/manifest')).entries.length,1);
 const pinned=await readPinnedReviewState({enabled:true,repository:f.repository,api});
 assert.equal(pinned.blobSha,f.stateBlobSha);
 assert.equal(pinned.state.manifest.entries.length,1);
});

test('exact 25 MiB PNG survives wrapped base64 and rejects changed hash or decoded size',async()=>{
 const f=createScaleFixture({posts:1,pages:1,largePngBytes:imageLimit});let mode='wrapped';
 const a=configured(f,async route=>{
  const r=await f.api(route);if(r.size!==imageLimit)return r;
  if(mode==='wrapped'){const response={...r,content:wrap(r.content)};assert.ok(Buffer.byteLength(JSON.stringify(response))<40*1024*1024,'Maximum wrapped PNG fits native bounded response');return response;}
  if(mode==='changed')return {...r,content:r.content.slice(0,-8)+'AAAA'+r.content.slice(-4)};
  const tooLarge=Buffer.concat([f.assetBytes(f.manifest.entries[0].images[0].sha256),Buffer.from([1])]);
  return {...r,content:tooLarge.toString('base64')};
 });
 const image=(await a.request('/v1/review/manifest')).entries[0].images[0];
 assert.equal((await a.downloadAsset(image)).size,imageLimit);
 mode='changed';await assert.rejects(a.downloadAsset(image),/hash/i);
 mode='decoded-overflow';await assert.rejects(a.downloadAsset(image),/size/i);
});

test('state readers reject normalized overflow, decoded mismatch and hash mismatch',async()=>{
 const f=createScaleFixture({posts:1,pages:1,targetBytes:stateLimit}),base={sha:f.stateBlobSha,size:stateLimit,encoding:'base64',content:f.stateBytes.toString('base64')};
 for(const response of [
  {...base,content:base.content+'AAAA'},
  {...base,content:base.content.slice(0,-4)},
  {...base,content:'A'+base.content.slice(1)},
 ]){
  await assert.rejects(readReviewStateBlob({api:async()=>response,prefix:'/repos/fixture/review',response}));
  await assert.rejects(configured(f,async route=>route.includes('/git/blobs/')?response:f.api(route)).request('/v1/review/manifest'));
 }
});

test('state readers reject excessive raw whitespace before normalizing it',async()=>{
 const f=createScaleFixture({posts:1,pages:1}),raw=' '.repeat(2*Math.ceil(stateLimit/3)*4+1001),response={sha:f.stateBlobSha,size:f.stateBytes.length,encoding:'base64',content:raw};
 const original=String.prototype.replace;let normalized=false;
 String.prototype.replace=function(...args){if(String(this)===raw){normalized=true;throw Error('Oversized raw input reached normalization');}return original.apply(this,args);};
 try{
  await assert.rejects(readReviewStateBlob({api:async()=>response,prefix:'/repos/fixture/review',response}));
  await assert.rejects(configured(f,async route=>route.includes('/contents/')?response:f.api(route)).request('/v1/review/manifest'));
  assert.equal(normalized,false);
 }finally{String.prototype.replace=original;}
});

test('feed verifies a wrapped 25 MiB immutable PNG before reuse in the next round',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'base64-boundary-'));
 t.after(async()=>{const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(root));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await fs.rm(root,{recursive:true,force:true});});
 const f=createScaleFixture({posts:1,pages:1,largePngBytes:imageLimit}),image=f.manifest.entries[0].images[0],png=f.assetBytes(image.sha256),remote=mockReviewGithub(f.repository);
 const row={id:'boundary-post',title:'Synthetic boundary',sourceFingerprint:'1'.repeat(64),outputSha256:'2'.repeat(64),ruleVersion:'synthetic',reviewRound:'boundary-first',outputFolder:'synthetic',images:[{name:'rendered/slide-001.png',sha256:image.sha256}]};
 const store={readOnly:true,pcVersion:'0.3.19',list:async()=>({reviewRound:row.reviewRound,entries:[{id:row.id,title:row.title,outputVersion:version(row),hasOutput:true,current:null,pageLabels:['Cover']}]}),image:async()=> 'data:image/png;base64,'+png.toString('base64')};
 const snapshot=()=>({pointer:{active:true,wholeCollectionRegenerated:true,reviewRound:row.reviewRound,posts:1,pages:1},report:{reviewRound:row.reviewRound,deliveryStatus:'complete',processed:1,entries:[{...row,status:'generated'}]},deliveryJournal:{reviewRound:row.reviewRound,complete:true}});
 const api=async(route,init)=>{const r=await remote.api(route,init);return route.includes('/git/blobs/')&&r.size===imageLimit?{...r,content:wrap(r.content)}:r;};
 const options={enabled:true,repository:f.repository,store,criteria:f.manifest.criteria,readSnapshots:async()=>snapshot(),api,allowedOutputRoot:root,persistJournal:async()=>{}};
 const first=await runReleaseFeed({...options,outputDirectory:path.join(root,'first')});assert.equal(first.status,'confirmed');
 row.reviewRound='boundary-second';
 const next=await runReleaseFeed({...options,journal:first.journal,outputDirectory:path.join(root,'second')});assert.equal(next.status,'confirmed');
 const pngBlob=createHash('sha1').update(Buffer.from('blob '+png.length+'\0')).update(png).digest('hex');
 assert.ok(remote.calls.some(c=>c.route.endsWith('/git/blobs/'+pngBlob)));
 assert.equal(remote.calls.filter(c=>c.method==='POST'&&c.route.endsWith('/git/blobs')&&Buffer.from(c.body.content,'base64').length===imageLimit).length,1);
});
