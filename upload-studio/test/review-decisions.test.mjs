import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as d from '../domain.mjs';
import * as h from '../history.mjs';
import {setFinalReview,finalReviewStatus} from '../final-review.mjs';
import {reviewDecisionProjection,approvedDecisionPosts} from '../review-decisions.mjs';
import {createStudioServer} from '../server.mjs';

const now='2026-10-09T20:00:00.000Z';
const raw={post_id:'note-p',output_version:'v1',caption:'PRIVATE CAPTION SHOULD STAY IN REVIEW COPY',images:[]};
const initial=()=>d.importBundle(d.createState(),{bundle_id:'notes',posts:[raw]});
const note=(s,text)=>d.editPost(s,'note-p',{review_note:text,review_note_updated_at:now},s.posts[0].revision);
const pass=s=>setFinalReview(s,'note-p','passed',s.posts[0].revision,now);
let count=0;
const check=async(name,run)=>{await run();count++;console.log('ok review decisions: '+name);};

await check('note-only metadata edits preserve the exact final pass and downstream approval',()=>{
 let s=pass(initial());const basis=d.contentBasis(s.posts[0]);s.posts[0].approval={scope:'dry-run',basis};s.posts[0].publication_approval={scope:'fixture-only'};s.jobs.push({post_id:'note-p',state:'waiting',stale:false});
 const previous=s,saved=note(s,'첫 줄\n둘째 줄  ');
 assert.equal(saved.posts[0].review_note,'첫 줄\n둘째 줄  ');assert.equal(saved.posts[0].review_note_updated_at,now);
 assert.equal(saved.posts[0].revision,previous.posts[0].revision+1);assert.equal(saved.revision,previous.revision+1);
 assert.equal(saved.posts[0].output_version,'v1');assert.equal(d.contentBasis(saved.posts[0]),basis);assert.equal(finalReviewStatus(saved.posts[0]).passed,true);
 assert.deepEqual(saved.posts[0].approval,previous.posts[0].approval);assert.deepEqual(saved.posts[0].publication_approval,previous.posts[0].publication_approval);assert.equal(saved.jobs[0].stale,false);
 assert.equal(previous.posts[0].review_note,'');
 assert.throws(()=>d.editPost(saved,'note-p',{review_note:'stale'},previous.posts[0].revision),/revision_conflict/);
});

await check('notes are independent of content changes new imports and history restoration',()=>{
 let s=note(pass(initial()),'계속 보존할 내부 메모\n다음 줄');
 const next=d.editPost(s,'note-p',{review_note:'메모도 변경\n내용 변경',review_note_updated_at:now,caption:'new caption'},s.posts[0].revision);
 assert.equal(finalReviewStatus(next.posts[0]).passed,false);assert.equal(next.posts[0].review_note,'메모도 변경\n내용 변경');
 for(const replacement of [d.importBundle(s,{bundle_id:'v2',posts:[{...raw,output_version:'v2',review_note:'producer must not replace notes'}]}),d.syncProductionBundle(s,{posts:[{...raw,output_version:'v2'}]})]){
  assert.equal(replacement.posts[0].review_note,s.posts[0].review_note);assert.equal(replacement.posts[0].review_note_updated_at,now);assert.equal(finalReviewStatus(replacement.posts[0]).passed,false);
 }
 s=h.captureHistory(s,d.editPost(s,'note-p',{caption:'history change'},s.posts[0].revision),now);
 s=note(s,'최신 메모\n유지');const undone=h.undoPost(s,'note-p',s.posts[0].revision);
 assert.equal(undone.posts[0].review_note,'최신 메모\n유지');assert.equal(undone.posts[0].review_note_updated_at,now);
 const redone=h.redoPost(undone,'note-p',undone.posts[0].revision);assert.equal(redone.posts[0].review_note,'최신 메모\n유지');
 const restored=h.restorePostSnapshot(redone,'note-p',redone.post_history['note-p'].entries[0].id,redone.posts[0].revision);assert.equal(restored.posts[0].review_note,'최신 메모\n유지');
});

await check('minimal decision projection exposes only review identities decisions hashes and notes',()=>{
 let s=note(pass(initial()),'내부 메모\n두 줄');s.jobs=[{private_job:'SHOULD NOT APPEAR'}];s.buffer_attempts=[{provider_id:'PRIVATE BUFFER STATE'}];
 s=d.importBundle(s,{bundle_id:'other',posts:[{...raw,post_id:'unreviewed',review_note:'검토 전 메모'}]});
 const doc=reviewDecisionProjection(s);assert.equal(doc.schema,1);assert.equal(doc.revision,s.revision);assert.equal(doc.posts.length,2);
 assert.deepEqual(Object.keys(doc),['schema','revision','posts']);
 assert.deepEqual(Object.keys(doc.posts[0]),['postId','outputVersion','fingerprint','decision','reviewedAt','note','noteUpdatedAt']);
 assert.equal(doc.posts[0].fingerprint,createHash('sha256').update(finalReviewStatus(s.posts[0]).basis).digest('hex'));
 assert.equal(doc.posts[0].decision,'passed');assert.equal(doc.posts[1].decision,'unreviewed');assert.equal(doc.posts[1].note,'검토 전 메모');
 for(const forbidden of ['PRIVATE CAPTION','SHOULD NOT APPEAR','PRIVATE BUFFER STATE','platform_captions','images','jobs','source'])assert.equal(JSON.stringify(doc).includes(forbidden),false,forbidden);
 assert.deepEqual(approvedDecisionPosts(s,doc).map(p=>p.post_id),['note-p']);
 const changed=d.editPost(s,'note-p',{caption:'changed input'},s.posts[0].revision);assert.equal(approvedDecisionPosts(changed,doc).length,0);
 const forged=structuredClone(doc);forged.posts[0].fingerprint='0'.repeat(64);assert.equal(approvedDecisionPosts(s,forged).length,0);
 const wrongVersion=structuredClone(doc);wrongVersion.posts[0].outputVersion='old';assert.equal(approvedDecisionPosts(s,wrongVersion).length,0);
 const duplicate=structuredClone(doc);duplicate.posts.push(duplicate.posts[0]);assert.equal(approvedDecisionPosts(s,duplicate).length,0);
});

