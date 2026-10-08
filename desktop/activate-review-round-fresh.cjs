'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {withCanonicalWriter,readCanonicalFile}=require('./review-canonical-writer.cjs');
const {activateReviewRelease}=require('./review-release.cjs');

const files={status:path.join('06_자동 제작 결과','status.json'),feedback:path.join('07_사용자 평가','평가 기록.json'),workflow:path.join('07_사용자 평가','검토 진행.json'),pointer:'review-current.json'};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const round=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
function assert(value,message){if(!value)throw Error(message);}
function within(root,candidate){const relative=path.relative(root,candidate);return !relative||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
async function document(root,relative){
 const bytes=await readCanonicalFile(root,path.join(root,relative));
 let data;try{data=JSON.parse(bytes);}catch(error){throw Error('Invalid review JSON: '+relative,{cause:error});}
 assert(data&&typeof data==='object'&&!Array.isArray(data),'Invalid review document: '+relative);
 return {bytes,data,sha256:hash(bytes)};
}
function feedbackFormat(data,reviewRound,workflow=false){
 const array=workflow?'entries':'evaluations',type=workflow?'user_review_workflow':'user_post_quality_feedback';
 assert(data.schemaVersion===1&&data.recordType===type&&data.reviewRound===reviewRound&&Array.isArray(data[array]),'Invalid review record schema or round: '+array);
 for(const entry of data[array]){
  assert(entry&&typeof entry==='object'&&!Array.isArray(entry)&&typeof entry.id==='string'&&entry.id.length>0&&typeof entry.outputVersion==='string'&&entry.outputVersion.length>0,'Invalid review record identity: '+array);
  assert(entry.reviewRound===undefined||entry.reviewRound===reviewRound,'Invalid review entry round: '+array);
  assert(typeof entry.note==='string','Invalid review memo format: '+array);
  if(workflow)assert(['eligible','held','rejected'].includes(entry.disposition),'Invalid review disposition format');
  else assert(entry.score===null||Number.isInteger(entry.score)&&entry.score>=1&&entry.score<=10,'Invalid human score format');
 }
 return data[array].length;
}
function collection(data,reviewRound,expectedPosts,expectedPages){
 assert(data.reviewRound===reviewRound&&data.deliveryStatus==='complete'&&Array.isArray(data.entries)&&data.processed===data.entries.length,'Invalid collection state or round');
 assert(new Set(data.entries.map(entry=>entry.id)).size===data.entries.length,'Duplicate collection identities');
 const rows=data.entries.filter(entry=>entry.outputFolder&&Array.isArray(entry.images)&&entry.images.length);
 assert(rows.length===expectedPosts&&rows.reduce((sum,row)=>sum+row.images.length,0)===expectedPages,'Review collection count mismatch');
 assert(rows.every(row=>row.reviewRound===reviewRound),'Output review round mismatch');
 return rows;
}
function readyFormat(ready,status,options){
 const {reviewRound,expectedPosts,expectedPages}=options;
 assert(ready.schemaVersion===1&&ready.reviewRound===reviewRound&&ready.posts===expectedPosts&&ready.pages===expectedPages&&ready.newScores===0&&ready.newMemos===0,'Invalid staged release-ready state or counts');
 const rows=collection(status,reviewRound,expectedPosts,expectedPages),ids=new Set(rows.map(row=>row.id));
 assert(rows.every(row=>row.publicationAllowed===false&&row.reviewStatus==='needs_review'&&['generated','already_done'].includes(row.status)),'Invalid staged review-only outputs');
 assert(Array.isArray(ready.audited)&&ready.audited.length===expectedPosts&&new Set(ready.audited.map(row=>row.id)).size===expectedPosts&&ready.audited.every(row=>ids.has(row.id)&&Number.isInteger(row.pages)&&row.pages>0)&&ready.audited.reduce((sum,row)=>sum+row.pages,0)===expectedPages,'Invalid staged audited inventory');
}

/** Activate a prepared round using a fresh snapshot taken under the canonical writer lock.
 * Both roots must be absolute, separate, and on the same volume. No caller-supplied
 * stale hashes are used. Human values are checked only for record format, then
 * archived byte-for-byte by the existing release transaction.
 */
async function activateReviewRoundFresh(materialRoot,stagingRoot,options={}){
 assert(typeof materialRoot==='string'&&path.isAbsolute(materialRoot)&&typeof stagingRoot==='string'&&path.isAbsolute(stagingRoot),'Absolute live and staging roots required');
 const root=path.resolve(materialRoot),stage=path.resolve(stagingRoot),{reviewRound,expectedPosts,expectedPages,expectedCurrentRound}=options;
 assert(round(reviewRound)&&Number.isSafeInteger(expectedPosts)&&expectedPosts>0&&Number.isSafeInteger(expectedPages)&&expectedPages>=expectedPosts,'Explicit new round and collection counts required');
 assert(expectedCurrentRound===undefined||round(expectedCurrentRound),'Invalid expected current review round');
 assert(!within(root,stage)&&!within(stage,root),'Live and staging roots must not overlap');
 if(process.platform==='win32')assert(path.parse(root).root.toLowerCase()===path.parse(stage).root.toLowerCase(),'Live and staging roots must be on the same volume');
 // Default reentry runs directly within an already-held scope. The existing
 // activator then serializes its mutation on that scope's mutation queue.
 return withCanonicalWriter(root,async()=>{
  const snapshot={};for(const [name,relative]of Object.entries(files))snapshot[name]=await document(root,relative);
  const current=snapshot.pointer.data.reviewRound;
  assert(snapshot.pointer.data.schemaVersion===1&&snapshot.pointer.data.active===true&&round(current)&&current!==reviewRound,'Invalid current pointer or already-active target round');
  assert(expectedCurrentRound===undefined||current===expectedCurrentRound,'Current review round changed');
  collection(snapshot.status.data,current,expectedPosts,expectedPages);
  assert(snapshot.pointer.data.posts===expectedPosts&&snapshot.pointer.data.pages===expectedPages,'Current pointer collection count mismatch');
  const feedbackCount=feedbackFormat(snapshot.feedback.data,current),workflowCount=feedbackFormat(snapshot.workflow.data,current,true);
  const staged={};for(const [name,relative]of Object.entries({...files,pointer:'release-ready.json'}))staged[name]=await document(stage,relative);
  readyFormat(staged.pointer.data,staged.status.data,options);
  assert(feedbackFormat(staged.feedback.data,reviewRound)===0&&feedbackFormat(staged.workflow.data,reviewRound,true)===0,'Staged review records must be blank');
  const [rootStat,stageStat]=await Promise.all([fs.stat(root),fs.stat(stage)]);assert(rootStat.dev===stageStat.dev,'Live and staging roots must be on the same volume');
  const freshCheckpoint={reviewRound:current,posts:expectedPosts,pages:expectedPages,feedbackCount,workflowCount};
  for(const [name,value]of Object.entries(snapshot))freshCheckpoint[name+'Sha256']=value.sha256;
  const applied=await activateReviewRelease(root,stage,{expectedStatusSha256:freshCheckpoint.statusSha256,expectedFeedbackSha256:freshCheckpoint.feedbackSha256,expectedWorkflowSha256:freshCheckpoint.workflowSha256,expectedPointerSha256:freshCheckpoint.pointerSha256});
  try{
   assert(applied.reviewRound===reviewRound&&applied.posts===expectedPosts&&applied.pages===expectedPages&&applied.oldBytesPreserved===true,'Activation result does not match the prepared round');
   for(const [name,relative]of Object.entries(files)){
    const bytes=await readCanonicalFile(root,path.join(applied.archive,relative));assert(bytes.equals(snapshot[name].bytes),'Archived live bytes differ: '+name);
   }
   const active={};for(const [name,relative]of Object.entries(files))active[name]=await document(root,relative);
   assert(active.pointer.data.reviewRound===reviewRound&&active.pointer.data.active===true,'Fresh round pointer verification failed');
   collection(active.status.data,reviewRound,expectedPosts,expectedPages);
   assert(active.status.bytes.equals(staged.status.bytes)&&active.feedback.bytes.equals(staged.feedback.bytes)&&active.workflow.bytes.equals(staged.workflow.bytes),'Installed staged document bytes differ');
   assert(feedbackFormat(active.feedback.data,reviewRound)===0&&feedbackFormat(active.workflow.data,reviewRound,true)===0,'Fresh round records are not blank');
  }catch(cause){
   // Do not roll back over a legacy client's newly written memo. The caller
   // must know the move happened and preserve these live bytes for inspection.
   const error=Error('Review round activated, but post-activation verification failed. Preserve live records and inspect before proceeding.',{cause});
   error.code='REVIEW_ACTIVATION_POSTVERIFY_FAILED';error.activation={...applied,freshCheckpoint};throw error;
  }
  return {...applied,freshCheckpoint};
 });
}
module.exports={activateReviewRoundFresh};
