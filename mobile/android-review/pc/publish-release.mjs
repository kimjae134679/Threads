// Source-only producer boundary: injected API only. No fetch, auth, scheduling,
// repository creation or local/canonical file writes. Activation stays external.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateManifest,key} from '../app/core.js';
import {dedicatedRepositoryMetadata,requestHash} from './exchange.mjs';

const gitShaPattern=/^[a-f0-9]{40}$/,hashPattern=/^[a-f0-9]{64}$/;
const maxStateBytes=1000000,maxAssetBytes=25*1024*1024,maxAssets=5000,maxTotalAssetBytes=128*1024*1024;
const statePath='mobile-review/state.json';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const blobSha=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=200;
function gitSha(value){if(!gitShaPattern.test(value))throw Object.assign(Error('Invalid Git SHA'),{code:'invalid_git_response'});return value;}
function fail(code){throw Object.assign(Error(code),{code});}

async function noLinks(file,directory){
 const resolved=path.resolve(file),root=path.parse(resolved).root,parts=resolved.slice(root.length).split(path.sep).filter(Boolean);
 let current=root;
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink())throw Error('Symbolic links/junctions are refused in prepared export paths');
  if(i<parts.length-1&&!stat.isDirectory())throw Error('Invalid export namespace parent');
  if(i===parts.length-1){if(directory?!stat.isDirectory():!stat.isFile())throw Error('Expected a regular export '+(directory?'directory':'file'));if(!directory&&stat.nlink>1)throw Error('Hard-linked export files are refused');return stat;}
 }
 throw Error('An explicit export namespace is required');
}
async function readBounded(file,limit){
 const stat=await noLinks(file,false);if(stat.size<1||stat.size>limit)throw Error('Export file size limit exceeded');
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const opened=await handle.stat();if(!opened.isFile()||opened.nlink>1||opened.size!==stat.size)throw Error('Export file changed before reading');
  const buffer=Buffer.alloc(stat.size+1);let offset=0;
  while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}
  const after=await handle.stat();if(offset!==stat.size||after.size!==stat.size||after.mtimeMs!==opened.mtimeMs)throw Error('Export file changed during bounded read');
  return buffer.subarray(0,offset);
 }finally{await handle.close();}
}
function validateState(state,prepared=true){
 if(!plain(state)||state.githubReviewSchema!==1||!plain(state.assets)||!plain(state.operations)||state.history!==undefined&&!Array.isArray(state.history))throw Error('Invalid prepared export state');
 if(prepared&&(!Array.isArray(state.history)||!plain(state.pcExport)))throw Error('Invalid prepared export provenance/history');
 validateManifest(state.manifest);
 const manifests=[state.manifest,...(state.history||[]).map(h=>{if(!plain(h))throw Error('Invalid historical state');return validateManifest(h.manifest);})];
 if(manifests.some(m=>m.entries.some(e=>!Number.isSafeInteger(e.revision))))throw Error('Invalid manifest revision');
 if(state.pcExport!==undefined){
  if(!plain(state.pcExport)||state.pcExport.pcVersion!=='0.3.16'||!plain(state.pcExport.entries))throw Error('Invalid prepared export baseline');
  if(requestHash(Object.keys(state.pcExport.entries).sort())!==requestHash(state.manifest.entries.map(key).sort()))throw Error('Prepared export baseline keys mismatch');
  for(const baseline of Object.values(state.pcExport.entries))if(!plain(baseline)||!hashPattern.test(baseline.canonicalEvaluationHash)||!Number.isSafeInteger(baseline.baseRevision)||baseline.baseRevision<0)throw Error('Invalid prepared export baseline');
 }
 for(const [url,asset] of Object.entries(state.assets))if(!plain(asset)||!hashPattern.test(asset.sha256)||!gitShaPattern.test(asset.blobSha)||url!=='/v1/review/assets/'+asset.sha256+'.png')throw Error('Invalid immutable asset mapping');
 for(const manifest of manifests)for(const entry of manifest.entries)for(const image of entry.images)if(!Object.hasOwn(state.assets,image.url)||state.assets[image.url].sha256!==image.sha256)throw Error('Missing immutable asset mapping');
 const fields=['operationId','id','outputVersion','reviewRound','baseRevision','criteriaVersion','kind','payload','deviceId','createdAt'];
 for(const [id,record] of Object.entries(state.operations)){
  const result=record?.result;if(!identifier(id)||!plain(record)||!hashPattern.test(record.requestHash)||!plain(result)||result.operationId!==id||!['applied','conflict','stale'].includes(result.status)||!Number.isSafeInteger(result.revision)||result.revision<0)throw Error('Invalid preserved operation ledger');
  if(record.request!==undefined){
   const op=record.request;if(!plain(op)||Object.keys(op).length!==fields.length||fields.some(f=>!Object.hasOwn(op,f))||op.operationId!==id||![op.id,op.reviewRound,op.criteriaVersion,op.deviceId,op.createdAt].every(identifier)||!hashPattern.test(op.outputVersion)||!Number.isSafeInteger(op.baseRevision)||op.baseRevision<0||op.baseRevision===Number.MAX_SAFE_INTEGER||op.kind!=='review'||requestHash(op)!==record.requestHash)throw Error('Invalid preserved operation request/hash');
   if(!plain(op.payload)||Object.keys(op.payload).length!==4||!['score','note','checks','decision'].every(f=>Object.hasOwn(op.payload,f))||!plain(op.payload.checks))throw Error('Invalid preserved operation payload');
   const criteria=manifests.find(m=>m.criteria.version===op.criteriaVersion)?.criteria||{version:op.criteriaVersion,items:Object.keys(op.payload.checks).map(id=>({id,label:id}))};
   validateManifest({schemaVersion:1,reviewRound:op.reviewRound,criteria,entries:[{id:op.id,title:'Preserved operation',outputVersion:op.outputVersion,reviewRound:op.reviewRound,revision:op.baseRevision,images:[],review:op.payload}]});
   if(result.status==='applied'&&result.revision!==op.baseRevision+1)throw Error('Invalid preserved applied revision');
  }
 }
 return state;
}
async function preparedFiles(exportDirectory){
 if(typeof exportDirectory!=='string'||!path.isAbsolute(exportDirectory)||['mobile-review','pc-local','assets'].includes(path.basename(exportDirectory).toLowerCase()))throw Error('An explicit complete export namespace root is required');
 const root=path.resolve(exportDirectory);await noLinks(root,true);
 const reviewDirectory=path.join(root,'mobile-review');await noLinks(reviewDirectory,true);
 const children=(await fs.readdir(reviewDirectory)).sort();if(requestHash(children)!==requestHash(['assets','state.json']))throw Error('Unexpected file/pc-local in mobile-review upload namespace');
 const assetDirectory=path.join(reviewDirectory,'assets');await noLinks(assetDirectory,true);
 const bytes=await readBounded(path.join(reviewDirectory,'state.json'),maxStateBytes);
 const state=validateState(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))),assets=Object.values(state.assets);
 if(assets.length>maxAssets)throw Error('Asset count limit exceeded');
 const names=(await fs.readdir(assetDirectory)).sort(),expectedNames=assets.map(a=>a.sha256+'.png').sort();
 if(requestHash(names)!==requestHash(expectedNames))throw Error('Physical asset files must match the immutable asset map exactly');
 let total=0;for(const name of names){const stat=await noLinks(path.join(assetDirectory,name),false);if(stat.size<8||stat.size>maxAssetBytes)throw Error('PNG asset size limit exceeded');total+=stat.size;if(total>maxTotalAssetBytes)throw Error('Total PNG asset size limit exceeded');}
 const files=[];for(const asset of assets.sort((a,b)=>a.sha256.localeCompare(b.sha256))){
  const png=await readBounded(path.join(assetDirectory,asset.sha256+'.png'),maxAssetBytes);
  if(!png.subarray(0,8).equals(signature)||sha256(png)!==asset.sha256)throw Error('PNG signature/SHA256 hash mismatch');
  if(blobSha(png)!==asset.blobSha)throw Error('PNG Git blob hash mismatch');
  files.push({path:'mobile-review/assets/'+asset.sha256+'.png',bytes:png,sha:asset.blobSha});
 }
 files.push({path:statePath,bytes,sha:blobSha(bytes)});
 return {files,assetCount:assets.length,state};
}
async function currentRemoteState(api,url){
 let response;try{response=await api(url);}catch(error){if(error?.status===404)return null;throw error;}
 if(!response||response.encoding!=='base64'||!Number.isInteger(response.size)||response.size<1||response.size>maxStateBytes||typeof response.content!=='string'||response.content.length>Math.ceil(maxStateBytes/3)*4+1000)fail('invalid_remote_state');
 const content=response.content.replace(/\s/g,'');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content))fail('invalid_remote_state');
 const bytes=Buffer.from(content,'base64');if(bytes.length!==response.size||response.sha!==blobSha(bytes))fail('remote_state_blob_hash_mismatch');
 try{return validateState(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),false);}catch{fail('invalid_remote_state');}
}
function preservationIssue(remote,local){
 for(const [id,record] of Object.entries(remote.operations))if(!Object.hasOwn(local.operations,id)||requestHash(local.operations[id])!==requestHash(record))return 'stale_export_operations';
 for(const [url,asset] of Object.entries(remote.assets))if(!Object.hasOwn(local.assets,url)||requestHash(local.assets[url])!==requestHash(asset))return 'stale_export_assets';
 const localHistory=new Set(local.history.map(record=>requestHash(record)));
 if((remote.history||[]).some(record=>!localHistory.has(requestHash(record))))return 'stale_export_history';
 const sameCriteria=requestHash(remote.manifest.criteria)===requestHash(local.manifest.criteria),localEntries=new Map(local.manifest.entries.map(entry=>[key(entry),entry]));
 let needsArchive=!sameCriteria||remote.manifest.reviewRound!==local.manifest.reviewRound;
 for(const entry of remote.manifest.entries){
  const current=localEntries.get(key(entry));
  if(sameCriteria&&current){
   if(current.revision!==entry.revision||requestHash(current.review||null)!==requestHash(entry.review||null)||requestHash(current.images)!==requestHash(entry.images))return 'stale_export_reviews';
  }else needsArchive=true;
 }
 if(needsArchive&&!local.history.some(record=>requestHash(record.manifest)===requestHash(remote.manifest)))return 'stale_export_history';
 return null;
}

