import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createPostReviewStore,version} from '../../../desktop/post-review-store.cjs';
import {syntheticInputs,syntheticPng} from '../pc/synthetic-fixture.mjs';
import {mockReviewGithub} from './helpers/mock-review-github.mjs';
import {createPcGithubTransport} from '../pc/github-transport.mjs';
import {createGithubAdapter} from '../app/github-adapter.js';
const load=()=>import('../pc/pc-binding.mjs');
const repository={owner:'synthetic-owner',repo:'private-binding-fixture',repositoryId:987,private:true,dedicatedReviewRepository:true,branch:'mobile-review/data',excludedRepositories:['synthetic-owner/bridge-fixture']};
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pc-binding-fixture-'));
 t.after(async()=>{assert(path.relative(os.tmpdir(),root)&&!path.relative(os.tmpdir(),root).startsWith('..'));await fs.rm(root,{recursive:true,force:true});});
 const materialRoot=path.join(root,'materials'),stateRoot=path.join(root,'state'),allowedOutputRoot=path.join(root,'exports');
 for(const dir of [materialRoot,stateRoot,allowedOutputRoot])await fs.mkdir(dir);
 const input=syntheticInputs(),store=createPostReviewStore(materialRoot),output=path.join(materialRoot,'06_자동 제작 결과'),dir=path.join(output,input.rows[0].outputFolder);
 await fs.mkdir(path.join(dir,'rendered'),{recursive:true});await fs.mkdir(path.dirname(store.file),{recursive:true});
 await fs.writeFile(path.join(dir,'rendered/slide-001.png'),syntheticPng);await fs.writeFile(path.join(dir,'production-plan.json'),JSON.stringify({pages:[{role:'cover'}],ruleVersion:input.rows[0].ruleVersion}));
 await fs.writeFile(path.join(output,'status.json'),JSON.stringify({reviewRound:input.reviewRound,deliveryStatus:'complete',processed:1,entries:input.rows.map(r=>({...r,status:'generated'}))}));
 await fs.writeFile(path.join(materialRoot,'review-current.json'),JSON.stringify({active:true,wholeCollectionRegenerated:true,reviewRound:input.reviewRound,posts:1,pages:1}));
 await fs.writeFile(path.join(materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:input.reviewRound,complete:true}));
 await fs.writeFile(store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:input.reviewRound,evaluations:[]}));
 const remote=mockReviewGithub(repository),api=createPcGithubTransport({enabled:true,repository,getAccessToken:async()=> 'synthetic-access',fetchImpl:remote.fetch});
 const options={enabled:true,dataTransferApproved:true,canonicalMergeApproved:true,allowedMaterialWorkspace:root,materialRoot,stateRoot,allowedOutputRoot,criteria:input.criteria,repository,api};
 return {root,input,store,remote,api,options,output,stateRoot};
}
function operation(manifest,id='binding-operation',baseRevision=0){const e=manifest.entries[0];return {operationId:id,id:e.id,outputVersion:e.outputVersion,reviewRound:e.reviewRound,criteriaVersion:manifest.criteria.version,baseRevision,kind:'review',payload:{score:8,note:'Synthetic bound PC import',checks:{readable:true},decision:'publish_approved'},deviceId:'synthetic-device',createdAt:'2026-10-08T00:00:00.000Z'};}
test('bound factory is inert by default and separate canonical approval remains required',async()=>{
 const m=await load(),forbidden=()=>assert.fail('disabled factory callback');
 const p=m.createBoundPcReviewPipeline({api:forbidden,getAccessToken:forbidden});
 assert.deepEqual(await p.supplyOnce(),{status:'disabled'});assert.deepEqual(await p.importOnce(),{status:'disabled'});assert.deepEqual(await p.recoverOnce(),{status:'disabled'});
 const q=m.createBoundPcReviewPipeline({enabled:true,dataTransferApproved:true,canonicalMergeApproved:false});assert.deepEqual(await q.importOnce(),{status:'disabled'});
});
test('real copied PC store binding supplies, imports atomically, and PC save retains mobile receipts',async t=>{
 const f=await fixture(t),m=await load(),p=m.createBoundPcReviewPipeline(f.options);
 assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'one')})).status,'confirmed');
 const mobile=createGithubAdapter({approved:true,dedicatedReviewRepository:true,...repository,api:f.api}),manifest=await mobile.request('/v1/review/manifest');
 await mobile.request('/v1/review/operations',{method:'POST',body:JSON.stringify(operation(manifest))});assert.equal((await p.importOnce()).status,'committed');
 const imported=JSON.parse(await fs.readFile(f.store.file)),metadata=structuredClone(imported.mobileImport);
 assert.equal(imported.evaluations[0].score,8);assert.equal(imported.mobileImport.decisionRecords[0].decision,'publish_approved');assert.equal('disposition' in imported.mobileImport.decisionRecords[0],false);
 await f.store.save({id:f.input.rows[0].id,outputVersion:version(f.input.rows[0]),score:3,note:'Synthetic PC edit'});
 assert.deepEqual(JSON.parse(await fs.readFile(f.store.file)).mobileImport,metadata);
 const next=operation(manifest,'binding-operation-next',1);await mobile.request('/v1/review/operations',{method:'POST',body:JSON.stringify(next)});
 const before=await fs.readFile(f.store.file);assert.equal((await p.importOnce()).status,'conflict');assert.deepEqual(await fs.readFile(f.store.file),before);
 const reopened=m.createBoundPcReviewPipeline(f.options);assert.equal((await reopened.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'two')})).status,'noop');
 assert.equal((await reopened.recoverOnce()).status,'recovered');
});
test('path-bound factory refuses source overlap and path escapes before transport',async t=>{
 const f=await fixture(t),m=await load();let calls=0;
 for(const extra of [{stateRoot:f.options.materialRoot},{allowedOutputRoot:f.options.materialRoot},{allowedMaterialWorkspace:f.stateRoot}]){
  const p=m.createBoundPcReviewPipeline({...f.options,...extra,api:async()=>{calls++;assert.fail('invalid paths must precede transport');}});
  await assert.rejects(p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'invalid')}),/overlap|workspace|namespace/i);
 }
 assert.equal(calls,0);
});
test('source feedback hardlink or symlink aliases are rejected before any transport',async t=>{
 const f=await fixture(t),m=await load(),outside=path.join(f.root,'outside-feedback.json');await fs.copyFile(f.store.file,outside);await fs.rm(f.store.file);await fs.link(outside,f.store.file);let calls=0;
 const p=m.createBoundPcReviewPipeline({...f.options,api:async()=>{calls++;assert.fail('alias must not reach transport');}});
 await assert.rejects(p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'alias')}),/link/i);assert.equal(calls,0);await fs.rm(f.store.file);
 try{await fs.symlink(outside,f.store.file,'file');}catch(e){if(['EPERM','EACCES'].includes(e.code))return;throw e;}
 await assert.rejects(p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'symlink')}),/link/i);assert.equal(calls,0);
});
test('actual completion snapshots reject in-progress or mismatched delivery without publication',async t=>{
 const f=await fixture(t),m=await load(),p=m.createBoundPcReviewPipeline(f.options);
 await fs.writeFile(path.join(f.options.materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:f.input.reviewRound,complete:false}));
 assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'incomplete')})).status,'waiting');assert.equal(f.remote.commits.size,1);
 await fs.writeFile(path.join(f.options.materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:'wrong',complete:true}));assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'wrong')})).status,'waiting');assert.equal(f.remote.commits.size,1);
});
test('verified-intake binding reads exact local proof and refuses work fatal or forged source hash',async t=>{
 const f=await fixture(t),m=await load(),round='intake-'+ 'a'.repeat(20),workRoot=path.join(f.root,'intake-work'),sourceRoot=path.join(workRoot,'rounds',round,'source'),sourceOutput=path.join(sourceRoot,'06_자동 제작 결과');
 await fs.mkdir(sourceOutput,{recursive:true});const r={...f.input.rows[0],reviewRound:round,status:'already_done',preservedCurrent:true};
 const report={intakeContract:'verified-intake-v1',reviewRound:round,deliveryStatus:'complete',wholeCollectionRegenerated:false,processed:1,entries:[r]},raw=Buffer.from(JSON.stringify(report));
 await fs.writeFile(path.join(sourceOutput,'status.json'),raw);await fs.writeFile(path.join(sourceRoot,'intake-complete.json'),JSON.stringify({reviewRound:round,completed:true,sourceBytesUnchanged:true,registeredIds:[r.id],posts:1,pages:1}));
 await fs.writeFile(path.join(f.output,'status.json'),raw);await fs.writeFile(path.join(f.options.materialRoot,'review-current.json'),JSON.stringify({active:true,wholeCollectionRegenerated:false,reviewRound:round,posts:1,pages:1,sourceStatusSha256:createHash('sha256').update(raw).digest('hex')}));
 await fs.writeFile(path.join(f.options.materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:round,complete:true}));
 await fs.writeFile(f.store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:round,evaluations:[]}));
 const options={...f.options,completionPolicy:'verified-intake',intakeEvidence:{workRoot,allowedWorkspace:f.root}},p=m.createBoundPcReviewPipeline(options);
 assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'intake')})).status,'confirmed');
 await fs.writeFile(path.join(workRoot,'intake-fatal.json'),'{}');assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'fatal')})).status,'waiting');
 await fs.rm(path.join(workRoot,'intake-fatal.json'));await fs.writeFile(path.join(sourceOutput,'status.json'),JSON.stringify({...report,processed:2}));assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'forged')})).status,'waiting');
});

 test('explicit bounded sourceRoot supports the real cover-only round and rejects changed or fatal proof',async t=>{
 const f=await fixture(t),m=await load(),round='review-20261008-paper-density',sourceRoot=path.join(f.root,'cover-proof'),sourceOutput=path.join(sourceRoot,'06_자동 제작 결과');await fs.mkdir(sourceOutput,{recursive:true});
 const row={...f.input.rows[0],reviewRound:round,status:'already_done',preservedCurrent:true};const report={intakeContract:'verified-intake-v1',reviewRound:round,deliveryStatus:'complete',wholeCollectionRegenerated:false,processed:1,entries:[row]},raw=Buffer.from(JSON.stringify(report));await fs.writeFile(path.join(sourceOutput,'status.json'),raw);await fs.writeFile(path.join(sourceRoot,'intake-complete.json'),JSON.stringify({reviewRound:round,completed:true,sourceBytesUnchanged:true,registeredIds:[row.id],posts:1,pages:1}));await fs.writeFile(path.join(f.output,'status.json'),raw);await fs.writeFile(path.join(f.options.materialRoot,'review-current.json'),JSON.stringify({active:true,wholeCollectionRegenerated:false,reviewRound:round,posts:1,pages:1,sourceStatusSha256:createHash('sha256').update(raw).digest('hex')}));await fs.writeFile(path.join(f.options.materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:round,complete:true}));await fs.writeFile(f.store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:round,evaluations:[]}));
 const options={...f.options,completionPolicy:'verified-intake',intakeEvidence:{sourceRoot,allowedWorkspace:f.root}},p=m.createBoundPcReviewPipeline(options);assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'cover-proof')})).status,'confirmed');
 await fs.writeFile(path.join(sourceRoot,'reflow-fatal.json'),'{}');assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'fatal')})).status,'waiting');await fs.rm(path.join(sourceRoot,'reflow-fatal.json'));await fs.writeFile(path.join(sourceOutput,'status.json'),JSON.stringify({...report,processed:2}));assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'changed')})).status,'waiting');
 const outside=m.createBoundPcReviewPipeline({...options,intakeEvidence:{sourceRoot,allowedWorkspace:f.options.stateRoot}});await assert.rejects(outside.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'outside')}),/workspace/i);
 });

