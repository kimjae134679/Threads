import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../store.mjs';
import {LocalAssets} from '../local-assets.mjs';
import {importBundle} from '../domain.mjs';
import {createStudioServer} from '../server.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ol8AAAAASUVORK5CYII=','base64');
async function setup(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-review-http-'));
 const asset=await new LocalAssets(root).add({name:'fixture.png',mime:'image/png',base64:png.toString('base64')});
 await new StateStore(root).mutate(s=>importBundle(s,{bundle_id:'fixture',posts:[{post_id:'p1',output_version:'v1',caption:'확인한 문안',source:{label:'검토 제목',cover_title:'검토 제목'},images:[{...asset,order:1}]}]}));
 return root;
}
const request=(app,route,body)=>fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});
test('runtime idle evidence is fresh, detects held state locks, and does not change review state',async()=>{
 const root=await setup();let app;
 try{
  app=await createStudioServer({root,port:0,seedTags:false,materialRoot:path.join(root,'missing')});
  const before=await fs.readFile(path.join(root,'state.json'));
  const response=await request(app,'/api/integration/status');assert.equal(response.status,200);
  const idle=await response.json();assert.ok(Number.isInteger(idle.activeJobs));assert.ok(Date.now()-Date.parse(idle.checkedAt)<5000);
  await fs.mkdir(path.join(root,'.state-lock'));
  const busy=await(await request(app,'/api/integration/status')).json();assert.ok(busy.activeJobs>=1);
  await fs.rmdir(path.join(root,'.state-lock'));
  assert.deepEqual(await fs.readFile(path.join(root,'state.json')),before);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'controller-runtime-status.json'),'utf8')).appId,'threads-upload-studio');
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});
test('HTTP current pass persists through restart and exports only current reviewed content',async()=>{
 const root=await setup();let app;
 try{
  app=await createStudioServer({root,port:0,seedTags:false,materialRoot:path.join(root,'missing')});
  let state=(await (await request(app,'/api/state')).json()).state;
  assert.equal(state.posts[0].final_review_status,'unreviewed');
  assert.equal((await request(app,'/api/queue',{post_id:'p1',expected_revision:state.posts[0].revision})).status,400);
  let response=await request(app,'/api/final-review',{post_id:'p1',decision:'passed',expected_revision:state.posts[0].revision});
  assert.equal(response.status,200);state=(await response.json()).state;assert.equal(state.posts[0].final_review_status,'passed');
  await app.close();app=await createStudioServer({root,port:0,seedTags:false,materialRoot:path.join(root,'missing')});
  state=(await (await request(app,'/api/state')).json()).state;assert.equal(state.posts[0].final_review_status,'passed');
  const exported=await (await request(app,'/api/final-review/handoff',{expected_revision:state.revision})).json();
  assert.equal(exported.count,1);assert.ok(exported.path.startsWith(path.join(root,'final-review-handoff')));
  const original=await fs.readFile(exported.path);const manifest=JSON.parse(original);assert.equal(manifest.posts.length,1);
  assert.equal((await request(app,'/api/final-review/handoff',{expected_revision:state.revision-1})).status,409);
  response=await request(app,'/api/posts/p1',{expected_revision:state.posts[0].revision,patch:{platform_captions:{instagram:'수정한 현재 문안'}}});
  assert.equal(response.status,200);state=(await response.json()).state;assert.equal(state.posts[0].final_review_status,'unreviewed');
  const preview=await (await request(app,'/api/final-review/handoff')).json();assert.equal(preview.count,0);assert.equal(preview.latest.count,0);assert.equal(preview.latest.state_revision,state.revision);if(preview.latest.pending)assert.equal(preview.latest.path,null);
  const refreshed=await (await request(app,'/api/final-review/handoff',{expected_revision:state.revision})).json();assert.equal(refreshed.count,0);assert.equal(refreshed.state_revision,state.revision);
  assert.deepEqual(await fs.readFile(exported.path),original);assert.equal(state.jobs.length,0);assert.equal(state.publications.length,0);
  assert.equal((await request(app,'/api/publish',{})).status,405);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
test('Whole-state backup recovery preserves text but requires a fresh final verdict',async()=>{
 const root=await setup();let app;
 try{
  app=await createStudioServer({root,port:0,seedTags:false,materialRoot:path.join(root,'missing')});
  let state=(await (await request(app,'/api/state')).json()).state;
  state=(await (await request(app,'/api/final-review',{post_id:'p1',decision:'passed',expected_revision:state.posts[0].revision})).json()).state;
  await request(app,'/api/posts/p1',{expected_revision:state.posts[0].revision,patch:{caption:'별도 수정'}});
  const restored=await (await request(app,'/api/restore-backup',{})).json();
  assert.equal(restored.state.posts[0].caption,'확인한 문안');assert.equal(restored.state.posts[0].final_review_status,'unreviewed');
  assert.equal(restored.state.posts[0].publication_approval,null);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});

test('Explicit displayed version and content guards reject a newly synced review target',async()=>{
 const root=await setup();let app;
 try{
  app=await createStudioServer({root,port:0,seedTags:false,materialRoot:path.join(root,'missing')});
  const state=(await (await request(app,'/api/state')).json()).state;
  const response=await request(app,'/api/final-review',{post_id:'p1',decision:'passed',expected_revision:state.posts[0].revision,expected_output_version:'older-version',expected_basis:'older-content'});
  assert.equal(response.status,409);assert.equal((await response.json()).code,'review_form_version_changed');
  const after=(await (await request(app,'/api/state')).json()).state;assert.equal(after.posts[0].final_review_status,'unreviewed');
  assert.equal(after.revision,state.revision);assert.equal(after.jobs.length,0);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
