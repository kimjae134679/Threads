import {readCanonicalFile} from '../../../desktop/review-canonical-writer.cjs';
import {maxReviewStateBytes,maxReviewTotalAssetBytes} from '../app/review-limits.js';
// Source-only, local PC preparation. No network, authentication, publishing or
// canonical writes. Callers must explicitly supply approved read-only inputs.
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createPostReviewStore,version} from '../../../desktop/post-review-store.cjs';
import {validateManifest,key} from '../app/core.js';

const hashPattern=/^[a-f0-9]{64}$/,gitPattern=/^[a-f0-9]{40}$/;
const maxAssetBytes=25*1024*1024,maxStateBytes=maxReviewStateBytes;
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const clone=value=>JSON.parse(JSON.stringify(value));
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const ordered=value=>Array.isArray(value)?value.map(ordered):plain(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
export const requestHash=request=>sha256(Buffer.from(JSON.stringify(ordered(request)),'utf8'));
const evaluationHash=evaluation=>requestHash(evaluation||null);
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');

// These releases share the verified storage, output-version and evaluation contract.
// Deliberately no semver/range acceptance for unreviewed PC releases.
export const isVerifiedPcVersion=value=>value==='0.3.16'||value==='0.3.18'||value==='0.3.19';
function installedPcVersion(){return JSON.parse(readFileSync(new URL('../../../package.json',import.meta.url),'utf8')).version;}
function requireVerifiedPcVersion(value){if(!isVerifiedPcVersion(value))throw Error('Only verified PC versions 0.3.16, 0.3.18 and 0.3.19 are supported');return value;}

export function createReadOnlyPcStore(materialRoot){
 const pcVersion=requireVerifiedPcVersion(installedPcVersion());
 const store=createPostReviewStore(materialRoot,{readOnly:true});
 return Object.freeze({readOnly:true,pcVersion,root:store.root,list:store.list,image:store.image});
}

export function dedicatedRepositoryMetadata(input){
 if(!plain(input)||!identifier(input.owner)||!/^[A-Za-z0-9-]+$/.test(input.owner)||!identifier(input.repo)||!/^[A-Za-z0-9_.-]+$/.test(input.repo)||!Number.isSafeInteger(input.repositoryId)||input.repositoryId<=0||input.private!==true||input.dedicatedReviewRepository!==true)throw Error('Explicit dedicated private repository metadata required');
 if(typeof input.branch!=='string'||!/^mobile-review\/[A-Za-z0-9_-]+$/.test(input.branch))throw Error('Isolated mobile-review branch required');
 if(!Array.isArray(input.excludedRepositories)||input.excludedRepositories.some(x=>typeof x!=='string'))throw Error('Explicit bridge/command repository exclusions required');
 if(input.excludedRepositories.map(x=>x.toLowerCase()).includes((input.owner+'/'+input.repo).toLowerCase()))throw Error('Review repository must be separate from excluded bridge/command repositories');
 return {owner:input.owner,repo:input.repo,repositoryId:input.repositoryId,private:true,dedicatedReviewRepository:true,branch:input.branch};
}

function validateRows(rows,round){
 if(!identifier(round)||!Array.isArray(rows)||rows.length>10000)throw Error('Invalid report rows or review round');
 const ids=new Set();
 for(const row of rows){
  if(!plain(row)||!identifier(row.id)||ids.has(row.id)||typeof row.title!=='string'||row.reviewRound!==round||!hashPattern.test(row.sourceFingerprint)||!hashPattern.test(row.outputSha256)||!identifier(row.ruleVersion)||!Array.isArray(row.images)||row.images.length>500)throw Error('Invalid canonical ID/hash/version/round');
  ids.add(row.id);
  for(const image of row.images)if(!plain(image)||!hashPattern.test(image.sha256)||typeof image.name!=='string'||!/^rendered\/slide-\d{3,}\.png$/.test(image.name.replaceAll('\\','/')))throw Error('Invalid canonical PNG hash/name');
 }
}
function validatePayload(payload,criteria){
 if(!plain(payload)||Object.keys(payload).length!==4||!['score','note','checks','decision'].every(f=>Object.hasOwn(payload,f))||!(payload.score===null||Number.isInteger(payload.score)&&payload.score>=1&&payload.score<=10)||typeof payload.note!=='string'||payload.note.length>10000||!['unreviewed','needs_revision','held','publish_approved'].includes(payload.decision)||!plain(payload.checks)||Object.values(payload.checks).some(v=>typeof v!=='boolean'))throw Error('Invalid review payload/score');
 if(criteria){const allowed=new Set(criteria.items.map(c=>c.id));if(Object.keys(payload.checks).some(k=>!allowed.has(k)))throw Error('Unknown criteria check in review payload');}
}
function validateOperation(op,criteria){
 const fields=['operationId','id','outputVersion','reviewRound','baseRevision','criteriaVersion','kind','payload','deviceId','createdAt'];
 if(!plain(op)||Object.keys(op).length!==fields.length||fields.some(f=>!Object.hasOwn(op,f))||![op.operationId,op.id,op.reviewRound,op.criteriaVersion,op.deviceId].every(identifier)||!hashPattern.test(op.outputVersion)||!Number.isSafeInteger(op.baseRevision)||op.baseRevision<0||op.baseRevision===Number.MAX_SAFE_INTEGER||op.kind!=='review'||typeof op.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(op.createdAt)||!Number.isFinite(Date.parse(op.createdAt)))throw Error('Invalid operation/version/baseRevision provenance');
 validatePayload(op.payload,criteria);
}
function validateState(state){
 if(!plain(state)||state.githubReviewSchema!==1||!plain(state.assets)||!plain(state.operations))throw Error('Invalid GitHub review state');
 validateManifest(state.manifest);
 if(state.manifest.entries.some(e=>!Number.isSafeInteger(e.revision)))throw Error('Invalid review revision');
 if(state.history!==undefined&&!Array.isArray(state.history))throw Error('Invalid review history');
 for(const historical of state.history||[])validateManifest(historical.manifest);
 for(const [url,asset] of Object.entries(state.assets))if(!plain(asset)||!hashPattern.test(asset.sha256)||!gitPattern.test(asset.blobSha)||url!=='/v1/review/assets/'+asset.sha256+'.png')throw Error('Invalid immutable asset mapping');
 for(const manifest of [state.manifest,...(state.history||[]).map(h=>h.manifest)])for(const entry of manifest.entries)for(const image of entry.images)if(!Object.hasOwn(state.assets,image.url)||state.assets[image.url].sha256!==image.sha256)throw Error('Missing immutable asset mapping');
 const manifests=[state.manifest,...(state.history||[]).map(h=>h.manifest)];
 for(const [id,record] of Object.entries(state.operations)){
  const result=record?.result;
  if(!identifier(id)||!plain(record)||!hashPattern.test(record.requestHash)||!plain(result)||result.operationId!==id||!['applied','conflict','stale'].includes(result.status)||!Number.isSafeInteger(result.revision)||result.revision<0)throw Error('Invalid operation ledger');
  if(record.request!==undefined){
   const op=record.request,criteria=manifests.find(m=>m.criteria.version===op?.criteriaVersion)?.criteria;
   validateOperation(op,criteria);
   if(op.operationId!==id||requestHash(op)!==record.requestHash)throw Error('Operation request hash/identity mismatch');
   if(result.status==='applied'&&result.revision!==op.baseRevision+1)throw Error('Applied revision must equal baseRevision + 1');
   if(result.review!==undefined&&result.review!==null)validatePayload(result.review,criteria);
  }
 }
 return state;
}
function releaseIdentityHash(manifest){
 return requestHash({schemaVersion:manifest.schemaVersion,reviewRound:manifest.reviewRound,criteria:manifest.criteria,entries:manifest.entries.map(entry=>({id:entry.id,title:entry.title,outputVersion:entry.outputVersion,reviewRound:entry.reviewRound,images:entry.images.map(image=>({url:image.url,sha256:image.sha256}))}))});
}
function requireTrustedLocalSnapshot(state,snapshot){
 if(!plain(snapshot)||snapshot.pcExchangeProvenanceSchema!==1||!hashPattern.test(snapshot.releaseIdentityHash)||!plain(snapshot.pcExport)||!isVerifiedPcVersion(snapshot.pcExport.pcVersion)||!plain(snapshot.pcExport.entries))throw Error('Independently preserved trusted local export snapshot required');
 const expectedKeys=state.manifest.entries.map(key).sort(),actualKeys=Object.keys(snapshot.pcExport.entries).sort();
 if(requestHash(expectedKeys)!==requestHash(actualKeys))throw Error('Trusted local snapshot release identity mismatch');
 for(const baseline of Object.values(snapshot.pcExport.entries))if(!plain(baseline)||!hashPattern.test(baseline.canonicalEvaluationHash)||!Number.isSafeInteger(baseline.baseRevision)||baseline.baseRevision<0)throw Error('Invalid trusted local snapshot baseline');
 if(snapshot.releaseIdentityHash!==releaseIdentityHash(state.manifest))throw Error('Trusted local snapshot release identity/criteria mismatch');
 if(!plain(state.pcExport)||requestHash(state.pcExport)!==requestHash(snapshot.pcExport))throw Error('Remote PC baseline does not match trusted local snapshot');
 return snapshot;
}
function pngBytes(bytes,hash){
 if(!Buffer.isBuffer(bytes)||bytes.length<signature.length||bytes.length>maxAssetBytes||!bytes.subarray(0,8).equals(signature))throw Error('Invalid or oversized PNG');
 if(sha256(bytes)!==hash)throw Error('PNG sha256 hash mismatch');
 return bytes;
}
function imageDataUrl(value,hash){
 const prefix='data:image/png;base64,';
 if(typeof value!=='string'||value.length>Math.ceil(maxAssetBytes/3)*4+30||!value.startsWith(prefix))throw Error('Invalid PNG data URL');
 const content=value.slice(prefix.length);
 // A repeated four-character regex group can exhaust V8's stack on real PNGs.
 // The alphabet/padding scan and quartet length check use constant stack space.
 if(content.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(content))throw Error('Invalid PNG data URL');
 return pngBytes(Buffer.from(content,'base64'),hash);
}
function inside(root,candidate){const rel=path.relative(root,candidate);return !!rel&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);}
async function checkOutputNamespace(root,directory,source){
 if(typeof root!=='string'||typeof directory!=='string'||!path.isAbsolute(root)||!path.isAbsolute(directory))throw Error('Explicit absolute output root and new namespace required');
 const requested=path.resolve(directory),allowed=await fs.realpath(root),parent=await fs.realpath(path.dirname(requested));
 const target=path.join(parent,path.basename(requested));
 if(!inside(allowed,target)||(parent!==allowed&&!inside(allowed,parent)))throw Error('Output namespace must stay inside explicit output root');
 if(source){const sourcePath=path.resolve(source);let realSource=sourcePath;try{realSource=await fs.realpath(sourcePath);}catch(e){if(e.code!=='ENOENT')throw e;}if(target===realSource||inside(realSource,target)||inside(target,realSource)||allowed===realSource||inside(realSource,allowed))throw Error('Output namespace cannot overlap source materials');}
 try{await fs.lstat(target);throw Error('Output namespace already exists; overwrite refused');}catch(e){if(e.code!=='ENOENT')throw e;}
 return target;
}

