import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {syntheticFixture,criteria,repository,eventRequest} from './helpers/mobile-canonical-snapshot-harness.mjs';
import {mockReviewGithub} from '../mobile/android-review/test/helpers/mock-review-github.mjs';
import {createPostReviewStore,version} from '../desktop/post-review-store.cjs';
const load=()=>import('../mobile/android-review/pc/pc-review-runner.mjs');
async function fixture(t){const base=await fs.mkdtemp(path.join(os.tmpdir(),'pc-runner-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));const f=await syntheticFixture(base,2),stateRoot=path.join(base,'state'),allowedOutputRoot=path.join(base,'exports');await fs.mkdir(stateRoot);await fs.mkdir(allowedOutputRoot);return {...f,base,config:{schemaVersion:1,enabled:true,dataTransferApproved:true,canonicalMergeApproved:true,materialRoot:f.root,allowedMaterialWorkspace:base,stateRoot,allowedOutputRoot,criteria,repository,credentialProvider:{mode:'registered',id:'fixture'},writerFleet:{materialRoot:f.root,canonicalWriterSha256:createHash('sha256').update(await fs.readFile(new URL('../desktop/review-canonical-writer.cjs',import.meta.url))).digest('hex'),writers:[]}}};}
test('runner default-off does not touch provider transport writer inspection or files',async()=>{const m=await load();let calls=0;const runner=m.createPcReviewRunner({providers:new Proxy({},{get(){calls++;throw Error('unused');}}),inspectWriters:()=>calls++,fetchImpl:()=>calls++});assert.equal((await runner.runOnce()).status,'disabled');assert.equal((await runner.runOnce({config:{enabled:false,stateRoot:'invalid'}})).status,'disabled');assert.equal(calls,0);});
test('one entry supplies, imports, preserves conflict in durable result and restarts',async t=>{const f=await fixture(t),m=await load(),mock=mockReviewGithub(repository);let auth=0;const deps={providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:async()=>{auth++;return 'synthetic-fixture-access';}}},inspectWriters:async()=>[],fetchImpl:mock.fetch};const runner=m.createPcReviewRunner(deps);
 const first=await runner.runOnce({config:f.config});assert.equal(first.status,'completed');assert.equal(first.supply.status,'confirmed');assert(auth>0);assert.equal(JSON.parse(await fs.readFile(first.reportFile)).status,'completed');
 const state=mock.blobs.get(mock.trees.get(mock.commits.get(mock.head).tree.sha).find(e=>e.path==='mobile-review/state.json').sha);const remote=JSON.parse(state);const fakeExport={state:remote};const request=eventRequest(fakeExport,0,'runner-event');
 // Advance the isolated in-memory branch with the adapter's actual operation.
 const {createGithubAdapter}=await import('../mobile/android-review/app/github-adapter.js');const adapter=createGithubAdapter({...repository,approved:true,api:mock.api});await adapter.request('/v1/review/operations',{method:'POST',body:JSON.stringify(request.state.operations['runner-event'].request)});
 const second=await m.createPcReviewRunner(deps).runOnce({config:f.config});assert.equal(second.status,'completed');assert.equal(second.import.status,'committed');
 const listing=await createPostReviewStore(f.root).list(),entry=listing.entries.find(e=>e.id===f.rows[0].id);await createPostReviewStore(f.root).save({id:entry.id,outputVersion:entry.outputVersion,score:3,note:'PC edit preserved'});
 const next={...request.state.operations['runner-event'].request,operationId:'runner-conflict',baseRevision:1};await adapter.request('/v1/review/operations',{method:'POST',body:JSON.stringify(next)});
 const third=await runner.runOnce({config:f.config});assert.equal(third.status,'conflict');assert.equal((await createPostReviewStore(f.root).list()).entries.find(e=>e.id===entry.id).current.score,3);const recorded=JSON.parse(await fs.readFile(third.reportFile));assert.equal(recorded.import.proposal.conflicts.length,1);assert(!JSON.stringify(recorded).includes('synthetic-fixture-access'));
});
test('runner rejects secret fields, missing provider and mismatched writer fleet before transport',async t=>{const f=await fixture(t),m=await load();let calls=0;const deps={providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:()=>calls++}},inspectWriters:async()=>[],fetchImpl:()=>calls++};
 for(const config of [{...f.config,token:'synthetic-secret'},{...f.config,credentialProvider:{mode:'registered',id:'missing'}},{...f.config,writerFleet:{...f.config.writerFleet,materialRoot:path.join(f.base,'other')}},{...f.config,writerFleet:{...f.config.writerFleet,canonicalWriterSha256:'f'.repeat(64)}}]){const r=await m.createPcReviewRunner(deps).runOnce({config});assert.equal(r.status,'blocked');assert(!JSON.stringify(r).includes('synthetic-secret'));}assert.equal(calls,0);
 const r=await m.createPcReviewRunner({...deps,inspectWriters:async()=>[{executablePath:path.join(f.base,'legacy.exe')}]}).runOnce({config:f.config});assert.equal(r.status,'blocked');assert.equal(calls,0);
});