function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
const finishedWithin=async promise=>Promise.race([promise.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),400))]);
async function activateSyntheticRound(f,round){
 const {withCanonicalWriter}=await import('../../../desktop/review-canonical-writer.cjs');
 await withCanonicalWriter(f.options.materialRoot,async()=>{
  const report=JSON.parse(await fs.readFile(path.join(f.output,'status.json')));
  report.reviewRound=round;for(const row of report.entries)row.reviewRound=round;
  await fs.writeFile(path.join(f.output,'status.json'),JSON.stringify(report));
  await fs.writeFile(path.join(f.options.materialRoot,'review-current.json'),JSON.stringify({active:true,wholeCollectionRegenerated:true,reviewRound:round,posts:1,pages:1}));
  await fs.writeFile(path.join(f.options.materialRoot,'review-delivery-in-progress.json'),JSON.stringify({reviewRound:round,complete:true}));
  await fs.writeFile(f.store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:round,evaluations:[]}));
 });
}
test('paused supply transport releases canonical writer and preserves the old score baseline for conflicts',async t=>{
 const f=await fixture(t),m=await load(),entered=deferred(),resume=deferred();let paused=false;
 const api=async(route,init={})=>{if(!paused&&route==='/repos/'+repository.owner+'/'+repository.repo){paused=true;entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=m.createBoundPcReviewPipeline({...f.options,api}),supply=p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'nonblocking')});
 await entered.promise;const save=f.store.save({id:f.input.rows[0].id,outputVersion:version(f.input.rows[0]),score:3,note:'PC score while transport waits'});
 let saved;try{saved=await finishedWithin(save);}finally{resume.resolve();}
 const supplied=await supply;await save;assert.equal(saved,true,'PC save must finish while supply transport remains paused');assert.equal(supplied.status,'confirmed');
 const mobile=createGithubAdapter({approved:true,dedicatedReviewRepository:true,...repository,api:f.api}),manifest=await mobile.request('/v1/review/manifest');
 assert.equal(manifest.entries[0].review,null,'export reads the captured baseline, not the concurrent PC edit');
 await mobile.request('/v1/review/operations',{method:'POST',body:JSON.stringify(operation(manifest,'paused-baseline'))});
 const before=await fs.readFile(f.store.file);assert.equal((await p.importOnce()).status,'conflict');assert.deepEqual(await fs.readFile(f.store.file),before);
});
test('round activation while supply transport waits prevents old snapshot commit publication',async t=>{
 const f=await fixture(t),m=await load(),entered=deferred(),resume=deferred();let paused=false;
 const api=async(route,init={})=>{if(!paused&&route.endsWith('/git/trees')&&init.method==='POST'){paused=true;entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=m.createBoundPcReviewPipeline({...f.options,api}),supply=p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'stale-round')});
 await entered.promise;const activation=activateSyntheticRound(f,'synthetic-next-round');let activated;try{activated=await finishedWithin(activation);}finally{resume.resolve();}
 const result=await supply;await activation;assert.equal(activated,true,'round activation must not await transport');
 assert.notEqual(result.status,'confirmed');assert.equal(f.remote.calls.filter(c=>c.method==='POST'&&c.route.endsWith('/git/commits')).length,0);
 assert.equal(f.remote.calls.filter(c=>c.method==='PATCH').length,0);
});
test('round activation after ref dispatch preserves uncertain evidence without claiming confirmation',async t=>{
 const f=await fixture(t),m=await load(),entered=deferred(),resume=deferred();
 const api=async(route,init={})=>{if(init.method==='PATCH'){entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=m.createBoundPcReviewPipeline({...f.options,api}),supply=p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'inflight-round')});
 await entered.promise;const activation=activateSyntheticRound(f,'synthetic-next-round');let activated;try{activated=await finishedWithin(activation);}finally{resume.resolve();}
 const result=await supply;await activation;assert.equal(activated,true);assert.equal(result.status,'pending');
 const journal=JSON.parse(await fs.readFile(path.join(f.stateRoot,'pc-release-feed.json')));
 assert.equal(journal.confirmed,null);assert.equal(journal.pending.phase,'ref_update_in_flight');assert(journal.pending.candidateCommit);
 await assert.rejects(p.importOnce(),/baseline|completion|round/i);
});