export async function exportRelease({store,rows,criteria,reviewRound,allowedOutputRoot,outputDirectory,previousState=null,previousTrustedLocalSnapshot=null,previousAssetDirectory=null,repository=null,maxTotalAssetBytes=maxReviewTotalAssetBytes}){
 if(store?.readOnly!==true||typeof store.list!=='function'||typeof store.image!=='function')throw Error('Explicit read-only PC store required');
 const pcVersion=requireVerifiedPcVersion(store.pcVersion===undefined?installedPcVersion():store.pcVersion);
 if(!Number.isSafeInteger(maxTotalAssetBytes)||maxTotalAssetBytes<1||maxTotalAssetBytes>maxReviewTotalAssetBytes)throw Error('Invalid aggregate asset budget');
 validateRows(rows,reviewRound);
 const target=await checkOutputNamespace(allowedOutputRoot,outputDirectory,store.root);
 if(previousState){validateState(previousState);requireTrustedLocalSnapshot(previousState,previousTrustedLocalSnapshot);}
 const listing=await store.list();if(listing.reviewRound!==reviewRound||!Array.isArray(listing.entries))throw Error('Store review round mismatch');
 const buffers=new Map(),entries=[],provenance={pcVersion,entries:{}};let totalAssetBytes=0;
 const retain=(hash,bytes)=>{if(buffers.has(hash))return;if(totalAssetBytes+bytes.length>maxTotalAssetBytes)throw Error('Total PNG asset size budget exceeded');totalAssetBytes+=bytes.length;buffers.set(hash,bytes);};
 for(const row of rows){
  const outputVersion=version(row),listed=listing.entries.find(e=>e.id===row.id);
  if(!listed||listed.outputVersion!==outputVersion)throw Error('Store canonical output version mismatch');
  if(listed.current&&(listed.current.id!==row.id||listed.current.outputVersion!==outputVersion||listed.current.reviewRound!==reviewRound))throw Error('Current PC evaluation version/round mismatch');
  const previous=previousState?.manifest.entries.find(e=>key(e)===key({...row,outputVersion}));
  const preserve=previous&&previousState.manifest.criteria.version===criteria?.version;
  const review=preserve?clone(previous.review):listed.current?{score:listed.current.score,note:listed.current.note,checks:{},decision:'unreviewed'}:null;
  if(review)validatePayload(review,criteria);
  const images=[];
  for(let i=0;i<row.images.length;i++){const hash=row.images[i].sha256;retain(hash,imageDataUrl(await store.image(row.id,i+1,outputVersion),hash));images.push({url:'/v1/review/assets/'+hash+'.png',sha256:hash,label:listed.pageLabels?.[i]||'Page '+(i+1)});}
  const entry={id:row.id,title:row.title,outputVersion,reviewRound,revision:preserve?previous.revision:0,review,images};
  for(const field of ['topic','topicLabel','category'])if(typeof listed[field]==='string')entry[field]=listed[field];
  entries.push(entry);
  const baseline=preserve?previousTrustedLocalSnapshot.pcExport.entries[key(entry)]:{canonicalEvaluationHash:evaluationHash(listed.current),baseRevision:entry.revision};
  Object.defineProperty(provenance.entries,key(entry),{value:clone(baseline),enumerable:true});
 }
 const manifest={schemaVersion:1,reviewRound,criteria:clone(criteria),entries};validateManifest(manifest);
 // A runtime upgrade alone must not replace the remote baseline during a feed
 // noop: retained local provenance must still match the exact remote pcExport.
 if(previousState&&releaseIdentityHash(previousState.manifest)===releaseIdentityHash(manifest))provenance.pcVersion=previousTrustedLocalSnapshot.pcExport.pcVersion;
 const history=clone(previousState?.history||[]);
 if(previousState&&requestHash(previousState.manifest)!==requestHash(manifest))history.push({manifest:clone(previousState.manifest),pcExport:clone(previousTrustedLocalSnapshot.pcExport)});
 const assets=clone(previousState?.assets||{});
 if(Object.keys(assets).length&&!previousAssetDirectory)throw Error('Preserved asset directory required for immutable prior PNGs');
 for(const asset of Object.values(assets)){
  if(!buffers.has(asset.sha256))retain(asset.sha256,pngBytes(await readCanonicalFile(previousAssetDirectory,path.join(previousAssetDirectory,asset.sha256+'.png'),{maxBytes:Math.min(maxAssetBytes,maxTotalAssetBytes-totalAssetBytes)}),asset.sha256));
  if(gitBlobSha(buffers.get(asset.sha256))!==asset.blobSha)throw Error('Preserved PNG Git blob SHA mismatch');
 }
 for(const [hash,bytes] of buffers)Object.defineProperty(assets,'/v1/review/assets/'+hash+'.png',{value:{sha256:hash,blobSha:gitBlobSha(bytes)},enumerable:true,writable:true,configurable:true});
 const state={githubReviewSchema:1,manifest,assets,operations:clone(previousState?.operations||{}),history,pcExport:provenance,...(repository?{repository:dedicatedRepositoryMetadata(repository)}:{})};
 validateState(state);const content=JSON.stringify(state,null,2)+'\n';if(Buffer.byteLength(content)>maxStateBytes)throw Error('Review ledger capacity exceeded; explicit archival required');
 const trustedLocalSnapshot={pcExchangeProvenanceSchema:1,releaseIdentityHash:releaseIdentityHash(manifest),pcExport:clone(provenance)};
 requireTrustedLocalSnapshot(state,trustedLocalSnapshot);
 // All validation precedes writes. mkdir without recursive claims a new namespace.
 await fs.mkdir(target);const assetDirectory=path.join(target,'mobile-review','assets');await fs.mkdir(assetDirectory,{recursive:true});
 for(const [hash,bytes] of buffers)await fs.writeFile(path.join(assetDirectory,hash+'.png'),bytes,{flag:'wx'});
 const stateFile=path.join(target,'mobile-review','state.json');await fs.writeFile(stateFile,content,{flag:'wx'});
 // This independently preserved PC-local snapshot must never enter the upload tree.
 const localDirectory=path.join(target,'pc-local');await fs.mkdir(localDirectory);
 const snapshotFile=path.join(localDirectory,'export-provenance.json');await fs.writeFile(snapshotFile,JSON.stringify(trustedLocalSnapshot,null,2)+'\n',{flag:'wx'});
 return {state,outputDirectory:target,stateFile,assetDirectory,trustedLocalSnapshot,snapshotFile};
}

