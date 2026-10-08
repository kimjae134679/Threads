// Explicitly invoked, default-disabled production-shaped binding. No deployment,
// scheduler, credentials, environment discovery, or actual data paths are supplied.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {withCanonicalWriter} from '../../../desktop/review-canonical-writer.cjs';
import {createPostReviewStore} from '../../../desktop/post-review-store.cjs';
import {createReadOnlyPcStore,dedicatedRepositoryMetadata,requestHash} from './exchange.mjs';
import {selectCompletedRound} from './release-feed.mjs';
import {createFeedbackTransaction} from './feedback-transaction.mjs';
import {createPcReviewPipeline} from './review-pipeline.mjs';
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const sha=b=>createHash('sha256').update(b).digest('hex');
function absolute(value){if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0')||value.split(/[\\/]/).includes('..'))throw Error('Explicit absolute workspace path required');return path.resolve(value);}
function contained(root,file){const rel=path.relative(root,file);return rel===''||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);}
function disjoint(a,b){if(contained(a,b)||contained(b,a))throw Error('Source/state/export namespace overlap rejected');}
async function safePath(file,{missing=false,directory=false}={}){
 const target=absolute(file),base=path.parse(target).root,parts=target.slice(base.length).split(path.sep).filter(Boolean);let current=base;
 for(let i=0;i<parts.length;i++){current=path.join(current,parts[i]);let s;try{s=await fs.lstat(current);}catch(e){if(e.code==='ENOENT'&&missing)return null;throw e;}if(s.isSymbolicLink())throw Error('Symlink/junction workspace path rejected');if(i<parts.length-1||directory){if(!s.isDirectory())throw Error('Workspace directory required');}else if(!s.isFile()||s.nlink!==1)throw Error('Single-link workspace file required');}
 return fs.lstat(target);
}
async function read(file,{missing=false}={}){
 const before=await safePath(file,{missing});if(!before)return null;if(before.size>16*1024*1024)throw Error('Workspace JSON size limit');const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{const s=await h.stat();if(!s.isFile()||s.nlink!==1||s.dev!==before.dev||s.ino!==before.ino||s.size>16*1024*1024)throw Error('Workspace file identity or size changed');const buffer=Buffer.alloc(s.size+1);let offset=0;while(offset<buffer.length){const {bytesRead}=await h.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}const after=await h.stat(),final=await safePath(file);if(offset!==s.size||after.size!==s.size||after.mtimeMs!==s.mtimeMs||final.dev!==s.dev||final.ino!==s.ino)throw Error('Workspace file changed during read');return buffer.subarray(0,offset);}finally{await h.close();}
}
async function json(file,{missing=false}={}){const b=await read(file,{missing});return b===null?null:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}
async function durableJson(file,value){
 await safePath(file,{missing:true});const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');if(bytes.length>16*1024*1024)throw Error('Feed journal size limit');const tmp=file+'.'+randomUUID()+'.tmp';let h;
 try{h=await fs.open(tmp,'wx',0o600);await h.writeFile(bytes);await h.sync();await h.close();h=null;await safePath(file,{missing:true});await fs.rename(tmp,file);let d;try{d=await fs.open(path.dirname(file),'r');await d.sync();}catch(e){if(process.platform!=='win32'||!['EPERM','EACCES','EISDIR','EINVAL','ENOTSUP'].includes(e.code))throw e;}finally{await d?.close();}}
 finally{await h?.close();await fs.rm(tmp,{force:true});}
}
function rowIdentity(r){return {id:r.id,status:r.status,reviewRound:r.reviewRound,sourceFingerprint:r.sourceFingerprint,outputSha256:r.outputSha256,ruleVersion:r.ruleVersion,images:r.images,intakeAuditPassed:r.intakeAuditPassed===true,preservedCurrent:r.preservedCurrent===true};}