test('scratch source copy retains exact metadata and PNG bytes while transport waits and is cleaned afterward',async t=>{
 const f=await fixture(t),m=await load(),entered=deferred(),resume=deferred();let paused=false;
 const originalFeedback=await fs.readFile(f.store.file),sourceImage=path.join(f.output,f.input.rows[0].outputFolder,'rendered/slide-001.png'),originalImage=await fs.readFile(sourceImage);
 const api=async(route,init={})=>{if(!paused&&route==='/repos/'+repository.owner+'/'+repository.repo){paused=true;entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=m.createBoundPcReviewPipeline({...f.options,api}),supply=p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'snapshot-bytes')});
 await entered.promise;
 try{
  const names=(await fs.readdir(f.stateRoot)).filter(name=>name.startsWith('pc-source-snapshot-'));assert.equal(names.length,1);
  const snapshot=path.join(f.stateRoot,names[0]);
  assert.deepEqual(await fs.readFile(path.join(snapshot,path.relative(f.options.materialRoot,f.store.file))),originalFeedback);
  assert.deepEqual(await fs.readFile(path.join(snapshot,path.relative(f.options.materialRoot,sourceImage))),originalImage);
  const pointer=JSON.parse(await fs.readFile(path.join(snapshot,'review-current.json')));assert.equal(pointer.reviewRound,f.input.reviewRound);
 }finally{resume.resolve();}
 assert.equal((await supply).status,'confirmed');assert.deepEqual(await fs.readFile(sourceImage),originalImage);
 assert.deepEqual((await fs.readdir(f.stateRoot)).filter(name=>name.startsWith('pc-source-snapshot-')),[]);
});
test('source PNG hash mismatch refuses immutable capture before any transport and leaves no scratch residue',async t=>{
 const f=await fixture(t),m=await load();let calls=0;
 await fs.writeFile(path.join(f.output,f.input.rows[0].outputFolder,'rendered/slide-001.png'),Buffer.concat([syntheticPng,Buffer.from('changed')]));
 const p=m.createBoundPcReviewPipeline({...f.options,api:async()=>{calls++;assert.fail('source hash failure must precede transport');}});
 await assert.rejects(p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'wrong-source')}),/PNG hash/);assert.equal(calls,0);
 assert.deepEqual((await fs.readdir(f.stateRoot)).filter(name=>name.startsWith('pc-source-snapshot-')),[]);
});

