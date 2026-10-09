import assert from 'node:assert/strict';
import {createState,importBundle,syncProductionBundle,editPost,setCommonTags,readiness,approveDryRun,queuePost,startDryRun,validateState,refreshProductionFeedback} from '../domain.mjs';
import {setFinalReview,finalReviewStatus,approvedReviewBundle} from '../final-review.mjs';
import {captureHistory,undoPost,redoPost,restorePostSnapshot} from '../history.mjs';

const now='2026-10-09T12:00:00.000Z';
const images=[{asset_id:'a'.repeat(64),order:1,mime:'image/jpeg'},{asset_id:'b'.repeat(64),order:2,mime:'image/jpeg'}];
const raw={post_id:'p',output_version:'v1',caption:'현재 문안',images,source:{url:'https://example.invalid/source'}};
const imported=()=>importBundle(createState(),{bundle_id:'fixture',posts:[raw]});
const revision=s=>s.posts[0].revision;
const pass=s=>setFinalReview(s,'p','passed',revision(s),now);
const checked=()=>editPost(imported(),'p',{source:{url:raw.source.url,verified:true},safety:{fact:'PASS',rights:'PASS',privacy:'PASS',defamation:'PASS',platform_policy:'PASS'},review:{output_version:'v1',score:8,decision:'approved',note:'fixture direct review'}},1);
const blocked=p=>readiness(p).some(r=>r.code==='final_review_required');
let count=0;
const check=(name,run)=>{run();count++;console.log('ok final review: '+name);};

check('legacy approvals and producer scores cannot create final review',()=>{
 const s=checked();s.posts[0].approval={scope:'dry-run'};s.posts[0].production_feedback={current:{score:10}};
 assert.equal(finalReviewStatus(s.posts[0]).decision,'unreviewed');
 assert.equal(blocked(s.posts[0]),true);
 assert.equal(approvedReviewBundle(s).posts.length,0);
 const forged=importBundle(createState(),{bundle_id:'forged',posts:[{...raw,final_review:{decision:'passed',output_version:'v1',basis:'pretend'}}]});
 assert.equal(finalReviewStatus(forged.posts[0]).decision,'unreviewed');
});

check('explicit pass persists through JSON validation and exports detached complete current inputs',()=>{
 const s=pass(checked()),p=s.posts[0],status=finalReviewStatus(p);
 assert.equal(status.decision,'passed');assert.equal(status.current,true);assert.equal(status.passed,true);
 assert.equal(status.reviewed_at,now);assert.equal(status.output_version,p.output_version);
 assert.equal(finalReviewStatus(validateState(JSON.parse(JSON.stringify(s))).posts[0]).passed,true);
 const bundle=approvedReviewBundle(s);assert.equal(bundle.external_calls,0);assert.deepEqual(bundle.posts,[p]);
 bundle.posts[0].images.pop();assert.equal(s.posts[0].images.length,2);
 assert.equal(s.posts[0].approval,null);assert.equal(s.posts[0].publication_approval,null);
});

check('final pass cannot assert source rights safety or user review',()=>{
 const s=pass(imported()),p=s.posts[0],codes=readiness(p).map(r=>r.code);
 assert.equal(p.source.verified,false);assert.equal(p.safety.rights,'UNKNOWN');assert.equal(p.review,null);
 assert.ok(codes.includes('source_unverified'));assert.ok(codes.includes('safety_rights'));assert.ok(codes.includes('current_review_required'));
 assert.equal(codes.includes('final_review_required'),false);assert.equal(s.jobs.length,0);assert.equal(s.publications.length,0);
});

check('discard revise and unreviewed cannot approve or execute dry run',()=>{
 for(const decision of ['discard','revise','unreviewed']){
  let s=setFinalReview(checked(),'p',decision,2,now);assert.equal(finalReviewStatus(s.posts[0]).decision,decision);
  assert.equal(blocked(s.posts[0]),true);assert.equal(approvedReviewBundle(s).posts.length,0);
  assert.throws(()=>approveDryRun(s,'p',revision(s)),/review_required/);
  s=queuePost(s,'p',revision(s));s.posts[0].approval={scope:'dry-run',basis:'forged'};
  assert.throws(()=>startDryRun(s,s.jobs[0].id),/review_required/);
 }
});

