import test from 'node:test';import assert from 'node:assert/strict';
import {initial,applyManifest,queueEdit} from '../app/core.js';import {syncReviews} from '../app/sync-engine.js';
test('applied POST with lost response retries same operationId before manifest conflict',async()=>{
 const entry={id:'fixture',title:'fixture',outputVersion:'a'.repeat(64),reviewRound:'round',revision:0,criteriaVersion:'c1',images:[{url:'/a.png',sha256:'b'.repeat(64)}]};
 const manifest={schemaVersion:1,reviewRound:'round',criteria:{version:'c1',items:[]},entries:[entry]};
 let state=queueEdit(applyManifest(initial(),manifest),entry,{score:7,note:'local',checks:{},decision:'held'},'stable-operation','device');
 let revision=0,writeCount=0,lose=true;const ids=new Map(),calls=[];
 const request=async(path,init)=>{calls.push(path);if(path.endsWith('manifest'))return {...manifest,entries:[{...entry,revision}]};const op=JSON.parse(init.body);if(ids.has(op.operationId))return {operationId:op.operationId,status:'duplicate',revision:ids.get(op.operationId)};assert.equal(op.baseRevision,revision);revision++;writeCount++;ids.set(op.operationId,revision);if(lose){lose=false;throw Error('response lost after apply');}return {operationId:op.operationId,status:'applied',revision};};
 const context={getState:()=>state,commit:async transform=>{state=transform(state);},request};
 await assert.rejects(syncReviews(context),/response lost/);assert.equal(state.outbox[0].status,'pending');
 await syncReviews(context);assert.equal(writeCount,1);assert.equal(state.outbox[0].status,'confirmed');assert.equal(calls[1],'/v1/review/operations');assert.equal(ids.size,1);
});
