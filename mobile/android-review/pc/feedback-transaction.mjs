// Source-only transaction core. No CLI, scheduler, store.save, or deployed binding.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {prepareFeedbackImport,requestHash} from './exchange.mjs';
import {key} from '../app/core.js';

const hashPattern=/^[a-f0-9]{64}$/,commitPattern=/^[a-f0-9]{40}$/;
const uuidPattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
const maxBytes=16*1024*1024;
function absolute(value){
 if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0')||value.split(/[\\/]/).includes('..'))throw Error('Explicit absolute path required; traversal rejected');
 return path.resolve(value);
}
function child(root,file){const relative=path.relative(root,file);if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Path is outside allowed workspace');return file;}
async function safePath(file,{missing=false,directory=false}={}){
 const absoluteFile=absolute(file),parts=absoluteFile.slice(path.parse(absoluteFile).root.length).split(path.sep);let cursor=path.parse(absoluteFile).root;
 for(let i=0;i<parts.length;i++){
  cursor=path.join(cursor,parts[i]);let stat;
  try{stat=await fs.lstat(cursor);}catch(e){if(e.code==='ENOENT'&&missing&&i===parts.length-1)return null;throw e;}
  if(stat.isSymbolicLink())throw Error('Symlink or junction path rejected');
  if(i<parts.length-1||directory){if(!stat.isDirectory())throw Error('Directory path required');}
  else if(!stat.isFile()||stat.nlink!==1)throw Error('Regular single-link file required; hardlink rejected');
 }
 return fs.lstat(absoluteFile);
}
async function safeRead(file){
 const before=await safePath(file);if(before.size>maxBytes)throw Error('Canonical or journal file exceeds size limit');
 const handle=await fs.open(file,'r');
 try{const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1||stat.dev!==before.dev||stat.ino!==before.ino)throw Error('File identity changed during read');const bytes=await handle.readFile();if(bytes.length>maxBytes)throw Error('File exceeds size limit');await safePath(file);return bytes;}finally{await handle.close();}
}
async function syncDirectory(directory){
 let handle;try{handle=await fs.open(directory,'r');await handle.sync();return true;}
 catch(e){if(process.platform==='win32'&&['EPERM','EACCES','EISDIR','EINVAL','ENOTSUP'].includes(e.code))return false;throw e;}
 finally{await handle?.close();}
}
async function durableCreate(file,bytes){
 await safePath(file,{missing:true});const handle=await fs.open(file,'wx',0o600);
 try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
 await syncDirectory(path.dirname(file));
}
async function ensureDirectory(directory){await safePath(directory,{missing:true,directory:true});await fs.mkdir(directory).catch(e=>{if(e.code!=='EEXIST')throw e;});await safePath(directory,{directory:true});await syncDirectory(path.dirname(directory));}
function validateCanonical(data,reviewRound){
 if(!plain(data)||data.schemaVersion!==1||data.recordType!=='user_post_quality_feedback'||data.reviewRound!==reviewRound||!Array.isArray(data.evaluations))throw Error('Incompatible canonical feedback schema or current round');
 const seen=new Set();for(const e of data.evaluations){if(!plain(e)||typeof e.id!=='string'||!e.id||!hashPattern.test(e.outputVersion))throw Error('Invalid canonical evaluation identity');const k=JSON.stringify([e.id,e.outputVersion]);if(seen.has(k))throw Error('Duplicate canonical evaluation identity');seen.add(k);}
 if(data.mobileImport!==undefined){const m=data.mobileImport;if(!plain(m)||m.schemaVersion!==1||!Array.isArray(m.receipts)||!plain(m.revisions)||!Array.isArray(m.decisionRecords))throw Error('Invalid canonical mobileImport metadata');}
 return data;
}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw Error('Cannot prove lock owner is absent');}}
async function acquireLock(file){
 const guard=file+'.reclaim',token=randomUUID();
 await safePath(guard,{missing:true,directory:true}).then(stat=>{if(stat)throw Error('Feedback lock busy: reclamation in progress');});
 await safePath(file,{missing:true});
 let handle;
 try{handle=await fs.open(file,'wx',0o600);}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  // Serialize dead-owner recovery. Every writer checks this guard before AND
  // after claiming the lock. Live or indeterminate owners are never evicted.
  try{await fs.mkdir(guard);}catch(error){if(error.code==='EEXIST')throw Error('Feedback lock busy');throw error;}
  try{
   const original=await safeRead(file),owner=JSON.parse(original);
   if(!Number.isSafeInteger(owner.pid)||owner.pid<=0||!uuidPattern.test(owner.token)||alive(owner.pid))throw Error('Feedback lock busy: live or invalid owner');
   if(!(await safeRead(file)).equals(original))throw Error('Feedback lock changed during recovery');
   await fs.unlink(file);await syncDirectory(path.dirname(file));
  }finally{await fs.rmdir(guard);}
  try{handle=await fs.open(file,'wx',0o600);}catch(error){if(error.code==='EEXIST')throw Error('Feedback lock busy');throw error;}
 }
 try{
  const guardStat=await safePath(guard,{missing:true,directory:true});if(guardStat)throw Error('Feedback lock busy');
  await handle.writeFile(JSON.stringify({schemaVersion:1,pid:process.pid,token})+'\n');await handle.sync();await syncDirectory(path.dirname(file));
 }catch(e){await handle.close();await fs.unlink(file).catch(()=>{});throw e;}
 return async()=>{await handle.close();const owner=JSON.parse(await safeRead(file));if(owner.token!==token)throw Error('Feedback lock ownership changed');await fs.unlink(file);await syncDirectory(path.dirname(file));};
}
function journalNames(directory,id){return {backupFile:path.join(directory,id+'.before.bin'),stageFile:path.join(directory,id+'.after.json'),journalFile:path.join(directory,id+'.journal.json'),resolutionFile:path.join(directory,id+'.resolved.json')};}
async function recoverPending(directory,feedbackFile){
 const stat=await safePath(directory,{missing:true,directory:true});if(!stat)return [];
 const result=[];
 for(const filename of (await fs.readdir(directory)).filter(n=>n.endsWith('.journal.json')).sort()){
  const id=filename.slice(0,-'.journal.json'.length);if(!uuidPattern.test(id))throw Error('Invalid transaction journal name');const names=journalNames(directory,id);
  const journal=JSON.parse(await safeRead(names.journalFile));
  if(journal.schemaVersion!==1||journal.recordType!=='mobile_feedback_transaction'||journal.transactionId!==id||journal.feedbackFile!==feedbackFile||!hashPattern.test(journal.beforeHash)||!hashPattern.test(journal.afterHash)||!commitPattern.test(journal.sourceCommit)||!hashPattern.test(journal.pinnedStateHash))throw Error('Invalid transaction journal identity or provenance');
  const resolution=await safePath(names.resolutionFile,{missing:true});
  if(resolution){const done=JSON.parse(await safeRead(names.resolutionFile));if(done.transactionId!==id||!['committed','before_preserved'].includes(done.status)||done.observedHash!==(done.status==='committed'?journal.afterHash:journal.beforeHash))throw Error('Invalid transaction resolution');continue;}
  if(hash(await safeRead(names.backupFile))!==journal.beforeHash)throw Error('Immutable transaction backup hash mismatch');
  const currentHash=hash(await safeRead(feedbackFile));let status;
  if(currentHash===journal.afterHash)status='committed';
  else if(currentHash===journal.beforeHash){status='before_preserved';if(hash(await safeRead(names.stageFile))!==journal.afterHash)throw Error('Transaction stage hash mismatch');}
  else throw Error('Recovery refused unknown external canonical edit; original preserved');
  // A single rename has no split rating/receipt state. The exact before file
  // already IS the rollback; recovery never writes a backup over newer data.
  await durableCreate(names.resolutionFile,JSON.stringify({schemaVersion:1,transactionId:id,status,observedHash:currentHash})+'\n');result.push({transactionId:id,status});
 }
 return result;
}
async function replace(stageFile,feedbackFile,io,verifyCurrent){
 for(let i=0;;i++){await verifyCurrent();try{await io.rename(stageFile,feedbackFile);return;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||i===7)throw e;await new Promise(r=>setTimeout(r,Math.min(50*2**i,800)));}}
}

