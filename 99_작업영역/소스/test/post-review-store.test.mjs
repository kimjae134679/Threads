import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createPostReviewStore,version}=require('../desktop/post-review-store.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-rating-test-'));
try{
 const output=path.join(root,'06_자동 제작 결과'),folder=path.join(output,'현재 결과','test');
 await fs.mkdir(path.join(folder,'rendered'),{recursive:true});
 const bytes=Buffer.from('fixture-only'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 await fs.writeFile(path.join(folder,'rendered','slide-001.png'),bytes);
 // Installed .38 only accepts image-linked reviewable output. These are explicit
 // test-only metadata fixtures; they never assert user image generation/approval.
 const recordHash=crypto.createHash('sha256').update('TEST_ONLY_DO_NOT_PUBLISH generated-record').digest('hex');
 const row={id:'a',title:'한글 원제',outputFolder:'현재 결과/test',sourceFingerprint:'source',outputSha256:'v1',ruleVersion:'rule',coverRefresh:{consumedGeneratedRecordSha256:recordHash},images:[{name:'rendered/slide-001.png',sha256:hash}]};
 const other=path.join(output,'현재 결과','other');await fs.mkdir(path.join(other,'rendered'),{recursive:true});await fs.writeFile(path.join(other,'rendered','slide-001.png'),bytes);
 for(const [id,dir] of [['a',folder],['b',other]])await fs.writeFile(path.join(dir,'production-plan.json'),JSON.stringify({universalCover:{aiAsset:{sourceId:id,generationRecordSha256:recordHash}}}));
 const status=path.join(output,'status.json'),report=()=>fs.writeFile(status,JSON.stringify({entries:[row,{...row,id:'b',outputFolder:'현재 결과/other'}]}));
 await report();const store=createPostReviewStore(root),v=version(row);
 assert.equal((await store.list()).entries[0].current,null);
 await Promise.all([store.save({id:'a',outputVersion:v,score:1,note:'작은 글씨\n수정해주세요'}),store.save({id:'b',outputVersion:v,score:10,note:'좋아요 <script> 그대로'})]);
 const reopened=createPostReviewStore(root);const items=(await reopened.list()).entries;
 assert.equal(items[0].current.score,1);assert.equal(items[0].current.note,'작은 글씨\n수정해주세요');assert.equal(items[1].current.score,10);
 assert.equal((await reopened.image('a',1,v)),'data:image/png;base64,'+bytes.toString('base64'));
 for(const score of [0,11,1.5,'5',undefined])await assert.rejects(store.save({id:'a',outputVersion:v,score,note:''}));
 await assert.rejects(store.save({id:'no',outputVersion:v,score:5,note:''}));await assert.rejects(store.image('a',0,v));
 row.outputSha256='v2';await report();const changed=(await store.list()).entries[0];assert.equal(changed.current,null);assert.equal(changed.previous.score,1);
 await assert.rejects(store.save({id:'a',outputVersion:v,score:10,note:'stale'}));
 await store.save({id:'a',outputVersion:version(row),score:null,note:'메모만 저장'});assert.equal((await createPostReviewStore(root).list()).entries[0].current.score,null);
 await fs.writeFile(path.join(folder,'rendered','slide-001.png'),'changed');await assert.rejects(store.image('a',1,version(row)));
 row.outputFolder='../outside';await report();await assert.rejects(store.list());
 const data=JSON.parse(await fs.readFile(store.file,'utf8'));assert.equal(data.evaluations.length,3);assert.equal(data.recordType,'user_post_quality_feedback');
 await fs.writeFile(store.file,'broken');await assert.rejects(store.save({id:'a',outputVersion:version(row),score:5,note:''}));assert.equal(await fs.readFile(store.file,'utf8'),'broken');
 console.log('post review: persistence, concurrent saves, rating validation, version separation, path/hash protection PASS');
}finally{await fs.rm(root,{recursive:true,force:true});}
