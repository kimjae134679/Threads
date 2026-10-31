import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as d from '../domain.mjs';
import {deliveryFingerprint,deliveryResultsProjection,readDeliveryResults} from '../delivery-results.mjs';

const at='2026-10-09T12:00:00.000Z';
const makePost=()=>{let state=d.importBundle(d.createState(),{bundle_id:'delivery-test',posts:[{post_id:'p',output_version:'v1',caption:'검수 문안',images:[]}]});state=d.setFinalReview(state,'p','passed',state.posts[0].revision,at);return state;};
const receipt=(post,platform='instagram',patch={})=>({schema:1,postId:post.post_id,outputVersion:post.output_version,fingerprint:deliveryFingerprint(post),platform,providerPostId:'provider-'+platform,status:'sent',externalUrl:'https://example.invalid/'+platform+'/published',providerVerifiedAt:at,publishedAt:at,scheduledAt:null,recordedAt:at,...patch});
const project=(state,records)=>deliveryResultsProjection(state,records)[0];

let state=makePost(),post=state.posts[0],original=JSON.stringify(state);
assert.equal(project(state,[]).deliveryStatus,'pending');
let partial=project(state,[receipt(post)]);
assert.equal(partial.deliveryStatus,'partially_posted');
assert.deepEqual(partial.completedPlatforms,['instagram']);
assert.equal(partial.platforms.threads.completed,false);
assert.equal(partial.platforms.threads.externalUrl,null);
let posted=project(state,[receipt(post),receipt(post,'threads')]);
assert.equal(posted.deliveryStatus,'posted');
assert.equal(posted.platforms.instagram.externalUrl,'https://example.invalid/instagram/published');
assert.equal(JSON.stringify(state),original);
assert.equal(d.finalReviewStatus(post).decision,'passed');

for(const patch of [{outputVersion:'v0'},{fingerprint:'0'.repeat(64)},{postId:'other'},{schema:2},
 {providerPostId:''},{providerPostId:'   '},{externalUrl:'http://example.invalid/post'},{externalUrl:'javascript:alert(1)'},
 {externalUrl:'https://user:password@example.invalid/post'},{externalUrl:'https://example.invalid/post?access_token=fixture'},{externalUrl:'https://example.invalid/post#fixture'},{externalUrl:'https://example.invalid/post?'},{externalUrl:'https://example.invalid/post#'},{providerVerifiedAt:null},{publishedAt:null},
 {publishedAt:'2026-02-30T12:00:00.000Z'},{recordedAt:'not-a-date'},{platform:'unknown'}]){
 assert.equal(project(state,[receipt(post,'instagram',patch)]).deliveryStatus,'pending',JSON.stringify(patch));
}
for(const status of ['draft','scheduled','sending','error']){
 const row=project(state,[receipt(post,'instagram',{status,providerPostId:null,externalUrl:null,providerVerifiedAt:null,publishedAt:null,scheduledAt:status==='scheduled'?at:null})]);
 assert.equal(row.platforms.instagram.completed,false);assert.equal(row.platforms.instagram.externalUrl,null);
 assert.equal(row.deliveryStatus,status==='draft'?'pending':status);
}
assert.equal(project(state,[receipt(post,'instagram',{status:'scheduled',scheduledAt:null})]).deliveryStatus,'pending');
const queued=receipt(post,'instagram',{status:'scheduled',scheduledAt:at,recordedAt:'2026-10-09T13:00:00.000Z',publishedAt:null,providerVerifiedAt:null});
assert.equal(project(state,[receipt(post),queued]).deliveryStatus,'scheduled');
assert.equal(project(state,[queued,receipt(post)]).deliveryStatus,'scheduled');
assert.equal(project(state,[receipt(post),receipt(post,'instagram',{providerPostId:'conflicting'})]).deliveryStatus,'error');
const oneTarget={...post,targets:['threads']};
assert.equal(deliveryResultsProjection([oneTarget],[receipt(oneTarget,'threads')])[0].deliveryStatus,'posted');
const noTargets={...post,targets:[]};
assert.equal(deliveryResultsProjection([noTargets],[receipt(noTargets)])[0].deliveryStatus,'pending');
state=d.editPost(state,'p',{caption:'편집 후 새 문안'},post.revision);
assert.equal(project(state,[receipt(post),receipt(post,'threads')]).deliveryStatus,'pending');
assert.equal(d.finalReviewStatus(state.posts[0]).passed,false);
const held=d.setFinalReview(makePost(),'p','hold',makePost().posts[0].revision,at);
assert.equal(project(held,[receipt(held.posts[0]),receipt(held.posts[0],'threads')]).deliveryStatus,'posted');
assert.equal(d.finalReviewStatus(held.posts[0]).decision,'hold');

const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-delivery-results-'));
try{
 const missing=await readDeliveryResults(root);assert.deepEqual(missing,{records:[],warnings:[]});
 const directory=path.join(root,'final-review-results');await fs.mkdir(directory);
 post=makePost().posts[0];
 await fs.writeFile(path.join(directory,'instagram.json'),JSON.stringify(receipt(post)));
 await fs.writeFile(path.join(directory,'broken.json'),'{bad');
 await fs.writeFile(path.join(directory,'large.json'),'x'.repeat(16385));
 await fs.writeFile(path.join(directory,'invalid.json'),JSON.stringify(receipt(post,'threads',{publishedAt:null})));
 await fs.writeFile(path.join(directory,'secret.txt'),'not a record');
 const before=await fs.readFile(path.join(directory,'instagram.json'));
 let result=await readDeliveryResults(root);assert.equal(result.records.length,1);assert.equal(result.warnings.length,3);
 assert.deepEqual(await fs.readFile(path.join(directory,'instagram.json')),before);
 assert.equal(project([post],result.records).deliveryStatus,'partially_posted');
 const overflowRoot=path.join(root,'overflow-root'),overflow=path.join(overflowRoot,'final-review-results');await fs.mkdir(overflow,{recursive:true});
 const names=Array.from({length:2001},(_,i)=>String(i).padStart(4,'0')+'.json');
 for(let start=0;start<names.length;start+=100)await Promise.all(names.slice(start,start+100).map((name,index)=>{const i=start+index;return fs.writeFile(path.join(overflow,name),JSON.stringify(i===1?receipt(post,'threads'):i===2000?receipt(post,'instagram',{status:'error',recordedAt:'2026-10-09T13:00:00.000Z',publishedAt:null,providerVerifiedAt:null}):receipt(post)));}));
 const overLimit=await readDeliveryResults(overflowRoot);assert.deepEqual(overLimit.records,[]);assert.deepEqual(overLimit.warnings,[{file:null,code:'too_many_result_files'}]);assert.equal(project([post],overLimit.records).deliveryStatus,'pending');
 const outside=path.join(root,'outside.json');await fs.writeFile(outside,JSON.stringify(receipt(post,'threads')));
 await fs.symlink(outside,path.join(directory,'linked.json'),'file');
 result=await readDeliveryResults(root);assert.equal(result.records.length,1);assert.ok(result.warnings.some(w=>w.code==='unsafe_result_file'));
 await fs.rename(directory,path.join(root,'kept-results'));
 await fs.symlink(path.join(root,'kept-results'),directory,process.platform==='win32'?'junction':'dir');
 result=await readDeliveryResults(root);assert.deepEqual(result.records,[]);assert.ok(result.warnings.some(w=>w.code==='unsafe_results_directory'));
}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('Read-only current-version delivery results, sent evidence, partial status and unsafe input checks passed.');
