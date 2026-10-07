import test from 'node:test';import assert from 'node:assert/strict';
import {createGithubAdapter} from '../app/github-adapter.js';
import {initial,applyManifest,queueEdit} from '../app/core.js';import {syncReviews} from '../app/sync-engine.js';
import {mockGithub,operation,png} from './github-fixture.mjs';
const config={approved:true,owner:'fixture-owner',repo:'private-review-fixture',repositoryId:123,branch:'mobile-review/data'};
const adapter=(m,extra={})=>createGithubAdapter({...config,api:m.api,...extra});
const send=(a,op)=>a.request('/v1/review/operations',{method:'POST',body:JSON.stringify(op)});
test('disabled adapter makes zero calls; public, wrong-ID and bridge branches fail closed',async()=>{
 const m=mockGithub();await assert.rejects(adapter(m,{approved:false}).request('/v1/review/manifest'),/approval/);assert.equal(m.calls.length,0);
 assert.throws(()=>adapter(m,{branch:'remote/pc-bridge'}),/branch/);
 m.private=false;await assert.rejects(adapter(m).request('/v1/review/manifest'),/private/);assert.equal(m.writeCount,0);
 m.private=true;m.repositoryId=456;await assert.rejects(adapter(m).request('/v1/review/manifest'),/identity/);
 m.repositoryId=123;m.defaultBranch='mobile-review/data';await assert.rejects(send(adapter(m),operation()),/default branch/);assert.equal(m.writeCount,0);
});
test('read pinned snapshot and SHA256-checked private blob without raw URLs',async()=>{
 const m=mockGithub(),a=adapter(m),manifest=await a.request('/v1/review/manifest');
 const image=manifest.entries[0].images[0],blob=await a.downloadAsset(image);assert.deepEqual(Buffer.from(await blob.arrayBuffer()),png);
 assert.ok(m.calls.some(c=>c.path.includes('?ref=')));assert.ok(m.calls.every(c=>c.path.startsWith('/repos/fixture-owner/private-review-fixture')));
 await assert.rejects(a.downloadAsset({...image,sha256:'c'.repeat(64)}),/asset/);
});
test('atomic review commits, stable duplicate, and reused ID with changed content rejected',async()=>{
 const m=mockGithub(),a=adapter(m);assert.deepEqual(await send(a,operation()),{operationId:'fixture-operation',status:'applied',revision:1});
 assert.equal(m.state().manifest.entries[0].review.score,8);assert.equal((await send(a,operation())).status,'duplicate');assert.equal(m.writeCount,1);
 await assert.rejects(send(a,operation({payload:{...operation().payload,score:2}})),/operationId/);assert.equal(m.writeCount,1);
 const patch=m.calls.find(c=>c.method==='PATCH');assert.equal(patch.body.force,false);
 const tree=m.calls.find(c=>c.path.endsWith('/git/trees'));assert.equal(tree.body.tree.length,1);assert.equal(tree.body.tree[0].path,'mobile-review/state.json');
});
test('lost Git ref response retries original ID through existing client, one write',async()=>{
 const m=mockGithub(),a=adapter(m);let state=applyManifest(initial(),await a.request('/v1/review/manifest'));
 const entry={...state.manifest.entries[0],criteriaVersion:state.manifest.criteria.version};
 state=queueEdit(state,entry,operation().payload,'fixture-operation','fixture-device',operation().createdAt);
 const context={getState:()=>state,commit:async f=>{state=f(state);},request:a.request};m.loseAck=true;
 await assert.rejects(syncReviews(context),/lost response/);assert.equal(state.outbox[0].status,'pending');await syncReviews(context);
 assert.equal(state.outbox[0].status,'confirmed');assert.equal(m.writeCount,1);
});
test('concurrent producer changes version before commit: retry reads latest and returns stale',async()=>{
 const m=mockGithub(),a=adapter(m);m.beforePatch=()=>m.advance(s=>{s.manifest.entries[0].outputVersion='c'.repeat(64);s.manifest.entries[0].review=null;return s;});
 assert.equal((await send(a,operation())).status,'stale');assert.equal(m.state().manifest.entries[0].review,null);assert.equal(m.writeCount,1);
 assert.equal(m.calls.filter(c=>c.method==='PATCH').length,2);
});
test('concurrent reviewer prevents overwrite; terminal conflict is idempotent',async()=>{
 const m=mockGithub(),a=adapter(m);m.beforePatch=()=>m.advance(s=>{Object.assign(s.manifest.entries[0],{revision:1,review:{...operation().payload,score:4}});return s;});
 const result=await send(a,operation());assert.equal(result.status,'conflict');assert.equal(result.review.score,4);assert.equal(result.revision,1);
 assert.deepEqual(await send(a,operation()),result);assert.equal(m.writeCount,1);assert.equal(m.state().manifest.entries[0].review.score,4);
});
test('new round and criteria reject old queue; valid old ack survives release switch',async()=>{
 for(const mutate of [s=>{s.manifest.reviewRound='new';s.manifest.entries[0].reviewRound='new';},s=>{s.manifest.criteria.version='new';}]){
  const m=mockGithub(),a=adapter(m);m.advance(s=>{mutate(s);return s;});assert.equal((await send(a,operation())).status,'stale');assert.equal(m.state().manifest.entries[0].review,null);
 }
 const m=mockGithub(),a=adapter(m);await send(a,operation());m.advance(s=>{s.manifest.entries[0].outputVersion='c'.repeat(64);s.manifest.entries[0].revision=0;s.manifest.entries[0].review=null;return s;});
 assert.equal((await send(a,operation())).status,'duplicate');assert.equal((await a.request('/v1/review/manifest')).entries[0].review,null);
});
test('invalid score and unrelated routes cannot create Git objects',async()=>{
 const m=mockGithub(),a=adapter(m);await assert.rejects(send(a,operation({payload:{...operation().payload,score:11}})));
 await assert.rejects(a.request('/v1/publish',{method:'POST'}),/route/);assert.equal(m.calls.filter(c=>c.method==='POST').length,0);
});
test('auth failure and rate-limit/validation errors retain queue without retries or force',async()=>{
 const m=mockGithub(),a=adapter(m);m.failStatus=401;await assert.rejects(send(a,operation()));assert.equal(m.writeCount,0);
 const n=mockGithub();let attempts=0;const api=async(path,init)=>{if(init?.method==='PATCH'){attempts++;throw Object.assign(Error('rate limited'),{status:422});}return n.api(path,init);};
 await assert.rejects(send(adapter(n,{api}),operation()),/rate limited/);assert.equal(attempts,1);assert.equal(n.writeCount,0);
});
test('bounded Git races leave pending operation; no last-write-wins fallback',async()=>{
 const m=mockGithub();const advance=()=>{m.advance(s=>s);m.beforePatch=advance;};m.beforePatch=advance;
 await assert.rejects(send(adapter(m),operation()),/Concurrent/);assert.equal(m.writeCount,0);assert.equal(m.calls.filter(c=>c.method==='PATCH').length,3);assert.deepEqual(m.state().operations,{});
});
test('corrupt asset, oversized state and malformed ledger fail without writes',async()=>{
 const m=mockGithub(),real=m.api;const a=adapter(m,{api:async(path,init)=>{const r=await real(path,init);return path.includes('/git/blobs/')?{...r,content:Buffer.alloc(png.length).toString('base64')}:r;}});
 const manifest=await a.request('/v1/review/manifest');await assert.rejects(a.downloadAsset(manifest.entries[0].images[0]),/hash|signature/);
 const n=mockGithub();n.advance(s=>{s.extra='x'.repeat(1000001);return s;});await assert.rejects(adapter(n).request('/v1/review/manifest'),/oversized/);assert.equal(n.writeCount,0);
 const p=mockGithub();p.advance(s=>{s.operations.bad={requestHash:'invalid',result:{}};return s;});await assert.rejects(send(adapter(p),operation()),/ledger/);assert.equal(p.writeCount,0);
});
