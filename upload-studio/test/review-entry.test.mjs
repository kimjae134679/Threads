import test from 'node:test';import assert from 'node:assert/strict';
import {createState,importBundle,setFinalReview} from '../domain.mjs';
let reviewEntry;try{({reviewEntry}=await import('../public/review-entry.mjs'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function fixture(){let s=importBundle(createState(),{bundle_id:'entry-fixture',posts:['one','two','three'].map(post_id=>({post_id,output_version:'v1',caption:'fixture',images:[]}))});s=setFinalReview(s,'two','hold',1,'2026-10-10T00:00:00Z');return setFinalReview(s,'three','discard',1,'2026-10-10T00:00:00Z');}
test('current review entry selects all current posts instead of a historical executable',()=>{
 assert.equal(typeof reviewEntry,'function');assert.deepEqual(reviewEntry(fixture().posts,'?review=all'),{filter:'all',postId:'one',search:''});
});
test('held and discarded entries select the current matching verdict without changing it',()=>{
 assert.equal(typeof reviewEntry,'function');const s=fixture(),before=JSON.stringify(s);
 assert.deepEqual(reviewEntry(s.posts,'?review=hold'),{filter:'hold',postId:'two',search:''});
 assert.deepEqual(reviewEntry(s.posts,'?review=discard'),{filter:'discard',postId:'three',search:''});assert.equal(JSON.stringify(s),before);
});
test('empty and stale held entries never show a different or obsolete verdict',()=>{
 assert.equal(typeof reviewEntry,'function');const s=fixture();s.posts[1].caption='new writing';
 assert.deepEqual(reviewEntry(s.posts,'?review=hold'),{filter:'hold',postId:null,search:''});
 s.posts[2].inactive_for_this_batch=true;assert.deepEqual(reviewEntry(s.posts,'?review=discard'),{filter:'discard',postId:null,search:''});
 assert.equal(reviewEntry(s.posts,'?review=rejected'),null);assert.equal(reviewEntry(s.posts,'?post=two'),null);
});
