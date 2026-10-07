// Default-disabled callable PC producer. Explicit read-only snapshots, transport,
// scratch export namespace and durable journal callback are the only bindings.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {version} from '../../../desktop/post-review-store.cjs';
import {createHash} from 'node:crypto';
import {exportRelease,prepareFeedbackImport,dedicatedRepositoryMetadata,requestHash} from './exchange.mjs';
import {publishPreparedRelease} from './publish-release.mjs';
import {readPinnedReviewState} from './github-transport.mjs';
const git=/^[a-f0-9]{40}$/,hash=/^[a-f0-9]{64}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const clone=x=>JSON.parse(JSON.stringify(x));
const blob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
const statePath='mobile-review/state.json';

/** No fallback: null means the current pointer is not a complete collection. */
export function selectCompletedRound(snapshot){
 if(!plain(snapshot))return null;
 const {pointer:p,report:r,deliveryJournal:j}=snapshot;
 if(!plain(p)||p.active!==true||p.wholeCollectionRegenerated!==true||typeof p.reviewRound!=='string'||!p.reviewRound||p.reviewRound.length>200||!Number.isSafeInteger(p.posts)||p.posts<1||!Number.isSafeInteger(p.pages)||p.pages<p.posts)return null;
 if(!plain(r)||r.reviewRound!==p.reviewRound||r.deliveryStatus!=='complete'||!Array.isArray(r.entries)||r.entries.length>10000||r.processed!==r.entries.length)return null;
 if(!plain(j)||j.reviewRound!==p.reviewRound||j.complete!==true||j.rolledBack===true||j.error||j.rollbackError)return null;
 if(r.entries.some(e=>!plain(e)||e.status==='failed'))return null;
 const rows=r.entries.filter(e=>e.outputFolder&&Array.isArray(e.images)&&e.images.length);
 if(rows.length!==p.posts||new Set(rows.map(e=>e.id)).size!==p.posts||rows.some(e=>e.status!=='generated'||e.reviewRound!==p.reviewRound||typeof e.id!=='string'||!e.id||typeof e.outputFolder!=='string'))return null;
 // A generated output with missing pages is also an incomplete collection.
 if(r.entries.some(e=>(e.outputFolder||e.status==='generated')&&!rows.includes(e)))return null;
 const pages=rows.reduce((n,e)=>n+e.images.length,0);
 if(pages!==p.pages||j.posts!==undefined&&j.posts!==p.posts||j.pages!==undefined&&j.pages!==pages)return null;
 if(p.audited!==undefined&&(!Array.isArray(p.audited)||p.audited.length!==rows.length||rows.some(e=>p.audited.filter(a=>a?.id===e.id&&a.pages===e.images.length&&a.ruleVersion===e.ruleVersion).length!==1)))return null;
 if(p.sourceStatusSha256!==undefined&&!hash.test(p.sourceStatusSha256))return null;
 return {reviewRound:p.reviewRound,posts:rows.length,pages,rows:clone(rows),sourceStatusSha256:p.sourceStatusSha256||null};
}
function contentFingerprint(selected,criteria){
 return requestHash({reviewRound:selected.reviewRound,criteria,sourceStatusSha256:selected.sourceStatusSha256,rows:selected.rows.map(r=>({id:r.id,title:r.title,sourceFingerprint:r.sourceFingerprint,outputSha256:r.outputSha256,ruleVersion:r.ruleVersion,images:r.images})).sort((a,b)=>a.id.localeCompare(b.id))});
}
function releaseIdentity(manifest){
 return requestHash({schemaVersion:manifest.schemaVersion,reviewRound:manifest.reviewRound,criteria:manifest.criteria,entries:manifest.entries.map(e=>({id:e.id,title:e.title,outputVersion:e.outputVersion,reviewRound:e.reviewRound,images:e.images.map(i=>({url:i.url,sha256:i.sha256}))}))});
}
function decodeBlob(response,limit){
 if(!plain(response)||response.encoding!=='base64'||!Number.isSafeInteger(response.size)||response.size<1||response.size>limit||!git.test(response.sha)||typeof response.content!=='string'||response.content.length>Math.ceil(limit/3)*4+1000)fail('invalid_pinned_blob');
 const encoded=response.content.replace(/\s/g,'');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))fail('invalid_pinned_blob');
 const bytes=Buffer.from(encoded,'base64');if(bytes.length!==response.size||blob(bytes)!==response.sha)fail('pinned_blob_hash_mismatch');return bytes;
}
function preserves(before,after){
 if(!plain(after)||!plain(after.operations)||!plain(after.assets)||!Array.isArray(after.history))return false;
 for(const [id,record] of Object.entries(before.operations))if(requestHash(after.operations[id]??null)!==requestHash(record))return false;
 for(const [url,asset] of Object.entries(before.assets))if(requestHash(after.assets[url]??null)!==requestHash(asset))return false;
 const history=new Set(after.history.map(requestHash));if(!before.history.every(h=>history.has(requestHash(h))))return false;
 for(const entry of before.manifest.entries){
  const next=after.manifest.entries.find(e=>e.id===entry.id&&e.outputVersion===entry.outputVersion&&e.reviewRound===entry.reviewRound);
  if(!next||!Number.isSafeInteger(next.revision)||next.revision<entry.revision)return false;
  if(next.revision===entry.revision){if(requestHash(next.review)!==requestHash(entry.review))return false;}
  else if(!Object.values(after.operations).some(record=>record.request?.id===next.id&&record.request.outputVersion===next.outputVersion&&record.request.reviewRound===next.reviewRound&&record.result?.status==='applied'&&record.result.revision===next.revision&&requestHash(record.request.payload)===requestHash(next.review)))return false;
 }
 return true;
}
function initialJournal(input,repositoryIdentity){
 if(!plain(input))throw Error('Caller-preserved release feed journal required');
 if(Object.keys(input).length===0)return {pcReleaseFeedSchema:1,repositoryIdentity,confirmed:null,pending:null};
 if(input.pcReleaseFeedSchema!==1||input.repositoryIdentity!==repositoryIdentity||input.confirmed!==null&&!plain(input.confirmed)||input.pending!==null&&!plain(input.pending))throw Error('Invalid release feed journal or repository identity');
 return clone(input);
}
function confirm(journal,pending,head){
 journal.confirmed={head,contentFingerprint:pending.contentFingerprint,trustedLocalSnapshot:clone(pending.trustedLocalSnapshot),assetDirectory:pending.assetDirectory,exportDirectory:pending.exportDirectory};journal.pending=null;
}