export async function publishPreparedRelease({approved=false,dedicatedReviewRepository=false,owner,repo,repositoryId,branch,excludedRepositories,exportDirectory,expectedHead,api}){
 if(approved!==true||dedicatedReviewRepository!==true)throw Error('Explicit publication and dedicated review repository approval required');
 const metadata=dedicatedRepositoryMetadata({owner,repo,repositoryId,private:true,dedicatedReviewRepository,branch,excludedRepositories});
 if(!gitShaPattern.test(expectedHead))throw Error('Explicit authenticated expected head SHA required');
 if(typeof api!=='function')throw Error('Injected authenticated future API required');
 // Local validation finishes before the first injected API call. No local writes.
 const prepared=await preparedFiles(exportDirectory),prefix='/repos/'+metadata.owner+'/'+metadata.repo,ref='/git/ref/heads/'+metadata.branch;
 let objectWritesAttempted=0,branchUpdateAttempted=false,candidateCommit=null;
 try{
  const repository=await api(prefix);
  if(repository?.private!==true)fail('repository_not_private');
  if(repository.id!==repositoryId||repository.owner?.login?.toLowerCase()!==owner.toLowerCase()||repository.name?.toLowerCase()!==repo.toLowerCase())fail('repository_identity_mismatch');
  if(typeof repository.default_branch!=='string'||!repository.default_branch||repository.default_branch===branch)fail('default_branch_forbidden');
  const observedHead=gitSha((await api(prefix+ref)).object?.sha);
  if(observedHead!==expectedHead)return {status:'stale',reason:'expected_head_mismatch',expectedHead,observedHead,objectWritesAttempted:0,branchUpdateAttempted:false};
  const base=await api(prefix+'/git/commits/'+expectedHead);if(base?.sha!==expectedHead)fail('base_commit_identity_mismatch');const baseTree=gitSha(base.tree?.sha);
  const remote=await currentRemoteState(api,prefix+'/contents/'+statePath+'?ref='+expectedHead);
  if(remote){const issue=preservationIssue(remote,prepared.state);if(issue)fail(issue);}
  const tree=[];
  for(const file of prepared.files){
   objectWritesAttempted++;const created=await api(prefix+'/git/blobs',{method:'POST',body:{content:file.bytes.toString('base64'),encoding:'base64'}});
   if(created?.sha!==file.sha)fail('git_blob_hash_mismatch');
   tree.push({path:file.path,mode:'100644',type:'blob',sha:file.sha});
  }
  objectWritesAttempted++;const treeSha=gitSha((await api(prefix+'/git/trees',{method:'POST',body:{base_tree:baseTree,tree}})).sha);
  objectWritesAttempted++;const commit=await api(prefix+'/git/commits',{method:'POST',body:{message:'Publish prepared immutable mobile review release',tree:treeSha,parents:[expectedHead]}});
  candidateCommit=gitSha(commit?.sha);
  if(candidateCommit===expectedHead||commit.tree?.sha!==treeSha||!Array.isArray(commit.parents)||commit.parents.length!==1||commit.parents[0]?.sha!==expectedHead)fail('created_commit_identity_mismatch');
  const finalHead=gitSha((await api(prefix+ref)).object?.sha);
  if(finalHead!==expectedHead)return {status:'pending',reason:'branch_advanced',expectedHead,observedHead:finalHead,candidateCommit,objectWritesAttempted,branchUpdateAttempted:false};
  branchUpdateAttempted=true;
  const updated=await api(prefix+'/git/refs/heads/'+branch,{method:'PATCH',body:{sha:candidateCommit,force:false}});
  if(updated?.object?.sha!==candidateCommit)fail('publication_unconfirmed');
  return {status:'confirmed',head:candidateCommit,expectedHead,assetCount:prepared.assetCount,statePath};
 }catch(error){
  const reason=branchUpdateAttempted?(error?.status===409?'non_fast_forward':error?.status===422?'ref_update_rejected':'publication_unconfirmed'):error?.code||'transport_failure';
  return {status:'pending',reason,expectedHead,candidateCommit,objectWritesAttempted,branchUpdateAttempted};
 }
}
