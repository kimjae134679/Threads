// Source-only preparation. Not bundled, configured, authenticated, or enabled in APK.
// api is an injected authenticated native HTTPS JSON transport; this module never
// obtains, stores, logs, embeds, or falls back to any token or bridge credential.
import {validateManifest,key} from './core.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const sha1=/^[a-f0-9]{40}$/;
const statePath='mobile-review/state.json';
const maxStateBytes=1000000, maxAssetBytes=25*1024*1024;
const utf8=new TextEncoder();
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
function identifier(value){return typeof value==='string'&&value.length>0&&value.length<=200;}
function gitSha(value){if(!sha1.test(value))throw Error('Invalid Git SHA');return value;}
function decode(response,limit){
 if(!response||response.encoding!=='base64'||!Number.isInteger(response.size)||response.size<0||response.size>limit||typeof response.content!=='string'||response.content.length>Math.ceil(limit/3)*4+1000)throw Error('Invalid or oversized Git blob');
 const text=response.content.replace(/\s/g,'');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw Error('Invalid base64 blob');
 const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));if(bytes.length!==response.size)throw Error('Git blob size mismatch');return bytes;
}
function validateState(state){
 if(!state||state.githubReviewSchema!==1||!state.assets||Array.isArray(state.assets)||typeof state.assets!=='object'||!state.operations||Array.isArray(state.operations)||typeof state.operations!=='object')throw Error('Invalid GitHub review state');
 validateManifest(state.manifest);
 if(state.manifest.entries.some(e=>!Number.isSafeInteger(e.revision)))throw Error('Invalid review revision');
 for(const entry of state.manifest.entries)for(const image of entry.images){const asset=state.assets[image.url];if(!asset||!sha1.test(asset.blobSha)||asset.sha256!==image.sha256||image.url!=='/v1/review/assets/'+image.sha256+'.png')throw Error('Invalid asset mapping');}
 for(const [id,record] of Object.entries(state.operations)){
  const r=record?.result;if(!identifier(id)||!/^[a-f0-9]{64}$/.test(record?.requestHash)||!r||r.operationId!==id||!['applied','conflict','stale'].includes(r.status)||!Number.isSafeInteger(r.revision)||r.revision<0)throw Error('Invalid operation ledger');
 }
 return state;
}
function validateOperation(op){
 const fields=['operationId','id','outputVersion','reviewRound','baseRevision','criteriaVersion','kind','payload','deviceId','createdAt'];
 if(!op||Object.keys(op).length!==fields.length||fields.some(f=>!Object.hasOwn(op,f))||!identifier(op.operationId)||!identifier(op.deviceId)||!identifier(op.id)||!identifier(op.reviewRound)||!identifier(op.criteriaVersion)||!identifier(op.createdAt)||!/^[a-f0-9]{64}$/.test(op.outputVersion)||!Number.isSafeInteger(op.baseRevision)||op.baseRevision<0||op.baseRevision===Number.MAX_SAFE_INTEGER||op.kind!=='review')throw Error('Invalid review operation');
 const p=op.payload;
 if(!p||Object.keys(p).length!==4||!['score','note','checks','decision'].every(f=>Object.hasOwn(p,f))||!(p.score===null||Number.isInteger(p.score)&&p.score>=1&&p.score<=10)||typeof p.note!=='string'||p.note.length>10000||!['unreviewed','needs_revision','held','publish_approved'].includes(p.decision)||!p.checks||typeof p.checks!=='object'||Array.isArray(p.checks)||Object.values(p.checks).some(v=>typeof v!=='boolean'))throw Error('Invalid review payload');
}
export function createGithubAdapter({approved=false,owner,repo,repositoryId,branch,api}){
 if(typeof owner!=='string'||!/^[A-Za-z0-9-]+$/.test(owner)||typeof repo!=='string'||!/^[A-Za-z0-9_.-]+$/.test(repo)||!Number.isSafeInteger(repositoryId)||repositoryId<=0||typeof api!=='function')throw Error('Explicit repository identity and native API required');
 // An isolated pre-existing branch, never the bridge, default branch or source.
 if(typeof branch!=='string'||!/^mobile-review\/[A-Za-z0-9_-]+$/.test(branch))throw Error('Isolated mobile-review branch required');
 const prefix='/repos/'+owner+'/'+repo, ref='heads/'+branch;
 let knownAssets=null;
 async function call(path,init){if(approved!==true)throw Error('GitHub activation requires separate approval');return api(prefix+path,init);}
 async function checkRepository(){
  const r=await call('');if(r.private!==true)throw Error('Only a private repository is allowed');
  if(r.id!==repositoryId||r.owner?.login?.toLowerCase()!==owner.toLowerCase()||r.name?.toLowerCase()!==repo.toLowerCase())throw Error('Repository identity mismatch');
  if(typeof r.default_branch!=='string'||!r.default_branch||r.default_branch===branch)throw Error('Repository default branch is not an isolated review branch');
 }
 async function snapshot(){
  await checkRepository();const head=gitSha((await call('/git/ref/'+ref)).object?.sha);
  const commit=await call('/git/commits/'+head), tree=gitSha(commit?.tree?.sha);
  const file=await call('/contents/'+statePath+'?ref='+head);
  const state=validateState(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(file,maxStateBytes))));
  return {head,tree,state};
 }
 async function save(base,state){
  const content=JSON.stringify(state);if(utf8.encode(content).length>maxStateBytes)throw Error('Review ledger capacity exceeded; explicit archival required');
  const blob=gitSha((await call('/git/blobs',{method:'POST',body:{content,encoding:'utf-8'}})).sha);
  const tree=gitSha((await call('/git/trees',{method:'POST',body:{base_tree:base.tree,tree:[{path:statePath,mode:'100644',type:'blob',sha:blob}]}})).sha);
  const commit=gitSha((await call('/git/commits',{method:'POST',body:{message:'Update versioned mobile review ledger',tree,parents:[base.head]}})).sha);
  try{await call('/git/refs/'+ref,{method:'PATCH',body:{sha:commit,force:false}});return true;}
  catch(error){
   // 422 can also mean spam/rate limit/validation. Retry only if another actor
   // advanced the exact branch; never retry general denial or unknown outcome.
   if([409,422].includes(error.status)){const current=gitSha((await call('/git/ref/'+ref)).object?.sha);if(current!==base.head)return false;}
   throw error;
  }
 }
 async function submit(op){
  validateOperation(op);const requestHash=await digest(utf8.encode(JSON.stringify(ordered(op))));
  for(let attempt=0;attempt<3;attempt++){
   const base=await snapshot(), state=clone(base.state), previous=Object.hasOwn(state.operations,op.operationId)?state.operations[op.operationId]:null;
   if(previous){if(previous.requestHash!==requestHash)throw Error('operationId reused with different content');return {...clone(previous.result),status:previous.result.status==='applied'?'duplicate':previous.result.status};}
   const entry=state.manifest.entries.find(e=>key(e)===key(op));let result;
   if(!entry||op.criteriaVersion!==state.manifest.criteria.version)result={operationId:op.operationId,status:'stale',revision:entry?.revision||0};
   else{
    validateManifest({...state.manifest,entries:[{...entry,review:op.payload}]});
    if(entry.revision!==op.baseRevision)result={operationId:op.operationId,status:'conflict',revision:entry.revision,review:clone(entry.review||null)};
    else{entry.review=clone(op.payload);entry.revision++;result={operationId:op.operationId,status:'applied',revision:entry.revision};}
   }
   Object.defineProperty(state.operations,op.operationId,{value:{requestHash,result},enumerable:true,writable:true,configurable:true});
   if(await save(base,state))return clone(result);
  }
  throw Error('Concurrent repository updates; leave review pending and retry later');
 }
 async function request(path,init={}){
  if(path==='/v1/review/manifest'&&(!init.method||init.method==='GET')){const {state}=await snapshot();knownAssets=clone(state.assets);return clone(state.manifest);}
  if(path==='/v1/review/operations'&&init.method==='POST'&&typeof init.body==='string'&&utf8.encode(init.body).length<=64*1024)return submit(JSON.parse(init.body));
  throw Error('Unsupported review route');
 }
 async function downloadAsset(image){
  const asset=knownAssets&&Object.hasOwn(knownAssets,image.url)?knownAssets[image.url]:null;
  if(!asset||asset.sha256!==image.sha256)throw Error('Unknown or changed asset');
  await checkRepository();const response=await call('/git/blobs/'+gitSha(asset.blobSha)), bytes=decode(response,maxAssetBytes);
  if(response.sha!==asset.blobSha||await digest(bytes)!==image.sha256||[137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b))throw Error('PNG asset hash or signature mismatch');
  return new Blob([bytes],{type:'image/png'});
 }
 return Object.freeze({request,downloadAsset});
}