function inside(root,target){const rel=path.relative(root,target);return !!rel&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);}
async function localJson(file){
 const resolved=path.resolve(file),root=path.parse(resolved).root,parts=resolved.slice(root.length).split(path.sep).filter(Boolean);let current=root;
 for(let i=0;i<parts.length;i++){current=path.join(current,parts[i]);const stat=await fs.lstat(current);if(stat.isSymbolicLink()||i<parts.length-1&&!stat.isDirectory()||i===parts.length-1&&(!stat.isFile()||stat.nlink!==1||stat.size<1||stat.size>1000000))fail('invalid_prepared_local_file');}
 const handle=await fs.open(resolved,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{const before=await handle.stat();if(!before.isFile()||before.nlink!==1||before.size<1||before.size>1000000)fail('invalid_prepared_local_file');const buffer=Buffer.alloc(before.size+1);let offset=0;while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}const after=await handle.stat();if(offset!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs)fail('prepared_local_file_changed');const bytes=buffer.subarray(0,offset);return {bytes,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};}finally{await handle.close();}
}
async function canonicalSnapshot(store,selected){
 if(typeof store.list!=='function')fail('read_only_store_listing_required');const listing=await store.list();if(listing?.reviewRound!==selected.reviewRound||!Array.isArray(listing.entries))fail('canonical_store_round_changed');
 return requestHash(selected.rows.map(row=>{const entries=listing.entries.filter(e=>e.id===row.id),entry=entries[0],outputVersion=version(row);if(entries.length!==1||entry.outputVersion!==outputVersion||entry.current&&(entry.current.id!==row.id||entry.current.outputVersion!==outputVersion||entry.current.reviewRound!==selected.reviewRound))fail('canonical_store_version_changed');return {id:row.id,outputVersion,current:entry.current||null};}).sort((a,b)=>a.id.localeCompare(b.id)));
}
async function resumeExport(p,{allowedOutputRoot,outputDirectory,store,selected,criteria}){
 if(typeof allowedOutputRoot!=='string'||!path.isAbsolute(allowedOutputRoot)||typeof outputDirectory!=='string'||!path.isAbsolute(outputDirectory)||typeof p.exportDirectory!=='string'||!path.isAbsolute(p.exportDirectory)||path.resolve(outputDirectory)!==path.resolve(p.exportDirectory)||!inside(path.resolve(allowedOutputRoot),path.resolve(p.exportDirectory)))fail('prepared_resume_namespace_mismatch');
 const root=path.resolve(p.exportDirectory);if(store.root&&(root===path.resolve(store.root)||inside(path.resolve(store.root),root)||inside(root,path.resolve(store.root))))fail('prepared_resume_source_overlap');
 const stateFile=path.join(root,'mobile-review','state.json'),assetDirectory=path.join(root,'mobile-review','assets'),snapshotFile=path.join(root,'pc-local','export-provenance.json');
 if(typeof p.assetDirectory!=='string'||path.resolve(p.assetDirectory)!==assetDirectory)fail('prepared_resume_asset_namespace_mismatch');
 const state=await localJson(stateFile),snapshot=await localJson(snapshotFile);
 if(blob(state.bytes)!==p.stateBlobSha||requestHash(state.value)!==p.stateHash||requestHash(snapshot.value)!==requestHash(p.trustedLocalSnapshot))fail('prepared_resume_hash_or_baseline_mismatch');
 prepareFeedbackImport({state:state.value,trustedLocalSnapshot:p.trustedLocalSnapshot,rows:selected.rows,criteria,reviewRound:selected.reviewRound});
 if(!hash.test(p.localStoreHash)||await canonicalSnapshot(store,selected)!==p.localStoreHash)fail('prepared_resume_canonical_store_changed');
 if(typeof store.image!=='function')fail('read_only_source_image_required');
 for(const row of selected.rows)for(let index=0;index<row.images.length;index++){
  const image=await store.image(row.id,index+1,version(row)),max=25*1024*1024;
  if(typeof image!=='string'||image.length>Math.ceil(max/3)*4+30||!/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image))fail('prepared_resume_source_png_changed');
  const bytes=Buffer.from(image.slice('data:image/png;base64,'.length),'base64');if(bytes.length<8||bytes.length>max||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||createHash('sha256').update(bytes).digest('hex')!==row.images[index].sha256)fail('prepared_resume_source_png_changed');
 }
 return {state:state.value,outputDirectory:root,stateFile,assetDirectory,trustedLocalSnapshot:clone(p.trustedLocalSnapshot),snapshotFile};
}
/**
 * readRemoteSnapshot must authenticate and return a pinned {head,tree,state}.
 * persistJournal must durably save its JSON input before resolving. Callers must
 * serialize runs for one journal/repository; this function creates no lock/timer.
 */
