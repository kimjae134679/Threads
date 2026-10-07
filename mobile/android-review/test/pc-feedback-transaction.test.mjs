import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {exportRelease,requestHash} from '../pc/exchange.mjs';
import {syntheticInputs} from '../pc/synthetic-fixture.mjs';
import {version} from '../../../desktop/post-review-store.cjs';
const moduleUrl=new URL('../pc/feedback-transaction.mjs',import.meta.url);
const load=()=>import(moduleUrl);
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t,{score=8,note='Synthetic memo',decision='held'}={}) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pc-feedback-fixture-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'.mobile-feedback-fixture.json'),JSON.stringify({schemaVersion:1,syntheticOnly:true}));
 const input=syntheticInputs(),row=input.rows[0];
 const exported=await exportRelease({...input,allowedOutputRoot:root,outputDirectory:path.join(root,'release')});
 const state=structuredClone(exported.state),entry=state.manifest.entries[0];
 const checks=Object.fromEntries(input.criteria.items.map(c=>[c.id,true]));
 const op={operationId:'synthetic-operation',id:row.id,outputVersion:version(row),reviewRound:input.reviewRound,baseRevision:0,criteriaVersion:input.criteria.version,kind:'review',payload:{score,note,checks,decision},deviceId:'synthetic-device',createdAt:'2026-10-08T00:00:00.000Z'};
 state.operations[op.operationId]={requestHash:requestHash(op),request:op,result:{operationId:op.operationId,status:'applied',revision:1}};
 entry.review=op.payload;entry.revision=1;
 const feedbackFile=path.join(root,'canonical-feedback.json');
 const unrelated={id:'other-synthetic-post',outputVersion:'c'.repeat(64),reviewRound:input.reviewRound,score:3,note:'Keep me',updatedAt:'2026-10-07T00:00:00.000Z'};
 const initial={schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:input.reviewRound,evaluations:[unrelated],custom:{keep:true}};
 const before=Buffer.from(JSON.stringify(initial,null,1)+'\r\n');await fs.writeFile(feedbackFile,before);
 const snapshots={rows:input.rows,criteria:input.criteria,reviewRound:input.reviewRound,trustedLocalSnapshot:exported.trustedLocalSnapshot};
 const config={enabled:true,syntheticFixture:true,allowedFixtureWorkspace:os.tmpdir(),fixtureRoot:root,feedbackFile,readSnapshots:async()=>snapshots};
 const request={state,sourceCommit:'a'.repeat(40),pinnedStateHash:requestHash(state)};
 return {root,input,row,state,op,feedbackFile,initial,before,snapshots,config,request};
}
test('disabled gates perform zero filesystem or snapshot activity',async()=>{
 const api=await load();let called=false;
 const tx=api.createFixtureFeedbackTransaction({readSnapshots:()=>{called=true;throw Error('must not read');}});
 assert.equal((await tx.importFeedback({})).status,'disabled');assert.equal((await tx.recover()).status,'disabled');assert.equal(called,false);
 assert.equal((await api.createFeedbackTransaction({enabled:true}).importFeedback({})).status,'disabled');
});
test('atomic commit preserves unrelated fields and separates decisions from evaluations',async t=>{
 const f=await fixture(t),api=await load(),tx=api.createFixtureFeedbackTransaction(f.config),r=await tx.importFeedback(f.request);
 assert.equal(r.status,'committed');const data=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));
 assert.deepEqual(data.custom,{keep:true});assert.deepEqual(data.evaluations[0],f.initial.evaluations[0]);
 assert.equal(data.evaluations[1].score,8);assert.equal(data.evaluations[1].note,'Synthetic memo');assert.equal(data.evaluations[1].reviewRound,f.input.reviewRound);
 assert.equal('decision' in data.evaluations[1],false);assert.equal('checks' in data.evaluations[1],false);assert.equal('disposition' in data.evaluations[1],false);
 assert.equal(data.mobileImport.receipts.length,1);assert.equal(data.mobileImport.decisionRecords[0].decision,'held');assert.deepEqual(data.mobileImport.decisionRecords[0].checks,f.op.payload.checks);
 assert.deepEqual(await fs.readFile(r.backupFile),f.before);assert.equal(sha(await fs.readFile(r.backupFile)),r.beforeHash);
 const files=await fs.readdir(f.root);assert.equal(files.some(n=>n.includes('workflow')),false);
});
test('null score and memo remain a null canonical score even with publish_approved',async t=>{
 const f=await fixture(t,{score:null,note:'Memo only',decision:'publish_approved'}),api=await load();await api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request);
 const data=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));assert.equal(data.evaluations[1].score,null);assert.equal(data.evaluations[1].note,'Memo only');assert.equal(data.mobileImport.decisionRecords[0].decision,'publish_approved');assert.equal('disposition' in data,false);
});
test('lost response retry deduplicates rating and journal writes in the canonical commit',async t=>{
 const f=await fixture(t),api=await load();let failed=false;
 const tx=api.createFixtureFeedbackTransaction({...f.config,failpoint:stage=>{if(stage==='afterRename'&&!failed){failed=true;throw Error('lost response');}}});
 await assert.rejects(tx.importFeedback(f.request),/lost response/);const committed=await fs.readFile(f.feedbackFile);
 const result=await tx.importFeedback(f.request);assert.equal(result.status,'unchanged');assert.equal(result.proposal.duplicates.length,1);assert.deepEqual(await fs.readFile(f.feedbackFile),committed);
 const data=JSON.parse(committed);assert.equal(data.evaluations.length,2);assert.equal(data.mobileImport.receipts.length,1);assert.equal((await fs.readdir(result.journalDirectory)).filter(n=>n.endsWith('.journal.json')).length,1);
});
test('canonical conflicts preserve original bytes and create no transaction',async t=>{
 const f=await fixture(t),api=await load(),data=structuredClone(f.initial);data.evaluations.push({id:f.row.id,outputVersion:version(f.row),reviewRound:f.input.reviewRound,score:4,note:'PC edit'});
 const bytes=Buffer.from(JSON.stringify(data));await fs.writeFile(f.feedbackFile,bytes);
 const r=await api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request);assert.equal(r.status,'unchanged');assert.equal(r.proposal.conflicts[0].reason,'canonical_changed_since_export');assert.deepEqual(await fs.readFile(f.feedbackFile),bytes);
});
test('old version or round is stale and never copies scores onto new output',async t=>{
 const f=await fixture(t),api=await load(),snapshots={...f.snapshots,rows:f.input.rows.map(r=>({...r,reviewRound:'synthetic-next-round',outputSha256:'e'.repeat(64)})),reviewRound:'synthetic-next-round'};
 const next={...f.initial,reviewRound:snapshots.reviewRound};const bytes=Buffer.from(JSON.stringify(next));await fs.writeFile(f.feedbackFile,bytes);
 const r=await api.createFixtureFeedbackTransaction({...f.config,readSnapshots:async()=>snapshots}).importFeedback(f.request);assert.equal(r.status,'unchanged');assert.equal(r.proposal.stale.length,1);assert.deepEqual(await fs.readFile(f.feedbackFile),bytes);
});
test('multiple operations apply by revision and replay creates no duplicates',async t=>{
 const f=await fixture(t),api=await load(),second={...f.op,operationId:'second-operation',baseRevision:1,payload:{...f.op.payload,score:10,note:'Second memo',decision:'needs_revision'}};
 f.state.operations[second.operationId]={requestHash:requestHash(second),request:second,result:{operationId:second.operationId,status:'applied',revision:2}};f.state.manifest.entries[0].revision=2;f.state.manifest.entries[0].review=second.payload;f.request.pinnedStateHash=requestHash(f.state);
 const tx=api.createFixtureFeedbackTransaction(f.config);await tx.importFeedback(f.request);const data=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));
 assert.equal(data.evaluations[1].score,10);assert.equal(data.mobileImport.receipts.length,2);assert.equal(data.mobileImport.decisionRecords.length,2);assert.equal((await tx.importFeedback(f.request)).proposal.duplicates.length,2);
});
test('exclusive lock prevents concurrent import and is released after failure',async t=>{
 const f=await fixture(t),api=await load();let enter,release;const entered=new Promise(r=>enter=r),blocked=new Promise(r=>release=r);
 const tx=api.createFixtureFeedbackTransaction({...f.config,failpoint:async stage=>{if(stage==='afterJournal'){enter();await blocked;}}});
 const first=tx.importFeedback(f.request);await entered;await assert.rejects(api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request),/lock|busy/i);release();await first;
 assert.equal((await api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request)).status,'unchanged');
});
test('CAS detects an intervening canonical edit without restoring over it',async t=>{
 const f=await fixture(t),api=await load(),external=Buffer.from(JSON.stringify({...f.initial,external:'preserve'}));
 const tx=api.createFixtureFeedbackTransaction({...f.config,failpoint:async stage=>{if(stage==='beforeCas')await fs.writeFile(f.feedbackFile,external);}});
 await assert.rejects(tx.importFeedback(f.request),/changed|CAS/i);assert.deepEqual(await fs.readFile(f.feedbackFile),external);await assert.rejects(tx.recover(),/external|unknown/i);assert.deepEqual(await fs.readFile(f.feedbackFile),external);
});
test('CAS detects a changed trusted PC snapshot and preserves canonical bytes',async t=>{
 const f=await fixture(t),api=await load();let changed=false;
 const tx=api.createFixtureFeedbackTransaction({...f.config,readSnapshots:async()=>changed?{...f.snapshots,criteria:{...f.snapshots.criteria,version:'changed-criteria'}}:f.snapshots,failpoint:stage=>{if(stage==='beforeCas')changed=true;}});
 await assert.rejects(tx.importFeedback(f.request),/snapshot|changed/i);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
for(const stage of ['afterBackup','afterStage','afterJournal','beforeCas'])test('pre-rename failure at '+stage+' leaves exact before bytes recoverable',async t=>{
 const f=await fixture(t),api=await load(),tx=api.createFixtureFeedbackTransaction({...f.config,failpoint:s=>{if(s===stage)throw Error('injected '+stage);}});
 await assert.rejects(tx.importFeedback(f.request),/injected/);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);const recovery=await tx.recover();assert.equal(recovery.status,'recovered');assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
test('refuses invalid schema, unpinned remote, forged baseline and round mismatch without writes',async t=>{
 const f=await fixture(t),api=await load(),tx=api.createFixtureFeedbackTransaction(f.config);
 await assert.rejects(tx.importFeedback({...f.request,sourceCommit:null}),/pin|commit/i);await assert.rejects(tx.importFeedback({...f.request,pinnedStateHash:'f'.repeat(64)}),/pin|hash/i);
 const forged=structuredClone(f.state);Object.values(forged.pcExport.entries)[0].canonicalEvaluationHash='f'.repeat(64);await assert.rejects(tx.importFeedback({...f.request,state:forged,pinnedStateHash:requestHash(forged)}),/trusted|baseline/i);
 for(const patch of [{schemaVersion:2},{recordType:'user_review_workflow'},{reviewRound:'wrong-round'},{evaluations:[]}]){const d={...f.initial,...patch};if(patch.evaluations)d.evaluations='bad';const b=Buffer.from(JSON.stringify(d));await fs.writeFile(f.feedbackFile,b);await assert.rejects(tx.importFeedback(f.request),/schema|canonical|round|evaluation/i);assert.deepEqual(await fs.readFile(f.feedbackFile),b);}
});
test('fixture path guards reject traversal, hardlink and junction aliases',async t=>{
 const f=await fixture(t),api=await load();await assert.rejects(api.createFixtureFeedbackTransaction({...f.config,feedbackFile:path.join(f.root,'child','..','canonical-feedback.json')+'\\..\\canonical-feedback.json'}).importFeedback(f.request),/path|traversal/i);
 const linked=path.join(f.root,'copy.json');await fs.link(f.feedbackFile,linked);await assert.rejects(api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request),/link/i);await fs.unlink(linked);
 const alias=path.join(f.root,'alias');await fs.symlink(f.root,alias,process.platform==='win32'?'junction':'dir');await assert.rejects(api.createFixtureFeedbackTransaction({...f.config,feedbackFile:path.join(alias,'canonical-feedback.json')}).importFeedback(f.request),/link|junction/i);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
test('real process crash after rename recovers a dead-owner lock and committed receipt',async t=>{
 const f=await fixture(t),api=await load(),inputFile=path.join(f.root,'child-input.json');await fs.writeFile(inputFile,JSON.stringify({config:{...f.config,readSnapshots:undefined},snapshots:f.snapshots,request:f.request}));
 const code=`import fs from 'node:fs/promises';import {createFixtureFeedbackTransaction} from ${JSON.stringify(moduleUrl.href)};const f=JSON.parse(await fs.readFile(process.argv[1],'utf8'));await createFixtureFeedbackTransaction({...f.config,readSnapshots:async()=>f.snapshots,failpoint:s=>{if(s==='afterRename')process.exit(72);}}).importFeedback(f.request);`;
 const exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',code,inputFile],{stdio:['ignore','pipe','pipe']});let errors='';child.stderr.on('data',b=>errors+=b);child.on('error',reject);child.on('exit',n=>n===72?resolve(n):reject(Error(errors||'Unexpected child exit '+n)));});assert.equal(exitCode,72);
 const tx=api.createFixtureFeedbackTransaction(f.config),r=await tx.recover();assert.equal(r.transactions[0].status,'committed');assert.equal((await tx.importFeedback(f.request)).status,'unchanged');assert.equal(JSON.parse(await fs.readFile(f.feedbackFile,'utf8')).mobileImport.receipts.length,1);
});
test('generic activation rejects an undeclared adapter before any trusted reads',async t=>{
 const f=await fixture(t),api=await load();let reads=0;
 const options={enabled:true,canonicalMergeApproved:true,allowedWorkspace:f.root,feedbackFile:f.feedbackFile,readSnapshots:async()=>{reads++;return f.snapshots;}};
 await assert.rejects(api.createFeedbackTransaction(options).importFeedback(f.request),/shared|adapter/i);
 await assert.rejects(api.createFeedbackTransaction({...options,withCanonicalWriter:fn=>fn()}).importFeedback(f.request),/shared|contract/i);assert.equal(reads,0);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
test('declared shared writer adapter keeps simulated PC writer outside snapshot through rename',async t=>{
 const f=await fixture(t),api=await load();let queue=Promise.resolve(),release,entered;const hold=new Promise(r=>release=r),ready=new Promise(r=>entered=r),events=[];
 const adapter=work=>{const operation=queue.then(work);queue=operation.catch(()=>{});return operation;};
 const tx=api.createFeedbackTransaction({enabled:true,canonicalMergeApproved:true,allowedWorkspace:f.root,feedbackFile:f.feedbackFile,readSnapshots:async()=>{events.push('snapshot');return f.snapshots;},withCanonicalWriter:adapter,canonicalWriterContract:{allCanonicalWriters:true,roundActivation:true},failpoint:async stage=>{if(stage==='afterJournal'){entered();await hold;}if(stage==='afterRename')events.push('rename');}});
 const imported=tx.importFeedback(f.request);await ready;const pcSave=adapter(async()=>{events.push('pc-save');const data=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));data.pcSaved=true;await fs.writeFile(f.feedbackFile,JSON.stringify(data));});
 assert.equal(events.includes('pc-save'),false);release();await imported;await pcSave;assert.ok(events.indexOf('pc-save')>events.indexOf('rename'));assert.equal(JSON.parse(await fs.readFile(f.feedbackFile,'utf8')).mobileImport.receipts.length,1);
});
test('existing same-ID older output score stays on its older version',async t=>{
 const f=await fixture(t),api=await load(),old={id:f.row.id,outputVersion:'d'.repeat(64),reviewRound:'synthetic-old-round',score:10,note:'Old score retained'};
 const data={...f.initial,evaluations:[old]};await fs.writeFile(f.feedbackFile,JSON.stringify(data));await api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request);
 const next=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));assert.deepEqual(next.evaluations[0],old);assert.equal(next.evaluations[1].score,8);assert.equal(next.evaluations[1].outputVersion,version(f.row));
});
test('canonical duplicate identities are rejected instead of ambiguously overwriting one',async t=>{
 const f=await fixture(t),api=await load(),first=f.initial.evaluations[0],data={...f.initial,evaluations:[first,{...first,reviewRound:'other-round'}]},bytes=Buffer.from(JSON.stringify(data));await fs.writeFile(f.feedbackFile,bytes);
 await assert.rejects(api.createFixtureFeedbackTransaction(f.config).importFeedback(f.request),/duplicate/i);assert.deepEqual(await fs.readFile(f.feedbackFile),bytes);
});
test('failed native replacement leaves before bytes and recoverable durable stage',async t=>{
 const f=await fixture(t),api=await load(),tx=api.createFixtureFeedbackTransaction({...f.config,io:{rename:async()=>{const e=Error('Injected rename failure');e.code='EIO';throw e;}}});
 await assert.rejects(tx.importFeedback(f.request),/rename failure/);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);const recovery=await tx.recover();assert.equal(recovery.transactions[0].status,'before_preserved');assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
test('corrupted durable backup makes recovery refuse while preserving the current target',async t=>{
 const f=await fixture(t),api=await load(),tx=api.createFixtureFeedbackTransaction({...f.config,failpoint:s=>{if(s==='afterJournal')throw Error('crash');}});await assert.rejects(tx.importFeedback(f.request),/crash/);
 const directory=f.feedbackFile+'.mobile-import',backup=(await fs.readdir(directory)).find(n=>n.endsWith('.before.bin'));await fs.writeFile(path.join(directory,backup),'corrupted');await assert.rejects(tx.recover(),/backup hash/i);assert.deepEqual(await fs.readFile(f.feedbackFile),f.before);
});
test('a canonical edit during a busy Windows rename retry is detected before retrying replacement',async t=>{
 const f=await fixture(t),api=await load(),external=Buffer.from(JSON.stringify({...f.initial,external:'edit during retry'}));let attempts=0;
 const tx=api.createFixtureFeedbackTransaction({...f.config,io:{rename:async(from,to)=>{if(attempts++===0){await fs.writeFile(to,external);const e=Error('busy');e.code='EBUSY';throw e;}return fs.rename(from,to);}}});
 await assert.rejects(tx.importFeedback(f.request),/changed|CAS/i);assert.deepEqual(await fs.readFile(f.feedbackFile),external);await assert.rejects(tx.recover(),/unknown|external/i);
});
test('a busy rename without an external edit retries the same durable transaction',async t=>{
 const f=await fixture(t),api=await load();let attempts=0;
 const tx=api.createFixtureFeedbackTransaction({...f.config,io:{rename:async(from,to)=>{if(attempts++===0){const e=Error('busy');e.code='EBUSY';throw e;}return fs.rename(from,to);}}});
 const r=await tx.importFeedback(f.request);assert.equal(r.status,'committed');const data=JSON.parse(await fs.readFile(f.feedbackFile,'utf8'));assert.equal(data.mobileImport.receipts.length,1);assert.equal((await fs.readdir(r.journalDirectory)).filter(n=>n.endsWith('.journal.json')).length,1);
});
