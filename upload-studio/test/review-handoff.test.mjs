import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ReviewHandoff,reviewHandoffProjection} from '../review-handoff.mjs';
import {LocalAssets} from '../local-assets.mjs';
import {createState,importBundle,editPost,finalCaption} from '../domain.mjs';
import {setFinalReview,finalReviewStatus} from '../final-review.mjs';

const at='2026-10-09T12:00:00.000Z';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const jpeg=Buffer.from([255,216,255,1,2,3,4]);
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-handoff-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const assets=new LocalAssets(root);
 const first=await assets.add({name:'first.jpg',mime:'image/jpeg',base64:jpeg.toString('base64')});
 const second=await assets.add({name:'second.png',mime:'image/png',base64:png.toString('base64')});
 let state=importBundle(createState(),{bundle_id:'fixture',posts:[{
  post_id:'p',output_version:'v1',platform_captions:{instagram:'원문 그대로\n두 번째 줄',threads:'Threads 원문\n마지막 줄'},
  tags:'#legacy',topic_tags:['주제','직장'],threads_topic_tag:'직장',images:[
   {asset_id:second.asset_id,mime:second.mime,order:1},{asset_id:first.asset_id,mime:first.mime,order:2}
  ],source:{url:'https://example.invalid/source'}
 }]});
 // A source location is reference information, never an export destination.
 state.posts[0].source.raw_file='01_DISCOVERY/original.txt';
 const pass=()=>{state=setFinalReview(state,'p','passed',state.posts[0].revision,at);return state;};
 return {root,assets,writer:new ReviewHandoff(root,assets),state,pass,first,second};
}
const read=async result=>JSON.parse(await fs.readFile(result.path,'utf8'));

test('no final pass writes an empty revocation snapshot without changing state',async t=>{
 const f=await fixture(t),before=JSON.stringify(f.state),result=await f.writer.write(f.state,at),manifest=await read(result);
 assert.equal(result.count,0);assert.equal(result.externalCalls,0);
 assert.deepEqual(manifest.posts,[]);assert.deepEqual(manifest.eligible_post_ids,[]);
 assert.equal(manifest.review_statuses[0].decision,'unreviewed');
 assert.equal(JSON.stringify(f.state),before);
 assert.equal(path.dirname(result.path),path.join(f.root,'final-review-handoff'));
 assert.deepEqual((await fs.readdir(f.root)).sort(),['assets','final-review-handoff']);
});

test('only active current final passes enter handoff, with exact captions, tags, order and hashes',async t=>{
 const f=await fixture(t);let state=f.pass();const p=state.posts[0];
 state.posts.push({...structuredClone(p),post_id:'hidden',inactive_for_this_batch:true});
 state.posts.push({...structuredClone(p),post_id:'stale',final_review:null});
 state=setFinalReview(state,'hidden','passed',state.posts[1].revision,at);
 assert.equal(finalReviewStatus(state.posts[1]).passed,true);
 const before=JSON.stringify(state),result=await f.writer.write(state,at),manifest=await read(result),out=manifest.posts[0];
 assert.equal(manifest.schema,1);assert.equal(manifest.type,'threads-final-review-handoff');
 assert.equal(manifest.state_revision,state.revision);assert.equal(manifest.generated_at,at);
 assert.deepEqual(manifest.eligible_post_ids,['p']);assert.equal(manifest.review_statuses.length,3);
 assert.equal(result.count,1);assert.equal(out.postId,'p');assert.equal(out.outputVersion,'v1');
 assert.deepEqual(out.captions,Object.fromEntries(p.targets.map(target=>[target,finalCaption(p,target)])));
 assert.deepEqual(out.tags,{common:p.common_tags,topic:p.topic_tags,legacy:p.tags,threads_topic:p.threads_topic_tag});
 assert.deepEqual(out.platforms,p.targets);assert.deepEqual(out.safety,p.safety);assert.deepEqual(out.source,p.source);assert.deepEqual(out.review,p.review);
 assert.equal(out.source.raw_file,'01_DISCOVERY/original.txt');
 assert.equal(out.approval.status,'passed');assert.equal(out.approval.reviewedAt,at);
 assert.equal(out.approval.fingerprint,hash(finalReviewStatus(p).basis));
 assert.deepEqual(out.images,[
  {order:1,sha256:f.second.asset_id,mime:f.second.mime,local_file:path.join(f.assets.root,f.second.asset_id),approved_image_url:null},
  {order:2,sha256:f.first.asset_id,mime:f.first.mime,local_file:path.join(f.assets.root,f.first.asset_id),approved_image_url:null}
 ]);
 assert.ok(out.blockers.some(x=>x.code==='source_unverified'));
 assert.ok(out.blockers.some(x=>x.code==='public_media_required'));
 assert.equal(manifest.consumer_contract.state_file,path.join(f.root,'state.json'));
 assert.equal(manifest.consumer_contract.require_live_revision_and_fingerprint,true);
 assert.equal(JSON.stringify(state),before);
});

