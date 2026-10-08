export const initial=()=>({schemaVersion:1,manifest:null,reviews:{},outbox:[],revisions:{}});
export const key=e=>JSON.stringify([e.id,e.outputVersion,e.reviewRound]);
const clone=s=>JSON.parse(JSON.stringify(s));
const hashPattern=/^[a-f0-9]{64}$/;
const decisions=['unreviewed','needs_revision','held','publish_approved'];
function validReview(r,criteria){
 if(!r||!(r.score===null||Number.isInteger(r.score)&&r.score>=1&&r.score<=10)||typeof r.note!=='string'||r.note.length>10000||!decisions.includes(r.decision)||!r.checks||typeof r.checks!=='object'||Array.isArray(r.checks))throw Error('1–10점, 메모, 검토 상태를 확인하세요.');
 const allowed=new Set(criteria.items.map(c=>c.id));
 if(Object.entries(r.checks).some(([id,v])=>!allowed.has(id)||typeof v!=='boolean'))throw Error('평가 기준을 다시 확인하세요.');
}
export function validateManifest(m){
 if(!m||m.schemaVersion!==1||typeof m.reviewRound!=='string'||!m.reviewRound||!m.criteria||typeof m.criteria.version!=='string'||!m.criteria.version||!Array.isArray(m.criteria.items)||!Array.isArray(m.entries)||m.entries.length>10000)throw Error('서버 목록 계약 오류');
 const seenCriteria=new Set(),seen=new Set();
 for(const c of m.criteria.items){if(typeof c.id!=='string'||!c.id||typeof c.label!=='string'||seenCriteria.has(c.id))throw Error('기준 계약 오류');seenCriteria.add(c.id);}
 for(const e of m.entries){
  if(typeof e.id!=='string'||!e.id||e.id.length>200||typeof e.title!=='string'||!hashPattern.test(e.outputVersion)||e.reviewRound!==m.reviewRound||!Number.isInteger(e.revision)||e.revision<0||seen.has(e.id)||!Array.isArray(e.images)||e.images.length>500)throw Error('글 버전 계약 오류');
  seen.add(e.id);
  for(const i of e.images)if(typeof i.url!=='string'||!/^\/(?!\/)/.test(i.url)||i.url.includes('\\')||!hashPattern.test(i.sha256))throw Error('이미지 계약 오류');
  if(e.review)validReview(e.review,m.criteria);
 }
 return m;
}
export async function outputVersion(row){
 const bytes=new TextEncoder().encode(JSON.stringify([row.sourceFingerprint,row.outputSha256,row.ruleVersion,row.images?.map(i=>i.sha256),...(row.reviewRound?[row.reviewRound]:[])]));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export function applyManifest(state,manifest){
 validateManifest(manifest);const s=clone(state),m=clone(manifest),active=new Set(m.entries.map(key));
 for(const op of s.outbox){
  if(!['pending','conflict'].includes(op.status))continue;
  const e=m.entries.find(e=>key(e)===key(op));
  if(!active.has(key(op))||op.criteriaVersion!==m.criteria.version){op.status='stale';op.reason='제작본·검토 회차·기준 변경';}
  else if(e.revision!==op.baseRevision){op.status='conflict';op.serverRevision=e.revision;op.serverReview=e.review||null;}
 }
 for(const e of m.entries){const k=key(e);s.revisions[k]=e.revision;if(!s.outbox.some(o=>key(o)===k&&['pending','conflict'].includes(o.status))) {if(e.review)s.reviews[k]=clone(e.review);else delete s.reviews[k];}}
 s.manifest=m;return s;
}
export const currentReview=(s,e)=>s.reviews[key(e)]||null;
export function queueEdit(state,entry,payload,operationId,deviceId,createdAt=new Date().toISOString()){
 const e=state.manifest?.entries.find(e=>key(e)===key(entry));if(!e||!e.images.length)throw Error('제작본이 변경됐거나 제작물이 없습니다.');
 if(entry.criteriaVersion!==state.manifest.criteria.version)throw Error('평가 기준이 변경됐습니다. 글을 다시 열어주세요.');
 if(!Number.isInteger(entry.revision)||entry.revision<0)throw Error('편집 화면 revision 오류');
 validReview(payload,state.manifest.criteria);
 if(!operationId||state.outbox.some(o=>o.operationId===operationId))throw Error('중복 작업 식별자');
 if(state.outbox.some(o=>key(o)===key(e)&&o.status==='conflict'))throw Error('충돌을 먼저 처리하세요.');
 const s=clone(state),review={score:payload.score,note:payload.note,checks:clone(payload.checks),decision:payload.decision};
 s.reviews[key(e)]=review;s.outbox.push({operationId,id:e.id,outputVersion:e.outputVersion,reviewRound:e.reviewRound,baseRevision:entry.revision,criteriaVersion:entry.criteriaVersion,kind:'review',payload:review,deviceId,createdAt,status:'pending'});return s;
}
export function acceptResult(state,id,result){
 const s=clone(state),op=s.outbox.find(o=>o.operationId===id);
 if(!op||op.status!=='pending'||result.operationId!==id||!Number.isInteger(result.revision)||result.revision<0)throw Error('동기화 응답 식별 오류');
 if(result.status==='applied'||result.status==='duplicate'){
  if(result.revision<=op.baseRevision)throw Error('동기화 revision 오류');
  op.status='confirmed';s.revisions[key(op)]=result.revision;
  for(const other of s.outbox)if(key(other)===key(op)&&other.status==='pending')other.baseRevision=result.revision;
 }else if(result.status==='conflict'){
  if(result.review)validReview(result.review,s.manifest.criteria);
  op.status='conflict';op.serverRevision=result.revision;op.serverReview=result.review||null;
 }else if(result.status==='stale'){op.status='stale';op.reason='서버 제작본 변경';}
 else throw Error('알 수 없는 서버 응답');
 return s;
}
export function resolveConflict(state,id,choice,newId){
 const s=clone(state),op=s.outbox.find(o=>o.operationId===id);if(!op||op.status!=='conflict'||!['keep_local','use_server'].includes(choice))throw Error('충돌 처리 요청 오류');
 const e=s.manifest.entries.find(e=>key(e)===key(op));if(!e)throw Error('새 제작본을 확인하세요.');
 const group=s.outbox.filter(o=>key(o)===key(op)&&['pending','conflict'].includes(o.status));
 const latest=group.at(-1);for(const o of group)o.status='resolved';s.revisions[key(op)]=op.serverRevision;
 if(choice==='use_server'){if(op.serverReview)s.reviews[key(op)]=clone(op.serverReview);else delete s.reviews[key(op)];return s;}
 return queueEdit(s,{...e,revision:op.serverRevision,criteriaVersion:s.manifest.criteria.version},latest.payload,newId,op.deviceId);
}
