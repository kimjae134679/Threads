import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import * as d from '../domain.mjs';
import {StateStore} from '../store.mjs';
import {LocalAssets} from '../local-assets.mjs';
import {ReviewHandoff} from '../review-handoff.mjs';
import {deliveryFingerprint} from '../delivery-results.mjs';
import {createStudioServer} from '../server.mjs';

const at='2026-10-09T22:30:00.000Z',jpeg=Buffer.from([255,216,255,224,1,2,255,217]);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const bounded=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out while full export remained blocked')),3000);})]);}finally{clearTimeout(timer);}};
let count=0;const check=async(name,run)=>{await run();count++;console.log('ok handoff performance: '+name);};

await check('verdict and notes persist while full export is blocked and stale exports never become latest',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-handoff-performance-'));let app,blockRevision=null,nextBlockRevision=null;
 const first=deferred(),firstStarted=deferred(),second=deferred(),secondStarted=deferred(),original=ReviewHandoff.prototype.write;
 ReviewHandoff.prototype.write=async function(state,...args){
  if(state.revision===blockRevision){firstStarted.resolve();await first.promise;}
  if(state.revision===nextBlockRevision){secondStarted.resolve();await second.promise;}
  return original.call(this,state,...args);
 };
 const request=async(route,body,status=200)=>{const response=await fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});const value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return value;};
 try{
  const assets=new LocalAssets(root),asset=await assets.add({name:'fixture.jpg',mime:'image/jpeg',base64:jpeg.toString('base64')});
  let state=d.importBundle(d.createState(),{bundle_id:'latency-fixture',posts:Array.from({length:18},(_,i)=>({post_id:'p-'+i,output_version:'v1',caption:'현재 검토 문안 '+i,images:Array.from({length:3},(_,order)=>({...asset,order:order+1}))}))});
  for(let i=0;i<17;i++)state=d.setFinalReview(state,'p-'+i,'passed',state.posts[i].revision,at);
  await new StateStore(root).mutate(()=>state);
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});
  state=(await request('/api/state')).state;blockRevision=state.revision+1;
  const started=performance.now(),verdict=await bounded(request('/api/final-review',{post_id:'p-17',decision:'passed',expected_revision:state.posts[17].revision}),'verdict save');
  const elapsed=performance.now()-started;
  assert.equal(verdict.state.posts[17].final_review_status,'passed');
  const durable=JSON.parse(await fs.readFile(path.join(root,'state.json'),'utf8')),thin=JSON.parse(await fs.readFile(path.join(root,'final-review-decisions.json'),'utf8'));
  assert.equal(durable.revision,verdict.state.revision);assert.equal(thin.revision,durable.revision);assert.equal(thin.posts[17].decision,'passed');
  await bounded(firstStarted.promise,'background export start');
  let latest=(await request('/api/final-review/handoff')).latest;assert.equal(latest.pending,true);assert.equal(latest.path,null);assert.equal(latest.state_revision,durable.revision);
  nextBlockRevision=durable.revision+1;
  const noteSaved=await bounded(request('/api/posts/p-17',{expected_revision:verdict.state.posts[17].revision,patch:{review_note:'빠른 저장 메모\n유지'}}),'note save');
  assert.equal(noteSaved.state.posts[17].final_review_status,'passed');
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'final-review-decisions.json'),'utf8')).revision,noteSaved.state.revision);
  first.resolve();await bounded(secondStarted.promise,'coalesced current export start');
  latest=(await request('/api/final-review/handoff')).latest;assert.equal(latest.pending,true);assert.equal(latest.path,null);assert.equal(latest.state_revision,noteSaved.state.revision);
  await request('/api/final-review/handoff',{expected_revision:durable.revision},409);
  const explicit=request('/api/final-review/handoff',{expected_revision:noteSaved.state.revision});second.resolve();
  const ready=await bounded(explicit,'explicit current export');assert.equal(ready.state_revision,noteSaved.state.revision);assert.equal(ready.count,18);
  latest=(await request('/api/final-review/handoff')).latest;assert.equal(latest.pending,false);assert.equal(latest.state_revision,noteSaved.state.revision);assert.equal(latest.path,ready.path);
  const manifest=JSON.parse(await fs.readFile(ready.path,'utf8'));assert.equal(manifest.state_revision,noteSaved.state.revision);assert.equal(manifest.posts[0].images[0].sha256,asset.asset_id);
  console.log('Measured verdict API fixture latency with full export blocked: '+elapsed.toFixed(1)+' ms; fixture contains 54 image references.');
 }finally{
  first.resolve();second.resolve();if(app)await app.close();ReviewHandoff.prototype.write=original;await fs.rm(root,{recursive:true,force:true});
 }
});