function transaction(config,fixture){
 const options={...config},enabled=options.enabled===true&&(fixture?options.syntheticFixture===true:options.canonicalMergeApproved===true);
 async function binding(){
  const workspace=absolute(fixture?options.allowedFixtureWorkspace:options.allowedWorkspace),root=absolute(fixture?options.fixtureRoot:options.allowedWorkspace),file=absolute(options.feedbackFile);
  await safePath(workspace,{directory:true});await safePath(root,{directory:true});child(root,file);await safePath(file);
  if(typeof options.readSnapshots!=='function')throw Error('Trusted PC readSnapshots callback required');
  if(fixture){
   child(absolute(os.tmpdir()),root);child(workspace,root);
   if(!path.basename(root).startsWith('pc-feedback-fixture-')||path.basename(file)!=='canonical-feedback.json')throw Error('Explicit synthetic fixture path required');
   const marker=JSON.parse(await safeRead(path.join(root,'.mobile-feedback-fixture.json')));if(marker.schemaVersion!==1||marker.syntheticOnly!==true)throw Error('Synthetic fixture marker required');
  }
  return {file,directory:file+'.mobile-import',lock:file+'.mobile-import.lock'};
 }
 async function locked(work){
  if(!enabled)return {status:'disabled',canonicalWritePerformed:false};
  if(!fixture&&(typeof options.withCanonicalWriter!=='function'||options.canonicalWriterContract?.allCanonicalWriters!==true||options.canonicalWriterContract?.roundActivation!==true))throw Error('Approved shared canonical writer adapter and all-writers/round-activation contract required');
  const b=await binding();
  const run=async()=>{const release=await acquireLock(b.lock);try{await binding();return await work(b);}finally{await release();}};
  return fixture?run():options.withCanonicalWriter(run);
 }
 async function recover(){return locked(async b=>({status:'recovered',canonicalWritePerformed:false,transactions:await recoverPending(b.directory,b.file)}));}
 async function importFeedback(input){
  if(!enabled)return {status:'disabled',canonicalWritePerformed:false};
  // Caller must supply state bytes obtained from a verified, pinned remote read.
  // The immutable identity hash and local snapshot are independently rechecked.
  const request=clone(input);
  if(!commitPattern.test(request.sourceCommit)||!hashPattern.test(request.pinnedStateHash)||requestHash(request.state)!==request.pinnedStateHash)throw Error('Pinned remote source commit and matching state hash required');
  return locked(async b=>{
   const recovered=await recoverPending(b.directory,b.file),snapshots=clone(await options.readSnapshots());
   const before=await safeRead(b.file),data=validateCanonical(JSON.parse(before),snapshots.reviewRound),metadata=data.mobileImport??{schemaVersion:1,receipts:[],revisions:{},decisionRecords:[]};
   const proposal=prepareFeedbackImport({...snapshots,state:request.state,sourceCommit:request.sourceCommit,receipts:metadata.receipts,canonicalRevisions:metadata.revisions,canonicalEvaluations:data.evaluations});
   if(!proposal.evaluationProposals.length)return {status:'unchanged',canonicalWritePerformed:false,proposal,recovered,journalDirectory:b.directory};
   const next=clone(data),mobileImport=clone(metadata);
   for(const {evaluation} of proposal.evaluationProposals){const index=next.evaluations.findIndex(e=>e.id===evaluation.id&&e.outputVersion===evaluation.outputVersion&&(!e.reviewRound||e.reviewRound===evaluation.reviewRound));if(index<0)next.evaluations.push(evaluation);else next.evaluations[index]=evaluation;}
   mobileImport.receipts.push(...proposal.proposedReceipts);mobileImport.decisionRecords.push(...proposal.mobileDecisionRecords);
   for(const receipt of proposal.proposedReceipts)mobileImport.revisions[key(receipt)]=receipt.revision;
   next.mobileImport=mobileImport;next.updatedAt=new Date().toISOString();const after=Buffer.from(JSON.stringify(next,null,2)+'\n');if(after.length>maxBytes)throw Error('Canonical feedback size limit exceeded');
   const id=randomUUID(),names=journalNames(b.directory,id),beforeHash=hash(before),afterHash=hash(after),point=async stage=>options.failpoint?.(stage);
   await ensureDirectory(b.directory);await durableCreate(names.backupFile,before);await point('afterBackup');
   await durableCreate(names.stageFile,after);await point('afterStage');
   const journal={schemaVersion:1,recordType:'mobile_feedback_transaction',transactionId:id,feedbackFile:b.file,beforeHash,afterHash,sourceCommit:request.sourceCommit,pinnedStateHash:request.pinnedStateHash,operationIds:proposal.proposedReceipts.map(r=>r.operationId)};
   await durableCreate(names.journalFile,JSON.stringify(journal,null,2)+'\n');await point('afterJournal');await point('beforeCas');
   if(hash(await safeRead(names.backupFile))!==beforeHash||hash(await safeRead(names.stageFile))!==afterHash)throw Error('Transaction backup or stage changed before replacement');
   const verifyCurrent=async()=>{await binding();if(requestHash(clone(await options.readSnapshots()))!==requestHash(snapshots))throw Error('Trusted PC snapshot changed before canonical replacement');if(!(await safeRead(b.file)).equals(before))throw Error('Canonical feedback changed before replacement (CAS rejected)');};
   // Fixture lock excludes this module's writers only. Future production use
   // MUST keep the PC-wide writer adapter held across snapshot/CAS/rename.
   await replace(names.stageFile,b.file,fixture?options.io??fs:fs,verifyCurrent);await point('afterRename');const directorySynced=await syncDirectory(path.dirname(b.file));await point('afterDirectorySync');
   await durableCreate(names.resolutionFile,JSON.stringify({schemaVersion:1,transactionId:id,status:'committed',observedHash:afterHash})+'\n');
   return {status:'committed',canonicalWritePerformed:true,proposal,recovered,transactionId:id,beforeHash,afterHash,...names,journalDirectory:b.directory,directorySynced};
  });
 }
 return Object.freeze({importFeedback,recover});
}

export function createFeedbackTransaction(config={}){return transaction(config,false);}
export function createFixtureFeedbackTransaction(config={}){return transaction(config,true);}