export async function runReleaseFeed({enabled=false,readSnapshots,readRemoteSnapshot=readPinnedReviewState,store,criteria,repository,api,allowedOutputRoot,outputDirectory,journal:inputJournal={},persistJournal}={}){
 if(enabled!==true)return {status:'disabled'};
 if(typeof readSnapshots!=='function'||typeof readRemoteSnapshot!=='function'||typeof api!=='function')throw Error('Injected read-only completion/pinned remote snapshots and API required');
 if(typeof persistJournal!=='function')throw Error('Durable persistJournal callback required before publication');
 if(store?.readOnly!==true)throw Error('Explicit read-only PC store required');
 const metadata=dedicatedRepositoryMetadata(repository),repositoryIdentity=requestHash({...metadata,excludedRepositories:repository.excludedRepositories}),journal=initialJournal(inputJournal,repositoryIdentity);
 const selected=selectCompletedRound(await readSnapshots());if(!selected)return {status:'waiting',reason:'current_collection_incomplete',journal};
 const fingerprint=contentFingerprint(selected,criteria),prefix='/repos/'+metadata.owner+'/'+metadata.repo;
 const persist=async()=>{await persistJournal(clone(journal));};
 const current=async()=>{const next=selectCompletedRound(await readSnapshots());return next&&contentFingerprint(next,criteria)===fingerprint;};
 const remote=await readRemoteSnapshot({enabled:true,repository,api,allowAbsent:true});
 if(!plain(remote)||!git.test(remote.head)||!git.test(remote.tree)||remote.state!==null&&!plain(remote.state))throw Error('Authenticated pinned remote snapshot required');

 let exported=null;
 if(journal.pending){
  const p=journal.pending;
  if(p.contentFingerprint!==fingerprint)return {status:'blocked',reason:'pending_publication_belongs_to_other_collection',journal};
  if(!git.test(p.expectedHead)||!hash.test(p.stateHash)||!git.test(p.stateBlobSha)||!plain(p.trustedLocalSnapshot))throw Error('Invalid pending publication evidence');
  if(!p.candidateCommit){
   if(p.phase!=='export_ready')return {status:'blocked',reason:'uncertain_commit_requires_read_only_resolution',journal};
   if(remote.head!==p.expectedHead||!hash.test(p.remoteStateHash)||requestHash(remote.state)!==p.remoteStateHash)return {status:'pending',reason:'precommit_remote_changed_reexport_required',journal};
   try{exported=await resumeExport(p,{allowedOutputRoot,outputDirectory,store,selected,criteria});if(!await current())return {status:'waiting',reason:'current_collection_changed',journal};}
   catch(error){return {status:'blocked',reason:error?.code||'prepared_resume_validation_failed',journal};}
  }else{
  if(!git.test(p.candidateCommit)||!git.test(p.treeSha))throw Error('Invalid pending candidate evidence');
  try{
   // Verify immutable candidate content and parent before either claiming success
   // or re-sending the same non-force ref request. Never create another commit.
   const commit=await api(prefix+'/git/commits/'+p.candidateCommit);
   if(commit?.sha!==p.candidateCommit||commit.tree?.sha!==p.treeSha||commit.parents?.length!==1||commit.parents[0]?.sha!==p.expectedHead)fail('candidate_commit_identity_mismatch');
   const response=await api(prefix+'/contents/'+statePath+'?ref='+p.candidateCommit),bytes=decodeBlob(response,1000000);
   if(response.sha!==p.stateBlobSha)fail('candidate_state_blob_mismatch');
   const candidateState=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(requestHash(candidateState)!==p.stateHash)fail('candidate_state_content_mismatch');
   prepareFeedbackImport({state:candidateState,trustedLocalSnapshot:p.trustedLocalSnapshot,rows:selected.rows,criteria,reviewRound:selected.reviewRound});
   if(!await current())return {status:'waiting',reason:'current_collection_changed',journal};
   if(remote.head===p.candidateCommit){
    if(!remote.state||requestHash(remote.state)!==p.stateHash)fail('candidate_head_state_mismatch');
    confirm(journal,p,remote.head);await persist();return {status:'confirmed',head:remote.head,recovered:true,journal};
   }
   if(remote.head!==p.expectedHead){
    const comparison=await api(prefix+'/compare/'+p.candidateCommit+'...'+remote.head);
    if(comparison?.status!=='ahead'||comparison.merge_base_commit?.sha!==p.candidateCommit||comparison.head_commit?.sha!==remote.head||!remote.state||releaseIdentity(remote.state.manifest)!==releaseIdentity(candidateState.manifest)||requestHash(remote.state.pcExport)!==requestHash(candidateState.pcExport)||!preserves(candidateState,remote.state))return {status:'blocked',reason:'candidate_not_verified_in_current_lineage',journal};
    prepareFeedbackImport({state:remote.state,trustedLocalSnapshot:p.trustedLocalSnapshot,rows:selected.rows,criteria,reviewRound:selected.reviewRound});
    confirm(journal,p,remote.head);await persist();return {status:'confirmed',head:remote.head,recovered:true,journal};
   }
   const head=(await api(prefix+'/git/ref/heads/'+metadata.branch)).object?.sha;
   if(head!==p.expectedHead)return {status:'blocked',reason:'branch_advanced_during_recovery',journal};
   p.phase='ref_update_in_flight';await persist();
   const result=await api(prefix+'/git/refs/heads/'+metadata.branch,{method:'PATCH',body:{sha:p.candidateCommit,force:false}});
   if(result?.object?.sha!==p.candidateCommit)fail('publication_unconfirmed');
   confirm(journal,p,p.candidateCommit);await persist();return {status:'confirmed',head:p.candidateCommit,recovered:true,journal};
  }catch(error){return {status:'blocked',reason:error?.code||'candidate_verification_or_transport_failed',journal};}
  }
 }

 // Compare the current pinned ledger against independently retained provenance,
 // never re-export from a stale canonical release which could erase mobile edits.
 if(!exported){
 const localStoreHash=await canonicalSnapshot(store,selected);
 exported=await exportRelease({store,rows:selected.rows,criteria,reviewRound:selected.reviewRound,allowedOutputRoot,outputDirectory,previousState:remote.state,previousTrustedLocalSnapshot:journal.confirmed?.trustedLocalSnapshot||null,previousAssetDirectory:journal.confirmed?.assetDirectory||null,repository});
 if(!await current()||await canonicalSnapshot(store,selected)!==localStoreHash)return {status:'waiting',reason:'current_collection_changed',journal,exported};
 if(remote.state&&releaseIdentity(remote.state.manifest)===exported.trustedLocalSnapshot.releaseIdentityHash){
  journal.confirmed={head:remote.head,contentFingerprint:fingerprint,trustedLocalSnapshot:clone(exported.trustedLocalSnapshot),assetDirectory:exported.assetDirectory,exportDirectory:exported.outputDirectory};await persist();return {status:'noop',head:remote.head,journal,exported};
 }
 const stateBytes=await fs.readFile(exported.stateFile);
 journal.pending={contentFingerprint:fingerprint,expectedHead:remote.head,remoteStateHash:requestHash(remote.state),localStoreHash,stateHash:requestHash(exported.state),stateBlobSha:blob(stateBytes),trustedLocalSnapshot:clone(exported.trustedLocalSnapshot),assetDirectory:exported.assetDirectory,exportDirectory:exported.outputDirectory,candidateCommit:null,treeSha:null,phase:'export_ready'};await persist();
 }
 const p=journal.pending,known=new Set(Object.values(remote.state?.assets||{}).map(a=>a.blobSha));
 const wrappedApi=async(url,init={})=>{
  if(init.method==='POST'&&url===prefix+'/git/blobs'){
   const bytes=Buffer.from(init.body.content,'base64'),sha=blob(bytes);
   if(known.has(sha)){
    const response=await api(prefix+'/git/blobs/'+sha),confirmed=decodeBlob(response,25*1024*1024);
    if(response.sha!==sha||!confirmed.equals(bytes))fail('existing_blob_content_mismatch');return {sha};
   }
  }
  if(init.method==='POST'&&url===prefix+'/git/commits'){
   if(!await current())fail('current_collection_changed');
   const previousPhase=p.phase,previousTree=p.treeSha;
   p.treeSha=init.body.tree;p.phase='commit_in_flight';
   try{await persist();}catch(error){p.phase=previousPhase;p.treeSha=previousTree;throw error;}
   // Only a successfully saved checkpoint can reach the commit API. Once it
   // starts, keep in-flight evidence even if the response never arrives.
   const result=await api(url,init);
   if(!git.test(result?.sha)||result.sha===p.expectedHead||result.tree?.sha!==p.treeSha||result.parents?.length!==1||result.parents[0]?.sha!==p.expectedHead)fail('created_commit_identity_mismatch');
   p.candidateCommit=result.sha;p.phase='candidate_created';await persist();return result;
  }
  if(init.method==='PATCH'&&url===prefix+'/git/refs/heads/'+metadata.branch){
   if(!await current())fail('current_collection_changed');
   p.phase='ref_update_in_flight';await persist();
  }
  return api(url,init);
 };
 const result=await publishPreparedRelease({...repository,approved:true,exportDirectory:exported.outputDirectory,expectedHead:remote.head,api:wrappedApi});
 if(result.status==='confirmed'){confirm(journal,p,result.head);try{await persist();}catch{return {...result,reason:'journal_persistence_failed',journalPersisted:false,journal,exported};}return {...result,journal,exported};}
 // No retry within this call. Caller retains uncertain candidate evidence.
 try{await persist();}catch{return {...result,reason:'journal_persistence_failed',journalPersisted:false,journal,exported};}return {...result,journal,exported};
}
