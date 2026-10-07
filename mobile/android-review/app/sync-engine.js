import {key,acceptResult,applyManifest} from './core.js';
export async function syncReviews({getState,commit,request}){
 // Retry original IDs before reading newer revisions: applied-but-unacknowledged
 // operations must reach server idempotency, rather than become false conflicts.
 for(const candidate of getState().outbox.filter(o=>o.status==='pending')){
  const state=getState(),op=state.outbox.find(o=>o.operationId===candidate.operationId);
  if(!op||op.status!=='pending'||state.outbox.some(o=>key(o)===key(op)&&o.status==='conflict'))continue;
  const {status,serverReview,serverRevision,reason,...wire}=op;
  const result=await request('/v1/review/operations',{method:'POST',body:JSON.stringify(wire)});
  await commit(s=>acceptResult(s,op.operationId,result));
 }
 const manifest=await request('/v1/review/manifest');await commit(s=>applyManifest(s,manifest));
}
