// Minimal local review decisions and notes. No captions, assets or provider state.
import {createHash} from 'node:crypto';
import {isActivePost,reviewNote} from './domain.mjs';
import {finalReviewStatus} from './final-review.mjs';
const fingerprint=post=>createHash('sha256').update(finalReviewStatus(post).basis).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
export function reviewDecisionProjection(state){
 return {schema:1,revision:state.revision,posts:state.posts.map(post=>{
  const status=finalReviewStatus(post);
  return {postId:post.post_id,outputVersion:post.output_version,fingerprint:fingerprint(post),decision:status.decision,
   reviewedAt:status.reviewed_at,note:reviewNote(post),noteUpdatedAt:post.review_note_updated_at||null};
 })};
}
// Future consumers must re-read live review state. An old decision file alone
// cannot restore a pass, select a previous version or authorize publication.
export function approvedDecisionPosts(state,document){
 if(!document||document.schema!==1||!Number.isSafeInteger(document.revision)||document.revision<0||document.revision!==state.revision||!Array.isArray(document.posts))return [];
 const rows=new Map();
 for(const row of document.posts){if(!row||typeof row.postId!=='string'||rows.has(row.postId))return [];rows.set(row.postId,row);}
 return state.posts.filter(post=>{
  const row=rows.get(post.post_id),status=finalReviewStatus(post);
  return isActivePost(post)&&status.passed&&row?.decision==='passed'&&row.outputVersion===post.output_version&&
   row.fingerprint===fingerprint(post)&&row.reviewedAt===status.reviewed_at;
 }).map(clone);
}