test('verified official-adapter interface executes exact approved bytes without credential persistence',async t=>{
 const f=await fixture(t),m=await load(),mock=mockReviewGithub(repository),source="export function createPcCredentialProvider(){return {contract:'pc-review-credential-provider-v1',getAccessToken:async()=> 'synthetic-module-access'}}",file=path.join(f.base,'approved-adapter.mjs');await fs.writeFile(file,source);
 const config={...f.config,credentialProvider:{mode:'verified-module',id:'official-github-interface',module:file,allowedWorkspace:f.base,sha256:createHash('sha256').update(source).digest('hex'),executionApproved:true}};
 const deps={inspectWriters:async()=>[],fetchImpl:mock.fetch};const wrong=await m.createPcReviewRunner(deps).runOnce({config:{...config,credentialProvider:{...config.credentialProvider,sha256:'f'.repeat(64)}}});assert.equal(wrong.status,'blocked');assert.equal(mock.calls.length,0);
 const result=await m.createPcReviewRunner(deps).runOnce({config});assert.equal(result.status,'completed');assert(!JSON.stringify(result).includes('synthetic-module-access'));assert(!(await fs.readFile(result.reportFile,'utf8')).includes('synthetic-module-access'));
 await fs.writeFile(file,"export function createPcCredentialProvider(){throw Error('SYNTHETIC_SECRET_ERROR')}");config.credentialProvider.sha256=createHash('sha256').update(await fs.readFile(file)).digest('hex');const failed=await m.createPcReviewRunner(deps).runOnce({config});assert.equal(failed.status,'blocked');assert(!JSON.stringify(failed).includes('SYNTHETIC_SECRET_ERROR'));
});
test('one-shot command is off without configuration and incomplete supply never imports',async t=>{
 const f=await fixture(t),m=await load(),mock=mockReviewGithub(repository);assert.equal((await m.runPcReviewCommand()).status,'disabled');const configFile=path.join(f.base,'disabled.json');await fs.writeFile(configFile,JSON.stringify({schemaVersion:1,enabled:false}));assert.equal((await m.runPcReviewCommand(['--pc-review-config='+configFile])).status,'disabled');
 await fs.rename(path.join(f.root,'review-delivery-in-progress.json'),path.join(f.root,'preserved-journal.json'));
 const result=await m.createPcReviewRunner({providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:()=> 'synthetic-access'}},inspectWriters:async()=>[],fetchImpl:mock.fetch}).runOnce({config:f.config});assert.equal(result.status,'waiting');assert.equal(result.import,undefined);assert.equal(mock.calls.length,0);assert.equal(JSON.parse(await fs.readFile(result.reportFile)).status,'waiting');
});

test('unapproved import and recover remain disabled before provider or writer callbacks',async t=>{
 const f=await fixture(t),m=await load();let calls=0;const deps={providers:new Proxy({},{get(){calls++;throw Error('unused');}}),inspectWriters:()=>calls++,fetchImpl:()=>calls++};
 for(const action of ['import','recover'])assert.equal((await m.createPcReviewRunner(deps).runOnce({config:{...f.config,canonicalMergeApproved:false},action})).status,'disabled');assert.equal(calls,0);
});
test('failed started cycle leaves a sanitized durable report without hiding source failure',async t=>{
 const f=await fixture(t),m=await load(),mock=mockReviewGithub(repository),row=f.rows[0];await fs.writeFile(path.join(f.root,'06_자동 제작 결과',row.outputFolder,row.images[0].name),'synthetic damaged image');
 const result=await m.createPcReviewRunner({providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:()=> 'SYNTHETIC_SECRET_ACCESS'}},inspectWriters:async()=>[],fetchImpl:mock.fetch}).runOnce({config:f.config});assert.equal(result.status,'blocked');assert.equal(typeof result.reportFile,'string');const record=await fs.readFile(result.reportFile,'utf8');assert.equal(JSON.parse(record).status,'blocked');assert(!record.includes('SYNTHETIC_SECRET_ACCESS'));assert.equal(mock.calls.length,0);
});