check('concurrent reviews reject stale post revisions and invalid decisions',()=>{
 const s=checked(),passed=pass(s);assert.throws(()=>setFinalReview(passed,'p','discard',revision(s),now),/revision_conflict/);
 assert.throws(()=>setFinalReview(s,'p','approved',revision(s),now),/invalid_final_review/);
 assert.throws(()=>setFinalReview(s,'p','passed',revision(s),'not-a-time'),/invalid_final_review_time/);
 assert.throws(()=>setFinalReview(s,'missing','passed',revision(s),now),/post_not_found/);
 assert.equal(s.posts[0].final_review,null);
});

check('each publication input edit invalidates the pass',()=>{
 const patches=[
 {platform_captions:{instagram:'수정 Instagram'}},{platform_captions:{threads:'수정 Threads'}},{caption:'새 공통 문안'},
 {tags:'#edited'},{topic_tags:['생활','직장']},{threads_topic_tag:'직장'},
 {images:[{...images[1],order:1},{...images[0],order:2}]},{images:[images[0]]},
 {targets:['threads']},{timing:{mode:'planned',local:'2026-10-12T18:00',offset_minutes:-540}},
 {music:{mode:'manual-app'}},{media_format:'reel'},{reel_playback_reviewed:true},
 {reel_video:{asset_id:'c'.repeat(64),mime:'video/mp4',metadata:{width:1080,height:1920}}},
 {source:{url:'https://example.invalid/other',verified:true}},{safety:{rights:'BLOCK'}},
 {review:{output_version:'v1',score:9,decision:'approved'}}
 ];
 for(const patch of patches){const s=pass(checked()),next=editPost(s,'p',patch,revision(s));assert.equal(finalReviewStatus(next.posts[0]).passed,false,JSON.stringify(patch));assert.equal(blocked(next.posts[0]),true);assert.equal(approvedReviewBundle(next).posts.length,0);}
 const s=pass(checked()),common=setCommonTags(s,['이야기'],s.revision);assert.equal(finalReviewStatus(common.posts[0]).decision,'unreviewed');
 const tampered=JSON.parse(JSON.stringify(s));tampered.posts[0].images.reverse();assert.equal(finalReviewStatus(tampered.posts[0]).passed,false);
});

check('new import and producer versions never inherit historical pass',()=>{
 const s=pass(checked()),b={bundle_id:'new',posts:[{...raw,output_version:'v2'}]};
 for(const next of [importBundle(s,b),syncProductionBundle(s,b)]){assert.equal(finalReviewStatus(next.posts[0]).decision,'unreviewed');assert.equal(next.archived_posts[0].final_review.decision,'passed');assert.equal(approvedReviewBundle(next).posts.length,0);assert.equal(next.jobs.length,0);}
 const feedback=refreshProductionFeedback(s,[{post_id:'p',output_version:'v1',production_feedback:{current:{output_version:'v1',score:9,note:'reference',updated_at:now}}}]);
 assert.equal(finalReviewStatus(feedback.posts[0]).passed,true);
});

check('pass withdrawal invalidates prior dry run approval and queued job',()=>{
 let s=pass(checked());s=approveDryRun(s,'p',revision(s));s=queuePost(s,'p',revision(s));
 s=setFinalReview(s,'p','revise',revision(s),now);assert.equal(s.posts[0].approval,null);assert.equal(s.posts[0].publication_approval,null);assert.equal(s.jobs[0].stale,true);
 assert.throws(()=>startDryRun(s,s.jobs[0].id),/stale_job/);
});

check('undo redo and explicit restoration cannot renew earlier pass',()=>{
 let s=pass(checked());s=captureHistory(s,editPost(s,'p',{caption:'다음 문안'},revision(s)),now);
 s=pass(s);s=undoPost(s,'p',revision(s));assert.equal(finalReviewStatus(s.posts[0]).passed,false);
 s=pass(s);s=redoPost(s,'p',revision(s));assert.equal(finalReviewStatus(s.posts[0]).passed,false);
 s=pass(s);const entry=s.post_history.p.entries[s.post_history.p.cursor].id;
 s=restorePostSnapshot(s,'p',entry,revision(s));assert.equal(finalReviewStatus(s.posts[0]).passed,false);
});

check('only active current passed posts reach review bundle',()=>{
 const s=pass(checked());s.archived_posts.push({...s.posts[0],output_version:'old'});
 s.posts.push({...s.posts[0],post_id:'hidden',inactive_for_this_batch:true});
 s.posts.push({...s.posts[0],post_id:'legacy',final_review:null});
 assert.deepEqual(approvedReviewBundle(s).posts.map(p=>p.post_id),['p']);
});

console.log('Final review: '+count+' checks passed. External calls: 0.');
