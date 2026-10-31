import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as d from '../domain.mjs';
import {setFinalReview,finalReviewStatus,approvedReviewBundle} from '../final-review.mjs';
import {reviewDecisionProjection,approvedDecisionPosts} from '../review-decisions.mjs';
import {createStudioServer} from '../server.mjs';

const now='2026-10-09T22:00:00.000Z';
const raw=id=>({post_id:id,output_version:'v1',caption:'Hold review fixture',images:[]});
const mark=(state,id,decision)=>setFinalReview(state,id,decision,state.posts.find(p=>p.post_id===id).revision,now);
let count=0;const check=async(name,run)=>{await run();count++;console.log('ok hold review: '+name);};

await check('hold persists without changing notes or the other seventeen current passes',()=>{
 let state=d.importBundle(d.createState(),{bundle_id:'fixture',posts:Array.from({length:18},(_,i)=>raw('p-'+i))});
 for(const p of state.posts)state=mark(state,p.post_id,'passed');
 state=d.editPost(state,'p-0',{review_note:'보류 이유\n다음 검토에서 확인',review_note_updated_at:now},state.posts[0].revision);
 const existing=state.posts.slice(1).map(p=>structuredClone(p.final_review));
 state=mark(state,'p-0','hold');const p=state.posts[0],status=finalReviewStatus(p);
 assert.equal(status.decision,'hold');assert.equal(status.current,true);assert.equal(status.passed,false);
 assert.equal(p.review_note,'보류 이유\n다음 검토에서 확인');assert.equal(p.review_note_updated_at,now);
 assert.equal(finalReviewStatus(d.validateState(JSON.parse(JSON.stringify(state))).posts[0]).decision,'hold');
 assert.deepEqual(state.posts.slice(1).map(p=>p.final_review),existing);
 assert.equal(approvedReviewBundle(state).posts.length,17);
 const document=reviewDecisionProjection(state);assert.equal(document.posts[0].decision,'hold');assert.equal(document.posts[0].note,p.review_note);
 assert.equal(approvedDecisionPosts(state,document).length,17);
 assert.ok(d.readiness(p).some(reason=>reason.code==='final_review_required'));
});

await check('hold can move to every final decision with current revision and content basis',()=>{
 const imported=d.importBundle(d.createState(),{bundle_id:'one',posts:[raw('p')]});
 const noted=d.editPost(imported,'p',{review_note:'보류 메모\n보존',review_note_updated_at:now},1);
 const held=mark(noted,'p','hold');assert.throws(()=>setFinalReview(held,'p','passed',noted.posts[0].revision,now),/revision_conflict/);
 for(const decision of ['passed','revise','discard']){
  const next=mark(held,'p',decision);assert.equal(finalReviewStatus(next.posts[0]).decision,decision);
  assert.equal(next.posts[0].review_note,held.posts[0].review_note);assert.equal(next.posts[0].review_note_updated_at,now);
 }
 const noteEdit=d.editPost(held,'p',{review_note:'새 보류 메모',review_note_updated_at:now},held.posts[0].revision);
 assert.equal(finalReviewStatus(noteEdit.posts[0]).decision,'hold');
 const changed=d.editPost(held,'p',{caption:'changed content'},held.posts[0].revision);assert.equal(finalReviewStatus(changed.posts[0]).decision,'unreviewed');
 const version=d.importBundle(held,{bundle_id:'v2',posts:[{...raw('p'),output_version:'v2'}]});assert.equal(finalReviewStatus(version.posts[0]).decision,'unreviewed');assert.equal(version.posts[0].review_note,held.posts[0].review_note);
});

await check('HTTP hold and minimal decision file survive restart and reject stale review forms',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-hold-review-'));let app;
 const request=async(route,body,status=200)=>{const response=await fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;};
 try{
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'missing-material'),seedTags:false});
  let result=await request('/api/bundles',{bundle_id:'http',posts:[raw('p')]});
  result=await request('/api/posts/p',{expected_revision:1,patch:{review_note:'HTTP 보류 메모\n유지'}});
  result=await request('/api/final-review',{post_id:'p',decision:'hold',expected_revision:result.state.posts[0].revision});
  const held=result.state.posts[0],basis=finalReviewStatus(held).basis,file=path.join(root,'final-review-decisions.json');
  assert.equal(held.final_review_status,'hold');assert.equal(JSON.parse(await fs.readFile(file,'utf8')).posts[0].decision,'hold');
  await app.close();app=null;app=await createStudioServer({root,port:0,materialRoot:path.join(root,'missing-material'),seedTags:false});
  result=await request('/api/state');const restored=result.state.posts[0];assert.equal(restored.final_review_status,'hold');assert.equal(restored.review_note,held.review_note);
  assert.equal(approvedDecisionPosts(result.state,JSON.parse(await fs.readFile(file,'utf8'))).length,0);
  await request('/api/final-review',{post_id:'p',decision:'passed',expected_revision:restored.revision,expected_output_version:'old-version'},409);
  await request('/api/final-review',{post_id:'p',decision:'passed',expected_revision:restored.revision,expected_basis:'old-basis'},409);
  result=await request('/api/final-review',{post_id:'p',decision:'passed',expected_revision:restored.revision,expected_output_version:restored.output_version,expected_basis:basis});
  assert.equal(result.state.posts[0].final_review_status,'passed');assert.equal(result.state.posts[0].review_note,held.review_note);
  assert.equal(approvedDecisionPosts(result.state,JSON.parse(await fs.readFile(file,'utf8'))).length,1);
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});
console.log('Hold review: '+count+' checks passed. External calls: 0.');