await check('explicit export revalidates image bytes and does not advertise a failed export',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-handoff-asset-check-'));let app;
 const request=async(route,body,status=200)=>{const response=await fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});const value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return value;};
 try{
  const assets=new LocalAssets(root),asset=await assets.add({name:'fixture.jpg',mime:'image/jpeg',base64:jpeg.toString('base64')});
  let state=d.importBundle(d.createState(),{bundle_id:'asset-check',posts:[{post_id:'p',output_version:'v1',caption:'본문',images:[{...asset,order:1}]}]});state=d.setFinalReview(state,'p','passed',1,at);
  await new StateStore(root).mutate(()=>state);
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});
  state=(await request('/api/state')).state;const ready=await request('/api/final-review/handoff',{expected_revision:state.revision});assert.ok(ready.path);
  await fs.writeFile(path.join(assets.root,asset.asset_id),Buffer.from('changed bytes'));
  const failed=await request('/api/final-review/handoff',{expected_revision:state.revision},400);assert.ok(failed.code);
  const latest=(await request('/api/final-review/handoff')).latest;assert.equal(latest.path,null);assert.notEqual(latest.code,null);
  assert.equal((await request('/api/state')).state.posts[0].final_review_status,'passed');
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});

await check('startup title migration invalidates only changed copies and delivery reads never change verdicts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-migration-delivery-http-'));let app;
 const request=async()=>{const response=await fetch(app.url+'/api/state');assert.equal(response.status,200);return response.json();};
 try{
  let state=d.importBundle(d.createState(),{bundle_id:'legacy',posts:[{post_id:'changed',output_version:'v1',caption:'changed title',images:[]},{post_id:'unchanged',output_version:'v1',caption:'unchanged title',images:[]}]});
  const changed=state.posts[0];changed.caption='[ 이전 제목 ]\n\n본문 [보존]';changed.platform_captions={instagram:changed.caption,threads:changed.caption};
  state=d.setFinalReview(state,'changed','passed',changed.revision,at);state=d.setFinalReview(state,'unchanged','passed',state.posts[1].revision,at);
  state.posts[0].review_note='원래 메모';await new StateStore(root).mutate(()=>state);
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});
  let result=await request();assert.deepEqual(result.state.title_format_migration.affected_post_ids,['changed']);assert.deepEqual(result.state.title_format_migration.previous_pass_post_ids,['changed']);
  assert.equal(result.state.posts[0].caption,'이전 제목\n\n본문 [보존]');assert.equal(result.state.posts[0].final_review_status,'unreviewed');assert.equal(result.state.posts[0].review_note,'원래 메모');assert.equal(result.state.posts[1].final_review_status,'passed');
  assert.ok(Array.isArray(result.finalReview.deliveryResults));assert.deepEqual(result.finalReview.deliveryWarnings,[]);
  const savedRevision=result.state.revision,post=result.state.posts[1],directory=path.join(root,'final-review-results');await fs.mkdir(directory,{recursive:true});
  const receipt={schema:1,postId:post.post_id,outputVersion:post.output_version,fingerprint:deliveryFingerprint(post),platform:'instagram',providerPostId:'fixture-provider-id',status:'sent',externalUrl:'https://example.invalid/fixture-post',providerVerifiedAt:at,publishedAt:at,scheduledAt:null,recordedAt:at};
  await fs.writeFile(path.join(directory,'fixture.json'),JSON.stringify(receipt));await fs.writeFile(path.join(directory,'bad.json'),'{bad');
  result=await request();assert.equal(result.finalReview.deliveryResults.find(row=>row.postId==='unchanged').deliveryStatus,'partially_posted');assert.equal(result.finalReview.deliveryWarnings.length,1);assert.equal(result.state.revision,savedRevision);assert.equal(result.state.posts[1].final_review_status,'passed');
  const receiptBytes=await fs.readFile(path.join(directory,'fixture.json'));await app.close();app=null;
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});result=await request();assert.equal(result.state.revision,savedRevision);assert.deepEqual(await fs.readFile(path.join(directory,'fixture.json')),receiptBytes);
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});
console.log('Deferred handoff save, stale export fence, asset integrity, migration and read-only delivery integration: '+count+' checks passed. External calls: 0.');