async function preparedMobileImport(t){
 const f=await fixture(t),m=await load(),p=m.createBoundPcReviewPipeline(f.options);
 assert.equal((await p.supplyOnce({outputDirectory:path.join(f.options.allowedOutputRoot,'import-baseline')})).status,'confirmed');
 const mobile=createGithubAdapter({approved:true,dedicatedReviewRepository:true,...repository,api:f.api}),manifest=await mobile.request('/v1/review/manifest');
 await mobile.request('/v1/review/operations',{method:'POST',body:JSON.stringify(operation(manifest,'gated-import'))});
 return {...f,m};
}
test('paused import network releases canonical writer and later merge refuses concurrent PC score overwrite',async t=>{
 const f=await preparedMobileImport(t),entered=deferred(),resume=deferred();let paused=false;
 const api=async(route,init={})=>{if(!paused){paused=true;entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=f.m.createBoundPcReviewPipeline({...f.options,api}),importing=p.importOnce();await entered.promise;
 const save=f.store.save({id:f.input.rows[0].id,outputVersion:version(f.input.rows[0]),score:2,note:'PC save during imported remote wait'});
 let saved,before;try{saved=await finishedWithin(save);if(saved)before=await fs.readFile(f.store.file);}finally{resume.resolve();}
 const result=await importing;await save;assert.equal(saved,true,'PC save must finish while import network remains paused');
 assert.equal(result.status,'conflict');assert.equal(result.canonicalWritePerformed,false);assert.deepEqual(await fs.readFile(f.store.file),before);
});
test('round activation during paused import network is rechecked before canonical merge and preserves new round bytes',async t=>{
 const f=await preparedMobileImport(t),entered=deferred(),resume=deferred();let paused=false;
 const api=async(route,init={})=>{if(!paused){paused=true;entered.resolve();await resume.promise;}return f.api(route,init);};
 const p=f.m.createBoundPcReviewPipeline({...f.options,api}),importing=p.importOnce();await entered.promise;
 const activation=activateSyntheticRound(f,'synthetic-import-next-round');let activated,before;
 try{activated=await finishedWithin(activation);if(activated)before=await fs.readFile(f.store.file);}finally{resume.resolve();}
 const result=await importing;await activation;assert.equal(activated,true,'round activation must finish while import network remains paused');
 assert.notEqual(result.status,'committed');assert.equal(result.canonicalWritePerformed,false);
 assert(result.proposal?.stale?.some(item=>item.reason==='version_round_or_criteria_changed'));
 assert.deepEqual(await fs.readFile(f.store.file),before);
});