test('later caption edits and explicit withdrawals append revocation manifests',async t=>{
 const f=await fixture(t),passed=f.pass(),first=await f.writer.write(passed,at),original=await fs.readFile(first.path,'utf8');
 const edited=editPost(passed,'p',{platform_captions:{threads:'고친 문안'}},passed.posts[0].revision);
 const second=await f.writer.write(edited,at),manifest=await read(second);
 assert.notEqual(first.path,second.path);assert.notEqual(first.handoff_id,second.handoff_id);
 assert.equal(manifest.posts.length,0);assert.equal(manifest.review_statuses[0].passed,false);
 assert.notEqual(manifest.review_statuses[0].fingerprint,(await read(first)).review_statuses[0].fingerprint);
 assert.equal(await fs.readFile(first.path,'utf8'),original);
 const withdrawn=setFinalReview(passed,'p','revise',passed.posts[0].revision,at);
 const third=await read(await f.writer.write(withdrawn,at));
 assert.equal(third.posts.length,0);assert.equal(third.review_statuses[0].decision,'revise');
});

test('idempotent reuse ignores generation time and concurrent writes expose one complete file',async t=>{
 const f=await fixture(t),state=f.pass();
 const results=await Promise.all(Array.from({length:5},(_,i)=>f.writer.write(state,Date.parse(at)+i)));
 assert.equal(new Set(results.map(x=>x.path)).size,1);
 const files=await fs.readdir(path.join(f.root,'final-review-handoff'));
 assert.deepEqual(files,[path.basename(results[0].path)]);
 const original=await fs.readFile(results[0].path,'utf8');
 assert.equal((await f.writer.write(state,Date.parse(at)+60000)).path,results[0].path);
 assert.equal(await fs.readFile(results[0].path,'utf8'),original);
});

test('existing nonmatching manifest is never overwritten',async t=>{
 const f=await fixture(t),state=f.pass(),result=await f.writer.write(state,at);
 const corrupt=await read(result);corrupt.posts[0].captions.threads='replaced';
 await fs.writeFile(result.path,JSON.stringify(corrupt));
 const original=await fs.readFile(result.path,'utf8');
 await assert.rejects(f.writer.write(state,at),{code:'handoff_collision'});
 assert.equal(await fs.readFile(result.path,'utf8'),original);
 assert.deepEqual(await fs.readdir(path.dirname(result.path)),[path.basename(result.path)]);
});