export function createBoundPcReviewPipeline(input={}){
 const active=input.enabled===true&&input.dataTransferApproved===true,merge=active&&input.canonicalMergeApproved===true;
 // Capture caller-controlled values before any asynchronous work. Credentials
 // remain in injected callbacks; no token is copied into files or configuration.
 const options={materialRoot:input.materialRoot,allowedMaterialWorkspace:input.allowedMaterialWorkspace,stateRoot:input.stateRoot,allowedOutputRoot:input.allowedOutputRoot,criteria:clone(input.criteria),repository:clone(input.repository),completionPolicy:input.completionPolicy??'regenerated-only',intakeEvidence:clone(input.intakeEvidence),api:input.api,getAccessToken:input.getAccessToken,fetchImpl:input.fetchImpl};
 let initialized;
 async function initialize(){
  dedicatedRepositoryMetadata(options.repository);
  if(!['regenerated-only','verified-intake'].includes(options.completionPolicy))throw Error('Unknown completion policy');
  const root=absolute(options.materialRoot),workspace=absolute(options.allowedMaterialWorkspace),stateRoot=absolute(options.stateRoot),outputRoot=absolute(options.allowedOutputRoot);
  if(!contained(workspace,root))throw Error('Material root outside allowed workspace');disjoint(root,stateRoot);disjoint(root,outputRoot);disjoint(stateRoot,outputRoot);
  for(const dir of [workspace,root,stateRoot,outputRoot])await safePath(dir,{directory:true});
  const writableStore=createPostReviewStore(root),store=createReadOnlyPcStore(root),journalFile=path.join(stateRoot,'pc-release-feed.json'),canonical=work=>withCanonicalWriter(root,work),supply=work=>withCanonicalWriter(stateRoot,()=>canonical(work));
  const readJournal=async()=>await json(journalFile,{missing:true})??{};
  const persistJournal=j=>durableJson(journalFile,j);
  async function completion(){return canonical(async()=>{
   // Fail before metadata/auth transport, rather than discover aliased review
   // data only after exporting. The PC store repeats bounded handle checks.
   for(const file of [writableStore.file,writableStore.workflowFile,path.join(root,'08_제작 정리','제작 순서.json')])await read(file,{missing:true});
   for(const file of [path.join(root,'review-delivery.lock'),path.join(root,'intake.lock'),path.join(root,'06_자동 제작 결과','batch.lock')])if(await safePath(file,{missing:true}))return {};
   const snapshot={pointer:await json(path.join(root,'review-current.json'),{missing:true}),report:await json(path.join(root,'06_자동 제작 결과','status.json'),{missing:true}),deliveryJournal:await json(path.join(root,'review-delivery-in-progress.json'),{missing:true})};
   const output=path.join(root,'06_자동 제작 결과');
   for(const row of snapshot.report?.entries||[]){if(!row?.outputFolder)continue;if(typeof row.outputFolder!=='string')throw Error('Invalid output namespace');const folder=path.resolve(output,row.outputFolder);if(folder===output||!contained(output,folder))throw Error('Output outside source namespace');await read(path.join(folder,'production-plan.json'),{missing:true});for(const image of row.images||[]){if(typeof image?.name!=='string'||!/^rendered\/slide-\d{3,}\.png$/.test(image.name.replaceAll('\\','/')))throw Error('Invalid rendered image namespace');const file=path.resolve(folder,image.name);if(!contained(folder,file))throw Error('Image outside source namespace');const s=await safePath(file);if(s.size>25*1024*1024)throw Error('Source PNG size limit');}}
   if(snapshot.report?.intakeContract==='verified-intake-v1'&&options.completionPolicy==='verified-intake'){
    if(!options.intakeEvidence||!/^intake-[a-f0-9]{20}$/.test(snapshot.pointer?.reviewRound||''))return {};
    const evidenceWorkspace=absolute(options.intakeEvidence.allowedWorkspace),work=absolute(options.intakeEvidence.workRoot);
    if(!contained(evidenceWorkspace,work))throw Error('Intake evidence outside allowed workspace');await safePath(evidenceWorkspace,{directory:true});await safePath(work,{directory:true});
    const source=path.join(work,'rounds',snapshot.pointer.reviewRound,'source'),sourceRaw=await read(path.join(source,'06_자동 제작 결과','status.json'),{missing:true});if(!sourceRaw)return {};
    if(sha(sourceRaw)!==snapshot.pointer.sourceStatusSha256)return {};
    const original=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(sourceRaw));
    if(original.reviewRound!==snapshot.pointer.reviewRound||!Array.isArray(original.entries)||!Array.isArray(snapshot.report.entries)||requestHash(original.entries.map(rowIdentity))!==requestHash(snapshot.report.entries.map(rowIdentity)))return {};
    snapshot.intakeProof=await json(path.join(source,'intake-complete.json'),{missing:true});
    snapshot.intakeFatal=(await safePath(path.join(source,'intake-fatal.json'),{missing:true})||await safePath(path.join(work,'intake-fatal.json'),{missing:true}))?true:null;
   }
   return snapshot;
  });}
  const transaction=createFeedbackTransaction({enabled:merge,canonicalMergeApproved:merge,allowedWorkspace:root,feedbackFile:writableStore.file,withCanonicalWriter:canonical,canonicalWriterContract:{allCanonicalWriters:true,roundActivation:true},readSnapshots:async()=>{
   const selected=selectCompletedRound(await completion(),{completionPolicy:options.completionPolicy});if(!selected)throw Error('Current canonical completion proof unavailable');const journal=await readJournal();
   if(journal.pending||!journal.confirmed?.trustedLocalSnapshot)throw Error('Confirmed independent local baseline required');
   return {rows:selected.rows,reviewRound:selected.reviewRound,criteria:options.criteria,trustedLocalSnapshot:journal.confirmed.trustedLocalSnapshot};
  }});
  const pipeline=createPcReviewPipeline({enabled:active,dataTransferApproved:active,canonicalMergeApproved:merge,repository:options.repository,api:options.api,getAccessToken:options.getAccessToken,fetchImpl:options.fetchImpl,store,criteria:options.criteria,completionPolicy:options.completionPolicy,readSnapshots:completion,readJournal,persistJournal,withSupplyLock:supply,supplyLockContract:{allFeedWriters:true},allowedOutputRoot:outputRoot,feedbackTransaction:transaction});
  return {pipeline,transaction,supply};
 }
 const ready=()=>initialized??=(initialize().catch(e=>{initialized=null;throw e;}));
 return Object.freeze({
  async supplyOnce(args){if(!active)return {status:'disabled'};return (await ready()).pipeline.supplyOnce(args);},
  async importOnce(){if(!merge)return {status:'disabled'};const b=await ready();return b.supply(()=>b.pipeline.importOnce());},
  async recoverOnce(){if(!merge)return {status:'disabled'};const b=await ready();return b.supply(()=>b.transaction.recover());}
 });
}
