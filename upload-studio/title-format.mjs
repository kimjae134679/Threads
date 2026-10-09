// One-time migration of local review copies. Producer source bytes are never edited.
import {plainTitleWrapper,titleInfo} from './title-normalization.mjs';
import {contentBasis,isActivePost} from './domain.mjs';
import {createHash} from 'node:crypto';
import {finalReviewStatus} from './final-review.mjs';
const clone=value=>Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)])):value;
const approvalFail=()=>{throw Object.assign(new Error('title_edit_approval_invalid'),{code:'title_edit_approval_invalid',status:400});};
export function validateTitleEditApproval(value){
 if(value===null||value===undefined)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||value.schema!==1||value.kind!=='title-wrapper-removal'||
  typeof value.approvalId!=='string'||!value.approvalId.trim()||value.approvalId.length>200||
  typeof value.approvedAt!=='string'||!Number.isFinite(Date.parse(value.approvedAt))||new Date(value.approvedAt).toISOString().replace('.000Z','Z')!==value.approvedAt.replace('.000Z','Z')||
  !Array.isArray(value.entries)||value.entries.length>1000||
  Object.keys(value).some(key=>!['schema','kind','approvalId','approvedAt','entries'].includes(key)))approvalFail();
 const ids=new Set();
 for(const entry of value.entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.postId!=='string'||!entry.postId||entry.postId.length>200||
   typeof entry.outputVersion!=='string'||!entry.outputVersion||entry.outputVersion.length>100||!/^[a-f0-9]{64}$/.test(entry.fingerprint||'')||
   Object.keys(entry).some(key=>!['postId','outputVersion','fingerprint'].includes(key))||ids.has(entry.postId))approvalFail();
  ids.add(entry.postId);
 }
 return clone(value);
}
const fingerprint=basis=>createHash('sha256').update(basis).digest('hex');
function plainFirstLine(value){
 if(typeof value!=='string')return value;
 const at=value.indexOf('\n'),line=at<0?value:value.slice(0,at),rest=at<0?'':value.slice(at),cr=line.endsWith('\r')?'\r':'',first=cr?line.slice(0,-1):line;
 return plainTitleWrapper(first)+cr+rest;
}
function invalidateJobs(state,postId){
 for(const job of state.jobs||[]){
  if(job.post_id!==postId||['cancelled','dry_run_complete'].includes(job.state))continue;
  job.stale=true;
  if(!['running','reconciliation'].includes(job.state))job.state='waiting';
 }
}
// Compatibility with the installed ab3528 cleaner: recompute from live fields,
// never accept a stored basis merely because an approval document repeats it.
function legacyCaptionFirstLine(value){
 const text=String(value??''),at=text.indexOf('\n'),line=at<0?text:text.slice(0,at),cr=line.endsWith('\r')?'\r':'',first=cr?line.slice(0,-1):line,rest=at<0?'':text.slice(at);
 const outer=/^\s*\[\s+([\s\S]*?)\s+\]\s*$/.exec(first),candidate=outer?outer[1]:first,info=titleInfo(candidate);
 if(!info.sourceLabels.length)return text;
 const existingTitle=/^\[\s+([\s\S]*?)\s+\]$/.exec(info.displayTitle),title=existingTitle?existingTitle[1]:info.displayTitle;
 return (title?'[ '+title+' ]':'')+cr+rest;
}
function titleReviewStatus(post){
 const current=finalReviewStatus(post);if(current.passed)return current;
 const r=post.final_review;
 if(!r||r.decision!=='passed'||r.output_version!==post.output_version||!Number.isInteger(r.reviewed_revision)||r.reviewed_revision<=0||
  typeof r.reviewed_at!=='string'||!Number.isFinite(Date.parse(r.reviewed_at)))return current;
 const parts=JSON.parse(contentBasis(post));
 parts[3]=Object.fromEntries(['instagram','threads'].map(k=>[k,legacyCaptionFirstLine(post.platform_captions?.[k]??post.caption??'')]));
 const basis=JSON.stringify([JSON.stringify(parts),isActivePost(post)]);
 return r.basis===basis?{...current,decision:'passed',passed:true,current:true,basis}:current;
}
export function migrateTitleFormat(state,approval=null){
 const approved=validateTitleEditApproval(approval),next=clone(state),summary={affected_post_ids:[],previous_pass_post_ids:[],approved_pass_post_ids:[]};
 if(next.title_format_initialized===true)return {state:next,summary};
 for(const post of next.posts||[]){
  const priorStatus=titleReviewStatus(post),priorReview=clone(post.final_review),priorFingerprint=fingerprint(priorStatus.basis);
  const entry=approved?.entries.find(item=>item.postId===post.post_id&&item.outputVersion===post.output_version&&item.fingerprint===priorFingerprint);
  const preservePass=priorStatus.passed&&!!entry;
  let changed=false;
  const replace=(object,key)=>{
   if(!object||typeof object[key]!=='string')return;
   const value=plainFirstLine(object[key]);
   if(value!==object[key]){object[key]=value;changed=true;}
  };
  replace(post,'caption');
  for(const platform of ['instagram','threads'])replace(post.platform_captions,platform);
  replace(post,'publication_title');
  replace(post.source,'cover_title');
  if(!changed)continue;
  summary.affected_post_ids.push(post.post_id);
  if(priorStatus.passed)summary.previous_pass_post_ids.push(post.post_id);
  // Keep legacy notes in the editable review note field before discarding old review evidence.
  if(!preservePass&&(post.review_note===undefined||post.review_note===null||(post.review_note===''&&!post.review_note_updated_at))&&typeof post.review?.note==='string')post.review_note=post.review.note;
  post.revision=(post.revision||0)+1;
  post.approval=null;post.publication_approval=null;
  if(preservePass){
   // Preserve the original human verdict time/revision; this separate explicit
   // edit approval links only the permitted wrapper change to its new basis.
   post.final_review={...priorReview,basis:finalReviewStatus(post).basis,prior_final_review:priorReview,
    edit_approval:{schema:1,kind:approved.kind,approvalId:approved.approvalId,approvedAt:approved.approvedAt,
     rebased_revision:post.revision,priorFingerprint}};
   summary.approved_pass_post_ids.push(post.post_id);
  }else{
   if(Object.prototype.hasOwnProperty.call(post,'review'))post.review=null;
   if(Object.prototype.hasOwnProperty.call(post,'final_review'))post.final_review=null;
  }
  invalidateJobs(next,post.post_id);
 }
 next.title_format_initialized=true;
 next.title_format_migration=clone(summary);
 next.revision=(next.revision||0)+1;
 return {state:next,summary};
}