test('asset bytes and actual MIME must match approved image metadata',async t=>{
 const f=await fixture(t),state=f.pass(),image=state.posts[0].images[0];
 await fs.writeFile(path.join(f.assets.root,image.asset_id),jpeg);
 await assert.rejects(f.writer.write(state,at),{code:'handoff_asset_hash_mismatch'});
 await assert.rejects(fs.stat(path.join(f.root,'final-review-handoff')),{code:'ENOENT'});
 await fs.writeFile(path.join(f.assets.root,image.asset_id),png);
 await fs.writeFile(path.join(f.assets.root,image.asset_id+'.json'),JSON.stringify({asset_id:image.asset_id,mime:'image/jpeg'}));
 await assert.rejects(f.writer.write(state,at),{code:'handoff_asset_mime_mismatch'});
 await fs.writeFile(path.join(f.assets.root,image.asset_id+'.json'),JSON.stringify({asset_id:image.asset_id,mime:'image/png'}));
 // Even internally consistent metadata cannot disguise JPEG bytes as PNG.
 const falseId=hash(jpeg);
 await fs.writeFile(path.join(f.assets.root,falseId+'.json'),JSON.stringify({asset_id:falseId,mime:'image/png'}));
 const changed=editPost(state,'p',{images:[{asset_id:falseId,mime:'image/png',order:1}]},state.posts[0].revision);
 const repassed=setFinalReview(changed,'p','passed',changed.posts[0].revision,at);
 await assert.rejects(f.writer.write(repassed,at),{code:'handoff_asset_mime_mismatch'});
});

test('symlinked owned directories, assets and destinations fail closed',async t=>{
 const f=await fixture(t),state=f.pass(),outside=await fs.mkdtemp(path.join(os.tmpdir(),'studio-handoff-outside-'));
 t.after(()=>fs.rm(outside,{recursive:true,force:true}));
 const directory=path.join(f.root,'final-review-handoff');
 try{await fs.symlink(outside,directory,process.platform==='win32'?'junction':'dir');}
 catch(error){if(['EPERM','EACCES','ENOSYS'].includes(error.code)){t.skip('symlink creation unavailable');return;}throw error;}
 await assert.rejects(f.writer.write(state,at),{code:'handoff_unsafe_path'});
 assert.deepEqual(await fs.readdir(outside),[]);
 await fs.unlink(directory);
 const image=state.posts[0].images[0],assetPath=path.join(f.assets.root,image.asset_id);
 await fs.writeFile(path.join(outside,'image'),png);await fs.unlink(assetPath);
 await fs.symlink(path.join(outside,'image'),assetPath,'file');
 await assert.rejects(f.writer.write(state,at),{code:'handoff_unsafe_path'});
 await fs.unlink(assetPath);await fs.writeFile(assetPath,png);
 const result=await f.writer.write(state,at);await fs.unlink(result.path);
 await fs.writeFile(path.join(outside,'manifest'),'untouched');
 await fs.symlink(path.join(outside,'manifest'),result.path,'file');
 await assert.rejects(f.writer.write(state,at),{code:'handoff_unsafe_path'});
 assert.equal(await fs.readFile(path.join(outside,'manifest'),'utf8'),'untouched');
});

test('reel final pass preserves its reviewed format while marking video handoff blocked',async t=>{
 const f=await fixture(t);
 let state=editPost(f.state,'p',{media_format:'reel',reel_video:{asset_id:'c'.repeat(64),mime:'video/mp4',metadata:{width:1080,height:1920}}},f.state.posts[0].revision);
 state=setFinalReview(state,'p','passed',state.posts[0].revision,at);
 const manifest=await read(await f.writer.write(state,at)),p=manifest.posts[0];
 assert.equal(p.media_format,'reel');assert.deepEqual(p.reel_video,state.posts[0].reel_video);
 assert.equal(p.media_contract.reel_upload_supported,false);
 assert.ok(p.blockers.some(x=>x.code==='reel_handoff_unsupported'));
 assert.equal(p.images.length,2);
});

test('pure preview reflects current review selection and rejects invalid revisions',async t=>{
 const f=await fixture(t),state=f.pass(),preview=reviewHandoffProjection(state);
 assert.deepEqual(preview.eligible_post_ids,['p']);assert.equal(preview.count,1);assert.equal(preview.externalCalls,0);
 assert.match(preview.handoff_id,/^[a-f0-9]{64}$/);
 assert.equal(preview.review_statuses[0].fingerprint,hash(finalReviewStatus(state.posts[0]).basis));
 await assert.rejects(fs.stat(path.join(f.root,'final-review-handoff')),{code:'ENOENT'});
 assert.throws(()=>reviewHandoffProjection({...state,revision:-1}),/handoff_invalid_state/);
 assert.throws(()=>new ReviewHandoff('relative',f.assets),/handoff_unsafe_path/);
});