test('exact installed fingerprints cannot authorize editor or unknown writer roles',async t=>{
 const f=await fixture(t),m=await load(),mock=mockReviewGithub(repository),exe=path.join(f.base,'approved-install','Threads Cut Editor.exe'),asar=path.join(path.dirname(exe),'resources','app.asar'),virtual=path.join(asar,'review-canonical-writer.cjs');
 const canonical=await fs.readFile(new URL('../desktop/review-canonical-writer.cjs',import.meta.url)),asarBytes=Buffer.from('synthetic-exact-approved-archive');
 const originalRead=fs.readFile;fs.readFile=async(file,...args)=>String(file)===asar?asarBytes:String(file)===virtual?canonical:originalRead(file,...args);t.after(()=>{fs.readFile=originalRead;});
 const config={...f.config,writerFleet:{...f.config.writerFleet,writers:[{executablePath:exe,asarSha256:createHash('sha256').update(asarBytes).digest('hex')}]}};
 let providers=0,transport=0;
 for(const role of ['editor','unknown',undefined]){
  const deps={providers:{get fixture(){providers++;return {contract:'pc-review-credential-provider-v1',getAccessToken:()=> 'synthetic-role-token'};}},inspectWriters:async()=>[{processId:101,executablePath:exe,...(role?{role}:{})}],fetchImpl:async(...args)=>{transport++;return mock.fetch(...args);}};
  const result=await m.createPcReviewRunner(deps).runOnce({config});assert.equal(result.status,'blocked');assert.equal(result.reason,'writer_fleet_unverified');assert.equal(JSON.parse(await fs.readFile(result.reportFile)).reason,'writer_fleet_unverified');
 }
 assert.equal(providers,0);assert.equal(transport,0);
 const safe=m.classifyInstalledReviewWriters([{processId:101,parentProcessId:999,executablePath:exe,commandLine:'"'+exe+'" --review-only'},{processId:102,parentProcessId:101,executablePath:exe,commandLine:'"'+exe+'" --type=renderer'}]);
 const accepted=await m.createPcReviewRunner({providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:()=> 'synthetic-role-token'}},inspectWriters:async()=>safe,fetchImpl:mock.fetch}).runOnce({config});assert.equal(accepted.status,'completed');assert.equal(accepted.supply.status,'confirmed');
});
test('installed role classifier inherits safe main roles only through identical-executable parent chains',async()=>{
 const m=await load(),exe=path.resolve('C:/synthetic/Threads Cut Editor.exe'),other=path.resolve('C:/other/Threads Cut Editor.exe');
 const row=(processId,parentProcessId,args,executablePath=exe)=>({processId,parentProcessId,executablePath,commandLine:'"'+executablePath+'" '+args});
 const result=m.classifyInstalledReviewWriters([row(1,999,'--review-only'),row(2,1,'--type=renderer'),row(3,2,'--type=utility'),row(4,999,'--pc-review-run'),row(5,4,'--type=gpu-process'),row(6,999,'--review-audit=C:/synthetic/audit'),row(7,6,'--type=renderer'),row(8,999,''),row(9,8,'--type=renderer'),row(10,1,'--type=renderer',other)]);
 assert.deepEqual(result.map(x=>x.role),['review-only','review-only','review-only','pc-review-run','pc-review-run','review-audit','review-audit','editor','editor','unknown']);
 assert(result.every(x=>Object.keys(x).sort().join(',')==='executablePath,processId,role'));assert(!JSON.stringify(result).includes('commandLine'));
});
test('installed role classifier fails closed for missing, ambiguous, quoted-pseudo-role and cyclic parents',async()=>{
 const m=await load(),exe=path.resolve('C:/synthetic/Threads Cut Editor.exe'),row=(processId,parentProcessId,args)=>({processId,parentProcessId,executablePath:exe,commandLine:'"'+exe+'" '+args});
 const records=[row(11,999,'--type=renderer'),row(12,13,'--type=renderer'),row(13,12,'--type=utility'),{processId:14,parentProcessId:999,executablePath:exe,commandLine:null},row(15,999,'--review-only --pc-review-run'),row(16,999,'"--review-only fake"'),row(17,999,'"unclosed --review-only'),row(18,999,'--type=renderer --review-only')];
 assert.deepEqual(m.classifyInstalledReviewWriters(records).map(x=>x.role),['unknown','unknown','unknown','unknown','unknown','editor','unknown','unknown']);
});

test('writer probe requires explicit success envelope and never treats failed or empty output as empty fleet',async t=>{
 const f=await fixture(t),m=await load(),success={schemaVersion:1,probe:'threads-review-writers-v1',ok:true,records:[]};
 const wire=body=>({status:0,stdout:JSON.stringify(body),stderr:''});
 assert.deepEqual(m.decodeInstalledReviewWriterProbe(wire(success)),[]);
 let providers=0,transport=0;
 for(const probe of [{...wire(success),stderr:'synthetic CIM error'}, {...wire(success),stdout:''},wire([]),wire({}),wire({...success,ok:false}),{...wire(success),status:1},{...wire(success),error:Error('synthetic failed spawn')},{...wire(success),signal:'SIGTERM'}]){
  const result=await m.createPcReviewRunner({providers:{get fixture(){providers++;throw Error('probe failure must precede provider');}},inspectWriters:async()=>m.decodeInstalledReviewWriterProbe(probe),fetchImpl:()=>{transport++;throw Error('unused');}}).runOnce({config:f.config});
  assert.equal(result.status,'blocked');assert.equal(result.reason,'writer_fleet_unverified');assert.equal(JSON.parse(await fs.readFile(result.reportFile)).reason,'writer_fleet_unverified');
 }
 assert.equal(providers,0);assert.equal(transport,0);
 const mock=mockReviewGithub(repository),result=await m.createPcReviewRunner({providers:{fixture:{contract:'pc-review-credential-provider-v1',getAccessToken:()=> 'synthetic-probe-token'}},inspectWriters:async()=>m.decodeInstalledReviewWriterProbe(wire(success)),fetchImpl:mock.fetch}).runOnce({config:f.config});assert.equal(result.status,'completed');
});
