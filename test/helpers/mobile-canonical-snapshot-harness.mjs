// Offline QA only. All writes are confined to explicitly created QA/temp trees.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPostReviewStore,version} from '../../desktop/post-review-store.cjs';
import {bindCanonicalWriter,withCanonicalWriter} from '../../desktop/review-canonical-writer.cjs';
import {prepareReviewRelease,activateReviewRelease} from '../../desktop/review-release.cjs';
import {createFeedbackTransaction} from '../../mobile/android-review/pc/feedback-transaction.mjs';
import {exportRelease,requestHash,createReadOnlyPcStore} from '../../mobile/android-review/pc/exchange.mjs';
import {createBoundPcReviewPipeline} from '../../mobile/android-review/pc/pc-binding.mjs';
import {mockReviewGithub} from '../../mobile/android-review/test/helpers/mock-review-github.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),worker=fileURLToPath(new URL('./mobile-canonical-child-worker.mjs',import.meta.url));
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const criteria={version:'offline-snapshot-criteria-1',items:[{id:'readable',label:'Readable'}]};
export const repository={owner:'offline-fixture',repo:'private-review-fixture',repositoryId:987,private:true,dedicatedReviewRepository:true,branch:'mobile-review/data',excludedRepositories:['offline-fixture/bridge']};
const out='06_자동 제작 결과',rating='07_사용자 평가/평가 기록.json',workflow='07_사용자 평가/검토 진행.json';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function waitFile(file,limit=15000){const end=Date.now()+limit;for(;;){try{return await fs.readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;if(Date.now()>end)throw Error('Timed out waiting for '+file);await pause(15);}}}
export async function json(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');}
export async function exists(file){try{await fs.stat(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export function transaction(root,snapshots,extra={}){return createFeedbackTransaction({enabled:true,canonicalMergeApproved:true,allowedWorkspace:root,feedbackFile:path.join(root,rating),withCanonicalWriter:bindCanonicalWriter(root),canonicalWriterContract:{allCanonicalWriters:true,roundActivation:true},readSnapshots:async()=>snapshots,...extra});}
export function eventRequest(exported,index=0,id='offline-operation',baseRevision=0){
 const state=structuredClone(exported.state),entry=state.manifest.entries[index];
 const op={operationId:id,id:entry.id,outputVersion:entry.outputVersion,reviewRound:entry.reviewRound,baseRevision,criteriaVersion:criteria.version,kind:'review',payload:{score:8,note:'Offline synthetic mobile event',checks:{readable:true},decision:'publish_approved'},deviceId:'offline-device',createdAt:'2026-10-08T00:00:00.000Z'};
 state.operations[id]={requestHash:requestHash(op),request:op,result:{operationId:id,status:'applied',revision:baseRevision+1}};entry.review=op.payload;entry.revision=baseRevision+1;
 return {state,sourceCommit:'a'.repeat(40),pinnedStateHash:requestHash(state)};
}
function launch(mode,configFile,{timeout=45000}={}){
 const child=spawn(process.execPath,[worker,mode,configFile],{windowsHide:true,stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const done=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Worker timed out: '+mode));},timeout);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal,stderr,pid:child.pid});});});return {child,done};
}
export async function spawnJob(base,name,mode,data){const file=path.join(base,name+'.input.json'),resultFile=path.join(base,name+'.result.json'),startedFile=path.join(base,name+'.started');await json(file,{...data,resultFile,startedFile});return {...launch(mode,file),resultFile,startedFile};}
export async function succeeded(job){const result=await job.done;assert.equal(result.code,0,result.stderr);return JSON.parse(await fs.readFile(job.resultFile));}
export async function hashes(root){const result={};async function walk(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){assert.equal(e.isSymbolicLink(),false);const r=path.join(rel,e.name);if(e.isDirectory())await walk(path.join(dir,e.name),r);else result[r.replaceAll('\\','/')]=sha(await fs.readFile(path.join(dir,e.name)));}}await walk(root);return result;}
export async function cas(root){return Object.fromEntries(await Promise.all([['expectedStatusSha256',out+'/status.json'],['expectedFeedbackSha256',rating],['expectedWorkflowSha256',workflow],['expectedPointerSha256','review-current.json']].map(async([k,n])=>[k,await exists(path.join(root,n))?sha(await fs.readFile(path.join(root,n))):null])));}
export async function syntheticFixture(base,count=12){
 await fs.mkdir(base,{recursive:true});const root=path.join(base,'materials');await fs.mkdir(root);const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1080,16);png.writeUInt32BE(1920,20);
 const rows=Array.from({length:count},(_,i)=>({id:'offline-'+i,title:'Offline fixture '+i,status:'generated',outputFolder:'posts/'+i,sourceFingerprint:'1'.repeat(64),outputSha256:'2'.repeat(64),ruleVersion:'fixture-1',reviewRound:'offline-round',images:[{name:'rendered/slide-001.png',sha256:sha(png)}]}));
 for(const row of rows){await json(path.join(root,out,row.outputFolder,'production-plan.json'),{ruleVersion:row.ruleVersion,pages:[{role:'cover'}]});const file=path.join(root,out,row.outputFolder,row.images[0].name);await fs.mkdir(path.dirname(file));await fs.writeFile(file,png);}
 await json(path.join(root,out,'status.json'),{reviewRound:'offline-round',deliveryStatus:'complete',wholeCollectionRegenerated:true,processed:rows.length,entries:rows});
 await json(path.join(root,'review-current.json'),{active:true,wholeCollectionRegenerated:true,reviewRound:'offline-round',posts:count,pages:count});await json(path.join(root,'review-delivery-in-progress.json'),{reviewRound:'offline-round',complete:true});
 await json(path.join(root,rating),{schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:'offline-round',evaluations:[],custom:{preserved:true}});await json(path.join(root,workflow),{schemaVersion:1,recordType:'user_review_workflow',reviewRound:'offline-round',entries:[]});
 const store=createPostReviewStore(root),exported=await exportRelease({store:createReadOnlyPcStore(root),rows,criteria,reviewRound:'offline-round',allowedOutputRoot:base,outputDirectory:path.join(base,'baseline')});
 const snapshots={rows,criteria,reviewRound:'offline-round',trustedLocalSnapshot:exported.trustedLocalSnapshot};return {root,rows,store,exported,snapshots};
}
export async function runSyntheticChecks(base,{deadRaces=20,onProgress=()=>{}}={}){
 let disabledTransportCalls=0;const forbidden=()=>{disabledTransportCalls++;throw Error('Network is forbidden');};globalThis.fetch=forbidden;
 const disabled=createBoundPcReviewPipeline({api:forbidden,fetchImpl:forbidden});assert.deepEqual(await disabled.supplyOnce(),{status:'disabled'});assert.deepEqual(await disabled.importOnce(),{status:'disabled'});assert.deepEqual(await disabled.recoverOnce(),{status:'disabled'});
 const f=await syntheticFixture(path.join(base,'concurrent')),req=eventRequest(f.exported),tx=transaction(f.root,f.snapshots);await tx.importFeedback(req);const first=await fs.readFile(f.store.file);assert.equal((await tx.importFeedback(req)).proposal.duplicates.length,1);assert.deepEqual(await fs.readFile(f.store.file),first);
 const metadata=JSON.parse(first).mobileImport;await f.store.save({id:f.rows[0].id,outputVersion:version(f.rows[0]),score:3,note:'Offline PC edit'});assert.deepEqual(JSON.parse(await fs.readFile(f.store.file)).mobileImport,metadata);
 const conflict=await tx.importFeedback(eventRequest(f.exported,0,'next-operation',1));assert.equal(conflict.proposal.conflicts[0].reason,'canonical_changed_since_export');
 const originalStatus=await fs.readFile(path.join(f.root,out,'status.json')),changedReport=JSON.parse(originalStatus);changedReport.entries[0].outputSha256='f'.repeat(64);await withCanonicalWriter(f.root,()=>json(path.join(f.root,out,'status.json'),changedReport));assert.equal((await f.store.list()).entries[0].current,null);assert.equal((await transaction(f.root,{...f.snapshots,rows:changedReport.entries}).importFeedback(eventRequest(f.exported,0,'old-version-event'))).proposal.stale.length,1);assert.deepEqual(JSON.parse(await fs.readFile(f.store.file)).mobileImport,metadata);await withCanonicalWriter(f.root,()=>fs.writeFile(path.join(f.root,out,'status.json'),originalStatus));
 const jobs=await Promise.all([0,1,2].map(i=>spawnJob(base,'pc-'+i,'save',{root:f.root,payloads:f.rows.slice(3).filter((r,j)=>j%3===i).map(r=>({id:r.id,outputVersion:version(r),score:7,note:'Offline process '+i}))})));await Promise.all(jobs.map(succeeded));assert.equal(JSON.parse(await fs.readFile(f.store.file)).evaluations.length,10);assert.deepEqual(JSON.parse(await fs.readFile(f.store.file)).mobileImport,metadata);
 await Promise.all([1,1].map((page,i)=>createPostReviewStore(f.root).visit({id:f.rows[i].id,outputVersion:version(f.rows[i]),page})));await Promise.all([0,1].map(i=>createPostReviewStore(f.root).decide({id:f.rows[1].id,outputVersion:version(f.rows[1]),disposition:'held',reasonCode:'production_error',note:'Offline decision '+i})));assert.equal((await f.store.list()).entries[1].progress.decisions.filter(d=>d.note.startsWith('Offline decision')).length,2);
 const stage=path.join(base,'stage');await prepareReviewRelease(f.root,stage,{reviewRound:'offline-next',expectedPosts:12});const expected=await cas(f.root),pointerBefore=await fs.readFile(path.join(f.root,'review-current.json')),entered=path.join(base,'mobile-entered'),release=path.join(base,'mobile-release');
 const importing=await spawnJob(base,'held-import','import',{root:f.root,snapshots:f.snapshots,request:eventRequest(f.exported,2,'held-operation'),holdStage:'afterJournal',entered,release});await waitFile(entered);
 const activating=await spawnJob(base,'activate','activate',{root:f.root,stage,expected});const pc=await spawnJob(base,'held-pc','save',{root:f.root,payloads:[{id:f.rows[11].id,outputVersion:version(f.rows[11]),score:6,note:'Blocked PC writer'}]});await Promise.all([waitFile(activating.startedFile),waitFile(pc.startedFile)]);await pause(80);assert.equal(await exists(activating.resultFile),false);assert.equal(await exists(pc.resultFile),false);await fs.writeFile(release,'release');await succeeded(importing);assert.equal((await activating.done).code,1);await succeeded(pc);assert.deepEqual(await fs.readFile(path.join(f.root,'review-current.json')),pointerBefore);
 const old07=await hashes(path.join(f.root,'07_사용자 평가'));const applied=await activateReviewRelease(f.root,stage,await cas(f.root));assert.deepEqual(await hashes(path.join(applied.archive,'07_사용자 평가')),old07);assert.deepEqual(await fs.readFile(path.join(applied.archive,'review-current.json')),pointerBefore);assert.equal(JSON.parse(await fs.readFile(f.store.file)).evaluations.length,0);assert.equal((await f.store.list()).entries.some(e=>e.current),false);
 const nextRows=JSON.parse(await fs.readFile(path.join(f.root,out,'status.json'))).entries;const stale=await transaction(f.root,{...f.snapshots,rows:nextRows,reviewRound:'offline-next'}).importFeedback(req);assert.equal(stale.proposal.stale.length,1);assert.equal(JSON.parse(await fs.readFile(f.store.file)).evaluations.length,0);
 onProgress({phase:'synthetic-writers-activation-pass'});
 const crashRecovery=[];
 for(const crashStage of ['afterJournal','afterRename']){
  const g=await syntheticFixture(path.join(base,'crash-'+crashStage),3),request=eventRequest(g.exported),before=await fs.readFile(g.store.file),job=await spawnJob(base,'crash-'+crashStage,'import',{root:g.root,snapshots:g.snapshots,request,crashStage});assert.equal((await job.done).code,77);const fresh=transaction(g.root,g.snapshots),recovered=await fresh.recover();crashRecovery.push(recovered.transactions[0].status);if(crashStage==='afterJournal')assert.deepEqual(await fs.readFile(g.store.file),before);await fresh.importFeedback(request);const data=JSON.parse(await fs.readFile(g.store.file));assert.equal(data.mobileImport.receipts.length,1);assert.equal(data.mobileImport.decisionRecords.length,1);assert.equal(data.evaluations.length,1);
 }
 const departed=spawn(process.execPath,['-e',''],{windowsHide:true,stdio:'ignore'});await new Promise((resolve,reject)=>{departed.once('exit',resolve);departed.once('error',reject);});
 for(let n=0;n<deadRaces;n++){
  const root=path.join(base,'dead-race-'+n);await fs.mkdir(root);const dead=JSON.stringify({pid:departed.pid,host:os.hostname(),nonce:'offline-dead-'+n});await fs.writeFile(path.join(root,'review-canonical-writer.lock'),dead);await fs.writeFile(path.join(root,'review-canonical-writer.lock.reclaim'),dead);const race=await Promise.all([0,1,2].map(i=>spawnJob(base,'race-'+n+'-'+i,'race',{root})));await Promise.all(race.map(succeeded));assert.equal(await fs.readFile(path.join(root,'race-result'),'utf8'),'xxx');assert.equal(await exists(path.join(root,'review-canonical-writer.lock')),false);assert.equal(await exists(path.join(root,'review-canonical-writer.lock.reclaim')),false);if(n%5===0)onProgress({phase:'dead-reclaimer-race',completed:n+1,total:deadRaces});
 }
 const unknown=path.join(base,'unknown-owner');await fs.mkdir(unknown);const unknownLock=path.join(unknown,'review-canonical-writer.lock');await fs.writeFile(unknownLock,'{}');await assert.rejects(withCanonicalWriter(unknown,()=>assert.fail('Unknown owner must not run')),/unknown/);assert.equal(await fs.readFile(unknownLock,'utf8'),'{}');
 return {parallelPcSaves:9,receiptDedupe:true,pcEditConflict:true,newOutputVersionBlank:true,activationWaited:true,archivePreserved:true,newRoundBlank:true,oldEventStale:true,crashRecovery,deadReclaimerRaces:deadRaces,disabledTransportCalls};
}
