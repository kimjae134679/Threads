// One-time migration of local review copies. Producer source bytes are never edited.
import {plainTitleWrapper} from './title-normalization.mjs';
const clone=value=>Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)])):value;
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
export function migrateTitleFormat(state){
 const next=clone(state),summary={affected_post_ids:[],previous_pass_post_ids:[]};
 if(next.title_format_initialized===true)return {state:next,summary};
 for(const post of next.posts||[]){
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
  if(post.final_review?.decision==='passed')summary.previous_pass_post_ids.push(post.post_id);
  // Keep legacy notes in the editable review note field before discarding old review evidence.
  if((post.review_note===undefined||post.review_note===null||(post.review_note===''&&!post.review_note_updated_at))&&typeof post.review?.note==='string')post.review_note=post.review.note;
  post.revision=(post.revision||0)+1;
  for(const key of ['review','final_review','approval','publication_approval']){
   if(Object.prototype.hasOwnProperty.call(post,key))post[key]=null;
  }
  invalidateJobs(next,post.post_id);
 }
 next.title_format_initialized=true;
 next.title_format_migration=clone(summary);
 next.revision=(next.revision||0)+1;
 return {state:next,summary};
}
