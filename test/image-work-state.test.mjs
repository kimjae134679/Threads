import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{validateReviewProgress}=require('../desktop/image-work-state.cjs');
test('wrong JSON or malformed live review always holds production rather than acting unread',()=>{
 for(const value of [{},{entries:[]},{schemaVersion:1,recordType:'user_review_workflow',entries:null},{schemaVersion:1,recordType:'user_review_workflow',entries:[{}]}])assert.throws(()=>validateReviewProgress(value),/기록 형식/);
 assert.equal(validateReviewProgress({schemaVersion:1,recordType:'user_review_workflow',entries:[]}).entries.length,0);
});
