import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPinnedReviewState} from '../mobile/android-review/pc/github-transport.mjs';
import {createGithubAdapter} from '../mobile/android-review/app/github-adapter.js';
const repository={owner:'fixture',repo:'review',repositoryId:1,private:true,dedicatedReviewRepository:true,branch:'mobile-review/data',excludedRepositories:['fixture/bridge']};
const prefix='/repos/fixture/review',head='a'.repeat(40),tree='b'.repeat(40);
const state={githubReviewSchema:1,manifest:{schemaVersion:1,reviewRound:'fixture',criteria:{version:'synthetic',items:[]},entries:Array.from({length:1200},(_,i)=>({id:'fixture-'+i,title:'T'.repeat(1200),outputVersion:'1'.repeat(64),reviewRound:'fixture',revision:0,review:null,images:[]}))},assets:{},operations:{}};
const bytes=Buffer.from(JSON.stringify(state)),blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
function apiFixture({wrongBlob=false,oversized=false}={}){const calls=[];return {calls,api:async route=>{
 calls.push(route);
 if(route===prefix)return {private:true,id:1,owner:{login:'fixture'},name:'review',default_branch:'main'};
 if(route.includes('/git/ref/'))return {object:{sha:head}};
 if(route.includes('/git/commits/'))return {sha:head,tree:{sha:tree}};
 if(route.includes('/contents/'))return {encoding:'none',content:'',size:oversized?9*1024*1024:bytes.length,sha:blob};
 if(route===prefix+'/git/blobs/'+blob)return {encoding:'base64',size:bytes.length,content:bytes.toString('base64'),sha:wrongBlob?'c'.repeat(40):blob};
 assert.fail('Unexpected route '+route);
 }};}
test('PC reads a >1 MB pinned ledger through its exact Git blob and verifies byte identity',async()=>{
 assert(bytes.length>1000000);const f=apiFixture();assert.deepEqual((await readPinnedReviewState({enabled:true,repository,expectedHead:head,api:f.api})).state,state);assert.equal(f.calls.at(-1),prefix+'/git/blobs/'+blob);
 await assert.rejects(readPinnedReviewState({enabled:true,repository,api:apiFixture({wrongBlob:true}).api}));
 const large=apiFixture({oversized:true});await assert.rejects(readPinnedReviewState({enabled:true,repository,api:large.api}));assert.equal(large.calls.length,4);
});
test('mobile reads the same >1 MB ledger through the pinned Git blob with bounded hash checks',async()=>{
 const f=apiFixture(),adapter=createGithubAdapter({...repository,approved:true,api:f.api});assert.deepEqual(await adapter.request('/v1/review/manifest'),state.manifest);assert.equal(f.calls.at(-1),prefix+'/git/blobs/'+blob);
 await assert.rejects(createGithubAdapter({...repository,approved:true,api:apiFixture({wrongBlob:true}).api}).request('/v1/review/manifest'));
 const large=apiFixture({oversized:true});await assert.rejects(createGithubAdapter({...repository,approved:true,api:large.api}).request('/v1/review/manifest'));assert.equal(large.calls.length,4);
});
