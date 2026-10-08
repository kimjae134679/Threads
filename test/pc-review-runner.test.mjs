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
