import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as domain from '../domain.mjs';
import {migrateTitleFormat,validateTitleEditApproval} from '../title-format.mjs';
import {readTitleEditApproval,createStudioServer} from '../server.mjs';
import {StateStore} from '../store.mjs';
const at='2026-10-09T12:00:00.000Z',hash=p=>createHash('sha256').update(domain.finalReviewStatus(p).basis).digest('hex');
function fixture(){
 let s=domain.importBundle(domain.createState(),{bundle_id:'fixture',posts:[{post_id:'approved',output_version:'v1',caption:'plain\nBody [keep]',source:{url:'https://example.com/source',original_title:'[ Original source ]',cover_title:'plain'},images:[],tags:'#keep'}]});
 const p=s.posts[0];p.caption='[ Title ]\nBody [keep]';p.platform_captions={instagram:p.caption,threads:'[ Thread title ]\nThread body [keep]'};p.source.cover_title='[ Cover ]';p.publication_title='[ Publication ]';
 p.review_note='memo\nsecond line';p.review_note_updated_at=at;p.review={output_version:'v1',score:8,decision:'approved',note:'legacy'};p.safety.rights='WARN';p.source.verified=false;
 s=domain.setFinalReview(s,p.post_id,'passed',p.revision,at);return s;
}
const approval=s=>({schema:1,kind:'title-wrapper-removal',approvalId:'fixture-explicit-title-edit',approvedAt:at,entries:s.posts.map(p=>({postId:p.post_id,outputVersion:p.output_version,fingerprint:hash(p)}))});
test('verified installed legacy basis retains its approved pass but never stale content',()=>{
 const state=fixture(),p=state.posts[0],parts=JSON.parse(domain.contentBasis(p));
 // Installed ab3528 retains decorative wrappers for these already-normalized lines.
 parts[3]={instagram:p.platform_captions.instagram,threads:p.platform_captions.threads};
 p.final_review.basis=JSON.stringify([JSON.stringify(parts),domain.isActivePost(p)]);
 assert.equal(domain.finalReviewStatus(p).passed,false);
 const record={schema:1,kind:'title-wrapper-removal',approvalId:'fixture-legacy-explicit',approvedAt:at,
  entries:[{postId:p.post_id,outputVersion:p.output_version,fingerprint:createHash('sha256').update(p.final_review.basis).digest('hex')}]};
 const after=migrateTitleFormat(state,record).state.posts[0];
 assert.equal(domain.finalReviewStatus(after).passed,true);assert.equal(after.caption,'Title\nBody [keep]');
 assert.equal(after.final_review.reviewed_at,p.final_review.reviewed_at);assert.equal(after.final_review.reviewed_revision,p.final_review.reviewed_revision);
 assert.deepEqual(after.final_review.prior_final_review,p.final_review);
 for(const mutate of [q=>q.caption+=' changed body',q=>q.platform_captions.threads+=' changed body',q=>q.tags='#changed',q=>q.images.push({asset_id:'a'.repeat(64),order:1,mime:'image/jpeg'}),q=>q.output_version='new',q=>q.source.verified=true,q=>q.safety.rights='PASS']){
  const stale=structuredClone(state);mutate(stale.posts[0]);assert.equal(domain.finalReviewStatus(migrateTitleFormat(stale,record).state.posts[0]).passed,false);
 }
});
test('exact explicit wrapper approval preserves only the current pass and its audit lineage',()=>{
 const s=fixture(),before=structuredClone(s.posts[0]),result=migrateTitleFormat(s,approval(s)),p=result.state.posts[0];
 assert.equal(domain.finalReviewStatus(p).passed,true);assert.equal(p.output_version,before.output_version);assert.equal(p.revision,before.revision+1);
 assert.equal(p.caption,'Title\nBody [keep]');assert.equal(p.platform_captions.threads,'Thread title\nThread body [keep]');assert.equal(p.source.cover_title,'Cover');
 assert.equal(p.source.original_title,before.source.original_title);assert.equal(p.tags,before.tags);assert.deepEqual(p.images,before.images);assert.deepEqual(p.safety,before.safety);assert.equal(p.source.verified,false);assert.deepEqual(p.review,before.review);
 assert.equal(p.review_note,before.review_note);assert.equal(p.review_note_updated_at,before.review_note_updated_at);
 assert.deepEqual(p.final_review.prior_final_review,before.final_review);assert.equal(p.final_review.edit_approval.approvalId,'fixture-explicit-title-edit');assert.equal(p.final_review.edit_approval.priorFingerprint,hash(before));assert.equal(p.final_review.basis,domain.finalReviewStatus(p).basis);assert.equal(p.final_review.reviewed_at,before.final_review.reviewed_at);assert.equal(p.final_review.reviewed_revision,before.final_review.reviewed_revision);assert.equal(p.final_review.edit_approval.rebased_revision,p.revision);
 assert.equal(p.approval,null);assert.equal(p.publication_approval,null);assert.ok(domain.readiness(p).some(r=>r.code==='source_unverified'));assert.ok(domain.readiness(p).some(r=>r.code==='safety_rights'));
 assert.deepEqual(s.posts[0],before);assert.deepEqual(migrateTitleFormat(result.state,approval(s)).state,result.state);
});
test('missing approval, wrong version or fingerprint and historical passes do not retain a pass',()=>{
 const s=fixture();
 for(const change of [a=>null,a=>({...a,entries:[{...a.entries[0],outputVersion:'old'}]}),a=>({...a,entries:[{...a.entries[0],fingerprint:'0'.repeat(64)}]})]){
  const result=migrateTitleFormat(s,change(approval(s)));assert.equal(domain.finalReviewStatus(result.state.posts[0]).passed,false);
 }
 const stale=structuredClone(s);stale.posts[0].tags='#changed';assert.equal(domain.finalReviewStatus(stale.posts[0]).passed,false);assert.equal(domain.finalReviewStatus(migrateTitleFormat(stale,approval(stale)).state.posts[0]).passed,false);
 for(const decision of ['unreviewed','hold','revise','discard']){
  const current=domain.setFinalReview(s,'approved',decision,s.posts[0].revision,at);assert.equal(domain.finalReviewStatus(migrateTitleFormat(current,approval(current)).state.posts[0]).passed,false);
 }
});
test('wrapper operation leaves prefix labels and all second-line content unchanged',()=>{
 const s=fixture();s.posts[0].caption='[판] Prefix title\n[ Body ]';s.posts[0].platform_captions={instagram:s.posts[0].caption,threads:s.posts[0].caption};s.posts[0].source.cover_title='[판] Prefix title';s.posts[0].publication_title='plain';
 const p=migrateTitleFormat(s).state.posts[0];assert.equal(p.caption,s.posts[0].caption);assert.equal(p.source.cover_title,s.posts[0].source.cover_title);
});
test('private title edit approval reader accepts only a bounded regular own-root JSON file',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'title-edit-approval-'));try{
  assert.equal(await readTitleEditApproval(root),null);
  const a=approval(fixture()),file=path.join(root,'title-edit-approval.json');await fs.writeFile(file,JSON.stringify(a));assert.deepEqual(await readTitleEditApproval(root),a);
  await fs.writeFile(file,'{broken');await assert.rejects(readTitleEditApproval(root),e=>e.code==='title_edit_approval_invalid');
  await fs.writeFile(file,' '.repeat(1048577));await assert.rejects(readTitleEditApproval(root),e=>e.code==='title_edit_approval_invalid');
  await fs.rm(file);await fs.mkdir(file);await assert.rejects(readTitleEditApproval(root),e=>e.code==='title_edit_approval_invalid');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('startup applies the private exact approval once and preserves it across restart',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'title-approved-startup-'));let app;
 try{
  const before=fixture(),pBefore=before.posts[0],legacyParts=JSON.parse(domain.contentBasis(pBefore));
  legacyParts[3]={instagram:pBefore.platform_captions.instagram,threads:pBefore.platform_captions.threads};pBefore.final_review.basis=JSON.stringify([JSON.stringify(legacyParts),domain.isActivePost(pBefore)]);
  const record=approval(before);record.entries[0].fingerprint=createHash('sha256').update(pBefore.final_review.basis).digest('hex');await new StateStore(root).mutate(()=>before);
  await fs.writeFile(path.join(root,'title-edit-approval.json'),JSON.stringify(record));
  app=await createStudioServer({root,port:0,seedTags:false});
  let response=await fetch(app.url+'/api/state'),payload=await response.json(),p=payload.state.posts[0];
  assert.equal(response.status,200);assert.equal(domain.finalReviewStatus(p).passed,true);assert.equal(p.caption,'Title\nBody [keep]');assert.equal(p.final_review.reviewed_at,before.posts[0].final_review.reviewed_at);
  assert.equal(payload.state.jobs.length,0);assert.equal(payload.state.publications.length,0);assert.deepEqual(payload.finalReview.deliveryResults,[]);
  const thin=JSON.parse(await fs.readFile(path.join(root,'final-review-decisions.json'),'utf8'));assert.equal(thin.posts[0].decision,'passed');
  const revision=payload.state.revision,review=structuredClone(p.final_review);await app.close();app=null;
  app=await createStudioServer({root,port:0,seedTags:false});payload=await (await fetch(app.url+'/api/state')).json();
  assert.equal(payload.state.revision,revision);assert.deepEqual(payload.state.posts[0].final_review,review);
  assert.equal(await fs.readFile(path.join(root,'title-edit-approval.json'),'utf8'),JSON.stringify(record));
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
});
test('approval schema accepts UTC second precision and rejects malformed authorization',()=>{
 const a=approval(fixture());a.approvedAt='2026-10-09T12:00:00Z';assert.deepEqual(validateTitleEditApproval(a),a);
 for(const value of [{...a,preparedOnly:true},{...a,approvedAt:'2026-02-30T12:00:00Z'},{...a,entries:[a.entries[0],a.entries[0]]},{...a,kind:'approve-all'}]){
  assert.throws(()=>validateTitleEditApproval(value),e=>e.code==='title_edit_approval_invalid');
 }
});