await check('negative and older decision revisions fail closed even after note-only edits',()=>{
 const state=note(pass(initial()),'최초 메모'),document=reviewDecisionProjection(state);
 assert.equal(approvedDecisionPosts(state,document).length,1);
 const negative=structuredClone(document);negative.revision=-1;assert.equal(approvedDecisionPosts(state,negative).length,0);
 const older=structuredClone(document);older.revision=state.revision-1;assert.equal(approvedDecisionPosts(state,older).length,0);
 const future=structuredClone(document);future.revision=state.revision+1;assert.equal(approvedDecisionPosts(state,future).length,0);
 const edited=note(state,'메모만 변경');
 assert.equal(finalReviewStatus(edited.posts[0]).passed,true);
 assert.equal(d.contentBasis(edited.posts[0]),d.contentBasis(state.posts[0]));
 assert.equal(approvedDecisionPosts(edited,document).length,0);
 assert.equal(approvedDecisionPosts(edited,reviewDecisionProjection(edited)).length,1);
});

await check('legacy evaluation notes remain readable until an explicit independent note is saved',()=>{
 let s=d.editPost(initial(),'note-p',{review:{output_version:'v1',score:8,decision:'approved',note:'기존 검수 메모\n유지'}},1);
 delete s.posts[0].review_note;delete s.posts[0].review_note_updated_at;s=pass(s);
 const basis=d.contentBasis(s.posts[0]),review=structuredClone(s.posts[0].review);
 assert.equal(d.reviewNote(s.posts[0]),'기존 검수 메모\n유지');assert.equal(reviewDecisionProjection(s).posts[0].note,'기존 검수 메모\n유지');
 assert.equal(d.contentBasis(s.posts[0]),basis);assert.equal(finalReviewStatus(s.posts[0]).passed,true);
 const explicit=note(s,'');assert.equal(d.reviewNote(explicit.posts[0]),'');assert.equal(reviewDecisionProjection(explicit).posts[0].note,'');assert.deepEqual(explicit.posts[0].review,review);assert.equal(finalReviewStatus(explicit.posts[0]).passed,true);
 const changed=d.editPost(s,'note-p',{caption:'edited legacy caption'},s.posts[0].revision);assert.equal(changed.posts[0].review,null);assert.equal(changed.posts[0].review_note,'기존 검수 메모\n유지');
 const fresh=d.syncProductionBundle(s,{posts:[{...raw,output_version:'v2'}]});assert.equal(fresh.posts[0].review_note,'기존 검수 메모\n유지');
});

await check('notes reject invalid text timestamps and a timestamp without a note',()=>{
 const s=initial();assert.throws(()=>d.editPost(s,'note-p',{review_note:5},1),/invalid_text/);
 assert.throws(()=>d.editPost(s,'note-p',{review_note:'x'.repeat(10001)},1),/invalid_text/);
 assert.throws(()=>d.editPost(s,'note-p',{review_note:'note',review_note_updated_at:'bad'},1),/invalid_review_note_time/);
 assert.throws(()=>d.editPost(s,'note-p',{review_note_updated_at:now},1),/review_note_required/);
});

await check('HTTP note navigation saves restart and recreates the atomic decision file',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-review-decisions-'));let app;
 const request=async(route,body)=>{const response=await fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
 try{
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});
  const file=path.join(root,'final-review-decisions.json');assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')).posts,[]);
  let result=await request('/api/bundles',{bundle_id:'http-notes',posts:[raw,{...raw,post_id:'another'}]});
  result=await request('/api/final-review',{post_id:'note-p',decision:'passed',expected_revision:result.state.posts[0].revision});
  result=await request('/api/posts/note-p',{expected_revision:result.state.posts[0].revision,patch:{review_note:'기억할 첫 줄\n두 번째 줄  '}});
  const saved=result.state.posts[0];assert.equal(saved.review_note,'기억할 첫 줄\n두 번째 줄  ');assert.match(saved.review_note_updated_at,/^\d{4}-\d{2}-\d{2}T/);assert.equal(saved.final_review_status,'passed');
  await request('/api/posts/another',{expected_revision:1,patch:{review_note:'다른 글 메모'}});result=await request('/api/state');assert.equal(result.state.posts[0].review_note,saved.review_note);
  const projection=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(projection.posts[0].decision,'passed');assert.equal(projection.posts[0].note,saved.review_note);assert.equal(projection.posts[0].noteUpdatedAt,saved.review_note_updated_at);assert.equal(projection.revision,result.state.revision);
  await app.close();app=null;await fs.unlink(file);
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'no-production'),seedTags:false});result=await request('/api/state');assert.equal(result.state.posts[0].review_note,saved.review_note);assert.equal(result.state.posts[0].final_review_status,'passed');
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).posts[0].note,saved.review_note);
  result=await request('/api/posts/note-p',{expected_revision:result.state.posts[0].revision,patch:{caption:'changed caption after review'}});
  assert.equal(result.state.posts[0].final_review_status,'unreviewed');const stale=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(stale.posts[0].decision,'unreviewed');assert.equal(stale.posts[0].note,saved.review_note);
  assert.equal((await fs.readdir(root)).some(name=>name.endsWith('.tmp')),false);
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});
console.log('Review decisions and notes: '+count+' checks passed. External calls: 0.');
