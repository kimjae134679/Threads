// Persisted local final review only. No scheduling, publishing, I/O or clock reads.
import {contentBasis,isActivePost} from './domain.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const decisions=new Set(['unreviewed','hold','discard','revise','passed']);
const fail=code=>{throw Object.assign(new Error(code),{code,status:code==='revision_conflict'?409:400});};
const basisOf=post=>JSON.stringify([contentBasis(post),isActivePost(post)]);
function reviewTime(now){
 if(!['string','number'].includes(typeof now)||!Number.isFinite(new Date(now).getTime()))fail('invalid_final_review_time');
 return new Date(now).toISOString();
}
export function finalReviewStatus(post){
 const basis=basisOf(post),r=post.final_review;
 // Legacy user scores and historical approvals are never final review evidence.
 const current=!!r&&decisions.has(r.decision)&&r.decision!=='unreviewed'&&r.output_version===post.output_version&&r.basis===basis&&
  Number.isInteger(r.reviewed_revision)&&r.reviewed_revision>0&&typeof r.reviewed_at==='string'&&Number.isFinite(Date.parse(r.reviewed_at));
 const decision=current?r.decision:'unreviewed';
 return {decision,current,passed:current&&decision==='passed',output_version:post.output_version,basis,
  reviewed_at:current?r.reviewed_at:null,reviewed_revision:current?r.reviewed_revision:null};
}
export function setFinalReview(state,postId,decision,expectedPostRevision,now){
 if(!decisions.has(decision))fail('invalid_final_review');
 const at=reviewTime(now),s=clone(state),p=s.posts.find(post=>post.post_id===postId);
 if(!p)fail('post_not_found');if(p.revision!==expectedPostRevision)fail('revision_conflict');
 p.revision++;
 p.final_review=decision==='unreviewed'?null:{decision,output_version:p.output_version,basis:basisOf(p),reviewed_at:at,reviewed_revision:p.revision};
 // A local final pass never grants source, rights, dry-run or publication approval.
 p.approval=null;p.publication_approval=null;
 for(const job of s.jobs.filter(job=>job.post_id===postId&&!['cancelled','dry_run_complete'].includes(job.state))){
  job.stale=true;if(!['running','reconciliation'].includes(job.state))job.state='waiting';
 }
 s.revision++;return s;
}
export function approvedReviewBundle(state){
 return {schema:1,bundle_id:'final-review-approved',posts:state.posts.filter(post=>isActivePost(post)&&finalReviewStatus(post).passed).map(clone),external_calls:0};
}
