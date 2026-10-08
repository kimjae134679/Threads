import test from 'node:test';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {createScaleFixture} from './scale-fixture.mjs';import {createGithubAdapter} from '../app/github-adapter.js';import {initial,applyManifest,queueEdit,currentReview,key,validateManifest} from '../app/core.js';import {mockGithub} from './github-fixture.mjs';
const configured=f=>createGithubAdapter({...f.repository,approved:true,api:f.api});
test('365 posts / 3073 unique images and exact measured ledger load by pinned blob without image prefetch',async t=>{
 const f=createScaleFixture(),start=performance.now(),a=configured(f),m=await a.request('/v1/review/manifest');
 assert.equal(f.stateBytes.length,1806272);assert.equal(m.entries.length,365);assert.equal(m.entries.reduce((n,e)=>n+e.images.length,0),3073);assert.equal(f.uniqueAssets,3073);assert.equal(new Set(m.entries.map(e=>key(e))).size,365);assert.equal(Object.keys(f.state.assets).length,3073);
 assert.equal(f.calls.filter(p=>p.includes('/git/blobs/')).length,1);assert.ok(f.calls.at(-1).endsWith(f.stateBlobSha));assert.equal(m.entries.some(e=>e.review!==null),false);t.diagnostic(JSON.stringify({manifestMs:Math.round(performance.now()-start),bytes:f.stateBytes.length,posts:365,images:3073,prefetchedImages:0}));
 const duplicate=structuredClone(m);duplicate.entries[1].id=duplicate.entries[0].id;assert.throws(()=>validateManifest(duplicate));
});
test('365 offline evaluations survive serialization; conflicts and new outputs preserve old queue without score copying',t=>{
 const f=createScaleFixture(),start=performance.now();let s=applyManifest(initial(),f.manifest);
 for(const [i,e] of s.manifest.entries.entries())s=queueEdit(s,{...e,criteriaVersion:f.manifest.criteria.version},{score:i%10+1,note:'합성 오프라인 메모 '+i,checks:{readable:i%2===0},decision:['needs_revision','held','publish_approved'][i%3]},'scale-operation-'+i,'synthetic-device');
 s=JSON.parse(JSON.stringify(s));assert.equal(s.outbox.length,365);assert.equal(new Set(s.outbox.map(o=>o.operationId)).size,365);assert.equal(s.outbox.every(o=>o.status==='pending'),true);assert.equal(Object.keys(s.reviews).length,365);t.diagnostic(JSON.stringify({queue365Ms:Math.round(performance.now()-start),durableSerializedBytes:Buffer.byteLength(JSON.stringify(s))}));
 const changed=structuredClone(f.manifest);changed.entries[0].revision=1;changed.entries[0].review={score:2,note:'Other device',checks:{readable:false},decision:'held'};s=applyManifest(s,changed);assert.equal(s.outbox[0].status,'conflict');assert.equal(s.outbox[1].status,'pending');
 const next=structuredClone(changed);next.entries[1].outputVersion='f'.repeat(64);next.entries[1].review=null;s=applyManifest(s,next);assert.equal(s.outbox[1].status,'stale');assert.equal(currentReview(s,next.entries[1]),null);assert.equal(currentReview(s,changed.entries[1]).score,2);
});
test('full-scale evaluation round trip uses >1 MB payload; lost acknowledgement deduplicates, concurrent edit conflicts',async()=>{
 const f=createScaleFixture(),mock=mockGithub();mock.states.set(mock.head,structuredClone(f.state));const a=createGithubAdapter({approved:true,dedicatedReviewRepository:true,owner:'fixture-owner',repo:'private-review-fixture',repositoryId:123,branch:'mobile-review/data',api:mock.api});await a.request('/v1/review/manifest');
 const e=f.manifest.entries[0],op={operationId:'scale-native-op',id:e.id,outputVersion:e.outputVersion,reviewRound:e.reviewRound,baseRevision:0,criteriaVersion:f.manifest.criteria.version,kind:'review',payload:{score:10,note:'Synthetic full-scale',checks:{readable:true},decision:'publish_approved'},deviceId:'synthetic-device',createdAt:'2026-10-08T00:00:00.000Z'},send=o=>a.request('/v1/review/operations',{method:'POST',body:JSON.stringify(o)});
 mock.loseAck=true;await assert.rejects(send(op),/lost response/);assert.equal((await send(op)).status,'duplicate');assert.equal(mock.writeCount,1);const blob=mock.calls.find(c=>c.method==='POST'&&c.path.endsWith('/git/blobs'));assert.ok(Buffer.byteLength(blob.body.content)>1100000);assert.ok(Buffer.byteLength(JSON.stringify({path:blob.path,method:'POST',body:blob.body}))<=2*8*1024*1024+65536);
 const conflict=await send({...op,operationId:'scale-conflict-op',payload:{...op.payload,score:1}});assert.equal(conflict.status,'conflict');assert.equal(conflict.review.score,10);assert.equal(mock.state().manifest.entries.length,365);assert.equal(Object.keys(mock.state().assets).length,3073);
});
test('full-scale collection verifies a 4 MiB PNG and rejects oversized or changed image metadata',async()=>{
 const f=createScaleFixture({largePngBytes:4*1024*1024}),a=configured(f);const m=await a.request('/v1/review/manifest'),image=m.entries[0].images[0];assert.equal((await a.downloadAsset(image)).size,4*1024*1024);
 const route='/git/blobs/'+f.state.assets[image.url].blobSha;
 const oversized=createGithubAdapter({...f.repository,approved:true,api:async(path,init)=>path.endsWith(route)?{sha:f.state.assets[image.url].blobSha,size:25*1024*1024+1,encoding:'base64',content:''}:f.api(path,init)});await oversized.request('/v1/review/manifest');await assert.rejects(oversized.downloadAsset(image),/size|limit/i);
 await assert.rejects(a.downloadAsset({...image,sha256:'f'.repeat(64)}),/changed|Unknown/i);assert.equal(m.entries.reduce((n,e)=>n+e.images.length,0),3073);
});