export function prepareFeedbackImport({state,trustedLocalSnapshot,rows,criteria,reviewRound,receipts=[],canonicalEvaluations=[],canonicalRevisions={},sourceCommit=null}){
 validateState(state);requireTrustedLocalSnapshot(state,trustedLocalSnapshot);validateRows(rows,reviewRound);
 validateManifest({schemaVersion:1,reviewRound,criteria,entries:[]});
 if(sourceCommit!==null&&!gitPattern.test(sourceCommit))throw Error('Invalid pinned source commit');
 if(!Array.isArray(receipts)||!Array.isArray(canonicalEvaluations)||!plain(canonicalRevisions))throw Error('Invalid canonical import inputs');
 const prior=new Map();for(const receipt of receipts){if(!plain(receipt)||!identifier(receipt.operationId)||!hashPattern.test(receipt.requestHash)||!identifier(receipt.id)||!hashPattern.test(receipt.outputVersion)||!identifier(receipt.reviewRound)||!Number.isSafeInteger(receipt.revision)||receipt.revision<1||!hashPattern.test(receipt.evaluationHash)||prior.has(receipt.operationId))throw Error('Invalid or duplicate import receipt');prior.set(receipt.operationId,receipt);}
 const result={schemaVersion:1,recordType:'mobile_feedback_import_proposal',canonicalWritePerformed:false,evaluationProposals:[],mobileDecisionRecords:[],proposedReceipts:[],duplicates:[],conflicts:[],stale:[],blockers:[]};
 const revisions=new Map(),expectedHashes=new Map(),checked=new Set();
 const records=Object.entries(state.operations).sort((a,b)=>(a[1].request?.baseRevision??0)-(b[1].request?.baseRevision??0)||a[0].localeCompare(b[0]));
 for(const [operationId,record] of records){
  const receipt=prior.get(operationId);
  if(receipt){
   if(receipt.requestHash!==record.requestHash)throw Error('operationId reused with different content: replay rejected');
   if(record.result.status!=='applied'||receipt.revision!==record.result.revision||record.request&&key(receipt)!==key(record.request))throw Error('Import receipt identity/revision mismatch');
   result.duplicates.push({operationId,requestHash:record.requestHash});continue;
  }
  const op=record.request;
  if(!op){result.blockers.push({operationId,reason:'missing_request_provenance'});continue;}
  const row=rows.find(r=>r.id===op.id),outputVersion=row?version(row):null,k=key(op);
  const provenance={operationId,requestHash:record.requestHash,sourceCommit,deviceId:op.deviceId,createdAt:op.createdAt,criteriaVersion:op.criteriaVersion,baseRevision:op.baseRevision,revision:record.result.revision};
  if(!row||outputVersion!==op.outputVersion||op.reviewRound!==reviewRound||op.criteriaVersion!==criteria.version){result.stale.push({operationId,reason:'version_round_or_criteria_changed',request:clone(op),result:clone(record.result)});continue;}
  validatePayload(op.payload,criteria);
  if(record.result.status==='stale'){result.stale.push({operationId,reason:'remote_stale',request:clone(op),result:clone(record.result)});continue;}
  if(record.result.status==='conflict'){result.conflicts.push({operationId,reason:'remote_conflict',request:clone(op),result:clone(record.result)});continue;}
  const entry=state.manifest.entries.find(e=>key(e)===k),exported=trustedLocalSnapshot.pcExport.entries[k];
  if(!entry||!exported||!hashPattern.test(exported.canonicalEvaluationHash)||!Number.isSafeInteger(exported.baseRevision)||exported.baseRevision<0){result.blockers.push({operationId,reason:'missing_pc_export_provenance'});continue;}
  if(entry.revision<record.result.revision)throw Error('Ledger applied revision exceeds manifest revision');
  if(entry.revision===record.result.revision&&requestHash(entry.review)!==requestHash(op.payload))throw Error('Final manifest review does not match applied ledger request');
  if(!revisions.has(k)){
   const appliedReceipts=receipts.filter(r=>key(r)===k).sort((a,b)=>b.revision-a.revision),latest=appliedReceipts[0];
   const revision=Object.hasOwn(canonicalRevisions,k)?canonicalRevisions[k]:latest?.revision??exported.baseRevision;
   if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid canonical revision');
   revisions.set(k,revision);expectedHashes.set(k,latest?.evaluationHash??exported.canonicalEvaluationHash);
  }
  if(!checked.has(k)){
   const current=canonicalEvaluations.find(e=>e.id===row.id&&e.outputVersion===outputVersion&&(!e.reviewRound||e.reviewRound===reviewRound))||null;
   if(evaluationHash(current)!==expectedHashes.get(k)){result.conflicts.push({operationId,reason:'canonical_changed_since_export',canonical:clone(current),request:clone(op)});continue;}
   checked.add(k);
  }
  if(revisions.get(k)!==op.baseRevision){result.conflicts.push({operationId,reason:'base_revision_mismatch',canonicalRevision:revisions.get(k),request:clone(op)});continue;}
  const evaluation={id:row.id,outputVersion,sourceFingerprint:row.sourceFingerprint,outputSha256:row.outputSha256,ruleVersion:row.ruleVersion,title:row.title,score:op.payload.score,note:op.payload.note,updatedAt:op.createdAt,reviewRound};
  result.evaluationProposals.push({evaluation,provenance});
  result.mobileDecisionRecords.push({id:row.id,outputVersion,reviewRound,decision:op.payload.decision,checks:clone(op.payload.checks),provenance});
  result.proposedReceipts.push({operationId,requestHash:record.requestHash,id:row.id,outputVersion,reviewRound,revision:record.result.revision,evaluationHash:evaluationHash(evaluation)});
  revisions.set(k,record.result.revision);expectedHashes.set(k,evaluationHash(evaluation));
 }
 return result;
}
