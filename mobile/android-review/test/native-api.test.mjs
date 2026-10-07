import test from 'node:test';import assert from 'node:assert/strict';import {nativeGithub,openNativeConnection} from '../app/native-api.js';
test('native bridge cannot call API before approval and login',()=>{
 let calls=0,opened=0;const bridge={config:()=>JSON.stringify({approved:false,dedicatedReviewRepository:false}),api:()=>{calls++;throw Error('unexpected');},openConnection:()=>{opened++;}};
 assert.equal(nativeGithub(bridge),null);assert.equal(calls,0);assert.equal(openNativeConnection(bridge),true);assert.equal(opened,1);assert.equal(openNativeConnection(null),false);
});
test('injected native bridge propagates auth denial without credential fields',async()=>{
 const config={approved:true,dedicatedReviewRepository:true,owner:'fixture-owner',repo:'private-review-fixture',repositoryId:123,branch:'mobile-review/data'};
 const bridge={config:()=>JSON.stringify(config),api:input=>{const j=JSON.parse(input);assert.equal(Object.hasOwn(j,'token'),false);return JSON.stringify({ok:false,status:401});}};
 await assert.rejects(nativeGithub(bridge).request('/v1/review/manifest'),{status:401});
});
